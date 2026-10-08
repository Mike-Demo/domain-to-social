import { createMiddleware } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { hasSecondFactor, isAgentIdSession } from "./mfa";

/** Signed-in AND verified with an authenticator app this session; rejects password-only/social-only sessions. AgentID sign-ins are exempt. */
export const requireMfaAuth = createMiddleware({ type: "function" })
  .middleware([requireSupabaseAuth])
  .server(async ({ next, context }) => {
    if (!hasSecondFactor(context.claims) && !isAgentIdSession(context.claims))
      throw new Error("Two-factor verification required. Open /mfa to finish signing in.");
    return next();
  });
