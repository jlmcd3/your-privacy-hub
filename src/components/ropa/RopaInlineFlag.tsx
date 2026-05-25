import { AlertTriangle, Info, Briefcase } from "lucide-react";

export type FlagSeverity = "warning" | "info" | "recommendation";
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
}: Props) {
  const isCrossSell = flagType === "cross_sell" || flagType === "recommendation";

  if (isCrossSell) {
    return (
      <div className="border-l-4 border-brand-teal bg-[hsl(var(--cobalt)/0.06)] dark:bg-[hsl(var(--cobalt)/0.15)] rounded-r-lg p-3 my-2">
        <div className="flex items-start gap-2">
          <Briefcase className="w-4 h-4 text-brand-teal mt-0.5 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-[12px] font-semibold text-brand-teal mb-1">
              Related compliance tool
            </p>
            <p className="text-sm text-brand-navy dark:text-white">{message}</p>
            {actionRoute && actionLabel && (
              <a
                href={actionRoute}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block mt-2 text-[12px] font-semibold text-brand-teal hover:underline"
              >
                {actionLabel} →
              </a>
            )}
          </div>
        </div>
      </div>
    );
  }

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
          <p className="text-[11px] text-amber-800/70 dark:text-amber-200/60 mt-1 italic">
            This will appear in your review checklist.
          </p>
        </div>
      </div>
    </div>
  );
}
