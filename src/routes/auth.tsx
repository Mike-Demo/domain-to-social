import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { Shell, SubHeader } from "@/components/diggr/Chrome";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "M4G1C M4NT4 // Sign in" },
      { name: "description", content: "Sign in to save lookups, build lists and run bulk sweeps." },
      { property: "og:title", content: "M4G1C M4NT4 // Sign in" },
      { property: "og:description", content: "Operator access for saved lists and bulk recon." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  validateSearch: (s: Record<string, unknown>): { next?: string } => ({ next: safeNext(s["next"]) }),
  component: AuthPage,
});

// Only same-origin paths survive: backslashes, control chars and protocol-relative forms are rejected,
// then the value is resolved against a fixed origin and must stay on it.
export const safeNext = (n: unknown): string | undefined => {
  if (typeof n !== "string" || !n.startsWith("/") || /[\\\u0000-\u001f]/.test(n)) return undefined;
  try {
    const base = "https://same.invalid";
    const u = new URL(n, base);
    if (u.origin !== base) return undefined;
    return `${u.pathname}${u.search}${u.hash}`;
  } catch {
    return undefined;
  }
};

const btn = "font-label-stamp text-label-stamp px-space-md py-space-sm uppercase";
const input =
  "font-code-terminal text-code-terminal text-paper-distressed! p-space-sm border-2 border-outline-variant bg-grit-black! outline-none focus-visible:ring-2 focus-visible:ring-primary-container";

function AuthPage() {
  const navigate = useNavigate();
  const { next } = Route.useSearch();
  const done = () => (next ? window.location.assign(next) : void navigate({ to: "/account" }));
  const returnUrl = () => `${window.location.origin}${next ?? ""}`;
  const [mode, setMode] = useState<"in" | "up">("in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    if (mode === "in") {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setMsg(error.message);
      else done();
    } else {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: next ? returnUrl() : `${window.location.origin}/account` },
      });
      setMsg(error ? error.message : "Check your inbox to confirm your email, then sign in.");
    }
    setBusy(false);
  }

  async function google() {
    const r = await lovable.auth.signInWithOAuth("google", { redirect_uri: returnUrl() });
    if (r.error) setMsg(r.error.message);
    else if (!r.redirected) done();
  }

  async function apple() {
    const r = await lovable.auth.signInWithOAuth("apple", { redirect_uri: returnUrl() });
    if (r.error) setMsg(r.error.message);
    else if (!r.redirected) done();
  }

  async function microsoft() {
    const r = await lovable.auth.signInWithOAuth("microsoft", { redirect_uri: returnUrl() });
    if (r.error) setMsg(r.error.message);
    else if (!r.redirected) done();
  }

  async function agentId() {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "custom:app-oidc",
      options: { redirectTo: returnUrl(), scopes: "openid email profile owner_email owner_profile" },
    });
    if (error) setMsg(error.message);
  }

  return (
    <Shell>
      <SubHeader badge="OPERATOR ACCESS" note="// SIGN IN TO SAVE YOUR RECON //" />
      <section className="px-margin-mobile sm:px-margin py-space-xl mx-auto flex max-w-md flex-col">
        <form
          onSubmit={submit}
          className="p-space-md gap-space-md flex flex-col border-3 border-primary-container bg-slate-charcoal shadow-stamp-lg"
        >
          <h1 className="font-headline text-headline-md text-paper-distressed uppercase">
            {mode === "in" ? "Sign in" : "Create account"}
          </h1>
          <button type="button" onClick={google} className={`${btn} bg-paper-distressed text-grit-black`}>
            Continue with Google
          </button>
          <button type="button" onClick={apple} className={`${btn} bg-paper-distressed text-grit-black`}>
            Continue with Apple
          </button>
          <button type="button" onClick={microsoft} className={`${btn} bg-paper-distressed text-grit-black`}>
            Continue with Microsoft
          </button>
          <button type="button" onClick={agentId} className={`${btn} bg-cyber-cyan text-grit-black`}>
            Continue with AgentID
          </button>
          <label className="gap-space-xs flex flex-col">
            <span className="font-label-stamp text-label-stamp text-on-surface-variant uppercase">Email</span>
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className={input} />
          </label>
          <label className="gap-space-xs flex flex-col">
            <span className="font-label-stamp text-label-stamp text-on-surface-variant uppercase">Password</span>
            <input
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={input}
            />
          </label>
          <button disabled={busy} className={`${btn} bg-primary-container text-on-primary-container shadow-stamp`}>
            {busy ? "Working…" : mode === "in" ? "Sign in" : "Sign up"}
          </button>
          {msg && <p className="font-code-terminal text-body-sm text-hazard-orange">{msg}</p>}
          <button
            type="button"
            onClick={() => setMode(mode === "in" ? "up" : "in")}
            className="font-code-terminal text-body-sm text-cyber-cyan underline"
          >
            {mode === "in" ? "No account? Sign up" : "Have an account? Sign in"}
          </button>
        </form>
      </section>
    </Shell>
  );
}
