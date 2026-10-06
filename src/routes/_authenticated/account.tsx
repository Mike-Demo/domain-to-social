import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { createList, deleteList, getMyAccount } from "@/lib/account/account.functions";
import { createPortalSession } from "@/lib/account/payments.functions";
import { PLAN_LABEL } from "@/lib/account/entitlements";
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
  component: Account,
});

const panel = "p-space-md gap-space-sm flex flex-col border-3 border-outline-variant bg-slate-charcoal shadow-stamp-lg";

function Account() {
  const fetchAccount = useServerFn(getMyAccount);
  const create = useServerFn(createList);
  const remove = useServerFn(deleteList);
  const portal = useServerFn(createPortalSession);
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { data, error } = useQuery({ queryKey: ["account"], queryFn: () => fetchAccount() });
  const [name, setName] = useState("");
  const [err, setErr] = useState<string | null>(null);

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
                  Manage billing →
                </button>
              )}
              {data.entitlements.plan !== "brand_command" && (
                <Link to="/pricing" className="font-code-terminal text-cyber-cyan underline">
                  Upgrade your plan →
                </Link>
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
                  className="font-code-terminal text-code-terminal text-paper-distressed! p-space-sm border-2 border-outline-variant bg-grit-black! flex-1 outline-none"
                />
                <button
                  onClick={addList}
                  disabled={!name.trim()}
                  className="font-label-stamp text-label-stamp bg-primary-container text-on-primary-container px-4 py-2 uppercase"
                >
                  Create
                </button>
              </div>
              {err && <p className="font-code-terminal text-body-sm text-hazard-orange">{err}</p>}
              {data.lists.length === 0 && <p className="font-code-terminal text-body-sm text-on-surface-variant">No lists yet.</p>}
              {data.lists.map((l) => (
                <div key={l.id} className="gap-space-sm flex items-center justify-between border-t-2 border-outline-variant pt-2">
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
                <div key={h.id} className="font-code-terminal text-code-terminal flex justify-between border-t-2 border-outline-variant pt-2">
                  <span className="text-paper-distressed break-all">{h.domain}</span>
                  <span className="text-on-surface-variant">{new Date(h.checked_at).toLocaleString()}</span>
                </div>
              ))}
            </div>
          </>
        )}
      </section>
    </Shell>
  );
}
