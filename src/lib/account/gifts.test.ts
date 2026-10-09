import { describe, expect, it } from "vitest";
import { effectivePlan, type SubRow } from "./billing";

const now = new Date("2026-10-09T00:00:00Z");
const paid: SubRow = { plan: "brand_command", status: "active", current_period_end: "2026-11-01T00:00:00Z", operative_lifetime: false, cancel_at_period_end: false, stripe_subscription_id: "sub_1" };

describe("gifted plans", () => {
  it("a gift raises a free account", () => {
    expect(effectivePlan(null, now, [{ plan: "deep_recon", gift_until: "2026-11-08T00:00:00Z" }])).toBe("deep_recon");
  });
  it("a gift never lowers a paid plan", () => {
    expect(effectivePlan(paid, now, [{ plan: "operative", gift_until: null }])).toBe("brand_command");
  });
  it("an expired gift is ignored", () => {
    expect(effectivePlan(null, now, [{ plan: "deep_recon", gift_until: "2026-10-01T00:00:00Z" }])).toBe("free");
  });
  it("a lifetime gift has no end", () => {
    expect(effectivePlan(null, now, [{ plan: "operative", gift_until: null }])).toBe("operative");
  });
});
