import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { isAgentIdUser } from "@/lib/account/mfa";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async ({ location }) => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });
    // AgentID sign-ins are exempt; every other account must finish the authenticator-app check first.
    if (!isAgentIdUser(data.user)) {
      const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
      if (aal?.currentLevel !== "aal2") throw redirect({ to: "/mfa", search: { next: location.href } });
    }
    return { user: data.user };
  },
  component: () => <Outlet />,
});
