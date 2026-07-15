// PP-3 — Above-fold Tool CTA block for Group B tool landings.
//
// Renders a primary CTA (subscribe or open-tool depending on access) plus an
// optional "See a sample →" secondary link. All conversion events flow through
// the shared PP-1 useConversionEvent hook:
//   - subscribe_cta_click  (when the primary sends the visitor to /subscribe)
//   - tool_start_click     (when the primary opens the live tool for an
//                           already-entitled user)
//   - sample_report_view   (when the secondary sample link is clicked)
//
// Copy is intentionally minimal and factual. This component MUST NOT introduce
// generation/revision claims — that phrasing is frozen and owned by REV-1.
// No trust signals, no free-trial claims, no invented numbers. All wording
// here is either generic navigation copy or overridden by the caller from
// pricing.ts-backed sources.
import { Link } from "react-router-dom";
import { ArrowRight, FileText } from "lucide-react";
import { useConversionEvent } from "@/hooks/useConversionEvent";
import { useAuth } from "@/hooks/useAuth";
import { TOOL_ROUTE } from "@/lib/sampleToolRoutes";

interface ToolCTABlockProps {
  /** Analytics slug (matches PP-1 vocabulary and, when applicable, TOOL_ROUTE). */
  toolSlug: string;
  /** Where the primary CTA leads for an already-entitled user. */
  toolHref?: string;
  /** If true and toolHref is set, primary opens the tool; otherwise primary goes to /subscribe. */
  hasAccess?: boolean;
  /** Override the primary button label. */
  primaryLabel?: string;
  /** Override the /subscribe fallback label. */
  subscribeLabel?: string;
  /** Ratified vocabulary only: "hero" or "hero-secondary". */
  ctaPosition?: "hero" | "hero-secondary";
  /** Render on a dark hero surface (adjusts the sample-link colour). */
  onDark?: boolean;
  className?: string;
  /** Force-show or force-hide the sample link. Defaults to auto (TOOL_ROUTE lookup). */
  showSample?: boolean;
  /** Sample link label override. */
  sampleLabel?: string;
  /** Page path passed to tool_start_click analytics. */
  pagePath?: string;
}

export default function ToolCTABlock({
  toolSlug,
  toolHref,
  hasAccess = false,
  primaryLabel,
  subscribeLabel = "View subscription plans",
  ctaPosition = "hero",
  onDark = false,
  className,
  showSample,
  sampleLabel = "See a sample",
  pagePath,
}: ToolCTABlockProps) {
  const fireConversion = useConversionEvent();
  const { user } = useAuth();
  const userType: "authenticated" | "anonymous" = user ? "authenticated" : "anonymous";

  const sampleAvailable = showSample ?? Boolean(TOOL_ROUTE[toolSlug]);
  const openTool = hasAccess && !!toolHref;
  const primaryHref = openTool ? toolHref! : "/subscribe";
  const primaryLabelResolved = primaryLabel ?? (openTool ? "Open tool" : subscribeLabel);

  const handlePrimary = () => {
    if (openTool) {
      fireConversion("tool_start_click", {
        tool_slug: toolSlug,
        page_path:
          pagePath ??
          (typeof window !== "undefined" ? window.location.pathname : ""),
        user_type: userType,
      });
    } else {
      fireConversion("subscribe_cta_click", {
        cta_label: primaryLabelResolved,
        cta_position: ctaPosition,
      });
    }
  };

  const handleSample = () => {
    fireConversion("sample_report_view", {
      tool_slug: toolSlug,
      cta_position: ctaPosition,
    });
  };

  const sampleColour = onDark
    ? "text-white hover:text-white/90 focus-visible:ring-white"
    : "text-brand-teal-text hover:text-brand-navy focus-visible:ring-brand-teal";

  return (
    <div
      className={`mt-4 flex flex-wrap items-center gap-x-5 gap-y-3 ${className ?? ""}`}
    >
      <Link
        to={primaryHref}
        onClick={handlePrimary}
        className="inline-flex items-center gap-2 rounded-md bg-teal-action px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-teal-action-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-transparent"
      >
        {primaryLabelResolved}
        <ArrowRight className="h-4 w-4" aria-hidden />
      </Link>
      {sampleAvailable && (
        <Link
          to={`/samples/${toolSlug}`}
          onClick={handleSample}
          className={`inline-flex items-center gap-1.5 rounded text-sm font-medium underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent ${sampleColour}`}
        >
          <FileText className="h-4 w-4" aria-hidden />
          {sampleLabel}
          <ArrowRight className="h-3.5 w-3.5" aria-hidden />
        </Link>
      )}
    </div>
  );
}
