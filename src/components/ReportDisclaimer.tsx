// Unobtrusive, final-element report disclaimer. Renders the single universal
// text exactly once at the end of a finished report surface.

import { REPORT_DISCLAIMER } from "@/lib/reportDisclaimer";

export default function ReportDisclaimer({ className = "" }: { className?: string }) {
  return (
    <p
      data-report-disclaimer
      className={`border-t border-border/40 pt-3 mt-6 text-[11px] leading-relaxed text-muted-foreground ${className}`}
    >
      {REPORT_DISCLAIMER}
    </p>
  );
}
