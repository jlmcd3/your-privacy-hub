// RC-REM-P1-B — CPPA ADMT intake contract.
//
// Intake shape verified against src/pages/admt/ADMTChecker.tsx `intake`
// memo (~L336). Post-rulings state: no prior_access_requests_12mo;
// training_data_use and profiling_use are Yes/No only.
//
// Enum options anchored to src/pages/admt/ADMTChecker.enums.ts (imported
// by the test at PARITY time) plus the page's inline option lists
// (SIGNIFICANT_DECISION_DOMAINS, HUMAN_REVIEW_OPTIONS, NOTICE_DELIVERY_OPTIONS,
// OPT_OUT_METHODS, OPT_OUT_EXCEPTIONS). Literal copies below; parity
// enforced by the test.

import type { IntakeContract } from "./types.ts";

// ── Verbatim option copies (from ADMTChecker.enums.ts) ─────────────────
export const ADMT_VENDOR_STATUS_OPTS = ["Service provider", "Contractor", "Third party", "Unsure"] as const;
export const ADMT_VENDOR_DOCS_OPTS = ["Model card / datasheet", "Validation report", "Bias-testing report", "SOC 2 / pen test", "DPIA", "None on file"] as const;
export const ADMT_YES_NO_OPTS = ["Yes", "No"] as const;
export const ADMT_YES_NO_UNSURE_OPTS = ["Yes", "No", "Unsure"] as const;
export const ADMT_HOSTING_OPTS = ["Hosted internally", "Hosted by the vendor", "Hybrid"] as const;
export const ADMT_MODEL_TYPE_OPTS = ["Rules engine", "Statistical model", "ML classifier", "Ranking / recommender", "Generative AI", "Biometric", "Emotion recognition", "Identity verification"] as const;
export const ADMT_DECISION_EFFECT_OPTS = ["Provision", "Denial", "Ranking", "Eligibility", "Pricing", "Allocation", "Assignment", "Promotion / demotion", "Suspension / termination", "Compensation", "Credentialing", "Diagnosis / care / treatment"] as const;
export const ADMT_DECISION_CADENCE_OPTS = ["One-time", "Repeated", "Continuous", "Systematic"] as const;
export const ADMT_SOLE_FACTOR_OPTS = ["Sole factor — output alone determines the outcome", "Material factor — heavily weighted alongside others", "One of many factors"] as const;
export const ADMT_SOLELY_ADVERTISING_OPTS = ["Yes — solely advertising", "No"] as const;

// TURN 2 — discrete enum options for the two new intake fields.
export const ADMT_AFFECTED_POPULATION_BAND_OPTS = [
  "Under 1,000",
  "1,000 – 10,000",
  "10,001 – 100,000",
  "100,001 – 1,000,000",
  "Over 1,000,000",
  "Unsure",
] as const;
export const ADMT_ROLE_ROSTER_OPTS = [
  "Executive sponsor",
  "Privacy officer / DPO",
  "Legal counsel",
  "Product owner",
  "Data scientist / ML engineer",
  "Security officer",
  "Human reviewer",
  "Consumer-request handler",
  "Vendor manager",
] as const;


// ITEM 308 — § 7221(b)(2) exception-evidence options (parity mirror).
export const ADMT_SOLE_USE_ATTESTATION_OPTS = [
  "Yes — solely to assess ability to perform",
  "No — the output is also used for other purposes",
  "Unsure",
] as const;
export const ADMT_NONDISCRIM_TESTING_OPTS = [
  "Yes — documented testing record",
  "Testing performed but not documented",
  "No testing performed",
  "Unsure",
] as const;

