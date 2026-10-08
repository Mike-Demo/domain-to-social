import { describe, expect, it } from "vitest";
import { browserRunAllowed, enrichmentAllowed, entitlementsFor } from "./entitlements";
import { hasSecondFactor } from "./mfa";

describe("live-browser fallback", () => {
  it("is only on the Brand Command plan", () => {
    expect(entitlementsFor("free").browserAgent).toBe(false);
    expect(entitlementsFor("operative").browserAgent).toBe(false);
    expect(entitlementsFor("deep_recon").browserAgent).toBe(false);
    expect(entitlementsFor("brand_command").browserAgent).toBe(true);
  });

  it("allows 20 runs per day and rejects the 21st", () => {
    expect(browserRunAllowed(19)).toBe(true);
    expect(browserRunAllowed(20)).toBe(false);
  });
});

describe("paid page-render allowance", () => {
  it("gives Deep Recon 300 and Brand Command 1000 per 30 days", () => {
    expect(enrichmentAllowed("deep_recon", 299)).toBe(true);
    expect(enrichmentAllowed("deep_recon", 300)).toBe(false);
    expect(enrichmentAllowed("brand_command", 999)).toBe(true);
    expect(enrichmentAllowed("brand_command", 1000)).toBe(false);
  });
  it("gives free and Operative none", () => {
    expect(enrichmentAllowed("free", 0)).toBe(false);
    expect(enrichmentAllowed("operative", 0)).toBe(false);
  });
});

describe("two-factor requirement", () => {
  it("accepts only sessions verified with an authenticator app", () => {
    expect(hasSecondFactor({ aal: "aal2" })).toBe(true);
    expect(hasSecondFactor({ aal: "aal1" })).toBe(false);
    expect(hasSecondFactor(null)).toBe(false);
  });
});
