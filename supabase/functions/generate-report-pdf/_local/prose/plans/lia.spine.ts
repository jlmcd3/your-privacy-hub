// ITEM 382 — LIA GOLD-STANDARD PROSE ENCODE.
//
// SOURCE OF TRUTH: `prose_document_plans` row 1f4b7c96-1e6c-4d63-a4e5-2a4f4c0b3d11
// (product = lia, approved = true, version `prose-plans-2026-08-10-item-so11`),
// which SUPERSEDES row c9b3d942-83b9-4aac-859d-b507c1f2ef37
// (version `prose-plans-2026-08-04-item364-d2`, now approved = false).
// That row is the CEO's approval act. It is NEVER written by code. This module
// is a FAITHFUL ENCODE of it: section ids, titles, arc stages, leads, source
// keys and themes are transcribed verbatim so the runtime renders the arc the
// panel approved. `tests/edge/item382/plan-fidelity.test.ts` asserts this encode
// against the row's JSON with the version string hard-coded, so any drift in
// either direction breaks the build.
//
// ─────────────────────────────────────────────────────────────────────────────
// REFERENCE RENDER IS FACT-EXEMPT — HARD RULE.
//
// The approved reference render (the "Meridian Insights" LIA) is an
// ARCHITECTURE AND REGISTER reference ONLY. No fact, name, figure, entity or
// scenario from it may ever reach a customer document. Every fact in a
// customer document comes from the record being assessed and from nowhere
// else. `REFERENCE_RENDER_TOKENS` below exists so the battery test in
// `tests/edge/item382/register-battery.test.ts` can prove that no LIA builder
// literal carries a token from the reference render.
// ─────────────────────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────────────────────
// ITEM SO-11 SUPERSEDE (2026-08-10). The item382/item364-d2 row
// (c9b3d942-83b9-4aac-859d-b507c1f2ef37) is SUPERSEDED by the SO-11 row below.
// The 14-section TYPED ARC is carried across UNCHANGED — coverage, refinement,
// the record-complete gate and structure-conformance all key off it and none of
// them is touched by this item. What the new row adds is the RENDER LAW: the
// CEO-ratified v3 counsel-register skeleton encoded at the foot of this file,
// which consumes those typed surfaces and replaces the enumerated section-by-
// section recitation with the three-part-test weave. Presentation changes;
// nothing substantive is dropped.
// ─────────────────────────────────────────────────────────────────────────────

export const LIA_PLAN_ROW_ID = "1f4b7c96-1e6c-4d63-a4e5-2a4f4c0b3d11";
export const LIA_PLAN_VERSION = "prose-plans-2026-08-10-item-so11";
/** The row this one supersedes, for the audit trail only. */
export const LIA_PLAN_SUPERSEDED_ROW_ID = "c9b3d942-83b9-4aac-859d-b507c1f2ef37";
export const LIA_PLAN_SUPERSEDED_VERSION = "prose-plans-2026-08-04-item364-d2";
export const LIA_PLAN_PROVENANCE =
  "LIA_Legitimate_Interests_Assessment_Skeleton_v3.docx — panel-delegated approval per CEO delegation 2026-08-06";

/** The finalize-point stamp written into `_meta.internal.lia_pipeline_stamp`. */
export const LIA_PIPELINE_STAMP = "lia-pipeline@item-so11-2026-08-10";


/** Transcribed verbatim from the approved plan row. */
export const LIA_THESIS =
  "This assessment decides whether the interest this organisation stated can carry the processing it described once the effect on the people involved is weighed against it, and that weighing is the document. Where the record leaves a side of the weighing empty the assessment says which side and what would fill it.";

export type LiaArcStage =
  | "headline"
  | "record"
  | "analysis"
  | "duty"
  | "ask"
  | "remedy"
  | "close";

export type LiaLead = "determination" | "record";

export interface LiaSectionSpec {
  readonly id: string;
  readonly title: string;
  readonly arc_stage: LiaArcStage;
  readonly lead: LiaLead;
  readonly source_key: string;
  readonly themes: readonly string[];
}

