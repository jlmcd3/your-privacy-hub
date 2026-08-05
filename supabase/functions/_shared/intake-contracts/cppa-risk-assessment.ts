// RC-REM-P1-B — CPPA Risk Assessment intake contract.
//
// Intake shape verified against src/pages/CPPARiskAssessment.tsx `intake`
// memo (~L483). Required-vs-conditional matches the form's `stepValid`
// (~L444). Enum options are content-anchored to
// src/pages/CPPARiskAssessment.enums.ts (imported by the test module at
// PARITY time) and to the page's inline `<Radio options={[…]}` literals
// (copied verbatim below and asserted against the page's live source in
// PARITY).
//
// IMPORT-VS-LITERAL: same decision as the cyber contract (P1-A) —
// literal copy in the contract; parity enforced by the test.

import type { IntakeContract } from "./types.ts";

// ── Verbatim option copies ──────────────────────────────────────────────
// BAND-REALIGNMENT-T2A (2026-07-26) — REVENUE_OPTS retargeted to V2 label
// set from `_shared/bands/revenue-consumer.ts`. V2 edges align with the
// statutory lines (§ 1798.140(d)(1)(A) $25M, § 7121(a) $50M / $100M cohort
// breakpoints) so every band answer resolves to exactly ONE cohort and ONE
// applicability answer. Legacy V1 labels remain resolvable via
// `resolveRevenueBand` in the normaliser; the classifier retains V1 switch
// cases for stored-row back-compat.
export const REVENUE_OPTS = ["Under $25M", "$25M to under $50M", "$50M to $100M", "Over $100M"] as const;
// Verbatim copy of SENSITIVE_LOCATION_BASIS_OPTS from
// src/pages/CPPARiskAssessment.enums.ts. Parity asserted by the risk
// option-drift test (single source of truth = the .enums.ts export).
export const SENSITIVE_LOCATION_BASIS_OPTS = [
  "Not applicable — no sensitive-location processing",
  "Healthcare facility or medical office",
  "Domestic-violence shelter or family-justice services",
  "Place of worship",
  "School or educational facility",
  "Reproductive- or sexual-health services",
  "Substance-use or mental-health treatment facility",
  "Immigration- or refugee-services facility",
  "Other sensitive location (describe in the intake)",
] as const;
// BAND-REALIGNMENT-T2A (2026-07-26) — CONSUMER_OPTS retargeted to V2. V2
// edges align with § 1798.140(d)(1)(B) 100,000 trigger and § 7120(b)(2)(A)
// 250,000 prong. Legacy V1 labels remain resolvable via resolveConsumerBand.
export const CONSUMER_OPTS = ["Under 100,000", "100,000 to under 250,000", "250,000 to under 1,000,000", "1,000,000 or more"] as const;
// T-C1 (2026-07-28) — § 1798.140(d)(1)(B) OPERAND bands. Legal meaning:
// the approximate number of California consumers or households whose
// personal information the business BUYS, SELLS, or SHARES annually.
// The 100,000 edge is the hard § 1798.140(d)(1)(B) statutory line — no
// band straddles it. Distinct name from CONSUMER_OPTS so a refactor
// cannot conflate the two operands (see risk-opening.ts design rule 6).
export const BOUGHT_SOLD_SHARED_OPTS = [
  "Under 100,000",
  "100,000 to under 250,000",
  "250,000 to under 1,000,000",
  "1,000,000 or more",
] as const;
export const SPI_VOLUME_OPTS = ["Fewer than 50,000", "50,000 or more", "Unsure"] as const;
export const SHARE_REVENUE_50PCT_OPTS = ["Yes", "No", "Unsure"] as const;
export const Q5_SELL_SHARE_OPTS = ["Yes — sell only", "Yes — share for advertising only", "Both", "No"] as const;
export const Q15_SENSITIVE_PI_OPTS = ["Yes", "No", "Unsure"] as const;
export const IMPACT_LIKELIHOOD_OPTS = ["Unlikely", "Possible", "Likely", "Highly likely"] as const;
export const IMPACT_SEVERITY_OPTS = ["Minimal", "Moderate", "Significant", "Severe"] as const;
export const IMPACT_BENEFITS_OUTWEIGH_OPTS = ["Yes", "No", "Uncertain"] as const;
export const IMPACT_CYBER_GAPS_OPTS = ["Yes", "No"] as const;
export const HARM_TYPES = [
  "Unauthorised access, destruction, use, modification, or disclosure",
  "Loss of availability of personal information",
  "Unlawful discrimination",
  "Impairment of consumer control over personal information",
  "Coercion or dark patterns",
  "Economic harm",
  "Physical harm",
  "Reputational harm",
  "Psychological harm",
] as const;

