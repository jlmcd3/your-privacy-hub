// W18-RISK-VOCABSCRUB — deterministic post-emit scrub of raw intake field-ID
// tokens leaking into customer-facing prose. Wave-17 doc 17c0aa18: prose in
// inconsistency_flags[].description embedded raw normalised-intake ids like
// `i1b_min_pi` and `i1_processing_purpose`. h2_internal_vocab and
// rubric_internal_reasoning_leak both fired on these.
//
// Scope: rewrite raw ids in prose ONLY. Structured technical anchors
// (source_fields, field, intake_field_1, intake_field_2, provision) are
// legitimate pipeline vocabulary and are LEFT UNTOUCHED — those arrays/strings
// are skipped by the walker.
//
// Label source: derived from the CPPA_RISK intake contract's leaf keys (single
// source of truth). Unknown/unmapped ids fall back to the neutral phrase
// "the corresponding intake response". Never emit the raw id in prose.
//
// Fail-open: per-node try/catch; a walker fault never breaks generation.

import { cppaRiskContract } from "../_shared/intake-contracts/cppa-risk-assessment.ts";

export const W18_RISK_VOCABSCRUB_STAMP = "w18-risk-vocabscrub@2026-07-25T03:34:41Z";

// Human-readable labels for the risk intake fields most commonly leaked in
// prose (wave-17 evidence + surrounding neighbourhood). Any id not in this
// map falls back to NEUTRAL_LABEL — the scrub NEVER emits the raw id.
export const RISK_INTAKE_LABELS: Record<string, string> = {
  entity_name: "the entity name",
  subject_anchor: "the subject of the assessment",
  q1_revenue: "the annual-revenue band",
  q2_consumers: "the California-consumer count",
  q3_sector: "the reported sector",
  q4_pi_categories: "the personal-information categories collected",
  q5_sell_share: "the sell-or-share answer",
  q5b_profiling_observation: "the systematic-observation / sensitive-location profiling answer",
  q5c_share_revenue_50pct: "the share-of-revenue-from-selling answer",
  sensitive_location_basis: "the sensitive-location basis",
  public_privacy_policy_url: "the public privacy-policy URL",
  q6_right_know: "the right-to-know disclosures",
  q6_right_know_multi: "the right-to-know disclosure elements",
  q7_right_delete: "the right-to-delete process",
  q8_right_correct: "the right-to-correct process",
  q9_opt_out: "the opt-out-of-sale/share posture",
  q10_id_verification: "the identity-verification process",
  q11_policy_review: "the privacy-policy review date",
  q12_notice_at_collection: "the notice-at-collection coverage",
  q13_notice_content: "the notice content",
  q14_employee_notice: "the employee-notice arrangement",
  q15_sensitive_pi: "the sensitive-PI answer",
  q15b_under16_knowledge: "the under-16 knowledge answer",
  q15c_spi_volume: "the sensitive-PI volume figure",
  q16_sensitive_limit: "the limit-use-of-sensitive-PI mechanism",
  q17_sensitive_basis: "the sensitive-PI processing basis",
  q18_admt_use: "the ADMT-use answer",
  q19_admt_description: "the ADMT-system description",
  q20_admt_opt_out: "the ADMT opt-out mechanism",
  q18b_admt_training: "the ADMT-training answer",
  // DOC 157 (model-vs-law build) — the categorical § 7001(ddd) answer.
  q19a_decision_categories: "the decision-category answer",
  q19b_housing_basis: "the housing-decision basis answer",
  i1_processing_purpose: "the stated processing purpose",
  i1b_min_pi: "the data-minimisation commitment",
  i2_retention_period: "the stated retention period",
  i2_retention_criteria: "the retention-criteria answer",
  i2_retention_detail: "the retention-schedule detail",
  i3_ca_consumer_band: "the California-consumer band",
  i4_disclosure_mechanisms: "the disclosure mechanisms",
  i4b_sources: "the personal-information sources",
  i5_admt_logic: "the ADMT logic description",
  i5_admt_training_source: "the ADMT training-data source",
  i5_admt_fairness_testing: "the ADMT fairness-testing record",
  i5_admt_human_review: "the ADMT human-review procedure",
  i6_vendors: "the vendor list",
  i7_internal_contributors: "the internal-contributors roster",
  i7_external_consultees: "the external-consultees list",
  i8_certifying_exec_name: "the certifying-executive name",
  i8_certifying_exec_title: "the certifying-executive title",
  i8_contact_phone: "the certifying-executive phone",
  i8_contact_email: "the certifying-executive email",
  i9_has_existing_dpia: "the existing-DPIA answer",
  i9_existing_dpia_summary: "the existing-DPIA summary",
  material_change_since_prior: "whether the activity changed materially since the last assessment",
  exceptions_intake: "the exceptions intake",
  impact_intake: "the impact intake",
  // ITEM 388 FIX 1 — contract-vs-map delta closed. Every remaining
  // cppaRiskContract leaf key now carries a label so prose naming one of
  // them renders the human label instead of collapsing to NEUTRAL_LABEL.
  primary_activity_name: "the name of the processing activity",
  primary_activity_purpose: "the purpose of the processing activity",
  has_secondary_uses: "the other-uses answer",
  secondary_activities: "the secondary-activity records",
  bought_sold_shared_count: "the bought, sold or shared consumer count",
  a2_necessity_set: "the necessity answers",
  a4_benefit_business: "the business-benefit answer",
  a4_benefit_consumer: "the consumer-benefit answer",
  a4_benefit_other_stakeholders: "the other-stakeholder-benefit answer",
  a4_benefit_public: "the public-benefit answer",
  a4_benefit_business_fact: "the supporting fact for the business benefit",
  a4_benefit_consumer_fact: "the supporting fact for the consumer benefit",
  a4_benefit_other_stakeholders_fact: "the supporting fact for the other-stakeholder benefit",
  a4_benefit_public_fact: "the supporting fact for the public benefit",
  a5_harm_pathways: "the identified harm pathways",
  a6_safeguards: "the recorded safeguards",
  a8_information_providers: "the information providers consulted",
  a9_approver_name: "the approver name",
  a9_approver_position: "the approver position",
  a9_approval_date: "the approval date",
  // ITEM 388 GROUP-5 (2026-08-27) — the Spine v5.2 / RK3 field set added
  // ~55 contract keys without a matching label; closed the same way as the
  // 2026-08-27 batch above, one label per contract-derived field.
  q15d_hr_carveout: "the HR/employment-personnel-purposes carve-out answer",
  benefit_business_identified: "the business-benefit-identified answer",
  benefit_consumer_identified: "the consumer-benefit-identified answer",
  benefit_other_stakeholders_identified: "the other-stakeholder-benefit-identified answer",
  benefit_public_identified: "the public-benefit-identified answer",
  assessment_reviewers_approvers: "the reviewers-and-approvers record",
  approver_authority_confirmed: "the approver-authority-confirmed answer",
  approver_authority_basis: "the basis recorded for the approver's authority",
  // DOC 157 — the § 7152(a)(7) decision the finalization stage records.
  final_processing_decision: "the Company's recorded processing decision",
  final_processing_decision_notes: "the notes recorded with the processing decision",
  processing_entry_point: "the processing entry point",
  processing_methods: "the processing-methods record",
  processing_result: "the processing result",
  consumer_interaction_method: "the consumer-interaction method",
  consumer_interaction_purpose: "the consumer-interaction purpose",
  approximate_ca_consumers: "the approximate California-consumer count",
  retention_by_pi_category: "the per-category retention record",
  activity_disclosures: "the activity-disclosure record",
  recipients: "the recipient record",
  section_7151_operational_participants: "the § 7151 operational-participation record",
  processing_status: "the processing-status answer",
  processing_start_date: "the processing start date",
  planned_start_date: "the planned start date",
  prior_risk_assessment_date: "the prior risk-assessment date",
  material_change_date: "the material-change date",
  material_change_description: "the material-change description",
  admt_operational_role: "the ADMT operational-role description",
  admt_assumptions_limitations: "the ADMT assumptions-and-limitations description",
  admt_output: "the ADMT output description",
  admt_output_use: "the ADMT output-use description",
  admt_consumer_effect: "the ADMT consumer-effect description",
  admt_made_available_to_other_business: "the ADMT-made-available-to-another-business answer",
  admt_provider_trained_using_pi: "the ADMT-provider-trained-using-PI answer",
  recipient_business_uses_admt_for_significant_decision: "the recipient business's ADMT-significant-decision answer",
  spi_employment_exception_facts: "the sensitive-PI employment-exception facts",
  harm_category_review_status: "the harm-category review-status record",
  purpose_specificity_facts: "the purpose-specificity facts",
  out_of_scope_confirmation: "the out-of-scope confirmation",
  out_of_scope_activities: "the out-of-scope activities",
  comparable_processing_status: "the comparable-processing status",
  comparable_processing_basis: "the comparable-processing basis",
  consumer_relationship_context: "the consumer-relationship context",
  source_categories: "the personal-information source categories",
  vendor_dependency: "the vendor-dependency answer",
  essential_vendors: "the essential-vendor record",
  expectation_check: "the consumer-expectation check",
  choice_architecture_check: "the choice-architecture check",
  admt_role_type: "the ADMT role-type answer",
  admt_logic_documented: "the ADMT-logic-documented answer",
  human_review_facts: "the human-review facts",
  admt_testing_facts: "the ADMT testing facts",
  risk_interdependency_check: "the risk-interdependency check",
  compounding_pathways: "the compounding-pathway record",
  benefit_business_magnitude_basis: "the basis recorded for the business-benefit magnitude",
  benefit_consumer_magnitude_basis: "the basis recorded for the consumer-benefit magnitude",
  benefit_other_stakeholders_magnitude_basis: "the basis recorded for the other-stakeholder-benefit magnitude",
  benefit_public_magnitude_basis: "the basis recorded for the public-benefit magnitude",
};