// ── DOC 158 (2026-09-03, ADMT model-vs-law build) ─────────────────────
// Verbatim copies of the src/pages/admt/ADMTChecker.enums.ts additions
// (parity pinned in doc158-admt-law-map-build.test.ts).
// § 7001(ddd)(2): a housing decision "based solely on the availability or
// vacancy of the housing or the successful receipt of payment" is not a
// significant decision. Asked only when the Housing domain is selected.
export const ADMT_HOUSING_DECISION_BASIS_OPTS = [
  "Yes — based solely on availability or vacancy, or on receipt of payment",
  "No — other factors are considered",
] as const;
// § 7220(b)(2): the Pre-use Notice must precede collection (or, for
// information already collected for another purpose, the first ADMT use).
export const NOTICE_TIMING_OPTS = [
  "At or before the point where we collect the personal information the ADMT processes",
  "Before the ADMT first processes personal information we had already collected for another purpose",
  "After the ADMT processing has begun",
  "Unsure / not yet determined",
] as const;
// § 7221(f), (i), (j), (k), (m): opt-out handling duties (full opt-out path).
export const OPT_OUT_HANDLING_OPTS = [
  "No identity verification is required to submit an opt-out request (§ 7221(f))",
  "One option opts the consumer out of every use of ADMT we make for significant decisions (§ 7221(i))",
  "We accept opt-out requests from an authorized agent with the consumer's signed permission (§ 7221(j))",
  "We do not ask a consumer who opted out to consent again for at least 12 months (§ 7221(k))",
  "An opt-out received before processing begins prevents that processing (§ 7221(m))",
  "None of the above can be confirmed",
] as const;
// Previously form-only (never registered) admt_detail leaves — verbatim
// copies of the page's inline option lists (audit A.4: collected, unread).
export const ADMT_HI_REVIEWER_PRESENT_OPTS = ["Yes — on every decision", "Sometimes / on a subset", "No — fully automated"] as const;
export const ADMT_HI_STAGE_OPTS = ["Before the decision is issued", "After the decision (review of completed decisions)", "Appeal only"] as const;
export const ADMT_APPEAL_CONSUMER_SUBMIT_OPTS = ["Free-text statement", "Supporting documents", "Witness statements"] as const;
export const ADMT_APPEAL_OUTCOME_OPTS = ["Uphold", "Reverse", "Modify", "Remand"] as const;
export const ADMT_BIAS_PROTECTED_CHARS_OPTS = ["Race", "Sex / gender", "Age", "Disability", "National origin", "Religion", "Veteran status", "Pregnancy", "Genetic info"] as const;
export const ADMT_BIAS_CADENCE_OPTS = ["Pre-deployment + ongoing monitoring", "Pre-deployment only", "Vendor-supplied only", "None"] as const;
export const ADMT_BIAS_ADVERSE_IMPACT_OPTS = ["Yes", "No", "Vendor-supplied"] as const;
export const ADMT_ACCESS_SECURE_TX_OPTS = ["Encrypted self-service portal", "Encrypted email", "Postal mail", "Not yet defined"] as const;

// ── Verbatim inline lists from ADMTChecker.tsx ─────────────────────────
const SIGNIFICANT_DECISION_DOMAINS = [
  "Financial or lending services (credit decisions, loans, accounts)",
  "Housing (rental or purchase eligibility)",
  "Education enrollment or opportunities (admission, credentials, suspension)",
  "Hiring or admission decisions",
  "Work allocation, scheduling, or compensation",
  "Promotion, demotion, suspension, or termination",
  "Healthcare services (diagnosis, treatment, care eligibility)",
  // DOC 158 — the explicit negative: a record could not say "none of these"
  // before (an empty selection read as unanswered → Unable to assess).
  "None of these categories — the decision is outside every § 7001(ddd) category",
] as const;
const HUMAN_REVIEW_OPTIONS = [
  "Yes — reviewer knows how to interpret output, reviews it plus other info, and has authority to change the decision",
  "Partial — reviewer sees the output but cannot override it",
  "No — fully automated, no human review",
  "Not applicable / unsure",
] as const;
const NOTICE_DELIVERY_OPTIONS = [
  "Included in our Notice at Collection",
  "Separate standalone Pre-use Notice",
  "In-app just-in-time notice before data collection",
  "Account-creation or onboarding flow",
  "We have not yet provided a Pre-use Notice",
] as const;
const OPT_OUT_METHODS = [
  "Interactive online form linked from the Pre-use Notice",
  "Toll-free phone number",
  "Designated email address",
  "In-person form",
  "Mail-based form",
] as const;
const OPT_OUT_EXCEPTIONS = [
  "Human appeal exception (§ 7221(b)(1)) — we provide a human reviewer with authority to overturn the decision",
  "Hiring/admission exception (§ 7221(b)(2)) — ADMT used solely to assess ability; no unlawful discrimination",
  "Work allocation/compensation exception (§ 7221(b)(3)) — ADMT used solely for allocation/compensation; no unlawful discrimination",
  "No exception — we provide a full opt-out right",
] as const;

