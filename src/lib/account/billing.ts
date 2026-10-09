import { entitlementsFor, planRank, type Entitlements, type PlanTier } from "./entitlements";

export const PRICE_IDS = ["operative_onetime", "deep_recon_monthly", "brand_command_monthly"] as const;
export type PriceId = (typeof PRICE_IDS)[number];
export const MONTHLY_PRICE_IDS = ["deep_recon_monthly", "brand_command_monthly"] as const;

export const PRICE_TO_PLAN: Record<string, PlanTier> = {
  deep_recon_monthly: "deep_recon",
  brand_command_monthly: "brand_command",
};

export interface SubRow {
  plan: PlanTier;
  status: string;
  current_period_end: string | null;
  operative_lifetime: boolean;
  cancel_at_period_end: boolean;
  stripe_subscription_id: string | null;
}

const LIVE_STATUSES = ["active", "trialing", "past_due"];

/** A monthly plan grants access while live (incl. failed-renewal grace) or canceled but still inside the paid period. */
export function subscriptionActive(row: Pick<SubRow, "status" | "current_period_end"> | null, now = new Date()): boolean {
  if (!row) return false;
  const periodOk = !row.current_period_end || new Date(row.current_period_end) > now;
  if (LIVE_STATUSES.includes(row.status)) return periodOk;
  return row.status === "canceled" && !!row.current_period_end && periodOk;
}

function paidPlan(row: SubRow | null, now: Date): PlanTier {
  if (!row) return "free";
  if (subscriptionActive(row, now) && row.plan !== "free") return row.plan;
  return row.operative_lifetime ? "operative" : "free";
}

export interface GiftRow {
  plan: PlanTier;
  gift_until: string | null;
}

/** Highest gifted plan still in effect (null gift_until = lifetime). */
export function bestGift(gifts: GiftRow[], now = new Date()): PlanTier {
  return gifts
    .filter((g) => !g.gift_until || new Date(g.gift_until) > now)
    .reduce<PlanTier>((best, g) => (planRank(g.plan) > planRank(best) ? g.plan : best), "free");
}

/** The paid plan or an active gift, whichever is higher; gifts never lower a paid plan. */
export function effectivePlan(row: SubRow | null, now = new Date(), gifts: GiftRow[] = []): PlanTier {
  const paid = paidPlan(row, now);
  const gift = bestGift(gifts, now);
  return planRank(gift) > planRank(paid) ? gift : paid;
}

export function entitlementsFromSub(row: SubRow | null, now = new Date(), gifts: GiftRow[] = []): Entitlements {
  return entitlementsFor(effectivePlan(row, now, gifts));
}

export type CheckoutDecision = "checkout" | "switch" | "owned";

/** What buying `priceId` should do: open checkout, swap the existing monthly plan, or refuse (already owned). */
export function checkoutDecision(row: SubRow | null, priceId: PriceId, now = new Date()): CheckoutDecision {
  const plan = paidPlan(row, now);
  if (priceId === "operative_onetime") return plan === "free" ? "checkout" : "owned";
  const target = PRICE_TO_PLAN[priceId];
  const liveSub = !!row?.stripe_subscription_id && subscriptionActive(row, now) && row.status !== "canceled";
  if (liveSub && row?.plan === target) return "owned";
  return liveSub ? "switch" : "checkout";
}

/**
 * Whether a subscription event may overwrite the stored row. Events for a
 * different, older subscription must not wipe out a plan that is still live.
 */
export function shouldApplySubscriptionEvent(
  stored: Pick<SubRow, "status" | "current_period_end" | "stripe_subscription_id"> | null,
  incomingId: string,
  incomingStatus: string,
  now = new Date(),
): boolean {
  if (!stored?.stripe_subscription_id || stored.stripe_subscription_id === incomingId) return true;
  if (!subscriptionActive(stored, now) || stored.status === "canceled") return true;
  return LIVE_STATUSES.includes(incomingStatus);
}
