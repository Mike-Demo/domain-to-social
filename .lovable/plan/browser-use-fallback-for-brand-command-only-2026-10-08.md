# Browser Use fallback for Brand Command only

## What changes for users
- Brand Command ($20/mo) lookups get one more step: if the normal site visit AND the Firecrawl render both fail or find no social links, a real cloud browser (Browser Use) opens the site, gets past pop-ups, cookie walls and country pickers (e.g. Best Buy), and reads the social links from the page and its footer/About page.
- Results found this way are labeled "found by live browser" in the evidence lines and still go through the usual verified/unverified rules and strong/moderate/weak labels.
- Free, Operative and Deep Recon lookups never use Browser Use.
- The result banner says when the live browser was used, or that it was tried and found nothing.

## Order of attempts (Brand Command)
```text
plain fetch -> Firecrawl render (+ about/contact subpages) -> Browser Use agent -> search / handle probes
```
Each step runs only if the one before it came back blocked or found no links.

## Cost and safety limits
- At most one Browser Use run per lookup, with a 90-second limit. The cloud browser is stopped after each run.
- A per-account cap of 20 Browser Use runs per day, checked on the server.
- The agent only receives the target site address and is told to read links, never to sign in, fill forms or buy anything.
- Every link it returns goes through the same safety check and profile matching as today. Anything that isn't a known social profile is thrown away.

## Needed from you
- A Browser Use API key. I'll ask for it securely once you approve this plan. It is never shown in the app.

## Technical details
- New `src/lib/social/browseruse.server.ts`: Cloud API V4 over `fetch` with the `X-Browser-Use-API-Key` header (no Bearer). Creates a task with a structured-output schema `{ links: string[] }` and polls its status with backoff, honoring Retry-After. It stops the browser with `PATCH /api/v4/browsers/{id}` `{action:"stop"}` and returns `null` on any failure. Exact request fields are checked against the published V4 OpenAPI reference before coding.
- `entitlements.ts`: add `browserAgent: r >= 3`.
- `lookupDomain(url, { enrich, browserAgent })`: after the Firecrawl block, if `browserAgent` is set and findings are still empty, call the Browser Use helper and feed its links into `extractFromHtml` with evidence suffix "(via live browser)". `enrichment` records `browserUse: { used, reason }`.
- The callers in `account.functions.ts` pass `browserAgent` from server-loaded entitlements and enforce the daily cap. A lightweight `browser_runs` count (user_id, run_at) with owner-only RLS makes the cap survive restarts.
- The result UI shows the new enrichment note.
- Tests: `entitlementsFor` gives `browserAgent` only to brand_command, and the daily cap rejects run 21.
- Update the project rule about Deep Recon enrichment in AGENTS.md to describe the three-step chain.

## Rollback
If Browser Use proves costly or flaky, set `browserAgent` to false in `entitlements.ts`. That turns the step off without touching anything else.
