// ITEM SO-5 / PROMPT 8 — SPECIFIED OUTPUT ENCODE: Impact Assessment Builder
// (DPIA). SPINE v4 — EDPB harmonised DPIA template structure, Sections 0–6.
//
// RENDER LAW. v3 (the CEO-corrected `Impact_Assessment_Builder_DPIA_Skeleton_
// v3.docx` of 2026-08-10) is superseded from 2026-08-11 by the v4 text below,
// ratified by the CEO on that date against the proposal package
// `docs/reviews/PROMPT8-DPIA-SPINE-V4-RATIFICATION-2026-08-11.md`. Under the
// CEO directive of 2026-08-11 every sentence — carried or new — was put through
// a fresh approval pass; the approved bytes are what appears here.
//
// Nothing here may be reworded, re-punctuated or "improved" by code, by
// refinement, or by an agent: fixed prose is a protected leaf (splice-barred)
// and conformance byte-matches the assembled document against it outside the
// slots.
//
// Block kinds:
//   "skeleton"  — FIXED PROSE. Byte-pinned; {slots} are the only mutable spans.
//   "lead"      — [DETERMINATION LEAD]: exactly one generated sentence, bound
//                 to its typed determination (`determination`,
//                 `art36_consultation`, `necessity_findings`, `risk_register`).
//                 A lead may not disagree with it.
//   "generated" — [GENERATED]: counsel-voice prose under the ATTRIBUTION RULE.
//   "table"     — NO PROSE. `text` names the typed surface the assembler
//                 renders; every cell is verbatim from that surface. A table
//                 with no rows is omitted entirely (no-padding law).
//   "rule"      — deterministic assembly rule (Table of Authorities).

export const DPIA_SKELETON_VERSION = "prose-plans-2026-08-11-prompt8-v4";
export const DPIA_SKELETON_SOURCE_FILE =
  "DPIA spine v4 (EDPB harmonised DPIA template v1.0, adopted 10 March 2026), CEO-ratified 2026-08-11; supersedes Impact_Assessment_Builder_DPIA_Skeleton_v3.docx (CEO-corrected 2026-08-10)";
export const DPIA_SKELETON_PROVENANCE =
  "PROMPT 8 spine v4 — CEO ratification of 2026-08-11 on docs/reviews/PROMPT8-DPIA-SPINE-V4-RATIFICATION-2026-08-11.md; carried v3 sentences re-approved in the same pass (CEO directive 2026-08-11)";

/** The superseded v3 spine version string, kept for documents already assembled. */
export const DPIA_SKELETON_VERSION_V3 = "prose-plans-2026-08-10-item-so5";

/**
 * v3 SOURCE HASH — SHA-256 over the CORRECTED v3 skeleton's paragraph text,
 * newline-joined, in file order, computed DIRECTLY from the docx bytes (all 22
 * `w:p` paragraphs, `w:t` runs concatenated, XML entities unescaped, joined
 * with "\n"). RETAINED FOR THE AUDIT TRAIL: v4 is not a docx transcription, so
 * this value no longer pins the shipped spine.
 *
 * Uncorrected v3 (for the audit trail):
 *   097d5a6a6378a178315b23f93cc7d47a47e5ca17e4e0fae5b2b44f30233b5eb4
 */
export const DPIA_SKELETON_CONTENT_HASH_V3 =
  "cf54ee9924e728e059aeeb097c00bcbcd71a011fe67d24541a1aafcf5a467421";

/**
 * v4 SPINE HASH — SHA-256 over the ratified v4 fixed prose: every `skeleton`
 * block's `text` in DPIA_SKELETON_SECTIONS order, joined with "\n". This is the
 * byte-pin the encode-time conformance check reads. Recomputed and re-ratified
 * whenever a sentence changes; a drift is a HARD STOP, not a fix-up.
 */
export const DPIA_SKELETON_CONTENT_HASH =
  "011f9f425d4cc275bdf023a97be89cafa46d9b561d0c5ca24e7957426d411cae";

export const DPIA_SKELETON_TITLE = "DATA PROTECTION IMPACT ASSESSMENT";
export const DPIA_SKELETON_SUBTITLE = "Prepared under Article 35 GDPR - {name}, for {organizationName}";

