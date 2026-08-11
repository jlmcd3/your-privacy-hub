// Shared product-page hero. Extracted from the hand-built headers on the
// assessment/intake pages so geography → background colour is decided here,
// never by the page. The "Includes 4 generations" and methodology/trust lines
// deliberately live OUTSIDE the hero — see <ProductHeroSubstrip />.
import type { ReactNode } from "react";
import { RequirementBadge } from "@/components/RequirementBadge";
import SampleReportLink from "@/components/SampleReportLink";

type Geography = "us" | "gdpr" | "global";

type Tier = "required" | "conditional" | "expected" | "supports" | "free";

const GEOGRAPHY_BG: Record<Geography, string> = {
  us: "bg-brand-ocean",
  gdpr: "bg-brand-navy",
  global: "bg-brand-slate-teal",
};

export interface ProductHeroProps {
  geography: Geography;
  eyebrowLabel?: ReactNode;
  title: ReactNode;
  legalTrigger?: { tier: Tier; text: string };
  /** Exactly one paragraph of value proposition. */
  valueProposition?: ReactNode;
  sampleReportToolSlug?: string;
  citationLine?: ReactNode;
  /** Label for the primary CTA that jumps into the intake form. */
  ctaLabel?: string;
  /** Optional explicit element id to focus/scroll to; defaults to first form field in <main>. */
  ctaTargetId?: string;
  /** Set false on landing pages that already supply their own primary CTA via children. */
  showIntakeCta?: boolean;
  /** Extra action elements rendered in the hero action row. */
  children?: ReactNode;
  className?: string;
}

function focusIntakeStart(targetId?: string) {
  const explicit = targetId ? document.getElementById(targetId) : null;
  const scope = document.querySelector("main") ?? document.body;
  const target =
    explicit ??
    (scope.querySelector(
      "input:not([type=hidden]):not([disabled]), textarea:not([disabled]), select:not([disabled])",
    ) as HTMLElement | null);
  if (!target) return;
  target.scrollIntoView({ behavior: "smooth", block: "center" });
  window.setTimeout(() => {
    try {
      (target as HTMLElement).focus({ preventScroll: true });
    } catch {
      /* non-focusable target — scroll only */
    }
  }, 350);
}

export function ProductHero({
  geography,
  eyebrowLabel,
  title,
  legalTrigger,
  valueProposition,
  sampleReportToolSlug,
  citationLine,
  ctaLabel = "Start the assessment",
  ctaTargetId,
  showIntakeCta = true,
  children,
  className = "",
}: ProductHeroProps) {
  return (
    <header className={`${GEOGRAPHY_BG[geography]} text-white py-12 ${className}`}>
      <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8">
        {eyebrowLabel ? (
          <span className="inline-block px-3 py-1 text-xs font-medium rounded-full bg-amber-500/20 text-amber-200 mb-3">
            {eyebrowLabel}
          </span>
        ) : null}
        <h1 className="text-hero-h1 text-white mb-3">{title}</h1>
        {legalTrigger ? (
          <RequirementBadge
            variant="hero"
            tier={legalTrigger.tier}
            text={legalTrigger.text}
            className="mt-2 max-w-3xl"
          />
        ) : null}
        {valueProposition ? (
          <p className="text-slate-300 text-lg max-w-3xl leading-relaxed">{valueProposition}</p>
        ) : null}
        <div className="mt-5 flex flex-wrap items-center gap-4">
          {children}
          {showIntakeCta ? (
          <button
            type="button"
            onClick={() => focusIntakeStart(ctaTargetId)}
            className="inline-flex items-center justify-center rounded-md bg-brand-teal-deep px-5 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
          >
            {ctaLabel} →
          </button>
          ) : null}
          {sampleReportToolSlug ? (
            <SampleReportLink toolSlug={sampleReportToolSlug} tone="onDark" variant="link" />
          ) : null}
        </div>
        {citationLine ? (
          <p className="font-mono text-[12.5px] leading-snug text-slate-400 mt-4">{citationLine}</p>
        ) : null}
      </div>
    </header>
  );
}

/**
 * Compact two-line strip rendered immediately below the hero <header>.
 * Carries the generations-included line and the methodology/trust line that
 * previously cluttered the hero itself.
 */
export function ProductHeroSubstrip({
  generationsLine,
  methodologyLine,
}: {
  generationsLine?: ReactNode;
  methodologyLine?: ReactNode;
}) {
  if (!generationsLine && !methodologyLine) return null;
  return (
    <div className="border-b border-border bg-muted/40">
      <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 py-2.5 space-y-0.5">
        {generationsLine ? (
          <p className="text-xs italic text-muted-foreground">{generationsLine}</p>
        ) : null}
        {methodologyLine ? (
          <p className="text-xs italic text-muted-foreground">{methodologyLine}</p>
        ) : null}
      </div>
    </div>
  );
}

export default ProductHero;
