// ITEM SO-11 — LEGITIMATE INTERESTS ASSESSMENT SLOT MAP (step 0, verified
// before encode).
//
// Every slot and every one of the NINE conditional triggers in the byte-pinned
// governing v3 skeleton (`LIA_Legitimate_Interests_Assessment_Skeleton_v3.docx`,
// 37 paragraphs, SHA-256 53de11de…8e22a) bound to a LIVE source: a column on
// `li_assessments`, a leaf of one of its persisted intake JSON bags
// (`purpose_details`, `necessity_details`, `balancing_details`, `attestation`),
// or a leaf of one of the ~20 TYPED ANALYTIC OBJECTS on the live persisted
// report shape (`li_assessments.report_data`). A slot without a live source is
// a STOP condition.
//
// STOP HISTORY: none. Step 0 completed with every slot bound on 2026-08-10;
// the sole judgement call — whether `{subjectAnchor}` could be improvised from
// the relationship answer when the column is null — was resolved the honest
// way instead: the clause is dropped, never invented.
//
// THE SKELETON CONSUMES THE TYPED OBJECTS, IT DOES NOT FLATTEN THEM. The
// [DETERMINATION LEAD] and [GENERATED] blocks are composed from
// `lia_determination`, `interest_legitimacy`, `alternatives_considered`,
// `reasonable_expectations`, `child_factor`, `public_authority_exclusion`,
// `relationship_with_individual`, `potential_harms`, `scale_frequency_duration`,
// `opt_out_feasibility`, `benefit_and_beneficiary`, `three_part_test.*`,
// `automated_decision_analysis` and `attestation_block` — the typed surfaces
// are READ and never mutated.

export type LiaSlotSourceKind =
  | "column" // a column on li_assessments
  | "intake" // a leaf of purpose_details / necessity_details / balancing_details / attestation
  | "typed-surface" // a leaf of a typed analytic object on report_data
  | "composed"; // derived deterministically from one or more of the above

export type LiaSlotRender =
  | "verbatim"
  | "own-sentence"
  | "reader-label"
  | "reader-labels-with-other"
  | "list-as-prose"
  | "short-list"
  | "adverbial"
  | "quoted-attributed"
  // BATCH 19a housekeeping (2026-08-30): the ¶27 scale-attribution re-pin
  // (panel LIA-P2) introduced this render mode in the slot rows without
  // extending the union — a latent TS2322 the --no-check battery never
  // surfaced. Union completed; no behavior change.
  | "quoted-as-recorded"
  | "derived-phrase"
  | "clause-or-omitted"
  | "conditional-trigger";

export interface LiaSlotBinding {
  /** Slot name exactly as it appears in the skeleton, without braces. */
  readonly slot: string;
  /** Skeleton paragraph number (file order, 1-based) the slot sits in. */
  readonly paragraph: number;
  readonly kind: LiaSlotSourceKind;
  /** Column name, `bag.leaf` intake path, or `surface.leaf` report path. */
  readonly source: string;
  readonly render: LiaSlotRender;
  /** What the document does when the source is absent. Never a blank. */
  readonly absent: string;
}

