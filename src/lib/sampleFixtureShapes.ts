// Keep in sync: generate-stress-fixtures specs <-> src/lib/sampleFixtureShapes.ts (sample fixtures drift guard)
//
// Canonical required-key arrays per tool slug. Vitest at
// src/lib/__tests__/sampleFixtures.shape.test.ts asserts every fixture in
// src/lib/sampleFixtures.ts contains all required keys for its slug.
// If a spec changes in supabase/functions/generate-stress-fixtures/index.ts
// or in the tool page's submit shape, update this file AND the corresponding
// sample fixture in lockstep.

import type { ToolSlug } from "./sampleFixtures";

/** Where the intake payload lives inside each fixture. Some fixtures wrap
 * intake under `insert.intake_data`, some under `insert.*`, some under
 * `invoke_body(_extras)`, and some at the fixture root. */
export type IntakeLocator =
  | { at: "insert" }
  | { at: "insert.intake_data" }
  | { at: "invoke_body_extras" }
  | { at: "invoke_body" }
  | { at: "root" };

export interface FixtureShape {
  locator: IntakeLocator;
  required: string[];
  /** For cppa_cyber: required control-array `key` values. */
  requiredControlKeys?: string[];
  /** For cppa_cyber: required sub-keys inside the nested `profile` object. */
  requiredProfileKeys?: string[];
  /** For cppa_risk: required sub-keys inside exceptions_intake / impact_intake. */
  requiredExceptionsKeys?: string[];
  requiredImpactKeys?: string[];
}

export const SAMPLE_FIXTURE_SHAPES: Record<ToolSlug, FixtureShape> = {
  li_assessment: {
    locator: { at: "insert" },
    required: [
      "organization_name",
      "subject_anchor",
      "processing_description",
      "relationship_type",
      "data_categories",
      "jurisdictions",
      "stated_purpose",
      "purpose_details",
      "necessity_details",
      "balancing_details",
    ],
  },
  dpia: {
    locator: { at: "insert.intake_data" },
    required: [
      "organization_name",
      "processing_activity_name",
      "description",
      "purpose",
      "data_categories",
      "data_subjects",
      "legal_basis_proposed",
      "retention_period",
      "necessity_proportionality",
      "jurisdictions",
    ],
  },
  dpa: {
    locator: { at: "invoke_body_extras" },
    required: [
      "controllerName",
      "controllerJurisdiction",
      "processorName",
      "processorJurisdiction",
      "services",
      "dataCategories",
      "retention",
      "auditRights",
    ],
  },
  governance: {
    locator: { at: "insert.intake_data" },
    required: [
      "organization_name",
      "sector",
      "org_size",
      "jurisdictions",
      "eu_uk_data",
      "tools",
      "data_categories",
      "special_category",
      "privacy_policy",
      
      "dpo_status",
      "dpia_status",
      "incident_response",
      "training_status",
      "tool_instruction",
      "dpa_status",
      "transfer_status",
    ],
  },
  ir_playbook: {
    // Both variants: EU uses invoke_body_extras, US uses invoke_body. Test
    // handles both locators for this slug.
    locator: { at: "invoke_body_extras" },
    required: [
      "cause",
      "dataTypes",
      "affectedCount",
      "jurisdictions",
      "processorInvolved",
      "contained",
      "organisationType",
    ],
  },
  biometric: {
    locator: { at: "invoke_body_extras" },
    required: [
      "orgName",
      "orgType",
      "biometricTypes",
      "purpose",
      "jurisdictions",
    ],
  },
  cppa_risk: {
    locator: { at: "insert.intake_data" },
    required: [
      "entity_name",
      "subject_anchor",
      "q1_revenue",
      "q2_consumers",
      "q3_sector",
      "q4_pi_categories",
      "q5_sell_share",
      "q5b_profiling_observation",
      "q8_right_correct",
      "q9_opt_out",
      "q15b_under16_knowledge",
      "q18b_admt_training",
      "i1_processing_purpose",
      "i1b_min_pi",
      "i4b_sources",
      "i8_contact_email",
      "i8_contact_phone",
      "exceptions_intake",
      "impact_intake",
    ],
    requiredExceptionsKeys: [
      "fraud_detection",
      "security_integrity",
      "debugging",
      "transient_use",
      "internal_research",
      "employment_context",
      "legal_compliance",
      "consumer_request",
    ],
    requiredImpactKeys: [
      "likelihood",
      "severity",
      "harmTypes",
      "vulnerable",
      "benefitsOutweigh",
      "benefitsRationale",
      "cyberGaps",
      "businessBenefits",
      "consumerBenefits",
      "stakeholderBenefits",
      "safeguards",
      "harmCauses",
    ],
  },
  cppa_cyber: {
    locator: { at: "insert.intake_data" },
    // Item 338 (drift, not defect): the engine's canonical cyber intake is
    // `{ profile: { entity_name, industry, incidents_12mo, framework,
    // last_audit }, controls: [] }` (run-cppa-cybersecurity/index.ts L293,
    // commit 6d7bdb97d, 2026-07-24); `industry_sector` is only a legacy
    // fallback and `company_name`/`profile_industry`/`profile_audit` are read
    // nowhere. The flat keys are re-pinned as nested profile sub-keys, so
    // coverage is not reduced.
    required: ["profile", "controls"],
    requiredProfileKeys: ["entity_name", "industry", "incidents_12mo", "framework", "last_audit"],
    requiredControlKeys: [
      "c1_auth",
      "c2_encryption",
      "c3_account_access",
      "c4_inventory",
      "c5_secure_config",
      "c6_vuln_mgmt",
      "c7_audit_logs",
      "c8_network_mon",
      "c9_anti_malware",
      "c10_segmentation",
      "c11_port_protocol",
      "c12_awareness",
      "c13_training",
      "c14_secure_dev",
      "c15_third_party",
      "c16_retention",
      "c17_incident",
      "c18_continuity",
    ],
  },
  cppa_admt: {
    locator: { at: "insert.intake_data" },
    required: [
      "organization_name",
      "system_name",
      "system_type",
      "system_description",
      "decision_domains",
      "human_review",
      "training_data_use",
      "profiling_use",
      "third_party_admt",
      "admt_system_count",
      
      "opt_out_15_day_process",
    ],
  },
  ropa: {
    locator: { at: "root" },
    required: ["org_name", "author_name", "profile", "jurisdictions", "activities"],
  },
  us_notice: {
    locator: { at: "root" },
    required: ["session", "states", "universal"],
  },
  eu_notice: {
    locator: { at: "root" },
    required: ["session", "frameworks", "universal"],
  },
  registration: {
    locator: { at: "invoke_body" },
    required: [
      "intake_data",
    ],
  },
};