/**
 * The 14-section arc, in plan order:
 *   headline determination → the record → the analysis chain culminating in
 *   "The balance" → comparable decisions → what the record does not yet state
 *   → what to write down next → the attestation close.
 *
 * DETERMINATION-LEAD DISCIPLINE: sections with `lead: "determination"` open
 * with the finding; sections with `lead: "record"` open with the record.
 */
export const LIA_SECTION_SPECS: readonly LiaSectionSpec[] = [
  {
    id: "determination",
    title: "Determination",
    arc_stage: "headline",
    lead: "determination",
    source_key: "lia_determination",
    themes: ["outcome", "carrying_reason", "residual_uncertainty"],
  },
  {
    id: "classification",
    title: "The processing as the organisation described it",
    arc_stage: "record",
    lead: "record",
    source_key: "classification",
    themes: ["parties", "activity", "data", "subjects", "jurisdiction"],
  },
  {
    id: "interest_legitimacy",
    title: "The interest and whether it is a legitimate one",
    arc_stage: "analysis",
    lead: "determination",
    source_key: "interest_legitimacy",
    themes: ["purpose_stage", "interest_stated", "sub_test_reasoning", "cumulative_view"],
  },
  {
    id: "benefit_and_beneficiary",
    title: "What the processing achieves, and for whom",
    arc_stage: "analysis",
    lead: "determination",
    source_key: "benefit_and_beneficiary",
    themes: ["purpose_stage", "benefit", "beneficiary", "specificity"],
  },
  {
    id: "alternatives_considered",
    title: "Whether a less intrusive route was available",
    arc_stage: "analysis",
    lead: "determination",
    source_key: "alternatives_considered",
    themes: ["necessity_stage", "alternatives", "why_inadequate", "consent_route"],
  },
  {
    id: "relationship_with_individual",
    title: "The relationship between the organisation and the people affected",
    arc_stage: "analysis",
    lead: "determination",
    source_key: "relationship_with_individual",
    themes: ["balancing_stage", "relationship", "expectation", "power_imbalance"],
  },
  {
    id: "scale_frequency_duration",
    title: "How much processing, how often, and for how long",
    arc_stage: "analysis",
    lead: "determination",
    source_key: "scale_frequency_duration",
    themes: ["balancing_stage", "scale", "frequency", "duration"],
  },
  {
    id: "potential_harms",
    title: "What could go wrong for the people affected",
    arc_stage: "analysis",
    lead: "determination",
    source_key: "potential_harms",
    themes: ["balancing_stage", "harms", "severity", "bearing_on_balance"],
  },
  {
    id: "opt_out_feasibility",
    title: "Whether the people affected can stop it",
    arc_stage: "analysis",
    lead: "determination",
    source_key: "opt_out_feasibility",
    themes: ["balancing_stage", "feasibility", "mechanism", "weight_as_mitigation"],
  },
  {
    id: "balancing",
    title: "The balance",
    arc_stage: "analysis",
    lead: "determination",
    source_key: "three_part_test.balancing_test",
    themes: ["balancing_stage", "case_for", "case_against", "weighing", "outcome"],
  },
  {
    id: "comparable_decisions",
    title: "Comparable regulator decisions",
    arc_stage: "duty",
    lead: "determination",
    source_key: "enforcement_precedents",
    themes: ["framing", "analogy"],
  },
  {
    id: "information_needed",
    title: "What the record does not yet state",
    arc_stage: "ask",
    lead: "record",
    source_key: "information_needed",
    themes: ["silent_fields", "hedged_answers", "effect_on_the_weighing"],
  },
  {
    id: "documentation_recommendations",
    title: "What to write down next",
    arc_stage: "remedy",
    lead: "determination",
    source_key: "documentation_recommendations",
    themes: ["immediate", "conditions"],
  },
  {
    id: "attestation_block",
    title: "Review, approval, and when this must be looked at again",
    arc_stage: "close",
    lead: "determination",
    source_key: "attestation_block",
    themes: ["review", "approval", "triggers", "counsel_reservation"],
  },
] as const;

/** Section id → plan title. Renderers must title sections from here. */
export function liaSectionTitle(id: string, fallback = ""): string {
  return LIA_SECTION_SPECS.find((s) => s.id === id)?.title ?? fallback;
}

export function liaSectionSpec(id: string): LiaSectionSpec | undefined {
  return LIA_SECTION_SPECS.find((s) => s.id === id);
}

