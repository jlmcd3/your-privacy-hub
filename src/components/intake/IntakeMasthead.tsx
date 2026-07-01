import type { RunMeter } from "@/hooks/useRunMeter";

export default function IntakeMasthead({
  kicker,
  title,
  subjectLabel,
  subjectValue,
  meter,
  preRunHint,
}: {
  kicker: string; // e.g. "CPPA Risk Assessment · 11 CCR §§ 7150–7157"
  title: string; // the current step question, serif
  subjectLabel?: string; // "Assessment subject · locked" (omit before run 1)
  subjectValue?: string;
  meter?: RunMeter | null;
  /** Shown when there is no meter yet (new assessment, pre-run-1). */
  preRunHint?: string;
}) {
  return (
    <div className="relative overflow-hidden rounded-t-2xl bg-gradient-to-br from-brand-navy to-brand-shadow px-9 py-8 text-white">
      <div className="pointer-events-none absolute -right-16 -top-20 h-72 w-72 rounded-full bg-[radial-gradient(circle,hsl(var(--brand-teal)/0.14),transparent_66%)]" />
      <p className="text-label-caps uppercase tracking-[0.16em] text-brand-light-teal font-semibold mb-2.5">
        {kicker}
      </p>
      <h1 className="font-serif-text font-semibold text-[27px] leading-tight tracking-[-0.01em] max-w-2xl">
        {title}
      </h1>
      {!meter && !subjectValue && preRunHint && (
        <p className="relative z-10 mt-3 text-body-small text-brand-mist max-w-2xl">
          {preRunHint}
        </p>
      )}
      <div className="relative z-10 mt-4 flex flex-wrap items-end gap-5">
        {subjectValue && (
          <div className="flex items-center gap-2.5 rounded-lg border border-white/20 bg-white/[0.06] px-3.5 py-2">
            <span aria-hidden>🔒</span>
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
    </div>
  );
}
