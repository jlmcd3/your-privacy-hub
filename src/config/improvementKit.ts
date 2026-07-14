/**
 * Improvement Kit feature flag (Doc N R6).
 *
 * Default OFF. Flipping to true enables assertion-level controls on the
 * fields designated in `IMPROVEMENT_KIT_DESIGNATED_FIELDS` below. With
 * an empty designated list the flag is a no-op (safe scaffolding-only
 * deploy while Katherine's P4 field enumeration is outstanding).
 *
 * Fallback mechanism per Doc N Step 1b: the project has no pre-existing
 * feature-flag system, so a simple config constant is used per R6's
 * explicit allowance.
 */
export const IMPROVEMENT_KIT_ENABLED = false;

/**
 * Designated evidence-heavy field ids that receive the AssertionLevel
 * control when IMPROVEMENT_KIT_ENABLED is true.
 *
 * EMPTY = P4 outstanding (Katherine). Flag ON + empty array =
 * zero visible change (Doc N Step 3 scaffolding-only deploy).
 *
 * Ids in this list MUST be real intake keys emitted by
 * CPPARiskAssessment.tsx `intake` useMemo (lines ~405-450).
 */
export const IMPROVEMENT_KIT_DESIGNATED_FIELDS: readonly string[] = [
  "i2_retention_period",
  "i2_retention_detail",
  "i2_retention_criteria",
  "i6_vendors",
  "i4_disclosure_mechanisms",
  "i4b_sources",
  "i5_admt_logic",
  "i5_admt_human_review",
  "i5_admt_training_source",
  "i5_admt_fairness_testing",
  "q19_admt_description",
  "q20_admt_opt_out",
  "i7_external_consultees",
  "i7_internal_contributors",
  "i9_existing_dpia_summary",
  "i1b_min_pi",
  "q4_pi_categories",
  "q11_policy_review",
  "exceptions_intake",
];

// RC-Cleanup2: "unknown" retired from the widget. Legacy stored assertions
// with state:"unknown" are treated as no assertion at every backend read site
// (already true pre-change) — read paths use tolerant string comparisons, not
// exhaustive narrowing, so no runtime break for legacy rows.
export type AssertionState = "confirmed" | "believed";
export type AssertionBasis =
  | "standard_template"
  | "written_policy"
  | "standard_practice"
  | null;

export interface AssertionEntry {
  state: AssertionState;
  basis: AssertionBasis;
}

export type AssertionMap = Record<string, AssertionEntry>;