/** The v3 register guide, verbatim. Authoring law; never printed to a customer. */
export const DPIA_REGISTER_GUIDE = "Register guide (v3 - CEO-ratified counsel register, senior privacy lawyers with the professors editing) - Fixed prose is a lawyer's client document: full flowing sentences, measured connectives, the law stated plainly and applied. The company's facts are always attributed (\"{org} has indicated that ...\", \"the company has described ...\") - \"the record shows\" and its family are banned. No dramatization, no rhetorical questions, no self-narration. Facts enter only through {slots} and [GENERATED] blocks under the ATTRIBUTION RULE: every factual clause names its source and traces to an intake answer or typed analysis; coverage, CSC and refinement police this mechanically. Statutory sentences in fixed prose are registry-verified at encode time. Slot notation: {field - rule}.";

/** The v3 banned register, lower-cased for the assembled-body check. */
export const DPIA_V3_BANNED_REGISTER: readonly string[] = [
  "the record shows",
  "on this record",
  "the record reflects",
  "the record demonstrates",
  "as the record makes clear",
];

export type DpiaSkeletonBlockKind = "skeleton" | "lead" | "generated" | "table" | "rule";

export interface DpiaSkeletonBlock {
  readonly kind: DpiaSkeletonBlockKind;
  readonly text: string;
}

export interface DpiaSkeletonSection {
  readonly id: string;
  readonly title: string;
  readonly blocks: readonly DpiaSkeletonBlock[];
}

/**
 * SPINE v4 — CEO-ratified 2026-08-11.
 *
 * Section order follows the EDPB harmonised DPIA template v1.0 (adopted
 * 10 March 2026). The v3 sections `the_processing`, `lawfulness`,
 * `risks_and_measures` and `consultation_and_signoff` are RETIRED; their
 * ratified composer output is re-homed, not rewritten (necessity → Section 3,
 * risk → Section 4, sign-off → Section 6).
 *
 * `table` blocks name the typed surface they render. The assembler is the only
 * writer of their cells, and every cell is verbatim from that surface.
 */
