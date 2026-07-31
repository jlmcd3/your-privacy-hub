// QB-P20 — governance golden set.
// QB-P25 B2 — every case now also asserts that when the v2 fields
// (recommended_action_v2 / regulatory_basis_v2) appear, they are STRUCTURED
// values, not hedged-placeholder strings. There is no hedged-placeholder
// slot: a v2 entry either names a specific engaged fact/statute or is
// omitted entirely. The guards below prevent the "if this applies …" /
// "may apply …" / "possibly relevant …" leak patterns and prevent stray
// v2 key names surfacing as legacy string content.
// Adversarial "count-trap": five distinct AI tools where the narrative
// tempts a "four" count — tests whether the assessment enumerates
// correctly rather than paraphrasing a number.
import type { GoldenCase } from "./types.ts";

const base = {
  organization_name: "Meridian SaaS Inc.",
  sector: "Technology/SaaS",
  org_size: "51-250",
  jurisdictions: ["EU (GDPR)", "United Kingdom (UK GDPR)"],
  eu_uk_data: "Yes",
  tools: ["Microsoft 365 / Copilot"],
  data_categories: ["Employee records", "Customer records"],
  special_category: "No",
  privacy_policy: "Yes, current (reviewed in last 12 months)",
  privacy_notice_coverage: "Yes — notice covers all current activities, transfers, retention, and rights",
  dpo_status: "Yes, formal DPO",
  dpia_status: "Yes, one DPIA completed",
  dpia_ai_coverage: "Yes — all AI/high-risk tools assessed",
  incident_response: "Yes, tested in last 12 months",
  training_status: "Yes, formal onboarding + annual refresh",
  training_ai_coverage: "Yes — explicitly covers AI tools",
  tool_instruction: "Yes, written policy with specific prohibitions",
  dpa_status: "Yes, all vendors",
  dpa_art28_verified: "Yes — verified",
  transfer_status: "Yes, US-based tools",
  transfer_mechanism: "EU Standard Contractual Clauses (SCCs)",
  technical_controls: "Yes — DLP/content filtering actively enforced",
  technical_controls_list: ["DLP rules", "Content filtering"],
  dsr_capability: "Yes — documented and tested across all vendors",
  dsr_rights_tested: ["Access", "Erasure"],
  inventory_audit: "Yes — audited + formal approval process",
};

const V2_ANTI_HEDGE_GUARDS = [
  { kind: "must_not_include" as const, pattern: "engaged_because\":\\s*\"(if|may|possibly|potentially|could)\\b", flags: "i", label: "regulatory_basis_v2 entries never hedged" },
  { kind: "must_not_include" as const, pattern: "\"trigger\":\\s*\"(tbd|to be determined|placeholder)\\b", flags: "i", label: "recommended_action_v2.trigger not hedged" },
  { kind: "must_not_include" as const, pattern: "\"intake_field\":\\s*\"\"", label: "recommended_action_v2.owner.intake_field never empty when emitted" },
];

export const GOVERNANCE_GOLDEN: GoldenCase[] = [
  {
    id: "gov-eu-mature-tuning",
    tool: "governance",
    set: "tuning",
    intake: { ...base },
    assertions: [
      { kind: "must_include", pattern: "DPO", flags: "i", label: "DPO named" },
      ...V2_ANTI_HEDGE_GUARDS,
    ],
  },
  {
    id: "gov-us-multistate-tuning",
    tool: "governance",
    set: "tuning",
    intake: {
      ...base,
      organization_name: "Pacific Retail LLC",
      sector: "Retail/ecommerce",
      jurisdictions: ["California (CCPA/CPRA)", "Other US States"],
      eu_uk_data: "No",
      privacy_notice_coverage: "n/a",
      dpo_status: "n/a",
      dpa_status: "n/a",
      dpa_art28_verified: "n/a",
      transfer_status: "n/a",
      transfer_mechanism: "n/a",
    },
    assertions: [
      { kind: "must_include", pattern: "CCPA|CPRA", flags: "i", label: "CCPA/CPRA named" },
      ...V2_ANTI_HEDGE_GUARDS,
    ],
  },
  {
    id: "gov-five-tools-count-trap-adversarial",
    tool: "governance",
    set: "adversarial",
    intake: {
      ...base,
      tools: [
        "Microsoft 365 / Copilot",
        "Google Workspace / Gemini",
        "ChatGPT / OpenAI",
        "Claude / Anthropic",
        "GitHub Copilot",
      ],
      additional_context:
        "We deploy Copilot for docs, Gemini for search, ChatGPT and Claude for research, and GitHub Copilot for code — four core productivity surfaces plus one developer surface.",
    },
    assertions: [
      { kind: "must_not_include", pattern: "\\bfour tools\\b", flags: "i", label: "does not repeat count-trap 'four tools'" },
      ...V2_ANTI_HEDGE_GUARDS,
    ],
  },
  // ITEM 313 — fixture unblock. "Perfect Data" standard: supplies every field
  // the Item 313 contract added, so the governance analytic deliverables are
  // measurable rather than degrading to record_insufficient on arrival.
  {
    id: "gov-perfect-record",
    tool: "governance",
    set: "tuning",
    intake: {
      ...base,
      organization_name: "Calder Health Analytics Ltd",
      sector: "Healthcare/Life Sciences",
      org_size: "251-1000",
      data_categories: ["Employee records", "Customer records", "Health or medical data"],
      special_category: "Yes",
      special_categories_list: ["Health data"],
      measures_review_cadence: "Annually or more often",
      measures_last_review_date: "2026-03-17",
      processing_nature:
        "Continuous ingestion of clinician-entered and device-generated health records, pseudonymisation at rest, and cohort-level analytics returned to NHS trust customers; no automated decision produces a legal or similarly significant effect on a patient.",
      processing_scope:
        "Approximately 2.4 million patient records across 31 NHS trusts and 4 EU hospital groups, refreshed nightly, retained for the seven-year clinical-audit period and then deleted on a scheduled job.",
      processing_context:
        "Patients are not the customer and have no direct relationship with Calder; they cannot practically opt out of their trust's analytics contract, so the imbalance is material and expectations are set entirely by the trust's own notice.",
      processing_purposes:
        "Clinical-outcome benchmarking, readmission-risk cohort reporting, and contractual service-level reporting to the commissioning trust. No secondary research use and no onward sale.",
      additional_context:
        "DPO reports to the CEO and also owns the information-security function, which is under review as a possible Art. 38(6) conflict.",
    },
    assertions: [
      { kind: "must_include", pattern: "Article 5\\(2\\)|Art\\. 5\\(2\\)", flags: "i", label: "accountability standard cited" },
      { kind: "must_include", pattern: "Article 30|Art\\. 30", flags: "i", label: "Art. 30 record duty reached" },
      { kind: "must_not_include", pattern: "Critical = no controls in place", label: "inline non-statutory severity scale not restated as the conclusion" },
      ...V2_ANTI_HEDGE_GUARDS,
    ],
  },
];
