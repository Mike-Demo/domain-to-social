import { createFileRoute } from "@tanstack/react-router";
import type { StripeEnv } from "@/lib/stripe.server";
import type { PlanTier } from "@/lib/account/entitlements";

const PRICE_TO_PLAN: Record<string, PlanTier> = {
  deep_recon_monthly: "deep_recon",
  brand_command_monthly: "brand_command",
};

type Obj = Record<string, unknown>;
const str = (v: unknown): string | undefined => (typeof v === "string" ? v : undefined);

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

async function upsertSubscription(sub: Obj, env: StripeEnv, deleted: boolean) {
  const meta = (sub["metadata"] ?? {}) as Obj;
  const userId = str(meta["userId"]);
  if (!userId) return;
  const items = ((sub["items"] as Obj | undefined)?.["data"] ?? []) as Obj[];
  const item = items[0] ?? {};
  const price = (item["price"] ?? {}) as Obj;
  const priceId = str(price["lookup_key"]) ?? str((price["metadata"] as Obj | undefined)?.["lovable_external_id"]) ?? "";
  const periodEnd = (item["current_period_end"] ?? sub["current_period_end"]) as number | undefined;
  const status = deleted ? "canceled" : (str(sub["status"]) ?? "none");
  const db = await admin();
  await db.from("subscriptions").upsert(
    {
      user_id: userId,
      environment: env,
      plan: PRICE_TO_PLAN[priceId] ?? "free",
      status,
      price_id: priceId,
      stripe_subscription_id: str(sub["id"]) ?? null,
      stripe_customer_id: str(sub["customer"]) ?? null,
      cancel_at_period_end: Boolean(sub["cancel_at_period_end"]),
      current_period_end: periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,environment" },
  );
}

async function grantOperative(session: Obj, env: StripeEnv) {
  if (session["mode"] !== "payment" || session["payment_status"] === "unpaid") return;
  const meta = (session["metadata"] ?? {}) as Obj;
  const userId = str(meta["userId"]);
  if (!userId || meta["priceId"] !== "operative_once") return;
  const db = await admin();
  await db
    .from("subscriptions")
    .upsert(
      { user_id: userId, environment: env, operative_lifetime: true, stripe_customer_id: str(session["customer"]) ?? null, updated_at: new Date().toISOString() },
      { onConflict: "user_id,environment" },
    );
}

export const Route = createFileRoute("/api/public/payments/webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const rawEnv = new URL(request.url).searchParams.get("env");
        if (rawEnv !== "sandbox" && rawEnv !== "live") return Response.json({ received: true, ignored: "invalid env" });
        const env: StripeEnv = rawEnv;
        try {
          const { verifyWebhook } = await import("@/lib/stripe.server");
          const event = await verifyWebhook(request, env);
          const obj = event.data.object;
          switch (event.type) {
            case "customer.subscription.created":
            case "customer.subscription.updated":
              await upsertSubscription(obj, env, false);
              break;
            case "customer.subscription.deleted":
              await upsertSubscription(obj, env, true);
              break;
            case "checkout.session.completed":
            case "checkout.session.async_payment_succeeded":
              await grantOperative(obj, env);
              break;
            default:
              break;
          }
          return Response.json({ received: true });
        } catch (e) {
          console.error("Webhook error:", e);
          return new Response("Webhook error", { status: 400 });
        }
      },
    },
  },
});
