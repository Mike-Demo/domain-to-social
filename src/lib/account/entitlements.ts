export type PlanTier = "free" | "operative" | "deep_recon" | "brand_command";

const RANK: Record<PlanTier, number> = { free: 0, operative: 1, deep_recon: 2, brand_command: 3 };

export interface Entitlements {
  plan: PlanTier;
  savedLists: boolean;
  batchSize: number;
  enrichment: boolean;
  brandMode: boolean;
}

export function entitlementsFor(plan: PlanTier): Entitlements {
  const r = RANK[plan];
  return {
    plan,
    savedLists: r >= 1,
    batchSize: r >= 2 ? 25 : r >= 1 ? 5 : 0,
    enrichment: r >= 2,
    brandMode: r >= 3,
  };
}

export const PLAN_LABEL: Record<PlanTier, string> = {
  free: "Free Radar",
  operative: "Operative",
  deep_recon: "Deep Recon",
  brand_command: "Brand Command",
};
