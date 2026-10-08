// Brand Command last-resort fallback: a Browser Use cloud agent (API V4) opens the
// site like a person would and reports the social links it sees.
const API = "https://api.browser-use.com/api/v4";
const TERMINAL = new Set(["completed", "failed", "cancelled"]);
const MAX_WAIT_MS = 90_000;
const MAX_COST_USD = 0.5;

export interface BrowserUseLinks {
  links: string[];
  finalUrl: string;
}

function headers(key: string): Record<string, string> {
  return { "X-Browser-Use-API-Key": key, "Content-Type": "application/json" };
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Builds the agent instructions. Read-only: never sign in, submit forms or buy anything. */
export function browserTask(url: string): string {
  return [
    `Open ${url}. Dismiss cookie banners, pop-ups and country/region pickers (choose the main or US site).`,
    "Find every link to the company's own social media profiles (X/Twitter, Instagram, Facebook, LinkedIn, TikTok, YouTube, Threads, Bluesky, Tumblr, Product Hunt, etc.).",
    "Look in the header, footer, and if needed one About or Contact page on the same site.",
    "Do not sign in, fill in or submit forms, or buy anything.",
    'Return only JSON: {"links":["https://..."],"finalUrl":"https://..."}',
  ].join(" ");
}

export function parseBrowserResult(raw: string | null | undefined, fallbackUrl: string): BrowserUseLinks | null {
  if (!raw) return null;
  const match = raw.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    const obj = JSON.parse(match[0]) as { links?: unknown; finalUrl?: unknown };
    const links = Array.isArray(obj.links) ? obj.links.filter((l): l is string => typeof l === "string").slice(0, 50) : [];
    const finalUrl = typeof obj.finalUrl === "string" ? obj.finalUrl : fallbackUrl;
    return { links, finalUrl };
  } catch {
    return null;
  }
}

/** Returns links the agent found, or null on any failure. Always cancels/stops what it started. */
export async function browserUseLinks(url: string): Promise<BrowserUseLinks | null> {
  const key = process.env["BROWSER_USE_API_KEY"];
  if (!key) return null;
  let runId: string | undefined;
  let sessionId: string | undefined;
  try {
    const res = await fetch(`${API}/runs`, {
      method: "POST",
      headers: headers(key),
      body: JSON.stringify({ task: browserTask(url), maxCostUsd: MAX_COST_USD }),
      signal: AbortSignal.timeout(20_000),
    });
    if (!res.ok) {
      console.error(`Browser Use create failed [${res.status}]: ${(await res.text()).slice(0, 300)}`);
      return null;
    }
    const created = (await res.json()) as { id: string; sessionId?: string };
    runId = created.id;
    sessionId = created.sessionId;
    const deadline = Date.now() + MAX_WAIT_MS;
    let delay = 3000;
    let status = "";
    while (Date.now() < deadline) {
      await sleep(delay);
      const s = await fetch(`${API}/runs/${runId}/status`, { headers: headers(key), signal: AbortSignal.timeout(10_000) });
      if (s.status === 429) {
        delay = Math.min(Number(s.headers.get("retry-after") ?? 10) * 1000, 15_000);
        continue;
      }
      if (s.ok) status = ((await s.json()) as { status: string }).status;
      if (TERMINAL.has(status)) break;
      delay = Math.min(delay + 1000, 6000);
    }
    if (status !== "completed") return null;
    const full = await fetch(`${API}/runs/${runId}`, { headers: headers(key), signal: AbortSignal.timeout(10_000) });
    if (!full.ok) return null;
    return parseBrowserResult(((await full.json()) as { result?: string | null }).result, url);
  } catch (err) {
    console.error("Browser Use error", err);
    return null;
  } finally {
    // A client timeout doesn't stop the server-side run or browser — cancel and stop explicitly.
    if (runId) void fetch(`${API}/runs/${runId}/cancel`, { method: "POST", headers: headers(key) }).catch(() => undefined);
    if (sessionId)
      void fetch(`${API}/browsers/${sessionId}`, {
        method: "PATCH",
        headers: headers(key),
        body: JSON.stringify({ action: "stop" }),
      }).catch(() => undefined);
  }
}
