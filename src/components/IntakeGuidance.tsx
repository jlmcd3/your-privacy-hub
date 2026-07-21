import { type ReactNode } from "react";
import { Lightbulb } from 'lucide-react';

/**
 * Prominent, non-error guidance shown beneath free-form intake fields.
 * Uses the app's amber "note" treatment — NOT the red/destructive treatment,
 * which is reserved for validation errors and warnings.
 * To recolour ALL guidance globally, edit only the three colour classes below.
 */
export function IntakeGuidance({
  children,
  lead = "For the best result:",
  className = "",
}: {
  children: ReactNode;
  lead?: string;
  className?: string;
}) {
  return (
    <div
      role="note"
      className={`rounded-r border-l-4 border-amber-400 bg-amber-50/70 dark:bg-amber-950/20 px-3 py-2 text-sm text-amber-900 dark:text-amber-200 ${className}`}
    >
      <span aria-hidden="true" className="mr-1.5"><Lightbulb aria-hidden="true" className="inline w-[1em] h-[1em] align-[-0.125em]" strokeWidth={1.75} /></span>
      <span className="font-semibold">{lead}</span>{" "}
      {children}
    </div>
  );
}
