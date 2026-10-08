import { createClient } from "@supabase/supabase-js";
import type { AuthContext } from "@lovable.dev/mcp-js";
import type { Database } from "@/integrations/supabase/types";

type RuntimeGlobals = typeof globalThis & {
  process?: { env?: Record<string, string | undefined> };
};

function env(names: readonly string[]): string | undefined {
  const runtime = globalThis as RuntimeGlobals;
  for (const n of names) {
    const v = runtime.process?.env?.[n]?.trim();
    if (v) return v;
  }
  return undefined;
}

/** Forwards the verified OAuth token so RLS runs as the signed-in user. */
export function supabaseForUser(auth: AuthContext) {
  const token = auth.getToken();
  if (!token) throw new Error("A signed-in user is required");
  const url = env(["SUPABASE_URL", "VITE_SUPABASE_URL"]);
  const key = env(["SUPABASE_PUBLISHABLE_KEY", "VITE_SUPABASE_PUBLISHABLE_KEY"]);
  if (!url || !key) throw new Error("Backend configuration is missing");
  return createClient<Database>(url, key, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
