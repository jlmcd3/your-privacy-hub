// DOC 217 §1 / §6 — the free-text fields the intake read-back component
// (src/components/lia/V3ReadBack.tsx) gates and reads, keyed by the doc 217
// §1 `field_id`, each with the question AS DISPLAYED (the `question_text`
// stored on every `intake_gate_results` / `intake_readings` row — 212F
// matter 1). A byte-mirror of the engine's field-labels.ts labels
// (supabase/functions/run-li-assessment/_local/ltp/v3/field-labels.ts);
// tests/edge/run-li-assessment/doc217-v3-engine.test.ts pins the two lists
// to each other. No imports — this module is read by both runtimes.

export interface LiaV3IntakeField {
  readonly field_id: string;
  readonly question_text: string;
}

export const LIA_V3_INTAKE_FIELDS: readonly LiaV3IntakeField[] = [
  { field_id: "processing_description", question_text: "What processing are you considering?" },
  { field_id: "purpose_details.interest_statement", question_text: "In your own words, what is the legitimate interest you're relying on?" },
  { field_id: "purpose_details.stated_purpose", question_text: "How would you state this purpose to data subjects in a privacy notice?" },
  { field_id: "purpose_details.specific_benefit", question_text: "What specific benefit does this processing deliver?" },
  { field_id: "purpose_details.statutory_restrictions", question_text: "Are there sector or jurisdiction-specific restrictions?" },
  { field_id: "necessity_details.alternatives", question_text: "What alternatives have you considered?" },
  { field_id: "necessity_details.alternatives_rationale", question_text: "For each alternative, why would it not achieve the purpose?" },
  { field_id: "necessity_details.achievable_without_personal_data_rationale", question_text: "Could this purpose be achieved without personal data, or with anonymised or synthetic data?" },
  { field_id: "necessity_details.why_consent_not_used", question_text: "Why isn't consent appropriate here?" },
  { field_id: "necessity_details.data_minimised", question_text: "How have you minimised the data used?" },
  { field_id: "balancing_details.reasonable_expectation_detail", question_text: "Would data subjects reasonably expect this processing?" },
  { field_id: "balancing_details.collection_context", question_text: "When and in what setting was this data collected?" },
  { field_id: "balancing_details.potential_harms", question_text: "If something went wrong, what's the worst-case impact on data subjects?" },
  { field_id: "balancing_details.additional_mitigations", question_text: "What measures have you added specifically to reduce the impact on individuals?" },
  { field_id: "balancing_details.additional_context", question_text: "Anything else about this processing we should weigh?" },
];

export function liaV3QuestionText(field_id: string): string {
  return LIA_V3_INTAKE_FIELDS.find((f) => f.field_id === field_id)?.question_text ?? field_id;
}