/** The document's centre of gravity — everything before it ascends to it. */
export const LIA_CENTRE_OF_GRAVITY = "balancing";

/**
 * REGISTER — LABELS.
 *
 * Enum verdict tokens are cross-product identifiers (risk and DPIA read the
 * same strings) and are NOT renamed here. LIA-owned renderers put them through
 * this map so the customer never reads a de-underscored identifier or the
 * banned "on the record" idiom.
 */
const LIA_VERDICT_LABELS: Record<string, string> = {
  undetermined_on_the_record: "not yet determined",
  disproportionate_on_the_record: "disproportionate",
  legitimate_interest_established: "legitimate interest established",
  legitimate_interest_not_established: "legitimate interest not established",
  legitimate_interest_unresolved: "legitimate interest unresolved",
  not_met: "not met",
  met: "met",
  partly_expected: "partly expected",
  basis_unavailable: "basis unavailable",
};

export function liaVerdictLabel(v: unknown): string {
  const raw = String(v ?? "").trim();
  if (!raw) return "";
  return LIA_VERDICT_LABELS[raw] ?? raw.replace(/_/g, " ");
}

/**
 * Tokens from the fact-exempt reference render. None of these may appear in a
 * builder literal. See the HARD RULE at the top of this file.
 */
export const REFERENCE_RENDER_TOKENS: readonly string[] = [
  "Meridian",
  "Meridian Insights",
  "conversion funnel",
  "funnel measurement",
  "funnel-measurement",
  "marketing efficiency",
  "enquiry form",
];

/**
 * Banned register idiom classes for the LIA battery test. The plan's register
 * states the same truths plainly: name the missing entry and what closes it.
 */
export const LIA_BANNED_REGISTER: readonly { readonly id: string; readonly re: RegExp }[] = [
  { id: "on_the_record", re: /\bon the (?:present )?record\b/i },
  { id: "upon_the_record", re: /\bupon the record\b/i },
  { id: "please", re: /\bplease\b/i },
  { id: "courtroom_herein", re: /\bherein\b|\baforementioned\b|\bthe undersigned\b|\bhereby\b/i },
  { id: "internal_vocabulary", re: /\bemit[- ]gate\b|\bdegraded leaf\b|\bboilerplate cap\b|\bintake key\b/i },
];

// ═════════════════════════════════════════════════════════════════════════════
// ITEM SO-11 — SPECIFIED OUTPUT ENCODE: LEGITIMATE INTERESTS ASSESSMENT.
//
// RENDER LAW. The CEO-ratified counsel-register skeleton
// `LIA_Legitimate_Interests_Assessment_Skeleton_v3.docx` is this product's
// render law. Every string below is transcribed BYTE-FOR-BYTE from that file's
// paragraph text. Nothing here may be reworded, re-punctuated or "improved" by
// code, by refinement, or by an agent: fixed prose is a protected leaf
// (splice-barred) and conformance byte-matches the assembled document against
// it outside the slots.
//
// THE SKELETON CONSUMES THE TYPED OBJECTS. Every [DETERMINATION LEAD],
// [GENERATED] and [CONDITIONAL] block is composed deterministically from the
// typed analytic surfaces the LIA pipeline already persists — no model call is
// made during assembly and no typed surface is mutated. The three-part-test
// weave (purpose → necessity → balancing) replaces the enumerated
// section-by-section recitation the legacy renderer produced; the underlying
// determinations are unchanged.
//
// FIVE DETERMINATION LEADS, not four: Executive Summary (¶5), Purpose (¶12),
// Necessity (¶18), Balancing (¶23) and Findings (¶31). All five are bound by
// the coherence law — a lead may never disagree with the typed determination
// it is bound to.
// ═════════════════════════════════════════════════════════════════════════════

export const LIA_SKELETON_VERSION = "prose-plans-2026-08-30-panel-p27-scale-attribution";
export const LIA_SKELETON_SOURCE_FILE =
  "LIA_Legitimate_Interests_Assessment_Skeleton_v3.docx";
export const LIA_SKELETON_PROVENANCE = LIA_PLAN_PROVENANCE;

