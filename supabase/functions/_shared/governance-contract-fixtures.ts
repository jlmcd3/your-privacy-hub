// RC-C3 C3.2 — Governance revision-contract fixtures.
//
// Pinned intake authored to be deliberately THIN on two non-identity fields
// so the generator's information-needed pass emits ≥1 verdict-blocking /
// record-completeness open_item after `buildOpenItems` classification.
// Identity-locked fields (organization_name, jurisdictions) are fully
// populated per IDENTITY_LOCKED_FIELDS in _shared/open-items.ts — the freeze
// must NEVER target those.
//
// P1-C: values normalised to verbatim form options
// (src/pages/GovernanceAssessment.tsx L43–L149, L594–L667) so this fixture
// passes validateIntake(governanceContract, …) cleanly. Intentional thin
// spots (`dpo_status`, `transfer_mechanism`, `privacy_notice_coverage`)
// remain empty strings — the validator does not enforce conditional
// requiredness, only enum verbatim-ness on present values.

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
    sector: "Media/advertising",
    org_size: "51-250",
    jurisdictions: ["EU (GDPR)", "United Kingdom (UK GDPR)", "California (CCPA/CPRA)"],
    eu_uk_data: "Yes",
    tools: ["Google Workspace / Gemini", "HubSpot", "ChatGPT / OpenAI"],
    data_categories: [
      "Contact details", "Customer records", "Communications content",
    ],
    special_category: "No",
    special_categories_list: [],
    privacy_policy: "Yes, but outdated",
    privacy_notice_coverage: "", // <-- record-completeness ask

    dpo_status: "", // <-- verdict-blocking ask (EU/UK data + no DPO status)
    dpia_status: "Yes, one DPIA completed",
    dpia_ai_coverage: "Some covered",
    incident_response: "Documented but informal",
    training_status: "Ad hoc only",
    training_ai_coverage: "n/a",
    tool_instruction: "Verbal guidance only",
    dpa_status: "Most vendors",
    dpa_art28_verified: "Partially",
    transfer_status: "Yes, US-based tools",
    transfer_mechanism: "", // <-- verdict-blocking ask (transfer without mechanism)
    technical_controls: "Partial — some tools or categories",
    technical_controls_list: [],
    dsr_capability: "Ad hoc / not documented",
    dsr_rights_tested: [],
    inventory_audit: "Inventory exists, no formal audit/approval",
    additional_context: "",
  },
  answer_targets: ["dpo_status", "transfer_mechanism", "privacy_notice_coverage"],
};

export const GOVERNANCE_CONTRACT_FIXTURES: GovernanceContractFixture[] = [
  FIXTURE_GOV_YIELD_K1,
];
