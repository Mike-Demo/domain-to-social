/** Public support inbox. Shown to signed-out visitors and receives every ticket. */
export const SUPPORT_EMAIL = "support-magicmanta@agentmail.to";

export const SUPPORT_CATEGORIES = ["Bug report", "Billing or plan", "Feature request", "General help"] as const;
export type SupportCategory = (typeof SUPPORT_CATEGORIES)[number];

export const SUPPORT_TICKETS_PER_HOUR = 5;
