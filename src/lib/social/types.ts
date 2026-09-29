import type { PlatformId } from "./platforms";

export type ReciprocalStatus = "links_back" | "no_link_found" | "unreachable";

export interface ProfileEntry {
  handle: string;
  tag: string;
  url: string;
  verified: boolean;
  /** Human-readable evidence lines, e.g. "Found in JSON-LD sameAs". */
  evidence: string[];
  sources: ("jsonld" | "site" | "search")[];
  reciprocal?: ReciprocalStatus;
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
}

export interface DomainCandidate {
  domain: string;
  url: string;
  title: string;
  snippet: string;
}
