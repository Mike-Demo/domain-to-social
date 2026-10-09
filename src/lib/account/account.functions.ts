import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireMfaAuth } from "./mfa-middleware";
import type { Json } from "@/integrations/supabase/types";
import { planRank } from "./entitlements";
import { entitlementsFromSub, subscriptionActive } from "./billing";
import type { LookupResult } from "@/lib/social/types";
import {
  browserReserver,
  enrichmentReserver,
  loadEntitlements,
  loadGifts,
  loadSubscription,
  type PlanCtx as Ctx,
} from "./plan-access.server";

async function requireLists(ctx: Ctx): Promise<void> {
  if (!(await loadEntitlements(ctx)).savedLists) throw new Error("Saved lists need the Operative plan.");
}

export const getMyAccount = createServerFn({ method: "GET" })
  .middleware([requireMfaAuth])
  .handler(async ({ context }) => {
    const [sub, gifts] = await Promise.all([loadSubscription(context), loadGifts(context)]);
    const ent = entitlementsFromSub(sub, new Date(), gifts);
    const now = new Date();
    const activeGift = gifts
      .filter((g) => !g.gift_until || new Date(g.gift_until) > now)
      .sort((a, b) => planRank(b.plan) - planRank(a.plan))[0] ?? null;
    // Saved lists are a paid feature: don't even query them without the entitlement.
    const [{ data: history }, { data: lists }] = await Promise.all([
      context.supabase.from("lookups").select("id,domain,checked_at").order("checked_at", { ascending: false }).limit(50),
      ent.savedLists
        ? context.supabase.from("lists").select("id,name,created_at,list_items(count)").order("created_at", { ascending: false })
        : Promise.resolve({ data: null }),
    ]);
    return {
      entitlements: ent,
      gift: activeGift,
      subscription: sub
        ? {
            status: sub.status,
            currentPeriodEnd: sub.current_period_end,
            cancelAtPeriodEnd: sub.cancel_at_period_end,
            monthlyPlan: subscriptionActive(sub) && sub.status !== "canceled" && sub.stripe_subscription_id ? sub.plan : null,
            operativeOwned: sub.operative_lifetime,
          }
        : null,
      history: history ?? [],
      lists: (lists ?? []).map((l) => ({
        id: l.id,
        name: l.name,
        created_at: l.created_at,
        count: (l.list_items as unknown as { count: number }[])[0]?.count ?? 0,
      })),
    };
  });

export const saveLookup = createServerFn({ method: "POST" })
  .middleware([requireMfaAuth])
  .validator((d: { result: LookupResult }) => d)
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("lookups").insert({
      user_id: context.userId,
      domain: data.result.domain,
      result: data.result as unknown as Json,
    });
    if (error) throw new Error("Could not save to history.");
    return { ok: true };
  });

export const createList = createServerFn({ method: "POST" })
  .middleware([requireMfaAuth])
  .validator((d: unknown) => z.object({ name: z.string().trim().min(1).max(80) }).parse(d))
  .handler(async ({ data, context }) => {
    await requireLists(context);
    const { data: row, error } = await context.supabase
      .from("lists")
      .insert({ user_id: context.userId, name: data.name })
      .select("id")
      .single();
    if (error) throw new Error("Could not create list.");
    return row;
  });

export const deleteList = createServerFn({ method: "POST" })
  .middleware([requireMfaAuth])
  .validator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await context.supabase.from("lists").delete().eq("id", data.id);
    return { ok: true };
  });

export const addToList = createServerFn({ method: "POST" })
  .middleware([requireMfaAuth])
  .validator((d: { listId: string; results: LookupResult[] }) => d)
  .handler(async ({ data, context }) => {
    await requireLists(context);
    const rows = data.results.slice(0, 25).map((r) => ({
      list_id: data.listId,
      user_id: context.userId,
      domain: r.domain,
      result: r as unknown as Json,
    }));
    const { error } = await context.supabase.from("list_items").insert(rows);
    if (error) throw new Error("Could not add to list.");
    return { ok: true };
  });

