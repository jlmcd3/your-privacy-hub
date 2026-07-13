// RC-C1 C1.4 — CPPA Risk revision-contract fixtures.
//
// Pinned intakes crafted to exercise the three contract scenarios:
//   (a) first-pass yields k ≥ 3 open items (deliberately-thin intake)
//   (b) revision answers j < k items (partial-answer path)
//   (c) revision answers all remaining items (full-close path)
//
// The intakes are consumed by run-quality-batch's pinned-intake path
// (quality_runs.intakes seeded before dispatch). NOT sampleFixtures-only —
// callers pin these into `intakes` on a quality_runs row, then hand off to
// the standard batch pipeline which builds a real cppa-risk assessment for
// each and runs the WS6 revision path against it.
//
// Field literals are content-anchored to
// src/pages/CPPARiskAssessment.tsx (REVENUE_OPTS / CONSUMER_OPTS / …) —
// keep them in sync when the intake page changes those enums.

export interface CppaRiskContractFixture {
  fixture_id: string;
  contract_scenario: "yield_k3" | "partial_j_lt_k" | "full_close";
  intake: Record<string, unknown>;
  // Guidance for the revision harness — which pre-freeze open_items to answer.
  // Kept as target.path prefixes so it survives id slug changes.
  answer_targets?: string[];
}

// (a) yields k≥3 — mid-band revenue, ambiguous consumer count, sensitive PI
// present but volume unspecified, ADMT "In evaluation", impact half-filled.
export const FIXTURE_YIELD_K3: CppaRiskContractFixture = {
  fixture_id: "cppa-risk-rcC1-yield-k3",
  contract_scenario: "yield_k3",
  intake: {
    entity_name: "Meridian Health, Inc.",
    subject_anchor: "Mental-health triage service",
    q1_revenue: "$100M–$500M",
    q2_consumers: "1–10 million",
    q3_sector: "Healthcare",
    q4_pi_categories: "Identifiers, health, inferred mental-health state",
    q5_sell_share: "No",
    q15_sensitive_pi: "Yes",
    q15c_spi_volume: "", // <-- forces record-completeness ask
    q18_admt_use: "In evaluation", // <-- forces ADMT clarifier ask
    activity_details: "AI-driven mental-health triage with mood-diary intake",
    triggers: {}, // <-- forces triggers ask
    impact: { likelihood_of_harm: "Possible" /* severity omitted */ },
    exceptions: [],
    org_context: "",
  },
  answer_targets: [
    "q15c_spi_volume", "q18_admt_use", "impact",
  ],
};

// (b) partial — same yield but revision answers j<k
export const FIXTURE_PARTIAL_J_LT_K: CppaRiskContractFixture = {
  fixture_id: "cppa-risk-rcC1-partial-j-lt-k",
  contract_scenario: "partial_j_lt_k",
  intake: {
    entity_name: "Solstice FinPay, Inc.",
    subject_anchor: "Consumer credit-scoring product",
    q1_revenue: "$50M–$100M",
    q2_consumers: "250,000–1 million",
    q3_sector: "Financial services",
    q4_pi_categories: "Identifiers, financial, geolocation",
    q5_sell_share: "Yes — share for advertising only",
    q5c_share_revenue_50pct: "", // ask
    q15_sensitive_pi: "Yes",
    q15c_spi_volume: "", // ask
    q18_admt_use: "Yes",
    q20_admt_opt_out: "", // ask
    activity_details: "Real-time credit scoring using behavioural signals",
    triggers: { q1_revenue: "$50M–$100M" },
    impact: { likelihood_of_harm: "Likely", severity_of_harm: "Significant" },
    exceptions: [],
    org_context: "",
  },
  // Answer only 2 of the ~3+ items on the first revision.
  answer_targets: ["q5c_share_revenue_50pct", "q15c_spi_volume"],
};

// (c) full close — remaining items are answered on the second revision.
// Same intake pattern as (b); harness treats the second dispatch as full-close.
export const FIXTURE_FULL_CLOSE: CppaRiskContractFixture = {
  fixture_id: "cppa-risk-rcC1-full-close",
  contract_scenario: "full_close",
  intake: {
    entity_name: "Aurora RetailWorks, LLC",
    subject_anchor: "Loyalty-program personalization engine",
    q1_revenue: "$25M–$50M",
    q2_consumers: "100,000–249,999",
    q3_sector: "Retail",
    q4_pi_categories: "Identifiers, commercial, geolocation",
    q5_sell_share: "Yes — share for advertising only",
    q5c_share_revenue_50pct: "No",
    q15_sensitive_pi: "No",
    q18_admt_use: "Yes",
    q20_admt_opt_out: "Planned for implementation",
    activity_details: "Loyalty-tier personalization from purchase + location signals",
    triggers: { q1_revenue: "$25M–$50M", q5_sell_share: "Yes — share for advertising only" },
    impact: {
      likelihood_of_harm: "Possible", severity_of_harm: "Moderate",
      benefits_outweigh_risks: "Yes",
    },
    exceptions: [],
    org_context: "",
  },
  answer_targets: [], // answer every open_item on the second revision
};

export const CPPA_RISK_CONTRACT_FIXTURES: CppaRiskContractFixture[] = [
  FIXTURE_YIELD_K3,
  FIXTURE_PARTIAL_J_LT_K,
  FIXTURE_FULL_CLOSE,
];
