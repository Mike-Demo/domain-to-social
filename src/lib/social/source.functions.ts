import { createServerFn } from "@tanstack/react-start";

export interface SourceStats {
  totalLookups: number;
  distinctDomains: number;
  topTargets: { domain: string; lookups: number }[];
  recentTargets: { domain: string; checkedAt: string }[];
  generatedAt: string;
}

// Aggregate stats are public and change slowly, so cache them briefly instead
// of hitting the database on every page view.
const CACHE_MS = 5 * 60_000;
let cached: { at: number; stats: SourceStats } | undefined;

// Public, anonymized aggregate of real lookup activity — domains and counts
// only, never user IDs. Uses the admin client because lookup rows are
// private per-account; this reads no row contents, only domain strings.
export const getSourceStats = createServerFn({ method: "GET" }).handler(async (): Promise<SourceStats> => {
  if (cached && Date.now() - cached.at < CACHE_MS) return cached.stats;

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin
    .from("lookups")
    .select("domain,checked_at")
    .order("checked_at", { ascending: false })
    .limit(5000);
  if (error) throw new Error("Could not load source stats.");

  const rows = data ?? [];
  const counts = new Map<string, number>();
  for (const row of rows) counts.set(row.domain, (counts.get(row.domain) ?? 0) + 1);

  const topTargets = [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([domain, lookups]) => ({ domain, lookups }));

  const seen = new Set<string>();
  const recentTargets: { domain: string; checkedAt: string }[] = [];
  for (const row of rows) {
    if (seen.has(row.domain)) continue;
    seen.add(row.domain);
    recentTargets.push({ domain: row.domain, checkedAt: row.checked_at });
    if (recentTargets.length >= 5) break;
  }

  const stats: SourceStats = {
    totalLookups: rows.length,
    distinctDomains: counts.size,
    topTargets,
    recentTargets,
    generatedAt: new Date().toISOString(),
  };
  cached = { at: Date.now(), stats };
  return stats;
});
