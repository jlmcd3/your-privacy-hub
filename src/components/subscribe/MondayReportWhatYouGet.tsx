/**
 * MondayReportWhatYouGet — "What you get" descriptor for the free
 * Monday Privacy Intelligence Report (aka Monday Report).
 *
 * All content claims trace to supabase/functions/generate-free-digest/index.ts
 * and the free_digests table shape:
 *   - up to 8 headlines per week (skipped when <3 matches)
 *   - filtered by the user's chosen regions (up to 2) and topics (up to 2)
 *   - each item: region label, source, headline, short "why it matters" line, link
 *   - optional single-sentence cross-jurisdiction pattern observation
 *   - weekly cadence; ops delivery Monday morning
 *
 * Design intent: clarify, do not promote. Used in three places where the
 * free product already surfaces (Subscribe free-digest area, Dashboard free
 * digest area, GetIntelligence). No new CTAs are introduced here.
 */
import { Mail } from "lucide-react";

interface Props {
  /** Visual density. `compact` for cards, `default` for standalone sections. */
  variant?: "default" | "compact";
  className?: string;
}

const MondayReportWhatYouGet = ({ variant = "default", className = "" }: Props) => {
  const pad = variant === "compact" ? "p-4" : "p-5 md:p-6";
  return (
    <div
      className={`bg-white/60 border border-brand-cloud rounded-xl ${pad} ${className}`}
      aria-labelledby="monday-report-what-you-get"
    >
      <p className="text-[11px] font-bold tracking-widest uppercase text-brand-steel mb-2">
        <Mail aria-hidden="true" className="inline w-[1em] h-[1em] align-[-0.125em] mr-1" strokeWidth={1.75} />
        Monday Privacy Intelligence Report — what you get
      </p>
      <p
        id="monday-report-what-you-get"
        className="text-sm text-gray-800 leading-relaxed mb-3"
      >
        A short, personalised headline digest of the past week's privacy
        regulatory activity, filtered to the regions and topics you pick,
        delivered every Monday morning.
      </p>
      <ul className="text-sm text-gray-700 leading-relaxed space-y-1.5 list-disc pl-5">
        <li>
          Up to 8 headlines from your chosen regions (up to 2) and topics (up
          to 2), with source, jurisdiction, a one-line "why it matters" note,
          and a direct link to the original development.
        </li>
        <li>
          One optional cross-jurisdiction pattern observation when the same
          topic surfaces from multiple authorities in the same week.
        </li>
        <li>
          Sent weekly on Monday. Skipped in weeks with fewer than 3 matching
          developments for your preferences.
        </li>
        <li>
          Preferences are editable at any time; changes apply to the next
          Monday send.
        </li>
      </ul>
    </div>
  );
};

export default MondayReportWhatYouGet;
