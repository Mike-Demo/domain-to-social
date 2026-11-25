/** A session counts as two-factor only when its token says it reached assurance level 2. */
export function hasSecondFactor(claims: { aal?: unknown } | null | undefined): boolean {
  return claims?.aal === "aal2";
}

const AGENT_ID_PROVIDER = "custom:app-oidc";

/** The AppSumo reviewer account skips the authenticator step so marketplace QA can sign in with a password. */
export const MFA_EXEMPT_EMAILS: readonly string[] = ["mdemop+appsumo@mikedemo.com"];

function isExemptEmail(email: unknown): boolean {
  return typeof email === "string" && MFA_EXEMPT_EMAILS.includes(email.toLowerCase());
}

/**
 * Server-side: the access token names the identity provider in `app_metadata`
 * (`amr` only stores the auth method, e.g. "oauth"); `amr` is kept as a fallback.
 */
export function isAgentIdSession(
  claims:
    | {
        amr?: unknown;
        email?: unknown;
        app_metadata?: { provider?: unknown; providers?: unknown };
      }
    | null
    | undefined,
): boolean {
  if (isExemptEmail(claims?.email)) return true;
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
  user: { email?: unknown; app_metadata?: { provider?: unknown; providers?: unknown } } | null | undefined,
): boolean {
  if (isExemptEmail(user?.email)) return true;
  const meta = user?.app_metadata;
  if (!meta) return false;
  if (meta.provider === AGENT_ID_PROVIDER) return true;
  return Array.isArray(meta.providers) && meta.providers.includes(AGENT_ID_PROVIDER);
}
