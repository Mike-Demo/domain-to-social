// Firecrawl enrichment (Deep Recon). Gateway-backed connection: never call api.firecrawl.dev directly.
const GATEWAY_V2 = "https://connector-gateway.lovable.dev/firecrawl/v2";

export interface FirecrawlBranding {
  logo?: string | undefined;
  colors?: Record<string, string> | undefined;
  fonts?: { family: string }[] | undefined;
}

export interface FirecrawlPage {
  html: string;
  links: string[];
  finalUrl: string;
  description?: string | undefined;
  branding?: FirecrawlBranding | undefined;
}

interface ScrapeDoc {
  rawHtml?: string;
  links?: string[];
  branding?: FirecrawlBranding & { images?: { logo?: string } };
  metadata?: { sourceURL?: string; url?: string; description?: string };
}

export function firecrawlConfigured(): boolean {
  return Boolean(process.env["LOVABLE_API_KEY"] && process.env["FIRECRAWL_API_KEY"]);
}

/** Renders the page in Firecrawl's browser (handles bot walls and JS-only links). Returns null on failure. */
export async function firecrawlScrape(url: string): Promise<FirecrawlPage | null> {
  const lovableKey = process.env["LOVABLE_API_KEY"];
  const fcKey = process.env["FIRECRAWL_API_KEY"];
  if (!lovableKey || !fcKey) return null;
  try {
    const res = await fetch(`${GATEWAY_V2}/scrape`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${lovableKey}`,
        "X-Connection-Api-Key": fcKey,
      },
      body: JSON.stringify({
        url,
        formats: ["rawHtml", "links", "branding"],
        onlyMainContent: false,
        timeout: 45000,
      }),
      signal: AbortSignal.timeout(50000),
    });
    if (!res.ok) {
      console.error(`Firecrawl scrape failed [${res.status}]: ${(await res.text()).slice(0, 300)}`);
      return null;
    }
    const body = (await res.json()) as { data?: ScrapeDoc } & ScrapeDoc;
    const doc: ScrapeDoc = body.data ?? body;
    if (!doc.rawHtml && !doc.links?.length) return null;
    const b = doc.branding;
    return {
      html: doc.rawHtml ?? "",
      links: doc.links ?? [],
      finalUrl: doc.metadata?.url ?? doc.metadata?.sourceURL ?? url,
      description: doc.metadata?.description,
      branding: b ? { logo: b.logo ?? b.images?.logo, colors: b.colors, fonts: b.fonts } : undefined,
    };
  } catch (err) {
    console.error("Firecrawl scrape error", err);
    return null;
  }
}

export interface FirecrawlSearchHit {
  url: string;
  title: string;
  snippet: string;
}

/** Paid-tier web search. Returns [] on failure so callers can fall back to the free search. */
export async function firecrawlSearch(query: string, limit = 5): Promise<FirecrawlSearchHit[]> {
  const lovableKey = process.env["LOVABLE_API_KEY"];
  const fcKey = process.env["FIRECRAWL_API_KEY"];
  if (!lovableKey || !fcKey) return [];
  try {
    const res = await fetch(`${GATEWAY_V2}/search`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${lovableKey}`,
        "X-Connection-Api-Key": fcKey,
      },
      body: JSON.stringify({ query, limit }),
      signal: AbortSignal.timeout(20000),
    });
    if (!res.ok) {
      console.error(`Firecrawl search failed [${res.status}]: ${(await res.text()).slice(0, 300)}`);
      return [];
    }
    const body = (await res.json()) as {
      data?: { url?: string; title?: string; description?: string }[] | { web?: { url?: string; title?: string; description?: string }[] };
    };
    const list = Array.isArray(body.data) ? body.data : (body.data?.web ?? []);
    return list
      .filter((r): r is { url: string; title?: string; description?: string } => typeof r.url === "string")
      .map((r) => ({ url: r.url, title: r.title ?? "", snippet: r.description ?? "" }));
  } catch (err) {
    console.error("Firecrawl search error", err);
    return [];
  }
}

const SUBPAGE_HINTS = ["about", "contact", "connect", "press", "company", "social", "community"];

/** Picks up to `max` same-site subpages likely to carry social links. */
export function pickSocialSubpages(links: string[], host: string, max = 2): string[] {
  const out: string[] = [];
  for (const l of links) {
    try {
      const u = new URL(l);
      const h = u.hostname.replace(/^www\./, "");
      if (h !== host.replace(/^www\./, "")) continue;
      const path = u.pathname.toLowerCase();
      if (!SUBPAGE_HINTS.some((k) => path.split("/").some((seg) => seg.startsWith(k)))) continue;
      const clean = `${u.origin}${u.pathname}`;
      if (!out.includes(clean)) out.push(clean);
      if (out.length >= max) break;
    } catch {
      continue;
    }
  }
  return out;
}
