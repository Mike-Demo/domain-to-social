import { createFileRoute } from "@tanstack/react-router";
import { SITE } from "@/lib/agent/docs";

// RFC 9727 API catalog. Lists only the MCP endpoint that exists today.
export const Route = createFileRoute("/.well-known/api-catalog")({
  server: {
    handlers: {
      GET: () =>
        new Response(
          JSON.stringify({
            linkset: [
              {
                anchor: `${SITE}/mcp`,
                "service-desc": [{ href: `${SITE}/openapi.json`, type: "application/json" }],
                "service-doc": [{ href: `${SITE}/auth.md`, type: "text/markdown" }, { href: `${SITE}/llms.txt`, type: "text/plain" }],
                "service-meta": [{ href: `${SITE}/.well-known/oauth-protected-resource`, type: "application/json" }],
              },
            ],
          }),
          { headers: { "content-type": 'application/linkset+json; profile="https://www.rfc-editor.org/info/rfc9727"' } },
        ),
    },
  },
});
