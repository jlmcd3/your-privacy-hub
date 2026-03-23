import { useState } from "react";
import { Link } from "react-router-dom";
import { ChevronDown, ChevronUp, Sparkles, AlertCircle, Clock, Eye, Lock } from "lucide-react";

interface AISummary {
  why_it_matters: string;
  takeaways: string[];
  compliance_impact: string;
  who_should_care: string;
  urgency?: string; // Immediate | This quarter | Monitor
  legal_weight?: string; // Binding | Enforcement | Guidance | Proposal | Commentary
  source_strength?: string; // Primary regulator | Legal analysis | Media coverage
  cross_jurisdiction_signal?: string | null;
  risk_level?: string; // Low | Medium | High | Critical
}

interface AISummaryPanelProps {
  summary: AISummary | null;
  compact?: boolean;
  isPremium?: boolean; // false = free user, full panel locked
}

const URGENCY_CONFIG: Record<string, { color: string; icon: typeof AlertCircle; label: string }> = {
  "Immediate":    { color: "bg-destructive/10 text-destructive border-destructive/20", icon: AlertCircle, label: "Act now" },
  "This quarter": { color: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-800", icon: Clock, label: "This quarter" },
  "Monitor":      { color: "bg-primary/10 text-primary border-primary/20", icon: Eye, label: "Monitor" },
};

const RISK_CONFIG: Record<string, string> = {
  "Critical": "bg-red-50 text-red-700 border-red-200",
  "High": "bg-orange-50 text-orange-700 border-orange-200",
  "Medium": "bg-amber-50 text-amber-700 border-amber-200",
  "Low": "bg-green-50 text-green-700 border-green-200",
};

const AISummaryPanel = ({ summary, compact = false, isPremium = false }: AISummaryPanelProps) => {
  const [open, setOpen] = useState(false);

  if (!summary) return null;

  const urgencyConfig = summary.urgency ? URGENCY_CONFIG[summary.urgency] : null;
  const UrgencyIcon = urgencyConfig?.icon ?? Eye;

  const teaserText = summary.why_it_matters
    ? summary.why_it_matters.split(/\.\s+/)[0] + "."
    : "";

  return (
    <div
      className="mt-2.5 pt-2.5 border-t border-border/60"
      onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
    >
      {/* ALWAYS-VISIBLE strip: urgency badge + why_it_matters teaser */}
      <div className="flex items-start gap-2 mb-1.5">
        {urgencyConfig && (
          <span
            className={`inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border flex-shrink-0 ${urgencyConfig.color}`}
          >
            <UrgencyIcon className="w-2.5 h-2.5" />
            {urgencyConfig.label}
          </span>
        )}
        {!compact && teaserText && (
          <p className="text-[12px] text-muted-foreground leading-snug line-clamp-2">
            {teaserText}
          </p>
        )}
      </div>

      {/* Compliance impact — always visible if present */}
      {!compact && summary.compliance_impact && (
        <p className="text-[11px] text-muted-foreground leading-snug mb-1.5 line-clamp-1">
          <span className="font-semibold text-foreground/80">Impact: </span>
          {summary.compliance_impact}
        </p>
      )}

      {/* Expand button: locked for free users */}
      {isPremium ? (
        <button
          onClick={() => setOpen(!open)}
          className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary hover:text-primary/80 transition-colors bg-transparent border-none cursor-pointer px-0 mt-0.5"
        >
          <Sparkles className="w-3 h-3" />
          {open ? "Hide" : "Full AI analysis"}
          {open ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        </button>
      ) : (
        <Link
          to="/subscribe"
          className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-600 hover:text-amber-700 no-underline transition-colors mt-0.5"
        >
          <Lock className="w-3 h-3" />
          Full AI analysis — Premium →
        </Link>
      )}

      {/* Expanded full panel: only renders for premium users */}
      {isPremium && open && (
        <div className="mt-2 p-4 bg-primary/[0.03] border border-primary/10 rounded-xl space-y-3 text-[12px]">
          <div>
            <p className="font-semibold text-foreground text-[11px] uppercase tracking-wider mb-1">
              Why it matters
            </p>
            <p className="text-muted-foreground leading-relaxed">{summary.why_it_matters}</p>
          </div>

          {summary.takeaways && summary.takeaways.length > 0 && (
            <div>
              <p className="font-semibold text-foreground text-[11px] uppercase tracking-wider mb-1">
                Key takeaways
              </p>
              <ul className="space-y-1 text-muted-foreground">
                {summary.takeaways.map((t, i) => (
                  <li key={i} className="flex items-start gap-1.5 leading-relaxed">
                    <span className="text-primary font-bold flex-shrink-0 mt-0.5">→</span>
                    {t}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {summary.compliance_impact && (
            <div>
              <p className="font-semibold text-foreground text-[11px] uppercase tracking-wider mb-1">
                Compliance impact
              </p>
              <p className="text-muted-foreground leading-relaxed">{summary.compliance_impact}</p>
            </div>
          )}

          <div className="flex items-center justify-between flex-wrap gap-2 pt-1 border-t border-border/40">
            {summary.who_should_care && (
              <p className="text-[11px] text-muted-foreground">
                <span className="font-medium text-foreground/80">For: </span>
                {summary.who_should_care}
              </p>
            )}
            <div className="flex items-center gap-2">
              {summary.risk_level && RISK_CONFIG[summary.risk_level] && (
                <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${RISK_CONFIG[summary.risk_level]}`}>
                  ⚠️ {summary.risk_level} risk
                </span>
              )}
              {urgencyConfig && (
                <span className={`inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${urgencyConfig.color}`}>
                  <UrgencyIcon className="w-2.5 h-2.5" />
                  {summary.urgency}
                </span>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AISummaryPanel;
