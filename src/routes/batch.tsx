import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Shell, SubHeader } from "@/components/diggr/Chrome";
import { useAuth } from "@/hooks/useAuth";
import { addToList, getMyAccount, runBatch } from "@/lib/account/account.functions";
import type { LookupResult } from "@/lib/social/types";

export const Route = createFileRoute("/batch")({
  head: () => ({
    meta: [
      { title: "M4G1C M4NT4 // Batch Sniffer — bulk social recon pipeline" },
      {
        name: "description",
        content: "Queue several domains at once and save every resolved handle to a list. Bulk sweeps for Operative members.",
      },
      { property: "og:title", content: "M4G1C M4NT4 // Batch Sniffer" },
      { property: "og:description", content: "Bulk domain recon with saved lists." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { property: "og:url", content: "https://magicmanta.com/batch" },
    ],
    links: [{ rel: "canonical", href: "https://magicmanta.com/batch" }],
  }),
  component: BatchSniffer,
});

type Row = { input: string; ok: true; result: LookupResult } | { input: string; ok: false; error: string };

const btn = "font-label-stamp text-label-stamp px-space-md py-space-sm uppercase";

function BatchSniffer() {
  const { user, ready } = useAuth();
  const fetchAccount = useServerFn(getMyAccount);
  const run = useServerFn(runBatch);
  const add = useServerFn(addToList);
  const account = useQuery({ queryKey: ["account"], queryFn: () => fetchAccount(), enabled: !!user });
  const [paste, setPaste] = useState("stripe.com\nvercel.com");
  const [rows, setRows] = useState<Row[]>([]);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [listId, setListId] = useState("");

  const limit = account.data?.entitlements.batchSize ?? 0;
  const urls = paste.split(/[\n,]/).map((s) => s.trim()).filter(Boolean);

  async function start() {
    setBusy(true);
    setMsg(null);
    setRows([]);
    try {
      setRows(await run({ data: { urls } }));
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Batch failed");
    }
    setBusy(false);
  }

  async function onCsv(file: File) {
    const text = await file.text();
    setPaste(text.split(/\r?\n/).map((l) => l.split(",")[0]?.trim() ?? "").filter(Boolean).join("\n"));
  }

  async function save() {
    const results = rows.flatMap((r) => (r.ok ? [r.result] : []));
    try {
      await add({ data: { listId, results } });
      setMsg(`Saved ${results.length} results to the list.`);
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Save failed");
    }
  }

  return (
    <Shell>
      <SubHeader
        badge="BATCH_PIPELINE"
        badgeClass="bg-cyber-cyan text-grit-black"
        note="// BULK RECON //"
        right={<span>[LIMIT: {limit || "—"} PER RUN]</span>}
      />
      <section className="px-margin-mobile sm:px-margin py-space-xl gap-space-xl mx-auto flex max-w-7xl flex-col">
        <h1 className="font-display-hero text-display-hero-mobile lg:text-display-hero text-paper-distressed leading-none uppercase">
          BATCH{" "}
          <span className="text-on-primary-container inline-block -rotate-1 bg-primary-container px-space-sm shadow-stamp-magenta">
            SNIFFER
          </span>
        </h1>

        {ready && !user && (
          <p className="font-code-terminal text-on-surface-variant">
            <Link to="/auth" className="text-cyber-cyan underline">Sign in</Link> with an Operative plan to run bulk sweeps.
          </p>
        )}
        {user && account.data && limit === 0 && (
          <p className="font-code-terminal text-on-surface-variant">
            Bulk sweeps are part of the Operative plan. <Link to="/pricing" className="text-cyber-cyan underline">See pricing</Link>
          </p>
        )}

        <div className="p-space-md gap-space-md flex flex-col border-3 border-primary-container bg-slate-charcoal shadow-stamp-lg">
          <span className="font-label-stamp text-label-stamp text-primary-container uppercase">
            PASTE TARGETS // ONE PER LINE ({urls.length}/{limit || 0})
          </span>
          <textarea
            value={paste}
            onChange={(e) => setPaste(e.target.value)}
            rows={6}
            aria-label="Batch targets"
            className="font-code-terminal text-code-terminal text-paper-distressed! p-space-sm border-2 border-outline-variant bg-grit-black! outline-none focus-visible:ring-2 focus-visible:ring-primary-container"
          />
          <div className="gap-space-sm flex flex-wrap items-center">
            <button
              onClick={start}
              disabled={busy || limit === 0 || urls.length === 0 || urls.length > limit}
              className={`${btn} bg-primary-container text-on-primary-container shadow-stamp disabled:opacity-50`}
            >
              {busy ? "Sweeping…" : "Run batch"}
            </button>
            <span role="status" aria-live="polite" className="sr-only">
              {busy ? `Running batch of ${urls.length}…` : rows.length ? `${rows.length} of ${rows.length} done.` : ""}
            </span>
            <label className={`${btn} text-paper-distressed cursor-pointer border-2 border-paper-distressed`}>
              Upload CSV
              <input type="file" aria-label="Upload a CSV or text list of target domains" accept=".csv,.txt" className="hidden" onChange={(e) => e.target.files?.[0] && onCsv(e.target.files[0])} />
            </label>
          </div>
          {msg && <p className="font-code-terminal text-body-sm text-hazard-orange">{msg}</p>}
        </div>

        {rows.length > 0 && (
          <div className="gap-space-sm flex flex-col">
            <h2 className="font-headline text-headline-md text-paper-distressed uppercase">RESULTS</h2>
            <div className="border-3 border-outline-variant bg-surface-low shadow-stamp-lg">
              {rows.map((r) => (
                <div key={r.input} className="p-space-md gap-space-sm flex flex-wrap justify-between border-b-2 border-outline-variant last:border-b-0">
                  <span className="font-code-terminal text-body-lg text-paper-distressed break-all">{r.input}</span>
                  <span className="font-code-terminal text-code-terminal text-on-surface-variant">
                    {r.ok
                      ? r.result.platforms.map((p) => `${p.platformName}: ${p.entries.map((e) => e.tag).join(", ")}`).join(" // ") || "No profiles found"
                      : r.error}
                  </span>
                </div>
              ))}
            </div>
            {account.data && account.data.lists.length > 0 && (
              <div className="gap-space-sm flex flex-wrap items-center">
                <select
                  aria-label="Choose list"
                  value={listId}
                  onChange={(e) => setListId(e.target.value)}
                  className="font-code-terminal text-paper-distressed! p-space-sm border-2 border-outline-variant bg-grit-black!"
                >
                  <option value="">Choose a list…</option>
                  {account.data.lists.map((l) => (
                    <option key={l.id} value={l.id}>{l.name}</option>
                  ))}
                </select>
                <button onClick={save} disabled={!listId} className={`${btn} text-paper-distressed border-2 border-paper-distressed`}>
                  Save to list
                </button>
              </div>
            )}
          </div>
        )}
      </section>
    </Shell>
  );
}
