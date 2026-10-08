/** Backup-code rules shared by the server functions and tests. */
export const RECOVERY_CODE_COUNT = 8;

// No 0/O/1/I/L so codes are easy to read back from paper.
const ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";

/** Ten random characters shown as XXXXX-XXXXX (about 49 bits of entropy). */
export function generateRecoveryCode(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(10));
  const chars = Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length]).join("");
  return `${chars.slice(0, 5)}-${chars.slice(5)}`;
}

/** Accepts lowercase, spaces, or a missing dash. */
export function normalizeRecoveryCode(input: string): string {
  return input.toUpperCase().replace(/[^0-9A-Z]/g, "");
}

export async function hashRecoveryCode(code: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(normalizeRecoveryCode(code)));
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
}
