import { describe, expect, it } from "vitest";
import { checkoutDecision, effectivePlan, shouldApplySubscriptionEvent, type SubRow } from "./billing";

const now = new Date("2026-10-08T12:00:00Z");
const future = "2026-11-08T12:00:00Z";
const past = "2026-09-01T12:00:00Z";
const row = (o: Partial<SubRow>): SubRow => ({
  plan: "free",
  status: "none",
  current_period_end: null,
  operative_lifetime: false,
  cancel_at_period_end: false,
  stripe_subscription_id: null,
  ...o,
});

describe("checkoutDecision", () => {
  it("refuses a second Operative purchase", () => {
    expect(checkoutDecision(row({ operative_lifetime: true }), "operative_onetime", now)).toBe("owned");
  });
  it("switches instead of opening a second subscription", () => {
    const r = row({ plan: "deep_recon", status: "active", current_period_end: future, stripe_subscription_id: "sub_1" });
    expect(checkoutDecision(r, "brand_command_monthly", now)).toBe("switch");
  });
  it("refuses buying the monthly plan you already have", () => {
    const r = row({ plan: "brand_command", status: "active", current_period_end: future, stripe_subscription_id: "sub_1" });
    expect(checkoutDecision(r, "brand_command_monthly", now)).toBe("owned");
  });
  it("opens checkout again once a canceled plan has ended", () => {
    const r = row({ plan: "deep_recon", status: "canceled", current_period_end: past, stripe_subscription_id: "sub_1" });
    expect(checkoutDecision(r, "deep_recon_monthly", now)).toBe("checkout");
  });
});

describe("effectivePlan", () => {
  it("keeps access through a failed renewal", () => {
    expect(effectivePlan(row({ plan: "deep_recon", status: "past_due", current_period_end: future }), now)).toBe("deep_recon");
  });
  it("falls back to Operative after a monthly plan ends", () => {
    expect(effectivePlan(row({ plan: "deep_recon", status: "canceled", current_period_end: past, operative_lifetime: true }), now)).toBe("operative");
  });
  it("drops to free when Operative is revoked", () => {
    expect(effectivePlan(row({ operative_lifetime: false }), now)).toBe("free");
  });
});

describe("shouldApplySubscriptionEvent", () => {
  const live = { status: "active", current_period_end: future, stripe_subscription_id: "sub_new" };
  it("ignores cancellation of an old subscription while a newer one is live", () => {
    expect(shouldApplySubscriptionEvent(live, "sub_old", "canceled", now)).toBe(false);
  });
  it("applies updates to the stored subscription", () => {
    expect(shouldApplySubscriptionEvent(live, "sub_new", "canceled", now)).toBe(true);
  });
});
