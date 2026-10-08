<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Social lookup core lives in `src/lib/social/lookup.server.ts` (framework-agnostic `lookupDomain`); server fns are thin wrappers. Why: bulk lookups and an MCP server can reuse it later as premium entry points.
- Platform rules live only in `src/lib/social/platforms.ts`. Why: one registry drives extraction, search fallback, and UI.
- Fallback search uses DuckDuckGo HTML (no API key). Why: free/open for the MVP; swap behind `ddgSearch` if rate-limited.
- Tier 3 fallback = direct per-platform existence probes (`probe` in `platforms.ts`) on guessed handles, kept only when the profile links back, always unverified. Why: cheap, no 1000-site machinery.
- qeeqbox/social-analyzer is reference-only, never a dependency; if a probe library is ever needed, prefer MIT Sherlock. Why: AGPL-3.0 conflicts with a hosted premium service, and it pulls Firefox/Selenium/tesseract.
- Evidence strength is a computed label (strong/moderate/weak from counted signals via `rateEntry`), never a percentage. Why: honest, explainable confidence.
- Share links are self-contained snapshots: the lookup result is deflate-compressed into the `/r#<token>` hash (`src/lib/social/share.ts`). Why: read-only, tamper-evident-by-design links with no backend storage.
- Plan limits are enforced server-side via `entitlementsFor` in `src/lib/account/entitlements.ts`, read from the `subscriptions` table (written only by the payment webhook). Why: UI gating is never a security boundary.
- Paid enrichment chain in `lookupDomain`: plain fetch -> Firecrawl (`firecrawl.server.ts`, Deep Recon+) -> Browser Use live browser (`browseruse.server.ts`, Brand Command only, daily cap via `browser_runs`); each step runs only when the previous found no links, and gating comes from server-side entitlements. Why: caps third-party spend and keeps gating server-side.
- MCP server (agent integrations): lookup_socials, list_my_lookups, list_my_lists via OAuth sign-in. Why: lets assistants use the app as the signed-in user with RLS.
- Backup codes: 8 single-use codes stored only as SHA-256 hashes in `mfa_recovery_codes` (written via server functions only); redeeming one burns it and deletes the user's authenticator so they re-enroll. Why: lost-phone recovery without a support desk, and a stolen code cannot skip setting up a new authenticator.
- Two-factor (authenticator app / TOTP) is mandatory for every account: `_authenticated` and the OAuth consent page redirect to `/mfa` until the session is aal2, and member server functions use `requireMfaAuth` (`src/lib/account/mfa-middleware.ts`). Why: UI redirects are not a security boundary; MCP tokens are issued only after an aal2 consent.
- Paid page-render usage is logged in `browser_runs` with an `enrich:` domain prefix and capped per rolling 30 days via `enrichmentAllowed`. Why: no migration tool was available; the append-only, own-rows-only log already prevents users resetting caps.
- Plan/purchase rules (what a purchase does, effective plan, which webhook events may overwrite a row) live in `src/lib/account/billing.ts` and are unit-tested. Why: checkout, plan switching, webhook and entitlements must agree on one definition.
