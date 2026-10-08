const PROJECT_ID = "831c3fbb-ecd3-4cce-aa6f-d171c291f992";
const FIXED_HOSTS = new Set(["magicmanta.com", "www.magicmanta.com", "domain-to-social.lovable.app"]);
const DEFAULT_ORIGIN = "https://magicmanta.com";

/** Origin billing redirects may return to: only this app's own hosts; anything else falls back to the main site. */
export function trustedAppOrigin(host: string | null | undefined): string {
  const h = (host ?? "").toLowerCase();
  if (FIXED_HOSTS.has(h)) return `https://${h}`;
  if (h.endsWith(`${PROJECT_ID}.lovable.app`) || h === `${PROJECT_ID}.lovableproject.com`) return `https://${h}`;
  if (/^localhost(:\d+)?$/.test(h)) return `http://${h}`;
  return DEFAULT_ORIGIN;
}
