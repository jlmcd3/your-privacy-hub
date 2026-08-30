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
// TURN 1c (2026-08-26, CEO-directed redesign) — direct Yes/No on the
// statute's actual element (inference FROM presence at a sensitive
// location), replacing the prior 9-option location-TYPE picker that let a
// business engage the trigger by naming its sector alone. See the parity
// comment in src/pages/CPPARiskAssessment.enums.ts for the full rationale.
export const SENSITIVE_LOCATION_BASIS_OPTS = [
  "Yes",
  "No",
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
  "(A) Unauthorized access, destruction, use, modification, or disclosure; loss of availability",
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

// RK3-A2 g1 — verbatim copy of PROCESSING_STATUS_OPTS from
// src/pages/CPPARiskAssessment.enums.ts (parity pinned in
// rk3-a2-timing.test.ts).
export const PROCESSING_STATUS_OPTS = ["Planned", "Ongoing", "Discontinued"] as const;
export const HARM_CATEGORY_REVIEW_STATUS_OPTS = ["Identified", "Considered-none", "Not yet assessed"] as const;

// ── RK3-D (doc 33 D-L3) — Class C→B conversion operands. Verbatim copies of
// src/pages/CPPARiskAssessment.enums.ts; parity pinned in
// rk3-d-class-c.test.ts. The enum carries the judgment as typed facts; the
// legal significance of each answer lives in the ratified determination
// tables in risk-factor-engine.ts (doc 33 D-L5), never in the answer.
export const PURPOSE_SPECIFICITY_FACTS_OPTS = [
  "The specific product, service, or operation the processing supports",
  "The categories of personal information involved",
  "The categories of consumers affected",
  "The intended outcome or result of the processing",
  "None of the above",
] as const;
export const OUT_OF_SCOPE_CONFIRMATION_OPTS = [
  "The affected information is processed only for the stated purpose and any listed secondary uses",
  "The affected information is also processed for other activities not covered by this assessment",
  "Unsure",
] as const;
export const COMPARABLE_PROCESSING_STATUS_OPTS = [
  "This assessment covers a single processing activity",
  "This assessment covers a set of similar activities presenting similar risks",
  "Unsure",
] as const;
export const CONSUMER_RELATIONSHIP_CONTEXT_OPTS = [
  "Existing customers or account holders",
  "Prospective customers or site visitors",
  "Employees or job applicants",
  "Students",
  "Patients or health-service recipients",
  "General public — no direct relationship",
  "Mixed",
] as const;
export const SOURCE_CATEGORY_OPTS = [
  "Directly from the consumer",
  "Automatically from consumer devices or interactions",
  "From service providers or contractors",
  "From third-party data providers or brokers",
  "From public sources",
  "From another business (merger, partnership, or similar)",
] as const;
export const VENDOR_DEPENDENCY_OPTS = [
  "No single recipient or vendor is essential to the processing",
  "One or more vendors are essential — the processing could not continue without them",
  "Unsure",
] as const;
export const EXPECTATION_CHECK_OPTS = [
  "The processing occurs during and as part of the consumer's interaction with the Company",
  "The processing continues after the interaction ends",
  "Information is used for a purpose different from the purpose for which it was collected",
  "Information is combined with information from other sources",
  "Information is disclosed to parties the consumer does not directly interact with",
  "None of the above apply",
] as const;
export const CHOICE_ARCHITECTURE_CHECK_OPTS = [
  "Consent or permission requests are presented symmetrically — declining is as easy as accepting",
  "Declining the processing does not degrade the core service the consumer seeks",
  "The Company does not use design elements that steer consumers toward permitting the processing",
  "None of the above can be confirmed",
] as const;
export const ADMT_ROLE_TYPE_OPTS = [
  "The ADMT makes the decision without human involvement",
  "The ADMT is a substantial factor in a human decision",
  "The ADMT supports a human decision without being a substantial factor",
  "Unsure",
] as const;
export const ADMT_LOGIC_DOCUMENTED_OPTS = [
  "The logic is documented and reviewed internally",
  "The logic is documented by the provider and the Company relies on that documentation",
  "The logic is not fully documented or understood",
  "Unsure",
] as const;
export const HUMAN_REVIEW_FACTS_OPTS = [
  "Reviewers know how to interpret and use the ADMT's output",
  "Reviewers consider information beyond the ADMT's output",
  "Reviewers have authority to change or overrule the decision",
  "None of the above can be confirmed",
  "There is no human review",
] as const;
export const ADMT_TESTING_FACTS_OPTS = [
  "Tested for accuracy or validity",
  "Tested for discriminatory impact or bias",
  "Testing performed or reviewed within the last 12 months",
  "Testing performed by the provider rather than the Company",
  "No testing has been performed or confirmed",
] as const;
export const RISK_INTERDEPENDENCY_OPTS = [
  "The identified risk pathways operate independently",
  "Two or more identified pathways could compound each other",
  "Unsure",
] as const;
export const BENEFIT_MAGNITUDE_BASIS_OPTS = [
  "Quantified or measurable basis stated",
  "Qualitative basis stated",
  "No basis stated",
] as const;
export const SECONDARY_RELATION_OPTS = [
  "Compatible — supports or extends the primary purpose",
  "Distinct — a separate purpose",
  "Not yet determined",
] as const;
export const SECONDARY_DISCLOSED_OPTS = [
  "Yes — disclosed at or before collection",
  "No",
  "Unsure",
] as const;
export const RECIPIENT_CONTRACT_OPTS = [
  "Written contract with the CCPA-required restrictions in place",
  "Written contract without confirmed CCPA restriction terms",
  "No written contract",
  "Unsure",
] as const;
export const SAFEGUARD_EFFECTIVENESS_BASIS_OPTS = [
  "Validated by testing against the linked risk",
  "Consistent with an industry standard or framework",
  "Based on internal design review only",
  "No effectiveness evidence",
] as const;
export const PLANNED_TIMELINE_OPTS = [
  "Before processing begins or within 3 months",
  "Within 12 months",
  "No committed timeline",
] as const;

// RK3-A1 g2 — verbatim copy of CONSUMER_INTERACTION_METHOD_OPTS from
// src/pages/CPPARiskAssessment.enums.ts (parity pinned in
// rk3-a1-processing-record.test.ts).
export const CONSUMER_INTERACTION_METHOD_OPTS = [
  "Website",
  "Mobile app",
  "In person",
  "Telephone",
  "Email",
  "No direct interaction (obtained from another source)",
  "Other",
] as const;

// Page-inline option lists (see CPPARiskAssessment.tsx line numbers in
// comments below). These live inline in the JSX (or as page-local const
// arrays not re-exported from .enums.ts); parity for them is spot-checked
// via CPPA_RISK_INLINE_LISTS below (imported into the test module and
// asserted against the page source via a substring anchor).
// TURN 1d (2026-08-26, fleet intake audit findings 1+2) — direct Yes/No on
// the § 7150(b)(4) element only (inference from systematic observation of
// workers/students/applicants). The retired 4-option enum's
// "sensitive-location presence"/"Both" options fed the § 7150(b)(5) gate
// WITHOUT the inference caveat the TURN 1c sensitive_location_basis
// redesign added (the audit's finding-1 loophole), and its observation
// option never required an inference to be described (finding 2).
// § 7150(b)(5) now resolves solely from sensitive_location_basis. The
// deterministic predicates keep a narrow legacy-compat clause for the two
// retired values that genuinely affirmed the OBSERVATION branch, so stored
// records re-run under the engine do not silently lose that trigger.
export const Q5B_PROFILING_OPTS = [
  "Yes",
  "No",
] as const;
export const Q7_OPTS = ["Automated deletion with confirmation", "Manual process, documented", "Case-by-case handling", "No formal process"] as const;
export const Q8_OPTS = ["Online self-service", "Handled via support", "No formal process"] as const;
export const Q9_OPTS = ["Yes, prominently on homepage", "Yes, but in footer only", "In progress", "No"] as const;
export const Q10_OPTS = ["Documented verification process matching CPPA guidance", "Informal verification", "No verification process"] as const;
export const Q11_OPTS = ["Within 12 months", "12–24 months ago", "Over 24 months ago", "No privacy policy"] as const;
export const Q12_OPTS = ["Yes, covers all collection points", "Yes, partial coverage", "No"] as const;
export const Q13_OPTS = ["Yes, all three", "Some elements", "No"] as const;
export const Q14_OPTS = ["Yes", "No — we use our general privacy policy", "Not applicable (no CA employees)"] as const;
export const Q16_OPTS = [
  "Yes, with a separate \"Limit the Use of My Sensitive PI\" link",
  "Yes, handled within privacy settings",
  "No",
  "Not yet implemented",
] as const;
export const Q17_OPTS = ["Consent", "Necessary for the service", "Employment contract", "Other permitted purpose"] as const;
// PN-CORPUS-L-RISK-1 (2026-08-22) — § 7150(b)(2)(A) personnel carve-out.
// The gate evaluator matches the "Yes — solely…" literal exactly.
const Q15D_HR_CARVEOUT_OPTS = [
  "Yes — solely for those personnel purposes",
  "No — processed for other purposes as well",
  "Not applicable — no employee or contractor sensitive PI",
] as const;
export const Q18_OPTS = ["Yes", "No", "In evaluation"] as const;
export const Q15B_UNDER16_OPTS = [
  "Yes — we knowingly process under-16 data",
  "No — we do not knowingly process under-16 data",
  "Unsure",
] as const;
export const Q20_OPTS = ["Yes, with documented opt-out", "Planned for implementation", "No"] as const;
export const Q21_TRAINING_OPTS = [
  "Yes — training ADMT for significant decisions",
  "Yes — training facial/emotion/biometric recognition",
  "No",
] as const;
export const CA_CONSUMER_BAND = ["Fewer than 10,000", "10,000–100,000", "100,000–1,000,000", "More than 1,000,000", "Unsure"] as const;
export const DISCLOSURE_MECHANISMS = [
  "Notice at Collection",
  "Privacy policy",
  "Just-in-time notice",
  "Consent screen",
  "Account-settings disclosure",
  "Contract / terms of service",
  "No standalone disclosure",
] as const;
export const RETENTION_CRITERIA = [
  "Fixed period from collection",
  "Duration of account / relationship",
  "Statutory or regulatory retention requirement",
  "Until purpose is fulfilled, then deletion",
  "Other criteria (described below)",
] as const;
const YES_NO_OPTS = ["Yes", "No"] as const;
const YES_NO_UNKNOWN_OPTS = ["Yes", "No", "Unknown"] as const;
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
    // RK3-D (doc 33 D-L3) — secondary-use row children declared for the first
    // time (the pre-RK3-D form emitted free rows). relation_to_primary ×
    // disclosed_in_notice feed the ratified secondary-use table (D-L5).
    // Optional at the data layer: legacy rows without the sub-enums keep
    // validating and the per-row analysis stays honestly absent.
    // Conditional on the same fork as the parent repeater: with no secondary
    // uses there are no rows and the sub-questions are never asked (the
    // record-complete gate's skip-logic reads the trigger).
    { key: "secondary_activities[].relation_to_primary", kind: "enum", required: "conditional",
      requiredWhen: "a secondary-activity row is present",
      trigger: { key: "has_secondary_uses", equals: ["Yes — there are other uses"] },
      options: SECONDARY_RELATION_OPTS },
    { key: "secondary_activities[].disclosed_in_notice", kind: "enum", required: "conditional",
      requiredWhen: "a secondary-activity row is present",
      trigger: { key: "has_secondary_uses", equals: ["Yes — there are other uses"] },
      options: SECONDARY_DISCLOSED_OPTS },


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
    // TURN 1b/1c intake fields (RISK CONTRACT DRIFT fix). Options for
    // sensitive_location_basis MUST match SENSITIVE_LOCATION_BASIS_OPTS in
    // src/pages/CPPARiskAssessment.enums.ts verbatim; parity is asserted
    // by _tests/golden-contract.test.ts and the risk option-drift test.
    { key: "sensitive_location_basis", kind: "enum", required: "optional",
      options: SENSITIVE_LOCATION_BASIS_OPTS },
    // ^ TURN 1c (2026-08-26): now a direct Yes/No; "Yes" engages § 7150(b)(5).
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
    // PN-CORPUS-L-RISK-1 — § 7150(b)(2)(A) personnel carve-out. Conditional
    // with a MACHINE trigger (the r5b VALUE-EQUALS shape) mirroring the
    // form's own skip logic: asked exactly when q15 === "Yes", so the
    // record-complete gate treats it as an asked question only then, and
    // records with no sensitive PI never carry it as an unanswered ask.
    { key: "q15d_hr_carveout",      kind: "enum", required: "conditional",
      requiredWhen: 'q15_sensitive_pi === "Yes"', hiddenValue: "",
      trigger: { key: "q15_sensitive_pi", equals: ["Yes"] },
      options: Q15D_HR_CARVEOUT_OPTS },

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

    // RK3-A1 g6 (Intake Contract v2.0 §9) — benefits DEMOTED from always to
    // conditional-behind-a-gate: the customer is never forced to invent a
    // benefit. The benefit_*_identified gates below carry the § 7152(a)(4)
    // "as applicable" answer; "No" is a substantive no-benefit record. Data
    // layer optional (legacy rows lack the gates); the form requires
    // narrative + fact when a gate is "Yes" (stepValid step 6).
    { key: "a4_benefit_business",           kind: "narrative",  required: "optional", askEligible: true },
    { key: "a4_benefit_consumer",           kind: "narrative",  required: "optional", askEligible: true },
    { key: "a4_benefit_other_stakeholders", kind: "narrative",  required: "optional", askEligible: true },
    { key: "a4_benefit_public",             kind: "narrative",  required: "optional", askEligible: true },
    { key: "benefit_business_identified",           kind: "enum", required: "optional", options: YES_NO_OPTS },
    { key: "benefit_consumer_identified",           kind: "enum", required: "optional", options: YES_NO_OPTS },
    { key: "benefit_other_stakeholders_identified", kind: "enum", required: "optional", options: YES_NO_OPTS },
    { key: "benefit_public_identified",             kind: "enum", required: "optional", options: YES_NO_OPTS },

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
    // RK3-A3 g1 — links each safeguard row to the harm-pathway IDs it addresses.
    // emptyIsAnswer: an empty set means "no specific pathways linked" (valid answer).
    { key: "a6_safeguards[].risk_pathway_ids", kind: "multi-enum", required: "optional",
      options: HARM_PATHWAY_OPTS, emptyIsAnswer: true },
    // RK3-D (doc 33 D-L3) — effectiveness evidence basis (joins the RK3-C
    // residual rule in the ratified safeguard-effectiveness table, D-L5) and
    // the committed timeline for planned rows (feeds planned_safeguard_analysis;
    // "No committed timeline" strengthens the Condition to Proceed).
    { key: "a6_safeguards[].effectiveness_basis", kind: "enum", required: "optional",
      options: SAFEGUARD_EFFECTIVENESS_BASIS_OPTS },
    // emptyIsAnswer: a timeline is logically conditional on the row being a
    // PLANNED safeguard; implemented rows have nothing to answer (RK3-A3
    // emptyIsAnswer posture for logically-conditional optional fields).
    { key: "a6_safeguards[].planned_timeline", kind: "enum", required: "optional",
      options: PLANNED_TIMELINE_OPTS, emptyIsAnswer: true },

    // § 7152(a)(9) — review-and-approval record. Distinct from the
    // i8_certifying_exec_* pair (the person who CERTIFIES the submission);
    // (a)(9) is the person who REVIEWED AND APPROVED the assessment and who
    // has authority to participate in the initiation decision.
    // D10 RESTAGED: a9_approver_name / _position / a9_approval_date and
    // a8_information_providers are maintained during assessment intake but
    // confirmed required at the FINALIZATION gate (cppa-risk-assessment-
    // finalization.ts). Relaxed to "optional" here so legacy rows keep
    // validating; the finalization contract re-declares a8 and a9_approval_date
    // as "always" required at the Final-Approved stage.
    { key: "a9_approver_name",     kind: "text", required: "optional" },
    { key: "a9_approver_position", kind: "text", required: "optional" },
    { key: "a9_approval_date",     kind: "date", required: "optional" },
    // UPGRADE-2 (ITEM 4) — § 7152(a)(8) information providers. Legal counsel
    // who provided legal advice is excluded from this record.
    { key: "a8_information_providers", kind: "narrative", required: "optional", askEligible: true },

    // Finalization-stage § 7152(a)(9) fields (CPPARiskAssessment.tsx
    // "Finalization stage" panel). Same D10 pattern as a9_approver_* above:
    // relaxed to "optional" here so validateIntake() recognizes the keys
    // during ordinary intake, even though the live form marks them required
    // and the finalization contract (cppa-risk-assessment-finalization.ts,
    // test-scoped) re-declares them as required at the Final-Approved stage.
    { key: "assessment_reviewers_approvers", kind: "structured", required: "optional" },
    { key: "assessment_reviewers_approvers[].name", kind: "text", required: "conditional",
      requiredWhen: "a reviewer row is present" },
    { key: "assessment_reviewers_approvers[].position", kind: "text", required: "conditional",
      requiredWhen: "a reviewer row is present" },
    { key: "assessment_reviewers_approvers[].role", kind: "enum", required: "conditional",
      requiredWhen: "a reviewer row is present", options: ["Reviewed", "Approved", "Both"] },
    { key: "approver_authority_confirmed", kind: "enum", required: "optional", options: YES_NO_OPTS },
    { key: "approver_authority_basis", kind: "narrative", required: "optional" },

    // ITEM 380 INTAKE-4a — CEO-approved addition. Question lives in the form
    // at src/pages/CPPARiskAssessment.tsx (~L1330, the block adjacent to the
    // existing i9_has_existing_dpia question). Optional at the data layer so
    // legacy stored rows (authored before this key existed) keep validating.
    { key: "material_change_since_prior", kind: "enum", required: "optional", options: YES_NO_OPTS },

    // ── RK3-A1 (Intake Contract v2.0 §1, doc 31 §2c) — § 7152(a)(3)(A)
    // processing record. `processing_methods` is the CANONICAL structured
    // record of the planned methods for collecting, using, disclosing,
    // retaining, and otherwise processing PI (child values "N/A" where a
    // stage does not occur). `processing_entry_point` and
    // `processing_result` are EUP support facts (Spine 4.3 §II.A).
    // OPTIONAL AT THE DATA LAYER (ITEM 380 INTAKE-4a pattern): legacy
    // stored rows keep validating; the FORM requires them for new
    // submissions via stepValid (step 1).
    { key: "processing_entry_point", kind: "narrative", required: "optional" },
    { key: "processing_methods", kind: "structured", required: "optional" },
    { key: "processing_methods.collection_method", kind: "text", required: "optional" },
    { key: "processing_methods.use_method", kind: "text", required: "optional" },
    { key: "processing_methods.disclosure_method", kind: "text", required: "optional" },
    { key: "processing_methods.retention_method", kind: "text", required: "optional" },
    { key: "processing_methods.other_processing_method", kind: "text", required: "optional" },
    { key: "processing_result", kind: "narrative", required: "optional" },

    // ── RK3-A1 g2 (Intake Contract v2.0 §6) — § 7152(a)(3)(C) interaction
    // method + purpose, § 7152(a)(3)(D) approximate CA consumers (number or
    // stated range; i3_ca_consumer_band stays for screening/analytics).
    // Same data-layer-optional / form-required posture as g1.
    { key: "consumer_interaction_method", kind: "enum", required: "optional",
      options: CONSUMER_INTERACTION_METHOD_OPTS },
    { key: "consumer_interaction_purpose", kind: "narrative", required: "optional" },
    { key: "approximate_ca_consumers", kind: "text", required: "optional" },

    // ── RK3-A1 g3 (Intake Contract v2.0 §6) — § 7152(a)(3)(B) CANONICAL
    // per-category retention record. One row per activity-specific PI
    // category: a period, or the criteria that determine it when unknown.
    // i2_* fields remain the overall summary; this matrix is the record.
    // Same data-layer-optional / form-required posture as g1/g2. The form
    // drops rows without a category before emission.
    { key: "retention_by_pi_category", kind: "structured", required: "optional" },
    { key: "retention_by_pi_category[].pi_category", kind: "enum", required: "conditional",
      requiredWhen: "a retention row is present", options: PI_CATEGORIES },
    { key: "retention_by_pi_category[].retention_period", kind: "text", required: "conditional",
      requiredWhen: "a retention row is present and retention_criteria is empty" },
    { key: "retention_by_pi_category[].retention_criteria", kind: "enum", required: "conditional",
      requiredWhen: "a retention row is present and retention_period is empty", options: RETENTION_CRITERIA },

    // ── RK3-A1 g4 (Intake Contract v2.0 §6) — § 7152(a)(3)(E) CANONICAL
    // activity-disclosure record: content + method + Made/Planned status +
    // optional timing/location per material disclosure.
    // i4_disclosure_mechanisms stays as the mechanism summary. Same
    // data-layer-optional / form-required posture; the form drops rows
    // without content before emission.
    { key: "activity_disclosures", kind: "structured", required: "optional" },
    { key: "activity_disclosures[].disclosure_content", kind: "narrative", required: "conditional",
      requiredWhen: "a disclosure row is present" },
    { key: "activity_disclosures[].disclosure_method", kind: "text", required: "conditional",
      requiredWhen: "a disclosure row is present" },
    { key: "activity_disclosures[].status", kind: "enum", required: "conditional",
      requiredWhen: "a disclosure row is present", options: ["Made", "Planned"] },
    { key: "activity_disclosures[].timing_or_location", kind: "text", required: "optional" },

    // ── RK3-A1 g5 (Intake Contract v2.0 §6) — § 7152(a)(3)(F) CANONICAL
    // recipient record. Explicit-None uses the exceptions_intake
    // emptyIsAnswer pattern: the form's declared toggle emits [] as a
    // substantive negative answer (recipients_none_declared, emitted
    // alongside, distinguishes declared-none from legacy-absent; it is a
    // form-emitted companion, unregistered like `assertions`).
    // i6_vendors becomes the legacy/summary field.
    { key: "recipients", kind: "structured", required: "optional", emptyIsAnswer: true },
    { key: "recipients[].recipient_name_or_category", kind: "text", required: "conditional",
      requiredWhen: "a recipient row is present" },
    { key: "recipients[].recipient_type", kind: "enum", required: "conditional",
      requiredWhen: "a recipient row is present",
      options: ["Service provider", "Contractor", "Third party"] },
    { key: "recipients[].pi_categories_made_available", kind: "multi-enum", required: "conditional",
      requiredWhen: "a recipient row is present", options: PI_CATEGORIES },
    { key: "recipients[].disclosure_purpose", kind: "text", required: "conditional",
      requiredWhen: "a recipient row is present" },
    // RK3-D (doc 33 D-L3) — recipient contractual-protection status; feeds the
    // ratified recipient-risk table (D-L5: type × contract → managed/elevated).
    { key: "recipients[].contractual_protections", kind: "enum", required: "optional",
      options: RECIPIENT_CONTRACT_OPTS },

    // ── RK3-A1 g6 (Intake Contract v2.0 §6) — § 7151(a) operational-
    // participation record: employees whose job duties include participating
    // in the covered processing were included in the assessment process.
    // INTENTIONALLY distinct from the § 7152(a)(8) information-provider
    // list (the groups may overlap; they satisfy different requirements).
    { key: "section_7151_operational_participants", kind: "structured", required: "optional" },
    { key: "section_7151_operational_participants[].name", kind: "text", required: "conditional",
      requiredWhen: "a participation row is present" },
    { key: "section_7151_operational_participants[].role", kind: "text", required: "conditional",
      requiredWhen: "a participation row is present" },
    { key: "section_7151_operational_participants[].processing_responsibility", kind: "text", required: "conditional",
      requiredWhen: "a participation row is present" },

    // ── RK3-A2 g1 (Intake Contract v2.0 §6, doc 31 §2c) — § RAF 7155 assessment
    // timing and processing status. processing_status anchors whether the assessed
    // processing is planned, ongoing, or discontinued; the conditional date fields
    // fix the assessment window for the Spine 4.3 §I.A timeline.
    // material_change_date / material_change_description extend the existing
    // material_change_since_prior flag (ITEM 380 INTAKE-4a) to supply the date
    // and scope of any material change since the prior assessment.
    // emptyIsAnswer: timing fields are logically conditional on processing_status
    // and material_change_since_prior; without a trigger the gate cannot skip them,
    // so empty is the valid state when the controlling question yields N/A.
    { key: "processing_status", kind: "enum", required: "optional",
      options: PROCESSING_STATUS_OPTS, emptyIsAnswer: true },
    { key: "processing_start_date", kind: "date", required: "optional", emptyIsAnswer: true },
    { key: "planned_start_date", kind: "date", required: "optional", emptyIsAnswer: true },
    { key: "prior_risk_assessment_date", kind: "date", required: "optional", emptyIsAnswer: true },
    { key: "material_change_date", kind: "date", required: "optional", emptyIsAnswer: true },
    { key: "material_change_description", kind: "narrative", required: "optional", emptyIsAnswer: true },

    // ── RK3-A2 g2 (Intake Contract v2.0 §6, doc 31 §2c) — § 7152(a)(3)(G)
    // ADMT branch extensions. All five fields are conditional on the ADMT
    // trigger (q18 === "Yes" || "In evaluation") and optional at the data
    // layer. They deepen the existing i5 ADMT fields with operational-role,
    // assumption/limitation, output, output-use, and consumer-effect details
    // needed for the Spine 4.3 §II.D ADMT narrative.
    // emptyIsAnswer: empty when ADMT trigger is negative or details not yet collected.
    { key: "admt_operational_role", kind: "narrative", required: "optional", emptyIsAnswer: true },
    { key: "admt_assumptions_limitations", kind: "narrative", required: "optional", emptyIsAnswer: true },
    { key: "admt_output", kind: "narrative", required: "optional", emptyIsAnswer: true },
    { key: "admt_output_use", kind: "narrative", required: "optional", emptyIsAnswer: true },
    { key: "admt_consumer_effect", kind: "narrative", required: "optional", emptyIsAnswer: true },

    // ── RK3-A2 g3 (Intake Contract v2.0 §6, doc 31 §2c) — § 7153 branch.
    // admt_made_available_to_other_business records whether the business
    // provides its ADMT to another business. The two downstream fields
    // are conditional on that answer being "Yes" and supply the facts
    // needed for the § 7153(a)/(b) risk-assessment trigger analysis.
    // emptyIsAnswer: empty when ADMT not provided to other businesses (N/A branch).
    { key: "admt_made_available_to_other_business", kind: "enum", required: "optional",
      options: YES_NO_OPTS, emptyIsAnswer: true },
    { key: "admt_provider_trained_using_pi", kind: "enum", required: "optional",
      options: YES_NO_UNKNOWN_OPTS, emptyIsAnswer: true },
    { key: "recipient_business_uses_admt_for_significant_decision", kind: "enum", required: "optional",
      options: YES_NO_UNKNOWN_OPTS, emptyIsAnswer: true },

    // ── RK3-A2 g4 (Intake Contract v2.0 §6, doc 31 §2c) — PN-RK7 SPI
    // employment-exception facts. Conditional on sensitive PI being processed
    // on an employment-contract basis (q15 === "Yes" && q17 === "Employment
    // contract"). Captures the facts establishing that the processing is
    // strictly necessary for the employment relationship, required because
    // the former § 1798.145(m) employment exemption expired 2023-01-01.
    // emptyIsAnswer: empty when SPI employment exception does not apply.
    { key: "spi_employment_exception_facts", kind: "narrative", required: "optional", emptyIsAnswer: true },

    // ── RK3-A3 g1 (Intake Contract v2.0 §6, doc 31 §2c) — EUP internal QA:
    // per-harm-category review-status tracker. Never printed in the spine.
    // Tracks which of the five HARM_PATHWAY_OPTS categories have been
    // identified (at least one pathway), considered and found none applicable,
    // or not yet assessed. Optional at the data layer; the form can emit a
    // partial set.
    // emptyIsAnswer: internal EUP QA tool, never submitted; empty means "QA not yet run".
    { key: "harm_category_review_status", kind: "structured", required: "optional", emptyIsAnswer: true },
    { key: "harm_category_review_status[].harm_category", kind: "enum", required: "conditional",
      requiredWhen: "a review-status row is present", options: HARM_PATHWAY_OPTS },
    { key: "harm_category_review_status[].review_status", kind: "enum", required: "conditional",
      requiredWhen: "a review-status row is present", options: HARM_CATEGORY_REVIEW_STATUS_OPTS },

    // ── RK3-D (doc 33 D-L3) — Class C→B conversion operands. ALL optional at
    // the data layer (D-L2 rule 2): a record without them composes exactly
    // what RK3-C composed — the corresponding analysis stays honestly absent.
    // Multi-enums carry an explicit "None …" option as the substantive
    // negative; an empty array means unanswered, never "none".
    //
    // Section I/II operands.
    { key: "purpose_specificity_facts", kind: "multi-enum", required: "optional",
      options: PURPOSE_SPECIFICITY_FACTS_OPTS },
    { key: "out_of_scope_confirmation", kind: "enum", required: "optional",
      options: OUT_OF_SCOPE_CONFIRMATION_OPTS },
    { key: "out_of_scope_activities", kind: "narrative", required: "conditional",
      requiredWhen: "out_of_scope_confirmation names other activities",
      trigger: { key: "out_of_scope_confirmation",
        equals: ["The affected information is also processed for other activities not covered by this assessment"] },
      emptyIsAnswer: true },
    { key: "comparable_processing_status", kind: "enum", required: "optional",
      options: COMPARABLE_PROCESSING_STATUS_OPTS },
    { key: "comparable_processing_basis", kind: "narrative", required: "conditional",
      requiredWhen: "comparable_processing_status declares a comparable set",
      trigger: { key: "comparable_processing_status",
        equals: ["This assessment covers a set of similar activities presenting similar risks"] },
      emptyIsAnswer: true },
    { key: "consumer_relationship_context", kind: "enum", required: "optional",
      options: CONSUMER_RELATIONSHIP_CONTEXT_OPTS },
    { key: "source_categories", kind: "multi-enum", required: "optional",
      options: SOURCE_CATEGORY_OPTS },
    { key: "vendor_dependency", kind: "enum", required: "optional",
      options: VENDOR_DEPENDENCY_OPTS },
    { key: "essential_vendors", kind: "text", required: "conditional",
      requiredWhen: "vendor_dependency declares an essential vendor",
      trigger: { key: "vendor_dependency",
        equals: ["One or more vendors are essential — the processing could not continue without them"] },
      emptyIsAnswer: true },

    // Section IV operands (§ 7002(b)-factor typed; doc 33 D-L3).
    { key: "expectation_check", kind: "multi-enum", required: "optional",
      options: EXPECTATION_CHECK_OPTS },
    { key: "choice_architecture_check", kind: "multi-enum", required: "optional",
      options: CHOICE_ARCHITECTURE_CHECK_OPTS },

    // Section V ADMT operands — logically conditional on ADMT use, same
    // emptyIsAnswer posture as the RK3-A2 admt_* block above.
    { key: "admt_role_type", kind: "enum", required: "optional",
      options: ADMT_ROLE_TYPE_OPTS, emptyIsAnswer: true },
    { key: "admt_logic_documented", kind: "enum", required: "optional",
      options: ADMT_LOGIC_DOCUMENTED_OPTS, emptyIsAnswer: true },
    { key: "human_review_facts", kind: "multi-enum", required: "optional",
      options: HUMAN_REVIEW_FACTS_OPTS, emptyIsAnswer: true },
    { key: "admt_testing_facts", kind: "multi-enum", required: "optional",
      options: ADMT_TESTING_FACTS_OPTS, emptyIsAnswer: true },

    // Section VII operand.
    { key: "risk_interdependency_check", kind: "enum", required: "optional",
      options: RISK_INTERDEPENDENCY_OPTS },
    { key: "compounding_pathways", kind: "multi-enum", required: "conditional",
      requiredWhen: "risk_interdependency_check declares compounding pathways",
      trigger: { key: "risk_interdependency_check",
        equals: ["Two or more identified pathways could compound each other"] },
      options: HARM_PATHWAY_OPTS, emptyIsAnswer: true },

    // Section VI operands — the L3 specificity band (doc 32 L3 close-out).
    { key: "benefit_business_magnitude_basis", kind: "enum", required: "optional",
      options: BENEFIT_MAGNITUDE_BASIS_OPTS },
    { key: "benefit_consumer_magnitude_basis", kind: "enum", required: "optional",
      options: BENEFIT_MAGNITUDE_BASIS_OPTS },
    { key: "benefit_other_stakeholders_magnitude_basis", kind: "enum", required: "optional",
      options: BENEFIT_MAGNITUDE_BASIS_OPTS },
    { key: "benefit_public_magnitude_basis", kind: "enum", required: "optional",
      options: BENEFIT_MAGNITUDE_BASIS_OPTS },
  ],

};
