/**
 * ADMT pilot assisted-input pill sets — Doc U v2/v3/v3.1.
 *
 * Snippets VERBATIM from EUP_DocU_ADMT_Pilot_Snippet_Pack_SIGNOFF.md
 * (team-finalized, John-signed). Deferred fields per pack:
 *   - opt_out_15_day_process (negotiable-term, same treatment as
 *     i2_retention_period on Risk)
 *   - thirdPartyAdmt (vendor-listing free-text)
 *
 * Content rules verified: descriptive/neutral, no legal conclusions,
 * banned word "gap" absent, ≤6 pills per field.
 * The assertion slot is intentionally empty for this product (Doc R).
 */
import type { AssistedInputFieldConfig } from "../assistedInput";

const admt_vendor_training_rights: AssistedInputFieldConfig = {
  fieldId: "admt_vendor_training_rights",
  pills: [
    { id: "no_train", label: "Vendor may not train on our data (contractual)", snippet: "Vendor may not train on our data (contractual)" },
    { id: "deidentified_only", label: "Vendor may train on de-identified data only", snippet: "Vendor may train on de-identified data only" },
    { id: "all_inputs", label: "Vendor may train on all inputs (no restriction)", snippet: "Vendor may train on all inputs (no restriction)" },
    { id: "silent", label: "Contractual silence -- training rights not addressed", snippet: "Contractual silence -- training rights not addressed" },
    { id: "opt_out", label: "Opt-out available on request", snippet: "Opt-out available on request" },
    { id: "not_documented", label: "Not currently documented", snippet: "Not currently documented" },
  ],
};

const opt_out_fairness_doc: AssistedInputFieldConfig = {
  fieldId: "opt_out_fairness_doc",
  pills: [
    { id: "annual_disparate", label: "Annual disparate-impact analysis across protected classes", snippet: "Annual disparate-impact analysis across protected classes" },
    { id: "pre_deploy_audit", label: "Pre-deployment third-party bias audit", snippet: "Pre-deployment third-party bias audit" },
    { id: "continuous_monitoring", label: "Continuous outcome-monitoring by subgroup", snippet: "Continuous outcome-monitoring by subgroup" },
    { id: "parity_metrics", label: "Statistical parity + equal-opportunity metrics", snippet: "Statistical parity + equal-opportunity metrics" },
    { id: "adversarial", label: "Adversarial / red-team testing", snippet: "Adversarial / red-team testing" },
    { id: "not_documented", label: "Not currently documented", snippet: "Not currently documented" },
  ],
};

const access_submission_methods: AssistedInputFieldConfig = {
  fieldId: "access_submission_methods",
  pills: [
    { id: "online_form", label: "Online privacy form at company website", snippet: "Online privacy form at company website" },
    { id: "email", label: "Designated privacy email (privacy@)", snippet: "Designated privacy email (privacy@)" },
    { id: "in_account", label: "In-account request portal", snippet: "In-account request portal" },
    { id: "postal", label: "Postal mail to designated address", snippet: "Postal mail to designated address" },
    { id: "toll_free", label: "Toll-free intake line", snippet: "Toll-free intake line" },
    { id: "same_as_rtk", label: "Same methods as right-to-know requests", snippet: "Same methods as right-to-know requests" },
  ],
};

const access_verification_process: AssistedInputFieldConfig = {
  fieldId: "access_verification_process",
  pills: [
    { id: "two_factor", label: "Two-factor via email + account login", snippet: "Two-factor via email + account login" },
    { id: "gov_id", label: "Government-ID plus selfie via third-party IDV", snippet: "Government-ID plus selfie via third-party IDV" },
    { id: "kba", label: "Knowledge-based questions matching account data", snippet: "Knowledge-based questions matching account data" },
    { id: "notarised", label: "Notarised written request for non-accountholders", snippet: "Notarised written request for non-accountholders" },
    { id: "attestation", label: "Attestation under penalty of perjury", snippet: "Attestation under penalty of perjury" },
    { id: "not_defined", label: "Not currently defined", snippet: "Not currently defined" },
  ],
};

export const ADMT_PILOT_ASSISTED_INPUT: Readonly<
  Record<string, AssistedInputFieldConfig>
> = Object.freeze({
  admt_vendor_training_rights,
  opt_out_fairness_doc,
  access_submission_methods,
  access_verification_process,
});
