/**
 * AssertionLevel — Doc N Step 2b/2c.
 *
 * Three-segment epistemic-basis control rendered UNDER an existing
 * answer control on designated evidence-heavy questions when the
 * Improvement Kit flag is on.
 *
 *   CONFIRMED — "I/we checked this directly"
 *   BELIEVED  — "based on our standard template, policy, or practice"
 *   UNKNOWN   — treated as an unanswered evidence question (validation
 *               falls through to the existing missing-answer check)
 *
 * Selecting BELIEVED reveals four one-tap basis chips:
 *   Standard template / Written policy / Standard practice / Skip
 * No free text anywhere. No selection = legacy (nothing written to
 * intake_data.assertions for that field).
 */
import { cn } from "@/lib/utils";
import type { AssertionEntry, AssertionState, AssertionBasis } from "@/config/improvementKit";

interface AssertionLevelProps {
  fieldId: string;
  value: AssertionEntry | undefined;
  onChange: (next: AssertionEntry | undefined) => void;
}

const COPY =
  "Most organizations answer questions like this from their standard template or written policy — that is a valid basis for the record.";

// RC-Cleanup2 (CEO-ratified 2026-07-14): "Unknown / Not sure" removed. Users
// who cannot attest simply leave the field unasserted — every backend consumer
// (insufficient-info-guard.ts believedWithBasis, run-cppa-risk-assessment
// strengthen membership) already filters on state==="believed" && basis, so
// "unknown" was semantically equivalent to no assertion at every read site.
// Legacy rows carrying state:"unknown" continue to read through as no-op.
const STATE_OPTIONS: { key: AssertionState; label: string; sub: string }[] = [
  { key: "confirmed", label: "Confirmed", sub: "I/we checked this directly" },
  { key: "believed", label: "Believed", sub: "Based on our standard template, policy, or practice" },
];

const BASIS_OPTIONS: { key: Exclude<AssertionBasis, null> | "skip"; label: string }[] = [
  { key: "standard_template", label: "Standard template" },
  { key: "written_policy", label: "Written policy" },
  { key: "standard_practice", label: "Standard practice" },
  { key: "skip", label: "Skip" },
];

export function AssertionLevel({ fieldId, value, onChange }: AssertionLevelProps) {
  const state = value?.state;
  const basis = value?.basis;

  const setState = (next: AssertionState) => {
    // Clicking the currently-selected state clears the assertion entirely —
    // this is the "I can't attest to this" affordance that replaces the
    // former "Unknown" option. Absent assertions are the backend's no-op.
    if (state === next) {
      onChange(undefined);
      return;
    }
    if (next === "believed") {
      onChange({ state: "believed", basis: basis ?? null });
    } else {
      onChange({ state: next, basis: null });
    }
  };

  const setBasis = (next: Exclude<AssertionBasis, null> | "skip") => {
    if (next === "skip") {
      onChange({ state: "believed", basis: null });
      return;
    }
    onChange({ state: "believed", basis: next });
  };

  return (
    <div
      className="mt-3 rounded-md border border-border/70 bg-muted/30 p-3"
      data-assertion-field={fieldId}
    >
      <p className="text-xs text-muted-foreground italic mb-2">{COPY}</p>
      <div role="radiogroup" aria-label="Basis for this answer" className="flex flex-wrap gap-2">
        {STATE_OPTIONS.map((opt) => {
          const selected = state === opt.key;
          return (
            <button
              type="button"
              key={opt.key}
              role="radio"
              aria-checked={selected}
              onClick={() => setState(opt.key)}
              className={cn(
                "flex-1 min-w-[9rem] rounded-md border px-3 py-2 text-left text-xs transition-colors",
                selected
                  ? "border-primary bg-primary/10 text-foreground"
                  : "border-border bg-background text-muted-foreground hover:bg-muted",
              )}
            >
              <div className="font-medium text-foreground">{opt.label}</div>
              <div className="text-[11px] leading-tight mt-0.5">{opt.sub}</div>
            </button>
          );
        })}
      </div>
      {state === "believed" && (
        <div className="mt-3">
          <div className="text-xs text-muted-foreground mb-1.5">Basis:</div>
          <div className="flex flex-wrap gap-1.5">
            {BASIS_OPTIONS.map((opt) => {
              const selected =
                (opt.key === "skip" && basis === null) ||
                (opt.key !== "skip" && basis === opt.key);
              return (
                <button
                  type="button"
                  key={opt.key}
                  onClick={() => setBasis(opt.key)}
                  className={cn(
                    "rounded-full border px-3 py-1 text-xs transition-colors",
                    selected
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-background text-muted-foreground hover:bg-muted",
                  )}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
