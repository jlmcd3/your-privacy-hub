// RC-C1 C1.4 — CPPA Risk revision-contract fixtures.
//
// RC-D.5 FIX-CPPA-1 (2026-07-13): rewritten in LEGACY-FLAT shape so
// `normaliseIntake` routes them through `shimLegacyIntake` (the branch that
// maps entity_name → org_context.company_name and applies lenient
// validation). The prior authoring carried native discriminator keys
// (`triggers: {}`, `org_context: ""`, `impact: {...}`, `exceptions: []`) which
// forced the native branch, where org_context.company_name was undefined and
// pre-generation validation failed (VALIDATION_FAILED / org_context.company_name).
//
// SHAPE CHOICE — Option A (legacy flat) per courier RC-D.5:
//   • NO `triggers` key (top-level absence is the shim discriminator).
//   • NO `org_context` / `exceptions` / `impact` object literals — impact
//     inputs move into `impact_intake` (the shape shimLegacyIntake reads).
//   • entity_name is the sole company-name source; the shim maps it to
//     org_context.company_name.
//   • lenient=true applies (wasLegacyShimmed=true), so the ≥50-char purpose
//     and ≥100-char rationale strict-mode rules are bypassed and the
//     deliberate thin spots survive to produce the contract scenarios.
//
// Field literals remain content-anchored to
// src/pages/CPPARiskAssessment.tsx (REVENUE_OPTS / CONSUMER_OPTS / …).

export interface CppaRiskContractFixture {
  fixture_id: string;
  contract_scenario: "yield_k3" | "partial_j_lt_k" | "full_close";
  intake: Record<string, unknown>;
  // Guidance for the revision harness — which pre-freeze open_items to answer.
  // Kept as target.path prefixes so it survives id slug changes.
  answer_targets?: string[];
}

// (a) yields k≥3 open items after first pass. Expected ask sources:
//   1. q15c_spi_volume "" while q15_sensitive_pi="Yes" — SPI-volume figure
//      is required to resolve § 7120(b)(2)(B) and to size SPI processing;
//      the empty field routes to an information_needed anchored to
//      q15c_spi_volume.
//   2. q18_admt_use "In evaluation" with q19_admt_description /
//      q20_admt_opt_out both empty — the ADMT branch (§ 7150(b)(6),
//      § 7220 opt-out mechanics) is engaged by the shim's regex but the
//      logic/opt-out record is empty; the generator raises ask(s) for
//      admt_description and admt_opt_out.
//   3. impact_intake carries likelihood only; severity, benefitsOutweigh,
//      benefits/consumer/stakeholder benefits, and rationale are absent —
//      the shim defaults keep validation green under lenient mode, but the
//      empty benefits text and blank rationale surface as
//      information_needed entries (§ 7152(a)(4) benefits + § 7154 balancing).
// Total floor of asks is comfortably ≥3.
// RC-REM-P1-B: fixtures expanded with all form-gated required-always
// fields so validateIntake(cppaRiskContract, fixture.intake) passes with
// zero violations. Thin-spot fields (q15c, q19/q20 where q18-conditional,
// impact_intake benefits/rationale) are intentionally left blank/omitted
// because the contract marks those conditional or optional — the revision
// harness still surfaces them as asks.
// RC-REM-P1-B (re-courier 2026-07-14): q4_pi_categories, q6_right_know_multi,
// and q3_sector are now closed enums per the contract — fixture values
// below are verbatim members of PI_CATEGORIES / Q6_ACCESS_OPTS / SECTORS
// respectively (source: src/pages/CPPARiskAssessment.tsx L96-116, L857).
const REQUIRED_ALWAYS_FILLERS = {
  q5b_profiling_observation: "No",
  q6_right_know: "Online form with identity verification",
  q6_right_know_multi: ["Online form with identity verification"],
  q7_right_delete: "Manual process, documented",
  q8_right_correct: "Handled via support",
  q9_opt_out: "Yes, prominently on homepage",
  q10_id_verification: "Documented verification process matching CPPA guidance",
  q11_policy_review: "Within 12 months",
  q12_notice_at_collection: "Yes, covers all collection points",
  q13_notice_content: "Yes, all three",
  q14_employee_notice: "Not applicable (no CA employees)",
  q15b_under16_knowledge: "No — we do not knowingly process under-16 data",
  q18b_admt_training: "No",
  i1b_min_pi: "Identifiers and processing-related fields; no ancillary categories.",
  i2_retention_period: "24 months",
  i2_retention_criteria: "Until purpose is fulfilled, then deletion",
  i3_ca_consumer_band: "100,000–1,000,000",
  i4_disclosure_mechanisms: ["Privacy policy"],
  i4b_sources: "Directly from consumers via the product",
  i6_vendors: "None",
  i7_internal_contributors: "Privacy Office; Product Engineering",
  i8_certifying_exec_name: "Alex Certifier",
  i8_certifying_exec_title: "Chief Privacy Officer",
  i9_has_existing_dpia: "No",
} as const;

