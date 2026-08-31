// ITEM SO-3 — SPECIFIED OUTPUT ENCODE: Privacy Governance Assessment.
//
// RENDER LAW. The CEO-ratified v3 counsel-register skeleton
// `Governance_Assessment_Skeleton_v3.docx` (current set: the 2026-08-10
// resupply) is this product's render law. Every string in
// GOVERNANCE_SKELETON_SECTIONS below is transcribed BYTE-FOR-BYTE from that
// file. Nothing here may be reworded, re-punctuated or "improved" by code, by
// refinement, or by an agent: the skeleton's fixed prose is a protected leaf
// (splice-barred) and the conformance check byte-matches the assembled
// document against it outside the slots.
//
// Block kinds:
//   "skeleton"    — FIXED PROSE. Byte-pinned. Slots inside {braces} are the
//                   only mutable spans; the rest is law.
//   "lead"        — [DETERMINATION LEAD]: exactly one generated sentence,
//                   bound to its typed determination. The executive-summary
//                   lead binds to `readiness_determination.rating` — the
//                   403-A one-voice law — and a lead may NOT disagree with the
//                   determination it leads.
//   "generated"   — [GENERATED]: counsel-voice prose under the ATTRIBUTION
//                   RULE; every factual clause names its source.
//   "rule"        — a deterministic assembly rule, not printed prose.
//
// The v3 governance skeleton carries NO standalone [CONDITIONAL] paragraph:
// every conditional (SPECIAL_CATEGORY_CLAUSE, TRAINING_AI_CLAUSE,
// OTHER_TOOL_CLAUSE, TRANSFER_MECHANISM_CLAUSE) lives INSIDE fixed prose as a
// conditional slot with its own fixed first words and its own absent branch —
// omitted entirely where the trigger fails, never padded, never announced.
//
// THE 403-A FIXED RULE. The skeleton's second Governance-Infrastructure
// paragraph ("The analysis that follows assesses the Article 37-39 duties on
// what the intake asks…") is marked `[FIXED RULE - the 403-A principle]` in
// the source file. The bracketed marker is authoring notation; the SENTENCE is
// skeleton law and prints to the customer, which is why it is encoded as its
// own byte-pinned fixed-prose block.
//
// Provenance of the approval act: the `prose_document_plans` row for product
// `governance` (7f168ddb-d419-4f06-8cdc-1cf1fa03be7f), superseded at SO-3 with
// "panel-delegated approval per CEO delegation 2026-08-06".

export const GOVERNANCE_SKELETON_VERSION = "prose-plans-2026-08-30-c5-arabic";
export const GOVERNANCE_SKELETON_SOURCE_FILE = "Governance_Assessment_Skeleton_v3.docx";
export const GOVERNANCE_SKELETON_PROVENANCE =
  "Governance_Assessment_Skeleton_v3.docx — panel-delegated approval per CEO delegation 2026-08-06";
/**
 * SHA-256 over the skeleton's paragraph text, newline-joined, in file order —
 * computed DIRECTLY from Governance_Assessment_Skeleton_v3.docx (all 26 `w:p`
 * paragraphs, `w:t` runs concatenated, joined with "\n"). This is the same
 * method that produced the cppa-risk and cppa-admt hashes.
 *
 * SO-3 r2 CORRECTION: the previous value (91050ecf…) was computed over the
 * encoded block representation in this file rather than over the docx, so it
 * carried the encoding's own block boundaries and heading handling. The text
 * content was and is correct word-for-word; only the hash input was wrong.
 */
export const GOVERNANCE_SKELETON_CONTENT_HASH =
  "e0717aba9ee74a0bef16c22feafd6a5abe39531d59d4db3b5c69fd29b574c92f";

// A-TEAM S3 RULING I.24 (doc 115, 2026-08-31) — fleet Title Case cover.
export const GOVERNANCE_SKELETON_TITLE = "Privacy Governance Assessment";
export const GOVERNANCE_SKELETON_SUBTITLE =
  "A programme review under the GDPR and UK GDPR, prepared for {organizationName}";
/** The v3 register guide, verbatim. Authoring law; never printed to a customer. */
export const GOVERNANCE_REGISTER_GUIDE = "Register guide (v3 - CEO-ratified counsel register, senior privacy lawyers with the professors editing) - Fixed prose is a lawyer's client document: full flowing sentences, measured connectives, the law stated plainly and applied. The company's facts are always attributed (\"{org} has indicated that ...\", \"the company has described ...\") - \"the record shows\" and its family are banned. No dramatization, no rhetorical questions, no self-narration. Facts enter only through {slots} and [GENERATED] blocks under the ATTRIBUTION RULE: every factual clause names its source and traces to an intake answer or typed analysis; coverage, CSC and refinement police this mechanically. Statutory sentences in fixed prose are registry-verified at encode time. Slot notation: {field - rule}.";

