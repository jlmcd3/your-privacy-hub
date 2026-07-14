// RC-C3 C3.2 — Governance revision-contract fixtures.
//
// Pinned intake authored to be deliberately THIN on two non-identity fields
// so the generator's information-needed pass emits ≥1 verdict-blocking /
// record-completeness open_item after `buildOpenItems` classification.
// Identity-locked fields (organization_name, jurisdictions) are fully
// populated per IDENTITY_LOCKED_FIELDS in _shared/open-items.ts — the freeze
// must NEVER target those.
//
// Anchored to run-quality-batch's governance intake schema (see the
// GENERATE_INTAKE prompt at ~line 912) and to run-governance-assessment.

export interface GovernanceContractFixture {
  fixture_id: string;
  contract_scenario: "yield_k1_plus";
  intake: Record<string, unknown>;
  answer_targets: string[]; // target.path prefixes the revision will answer
}

export const FIXTURE_GOV_YIELD_K1: GovernanceContractFixture = {
  fixture_id: "gov-rcC3-yield-k1-plus",
  contract_scenario: "yield_k1_plus",
  intake: {
    organization_name: "Cordelia Analytics Ltd",
    sector: "MarTech / analytics",
    org_size: "51-250",
    jurisdictions: ["EU", "UK", "US-CA"],
    eu_uk_data: "Yes",
    tools: ["Google Workspace", "HubSpot", "OpenAI ChatGPT Enterprise", "AWS"],
    data_categories: [
      "Contact details", "Identifiers", "Behavioural / browsing data", "Inferences",
    ],
    special_category: "No",
    privacy_policy: "Yes, but outdated (>12 months)",
    privacy_notice_coverage: "", // <-- record-completeness ask
    
    dpo_status: "", // <-- verdict-blocking ask (EU/UK data + no DPO status)
    dpia_status: "Partial — some activities covered",
    dpia_ai_coverage: "Partial",
    incident_response: "Documented but not tested",
    training_status: "Yes, ad-hoc",
    training_ai_coverage: "Partial",
    tool_instruction: "Verbal guidance only",
    dpa_status: "Most vendors",
    dpa_art28_verified: "Partial",
    transfer_status: "Yes, US-based tools",
    transfer_mechanism: "", // <-- verdict-blocking ask (transfer without mechanism)
    technical_controls: "Partial — some tools or categories",
    additional_context: "",
  },
  answer_targets: ["dpo_status", "transfer_mechanism", "privacy_notice_coverage"],
};

export const GOVERNANCE_CONTRACT_FIXTURES: GovernanceContractFixture[] = [
  FIXTURE_GOV_YIELD_K1,
];