export const FIXTURE_YIELD_K3: CppaRiskContractFixture = {
  fixture_id: "cppa-risk-rcC1-yield-k3",
  contract_scenario: "yield_k3",
  intake: {
    entity_name: "Meridian Health, Inc.",
    subject_anchor: "Mental-health triage service",
    q1_revenue: "Over $100M",
    q2_consumers: "1,000,000 or more",
    q3_sector: "Healthcare/Life Sciences",
    q4_pi_categories: [
      "Contact identifiers (name, email, phone)",
      "Health or medical information",
      "Other",
    ],
    q5_sell_share: "No",
    q15_sensitive_pi: "Yes",
    q15c_spi_volume: "", // <-- ask
    q18_admt_use: "In evaluation", // <-- ADMT clarifier ask
    q19_admt_description: "",
    q20_admt_opt_out: "",
    i1_processing_purpose: "AI-driven mental-health triage with mood-diary intake",
    // TURN 1b — new intake fields.
    public_privacy_policy_url: "https://meridian.example/privacy",
    sensitive_location_basis: "Healthcare facility or medical office",
    impact_intake: {
      likelihood: "Possible",
      // severity intentionally omitted — shim defaults to "Moderate"
      // benefits + rationale intentionally omitted — surface as asks
    },
    exceptions_intake: {},
    ...REQUIRED_ALWAYS_FILLERS,
  },
  answer_targets: [
    "q15c_spi_volume", "q18_admt_use", "impact",
  ],
};

// (b) partial — first pass yields ~3 asks, revision answers only 2 of them.
// Expected ask sources after shim:
//   1. q5c_share_revenue_50pct "" while q5_sell_share is a "Yes — share..."
//      value — § 7121 revenue-prong indeterminate → ask anchored to
//      q5c_share_revenue_50pct.
//   2. q15c_spi_volume "" while q15_sensitive_pi="Yes" — as in (a).
//   3. q20_admt_opt_out "" while q18_admt_use="Yes" — § 7220 opt-out
//      record missing → ask.
// answer_targets deliberately covers 2 of 3 to force j<k.
export const FIXTURE_PARTIAL_J_LT_K: CppaRiskContractFixture = {
  fixture_id: "cppa-risk-rcC1-partial-j-lt-k",
  contract_scenario: "partial_j_lt_k",
  intake: {
    entity_name: "Solstice FinPay, Inc.",
    subject_anchor: "Consumer credit-scoring product",
    q1_revenue: "$50M to $100M",
    q2_consumers: "250,000 to under 1,000,000",
    q3_sector: "Financial services",
    q4_pi_categories: [
      "Contact identifiers (name, email, phone)",
      "Financial information",
      "Precise geolocation (GPS-level / specific address)",
    ],
    q5_sell_share: "Yes — share for advertising only",
    q5c_share_revenue_50pct: "", // ask
    q15_sensitive_pi: "Yes",
    q15c_spi_volume: "", // ask
    q18_admt_use: "Yes",
    q19_admt_description: "Real-time credit scoring using behavioural signals",
    q20_admt_opt_out: "", // ask
    i1_processing_purpose: "Real-time credit scoring using behavioural signals",
    // TURN 1b — new intake fields.
    public_privacy_policy_url: "https://solstice.example/privacy",
    sensitive_location_basis: "Not applicable — no sensitive-location processing",
    impact_intake: {
      likelihood: "Likely",
      severity: "Significant",
    },
    exceptions_intake: {},
    ...REQUIRED_ALWAYS_FILLERS,
  },
  // Answer only 2 of the ~3+ items on the first revision.
  answer_targets: ["q5c_share_revenue_50pct", "q15c_spi_volume"],
};

// (c) full close — remaining items are answered on the second revision.
// Same intake pattern as (b) with the deliberate thin spots filled so the
// first pass yields fewer asks, and the harness treats the second dispatch
// as full-close.
export const FIXTURE_FULL_CLOSE: CppaRiskContractFixture = {
  fixture_id: "cppa-risk-rcC1-full-close",
  contract_scenario: "full_close",
  intake: {
    entity_name: "Aurora RetailWorks, LLC",
    subject_anchor: "Loyalty-program personalization engine",
    q1_revenue: "$25M to under $50M",
    q2_consumers: "100,000 to under 250,000",
    q3_sector: "Retail/ecommerce",
    q4_pi_categories: [
      "Contact identifiers (name, email, phone)",
      "Internet or network activity",
      "Precise geolocation (GPS-level / specific address)",
    ],
    q5_sell_share: "Yes — share for advertising only",
    q5c_share_revenue_50pct: "No",
    q15_sensitive_pi: "No",
    q18_admt_use: "Yes",
    q19_admt_description: "Loyalty-tier personalization from purchase and location signals",
    q20_admt_opt_out: "Planned for implementation",
    i1_processing_purpose: "Loyalty-tier personalization from purchase and location signals",
    // TURN 1b — new intake fields (retail store visits ≠ § 7150(b)(5) sensitive location).
    public_privacy_policy_url: "https://aurora.example/privacy",
    sensitive_location_basis: "Not applicable — no sensitive-location processing",
    impact_intake: {
      likelihood: "Possible",
      severity: "Moderate",
      benefitsOutweigh: "Yes",
    },
    exceptions_intake: {},
    ...REQUIRED_ALWAYS_FILLERS,
  },
  answer_targets: [], // answer every open_item on the second revision
};

export const CPPA_RISK_CONTRACT_FIXTURES: CppaRiskContractFixture[] = [
  FIXTURE_YIELD_K3,
  FIXTURE_PARTIAL_J_LT_K,
  FIXTURE_FULL_CLOSE,
];
