import { createServerFn } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";
import { z } from "zod";
import { lookupDomain, searchBrandDomains } from "./lookup.server";

// Best-effort per-client rate limiting for the public, unauthenticated lookup
// endpoints. The tool is intentionally free and open, so instead of auth we
// throttle how many lookups one client can trigger, which keeps the service
// from being used as a high-volume fetch proxy. In-memory buckets are per
// isolate, so this is a soft limit — good enough to deter casual abuse.
const WINDOW_MS = 60_000;
const MAX_LOOKUPS_PER_WINDOW = 10;
const MAX_SEARCHES_PER_WINDOW = 20;

type Bucket = { count: number; resetAt: number };
const buckets = new Map<string, Bucket>();

function clientKey(): string {
  const headers = getRequestHeaders();
  const forwarded = headers.get("cf-connecting-ip") ?? headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded ?? "unknown";
}

function assertWithinLimit(kind: "lookup" | "search"): void {
  const key = `${kind}:${clientKey()}`;
  const now = Date.now();
  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return;
  }
  bucket.count += 1;
  if (bucket.count > (kind === "lookup" ? MAX_LOOKUPS_PER_WINDOW : MAX_SEARCHES_PER_WINDOW)) {
    throw new Error("Too many requests — please wait a minute and try again.");
  }
}

// Free tier: single lookups. Bulk / MCP entry points can reuse lookupDomain behind auth.
export const lookupSocials = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => z.object({ url: z.string().trim().min(3).max(500) }).parse(data))
  .handler(async ({ data }) => {
    assertWithinLimit("lookup");
    return lookupDomain(data.url);
  });

export const searchBrand = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => z.object({ query: z.string().trim().min(2).max(120) }).parse(data))
  .handler(async ({ data }) => {
    assertWithinLimit("search");
    return searchBrandDomains(data.query);
  });