export const NOTICE_SPECIFIC_PURPOSE_OPTS = [
  "Yes",
  "No — uses generic language",
  "We have not yet created a Pre-use Notice",
] as const;
export const NOTICE_OPT_OUT_DESC_OPTS = [
  "Yes — with specific opt-out instructions",
  "Mentions opt-out but without clear instructions",
  "No",
  "We rely on an exception and describe appeal rights instead",
  // DOC 158 — § 7220(c)(2)(B): on a (b)(2)/(b)(3) exception the notice must
  // identify the specific exception; the record had no way to say so.
  "We rely on an exception and the notice identifies the specific exception",
] as const;
export const NOTICE_ACCESS_DESC_OPTS = ["Yes", "No", "Not yet"] as const;
export const NOTICE_ANTI_RET_OPTS = ["Yes", "No", "Not yet"] as const;
export const NOTICE_HOW_IT_WORKS_OPTS = [
  "Yes — included inline in the notice",
  "Yes — via hyperlink or layered notice",
  "Partial — some elements missing",
  "No",
  "Not yet",
] as const;
export const NOTICE_ALT_PROCESS_OPTS = [
  "Yes",
  "No",
  "Not applicable — we rely on an opt-out exception",
] as const;
export const OPT_OUT_NO_COOKIE_BANNER_OPTS = [
  "Confirmed — we provide at least one ADMT-specific opt-out method in addition",
  "Cookie banner is currently our only method (gap)",
] as const;
export const OPT_OUT_NO_ACCOUNT_REQUIRED_OPTS = [
  "Confirmed — no account required",
  "Account is currently required (gap)",
] as const;
export const ACCESS_RESPONSE_TIMELINE_OPTS = [
  "Within 45 calendar days (standard)",
  "Within 45 days with documented 45-day extension capability",
  "Our process is not yet defined",
] as const;

// UPGRADE-3 ITEM 3 — readiness + process pair for each § 7222(b) element.
export const ACCESS_READINESS_ELEMENT_IDS = [
  "b1_purpose",
  "b2_logic",
  "b3_output_use",
  "b3_outcome",
  "b3_human_role",
  // DOC 158 — § 7222(b)(4): the anti-retaliation statement and instructions
  // (with links) for exercising other CCPA rights, never a readiness element.
  "b4_rights",
] as const;

export const ACCESS_READINESS_OPTS = [
  "Yes \u2014 we can produce this today",
  "Partially \u2014 we can produce some of it",
  "No \u2014 we cannot produce this today",
  "Unsure",
] as const;

const ACCESS_READINESS_KEYS = ACCESS_READINESS_ELEMENT_IDS.flatMap((id) => [
  { key: `access_readiness.${id}_ready`, kind: "enum" as const, required: "optional" as const, options: ACCESS_READINESS_OPTS },
  { key: `access_readiness.${id}_process`, kind: "text" as const, required: "optional" as const },
]);

