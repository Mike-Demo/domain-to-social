import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { useAuth } from "@/hooks/useAuth";
import { WebAwesomeLoader } from "@/design-system/font-awsome-web-awesome-171158/webawesome/setup";
import LOGO_SRC from "@/assets/favicon-src.png";

export const NAV_ITEMS = [
  { to: "/", label: "Radar Scanner", short: "Radar" },
  { to: "/batch", label: "Batch Sniffer", short: "Batch" },
  { to: "/adapters", label: "Awesome Framework", short: "Adapters" },
  { to: "/source", label: "Source", short: "Source" },
  { to: "/dossier", label: "Dossier Export", short: "Dossier" },
  { to: "/pricing", label: "Pricing", short: "Pricing" },
] as const;

export function Stamp({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={`font-label-stamp text-label-stamp inline-block px-2 py-1 uppercase shadow-stamp-sm ${className}`}
    >
      {children}
    </span>
  );
}

export function Ticker() {
  return (
    <div className="bg-primary-container text-on-primary-container px-space-md flex w-full items-center justify-between overflow-hidden border-b border-grit-black py-0.5">
      <div className="gap-space-sm font-code-terminal text-code-terminal flex items-center uppercase">
        <span className="bg-grit-black text-primary-container px-1 py-0.5 font-bold tracking-widest">
          LIVE STREAM
        </span>
        <span className="animate-pulse" aria-hidden="true">●</span>
        <span className="truncate">TARGET // SNIFFING FOOTPRINTS ON 1,482 CORPS</span>
        <span className="hidden opacity-50 sm:inline">|</span>
        <span className="hidden sm:inline">NODE_09: ACTIVE</span>
        <span className="hidden opacity-50 sm:inline">|</span>
        <span className="hidden sm:inline">LATENCY: 12ms</span>
      </div>
      <div className="gap-space-md font-label-stamp text-label-stamp hidden items-center tracking-widest uppercase md:flex">
        <span>ZERO SILOS TOLERATED</span>
        <span className="bg-bg-deep text-on-surface px-1.5 py-0.5">v2.4.99-PUNK</span>
      </div>
    </div>
  );
}

export function Header() {
  return (
    <header className="fixed top-0 z-50 w-full border-b-3 border-primary-container bg-grit-black">
      <Ticker />
      <div className="px-space-lg flex h-20 w-full items-center justify-between">
        <div className="gap-space-md flex items-center">
          <img alt="M4G1C M4NT4 logo" className="h-11 w-11 shrink-0 object-contain" src={LOGO_SRC} />
          <Link
            to="/"
            className="gap-space-xs text-on-surface hover:text-primary-container flex items-baseline transition-colors"
          >
            <span className="font-headline text-headline-md tracking-tighter uppercase">M4G1C M4NT4</span>
            <span className="font-code-terminal text-code-terminal text-primary-container hidden tracking-widest 2xl:inline">
              // SOCIAL RADAR
            </span>
          </Link>
        </div>

        <nav className="gap-space-xs hidden items-center xl:flex">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className="font-label-stamp text-label-stamp px-space-sm text-on-surface-variant hover:text-on-surface py-1.5 uppercase transition-all"
              activeOptions={{ exact: item.to === "/" }}
              activeProps={{
                className:
                  "bg-primary-container text-on-primary-container font-bold shadow-stamp-xs",
              }}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="gap-space-md flex items-center">
          <div className="px-space-sm gap-space-sm hidden items-center border-2 border-outline-variant bg-surface-lowest py-1 shadow-stamp-xs sm:flex">
            <span className="font-code-terminal text-code-terminal text-primary-container">CMD://</span>
            <span className="font-code-terminal text-code-terminal text-on-surface-variant">QUICK_SNIFF</span>
            <kbd className="font-code-terminal bg-surface-highest text-on-surface px-1 py-0.5 text-micro">⌘K</kbd>
          </div>
          <AccountChip />
        </div>
      </div>
    </header>
  );
}

function AccountChip() {
  const { user, ready } = useAuth();
  const signedIn = ready && user;
  return (
    <Link
      to={signedIn ? "/account" : "/auth"}
      className="gap-space-sm px-space-sm py-space-xs min-h-11 flex items-center border-2 border-primary-container bg-surface-high shadow-stamp-sm"
    >
      <span aria-hidden className="material-symbols-outlined text-primary-container">
        {signedIn ? "badge" : "login"}
      </span>
      <span className="font-label-stamp text-label-stamp text-on-surface hidden leading-none uppercase sm:inline">
        {signedIn ? "Console" : "Sign in"}
      </span>
    </Link>
  );
}

export function MobileNav() {
  return (
    <nav className="fixed bottom-0 left-0 z-50 flex w-full items-stretch border-t-3 border-primary-container bg-grit-black xl:hidden">
      {NAV_ITEMS.slice(0, 4).map((item) => (
        <Link
          key={item.to}
          to={item.to}
          activeOptions={{ exact: item.to === "/" }}
          className="font-label-stamp text-label-stamp text-on-surface-variant flex min-h-11 flex-1 flex-col items-center gap-1 py-2 uppercase"
          activeProps={{ className: "text-primary-container" }}
        >
          <span aria-hidden className="material-symbols-outlined text-headline-sm">
            {item.to === "/"
              ? "radar"
              : item.to === "/batch"
                ? "terminal"
                : item.to === "/adapters"
                  ? "hub"
                  : item.to === "/source"
                    ? "source"
                    : "military_tech"}
          </span>
          {item.short}
        </Link>
      ))}
    </nav>
  );
}

export function Shell({ children }: { children: ReactNode }) {
  return (
    <div className="diggr min-h-dvh selection:bg-primary-container selection:text-on-primary-container">
      <WebAwesomeLoader />
      <Header />
      <main className="min-h-dvh w-full pt-28 pb-20 xl:pb-0">{children}</main>
      <MobileNav />
    </div>
  );
}

export function SubHeader({
  badge,
  badgeClass = "bg-electric-magenta text-paper-distressed",
  note,
  right,
}: {
  badge: string;
  badgeClass?: string;
  note: string;
  right?: ReactNode;
}) {
  return (
    <div className="px-margin-mobile sm:px-margin py-space-sm gap-space-sm flex w-full flex-wrap items-center justify-between border-b-2 border-primary-container bg-grit-black">
      <div className="gap-space-sm flex items-center">
        <span
          className={`font-label-stamp text-label-stamp inline-block -rotate-1 px-2 py-0.5 uppercase shadow-stamp-xs ${badgeClass}`}
        >
          {badge}
        </span>
        <span className="font-code-terminal text-code-terminal text-on-surface-variant">{note}</span>
      </div>
      <div className="gap-space-md font-code-terminal text-code-terminal text-primary-container flex items-center">
        {right}
      </div>
    </div>
  );
}
