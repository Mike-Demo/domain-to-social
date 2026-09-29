import { AlertTriangle, BadgeCheck, CircleHelp, Copy, ExternalLink, Link2 } from "lucide-react";
import { toast } from "sonner";
import { formatCheckedAt } from "@/lib/social/format";
import type { PlatformResult, ProfileEntry } from "@/lib/social/types";

export async function copyText(text: string, label: string): Promise<void> {
  await navigator.clipboard.writeText(text);
  toast.success(`Copied ${label}`);
}

function EntryRow({ entry }: { entry: ProfileEntry }) {
  return (
    <div className="space-y-3 border-t border-border pt-4 first:border-t-0 first:pt-0">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-mono text-lg font-semibold break-all">{entry.tag}</span>
        {entry.reciprocal === "links_back" && (
          <span className="rounded-full bg-signal/15 px-2 py-0.5 text-xs font-medium text-signal">Links back</span>
        )}
      </div>
      <ul className="space-y-1 text-sm text-muted-foreground">
        {entry.evidence.map((ev) => (
          <li key={ev} className="flex gap-2">
            <span aria-hidden className="text-foreground/40">
              —
            </span>
            {ev}
          </li>
        ))}
      </ul>
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => copyText(entry.tag, entry.tag)}
          className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          <Copy className="h-3.5 w-3.5" /> Copy {entry.tag.startsWith("@") ? "handle" : "tag"}
        </button>
        <button
          onClick={() => copyText(entry.url, "profile URL")}
          className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-sm font-medium hover:bg-accent"
        >
          <Link2 className="h-3.5 w-3.5" /> Copy URL
        </button>
        <a
          href={entry.url}
          target="_blank"
          rel="noreferrer noopener"
          className="inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ExternalLink className="h-3.5 w-3.5" /> Open
        </a>
      </div>
    </div>
  );
}

export function ResultCard({ result }: { result: PlatformResult }) {
  const verified = result.status === "verified";
  return (
    <article className="flex flex-col gap-4 rounded-xl border border-border bg-card p-5 shadow-[var(--shadow-card)]">
      <header className="flex items-start justify-between gap-3">
        <h3 className="font-display text-xl font-semibold">{result.platformName}</h3>
        <div className="flex flex-wrap justify-end gap-1.5">
          {verified ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-signal px-2.5 py-1 text-xs font-semibold text-signal-foreground">
              <BadgeCheck className="h-3.5 w-3.5" /> Verified
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 rounded-full bg-caution/20 px-2.5 py-1 text-xs font-semibold text-caution-foreground">
              <CircleHelp className="h-3.5 w-3.5" /> Unverified
            </span>
          )}
          {result.conflict && (
            <span className="inline-flex items-center gap-1 rounded-full bg-destructive/15 px-2.5 py-1 text-xs font-semibold text-destructive">
              <AlertTriangle className="h-3.5 w-3.5" /> Conflict
            </span>
          )}
        </div>
      </header>
      {result.conflict && (
        <p className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          The site's structured data and its visible links point to different accounts. Both are shown — check which one
          is current.
        </p>
      )}
      <div className="space-y-4">
        {result.entries.map((e) => (
          <EntryRow key={e.url} entry={e} />
        ))}
      </div>
      <footer className="mt-auto font-mono text-xs text-muted-foreground">
        Last checked {formatCheckedAt(result.checkedAt)}
      </footer>
    </article>
  );
}
