// Batch b83ea3c4 (2026-09-05) — EU/UK Privacy Notice intake contract.
//
// Why this exists: on the first batch after doc 180 the generated fixtures
// wrote PROSE into the form's token-read questions — "Some processors are
// based in the United States. Transfers are protected by SCCs…" into the
// yes/no `transfer_outside_eea`, "Miriam Estève, appointed DPO…" into the
// yes/no `dpo_details`, a paragraph into the yes/no/unsure
// `automated_decisions`, labels-with-commentary into the code-valued
// `lawful_basis` — and answered questions the form does not have
// (`supervisory_authority_eu`) instead of the one it does
// (`gdpr_dpa_contact`). Nothing refused the fixture: the EU notice had no
// contract, so the INTAKE_CONTRACT_GATE was silent, and every notice in the
// batch denied transfers the record described, omitted the DPO the record
// named, and bracketed the supervisory authority the record supplied
// (grades 55–70). Same class as the US notice the night before (us-notice.ts).
//
// Source of truth for keys and options:
//   - src/data/eu-notice-questions/universal-questions.ts
//   - src/data/eu-notice-questions/gdpr-questions.ts (GDPR_ART13_QUESTIONS,
//     UKGDPR_ADDITIONS, CHADP_ADDITIONS)
//   - Engine reader: supabase/functions/generate-eu-notice/_local/spine.ts
//     (`token("transfer_outside_eea")`, `token("dpo_details")`,
//     `list("lawful_basis")`, `token("automated_decisions")`, …).
//
// Scope note: only the questions the spine reads as TOKENS or CODES are
// closed lists here; free-text questions are `text`. The other-framework
// questions (LGPD, APPI, DPDPA, POPIA) are not listed — an unknown key is
// advisory, never blocking. `yes_no` stores "yes"/"no"; `yes_no_unsure`
// stores "yes"/"no"/"unsure" (the form's showIf values).

import type { IntakeContract } from "./types.ts";

export const EU_NOTICE_YES_NO = ["yes", "no"] as const;
export const EU_NOTICE_YES_NO_UNSURE = ["yes", "no", "unsure"] as const;

/** universal-questions.ts — `processing_purposes` (multi_choice). */
export const EU_NOTICE_PURPOSES = [
  "service_delivery", "account_management", "marketing", "analytics", "advertising",
  "legal_compliance", "security", "research", "payment", "other",
] as const;

/** universal-questions.ts — `data_categories` (multi_choice). */
export const EU_NOTICE_DATA_CATEGORIES = [
  "identifiers", "commercial", "internet_activity", "geolocation", "audio_visual",
  "professional", "education", "financial", "health_medical", "biometric",
  "race_ethnicity", "religion", "sexual_orientation", "political_opinions",
  "trade_union", "criminal", "children",
] as const;

/** universal-questions.ts — `special_category_basis` (multi_choice, Art. 9(2) grounds). */
export const EU_NOTICE_SPECIAL_BASIS = [
  "explicit_consent", "employment_law", "vital_interests", "non_profit", "manifestly_public",
  "legal_claims", "substantial_public_interest", "health_medicine", "public_health", "archiving_research",
] as const;

/** universal-questions.ts — `lawful_basis` (multi_choice, Art. 6(1) codes). */
export const EU_NOTICE_LAWFUL_BASIS = [
  "consent", "contract", "legal_obligation", "vital_interests", "public_task", "legitimate_interests",
] as const;

/** universal-questions.ts — `third_party_recipients` (multi_choice). */
export const EU_NOTICE_RECIPIENTS = [
  "service_providers", "analytics", "advertising", "regulators", "affiliates", "other",
] as const;

/** universal-questions.ts — `transfer_safeguards` (multi_choice). */
export const EU_NOTICE_SAFEGUARDS = ["adequacy", "sccs", "bcrs", "uk_addendum", "derogations", "other"] as const;

/** universal-questions.ts — `collection_source` (single_choice). */
export const EU_NOTICE_COLLECTION_SOURCE = ["direct", "indirect", "mixed"] as const;

/** universal-questions.ts — `data_source_categories` (multi_choice). */
export const EU_NOTICE_SOURCE_CATEGORIES = [
  "data_brokers", "public_sources", "partners", "public_authorities", "social_web", "other",
] as const;

/** universal-questions.ts — `establishment_jurisdiction` (single_choice). */
export const EU_NOTICE_ESTABLISHMENT = ["eea", "uk", "outside"] as const;

/** gdpr-questions.ts — `gdpr_dpo_mandatory` (single_choice). */
export const EU_NOTICE_DPO_MANDATORY = [
  "mandatory_public_authority", "mandatory_large_scale_monitoring", "mandatory_large_scale_special",
  "voluntary", "not_applicable",
] as const;

