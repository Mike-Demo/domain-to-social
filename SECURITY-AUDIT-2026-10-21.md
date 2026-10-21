# Security audit remediation backlog — 2026-10-21

Parent: https://github.com/Mike-Demo/domain-to-social/issues/1

This is the requested fallback: this session has no issue-creation tool.
The five exact titles and issue bodies below are ready to file in this repository;
no child issues have been created and no application code has been changed.
The source audit used static inspection only, not execution or deployed probes.
The validation leads remain unconfirmed.

## Prioritization

| Order | Severity | Confirmed finding | Reachability and fix rationale |
| --- | --- | --- | --- |
| 1 | high | Recovery-code hash disclosure | A password-only (aal1) session can obtain its own recovery hashes without satisfying MFA. Offline guessing is still required to recover plaintext; disclosure is not direct code replay. Revoke the read grant first, then harden stored hashes and handle existing codes. |
| 2 | medium | Forged share snapshots shown as verified | Anyone can mint a snapshot without authentication; a victim must open the link to see forged trust claims. An explicit untrusted-snapshot presentation is a small containment fix; authentic snapshots require a server trust boundary. |
| 3 | low | Unbounded saved-result storage | An MFA-authenticated caller can repeatedly submit arbitrary result JSON, consuming shared storage. Both write paths need bounded validation and concurrency-safe row limits. This has more active abuse potential than deletion residue, despite the larger fix. |
| 4 | low | Gift redemption data survives deletion | Affects users who redeemed gifts and then delete their accounts; no additional cross-user read is established. The omission has a small, safe fix in the existing deletion loop. |

These are four distinct root causes, so file four remediation issues. The two
saved-result write paths share one validation/quota root cause and belong in one
issue. The share URL-scheme lead touches the snapshot path but remains separate
from the confirmed trust-badge finding until runtime behavior is validated.
Fix size is a tie-breaker after severity and lower-trust reachability, not a
reason to postpone the MFA boundary fix.

## Remediation issue 1

**Exact title:** `[security][high] Prevent aal1 access to recovery-code hashes`

### Issue body

Parent audit: https://github.com/Mike-Demo/domain-to-social/issues/1

Fingerprint: `recovery-code-hashes-readable-by-aal1-session`

**Priority:** 1 — high. Requires a password-only session for the target account,
not another user's identity or an aal2 session.

