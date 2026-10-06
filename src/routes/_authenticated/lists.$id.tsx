import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getList } from "@/lib/account/account.functions";
import { allVerifiedTags } from "@/lib/social/format";
import { copyText } from "@/components/diggr/ProfileSlab";
import { Shell, SubHeader } from "@/components/diggr/Chrome";
import type { LookupResult } from "@/lib/social/types";

export const Route = createFileRoute("/_authenticated/lists/$id")({
  head: () => ({
    meta: [
      { title: "M4G1C M4NT4 // Saved list" },
      { name: "description", content: "A saved list of brand social footprints." },
      { property: "og:title", content: "M4G1C M4NT4 // Saved list" },
      { property: "og:description", content: "Saved brand social footprints." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ListPage,
});

function toCsv(results: LookupResult[]): string {
  const rows = [["domain", "platform", "handle", "url", "status"]];
  for (const r of results)
    for (const p of r.platforms) for (const e of p.entries) rows.push([r.domain, p.platformName, e.tag, e.url, p.status]);
  return rows.map((r) => r.map((c) => `"${c.replaceAll('"', '""')}"`).join(",")).join("\n");
}

function download(name: string, body: string, type: string) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([body], { type }));
  a.download = name;
  a.click();
  URL.revokeObjectURL(a.href);
}

const btn = "font-label-stamp text-label-stamp text-paper-distressed border-2 border-paper-distressed px-space-md py-space-xs uppercase";

function ListPage() {
  const { id } = Route.useParams();
  const fetchList = useServerFn(getList);
  const { data, error } = useQuery({ queryKey: ["list", id], queryFn: () => fetchList({ data: { id } }) });
  const results = data?.items.map((i) => i.result) ?? [];

  return (
    <Shell>
      <SubHeader badge="SAVED LIST" note="// EXPORT OR COPY //" right={<Link to="/account">← Console</Link>} />
      <section className="px-margin-mobile sm:px-margin py-space-xl gap-space-lg mx-auto flex max-w-5xl flex-col">
        {error && <p className="font-code-terminal text-hazard-orange">{error.message}</p>}
        {data && (
          <>
            <h1 className="font-headline text-headline-lg text-paper-distressed uppercase">{data.list.name}</h1>
            <div className="gap-space-sm flex flex-wrap">
              <button className={btn} onClick={() => copyText(results.map(allVerifiedTags).filter(Boolean).join("\n"), "verified handles")}>
                Copy all verified handles
              </button>
              <button className={btn} onClick={() => download(`${data.list.name}.csv`, toCsv(results), "text/csv")}>
                Export CSV
              </button>
              <button
                className={btn}
                onClick={() => download(`${data.list.name}.json`, JSON.stringify(results, null, 2), "application/json")}
              >
                Export JSON
              </button>
            </div>
            {data.items.length === 0 && (
              <p className="font-code-terminal text-on-surface-variant">Empty — add results from the radar or batch page.</p>
            )}
            {data.items.map((i) => (
              <div key={i.id} className="p-space-md border-3 border-outline-variant bg-slate-charcoal">
                <p className="font-code-terminal text-body-lg text-paper-distressed">{i.domain}</p>
                <p className="font-code-terminal text-body-sm text-on-surface-variant">
                  {i.result.platforms.map((p) => `${p.platformName}: ${p.entries.map((e) => e.tag).join(", ")}`).join(" // ") ||
                    "No profiles found"}
                </p>
              </div>
            ))}
          </>
        )}
      </section>
    </Shell>
  );
}