/**
 * SHA-256 over the governing skeleton's paragraph text, newline-joined, in file
 * order. ORIGINAL PIN: computed DIRECTLY from the docx bytes (all 37 `w:p`
 * paragraphs, `w:t` runs concatenated, XML entities unescaped, joined with
 * "\n"); independently confirmed by the CEO against four local copies,
 * 2026-08-10 (53de11dee90a20d0944c720f453053d3f6896a5bf58b04af411069a10a28e22a).
 *
 * RE-PIN 2026-08-28 (CEO-approved in-chat, the SO-11 UK-instrument landing):
 * the subtitle and ¶6/¶19 now carry {instrumentCitation}/{instrumentName}
 * slots so a UK-only record names the UK GDPR in its fixed prose. The literal
 * segments outside the slots are byte-unchanged from the docx; the hash below
 * is recomputed over the slotted paragraph text (the SO-11 battery recomputes
 * and compares it).
 *
 * RE-PIN 2026-08-30 (expert-panel LIA-P2, CEO fix-campaign mandate): the
 * ¶27 C.-Scale sentence is rewritten to quoted attribution ("describes the
 * scale of the processing as ...") because the old "affects approximately
 * {scaleApprox} people, occurs {frequency}" frame double-wrapped recorded
 * free-text ("approximately Approximately 480 ... people") and spliced
 * non-adverbial answers into adverbial slots. Prior hash:
 * 90a64832a086def3b6c0684b8a1e7c8df2def76acfcf0a89f3b853ec8768cd18.
 */
export const LIA_SKELETON_CONTENT_HASH =
  "de3fd62a1e7c77af0bc92ebaa1e14399f31a5ed1617519254eba8f6b3e351eed";

export const LIA_SKELETON_PARAGRAPH_COUNT = 37;

export const LIA_SKELETON_TITLE = "LEGITIMATE INTERESTS ASSESSMENT";
// SO-11 RE-PIN 2026-08-28 (CEO-approved in-chat) — the governing instrument
// enters the fixed prose through {slots}, so a UK-only record renders the UK
// GDPR label in its own byte-pinned sentences instead of the EU one (the
// live batch d1d2b3b8 defect: subtitle/ToA switched at assembly, but the
// fixed prose still named the EU instrument on UK-only records). Slot values
// are computed in buildLiaSlotValues from the recorded jurisdictions:
//   instrumentCitation — "Article 6(1)(f) GDPR" (EU or mixed, the ITEM-330
//     EU rail) / "Article 6(1)(f) UK GDPR" (UK-only) / mixed subtitle form
//     "Article 6(1)(f) GDPR and Article 6(1)(f) UK GDPR".
//   instrumentName — "the GDPR" / "the UK GDPR" (mixed stays "the GDPR").
// Both pinpoints are corpus-verified (gdpr-art-6-1-f / ukgdpr-art-6-1-f).
export const LIA_SKELETON_SUBTITLE =
  "Prepared under {instrumentCitation - Article 6(1)(f) GDPR; UK-only Article 6(1)(f) UK GDPR; mixed names both} for {organizationName} - scope: {subjectAnchor - noun phrase}";

/** The v3 register guide, verbatim (¶3). Authoring law; never printed. */
export const LIA_REGISTER_GUIDE =
  "Register guide (v3 - CEO-ratified counsel register, senior privacy lawyers with the professors editing) - Fixed prose is a lawyer's client document: full flowing sentences, measured connectives, the law stated plainly and applied. The company's facts are always attributed (\"{org} has indicated that ...\", \"the company has described ...\") - \"the record shows\" and its family are banned. No dramatization, no rhetorical questions, no self-narration. Facts enter only through {slots} and [GENERATED] blocks under the ATTRIBUTION RULE: every factual clause names its source and traces to an intake answer or typed analysis; coverage, CSC and refinement police this mechanically. Statutory sentences in fixed prose are registry-verified at encode time. Slot notation: {field - rule}.";