export const DPIA_SKELETON_SECTIONS: readonly DpiaSkeletonSection[] = [
  {
    id: "executive_summary",
    title: "Executive Summary",
    blocks: [
      { kind: "lead", text: "[DETERMINATION LEAD] One sentence: whether the processing may proceed, may proceed subject to identified measures, or requires prior consultation under Article 36." },
      { kind: "skeleton", text: "Article 35 requires a data protection impact assessment where processing is likely to result in a high risk to the rights and freedoms of natural persons. {organizationName} has indicated that this assessment is required because {reasonsToConduct - reader phrases as prose}. The processing under assessment is {description - own sentence}{VERSION_CLAUSE - \", version \" + processingVersion; absent => omitted}{LAUNCH_CLAUSE - \", planned to commence \" + launchDate; absent => omitted}." },
      { kind: "generated", text: "[GENERATED] Three to four sentences: the risk posture after measures, in counsel's voice; no restatement of the lead." },
    ],
  },
  {
    id: "section_0_overview",
    title: "Section 0 - Overview of the Processing",
    blocks: [
      { kind: "skeleton", text: "This section records the parties to the processing and the terms on which this assessment was carried out. {organizationName} is the controller of the processing assessed here, and the tables below set out the controller, the processors it has engaged, and the planning particulars it has recorded. Where the company has not recorded an entry, the absence is stated rather than filled." },
      { kind: "table", text: "processing_inventory.controllers" },
      { kind: "table", text: "processing_inventory.processors" },
      { kind: "table", text: "processing_inventory.planning" },
      { kind: "skeleton", text: "The company has recorded the following particulars of the assessment itself: the reasons it was undertaken, the scope it was given, the materials relied on, and the company's intention as to publication." },
      { kind: "table", text: "assessment_particulars" },
      { kind: "skeleton", text: "The assessment team and the approval record below are taken from the company's own attestation and are reproduced as recorded." },
      { kind: "table", text: "assessment_team" },
      { kind: "table", text: "validation_approval" },
    ],
  },
  {
    id: "section_1_description",
    title: "Section 1 - Systematic Description of the Processing",
    blocks: [
      { kind: "skeleton", text: "Article 35(7)(a) requires a systematic description of the processing operations and of the purposes pursued. The description below is drawn from {organizationName}'s own answers: the categories of data it has identified, the purposes it has stated, and any further use it has disclosed." },
      { kind: "table", text: "processing_inventory.data_items" },
      { kind: "table", text: "processing_inventory.purposes" },
      { kind: "table", text: "processing_inventory.secondary_uses" },
      { kind: "skeleton", text: "On the nature, scope and context of the processing the company has said: {natureScopeContext - attributed verbatim}. It describes the operation functionally as follows: {functionalDescription - attributed verbatim}. The assets supporting the processing are those the company has listed: {supportingAssets - attributed verbatim}." },
    ],
  },
  {
    id: "section_2_analysis",
    title: "Section 2 - Analysis of the Processing",
    blocks: [
      { kind: "skeleton", text: "This section tests the processing against the obligations that bear on it. Each table states what {organizationName} has recorded, what that establishes, and - where the record does not carry the point - what is still needed. An entry marked as insufficient is a statement about the record, not a finding against the company." },
      { kind: "table", text: "legal_basis" },
      { kind: "skeleton", text: "Where special categories of personal data are processed, Article 9(1) prohibits the processing unless one of the conditions in Article 9(2) applies. The condition the company has selected, and its case for it, are set out below." },
      { kind: "table", text: "section2_coverage.special_category_conditions" },
      { kind: "table", text: "section2_coverage.data_minimisation_retention" },
      { kind: "table", text: "section2_coverage.data_quality" },
      { kind: "table", text: "section2_coverage.measures_article5" },
      { kind: "table", text: "section2_coverage.measures_rights" },
      { kind: "skeleton", text: "A controller may transfer personal data outside the European Economic Area only where Chapter V is satisfied, and may use a processor only under a contract meeting the requirements of Article 28(3). The company's position on each is below; where no transfer is on the record, that is recorded as a determination rather than left blank." },
      { kind: "table", text: "section2_coverage.measures_other" },
      { kind: "table", text: "section2_coverage.measures_dpbd" },
      { kind: "table", text: "section2_coverage.measures_security" },
    ],
  },
  {
    id: "section_3_necessity_proportionality",
    title: "Section 3 - Considerations on Necessity and Proportionality",
    blocks: [
      { kind: "skeleton", text: "Article 35(7)(b) requires an assessment of the necessity and proportionality of the processing in relation to its purposes. The question is not whether the processing is useful to {organizationName}, but whether the same purpose could be achieved by means that intrude less." },
      { kind: "lead", text: "[DETERMINATION LEAD] One sentence stating whether necessity and proportionality are made out on the company's answers." },
      { kind: "generated", text: "[GENERATED] The necessity and proportionality analysis: less-intrusive-means discipline applied to the company's answers; record facts only." },
      { kind: "skeleton", text: "The risks the processing carries by its design - that is, before any failure, deviation or attack is assumed - are set out below." },
      { kind: "table", text: "risk_register.design" },
    ],
  },
  {
    id: "section_4_risk_management",
    title: "Section 4 - Risk Assessment and Management",
    blocks: [
      { kind: "skeleton", text: "Article 35(7)(c) requires an assessment of the risks to the rights and freedoms of data subjects, and Article 35(7)(d) the measures envisaged to address them. This section takes the risks that arise where the processing does not operate as intended, and then states the company's position on each risk after the measures it has recorded." },
      { kind: "table", text: "risk_register.incident" },
      { kind: "lead", text: "[DETERMINATION LEAD] One sentence identifying the most significant residual risk after measures." },
      { kind: "table", text: "risk_register" },
      { kind: "generated", text: "[GENERATED] From the typed risk register: each risk with its likelihood and severity, the measure that answers it, and the residual position, attributed throughout; the renderer draws the table, and the prose analyses only what bears on the decision. The safeguards the company has recorded: {safeguards - as prose}." },
    ],
  },
  {
    id: "section_5_interested_parties",
    title: "Section 5 - Involvement of Interested Parties",
    blocks: [
      { kind: "skeleton", text: "Article 35(2) requires the controller to seek the advice of its data protection officer where one is designated, and Article 35(9) requires the views of data subjects or their representatives to be sought where appropriate. {DPO_ADVICE_SENTENCE - conditional: the DPO's advice as recorded, attributed; the negative branch states honestly that DPO advice has not been obtained}. On the views of the people affected, the company has recorded: {dataSubjectsViews - attributed verbatim; absent => the honest negative that no such views were sought}." },
    ],
  },
  {
    id: "section_6_conclusion",
    title: "Section 6 - Conclusion and Decision",
    blocks: [
      { kind: "skeleton", text: "This section states the determination this assessment reaches, the conditions on which it rests, and the point at which it must be revisited." },
      { kind: "table", text: "decision" },
      { kind: "lead", text: "[DETERMINATION LEAD] One sentence stating the sign-off determination with any condition attached." },
      { kind: "generated", text: "[GENERATED] The approval basis in counsel's voice: which residual risks were accepted and by whom ({dpiaApprovedByName}), with any condition; the scope note {dpiaScopeNote} and review window {endDate} where the company has recorded them." },
      { kind: "skeleton", text: "{ART36_SENTENCE - from art36_consultation: where the residual risk remains high notwithstanding the measures, Article 36(1) requires the controller to consult the supervisory authority before the processing begins; the negative branch states that no prior consultation is required on this assessment's determination}." },
      { kind: "skeleton", text: "Matters still outstanding on the record are listed below. Each is a point this assessment could not determine on the answers given, and each names what would resolve it." },
      { kind: "table", text: "gap_ledger" },
    ],
  },
  {
    id: "table_of_authorities",
    title: "Table of Authorities",
    blocks: [
      { kind: "rule", text: "Assembled deterministically from the document's citation ledger: an authority appears here if and only if it is cited above, with pinpoints consolidated and section back-references. Grouped in brief order - Regulations; Statutes; Guidance and Persuasive Authority (labelled persuasive, never binding). Source links deferred." },
    ],
  },
];

