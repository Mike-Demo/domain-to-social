import { createFileRoute } from "@tanstack/react-router";
import { PRICING_MD, markdownResponse } from "@/lib/agent/docs";

export const Route = createFileRoute("/pricing.md")({
  server: { handlers: { GET: () => markdownResponse(PRICING_MD) } },
});
