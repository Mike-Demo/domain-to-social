import { defineTool, ToolError } from "@lovable.dev/mcp-js";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "list_my_lookups",
  title: "List my recent lookups",
  description: "List the signed-in user's 50 most recent saved website lookups.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async (_args, ctx) => {
    const { data, error } = await supabaseForUser(ctx)
      .from("lookups")
      .select("id,domain,checked_at")
      .order("checked_at", { ascending: false })
      .limit(50);
    if (error) throw new ToolError(error.message);
    const lookups = (data ?? []).map((l) => ({ id: l.id, domain: l.domain, checkedAt: l.checked_at }));
    return {
      content: [{ type: "text", text: lookups.map((l) => `${l.domain} (${l.checkedAt})`).join("\n") || "No lookups yet." }],
      structuredContent: { lookups },
    };
  },
});
