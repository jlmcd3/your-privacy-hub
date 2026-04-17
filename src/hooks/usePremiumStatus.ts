import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

/**
 * Single source of truth for whether the current viewer is a Premium subscriber.
 * Returns { isPremium, isLoading, user }.
 *
 * - Logged-out users: isPremium = false, isLoading = false
 * - Logged-in users: fetches profiles.is_premium / is_pro
 */
export function usePremiumStatus() {
  const { user, loading: authLoading } = useAuth();
  const [isPremium, setIsPremium] = useState<boolean | null>(null);

  useEffect(() => {
    if (authLoading) return;
    let cancelled = false;
    if (!user) {
      setIsPremium(false);
      return;
    }
    supabase
      .from("profiles")
      .select("is_premium, is_pro")
      .eq("id", user.id)
      .single()
      .then(({ data }) => {
        if (cancelled) return;
        setIsPremium(data?.is_premium === true || data?.is_pro === true);
      });
    return () => {
      cancelled = true;
    };
  }, [user, authLoading]);

  return {
    user,
    isPremium: isPremium === true,
    isLoading: authLoading || isPremium === null,
  };
}