export const LIA_SLOT_MAP: readonly LiaSlotBinding[] = [
  // SO-11 UK-INSTRUMENT RE-PIN (2026-08-28, CEO-approved) — the governing
  // instrument renders through slots so a UK-only record names the UK GDPR
  // in the fixed prose. Both values are always computable from the
  // jurisdictions answer, so the absent branch is defensive only.
  { slot: "instrumentCitation", paragraph: 2, kind: "composed", source: "jurisdictions → EU/UK membership", render: "derived-phrase",
    absent: "defensive only — falls to \"Article 6(1)(f) GDPR\" (the EU rail); jurisdictions is intake-gated" },
  { slot: "instrumentName", paragraph: 6, kind: "composed", source: "jurisdictions → EU/UK membership (also ¶19)", render: "derived-phrase",
    absent: "defensive only — falls to \"the GDPR\" (the EU rail); jurisdictions is intake-gated" },
  { slot: "organizationName", paragraph: 2, kind: "column", source: "organization_name", render: "verbatim",
    absent: "\"the organisation\" — the intake gates submit on it, so this is a defensive branch. Never case-folded." },
  { slot: "subjectAnchor", paragraph: 2, kind: "column", source: "subject_anchor", render: "verbatim",
    absent: "the scope clause is dropped from the subtitle; no scope is invented from the relationship answer" },
  { slot: "processingDescription", paragraph: 9, kind: "column", source: "processing_description", render: "own-sentence",
    absent: "the sentence is dropped; the record carries no description to attribute" },
  { slot: "SUBJECTS_PHRASE", paragraph: 9, kind: "composed", source: "relationship_type + balancing_details.relationship_category", render: "derived-phrase",
    absent: "the clause is dropped from the sentence, the rest of the sentence survives" },
  { slot: "dataCategories", paragraph: 9, kind: "column", source: "data_categories", render: "reader-labels-with-other",
    absent: "the clause is dropped; an \"Other\" value is folded into the prose, never rendered label-and-colon" },
  { slot: "interestStatement", paragraph: 13, kind: "intake", source: "purpose_details.interest_statement", render: "own-sentence",
    absent: "the sentence is dropped and the purpose-test lead says the interest is not stated on the record" },
  { slot: "INTEREST_TYPE_PHRASE", paragraph: 13, kind: "composed", source: "purpose_details.interest_type (+ interest_type_other)", render: "derived-phrase",
    absent: "the clause is dropped; \"Other\" renders its free-text verbatim, never the literal word \"Other\"" },
  { slot: "INTEREST_HOLDER_PHRASE", paragraph: 13, kind: "composed", source: "purpose_details.interest_holder (+ interest_holder_other)", render: "derived-phrase",
    absent: "the clause is dropped" },
  { slot: "specificBenefit", paragraph: 13, kind: "intake", source: "purpose_details.specific_benefit", render: "own-sentence",
    absent: "the sentence is dropped" },
  { slot: "beneficiary", paragraph: 13, kind: "intake", source: "purpose_details.beneficiary", render: "reader-label",
    absent: "the clause is dropped" },
  { slot: "statedPurpose", paragraph: 13, kind: "column", source: "stated_purpose", render: "quoted-attributed",
    absent: "the notice sentence is dropped entirely — no notice wording is paraphrased into existence" },
  { slot: "alternatives", paragraph: 19, kind: "column", source: "alternatives_considered (fallback necessity_details.alternatives)", render: "list-as-prose",
    absent: "the clause is dropped" },
  { slot: "alternativesRationale", paragraph: 19, kind: "intake", source: "necessity_details.alternatives_rationale", render: "own-sentence",
    absent: "the clause is dropped" },
  { slot: "whyConsentNotUsed", paragraph: 19, kind: "intake", source: "necessity_details.why_consent_not_used", render: "own-sentence",
    absent: "the consent sentence is dropped" },
  { slot: "RELATIONSHIP_PHRASE", paragraph: 24, kind: "composed", source: "balancing_details.relationship_category + relationship_type", render: "derived-phrase",
    absent: "the clause is dropped" },
  { slot: "EXPECTATION_PHRASE", paragraph: 24, kind: "composed", source: "balancing_details.reasonable_expectation → would / would not / may not", render: "derived-phrase",
    absent: "the expectation clause is dropped and the typed `reasonable_expectations` finding carries the undetermined branch" },
  { slot: "reasonableExpectationDetail", paragraph: 24, kind: "intake", source: "balancing_details.reasonable_expectation_detail", render: "own-sentence",
    absent: "the basis clause is dropped" },
  { slot: "potentialHarm", paragraph: 27, kind: "intake", source: "balancing_details.potential_harm", render: "reader-label",
    absent: "the impact sentence is dropped" },
  { slot: "potentialHarms", paragraph: 27, kind: "intake", source: "balancing_details.potential_harms", render: "short-list",
    absent: "the list clause is dropped" },
  { slot: "scaleApprox", paragraph: 27, kind: "intake", source: "balancing_details.scale_approx", render: "quoted-as-recorded",
    absent: "the scale sentence is dropped" },
  { slot: "frequency", paragraph: 27, kind: "intake", source: "balancing_details.frequency", render: "quoted-as-recorded",
    absent: "the scale sentence is dropped with it" },
  { slot: "duration", paragraph: 27, kind: "intake", source: "balancing_details.duration", render: "quoted-as-recorded",
    absent: "the scale sentence is dropped with it" },
  { slot: "safeguards", paragraph: 27, kind: "composed", source: "balancing_details.safeguards (+ safeguards_other verbatim)", render: "reader-labels-with-other",
    absent: "the safeguards sentence is dropped" },
  { slot: "ADDITIONAL_MITIGATIONS_CLAUSE", paragraph: 27, kind: "composed", source: "balancing_details.additional_mitigations", render: "clause-or-omitted",
    absent: "omitted, per the skeleton's own rule; the safeguards sentence closes at the safeguards" },
  { slot: "reviewTriggers", paragraph: 35, kind: "intake", source: "attestation.review_triggers", render: "list-as-prose",
    absent: "omitted, per the skeleton's own rule" },

  // ── Conditional-body slots ────────────────────────────────────────────
  { slot: "publicTaskProcessing", paragraph: 14, kind: "intake", source: "purpose_details.public_task_processing", render: "verbatim",
    absent: "the conditional states that the record does not say which tasks are in issue" },
  { slot: "LIST", paragraph: 26, kind: "composed", source: "balancing_details.vulnerable_subjects (+ vulnerable_subjects_other verbatim)", render: "reader-labels-with-other",
    absent: "the conditional does not fire" },
  { slot: "dpoReviewer", paragraph: 33, kind: "intake", source: "attestation.dpo_reviewer", render: "verbatim",
    absent: "the reviewer is not named; the sentence states review occurred without inventing a name" },
  { slot: "dpoReviewDate", paragraph: 33, kind: "intake", source: "attestation.dpo_review_date", render: "verbatim",
    absent: "the date clause is dropped" },
  { slot: "approverName", paragraph: 34, kind: "intake", source: "attestation.approver_name", render: "verbatim",
    absent: "the conditional does not fire" },
  { slot: "approverPosition", paragraph: 34, kind: "intake", source: "attestation.approver_position", render: "verbatim",
    absent: "the position clause is dropped, the approval sentence survives" },
  { slot: "approvalDate", paragraph: 34, kind: "intake", source: "attestation.approval_date", render: "verbatim",
    absent: "the date clause is dropped, the approval sentence survives" },
] as const;

