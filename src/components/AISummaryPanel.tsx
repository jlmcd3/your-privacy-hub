import { useState } from "react";
import { Link } from "react-router-dom";
import { ChevronDown, ChevronUp, Sparkles, AlertCircle, Clock, Eye, Lock } from "lucide-react";
import PremiumGate from "./PremiumGate";

interface AISummary {
  why_it_matters: string;
  takeaways: string[];
  compliance_impact: string;
  who_should_care: string;
  urgency?: string;
  legal_weight?: string;
  source_strength?: string;
  cross_jurisdiction_signal?: string | null;
  risk_level?: string;
  regulatory_theory?: string | null;
  affected_sectors?: string[] | null;
  attention_level?: string | null;
}

interface AISummaryPanelProps {
  summary: AISummary | null;
  compact?: boolean;
  isPremium?: boolean;
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
        {!compact && summary.why_it_matters && (
          <p className="text-[12px] text-muted-foreground leading-snug">
            {summary.why_it_matters}
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

      {/* Expand button: available to all users */}
      <button
        onClick={() => setOpen(!open)}
        className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary hover:text-primary/80 transition-colors bg-transparent border-none cursor-pointer px-0 mt-0.5"
      >
        <Sparkles className="w-3 h-3" />
        {open ? "Hide" : "Full Analysis"}
        {open ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
      </button>

      {/* Expanded full panel — gated for non-premium users */}
      {open && !isPremium && (
        <div className="mt-2">
          <PremiumGate message="Full compliance analysis is a Premium feature." blur={false} />
        </div>
      )}

      {open && isPremium && (
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

          {summary.regulatory_theory && (
            <div>
              <p className="font-semibold text-foreground text-[11px] uppercase tracking-wider mb-1">
                Regulatory theory
              </p>
              <p className="text-muted-foreground leading-relaxed">{summary.regulatory_theory}</p>
            </div>
          )}

          {summary.affected_sectors && summary.affected_sectors.length > 0 && (
            <div>
              <p className="font-semibold text-foreground text-[11px] uppercase tracking-wider mb-1">
                Sectors affected
              </p>
              <div className="flex flex-wrap gap-1">
                {summary.affected_sectors.map((s, i) => (
                  <span key={i} className="text-[10px] font-medium bg-muted text-muted-foreground px-1.5 py-0.5 rounded">
                    {s}
                  </span>
                ))}
              </div>
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
