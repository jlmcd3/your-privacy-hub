import type { ReactNode } from "react";
import type { RunMeter } from "@/hooks/useRunMeter";
import { Lock } from 'lucide-react';

// PRE-INTAKE REDESIGN (2026-08-26) — compact workspace header, not a second
// hero: reduced padding/title size so the first intake question is visible
// immediately, explicit text-white on the title (the global h1 navy rule is
// only overridden inside .bg-brand-navy containers, and this gradient band
// rendered the title dark-on-dark on every product), and a `clientSlot` so
// the active-client selector lives in the workspace header instead of a
// standalone pre-intake row.
export default function IntakeMasthead({
  kicker,
  title,
  subjectLabel,
  subjectValue,
  meter,
  preRunHint,
  clientSlot,
  stepLabel,
}: {
  kicker: string; // e.g. "CPPA Risk Assessment · 11 CCR §§ 7150–7157"
  title: string; // the current step question, serif
  subjectLabel?: string; // "Assessment subject · locked" (omit before run 1)
  subjectValue?: string;
  meter?: RunMeter | null;
  /** Shown when there is no meter yet (new assessment, pre-run-1). */
  preRunHint?: string;
  /** Active-client selector, rendered top-right ("For: {client} · Change"). */
  clientSlot?: ReactNode;
  /** Progress indicator, e.g. "Step 2 of 6" — rendered inside the header. */
  stepLabel?: string;
}) {
  return (
    <div className="relative overflow-hidden rounded-t-2xl bg-gradient-to-br from-brand-navy to-brand-shadow px-6 py-5 text-white">
      <div className="pointer-events-none absolute -right-16 -top-20 h-72 w-72 rounded-full bg-[radial-gradient(circle,hsl(var(--brand-teal)/0.14),transparent_66%)]" />
      <div className="relative z-10 flex flex-wrap items-start justify-between gap-x-6 gap-y-1.5">
        <p className="text-label-caps uppercase tracking-[0.16em] text-brand-light-teal font-semibold mb-1.5">
          {kicker}
          {stepLabel ? (
            <span className="ml-2 font-medium text-brand-mist" aria-live="polite">
              · {stepLabel}
            </span>
          ) : null}
        </p>
        {clientSlot ? <div className="shrink-0">{clientSlot}</div> : null}
      </div>

      <h1 className="relative z-10 font-serif-text font-semibold text-white text-[22px] leading-tight tracking-[-0.01em] max-w-2xl">
        {title}
      </h1>
      {!meter && !subjectValue && preRunHint && (
        <p className="relative z-10 mt-2 text-body-small text-brand-mist max-w-2xl">
          {preRunHint}
        </p>
      )}
      {(subjectValue || meter) && (
      <div className="relative z-10 mt-3 flex flex-wrap items-end gap-5">
        {subjectValue && (
          <div className="flex items-center gap-2.5 rounded-lg border border-white/20 bg-white/[0.06] px-3.5 py-2">
            <span aria-hidden><Lock aria-hidden="true" className="inline w-[1em] h-[1em] align-[-0.125em]" strokeWidth={1.75} /></span>
            <span className="text-body-small font-semibold">
              <span className="block text-[10px] uppercase tracking-[0.1em] text-brand-mist font-medium">
                {subjectLabel}
              </span>
              {subjectValue}
            </span>
          </div>
        )}
        {meter && (
          <div className="ml-auto text-right">
            <p className="text-body-tiny text-brand-mist mb-1.5">
              Generation {meter.runsUsed} of {meter.runsAllowed} · edits are free until you regenerate
            </p>
            <div className="flex justify-end gap-1.5">
              {Array.from({ length: meter.runsAllowed }).map((_, i) => (
                <span
                  key={i}
                  className={`h-[5px] w-[22px] rounded ${
                    i < meter.runsUsed ? "bg-brand-light-teal" : "bg-white/15"
                  }`}
                />
              ))}
            </div>
          </div>
        )}
      </div>
      )}
    </div>
  );
}
