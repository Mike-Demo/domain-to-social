import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { isAgentIdUser } from "@/lib/account/mfa";

/** `verified` = the session may call member server functions (authenticator check done, or AgentID). */
export function useAuth(): { user: User | null; ready: boolean; verified: boolean } {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);
  const [verified, setVerified] = useState(false);
  useEffect(() => {
    const refresh = async (u: User | null): Promise<void> => {
      setUser(u);
      if (!u) return setVerified(false);
      if (isAgentIdUser(u)) return setVerified(true);
      const { data } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
      setVerified(data?.currentLevel === "aal2");
    };
    const { data } = supabase.auth.onAuthStateChange((_e, session) => {
      void refresh(session?.user ?? null);
    });
    void supabase.auth.getSession().then(async ({ data: d }) => {
      await refresh(d.session?.user ?? null);
      setReady(true);
    });
    return () => data.subscription.unsubscribe();
  }, []);
  return { user, ready, verified };
}