/**
 * STATUTORY PINPOINTS carried by the fixed prose, each byte-verified at encode
 * time against its approved `provision_texts` row (SO step 1):
 *   Article 35 GDPR   → `gdpr-art-35`  (Art. 35(1) high-risk trigger; Art. 35(2),
 *                                       35(7)(a)-(d), 35(9) section openers)
 *   Article 36 GDPR   → `gdpr-art-36`  (prior consultation, Section 6 conditional)
 *   Article 9 GDPR    → `gdpr-art-9`   (Art. 9(1) prohibition / 9(2) condition)
 *   Article 28 GDPR   → `gdpr-art-28`  (processor contract, Section 2 opener)
 *   Article 44 GDPR   → `gdpr-art-44`  (Chapter V general principle)
 *   Article 46 GDPR   → `gdpr-art-46`  (Chapter V appropriate safeguards)
 *
 * NOT PINNED (PROMPT 8 corpus findings, 2026-08-11): there is no `gdpr-art-9-2`
 * row — Art. 9(2) rides on the approved `gdpr-art-9` text — and no EU
 * `gdpr-art-45` row, so adequacy stays OUT of fixed prose and is carried only
 * by the transfers table's registry citation.
 */
export const DPIA_SKELETON_PINPOINTS: readonly { readonly citation: string; readonly corpus_key: string }[] = [
  { citation: "GDPR Art. 35", corpus_key: "gdpr-art-35" },
  { citation: "GDPR Art. 36", corpus_key: "gdpr-art-36" },
  { citation: "GDPR Art. 9", corpus_key: "gdpr-art-9" },
  { citation: "GDPR Art. 28", corpus_key: "gdpr-art-28" },
  { citation: "GDPR Art. 44", corpus_key: "gdpr-art-44" },
  { citation: "GDPR Art. 46", corpus_key: "gdpr-art-46" },
];

/** Table blocks, in document order — the surfaces the assembler must supply. */
export const DPIA_SKELETON_TABLE_SURFACES: readonly string[] = DPIA_SKELETON_SECTIONS
  .flatMap((s) => s.blocks.filter((b) => b.kind === "table").map((b) => b.text));
