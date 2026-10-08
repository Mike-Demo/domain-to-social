# End-to-end audit remediation: publish, accessibility, database

Three phases, ordered by value per effort. Phase 1 is free (no build work). Phase 2 is the largest. Phase 3 is small and mechanical.

## Phase 1 — Publish pending fixes (no build cost)
The SEO fixes already made (pricing page structured data, real data on Dossier and Source) only reach magicmanta.com on publish.
- Publish the site.
- After publish, click Rescan in the SEO & AI search tab to confirm the findings pass.

## Phase 2 — Accessibility fixes (largest part)
From the audit: no critical issues; the site already has labels, live announcements, focus rings, and 44px touch targets. Remaining items:
- Add skip-to-content links on the main pages.
- Mark the ticker and decorative sticker rotations as hidden from screen readers where missed.
- Make the pricing plan feature lists real lists (screen readers announce item counts).
- Re-verify on desktop and mobile viewports after the changes.

## Phase 3 — Database indexes + framework cleanup (small)
- Add an index so each account's lookup history loads fast as it grows (lookups by account, newest first).
- Add an index on the usage log (browser_runs by account, newest first) — this table is read on every paid lookup to check daily and monthly caps, so it grows fastest.
- Migrate the four server-function files from the deprecated `inputValidator()` to `.validator()` to silence the deprecation warnings.
- Run the existing test suite (17 tests) to confirm nothing breaks.

## Technical details
- Indexes go through a database migration; both are composite indexes on (user_id, timestamp DESC).
- Accessibility changes touch `src/components/diggr/Chrome.tsx`, `src/routes/pricing.tsx`, and the ticker/sticker markup.
- Validator migration touches `account.functions.ts`, `payments.functions.ts`, `support.functions.ts`, `lookup.functions.ts`.
- Rollback: each phase is independent; reverting the touched files restores current behavior. Indexes are additive and safe to leave in place.

## Out of scope (already known, not fixed here)
- Browser Use API key still awaiting a replacement from you.
- Email domain verification still pending (up to 72h).
- Brand Command "coming soon" features stay hidden until built.
