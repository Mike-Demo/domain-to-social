import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { lookupQuotaHosts, reserveLookupQuota } from "./lookup-quota.server";

function quotaClient(allowed: boolean, error: { message: string } | null = null) {
  const rpc = vi.fn().mockResolvedValue({ data: allowed, error });
  return { rpc, client: { rpc } as unknown as Pick<SupabaseClient<Database>, "rpc"> };
}

describe("authenticated lookup reservations", () => {
  it("canonicalizes www, case, paths, and trailing dots to the same target", () => {
    expect(lookupQuotaHosts(["https://WWW.Example.com./about"])).toEqual(["example.com"]);
  });
  it("rejects repeated targets before reservation", () => {
    expect(() => lookupQuotaHosts(["example.com", "https://www.example.com/contact"])).toThrow("only once");
  });
  it("refuses private destinations", () => {
    expect(() => lookupQuotaHosts(["http://127.0.0.1"])).toThrow("public website");
  });
  it("reserves an entire batch with the authenticated user ID in one call", async () => {
    const { rpc, client } = quotaClient(true);
    await reserveLookupQuota("user-id", ["example.com", "example.org"], client);
    expect(rpc).toHaveBeenCalledExactlyOnceWith("reserve_lookup_quota", { _user_id: "user-id", _hosts: ["example.com", "example.org"] });
  });
  it("denies a rejected durable reservation", async () => {
    await expect(reserveLookupQuota("user-id", ["example.com"], quotaClient(false).client)).rejects.toThrow("Too many lookups");
  });
  it("fails closed when storage is unavailable", async () => {
    await expect(reserveLookupQuota("user-id", ["example.com"], quotaClient(true, { message: "offline" }).client)).rejects.toThrow("Couldn't check lookup usage");
  });
});