export const NEUTRAL_LABEL = "the corresponding intake response";

// Structured anchor keys — legitimate pipeline vocabulary. Any string VALUE
// stored under one of these keys (or any nested descendant of one of these
// keys) is skipped by the walker so raw ids can survive as technical anchors.
const ANCHOR_KEYS = new Set<string>([
  "source_fields",
  "field",
  "intake_field_1",
  "intake_field_2",
  "provision",
]);

// The intake-contract-derived list of leaf field ids. Dotted paths are
// reduced to their last segment (e.g. impact_intake.likelihood → likelihood
// is EXCLUDED here — leaf enum names are noisy). We restrict to top-level
// intake keys, which is exactly the class that leaked in wave-17.
export const RISK_INTAKE_FIELD_IDS: string[] = Array.from(new Set(
  cppaRiskContract.fields
    .map((f) => f.key)
    .filter((k) => !k.includes(".")),
));

// Precompiled regex: whole-word alternation over the actual intake ids.
// Longest-first so `q5b_profiling_observation` matches before `q5`. Word
// boundaries prevent chopping tokens like `q19_admt_description_extra`.
const ID_ALTERNATION = RISK_INTAKE_FIELD_IDS
  .slice()
  .sort((a, b) => b.length - a.length)
  .map((k) => k.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
  .join("|");
const ID_RE = new RegExp(`\\b(?:${ID_ALTERNATION})\\b`, "g");

export interface VocabScrubMetrics {
  vocab_prose_strings_scanned: number;
  vocab_ids_rewritten: number;
  vocab_neutral_fallbacks: number;
  vocab_anchor_strings_skipped: number;
}

export function newVocabScrubMetrics(): VocabScrubMetrics {
  return {
    vocab_prose_strings_scanned: 0,
    vocab_ids_rewritten: 0,
    vocab_neutral_fallbacks: 0,
    vocab_anchor_strings_skipped: 0,
  };
}

/**
 * Rewrite raw intake field ids inside `s` to their human-readable labels.
 * Unmapped ids collapse to NEUTRAL_LABEL. Quoted intake VALUES are untouched
 * because only the id TOKEN is replaced (a value like "'privacy@ex.com'" has
 * no id token inside the quotes).
 */
export function scrubProseString(s: string, metrics?: VocabScrubMetrics): string {
  if (!s || typeof s !== "string") return s;
  if (metrics) metrics.vocab_prose_strings_scanned++;
  return s.replace(ID_RE, (id: string) => {
    const label = RISK_INTAKE_LABELS[id];
    if (label) {
      if (metrics) metrics.vocab_ids_rewritten++;
      return label;
    }
    if (metrics) metrics.vocab_neutral_fallbacks++;
    return NEUTRAL_LABEL;
  });
}

/**
 * Recursively walk `node` and rewrite intake-id tokens found in string leaves.
 * Skips any subtree rooted at an ANCHOR_KEYS key so structured technical
 * anchors (source_fields, field, intake_field_1/2, provision) remain intact.
 */
export function scrubReportVocab(node: unknown, metrics: VocabScrubMetrics): void {
  try {
    walk(node, metrics, /* inAnchor */ false);
  } catch (e) {
    console.warn(
      `[${W18_RISK_VOCABSCRUB_STAMP}] fail-open: ${(e as Error)?.message ?? e}`,
    );
  }
}

function walk(node: unknown, metrics: VocabScrubMetrics, inAnchor: boolean): void {
  if (node == null) return;
  if (Array.isArray(node)) {
    for (let i = 0; i < node.length; i++) {
      const v = node[i];
      if (typeof v === "string") {
        if (inAnchor) {
          metrics.vocab_anchor_strings_skipped++;
        } else {
          node[i] = scrubProseString(v, metrics);
        }
      } else if (v && typeof v === "object") {
        walk(v, metrics, inAnchor);
      }
    }
    return;
  }
  if (typeof node !== "object") return;
  const obj = node as Record<string, unknown>;
  for (const key of Object.keys(obj)) {
    const childAnchor = inAnchor || ANCHOR_KEYS.has(key);
    const v = obj[key];
    if (typeof v === "string") {
      if (childAnchor) {
        metrics.vocab_anchor_strings_skipped++;
      } else {
        try {
          obj[key] = scrubProseString(v, metrics);
        } catch { /* per-node fail-open */ }
      }
    } else if (v && typeof v === "object") {
      walk(v, metrics, childAnchor);
    }
  }
}
