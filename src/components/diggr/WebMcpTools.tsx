import { useEffect } from "react";
import { useServerFn } from "@tanstack/react-start";
import { lookupSocials } from "@/lib/social/lookup.functions";

type ToolDef = {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  execute: (input: { url?: unknown }) => Promise<unknown>;
};
type ModelContext = { registerTool?: (tool: ToolDef) => unknown };

// Registers in-page tools for browser agents (WebMCP). Only tools backed by a real, working call.
export function WebMcpTools() {
  const lookupFn = useServerFn(lookupSocials);
  useEffect(() => {
    const doc = document as Document & { modelContext?: ModelContext };
    const nav = navigator as Navigator & { modelContext?: ModelContext };
    const ctx = doc.modelContext?.registerTool ? doc.modelContext : nav.modelContext;
    if (!ctx?.registerTool) return;
    const reg = ctx.registerTool({
      name: "lookup_socials",
      description: "Find a company's social media profiles from its website address, with evidence for each match.",
      inputSchema: { type: "object", properties: { url: { type: "string", description: "Company website, e.g. stripe.com" } }, required: ["url"] },
      execute: async ({ url }) => {
        if (typeof url !== "string" || url.trim().length < 3) return { error: "Provide a website address." };
        return lookupFn({ data: { url: url.trim() } });
      },
    });
    return () => {
      if (reg && typeof (reg as { unregister?: () => void }).unregister === "function") (reg as { unregister: () => void }).unregister();
    };
  }, [lookupFn]);
  return null;
}
