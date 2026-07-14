// RC-C3 C3.2 / RC-P5 — Governance revision-contract fixtures.
//
// POST-P4 STATE (2026-07-14): the governance form no longer supports any
// customer-reachable insufficiency state — every field either resolves to a
// definite enum value or a legitimate `n/a` under a gate. Consequently the
// deterministic ASK registry for governance is intentionally empty (see
// ASK_ELIGIBLE_CRITICAL_FIELDS.governance_assessment in
// _shared/insufficient-info-guard.ts) and `information_needed` for a
// fully-populated intake MUST be `[]`.
//
// This fixture therefore encodes a definite, fully-populated intake. Any
// revision-harness expectation of "forced governance ask" is rewritten as a
// zero-open-items outcome — the QL3 orchestrator scenario map asserts this.
// Identity-locked fields (organization_name, jurisdictions) remain fully
// populated; the freeze contract must NEVER target those.

export interface GovernanceContractFixture {
  fixture_id: string;
  contract_scenario: "yield_k1_plus" | "zero_open_items";
  intake: Record<string, unknown>;
  answer_targets: string[]; // empty when the fixture asserts zero-open-items
}

export const FIXTURE_GOV_YIELD_K1: GovernanceContractFixture = {
  fixture_id: "gov-rcC3-yield-k1-plus",
  contract_scenario: "zero_open_items",
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
    // RC-P5: definite value — form radio (PRIVACY_NOTICE_COVERAGE) always
    // resolves to one of four verbatim options when privacy_policy starts
    // with "Yes"; empty is not form-reachable.
    privacy_notice_coverage: "Partially — some activities or tools not yet reflected",
    // RC-P5: definite value — DPO_STATUS radio ("Yes, formal DPO" |
    // "Yes, informal privacy lead" | "No"); empty not form-reachable when
    // eu_uk_data === "Yes".
    dpo_status: "Yes, informal privacy lead",
    dpia_status: "Yes, one DPIA completed",
    dpia_ai_coverage: "Some covered",
    incident_response: "Documented but informal",
    training_status: "Ad hoc only",
    training_ai_coverage: "n/a",
    tool_instruction: "Verbal guidance only",
    dpa_status: "Most vendors",
    dpa_art28_verified: "Partially",
    transfer_status: "Yes, US-based tools",
    // RC-P5: definite value — TRANSFER_MECHANISM radio; empty not
    // form-reachable when transfer_status ∈ {"Yes, US-based tools", …}.
    transfer_mechanism: "EU Standard Contractual Clauses (SCCs)",
    technical_controls: "Partial — some tools or categories",
    technical_controls_list: [],
    dsr_capability: "Ad hoc / not documented",
    dsr_rights_tested: [],
    inventory_audit: "Inventory exists, no formal audit/approval",
    additional_context: "",
  },
  // Post-P4: zero-open-items expected. No revision targets.
  answer_targets: [],
};


export const GOVERNANCE_CONTRACT_FIXTURES: GovernanceContractFixture[] = [
  FIXTURE_GOV_YIELD_K1,
];