// BATCH 19a (Wave C3, doc 113 S3.2) — "table" joins the union (biometric
// Batch-18a precedent). Table blocks carry no fixed text; the docx-derived
// content hash above is unaffected.
export type GovernanceSkeletonBlockKind =
  | "skeleton"
  | "lead"
  | "generated"
  | "rule"
  | "table";

export interface GovernanceSkeletonBlock {
  readonly kind: GovernanceSkeletonBlockKind;
  readonly text: string;
}

export interface GovernanceSkeletonSection {
  readonly id: string;
  readonly title: string;
  readonly blocks: readonly GovernanceSkeletonBlock[];
}

// RESTORED (S-G3 landing, 2026-08-27): the 2026-08-19 "Work in progress"
// rewrite (commit fe6f68321) dropped this export while index.ts and
// governance-prose-gold.ts still import it — the same confirmed defect
// class the Biometric groundwork audit fixed on 2026-08-26 (there a hard
// outage; here fail-open silent degradation because governance's imports
// are dynamic). Value restored VERBATIM from the pre-deletion file
// (git show fe6f68321~1), not invented.
export const GOVERNANCE_PIPELINE_STAMP = "governance-pipeline@item-so3-2026-08-10";

export const GOVERNANCE_SKELETON_SECTIONS: readonly GovernanceSkeletonSection[] = [
  {
    id: "executive_summary",
    title: "Executive Summary",
    blocks: [
      { kind: "lead", text: "[DETERMINATION LEAD] One sentence: the typed readiness determination - accountability evidenced, partly evidenced, or not yet determinable on the company's answers - the single verdict every other surface derives from." },
      { kind: "skeleton", text: "Article 5(2) of the GDPR makes a controller responsible not only for complying with the data protection principles but for being able to demonstrate that compliance. The provisions examined below - Articles 24, 28, 30 and 37 through 39 - supply the machinery of that demonstration. {organizationName} has provided the account of its programme on which this review rests, and each duty is considered against that account in turn." },
      { kind: "generated", text: "[GENERATED] The posture summary, bound to the typed rating: the rating-derived phrasing rules apply, and no affirmative characterisation may stand beside a non-affirmative rating." },
      // BATCH 19a (Wave C3, doc 113 S3.2) — the programme scoreboard, each
      // row read from a typed surface's own counts. No fixed text.
      { kind: "table", text: "art30_element_findings+demonstrability_findings+domain_element_findings+remediation_plan (scoreboard)" },
    ],
  },
  {
    id: "organisation_and_data",
    title: "1. The Organisation and Its Data",
    blocks: [
      { kind: "skeleton", text: "{organizationName} has described itself as operating in {sector - reader label}, at a size of {orgSize - band rendered as prose}, across {jurisdictions - as prose}. {EU_UK_SENTENCE - from euUkData, attributed}. The categories of data the company reports holding are {dataCategories - reader labels}{SPECIAL_CATEGORY_CLAUSE - conditional on specialCategory: \", including the special categories \" + specialCategoriesList + \", which engage Article 9\"; absent => omitted}." },
    ],
  },
  {
    id: "governance_infrastructure",
    title: "2. Governance Infrastructure",
    blocks: [
      { kind: "lead", text: "[DETERMINATION LEAD] One sentence stating whether the accountability structure - designation, notice, records - is evidenced on the company's answers." },
      { kind: "skeleton", text: "As to the designation of a data protection officer, the company has answered {DPO_PHRASE - reader label from dpoStatus, rendered as prose}. Its privacy notice position is {PRIVACY_POLICY_PHRASE - reader label}, with coverage the company describes as {privacyNoticeCoverage - reader labels as prose}." },
      // [FIXED RULE - the 403-A principle] — the marker is authoring notation;
      // the sentence itself is byte-pinned skeleton law and prints.
      { kind: "skeleton", text: "The analysis that follows assesses the Article 37-39 duties on the information requested for this assessment; operating detail this assessment does not request is recorded as what would strengthen the record, never as a deficiency." },
      { kind: "generated", text: "[GENERATED] The typed DPO determination rendered in counsel's voice: the designation trigger, position and independence, and task coverage, each attributed to the company's answers." },
      // S-G2 (doc 80, 2026-08-27) — PN-G8 executed: the three computed,
      // fully deterministic Item-313 surfaces (Art. 30(1)(a)-(g) element
      // walk, the Art. 30(5) exemption determination, and the
      // demonstrability artifact record) were persisted on every run but
      // never composed into the customer document. Render-only; no new
      // judgment. Ratification-ledger entry under the CEO improvement grant.
      { kind: "generated", text: "[GENERATED] Records and demonstrability: the Article 30 element walk, the Article 30(5) exemption position, and the evidencing-artifact record, each read from the typed findings and attributed to the company's answers." },
    ],
  },
  {
    id: "training_tools_controls",
    title: "3. Training, Tools and Controls",
    blocks: [
      { kind: "lead", text: "[DETERMINATION LEAD] One sentence stating the operational-control posture." },
      { kind: "skeleton", text: "The company reports its training position as {TRAINING_PHRASE - reader label}{TRAINING_AI_CLAUSE - \", with coverage of AI tools recorded as \" + trainingAiCoverage; absent => omitted}. The tools it reports in use are {tools - reader labels}{OTHER_TOOL_CLAUSE - Other verbatim; absent => omitted}, and its policy position on their use is {TOOL_INSTRUCTION_PHRASE - reader label}. {TECHNICAL_CONTROLS_SENTENCE - from the technical-controls answers, attributed; absent => the honest sentence naming the absence}." },
      { kind: "generated", text: "[GENERATED] Per-domain findings from the typed domain records, in the single-writer register; repairs preserve machine-keyed siblings untouched." },
    ],
  },
  {
    id: "processors_and_transfers",
    title: "4. Processors and International Transfers",
    blocks: [
      { kind: "lead", text: "[DETERMINATION LEAD] One sentence stating the Article 28 and Chapter V posture together." },
      { kind: "skeleton", text: "As to processor contracts, the company has answered {DPA_STATUS_PHRASE - reader label}; as to verification of the Article 28(3) terms, {DPA_VERIFIED_PHRASE - reader label}. On transfers, the company reports {TRANSFER_PHRASE - reader label}{TRANSFER_MECHANISM_CLAUSE - \", relying on \" + transferMechanism reader label; absent where transfers occur => the honest gap sentence}." },
      { kind: "generated", text: "[GENERATED] The vendor-terms and transfer analyses from the typed findings, attributed." },
    ],
  },
  {
    id: "the_determination",
    title: "5. The Determination",
    blocks: [
      { kind: "lead", text: "[DETERMINATION LEAD] One sentence restating the readiness determination as the operative finding." },
      { kind: "generated", text: "[GENERATED] Findings and the remediation plan in counsel's voice, each remediation tied to the duty it closes; {additionalContext} incorporated only where substantive." },
      // BATCH 20a (Wave C4, doc 113 S5.1) — the Remediation Register: the
      // numbered items as a table; meta columns under the constant-column
      // rule with the intake defaults stated once in the note.
      { kind: "table", text: "remediation_plan (remediation register)" },
    ],
  },
  // S-G1 (doc 80, 2026-08-27) — PN-G9 resolved as recommended: the
  // product's 10-domain taxonomy stays (a deliberate positioning), and a
  // deterministic crosswalk appendix maps the assessment's own computed
  // verdicts onto the ICO Accountability Framework's ten categories — the
  // regulator's own structure — with honest "not separately assessed" cells
  // where the mapping is partial. Every cell is a verdict READ, never a
  // re-judgment. Ratification-ledger entry under the CEO improvement grant.
  {
    id: "ico_crosswalk",
    title: "Appendix: ICO Accountability Framework Crosswalk",
    blocks: [
      { kind: "rule", text: "The UK Information Commissioner's Accountability Framework organises accountability into ten categories. This appendix maps the determinations of this assessment onto those categories, so the reader can see the record in the regulator's own structure; each entry restates a determination made above and decides nothing new." },
      // BATCH 20a (Wave C4, doc 113 S5.2) — the ten entries as the
      // crosswalk table; the closing sentence detaches into its own
      // generated paragraph below instead of gluing onto the last line.
      { kind: "table", text: "ico_accountability_crosswalk" },
      { kind: "generated", text: "[GENERATED] The detached closing sentence: the headline Article 5(2)/24(1) determination restated, with the Chapter V pointer where a transfer analysis is carried." },
    ],
  },
  {
    id: "table_of_authorities",
    title: "Authorities Cited",
    blocks: [
      { kind: "rule", text: "Assembled deterministically from the document's citation ledger: an authority appears here if and only if it is cited above, with pinpoints consolidated and section back-references. Grouped in brief order - Regulations; Statutes; Guidance and Persuasive Authority (labelled persuasive, never binding). Source links deferred." },
    ],
  },
];