// ── ITEM 305 — analytic-deliverable option sets ──────────────────────
// VERBATIM copies of src/pages/CPPARiskAssessment.enums.ts. Parity is
// asserted by the ITEM 305 pin test. The "(A)"…"(H)" prefixes on
// HARM_PATHWAY_OPTS are load-bearing (resolveHarmId reads the tag).
export const NECESSITY_STATUS_OPTS = [
  "Necessary to the stated purpose",
  "Collected but not necessary to the stated purpose",
  "Unsure",
] as const;
export const HARM_PATHWAY_OPTS = [
  "(A) Unauthorized access, destruction, use, modification, or disclosure",
  "(B) Unlawful discrimination on protected characteristics",
  "(C) Impairment of consumer control over personal information",
  "(D) Coercion or compulsion, including dark patterns",
  "(E) Economic harms",
  "(F) Physical harms",
  "(G) Reputational harms",
  "(H) Psychological harms",
] as const;
export const HARM_LIKELIHOOD_OPTS = ["Unlikely", "Possible", "Likely", "Highly likely"] as const;
export const HARM_SEVERITY_OPTS = ["Minimal", "Moderate", "Significant", "Severe"] as const;
export const SAFEGUARD_STATUS_OPTS = [
  "Implemented and tested",
  "Implemented, not tested",
  "Planned, not yet implemented",
  "None",
] as const;
export const BENEFICIARY_CLASSES = [
  "the business",
  "the consumer",
  "other stakeholders",
  "the public",
] as const;

// Page-inline option lists (see CPPARiskAssessment.tsx line numbers in
// comments below). These live inline in the JSX (or as page-local const
// arrays not re-exported from .enums.ts); parity for them is spot-checked
// via CPPA_RISK_INLINE_LISTS below (imported into the test module and
// asserted against the page source via a substring anchor).
const Q5B_PROFILING_OPTS = [
  "Yes — systematic observation of workers/students/applicants",
  "Yes — based on sensitive-location presence",
  "Both",
  "No",
] as const;
const Q7_OPTS = ["Automated deletion with confirmation", "Manual process, documented", "Case-by-case handling", "No formal process"] as const;
const Q8_OPTS = ["Online self-service", "Handled via support", "No formal process"] as const;
const Q9_OPTS = ["Yes, prominently on homepage", "Yes, but in footer only", "In progress", "No"] as const;
const Q10_OPTS = ["Documented verification process matching CPPA guidance", "Informal verification", "No verification process"] as const;
const Q11_OPTS = ["Within 12 months", "12–24 months ago", "Over 24 months ago", "No privacy policy"] as const;
const Q12_OPTS = ["Yes, covers all collection points", "Yes, partial coverage", "No"] as const;
const Q13_OPTS = ["Yes, all three", "Some elements", "No"] as const;
const Q14_OPTS = ["Yes", "No — we use our general privacy policy", "Not applicable (no CA employees)"] as const;
const Q16_OPTS = [
  "Yes, with a separate \"Limit the Use of My Sensitive PI\" link",
  "Yes, handled within privacy settings",
  "No",
  "Not yet implemented",
] as const;
const Q17_OPTS = ["Consent", "Necessary for the service", "Employment contract", "Other permitted purpose"] as const;
const Q18_OPTS = ["Yes", "No", "In evaluation"] as const;
const Q15B_UNDER16_OPTS = [
  "Yes — we knowingly process under-16 data",
  "No — we do not knowingly process under-16 data",
  "Unsure",
] as const;
const Q20_OPTS = ["Yes, with documented opt-out", "Planned for implementation", "No"] as const;
const Q21_TRAINING_OPTS = [
  "Yes — training ADMT for significant decisions",
  "Yes — training facial/emotion/biometric recognition",
  "No",
] as const;
const CA_CONSUMER_BAND = ["Fewer than 10,000", "10,000–100,000", "100,000–1,000,000", "More than 1,000,000", "Unsure"] as const;
const DISCLOSURE_MECHANISMS = [
  "Notice at Collection",
  "Privacy policy",
  "Just-in-time notice",
  "Consent screen",
  "Account-settings disclosure",
  "Contract / terms of service",
  "No standalone disclosure",
] as const;
const RETENTION_CRITERIA = [
  "Fixed period from collection",
  "Duration of account / relationship",
  "Statutory or regulatory retention requirement",
  "Until purpose is fulfilled, then deletion",
  "Other criteria (described below)",
] as const;
const YES_NO_OPTS = ["Yes", "No"] as const;
// ITEM 275 — verbatim copy of HAS_SECONDARY_USES_OPTS from
// src/pages/CPPARiskAssessment.tsx (§ 7156(a) comparable-set fork).
export const HAS_SECONDARY_USES_OPTS = [
  "No — this data is used for this activity only",
  "Yes — there are other uses",
] as const;
export const DIVERGENCE_OPTS = ["Same", "Different", "Not sure"] as const;


