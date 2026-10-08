import { createFileRoute } from "@tanstack/react-router";
import { Shell, SubHeader } from "@/components/diggr/Chrome";
import { SUPPORT_EMAIL } from "@/lib/agent/docs";

const TITLE = "Privacy at M4G1C M4NT4 — what we store and why";
const DESC = "What data M4G1C M4NT4 stores for lookups, accounts, payments and support, and how to delete it.";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESC },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESC },
      { property: "og:type", content: "article" },
      { property: "og:url", content: "https://magicmanta.com/privacy" },
      { name: "twitter:card", content: "summary" },
    ],
    links: [{ rel: "canonical", href: "https://magicmanta.com/privacy" }],
  }),
  component: Privacy,
});

function Privacy() {
  return (
    <Shell>
      <SubHeader badge="PRIVACY" note="// WHAT THE MANTA KEEPS //" />
      <article className="px-margin-mobile sm:px-margin py-space-xl gap-space-md mx-auto flex max-w-md flex-col font-code-terminal text-body-md text-paper-distressed">
        <h1 className="font-headline text-headline-md uppercase">Privacy</h1>
        <p>
          M4G1C M4NT4 looks up public information about companies: their websites and public social media profiles. We
          keep as little about you as we can to run the service.
        </p>
        <h2 className="font-headline text-headline-sm uppercase">Without an account</h2>
        <p>
          Free lookups are not saved to any account. We use your network address briefly to apply rate limits. Share
          links carry the result inside the link itself, so we do not store them.
        </p>
        <h2 className="font-headline text-headline-sm uppercase">With an account</h2>
        <ul className="gap-space-xs flex list-disc flex-col pl-space-md">
          <li>Your email address and sign-in method (Google, Apple, Microsoft, AgentID, or email and password).</li>
          <li>Your two-factor setup. Backup codes are stored only in scrambled (hashed) form.</li>
          <li>Your saved lookups and lists, visible only to you.</li>
          <li>A usage log of paid checks and assistant lookups, used to apply plan limits.</li>
          <li>Your plan status. Card payments are handled by our payment provider; we never see your full card number.</li>
        </ul>
        <h2 className="font-headline text-headline-sm uppercase">Support emails</h2>
        <p>Support tickets are sent by email and are not stored on the site.</p>
        <h2 className="font-headline text-headline-sm uppercase">Deleting your data</h2>
        <p>
          You can delete your account from your account page, which removes your saved lookups and lists. For anything
          else, email <a href={`mailto:${SUPPORT_EMAIL}`} className="text-cyber-cyan underline">{SUPPORT_EMAIL}</a>.
        </p>
      </article>
    </Shell>
  );
}
