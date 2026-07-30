// src/components/research/SectionReferenceRail.tsx
// Sticky right-column rail for ResearchPageLayout article pages.
// Tracks which <section id="..."> is currently in view using IntersectionObserver
// and renders the verbatim regulation text + plain summary for that section.
//
// Visual styling mirrors StatuteRail so the two patterns feel native together.

import { useEffect, useRef, useState } from "react";
import { ChevronDown, ChevronUp, BookOpen, ExternalLink } from "lucide-react";
import type { RailEntry } from "@/components/intake/StatuteRail";

interface Props {
  /** Map of section id → RailEntry. Sections without an entry simply leave the rail showing the previous entry. */
  entries: Record<string, RailEntry>;
  /** Ordered list of section ids to observe. Usually `sections.map(s => s.id)` from ResearchPageLayout. */
  sectionIds: string[];
  className?: string;
}

const DEFAULT_STICKY_TOP = 16; // px

export default function SectionReferenceRail({ entries, sectionIds, className = "" }: Props) {
  const [activeId, setActiveId] = useState<string | null>(sectionIds[0] ?? null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const stickyRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const elements = sectionIds
      .map((id) => document.getElementById(id))
      .filter((el): el is HTMLElement => !!el);
    if (elements.length === 0) return;

    const visibility = new Map<string, number>();

    const observer = new IntersectionObserver(
      (events) => {
        for (const ev of events) {
          visibility.set(ev.target.id, ev.intersectionRatio);
        }
        // Pick the section closest to the top that has any visibility.
        let bestId: string | null = null;
        let bestTop = Infinity;
        for (const el of elements) {
          const ratio = visibility.get(el.id) ?? 0;
          if (ratio <= 0) continue;
          const top = el.getBoundingClientRect().top;
          if (top < bestTop) {
            bestTop = top;
            bestId = el.id;
          }
        }
        if (bestId) setActiveId(bestId);
      },
      { rootMargin: "-80px 0px -55% 0px", threshold: [0, 0.1, 0.5, 1] }
    );

    elements.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [sectionIds.join("|")]);

  // When the active section's heading is below the default sticky offset (e.g. the last
  // short section), switch the rail card to fixed positioning so its top edge aligns
  // with the heading. Sticky positioning alone is constrained by the parent aside's
  // height and cannot follow a heading that never reaches the top of the viewport.
  useEffect(() => {
    const stickyEl = stickyRef.current;
    const cardEl = cardRef.current;
    if (!stickyEl || !cardEl || !activeId) return;

    const CONTAINER_MAX_WIDTH = 1180;
    const RAIL_WIDTH = 300;
    const HORIZONTAL_PADDING = 24;

    const updatePosition = () => {
      const section = document.getElementById(activeId);
      const heading = section?.querySelector("h3");
      if (!heading) return;

      const headingTop = heading.getBoundingClientRect().top;
      if (headingTop > DEFAULT_STICKY_TOP) {
        const viewportWidth = window.innerWidth;
        const right = Math.max(
          HORIZONTAL_PADDING,
          (viewportWidth - CONTAINER_MAX_WIDTH) / 2 + HORIZONTAL_PADDING
        );
        cardEl.style.position = "fixed";
        cardEl.style.top = `${headingTop}px`;
        cardEl.style.right = `${right}px`;
        cardEl.style.width = `${RAIL_WIDTH}px`;
        cardEl.style.zIndex = "30";
      } else {
        cardEl.style.position = "";
        cardEl.style.top = "";
        cardEl.style.right = "";
        cardEl.style.width = "";
        cardEl.style.zIndex = "";
      }
    };

    updatePosition();
    window.addEventListener("scroll", updatePosition, { passive: true });
    window.addEventListener("resize", updatePosition);
    return () => {
      window.removeEventListener("scroll", updatePosition);
      window.removeEventListener("resize", updatePosition);
    };
  }, [activeId]);

  const entry: RailEntry | null = activeId ? entries[activeId] ?? null : null;

  const content = entry ? (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <span className="font-mono text-[11px] font-semibold text-[hsl(var(--cobalt))] tracking-wide">
            {entry.citation}
          </span>
          <p className="text-[11px] text-muted-foreground mt-0.5">{entry.fieldLabel}</p>
        </div>
        {entry.citationUrl && (
          <a
            href={entry.citationUrl}
            target="_blank"
            rel="noreferrer"
            className="shrink-0 text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Open official source"
          >
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        )}
      </div>

      <div className="rounded-md bg-[hsl(var(--cobalt)/0.07)] border border-[hsl(var(--cobalt)/0.15)] p-3">
        <p className="text-[11px] font-semibold text-[hsl(var(--cobalt))] mb-1 uppercase tracking-wide">
          What this means
        </p>
        <p className="text-[12px] leading-relaxed text-foreground">{entry.plainSummary}</p>
      </div>

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

      {entry.enforcementNote && (
        <div className="rounded-md bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 p-3">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-400 mb-1">
            Enforcement note
          </p>
          <p className="text-[11px] leading-relaxed text-foreground/80">{entry.enforcementNote}</p>
        </div>
      )}
    </div>
  ) : (
    <div className="flex flex-col items-center justify-center py-8 text-center">
      <BookOpen className="w-8 h-8 text-muted-foreground/40 mb-3" />
      <p className="text-[12px] text-muted-foreground">
        Scroll a section into view to see the controlling statute or regulation text here.
      </p>
    </div>
  );

  return (
    <>
      <aside
        className={`hidden lg:flex flex-col w-[300px] shrink-0 self-stretch ${className}`}
        aria-label="Section reference"
      >
        <div ref={stickyRef} className="sticky top-[var(--sticky-offset)]">
          <div ref={cardRef} className="rounded-lg border bg-card shadow-sm overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-3 border-b bg-[hsl(var(--brand-navy)/0.03)]">
              <BookOpen className="w-3.5 h-3.5 text-[hsl(var(--brand-navy))]" />
              <span className="text-[11px] font-semibold uppercase tracking-wide text-[hsl(var(--brand-navy))]">
                Section Reference
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
              {entry ? entry.citation : "Section Reference"}
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
