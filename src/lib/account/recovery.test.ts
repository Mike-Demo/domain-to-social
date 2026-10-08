import { describe, expect, it } from "vitest";
import { RECOVERY_CODE_COUNT, generateRecoveryCode, hashRecoveryCode } from "./recovery";

describe("backup codes", () => {
  it("issues 8 codes per set", () => {
    expect(RECOVERY_CODE_COUNT).toBe(8);
  });
  it("formats codes as XXXXX-XXXXX without look-alike characters", () => {
    expect(generateRecoveryCode()).toMatch(/^[2-9A-HJKMNP-Z]{5}-[2-9A-HJKMNP-Z]{5}$/);
  });
  it("matches a code typed in lowercase without the dash", async () => {
    expect(await hashRecoveryCode("abcde-fghjk")).toBe(await hashRecoveryCode("ABCDEFGHJK"));
    expect(await hashRecoveryCode("ABCDE-FGHJK")).not.toBe(await hashRecoveryCode("ABCDE-FGHJM"));
  });
});
