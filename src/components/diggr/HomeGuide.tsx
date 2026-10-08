import { Link } from "@tanstack/react-router";

export const PLAIN_INTRO =
  "M4G1C M4NT4 finds and verifies a company's social media profiles from its website URL — enter a domain and it sweeps X, Threads, Instagram, LinkedIn, Bluesky, GitHub and more, showing the evidence behind every handle.";

export const FAQS: ReadonlyArray<{ q: string; a: string }> = [
  {
    q: "What does M4G1C M4NT4 do?",
    a: "Enter a brand's domain and it finds the company's social media profiles across X, Threads, Instagram, LinkedIn, Bluesky, GitHub and more.",
  },
  {
    q: "How does the Verified badge work?",
    a: "Profiles declared through JSON-LD/Schema.org sameAs or official-site DOM links get a Verified badge with the evidence source shown. Search fallback candidates stay Unverified — the app checks whether they link back to the official domain.",
  },
  {
    q: "Do I need an account?",
    a: "No for single lookups. You need one for saved lookups, lists, paid plans, and the MCP server. Sign in with Google, Apple, Microsoft, AgentID, or email and password.",
  },
  {
    q: "Is there an API or MCP server?",
    a: "Yes: an auth-gated MCP server at /mcp (sign in first; 100 lookups per account per day). There is no public REST API yet, and the React SDK is coming soon.",
  },
  {
    q: "How much does it cost?",
    a: "Single lookups are free. Operative is $5 one-time (account, lookup history, saved lists, CSV/JSON export, bulk 5 domains per run). Deep Recon is $10/month. See /pricing for the full plans.",
  },
  {
    q: "How fresh is the data?",
    a: 'Each result shows "last checked", conflicts between official sources are flagged, and every handle carries its evidence chain.',
  },
];

export const HOWTO_STEPS: ReadonlyArray<{ name: string; text: string }> = [
  { name: "Enter a domain", text: "Enter a brand's domain on the homepage." },
  { name: "Review the evidence", text: "Review the found profiles and their evidence sources." },
  { name: "Copy the handles", text: "Copy individual handles or the whole set." },
];

const card = "p-space-md border-3 border-outline-variant bg-surface-low shadow-stamp-md";
const h2 = "font-headline text-headline-md text-paper-distressed uppercase";
const h3 = "font-label-stamp text-label-stamp text-primary-container uppercase";
const body = "font-body-md text-body-md text-on-surface-variant mt-2";
const link = "text-primary-container underline";

export function HomeGuide() {
  return (
    <section className="px-margin-mobile sm:px-margin py-space-xl bg-bg-deep">
      <div className="gap-space-xl mx-auto flex max-w-7xl flex-col">
        <div className="gap-space-md flex flex-col">
          <h2 className={h2}>Radar Scanner</h2>
          <ol className="gap-space-md grid md:grid-cols-3">
            {HOWTO_STEPS.map((s, i) => (
              <li key={s.name} className={card}>
                <h3 className={h3}>
                  {i + 1}. {s.name}
                </h3>
                <p className={body}>{s.text}</p>
              </li>
            ))}
          </ol>
        </div>

        <div className="gap-space-md grid md:grid-cols-3">
          <div className={card}>
            <h2 className={h2}>Batch lookups</h2>
            <p className={body}>
              Sweep several domains in one run on the <Link to="/batch" className={link}>batch page</Link>. Operative
              runs 5 per batch, Deep Recon 25.
            </p>
          </div>
          <div className={card}>
            <h2 className={h2}>Framework adapters</h2>
            <p className={body}>
              Point an assistant at the MCP server after signing in. REST and the React SDK are coming soon.{" "}
              <Link to="/adapters" className={link}>See adapters</Link> or the{" "}
              <a href="/auth.md" className={link}>agent auth docs</a>.
            </p>
          </div>
          <div className={card}>
            <h2 className={h2}>Plans</h2>
            <p className={body}>
              Single lookups are free. Operative $5 once, Deep Recon $10/mo, Brand Command $20/mo.{" "}
              <Link to="/pricing" className={link}>Compare plans</Link>.
            </p>
          </div>
        </div>

        <div className="gap-space-md flex flex-col">
          <h2 className={h2}>FAQ</h2>
          <div className="gap-space-md grid md:grid-cols-2">
            {FAQS.map((f) => (
              <div key={f.q} className={card}>
                <h3 className={h3}>{f.q}</h3>
                <p className={body}>{f.a}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
