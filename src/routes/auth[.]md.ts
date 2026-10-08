import { createFileRoute } from "@tanstack/react-router";
import { AUTH_MD, markdownResponse } from "@/lib/agent/docs";

export const Route = createFileRoute("/auth.md")({
  server: { handlers: { GET: () => markdownResponse(AUTH_MD) } },
});