export const getList = createServerFn({ method: "GET" })
  .middleware([requireMfaAuth])
  .validator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await requireLists(context);
    const { data: list } = await context.supabase.from("lists").select("id,name").eq("id", data.id).maybeSingle();
    if (!list) throw new Error("List not found.");
    const { data: items } = await context.supabase
      .from("list_items")
      .select("id,domain,result,added_at")
      .eq("list_id", data.id)
      .order("added_at", { ascending: false });
    return {
      list,
      items: (items ?? []).map((i) => ({ ...i, result: i.result as unknown as LookupResult })),
    };
  });

const MEMBER_WINDOW_MS = 60_000;
const MEMBER_MAX_SITES_PER_WINDOW = 30;
const memberBuckets = new Map<string, { count: number; resetAt: number }>();

/** Per-account cap on how many sites the server fetches per minute, so lookups can't be used as a bulk fetch proxy. */
function assertMemberQuota(userId: string, sites: number): void {
  const now = Date.now();
  const b = memberBuckets.get(userId);
  if (!b || b.resetAt <= now) {
    memberBuckets.set(userId, { count: sites, resetAt: now + MEMBER_WINDOW_MS });
    if (sites > MEMBER_MAX_SITES_PER_WINDOW) throw new Error("Too many lookups — please wait a minute and try again.");
    return;
  }
  if (b.count + sites > MEMBER_MAX_SITES_PER_WINDOW) throw new Error("Too many lookups — please wait a minute and try again.");
  b.count += sites;
}

/** Signed-in single lookup: Deep Recon plans get Firecrawl enrichment, others get the standard lookup. */
export const memberLookup = createServerFn({ method: "POST" })
  .middleware([requireMfaAuth])
  .validator((d: unknown) => z.object({ url: z.string().trim().min(3).max(500) }).parse(d))
  .handler(async ({ data, context }) => {
    assertMemberQuota(context.userId, 1);
    const ent = await loadEntitlements(context);
    const { lookupDomain } = await import("@/lib/social/lookup.server");
    return lookupDomain(data.url, { enrich: ent.enrichment, browserAgent: ent.browserAgent, reserveBrowserRun: browserReserver(context), reserveEnrichment: enrichmentReserver(context, ent.plan) });
  });

export const runBatch = createServerFn({ method: "POST" })
  .middleware([requireMfaAuth])
  .validator((d: unknown) => z.object({ urls: z.array(z.string().trim().min(3).max(500)).min(1).max(25) }).parse(d))
  .handler(async ({ data, context }) => {
    const ent = await loadEntitlements(context);
    if (ent.batchSize === 0) throw new Error("Bulk searching needs the Operative plan.");
    if (data.urls.length > ent.batchSize) throw new Error(`Your plan allows ${ent.batchSize} domains per run.`);
    // One request per target site per run, so a batch can't be used to hammer a single host.
    const hostOf = (u: string) => {
      try {
        return new URL(/^https?:\/\//i.test(u) ? u : `https://${u}`).hostname.toLowerCase().replace(/^www\./, "");
      } catch {
        return u.toLowerCase();
      }
    };
    const hosts = data.urls.map(hostOf);
    if (new Set(hosts).size !== hosts.length) throw new Error("Each site can appear only once per run.");
    assertMemberQuota(context.userId, data.urls.length);
    const { lookupDomain } = await import("@/lib/social/lookup.server");
    const settled = await Promise.allSettled(data.urls.map((u) => lookupDomain(u, { enrich: ent.enrichment, browserAgent: ent.browserAgent, reserveBrowserRun: browserReserver(context), reserveEnrichment: enrichmentReserver(context, ent.plan) })));
    const out = settled.map((s, i) =>
      s.status === "fulfilled"
        ? { input: data.urls[i] ?? "", ok: true as const, result: s.value }
        : { input: data.urls[i] ?? "", ok: false as const, error: s.reason instanceof Error ? s.reason.message : "Lookup failed" },
    );
    const ok = out.flatMap((o) => (o.ok ? [o.result] : []));
    if (ok.length) {
      await context.supabase.from("lookups").insert(
        ok.map((r) => ({ user_id: context.userId, domain: r.domain, result: r as unknown as Json })),
      );
    }
    return out;
  });
