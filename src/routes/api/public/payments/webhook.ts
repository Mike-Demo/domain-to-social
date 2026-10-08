import { createFileRoute } from "@tanstack/react-router";
import type { StripeEnv } from "@/lib/stripe.server";
import { PRICE_TO_PLAN, shouldApplySubscriptionEvent } from "@/lib/account/billing";

type Obj = Record<string, unknown>;
const str = (v: unknown): string | undefined => (typeof v === "string" ? v : undefined);

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

async function upsertSubscription(sub: Obj, env: StripeEnv, deleted: boolean) {
  const meta = (sub["metadata"] ?? {}) as Obj;
  const userId = str(meta["userId"]);
  const subId = str(sub["id"]);
  if (!userId || !subId) return;
  const items = ((sub["items"] as Obj | undefined)?.["data"] ?? []) as Obj[];
  const item = items[0] ?? {};
  const price = (item["price"] ?? {}) as Obj;
  const priceId = str(price["lookup_key"]) ?? str((price["metadata"] as Obj | undefined)?.["lovable_external_id"]) ?? "";
  const periodEnd = (item["current_period_end"] ?? sub["current_period_end"]) as number | undefined;
  const status = deleted ? "canceled" : (str(sub["status"]) ?? "none");
  const db = await admin();
  const { data: stored } = await db
    .from("subscriptions")
    .select("status,current_period_end,stripe_subscription_id")
    .eq("user_id", userId)
    .eq("environment", env)
    .maybeSingle();
  if (!shouldApplySubscriptionEvent(stored, subId, status)) return;
  await db.from("subscriptions").upsert(
    {
      user_id: userId,
      environment: env,
      plan: PRICE_TO_PLAN[priceId] ?? "free",
      status,
      price_id: priceId,
      stripe_subscription_id: subId,
      stripe_customer_id: str(sub["customer"]) ?? null,
      cancel_at_period_end: Boolean(sub["cancel_at_period_end"]),
      current_period_end: periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,environment" },
  );
}

async function setOperative(userId: string, env: StripeEnv, owned: boolean, customer?: string) {
  const db = await admin();
  await db.from("subscriptions").upsert(
    {
      user_id: userId,
      environment: env,
      operative_lifetime: owned,
      ...(customer && { stripe_customer_id: customer }),
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,environment" },
  );
}

async function grantOperative(session: Obj, env: StripeEnv) {
  if (session["mode"] !== "payment" || session["payment_status"] !== "paid") return;
  const meta = (session["metadata"] ?? {}) as Obj;
  const userId = str(meta["userId"]);
  if (!userId || meta["priceId"] !== "operative_onetime") return;
  await setOperative(userId, env, true, str(session["customer"]));
}

/** Refund (full) or dispute on the Operative payment turns Operative off. */
async function revokeOperative(paymentIntentId: string | undefined, env: StripeEnv) {
  if (!paymentIntentId) return;
  const { createStripeClient } = await import("@/lib/stripe.server");
  const stripe = createStripeClient(env);
  const pi = await stripe.paymentIntents.retrieve(paymentIntentId);
  let userId = str(pi.metadata?.["userId"]);
  let priceId = str(pi.metadata?.["priceId"]);
  if (!userId) {
    const session = (await stripe.checkout.sessions.list({ payment_intent: paymentIntentId, limit: 1 })).data[0];
    userId = str(session?.metadata?.["userId"]);
    priceId = str(session?.metadata?.["priceId"]);
  }
  if (userId && priceId === "operative_onetime") await setOperative(userId, env, false);
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
            case "charge.refunded":
              if (obj["refunded"] === true) await revokeOperative(str(obj["payment_intent"]), env);
              break;
            case "charge.dispute.created":
              await revokeOperative(str(obj["payment_intent"]), env);
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