// Fixed inline option lists on the page (verbatim copies from
// src/pages/CPPARiskAssessment.tsx):
//   • PI_CATEGORIES     — L97   (rendered by <Pills options={PI_CATEGORIES}> at L816)
//   • Q6_ACCESS_OPTS    — inline at L857 (rendered by <Pills options={[...]}> at L856)
//   • SECTORS           — L96   (rendered by <select> at L807-810)
// These are anchored, closed lists with no free-text "Other" fold-in on
// the field (PI_CATEGORIES includes a literal "Other" pill that is a
// selectable enum member, not a text input), so they are registered as
// enum / multi-enum and asserted via CPPA_RISK_INLINE_LISTS parity below.
const PI_CATEGORIES = [
  "Contact identifiers (name, email, phone)",
  "Device identifiers (IP, cookies, device IDs)",
  "Internet or network activity",
  "Precise geolocation (GPS-level / specific address)",
  "General location (city, region, ZIP, IP-derived)",
  "Financial information",
  "Health or medical information",
  "Biometric information",
  "Genetic data",
  "Racial or ethnic origin",
  "Religious or philosophical beliefs",
  "Union membership",
  "Sexual orientation or gender identity",
  "Citizenship or immigration status",
  "Employment information",
  "Education information",
  "Children's data (under 16)",
  "Other",
] as const;
const Q6_ACCESS_OPTS = [
  "Online form with identity verification",
  "Email or written request process",
  "In-app account settings",
  "No formal process in place",
] as const;
const SECTORS = [
  "Technology/SaaS",
  "Healthcare/Life Sciences",
  "Financial services",
  "Retail/ecommerce",
  "Media/advertising",
  "Professional services",
  "Education",
  "Government/public sector",
  "Legal services",
  "Manufacturing",
  "Other",
] as const;

// Exposed for the test module — verifies verbatim parity with the page
// inline literals (the .enums.ts module doesn't export these).
export const CPPA_RISK_INLINE_LISTS = {
  PI_CATEGORIES,
  Q6_ACCESS_OPTS,
  SECTORS,
};

