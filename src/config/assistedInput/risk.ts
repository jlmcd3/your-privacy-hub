/**
 * Risk pilot assisted-input pill sets — Doc U v2/v3/v3.1.
 *
 * Snippets VERBATIM from EUP_DocU_Risk_Pilot_Snippet_Pack_SIGNOFF-APPROVED-2.md
 * (Q-A: merge to "External auditor" — "Independent bias-audit firm" dropped;
 *  Q-B: leave-as-is — q19 no "not documented" option).
 *
 * Content rules verified: descriptive/neutral, no legal conclusions,
 * banned word "gap" absent, ≤6 pills per field.
 */
import type { AssistedInputFieldConfig } from "../assistedInput";

const q19_admt_description: AssistedInputFieldConfig = {
  fieldId: "q19_admt_description",
  pills: [
    { id: "credit_scoring", label: "Credit scoring model", snippet: "Credit scoring model" },
    { id: "fraud_detection", label: "Automated fraud detection", snippet: "Automated fraud detection" },
    { id: "hiring_screening", label: "Hiring or resume screening", snippet: "Hiring or resume screening" },
    { id: "insurance_uw", label: "Insurance underwriting", snippet: "Insurance underwriting" },
    { id: "employee_perf", label: "Employee performance or promotion scoring", snippet: "Employee performance or promotion scoring" },
    { id: "ad_targeting", label: "Ad-targeting propensity model", snippet: "Ad-targeting propensity model" },
  ],
};

const i5_admt_training_source: AssistedInputFieldConfig = {
  fieldId: "i5_admt_training_source",
  pills: [
    { id: "first_party", label: "First-party collected from users", snippet: "First-party collected from users" },
    { id: "licensed_third_party", label: "Licensed third-party dataset", snippet: "Licensed third-party dataset" },
    { id: "public_scraped", label: "Publicly available or scraped web", snippet: "Publicly available or scraped web" },
    { id: "synthetic", label: "Synthetic or generated", snippet: "Synthetic or generated" },
    { id: "vendor_pretrained", label: "Vendor-provided pre-trained model", snippet: "Vendor-provided pre-trained model" },
    { id: "data_broker", label: "Contracted data broker", snippet: "Contracted data broker" },
  ],
};

const i5_admt_fairness_testing: AssistedInputFieldConfig = {
  fieldId: "i5_admt_fairness_testing",
  pills: [
    { id: "annual_disparate", label: "Annual disparate-impact analysis across protected classes", snippet: "Annual disparate-impact analysis across protected classes" },
    { id: "pre_deploy_audit", label: "Pre-deployment bias audit by third party", snippet: "Pre-deployment bias audit by third party" },
    { id: "continuous_monitoring", label: "Continuous outcome-monitoring by subgroup", snippet: "Continuous outcome-monitoring by subgroup" },
    { id: "parity_metrics", label: "Statistical parity + equal-opportunity metrics", snippet: "Statistical parity + equal-opportunity metrics" },
    { id: "adversarial", label: "Adversarial / red-team testing", snippet: "Adversarial / red-team testing" },
    { id: "not_documented", label: "Not currently documented", snippet: "Not currently documented" },
  ],
};

const i5_admt_human_review: AssistedInputFieldConfig = {
  fieldId: "i5_admt_human_review",
  pills: [
    { id: "full_input", label: "Reviewer receives full input record and model output before decision", snippet: "Reviewer receives full input record and model output before decision" },
    { id: "override_no_approval", label: "Reviewer can override without approval", snippet: "Reviewer can override without approval" },
    { id: "document_reasons", label: "Reviewer must document reasons for override", snippet: "Reviewer must document reasons for override" },
    { id: "trained", label: "Reviewer trained on model limits and bias risk", snippet: "Reviewer trained on model limits and bias risk" },
    { id: "escalation", label: "Escalation to senior reviewer on borderline scores", snippet: "Escalation to senior reviewer on borderline scores" },
    { id: "not_documented", label: "Not currently documented", snippet: "Not currently documented" },
  ],
};

const i7_internal_contributors: AssistedInputFieldConfig = {
  fieldId: "i7_internal_contributors",
  pills: [
    { id: "privacy_lead", label: "Privacy lead / DPO", snippet: "Privacy lead / DPO" },
    { id: "ciso", label: "CISO / Security lead", snippet: "CISO / Security lead" },
    { id: "legal", label: "Legal counsel", snippet: "Legal counsel" },
    { id: "business_owner", label: "Business owner of the activity", snippet: "Business owner of the activity" },
    { id: "engineering", label: "Engineering owner", snippet: "Engineering owner" },
    { id: "data_science", label: "Data-science / model owner", snippet: "Data-science / model owner" },
  ],
};

