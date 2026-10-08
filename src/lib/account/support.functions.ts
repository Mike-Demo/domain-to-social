import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireMfaAuth } from "./mfa-middleware";
import { SUPPORT_CATEGORIES, SUPPORT_TICKETS_PER_HOUR } from "@/lib/support";

const HOUR_MS = 3_600_000;
const buckets = new Map<string, number[]>();

/** In-memory per-account limit; the form is signed-in only, so this just stops floods. */
function assertTicketQuota(userId: string): void {
  const now = Date.now();
  const recent = (buckets.get(userId) ?? []).filter((t) => now - t < HOUR_MS);
  if (recent.length >= SUPPORT_TICKETS_PER_HOUR) throw new Error("Too many tickets — please wait an hour or email us directly.");
  recent.push(now);
  buckets.set(userId, recent);
}

function ticketId(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = crypto.getRandomValues(new Uint8Array(6));
  return `MM-${Array.from(bytes, (b) => chars[b % chars.length]).join("")}`;
}

export const submitSupportTicket = createServerFn({ method: "POST" })
  .middleware([requireMfaAuth])
  .validator((d: unknown) =>
    z
      .object({
        category: z.enum(SUPPORT_CATEGORIES),
        subject: z.string().trim().min(3).max(140),
        message: z.string().trim().min(10).max(5000),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    assertTicketQuota(context.userId);
    const email = typeof context.claims.email === "string" ? context.claims.email : "";
    const { data: sub } = await context.supabase.from("subscriptions").select("plan").eq("user_id", context.userId).maybeSingle();
    const id = ticketId();
    const { sendTemplateEmail } = await import("@/lib/email-templates/send-email");
    await sendTemplateEmail("support-ticket", "", {
      templateData: { ticketId: id, ...data, fromEmail: email || "unknown", userId: context.userId, plan: sub?.plan ?? "free" },
      idempotencyKey: `support-ticket-${id}`,
      ...(email ? { replyTo: email } : {}),
    });
    if (email) {
      await sendTemplateEmail("support-receipt", email, {
        templateData: { ticketId: id, subject: data.subject },
        idempotencyKey: `support-receipt-${id}`,
      }).catch(() => undefined);
    }
    return { ticketId: id };
  });
