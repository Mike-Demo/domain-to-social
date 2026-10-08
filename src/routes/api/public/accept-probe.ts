import { createFileRoute } from "@tanstack/react-router";

// Temporary diagnostic: reports only content-negotiation headers so we can see what the live host forwards.
export const Route = createFileRoute("/api/public/accept-probe")({
  server: {
    handlers: {
      GET: ({ request }) => {
        const picked: Record<string, string> = {};
        request.headers.forEach((v, k) => {
          if (/accept|markdown|original|forward/i.test(k) && !/for$|ip/i.test(k)) picked[k] = v;
        });
        return Response.json(picked, { headers: { "cache-control": "no-store" } });
      },
    },
  },
});
