import { createServerFn } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";
import type Stripe from "stripe";
import { z } from "zod";
import { requireMfaAuth } from "./mfa-middleware";
import { checkoutDecision, MONTHLY_PRICE_IDS, PRICE_IDS, type SubRow } from "./billing";

export { PRICE_IDS } from "./billing";

type Ctx = { supabase: import("@supabase/supabase-js").SupabaseClient<import("@/integrations/supabase/types").Database>; userId: string };

async function currentEnv() {
  const { stripeEnvForHost } = await import("@/lib/stripe.server");
  return stripeEnvForHost(getRequestHeaders().get("host"));
}

async function loadRow(ctx: Ctx, env: string): Promise<(SubRow & { stripe_customer_id: string | null }) | null> {
  const { data } = await ctx.supabase
    .from("subscriptions")
    .select("plan,status,current_period_end,operative_lifetime,cancel_at_period_end,stripe_subscription_id,stripe_customer_id")
    .eq("user_id", ctx.userId)
    .eq("environment", env)
    .maybeSingle();
  return data;
}

type CheckoutResult = { clientSecret: string } | { error: string; code?: "owned" | "switch" };

export const createCheckoutSession = createServerFn({ method: "POST" })
  .middleware([requireMfaAuth])
  .inputValidator((d: unknown) =>
    z.object({ priceId: z.enum(PRICE_IDS), returnUrl: z.string().url().max(500) }).parse(d),
  )
  .handler(async ({ data, context }): Promise<CheckoutResult> => {
    const { createStripeClient, getStripeErrorMessage } = await import("@/lib/stripe.server");
    const env = await currentEnv();
    const decision = checkoutDecision(await loadRow(context, env), data.priceId);
    if (decision === "owned") return { error: "You already have this plan.", code: "owned" };
    if (decision === "switch") return { error: "Use “Switch plan” to change your monthly plan.", code: "switch" };
    try {
      const stripe = createStripeClient(env);
      const userId = context.userId;
      if (!/^[a-zA-Z0-9_-]+$/.test(userId)) throw new Error("Invalid userId");
      const { data: u } = await context.supabase.auth.getUser();
      const email = u.user?.email ?? undefined;

      const prices = await stripe.prices.list({ lookup_keys: [data.priceId] });
      const price = prices.data[0];
      if (!price) throw new Error("Price not found");
      const isRecurring = price.type === "recurring";

      let customerId: string | undefined;
      const found = await stripe.customers.search({ query: `metadata['userId']:'${userId}'`, limit: 1 });
      customerId = found.data[0]?.id;
      if (!customerId && email) {
        const existing = await stripe.customers.list({ email, limit: 1 });
        const c = existing.data[0];
        if (c) {
          if (c.metadata?.["userId"] !== userId) await stripe.customers.update(c.id, { metadata: { ...c.metadata, userId } });
          customerId = c.id;
        }
      }
      if (!customerId) {
        customerId = (await stripe.customers.create({ ...(email && { email }), metadata: { userId } })).id;
      }

      let description: string | undefined;
      if (!isRecurring) {
        const productId = typeof price.product === "string" ? price.product : price.product.id;
        description = (await stripe.products.retrieve(productId)).name;
      }

      const session = await stripe.checkout.sessions.create({
        line_items: [{ price: price.id, quantity: 1 }],
        mode: isRecurring ? "subscription" : "payment",
        ui_mode: "embedded_page",
        return_url: data.returnUrl,
        customer: customerId,
        managed_payments: { enabled: true },
        metadata: { userId, priceId: data.priceId, managed_payments: "true" },
        ...(!isRecurring && { payment_intent_data: { description, metadata: { userId, priceId: data.priceId } } }),
        ...(isRecurring && { subscription_data: { metadata: { userId } } }),
      } as Stripe.Checkout.SessionCreateParams);
      return { clientSecret: session.client_secret ?? "" };
    } catch (error) {
      return { error: getStripeErrorMessage(error) };
    }
  });

