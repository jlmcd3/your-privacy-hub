// QB-P20 — CPPA ADMT golden set. 3 fixtures.
// Adversarial: pure-advertising scenario that historically invited
// §7001 as an anchor for the DUTY (vs. §7220-series). Fixture is
// solely_advertising with NO significant decisions.
import type { GoldenCase } from "./types.ts";

const commonNotice = {
  notice_delivery: ["Included in our Notice at Collection"] as string[],
  notice_has_specific_purpose: "Yes",
  notice_has_opt_out_desc: "Yes — with specific opt-out instructions",
  notice_has_access_desc: "Yes",
  notice_has_anti_retaliation: "Yes",
  notice_has_how_it_works: "Yes — included inline in the notice",
  notice_has_alternative_process: "Yes",
  access_submission_methods: "Online form on privacy portal.",
  access_verification_process: "Match to account with 2FA.",
  access_logic_disclosure: "We provide a plain-language description of the model inputs and decision rule.",
  access_outcome_disclosure: "The decision, its factors, and appeal path are disclosed in the response.",
  access_response_timeline: "Within 45 calendar days (standard)",
};

export const CPPA_ADMT_GOLDEN: GoldenCase[] = [
  {
    id: "admt-hr-significant-tuning",
    tool: "cppa-admt",
    set: "tuning",
    intake: {
      organization_name: "Meridian Talent Corp",
      system_name: "TalentRank",
      system_type: "ML classifier",
      system_description: "TalentRank scores résumés against role profiles using an in-house LightGBM model; hiring managers see a ranked list.",
      decision_domains: ["Hiring or admission decisions"],
      human_review: "Yes — reviewer knows how to interpret output, reviews it plus other info, and has authority to change the decision",
      training_data_use: "No",
      profiling_use: "No",
      ...commonNotice,
      opt_out_exception: "Hiring/admission exception (§ 7221(b)(2)) — ADMT used solely to assess ability; no unlawful discrimination",
      // TURN 2 — dummy data for new intake fields
      affected_population_band: "10,001 – 100,000",
      role_roster: ["Privacy officer / DPO", "Product owner", "Human reviewer"],
    },
    assertions: [
      { kind: "must_include", pattern: "7221", flags: "i", label: "§7221 anchored" },
      // QB-P25 A3 — established basis when the intake identifies the category.
      { kind: "must_include", pattern: "\"determination_basis\"\\s*:\\s*\"established\"", flags: "", label: "determination_basis=established" },
      // Per-entry enforcement_exposure is now enum-only; free-form dollar text is banned.
      { kind: "must_not_include", pattern: "\"enforcement_exposure\"\\s*:\\s*\"[^\"]*\\$", flags: "", label: "no dollar figures in per-entry enforcement_exposure" },
      // W9-ADMT-WIRE S5 — top_3_actions hard slot always present (post-gen normalizer pads to 3).
      { kind: "must_include", pattern: "\"top_3_actions\"", flags: "", label: "S5 top_3_actions slot present" },
      // TURN 2 — deterministic slots must be present in every emit.
      { kind: "must_include", pattern: "\"applicability_verdict\"", flags: "", label: "A-C applicability_verdict slot present" },
      { kind: "must_include", pattern: "\"deadline_table\"", flags: "", label: "A-C deadline_table slot present" },
      { kind: "must_include", pattern: "\"adequacy_finding\"", flags: "", label: "A-A/A-B adequacy_finding slot present" },
    ],
  },
  {
    id: "admt-credit-significant-tuning",
    tool: "cppa-admt",
    set: "tuning",
    intake: {
      organization_name: "Sequoia Credit",
      system_name: "CreditGuard",
      system_type: "Statistical model",
      system_description: "CreditGuard scores personal loan applications using a logistic regression with 30 features; decisions gate credit lines.",
      decision_domains: ["Financial or lending services (credit decisions, loans, accounts)"],
      human_review: "Partial — reviewer sees the output but cannot override it",
      training_data_use: "Yes",
      profiling_use: "Yes",
      ...commonNotice,
      opt_out_exception: "No exception — we provide a full opt-out right",
    },
    assertions: [
      { kind: "must_include", pattern: "opt[- ]?out", flags: "i", label: "opt-out framed" },
      { kind: "must_include", pattern: "\"determination_basis\"\\s*:\\s*\"established\"", flags: "", label: "determination_basis=established" },
    ],
  },
  {
    id: "admt-advertising-adversarial",
    tool: "cppa-admt",
    set: "adversarial",
    intake: {
      organization_name: "Bright Ads Co",
      system_name: "AdPicker",
      system_type: "Ranking / recommender",
      system_description: "AdPicker chooses which display ad to show in a slot based on contextual signals only; no significant decision affecting any consumer.",
      decision_domains: ["Financial or lending services (credit decisions, loans, accounts)"],
      human_review: "Not applicable / unsure",
      training_data_use: "No",
      profiling_use: "No",
      ...commonNotice,
      opt_out_exception: "No exception — we provide a full opt-out right",
      admt_detail: { solely_advertising: "Yes — solely advertising" },
    },
    assertions: [
      { kind: "must_not_include", pattern: "significant decision", flags: "i",
        label: "does NOT invent significant-decision status" },
      // Established out-of-scope: solely_advertising = Yes resolves the category.
      { kind: "must_include", pattern: "\"determination_basis\"\\s*:\\s*\"established\"", flags: "", label: "determination_basis=established (out-of-scope resolved)" },
    ],
  },
  // QB-P25 A3 — conservative-assumption fixture: the intake does not name an
  // enumerated § 7001(ddd) category, so triggers_significant_decision is set
  // TRUE with determination_basis="conservative_assumption" and the three gap
  // arrays render in COMPACT mode.
  {
    id: "admt-service-eligibility-conservative",
    tool: "cppa-admt",
    set: "adversarial",
    intake: {
      organization_name: "Northstar Platform Inc",
      system_name: "TierSelect",
      system_type: "Rules engine",
      system_description: "TierSelect assigns customers to service tiers for a general consumer subscription product. The operations team originally flagged this as financial-adjacent when scoping the review, but the platform is a general consumer subscription — the tier assignment does NOT determine credit decisions, loan eligibility, account approval, or any other financial-services outcome. The intake does not identify the underlying service as clearly falling within any enumerated § 7001(ddd) category (financial, lending, housing, education, employment, or healthcare).",
      // QB-P25 boundary-batch fix: SIGNIFICANT_DECISION_DOMAINS is
      // required-always in the contract (multi-enum, min 1). We supply the
      // operator's originally-flagged candidate to satisfy the contract
      // while the system_description above disclaims it, preserving the
      // conservative_assumption bait (intake does not affirmatively
      // establish the category — the model should still default to
      // determination_basis="conservative_assumption").
      decision_domains: ["Financial or lending services (credit decisions, loans, accounts)"],
      human_review: "No — fully automated, no human review",
      training_data_use: "No",
      profiling_use: "No",
      ...commonNotice,
      opt_out_exception: "No exception — we provide a full opt-out right",
    },
    assertions: [
      { kind: "must_include", pattern: "\"determination_basis\"\\s*:\\s*\"conservative_assumption\"", flags: "", label: "determination_basis=conservative_assumption" },
      { kind: "must_include", pattern: "duty_if_in_scope", flags: "", label: "COMPACT entries carry duty_if_in_scope" },
      // COMPACT entries omit remediation entirely.
      { kind: "must_not_include", pattern: "\"remediation\"", flags: "", label: "no remediation field in COMPACT mode" },
    ],
  },
  // ─────────────────────────────────────────────────────────────────────
  // ITEM 309 — "Perfect Data" fixture. Supplies EVERY field Item 308 added
  // to the contract (notice_element_text.*, admt_detail.appeal_step_count,
  // admt_detail.sole_use_attestation, admt_detail.nondiscrimination_testing)
  // so a quality-batch run on cppa-admt exercises the ANALYSED path of the
  // three deliverables rather than the record_insufficient path.
  //
  // Notice text is deliberately SPECIFIC: each element names the concrete
  // system, the concrete inputs/output, and the concrete route. None of the
  // GENERIC_TEXT_PATTERNS in ltp/admt-deliverables/build.ts ("business
  // purposes", "improve our service", "as described in our privacy policy",
  // "various purposes", "among other things", "operational purposes") appear
  // — tripping that screen would defeat the point of a Perfect fixture.
  //
  // Exception claimed: § 7221(b)(2) hiring/admission. Both (b)(2) conditions
  // carry evidence, and the (b)(1) appeal operands are supplied too and are
  // mutually consistent: a named reviewer role, trained = Yes, authority to
  // overturn = Yes, and a step count that matches the narrated appeal flow.
  {
    id: "admt-hr-perfect-record",
    tool: "cppa-admt",
    set: "tuning",
    intake: {
      organization_name: "Cascadia Health Systems, Inc.",
      system_name: "NurseMatch v4",
      system_type: "ML classifier",
      system_description:
        "NurseMatch v4 scores registered-nurse applications for inpatient staff-nurse openings. It reads the licence record, years of acute-care experience, unit-specific competency checklist scores, and shift-availability, and returns a rubric band (A–D) plus a rank within the requisition. Recruiters see the band and rank alongside the full application before advancing or rejecting.",
      decision_domains: ["Hiring or admission decisions"],
      human_review:
        "Yes — reviewer knows how to interpret output, reviews it plus other info, and has authority to change the decision",
      training_data_use: "Yes",
      profiling_use: "Yes",
      admt_system_count: "1",
      third_party_admt: "No",
      ca_consumer_count: "42000",

      notice_delivery: ["Separate standalone Pre-use Notice"],
      notice_has_specific_purpose: "Yes",
      notice_purpose_text:
        "We use NurseMatch v4 to rank registered-nurse applicants for a specific inpatient staff-nurse requisition against that unit's competency rubric.",
      notice_has_opt_out_desc: "Yes — with specific opt-out instructions",
      notice_has_access_desc: "Yes",
      notice_has_anti_retaliation: "Yes",
      notice_has_how_it_works: "Yes — included inline in the notice",
      notice_has_alternative_process: "Yes",

      // ITEM 308 (a) — published pre-use notice text, transcribed element by
      // element from the standalone notice served at application start.
      notice_element_text: {
        purpose:
          "Cascadia Health Systems uses NurseMatch v4 to rank your registered-nurse application against the competency rubric for the specific inpatient unit you applied to, and to place you in rubric band A, B, C or D for that requisition. We use it for no other decision about you.",
        optout:
          "You may tell us not to run NurseMatch v4 on your application. Select \"Do not use automated screening\" on the application review page, call 1-800-555-0142 (option 3), or email admt-optout@cascadiahealth.example with your requisition number. We stop the automated screening within 15 business days of the request and route your application to manual review.",
        access:
          "You may ask us what NurseMatch v4 did with your application. Submit the request at cascadiahealth.example/privacy/admt-access or by calling 1-800-555-0142 (option 4). We will tell you the rubric band we assigned, the inputs we used, the rank recorded for your requisition, and how that output was used in the hiring decision, within 45 calendar days.",
        antiretaliation:
          "Cascadia Health Systems will not deny your application, withdraw an offer, delay your requisition, downgrade your rubric band, or treat you less favourably in any way because you opted out of NurseMatch v4, asked us for access to its output, or exercised any other CCPA right.",
        howworks_inputs:
          "NurseMatch v4 reads four inputs from your application: your California RN licence status and expiry from the licence field, the number of months of acute-care experience you listed, your self-reported scores on the unit competency checklist, and the shift availability you selected. It does not read your name, address, photograph, date of birth, or any free-text personal statement.",
        howworks_output:
          "NurseMatch v4 outputs a rubric band (A, B, C or D) and a numeric rank within the requisition. The band reflects how closely your listed experience and checklist scores match the unit rubric; the rank orders candidates within a band by acute-care months. A recruiter reads the band and rank next to your full application and decides whether to advance or reject; the band alone never rejects an application.",
        altprocess:
          "If you opt out, a Cascadia nurse recruiter reviews your full application against the same unit competency rubric by hand, within the same requisition timeline, and records the rubric band manually. Opting out does not remove you from consideration for the requisition.",
      },

      opt_out_exception:
        "Hiring/admission exception (§ 7221(b)(2)) — ADMT used solely to assess ability; no unlawful discrimination",
      opt_out_methods: [
        "Interactive online form linked from the Pre-use Notice",
        "Toll-free phone number",
        "Designated email address",
      ],
      opt_out_link_title: "Do not use automated screening",
      opt_out_no_cookie_banner:
        "Confirmed — we provide at least one ADMT-specific opt-out method in addition",
      opt_out_no_account_required: "Confirmed — no account required",
      opt_out_confirmation_mechanism:
        "Emailed confirmation with a ticket number within one business day, and a status page at cascadiahealth.example/privacy/admt-status.",
      opt_out_appeal_process:
        "An applicant who receives an adverse screening outcome requests human review from the decision email (step 1); the request routes to a senior nurse recruiter who took no part in the original screen (step 2); that recruiter re-reviews the full application against the unit rubric and records a written outcome that either affirms or overturns the band and the reject decision (step 3). The three steps complete within 15 business days.",
      opt_out_15_day_process:
        "Opt-out and appeal requests are worked from a single queue with a 15-business-day service level; the queue owner (Talent Operations Manager) reports breaches weekly to the Privacy Officer.",
      opt_out_fairness_doc:
        "Adverse-impact testing of NurseMatch v4 band assignments was performed on 2026-03-18 by the People Analytics team with outside counsel oversight, covering race, sex, age (40+), and disability status, using the four-fifths selection-rate rule plus a two-proportion z-test at p<0.05 on 18 months of requisition data (11,204 applications). No selection-rate ratio fell below 0.92. The report and the underlying tables are retained as CHS-AIA-2026-03.",

      access_submission_methods:
        "Online request form at cascadiahealth.example/privacy/admt-access; toll-free 1-800-555-0142 (option 4).",
      access_verification_process:
        "Match the requisition number plus the applicant email of record, then a one-time code to that email.",
      access_logic_disclosure:
        "We disclose the four inputs read, the rubric band returned, the rank within the requisition, and the fact that a recruiter weighed the band alongside the full application. Rubric weights are withheld as a trade secret.",
      access_outcome_disclosure:
        "We disclose the band assigned, the rank recorded, the hiring decision made, and the appeal route, in the access response.",
      access_response_timeline: "Within 45 calendar days (standard)",
      access_trade_secret_policy:
        "Rubric weightings are withheld under Civil Code § 3426.1(d); everything else in the logic disclosure is released.",

      // UPGRADE-3 ITEM 1 — the business's ACTUAL published pre-use notice,
      // pasted whole so the § 7220(c) findings test the notice's own words.
      notice_full_text:
        "Notice of Automated Decisionmaking Technology — Cascadia Health Systems, Inc. " +
        "We use NurseMatch v4 to rank your registered-nurse application against the competency rubric for the specific inpatient unit you applied to, and to place you in rubric band A, B, C or D for that requisition. We use it for no other decision about you. " +
        "You may tell us not to run NurseMatch v4 on your application. Select \"Do not use automated screening\" on the application review page, call 1-800-555-0142 (option 3), or email admt-optout@cascadiahealth.example with your requisition number. " +
        "You may ask us what NurseMatch v4 did with your application at cascadiahealth.example/privacy/admt-access. " +
        "Cascadia Health Systems will not retaliate against you for opting out or for asking for access. " +
        "NurseMatch v4 reads your California RN licence status, months of acute-care experience, unit competency checklist scores, and shift availability, and outputs a rubric band and a rank within the requisition; a recruiter reads that band and rank next to your full application. " +
        "If you opt out, a Cascadia nurse recruiter reviews your full application against the same unit competency rubric by hand.",

      // UPGRADE-3 ITEM 3 — § 7222 access-readiness record, complete.
      access_readiness: {
        b1_purpose_ready: "Yes — we can produce this today",
        b1_purpose_process:
          "Requisition record stores the NurseMatch purpose string per applicant; the consumer-request handler copies it into the access response.",
        b2_logic_ready: "Yes — we can produce this today",
        b2_logic_process:
          "Model card CHS-NM4-LOGIC states the four inputs, the rubric-band rule, and the documented limitations; released with trade-secret weightings withheld.",
        b3_output_use_ready: "Yes — we can produce this today",
        b3_output_use_process:
          "Applicant tracking system logs the band and rank shown to the recruiter and the advance/reject action taken against them.",
        b3_outcome_ready: "Yes — we can produce this today",
        b3_outcome_process:
          "Requisition decision record returns the final hiring outcome for the applicant.",
        b3_human_role_ready: "Yes — we can produce this today",
        b3_human_role_process:
          "Recruiter review is stamped in the ATS with reviewer identity, the information reviewed, and the action taken.",
      },

      affected_population_band: "10,001 – 100,000",
      role_roster: [
        "Executive sponsor",
        "Privacy officer / DPO",
        "Legal counsel",
        "Product owner",
        "Data scientist / ML engineer",
        "Human reviewer",
        "Consumer-request handler",
      ],

      admt_detail: {
        vendor_status: "Service provider",
        vendor_docs: ["Model card / datasheet", "Validation report", "Bias-testing report"],
        vendor_makes_available: "Yes",
        v_audit: "Yes",
        v_assist: "Yes",
        v_optout: "Yes",
        v_appeal: "Yes",
        v_incident: "Yes",
        hosting: "Hosted by the vendor",
        model_types: ["ML classifier"],
        decision_effects: ["Ranking", "Eligibility"],
        decision_cadence: "Repeated",
        sole_factor: "Material factor — heavily weighted alongside others",
        feeds_future_decisions: "No",
        solely_advertising: "No",
        // ITEM 308 (b) — § 7221(b)(1) condition evidence. Consistent with
        // opt_out_appeal_process above: three steps, senior nurse recruiter,
        // trained, holds overturn authority.
        appeal_reviewer_role:
          "Senior nurse recruiter (RN, Talent Acquisition) who took no part in the original screen",
        appeal_trained: "Yes",
        appeal_authority_overturn: "Yes",
        appeal_step_count: "3",
        // ITEM 308 (c) — § 7221(b)(2) condition evidence.
        sole_use_attestation: "Yes — solely to assess ability to perform",
        nondiscrimination_testing: "Yes — documented testing record",
      },
    },
    assertions: [
      { kind: "must_include", pattern: "7221", flags: "i", label: "§7221 anchored" },
      { kind: "must_include", pattern: "\"determination_basis\"\\s*:\\s*\"established\"", flags: "", label: "determination_basis=established" },
      // ITEM 309 — the Perfect record must drive the deliverables off the
      // record_insufficient path.
      { kind: "must_include", pattern: "\"notice_element_findings\"", flags: "", label: "deliverable 1 present" },
      { kind: "must_include", pattern: "\"exception_qualification\"", flags: "", label: "deliverable 2 present" },
      { kind: "must_include", pattern: "\"determination\"", flags: "", label: "deliverable 3 present" },
      { kind: "must_not_include", pattern: "record_insufficient", flags: "", label: "no insufficient-record notice element on a complete record" },
      // UPGRADE-3 — new deliverables present on the Perfect record.
      { kind: "must_include", pattern: "\"exception_identification\"", flags: "", label: "§7220(c)(2)(B) identification duty present" },
      { kind: "must_include", pattern: "\"access_readiness_findings\"", flags: "", label: "§7222 access readiness present" },
      { kind: "must_include", pattern: "7222", flags: "", label: "§7222 anchored" },
      { kind: "must_include", pattern: "\"authority_exhibit\"", flags: "", label: "authority exhibit attached" },
    ],
  },
  // ─────────────────────────────────────────────────────────────────────
  // UPGRADE-3 — "Messy Data" counterpart. The record is thin in exactly the
  // places § 7222 tests: no published notice text, no access-readiness
  // answers, no logic/outcome disclosure. The deliverables must degrade to
  // record_insufficient rather than assert readiness the record cannot carry.
  {
    id: "admt-hr-messy-record",
    tool: "cppa-admt",
    set: "tuning",
    intake: {
      organization_name: "Northgate Staffing LLC",
      system_name: "ShiftRank",
      system_type: "Ranking / recommender",
      system_description:
        "ShiftRank orders applicants for warehouse shift roles. Nobody here can say exactly what it weighs; the vendor set it up.",
      decision_domains: ["Hiring or admission decisions"],
      human_review: "Not applicable / unsure",
      training_data_use: "No",
      profiling_use: "Yes",
      admt_system_count: "1",
      third_party_admt: "Vendor tool, contract not on file",
      ca_consumer_count: "9000",

      notice_delivery: ["We have not yet provided a Pre-use Notice"],
      notice_has_specific_purpose: "We have not yet created a Pre-use Notice",
      notice_purpose_text: "",
      notice_has_opt_out_desc: "No",
      notice_has_access_desc: "Not yet",
      notice_has_anti_retaliation: "Not yet",
      notice_has_how_it_works: "No",
      notice_has_alternative_process: "No",
      // No published notice exists — nothing to test the § 7220(c) bar against.
      notice_full_text: "",

      opt_out_exception:
        "Hiring/admission exception (§ 7221(b)(2)) — ADMT used solely to assess ability; no unlawful discrimination",
      opt_out_methods: [],
      opt_out_link_title: "",
      opt_out_no_cookie_banner: "Cookie banner is currently our only method (gap)",
      opt_out_no_account_required: "Account is currently required (gap)",
      opt_out_confirmation_mechanism: "",
      opt_out_appeal_process: "",
      opt_out_15_day_process: "",
      opt_out_fairness_doc: "",

      access_submission_methods: "No dedicated route yet; requests arrive at the general HR inbox.",
      access_verification_process: "Not defined.",
      access_logic_disclosure: "Not defined; nobody here can describe what ShiftRank weighs.",
      access_outcome_disclosure: "Not defined.",
      access_response_timeline: "Our process is not yet defined",
      access_trade_secret_policy: "",
      // § 7222 readiness unanswered / negative — the record_insufficient driver.
      access_readiness: {
        b1_purpose_ready: "Unsure",
        b1_purpose_process: "",
        b2_logic_ready: "No — we cannot produce this today",
        b2_logic_process: "",
        b3_output_use_ready: "Unsure",
        b3_output_use_process: "",
        b3_outcome_ready: "",
        b3_outcome_process: "",
        b3_human_role_ready: "",
        b3_human_role_process: "",
      },

      affected_population_band: "Unsure",
      role_roster: [],

      admt_detail: {
        vendor_status: "Unsure",
        vendor_docs: ["None on file"],
        model_types: ["Ranking / recommender"],
        decision_effects: ["Ranking"],
        decision_cadence: "Repeated",
        sole_factor: "One of many factors",
        solely_advertising: "No",
        appeal_reviewer_role: "",
        appeal_trained: "No",
        appeal_authority_overturn: "No",
        appeal_step_count: "",
        sole_use_attestation: "Unsure",
        nondiscrimination_testing: "No testing performed",
      },
    },
    assertions: [
      { kind: "must_include", pattern: "\"access_readiness_findings\"", flags: "", label: "§7222 section still emitted on a thin record" },
      { kind: "must_include", pattern: "record_insufficient", flags: "", label: "thin record degrades rather than asserts" },
      { kind: "must_include", pattern: "\"authority_exhibit\"", flags: "", label: "authority exhibit attached" },
      // Honesty guard: an unevidenced record must not be described as ready.
      { kind: "must_not_include", pattern: "\"verdict\"\\s*:\\s*\"ready\"", flags: "", label: "no readiness verdict without evidence" },
    ],
  },
];

