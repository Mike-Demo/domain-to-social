import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Shell, SubHeader } from "@/components/diggr/Chrome";
import { useServerFn } from "@tanstack/react-start";
import { WaCopyButton } from "@/design-system/font-awsome-web-awesome-171158";
import { generateRecoveryCodes, redeemRecoveryCode } from "@/lib/account/recovery.functions";
import { safeNext } from "./auth";

export const Route = createFileRoute("/mfa")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "M4G1C M4NT4 // Two-factor check" },
      { name: "description", content: "Confirm it's you with your authenticator app." },
      { property: "og:title", content: "M4G1C M4NT4 // Two-factor check" },
      { property: "og:description", content: "Authenticator-app verification for operator accounts." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  validateSearch: (s: Record<string, unknown>): { next?: string } => {
    const next = safeNext(s["next"]);
    return next ? { next } : {};
  },
  component: MfaPage,
});

type Stage =
  | { kind: "loading" }
  | { kind: "enroll"; factorId: string; qr: string; secret: string }
  | { kind: "verify"; factorId: string; backup: boolean }
  | { kind: "codes"; codes: string[] };

const btn = "font-label-stamp text-label-stamp px-space-md py-space-sm uppercase";
const input =
  "font-code-terminal text-code-terminal text-paper-distressed! p-space-sm border-2 border-outline-variant bg-grit-black! outline-none focus-visible:ring-2 focus-visible:ring-primary-container";

