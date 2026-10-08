import { defineTool, ToolError } from "@lovable.dev/mcp-js";
import { z } from "zod";

export default defineTool({
  name: "lookup_socials",
  title: "Find social profiles",
  description: "Find a company's social media profiles from its website address, with evidence for each match.",
  inputSchema: { url: z.string().trim().min(3).max(500).describe("Company website, e.g. stripe.com") },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: true },
  handler: async ({ url }, ctx) => {
    if (!ctx.isAuthenticated()) throw new ToolError("Sign in required.");
    const { lookupDomain } = await import("@/lib/social/lookup.server");
    let r;
    try {
      r = await lookupDomain(url);
    } catch (e) {
      throw new ToolError(e instanceof Error ? e.message : "Lookup failed.");
    }
    const profiles = r.platforms.flatMap((p) =>
      p.entries.map((e) => ({
        platform: p.platformName,
        handle: e.tag,
        url: e.url,
        verified: e.verified,
        strength: e.rating ?? "weak",
        conflict: p.conflict,
        evidence: e.evidence,
      })),
    );
    const lines = profiles.map(
      (p) => `${p.platform}: ${p.handle} ${p.url} [${p.verified ? "verified" : "unverified"}, ${p.strength}]`,
    );
    return {
      content: [
        {
          type: "text",
          text: `${r.brandName} (${r.domain})${r.blocked ? " — site blocked direct visits" : ""}\n${lines.join("\n") || "No profiles found."}`,
        },
      ],
      structuredContent: {
        domain: r.domain,
        brandName: r.brandName,
        checkedAt: r.checkedAt,
        blocked: r.blocked,
        notFound: r.notFound,
        profiles,
      },
    };
  },
});
