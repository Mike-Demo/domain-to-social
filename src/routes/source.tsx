import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { WaIcon } from "@/design-system/font-awsome-web-awesome-171158/webawesome/react/icon";
import { Shell, SubHeader } from "@/components/diggr/Chrome";
import { getSourceStats, type SourceStats } from "@/lib/social/source.functions";

export const Route = createFileRoute("/source")({
  head: () => ({
    meta: [
      { title: "M4G1C M4NT4 // Source — live recon activity" },
      {
        name: "description",
        content:
          "The M4G1C M4NT4 source board: live stats from real lookups — the most-researched targets and the latest intel decrypted.",
      },
      { property: "og:title", content: "M4G1C M4NT4 // Source" },
      { property: "og:description", content: "Live stats from real lookups: most-researched targets and latest intel." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SourceBoard,
});

const SOCIAL_LINKS = [
  { label: "Open source page", href: "/licenses", icon: "github", text: "Open Source" },
  { label: "Fair use policy", href: "/fair-use", icon: "scale-balanced", text: "Fair Use" },
  { label: "Support", href: "/support", icon: "life-ring", text: "Support" },
  { label: "MikeDemo on LinkedIn", href: "https://www.linkedin.com/in/mikedemopoulos", icon: "linkedin", text: "LinkedIn" },
  { label: "MikeDemo on X", href: "https://x.com/mike_demo", icon: "x-twitter", text: "X" },
  {
    label: "@demo on tweet.app",
    href: "https://app.tweet.app/post/92206629-1525-4a74-8f51-39e226fc9e75",
    icon: "twitter",
    text: "tweet.app",
  },
  { label: "MikeDemo on Threads", href: "https://www.threads.com/@mdemop", icon: "threads", text: "Threads" },
] as const;

function SourceBoard() {
  const [stats, setStats] = useState<SourceStats | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getSourceStats()
      .then((s) => {
        if (!cancelled) setStats(s);
      })
      .catch((e: unknown) => {
        if (!cancelled) setError(e instanceof Error ? e.message : "Could not load stats.");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <Shell>
      <SubHeader
        badge="SOURCE"
        badgeClass="bg-primary-container text-on-primary-container"
        note="// LIVE RECON ACTIVITY //"
        right={<span>[ANONYMIZED // REAL-TIME]</span>}
      />
      <section className="px-margin-mobile sm:px-margin py-space-xl gap-space-xl mx-auto flex max-w-7xl flex-col">
        <h1 className="font-display-hero text-display-hero-mobile lg:text-display-hero text-paper-distressed leading-none uppercase">
          <span className="text-on-primary-container px-space-xs inline-block -rotate-2 bg-acid-lime shadow-stamp-magenta">
            SOURCE
          </span>{" "}
          <span className="text-headline-lg align-middle">— Live Recon Activity</span>
        </h1>

        {error && (
          <p className="font-code-terminal text-code-terminal text-hazard-orange" role="alert">
            &gt; {error}
          </p>
        )}
        {!stats && !error && (
          <p className="font-code-terminal text-code-terminal text-acid-lime" role="status">
            &gt; Pulling live stats…
          </p>
        )}

        {stats && (
          <>
            <div className="gap-space-lg grid sm:grid-cols-2">
              <div className="p-space-md border-3 border-primary-container bg-surface-low shadow-stamp-lg">
                <p className="font-label-stamp text-label-stamp text-primary-container uppercase">LOOKUPS RUN</p>
                <p className="font-display-hero text-display-hero-mobile text-acid-lime">{stats.totalLookups}</p>
              </div>
              <div className="p-space-md border-3 border-primary-container bg-surface-low shadow-stamp-lg">
                <p className="font-label-stamp text-label-stamp text-primary-container uppercase">TARGETS DECRYPTED</p>
                <p className="font-display-hero text-display-hero-mobile text-acid-lime">{stats.distinctDomains}</p>
              </div>
            </div>

            <p className="font-code-terminal text-code-terminal text-on-surface-variant">
              &gt; Per-target details are private — only aggregate counts are shown.
            </p>
          </>
        )}

        <footer className="p-space-md gap-space-md flex flex-col border-3 border-outline-variant bg-surface-low shadow-stamp-md">
          <div className="gap-space-sm flex flex-wrap items-center justify-between">
            <span className="font-label-stamp text-label-stamp text-primary-container uppercase">
              CREDITS // SIGNAL LINKS
            </span>
            <span className="font-code-terminal text-body-sm text-on-surface-variant">
              Made by MikeDemo · © {new Date().getFullYear()}
            </span>
          </div>
          <nav aria-label="Social links" className="gap-space-md flex flex-wrap items-center">
            {SOCIAL_LINKS.map((link) => {
              const isExternal = /^https?:\/\//.test(link.href);
              return (
                <a
                  key={link.href}
                  href={link.href}
                  target={isExternal ? "_blank" : undefined}
                  rel={isExternal ? "noopener noreferrer" : undefined}
                  aria-label={isExternal ? `${link.label} (opens in new tab)` : link.label}
                  className="gap-space-xs font-code-terminal text-body-sm text-paper-distressed hover:text-acid-lime flex items-center"
                >
                  <WaIcon family={link.icon === "scale-balanced" || link.icon === "life-ring" ? "classic" : "brands"} name={link.icon} aria-hidden="true" />
                  {link.text}
                </a>
              );
            })}
          </nav>
        </footer>
      </section>
    </Shell>
  );
}