/** Every byte-pinned fixed-prose string, in document order. Splice-barred. */
export const GOVERNANCE_PROTECTED_FIXED_PROSE: readonly string[] = GOVERNANCE_SKELETON_SECTIONS
  .flatMap((s) => s.blocks)
  .filter((b) => b.kind === "skeleton")
  .map((b) => b.text);

/**
 * v3 REGISTER BANS — the attribution voice is law: the company's facts are
 * attributed to the company, never to "the record".
 */
export const GOVERNANCE_V3_BANNED_REGISTER: readonly string[] = [
  "the record shows",
  "the record reflects",
  "the record indicates",
  "the record demonstrates",
  "the record establishes",
  "on this record",
  "as the record makes clear",
];

/**
 * The conditional slots the v3 governance skeleton carries INSIDE its fixed
 * prose: each with its trigger (a live contract key), its fixed first words,
 * and its absent branch.
 */
export interface GovernanceInlineConditional {
  readonly slot: string;
  readonly trigger: string;
  readonly fixed_first_words: string;
  readonly absent: string;
}

export const GOVERNANCE_INLINE_CONDITIONALS: readonly GovernanceInlineConditional[] = [
  {
    slot: "SPECIAL_CATEGORY_CLAUSE",
    trigger: "special_category",
    fixed_first_words: ", including the special categories ",
    absent: "omitted",
  },
  {
    slot: "TRAINING_AI_CLAUSE",
    trigger: "training_ai_coverage",
    fixed_first_words: ", with coverage of AI tools recorded as ",
    absent: "omitted",
  },
  {
    slot: "OTHER_TOOL_CLAUSE",
    trigger: "tools",
    fixed_first_words: ", together with ",
    absent: "omitted",
  },
  {
    slot: "TRANSFER_MECHANISM_CLAUSE",
    trigger: "transfer_mechanism",
    fixed_first_words: ", relying on ",
    absent: "where transfers occur, the honest gap sentence naming the unrecorded Chapter V mechanism; otherwise omitted",
  },
];

