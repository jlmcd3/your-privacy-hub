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


// ── Verbatim inline lists from ADMTChecker.tsx ─────────────────────────
const SIGNIFICANT_DECISION_DOMAINS = [
  "Financial or lending services (credit decisions, loans, accounts)",
  "Housing (rental or purchase eligibility)",
  "Education enrollment or opportunities (admission, credentials, suspension)",
  "Hiring or admission decisions",
  "Work allocation, scheduling, or compensation",
  "Promotion, demotion, suspension, or termination",
  "Healthcare services (diagnosis, treatment, care eligibility)",
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

const NOTICE_SPECIFIC_PURPOSE_OPTS = [
  "Yes",
  "No — uses generic language",
  "We have not yet created a Pre-use Notice",
] as const;
const NOTICE_OPT_OUT_DESC_OPTS = [
  "Yes — with specific opt-out instructions",
  "Mentions opt-out but without clear instructions",
  "No",
  "We rely on an exception and describe appeal rights instead",
] as const;
const NOTICE_ACCESS_DESC_OPTS = ["Yes", "No", "Not yet"] as const;
const NOTICE_ANTI_RET_OPTS = ["Yes", "No", "Not yet"] as const;
const NOTICE_HOW_IT_WORKS_OPTS = [
  "Yes — included inline in the notice",
  "Yes — via hyperlink or layered notice",
  "Partial — some elements missing",
  "No",
  "Not yet",
] as const;
const NOTICE_ALT_PROCESS_OPTS = [
  "Yes",
  "No",
  "Not applicable — we rely on an opt-out exception",
] as const;
const OPT_OUT_NO_COOKIE_BANNER_OPTS = [
  "Confirmed — we provide at least one ADMT-specific opt-out method in addition",
  "Cookie banner is currently our only method (gap)",
] as const;
const OPT_OUT_NO_ACCOUNT_REQUIRED_OPTS = [
  "Confirmed — no account required",
  "Account is currently required (gap)",
] as const;
const ACCESS_RESPONSE_TIMELINE_OPTS = [
  "Within 45 calendar days (standard)",
  "Within 45 days with documented 45-day extension capability",
  "Our process is not yet defined",
] as const;

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
    { key: "opt_out_service_provider_notice", kind: "narrative", required: "optional" },

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
