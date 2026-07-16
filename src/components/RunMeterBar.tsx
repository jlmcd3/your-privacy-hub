import { Link } from "react-router-dom";
import type { RunMeter } from "@/hooks/useRunMeter";
import { REVISIONS_ENABLED } from "@/lib/revisionGate";

export default function RunMeterBar({
  meter,
  refineHref,
  onExtend,
  infoNeededCount,
}: {
  meter: RunMeter;
  refineHref: string;
  onExtend: () => void;
  infoNeededCount?: number;
}) {

  const exhausted = meter.runsRemaining <= 0;
  const last = meter.runsRemaining === 1;
  return (
    <div className="flex flex-wrap items-center gap-4 bg-paper border border-rule rounded-xl px-5 py-3.5 my-4">
      <div>
        <div className="text-body-small font-semibold text-brand-navy">
          Generation {meter.runsUsed} of {meter.runsAllowed}
        </div>
        <div className="flex gap-1.5 mt-1.5">
          {Array.from({ length: meter.runsAllowed }).map((_, i) => (
            <span
              key={i}
              className={`h-1.5 w-6 rounded-full ${
                i < meter.runsUsed ? "bg-teal-action" : "bg-brand-cloud"
              }`}
            />
          ))}
        </div>
      </div>
      <div className="text-body-small text-ink-soft max-w-sm">
        {exhausted
          ? "Need more? Add 4 additional generations for half the tool price."
          : infoNeededCount && infoNeededCount > 0
          ? `This report names ${infoNeededCount} item${infoNeededCount === 1 ? "" : "s"} that would sharpen it — refine those answers and regenerate.`
          : last
          ? "One generation left — refine your inputs before running it."
          : "Refine your answers and regenerate. Edits are free; a generation is spent only when you regenerate."}
      </div>

      <div className="ml-auto flex gap-2">
        {!exhausted && REVISIONS_ENABLED && (
          <Link
            to={refineHref}
            className="px-4 py-2 rounded-lg border border-rule-strong text-brand-navy text-body-small font-semibold hover:bg-brand-cloud/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-action focus-visible:ring-offset-2"
          >
            Refine inputs
          </Link>
        )}
        {exhausted && (
          <button
            onClick={onExtend}
            className="px-4 py-2 rounded-lg bg-teal-action hover:bg-[hsl(var(--teal-action-hover))] text-white text-body-small font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-action focus-visible:ring-offset-2"
          >
            Add 4 additional generations
          </button>
        )}
      </div>
    </div>
  );
}
