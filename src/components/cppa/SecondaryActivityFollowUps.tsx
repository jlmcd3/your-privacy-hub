/**
 * ITEM 321 (PROMPT C) — § 7156(a) SECONDARY-ACTIVITY FOLLOW-UP PANEL.
 *
 * Turns the Item-319 directive bundling recommendation into an in-app action
 * instead of report prose alone. One panel per secondary activity that is NOT
 * cleared for bundling; each offers "Start a new assessment for <activity>",
 * which pre-populates a fresh cppa-risk intake with that activity as the new
 * PRIMARY activity.
 *
 * The verdict and the recommendation sentence are read from
 * `secondaryFollowUps` — the same module the report composer uses — so the
 * panel can never disagree with the report. Activities whose verdict is
 * "single" ("can be addressed within this single assessment") produce no
 * panel and no action.
 *
 * SCOPE: bundling / comparable-set only. Nothing here touches the primary
 * activity's § 7152 analytic deliverables.
 */
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import {
  secondaryFollowUps,
  SECONDARY_ANCHOR_7156A,
  SECONDARY_RECOMMENDATION_DISCLAIMER,
} from "../../../supabase/functions/_shared/ltp/secondary-recommendation";
import { stashRiskPrefill } from "@/lib/riskIntakePrefill";

interface Props {
  /** The assessment's intake payload (reads `secondary_activities`). */
  intake: unknown;
  /** Provenance for the prefilled run. */
  sourceAssessmentId?: string;
}

export default function SecondaryActivityFollowUps({ intake, sourceAssessmentId }: Props) {
  const navigate = useNavigate();
  const raw = (intake as Record<string, unknown> | null | undefined)?.["secondary_activities"];
  const followUps = secondaryFollowUps(raw);
  if (followUps.length === 0) return null;

  const start = (name: string, purpose: string) => {
    stashRiskPrefill({
      primary_activity_name: name,
      primary_activity_purpose: purpose,
      source_assessment_id: sourceAssessmentId,
    });
    navigate("/cppa-risk-assessment?prefill=1");
  };

  return (
    <section
      data-testid="secondary-followups"
      aria-labelledby="secondary-followups-heading"
      className="space-y-4"
    >
      <div>
        <h2 id="secondary-followups-heading" className="text-xl font-serif">
          Recommended next steps for your other uses of this data
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          This assessment covers the assessed activity only. Under {SECONDARY_ANCHOR_7156A}, a single
          risk assessment may cover more than one activity only for a comparable set. Based on the
          comparison you recorded, we recommend a separate assessment for the following.
        </p>
      </div>

      {followUps.map((f) => (
        <article
          key={f.row.name}
          data-testid={`secondary-followup-${f.row.name}`}
          className="rounded-lg border border-border bg-card p-5 space-y-3"
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 className="font-medium">{f.row.name}</h3>
              {f.row.purpose && (
                <p className="text-sm text-muted-foreground">{f.row.purpose}</p>
              )}
            </div>
            <Button onClick={() => start(f.row.name, f.row.purpose)} className="shrink-0">
              Start a new assessment for {f.row.name}
              <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
            </Button>
          </div>

          {/* The recommendation never replaces showing the work. */}
          <p className="text-sm">{f.recommendation}</p>

          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-1">
              Your comparison against the assessed activity
            </p>
            <ul className="text-sm space-y-1">
              {f.comparison.map((c) => (
                <li key={c.key}>
                  <span className="capitalize">{c.label}</span> — {c.verdict}
                </li>
              ))}
            </ul>
          </div>
        </article>
      ))}

      <p className="text-xs text-muted-foreground">{SECONDARY_RECOMMENDATION_DISCLAIMER}</p>
    </section>
  );
}
