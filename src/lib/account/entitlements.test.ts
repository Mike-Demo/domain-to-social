import { describe, expect, it } from "vitest";
import { browserRunAllowed, entitlementsFor } from "./entitlements";

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
