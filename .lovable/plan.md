# M4G1C M4NT4 — Accounts, Paid Tiers, Saved Lists, Bulk and Brand Mode

Single lookups stay free. Paid tiers are added in phases, so each phase can ship and be tested before the next one starts.

## Tiers

```text
Free Radar        $5 one-time "Operative"   $10/mo "Deep Recon"          $20/mo "Brand Command"
1 URL at a time   Login + account           Everything in Operative      Everything in Deep Recon
No account        Saved lists               Firecrawl fallback for       Claim a brand by DNS TXT check
                  Bulk: 5 domains per run   blocked sites                Public verified brand page /b/<slug>
                  Lookup history            Browser-agent enrichment     Weekly monitoring + drift alerts
                  Share links               Bulk: 25 per run             Profile checklist (missing/stale)
```

## Phase 1: Accounts
- Turn on Lovable Cloud with email and Google sign-in.
- Add a `/auth` page, plus an account menu in the header that replaces the placeholder OP_HEX avatar.
- Add signed-in pages for the dashboard, lists, and billing.

## Phase 2: Payments
- Use Lovable's built-in Stripe payments (no Stripe account setup needed).
- Products: Operative ($5 one-time), Deep Recon ($10/month), Brand Command ($20/month).
- Checkout runs from a `/pricing` page. A payment webhook stores each user's plan.
- Server-side checks on every paid action decide what each plan unlocks. The look of the page is never used as a security check.

## Phase 3: Saved lists and history (Operative)
- Lookups made while signed in are saved automatically.
- "Save to list" on each result, plus pages to create, rename and delete lists.
- Export a list as CSV or JSON, and copy all verified handles in a list.

## Phase 4: Bulk searching (Operative: 5 at a time)
- Wire the existing Batch page to real lookups: paste or upload a CSV, results run 5 at a time and stream into the queue and console.
- Per-plan limits: Operative 5 per run, Deep Recon 25 per run.
- Results can be saved to a list as one batch.

## Phase 5: Deep Recon enrichment ($10/month)
- Connect Firecrawl. When a site blocks a normal visit (for example bestbuy.com), the page is fetched through Firecrawl instead.
- A browser agent visits the platforms that block logged-out visitors (X, Instagram, LinkedIn) to confirm profiles link back. It runs only on demand per lookup, and there is a monthly usage cap.
- Results are labeled by source ("via Firecrawl", "via browser check") so the evidence lines stay honest.

## Phase 6: Brand Command ($20/month)
- Claim a domain by adding a TXT record. Ownership is checked server-side.
- Public verified brand page at `/b/<slug>`, listing the brand's own approved handles, so others can find its real accounts.
- Weekly re-check, with an email alert when a handle disappears, changes, or a lookalike shows up.
- Checklist of missing platforms and profiles that don't link back to the site.

## Other ideas (not in scope unless approved)
- MCP server and API keys for Deep Recon and higher (reuses the existing lookup core).
- Impersonation watch: flag lookalike handles that copy the brand name.
- Team seats on Brand Command.
- Credit packs for occasional bulk use, instead of a subscription.

## Technical details
- Tables: `profiles`, `user_roles` (separate table), `subscriptions` (plan, status, period end; written only by the webhook), `lookups` (user_id, domain, result json, checked_at), `lists`, `list_items`, `brand_claims` (domain, txt_token, verified_at, slug), `monitor_runs`. RLS limits each table to its owner. Approved brand pages are readable by anyone.
- Auth-protected server functions use `requireSupabaseAuth`. A `getEntitlements(userId)` helper enforces plan limits inside each handler.
- Bulk runs use a server function that calls `lookupDomain` with up to 5 lookups at once. The client polls, or results arrive through realtime updates on the `lookups` table.
- Firecrawl is wired into `fetchSite` as a fallback when a site returns 403, 429 or a challenge page. It runs only when the plan allows it, and the API key stays on the server.
- Browser-agent enrichment needs a hosted browser service and its API key. Which provider to use is decided in Phase 5.
- Monitoring uses a scheduled job that calls `/api/public/cron/monitor`. The job proves who it is with a shared secret.
- Signed-in pages live under `_authenticated/`. The existing look and design tokens are kept for all new pages.

## Risks
- Firecrawl and browser-agent usage costs money per page. Monthly caps protect the $10 margin.
- Social platforms may still block browser checks. Those results stay "unconfirmed" rather than being guessed.
- Rollback: each phase is turned on by plan checks, so a phase can be switched off without losing data.
