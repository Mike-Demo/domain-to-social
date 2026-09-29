// Core lookup service. Framework-agnostic so it can back single lookups today and
// bulk jobs / an MCP server later without changes.
import { parse, type HTMLElement } from "node-html-parser";
import { PLATFORMS, SOCIAL_HOSTS, matchProfile, normalizeHost, type PlatformId } from "./platforms";
import type { DomainCandidate, LookupResult, PlatformResult, ProfileEntry, ReciprocalStatus } from "./types";

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";

async function fetchText(url: string, timeoutMs = 10000): Promise<{ text: string; finalUrl: string } | null> {
  try {
    const res = await fetch(url, {
      headers: { "user-agent": UA, accept: "text/html,application/xhtml+xml" },
      redirect: "follow",
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!res.ok) return null;
    return { text: (await res.text()).slice(0, 3_000_000), finalUrl: res.url || url };
  } catch {
    return null;
  }
}

export function normalizeInputUrl(input: string): string {
  const trimmed = input.trim();
  const withProto = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  const u = new URL(withProto);
  return `${u.protocol}//${u.host}${u.pathname}`;
}

interface RawFinding {
  platformId: PlatformId;
  handle: string;
  tag: string;
  url: string;
  source: "jsonld" | "site";
  evidence: string;
}

function collectSameAs(node: unknown, out: string[]): void {
  if (Array.isArray(node)) {
    node.forEach((n) => collectSameAs(n, out));
    return;
  }
  if (node && typeof node === "object") {
    for (const [k, v] of Object.entries(node as Record<string, unknown>)) {
      if (k === "sameAs") {
        if (typeof v === "string") out.push(v);
        else if (Array.isArray(v)) v.forEach((x) => typeof x === "string" && out.push(x));
      } else collectSameAs(v, out);
    }
  }
}

function findOrgName(node: unknown): string | null {
  if (Array.isArray(node)) {
    for (const n of node) {
      const r = findOrgName(n);
      if (r) return r;
    }
    return null;
  }
  if (node && typeof node === "object") {
    const o = node as Record<string, unknown>;
    const t = o["@type"];
    const types = Array.isArray(t) ? t : [t];
    if (types.some((x) => x === "Organization" || x === "Corporation" || x === "Brand") && typeof o.name === "string")
      return o.name;
    for (const v of Object.values(o)) {
      const r = findOrgName(v);
      if (r) return r;
    }
  }
  return null;
}

function locationOf(el: HTMLElement): string {
  let cur: HTMLElement | null = el;
  while (cur) {
    const tag = cur.tagName?.toLowerCase();
    const cls = `${cur.getAttribute?.("class") ?? ""} ${cur.getAttribute?.("id") ?? ""}`.toLowerCase();
    if (tag === "footer" || /footer/.test(cls)) return "footer";
    if (tag === "header" || /header/.test(cls)) return "header";
    if (tag === "nav") return "navigation";
    cur = cur.parentNode as HTMLElement | null;
  }
  return "page body";
}

function extractFromHtml(html: string, pageUrl: string, domain: string) {
  const root = parse(html);
  const findings: RawFinding[] = [];
  const jsonLdNodes: unknown[] = [];

  for (const s of root.querySelectorAll('script[type="application/ld+json"]')) {
    try {
      jsonLdNodes.push(JSON.parse(s.text));
    } catch {
      /* ignore malformed JSON-LD */
    }
  }
  const sameAs: string[] = [];
  jsonLdNodes.forEach((n) => collectSameAs(n, sameAs));
  for (const url of sameAs) {
    const m = matchProfile(url);
    if (m) findings.push({ platformId: m.platform.id, ...m.profile, source: "jsonld", evidence: "Found in JSON-LD sameAs" });
  }

  for (const a of root.querySelectorAll("a[href], link[rel~=me]")) {
    const href = a.getAttribute("href");
    if (!href) continue;
    let abs: string;
    try {
      abs = new URL(href, pageUrl).toString();
    } catch {
      continue;
    }
    const m = matchProfile(abs);
    if (!m) continue;
    const where = a.tagName.toLowerCase() === "link" ? 'rel="me" link' : locationOf(a);
    findings.push({ platformId: m.platform.id, ...m.profile, source: "site", evidence: `Found in ${where} on ${domain}` });
  }

  const ogSite = root.querySelector('meta[property="og:site_name"]')?.getAttribute("content");
  const title = root.querySelector("title")?.text.split(/[|\-–—:]/)[0]?.trim();
  const brandName = findOrgName(jsonLdNodes) ?? ogSite ?? title ?? domain.split(".")[0];
  return { findings, brandName: brandName || domain };
}

function groupFindings(findings: RawFinding[], checkedAt: string): PlatformResult[] {
  const results: PlatformResult[] = [];
  for (const p of PLATFORMS) {
    const mine = findings.filter((f) => f.platformId === p.id);
    if (!mine.length) continue;
    const byHandle = new Map<string, ProfileEntry>();
    for (const f of mine) {
      const key = f.handle.toLowerCase();
      const e = byHandle.get(key) ?? {
        handle: f.handle,
        tag: f.tag,
        url: f.url,
        verified: true,
        evidence: [],
        sources: [],
        checkedAt,
      };
      if (!e.evidence.includes(f.evidence)) e.evidence.push(f.evidence);
      if (!e.sources.includes(f.source)) e.sources.push(f.source);
      byHandle.set(key, e);
    }
    const entries = [...byHandle.values()];
    const jsonld = new Set(entries.filter((e) => e.sources.includes("jsonld")).map((e) => e.handle.toLowerCase()));
    const site = new Set(entries.filter((e) => e.sources.includes("site")).map((e) => e.handle.toLowerCase()));
    const conflict =
      jsonld.size > 0 && site.size > 0 && ([...jsonld].some((h) => !site.has(h)) || [...site].some((h) => !jsonld.has(h)));
    results.push({ platformId: p.id, platformName: p.name, status: "verified", conflict, entries, checkedAt });
  }
  return results;
}

async function ddgSearch(query: string): Promise<{ url: string; title: string; snippet: string }[]> {
  try {
    const res = await fetch(`https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`, {
      headers: { "user-agent": UA },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return [];
    const root = parse(await res.text());
    return root.querySelectorAll(".result").flatMap((r) => {
      const a = r.querySelector("a.result__a");
      const href = a?.getAttribute("href");
      if (!a || !href) return [];
      let url = href;
      try {
        const u = new URL(href, "https://duckduckgo.com");
        url = u.searchParams.get("uddg") ?? u.toString();
      } catch {
        return [];
      }
      return [{ url, title: a.text.trim(), snippet: r.querySelector(".result__snippet")?.text.trim() ?? "" }];
    });
  } catch {
    return [];
  }
}

async function checkReciprocal(profileUrl: string, domain: string): Promise<ReciprocalStatus> {
  const page = await fetchText(profileUrl, 8000);
  if (!page) return "unreachable";
  return page.text.toLowerCase().includes(domain.toLowerCase()) ? "links_back" : "no_link_found";
}

async function fallbackSearch(
  missing: PlatformId[],
  brandName: string,
  domain: string,
  checkedAt: string,
): Promise<PlatformResult[]> {
  const out = await Promise.all(
    missing.map(async (id): Promise<PlatformResult | null> => {
      const p = PLATFORMS.find((x) => x.id === id);
      if (!p) return null;
      const hits = await ddgSearch(`site:${p.searchHost} "${brandName}"`);
      const match = hits.map((h) => matchProfile(h.url)).find((m) => m?.platform.id === id);
      if (!match) return null;
      const reciprocal = await checkReciprocal(match.profile.url, domain);
      const recLine =
        reciprocal === "links_back"
          ? `Profile links back to ${domain}`
          : reciprocal === "no_link_found"
            ? `Profile does not mention ${domain}`
            : "Profile could not be fetched to check for a link back";
      return {
        platformId: id,
        platformName: p.name,
        status: "unverified",
        conflict: false,
        checkedAt,
        entries: [
          {
            ...match.profile,
            verified: false,
            sources: ["search"],
            evidence: [`Not linked on ${domain}; found via web search for "${brandName}"`, recLine],
            reciprocal,
            checkedAt,
          },
        ],
      };
    }),
  );
  return out.filter((r): r is PlatformResult => r !== null);
}

export async function lookupDomain(input: string): Promise<LookupResult> {
  const url = normalizeInputUrl(input);
  const page = await fetchText(url);
  if (!page) throw new Error(`Could not load ${url}. Check the address and try again.`);
  const domain = normalizeHost(new URL(page.finalUrl).hostname);
  const checkedAt = new Date().toISOString();
  const { findings, brandName } = extractFromHtml(page.text, page.finalUrl, domain);
  const verified = groupFindings(findings, checkedAt);
  const found = new Set(verified.map((v) => v.platformId));
  const missing = PLATFORMS.map((p) => p.id).filter((id) => !found.has(id));
  const unverified = await fallbackSearch(missing, brandName, domain, checkedAt);
  const all = [...verified, ...unverified];
  const allFound = new Set(all.map((r) => r.platformId));
  return {
    input,
    domain,
    finalUrl: page.finalUrl,
    brandName,
    checkedAt,
    platforms: all,
    notFound: PLATFORMS.filter((p) => !allFound.has(p.id)).map((p) => p.name),
  };
}

export async function searchBrandDomains(query: string): Promise<DomainCandidate[]> {
  const hits = await ddgSearch(`${query} official site`);
  const seen = new Set<string>();
  const out: DomainCandidate[] = [];
  for (const h of hits) {
    let host: string;
    try {
      host = normalizeHost(new URL(h.url).hostname);
    } catch {
      continue;
    }
    if (SOCIAL_HOSTS.some((s) => host === s || host.endsWith(`.${s}`)) || seen.has(host)) continue;
    seen.add(host);
    out.push({ domain: host, url: `https://${host}`, title: h.title, snippet: h.snippet });
    if (out.length >= 6) break;
  }
  return out;
}
