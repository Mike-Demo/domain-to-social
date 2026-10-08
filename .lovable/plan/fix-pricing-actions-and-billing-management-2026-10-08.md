# Fix pricing actions and billing management

## Changes
- Rework each pricing card into consistent content and action regions so every purchase, upgrade, sign-in, and current-plan action aligns along the same bottom row on desktop while stacking cleanly on smaller screens.
- Keep long actions such as “Switch to Brand Command” inside their card by allowing readable wrapping and constraining the action to the card width.
- Change “Manage billing” to open the billing page in the current tab instead of a popup/new tab, avoiding browser popup restrictions.
- Show a clear nearby error if the billing page cannot be opened, and prevent repeated clicks while the page is being prepared.
- Keep the existing payment behavior: switching from Deep Recon to Brand Command reuses the saved payment method and applies the change immediately.

## Validation
- Check the pricing table at phone and desktop widths: all four action areas align, no text or buttons escape their cards, and every account/MFA state remains readable.
- From the operator console, open “Manage billing” and confirm it reaches the hosted billing page in the same tab; verify errors remain visible when session creation fails.
- Confirm the pricing and account pages still build without errors.

## Technical details
- Limit changes to `src/routes/pricing.tsx` and `src/routes/_authenticated/account.tsx`; payment, subscription, entitlement, and webhook rules remain unchanged.
- Use the existing DIGGR/Web Awesome design tokens and current page patterns; no new visual values or dependencies.
- Rollback is limited to these two presentation changes and does not affect purchases or stored billing data.
