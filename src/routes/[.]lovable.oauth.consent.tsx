import { createFileRoute, redirect } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Shell, SubHeader } from "@/components/diggr/Chrome";

interface OAuthResult {
  data: { redirect_url?: string; redirect_to?: string; client?: { name?: string } } | null;
  error: { message: string } | null;
}
interface OAuthApi {
  getAuthorizationDetails: (id: string) => Promise<OAuthResult>;
  approveAuthorization: (id: string) => Promise<OAuthResult>;
  denyAuthorization: (id: string) => Promise<OAuthResult>;
}
const oauth = (): OAuthApi => (supabase.auth as unknown as { oauth: OAuthApi }).oauth;

export const Route = createFileRoute("/.lovable/oauth/consent")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "M4G1C M4NT4 // Connect an assistant" },
      { name: "description", content: "Approve an AI assistant to use M4G1C M4NT4 as you." },
      { property: "og:title", content: "M4G1C M4NT4 // Connect an assistant" },
      { property: "og:description", content: "Approve an AI assistant to use M4G1C M4NT4 as you." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  validateSearch: (s: Record<string, unknown>) => ({
    authorization_id: typeof s["authorization_id"] === "string" ? s["authorization_id"] : "",
  }),
  beforeLoad: async ({ search, location }) => {
    if (!search.authorization_id) throw new Error("Missing authorization_id");
    const { data } = await supabase.auth.getSession();
    if (!data.session) throw redirect({ to: "/auth", search: { next: location.pathname + location.searchStr } });
  },
  loader: async ({ location }) => {
    const id = new URLSearchParams(location.search).get("authorization_id") ?? "";
    const { data, error } = await oauth().getAuthorizationDetails(id);
    if (error) throw new Error(error.message);
    const immediate = data?.redirect_url ?? data?.redirect_to;
    if (immediate && !data?.client) throw redirect({ href: immediate });
    return { clientName: data?.client?.name ?? "An assistant" };
  },
  component: Consent,
  errorComponent: ({ error }) => (
    <Shell>
      <main className="p-space-md font-code-terminal text-hazard-orange">
        Could not load this request: {error.message}
      </main>
    </Shell>
  ),
});

const btn = "font-label-stamp text-label-stamp px-space-md py-space-sm uppercase";

function Consent() {
  const { clientName } = Route.useLoaderData();
  const { authorization_id } = Route.useSearch();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function decide(approve: boolean) {
    setBusy(true);
    const { data, error: err } = approve
      ? await oauth().approveAuthorization(authorization_id)
      : await oauth().denyAuthorization(authorization_id);
    const target = data?.redirect_url ?? data?.redirect_to;
    if (err || !target) {
      setBusy(false);
      setError(err?.message ?? "No redirect returned.");
      return;
    }
    window.location.href = target;
  }

  return (
    <Shell>
      <SubHeader badge="AGENT ACCESS" note="// APPROVE AN ASSISTANT //" />
      <section className="px-margin-mobile sm:px-margin py-space-xl mx-auto flex max-w-md flex-col">
        <div className="p-space-md gap-space-md flex flex-col border-3 border-primary-container bg-slate-charcoal shadow-stamp-lg">
          <h1 className="font-headline text-headline-md text-paper-distressed uppercase">Connect {clientName}</h1>
          <p className="font-code-terminal text-body-sm text-on-surface-variant">
            {clientName} will be able to run lookups and read your saved lookups and lists as you.
          </p>
          {error && (
            <p role="alert" className="font-code-terminal text-body-sm text-hazard-orange">
              {error}
            </p>
          )}
          <button disabled={busy} onClick={() => void decide(true)} className={`${btn} bg-primary-container text-on-primary-container shadow-stamp`}>
            Approve
          </button>
          <button disabled={busy} onClick={() => void decide(false)} className={`${btn} bg-paper-distressed text-grit-black`}>
            Deny
          </button>
        </div>
      </section>
    </Shell>
  );
}
