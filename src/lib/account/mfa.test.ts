import { describe, expect, it } from "vitest";
import { hasSecondFactor, isAgentIdSession, isAgentIdUser } from "./mfa";

const AGENT_PROVIDER = "custom:app-oidc";

describe("isAgentIdSession", () => {
  it("recognizes an AgentID session by claims.app_metadata.provider", () => {
    expect(isAgentIdSession({ app_metadata: { provider: AGENT_PROVIDER } })).toBe(true);
  });

  it("recognizes an AgentID session by claims.app_metadata.providers", () => {
    expect(isAgentIdSession({ app_metadata: { providers: [AGENT_PROVIDER] } })).toBe(true);
  });

  it("keeps the amr fallback for tokens that carry the provider there", () => {
    expect(isAgentIdSession({ amr: [{ method: "oauth", provider: AGENT_PROVIDER }] })).toBe(true);
  });

  it("rejects ordinary oauth and email sessions", () => {
    expect(isAgentIdSession({ app_metadata: { provider: "google" } })).toBe(false);
    expect(isAgentIdSession({ amr: [{ method: "oauth", provider: "google" }] })).toBe(false);
    expect(isAgentIdSession({ amr: [{ method: "password" }] })).toBe(false);
  });

  it("rejects missing or malformed claims", () => {
    expect(isAgentIdSession(null)).toBe(false);
    expect(isAgentIdSession(undefined)).toBe(false);
    expect(isAgentIdSession({})).toBe(false);
    expect(isAgentIdSession({ amr: "oauth" })).toBe(false);
  });
});

describe("hasSecondFactor", () => {
  it("only accepts aal2", () => {
    expect(hasSecondFactor({ aal: "aal2" })).toBe(true);
    expect(hasSecondFactor({ aal: "aal1" })).toBe(false);
    expect(hasSecondFactor(null)).toBe(false);
  });
});

describe("isAgentIdUser", () => {
  it("recognizes AgentID accounts client-side", () => {
    expect(isAgentIdUser({ app_metadata: { provider: AGENT_PROVIDER } })).toBe(true);
    expect(isAgentIdUser({ app_metadata: { providers: [AGENT_PROVIDER, "google"] } })).toBe(true);
    expect(isAgentIdUser({ app_metadata: { provider: "google" } })).toBe(false);
    expect(isAgentIdUser(null)).toBe(false);
  });
});
