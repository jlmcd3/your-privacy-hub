// Ad eligibility gate. Fail-closed: any check that errors or is
// indeterminate returns false. See AD-2 in EUP_Public_Page_Recommendations.
import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { ADS_ENABLED, AD_ELIGIBLE_PREFIXES } from "@/config/ads";
import { getAdRegion } from "@/lib/adRegion";

export function useAdEligibility(): boolean {
  const { pathname } = useLocation();
  const [signedIn, setSignedIn] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;
    supabase.auth.getSession().then(({ data }) => {
      if (!cancelled) setSignedIn(!!data?.session);
    }).catch(() => {
      if (!cancelled) setSignedIn(true); // fail-closed → treat as signed-in
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_evt, session) => {
      setSignedIn(!!session);
    });
    return () => {
      cancelled = true;
      sub?.subscription?.unsubscribe();
    };
  }, []);

  try {
    if (!ADS_ENABLED) return false;
    if (signedIn === null) return false; // indeterminate → fail-closed
    if (signedIn) return false;
    const pathAllowed = AD_ELIGIBLE_PREFIXES.some((p) => pathname.startsWith(p));
    if (!pathAllowed) return false;
    if (typeof navigator !== "undefined" && (navigator as unknown as { globalPrivacyControl?: boolean }).globalPrivacyControl === true) {
      return false;
    }
    if (getAdRegion() !== "allowed") return false;
    return true;
  } catch {
    return false;
  }
}
