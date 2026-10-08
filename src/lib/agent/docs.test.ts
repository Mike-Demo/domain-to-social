import { describe, expect, it } from "vitest";
import { PRICING_MD, wantsMarkdown } from "./docs";

describe("agent docs", () => {
  it("serves markdown to clients that ask for it", () => {
    expect(wantsMarkdown("text/markdown", null)).toBe(true);
    expect(wantsMarkdown("text/html", "Mozilla/5.0 (compatible; GPTBot/1.0)")).toBe(true);
    expect(wantsMarkdown("text/html", "Mozilla/5.0 Chrome")).toBe(false);
  });
  it("pricing.md uses the exact tier names and prices from /pricing", () => {
    expect(PRICING_MD).toContain("## Free Radar — $0");
    expect(PRICING_MD).toContain("## Operative — $5 once");
    expect(PRICING_MD).toContain("## Deep Recon — $10 / mo");
    expect(PRICING_MD).toContain("## Brand Command — $20 / mo");
    expect(PRICING_MD).not.toContain("Free Scout");
  });
});