function MfaPage() {
  const navigate = useNavigate();
  const { next } = Route.useSearch();
  const [stage, setStage] = useState<Stage>({ kind: "loading" });
  const [code, setCode] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const makeCodes = useServerFn(generateRecoveryCodes);
  const redeem = useServerFn(redeemRecoveryCode);
  const done = () => (next ? window.location.assign(next) : void navigate({ to: "/account" }));

  async function load() {
    {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return void navigate({ to: "/auth", search: next ? { next: `/mfa?next=${encodeURIComponent(next)}` } : {} });
      const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
      if (aal?.currentLevel === "aal2") return done();
      const { data: factors, error } = await supabase.auth.mfa.listFactors();
      if (error) return setMsg(error.message);
      const verified = factors.totp.find((f) => f.status === "verified");
      if (verified) return setStage({ kind: "verify", factorId: verified.id, backup: false });
      // Clear half-finished setups so a fresh QR code can be issued.
      for (const f of factors.all.filter((x) => x.status !== "verified")) await supabase.auth.mfa.unenroll({ factorId: f.id });
      const { data: en, error: enErr } = await supabase.auth.mfa.enroll({ factorType: "totp", friendlyName: "Authenticator app" });
      if (enErr) return setMsg(enErr.message);
      setStage({ kind: "enroll", factorId: en.id, qr: en.totp.qr_code, secret: en.totp.secret });
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (stage.kind === "loading" || stage.kind === "codes") return;
    setBusy(true);
    setMsg(null);
    if (stage.kind === "verify" && stage.backup) {
      try {
        await redeem({ data: { code } });
        await supabase.auth.refreshSession();
        setCode("");
        setStage({ kind: "loading" });
        setMsg("Backup code accepted. Set up your authenticator app again.");
        await load();
      } catch (err) {
        setMsg(err instanceof Error ? err.message : "That backup code didn't work.");
      }
      return setBusy(false);
    }
    const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId: stage.factorId, code: code.trim() });
    if (error) {
      setBusy(false);
      return setMsg("That code didn't work. Check your app's latest code and try again.");
    }
    if (stage.kind === "enroll") {
      try {
        const r = await makeCodes();
        setBusy(false);
        setCode("");
        return setStage({ kind: "codes", codes: r.codes });
      } catch {
        setMsg("Two-factor is on, but backup codes couldn't be made. Create them from your console.");
      }
    }
    setBusy(false);
    done();
  }

  async function signOut() {
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <Shell>
      <SubHeader badge="TWO-FACTOR" note="// AUTHENTICATOR APP REQUIRED //" />
      <section className="px-margin-mobile sm:px-margin py-space-xl mx-auto flex max-w-md flex-col">
        <form
          onSubmit={submit}
          className="p-space-md gap-space-md flex flex-col border-3 border-primary-container bg-slate-charcoal shadow-stamp-lg"
        >
          <h1 className="font-headline text-headline-md text-paper-distressed uppercase">
            {stage.kind === "enroll" ? "Set up two-factor" : stage.kind === "codes" ? "Save your backup codes" : "Enter your code"}
          </h1>
          {stage.kind === "loading" && !msg && (
            <p role="status" className="font-code-terminal text-body-sm text-on-surface-variant">Checking your account…</p>
          )}
          {stage.kind === "enroll" && (
            <>
              <p className="font-code-terminal text-body-sm text-on-surface-variant">
                Every account needs an authenticator app (1Password, Apple Passwords, Google Authenticator, Authy). Scan this
                code, then type the 6-digit number it shows.
              </p>
              <img src={stage.qr} alt="QR code to add M4G1C M4NT4 to your authenticator app" className="bg-paper-distressed p-space-sm self-center" />
              <p className="font-code-terminal text-body-sm text-on-surface-variant break-all">
                Can't scan? Enter this key: <span className="text-paper-distressed select-all">{stage.secret}</span>
              </p>
            </>
          )}
          {stage.kind === "codes" && <BackupCodes codes={stage.codes} onDone={done} />}
          {stage.kind === "verify" && (
            <p className="font-code-terminal text-body-sm text-on-surface-variant">
              {stage.backup
                ? "Lost your phone? Enter one of your backup codes. It removes your old authenticator so you can set up a new one."
                : "Open your authenticator app and type the 6-digit code for M4G1C M4NT4."}
            </p>
          )}
          {(stage.kind === "enroll" || stage.kind === "verify") && (
            <>
              {stage.kind === "verify" && stage.backup ? (
                <label className="gap-space-xs flex flex-col">
                  <span className="font-label-stamp text-label-stamp text-on-surface-variant uppercase">Backup code</span>
                  <input
                    autoComplete="off"
                    required
                    autoFocus
                    placeholder="XXXXX-XXXXX"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    className={input}
                  />
                </label>
              ) : (
                <label className="gap-space-xs flex flex-col">
                  <span className="font-label-stamp text-label-stamp text-on-surface-variant uppercase">6-digit code</span>
                  <input
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    pattern="[0-9]{6}"
                    maxLength={6}
                    required
                    autoFocus
                    value={code}
                    onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                    className={input}
                  />
                </label>
              )}
              <button disabled={busy} className={`${btn} bg-primary-container text-on-primary-container shadow-stamp`}>
                {busy ? "Checking…" : "Verify"}
              </button>
              {stage.kind === "verify" && (
                <button
                  type="button"
                  onClick={() => {
                    setCode("");
                    setMsg(null);
                    setStage({ ...stage, backup: !stage.backup });
                  }}
                  className="font-code-terminal text-body-sm text-cyber-cyan underline"
                >
                  {stage.backup ? "Use my authenticator app instead" : "Lost your phone? Use a backup code"}
                </button>
              )}
            </>
          )}
          {msg && <p role="alert" className="font-code-terminal text-body-sm text-hazard-orange">{msg}</p>}
          <button type="button" onClick={signOut} className="font-code-terminal text-body-sm text-cyber-cyan underline">
            Sign out
          </button>
        </form>
      </section>
    </Shell>
  );
}

/** One-time display of freshly issued backup codes. */
export function BackupCodes({ codes, onDone }: { codes: string[]; onDone?: () => void }) {
  const all = codes.join("\n");
  return (
    <div className="gap-space-sm flex flex-col">
      <p className="font-code-terminal text-body-sm text-on-surface-variant">
        Each code works once if you lose your phone. Store them in your password manager or print them. You won't see them again.
      </p>
      <ul aria-label="Backup codes" className="gap-space-xs p-space-sm grid grid-cols-2 border-2 border-outline-variant bg-grit-black">
        {codes.map((c) => (
          <li key={c} className="font-code-terminal text-code-terminal text-paper-distressed select-all">{c}</li>
        ))}
      </ul>
      <span className="gap-space-xs font-code-terminal text-body-sm text-cyber-cyan flex items-center">
        <WaCopyButton value={all} copy-label="Copy all backup codes" success-label="Copied" /> Copy all codes
      </span>
      {onDone && (
        <button type="button" onClick={onDone} className={`${btn} bg-primary-container text-on-primary-container shadow-stamp`}>
          I've saved them — continue
        </button>
      )}
    </div>
  );
}
