import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { createList, deleteList, getMyAccount } from "@/lib/account/account.functions";
import { createPortalSession, deleteMyAccount } from "@/lib/account/payments.functions";
import { PLAN_LABEL } from "@/lib/account/entitlements";
import { generateRecoveryCodes, recoveryCodeStatus } from "@/lib/account/recovery.functions";
import { BackupCodes } from "@/components/diggr/BackupCodes";
import { Shell, SubHeader } from "@/components/diggr/Chrome";

export const Route = createFileRoute("/_authenticated/account")({
  head: () => ({
    meta: [
      { title: "M4G1C M4NT4 // Operator console" },
      { name: "description", content: "Your plan, lookup history and saved lists." },
      { property: "og:title", content: "M4G1C M4NT4 // Operator console" },
      { property: "og:description", content: "Plan, history and saved lists." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  validateSearch: (s: Record<string, unknown>): { checkout?: "done" } => (s["checkout"] === "done" ? { checkout: "done" } : {}),
  component: Account,
});

const panel = "p-space-md gap-space-sm flex flex-col border-3 border-outline-variant bg-slate-charcoal shadow-stamp-lg";

function Account() {
  const fetchAccount = useServerFn(getMyAccount);
  const create = useServerFn(createList);
  const remove = useServerFn(deleteList);
  const portal = useServerFn(createPortalSession);
  const destroy = useServerFn(deleteMyAccount);
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { checkout } = Route.useSearch();
  const [pollUntil] = useState(() => (checkout ? Date.now() + 30_000 : 0));
  const { data, error } = useQuery({
    queryKey: ["account"],
    queryFn: () => fetchAccount(),
    refetchInterval: () => (Date.now() < pollUntil ? 2_000 : false),
  });
  const [confirmText, setConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [name, setName] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const fetchRecovery = useServerFn(recoveryCodeStatus);
  const makeCodes = useServerFn(generateRecoveryCodes);
  const recovery = useQuery({ queryKey: ["recovery"], queryFn: () => fetchRecovery() });
  const [newCodes, setNewCodes] = useState<string[] | null>(null);

  async function addList() {
    setErr(null);
    try {
      await create({ data: { name } });
      setName("");
      await qc.invalidateQueries({ queryKey: ["account"] });
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed");
    }
  }

  async function signOut() {
    await supabase.auth.signOut();
    qc.clear();
    void navigate({ to: "/" });
  }

  return (
    <Shell>
      <SubHeader
        badge="OPERATOR CONSOLE"
        note="// YOUR RECON ARCHIVE //"
        right={
          <button onClick={signOut} className="underline">
            Sign out
          </button>
        }
      />
      <section className="px-margin-mobile sm:px-margin py-space-xl gap-space-lg mx-auto flex max-w-5xl flex-col">
        <h1 className="font-headline text-headline-lg text-paper-distressed uppercase">Operator console</h1>
        {error && <p className="font-code-terminal text-hazard-orange">{error.message}</p>}
        {checkout && (
          <div role="status" className="p-space-md border-3 border-primary-container bg-slate-charcoal">
            <p className="font-headline text-headline-sm text-primary-container uppercase">Payment received</p>
            <p className="font-code-terminal text-body-sm text-paper-distressed">
              Thanks! Your plan below updates within a few seconds. If it still looks wrong after a minute, refresh the page.
            </p>
          </div>
        )}
        {data?.subscription?.status === "past_due" && (
          <div className="p-space-md border-3 border-hazard-orange bg-hazard-orange/10">
            <p className="font-headline text-headline-sm text-hazard-orange uppercase">Payment failed</p>
            <p className="font-code-terminal text-body-sm text-paper-distressed">
              Your last renewal payment didn't go through. We'll keep retrying for a few days and your features stay on
              in the meantime — update your card via "Manage billing" to avoid losing access.
            </p>
          </div>
        )}
        {data?.subscription?.cancelAtPeriodEnd && data.subscription.currentPeriodEnd && (
          <div className="p-space-md border-3 border-outline-variant bg-slate-charcoal">
            <p className="font-code-terminal text-body-sm text-on-surface-variant">
              Your plan is set to cancel — you keep access until{" "}
              {new Date(data.subscription.currentPeriodEnd).toLocaleDateString()}.
            </p>
          </div>
        )}
        {data && (
          <>
            <div className={panel}>
              <span className="font-label-stamp text-label-stamp text-on-surface-variant uppercase">Plan</span>
              <span className="font-headline text-headline-sm text-primary-container uppercase">
                {PLAN_LABEL[data.entitlements.plan]}
              </span>
              {data.entitlements.plan !== "free" && (
                <button
                  onClick={async () => {
                    const r = await portal({ data: { returnUrl: window.location.href } });
                    if ("error" in r) setErr(r.error);
                    else window.open(r.url, "_blank");
                  }}
                  className="font-code-terminal text-cyber-cyan text-left underline"
                >
                  Manage billing →<span className="sr-only"> (opens in new tab)</span>
                </button>
              )}
              {data.entitlements.plan !== "brand_command" && (
                <Link to="/pricing" className="font-code-terminal text-cyber-cyan underline">
                  Upgrade your plan →
                </Link>
              )}
            </div>

            <div className={panel}>
              <h2 className="font-headline text-headline-sm text-paper-distressed uppercase">Two-factor backup codes</h2>
              {newCodes ? (
                <BackupCodes codes={newCodes} onDone={() => setNewCodes(null)} />
              ) : (
                <>
                  <p className="font-code-terminal text-body-sm text-on-surface-variant">
                    {recovery.data ? `${recovery.data.remaining} unused backup code(s) left.` : "Checking backup codes…"} Making new
                    codes cancels the old ones.
                  </p>
                  <button
                    onClick={async () => {
                      setErr(null);
                      try {
                        setNewCodes((await makeCodes()).codes);
                        await qc.invalidateQueries({ queryKey: ["recovery"] });
                      } catch (e) {
                        setErr(e instanceof Error ? e.message : "Failed");
                      }
                    }}
                    className="font-code-terminal text-cyber-cyan text-left underline"
                  >
                    Make new backup codes →
                  </button>
                </>
              )}
            </div>

            <div className={panel}>
              <h2 className="font-headline text-headline-sm text-paper-distressed uppercase">Saved lists</h2>
              <div className="gap-space-sm flex flex-wrap">
                <input
                  aria-label="New list name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="New list name"
                  className="font-code-terminal text-code-terminal text-paper-distressed! p-space-sm border-2 border-outline-variant bg-grit-black! flex-1 outline-none focus-visible:ring-2 focus-visible:ring-primary-container"
                />
                <button
                  onClick={addList}
                  disabled={!name.trim()}
                  className="font-label-stamp text-label-stamp bg-primary-container text-on-primary-container px-space-md py-space-xs uppercase"
                >
                  Create
                </button>
              </div>
              {err && <p className="font-code-terminal text-body-sm text-hazard-orange">{err}</p>}
              {data.lists.length === 0 && <p className="font-code-terminal text-body-sm text-on-surface-variant">No lists yet.</p>}
              {data.lists.map((l) => (
                <div key={l.id} className="gap-space-sm flex items-center justify-between border-t-2 border-outline-variant pt-space-sm">
                  <Link to="/lists/$id" params={{ id: l.id }} className="font-code-terminal text-paper-distressed underline">
                    {l.name} ({l.count})
                  </Link>
                  <button
                    onClick={async () => {
                      await remove({ data: { id: l.id } });
                      await qc.invalidateQueries({ queryKey: ["account"] });
                    }}
                    className="font-code-terminal text-body-sm text-hazard-orange"
                  >
                    Delete
                  </button>
                </div>
              ))}
            </div>

            <div className={panel}>
              <h2 className="font-headline text-headline-sm text-paper-distressed uppercase">Lookup history</h2>
              {data.history.length === 0 && (
                <p className="font-code-terminal text-body-sm text-on-surface-variant">Lookups you run while signed in show up here.</p>
              )}
              {data.history.map((h) => (
                <div key={h.id} className="font-code-terminal text-code-terminal flex justify-between border-t-2 border-outline-variant pt-space-sm">
                  <span className="text-paper-distressed break-all">{h.domain}</span>
                  <span className="text-on-surface-variant">{new Date(h.checked_at).toLocaleString()}</span>
                </div>
              ))}
            </div>
            <div className={panel}>
              <h2 className="font-headline text-headline-sm text-paper-distressed uppercase">Delete account</h2>
              <p className="font-code-terminal text-body-sm text-on-surface-variant">
                Cancels any monthly plan immediately (no refund for the rest of the month) and permanently erases your lists,
                history and sign-in. Type DELETE to confirm.
              </p>
              <div className="gap-space-sm flex flex-wrap">
                <input
                  aria-label="Type DELETE to confirm"
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  className="font-code-terminal text-code-terminal text-paper-distressed! p-space-sm border-2 border-outline-variant bg-grit-black! flex-1 outline-none focus-visible:ring-2 focus-visible:ring-primary-container"
                />
                <button
                  disabled={confirmText !== "DELETE" || deleting}
                  onClick={async () => {
                    setDeleting(true);
                    setErr(null);
                    const r = await destroy({ data: { confirm: "DELETE" } });
                    if ("error" in r) {
                      setDeleting(false);
                      return setErr(r.error);
                    }
                    await supabase.auth.signOut();
                    qc.clear();
                    void navigate({ to: "/" });
                  }}
                  className="font-label-stamp text-label-stamp border-2 border-hazard-orange text-hazard-orange px-space-md py-space-xs uppercase"
                >
                  {deleting ? "Deleting…" : "Delete forever"}
                </button>
              </div>
            </div>
          </>
        )}
      </section>
    </Shell>
  );
}
