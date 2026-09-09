// DOC 235 §2 — FACTOR → ELEMENT (ADMT's own copy of the doc 213 §2 pattern,
// mirroring `factor-element.ts` (LIA), `dpia-factor-element.ts` (doc 232)
// and `risk-factor-element.ts` (doc 231)).
//
// ADMT's `bears_on_element` is FACTOR-LEVEL, not a grouped three-part test
// — the same doc 229/231 §8 "default #1" choice CPPA Risk's build made for
// its own CAM-derived factors. `admtElementOf` is therefore an identity map
// over the NINE known ADMT factor ids: the eight `admt-corpus-map.ts`
// `factor_id` values (the same eight strings `buildFactorMatrixTable()`/
// `deriveAdmtFiredStates()` already key on) plus — DOC 241 (2026-09-09) —
// the Section 7 Governance factor (`ADMT_GOVERNANCE_FACTOR_ID`, exported
// from admt-corpus-map.ts; the exact string the three live Governance
// profiles carry in `factor_ids`), which had no element and left doc 236's
// G1–G3 excluded BY NAME (doc 236 §3 / §8.2). A hook whose factor is
// outside these nine is EXCLUDED by name at generation, never emitted with
// a blank.
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
  // DOC 241 — Section 7's factor (see the header). Copied, not imported,
  // from admt-corpus-map.ts's ADMT_GOVERNANCE_FACTOR_ID (doc 213 §2 forbids
  // cross-function imports); the doc235 registry pin test holds the two
  // equal.
  "Governance, Record Sufficiency, and Related Risk-Assessment Obligations",
] as const;

export type AdmtFactorId = (typeof ADMT_FACTORS)[number];

export const ADMT_FACTOR_ELEMENT: Readonly<Record<AdmtFactorId, AdmtFactorId>> = Object.fromEntries(
  ADMT_FACTORS.map((f) => [f, f]),
) as Readonly<Record<AdmtFactorId, AdmtFactorId>>;

export function admtElementOf(factorId: string): string | null {
  return (ADMT_FACTOR_ELEMENT as Readonly<Record<string, string>>)[factorId] ?? null;
}
