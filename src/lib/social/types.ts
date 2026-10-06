import type { PlatformId } from "./platforms";

export type ReciprocalStatus = "links_back" | "no_link_found" | "unreachable";

/** Computed from independent signals (never a percentage). */
export type SignalRating = "strong" | "moderate" | "weak";

export interface ProfileEntry {
  handle: string;
  tag: string;
  url: string;
  verified: boolean;
  /** Human-readable evidence lines, e.g. "Found in JSON-LD sameAs". */
  evidence: string[];
  sources: ("jsonld" | "site" | "search" | "probe")[];
  reciprocal?: ReciprocalStatus;
  rating?: SignalRating;
  /** Short names of the signals that produced the rating. */
  signals?: string[];
  checkedAt: string;
}

export interface PlatformResult {
  platformId: PlatformId;
  platformName: string;
  status: "verified" | "unverified";
  conflict: boolean;
  entries: ProfileEntry[];
  checkedAt: string;
}

export interface LookupResult {
  input: string;
  domain: string;
  finalUrl: string;
  brandName: string;
  checkedAt: string;
  platforms: PlatformResult[];
  notFound: string[];
  /** True when the site refused our automated visit, so only search/probe results were possible. */
  blocked?: boolean;
  /** Deep Recon: set when Firecrawl rendered the site (bot-wall bypass / JS links / brand data). */
  enrichment?: {
    via: "firecrawl";
    used: boolean;
    reason: string;
    logo?: string | undefined;
    description?: string | undefined;
    colors?: string[] | undefined;
    fonts?: string[] | undefined;
  };
}

export interface DomainCandidate {
  domain: string;
  url: string;
  title: string;
  snippet: string;
}