/**
 * PINPOINT VERIFICATION (SO step 1). Every statutory pinpoint that appears in
 * FIXED PROSE or in a conditional's mandated citation, byte-checked at encode
 * time against its verified corpus row on 2026-08-10.
 *
 *   Article 6(1)(f)  ¶2, ¶6, ¶19 and the ¶14 public-authority conditional —
 *                    `provision_texts` gdpr-art-6-1-f (EU, approved) and
 *                    ukgdpr-art-6-1-f (UK, approved).
 *   Recital 38       the ¶25 CHILDREN conditional cites it by number —
 *                    `gdpr_recitals` #38 (eu). NOT Recital 47: the skeleton
 *                    names 38 and the corpus row for 38 is the children's
 *                    specific-protection recital, so the cite is correct.
 *
 * Recital 47 is approved in the corpus and is relied on by the typed
 * `reasonable_expectations` finding, but it appears in NO fixed-prose sentence
 * of this skeleton and is therefore not pinned here.
 */
export interface LiaSkeletonPinpoint {
  readonly id: string;
  readonly pinpoint: string;
  readonly corpus_table: string;
  readonly corpus_key: string;
  /** The exact span the fixed prose or conditional relies on. */
  readonly verbatim: string;
  readonly paragraphs: readonly number[];
}

export const LIA_SKELETON_PINPOINTS: readonly LiaSkeletonPinpoint[] = [
  {
    id: "art_6_1_f",
    pinpoint: "Article 6(1)(f) GDPR",
    corpus_table: "provision_texts",
    corpus_key: "gdpr-art-6-1-f",
    verbatim:
      "processing is necessary for the purposes of the legitimate interests pursued by the controller or by a third party, except where such interests are overridden by the interests or fundamental rights and freedoms of the data subject which require protection of personal data, in particular where the data subject is a child.",
    paragraphs: [2, 6, 19],
  },
  {
    id: "art_6_1_f_second_subparagraph",
    pinpoint: "Article 6(1)(f) GDPR, second subparagraph",
    corpus_table: "provision_texts",
    corpus_key: "gdpr-art-6-1-f",
    verbatim:
      "Point (f) of the first subparagraph shall not apply to processing carried out by public authorities in the performance of their tasks.",
    paragraphs: [14],
  },
  {
    id: "recital_38",
    pinpoint: "Recital 38 GDPR",
    corpus_table: "gdpr_recitals",
    corpus_key: "38",
    verbatim:
      "Children merit specific protection with regard to their personal data, as they may be less aware of the risks, consequences and safeguards concerned and their rights in relation to the processing of personal data.",
    paragraphs: [25],
  },
] as const;

/**
 * PROTECTED LEAVES (SO step 4). The fixed-prose paragraphs of the assembled
 * document, splice-barred: refinement, frame substitution and every content
 * pass must leave them byte-identical.
 */
export const LIA_PROTECTED_FIXED_PROSE: readonly string[] = [
  "skeleton_document",
];

/**
 * The banned register carried by the v3 guide, checked against the assembled
 * body, lower-cased. Additive to `LIA_BANNED_REGISTER` above, which governs the
 * typed surfaces.
 */
export const LIA_V3_BANNED_REGISTER: readonly string[] = [
  "the record shows",
  "on this record",
  "the record reflects",
  "the record demonstrates",
  "as the record makes clear",
];

export type LiaSkeletonBlockKind =
  | "skeleton"
  | "lead"
  | "generated"
  | "conditional"
  | "rule";

export interface LiaSkeletonBlock {
  readonly kind: LiaSkeletonBlockKind;
  /** Skeleton paragraph number, file order, 1-based. */
  readonly paragraph: number;
  /** Conditional id, matching `LIA_CONDITIONAL_TRIGGERS`. */
  readonly conditional?: string;
  readonly text: string;
}

export interface LiaSkeletonSection {
  readonly id: string;
  readonly title: string;
  readonly blocks: readonly LiaSkeletonBlock[];
}

