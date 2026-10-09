import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { amIGiftAdmin, createGiftCode, disableGiftCode, listGiftCodes } from "@/lib/account/gifts.functions";
import { PLAN_LABEL, type PlanTier } from "@/lib/account/entitlements";
import { Shell, SubHeader } from "@/components/diggr/Chrome";

export const Route = createFileRoute("/_authenticated/admin/gifts")({
  head: () => ({
    meta: [
      { title: "M4G1C M4NT4 // Gift codes" },
      { name: "description", content: "Create and manage gift codes for paid plans." },
      { property: "og:title", content: "M4G1C M4NT4 // Gift codes" },
      { property: "og:description", content: "Admin gift-code manager." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Gifts,
});

const panel = "p-space-md gap-space-sm flex flex-col border-3 border-outline-variant bg-slate-charcoal shadow-stamp-lg";
const field =
  "font-code-terminal text-code-terminal text-paper-distressed! p-space-sm border-2 border-outline-variant bg-grit-black! outline-none focus-visible:ring-2 focus-visible:ring-primary-container";
type GiftPlan = Exclude<PlanTier, "free">;

function Gifts() {
  const check = useServerFn(amIGiftAdmin);
  const list = useServerFn(listGiftCodes);
  const create = useServerFn(createGiftCode);
  const disable = useServerFn(disableGiftCode);
  const qc = useQueryClient();
  const admin = useQuery({ queryKey: ["gift-admin"], queryFn: () => check() });
  const codes = useQuery({ queryKey: ["gift-codes"], queryFn: () => list(), enabled: admin.data?.admin === true });
  const [plan, setPlan] = useState<GiftPlan>("deep_recon");
  const [days, setDays] = useState(30);
  const [maxUses, setMaxUses] = useState(1);
  const [note, setNote] = useState("");
  const [made, setMade] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function make() {
    setErr(null);
    try {
      setMade((await create({ data: { plan, days, maxUses, note } })).code);
      setNote("");
      await qc.invalidateQueries({ queryKey: ["gift-codes"] });
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed");
    }
  }

  return (
    <Shell>
      <SubHeader badge="GIFT CODES" note="// ADMIN //" />
      <section className="px-margin-mobile sm:px-margin py-space-xl gap-space-lg mx-auto flex max-w-5xl flex-col">
        <h1 className="font-headline text-headline-lg text-paper-distressed uppercase">Gift codes</h1>
        {admin.data && !admin.data.admin && <p className="font-code-terminal text-hazard-orange">This page is for admins only.</p>}
        {admin.data?.admin && (
          <>
            <div className={panel}>
              <h2 className="font-headline text-headline-sm text-paper-distressed uppercase">New code</h2>
              <label htmlFor="g-plan" className="font-code-terminal text-body-sm text-on-surface-variant">Plan</label>
              <select id="g-plan" value={plan} onChange={(e) => setPlan(e.target.value as GiftPlan)} className={field}>
                <option value="operative">Operative (lifetime)</option>
                <option value="deep_recon">Deep Recon</option>
                <option value="brand_command">Brand Command</option>
              </select>
              {plan !== "operative" && (
                <>
                  <label htmlFor="g-days" className="font-code-terminal text-body-sm text-on-surface-variant">Days of access</label>
                  <input id="g-days" type="number" min={1} value={days} onChange={(e) => setDays(Number(e.target.value))} className={field} />
                </>
              )}
              <label htmlFor="g-uses" className="font-code-terminal text-body-sm text-on-surface-variant">How many people can use it</label>
              <input id="g-uses" type="number" min={1} value={maxUses} onChange={(e) => setMaxUses(Number(e.target.value))} className={field} />
              <label htmlFor="g-note" className="font-code-terminal text-body-sm text-on-surface-variant">Note (optional)</label>
              <input id="g-note" value={note} onChange={(e) => setNote(e.target.value)} placeholder="for Sarah" className={field} />
              <button onClick={make} className="font-label-stamp text-label-stamp bg-primary-container text-on-primary-container px-space-md py-space-xs self-start uppercase">
                Create
              </button>
              {err && <p role="alert" className="font-code-terminal text-body-sm text-hazard-orange">{err}</p>}
              {made && (
                <p role="status" className="font-code-terminal text-paper-distressed">
                  New code (shown only once): <strong className="text-primary-container">{made}</strong>
                </p>
              )}
            </div>
            <div className={panel}>
              <h2 className="font-headline text-headline-sm text-paper-distressed uppercase">All codes</h2>
              {codes.data?.length === 0 && <p className="font-code-terminal text-body-sm text-on-surface-variant">No codes yet.</p>}
              {codes.data?.map((c) => (
                <div key={c.id} className="font-code-terminal text-code-terminal gap-space-sm flex flex-wrap items-center justify-between border-t-2 border-outline-variant pt-space-sm">
                  <span className="text-paper-distressed">
                    {PLAN_LABEL[c.plan]} · {c.duration_days ? `${c.duration_days} days` : "lifetime"} · used {c.uses}/{c.max_uses}
                    {c.note ? ` · ${c.note}` : ""}
                  </span>
                  {c.disabled_at ? (
                    <span className="text-on-surface-variant">Disabled</span>
                  ) : (
                    <button
                      onClick={async () => {
                        await disable({ data: { id: c.id } });
                        await qc.invalidateQueries({ queryKey: ["gift-codes"] });
                      }}
                      className="text-hazard-orange"
                    >
                      Disable
                    </button>
                  )}
                </div>
              ))}
            </div>
          </>
        )}
      </section>
    </Shell>
  );
}
