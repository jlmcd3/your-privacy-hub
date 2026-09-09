// DOC 213 §2 / DOC 229 §8 / DOC 231 — FACTOR → "ELEMENT" for CPPA Risk.
//
// LIA's `liaElementOf` (factor-element.ts) maps ~11 CAM factor labels onto
// the three-part-test's three elements (purpose/necessity/balancing) — a
// real GROUPING, because a hook's `{section}` slot and engine-verdict
// lookup need to key on one of three things.
//
// CPPA RISK HAS NO EQUIVALENT GROUPING (doc 229 §8, ORCHESTRATOR DEFAULT
// #1, CEO may override): `bears_on_element` is FACTOR-LEVEL — the CAM's own
// `factor_id` string (_shared/corpus/maps/risk-corpus-map.ts), unchanged.
// This function is therefore an IDENTITY map over the closed list of 17
// known factor_id values (the same 17 the hook-join's own
// `FACTOR_SECTION` — run-cppa-risk-assessment-v2/_local/ltp/hook-join.ts —
// resolves to a § 7150–7157 pinpoint), returning `factorId` itself when it
// is one of the 17, and `null` (excluded by name at generate time, never a
// blank) otherwise — the same fail-closed discipline `liaElementOf` uses
// for an unmapped factor.

const RISK_KNOWN_FACTORS: ReadonlySet<string> = new Set([
  "Regulatory trigger and applicability",
  "Material privacy risks",
  "Processing purpose specificity",
  "Safeguards",
  "Approval and authority",
  "Stakeholder involvement and information providers",
  "Processing methods and coherence",
  "Retention",
  "Consumer interaction and scale",
  "Transparency and disclosures",
  "Consumer benefit",
  "ADMT made available to another business",
  "Benefits-risks balancing",
  "Assessment timing and material changes",
  "Assessment retention",
  "Prior DPIA or other assessment",
  "CPPA submission and certifying executive",
]);

export function riskElementOf(factorId: string): string | null {
  return RISK_KNOWN_FACTORS.has(factorId) ? factorId : null;
}
