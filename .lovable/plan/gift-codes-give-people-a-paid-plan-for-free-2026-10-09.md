# Gift codes: give people a paid plan for free

You make codes in a private admin page. Anyone you send a code to types it into their Operator console and gets the plan. They never see a checkout.

## What you get
- **Admin page (`/admin/gifts`)**: only your account can open it. You pick:
  - the plan (Operative, Deep Recon, or Brand Command)
  - how long it lasts (for example 30, 90, or 365 days; Operative is always lifetime)
  - how many people can use the code (1 by default)
  - an optional note, for example "for Sarah"
  Then press Create. The page lists every code with its uses and expiry date, and has a Disable button.
- **Redeem box** in the Operator console: "Have a gift code?" Type the code and press Redeem. The new plan shows up right away, with a line like "Gifted Deep Recon until Jan 6, 2027".
- **What happens with a paid plan**: the gift never cancels or changes a paid subscription. The account gets whichever plan is higher. When a gift ends, the account goes back to its paid plan, or to Free.
- **Limits**: each account can redeem a given code only once. Codes that have expired, been disabled, or used up are refused with a clear message. Redeem attempts are rate-limited so nobody can guess codes.

## Technical details
- New tables (RLS on, grants included):
  - `user_roles`: enum `app_role` ('admin'), plus a `has_role()` security-definer function. Your account gets seeded as admin with a one-time insert.
  - `gift_codes`: code_hash, plan, duration_days, max_uses, uses, note, expires_at, disabled_at, created_by. No client access. Admins read it through server functions.
  - `gift_redemptions`: code_id, user_id, plan, gift_until, unique(code_id, user_id). Users can read only their own rows.
- Codes are stored as SHA-256 hashes, the same way as backup codes. The full code is shown once, when it's created.
- `effectivePlan` in `billing.ts` gains one optional input: the best active gift. It returns the higher of the paid plan and the gift. The payment webhook keeps sole ownership of the `subscriptions` table, so the gift and Stripe logic can't overwrite each other.
- `entitlementsFor` is unchanged. Every place that resolves entitlements (account, lookup, lists, MCP) reads active gifts through a shared helper.
- Server functions in `src/lib/account/gifts.functions.ts`:
  - `createGiftCode`, `listGiftCodes`, `disableGiftCode`: require MFA and check admin status through `has_role`
  - `redeemGiftCode`: requires MFA, does an atomic increment-if-available, then inserts the redemption
- Unit tests: a gift raises the plan, a gift never lowers a paid plan, an expired gift is ignored, an exhausted, disabled, or repeat code is refused.
- Rollback: disable all codes. Gift rows can stay, and paid billing is unaffected.

## Assumptions to confirm
- Only you (the account you're signed in with) are admin.
- Gifts don't renew. When the time runs out, the plan ends.
