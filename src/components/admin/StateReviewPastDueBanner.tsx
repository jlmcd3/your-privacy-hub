// Admin-only banner shown on /compare/us-states when any enacted state is
// past its review cadence, needs an update, or has been flagged with a
// material change. Reads state_law_review_log directly; non-admins see nothing.

import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import {
  computeReviewRollup,
  REVIEW_CADENCE_DAYS,
  type ReviewLogRow,
} from "@/lib/stateReviewStatus";

export default function StateReviewPastDueBanner() {
  const { isAdmin } = useIsAdmin();
  const [rollup, setRollup] = useState<ReturnType<typeof computeReviewRollup> | null>(null);

  useEffect(() => {
    if (!isAdmin) return;
    (async () => {
      const { data } = await (supabase as any)
        .from("state_law_review_log")
        .select("state_slug, status, reviewed_at")
        .order("reviewed_at", { ascending: false });
      setRollup(computeReviewRollup((data ?? []) as ReviewLogRow[]));
    })();
  }, [isAdmin]);

  if (!isAdmin || !rollup) return null;

  const problem =
    rollup.materialChangeCount +
    rollup.needsUpdateCount +
    rollup.overdueCount +
    rollup.neverReviewedCount;
  if (problem === 0) return null;

  const parts: string[] = [];
  if (rollup.materialChangeCount)
    parts.push(
      `${rollup.materialChangeCount} flagged material change${rollup.materialChangeCount === 1 ? "" : "s"}`,
    );
  if (rollup.needsUpdateCount)
    parts.push(
      `${rollup.needsUpdateCount} needs-update`,
    );
  if (rollup.overdueCount)
    parts.push(
      `${rollup.overdueCount} past the ${REVIEW_CADENCE_DAYS}-day cadence`,
    );
  if (rollup.neverReviewedCount)
    parts.push(
      `${rollup.neverReviewedCount} never reviewed`,
    );

  return (
    <div className="mb-6 rounded-xl border border-destructive/40 bg-destructive/5 px-5 py-3 flex items-center justify-between gap-3">
      <div className="flex items-center gap-3 text-sm">
        <AlertTriangle className="h-4 w-4 text-destructive shrink-0" />
        <span>
          <strong>State review needs attention:</strong> {parts.join(" · ")}.
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
