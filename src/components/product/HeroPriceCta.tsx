// PRE-INTAKE REDESIGN (2026-08-26) — standardized hero conversion block.
// One price line + one primary CTA + one sample-report secondary, identical
// on every product page. Price is separated from the button ("$X standalone
// · $Y subscriber price"); for an active subscriber the subscriber rate
// leads and a small green "Subscriber price applied" confirmation replaces
// the old amber ToolTierNote pill (amber is reserved for legal/deadline
// content in the redesigned system).
//
// Generation/revision phrasing stays owned by src/config/pricing.ts (REV-1);
// this component renders prices and navigation copy only.
import { CheckCircle2, FileText, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { focusIntakeStart } from "@/components/ProductHero";
import { useConversionEvent } from "@/hooks/useConversionEvent";
import { useAuth } from "@/hooks/useAuth";

export interface HeroPriceCtaProps {
  standalonePrice: number;
  subscriberPrice: number;
  /** True when the viewer already qualifies for the subscriber rate. */
  isSubscriber?: boolean;
  /** Primary CTA label, e.g. "Start Risk Assessment". */
  primaryLabel: string;
  /** Analytics slug for tool_start_click / sample_report_view events. */
  toolSlug: string;
  /** Sample page slug; omit to hide the "View Sample Report" secondary. */
  sampleSlug?: string;
  /** Optional explicit element id the primary CTA scrolls/focuses to. */
  ctaTargetId?: string;
}

export default function HeroPriceCta({
  standalonePrice,
  subscriberPrice,
  isSubscriber = false,
  primaryLabel,
  toolSlug,
  sampleSlug,
  ctaTargetId,
}: HeroPriceCtaProps) {
  const fireConversion = useConversionEvent();
  const { user } = useAuth();

  const handlePrimary = () => {
    fireConversion("tool_start_click", {
      tool_slug: toolSlug,
      page_path: typeof window !== "undefined" ? window.location.pathname : "",
      user_type: user ? "authenticated" : "anonymous",
    });
    focusIntakeStart(ctaTargetId);
  };

  const handleSample = () => {
    fireConversion("sample_report_view", {
      tool_slug: toolSlug,
      cta_position: "hero",
    });
  };

  return (
    <div>
      {isSubscriber ? (
        <p className="text-white text-lg font-semibold">
          Your subscriber price: ${subscriberPrice}
          <span className="ml-3 text-sm font-normal text-slate-400 line-through">
            ${standalonePrice} standalone
          </span>
        </p>
      ) : (
        <p className="text-white text-lg">
          <span className="font-semibold">${standalonePrice}</span>{" "}
          <span className="text-slate-300">standalone</span>
          <span className="mx-2 text-slate-400">·</span>
          <span className="font-semibold">${subscriberPrice}</span>{" "}
          <span className="text-slate-300">subscriber price</span>
        </p>
      )}
      {isSubscriber && (
        <p className="mt-1 text-sm font-medium text-emerald-300">
          <CheckCircle2
            aria-hidden="true"
            className="inline w-[1em] h-[1em] align-[-0.125em] mr-1"
            strokeWidth={1.75}
          />
          Subscriber price applied
        </p>
      )}
      <div className="mt-3 flex flex-wrap items-center gap-4">
        <button
          type="button"
          onClick={handlePrimary}
          className="inline-flex items-center gap-2 rounded-md bg-[hsl(var(--accent))] hover:bg-[hsl(var(--accent-light))] px-5 py-2.5 text-sm font-semibold text-white transition-colors"
        >
          {primaryLabel}
          <ArrowRight className="h-4 w-4" aria-hidden />
        </button>
        {sampleSlug ? (
          <Link
            to={`/samples/${sampleSlug}`}
            onClick={handleSample}
            className="inline-flex items-center gap-2 rounded-md border border-white/30 px-4 py-2.5 text-sm font-medium text-white hover:bg-white/10 no-underline transition-colors"
          >
            <FileText className="h-4 w-4" aria-hidden />
            View Sample Report
          </Link>
        ) : null}
      </div>
    </div>
  );
}
