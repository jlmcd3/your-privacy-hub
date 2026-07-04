// SourceMethodology — compact bordered module. No dates of any kind (standing
// directive). See C-1 in EUP_Public_Page_Recommendations.
import { Link, useLocation } from "react-router-dom";

export default function SourceMethodology({ className }: { className?: string }) {
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
      <p className="mt-3 text-sm m-0">
        <Link
          to={contactHref}
          className="text-brand-teal font-medium hover:underline no-underline"
        >
          Report an error →
        </Link>
      </p>
    </aside>
  );
}
