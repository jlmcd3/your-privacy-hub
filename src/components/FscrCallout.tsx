// Collapsible 'Why does the Agency require this?' callout.

import { useState } from "react";
import type { FscrCalloutMap } from "@/hooks/useFscrCallouts";

interface FscrCalloutProps {
  citation: string;
  callouts: FscrCalloutMap;
}

export function FscrCallout({ citation, callouts }: FscrCalloutProps) {
  const [open, setOpen] = useState(false);
  const text = callouts[citation];
  if (!text) return null;

  return (
    <div className="mt-2">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
      >
        <span>{open ? "▾" : "▸"}</span>
        <span>Why does the Agency require this?</span>
      </button>
      {open && (
        <div className="mt-2 pl-3 border-l-2 border-brand-navy/30 text-xs text-foreground/80 leading-relaxed">
          {text}
          <span className="block mt-1 font-mono text-[10px] text-muted-foreground">
            Source: CPPA Final Statement of Reasons · {citation}
          </span>
        </div>
      )}
    </div>
  );
}
