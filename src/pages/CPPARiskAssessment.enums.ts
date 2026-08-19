// CPPA Risk Assessment — enum option sets extracted into a standalone module
// so both the intake page and the refine surface's structured editor can
// import them without introducing an import cycle. Do not re-declare these
// literals anywhere; content-anchor every reference back to this file.
//
// RC-FLIP-3 — expanded to include the T-class banded intake option sets
// previously living in CPPARiskAssessment.tsx (REVENUE_OPTS, CONSUMER_OPTS,
// SPI_VOLUME_OPTS, SHARE_REVENUE_50PCT_OPTS, Q5_SELL_SHARE_OPTS,
// Q15_SENSITIVE_PI_OPTS) so shared components never import the page module.
// The page re-exports these names, so page consumers are unchanged.

// § 7152 impact-assessment scales.
export const IMPACT_LIKELIHOOD_OPTS = ["Unlikely", "Possible", "Likely", "Highly likely"];
export const IMPACT_SEVERITY_OPTS = ["Minimal", "Moderate", "Significant", "Severe"];
export const IMPACT_BENEFITS_OUTWEIGH_OPTS = ["Yes", "No", "Uncertain"];
export const IMPACT_CYBER_GAPS_OPTS = ["Yes", "No"];

// Aligned to the § 7152(a)(5) enumerated negative-impact examples.
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
];

// Revenue bands. R1a split the $25M–$100M band into $25M–$50M and $50M–$100M
// so § 7120(b)(1)(C) (50% revenue prong) analysis can be band-aligned. Legacy
// value "$25M–$100M" is intentionally NOT in this list; stored rows keep it
// and the generator treats it as straddling the $50M line (indeterminate
// per BAND-VS-THRESHOLD). Restore of a legacy draft renders q1 unselected.
// BAND-REALIGNMENT-T2A (2026-07-26) — REVENUE_OPTS retargeted to V2 label
// set (statutorily aligned edges per src/lib/bands/revenueConsumer.ts +
// supabase/functions/_shared/bands/revenue-consumer.ts). Legacy V1 labels
// (kept in stored intakes) resolve via resolveRevenueBand in the edge-side
// normaliser; the classifier retains V1 switch cases for back-compat.
export const REVENUE_OPTS = ["Under $25M", "$25M to under $50M", "$50M to $100M", "Over $100M"];
// Consumer-volume bands aligned to statutory breakpoints:
//   100,000 — § 1798.140(d)(1)(B) covered-business threshold
//   250,000 — § 7120(b)(2)(A) cyber-audit volume prong
// Legacy value "100,000–1 million" (which straddles 250,000) is intentionally
// NOT in this list — the risk generator still ACCEPTS it in stored intakes
// and resolves it as indeterminate per the BAND-VS-THRESHOLD rule / T-1
// deterministic check. Restore of a legacy draft clears q2 so the user
// re-answers with a clean band (see applyRestore).
// BAND-REALIGNMENT-T2A (2026-07-26) — CONSUMER_OPTS retargeted to V2.
// Aligned to statutory breakpoints (100,000 and 250,000). Legacy V1 labels
// resolve via resolveConsumerBand in the edge-side normaliser.
export const CONSUMER_OPTS = ["Under 100,000", "100,000 to under 250,000", "250,000 to under 1,000,000", "1,000,000 or more"];
// T-C1 (2026-07-28) — § 1798.140(d)(1)(B) OPERAND bands. Legal meaning:
// the approximate number of California consumers or households whose
// personal information the business BUYS, SELLS, or SHARES annually.
// Distinct name from CONSUMER_OPTS (which is "consumers processed") so the
// two fields cannot be conflated by refactor. The 100,000 edge is the
// hard § 1798.140(d)(1)(B) statutory line — no band may straddle it.
// The remaining edges mirror CONSUMER_OPTS V2 (§ 7120(b)(2)(A) 250,000
// prong; 1,000,000) so the same band vocabulary is familiar to the user.
export const BOUGHT_SOLD_SHARED_OPTS = [
  "Under 100,000",
  "100,000 to under 250,000",
  "250,000 to under 1,000,000",
  "1,000,000 or more",
];
// R1a additions.
export const SPI_VOLUME_OPTS = ["Fewer than 50,000", "50,000 or more", "Unsure"];
export const SHARE_REVENUE_50PCT_OPTS = ["Yes", "No", "Unsure"];
// Q5 options (exported for fixture drift guard).
export const Q5_SELL_SHARE_OPTS = ["Yes — sell only", "Yes — share for advertising only", "Both", "No"];
// Q15 options.
export const Q15_SENSITIVE_PI_OPTS = ["Yes", "No", "Unsure"];

// TURN 1b — § 7150(b)(5) sensitive-location predicate. Discrete enum so the
// generator can deterministically resolve the (b)(5) branch without free-text
// interpretation. "Not applicable" is the safe default; any other value
// engages the (b)(5) predicate in computeIntakeSelectedSubsections().
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
];

