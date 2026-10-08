import { createFileRoute } from "@tanstack/react-router";
import { Shell, SubHeader } from "@/components/diggr/Chrome";
import { SUPPORT_EMAIL } from "@/lib/agent/docs";

const TITLE = "Contact M4G1C M4NT4 — support and questions";
const DESC = "How to reach M4G1C M4NT4 support by email or through the signed-in support form.";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESC },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESC },
      { property: "og:type", content: "article" },
      { property: "og:url", content: "https://magicmanta.com/contact" },
      { name: "twitter:card", content: "summary" },
    ],
    links: [{ rel: "canonical", href: "https://magicmanta.com/contact" }],
  }),
  component: Contact,
});

function Contact() {
  return (
    <Shell>
      <SubHeader badge="CONTACT" note="// SIGNAL THE MANTA //" />
      <article className="px-margin-mobile sm:px-margin py-space-xl gap-space-md mx-auto flex max-w-md flex-col font-code-terminal text-body-md text-paper-distressed">
        <h1 className="font-headline text-headline-md uppercase">Contact M4G1C M4NT4</h1>
        <p>
          The fastest way to reach us is email. Write to{" "}
          <a href={`mailto:${SUPPORT_EMAIL}`} className="text-cyber-cyan underline">{SUPPORT_EMAIL}</a> with the domain
          you looked up, what you expected to see, and what you got. Screenshots or a share link help us reproduce the
          result quickly.
        </p>
        <h2 className="font-headline text-headline-sm uppercase">Signed-in support form</h2>
        <p>
          If you have an account, the <a href="/support" className="text-cyber-cyan underline">support form</a> sends a
          ticket straight to the team and emails you a receipt. It is available once you are signed in with two-factor
          sign-in complete, so we can match the ticket to your plan and lookup history.
        </p>
        <h2 className="font-headline text-headline-sm uppercase">What we can help with</h2>
        <ul className="gap-space-xs flex list-disc flex-col pl-space-md">
          <li>A profile that is missing, wrong, or marked with the wrong evidence.</li>
          <li>Billing, plan changes, refunds, and account deletion.</li>
          <li>Connecting an assistant through the MCP server.</li>
          <li>Questions about the <a href="/fair-use" className="text-cyber-cyan underline">fair use limits</a>.</li>
        </ul>
      </article>
    </Shell>
  );
}
