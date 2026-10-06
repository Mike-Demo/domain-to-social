import { createServerFn } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Json } from "@/integrations/supabase/types";
import { entitlementsFor, type Entitlements, type PlanTier } from "./entitlements";
import type { LookupResult } from "@/lib/social/types";

type Ctx = { supabase: import("@supabase/supabase-js").SupabaseClient<import("@/integrations/supabase/types").Database>; userId: string };

interface SubRow {
  plan: PlanTier;
  status: string;
  current_period_end: string | null;
  operative_lifetime: boolean;
  cancel_at_period_end: boolean;
}

async function loadSubscription({ supabase, userId }: Ctx): Promise<SubRow | null> {
  const { stripeEnvForHost } = await import("@/lib/stripe.server");
  const env = stripeEnvForHost(getRequestHeaders().get("host"));
  const { data } = await supabase
    .from("subscriptions")
    .select("plan,status,current_period_end,operative_lifetime,cancel_at_period_end")
    .eq("user_id", userId)
    .eq("environment", env)
    .maybeSingle();
  return data;
}

function entitlementsFromSub(data: SubRow | null): Entitlements {
  if (!data) return entitlementsFor("free");
  const periodOk = !data.current_period_end || new Date(data.current_period_end) > new Date();
  const subActive =
    (["active", "trialing", "past_due"].includes(data.status) && periodOk) ||
    (data.status === "canceled" && !!data.current_period_end && periodOk);
  const plan: PlanTier = subActive && data.plan !== "free" ? data.plan : data.operative_lifetime ? "operative" : "free";
  return entitlementsFor(plan);
}

async function loadEntitlements(ctx: Ctx): Promise<Entitlements> {
  return entitlementsFromSub(await loadSubscription(ctx));
}

async function requireLists(ctx: Ctx): Promise<void> {
  if (!(await loadEntitlements(ctx)).savedLists) throw new Error("Saved lists need the Operative plan.");
}

export const getMyAccount = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const sub = await loadSubscription(context);
    const ent = entitlementsFromSub(sub);
    const [{ data: history }, { data: lists }] = await Promise.all([
      context.supabase.from("lookups").select("id,domain,checked_at").order("checked_at", { ascending: false }).limit(50),
      context.supabase.from("lists").select("id,name,created_at,list_items(count)").order("created_at", { ascending: false }),
    ]);
    return {
      entitlements: ent,
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
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { result: LookupResult }) => d)
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
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ name: z.string().trim().min(1).max(80) }).parse(d))
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
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await context.supabase.from("lists").delete().eq("id", data.id);
    return { ok: true };
  });

export const addToList = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { listId: string; results: LookupResult[] }) => d)
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
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
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

export const runBatch = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ urls: z.array(z.string().trim().min(3).max(500)).min(1).max(25) }).parse(d))
  .handler(async ({ data, context }) => {
    const ent = await loadEntitlements(context);
    if (ent.batchSize === 0) throw new Error("Bulk searching needs the Operative plan.");
    if (data.urls.length > ent.batchSize) throw new Error(`Your plan allows ${ent.batchSize} domains per run.`);
    const { lookupDomain } = await import("@/lib/social/lookup.server");
    const settled = await Promise.allSettled(data.urls.map((u) => lookupDomain(u)));
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
