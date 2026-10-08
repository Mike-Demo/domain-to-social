import "./lib/error-capture";

import { consumeLastCapturedError } from "./lib/error-capture";
import { renderErrorPage } from "./lib/error-page";
import { AGENT_VIEW, INDEX_MD, LINK_HEADER, NOT_FOUND_MD, markdownResponse, wantsMarkdown } from "./lib/agent/docs";

type ServerEntry = {
  fetch: (request: Request, env: unknown, ctx: unknown) => Promise<Response> | Response;
};

let serverEntryPromise: Promise<ServerEntry> | undefined;

async function getServerEntry(): Promise<ServerEntry> {
  if (!serverEntryPromise) {
    serverEntryPromise = import("@tanstack/react-start/server-entry").then(
      (m) => (m.default ?? m) as ServerEntry,
    );
  }
  return serverEntryPromise;
}

// h3 swallows in-handler throws into a normal 500 Response with body
// {"unhandled":true,"message":"HTTPError"} — try/catch alone never fires for those.
async function normalizeCatastrophicSsrResponse(response: Response): Promise<Response> {
  if (response.status < 500) return response;
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) return response;

  const body = await response.clone().text();
  if (!isH3SwallowedErrorBody(body)) return response;

  console.error(consumeLastCapturedError() ?? new Error(`h3 swallowed SSR error: ${body}`));
  return new Response(renderErrorPage(), {
    status: 500,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

function isH3SwallowedErrorBody(body: string): boolean {
  try {
    const payload = JSON.parse(body) as { unhandled?: unknown; message?: unknown };
    return payload.unhandled === true && payload.message === "HTTPError";
  } catch {
    return false;
  }
}

export default {
  async fetch(request: Request, env: unknown, ctx: unknown) {
    try {
      const url = new URL(request.url);
      if (request.method === "GET" && url.pathname === "/") {
        if (url.searchParams.get("mode") === "agent") return Response.json(AGENT_VIEW, { headers: { link: LINK_HEADER } });
        if (wantsMarkdown(request.headers.get("accept"), request.headers.get("user-agent"))) {
          const res = markdownResponse(INDEX_MD);
          res.headers.set("link", LINK_HEADER);
          res.headers.set("vary", "Accept, User-Agent");
          return res;
        }
      }
      const handler = await getServerEntry();
      const raw = await normalizeCatastrophicSsrResponse(await handler.fetch(request, env, ctx));
      if (raw.status === 404 && /text\/markdown/i.test(request.headers.get("accept") ?? "")) return markdownResponse(NOT_FOUND_MD, 404);
      const type = raw.headers.get("content-type") ?? "";
      if (!type.includes("text/html")) return raw;
      const response = new Response(raw.body, raw);
      response.headers.append("link", LINK_HEADER);
      return response;
    } catch (error) {
      console.error(error);
      return new Response(renderErrorPage(), {
        status: 500,
        headers: { "content-type": "text/html; charset=utf-8" },
      });
    }
  },
};