export const LIA_SKELETON_SECTIONS: readonly LiaSkeletonSection[] = [
  {
    id: "executive_summary",
    title: "Executive Summary",
    blocks: [
      { kind: "lead", paragraph: 5, text: "[DETERMINATION LEAD] One sentence stating the conclusion of the three-part test as a finding about the processing - or the honest negative, or the qualified form naming its condition." },
      { kind: "skeleton", paragraph: 6, text: "Article 6(1)(f) of {instrumentName - the GDPR; UK-only the UK GDPR} permits a controller to process personal data without consent where it pursues a legitimate interest, where the processing is necessary to that interest, and where the interests and fundamental rights of the people affected do not override it. {organizationName} has completed this assessment to establish whether the processing described below satisfies those three requirements. The analysis rests on the facts the company has provided and on the cited legal authorities, and on nothing else." },
      { kind: "generated", paragraph: 7, text: "[GENERATED] Two to four sentences in counsel's voice: how the purpose, necessity and balancing tests resolved, with the decisive fact for each. ATTRIBUTION RULE applies; no restatement of the lead." },
    ],
  },
  {
    id: "the_processing",
    title: "I. The Processing",
    blocks: [
      { kind: "skeleton", paragraph: 9, text: "{organizationName} has described the proposed processing as {processingDescription - own sentence where narrative}. The company has indicated that the people affected are {SUBJECTS_PHRASE - reader phrase from the relationship answer}, and that the categories of data involved are {dataCategories - reader labels, with any Other value incorporated verbatim into the sentence}." },
      { kind: "conditional", paragraph: 10, conditional: "stage_a", text: "[CONDITIONAL] Stage-A Other values render naturally within the sentence above, never as a label-and-colon fragment. A sentence asserting an unanswered optional fact is omitted, never left with a blank." },
    ],
  },
  {
    id: "purpose_test",
    title: "II. The Purpose Test",
    blocks: [
      { kind: "lead", paragraph: 12, text: "[DETERMINATION LEAD] One sentence stating whether the identified interest qualifies as legitimate." },
      { kind: "skeleton", paragraph: 13, text: "The company has identified the interest it pursues as {interestStatement - noun phrase; a full-sentence answer takes its own sentence}. As described in its submission, this is {INTEREST_TYPE_PHRASE - reader label rendered as prose}, pursued {INTEREST_HOLDER_PHRASE - \"on the company's own behalf\" / \"on behalf of \" + third party}. The specific benefit the company expects is {specificBenefit}, and it has identified {beneficiary - as prose} as the expected beneficiary. In its privacy notice, the company states the purpose of the processing as {statedPurpose - quoted and attributed to the notice}." },
      { kind: "conditional", paragraph: 14, conditional: "public_authority", text: "[CONDITIONAL] PUBLIC AUTHORITY - trigger {controllerIsPublicAuthority}=yes: fixed first words \"Because the controller is a public authority, a further limitation applies.\" followed by the {publicTaskProcessing} analysis; the generated text must address the unavailability of Article 6(1)(f) for processing in performance of public tasks." },
      { kind: "conditional", paragraph: 15, conditional: "marketing", text: "[CONDITIONAL] MARKETING - trigger {statutoryRestrictions} collected: fixed first words \"Because the identified interest involves direct marketing, the analysis must also address the rules specific to that activity.\" followed by the recorded position." },
      { kind: "generated", paragraph: 16, text: "[GENERATED] The purpose-test analysis in counsel's voice: whether the interest is lawful, sufficiently specific, genuine and present, argued from the company's answers; the conclusion must match the lead." },
    ],
  },
  {
    id: "necessity_test",
    title: "III. The Necessity Test",
    blocks: [
      { kind: "lead", paragraph: 18, text: "[DETERMINATION LEAD] One sentence stating whether the processing is necessary rather than merely useful." },
      { kind: "skeleton", paragraph: 19, text: "Necessity under Article 6(1)(f) of {instrumentName - the GDPR; UK-only the UK GDPR} asks whether the identified interest could reasonably be achieved by less intrusive means. The company has indicated that it considered {alternatives - rendered as prose}, and its reasons for not adopting them are recorded as {alternativesRationale - attributed}. As to consent, the company has explained why it does not rely on it: {whyConsentNotUsed - own clause}. Its account of data minimisation is addressed in the analysis below." },
      { kind: "conditional", paragraph: 20, conditional: "analytics", text: "[CONDITIONAL] ANALYTICS - trigger {pseudonymisationOptions} collected: fixed first words \"For the analytical processing described, the company has recorded its consideration of pseudonymisation.\" followed by the recorded position." },
      { kind: "generated", paragraph: 21, text: "[GENERATED] The necessity analysis: less-intrusive-means discipline applied to the company's stated alternatives and minimisation answers; record facts only." },
    ],
  },
  {
    id: "balancing_test",
    title: "IV. The Balancing Test",
    blocks: [
      { kind: "lead", paragraph: 23, text: "[DETERMINATION LEAD] One sentence stating where the balance comes out and the principal reason." },
      { kind: "skeleton", paragraph: 24, text: "A. Relationship and reasonable expectations. The company has indicated that the people affected are {RELATIONSHIP_PHRASE - reader label as prose}, and that in its assessment they {EXPECTATION_PHRASE - would / would not / may not} reasonably expect this processing; the basis it offers is {reasonableExpectationDetail - attributed}." },
      { kind: "conditional", paragraph: 25, conditional: "children", text: "[CONDITIONAL] CHILDREN - trigger {childrenDataSubjects}=yes: fixed first words \"Children are among the people affected.\" followed by generated weighing that addresses that fact expressly, citing Recital 38. Negative case: the section is silent." },
      { kind: "conditional", paragraph: 26, conditional: "vulnerable_groups", text: "[CONDITIONAL] VULNERABLE GROUPS - trigger {vulnerableSubjects} non-empty: fixed first words \"The processing reaches people whose circumstances call for particular care: {LIST - reader labels, Other verbatim}.\" followed by generated weighing." },
      { kind: "skeleton", paragraph: 27, text: "B. Potential impact. The company assesses the most serious realistic impact as {potentialHarm - reader label rendered as prose}, and has identified the following categories of possible harm: {potentialHarms - introduced by this sentence, rendered as a short list}. C. Scale. The company describes the scale of the processing as \"{scaleApprox - quoted as recorded}\"; its frequency as \"{frequency - quoted as recorded}\"; and its duration as \"{duration - quoted as recorded}\". D. Safeguards. The measures the company has implemented are {safeguards - reader labels as prose}{ADDITIONAL_MITIGATIONS_CLAUSE - \"; it has additionally recorded \" + additionalMitigations; absent => omitted}." },
      { kind: "conditional", paragraph: 28, conditional: "employee_monitoring", text: "[CONDITIONAL] EMPLOYEE MONITORING - trigger {employmentSafeguards} collected: fixed first words \"Because the people affected are employees, the imbalance inherent in that relationship must be addressed.\" followed by the recorded safeguards." },
      { kind: "generated", paragraph: 29, text: "[GENERATED] The balancing analysis: two-sided and concrete, engaging the strongest consideration against the conclusion, and ending on the finding rather than a formula." },
    ],
  },
  {
    id: "findings",
    title: "V. Findings, Governance and Review",
    blocks: [
      { kind: "lead", paragraph: 31, text: "[DETERMINATION LEAD] One sentence restating the conclusion as the operative finding, with any condition attached." },
      { kind: "generated", paragraph: 32, text: "[GENERATED] Counsel's conclusion on the three-part test, followed by concrete recommendations grounded in gaps the company's answers reveal; no invented obligations." },
      { kind: "conditional", paragraph: 33, conditional: "dpo_review", text: "[CONDITIONAL] DPO REVIEW - trigger {dpoReviewed}: \"The assessment was reviewed by {dpoReviewer} on {dpoReviewDate}.\" The negative branch is stated honestly - review by the data protection officer has not yet occurred - because weight attaches either way." },
      { kind: "conditional", paragraph: 34, conditional: "approval", text: "[CONDITIONAL] APPROVAL - trigger approval fields present: \"It was approved by {approverName}, {approverPosition}, on {approvalDate}.\"" },
      { kind: "skeleton", paragraph: 35, text: "The company has identified the following circumstances as requiring early re-review of this assessment: {reviewTriggers - rendered as prose; absent => omitted}." },
    ],
  },
  {
    id: "table_of_authorities",
    title: "Table of Authorities",
    blocks: [
      { kind: "rule", paragraph: 37, text: "Assembled deterministically from the document's citation ledger: an authority appears here if and only if it is cited above, with pinpoints consolidated and section back-references. Grouped in brief order - Regulations; Statutes; Guidance and Persuasive Authority (labelled persuasive, never binding). Source links deferred." },
    ],
  },
] as const;

