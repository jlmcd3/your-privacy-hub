import { useState } from "react";
import { AlertTriangle, Info, Briefcase, ChevronDown, ChevronUp } from "lucide-react";
import {
  BLOCKING_RULE_VERBATIM,
  BLOCKING_RULE_CITATION,
} from "@/config/gdprArticleText";

export type FlagSeverity = "warning" | "info" | "recommendation";
export type FlagTier = "blocking" | "warning" | "advisory";
export type FlagType =
  | "missing_required"
  | "retention_undefined"
  | "basis_unclear"
  | "transfer_undocumented"
  | "high_risk_activity"
  | "recommendation"
  | "cross_sell";

interface Props {
  severity: FlagSeverity;
  flagType?: FlagType;
  activityName?: string;
  message: string;
  consequence?: string | null;
  actionLabel?: string | null;
  actionRoute?: string | null;
  /**
   * Compliance tier — drives whether legal-basis text is shown.
   * - "blocking": collapsible verbatim Article quote (requires ruleId)
   * - "warning": one-line citation only (uses legalCitation prop)
   * - "advisory": no verbatim text
   */
  tier?: FlagTier;
  /** Rule ID used to look up verbatim text for Blocking flags. */
  ruleId?: string;
  /** One-line citation shown under Warning flags (e.g. "GDPR Article 30(1)"). */
  legalCitation?: string;
}

/**
 * Inline flag rendered next to a question or in the review screen.
 * Severity determines color/iconography; cross-sell links open in a new tab
 * so the user never loses Q&A context.
 */
export default function RopaInlineFlag({
  severity,
  flagType,
  activityName,
  message,
  consequence,
  actionLabel,
  actionRoute,
  tier,
  ruleId,
  legalCitation,
}: Props) {
  const [legalOpen, setLegalOpen] = useState(false);
  const isCrossSell = flagType === "cross_sell" || flagType === "recommendation";

  if (isCrossSell) {
    return (
      <div className="border-l-4 border-brand-teal bg-[hsl(var(--cobalt)/0.06)] dark:bg-[hsl(var(--cobalt)/0.15)] rounded-r-lg p-3 my-2">
        <div className="flex items-start gap-2">
          <Briefcase className="w-4 h-4 text-brand-teal-text mt-0.5 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-[12px] font-semibold text-brand-teal-text mb-1">
              Related compliance tool
            </p>
            <p className="text-sm text-brand-navy dark:text-white">{message}</p>
            {actionLabel && actionRoute ? (
              <a
                href={actionRoute}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block mt-2 text-[12px] font-semibold text-brand-teal-text hover:underline"
              >
                {actionLabel} →
              </a>
            ) : actionLabel ? (
              <p className="mt-2 text-[12px] font-semibold text-brand-teal-text">
                {actionLabel}
              </p>
            ) : null}
          </div>
        </div>
      </div>
    );
  }

  // Legal-basis block — only Blocking shows verbatim text; Warning shows a
  // single-line citation; Advisory shows nothing.
  const verbatim = tier === "blocking" && ruleId ? BLOCKING_RULE_VERBATIM[ruleId] : undefined;
  const blockingCitation = tier === "blocking" && ruleId ? BLOCKING_RULE_CITATION[ruleId] : undefined;

  const renderLegalBasis = () => {
    if (tier === "blocking" && verbatim) {
      return (
        <div className="mt-2">
          <button
            type="button"
            onClick={() => setLegalOpen((v) => !v)}
            className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-900 dark:text-amber-200 hover:underline"
            aria-expanded={legalOpen}
          >
            {legalOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            {legalOpen ? "Hide legal basis" : "Show legal basis"}
          </button>
          {legalOpen && (
            <div className="mt-1.5 border-l-2 border-amber-400/60 pl-2">
              <p className="text-[12px] text-amber-900 dark:text-amber-100 italic leading-snug">
                “{verbatim}”
              </p>
              {blockingCitation && (
                <p className="text-[11px] text-amber-800/70 dark:text-amber-200/60 mt-1 not-italic">
                  — {blockingCitation}
                </p>
              )}
            </div>
          )}
        </div>
      );
    }
    if (tier === "warning" && legalCitation) {
      return (
        <p className="text-[11px] text-amber-800/70 dark:text-amber-200/60 mt-1 not-italic">
          Legal basis: {legalCitation}
        </p>
      );
    }
    return null;
  };

  if (severity === "info") {
    return (
      <div className="border-l-4 border-blue-500 bg-blue-50 dark:bg-blue-950/30 rounded-r-lg p-3 my-2">
        <div className="flex items-start gap-2">
          <Info className="w-4 h-4 text-blue-700 dark:text-blue-400 mt-0.5 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-[12px] font-semibold text-blue-900 dark:text-blue-200 mb-1">
              Note
            </p>
            <p className="text-sm text-blue-900 dark:text-blue-100">
              {message}
              {consequence ? <> · <span className="text-blue-800/80 dark:text-blue-200/80">{consequence}</span></> : null}
            </p>
            {renderLegalBasis()}
          </div>
        </div>
      </div>
    );
  }

  // warning
  return (
    <div className="border-l-4 border-amber-500 bg-amber-50 dark:bg-amber-950/30 rounded-r-lg p-3 my-2">
      <div className="flex items-start gap-2">
        <AlertTriangle className="w-4 h-4 text-amber-700 dark:text-amber-400 mt-0.5 shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-[12px] font-semibold text-amber-900 dark:text-amber-200 mb-1">
            {activityName ? `${activityName} — action may be needed` : "Action may be needed"}
          </p>
          <p className="text-sm text-amber-900 dark:text-amber-100">{message}</p>
          {consequence && (
            <p className="text-[11px] text-amber-800/80 dark:text-amber-200/70 mt-1">
              Why this matters: {consequence}
            </p>
          )}
          {renderLegalBasis()}
          <p className="text-[11px] text-amber-800/70 dark:text-amber-200/60 mt-1 italic">
            This will appear in your review checklist.
          </p>
        </div>
      </div>
    </div>
  );
}
