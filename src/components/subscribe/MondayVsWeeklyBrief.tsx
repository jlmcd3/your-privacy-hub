/**
 * MondayVsWeeklyBrief — compact side-by-side clarifier used ONLY in the
 * Subscribe page free-digest section.
 *
 * Purpose: make it unambiguous that the free "Monday Privacy Intelligence
 * Report" is a different, shorter product than the subscriber-tier
 * "Weekly Brief" (Weekly Privacy Intelligence Report). Phrased factually;
 * left column is not denigrating, right column shows what upgrading adds.
 *
 * Left-column claims trace to supabase/functions/generate-free-digest/index.ts.
 * Right-column claims trace to the weekly brief pipeline referenced across
 * WeeklyBriefTeaser.tsx and BriefBuilder.tsx (8 sections including exec
 * summary, enforcement table with fines, trend signal, action items,
 * role/industry customisation).
 *
 * Guardrail: no CTAs, no pricing, no signup mechanics — clarity only.
 */
interface Row {
  label: string;
  free: string;
  paid: string;
}

const ROWS: Row[] = [
  {
    label: "Format",
    free: "Filtered headline digest — up to 8 items",
    paid: "8-section synthesised report",
  },
  {
    label: "Personalisation",
    free: "By region (up to 2) and topic (up to 2)",
    paid: "By role, industry, jurisdictions, and priorities",
  },
  {
    label: "Analysis depth",
    free: "One-line \"why it matters\" per headline",
    paid: "Executive summary, regional deep-dives, trend signal",
  },
  {
    label: "Enforcement table",
    free: "Not included",
    paid: "Full table with fine amounts and legal basis",
  },
  {
    label: "Action items",
    free: "Not included",
    paid: "Role-specific action items and \"why this matters\"",
  },
  {
    label: "Cadence",
    free: "Monday; skipped in weeks with fewer than 3 matches",
    paid: "Every Monday",
  },
];

const MondayVsWeeklyBrief = ({ className = "" }: { className?: string }) => (
  <div
    className={`border border-brand-cloud rounded-xl overflow-hidden ${className}`}
    aria-label="Comparison: Monday Report and Weekly Brief"
  >
    <div className="grid grid-cols-3 text-xs bg-brand-navy text-white">
      <div className="px-3 py-2 font-semibold border-r border-white/10">Feature</div>
      <div className="px-3 py-2 font-semibold border-r border-white/10">
        Monday Report — free
      </div>
      <div className="px-3 py-2 font-semibold">
        Weekly Brief — subscribers
      </div>
    </div>
    {ROWS.map((row, i) => (
      <div
        key={row.label}
        className={`grid grid-cols-3 text-xs ${
          i % 2 === 0 ? "bg-white" : "bg-brand-cloud/40"
        }`}
      >
        <div className="px-3 py-2 font-medium text-brand-navy border-r border-brand-cloud">
          {row.label}
        </div>
        <div className="px-3 py-2 text-gray-700 border-r border-brand-cloud">
          {row.free}
        </div>
        <div className="px-3 py-2 text-gray-700">{row.paid}</div>
      </div>
    ))}
  </div>
);

export default MondayVsWeeklyBrief;
