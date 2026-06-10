import { useState } from "react";
import { Info } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

interface InfoPopoverProps {
  term: string;
  children: React.ReactNode;
  cite?: string;
}

export function InfoPopover({ term, children, cite }: InfoPopoverProps) {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="inline-flex items-center justify-center rounded-sm p-0.5 text-muted-foreground hover:text-brand-navy transition-colors"
          aria-label={`Definition: ${term}`}
          onClick={(e) => e.stopPropagation()}
        >
          <Info className="w-3.5 h-3.5" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[320px] p-4 space-y-2"
        side="top"
        align="start"
        sideOffset={4}
      >
        <p className="text-sm font-semibold">{term}</p>
        <div className="text-xs leading-relaxed text-foreground">{children}</div>
        {cite && (
          <p className="font-mono text-[11px] text-muted-foreground pt-1 border-t">
            {cite}
          </p>
        )}
      </PopoverContent>
    </Popover>
  );
}