// ── ITEM 305 — ANALYTIC-DELIVERABLE INTAKE (Chapter 1 rebuild) ─────────
// These option sets feed the five per-activity analytic deliverables
// (§ 7152(a)(2), (a)(4), (a)(5), (a)(6), (a)(7)). This file is the single
// source of truth for authoring; verbatim copies live in
// supabase/functions/_shared/ltp/analytic-deliverables/enums.ts and in
// supabase/functions/_shared/intake-contracts/cppa-risk-assessment.ts,
// with parity asserted mechanically by the pin tests.

// § 7152(a)(2) — minimum-necessary status of each candidate PI element.
export const NECESSITY_STATUS_OPTS = [
  "Necessary to the stated purpose",
  "Collected but not necessary to the stated purpose",
  "Unsure",
];

// § 7152(a)(5)(A)–(H) — the statutory negative-impact examples. The "(A)"…
// "(H)" prefixes are LOAD-BEARING: resolveHarmId() reads the tag rather
// than guessing the category from the label text. Never reorder, never
// re-letter, never drop a prefix.
// PN-RK9 (2026-08-18) — option (A) carries the § 7152(a)(5)(A) loss-of-
// availability prong, matching the harm catalogue's label. Legacy stored
// rows with the pre-revision string still resolve via the letter prefix.
export const HARM_PATHWAY_OPTS = [
  "(A) Unauthorized access, destruction, use, modification, or disclosure; loss of availability",
  "(B) Unlawful discrimination on protected characteristics",
  "(C) Impairment of consumer control over personal information",
  "(D) Coercion or compulsion, including dark patterns",
  "(E) Economic harms",
  "(F) Physical harms",
  "(G) Reputational harms",
  "(H) Psychological harms",
];

export const HARM_LIKELIHOOD_OPTS = ["Unlikely", "Possible", "Likely", "Highly likely"];
export const HARM_SEVERITY_OPTS = ["Minimal", "Moderate", "Significant", "Severe"];

// RK3-A2 g1 (Intake Contract v2.0 §6, doc 31 §2c) — § RAF 7155 processing
// status. Closed enum; verbatim copy mirrored in cppa-risk-assessment.ts
// (parity pinned in rk3-a2-timing.test.ts).
export const PROCESSING_STATUS_OPTS = ["Planned", "Ongoing", "Discontinued"] as const;
export const HARM_CATEGORY_REVIEW_STATUS_OPTS = ["Identified", "Considered-none", "Not yet assessed"] as const;

// RK3-A1 (Intake Contract v2.0 §6) — § 7152(a)(3)(C) consumer-interaction
// method. Closed enum; "Other" carries the description in the purpose field.
export const CONSUMER_INTERACTION_METHOD_OPTS = [
  "Website",
  "Mobile app",
  "In person",
  "Telephone",
  "Email",
  "No direct interaction (obtained from another source)",
  "Other",
];

// § 7152(a)(6) — implementation status of each safeguard.
export const SAFEGUARD_STATUS_OPTS = [
  "Implemented and tested",
  "Implemented, not tested",
  "Planned, not yet implemented",
  "None",
];

// § 7152(a)(4) — the four enumerated beneficiary classes, verbatim.
export const BENEFICIARY_CLASSES = [
  "the business",
  "the consumer",
  "other stakeholders",
  "the public",
];

// RK3-A3 g3 — finalization stage option sets (doc 31 §3 — NEW-F, § 7152(a)(7)).
// Parity copies from cppa-risk-assessment-finalization.ts; parity pinned in
// rk3-a3-finalization.test.ts.
export const FINAL_PROCESSING_DECISION_PLANNED_OPTS = [
  "Initiate",
  "Initiate with conditions",
  "Do not initiate",
] as const;
export const FINAL_PROCESSING_DECISION_ONGOING_OPTS = [
  "Continue",
  "Continue with conditions",
  "Discontinue",
] as const;
export const FINAL_PROCESSING_DECISION_OPTS = [
  ...FINAL_PROCESSING_DECISION_PLANNED_OPTS,
  ...FINAL_PROCESSING_DECISION_ONGOING_OPTS,
] as const;
export const REVIEWER_ROLE_OPTS = ["Reviewed", "Approved", "Both"] as const;

// ── RK3-D (doc 33 D-L3) — Class C→B conversion operands. Each set carries
// a judgment INTO typed facts (doc 33 D-L2 rule 1: the enum carries the
// judgment; the ratified table carries the law). Verbatim copies mirrored
// in cppa-risk-assessment.ts; parity pinned in rk3-d-class-c.test.ts.
// "Unsure" / "None … can be confirmed" always maps to the conservative
// table cell (D-L2 rule 3).
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
