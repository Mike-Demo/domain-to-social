import { createServerFn } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";
import { z } from "zod";
import { requireMfaAuth } from "./mfa-middleware";
import type { Json } from "@/integrations/supabase/types";
import { browserRunAllowed, enrichmentAllowed, type Entitlements, type PlanTier } from "./entitlements";
import { entitlementsFromSub, subscriptionActive, type SubRow } from "./billing";
import type { LookupResult } from "@/lib/social/types";

type Ctx = { supabase: import("@supabase/supabase-js").SupabaseClient<import("@/integrations/supabase/types").Database>; userId: string };

async function loadSubscription({ supabase, userId }: Ctx): Promise<SubRow | null> {
  const { stripeEnvForHost } = await import("@/lib/stripe.server");
  const env = stripeEnvForHost(getRequestHeaders().get("host"));
  const { data } = await supabase
    .from("subscriptions")
    .select("plan,status,current_period_end,operative_lifetime,cancel_at_period_end,stripe_subscription_id")
    .eq("user_id", userId)
    .eq("environment", env)
    .maybeSingle();
  return data;
}

async function loadEntitlements(ctx: Ctx): Promise<Entitlements> {
  return entitlementsFromSub(await loadSubscription(ctx));
}

/** Server-side daily cap for the live-browser fallback; logs the run when allowed. */
function browserReserver(ctx: Ctx): (domain: string) => Promise<boolean> {
  return async (domain) => {
    const since = new Date(Date.now() - 86_400_000).toISOString();
    const { count } = await ctx.supabase
      .from("browser_runs")
      .select("id", { count: "exact", head: true })
      .eq("user_id", ctx.userId)
      .not("domain", "like", `${ENRICH_PREFIX}%`)
      .not("domain", "like", "mcp:%")
      .gte("run_at", since);
    if (!browserRunAllowed(count ?? 0)) return false;
    const { error } = await ctx.supabase.from("browser_runs").insert({ user_id: ctx.userId, domain });
    return !error;
  };
}

// Paid page renders are logged in the same append-only usage log as browser runs, tagged with this prefix.
const ENRICH_PREFIX = "enrich:";

/** Server-side rolling 30-day cap on paid page renders; logs the run when allowed. */
function enrichmentReserver(ctx: Ctx, plan: PlanTier): (domain: string) => Promise<boolean> {
  return async (domain) => {
    const since = new Date(Date.now() - 30 * 86_400_000).toISOString();
    const { count } = await ctx.supabase
      .from("browser_runs")
      .select("id", { count: "exact", head: true })
      .eq("user_id", ctx.userId)
      .like("domain", `${ENRICH_PREFIX}%`)
      .gte("run_at", since);
    if (!enrichmentAllowed(plan, count ?? 0)) return false;
    const { error } = await ctx.supabase.from("browser_runs").insert({ user_id: ctx.userId, domain: `${ENRICH_PREFIX}${domain}` });
    return !error;
  };
}

async function requireLists(ctx: Ctx): Promise<void> {
  if (!(await loadEntitlements(ctx)).savedLists) throw new Error("Saved lists need the Operative plan.");
}

export const getMyAccount = createServerFn({ method: "GET" })
  .middleware([requireMfaAuth])
  .handler(async ({ context }) => {
    const sub = await loadSubscription(context);
    const ent = entitlementsFromSub(sub);
    const [{ data: history }, { data: lists }] = await Promise.all([
      context.supabase.from("lookups").select("id,domain,checked_at").order("checked_at", { ascending: false }).limit(50),
      context.supabase.from("lists").select("id,name,created_at,list_items(count)").order("created_at", { ascending: false }),
    ]);
    return {
      entitlements: ent,
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
