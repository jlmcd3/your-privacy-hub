import { Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Thin strip below navbar: "📚 Free library · ⭐ Your analyst is $20/month"
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
        📚 Free library{" "}
        <span className="text-border mx-1.5">·</span>
        <span className="text-amber-600 font-semibold">⭐ Intelligence is $20/month</span>
        <span className="text-border mx-1.5">·</span>
        <Link to="/subscribe" className="text-primary font-semibold no-underline hover:underline">
          See what's included →
        </Link>
      </p>
    </div>
  );
}
