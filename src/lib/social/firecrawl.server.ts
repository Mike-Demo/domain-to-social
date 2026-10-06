// Firecrawl enrichment (Deep Recon). Gateway-backed connection: never call api.firecrawl.dev directly.
const GATEWAY_V2 = "https://connector-gateway.lovable.dev/firecrawl/v2";

export interface FirecrawlBranding {
  logo?: string;
  colors?: Record<string, string>;
  fonts?: { family: string }[];
}

export interface FirecrawlPage {
  html: string;
  links: string[];
  finalUrl: string;
  description?: string;
  branding?: FirecrawlBranding;
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
