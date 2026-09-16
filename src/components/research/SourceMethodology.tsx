// SourceMethodology — compact bordered module. Optionally carries a
// "Last verified" date for the sourcing methodology itself (distinct from the
// page-level "Legally verified" line in ResearchPageHeader). When no date is
// passed, nothing is rendered rather than inventing one.
// All consumers use the same site-wide sourcing language.

export default function SourceMethodology({
  className,
  lastVerified,
  variant: _variant = "default",
}: {
  className?: string;
  lastVerified?: string;
  variant?: "default" | "research";
}) {
  return (
    <aside
      className={`rounded-xl border border-brand-cloud bg-card px-5 py-4 md:px-6 md:py-5 ${className ?? ""}`}
      aria-label="How this page is sourced"
    >
      <h3 className="font-display text-brand-navy text-base md:text-lg mb-2 leading-tight">
        How this page is sourced
      </h3>
      <p className="text-sm text-slate leading-6 m-0">
        Information on this page links to or is sourced from primary sources, such as statutes,
        regulations, and regulator publications.
      </p>
      <p className="mt-3 text-sm text-slate leading-6 m-0">
        Content is maintained under a periodic review cycle and is not represented to be up to
        date and does not constitute legal advice.
      </p>
      {lastVerified ? (
        <p className="mt-3 text-xs text-slate m-0">
          <span className="font-medium text-brand-navy">Last verified:</span> {lastVerified}
        </p>
      ) : null}
    </aside>
  );
}
