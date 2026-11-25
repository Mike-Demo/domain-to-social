import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { lookupQuotaHosts, reserveBatchLookupQuota, reserveLookupQuota } from "./lookup-quota.server";

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

describe("bulk lookup reservations", () => {
  it.each(["Website URL", "https://[", "http://127.0.0.1", "http://internal", "x"])(
    "reserves valid sites without letting invalid row %s cancel them",
    async (invalid) => {
      const { rpc, client } = quotaClient(true);
      await reserveBatchLookupQuota("user-id", ["example.com", invalid, "example.org"], client);
      expect(rpc).toHaveBeenCalledExactlyOnceWith("reserve_lookup_quota", { _user_id: "user-id", _hosts: ["example.com", "example.org"] });
    },
  );
  it("makes no reservation when every row is invalid", async () => {
    const { rpc, client } = quotaClient(true);
    await reserveBatchLookupQuota("user-id", ["Website URL", "http://127.0.0.1"], client);
    expect(rpc).not.toHaveBeenCalled();
  });
  it("still rejects duplicate valid targets in a mixed batch", async () => {
    const { rpc, client } = quotaClient(true);
    await expect(reserveBatchLookupQuota("user-id", ["example.com", "Website URL", "https://www.example.com/about"], client)).rejects.toThrow("only once");
    expect(rpc).not.toHaveBeenCalled();
  });
  it("still fails closed when a valid target's reservation is denied", async () => {
    await expect(reserveBatchLookupQuota("user-id", ["Website URL", "example.com"], quotaClient(false).client)).rejects.toThrow("Too many lookups");
  });
  it("still fails closed when quota storage is unavailable", async () => {
    await expect(reserveBatchLookupQuota("user-id", ["example.com", "http://127.0.0.1"], quotaClient(true, { message: "offline" }).client)).rejects.toThrow("Couldn't check lookup usage");
  });
});