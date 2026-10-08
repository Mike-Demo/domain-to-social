import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState, type FormEvent } from "react";
import { Shell, SubHeader } from "@/components/diggr/Chrome";
import { useAuth } from "@/hooks/useAuth";
import { WaCopyButton } from "@/design-system/font-awsome-web-awesome-171158";
import { submitSupportTicket } from "@/lib/account/support.functions";
import { SUPPORT_CATEGORIES, SUPPORT_EMAIL, type SupportCategory } from "@/lib/support";

const TITLE = "M4G1C M4NT4 // Support";
const DESC = "Get help with M4G1C M4NT4 lookups, billing, and your account.";

export const Route = createFileRoute("/support")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESC },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESC },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://magicmanta.com/support" },
      { name: "twitter:card", content: "summary" },
    ],
    links: [{ rel: "canonical", href: "https://magicmanta.com/support" }],
  }),
  component: Support,
});

const btn = "font-label-stamp text-label-stamp px-space-md py-space-sm uppercase";
const input =
  "font-code-terminal text-code-terminal text-paper-distressed p-space-sm border-2 border-outline-variant bg-grit-black outline-none focus-visible:ring-2 focus-visible:ring-primary-container";
const labelText = "font-label-stamp text-label-stamp text-on-surface-variant uppercase";
const card = "p-space-md gap-space-md flex flex-col border-3 border-primary-container bg-slate-charcoal shadow-stamp-lg";

function Support() {
  const { user, ready } = useAuth();
  return (
    <Shell>
      <SubHeader badge="SUPPORT" note="// SIGNAL THE OPERATORS //" />
      <section className="px-margin-mobile sm:px-margin py-space-xl gap-space-md mx-auto flex max-w-md flex-col">
        <h1 className="font-headline text-headline-md text-paper-distressed uppercase">Support</h1>
        {!ready ? (
          <p role="status" className="font-code-terminal text-body-sm text-on-surface-variant">Checking your account…</p>
        ) : user ? (
          <TicketForm />
        ) : (
          <SignedOut />
        )}
        <EmailFallback />
      </section>
    </Shell>
  );
}

function SignedOut() {
  return (
    <div className={card}>
      <p className="font-code-terminal text-body-md text-paper-distressed">
        Sign in to open a ticket — your account and plan are attached automatically so we can help faster.
      </p>
      <Link to="/auth" search={{ next: "/support" }} className={`${btn} bg-primary-container text-on-primary-container shadow-stamp text-center`}>
        Sign in to open a ticket
      </Link>
    </div>
  );
}

function EmailFallback() {
  return (
    <div className="p-space-md gap-space-xs flex flex-col border-2 border-outline-variant">
      <p className="font-code-terminal text-body-sm text-on-surface-variant">Can't sign in, or a question before buying? Email us:</p>
      <div className="gap-space-xs flex items-center">
        <a href={`mailto:${SUPPORT_EMAIL}`} className="font-code-terminal text-body-sm text-cyber-cyan break-all underline">
          {SUPPORT_EMAIL}
        </a>
        <WaCopyButton value={SUPPORT_EMAIL} copy-label="Copy support email" />
      </div>
    </div>
  );
}

function TicketForm() {
  const submit = useServerFn(submitSupportTicket);
  const [category, setCategory] = useState<SupportCategory>("General help");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    try {
      const r = await submit({ data: { category, subject, message } });
      setDone(r.ticketId);
    } catch (x) {
      const m = x instanceof Error ? x.message : "Something went wrong.";
      setErr(/two-factor/i.test(m) ? "Finish two-factor sign-in first, then try again." : m);
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <div role="status" className={card}>
        <p className="font-headline text-headline-sm text-acid-lime uppercase">Ticket {done} sent</p>
        <p className="font-code-terminal text-body-sm text-on-surface-variant">We emailed you a receipt and will reply to your account email.</p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className={card}>
      <label className="gap-space-xs flex flex-col">
        <span className={labelText}>Category</span>
        <select value={category} onChange={(e) => setCategory(e.target.value as SupportCategory)} className={input}>
          {SUPPORT_CATEGORIES.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </label>
      <label className="gap-space-xs flex flex-col">
        <span className={labelText}>Subject</span>
        <input required minLength={3} maxLength={140} value={subject} onChange={(e) => setSubject(e.target.value)} className={input} />
      </label>
      <label className="gap-space-xs flex flex-col">
        <span className={labelText}>Message</span>
        <textarea required minLength={10} maxLength={5000} rows={7} value={message} onChange={(e) => setMessage(e.target.value)} className={input} />
      </label>
      <button disabled={busy} className={`${btn} bg-primary-container text-on-primary-container shadow-stamp`}>
        {busy ? "Sending…" : "Send ticket"}
      </button>
      {err && <p role="alert" className="font-code-terminal text-body-sm text-hazard-orange">{err}</p>}
    </form>
  );
}
