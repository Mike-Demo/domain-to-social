import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Shell, SubHeader } from "@/components/diggr/Chrome";
import { copyText } from "@/components/diggr/ProfileSlab";
import { lookupSocials } from "@/lib/social/lookup.functions";
import type { LookupResult } from "@/lib/social/types";

export const Route = createFileRoute("/dossier")({
  validateSearch: (search: Record<string, unknown>): { target?: string } => {
    const target = typeof search["target"] === "string" ? search["target"].trim() : "";
    return target ? { target } : {};
  },
  head: () => ({
    meta: [
      { title: "M4G1C M4NT4 // Dossier — the decrypted intel sheet" },
      {
        name: "description",
        content:
          "A printable dossier of every confirmed handle for a target, with the full evidence chain and export to PDF or JSON.",
      },
      { property: "og:title", content: "M4G1C M4NT4 // Dossier" },
      { property: "og:description", content: "Printable intel sheet with the full evidence chain." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Dossier,
});

function evidenceChain(result: LookupResult): string[] {
  const sources = new Set<string>();
  let reciprocal = 0;
  let conflicts = 0;
  for (const platform of result.platforms) {
    if (platform.conflict) conflicts += 1;
    for (const entry of platform.entries) {
      for (const source of entry.sources) sources.add(source);
      if (entry.reciprocal === "links_back") reciprocal += 1;
    }
  }
  const lines = [
    `FETCH ${result.domain} -> final URL ${result.finalUrl}`,
    `PARSE structured data + page links -> sources seen: ${[...sources].join(", ") || "none"}`,
    `MERGE by handle -> ${conflicts === 0 ? "no conflicts" : `${conflicts} platform conflict(s) flagged`}`,
    `RECIPROCAL CHECK -> ${reciprocal} profile(s) link back to ${result.domain}`,
  ];
  if (result.blocked) lines.push("NOTE -> target refused automated visit; search/probe evidence only");
  if (result.enrichment?.used) lines.push(`ENRICHMENT -> rendered via Firecrawl (${result.enrichment.reason})`);
  if (result.browserUse?.used) lines.push(`LIVE BROWSER -> ${result.browserUse.reason}`);
  lines.push(`CHECKED AT -> ${result.checkedAt}`);
  return lines;
}

function Dossier() {
  const { target } = Route.useSearch();
  const navigate = useNavigate();
  const [result, setResult] = useState<LookupResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [draft, setDraft] = useState("");

  useEffect(() => {
    if (!target) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    setResult(null);
    lookupSocials({ data: { url: target } })
      .then((r) => {
        if (!cancelled) setResult(r);
      })
      .catch((e: unknown) => {
        if (!cancelled) setError(e instanceof Error ? e.message : "Lookup failed.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [target]);

  const submit = () => {
    const value = draft.trim();
    if (value) void navigate({ to: "/dossier", search: { target: value } });
  };

  const entries = result
    ? result.platforms.flatMap((p) =>
        p.entries.map((e) => ({
          platform: p.platformName,
          tag: e.tag,
          proof: e.evidence[0] ?? "Found on target site",
          verified: p.status === "verified" && e.verified,
        })),
      )
    : [];

  return (
    <Shell>
      <SubHeader
        badge="DOSSIER // DECRYPTED"
        badgeClass="bg-paper-distressed text-grit-black"
        note="// EVIDENCE CHAIN ATTACHED //"
        right={<span>[CLASSIFICATION: OPEN SOURCE]</span>}
      />
      <section className="px-margin-mobile sm:px-margin py-space-xl gap-space-lg mx-auto flex max-w-4xl flex-col">
        <form
          className="gap-space-sm flex flex-wrap"
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
        >
          <label htmlFor="dossier-target" className="font-label-stamp text-label-stamp text-paper-distressed uppercase">
            Target domain
          </label>
          <input
            id="dossier-target"
            type="text"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="example.com"
            className="font-code-terminal text-code-terminal text-paper-distressed border-2 border-outline-variant bg-grit-black px-space-sm py-space-xs"
          />
          <button
            type="submit"
            className="font-label-stamp text-label-stamp bg-primary-container text-on-primary-container px-space-md py-space-xs uppercase shadow-stamp"
          >
            Decrypt
          </button>
        </form>

        {loading && (
          <p className="font-code-terminal text-code-terminal text-acid-lime" role="status">
            &gt; Running recon on {target}…
          </p>
        )}
        {error && (
          <p className="font-code-terminal text-code-terminal text-hazard-orange" role="alert">
            &gt; {error}
          </p>
        )}

        {result && (
          <>
            <div className="p-space-lg gap-space-lg text-grit-black flex flex-col border-3 border-grit-black bg-paper-distressed shadow-stamp-lime-xl">
              <div className="gap-space-md pb-space-md flex flex-wrap items-start justify-between border-b-2 border-grit-black">
                <div>
                  <p className="font-label-stamp text-label-stamp uppercase">INTEL SHEET // TARGET</p>
                  <h1 className="font-display-hero text-headline-lg uppercase">{result.brandName} Intel Dossier</h1>
                  <p className="font-code-terminal text-code-terminal">{result.domain}</p>
                </div>
                <span className="font-label-stamp text-label-stamp text-paper-distressed rotate-3 border-2 border-grit-black bg-electric-magenta px-space-sm py-space-xs uppercase">
                  DECRYPTED
                </span>
              </div>

              <h2 className="font-headline text-headline-sm uppercase">CONFIRMED HANDLES</h2>
              {entries.length === 0 ? (
                <p className="font-code-terminal text-code-terminal">
                  &gt; No social profiles confirmed for this target.
                </p>
              ) : (
                <table className="w-full text-left">
                  <thead>
                    <tr className="font-label-stamp text-label-stamp uppercase">
                      <th className="pb-space-xs">Platform</th>
                      <th className="pb-space-xs">Handle</th>
                      <th className="pb-space-xs hidden sm:table-cell">Proof</th>
                    </tr>
                  </thead>
                  <tbody className="font-code-terminal text-code-terminal">
                    {entries.map((h) => (
                      <tr key={`${h.platform}-${h.tag}`} className="border-t-2 border-grit-black/20">
                        <td className="py-space-xs uppercase">{h.platform}</td>
                        <td className="py-space-xs break-all">
                          {h.tag}
                          {!h.verified && <span className="uppercase"> (unverified)</span>}
                        </td>
                        <td className="py-space-xs hidden sm:table-cell">{h.proof}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              <div>
                <h2 className="font-headline text-headline-sm uppercase">EVIDENCE CHAIN</h2>
                <ol className="font-code-terminal text-code-terminal gap-space-2xs mt-space-xs flex flex-col">
                  {evidenceChain(result).map((c) => (
                    <li key={c}>&gt; {c}</li>
                  ))}
                </ol>
              </div>
            </div>

            <div className="gap-space-sm flex flex-wrap">
              <button
                onClick={() => window.print()}
                className="font-label-stamp text-label-stamp bg-primary-container text-on-primary-container px-space-md py-space-sm uppercase shadow-stamp"
              >
                Export PDF
              </button>
              <button
                onClick={() => copyText(JSON.stringify(result, null, 2), "dossier JSON")}
                className="font-label-stamp text-label-stamp text-paper-distressed border-2 border-paper-distressed px-space-md py-space-sm uppercase hover:bg-paper-distressed hover:text-grit-black"
              >
                Copy JSON
              </button>
            </div>
          </>
        )}

        {!target && !loading && (
          <p className="font-code-terminal text-code-terminal text-on-surface-variant">
            &gt; Enter a target domain above to decrypt its intel sheet.
          </p>
        )}
      </section>
    </Shell>
  );
}
