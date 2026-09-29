import { createFileRoute } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState, type FormEvent } from "react";
import { Copy, Globe, Loader2, Search } from "lucide-react";
import { lookupSocials, searchBrand } from "@/lib/social/lookup.functions";
import { allVerifiedTags, formatCheckedAt, looksLikeUrl } from "@/lib/social/format";
import { ResultCard, copyText } from "@/components/social/ResultCard";
import type { DomainCandidate, LookupResult } from "@/lib/social/types";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Handlebar — Find every social handle for a brand" },
      {
        name: "description",
        content: "Paste a company URL and get its verified social handles on X, Threads, Instagram, LinkedIn, Bluesky and more.",
      },
      { property: "og:title", content: "Handlebar — Find every social handle for a brand" },
      { property: "og:description", content: "Verified brand handles, with evidence, ready to copy and tag." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  const [input, setInput] = useState("");
  const [manualUrl, setManualUrl] = useState("");
  const lookupFn = useServerFn(lookupSocials);
  const searchFn = useServerFn(searchBrand);

  const lookup = useMutation<LookupResult, Error, string>({ mutationFn: (url) => lookupFn({ data: { url } }) });
  const search = useMutation<DomainCandidate[], Error, string>({ mutationFn: (query) => searchFn({ data: { query } }) });

  const runLookup = (url: string) => {
    search.reset();
    lookup.mutate(url);
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    const v = input.trim();
    if (!v) return;
    if (looksLikeUrl(v)) runLookup(v);
    else {
      lookup.reset();
      search.mutate(v);
    }
  };

  const busy = lookup.isPending || search.isPending;
  const result = lookup.data;
  const verified = result?.platforms.filter((p) => p.status === "verified") ?? [];
  const unverified = result?.platforms.filter((p) => p.status === "unverified") ?? [];

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 sm:py-16">
        <header className="mb-10">
          <p className="font-mono text-xs tracking-widest text-muted-foreground uppercase">Handlebar</p>
          <h1 className="font-display mt-3 text-4xl leading-tight font-bold sm:text-6xl">
            Every handle.
            <br />
            <span className="text-signal">With receipts.</span>
          </h1>
          <p className="mt-4 max-w-xl text-muted-foreground">
            Paste a company's website to find its official profiles — and exactly where each one was found.
          </p>
        </header>

        <form onSubmit={onSubmit} className="flex flex-col gap-2 sm:flex-row">
          <div className="relative flex-1">
            <Globe className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="stripe.com or a brand name"
              aria-label="Company URL or brand name"
              className="h-12 w-full rounded-lg border border-input bg-card pr-3 pl-9 font-mono text-base outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <button
            type="submit"
            disabled={busy}
            className="inline-flex h-12 items-center justify-center gap-2 rounded-lg bg-primary px-6 font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            Find profiles
          </button>
        </form>

        {lookup.isPending && (
          <p className="mt-6 text-sm text-muted-foreground">
            Reading the site, then searching for anything it doesn't link to. This can take up to 30 seconds…
          </p>
        )}
        {(lookup.error || search.error) && (
          <p className="mt-6 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
            {(lookup.error ?? search.error)?.message}
          </p>
        )}

        {search.data && (
          <section className="mt-10">
            <h2 className="font-display text-2xl font-semibold">Which one did you mean?</h2>
            {search.data.length === 0 && (
              <p className="mt-2 text-sm text-muted-foreground">No matching websites found.</p>
            )}
            <ul className="mt-4 grid gap-3 sm:grid-cols-2">
              {search.data.map((c) => (
                <li key={c.domain}>
                  <button
                    onClick={() => runLookup(c.url)}
                    className="w-full rounded-xl border border-border bg-card p-4 text-left hover:border-foreground/40"
                  >
                    <p className="font-mono text-lg font-semibold">{c.domain}</p>
                    <p className="mt-1 text-sm font-medium">{c.title}</p>
                    <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{c.snippet}</p>
                  </button>
                </li>
              ))}
            </ul>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (manualUrl.trim()) runLookup(manualUrl.trim());
              }}
              className="mt-4 flex flex-col gap-2 rounded-xl border border-dashed border-border p-4 sm:flex-row sm:items-center"
            >
              <label htmlFor="manual" className="text-sm font-medium">
                Not listed? Enter the website:
              </label>
              <input
                id="manual"
                value={manualUrl}
                onChange={(e) => setManualUrl(e.target.value)}
                placeholder="example.com"
                className="h-10 flex-1 rounded-md border border-input bg-card px-3 font-mono text-sm outline-none focus:ring-2 focus:ring-ring"
              />
              <button className="h-10 rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground">
                Look up
              </button>
            </form>
          </section>
        )}

        {result && (
          <section className="mt-10 space-y-10">
            <div className="flex flex-col gap-4 border-b border-border pb-6 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="font-mono text-sm text-muted-foreground">{result.domain}</p>
                <h2 className="font-display text-3xl font-bold">{result.brandName}</h2>
                <p className="mt-1 font-mono text-xs text-muted-foreground">
                  Last checked {formatCheckedAt(result.checkedAt)}
                </p>
              </div>
              {verified.length > 0 && (
                <button
                  onClick={() => copyText(allVerifiedTags(result), "all verified handles")}
                  className="inline-flex items-center gap-2 rounded-lg bg-signal px-4 py-2.5 text-sm font-semibold text-signal-foreground hover:opacity-90"
                >
                  <Copy className="h-4 w-4" /> Copy all verified handles
                </button>
              )}
            </div>

            <div>
              <h3 className="mb-4 font-mono text-xs tracking-widest text-muted-foreground uppercase">
                Verified · linked from the site ({verified.length})
              </h3>
              {verified.length ? (
                <div className="grid gap-4 md:grid-cols-2">
                  {verified.map((r) => (
                    <ResultCard key={r.platformId} result={r} />
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">This site doesn't link to any social profiles we recognize.</p>
              )}
            </div>

            {unverified.length > 0 && (
              <div>
                <h3 className="mb-1 font-mono text-xs tracking-widest text-muted-foreground uppercase">
                  Unverified · found by search ({unverified.length})
                </h3>
                <p className="mb-4 text-sm text-muted-foreground">
                  Not linked on the site. We checked whether each profile links back to {result.domain}.
                </p>
                <div className="grid gap-4 md:grid-cols-2">
                  {unverified.map((r) => (
                    <ResultCard key={r.platformId} result={r} />
                  ))}
                </div>
              </div>
            )}

            {result.notFound.length > 0 && (
              <p className="text-sm text-muted-foreground">
                <span className="font-medium text-foreground">Not found:</span> {result.notFound.join(", ")}
              </p>
            )}
          </section>
        )}
      </div>
    </main>
  );
}