// ── L2 (the LIA Conversion, 2026-08-26) — the v2 section list. ──────────────
// v1 above is BYTE-UNTOUCHED (its paragraph hash and the SO-11 battery keep
// pinning it; the legacy model path renders through it unchanged). The
// deterministic path renders through v2 = v1 + the Persuasive Authority
// section (the S5 surface: the CAM's doc-63-ratified release-1 decisions,
// the precedent-class citations, and the balancing-fails warning), placed
// between Findings and the Table of Authorities. The section carries no
// fixed skeleton prose — its entire content is composed
// (lia-persuasive-authority.ts), so a record that composes nothing renders
// no empty shell (the NO-PADDING law).
export const LIA_SKELETON_VERSION_V2 = "prose-plans-2026-08-30-lia-l2-v2-p27-scale";

export const LIA_SKELETON_SECTIONS_V2: readonly LiaSkeletonSection[] = [
  ...LIA_SKELETON_SECTIONS.slice(0, LIA_SKELETON_SECTIONS.length - 1),
  {
    id: "persuasive_authority",
    title: "VI. Persuasive Authority",
    blocks: [
      { kind: "generated", paragraph: 38, text: "[GENERATED] The persuasive-authority entries: the ratified release-1 enforcement decisions, each naming the factor it bears on; the precedent-class citations where a tracked posture fired; and the adverse-outcome caution when the balancing verdict is likely_fails. Composed deterministically from the CAM and the typed surfaces; iff-cited into the Table of Authorities." },
    ],
  },
  LIA_SKELETON_SECTIONS[LIA_SKELETON_SECTIONS.length - 1],
] as const;

