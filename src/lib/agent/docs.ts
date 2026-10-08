// Machine-readable documents for AI agents. Every claim here must match the live site and code.
export const SITE = "https://magicmanta.com";
export const LAST_UPDATED = "2026-10-08";
export const SUPPORT_EMAIL = "support-magicmanta@agentmail.to";
export const AUTH_SERVER_METADATA = "https://cylatnxyocxtmmnejajy.supabase.co/auth/v1/.well-known/oauth-authorization-server";

export const INDEX_MD = `---
title: M4G1C M4NT4 — find any brand's social profiles
description: M4G1C M4NT4 finds and verifies a company's social media profiles from its website URL, with the evidence behind every handle.
canonical: ${SITE}/
last-updated: ${LAST_UPDATED}
---

# M4G1C M4NT4

M4G1C M4NT4 finds and verifies a company's social media profiles from its website URL — enter a domain and it sweeps X, Threads, Instagram, LinkedIn, Bluesky, GitHub and more, showing the evidence behind every handle.

## How it works

1. Enter a brand's domain on the [homepage](${SITE}/).
2. Review the found profiles and their evidence sources. Profiles declared by the site itself (JSON-LD sameAs or links on the official site) are Verified; search candidates stay Unverified unless they link back.
3. Copy individual handles or the whole set.

## For agents

- MCP server: ${SITE}/mcp (Streamable HTTP, OAuth 2.0 sign-in required) — see [auth.md](${SITE}/auth.md)
- Pricing: [pricing.md](${SITE}/pricing.md)
- Index: [llms.txt](${SITE}/llms.txt)
- Support: ${SUPPORT_EMAIL}
`;

export const PRICING_MD = `---
title: M4G1C M4NT4 pricing
description: Plans, prices and limits for M4G1C M4NT4.
canonical: ${SITE}/pricing
last-updated: ${LAST_UPDATED}
---

# M4G1C M4NT4 pricing

Prices in USD. Source of truth: ${SITE}/pricing

## Free Radar — $0
- 1 domain at a time
- No account needed
- Share links

## Operative — $5 once
- Account + lookup history
- Saved lists + CSV/JSON export
- Bulk: 5 domains per run

## Deep Recon — $10 / mo
- Everything in Operative
- Deep page checks for blocked sites (300 / 30 days)
- Bulk: 25 per run

## Brand Command — $20 / mo
- Everything in Deep Recon
- Deep page checks (1,000 / 30 days)
- Live browser checks (20 / day)
- Coming soon: claim your domain, public brand page, monitoring + alerts

## Limits
- Free lookups (no account): 10 lookups and 20 brand searches per minute from one network
- Signed-in lookups: 30 sites per minute per account, including batches
- MCP (assistant) lookups: 100 per account per day
- Full policy: ${SITE}/fair-use
`;

export const AUTH_MD = `# M4G1C M4NT4 — authentication for agents

M4G1C M4NT4 has one authenticated machine surface: the MCP server at ${SITE}/mcp. There is no API key system and no public REST API. Agents act on behalf of a signed-in human user; every request runs with that user's permissions and limits.

## Discover

- Protected resource metadata (RFC 9728): ${SITE}/.well-known/oauth-protected-resource
- An unauthenticated request to ${SITE}/mcp returns HTTP 401 with \`WWW-Authenticate: Bearer resource_metadata="${SITE}/.well-known/oauth-protected-resource"\`.
- The authorization server is our managed auth provider, listed in \`authorization_servers\` of that document. Its RFC 8414 metadata: ${AUTH_SERVER_METADATA}

## Pick a method

- agent_auth: not applicable. We do not run an identity_endpoint, and do not accept identity_assertion, service_auth or id-jag tokens.
- Supported: OAuth 2.0 authorization code flow with PKCE, started by your MCP client from the metadata above.

## Register

Not applicable — no agent registration endpoint. Use the client registration your MCP client performs with the authorization server above.

## Claim

Not applicable — no claim endpoint. The human user signs in at ${SITE}/auth with Google, Apple, Microsoft, AgentID, or email and password, completes two-factor sign-in with an authenticator app (required for every account), and approves access on the consent screen.

## Exchange

Not applicable — no custom exchange endpoint. Exchange the authorization code at the token endpoint given in the authorization server metadata.

## Use the access_token

Send \`Authorization: Bearer <access_token>\` on every request to ${SITE}/mcp. Tools: lookup_socials, list_my_lookups, list_my_lists. MCP lookups are capped at 100 per account per day.

## Errors

- 401 \`{"error":"unauthorized"}\` with a WWW-Authenticate header: missing or invalid token.
- Tool errors are returned as MCP tool errors with a plain-language message (for example, the daily limit).

## Revocation

The user can sign out or delete their account at ${SITE}/account. Questions: ${SUPPORT_EMAIL}
`;

export const NOT_FOUND_MD = `# Not found

This page does not exist on M4G1C M4NT4. Start from the [site index](${SITE}/llms.txt), the [sitemap](${SITE}/sitemap.xml), or the [homepage](${SITE}/).
`;

export const AGENT_VIEW = {
  name: "M4G1C M4NT4",
  url: `${SITE}/`,
  description: "Finds and verifies a company's social media profiles from its website URL, with evidence for each handle.",
  capabilities: [
    { name: "lookup_socials", description: "Find a company's social media profiles from its website address, with evidence for each match." },
    { name: "list_my_lookups", description: "List the signed-in user's 50 most recent saved lookups." },
    { name: "list_my_lists", description: "List the signed-in user's saved lists." },
  ],
  mcp: { url: `${SITE}/mcp`, transport: "streamable-http" },
  auth: { type: "oauth2", docs: `${SITE}/auth.md`, protectedResourceMetadata: `${SITE}/.well-known/oauth-protected-resource` },
  restApi: null,
  docs: { llms: `${SITE}/llms.txt`, pricing: `${SITE}/pricing.md`, openapi: `${SITE}/openapi.json`, markdown: `${SITE}/index.md` },
  contact: SUPPORT_EMAIL,
} as const;

export const LINK_HEADER = [
  `<${SITE}/sitemap.xml>; rel="sitemap"`,
  `<${SITE}/index.md>; rel="alternate"; type="text/markdown"`,
  `<${SITE}/openapi.json>; rel="service-desc"; type="application/json"`,
  `<${SITE}/.well-known/api-catalog>; rel="api-catalog"`,
  `<${SITE}/llms.txt>; rel="describedby"; type="text/plain"`,
].join(", ");

const AI_BOTS = ["gptbot", "claudebot", "chatgpt-user", "perplexitybot", "google-extended", "applebot-extended", "ora-agent", "deepseekbot"];

export function wantsMarkdown(accept: string | null, userAgent: string | null): boolean {
  if (accept && /text\/markdown/i.test(accept)) return true;
  const ua = (userAgent ?? "").toLowerCase();
  return AI_BOTS.some((b) => ua.includes(b));
}

export function markdownResponse(body: string, status = 200): Response {
  return new Response(body, { status, headers: { "content-type": "text/markdown; charset=utf-8", "cache-control": "public, max-age=3600" } });
}
