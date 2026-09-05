// Batch 4ed05f22 (2026-09-05) — U.S. Privacy Notice intake contract.
//
// Why this exists: the stress-fixture generator wrote a PARAGRAPH into the
// form's single-choice sale/sharing question and answered a question the form
// does not have (`sensitive_data_types`) instead of the one it does
// (`ccpa_sensitive_data`). Nothing refused the fixture — the notices had no
// contract, so the INTAKE_CONTRACT_GATE that stopped the same class of error
// on ADMT the same night was silent here — and the generated notice could not
// state its sale/sharing or sensitive-PI position (grade 59). This contract
// gives the gate the form's own vocabulary for the closed-list questions.
//
// Source of truth for keys and options:
//   - src/data/us-notice-questions/universal-questions.ts (sale_or_sharing,
//     third_party_sharing, collection_purposes, data_categories, …)
//   - src/data/us-notice-questions/ccpa-questions.ts (ccpa_sensitive_data,
//     ccpa_minors, ccpa_financial_incentive, ccpa_admt)
//   - Engine reader: supabase/functions/generate-us-notice/_local/spine.ts
//     (`token("sale_or_sharing")`, `token("ccpa_sensitive_data")`, …).
//
// Scope note: the multi-choice questions (data_categories, collection_purposes,
// third_party_categories) are encoded as `text` here on purpose — the spine
// renders a free-text answer verbatim (doc 181 pins this for the sample and
// stress fixtures) and the harness has always written prose there. Only the
// questions the spine reads as TOKENS are closed lists in this contract, so a
// prose answer to those is refused and a prose answer elsewhere is not.

import type { IntakeContract } from "./types.ts";

/** universal-questions.ts — `sale_or_sharing` (single_choice). */
export const US_NOTICE_SALE_OR_SHARING = ["sell_and_share", "sell_only", "share_only", "no", "not_sure"] as const;
/** universal-questions.ts — `third_party_sharing` (yes_no). */
export const US_NOTICE_YES_NO = ["yes", "no"] as const;
/** ccpa-questions.ts — `ccpa_sensitive_data` (single_choice yes/no/unsure); `ccpa_admt` (yes_no_unsure). */
export const US_NOTICE_YES_NO_UNSURE = ["yes", "no", "unsure"] as const;

export const usNoticeContract: IntakeContract = {
  id: "us-notice",
  version: "1.0.0",
  tool_type: "us_notice",
  table: "us_notice_sessions",
  fields: [
    { key: "business_name", kind: "text", required: "always" },
    { key: "business_description", kind: "text", required: "optional" },
    { key: "contact_email", kind: "text", required: "always" },
    { key: "data_categories", kind: "text", required: "optional" },
    { key: "collection_purposes", kind: "text", required: "optional" },
    { key: "third_party_sharing", kind: "enum", options: US_NOTICE_YES_NO, required: "optional" },
    { key: "third_party_categories", kind: "text", required: "optional" },
    { key: "sale_or_sharing", kind: "enum", options: US_NOTICE_SALE_OR_SHARING, required: "optional" },
    { key: "retention_general", kind: "text", required: "optional" },
    { key: "retention_criteria", kind: "text", required: "optional" },
    { key: "data_sources", kind: "text", required: "optional" },
    { key: "ccpa_sensitive_data", kind: "enum", options: US_NOTICE_YES_NO_UNSURE, required: "optional" },
    { key: "ccpa_minors", kind: "enum", options: US_NOTICE_YES_NO, required: "optional" },
    { key: "ccpa_financial_incentive", kind: "enum", options: US_NOTICE_YES_NO, required: "optional" },
    { key: "ccpa_admt", kind: "enum", options: US_NOTICE_YES_NO_UNSURE, required: "optional" },
    // Harness passthroughs (run-stress-job's withNames adds the entity keys).
    { key: "entity_name", kind: "text", required: "optional" },
    { key: "company_name", kind: "text", required: "optional" },
  ],
};
