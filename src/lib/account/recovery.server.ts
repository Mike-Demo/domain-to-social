import { normalizeRecoveryCode } from "./recovery";

export async function hashRecoveryCode(code: string): Promise<string> {
  const secret = process.env["SUPABASE_SERVICE_ROLE_KEY"];
  if (!secret) throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY.");

  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const digest = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(normalizeRecoveryCode(code)),
  );
  return `hmac-sha256:${Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("")}`;
}
