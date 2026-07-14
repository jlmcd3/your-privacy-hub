// RC-C3 C3.2 — CPPA ADMT revision-contract fixtures.
//
// Anchored to run-quality-batch's cppa-admt intake schema. Two notice/opt-out
// completeness fields left blank so the generator emits ≥1 verdict-blocking
// item. Identity fields (system_name, system_type, decision_domains) fully
// populated per open-items IDENTITY_LOCKED_FIELDS.

export interface AdmtContractFixture {
  fixture_id: string;
  contract_scenario: "yield_k1_plus";
  intake: Record<string, unknown>;
  answer_targets: string[];
}

export const FIXTURE_ADMT_YIELD_K1: AdmtContractFixture = {
  fixture_id: "admt-rcC3-yield-k1-plus",
  contract_scenario: "yield_k1_plus",
  intake: {
    entity_name: "Marisol Talent Cloud, Inc.",
    system_name: "Marisol Screen v3",
    system_type: "Automated resume screening + interview scheduling",
    system_description:
      "AI-assisted screening of applicant resumes against role-specific rubrics; ranks candidates and books first-round interviews. Human recruiter reviews before rejection.",
    decision_domains: ["employment"],
    human_review: "Yes — reviewer knows how to interpret output, reviews it plus other info, and has authority to change the decision",
    training_data_use: "Yes",
    profiling_use: "Yes",
    admt_system_count: "1",
    third_party_admt: "No",
    notice_delivery: ["Account-creation or onboarding flow"],
    notice_has_specific_purpose: false,
    notice_purpose_text: "", // <-- verdict-blocking ask (§ 7220 notice requirement)
    notice_has_opt_out_desc: false,
    notice_has_access_desc: false,
    notice_has_anti_retaliation: false,
    notice_has_how_it_works: false,
    notice_has_alternative_process: false,
    opt_out_exception: "Human appeal exception (§ 7221(b)(1)) — we provide a human reviewer with authority to overturn the decision",
    opt_out_methods: [], // <-- record-completeness ask
    opt_out_link_title: "",
    opt_out_no_cookie_banner: false,
    opt_out_no_account_required: false,
    opt_out_confirmation_mechanism: "",
    opt_out_appeal_process: "Applicants who receive an adverse screening outcome may request human review via the applicant portal within 15 business days; a senior recruiter (not involved in the initial screen) reviews the resume against the role rubric and has authority to overturn the decision and advance the candidate.",
    opt_out_fairness_doc: "",
    opt_out_15_day_process: false,
    access_submission_methods: ["Applicant portal"],
    access_verification_process: "Email verification + last-4 of applicant ID",
    access_logic_disclosure: "Plain-language summary of ranking factors",
    access_outcome_disclosure: "Not_yet_implemented",
    access_response_timeline: "45 days",
    access_trade_secret_policy: "Rubric weights withheld as trade secret",
    ca_consumer_count: "50000",
    prior_access_requests_12mo: "0",
  },
  answer_targets: ["notice_purpose_text", "opt_out_methods"],
};

export const ADMT_CONTRACT_FIXTURES: AdmtContractFixture[] = [
  FIXTURE_ADMT_YIELD_K1,
];
