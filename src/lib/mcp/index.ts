import { auth, defineMcp } from "@lovable.dev/mcp-js";
import lookupSocials from "./tools/lookup-socials";
import listLookups from "./tools/list-lookups";
import listLists from "./tools/list-lists";

// Issuer must be the direct backend host; the project ref is inlined at build time.
const projectRef = import.meta.env["VITE_SUPABASE_PROJECT_ID"] ?? "project-ref-unset";

export default defineMcp({
  name: "brand-connector-pro",
  title: "Brand Connector Pro",
  version: "0.1.0",
  instructions:
    "Find a company's social media profiles from its website. Use `lookup_socials` with a domain; verified results come from the site itself, unverified ones from search. `list_my_lookups` and `list_my_lists` read the signed-in user's saved work.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [lookupSocials, listLookups, listLists],
});
