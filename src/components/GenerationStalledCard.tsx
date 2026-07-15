// Shared failure UI for the two "server truth says this run is dead" phases.
// Rendered when useGenerationStatus reports `stalled` or `stalled_pre_dispatch`.
//
// Copy notes:
// - Never uses the word "gap" (courier constraint).
// - Retry CTA points back to the intake page for the tool; support contact
//   is a plain mailto so users always have a fallback path.

import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

interface Props {
  variant: "stalled" | "stalled_pre_dispatch";
  retryHref: string;
  supportEmail?: string;
  onRefresh?: () => void;
}

export default function GenerationStalledCard({
  variant,
  retryHref,
  supportEmail = "support@enduserprivacy.com",
  onRefresh,
}: Props) {
  const isPreDispatch = variant === "stalled_pre_dispatch";
  const headline = isPreDispatch
    ? "This run never started."
    : "This run did not complete.";
  const body = isPreDispatch
    ? "Your order was accepted but the generator was never dispatched. Nothing further will happen on this page. Start a new run below, or contact us and reference this URL — we will investigate and refund or credit as appropriate."
    : "The generator stopped responding and the run has been left in a non-terminal state past our 20-minute limit. Nothing further will happen on this page. Start a new run below, or contact us and reference this URL — we will investigate and refund or credit as appropriate.";

  return (
    <div className="bg-card border border-border rounded-lg p-6 space-y-4" role="alert" aria-live="assertive">
      <div>
        <p className="font-medium text-red-700 mb-1">{headline}</p>
        <p className="text-sm text-muted-foreground">{body}</p>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <Button asChild>
          <Link to={retryHref}>Start a new run</Link>
        </Button>
        {onRefresh && (
          <Button variant="outline" onClick={onRefresh}>
            Re-check status
          </Button>
        )}
        <a
          href={`mailto:${supportEmail}?subject=Generation%20did%20not%20complete&body=${encodeURIComponent(
            typeof window !== "undefined" ? window.location.href : "",
          )}`}
          className="text-sm underline text-brand-navy focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-action focus-visible:ring-offset-2 rounded"
        >
          Contact support
        </a>
      </div>
    </div>
  );
}