export interface LiaConditionalTrigger {
  readonly id: string;
  /** Skeleton paragraph number (file order, 1-based). */
  readonly paragraph: number;
  readonly section: string;
  /** The live source the trigger reads. */
  readonly source: string;
  /** What makes it fire. */
  readonly fires_when: string;
  /**
   * SILENT — the section says nothing at all when the trigger does not fire.
   * HONEST-NEGATIVE — the negative is stated, because weight attaches either way.
   */
  readonly negative: "silent" | "honest-negative";
  readonly negative_text: string;
}

/** All NINE conditional triggers, counted against the spine. */
export const LIA_CONDITIONAL_TRIGGERS: readonly LiaConditionalTrigger[] = [
  {
    id: "stage_a",
    paragraph: 10,
    section: "the_processing",
    source: "data_categories / balancing_details.*_other free-text values",
    fires_when: "a Stage-A answer carries an \"Other\" value with free text",
    negative: "silent",
    negative_text: "",
  },
  {
    id: "public_authority",
    paragraph: 14,
    section: "purpose_test",
    source: "purpose_details.controller_is_public_authority",
    fires_when: "the answer is yes",
    negative: "silent",
    negative_text: "",
  },
  {
    id: "marketing",
    paragraph: 15,
    section: "purpose_test",
    source: "purpose_details.statutory_restrictions",
    fires_when: "a statutory-restrictions position is collected",
    negative: "silent",
    negative_text: "",
  },
  {
    id: "analytics",
    paragraph: 20,
    section: "necessity_test",
    source: "necessity_details.pseudonymisation_options",
    fires_when: "a pseudonymisation position is collected",
    negative: "silent",
    negative_text: "",
  },
  {
    id: "children",
    paragraph: 25,
    section: "balancing_test",
    source: "balancing_details.children_data_subjects (cross-read with the typed `child_factor` determination)",
    fires_when: "the answer is yes, or `child_factor.determination` is children_in_scope",
    negative: "silent",
    negative_text: "",
  },
  {
    id: "vulnerable_groups",
    paragraph: 26,
    section: "balancing_test",
    source: "balancing_details.vulnerable_subjects",
    fires_when: "the list is non-empty",
    negative: "silent",
    negative_text: "",
  },
  {
    id: "employee_monitoring",
    paragraph: 28,
    section: "balancing_test",
    source: "balancing_details.employment_safeguards",
    fires_when: "employment safeguards are collected",
    negative: "silent",
    negative_text: "",
  },
  {
    id: "dpo_review",
    paragraph: 33,
    section: "findings",
    source: "attestation.dpo_reviewed / dpo_reviewer / dpo_review_date",
    fires_when: "review by the data protection officer is recorded",
    negative: "honest-negative",
    negative_text: "Review by the data protection officer has not yet occurred.",
  },
  {
    id: "approval",
    paragraph: 34,
    section: "findings",
    source: "attestation.approver_name / approver_position / approval_date",
    fires_when: "an approver is named",
    negative: "silent",
    negative_text: "",
  },
] as const;

/**
 * Curated enum → reader label maps. ONLY curated enum values pass through the
 * label maps; free text and proper nouns never do (SO-3 defect class 1).
 */
export const LIA_RELATIONSHIP_LABELS: Readonly<Record<string, string>> = Object.freeze({
  "Existing customer": "existing customers of the company",
  "Prospective customer": "prospective customers",
  "Employee": "the company's employees",
  "Former employee": "former employees of the company",
  "Website visitor (no account)": "visitors to the company's website who hold no account",
  "B2B contact": "business contacts",
  "Member of the public": "members of the public",
  // DOC 161 (2026-09-03) — the balancing form's own category label.
  "Member of the public — no relationship": "members of the public with no prior relationship with the company",
  "Customer": "customers of the company",
  "Employee/worker": "the company's employees and workers",
  "Prospect": "prospective customers",
  "Website visitor": "visitors to the company's website",
  "Other": "",
});

