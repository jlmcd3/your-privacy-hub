/**
 * DPIA pilot assisted-input pill sets — Doc U v2/v3/v3.1.
 *
 * Snippets VERBATIM from EUP_DocU_DPIA_Pilot_Snippet_Pack_SIGNOFF
 * (team-finalized, John-signed). Deferred / excluded per pack:
 *   - retentionPeriod (negotiable-term; structure-only later phase)
 *   - necessityProportionality (PERMANENTLY EXCLUDED — bespoke
 *     judgment narrative; no pills, ever)
 *
 * Content rules verified: descriptive/neutral, no legal conclusions,
 * banned word "gap" absent, exactly 6 pills per field.
 * The assertion slot is intentionally empty for this product.
 */
import type { AssistedInputFieldConfig } from "../assistedInput";

const supportingAssets: AssistedInputFieldConfig = {
  fieldId: "supportingAssets",
  pills: [
    { id: "cloud_hosting", label: "Cloud hosting (AWS / Azure / GCP)", snippet: "Cloud hosting (AWS / Azure / GCP)" },
    { id: "app_servers", label: "Application servers / API tier", snippet: "Application servers / API tier" },
    { id: "warehouse", label: "Data warehouse / analytics store", snippet: "Data warehouse / analytics store" },
    { id: "idp", label: "Identity provider (SSO / IdP)", snippet: "Identity provider (SSO / IdP)" },
    { id: "logging", label: "Logging & monitoring platform", snippet: "Logging & monitoring platform" },
    { id: "subprocessor", label: "Sub-processor SaaS listed in vendor register", snippet: "Sub-processor SaaS listed in vendor register" },
  ],
};

const dataQualityMeasures: AssistedInputFieldConfig = {
  fieldId: "dataQualityMeasures",
  pills: [
    { id: "self_service", label: "User-facing self-service correction", snippet: "User-facing self-service correction" },
    { id: "periodic_audit", label: "Periodic accuracy audit against source-of-truth", snippet: "Periodic accuracy audit against source-of-truth" },
    { id: "source_sync", label: "Source-system automatic sync", snippet: "Source-system automatic sync" },
    { id: "on_request", label: "On-request rectification within statutory deadline", snippet: "On-request rectification within statutory deadline" },
    { id: "ingest_validation", label: "Automated validation at ingest", snippet: "Automated validation at ingest" },
    { id: "not_documented", label: "Not currently documented", snippet: "Not currently documented" },
  ],
};

const dataSubjectRightsMechanisms: AssistedInputFieldConfig = {
  fieldId: "dataSubjectRightsMechanisms",
  pills: [
    { id: "online_form", label: "Online rights-request form", snippet: "Online rights-request form" },
    { id: "privacy_email", label: "Designated privacy email", snippet: "Designated privacy email" },
    { id: "in_account", label: "In-account self-service portal", snippet: "In-account self-service portal" },
    { id: "postal", label: "Postal request to controller address", snippet: "Postal request to controller address" },
    { id: "idv", label: "Identity verification via account login + email", snippet: "Identity verification via account login + email" },
    { id: "one_month", label: "Response within one month per Art. 12(3)", snippet: "Response within one month per Art. 12(3)" },
  ],
};

const dpByDesignMeasures: AssistedInputFieldConfig = {
  fieldId: "dpByDesignMeasures",
  pills: [
    { id: "pseudonymisation", label: "Pseudonymisation of direct identifiers at ingest", snippet: "Pseudonymisation of direct identifiers at ingest" },
    { id: "field_acl", label: "Field-level access controls (least-privilege)", snippet: "Field-level access controls (least-privilege)" },
    { id: "minimisation", label: "Minimisation at source (do-not-collect defaults)", snippet: "Minimisation at source (do-not-collect defaults)" },
    { id: "encryption", label: "Encryption at rest and in transit", snippet: "Encryption at rest and in transit" },
    { id: "retention_auto", label: "Retention limits enforced by automated deletion", snippet: "Retention limits enforced by automated deletion" },
    { id: "not_documented", label: "Not currently documented", snippet: "Not currently documented" },
  ],
};

export const DPIA_PILOT_ASSISTED_INPUT: Readonly<
  Record<string, AssistedInputFieldConfig>
> = Object.freeze({
  supportingAssets,
  dataQualityMeasures,
  dataSubjectRightsMechanisms,
  dpByDesignMeasures,
});
