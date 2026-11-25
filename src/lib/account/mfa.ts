/** A session counts as two-factor only when its token says it reached assurance level 2. */
export function hasSecondFactor(claims: { aal?: unknown } | null | undefined): boolean {
  return claims?.aal === "aal2";
}

const AGENT_ID_PROVIDER = "custom:app-oidc";

/**
 * The AppSumo reviewer account skips the authenticator step so marketplace QA can sign in
 * with a password. The exemption is bound to the account's fixed id (not just its email,
 * which another sign-in provider could claim unverified) and to a password-only account.
 */
export const MFA_EXEMPT_ACCOUNTS: readonly { id: string; email: string }[] = [
  { id: "d9a1f286-c436-4a88-bc5e-363acfc15c56", email: "mdemop+appsumo@mikedemo.com" },
];

type ExemptCandidate = {
  id?: unknown;
  email?: unknown;
  app_metadata?: { provider?: unknown; providers?: unknown } | undefined;
};

function isExemptAccount(c: ExemptCandidate | null | undefined): boolean {
  if (!c || typeof c.id !== "string" || typeof c.email !== "string") return false;
  const email = c.email.toLowerCase();
  if (!MFA_EXEMPT_ACCOUNTS.some((a) => a.id === c.id && a.email === email)) return false;
  const providers = c.app_metadata?.providers;
  return (
    c.app_metadata?.provider === "email" &&
    Array.isArray(providers) &&
    providers.length === 1 &&
    providers[0] === "email"
  );
}

/**
 * Server-side: the access token names the identity provider in `app_metadata`
 * (`amr` only stores the auth method, e.g. "oauth"); `amr` is kept as a fallback.
 */
export function isAgentIdSession(
  claims:
    | {
        amr?: unknown;
        sub?: unknown;
        email?: unknown;
        app_metadata?: { provider?: unknown; providers?: unknown };
      }
    | null
    | undefined,
): boolean {
  if (claims && isExemptAccount({ id: claims.sub, email: claims.email, app_metadata: claims.app_metadata }))
    return true;
  const meta = claims?.app_metadata;
  if (meta) {
    if (meta.provider === AGENT_ID_PROVIDER) return true;
    if (Array.isArray(meta.providers) && meta.providers.includes(AGENT_ID_PROVIDER)) return true;
  }
  const amr = claims?.amr;
  return (
    Array.isArray(amr) &&
    amr.some(
      (e) => typeof e === "object" && e !== null && (e as { provider?: unknown }).provider === AGENT_ID_PROVIDER,
    )
  );
}

/** Client-side: the user object's provider list names how the account signed in. */
export function isAgentIdUser(
  user:
    | {
        id?: unknown;
        email?: unknown;
        email_confirmed_at?: unknown;
        app_metadata?: { provider?: unknown; providers?: unknown };
      }
    | null
    | undefined,
): boolean {
  if (user && typeof user.email_confirmed_at === "string" && isExemptAccount(user)) return true;
  const meta = user?.app_metadata;
  if (!meta) return false;
  if (meta.provider === AGENT_ID_PROVIDER) return true;
  return Array.isArray(meta.providers) && meta.providers.includes(AGENT_ID_PROVIDER);
}