// Q-A: "External auditor" and "Independent bias-audit firm" merged to
// "External auditor" — 5 pills total.
const i7_external_consultees: AssistedInputFieldConfig = {
  fieldId: "i7_external_consultees",
  pills: [
    { id: "outside_counsel", label: "Outside privacy counsel", snippet: "Outside privacy counsel" },
    { id: "external_auditor", label: "External auditor", snippet: "External auditor" },
    { id: "regulator_pre", label: "Regulator pre-engagement", snippet: "Regulator pre-engagement" },
    { id: "consumer_advocacy", label: "Consumer / advocacy consultation", snippet: "Consumer / advocacy consultation" },
    { id: "none", label: "None", snippet: "None" },
  ],
};

// UPGRADE-2 (ITEM 4) — pill sets for the new § 7152(a)(5)/(6)/(8) fields.
// Descriptive and neutral: each pill names a category of fact, never a
// conclusion and never a favourable answer.
const a5_actor: AssistedInputFieldConfig = {
  fieldId: "a5_actor",
  pills: [
    { id: "internal_staff", label: "Internal staff with system access", snippet: "Internal staff with system access" },
    { id: "service_provider", label: "Service provider or contractor", snippet: "Service provider or contractor" },
    { id: "third_party_recipient", label: "Third-party recipient", snippet: "Third-party recipient" },
    { id: "external_attacker", label: "External attacker", snippet: "External attacker" },
    { id: "automated_system", label: "Automated system or model itself", snippet: "Automated system or model itself" },
    { id: "consumer_facing", label: "Consumer-facing interface", snippet: "Consumer-facing interface" },
  ],
};

const a6_residual: AssistedInputFieldConfig = {
  fieldId: "a6_residual",
  pills: [
    { id: "narrower_population", label: "Exposure narrowed to a smaller group", snippet: "Exposure narrowed to a smaller group" },
    { id: "shorter_window", label: "Exposure limited to a shorter time window", snippet: "Exposure limited to a shorter time window" },
    { id: "detect_not_prevent", label: "Detected after the fact rather than prevented", snippet: "Detected after the fact rather than prevented" },
    { id: "depends_on_vendor", label: "Depends on a third party performing as contracted", snippet: "Depends on a third party performing as contracted" },
    { id: "credential_compromise", label: "Remains reachable on credential compromise", snippet: "Remains reachable on credential compromise" },
    { id: "unchanged", label: "Impact substantially unchanged", snippet: "Impact substantially unchanged" },
  ],
};

const a8_information_providers: AssistedInputFieldConfig = {
  fieldId: "a8_information_providers",
  pills: [
    { id: "privacy_lead", label: "Privacy lead / DPO", snippet: "Privacy lead / DPO" },
    { id: "security_lead", label: "CISO / Security lead", snippet: "CISO / Security lead" },
    { id: "business_owner", label: "Business owner of the activity", snippet: "Business owner of the activity" },
    { id: "engineering", label: "Engineering owner", snippet: "Engineering owner" },
    { id: "data_science", label: "Data-science / model owner", snippet: "Data-science / model owner" },
    { id: "vendor_manager", label: "Vendor or procurement manager", snippet: "Vendor or procurement manager" },
  ],
};

const a4_benefit_supporting_fact: AssistedInputFieldConfig = {
  fieldId: "a4_benefit_supporting_fact",
  pills: [
    { id: "decision_record", label: "Cited in a decision record", snippet: "Cited in a decision record" },
    { id: "measured_change", label: "Measured change after the processing began", snippet: "Measured change after the processing began" },
    { id: "reporting_output", label: "Appears in a recurring reporting output", snippet: "Appears in a recurring reporting output" },
    { id: "contract_spec", label: "Recorded in a contract or specification", snippet: "Recorded in a contract or specification" },
    { id: "consumer_facing", label: "Visible to the consumer in the product", snippet: "Visible to the consumer in the product" },
    { id: "not_recorded", label: "Not recorded anywhere at present", snippet: "Not recorded anywhere at present" },
  ],
};

export const RISK_PILOT_ASSISTED_INPUT: Readonly<
  Record<string, AssistedInputFieldConfig>
> = Object.freeze({
  q19_admt_description,
  i5_admt_training_source,
  i5_admt_fairness_testing,
  i5_admt_human_review,
  i7_internal_contributors,
  i7_external_consultees,
  a5_actor,
  a6_residual,
  a8_information_providers,
});