/** Swap the live monthly plan right away; Stripe charges or credits the difference on an immediate invoice. */
export const changePlan = createServerFn({ method: "POST" })
  .middleware([requireMfaAuth])
  .inputValidator((d: unknown) => z.object({ priceId: z.enum(MONTHLY_PRICE_IDS) }).parse(d))
  .handler(async ({ data, context }): Promise<{ ok: true } | { error: string }> => {
    const { createStripeClient, getStripeErrorMessage } = await import("@/lib/stripe.server");
    const env = await currentEnv();
    const row = await loadRow(context, env);
    const decision = checkoutDecision(row, data.priceId);
    if (decision === "owned") return { error: "You're already on this plan." };
    if (decision !== "switch" || !row?.stripe_subscription_id) return { error: "No monthly plan to switch — buy one instead." };
    try {
      const stripe = createStripeClient(env);
      const sub = await stripe.subscriptions.retrieve(row.stripe_subscription_id);
      if (sub.metadata?.["userId"] !== context.userId) return { error: "This subscription isn't yours." };
      const item = sub.items.data[0];
      const price = (await stripe.prices.list({ lookup_keys: [data.priceId] })).data[0];
      if (!item || !price) return { error: "Plan not found." };
      await stripe.subscriptions.update(sub.id, {
        items: [{ id: item.id, price: price.id }],
        proration_behavior: "always_invoice",
        payment_behavior: "error_if_incomplete",
        cancel_at_period_end: false,
      });
      return { ok: true };
    } catch (error) {
      return { error: getStripeErrorMessage(error) };
    }
  });

export const createPortalSession = createServerFn({ method: "POST" })
  .middleware([requireMfaAuth])
  .inputValidator((d: unknown) => z.object({ returnUrl: z.string().url().max(500) }).parse(d))
  .handler(async ({ data, context }): Promise<{ url: string } | { error: string }> => {
    const { createStripeClient, getStripeErrorMessage } = await import("@/lib/stripe.server");
    const host = getRequestHeaders().get("host");
    const env = await currentEnv();
    const requested = new URL(data.returnUrl);
    const returnUrl =
      host && requested.host === host && (requested.protocol === "https:" || host.startsWith("localhost"))
        ? requested.toString()
        : `https://${host ?? "magicmanta.com"}/account`;
    const sub = await loadRow(context, env);
    if (!sub?.stripe_customer_id) return { error: "No billing account yet." };
    try {
      const portal = await createStripeClient(env).billingPortal.sessions.create({
        customer: sub.stripe_customer_id,
        return_url: returnUrl,
      });
      return { url: portal.url };
    } catch (error) {
      return { error: getStripeErrorMessage(error) };
    }
  });

/** Cancels any live subscription immediately, then erases the user's data and sign-in. */
export const deleteMyAccount = createServerFn({ method: "POST" })
  .middleware([requireMfaAuth])
  .inputValidator((d: unknown) => z.object({ confirm: z.literal("DELETE") }).parse(d))
  .handler(async ({ context }): Promise<{ ok: true } | { error: string }> => {
    const { createStripeClient, getStripeErrorMessage } = await import("@/lib/stripe.server");
    const env = await currentEnv();
    const row = await loadRow(context, env);
    if (row?.stripe_subscription_id && row.status !== "canceled") {
      try {
        await createStripeClient(env).subscriptions.cancel(row.stripe_subscription_id);
      } catch (error) {
        const msg = getStripeErrorMessage(error);
        if (!/No such subscription|canceled/i.test(msg)) return { error: `Couldn't cancel your subscription: ${msg}` };
      }
    }
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const uid = context.userId;
    for (const table of ["list_items", "lists", "lookups", "browser_runs", "mfa_recovery_codes", "subscriptions"] as const) {
      const { error } = await supabaseAdmin.from(table).delete().eq("user_id", uid);
      if (error) return { error: "Couldn't erase your data. Nothing about your sign-in was changed — try again." };
    }
    await supabaseAdmin.from("profiles").delete().eq("id", uid);
    const { error } = await supabaseAdmin.auth.admin.deleteUser(uid);
    if (error) return { error: "Your data was erased but the sign-in couldn't be removed. Contact support." };
    return { ok: true };
  });
