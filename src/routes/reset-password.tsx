import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Shell, SubHeader } from "@/components/diggr/Chrome";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "M4G1C M4NT4 // Reset password" },
      { name: "description", content: "Choose a new password for your M4G1C M4NT4 account." },
      { property: "og:title", content: "M4G1C M4NT4 // Reset password" },
      { property: "og:description", content: "Set a new password for your operator account." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
      { property: "og:url", content: "https://magicmanta.com/reset-password" },
    ],
    links: [{ rel: "canonical", href: "https://magicmanta.com/reset-password" }],
  }),
  component: ResetPasswordPage,
});

const btn = "font-label-stamp text-label-stamp px-space-md py-space-sm uppercase";
const input =
  "font-code-terminal text-code-terminal text-paper-distressed! p-space-sm border-2 border-outline-variant bg-grit-black! outline-none focus-visible:ring-2 focus-visible:ring-primary-container";

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" || session) setReady(true);
    });
    if (window.location.hash.includes("type=recovery")) setReady(true);
    void supabase.auth.getSession().then(({ data: d }) => {
      if (d.session) setReady(true);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (password !== confirm) {
      setMsg("Passwords don't match.");
      return;
    }
    setBusy(true);
    setMsg(null);
    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (error) setMsg(error.message);
    else void navigate({ to: "/account" });
  }

  return (
    <Shell>
      <SubHeader badge="OPERATOR ACCESS" note="// RESET YOUR PASSWORD //" />
      <section className="px-margin-mobile sm:px-margin py-space-xl mx-auto flex max-w-md flex-col">
        <form
          onSubmit={submit}
          className="p-space-md gap-space-md flex flex-col border-3 border-primary-container bg-slate-charcoal shadow-stamp-lg"
        >
          <h1 className="font-headline text-headline-md text-paper-distressed uppercase">New password</h1>
          {!ready ? (
            <p className="font-code-terminal text-body-sm text-on-surface-variant">
              Open this page from the reset link in your email. Links expire after a while — request a new one from the
              sign-in page if needed.
            </p>
          ) : (
            <>
              <label className="gap-space-xs flex flex-col">
                <span className="font-label-stamp text-label-stamp text-on-surface-variant uppercase">New password</span>
                <input type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} className={input} />
              </label>
              <label className="gap-space-xs flex flex-col">
                <span className="font-label-stamp text-label-stamp text-on-surface-variant uppercase">Confirm password</span>
                <input type="password" required minLength={8} value={confirm} onChange={(e) => setConfirm(e.target.value)} className={input} />
              </label>
              <button disabled={busy} className={`${btn} bg-primary-container text-on-primary-container shadow-stamp`}>
                {busy ? "Working…" : "Save new password"}
              </button>
            </>
          )}
          {msg && <p className="font-code-terminal text-body-sm text-hazard-orange">{msg}</p>}
        </form>
      </section>
    </Shell>
  );
}
