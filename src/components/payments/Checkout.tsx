import { EmbeddedCheckout, EmbeddedCheckoutProvider } from "@stripe/react-stripe-js";
import { useServerFn } from "@tanstack/react-start";
import { useCallback } from "react";
import { getStripe } from "@/lib/stripe";
import { createCheckoutSession, type PRICE_IDS } from "@/lib/account/payments.functions";

export function Checkout({ priceId }: { priceId: (typeof PRICE_IDS)[number] }) {
  const create = useServerFn(createCheckoutSession);
  const fetchClientSecret = useCallback(async (): Promise<string> => {
    const r = await create({
      data: { priceId },
    });
    if ("error" in r) throw new Error(r.error);
    return r.clientSecret;
  }, [create, priceId]);
  return (
    <EmbeddedCheckoutProvider stripe={getStripe()} options={{ fetchClientSecret }}>
      <EmbeddedCheckout />
    </EmbeddedCheckoutProvider>
  );
}

const token = import.meta.env["VITE_PAYMENTS_CLIENT_TOKEN"] as string | undefined;

export function PaymentTestModeBanner() {
  if (!token)
    return (
      <p className="font-code-terminal text-body-sm bg-error-container text-on-error-container p-space-sm text-center">
        Checkout is not live yet — payments go-live still needs to be completed.
      </p>
    );
  if (token.startsWith("pk_test_"))
    return (
      <p className="font-code-terminal text-body-sm bg-hazard-orange text-grit-black p-space-sm text-center">
        Test mode — payments made in the preview are not real. Use card 4242 4242 4242 4242.
      </p>
    );
  return null;
}
