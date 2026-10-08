import { createFileRoute } from "@tanstack/react-router";
import { Shell, SubHeader } from "@/components/diggr/Chrome";
import { ENRICHED_LOOKUPS_PER_MONTH, BROWSER_RUNS_PER_DAY } from "@/lib/account/entitlements";

const TITLE = "M4G1C M4NT4 // Fair use policy";
const DESC = "Usage limits that keep M4G1C M4NT4 fast, free to try, and affordable for everyone.";

export const Route = createFileRoute("/fair-use")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESC },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESC },
      { property: "og:type", content: "article" },
      { property: "og:url", content: "https://magicmanta.com/fair-use" },
      { name: "twitter:card", content: "summary" },
    ],
    links: [{ rel: "canonical", href: "https://magicmanta.com/fair-use" }],
  }),
  component: FairUse,
});

const LIMITS: ReadonlyArray<readonly [string, string]> = [
  ["Free lookups (no account)", "10 lookups and 20 brand searches per minute from one network"],
  ["Signed-in lookups", "30 sites per minute per account, including batches"],
  ["Batch size", "5 sites per run on Operative, 25 on Deep Recon and Brand Command"],
  ["Deep page renders", `${ENRICHED_LOOKUPS_PER_MONTH.deep_recon} lookups per 30 days on Deep Recon, ${ENRICHED_LOOKUPS_PER_MONTH.brand_command} on Brand Command`],
  ["Live browser checks", `${BROWSER_RUNS_PER_DAY} per day on Brand Command`],
];

function FairUse() {
  return (
    <Shell>
      <SubHeader badge="FAIR USE" note="// KEEP THE MANTA FED, NOT FLOODED //" />
      <article className="px-margin-mobile sm:px-margin py-space-xl gap-space-md mx-auto flex max-w-md flex-col font-code-terminal text-body-md text-paper-distressed">
        <h1 className="font-headline text-headline-md uppercase">Fair use policy</h1>
        <p>
          M4G1C M4NT4 is built for people finding and tagging brand accounts. Some checks cost us real money per page, so
          these limits keep it fair for everyone. When you reach a limit, lookups keep working with the standard check
          instead of failing.
        </p>
        <h2 className="font-headline text-headline-sm uppercase">Limits</h2>
        <dl className="gap-space-sm flex flex-col">
          {LIMITS.map(([k, v]) => (
            <div key={k} className="p-space-sm border-2 border-outline-variant">
              <dt className="font-label-stamp text-label-stamp text-primary-container uppercase">{k}</dt>
              <dd>{v}</dd>
            </div>
          ))}
        </dl>
        <h2 className="font-headline text-headline-sm uppercase">Not allowed</h2>
        <ul className="gap-space-xs flex list-disc flex-col pl-space-md">
          <li>Scraping or scripting the free lookup page, or using it as a general web-fetching service.</li>
          <li>Reselling results or access, or sharing one account between several people or companies.</li>
          <li>Looking up private, internal, or non-public addresses.</li>
          <li>Getting around limits with many accounts or networks.</li>
        </ul>
        <h2 className="font-headline text-headline-sm uppercase">Account security</h2>
        <p>Every account must use an authenticator app for two-factor sign-in. Assistants you connect act as you and follow the same limits.</p>
        <p>We may slow down, pause, or close accounts that break these rules. Need more? Get in touch before you hit the wall.</p>
      </article>
    </Shell>
  );
}
