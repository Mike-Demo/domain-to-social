import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { lazy, Suspense, useEffect, useState } from "react";
import { Shell, SubHeader } from "@/components/diggr/Chrome";
import { PaymentTestModeBanner } from "@/components/payments/Checkout";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { getMyAccount } from "@/lib/account/account.functions";
import { changePlan } from "@/lib/account/payments.functions";
import type { PlanTier } from "@/lib/account/entitlements";
import { WaButton } from "@/design-system/font-awsome-web-awesome-171158";

const Checkout = lazy(() => import("@/components/payments/Checkout").then((m) => ({ default: m.Checkout })));

export const Route = createFileRoute("/pricing")({
  head: () => ({
    meta: [
      { title: "M4G1C M4NT4 // Pricing — free radar, Operative, Deep Recon, Brand Command" },
      {
        name: "description",
        content: "Single lookups are free. Unlock saved lists and bulk sweeps for $5 once, deep recon for $10/mo, live browser checks for $20/mo.",
      },
      { property: "og:title", content: "M4G1C M4NT4 // Pricing" },
      { property: "og:description", content: "Free radar forever. Upgrade for lists, bulk, deep recon and live browser checks." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Pricing,
});

const TIERS = [
  { priceId: null, plan: "free" as PlanTier, name: "Free Radar", price: "$0", items: ["1 domain at a time", "No account needed", "Share links"] },
  { priceId: "operative_onetime" as const, plan: "operative" as PlanTier, name: "Operative", price: "$5 once", items: ["Account + lookup history", "Saved lists + CSV/JSON export", "Bulk: 5 domains per run"] },
  { priceId: "deep_recon_monthly" as const, plan: "deep_recon" as PlanTier, name: "Deep Recon", price: "$10 / mo", items: ["Everything in Operative", "Deep page checks for blocked sites (300 / 30 days)", "Bulk: 25 per run"] },
  { priceId: "brand_command_monthly" as const, plan: "brand_command" as PlanTier, name: "Brand Command", price: "$20 / mo", items: ["Everything in Deep Recon", "Deep page checks (1,000 / 30 days)", "Live browser checks (20 / day)", "Coming soon: claim your domain, public brand page, monitoring + alerts"] },
];

type PriceId = NonNullable<(typeof TIERS)[number]["priceId"]>;

function Pricing() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [selected, setSelected] = useState<PriceId | null>(null);
  const [aal2, setAal2] = useState<boolean | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const fetchAccount = useServerFn(getMyAccount);
  const swap = useServerFn(changePlan);

  useEffect(() => {
    if (!user) return setAal2(null);
    void supabase.auth.mfa.getAuthenticatorAssuranceLevel().then(({ data }) => setAal2(data?.currentLevel === "aal2"));
  }, [user]);

  const account = useQuery({ queryKey: ["account"], queryFn: () => fetchAccount(), enabled: !!user && aal2 === true });
  const plan = account.data?.entitlements.plan ?? "free";
  const monthly = account.data?.subscription?.monthlyPlan ?? null;
  const operativeOwned = account.data?.subscription?.operativeOwned ?? false;

  async function doSwitch(priceId: "deep_recon_monthly" | "brand_command_monthly") {
    setBusy(true);
    setMsg(null);
    const r = await swap({ data: { priceId } });
    setBusy(false);
    if ("error" in r) return setMsg(r.error);
    await qc.invalidateQueries({ queryKey: ["account"] });
    void navigate({ to: "/account", search: { checkout: "done" } });
  }

  function action(t: (typeof TIERS)[number]) {
    if (!t.priceId) return null;
    if (!user)
      return (
        <Link to="/auth" search={{ next: "/pricing" }} className="font-label-stamp text-label-stamp text-cyber-cyan block w-full text-center uppercase underline">
          Sign in to buy
        </Link>
      );
    if (aal2 === false)
      return (
        <Link to="/mfa" search={{ next: "/pricing" }} className="font-label-stamp text-label-stamp text-cyber-cyan block w-full text-center uppercase underline">
          Enter your 6-digit code to buy
        </Link>
      );
    if (!account.data) return <p className="font-code-terminal text-body-sm text-on-surface-variant w-full text-center">Checking your plan…</p>;
    const owned = t.priceId === "operative_onetime" ? plan !== "free" : monthly === t.plan;
    if (owned)
      return (
        <p className="font-label-stamp text-label-stamp text-primary-container w-full text-center uppercase">
          {t.priceId === "operative_onetime" && !operativeOwned ? "Included in your plan" : "Your plan"}
        </p>
      );
    if (t.priceId !== "operative_onetime" && monthly)
      return (
        <WaButton
          variant="brand"
          appearance="outlined"
          disabled={busy}
          loading={busy}
          onClick={() => doSwitch(t.priceId as "deep_recon_monthly" | "brand_command_monthly")}
          className="w-full"
        >
          {busy ? "Switching…" : `Switch to ${t.name}`}
        </WaButton>
      );
    return (
      <WaButton variant="brand" appearance="outlined" onClick={() => setSelected(t.priceId)} className="w-full">
        Get {t.name}
      </WaButton>
    );
  }

  return (
    <Shell>
      <PaymentTestModeBanner />
      <SubHeader badge="PRICING" note="// SINGLE LOOKUPS STAY FREE //" />
      <section className="px-margin-mobile sm:px-margin py-space-xl gap-space-lg mx-auto flex max-w-7xl flex-col">
        <h1 className="font-display-hero text-display-hero-mobile text-paper-distressed uppercase">Pick your clearance</h1>
        {monthly && (
          <p className="font-code-terminal text-body-sm text-on-surface-variant">
            Switching takes effect right away. You're charged or credited the difference for the rest of this billing month.
          </p>
        )}
        {msg && <p role="alert" className="font-code-terminal text-hazard-orange">{msg}</p>}
        <div className="gap-space-lg grid sm:grid-cols-2 lg:grid-cols-4">
          {TIERS.map((t) => (
            <div
              key={t.name}
              className={`p-space-md gap-space-sm flex flex-col border-3 bg-slate-charcoal shadow-stamp-lg ${account.data && plan === t.plan ? "border-primary-container" : "border-outline-variant"}`}
            >
              <h2 className="font-headline text-headline-sm text-paper-distressed uppercase">{t.name}</h2>
              <p className="font-code-terminal text-headline-sm text-primary-container">{t.price}</p>
              <ul className="font-code-terminal text-body-sm text-on-surface-variant space-y-1">
                {t.items.map((x) => (
                  <li key={x}>&gt; {x}</li>
                ))}
              </ul>
              <div className="mt-auto flex w-full min-w-0 items-end">
                {action(t)}
              </div>
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
