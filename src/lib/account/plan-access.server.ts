// Shared server-side plan loading and paid-usage reservers, used by website
// server functions and the MCP tools so both apply the same plan rules and caps.
import { getRequestHeaders } from "@tanstack/react-start/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { browserRunAllowed, enrichmentAllowed, type Entitlements, type PlanTier } from "./entitlements";
import { entitlementsFromSub, type GiftRow, type SubRow } from "./billing";
import type { LookupOptions } from "@/lib/social/lookup.server";

export type PlanCtx = { supabase: SupabaseClient<Database>; userId: string };

// Paid page renders are logged in the same append-only usage log as browser runs, tagged with this prefix.
export const ENRICH_PREFIX = "enrich:";

function requestHost(): string | null {
  try {
    return getRequestHeaders().get("host");
  } catch {
    return null;
  }
}

export async function loadSubscription({ supabase, userId }: PlanCtx): Promise<SubRow | null> {
  const { stripeEnvForHost } = await import("@/lib/stripe.server");
  const env = stripeEnvForHost(requestHost());
  const { data } = await supabase
    .from("subscriptions")
    .select("plan,status,current_period_end,operative_lifetime,cancel_at_period_end,stripe_subscription_id")
    .eq("user_id", userId)
    .eq("environment", env)
    .maybeSingle();
  return data;
}

export async function loadGifts({ supabase, userId }: PlanCtx): Promise<GiftRow[]> {
  const { data } = await supabase.from("gift_redemptions").select("plan,gift_until").eq("user_id", userId);
  return data ?? [];
}

export async function loadEntitlements(ctx: PlanCtx): Promise<Entitlements> {
  const [sub, gifts] = await Promise.all([loadSubscription(ctx), loadGifts(ctx)]);
  return entitlementsFromSub(sub, new Date(), gifts);
}

/** Server-side daily cap for the live-browser fallback; logs the run when allowed. */
export function browserReserver(ctx: PlanCtx): (domain: string) => Promise<boolean> {
  return async (domain) => {
    const since = new Date(Date.now() - 86_400_000).toISOString();
    const { count } = await ctx.supabase
      .from("browser_runs")
      .select("id", { count: "exact", head: true })
      .eq("user_id", ctx.userId)
      .not("domain", "like", `${ENRICH_PREFIX}%`)
      .not("domain", "like", "mcp:%")
      .not("domain", "like", "gift:%")
      .gte("run_at", since);
    if (!browserRunAllowed(count ?? 0)) return false;
    const { error } = await ctx.supabase.from("browser_runs").insert({ user_id: ctx.userId, domain });
    return !error;
  };
}

/** Server-side rolling 30-day cap on paid page renders; logs the run when allowed. */
export function enrichmentReserver(ctx: PlanCtx, plan: PlanTier): (domain: string) => Promise<boolean> {
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

/** Lookup options for the caller's plan: Firecrawl on Deep Recon+, live browser on Brand Command. */
export function lookupOptionsFor(ctx: PlanCtx, ent: Entitlements): LookupOptions {
  return {
    enrich: ent.enrichment,
    browserAgent: ent.browserAgent,
    reserveBrowserRun: browserReserver(ctx),
    reserveEnrichment: enrichmentReserver(ctx, ent.plan),
  };
}
