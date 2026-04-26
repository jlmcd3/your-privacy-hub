import { Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Thin strip below navbar: free library on the left, Intelligence value on the right.
 * Only shown to logged-out users and free-tier logged-in users.
 */
export default function FreeVsPaidStrip() {
  const { user, loading: authLoading } = useAuth();
  const [isPremium, setIsPremium] = useState<boolean | null>(null);

  useEffect(() => {
    if (!user) { setIsPremium(false); return; }
    supabase
      .from("profiles")
      .select("is_premium")
      .eq("id", user.id)
      .single()
      .then(({ data }) => setIsPremium(data?.is_premium ?? false));
  }, [user]);

  // Don't show while loading, or if user is premium
  if (authLoading || isPremium === null || isPremium) return null;

  return (
    <div className="bg-muted/50 border-b border-border text-center py-1.5 px-4">
      <p className="text-[11px] text-muted-foreground">
        📚 Free to browse · Free weekly digest included{" "}
        <span className="text-border mx-1.5">·</span>
        <span className="text-amber-600 font-semibold">⭐ Intelligence $39/mo — full archive, watchlists, <span className="underline">subscriber rates on every tool</span></span>
        <span className="text-border mx-1.5">·</span>
        <Link to="/subscribe" className="text-primary font-semibold no-underline hover:underline">
          See what's included →
        </Link>
      </p>
    </div>
  );
}