export const euNoticeContract: IntakeContract = {
  id: "eu-notice",
  version: "1.0.0",
  tool_type: "eu_notice",
  table: "eu_notice_sessions",
  fields: [
    // ── Universal ──────────────────────────────────────────────────────────
    { key: "controller_name", kind: "text", required: "always" },
    { key: "controller_address", kind: "text", required: "always" },
    { key: "contact_email", kind: "text", required: "always" },
    { key: "dpo_details", kind: "enum", options: EU_NOTICE_YES_NO, required: "always" },
    { key: "dpo_name", kind: "text", required: "conditional",
      requiredWhen: 'dpo_details === "yes"', trigger: { key: "dpo_details", equals: ["yes"] } },
    { key: "dpo_email", kind: "text", required: "conditional",
      requiredWhen: 'dpo_details === "yes"', trigger: { key: "dpo_details", equals: ["yes"] } },
    { key: "processing_purposes", kind: "multi-enum", options: EU_NOTICE_PURPOSES, required: "always" },
    { key: "data_categories", kind: "multi-enum", options: EU_NOTICE_DATA_CATEGORIES, required: "always" },
    { key: "special_category_basis", kind: "multi-enum", options: EU_NOTICE_SPECIAL_BASIS, required: "optional" },
    { key: "lawful_basis", kind: "multi-enum", options: EU_NOTICE_LAWFUL_BASIS, required: "always" },
    { key: "third_party_recipients", kind: "multi-enum", options: EU_NOTICE_RECIPIENTS, required: "always" },
    { key: "transfer_outside_eea", kind: "enum", options: EU_NOTICE_YES_NO, required: "always" },
    { key: "transfer_safeguards", kind: "multi-enum", options: EU_NOTICE_SAFEGUARDS, required: "conditional",
      requiredWhen: 'transfer_outside_eea === "yes"', trigger: { key: "transfer_outside_eea", equals: ["yes"] } },
    { key: "transfer_destinations", kind: "text", required: "conditional",
      requiredWhen: 'transfer_outside_eea === "yes"', trigger: { key: "transfer_outside_eea", equals: ["yes"] } },
    { key: "adequacy_status", kind: "text", required: "optional" },
    { key: "retention_period", kind: "text", required: "always" },
    { key: "automated_decisions", kind: "enum", options: EU_NOTICE_YES_NO_UNSURE, required: "always" },
    { key: "automated_decisions_detail", kind: "text", required: "conditional",
      requiredWhen: 'automated_decisions === "yes"', trigger: { key: "automated_decisions", equals: ["yes"] } },
    { key: "collection_source", kind: "enum", options: EU_NOTICE_COLLECTION_SOURCE, required: "always" },
    { key: "data_source_categories", kind: "multi-enum", options: EU_NOTICE_SOURCE_CATEGORIES, required: "conditional",
      requiredWhen: 'collection_source in ("indirect", "mixed")', trigger: { key: "collection_source", equals: ["indirect", "mixed"] } },
    { key: "establishment_jurisdiction", kind: "enum", options: EU_NOTICE_ESTABLISHMENT, required: "always" },
    { key: "eu_rep_name", kind: "text", required: "optional" },
    { key: "eu_rep_contact", kind: "text", required: "optional" },
    // ── GDPR Art. 13 supplement ────────────────────────────────────────────
    { key: "gdpr_controller_representative", kind: "enum", options: EU_NOTICE_YES_NO_UNSURE, required: "optional" },
    { key: "gdpr_uk_representative", kind: "enum", options: EU_NOTICE_YES_NO_UNSURE, required: "optional" },
    { key: "gdpr_dpo_mandatory", kind: "enum", options: EU_NOTICE_DPO_MANDATORY, required: "optional" },
    { key: "gdpr_right_to_withdraw", kind: "text", required: "optional" },
    { key: "gdpr_right_to_object", kind: "text", required: "optional" },
    { key: "gdpr_dpa_contact", kind: "text", required: "always" },
    { key: "gdpr_profiling", kind: "enum", options: EU_NOTICE_YES_NO_UNSURE, required: "optional" },
    { key: "gdpr_profiling_info", kind: "text", required: "optional" },
    // ── UK / CH additions ──────────────────────────────────────────────────
    { key: "uk_lawful_basis_schedule", kind: "text", required: "optional" },
    { key: "uk_ico_complaint", kind: "text", required: "optional" },
    { key: "ch_fdpic_complaint", kind: "text", required: "optional" },
    { key: "ch_profiling_high_risk", kind: "enum", options: EU_NOTICE_YES_NO, required: "optional" },
    // Harness passthroughs (run-stress-job's withNames adds the entity keys).
    { key: "entity_name", kind: "text", required: "optional" },
    { key: "company_name", kind: "text", required: "optional" },
  ],
};
