import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

/**
 * Returns true if the current user has the `admin` or `moderator` role
 * in `public.user_roles`. Resolves to false for anonymous users.
 */
export function useIsAdmin() {
  const { user, loading: authLoading } = useAuth();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);

  useEffect(() => {
    if (authLoading) return;
    let cancelled = false;
    if (!user) {
      setIsAdmin(false);
      return;
    }
    supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .in("role", ["admin", "moderator"])
      .then(({ data }) => {
        if (cancelled) return;
        setIsAdmin((data?.length ?? 0) > 0);
      });
    return () => {
      cancelled = true;
    };
  }, [user, authLoading]);

  return { isAdmin: isAdmin === true, loading: authLoading || isAdmin === null };
}
