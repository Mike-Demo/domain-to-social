import { createFileRoute, Link } from "@tanstack/react-router";
import { lazy, Suspense, useState } from "react";
import { Shell, SubHeader } from "@/components/diggr/Chrome";
import { PaymentTestModeBanner } from "@/components/payments/Checkout";
import { useAuth } from "@/hooks/useAuth";

const Checkout = lazy(() => import("@/components/payments/Checkout").then((m) => ({ default: m.Checkout })));

export const Route = createFileRoute("/pricing")({
  head: () => ({
    meta: [
      { title: "M4G1C M4NT4 // Pricing — free radar, Operative, Deep Recon, Brand Command" },
      {
        name: "description",
        content: "Single lookups are free. Unlock saved lists and bulk sweeps for $5 once, deep recon for $10/mo, brand mode for $20/mo.",
      },
      { property: "og:title", content: "M4G1C M4NT4 // Pricing" },
      { property: "og:description", content: "Free radar forever. Upgrade for lists, bulk, deep recon and brand mode." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Pricing,
});

const TIERS = [
  { priceId: null, name: "Free Radar", price: "$0", items: ["1 domain at a time", "No account needed", "Share links"] },
  { priceId: "operative_onetime" as const, name: "Operative", price: "$5 once", items: ["Account + lookup history", "Saved lists + CSV/JSON export", "Bulk: 5 domains per run"] },
  { priceId: "deep_recon_monthly" as const, name: "Deep Recon", price: "$10 / mo", items: ["Everything in Operative", "Firecrawl for blocked sites", "Browser checks on X / Instagram / LinkedIn", "Bulk: 25 per run"] },
  { priceId: "brand_command_monthly" as const, name: "Brand Command", price: "$20 / mo", items: ["Everything in Deep Recon", "Claim your domain", "Public verified brand page", "Weekly monitoring + alerts"] },
];

function Pricing() {
  const { user } = useAuth();
  const [selected, setSelected] = useState<(typeof TIERS)[number]["priceId"]>(null);
  return (
    <Shell>
      <PaymentTestModeBanner />
      <SubHeader badge="PRICING" note="// SINGLE LOOKUPS STAY FREE //" />
      <section className="px-margin-mobile sm:px-margin py-space-xl gap-space-lg mx-auto flex max-w-7xl flex-col">
        <h1 className="font-display-hero text-display-hero-mobile text-paper-distressed uppercase">Pick your clearance</h1>
        <div className="gap-space-lg grid sm:grid-cols-2 lg:grid-cols-4">
          {TIERS.map((t, i) => (
            <div
              key={t.name}
              className={`p-space-md gap-space-sm flex flex-col border-3 bg-slate-charcoal shadow-stamp-lg ${i === 1 ? "border-primary-container" : "border-outline-variant"}`}
            >
              <h2 className="font-headline text-headline-sm text-paper-distressed uppercase">{t.name}</h2>
              <p className="font-code-terminal text-headline-sm text-primary-container">{t.price}</p>
              <ul className="font-code-terminal text-body-sm text-on-surface-variant space-y-1">
                {t.items.map((x) => (
                  <li key={x}>&gt; {x}</li>
                ))}
              </ul>
              {t.priceId &&
                (user ? (
                  <button
                    onClick={() => setSelected(t.priceId)}
                    className={`font-label-stamp text-label-stamp mt-auto px-space-md py-space-sm uppercase ${i === 1 ? "bg-primary-container text-on-primary-container shadow-stamp" : "text-paper-distressed border-2 border-paper-distressed"}`}
                  >
                    Get {t.name}
                  </button>
                ) : (
                  <Link to="/auth" className="font-label-stamp text-label-stamp text-cyber-cyan mt-auto uppercase underline">
                    Sign in to buy
                  </Link>
                ))}
            </div>
          ))}
        </div>
        {selected && (
          <div className="p-space-md bg-paper-distressed">
            <Suspense fallback={<p className="font-code-terminal text-grit-black">Loading checkout…</p>}>
              <Checkout key={selected} priceId={selected} />
            </Suspense>
          </div>
        )}
      </section>
    </Shell>
  );
}