export const cppaRiskContract: IntakeContract = {
  tool_type: "cppa_risk_assessment",
  table: "cppa_risk_runs",
  fields: [
    // Business profile (Step 1 — all required)
    { key: "entity_name",    kind: "text", required: "always" },
    { key: "subject_anchor", kind: "text", required: "always" },
    // ITEM 275 — primary-activity identification + § 7156(a) comparable-set
    // fork. `secondary_activities` is structured/optional: it is emitted as
    // [] unless the fork answer is the "Yes" option.
    { key: "primary_activity_name",    kind: "text", required: "always" },
    { key: "primary_activity_purpose", kind: "text", required: "always" },
    { key: "has_secondary_uses",       kind: "enum", required: "always",
      options: HAS_SECONDARY_USES_OPTS },
    // ITEM 380 r5b — real skip logic: CPPARiskAssessment.tsx L1147 renders the
    // secondary-activity repeater, and L688 emits rows, only when the fork
    // answer is the "Yes" option; otherwise the key is emitted as [].
    { key: "secondary_activities",     kind: "structured", required: "conditional",
      requiredWhen: "has_secondary_uses === \"Yes — there are other uses\"",
      trigger: { key: "has_secondary_uses", equals: ["Yes — there are other uses"] } },


    { key: "q1_revenue",     kind: "enum", required: "always", options: REVENUE_OPTS },
    { key: "q2_consumers",   kind: "enum", required: "always", options: CONSUMER_OPTS },
    { key: "q3_sector",      kind: "enum", required: "always", options: SECTORS },
    { key: "q4_pi_categories", kind: "multi-enum", required: "always", options: PI_CATEGORIES },
    { key: "q5_sell_share",  kind: "enum", required: "always", options: Q5_SELL_SHARE_OPTS },
    { key: "q5b_profiling_observation", kind: "enum", required: "always", options: Q5B_PROFILING_OPTS },
    // Q5c only appears when q5 starts with "Yes"; hiddenValue is "".
    { key: "q5c_share_revenue_50pct", kind: "enum", required: "conditional",
      requiredWhen: 'q5_sell_share starts with "Yes"', hiddenValue: "",
      options: SHARE_REVENUE_50PCT_OPTS },
    // TURN 1b intake fields (RISK CONTRACT DRIFT fix). Options for
    // sensitive_location_basis MUST match SENSITIVE_LOCATION_BASIS_OPTS in
    // src/pages/CPPARiskAssessment.enums.ts verbatim; parity is asserted
    // by _tests/golden-contract.test.ts and the risk option-drift test.
    { key: "sensitive_location_basis", kind: "enum", required: "optional",
      options: SENSITIVE_LOCATION_BASIS_OPTS },
    // T-C1 (2026-07-28) — § 1798.140(d)(1)(B) operand. Legal meaning:
    // approximate number of California consumers or households whose PI the
    // business BUYS, SELLS, or SHARES annually. Optional at intake time
    // (unanswered → surfaces in information_needed per the (B)-gap gate,
    // per Item 218 T-C1). Legacy rows without this key resolve to
    // unknown (omission over invention) — no deterministic (B) assertion.
    { key: "bought_sold_shared_count", kind: "enum", required: "optional",
      options: BOUGHT_SOLD_SHARED_OPTS },
    // Public privacy-policy URL rendered as a record anchor in the
    // attestation_block and submission_summary. Free-form text; the
    // contract's convention for URL/text fields is `kind: "text"`
    // (see subject_anchor above).
    { key: "public_privacy_policy_url", kind: "text", required: "optional" },


    // Consumer rights (Step 2)
    { key: "q6_right_know",       kind: "text",       required: "always" }, // form joins q6Multi with "; " — free-form joined string, not enum-checkable
    { key: "q6_right_know_multi", kind: "multi-enum", required: "always", options: Q6_ACCESS_OPTS }, // <Pills options={[…verbatim…]}> at CPPARiskAssessment.tsx L856-857
    { key: "q7_right_delete",     kind: "enum",       required: "always", options: Q7_OPTS },
    { key: "q8_right_correct",    kind: "enum",       required: "always", options: Q8_OPTS },
    { key: "q9_opt_out",          kind: "enum",       required: "always", options: Q9_OPTS },
    { key: "q10_id_verification", kind: "enum",       required: "always", options: Q10_OPTS },

    // Notices (Step 3)
    { key: "q11_policy_review",       kind: "enum", required: "always", options: Q11_OPTS },
    { key: "q12_notice_at_collection", kind: "enum", required: "always", options: Q12_OPTS },
    { key: "q13_notice_content",       kind: "enum", required: "always", options: Q13_OPTS },
    { key: "q14_employee_notice",      kind: "enum", required: "always", options: Q14_OPTS },

    // Sensitive PI (Step 4)
    { key: "q15_sensitive_pi",      kind: "enum", required: "always", options: Q15_SENSITIVE_PI_OPTS },
    { key: "q15b_under16_knowledge", kind: "enum", required: "always", options: Q15B_UNDER16_OPTS },
    { key: "q15c_spi_volume",       kind: "enum", required: "conditional",
      requiredWhen: 'q15_sensitive_pi === "Yes"', hiddenValue: "",
      options: SPI_VOLUME_OPTS },
    { key: "q16_sensitive_limit",   kind: "enum", required: "conditional",
      requiredWhen: 'q15_sensitive_pi === "Yes"', hiddenValue: "",
      options: Q16_OPTS },
    { key: "q17_sensitive_basis",   kind: "enum", required: "conditional",
      requiredWhen: 'q15_sensitive_pi === "Yes"', hiddenValue: "",
      options: Q17_OPTS },

    // ADMT (Step 5)
    { key: "q18_admt_use",       kind: "enum",      required: "always", options: Q18_OPTS },
    { key: "q19_admt_description", kind: "narrative", required: "conditional",
      requiredWhen: 'q18_admt_use === "Yes" || q18_admt_use === "In evaluation"',
      hiddenValue: "" },
    { key: "q20_admt_opt_out",   kind: "enum",      required: "conditional",
      requiredWhen: 'q18_admt_use === "Yes"', hiddenValue: "",
      options: Q20_OPTS },
    { key: "q18b_admt_training", kind: "enum",      required: "always", options: Q21_TRAINING_OPTS },

    // Step 6 — I-series
    { key: "i1_processing_purpose",  kind: "narrative",  required: "always" }, // ≥30 chars in form
    { key: "i1b_min_pi",             kind: "narrative",  required: "always" }, // ≥20 chars in form
    { key: "i2_retention_period",    kind: "text",       required: "always" },
    { key: "i2_retention_criteria",  kind: "enum",       required: "always", options: RETENTION_CRITERIA },
    { key: "i2_retention_detail",    kind: "narrative",  required: "optional" },
    { key: "i3_ca_consumer_band",    kind: "enum",       required: "always", options: CA_CONSUMER_BAND },
    { key: "i4_disclosure_mechanisms", kind: "multi-enum", required: "always", options: DISCLOSURE_MECHANISMS },
    { key: "i4b_sources",            kind: "narrative",  required: "always" },
    // I-5 fields are only required when ADMT trigger is engaged.
    { key: "i5_admt_logic",          kind: "narrative",  required: "conditional",
      requiredWhen: 'ADMT trigger engaged (q18_admt_use === "Yes" or "In evaluation")' },
    { key: "i5_admt_training_source", kind: "narrative", required: "optional" },
    { key: "i5_admt_fairness_testing", kind: "narrative", required: "optional" },
    { key: "i5_admt_human_review",   kind: "narrative",  required: "conditional",
      requiredWhen: 'ADMT trigger engaged' },
    { key: "i6_vendors",             kind: "narrative",  required: "always" },
    { key: "i7_internal_contributors", kind: "narrative", required: "always" },
    { key: "i7_external_consultees", kind: "narrative",  required: "optional" },
    { key: "i8_certifying_exec_name", kind: "text",      required: "always" },
    { key: "i8_certifying_exec_title", kind: "text",     required: "always" },
    { key: "i8_contact_phone",       kind: "text",       required: "optional" },
    { key: "i8_contact_email",       kind: "text",       required: "optional" },
    { key: "i9_has_existing_dpia",   kind: "enum",       required: "always", options: YES_NO_OPTS },
    { key: "i9_existing_dpia_summary", kind: "narrative", required: "conditional",
      requiredWhen: 'i9_has_existing_dpia === "Yes"', hiddenValue: "" },

    // Structured optional blocks
    // ITEM 380 r5c — emptyIsAnswer. CPPARiskAssessment.tsx:1655-1710 presents
    // the exceptions block unconditionally and instructs "leave blank if none
    // apply", so an empty block is a substantive negative answer.
    { key: "exceptions_intake", kind: "structured", required: "optional", emptyIsAnswer: true },
    { key: "impact_intake",     kind: "structured", required: "optional" },

    // Impact_intake enum leaves — advisory (impact_intake itself is
    // optional; only enum-parity is enforced when present).
    { key: "impact_intake.likelihood",      kind: "enum", required: "optional", options: IMPACT_LIKELIHOOD_OPTS },
    { key: "impact_intake.severity",        kind: "enum", required: "optional", options: IMPACT_SEVERITY_OPTS },
    { key: "impact_intake.benefitsOutweigh", kind: "enum", required: "optional", options: IMPACT_BENEFITS_OUTWEIGH_OPTS },
    { key: "impact_intake.cyberGaps",       kind: "enum", required: "optional", options: IMPACT_CYBER_GAPS_OPTS },
    { key: "impact_intake.harmTypes",       kind: "multi-enum", required: "optional", options: HARM_TYPES },

    // ── ITEM 305 — ANALYTIC-DELIVERABLE INTAKE ───────────────────────
    // Chapter 1 of PRODUCT-REQUIREMENTS-AND-GAP-ANALYSIS-2026-07-30.md.
    // These fields are the operands of the five per-activity analytic
    // deliverables built in
    // _shared/ltp/analytic-deliverables/build.ts. Option lists are
    // VERBATIM copies of src/pages/CPPARiskAssessment.enums.ts (parity
    // asserted by the ITEM 305 pin test).
    //
    // Requiredness note: the form gates submission on these (§ 7152(a)(2),
    // (a)(4), (a)(5), (a)(9) are mandatory elements of the assessment), but
    // the builder still degrades rather than inventing, so LEGACY stored
    // rows without them render as record_insufficient instead of failing.
    { key: "a2_necessity_set",              kind: "structured", required: "always" },
    { key: "a2_necessity_set[].element",    kind: "text",       required: "always" },
    { key: "a2_necessity_set[].necessity",  kind: "enum",       required: "always",
      options: NECESSITY_STATUS_OPTS },
    { key: "a2_necessity_set[].justification", kind: "narrative", required: "optional", askEligible: true },

    { key: "a4_benefit_business",           kind: "narrative",  required: "always", askEligible: true },
    { key: "a4_benefit_consumer",           kind: "narrative",  required: "always", askEligible: true },
    { key: "a4_benefit_other_stakeholders", kind: "narrative",  required: "always", askEligible: true },
    { key: "a4_benefit_public",             kind: "narrative",  required: "always", askEligible: true },

    // UPGRADE-2 (ITEM 4) — § 7152(a)(4) supporting record facts. Optional so
    // legacy rows keep validating; without them the weighing reserves.
    { key: "a4_benefit_business_fact",           kind: "narrative", required: "optional", askEligible: true },
    { key: "a4_benefit_consumer_fact",           kind: "narrative", required: "optional", askEligible: true },
    { key: "a4_benefit_other_stakeholders_fact", kind: "narrative", required: "optional", askEligible: true },
    { key: "a4_benefit_public_fact",             kind: "narrative", required: "optional", askEligible: true },

    { key: "a5_harm_pathways",              kind: "structured", required: "always" },
    { key: "a5_harm_pathways[].harm",       kind: "enum",       required: "always",
      options: HARM_PATHWAY_OPTS },
    // UPGRADE-2 (ITEM 4) — § 7152(a)(5) pathway triple: what data, what actor,
    // what route. These feed harm_causation[] directly.
    { key: "a5_harm_pathways[].data_involved", kind: "narrative", required: "always", askEligible: true },
    { key: "a5_harm_pathways[].actor",      kind: "narrative",  required: "always", askEligible: true },
    { key: "a5_harm_pathways[].source",     kind: "narrative",  required: "always", askEligible: true },
    { key: "a5_harm_pathways[].cause",      kind: "narrative",  required: "always", askEligible: true },
    { key: "a5_harm_pathways[].likelihood", kind: "enum",       required: "always",
      options: HARM_LIKELIHOOD_OPTS },
    { key: "a5_harm_pathways[].severity",   kind: "enum",       required: "always",
      options: HARM_SEVERITY_OPTS },

    { key: "a6_safeguards",                 kind: "structured", required: "optional" },
    { key: "a6_safeguards[].harm",          kind: "enum",       required: "conditional",
      requiredWhen: "a safeguard row is present", options: HARM_PATHWAY_OPTS },
    { key: "a6_safeguards[].safeguard",     kind: "narrative",  required: "conditional",
      requiredWhen: "a safeguard row is present", askEligible: true },
    { key: "a6_safeguards[].safeguard_status", kind: "enum",    required: "conditional",
      requiredWhen: "a safeguard row is present", options: SAFEGUARD_STATUS_OPTS },
    // UPGRADE-2 (ITEM 4) — § 7152(a)(6) residual risk after the safeguard.
    { key: "a6_safeguards[].residual", kind: "narrative",  required: "conditional",
      requiredWhen: "a safeguard row is present", askEligible: true },

    // § 7152(a)(9) — review-and-approval record. Distinct from the
    // i8_certifying_exec_* pair (the person who CERTIFIES the submission);
    // (a)(9) is the person who REVIEWED AND APPROVED the assessment and who
    // has authority to participate in the initiation decision.
    { key: "a9_approver_name",     kind: "text", required: "always" },
    { key: "a9_approver_position", kind: "text", required: "always" },
    { key: "a9_approval_date",     kind: "date", required: "optional" },
    // UPGRADE-2 (ITEM 4) — § 7152(a)(8) information providers. Legal counsel
    // who provided legal advice is excluded from this record.
    { key: "a8_information_providers", kind: "narrative", required: "always", askEligible: true },
  ],

};
