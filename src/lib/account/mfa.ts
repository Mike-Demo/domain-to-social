/** A session counts as two-factor only when its token says it reached assurance level 2. */
export function hasSecondFactor(claims: { aal?: unknown } | null | undefined): boolean {
  return claims?.aal === "aal2";
}
