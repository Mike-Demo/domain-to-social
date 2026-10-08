import { createFileRoute } from "@tanstack/react-router";
import { Shell, SubHeader } from "@/components/diggr/Chrome";

const TITLE = "About M4G1C M4NT4 — brand social profile finder";
const DESC = "What M4G1C M4NT4 is, who built it, and how it verifies a brand's social media profiles from its website.";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESC },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESC },
      { property: "og:type", content: "article" },
      { property: "og:url", content: "https://magicmanta.com/about" },
      { name: "twitter:card", content: "summary" },
    ],
    links: [{ rel: "canonical", href: "https://magicmanta.com/about" }],
  }),
  component: About,
});

function About() {
  return (
    <Shell>
      <SubHeader badge="ABOUT" note="// WHO RUNS THE MANTA //" />
      <article className="px-margin-mobile sm:px-margin py-space-xl gap-space-md mx-auto flex max-w-md flex-col font-code-terminal text-body-md text-paper-distressed">
        <h1 className="font-headline text-headline-md uppercase">About M4G1C M4NT4</h1>
        <p>
          M4G1C M4NT4 finds and verifies a company's social media profiles from its website URL. Enter a domain and it
          sweeps X, Threads, Instagram, LinkedIn, Bluesky, GitHub and more, showing the evidence behind every handle so
          you can tag the right account with confidence.
        </p>
        <h2 className="font-headline text-headline-sm uppercase">How we decide what is real</h2>
        <p>
          A profile is marked Verified only when the brand's own website declares it, through structured data or links
          on the official pages. Profiles found through search stay Unverified unless they link back to the brand's
          domain. When two official sources disagree, we show both and flag the conflict instead of picking one. Every
          result carries the time it was last checked.
        </p>
        <h2 className="font-headline text-headline-sm uppercase">Who built it</h2>
        <p>
          M4G1C M4NT4 is built by <a href="https://mikedemo.com" className="text-cyber-cyan underline">MikeDemo</a>.
          Single lookups are free without an account; saved history, lists, bulk runs and assistant access come with an
          account and the plans on the <a href="/pricing" className="text-cyber-cyan underline">pricing page</a>.
        </p>
        <p>
          Questions or feedback: <a href="/contact" className="text-cyber-cyan underline">contact us</a>.
        </p>
      </article>
    </Shell>
  );
}
