/**
 * TrialCountdownBanner — shows remaining days in the user's 10-day
 * Intelligence trial (v7 pricing). Reads `stripe_trial_end` from profiles.
 *
 * Hidden when:
 *   - no logged-in user
 *   - no trial end set
 *   - trial already ended
 */
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { INTELLIGENCE_PRICING } from "@/config/pricing";

export default function TrialCountdownBanner() {
  const { user } = useAuth();
  const [daysLeft, setDaysLeft] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (!user) { setDaysLeft(null); return; }
    (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("stripe_trial_end")
        .eq("id", user.id)
        .maybeSingle();
      if (cancelled) return;
      const end = (data as any)?.stripe_trial_end;
      if (!end) { setDaysLeft(null); return; }
      const ms = new Date(end).getTime() - Date.now();
      const days = Math.ceil(ms / (1000 * 60 * 60 * 24));
      setDaysLeft(days > 0 ? days : null);
    })();
    return () => { cancelled = true; };
  }, [user]);

  if (daysLeft === null) return null;

  return (
    <div className="mb-6 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm flex items-center justify-between gap-3">
      <div>
        <span className="font-semibold text-amber-900">
          {daysLeft === 1 ? "Last day of your trial" : `${daysLeft} days left in your free trial`}
        </span>
        <span className="text-amber-800 ml-1">
          — Intelligence is $20/month after the 10-day trial ends.
        </span>
      </div>
      <Link
        to="/account"
        className="shrink-0 text-meta font-semibold text-amber-900 underline hover:no-underline"
      >
        Manage billing →
      </Link>
    </div>
  );
}
