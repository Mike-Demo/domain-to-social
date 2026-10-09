import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireMfaAuth } from "./mfa-middleware";
import { generateRecoveryCode, hashRecoveryCode } from "./recovery";

const GIFT_PREFIX = "gift:";
const REDEEM_ATTEMPTS_PER_HOUR = 10;

export const redeemGiftCode = createServerFn({ method: "POST" })
  .middleware([requireMfaAuth])
  .validator((d: unknown) => z.object({ code: z.string().trim().min(4).max(40) }).parse(d))
  .handler(async ({ data, context }): Promise<{ error: string } | { plan: string; giftUntil: string | null }> => {
    const since = new Date(Date.now() - 3_600_000).toISOString();
    const { count } = await context.supabase
      .from("browser_runs")
      .select("id", { count: "exact", head: true })
      .eq("user_id", context.userId)
      .like("domain", `${GIFT_PREFIX}%`)
      .gte("run_at", since);
    if ((count ?? 0) >= REDEEM_ATTEMPTS_PER_HOUR) return { error: "Too many tries. Wait an hour and try again." };
    await context.supabase.from("browser_runs").insert({ user_id: context.userId, domain: `${GIFT_PREFIX}redeem` });
    const { data: r, error } = await context.supabase.rpc("redeem_gift_code", { _hash: await hashRecoveryCode(data.code) });
    if (error) return { error: "Could not redeem the code. Try again." };
    const res = r as { error?: string; plan?: string; gift_until?: string | null };
    if (res.error) return { error: res.error };
    return { plan: res.plan ?? "", giftUntil: res.gift_until ?? null };
  });

export const amIGiftAdmin = createServerFn({ method: "GET" })
  .middleware([requireMfaAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    return { admin: data === true };
  });

export const listGiftCodes = createServerFn({ method: "GET" })
  .middleware([requireMfaAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase.rpc("admin_list_gift_codes");
    if (error) throw new Error("Admins only.");
    return data ?? [];
  });

export const createGiftCode = createServerFn({ method: "POST" })
  .middleware([requireMfaAuth])
  .validator((d: unknown) =>
    z
      .object({
        plan: z.enum(["operative", "deep_recon", "brand_command"]),
        days: z.number().int().min(1).max(3650),
        maxUses: z.number().int().min(1).max(1000),
        note: z.string().trim().max(200),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const code = generateRecoveryCode();
    const { error } = await context.supabase.rpc("admin_create_gift_code", {
      _hash: await hashRecoveryCode(code),
      _plan: data.plan,
      _days: data.days,
      _max_uses: data.maxUses,
      _note: data.note || null,
    } as never);
    if (error) throw new Error("Admins only.");
    return { code };
  });

export const disableGiftCode = createServerFn({ method: "POST" })
  .middleware([requireMfaAuth])
  .validator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.rpc("admin_disable_gift_code", { _id: data.id });
    if (error) throw new Error("Admins only.");
    return { ok: true };
  });