/**
 * The 37 paragraphs in file order, verbatim. The hash constant above is a
 * SHA-256 over these joined with "\n"; the SO-11 battery recomputes it.
 */
export const LIA_SKELETON_PARAGRAPHS: readonly string[] = [
  LIA_SKELETON_TITLE,
  LIA_SKELETON_SUBTITLE,
  LIA_REGISTER_GUIDE,
  "Executive Summary",
  LIA_SKELETON_SECTIONS[0].blocks[0].text,
  LIA_SKELETON_SECTIONS[0].blocks[1].text,
  LIA_SKELETON_SECTIONS[0].blocks[2].text,
  "I. The Processing",
  LIA_SKELETON_SECTIONS[1].blocks[0].text,
  LIA_SKELETON_SECTIONS[1].blocks[1].text,
  "II. The Purpose Test",
  LIA_SKELETON_SECTIONS[2].blocks[0].text,
  LIA_SKELETON_SECTIONS[2].blocks[1].text,
  LIA_SKELETON_SECTIONS[2].blocks[2].text,
  LIA_SKELETON_SECTIONS[2].blocks[3].text,
  LIA_SKELETON_SECTIONS[2].blocks[4].text,
  "III. The Necessity Test",
  LIA_SKELETON_SECTIONS[3].blocks[0].text,
  LIA_SKELETON_SECTIONS[3].blocks[1].text,
  LIA_SKELETON_SECTIONS[3].blocks[2].text,
  LIA_SKELETON_SECTIONS[3].blocks[3].text,
  "IV. The Balancing Test",
  LIA_SKELETON_SECTIONS[4].blocks[0].text,
  LIA_SKELETON_SECTIONS[4].blocks[1].text,
  LIA_SKELETON_SECTIONS[4].blocks[2].text,
  LIA_SKELETON_SECTIONS[4].blocks[3].text,
  LIA_SKELETON_SECTIONS[4].blocks[4].text,
  LIA_SKELETON_SECTIONS[4].blocks[5].text,
  LIA_SKELETON_SECTIONS[4].blocks[6].text,
  "V. Findings, Governance and Review",
  LIA_SKELETON_SECTIONS[5].blocks[0].text,
  LIA_SKELETON_SECTIONS[5].blocks[1].text,
  LIA_SKELETON_SECTIONS[5].blocks[2].text,
  LIA_SKELETON_SECTIONS[5].blocks[3].text,
  LIA_SKELETON_SECTIONS[5].blocks[4].text,
  "Table of Authorities",
  LIA_SKELETON_SECTIONS[6].blocks[0].text,
] as const;

