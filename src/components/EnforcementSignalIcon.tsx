// Small enforcement signal icon that opens a popover with corpus-derived context.

import { useState } from "react";
import { AlertTriangle } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import type { EnforcementSignalMap } from "@/hooks/useEnforcementSignals";

interface EnforcementSignalIconProps {
  signalKey: string;
  signals: EnforcementSignalMap;
}

export function EnforcementSignalIcon({ signalKey, signals }: EnforcementSignalIconProps) {
  const signal = signals[signalKey];
  const [open, setOpen] = useState(false);
  if (!signal || signal.caseCount === 0) return null;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="inline-flex items-center justify-center rounded-sm p-0.5 text-amber-600 hover:text-amber-700 transition-colors"
          aria-label="Enforcement signal"
          onClick={(e) => e.stopPropagation()}
        >
          <AlertTriangle className="w-3.5 h-3.5" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-[340px] p-4 space-y-2" side="top" align="start" sideOffset={4}>
        <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">
          Enforcement signal — {signal.caseCount} cases in corpus
        </p>
        <p className="text-xs leading-relaxed text-foreground">{signal.summary}</p>
        <p className="font-mono text-[11px] text-muted-foreground pt-1 border-t">
          End User Privacy enforcement corpus · 119 regulators
        </p>
      </PopoverContent>
    </Popover>
  );
}
