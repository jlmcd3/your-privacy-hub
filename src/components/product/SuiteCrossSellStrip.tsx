// PRE-INTAKE REDESIGN (2026-08-26) — shared CPPA suite cross-sell strip.
// Rendered after the output/trust cards on all three CPPA module pages;
// replaces the ADMT-only cross-sell box that used to sit below the masthead.
import { Link } from "react-router-dom";

export default function SuiteCrossSellStrip({
  note,
  className = "",
}: {
  /** Optional trailing note, e.g. "ADMT remains standalone." on M3. */
  note?: string;
  className?: string;
}) {
  return (
    <div className={`max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 ${className}`}>
      <div className="rounded-md border border-brand-teal/30 bg-brand-cloud/40 px-4 py-3 text-sm">
        <span className="font-semibold text-brand-navy">
          Need both Risk + Cybersecurity?
        </span>{" "}
        <span className="text-muted-foreground">The </span>
        <Link
          to="/cppa-risk-assessment?suite=true"
          className="text-brand-teal-text underline"
        >
          CPPA Full Audit Suite
        </Link>
        <span className="text-muted-foreground"> bundles M1 + M2 at a discount.</span>
        {note ? <span className="text-muted-foreground"> {note}</span> : null}
      </div>
    </div>
  );
}
