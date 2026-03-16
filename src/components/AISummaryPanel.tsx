import { useState } from "react";
import { ChevronDown, ChevronUp, Sparkles } from "lucide-react";

interface AISummary {
  why_it_matters: string;
  takeaways: string[];
  compliance_impact: string;
  who_should_care: string;
}

interface AISummaryPanelProps {
  summary: AISummary | null;
}

const AISummaryPanel = ({ summary }: AISummaryPanelProps) => {
  const [open, setOpen] = useState(false);

  if (!summary) return null;

  return (
    <div className="mt-2">
      <button
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen(!open);
        }}
        className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-primary hover:text-primary/80 transition-colors bg-transparent border-none cursor-pointer px-0"
      >
        <Sparkles className="w-3 h-3" />
        AI Summary
        {open ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
      </button>

      {open && (
        <div
          className="mt-2 p-3 bg-card border border-border rounded-xl space-y-3 text-[12px]"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
        >
          {/* Why it matters */}
          <div>
            <p className="font-semibold text-foreground mb-1">Why it matters</p>
            <p className="text-muted-foreground leading-relaxed">{summary.why_it_matters}</p>
          </div>

          {/* Key takeaways */}
          {summary.takeaways && summary.takeaways.length > 0 && (
            <div>
              <p className="font-semibold text-foreground mb-1">Key takeaways</p>
              <ul className="list-disc list-inside space-y-0.5 text-muted-foreground">
                {summary.takeaways.map((t, i) => (
                  <li key={i} className="leading-relaxed">{t}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Compliance impact */}
          {summary.compliance_impact && (
            <div>
              <p className="font-semibold text-foreground mb-1">Compliance impact</p>
              <p className="text-muted-foreground leading-relaxed">{summary.compliance_impact}</p>
            </div>
          )}

          {/* Who should care */}
          {summary.who_should_care && (
            <div>
              <p className="font-semibold text-foreground mb-1">Who should care</p>
              <p className="text-muted-foreground leading-relaxed">{summary.who_should_care}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AISummaryPanel;