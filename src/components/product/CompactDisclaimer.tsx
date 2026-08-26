// PRE-INTAKE REDESIGN (2026-08-26) — compressed disclaimer.
// One visible line, with the full existing disclaimer + warranty language
// (unchanged bytes — rendered via ToolDisclaimer) inside an expandable
// "Legal notes" disclosure, so legal boilerplate is accessible but no
// longer the final obstacle before the product starts.
import { ChevronDown } from "lucide-react";
import ToolDisclaimer from "@/components/ToolDisclaimer";

export default function CompactDisclaimer({
  line,
  addition,
  className = "",
}: {
  /** The single visible summary line, e.g. "Analytical aid only — …". */
  line: string;
  /** Tool-specific tail sentence forwarded to ToolDisclaimer unchanged. */
  addition?: string;
  className?: string;
}) {
  return (
    <div className={className}>
      <p className="text-meta text-muted-foreground">{line}</p>
      <details className="group mt-1">
        <summary className="cursor-pointer list-none inline-flex items-center gap-1 text-meta text-muted-foreground underline underline-offset-2 hover:text-foreground">
          Legal notes
          <ChevronDown
            aria-hidden
            className="h-3 w-3 transition-transform group-open:rotate-180"
          />
        </summary>
        <ToolDisclaimer addition={addition} />
      </details>
    </div>
  );
}
