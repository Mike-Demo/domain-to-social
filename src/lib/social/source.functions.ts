import { createServerFn } from "@tanstack/react-start";

export interface SourceStats {
  totalLookups: number;
  distinctDomains: number;
  generatedAt: string;
}

// Aggregate stats are public and change slowly, so cache them briefly instead
// of hitting the database on every page view.
const CACHE_MS = 5 * 60_000;
let cached: { at: number; stats: SourceStats } | undefined;

// Public, anonymized aggregate of real lookup activity — counts only, never
// domains, timestamps, or user IDs. Per-domain lists were removed because they
// exposed what other people look up. Uses the admin client because lookup rows
// are private per-account; only aggregate counts leave this function.
export const getSourceStats = createServerFn({ method: "GET" }).handler(async (): Promise<SourceStats> => {
  if (cached && Date.now() - cached.at < CACHE_MS) return cached.stats;

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin.from("lookups").select("domain").limit(5000);
  if (error) throw new Error("Could not load source stats.");

  const rows = data ?? [];
  const domains = new Set<string>();
  for (const row of rows) domains.add(row.domain);

  const stats: SourceStats = {
    totalLookups: rows.length,
    distinctDomains: domains.size,
    generatedAt: new Date().toISOString(),
  };
  cached = { at: Date.now(), stats };
  return stats;
});
