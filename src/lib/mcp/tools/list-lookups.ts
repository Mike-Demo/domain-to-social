import { defineTool, ToolError } from "@lovable.dev/mcp-js";
import { supabaseForUser } from "../supabase";
import type { LookupResult } from "@/lib/social/types";

export default defineTool({
  name: "list_my_lookups",
  title: "List my recent lookups",
  description: "List the signed-in user's 50 most recent saved website lookups, newest first, with brand name and profiles found.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async (_args, ctx) => {
    if (!ctx.isAuthenticated()) throw new ToolError("Sign in required.");
    const { data, error } = await supabaseForUser(ctx)
      .from("lookups")
      .select("id,domain,checked_at,result")
      .order("checked_at", { ascending: false })
      .limit(50);
    if (error) throw new ToolError(error.message);
    const lookups = (data ?? []).map((l) => {
      const r = l.result as unknown as Partial<LookupResult> | null;
      const profiles = (r?.platforms ?? []).flatMap((p) =>
        p.entries.map((e) => ({ platform: p.platformName, handle: e.tag, url: e.url, verified: e.verified, strength: e.rating ?? "weak" })),
      );
      return { id: l.id, domain: l.domain, checkedAt: l.checked_at, brandName: r?.brandName ?? l.domain, profiles };
    });
    const text = lookups
      .map((l) => `${l.brandName} (${l.domain}) — ${l.checkedAt} — ${l.profiles.length} profiles`)
      .join("\n");
    return {
      content: [{ type: "text", text: text || "No lookups yet." }],
      structuredContent: { lookups },
    };
  },
});