/**
 * The lawyer-flagged verification set: every statutory pinpoint that appears in
 * the skeleton's FIXED prose (including its conditional slots' fixed words),
 * with the corpus row that must support it.
 */
export interface GovernanceSkeletonPinpoint {
  readonly pinpoint: string;
  readonly corpus_key: string;
  /** A substring that must appear in the corpus row's verbatim excerpt. */
  readonly supports: string;
}

export const GOVERNANCE_SKELETON_PINPOINTS: readonly GovernanceSkeletonPinpoint[] = [
  { pinpoint: "Article 5(2)", corpus_key: "gdpr-art-5-2",
    supports: "be able to demonstrate compliance" },
  { pinpoint: "Article 9", corpus_key: "gdpr-art-9",
    supports: "racial or ethnic origin" },
  { pinpoint: "Article 24", corpus_key: "gdpr-art-24",
    supports: "appropriate technical and organisational measures" },
  { pinpoint: "Article 28", corpus_key: "gdpr-art-28",
    supports: "processing is to be carried out on behalf of a controller" },
  { pinpoint: "Article 28(3)", corpus_key: "gdpr-art-28",
    supports: "processing is to be carried out on behalf of a controller" },
  { pinpoint: "Article 30", corpus_key: "gdpr-art-30",
    supports: "record of processing activities" },
  { pinpoint: "Article 37", corpus_key: "gdpr-art-37",
    supports: "shall designate a data protection officer" },
  { pinpoint: "Article 38", corpus_key: "gdpr-art-38",
    supports: "data protection officer is involved" },
  { pinpoint: "Article 39", corpus_key: "gdpr-art-39",
    supports: "shall have at least the following tasks" },
];

/**
 * TABLE OF AUTHORITIES — deterministic assembly rule, verbatim from the
 * skeleton. An authority appears iff it is cited in the assembled document.
 */
export const GOVERNANCE_TOA_RULE = "Assembled deterministically from the document's citation ledger: an authority appears here if and only if it is cited above, with pinpoints consolidated and section back-references. Grouped in brief order - Regulations; Statutes; Guidance and Persuasive Authority (labelled persuasive, never binding). Source links deferred.";
export const GOVERNANCE_TOA_GROUPS: readonly string[] = [
  "Regulations",
  "Statutes",
  "Guidance and Persuasive Authority",
];

/**
 * COVERAGE LINKS (SO-3 step 4): the skeleton's section ids are the coverage
 * anchors for this product; the typed surface each section must account for is
 * named here so coverage points at the skeleton rather than the legacy plan.
 */
export const GOVERNANCE_COVERAGE_LINKS: readonly { section_id: string; surface: string }[] = [
  { section_id: "executive_summary", surface: "readiness_determination" },
  { section_id: "organisation_and_data", surface: "organisation_profile" },
  { section_id: "governance_infrastructure", surface: "dpo_determination" },
  { section_id: "training_tools_controls", surface: "domain_findings" },
  { section_id: "processors_and_transfers", surface: "transfer_analysis" },
  { section_id: "the_determination", surface: "remediation_plan" },
];