export const LIA_DATA_CATEGORY_LABELS: Readonly<Record<string, string>> = Object.freeze({
  "Contact data": "contact data",
  "Purchase/transaction history": "purchase and transaction history",
  "Browsing/behavioural data": "browsing and behavioural data",
  "Location data": "location data",
  "Employment data": "employment data",
  "Financial data": "financial data",
  "Health or medical data": "health or medical data",
  "Biometric data": "biometric data",
  "Special category data": "special categories of data",
  "Communications data": "communications data",
  "Device/technical data": "device and technical data",
});

export const LIA_HARM_SEVERITY_LABELS: Readonly<Record<string, string>> = Object.freeze({
  "Minimal": "minimal",
  "Minor": "minor",
  "Moderate": "moderate",
  "Significant": "significant",
  "Severe": "severe",
  // DOC 161 (2026-09-03, audit A.2) — the intake form's own option strings
  // and the contract's legacy short values; the head word is the label.
  "None / negligible": "negligible",
  "Negligible — annoyance only": "negligible",
  "Limited — minor inconvenience or unwanted contact": "limited",
  "Significant — discrimination, financial loss, reputational damage": "significant",
  "Severe — physical safety, identity theft, loss of livelihood": "severe",
});

export const LIA_INTEREST_TYPE_LABELS: Readonly<Record<string, string>> = Object.freeze({
  "Commercial": "a commercial interest",
  "Commercial interest": "a commercial interest",
  "Security": "a security interest",
  "Fraud prevention": "a fraud-prevention interest",
  "Network and information security": "a network and information security interest",
  "Direct marketing": "a direct-marketing interest",
  "Employee monitoring": "an employee-monitoring interest",
  "Product improvement": "a product-improvement interest",
  "Legal or regulatory": "a legal or regulatory interest",
  "Societal": "a societal interest",
  "Individual interest": "an interest of the individuals themselves",
  // DOC 161 (2026-09-03, audit A.2) — the intake form's seven interest types.
  "Commercial / revenue-related": "a commercial or revenue-related interest",
  "Operational / service delivery": "an operational or service-delivery interest",
  "Security / fraud prevention": "a security or fraud-prevention interest",
  "Legal / regulatory compliance": "a legal or regulatory-compliance interest",
  "Public interest / societal benefit": "a public-interest or societal-benefit interest",
  "Research / product improvement": "a research or product-improvement interest",
  "Political / electoral campaigning": "a political or electoral-campaigning interest",
});

/** DOC 161 — the beneficiary select's five options, as prose after "identified … as". */
export const LIA_BENEFICIARY_LABELS: Readonly<Record<string, string>> = Object.freeze({
  "Our business": "its own business",
  "The individuals whose data is processed": "the individuals whose data is processed",
  "A third party": "a third party",
  "Our business and the individuals": "its own business and the individuals whose data is processed",
  "Our business and a third party": "its own business and a third party",
});

/** DOC 161 — the interest-holder select's options, as the ¶13 "pursued …" phrase. */
export const LIA_INTEREST_HOLDER_PHRASES: Readonly<Record<string, string>> = Object.freeze({
  "Our organisation only": "on the company's own behalf",
  "Our organisation and a third party (e.g. business partner)": "on the company's own behalf and on behalf of a third party",
  "A third party we share data with": "on behalf of a third party with which the company shares data",
  "The data subject themselves": "on behalf of the individuals whose data is processed",
  "The wider public": "in the interest of the wider public",
});

export const LIA_EXPECTATION_PHRASES: Readonly<Record<string, string>> = Object.freeze({
  "Yes": "would",
  "No": "would not",
  "Unsure": "may not",
  "Partly": "may not",
  // DOC 161 (2026-09-03, audit A.2) — the intake form's five options; the
  // map alone dropped the whole ¶24 sentence on every real record.
  "Yes — directly contemplated by our existing relationship": "would",
  "Probably — disclosed in privacy notice and consistent with the relationship": "would probably",
  "Maybe — they may not have anticipated this specific use": "may not",
  "Unlikely — this would surprise most data subjects": "would probably not",
  "No — we have no relationship with these individuals; they would not expect this": "would not",
});

/** Every intake key the slot map consumes — the completeness test reads this. */
export const LIA_SLOT_SOURCE_KEYS: readonly string[] = Object.freeze(
  [...new Set(LIA_SLOT_MAP.map((b) => b.source))],
);
