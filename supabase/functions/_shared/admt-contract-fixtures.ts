// RC-C3 C3.2 — CPPA ADMT revision-contract fixtures.
//
// Anchored to run-quality-batch's cppa-admt intake schema (form state in
// src/pages/admt/ADMTChecker.tsx). Every value below is the verbatim string
// (or string[]) a customer would submit through the intake — no booleans,
// no synthetic tokens. Two notice/opt-out completeness fields left blank
// so the generator emits ≥1 verdict-blocking item.

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
    // RC-REM-P1-B: fixture key corrected from entity_name → organization_name
    // (form submits organization_name at ADMTChecker.tsx L337).
    organization_name: "Marisol Talent Cloud, Inc.",
    system_name: "Marisol Screen v3",
    system_type: "Automated resume screening + interview scheduling",
    system_description:
      "AI-assisted screening of applicant resumes against role-specific rubrics; ranks candidates and books first-round interviews. Human recruiter reviews before rejection.",
    // Pills — value is the verbatim option string(s) from SIGNIFICANT_DECISION_DOMAINS (ADMTChecker.tsx L48–56, used at L798–800).
    decision_domains: ["Hiring or admission decisions"],
    // Radio — HUMAN_REVIEW_OPTIONS (L58–63).
    human_review: "Yes — reviewer knows how to interpret output, reviews it plus other info, and has authority to change the decision",
    // Radio — ["Yes","No"] (L943). "Unsure" removed per RC-P6.
    training_data_use: "Yes",
    // Radio — ["Yes","No"] (L955). "Unsure" removed per RC-Cleanup2.
    profiling_use: "Yes",
    // Free-text <input> (L782–787).
    admt_system_count: "1",
    // ExhibitTextarea — free-text string (L724–730). "No" is a valid free-text answer indicating none.
    third_party_admt: "No",
    // Pills — NOTICE_DELIVERY_OPTIONS (L65–71).
    notice_delivery: ["We have not yet provided a Pre-use Notice"],
    // Radio — ["Yes","No — uses generic language","We have not yet created a Pre-use Notice"] (L1002). Scenario: notice not provided.
    notice_has_specific_purpose: "We have not yet created a Pre-use Notice",
    // Textarea — verdict-blocking ask (§ 7220 notice requirement).
    notice_purpose_text: "",
    // Radio — ["Yes — with specific opt-out instructions","Mentions opt-out but without clear instructions","No","We rely on an exception and describe appeal rights instead"] (L1030). Protections absent → "No".
    notice_has_opt_out_desc: "No",
    // Radio — ["Yes","No","Not yet"] (L1045). Protections absent → "No".
    notice_has_access_desc: "No",
    // Radio — ["Yes","No","Not yet"] (L1060). Protections absent → "No".
    notice_has_anti_retaliation: "No",
    // Radio — ["Yes — included inline in the notice","Yes — via hyperlink or layered notice","Partial — some elements missing","No","Not yet"] (L1078–1084). Protections absent → "No".
    notice_has_how_it_works: "No",
    // Radio — ["Yes","No","Not applicable — we rely on an opt-out exception"] (L1099). Protections absent → "No".
    notice_has_alternative_process: "No",
    // ChoiceWithOther — OPT_OUT_EXCEPTIONS (L81–86).
    opt_out_exception: "Human appeal exception (§ 7221(b)(1)) — we provide a human reviewer with authority to overturn the decision",
    // Pills — OPT_OUT_METHODS (L73–79). Empty → record-completeness ask.
    opt_out_methods: [],
    // Free-text <input> (L1255–1261).
    opt_out_link_title: "",
    // Radio — ["Confirmed — we provide at least one ADMT-specific opt-out method in addition","Cookie banner is currently our only method (gap)"] (L1308). Protections absent → gap variant.
    opt_out_no_cookie_banner: "Cookie banner is currently our only method (gap)",
    // Radio — ["Confirmed — no account required","Account is currently required (gap)"] (L1320). Protections absent → gap variant.
    opt_out_no_account_required: "Account is currently required (gap)",
    // Free-text <input> (L1272–1278).
    opt_out_confirmation_mechanism: "",
    // Textarea — required when Human appeal exception is selected (L1143–1150).
    opt_out_appeal_process: "Applicants who receive an adverse screening outcome may request human review via the applicant portal within 15 business days; a senior recruiter (not involved in the initial screen) reviews the resume against the role rubric and has authority to overturn the decision and advance the candidate.",
    // AssistedInput/Textarea — free-text string (L1184–1191).
    opt_out_fairness_doc: "",
    // Textarea — free-text string, NOT a radio (L1289–1295). Protections absent → "".
    opt_out_15_day_process: "",
    // AssistedInput — free-text STRING, not an array (state declared as useState("") at L241; L1350–1357).
    access_submission_methods: "Applicant portal at careers.marisol.example/privacy; designated email privacy@marisol.example",
    // AssistedInput — free-text string (L1367–1374).
    access_verification_process: "Email verification + last-4 of applicant ID",
    // Textarea — free-text string (L1384–1391).
    access_logic_disclosure: "Plain-language summary of ranking factors: input features (resume keywords, role-rubric match), rubric-band output, and rank position; model weights withheld as trade secret.",
    // Textarea — free-text string (L1401–1408).
    access_outcome_disclosure: "Not yet implemented",
    // Radio — ["Within 45 calendar days (standard)","Within 45 days with documented 45-day extension capability","Our process is not yet defined"] (L1418–1422).
    access_response_timeline: "Within 45 calendar days (standard)",
    // Textarea — free-text string (L1450–1457).
    access_trade_secret_policy: "Rubric weights withheld as trade secret (Civil Code § 3426.1(d))",
    // Free-text <input> (L709–714).
    ca_consumer_count: "50000",
    // TURN 2 — new intake fields (dummy data).
    affected_population_band: "10,001 – 100,000",
    role_roster: ["Privacy officer / DPO", "Product owner", "Human reviewer"],
    // prior_access_requests_12mo removed (RC-P6).
  },
  answer_targets: ["notice_purpose_text", "opt_out_methods"],
};

export const ADMT_CONTRACT_FIXTURES: AdmtContractFixture[] = [
  FIXTURE_ADMT_YIELD_K1,
];