**Evidence:** [Migration 0003, lines 3–13](https://github.com/Mike-Demo/domain-to-social/blob/8f2ec069bd7fcb5e62f31415c386ba14e155fe04/drizzle/migrations/0003_mfa_recovery_codes.sql#L3-L13) grants
`authenticated` SELECT on `mfa_recovery_codes` under an own-rows policy checking
identity only, with no AAL check. Migrations 0004–0007 do not revoke that grant.
[Recovery helpers, lines 5–21](https://github.com/Mike-Demo/domain-to-social/blob/8f2ec069bd7fcb5e62f31415c386ba14e155fe04/src/lib/account/recovery.ts#L5-L21)
generate ten-character recovery codes from 31 symbols (roughly
49.5 nominal bits, with modulo bias) and store unsalted SHA-256 digests. Through PostgREST, an aal1 session
can read its own eight code hashes using the public publishable key. Hash
disclosure permits offline guessing without the online redemption rate limit;
it does not itself provide a redeemable plaintext code.
[Recovery server functions](https://github.com/Mike-Demo/domain-to-social/blob/8f2ec069bd7fcb5e62f31415c386ba14e155fe04/src/lib/account/recovery.functions.ts) already provide server-side status and
recovery operations using privileged database access.

**Root cause:** Database read authorization trusts identity where MFA assurance
is required, compounded by fast, unkeyed hashing of finite-entropy recovery codes.

**Smallest fix:** Add a forward migration revoking SELECT on
`public.mfa_recovery_codes` from `authenticated`; retain the server/service-role
paths. Replace raw SHA-256 storage with a slow salted KDF or a keyed HMAC using a
server-only secret so database disclosure alone does not allow raw SHA-256-speed
guessing. A public/client-bundled key would not provide this protection.
Define a safe transition for existing hashes (for example, invalidate them and
require regeneration); changing only newly generated codes leaves old hashes
exposed to the original risk. Already disclosed hashes cannot be made secret
again merely by revoking SELECT.

**Acceptance checks:**
- [ ] Direct authenticated database reads cannot disclose recovery hashes at aal1 or aal2; privileged server status/count still works.
- [ ] New hashes use the selected protected format; generation and single-use redemption still work.
- [ ] Existing raw SHA-256 codes have an explicit secure transition, with recovery/re-enrollment behavior tested.
- [ ] Recovery remains rate-limited and consuming a code remains atomic.

## Remediation issue 2

**Exact title:** `[security][medium] Stop presenting unsigned share snapshots as verified`

### Issue body

Parent audit: https://github.com/Mike-Demo/domain-to-social/issues/1

Fingerprint: `unsigned-share-snapshots-rendered-as-verified`

**Priority:** 2 — medium. An unauthenticated sender can craft a link; a recipient
must open it. This finding establishes forged provenance, not script execution.

**Evidence:** [Share encoding/decoding, lines 22–31](https://github.com/Mike-Demo/domain-to-social/blob/8f2ec069bd7fcb5e62f31415c386ba14e155fe04/src/lib/social/share.ts#L22-L31) exposes client-side `encodeResult` and
accepts deflate/base64url JSON in `decodeResult` after checking only a string
`domain` and an array `platforms`. There is no signature, MAC, expiry, or
server-side record. [The share route, lines 30–41](https://github.com/Mike-Demo/domain-to-social/blob/8f2ec069bd7fcb5e62f31415c386ba14e155fe04/src/routes/r.tsx#L30-L41) partitions decoded entries by their
supplied `status` and renders them with
[ProfileSlab, lines 111–133](https://github.com/Mike-Demo/domain-to-social/blob/8f2ec069bd7fcb5e62f31415c386ba14e155fe04/src/components/diggr/ProfileSlab.tsx#L111-L133), which displays the `Captured` badge for
`verified` entries. A sender controls the snapshot's status and evidence text.

**Root cause:** Unauthenticated client data is treated as service-issued lookup
evidence. Compression is encoding, not integrity protection.

**Smallest fix:** Treat every existing hash-supplied snapshot as explicitly
“user-supplied — not verified by a live lookup,” removing its Captured/verified
badge set and service-provenance presentation. This containment can ship without
introducing a backend. If service-verified shares are required, issue a server
HMAC over canonical, server-produced results or store genuine results under
unguessable IDs and load them server-side. Never sign arbitrary client JSON
and then present it as a verified lookup.

**Acceptance checks:**
- [ ] A crafted snapshot with `status: "verified"` cannot display service-verified/Captured claims.
- [ ] Supplied evidence is clearly attributed to the snapshot sender, not a live lookup.
- [ ] Genuine live lookup results keep their intended trust presentation; legacy share links receive the untrusted treatment.
- [ ] If authenticated snapshots are implemented, tampering fails verification and unsigned legacy tokens never inherit verified provenance.

## Remediation issue 3

**Exact title:** `[security][low] Bound saved lookup and list-item payloads and row counts`

### Issue body

Parent audit: https://github.com/Mike-Demo/domain-to-social/issues/1

Fingerprint: `unbounded-client-supplied-lookup-json-storage`

**Priority:** 3 — low. Requires an MFA-authenticated account, but repeated writes
can consume shared resources. Both endpoints share the same root cause.

**Evidence:** [saveLookup, lines 60–68](https://github.com/Mike-Demo/domain-to-social/blob/8f2ec069bd7fcb5e62f31415c386ba14e155fe04/src/lib/account/account.functions.ts#L60-L68)
and [addToList, lines 95–106](https://github.com/Mike-Demo/domain-to-social/blob/8f2ec069bd7fcb5e62f31415c386ba14e155fe04/src/lib/account/account.functions.ts#L95-L106)
use identity-cast validators, then insert client-controlled JSON
verbatim into the `lookups` and `list_items` JSONB columns. The validators
perform no schema parsing, serialized-size check, or depth/collection bounds.
There is no per-user row/rate quota on these writes or table-level result-size
or cumulative per-user row-count constraint. `saveLookup` inserts one row per
call and requires MFA but does not check a plan entitlement. `addToList` does
check the saved-list entitlement and slices each call to 25 results; that
per-call bound does not cap repeated writes or the size of individual results.
`createList` in the same file demonstrates the existing Zod
validation pattern. Ownership/MFA alone do not bound resource consumption.

**Root cause:** These two persistence entry points trust typed client input at
runtime and lack bounded storage admission.

**Smallest fix:** Validate both payloads server-side with a shared
`LookupResult` Zod schema, bounding nested fields/collections and rejecting
unsupported structure, plus an explicit serialized UTF-8 byte cap (for example,
256 KiB). Enforce per-user row caps for both lookups and list items before
insertion, with atomic database enforcement so concurrent requests cannot race
past the limits. Preserve existing ownership and entitlement checks. Ensure
direct database writes cannot bypass the selected bounds.

**Acceptance checks:**
- [ ] Both endpoints reject malformed, oversized, excessively nested, and overlong collection/string payloads without inserting rows.
- [ ] Valid payloads at the documented limits succeed; multibyte text is counted in bytes.
- [ ] Repeated and concurrent writes cannot exceed either per-user row cap, including via exposed database write paths.
- [ ] Existing saved-result behavior, list ownership, and entitlement checks remain intact.

## Remediation issue 4

**Exact title:** `[security][low] Erase gift redemptions during account deletion`

### Issue body

Parent audit: https://github.com/Mike-Demo/domain-to-social/issues/1

Fingerprint: `account-deletion-leaves-gift-redemptions-and-roles`

**Priority:** 4 — low. Affects gift recipients who delete their accounts; this
is retained user-linked data, not a demonstrated cross-user disclosure.
The fingerprint retains the audit identifier; only gift redemptions are affected.

**Evidence:** [deleteMyAccount, lines 140–165](https://github.com/Mike-Demo/domain-to-social/blob/8f2ec069bd7fcb5e62f31415c386ba14e155fe04/src/lib/account/payments.functions.ts#L140-L165) deletes list items, lists, lookups,
browser runs, recovery codes, subscriptions, and profiles before deleting the
auth user, but omits `gift_redemptions`.
[Migration 0005, lines 33–40](https://github.com/Mike-Demo/domain-to-social/blob/8f2ec069bd7fcb5e62f31415c386ba14e155fe04/drizzle/migrations/0005_gift_codes.sql#L33-L40) defines that table's `user_id` as a bare
UUID without an `auth.users` foreign key. Auth-user deletion therefore leaves
the user ID, redeemed plan, and redemption/gift-until timestamps behind.
[user_roles, lines 2–6](https://github.com/Mike-Demo/domain-to-social/blob/8f2ec069bd7fcb5e62f31415c386ba14e155fe04/drizzle/migrations/0005_gift_codes.sql#L2-L6) already has an auth-user foreign key with deletion cascade and
does not need remediation.

**Root cause:** An explicit erasure loop omits a user-owned table that has no
foreign-key cascade as a safety net.

**Smallest fix:** Include `gift_redemptions` in the existing `user_id` deletion
loop before `auth.admin.deleteUser`, preserving its error handling. Do not
modify `user_roles` or delete shared gift-code definitions.

**Acceptance checks:**
- [ ] Deleting an account with redemptions removes all its redemption rows before auth-user deletion.
- [ ] Other users' redemptions and shared gift codes remain unchanged.
- [ ] A redemption deletion failure is surfaced rather than reporting successful full erasure.
- [ ] Accounts without redemptions still delete successfully; existing role cascade remains intact.

## Validation checklist issue

**Exact title:** `[security][needs-validation] Audit leads to validate`

### Issue body

Parent audit: https://github.com/Mike-Demo/domain-to-social/issues/1

These are leads, not confirmed findings. Do not assign severity before obtaining
the missing facts. Record the deployment/build tested and evidence for each
conclusion; use an authorized, controlled environment rather than probing
unrelated hosts.

- [ ] **Anonymous lookup forwarded-header trust**
  - Fingerprint: `anon-rate-limit-keyed-on-spoofable-forwarded-headers`
  - Source lead: [Anonymous lookup, lines 18–21](https://github.com/Mike-Demo/domain-to-social/blob/8f2ec069bd7fcb5e62f31415c386ba14e155fe04/src/lib/social/lookup.functions.ts#L18-L21) selects the rate-limit bucket from `cf-connecting-ip` or `x-forwarded-for`; source inspection cannot establish ingress behavior.
  - Claimed root cause: The rate limiter trusts client-suppliable forwarded-IP headers as the bucket key without a source-visible guarantee that the deployment edge strips or overwrites them.
  - **Exact missing fact:** Whether the deployed edge (Lovable hosting / Cloudflare in front of the TanStack server functions) strips or overwrites client-supplied cf-connecting-ip and x-forwarded-for on requests to the server-function endpoints.
  - Validation: Check deployed ingress configuration and controlled endpoint requests for both headers, including their precedence and forwarded chains.

- [ ] **Share-snapshot URL scheme handling**
  - Fingerprint: `share-snapshot-entry-url-scheme-not-validated`
  - Source lead: Decoded snapshot entry URLs reach [ProfileSlab anchor hrefs, lines 98–104](https://github.com/Mike-Demo/domain-to-social/blob/8f2ec069bd7fcb5e62f31415c386ba14e155fe04/src/components/diggr/ProfileSlab.tsx#L98-L104).
  - Claimed root cause: Snapshot entry URLs pass from decodeResult to ProfileSlab's anchor href with no http/https scheme allowlist of the kind matchProfile applies to genuine lookup results.
  - **Exact missing fact:** Whether React DOM 19.2 as shipped in this build renders a javascript: href from ProfileSlab unchanged (executing on victim click), sanitizes/blocks it, or throws at render time.
  - Validation: Exercise the actual shipped build in an isolated browser with a harmless crafted snapshot; capture the rendered href and click/render outcome. Do not infer execution solely from source.

- [ ] **SSRF DNS check/connection binding**
  - Fingerprint: `ssrf-dns-check-not-pinned-to-fetch`
  - Source lead: [Lookup server, lines 93–133](https://github.com/Mike-Demo/domain-to-social/blob/8f2ec069bd7fcb5e62f31415c386ba14e155fe04/src/lib/social/lookup.server.ts#L93-L133) checks DNS with `resolvesPublicly()` before fetching the hostname.
  - Claimed root cause: The DNS check and the connection use two independent resolutions: resolvesPublicly() checks Cloudflare DoH answers, but fetch() re-resolves through the platform resolver with no pinning of the validated addresses to the connection.
  - **Exact missing fact:** Whether, in the deployed runtime, the platform resolver used by fetch() can return a different (private) address than Cloudflare DoH for the same attacker-controlled hostname at check vs connect time (split answers or short-TTL flip).
  - Validation: Use controlled DNS and an authorized test destination in the deployed runtime; record both DNS answers and the actual connection destination, accounting for caching and network restrictions.

Out of scope: `mcp-oauth-metadata-trusts-forwarded-host` was rejected during
independent verification. Do not reopen it without new evidence. No such new
evidence is supplied by this triage.
