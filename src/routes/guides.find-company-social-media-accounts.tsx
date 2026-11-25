import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState, type FormEvent } from "react";
import { lookupSocials } from "@/lib/social/lookup.functions";
import { memberLookup } from "@/lib/account/account.functions";
import { useAuth } from "@/hooks/useAuth";
import { ProfileSlab } from "@/components/diggr/ProfileSlab";
import { Shell, SubHeader } from "@/components/diggr/Chrome";
import type { LookupResult } from "@/lib/social/types";

const URL_ = "https://magicmanta.com/guides/find-company-social-media-accounts";
const TITLE = "How to Find a Company's Social Media Accounts | M4G1C M4NT4";
const DESC =
  "A plain guide to finding a company's official social media accounts from its website, and how Verified results and link-back checks tell real accounts from fakes.";

const STEPS: ReadonlyArray<{ name: string; text: string }> = [
  { name: "Start from the official website", text: "Use the company's own domain, not a search result. The website is the one place the brand controls, so it is the best source of truth." },
  { name: "Check what the site declares", text: "Look at the footer, header and contact page for social icons, and at the page's structured data (the sameAs list search engines read). Accounts listed there are the brand's own." },
  { name: "Search for the rest", text: "Brands often run accounts they never link, such as support or regional profiles. Search each platform for the brand name and note the candidates." },
  { name: "Confirm the link back", text: "Open each candidate profile and check its bio or website field. A real brand account usually links back to the company's domain. If it doesn't, treat it as a lead, not a fact." },
  { name: "Copy the right handle", text: "Once confirmed, copy the handle in the format the platform uses for tagging, and note when you checked it — accounts change." },
];

export const Route = createFileRoute("/guides/find-company-social-media-accounts")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESC },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESC },
      { property: "og:type", content: "article" },
      { property: "og:url", content: URL_ },
      { name: "twitter:card", content: "summary" },
    ],
    links: [{ rel: "canonical", href: URL_ }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "HowTo",
          name: "How to find a company's social media accounts",
          url: URL_,
          step: STEPS.map((s, i) => ({ "@type": "HowToStep", position: i + 1, name: s.name, text: s.text })),
        }),
      },
    ],
  }),
  component: GuidePage,
});

const h2 = "font-headline text-headline-sm uppercase text-paper-distressed";
const body = "font-code-terminal text-body-md text-paper-distressed";
const link = "text-cyber-cyan underline";

function GuideScanner() {
  const [input, setInput] = useState("");
  const lookupFn = useServerFn(lookupSocials);
  const memberFn = useServerFn(memberLookup);
  const { verified: member } = useAuth();
  const lookup = useMutation<LookupResult, Error, string>({
    mutationFn: async (url) => {
      if (member) return memberFn({ data: { url } });
      const out = await lookupFn({ data: { url } });
      if ("error" in out) throw new Error(out.error);
      return out.result;
    },
  });
  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    const v = input.trim();
    if (v) lookup.mutate(v);
  };
  const result = lookup.data;
  const verified = result?.platforms.filter((p) => p.status === "verified") ?? [];
  const unverified = result?.platforms.filter((p) => p.status === "unverified") ?? [];

  return (
    <div className="gap-space-md flex flex-col">
      <form onSubmit={onSubmit} className="gap-space-sm flex flex-col sm:flex-row">
        <label htmlFor="guide-domain" className="sr-only">Company website</label>
        <input
          id="guide-domain"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="example.com"
          className="font-code-terminal text-code-terminal bg-surface-low text-paper-distressed border-2 border-outline-variant px-4 py-3 flex-1"
        />
        <button
          type="submit"
          disabled={lookup.isPending}
          className="font-label-stamp text-label-stamp bg-cyber-cyan text-grit-black px-4 py-3 uppercase shadow-stamp"
        >
          {lookup.isPending ? "Scanning…" : "Find accounts"}
        </button>
      </form>
      {lookup.error && <p className="font-code-terminal text-code-terminal text-hazard-orange">! {lookup.error.message}</p>}
      {result && (
        <div className="gap-space-md flex flex-col">
          <h3 className={h2}>Verified on {result.domain} ({verified.length})</h3>
          {verified.length ? (
            <div className="gap-space-md grid md:grid-cols-2">
              {verified.map((r) => <ProfileSlab key={r.platformId} result={r} />)}
            </div>
          ) : (
            <p className={body}>No profiles are linked directly from this site.</p>
          )}
          {unverified.length > 0 && (
            <>
              <h3 className={h2}>Unverified, found by search ({unverified.length})</h3>
              <div className="gap-space-md grid md:grid-cols-2">
                {unverified.map((r) => <ProfileSlab key={r.platformId} result={r} />)}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function GuidePage() {
  return (
    <Shell>
      <SubHeader badge="GUIDE" note="// FIND A COMPANY'S SOCIALS //" />
      <article className="px-margin-mobile sm:px-margin py-space-xl gap-space-lg mx-auto flex max-w-3xl flex-col">
        <h1 className="font-headline text-headline-md uppercase text-paper-distressed">How to find a company's social media accounts</h1>
        <p className={body}>
          The fastest reliable way to find a company's social media accounts is to start from its official website, collect
          the accounts it links to, and then confirm any other account you find by checking that it links back to that
          website. You can do it by hand with the steps below, or paste the website into the scanner.
        </p>

        <section className="gap-space-sm flex flex-col">
          <h2 className={h2}>Try it now</h2>
          <GuideScanner />
        </section>

        <section className="gap-space-sm flex flex-col">
          <h2 className={h2}>Step by step</h2>
          <ol className="gap-space-sm flex flex-col">
            {STEPS.map((s, i) => (
              <li key={s.name} className={body}>
                <strong>{i + 1}. {s.name}.</strong> {s.text}
              </li>
            ))}
          </ol>
        </section>

        <section className="gap-space-sm flex flex-col">
          <h2 className={h2}>Verified vs Unverified results</h2>
          <p className={body}>
            <strong>Verified</strong> means the company's own website declares the account, either through links on its pages
            or in its structured data. Because only the brand controls its website, these are the accounts you can tag with
            confidence.
          </p>
          <p className={body}>
            <strong>Unverified</strong> means the account was found by searching, not on the website. It might be real — for
            example a support or regional account — but nothing on the official site confirms it yet. Treat it as a lead and
            check it before tagging.
          </p>
          <p className={body}>
            If two official sources disagree, for example the footer and the structured data list different handles, the
            scanner shows both and flags the conflict instead of guessing.
          </p>
        </section>

        <section className="gap-space-sm flex flex-col">
          <h2 className={h2}>What a link-back check is</h2>
          <p className={body}>
            A link-back check opens a candidate profile and looks for the company's domain in its bio or website field. A real
            brand account usually points back to its own site; an impostor or fan account usually doesn't. A profile that links
            back is far more likely to be genuine, but it still stays Unverified, because only the website itself can make an
            account official.
          </p>
        </section>

        <p className={body}>
          Need many companies at once? Use the <Link to="/batch" className={link}>batch page</Link>. Plans are on the{" "}
          <Link to="/pricing" className={link}>pricing page</Link>, or go back to the{" "}
          <Link to="/" className={link}>Radar Scanner</Link>.
        </p>
      </article>
    </Shell>
  );
}
