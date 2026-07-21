/**
 * UX-2d — Report / Doc Masthead.
 *
 * 64px navy band with the End User Privacy mark + wordmark, a mono
 * statutory-citation slot, and a right-aligned reference-code slot.
 * Intended for the top of generated report shells and for print/PDF
 * capture where the app chrome is stripped.
 */
import { cn } from "@/lib/utils";

interface ReportMastheadProps {
  /** Short document title. */
  title: string;
  /** Mono statute or citation slot (e.g. "GDPR Art. 35 · DPIA"). */
  statuteCite?: string;
  /** Right-side reference code (e.g. "REP-2026-0142"). */
  refCode?: string;
  className?: string;
}

export function ReportMasthead({
  title,
  statuteCite,
  refCode,
  className,
}: ReportMastheadProps) {
  return (
    <header
      className={cn(
        "bg-brand-navy text-white h-16 flex items-center px-6 border-b border-white/10",
        className,
      )}
    >
      <img
        src="/brand/icon-dark.svg"
        alt=""
        aria-hidden="true"
        className="h-8 w-8 mr-3 shrink-0"
      />
      <div className="min-w-0 flex-1">
        <div className="text-[15px] font-semibold leading-tight truncate">
          End User Privacy · {title}
        </div>
        {statuteCite && (
          <div className="font-mono text-[11.5px] text-white/75 leading-snug truncate">
            {statuteCite}
          </div>
        )}
      </div>
      {refCode && (
        <div className="font-mono text-[11.5px] text-white/70 tracking-wider uppercase ml-4 shrink-0">
          {refCode}
        </div>
      )}
    </header>
  );
}

export default ReportMasthead;
