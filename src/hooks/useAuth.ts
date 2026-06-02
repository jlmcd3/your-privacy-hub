import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User, Session } from "@supabase/supabase-js";
import { useClientStore } from "@/stores/clientStore";
import { useRopaStore } from "@/stores/ropaStore";

function clearScopedSessionState(nextUserId: string | null) {
  const activeClient = useClientStore.getState().activeClient;
  if (!nextUserId || (activeClient && activeClient.owner_id !== nextUserId)) {
    useClientStore.getState().clearClients();
    useRopaStore.getState().clearSession();
  }
}

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        clearScopedSessionState(session?.user?.id ?? null);
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      clearScopedSessionState(session?.user?.id ?? null);
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  return { user, session, loading };
};
