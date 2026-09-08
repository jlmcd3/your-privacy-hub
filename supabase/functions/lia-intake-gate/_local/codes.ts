// DOC 217 §3 — gate vocabulary. SIX reason codes (amendment 1): the earlier
// seventh entry `other_limb_field` is a COLUMN on intake_gate_results (the
// field id the fact belongs to), never a reason code.

export const GATE_REASON_CODES = [
  "non_responsive",
  "unintelligible",
  "placeholder",
  "contradicts_closed_answer",
  "legal_conclusion_not_fact",
  "fact_belongs_to_other_limb",
] as const;

export type GateReasonCode = typeof GATE_REASON_CODES[number];

export function isGateReasonCode(v: unknown): v is GateReasonCode {
  return typeof v === "string" && (GATE_REASON_CODES as readonly string[]).includes(v);
}

/** The LIA free-text field ids `other_limb_field` may name. */
export const LIA_FREE_TEXT_FIELDS = [
  "purpose_details.interest_statement",
  "purpose_details.stated_purpose",
  "purpose_details.specific_benefit",
  "purpose_details.statutory_restrictions",
  "necessity_details.alternatives",
  "necessity_details.alternatives_rationale",
  "necessity_details.achievable_without_personal_data_rationale",
  "necessity_details.why_consent_not_used",
  "necessity_details.data_minimised",
  "balancing_details.reasonable_expectation_detail",
  "balancing_details.collection_context",
  "balancing_details.potential_harms",
  "balancing_details.additional_mitigations",
  "balancing_details.additional_context",
  "processing_description",
] as const;

export function isLiaFreeTextField(v: unknown): boolean {
  return typeof v === "string" && (LIA_FREE_TEXT_FIELDS as readonly string[]).includes(v);
}