export const cppaAdmtContract: IntakeContract = {
  tool_type: "cppa_admt",
  table: "admt_runs",
  fields: [
    // Top-level scalars submitted by the form
    { key: "organization_name",   kind: "text", required: "always" },
    { key: "system_name",         kind: "text", required: "always" },
    { key: "system_type",         kind: "text", required: "always" },
    { key: "system_description",  kind: "narrative", required: "always" },
    { key: "decision_domains",    kind: "multi-enum", required: "always", options: SIGNIFICANT_DECISION_DOMAINS },
    { key: "human_review",        kind: "enum", required: "always", options: HUMAN_REVIEW_OPTIONS },
    // RC-P6: "Unsure" removed. RC-Cleanup2: profiling_use "Unsure" removed.
    { key: "training_data_use",   kind: "enum", required: "always", options: ADMT_YES_NO_OPTS },
    { key: "profiling_use",       kind: "enum", required: "always", options: ADMT_YES_NO_OPTS },

    { key: "notice_delivery",             kind: "multi-enum", required: "always", options: NOTICE_DELIVERY_OPTIONS },
    { key: "notice_has_specific_purpose", kind: "enum", required: "always", options: NOTICE_SPECIFIC_PURPOSE_OPTS },
    { key: "notice_purpose_text",         kind: "narrative", required: "optional" },
    { key: "notice_has_opt_out_desc",     kind: "enum", required: "always", options: NOTICE_OPT_OUT_DESC_OPTS },
    { key: "notice_has_access_desc",      kind: "enum", required: "always", options: NOTICE_ACCESS_DESC_OPTS },
    { key: "notice_has_anti_retaliation", kind: "enum", required: "always", options: NOTICE_ANTI_RET_OPTS },
    { key: "notice_has_how_it_works",     kind: "enum", required: "always", options: NOTICE_HOW_IT_WORKS_OPTS },
    { key: "notice_has_alternative_process", kind: "enum", required: "always", options: NOTICE_ALT_PROCESS_OPTS },
    // DOC 158 — § 7220(b)(2) timing (form-required; optional here for legacy rows).
    { key: "notice_timing", kind: "enum", required: "optional", options: NOTICE_TIMING_OPTS },

    { key: "opt_out_exception",             kind: "text",       required: "always" }, // ChoiceWithOther — free-string post-fold; enum list below is advisory
    { key: "opt_out_methods",               kind: "multi-enum", required: "optional", options: OPT_OUT_METHODS },
    { key: "opt_out_link_title",            kind: "text",       required: "optional" },
    { key: "opt_out_no_cookie_banner",      kind: "enum",       required: "optional", options: OPT_OUT_NO_COOKIE_BANNER_OPTS },
    { key: "opt_out_no_account_required",   kind: "enum",       required: "optional", options: OPT_OUT_NO_ACCOUNT_REQUIRED_OPTS },
    { key: "opt_out_confirmation_mechanism", kind: "text",      required: "optional" },
    { key: "opt_out_appeal_process",        kind: "narrative",  required: "conditional",
      requiredWhen: 'opt_out_exception starts with "Human appeal exception"' },
    { key: "opt_out_fairness_doc",          kind: "narrative",  required: "optional" },
    { key: "opt_out_15_day_process",        kind: "narrative",  required: "optional" },
    // DOC 158 — § 7221(f), (i), (j), (k), (m) handling duties (full opt-out path).
    { key: "opt_out_handling_confirmations", kind: "multi-enum", required: "optional", options: OPT_OUT_HANDLING_OPTS },

    { key: "access_submission_methods",   kind: "narrative", required: "always" },
    { key: "access_verification_process", kind: "narrative", required: "always" },
    { key: "access_logic_disclosure",     kind: "narrative", required: "always" },
    { key: "access_outcome_disclosure",   kind: "narrative", required: "always" },
    { key: "access_response_timeline",    kind: "enum",      required: "always", options: ACCESS_RESPONSE_TIMELINE_OPTS },
    { key: "access_trade_secret_policy",  kind: "narrative", required: "optional" },

    { key: "ca_consumer_count",   kind: "text", required: "optional" },
    { key: "third_party_admt",    kind: "text", required: "optional" },
    { key: "admt_system_count",   kind: "text", required: "optional" },

    // TURN 2 — new intake fields (both optional; drive A-C applicability + role clarity)
    { key: "affected_population_band", kind: "enum", required: "optional", options: ADMT_AFFECTED_POPULATION_BAND_OPTS },
    { key: "role_roster",              kind: "multi-enum", required: "optional", options: ADMT_ROLE_ROSTER_OPTS },


    // admt_detail — structured nested object; all 38 leaves are optional
    // (form does not gate on any of them in stepValid). Enum leaves are
    // registered so validateIntake enforces option verbatim-ness when a
    // value is present.
    { key: "admt_detail", kind: "structured", required: "optional" },
    { key: "admt_detail.vendor_status",         kind: "enum",       required: "optional", options: ADMT_VENDOR_STATUS_OPTS },
    { key: "admt_detail.vendor_docs",           kind: "multi-enum", required: "optional", options: ADMT_VENDOR_DOCS_OPTS },
    { key: "admt_detail.vendor_makes_available", kind: "enum",      required: "optional", options: ADMT_YES_NO_UNSURE_OPTS },
    { key: "admt_detail.v_audit",               kind: "enum",       required: "optional", options: ADMT_YES_NO_OPTS },
    { key: "admt_detail.v_assist",              kind: "enum",       required: "optional", options: ADMT_YES_NO_OPTS },
    { key: "admt_detail.v_optout",              kind: "enum",       required: "optional", options: ADMT_YES_NO_OPTS },
    { key: "admt_detail.v_appeal",              kind: "enum",       required: "optional", options: ADMT_YES_NO_OPTS },
    { key: "admt_detail.v_incident",            kind: "enum",       required: "optional", options: ADMT_YES_NO_OPTS },
    { key: "admt_detail.hosting",               kind: "enum",       required: "optional", options: ADMT_HOSTING_OPTS },
    { key: "admt_detail.model_types",           kind: "multi-enum", required: "optional", options: ADMT_MODEL_TYPE_OPTS },
    { key: "admt_detail.decision_effects",      kind: "multi-enum", required: "optional", options: ADMT_DECISION_EFFECT_OPTS },
    { key: "admt_detail.decision_cadence",      kind: "enum",       required: "optional", options: ADMT_DECISION_CADENCE_OPTS },
    { key: "admt_detail.sole_factor",           kind: "enum",       required: "optional", options: ADMT_SOLE_FACTOR_OPTS },
    { key: "admt_detail.feeds_future_decisions", kind: "enum",      required: "optional", options: ADMT_YES_NO_UNSURE_OPTS },
    { key: "admt_detail.solely_advertising",    kind: "enum",       required: "optional", options: ADMT_SOLELY_ADVERTISING_OPTS },
    // DOC 158 — § 7001(ddd)(2) housing exclusion. The form (ADMTChecker.tsx)
    // shows this row only while decision_domains includes the Housing option
    // and its step validation requires it there; the contract carries the same
    // skip logic as a VALUE-EQUALS trigger (ITEM 380 r5b), so the record-
    // complete gate and the intake coach never count it on any other record.
    { key: "admt_detail.housing_decision_basis", kind: "enum",      required: "conditional", options: ADMT_HOUSING_DECISION_BASIS_OPTS,
      requiredWhen: 'decision_domains includes "Housing (rental or purchase eligibility)"',
      trigger: { key: "decision_domains", equals: ["Housing (rental or purchase eligibility)"] } },
    // DOC 158 — the § 7001(e)(1) human-involvement self-test (form-only before;
    // now registered and cross-checked against human_review by the engine).
    // The self-test's first row is presented unconditionally; the six detail
    // rows appear only after a "Yes" or "Sometimes" answer to it
    // (ADMTChecker.tsx: `adv.hi_reviewer_present && !startsWith("No")`).
    { key: "admt_detail.hi_reviewer_present",   kind: "enum",       required: "optional", options: ADMT_HI_REVIEWER_PRESENT_OPTS },
    { key: "admt_detail.hi_reviewer_role",      kind: "text",       required: "conditional",
      requiredWhen: 'admt_detail.hi_reviewer_present is "Yes — on every decision" or "Sometimes / on a subset"',
      trigger: { key: "admt_detail.hi_reviewer_present", equals: ["Yes — on every decision", "Sometimes / on a subset"] } },
    { key: "admt_detail.hi_stage",              kind: "enum",       required: "conditional", options: ADMT_HI_STAGE_OPTS,
      requiredWhen: 'admt_detail.hi_reviewer_present is "Yes — on every decision" or "Sometimes / on a subset"',
      trigger: { key: "admt_detail.hi_reviewer_present", equals: ["Yes — on every decision", "Sometimes / on a subset"] } },
    { key: "admt_detail.hi_trained",            kind: "enum",       required: "conditional", options: ADMT_YES_NO_OPTS,
      requiredWhen: 'admt_detail.hi_reviewer_present is "Yes — on every decision" or "Sometimes / on a subset"',
      trigger: { key: "admt_detail.hi_reviewer_present", equals: ["Yes — on every decision", "Sometimes / on a subset"] } },
    { key: "admt_detail.hi_reviews_other_info", kind: "enum",       required: "conditional", options: ADMT_YES_NO_OPTS,
      requiredWhen: 'admt_detail.hi_reviewer_present is "Yes — on every decision" or "Sometimes / on a subset"',
      trigger: { key: "admt_detail.hi_reviewer_present", equals: ["Yes — on every decision", "Sometimes / on a subset"] } },
    { key: "admt_detail.hi_authority_override", kind: "enum",       required: "conditional", options: ADMT_YES_NO_OPTS,
      requiredWhen: 'admt_detail.hi_reviewer_present is "Yes — on every decision" or "Sometimes / on a subset"',
      trigger: { key: "admt_detail.hi_reviewer_present", equals: ["Yes — on every decision", "Sometimes / on a subset"] } },
    { key: "admt_detail.hi_override_rate",      kind: "text",       required: "conditional",
      requiredWhen: 'admt_detail.hi_reviewer_present is "Yes — on every decision" or "Sometimes / on a subset"',
      trigger: { key: "admt_detail.hi_reviewer_present", equals: ["Yes — on every decision", "Sometimes / on a subset"] } },
    // DOC 158 — other form-only leaves, registered so the record carries them.
    // Each carries the form's own skip logic where a VALUE-EQUALS trigger can
    // state it; the two vendor rows cannot (the form shows them while the
    // free-text third_party_admt answer is non-empty), so they stay optional
    // like the vendor_status rows above them.
    // other_factors: ADMTChecker.tsx shows the row only when sole_factor is a
    // non-"Sole" option.
    { key: "admt_detail.other_factors",         kind: "text",       required: "conditional",
      requiredWhen: 'admt_detail.sole_factor is "Material factor — heavily weighted alongside others" or "One of many factors"',
      trigger: { key: "admt_detail.sole_factor", equals: ["Material factor — heavily weighted alongside others", "One of many factors"] } },
    // ITEM 380 r5c — EMPTY IS A SUBSTANTIVE ANSWER. Form citation:
    // src/pages/admt/ADMTChecker.tsx, the textarea under the decision-domain
    // pills, presented unconditionally with the wording "Optional — describe
    // the decision in one sentence, or leave blank if the categories above
    // capture it". A blank means the selected categories describe the
    // decision; it is never an unanswered ask.
    { key: "admt_detail.decision_domains_other", kind: "text",      required: "optional", emptyIsAnswer: true },
    // opt_out_exception_other: the ChoiceWithOther free text, shown only when
    // the "Other" option is selected.
    { key: "admt_detail.opt_out_exception_other", kind: "text",     required: "conditional",
      requiredWhen: 'opt_out_exception is "Other — my situation differs (describe)"',
      trigger: { key: "opt_out_exception", equals: ["Other — my situation differs (describe)"] } },
    { key: "admt_detail.vendor_product",        kind: "text",       required: "optional" },
    { key: "admt_detail.vendor_training_rights", kind: "text",      required: "optional" },

    // ITEM 308 — intake additions for the three analytic deliverables.
    // (a) Published pre-use notice text, transcribed element by element.
    //     Without it, § 7220(c) adequacy can only be ASSERTED, not PERFORMED.
    { key: "notice_element_text", kind: "structured", required: "optional" },
    { key: "notice_element_text.purpose",           kind: "narrative", required: "optional" },
    { key: "notice_element_text.optout",            kind: "narrative", required: "optional" },
    { key: "notice_element_text.access",            kind: "narrative", required: "optional" },
    { key: "notice_element_text.antiretaliation",   kind: "narrative", required: "optional" },
    { key: "notice_element_text.howworks_inputs",   kind: "narrative", required: "optional" },
    { key: "notice_element_text.howworks_output",   kind: "narrative", required: "optional" },
    { key: "notice_element_text.altprocess",        kind: "narrative", required: "optional" },
    // (b) § 7221(b)(1) condition evidence. appeal_reviewer_role /
    //     appeal_trained / appeal_authority_overturn already exist on the
    //     form; registered here so the contract carries them. New: step count.
    { key: "admt_detail.appeal_reviewer_role",      kind: "text", required: "optional" },
    { key: "admt_detail.appeal_trained",            kind: "enum", required: "optional", options: ADMT_YES_NO_OPTS },
    { key: "admt_detail.appeal_authority_overturn", kind: "enum", required: "optional", options: ADMT_YES_NO_OPTS },
    { key: "admt_detail.appeal_step_count",         kind: "text", required: "optional" },
    // DOC 158 — § 7221(b)(1)(A)/(B) evidence, collected by the form and never
    // registered or read: what the consumer may submit, the response timeline.
    // The form shows these four rows only on the human-appeal exception
    // (ADMTChecker.tsx: `optOutException.startsWith("Human appeal")`).
    { key: "admt_detail.appeal_consumer_submit",    kind: "multi-enum", required: "conditional", options: ADMT_APPEAL_CONSUMER_SUBMIT_OPTS,
      requiredWhen: 'opt_out_exception is the human-appeal exception (§ 7221(b)(1))',
      trigger: { key: "opt_out_exception", equals: ["Human appeal exception (§ 7221(b)(1)) — we provide a human reviewer with authority to overturn the decision"] } },
    { key: "admt_detail.appeal_timeline",           kind: "text", required: "conditional",
      requiredWhen: 'opt_out_exception is the human-appeal exception (§ 7221(b)(1))',
      trigger: { key: "opt_out_exception", equals: ["Human appeal exception (§ 7221(b)(1)) — we provide a human reviewer with authority to overturn the decision"] } },
    { key: "admt_detail.appeal_reversal_rate",      kind: "text", required: "conditional",
      requiredWhen: 'opt_out_exception is the human-appeal exception (§ 7221(b)(1))',
      trigger: { key: "opt_out_exception", equals: ["Human appeal exception (§ 7221(b)(1)) — we provide a human reviewer with authority to overturn the decision"] } },
    { key: "admt_detail.appeal_outcomes",           kind: "multi-enum", required: "conditional", options: ADMT_APPEAL_OUTCOME_OPTS,
      requiredWhen: 'opt_out_exception is the human-appeal exception (§ 7221(b)(1))',
      trigger: { key: "opt_out_exception", equals: ["Human appeal exception (§ 7221(b)(1)) — we provide a human reviewer with authority to overturn the decision"] } },
    // (c) § 7221(b)(2) condition evidence.
    { key: "admt_detail.sole_use_attestation",      kind: "enum", required: "optional", options: ADMT_SOLE_USE_ATTESTATION_OPTS },
    { key: "admt_detail.nondiscrimination_testing", kind: "enum", required: "optional", options: ADMT_NONDISCRIM_TESTING_OPTS },
    // DOC 158 — § 7221(b)(2)(B)/(b)(3)(B) testing evidence, collected by the
    // form and never registered or read.
    // The form shows the seven testing rows only on the hiring/admission or
    // work-allocation exception (ADMTChecker.tsx:
    // `optOutException.startsWith("Hiring") || startsWith("Work")`).
    { key: "admt_detail.bias_protected_chars",      kind: "multi-enum", required: "conditional", options: ADMT_BIAS_PROTECTED_CHARS_OPTS,
      requiredWhen: 'opt_out_exception is the § 7221(b)(2) or (b)(3) exception',
      trigger: { key: "opt_out_exception", equals: ["Hiring/admission exception (§ 7221(b)(2)) — ADMT used solely to assess ability; no unlawful discrimination", "Work allocation/compensation exception (§ 7221(b)(3)) — ADMT used solely for allocation/compensation; no unlawful discrimination"] } },
    { key: "admt_detail.bias_proxy_vars",           kind: "narrative", required: "conditional",
      requiredWhen: 'opt_out_exception is the § 7221(b)(2) or (b)(3) exception',
      trigger: { key: "opt_out_exception", equals: ["Hiring/admission exception (§ 7221(b)(2)) — ADMT used solely to assess ability; no unlawful discrimination", "Work allocation/compensation exception (§ 7221(b)(3)) — ADMT used solely for allocation/compensation; no unlawful discrimination"] } },
    { key: "admt_detail.bias_testing_cadence",      kind: "enum", required: "conditional", options: ADMT_BIAS_CADENCE_OPTS,
      requiredWhen: 'opt_out_exception is the § 7221(b)(2) or (b)(3) exception',
      trigger: { key: "opt_out_exception", equals: ["Hiring/admission exception (§ 7221(b)(2)) — ADMT used solely to assess ability; no unlawful discrimination", "Work allocation/compensation exception (§ 7221(b)(3)) — ADMT used solely for allocation/compensation; no unlawful discrimination"] } },
    { key: "admt_detail.bias_last_test",            kind: "text", required: "conditional",
      requiredWhen: 'opt_out_exception is the § 7221(b)(2) or (b)(3) exception',
      trigger: { key: "opt_out_exception", equals: ["Hiring/admission exception (§ 7221(b)(2)) — ADMT used solely to assess ability; no unlawful discrimination", "Work allocation/compensation exception (§ 7221(b)(3)) — ADMT used solely for allocation/compensation; no unlawful discrimination"] } },
    { key: "admt_detail.bias_next_test",            kind: "text", required: "conditional",
      requiredWhen: 'opt_out_exception is the § 7221(b)(2) or (b)(3) exception',
      trigger: { key: "opt_out_exception", equals: ["Hiring/admission exception (§ 7221(b)(2)) — ADMT used solely to assess ability; no unlawful discrimination", "Work allocation/compensation exception (§ 7221(b)(3)) — ADMT used solely for allocation/compensation; no unlawful discrimination"] } },
    { key: "admt_detail.bias_adverse_impact",       kind: "enum", required: "conditional", options: ADMT_BIAS_ADVERSE_IMPACT_OPTS,
      requiredWhen: 'opt_out_exception is the § 7221(b)(2) or (b)(3) exception',
      trigger: { key: "opt_out_exception", equals: ["Hiring/admission exception (§ 7221(b)(2)) — ADMT used solely to assess ability; no unlawful discrimination", "Work allocation/compensation exception (§ 7221(b)(3)) — ADMT used solely for allocation/compensation; no unlawful discrimination"] } },
    { key: "admt_detail.bias_outcome_summary",      kind: "narrative", required: "conditional",
      requiredWhen: 'opt_out_exception is the § 7221(b)(2) or (b)(3) exception',
      trigger: { key: "opt_out_exception", equals: ["Hiring/admission exception (§ 7221(b)(2)) — ADMT used solely to assess ability; no unlawful discrimination", "Work allocation/compensation exception (§ 7221(b)(3)) — ADMT used solely for allocation/compensation; no unlawful discrimination"] } },
    // DOC 158 — § 7222(g) secure transmission and § 7222(f) denial basis,
    // collected by the form (rail entries existed) and never registered or read.
    { key: "admt_detail.access_secure_transmission", kind: "enum", required: "optional", options: ADMT_ACCESS_SECURE_TX_OPTS },
    { key: "admt_detail.access_denial_basis",       kind: "narrative", required: "optional" },

    // UPGRADE-3 ITEM 1 — the whole published pre-use notice, verbatim. The
    // § 7220(c) element findings TEST the business's own words against the
    // standard; without it those findings degrade to record_insufficient.
    { key: "notice_full_text", kind: "narrative", required: "optional" },

    // UPGRADE-3 ITEM 3 — § 7222(b) explanation readiness, element by element.
    { key: "access_readiness", kind: "structured", required: "optional" },
    ...ACCESS_READINESS_KEYS,
  ],
};

// Exposed so tests can spot-check the inline-list copies.
export const CPPA_ADMT_INLINE_LISTS = {
  SIGNIFICANT_DECISION_DOMAINS,
  HUMAN_REVIEW_OPTIONS,
  NOTICE_DELIVERY_OPTIONS,
  OPT_OUT_METHODS,
  OPT_OUT_EXCEPTIONS,
};
