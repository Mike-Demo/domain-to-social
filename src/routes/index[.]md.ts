import { createFileRoute } from "@tanstack/react-router";
import { INDEX_MD, markdownResponse } from "@/lib/agent/docs";

export const Route = createFileRoute("/index.md")({
  server: { handlers: { GET: () => markdownResponse(INDEX_MD) } },
});
