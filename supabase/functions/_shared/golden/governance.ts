// QB-P20 — governance golden set. 3 fixtures.
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

export const GOVERNANCE_GOLDEN: GoldenCase[] = [
  {
    id: "gov-eu-mature-tuning",
    tool: "governance",
    set: "tuning",
    intake: { ...base },
    assertions: [
      { kind: "must_include", pattern: "DPO", flags: "i", label: "DPO named" },
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
    ],
  },
];