// ─────────────────────────────────────────────────────────────────────────
// ITEM 393 LEG B — ADMT PERFECT FIXTURE (×1).
//
// One truly-complete CPPA ADMT record under the item380r5 `emptyAskedKeys`
// semantics: every field `cppaAdmtContract` presents is non-empty (SYSTEM_KEYS
// and `emptyIsAnswer` controls respected; no conditional in this contract has a
// machine-readable trigger, so nothing is skipped by skip-logic).
//
// SUFFICIENCY, NOT PRESENCE. Every answer names a system, a mechanism, a role,
// a channel or a date. The ADMT self-test detail fields — the exact surface
// whose emptiness produced the archived render's degradation — are ANSWERED
// here: vendor posture, hosting, model types, decision effects and cadence,
// sole-factor weight, downstream feed, advertising-only status, the § 7221(b)(1)
// appeal-condition evidence and the § 7221(b)(2) evidence pair.
//
// FACT-EXEMPT REFERENCE RENDER (item 392 hard rule). This scenario is entirely
// new — California residential tenant screening, not the reference render's
// hiring scenario. No token from `REFERENCE_RENDER_TOKENS` appears anywhere
// below; the item-393 battery asserts that mechanically.
//
// LEGACY DEGRADED SETS (named, not extended): `GOLDEN_BY_TOOL["cppa-admt"]`
// carries five pilot cases (admt-hr-significant-tuning,
// admt-credit-significant-tuning, admt-advertising-adversarial,
// admt-service-eligibility-conservative, admt-hr-perfect-record) and
// `MESSY_BY_TOOL["cppa-admt"]` carries one thinned case
// (admt-messy-thin-notice-and-appeal-record, thinned from
// admt-hr-perfect-record). Those remain the degraded/pilot sources and are
// untouched by this leg; nothing degraded is authored here.
//
// Jurisdiction anchor: United States / California (11 CCR §§ 7200–7222).
export const ADMT_PERFECT: GoldenCase[] = [
  {
    id: "admt-ca-tenant-screening-perfect",
    tool: "cppa-admt",
    set: "tuning",
    intake: {
      // Identity of the business submitting the record.
      organization_name: "Alderwood Residential Services, Inc.",
      // The named system under assessment.
      system_name: "Tenancy Fit Index (TFI 2.4)",
      // What kind of technology it is, in the business's own words.
      system_type: "Rules-plus-statistical tenant screening and deposit-tiering engine",
      // Full operational description: inputs, output, and how the output is used.
      system_description:
        "Every completed rental application submitted through the Alderwood leasing portal is scored by the Tenancy Fit Index before a leasing agent issues a decision. The engine reads five inputs held in the Alderwood leasing system: verified monthly income against the posted rent, twenty-four months of payment history supplied by the applicant's prior landlords, an eviction-record search returned by the consumer reporting agency Cascade Verify LLC, the completeness of the application packet, and the requested move-in date against unit availability. It returns a three-band output (Band A qualified, Band B qualified with a higher security deposit, Band C referred for manual underwriting) plus the two inputs that moved the band furthest. A leasing agent reviews the band, the applicant packet and any written explanation the applicant supplies, and issues the tenancy decision; the engine never issues a decision by itself.",
      // Significant-decision domain(s) — verbatim option strings.
      decision_domains: ["Housing (rental or purchase eligibility)"],
      // Human-review qualification, with the concrete facts stated in the detail block.
      human_review:
        "Yes — reviewer knows how to interpret output, reviews it plus other info, and has authority to change the decision",
      // Whether applicant data trains the model.
      training_data_use: "Yes",
      // Whether the system profiles.
      profiling_use: "Yes",

      // ── Pre-use notice ─────────────────────────────────────────────────
      // How the Pre-use Notice reaches the applicant — two named channels.
      notice_delivery: [
        "Separate standalone Pre-use Notice",
        "In-app just-in-time notice before data collection",
      ],
      // Whether the notice states the specific purpose.
      notice_has_specific_purpose: "Yes",
      // The purpose as published, verbatim.
      notice_purpose_text:
        "We use the Tenancy Fit Index to decide whether to approve your rental application, whether to require a higher security deposit, and whether to send your application for manual underwriting. We do not use it for advertising, and we do not use it to set rent.",
      // Whether the notice describes the opt-out and how to use it.
      notice_has_opt_out_desc: "Yes — with specific opt-out instructions",
      // Whether the notice describes the access right.
      notice_has_access_desc: "Yes",
      // Whether the notice states the anti-retaliation commitment.
      notice_has_anti_retaliation: "Yes",
      // Whether the notice explains how the technology works.
      notice_has_how_it_works: "Yes — included inline in the notice",
      // Whether the notice describes the alternative (non-ADMT) process.
      notice_has_alternative_process: "Yes",

      // ── Opt-out ────────────────────────────────────────────────────────
      // No exception is claimed: a full opt-out right is offered.
      opt_out_exception: "No exception — we provide a full opt-out right",
      // Three named opt-out channels.
      opt_out_methods: [
        "Interactive online form linked from the Pre-use Notice",
        "Toll-free phone number",
        "Designated email address",
      ],
      // The published link title, verbatim.
      opt_out_link_title: "Decide My Application Without Automated Scoring",
      // Confirms an ADMT-specific method exists beyond any cookie banner.
      opt_out_no_cookie_banner:
        "Confirmed — we provide at least one ADMT-specific opt-out method in addition",
      // Confirms no account is required to opt out.
      opt_out_no_account_required: "Confirmed — no account required",
      // The named confirmation mechanism and its timing.
      opt_out_confirmation_mechanism:
        "An automated confirmation email is sent from optout@alderwoodresidential.com within one business hour, quoting the application reference and the date the manual-underwriting path was opened; the same confirmation is logged against the application record in the Alderwood leasing system.",
      // The voluntary human-appeal path offered alongside the full opt-out.
      opt_out_appeal_process:
        "An applicant placed in Band B or Band C may request human reconsideration through the leasing portal or by phone within ten business days. A regional underwriting manager who did not handle the original application re-reviews the packet, the applicant's written explanation and any documents supplied, and has authority to overturn the band, waive the higher deposit and approve the tenancy. The outcome is issued in writing within five business days of the request.",
      // Documented non-discrimination and fairness evidence.
      opt_out_fairness_doc:
        "Alderwood commissioned an annual disparate-impact review of Tenancy Fit Index outcomes from Beltane Analytics LLP; the 2026 review, dated 12 February 2026, tested approval-band distribution across race, familial status, source of income and disability proxies over 41,300 California applications and is held in the compliance library as TFI-DIR-2026.",
      // The 15-day handling commitment, described as a process.
      opt_out_15_day_process:
        "Opt-out requests are routed by the leasing-operations queue to the manual-underwriting team on receipt; the team must complete the non-automated assessment and issue the tenancy decision no later than fifteen business days from the request, and the queue escalates to the Director of Leasing Operations at day ten if the assessment is still open.",

      // ── Access ─────────────────────────────────────────────────────────
      // Named submission channels.
      access_submission_methods:
        "Requests are accepted through the privacy request form at alderwoodresidential.com/privacy-request, by the toll-free line 1-888-555-0142, and by email to privacy@alderwoodresidential.com; every route creates a ticket in the Alderwood privacy request register.",
      // Named verification steps.
      access_verification_process:
        "The requester confirms the application reference number, the property address applied for, and the email address on the application, then completes a one-time code sent to that email; authorised agents must additionally supply written authorisation and the applicant's confirmation of that authorisation.",
      // The logic explanation actually supplied.
      access_logic_disclosure:
        "Alderwood supplies a plain-language explanation naming the five inputs (income-to-rent ratio, twenty-four-month payment history, eviction-record search result, packet completeness, requested move-in date against availability), the direction each input pushes the band, the three output bands and what each band means for the application, and the two inputs that moved this applicant's band furthest. Model coefficients are withheld under the trade-secret policy below.",
      // The outcome explanation actually supplied.
      access_outcome_disclosure:
        "The response states the band the Tenancy Fit Index returned for the application, the date it was returned, the tenancy decision the leasing agent issued, whether a higher security deposit was required and in what amount, and whether the application was referred to manual underwriting.",
      // The committed response timeline.
      access_response_timeline: "Within 45 days with documented 45-day extension capability",
      // The trade-secret withholding policy and its legal basis.
      access_trade_secret_policy:
        "Model coefficients and the band-threshold table are withheld as trade secrets under Cal. Civ. Code § 3426.1(d); the withholding is recorded on the response, and the plain-language logic explanation above is supplied in full so the applicant still receives a meaningful explanation.",

      // ── Scale and inventory ────────────────────────────────────────────
      // California consumers whose data the system processes annually.
      ca_consumer_count: "41300",
      // Whether third-party ADMT is used, stated with the named vendor.
      third_party_admt:
        "Yes — the eviction-record search input is returned by Cascade Verify LLC, a consumer reporting agency engaged as a service provider under a CCPA service-provider addendum dated 3 January 2026.",
      // Count of ADMT systems in scope.
      admt_system_count: "1",
      // Affected-population band.
      affected_population_band: "10,001 – 100,000",
      // The named roles standing behind the record.
      role_roster: [
        "Executive sponsor",
        "Privacy officer / DPO",
        "Legal counsel",
        "Product owner",
        "Data scientist / ML engineer",
        "Security officer",
        "Human reviewer",
        "Consumer-request handler",
        "Vendor manager",
      ],

      // ── ADMT self-test detail (the surface whose emptiness degraded the
      //    archived render — answered in full here) ────────────────────────
      admt_detail: {
        // Vendor's CCPA status.
        vendor_status: "Service provider",
        // Documentation actually held on file for the vendor.
        vendor_docs: ["Model card / datasheet", "Validation report", "Bias-testing report", "SOC 2 / pen test"],
        // Whether the vendor makes the required information available.
        vendor_makes_available: "Yes",
        // Contractual audit right.
        v_audit: "Yes",
        // Vendor cooperation on consumer requests.
        v_assist: "Yes",
        // Vendor honours opt-outs.
        v_optout: "Yes",
        // Vendor supports the appeal path.
        v_appeal: "Yes",
        // Vendor incident-notification duty.
        v_incident: "Yes",
        // Where the system runs.
        hosting: "Hybrid",
        // What kind of models it uses.
        model_types: ["Rules engine", "Statistical model"],
        // What the decision does to the applicant.
        decision_effects: ["Eligibility", "Denial", "Provision"],
        // How often it decides.
        decision_cadence: "Repeated",
        // The weight the output carries in the decision.
        sole_factor: "Material factor — heavily weighted alongside others",
        // Whether outputs feed later decisions.
        feeds_future_decisions: "Yes",
        // Advertising-only status.
        solely_advertising: "No",
        // § 7221(b)(1) evidence — the reviewer's role, named.
        appeal_reviewer_role:
          "Regional underwriting manager (Alderwood Leasing Operations), independent of the leasing agent who handled the application",
        // Reviewer training.
        appeal_trained: "Yes",
        // Reviewer authority.
        appeal_authority_overturn: "Yes",
        // Steps in the appeal path.
        appeal_step_count: "3",
        // § 7221(b)(2) evidence pair.
        sole_use_attestation: "No — the output is also used for other purposes",
        nondiscrimination_testing: "Yes — documented testing record",
      },

      // ── Published pre-use notice, transcribed element by element ────────
      notice_element_text: {
        // Purpose element as published.
        purpose:
          "We use automated decisionmaking technology called the Tenancy Fit Index to decide whether to approve your rental application, whether to require a higher security deposit, and whether to refer your application to manual underwriting.",
        // Opt-out element as published.
        optout:
          "You can ask us to decide your application without the Tenancy Fit Index. Use the link 'Decide My Application Without Automated Scoring' in the leasing portal, call 1-888-555-0142, or email optout@alderwoodresidential.com. We will confirm within one business hour and issue the decision within fifteen business days.",
        // Access element as published.
        access:
          "You can ask us for an explanation of how the Tenancy Fit Index reached the result for your application, what it used, and what the result was. Submit the request at alderwoodresidential.com/privacy-request, by phone, or by email; we respond within 45 calendar days and will tell you if we need one 45-day extension.",
        // Anti-retaliation element as published.
        antiretaliation:
          "We will not deny your application, charge you a higher rent or deposit, or give you a lower level of service because you asked us to decide your application without the Tenancy Fit Index or because you asked for an explanation.",
        // How-it-works: inputs, as published.
        howworks_inputs:
          "The Tenancy Fit Index uses five things: your verified monthly income compared with the rent, twenty-four months of payment history from your prior landlords, an eviction-record search from Cascade Verify LLC, whether your application packet is complete, and your requested move-in date compared with unit availability.",
        // How-it-works: output, as published.
        howworks_output:
          "It returns one of three bands — Band A (qualified), Band B (qualified with a higher security deposit), or Band C (referred for manual underwriting) — together with the two inputs that moved your band the most. A leasing agent then reviews the band with your packet and issues the decision.",
        // Alternative-process element as published.
        altprocess:
          "If you opt out, a member of our manual-underwriting team assesses your application from your packet, your income verification and your landlord references, without the Tenancy Fit Index, and issues the tenancy decision within fifteen business days.",
      },

      // The whole published notice, verbatim, so § 7220(c) adequacy is
      // performed against the business's own words rather than asserted.
      notice_full_text:
        "PRE-USE NOTICE — AUTOMATED DECISIONMAKING TECHNOLOGY IN RENTAL APPLICATIONS (Alderwood Residential Services, Inc., published 5 January 2026, alderwoodresidential.com/admt-notice)\n\nWhat we use it for. We use automated decisionmaking technology called the Tenancy Fit Index to decide whether to approve your rental application, whether to require a higher security deposit, and whether to refer your application to manual underwriting. We do not use it for advertising and we do not use it to set rent.\n\nHow it works. The Tenancy Fit Index uses five things: your verified monthly income compared with the rent, twenty-four months of payment history from your prior landlords, an eviction-record search from Cascade Verify LLC, whether your application packet is complete, and your requested move-in date compared with unit availability. It returns one of three bands — Band A (qualified), Band B (qualified with a higher security deposit), or Band C (referred for manual underwriting) — together with the two inputs that moved your band the most. A leasing agent then reviews the band with your packet and issues the decision. The technology never issues the decision by itself.\n\nYour right to opt out. You can ask us to decide your application without the Tenancy Fit Index. Use the link 'Decide My Application Without Automated Scoring' in the leasing portal, call 1-888-555-0142, or email optout@alderwoodresidential.com. You do not need an account to opt out. We will confirm within one business hour and issue the decision within fifteen business days.\n\nWhat happens instead. If you opt out, a member of our manual-underwriting team assesses your application from your packet, your income verification and your landlord references, without the Tenancy Fit Index, and issues the tenancy decision within fifteen business days.\n\nYour right to an explanation. You can ask us for an explanation of how the Tenancy Fit Index reached the result for your application, what it used, and what the result was. Submit the request at alderwoodresidential.com/privacy-request, by phone on 1-888-555-0142, or by email to privacy@alderwoodresidential.com. We respond within 45 calendar days and will tell you if we need one 45-day extension. Model coefficients and band thresholds are withheld as trade secrets, and we will say so on the response.\n\nNo retaliation. We will not deny your application, charge you a higher rent or deposit, or give you a lower level of service because you asked us to decide your application without the Tenancy Fit Index or because you asked for an explanation.\n\nQuestions. Privacy Officer, Alderwood Residential Services, Inc., 1400 Chandler Way, Suite 300, Sacramento, CA 95814 — privacy@alderwoodresidential.com.",

      // ── § 7222(b) explanation readiness, element by element ─────────────
      access_readiness: {
        // (b)(1) purpose.
        b1_purpose_ready: "Yes \u2014 we can produce this today",
        b1_purpose_process:
          "The published purpose paragraph is inserted into the response template by the consumer-request handler from the notice register entry TFI-NOTICE-2026-01, which records the purpose text in force on the application date.",
        // (b)(2) logic.
        b2_logic_ready: "Yes \u2014 we can produce this today",
        b2_logic_process:
          "The handler runs the TFI explanation report in the Alderwood leasing system, which returns the five inputs, the direction each pushes the band, and the two inputs that moved this application furthest; the report is pasted into the response and reviewed by the privacy officer before release.",
        // (b)(3) how the output was used.
        b3_output_use_ready: "Yes \u2014 we can produce this today",
        b3_output_use_process:
          "The application audit trail records the band the engine returned, the leasing agent who reviewed it, and the decision issued; the handler quotes those three entries in the response.",
        // (b)(3) outcome.
        b3_outcome_ready: "Yes \u2014 we can produce this today",
        b3_outcome_process:
          "The tenancy decision, any deposit uplift and any referral to manual underwriting are read from the application record and stated in the response with their dates.",
        // (b)(3) human role.
        b3_human_role_ready: "Yes \u2014 we can produce this today",
        b3_human_role_process:
          "The audit trail names the leasing agent who reviewed the band and, where reconsideration was requested, the regional underwriting manager who re-reviewed it; the response names the role, the review date and the authority each held over the decision.",
      },
    },
    assertions: [
      { kind: "must_include", pattern: "7220|7221|7222", flags: "i", label: "ADMT rights sections cited" },
      { kind: "must_include", pattern: "significant decision", flags: "i", label: "significant-decision analysis present" },
    ],
  },
];
