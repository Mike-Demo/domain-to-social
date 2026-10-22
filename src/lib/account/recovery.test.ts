import { afterEach, describe, expect, it, vi } from "vitest";
import { RECOVERY_CODE_COUNT, generateRecoveryCode, hashGiftCode } from "./recovery";
import { hashRecoveryCode } from "./recovery.server";

afterEach(() => vi.unstubAllEnvs());

describe("backup codes", () => {
  it("issues 8 codes per set", () => {
    expect(RECOVERY_CODE_COUNT).toBe(8);
  });
  it("formats codes as XXXXX-XXXXX without look-alike characters", () => {
    expect(generateRecoveryCode()).toMatch(/^[2-9A-HJKMNP-Z]{5}-[2-9A-HJKMNP-Z]{5}$/);
  });
  it("matches a code typed in lowercase without the dash", async () => {
    expect(await hashGiftCode("abcde-fghjk")).toBe(await hashGiftCode("ABCDEFGHJK"));
    expect(await hashGiftCode("ABCDE-FGHJK")).not.toBe(await hashGiftCode("ABCDE-FGHJM"));
  });
  it("stores recovery codes as server-keyed HMACs", async () => {
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "test-only-server-secret-with-adequate-length");
    const hash = await hashRecoveryCode("abcde-fghjk");

    expect(hash).toMatch(/^hmac-sha256:[0-9a-f]{64}$/);
    expect(hash).toBe(await hashRecoveryCode("ABCDEFGHJK"));
    expect(hash).not.toBe(await hashGiftCode("ABCDEFGHJK"));

    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "another-test-only-server-secret-with-length");
    expect(hash).not.toBe(await hashRecoveryCode("ABCDEFGHJK"));
  });
  it("requires the server-side key to hash recovery codes", async () => {
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "");

    await expect(hashRecoveryCode("ABCDE-FGHJK")).rejects.toThrow(
      "Missing SUPABASE_SERVICE_ROLE_KEY.",
    );
  });
});
