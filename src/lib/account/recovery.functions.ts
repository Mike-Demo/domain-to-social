import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { requireMfaAuth } from "./mfa-middleware";
import { RECOVERY_CODE_COUNT, generateRecoveryCode, hashRecoveryCode } from "./recovery";

/** Issues a fresh set of backup codes (old ones stop working). Needs a fully verified session. */
export const generateRecoveryCodes = createServerFn({ method: "POST" })
  .middleware([requireMfaAuth])
  .handler(async ({ context }): Promise<{ codes: string[] }> => {
    const codes = Array.from({ length: RECOVERY_CODE_COUNT }, generateRecoveryCode);
    const rows = await Promise.all(codes.map(async (c) => ({ user_id: context.userId, code_hash: await hashRecoveryCode(c) })));
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const del = await supabaseAdmin.from("mfa_recovery_codes").delete().eq("user_id", context.userId);
    if (del.error) throw new Error("Could not reset backup codes.");
    const ins = await supabaseAdmin.from("mfa_recovery_codes").insert(rows);
    if (ins.error) throw new Error("Could not save backup codes.");
    return { codes };
  });

export const recoveryCodeStatus = createServerFn({ method: "GET" })
  .middleware([requireMfaAuth])
  .handler(async ({ context }): Promise<{ remaining: number }> => {
    const { count } = await context.supabase
      .from("mfa_recovery_codes")
      .select("id", { count: "exact", head: true })
      .eq("user_id", context.userId)
      .is("used_at", null);
    return { remaining: count ?? 0 };
  });

const attempts = new Map<string, { n: number; resetAt: number }>();
function assertAttemptAllowed(userId: string): void {
  const now = Date.now();
  const a = attempts.get(userId);
  if (!a || a.resetAt <= now) return void attempts.set(userId, { n: 1, resetAt: now + 10 * 60_000 });
  a.n += 1;
  if (a.n > 5) throw new Error("Too many attempts — wait 10 minutes and try again.");
}

/**
 * Lost-phone path: a signed-in (password/social) user trades one unused backup code for removal of
 * their authenticator, then sets up a new one. The code is burned before the factor is removed.
 */
export const redeemRecoveryCode = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ code: z.string().trim().min(10).max(20) }).parse(d))
  .handler(async ({ data, context }): Promise<{ ok: true }> => {
    assertAttemptAllowed(context.userId);
    const hash = await hashRecoveryCode(data.code);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: used, error } = await supabaseAdmin
      .from("mfa_recovery_codes")
      .update({ used_at: new Date().toISOString() })
      .eq("user_id", context.userId)
      .eq("code_hash", hash)
      .is("used_at", null)
      .select("id");
    if (error || !used?.length) throw new Error("That backup code isn't valid or was already used.");
    const { data: factors } = await supabaseAdmin.auth.admin.mfa.listFactors({ userId: context.userId });
    for (const f of factors?.factors ?? []) await supabaseAdmin.auth.admin.mfa.deleteFactor({ userId: context.userId, id: f.id });
    return { ok: true };
  });
