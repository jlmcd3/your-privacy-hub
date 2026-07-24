// CPPA-PRODUCT-1 L5: starter classification rules mapping each finding
// check_id to (class, proposed_lever). Derived from W5-W7 quality_findings
// data across all ten tools. Keep this table change-controlled — edits
// belong in a courier turn, not a hotfix.
//
// class ∈ 'prompt' | 'feature' | 'intake' | 'measurement_noise' | 'unclassified'
// lever ∈ 'L1' | 'L2' | 'L3' | 'L4' | 'prompt' | 'variance' | null

export type BacklogClass =
  | "prompt"
  | "feature"
  | "intake"
  | "measurement_noise"
  | "unclassified";

export type ProposedLever =
  | "L1"
  | "L2"
  | "L3"
  | "L4"
  | "prompt"
  | "variance"
  | null;

export type BacklogStatus = "open" | "in_progress" | "shipped" | "wont_fix";

export interface ClassificationRule {
  class: BacklogClass;
  lever: ProposedLever;
  status?: BacklogStatus;
  notes?: string;
}

// Rule table: check_id -> classification. Match is exact on check_id.
// A tool-scoped override may be added later via CLASS_BY_TOOL if needed.
export const CLASS_BY_CHECK_ID: Record<string, ClassificationRule> = {
  // ── Citation family → L1 verified-authority injection ─────────────────
  rubric_citation_misapplied: { class: "feature", lever: "L1", notes: "Registry-driven pinpoints" },
  rubric_invented_admt_section: { class: "feature", lever: "L1" },
  no_hallucinated_section_numbers: { class: "feature", lever: "L1" },
  h3_admt_citation_depth: { class: "feature", lever: "L1" },
  h6_admt_governing_anchor: { class: "feature", lever: "L1" },
  h7_admt_blanket_range: { class: "feature", lever: "L1" },
  no_7152_a_3_trade_secret: { class: "feature", lever: "L1" },
  no_7221_c_5: { class: "feature", lever: "L1" },
  art11_gate_enforced: { class: "feature", lever: "L1" },

  // ── Unsupported / boilerplate → L3 hard slots + Intake Fact Ledger ────
  rubric_unsupported_business_claim: { class: "feature", lever: "L3", notes: "Intake Fact Ledger primary" },
  rubric_actionability: { class: "feature", lever: "L3" },
  rubric_generic_boilerplate: { class: "feature", lever: "L3" },
  e5_bare_advisory_close: { class: "feature", lever: "L3" },
  e6_counsel_referral: { class: "feature", lever: "L3" },

  // ── Determinism / QC → L2 pre-emit gate ───────────────────────────────
  qc_r1_1_no_asks_on_resolved_tests: { class: "feature", lever: "L2" },
  qc_r1_2_spi_prong_utilization: { class: "feature", lever: "L2" },
  qc_r1_3_50pct_prong_utilization: { class: "feature", lever: "L2" },
  qc_r1_4_cohort_determinism: { class: "feature", lever: "L2" },
  qc_r1_5_exception_fields_consumed: { class: "feature", lever: "L2" },
  qc_r1_7_enhancement_placement_det: { class: "feature", lever: "L2" },
  qc_ws6_1_supplemental_consumption: { class: "feature", lever: "L2" },
  h2_internal_vocab: { class: "prompt", lever: "L2" },
  h5_generic_close: { class: "prompt", lever: "L2" },
  rubric_internal_reasoning_leak: { class: "prompt", lever: "L2" },
  no_prompt_artifacts: { class: "prompt", lever: "L2" },
  no_double_numbering: { class: "prompt", lever: "L2" },
  no_british_spelling: { class: "prompt", lever: "L2" },
  overall_status_present: { class: "feature", lever: "L2" },

  // ── Intake predicates → L4 typed intake fields ────────────────────────
  notice_gaps_when_inscope: { class: "intake", lever: "L4" },
  gaming_not_significant_decision: { class: "intake", lever: "L4" },
  adtech_not_significant_decision: { class: "intake", lever: "L4" },
};

export function classify(checkId: string): ClassificationRule {
  return CLASS_BY_CHECK_ID[checkId] ?? { class: "unclassified", lever: null };
}
