export type PlanTier = "free" | "operative" | "deep_recon" | "brand_command";

const RANK: Record<PlanTier, number> = { free: 0, operative: 1, deep_recon: 2, brand_command: 3 };

/** Daily cap on live-browser (Browser Use) fallback runs per account. */
export const BROWSER_RUNS_PER_DAY = 20;

/** Lookups an account can run through connected assistants per rolling 24 hours. */
export const ASSISTANT_LOOKUPS_PER_DAY = 100;

export function assistantLookupAllowed(usedLast24h: number): boolean {
  return usedLast24h < ASSISTANT_LOOKUPS_PER_DAY;
}

/** Monthly cap on paid page-render (Firecrawl) lookups, by plan. 0 = no access. */
export const ENRICHED_LOOKUPS_PER_MONTH: Record<PlanTier, number> = {
  free: 0,
  operative: 0,
  deep_recon: 300,
  brand_command: 1000,
};

/** True when another enriched lookup fits in the plan's rolling 30-day allowance. */
export function enrichmentAllowed(plan: PlanTier, usedLast30d: number): boolean {
  return usedLast30d < ENRICHED_LOOKUPS_PER_MONTH[plan];
}

export interface Entitlements {
  plan: PlanTier;
  savedLists: boolean;
  batchSize: number;
  enrichment: boolean;
  /** Live-browser fallback after Firecrawl; set false to switch it off everywhere. */
  browserAgent: boolean;
  brandMode: boolean;
}

export function entitlementsFor(plan: PlanTier): Entitlements {
  const r = RANK[plan];
  return {
    plan,
    savedLists: r >= 1,
    batchSize: r >= 2 ? 25 : r >= 1 ? 5 : 0,
    enrichment: r >= 2,
    browserAgent: r >= 3,
    brandMode: r >= 3,
  };
}

/** True when another live-browser run is allowed given runs already used in the last 24h. */
export function browserRunAllowed(runsLast24h: number): boolean {
  return runsLast24h < BROWSER_RUNS_PER_DAY;
}

export const PLAN_LABEL: Record<PlanTier, string> = {
  free: "Free Radar",
  operative: "Operative",
  deep_recon: "Deep Recon",
  brand_command: "Brand Command",
};
