import { defineTool, ToolError } from "@lovable.dev/mcp-js";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "list_my_lists",
  title: "List my saved lists",
  description: "List the signed-in user's saved lists with how many sites each holds.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async (_args, ctx) => {
    if (!ctx.isAuthenticated()) throw new ToolError("Sign in required.");
    const db = supabaseForUser(ctx);
    const { data: u } = await db.auth.getUser();
    if (!u.user) throw new ToolError("Sign in required.");
    const { loadEntitlements } = await import("@/lib/account/plan-access.server");
    const ent = await loadEntitlements({ supabase: db, userId: u.user.id });
    if (!ent.savedLists) throw new ToolError("Saved lists need the Operative plan or higher.");
    const { data, error } = await db
      .from("lists")
      .select("id,name,created_at,list_items(count)")
      .order("created_at", { ascending: false });
    if (error) throw new ToolError("Couldn't load your lists — try again.");
    const lists = (data ?? []).map((l) => ({
      id: l.id,
      name: l.name,
      createdAt: l.created_at,
      count: (l.list_items as unknown as { count: number }[])[0]?.count ?? 0,
    }));
    return {
      content: [{ type: "text", text: lists.map((l) => `${l.name} — ${l.count} sites (id ${l.id})`).join("\n") || "No lists yet." }],
      structuredContent: { lists },
    };
  },
});
