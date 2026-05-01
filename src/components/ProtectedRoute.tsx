import { Navigate, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  const location = useLocation();
  const [roleConfirmed, setRoleConfirmed] = useState<boolean | null>(null);

  useEffect(() => {
    if (!user) {
      setRoleConfirmed(null);
      return;
    }
    let cancelled = false;
    supabase
      .from("profiles")
      .select("role_confirmed_at")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (!cancelled) setRoleConfirmed(!!data?.role_confirmed_at);
      });
    return () => { cancelled = true; };
  }, [user]);

  if (loading || (user && roleConfirmed === null)) {
    return (
      <div className="min-h-screen bg-paper flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-blue/30 border-t-blue rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    const from = location.pathname + location.search;
    return <Navigate to={`/login?redirect=${encodeURIComponent(from)}`} replace />;
  }

  // Force onboarding before any other protected page
  if (
    roleConfirmed === false &&
    location.pathname !== "/onboarding-profile"
  ) {
    const from = location.pathname + location.search;
    return <Navigate to={`/onboarding-profile?redirect=${encodeURIComponent(from)}`} replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
