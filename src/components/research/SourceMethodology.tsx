// SourceMethodology — compact bordered module. Optionally carries a
// "Last verified" date for the sourcing methodology itself (distinct from the
// page-level "Legally verified" line in ResearchPageHeader). When no date is
// passed, nothing is rendered rather than inventing one.
import { Link, useLocation } from "react-router-dom";

export default function SourceMethodology({
  className,
  lastVerified,
}: {
  className?: string;
  lastVerified?: string;
}) {
  const { pathname } = useLocation();
  const contactHref = `/contact?subject=${encodeURIComponent(
    "Correction request",
  )}&page=${encodeURIComponent(pathname)}`;

  return (
    <aside
      className={`rounded-xl border border-brand-cloud bg-card px-5 py-4 md:px-6 md:py-5 ${className ?? ""}`}
      aria-label="How this page is sourced"
    >
      <h3 className="font-display text-brand-navy text-base md:text-lg mb-2 leading-tight">
        How this page is sourced
      </h3>
      <p className="text-sm text-slate leading-6 m-0">
        Every legal claim on this page links to or is derived from primary sources — statutes,
        regulations, and regulator publications — calibrated against our enforcement corpus.
        Content is maintained under an internal review cycle.
      </p>
      <p className="mt-3 text-sm text-slate leading-6 m-0">
        We are working toward marking every citation as binding law, regulator guidance, or
        End User Privacy analysis. This page supports, but does not replace, review by
        qualified legal counsel.
      </p>
      {lastVerified ? (
        <p className="mt-3 text-xs text-slate m-0">
          <span className="font-medium text-brand-navy">Last verified:</span> {lastVerified}
        </p>
      ) : null}
      <p className="mt-3 text-sm m-0">
        <Link
          to={contactHref}
          className="text-brand-teal-text font-medium hover:underline no-underline"
        >
          Report an error →
        </Link>
      </p>
    </aside>
  );
}
