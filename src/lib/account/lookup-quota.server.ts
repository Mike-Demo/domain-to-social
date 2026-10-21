import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { isPublicHttpUrl, normalizeInputUrl } from "@/lib/social/lookup.server";

export function lookupQuotaHosts(inputs: string[]): string[] {
  if (inputs.length < 1 || inputs.length > 25) throw new Error("Enter between 1 and 25 sites.");
  const hosts = inputs.map((input) => {
    const url = normalizeInputUrl(input);
    if (!isPublicHttpUrl(url)) throw new Error("Please enter a public website address.");
    return new URL(url).hostname.toLowerCase().replace(/\.$/, "").replace(/^www\./, "");
  });
  if (new Set(hosts).size !== hosts.length) throw new Error("Each site can appear only once per run.");
  return hosts;
}

type QuotaClient = Pick<SupabaseClient<Database>, "rpc">;

/** Caller identity is established by authenticated middleware or the MCP user session, never client input. */
export async function reserveLookupQuota(userId: string, inputs: string[], db?: QuotaClient): Promise<void> {
  const hosts = lookupQuotaHosts(inputs);
  // Global destination counts must not be readable/resettable by accounts. This RPC is service-only.
  const client = db ?? (await import("@/integrations/supabase/client.server")).supabaseAdmin;
  const { data, error } = await client.rpc("reserve_lookup_quota", { _user_id: userId, _hosts: hosts });
  if (error) throw new Error("Couldn't check lookup usage — please try again.");
  if (data !== true) throw new Error("Too many lookups for this account or site — please wait a minute and try again.");
}

/** The free endpoint accepts incomplete-MFA sessions, but still verifies identity before counting account usage. */
export async function reserveLookupQuotaFromAuthorization(authorization: string, inputs: string[]): Promise<void> {
  if (!authorization.startsWith("Bearer ")) throw new Error("Please sign in again.");
  const token = authorization.slice(7);
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !data.user) throw new Error("Please sign in again.");
  await reserveLookupQuota(data.user.id, inputs, supabaseAdmin);
}