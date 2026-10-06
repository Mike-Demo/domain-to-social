# Fix all accessibility audit findings

## Critical
1. **Batch file upload has no name** — give the CSV/TXT upload a clear label ("Upload a CSV or text list of target domains") in the Batch page.
2. **Search progress is silent** — add a screen-reader status announcer on the home radar that says "Scanning…", "Found N profiles", "Site blocked our visit", or the error message.
   - Same announcer for batch progress ("3 of 5 done").

## Warnings
3. **No visible focus on text boxes** — add a lime focus ring (keyboard focus only) to the radar input, manual URL input, batch text area, sign-in email/password, and new-list name box.
4. **Small tap targets on mobile** — make the bottom mobile nav buttons and the header account chip at least 44px tall.
5. **Full-height layouts clip on phones** — switch full-screen heights to the mobile-safe dynamic viewport unit in the site shell and the not-found / error screens.
6. **New-tab links don't warn** — add hidden "(opens in new tab)" text to every link that opens a new tab (profile "Inspect stream", licenses page links, billing portal).

## Info
7. Hide the decorative pulsing dot in the top ticker from screen readers.
8. Color-only badges already pass (text labels present) — no change.

## Technical details
- `batch.tsx`: `aria-label` on the hidden file input; `role="status" aria-live="polite"` sr-only region with progress count.
- `index.tsx`: sr-only `role="status" aria-live="polite"` region driven by busy/result/error state.
- Inputs: keep `outline-none`, add `focus-visible:ring-2 focus-visible:ring-primary-container` (existing theme token).
- `Chrome.tsx`: `min-h-11` on MobileNav items and AccountChip; `min-h-screen` → `min-h-dvh` in Shell and `__root.tsx` fallbacks; `aria-hidden="true"` on the ticker dot.
- `target="_blank"` links in ProfileSlab, licenses, account: append `<span className="sr-only"> (opens in new tab)</span>` and ensure `rel="noopener noreferrer"`.
- Verify with build log + Playwright keyboard-tab screenshot of the home page.
