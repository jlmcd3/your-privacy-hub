// src/components/admt/StatuteRail.tsx
// Statute Rail — persistent right column showing exact regulation text,
// plain-language summary, and FSOR context for the active field.
// Desktop: sticky right column. Mobile: collapsible drawer at bottom.

import { useState } from "react";
import { ChevronDown, ChevronUp, BookOpen, ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export type RailEntry = {
  fieldLabel: string;
  citation: string;
  citationUrl?: string;
  plainSummary: string;
  regulationText: string;
  fscrContext?: string;
  enforcementNote?: string;
  goodAnswer?: string;
  commonMistake?: string;
  relatedCitations?: { citation: string; label: string }[];
  templateGuidance?: {
    sectionRef: string;
    sectionTitle: string;
    guidance: string;
    paraRefs?: number[];
    sourceLabel: string;
    sourceUrl: string;
  };
};

interface StatuteRailProps {
  entry: RailEntry | null;
  className?: string;
}

const OFFICIAL_URL =
  "https://cppa.ca.gov/regulations/pdf/ccpa_updates_cyber_risk_admt_appr_text.pdf";

export default function StatuteRail({ entry, className = "" }: StatuteRailProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  const content = entry ? (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <span className="font-mono text-[11px] font-semibold text-[hsl(var(--cobalt))] tracking-wide">
            {entry.citation}
          </span>
          <p className="text-[11px] text-muted-foreground mt-0.5">{entry.fieldLabel}</p>
        </div>
        <a
          href={entry.citationUrl ?? OFFICIAL_URL}
          target="_blank"
          rel="noreferrer"
          className="shrink-0 text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Open official source"
        >
          <ExternalLink className="w-3.5 h-3.5" />
        </a>
      </div>

      <div className="rounded-md bg-[hsl(var(--cobalt)/0.07)] border border-[hsl(var(--cobalt)/0.15)] p-3">
        <p className="text-[11px] font-semibold text-[hsl(var(--cobalt))] mb-1 uppercase tracking-wide">
          What this means
        </p>
        <p className="text-[12px] leading-relaxed text-foreground">{entry.plainSummary}</p>
      </div>

      {entry.templateGuidance && (
        <div className="rounded-md bg-[hsl(var(--brand-navy)/0.05)] border border-[hsl(var(--brand-navy)/0.12)] p-3">
          <div className="flex items-start justify-between gap-2 mb-1">
            <p className="text-[11px] font-semibold text-[hsl(var(--brand-navy))] uppercase tracking-wide">
              EDPB DPIA template — completing this field
            </p>
            <a
              href={entry.templateGuidance.sourceUrl}
              target="_blank"
              rel="noreferrer"
              className="shrink-0 text-muted-foreground hover:text-foreground transition-colors"
              aria-label="EDPB source"
            >
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
          <p className="text-[10px] font-mono text-muted-foreground mb-1.5">
            § {entry.templateGuidance.sectionRef} · {entry.templateGuidance.sectionTitle}
          </p>
          <p className="text-[12px] leading-relaxed text-foreground">
            {entry.templateGuidance.guidance}
          </p>
          <p className="text-[10px] text-muted-foreground mt-2 italic">
            {entry.templateGuidance.sourceLabel}
          </p>
        </div>
      )}

      {entry.regulationText && (
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-1.5">
            Regulation text (verbatim)
          </p>
          <div className="border-l-2 border-border pl-3">
            <p className="text-[11px] leading-relaxed text-foreground/80 italic whitespace-pre-wrap">
              {entry.regulationText}
            </p>
          </div>
        </div>
      )}

      {entry.fscrContext && (
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-1.5">
            Agency reasoning (FSOR)
          </p>
          <p className="text-[11px] leading-relaxed text-foreground/70">{entry.fscrContext}</p>
        </div>
      )}

      {entry.enforcementNote && (
        <div className="rounded-md bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 p-3">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-400 mb-1">
            Enforcement note
          </p>
          <p className="text-[11px] leading-relaxed text-foreground/80">{entry.enforcementNote}</p>
        </div>
      )}

      {entry.relatedCitations && entry.relatedCitations.length > 0 && (
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-1.5">
            Related sections
          </p>
          <div className="flex flex-wrap gap-1.5">
            {entry.relatedCitations.map((r) => (
              <Badge key={r.citation} variant="outline" className="text-[10px] font-mono">
                {r.citation}
              </Badge>
            ))}
          </div>
        </div>
      )}
    </div>
  ) : (
    <div className="flex flex-col items-center justify-center py-8 text-center">
      <BookOpen className="w-8 h-8 text-muted-foreground/40 mb-3" />
      <p className="text-[12px] text-muted-foreground">
        Focus on a field to see the relevant regulation text, agency reasoning, and enforcement context here.
      </p>
    </div>
  );

  return (
    <>
      <aside
        className={`hidden lg:flex flex-col w-[300px] shrink-0 self-stretch ${className}`}
        aria-label="Regulation reference"
      >
        <div className="sticky top-4">
          <div className="rounded-lg border bg-card shadow-sm overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-3 border-b bg-[hsl(var(--brand-navy)/0.03)]">
              <BookOpen className="w-3.5 h-3.5 text-[hsl(var(--brand-navy))]" />
              <span className="text-[11px] font-semibold uppercase tracking-wide text-[hsl(var(--brand-navy))]">
                Regulation Reference
              </span>
            </div>
            <div className="p-4 max-h-[calc(100vh-120px)] overflow-y-auto">{content}</div>
          </div>
        </div>
      </aside>

      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-card border-t shadow-lg">
        <button
          type="button"
          className="w-full flex items-center justify-between px-4 py-3"
          onClick={() => setMobileOpen((o) => !o)}
        >
          <div className="flex items-center gap-2">
            <BookOpen className="w-3.5 h-3.5 text-[hsl(var(--brand-navy))]" />
            <span className="text-[12px] font-semibold text-[hsl(var(--brand-navy))]">
              {entry ? entry.citation : "Regulation Reference"}
            </span>
          </div>
          {mobileOpen ? (
            <ChevronDown className="w-4 h-4 text-muted-foreground" />
          ) : (
            <ChevronUp className="w-4 h-4 text-muted-foreground" />
          )}
        </button>
        {mobileOpen && <div className="px-4 pb-4 max-h-64 overflow-y-auto border-t">{content}</div>}
      </div>
    </>
  );
}
