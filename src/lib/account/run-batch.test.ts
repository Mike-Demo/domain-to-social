import { beforeEach, describe, expect, it, vi } from "vitest";
import type { LookupResult } from "@/lib/social/types";

const mocks = vi.hoisted(() => ({
  rpc: vi.fn(),
  insert: vi.fn(),
  lookup: vi.fn(),
}));

// Exercise the real validator and handler without manufacturing an authenticated browser session.
vi.mock("@tanstack/react-start", () => ({
  createServerFn: () => {
    const builder = {
      middleware: () => builder,
      validator: (validate: unknown) => ({
        handler: (invoke: unknown) => ({ validate, invoke }),
      }),
      handler: (invoke: unknown) => ({ invoke }),
    };
    return builder;
  },
}));
vi.mock("./mfa-middleware", () => ({ requireMfaAuth: {} }));
vi.mock("./plan-access.server", () => ({
  loadEntitlements: async () => ({ batchSize: 25, enrichment: false, browserAgent: false, plan: "deep_recon" }),
  browserReserver: () => undefined,
  enrichmentReserver: () => undefined,
}));
vi.mock("@/integrations/supabase/client.server", () => ({ supabaseAdmin: { rpc: mocks.rpc } }));
vi.mock("@/lib/social/lookup.server", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/social/lookup.server")>();
  return {
    ...actual,
    lookupDomain: mocks.lookup.mockImplementation(async (input: string) => {
      const url = actual.normalizeInputUrl(input);
      if (!actual.isPublicHttpUrl(url)) throw new Error("Please enter a public website address.");
      return { domain: new URL(url).hostname, brandName: "Example", platforms: [], checkedAt: "2026-11-25T04:27:00Z" };
    }),
  };
});

import { runBatch } from "./account.functions";

type Row = { input: string; ok: true; result: LookupResult } | { input: string; ok: false; error: string };
const batch = runBatch as unknown as {
  validate: (input: unknown) => { urls: string[] };
  invoke: (args: {
    data: { urls: string[] };
    context: { userId: string; supabase: { from: (table: string) => { insert: typeof mocks.insert } } };
  }) => Promise<Row[]>;
};
const context = { userId: "user-id", supabase: { from: () => ({ insert: mocks.insert }) } };

describe("bulk lookup row isolation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.rpc.mockResolvedValue({ data: true, error: null });
    mocks.insert.mockResolvedValue({ error: null });
  });

  it("returns valid results and individual failures in input order, saving only successes", async () => {
    const urls = ["example.com", "Website URL", "https://[", "http://127.0.0.1", "x", "example.org"];
    const rows = await batch.invoke({ data: batch.validate({ urls }), context });
    expect(rows.map((row) => ({ input: row.input, ok: row.ok }))).toEqual(urls.map((input, index) => ({ input, ok: index === 0 || index === 5 })));
    expect(mocks.rpc).toHaveBeenCalledExactlyOnceWith("reserve_lookup_quota", { _user_id: "user-id", _hosts: ["example.com", "example.org"] });
    expect(mocks.insert).toHaveBeenCalledExactlyOnceWith([
      expect.objectContaining({ user_id: "user-id", domain: "example.com" }),
      expect.objectContaining({ user_id: "user-id", domain: "example.org" }),
    ]);
  });

  it("returns failed rows rather than rejecting when all entries are invalid", async () => {
    const rows = await batch.invoke({ data: batch.validate({ urls: ["Website URL", "http://127.0.0.1"] }), context });
    expect(rows.map((row) => row.ok)).toEqual([false, false]);
    expect(mocks.rpc).not.toHaveBeenCalled();
    expect(mocks.insert).not.toHaveBeenCalled();
  });

  it("never begins lookups when quota reservation fails", async () => {
    mocks.rpc.mockResolvedValue({ data: false, error: null });
    await expect(batch.invoke({ data: batch.validate({ urls: ["Website URL", "example.com"] }), context })).rejects.toThrow("Too many lookups");
    expect(mocks.lookup).not.toHaveBeenCalled();
    expect(mocks.insert).not.toHaveBeenCalled();
  });
});