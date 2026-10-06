import { createServerFn } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";
import type Stripe from "stripe";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const PRICE_IDS = ["operative_onetime", "deep_recon_monthly", "brand_command_monthly"] as const;

type CheckoutResult = { clientSecret: string } | { error: string };

export const createCheckoutSession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ priceId: z.enum(PRICE_IDS), returnUrl: z.string().url().max(500) }).parse(d),
  )
  .handler(async ({ data, context }): Promise<CheckoutResult> => {
    const { createStripeClient, getStripeErrorMessage, stripeEnvForHost } = await import("@/lib/stripe.server");
    const env = stripeEnvForHost(getRequestHeaders().get("host"));
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

      // Resolve or create a customer carrying userId metadata.
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
        ...(!isRecurring && { payment_intent_data: { description } }),
        ...(isRecurring && { subscription_data: { metadata: { userId } } }),
      } as Stripe.Checkout.SessionCreateParams);
      return { clientSecret: session.client_secret ?? "" };
    } catch (error) {
      return { error: getStripeErrorMessage(error) };
    }
  });

export const createPortalSession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ returnUrl: z.string().url().max(500) }).parse(d))
  .handler(async ({ data, context }): Promise<{ url: string } | { error: string }> => {
    const { createStripeClient, getStripeErrorMessage, stripeEnvForHost } = await import("@/lib/stripe.server");
    const env = stripeEnvForHost(getRequestHeaders().get("host"));
    const { data: sub } = await context.supabase
      .from("subscriptions")
      .select("stripe_customer_id")
      .eq("user_id", context.userId)
      .eq("environment", env)
      .maybeSingle();
    if (!sub?.stripe_customer_id) return { error: "No billing account yet." };
    try {
      const portal = await createStripeClient(env).billingPortal.sessions.create({
        customer: sub.stripe_customer_id,
        return_url: data.returnUrl,
      });
      return { url: portal.url };
    } catch (error) {
      return { error: getStripeErrorMessage(error) };
    }
  });
