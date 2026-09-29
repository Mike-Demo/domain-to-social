import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { lookupDomain, searchBrandDomains } from "./lookup.server";

// Free tier: single lookups. Bulk / MCP entry points can reuse lookupDomain behind auth.
export const lookupSocials = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => z.object({ url: z.string().trim().min(3).max(500) }).parse(data))
  .handler(async ({ data }) => lookupDomain(data.url));

export const searchBrand = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => z.object({ query: z.string().trim().min(2).max(120) }).parse(data))
  .handler(async ({ data }) => searchBrandDomains(data.query));
