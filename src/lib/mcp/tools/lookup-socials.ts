import { defineTool, ToolError } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";
import { ASSISTANT_LOOKUPS_PER_DAY, assistantLookupAllowed } from "@/lib/account/entitlements";

// Assistant lookups are logged in the append-only usage log with this tag (users cannot delete rows).
const MCP_PREFIX = "mcp:";

export default defineTool({
  name: "lookup_socials",
  title: "Find social profiles",
  description: "Find a company's social media profiles from its website address, with evidence for each match.",
  inputSchema: { url: z.string().trim().min(3).max(500).describe("Company website, e.g. stripe.com") },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: true },
  handler: async ({ url }, ctx) => {
    if (!ctx.isAuthenticated()) throw new ToolError("Sign in required.");
    const db = supabaseForUser(ctx);
    const { data: u } = await db.auth.getUser();
    if (!u.user) throw new ToolError("Sign in required.");
    const since = new Date(Date.now() - 86_400_000).toISOString();
    const { count } = await db
      .from("browser_runs")
      .select("id", { count: "exact", head: true })
      .eq("user_id", u.user.id)
      .like("domain", `${MCP_PREFIX}%`)
      .gte("run_at", since);
    if (!assistantLookupAllowed(count ?? 0)) throw new ToolError(`Daily limit of ${ASSISTANT_LOOKUPS_PER_DAY} assistant lookups reached. Try again tomorrow.`);
    const { error: logErr } = await db.from("browser_runs").insert({ user_id: u.user.id, domain: `${MCP_PREFIX}${url.slice(0, 200)}` });
    if (logErr) throw new ToolError("Couldn't record usage — try again.");
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
