// DOC 235 §2 — FACTOR → ELEMENT (ADMT's own copy of the doc 213 §2 pattern,
// mirroring `factor-element.ts` (LIA), `dpia-factor-element.ts` (doc 232)
// and `risk-factor-element.ts` (doc 231)).
//
// ADMT's `bears_on_element` is FACTOR-LEVEL, not a grouped three-part test
// — the same doc 229/231 §8 "default #1" choice CPPA Risk's build made for
// its own CAM-derived factors. `admtElementOf` is therefore an identity map
// over the eight known `admt-corpus-map.ts` `factor_id` values (the same
// eight strings `buildFactorMatrixTable()`/`deriveAdmtFiredStates()`
// already key on) — a hook whose factor is outside these eight is EXCLUDED
// by name at generation, never emitted with a blank.
//
// A verbatim copy of `ADMT_FACTOR_PHRASES`' key set (the canonical source:
// `run-admt-checker-v2/_local/corpus/maps/admt-hooks.ts`). Copied, not
// imported: doc 213 §2 forbids cross-function imports. A pin test
// (tests/edge/corpus/doc235-admt-registry-and-context-block.test.ts) checks
// this copy against the canonical map in both directions.

const ADMT_FACTORS = [
  "Significant decision",
  "Human involvement",
  "Advertising exclusion",
  "Notice delivery",
  "Notice content",
  "Opt-out pathway",
  "Access process",
  "Vendor dependency",
] as const;

export type AdmtFactorId = (typeof ADMT_FACTORS)[number];

export const ADMT_FACTOR_ELEMENT: Readonly<Record<AdmtFactorId, AdmtFactorId>> = Object.fromEntries(
  ADMT_FACTORS.map((f) => [f, f]),
) as Readonly<Record<AdmtFactorId, AdmtFactorId>>;

export function admtElementOf(factorId: string): string | null {
  return (ADMT_FACTOR_ELEMENT as Readonly<Record<string, string>>)[factorId] ?? null;
}
