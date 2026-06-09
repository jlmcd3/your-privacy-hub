// Admin-only banner shown on /compare/us-states when any enacted state is
// past its quarterly review cadence. Reads state_law_review_log directly;
// non-admins simply see nothing.

import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import stateData from "@/data/us_state_comparison.json";

const CADENCE_DAYS = 90;

export default function StateReviewPastDueBanner() {
  const { isAdmin } = useIsAdmin();
  const [overdueCount, setOverdueCount] = useState<number | null>(null);

  useEffect(() => {
    if (!isAdmin) return;
    (async () => {
      const { data } = await (supabase as any)
        .from("state_law_review_log")
        .select("state_slug, status, reviewed_at")
        .order("reviewed_at", { ascending: false });
      const rows = (data ?? []) as Array<{
        state_slug: string;
        status: "ok" | "needs_update";
        reviewed_at: string;
      }>;
      const latest = new Map<string, typeof rows[number]>();
      for (const r of rows) if (!latest.has(r.state_slug)) latest.set(r.state_slug, r);

      const enacted = (stateData.states as Array<{ abbr: string; status: string }>)
        .filter((s) => s.status === "enacted");

      const now = Date.now();
      let overdue = 0;
      for (const s of enacted) {
        const slug = s.abbr.toLowerCase();
        const last = latest.get(slug);
        if (!last) { overdue++; continue; }
        const ageDays = (now - new Date(last.reviewed_at).getTime()) / 86400000;
        if (ageDays > CADENCE_DAYS || last.status === "needs_update") overdue++;
      }
      setOverdueCount(overdue);
    })();
  }, [isAdmin]);

  if (!isAdmin || !overdueCount) return null;

  return (
    <div className="mb-6 rounded-xl border border-destructive/40 bg-destructive/5 px-5 py-3 flex items-center justify-between gap-3">
      <div className="flex items-center gap-3 text-sm">
        <AlertTriangle className="h-4 w-4 text-destructive shrink-0" />
        <span>
          <strong>{overdueCount}</strong> state{overdueCount === 1 ? " is" : "s are"} past
          the {CADENCE_DAYS}-day review cadence.
        </span>
      </div>
      <Link
        to="/admin/state-law-review"
        className="text-xs font-bold px-3 py-1.5 rounded-md bg-destructive text-destructive-foreground no-underline"
      >
        Review now →
      </Link>
    </div>
  );
}
