// ITEM SO-5 / PROMPT 8D — SPECIFIED OUTPUT ENCODE: Impact Assessment Builder
// (DPIA). SPINE v4.2 — EDPB harmonised DPIA template structure, Sections 0–6,
// with the CEO-ratified plain-language sweep of 2026-08-12.
//
// RENDER LAW. v3 (the CEO-corrected `Impact_Assessment_Builder_DPIA_Skeleton_
// v3.docx` of 2026-08-10) was superseded on 2026-08-11 by spine v4; v4 by the
// v4.1 prose ratification of 2026-08-12; and v4.1 by v4.2 (PROMPT 8D, CEO-
// ratified 2026-08-12), which DELETES the executive-summary [DETERMINATION
// LEAD] block. The decision statement now closes the executive body per the
// CEO's canonical model. No `skeleton` block's bytes changed at v4.2.
//
// HASH BASIS v2 (CEO-approved 2026-08-12): the pin is taken over the FULL
// spine serialization — section id, title, order, and each block's kind and
// text — so a structural change such as this one moves the pin. The former
// skeleton-only basis is retained as `DPIA_SKELETON_CONTENT_HASH` for audit.
//
// RATIFICATION PROCESS RULE (standing, CEO, 2026-08-12, all products): the
// review document put to the CEO for any spine change is generated from the
// SHIPPED spine bytes, never from a stored .docx.


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

export const DPIA_SKELETON_VERSION = "prose-plans-2026-08-12-prompt8d-v4-2";
export const DPIA_SKELETON_SOURCE_FILE =
  "DPIA spine v4.2 (EDPB harmonised DPIA template v1.0, adopted 10 March 2026), CEO-ratified 2026-08-12; supersedes spine v4.1 (CEO-ratified 2026-08-12), spine v4 (CEO-ratified 2026-08-11) and Impact_Assessment_Builder_DPIA_Skeleton_v3.docx (CEO-corrected 2026-08-10)";
export const DPIA_SKELETON_PROVENANCE =
  "PROMPT 8D spine v4.2 — CEO ratification of 2026-08-12 (plain-language sweep), generated from the shipped v4.1 spine bytes; one structural change, the deletion of the executive-summary [DETERMINATION LEAD] block. Fixed prose unchanged.";

/** The superseded v4.1 spine version string, kept for documents already assembled. */
export const DPIA_SKELETON_VERSION_V41 = "prose-plans-2026-08-12-prompt8b-v4-1";

/** The superseded v4 spine version string, kept for documents already assembled. */
export const DPIA_SKELETON_VERSION_V4 = "prose-plans-2026-08-11-prompt8-v4";


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
 * v4 SPINE HASH — RETAINED FOR THE AUDIT TRAIL ONLY. v4's fixed prose was
 * superseded by the CEO-ratified v4.1 revision of 2026-08-12.
 */
export const DPIA_SKELETON_CONTENT_HASH_V4 =
  "011f9f425d4cc275bdf023a97be89cafa46d9b561d0c5ca24e7957426d411cae";

/**
 * FIXED-PROSE HASH (BASIS v1) — SHA-256 over every `skeleton` block's `text` in
 * DPIA_SKELETON_SECTIONS order, joined with "\n" (16 blocks).
 *
 * RETAINED FOR THE AUDIT TRAIL. As of v4.2 this is NOT the shipped pin: the
 * CEO approved hash basis v2 (full spine serialization) on 2026-08-12, and
 * `DPIA_SPINE_HASH` below is the pin conformance reads. This value is
 * unchanged from v4.1 because v4.2 changed no fixed prose, which is exactly
 * why the basis was widened.
 */
export const DPIA_SKELETON_CONTENT_HASH =
  "5e538c3c50a0d8098acdffd9067166d92cb343da7f1b117158df9f7d66a4d7b2";



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
      // PROMPT 8D (v4.2): the [DETERMINATION LEAD] block is DELETED. The
      // decision statement closes the executive body per the canonical model.
      { kind: "skeleton", text: "Article 35 requires a data protection impact assessment where processing is likely to result in a high risk to the rights and freedoms of natural persons. {organizationName} believes that this assessment may be required because {reasonsToConduct - reader phrases as prose}. The processing under assessment is {description - own sentence}{VERSION_CLAUSE - \", version \" + processingVersion; absent => omitted}{LAUNCH_CLAUSE - \", planned to commence \" + launchDate; absent => omitted}." },
      { kind: "generated", text: "[GENERATED] The executive body per the canonical model: the risks reviewed and the measures mitigating them; whether any is deemed high; the self-identified/surfaced split; the open points; and the grounded decision statement, which closes the section." },

    ],
  },
  {
    id: "section_0_overview",
    title: "Section 0 - Overview of the Processing",
    blocks: [
      { kind: "skeleton", text: "This section identifies the parties to the processing and the terms on which this assessment was carried out. {organizationName} is the controller of the processing being assessed here, and the tables below identify the controller, the processors it has engaged, and the particulars of the engagements. Where the company has not recorded an entry, that absence is noted rather than filled." },
      { kind: "table", text: "processing_inventory.controllers" },
      { kind: "table", text: "processing_inventory.processors" },
      { kind: "table", text: "processing_inventory.planning" },
      { kind: "skeleton", text: "The company identifies the following particulars for the assessment itself: the reasons it was undertaken, its scope, the materials relied upon, and the company's intention as to publication." },
      { kind: "table", text: "assessment_particulars" },
      { kind: "skeleton", text: "The assessment team and the approval record below are taken from the company's own attestation and are reproduced as identified by the company." },
      { kind: "table", text: "assessment_team" },
      { kind: "table", text: "validation_approval" },
    ],
  },
  {
    id: "section_1_description",
    title: "Section 1 - Systematic Description of the Processing",
    blocks: [
      { kind: "skeleton", text: "Article 35(7)(a) requires a systematic description of the processing operations and of the purposes pursued. {organizationName} describes below: the categories of data it identifies, the purposes it states, and any further uses it discloses." },
      { kind: "table", text: "processing_inventory.data_items" },
      { kind: "table", text: "processing_inventory.purposes" },
      { kind: "table", text: "processing_inventory.secondary_uses" },
      { kind: "skeleton", text: "On the nature, scope and context of the processing the company has said: {natureScopeContext - attributed verbatim}. It describes the operation functionally as follows: {functionalDescription - attributed verbatim}. The assets supporting the processing as identified by the company are as follows: {supportingAssets - attributed verbatim}." },
    ],
  },
  {
    id: "section_2_analysis",
    title: "Section 2 - Analysis of the Processing",
    blocks: [
      { kind: "skeleton", text: "This section tests the processing against the obligations imposed on it. Each table states what {organizationName} has recorded, what that establishes, and, where the record is lacking, what is still needed. An entry marked as insufficient is a statement about the sufficiency of the record itself, not a finding against the company." },
      { kind: "table", text: "legal_basis" },
      { kind: "skeleton", text: "Where special categories of personal data are processed, Article 9(1) prohibits the processing unless one of the conditions in Article 9(2) applies. The condition the company has selected, and the company's corresponding reasoning, are set out below." },
      { kind: "table", text: "section2_coverage.special_category_conditions" },
      { kind: "table", text: "section2_coverage.data_minimisation_retention" },
      { kind: "table", text: "section2_coverage.data_quality" },
      { kind: "table", text: "section2_coverage.measures_article5" },
      { kind: "table", text: "section2_coverage.measures_rights" },
      { kind: "skeleton", text: "A controller may transfer personal data outside the European Economic Area only where Chapter V's conditions for such transfer are satisfied, and may use a processor only under a contract meeting the processing details, security, and other requirements of Article 28(3). The company's position on each is below; where the company identifies no such transfers, the assessment proceeds on the basis that none are made." },
      { kind: "table", text: "section2_coverage.measures_other" },
      { kind: "table", text: "section2_coverage.measures_dpbd" },
      { kind: "table", text: "section2_coverage.measures_security" },
    ],
  },
  {
    id: "section_3_necessity_proportionality",
    title: "Section 3 - Considerations on Necessity and Proportionality",
    blocks: [
      { kind: "skeleton", text: "Article 35(7)(b) requires an assessment of the necessity and proportionality of the processing in relation to its purposes. The question is not whether the processing is useful to {organizationName}, but whether the same purpose could be achieved by means that are less intrusive." },
      { kind: "lead", text: "[DETERMINATION LEAD] One sentence stating whether necessity and proportionality are made out on the company's answers." },
      { kind: "generated", text: "[GENERATED] The necessity and proportionality analysis: less-intrusive-means discipline applied to the company's answers; record facts only." },
      { kind: "skeleton", text: "The risks inherent in the processing's design — that is, before any failure, deviation or attack is assumed — are set out below." },
      { kind: "table", text: "risk_register.design" },
    ],
  },
  {
    id: "section_4_risk_management",
    title: "Section 4 - Risk Assessment and Management",
    blocks: [
      { kind: "skeleton", text: "Article 35(7)(c) requires an assessment of the risks to the rights and freedoms of data subjects, and Article 35(7)(d) the measures envisaged to address them. This section identifies the risks that arise where the processing does not operate as intended, and then states the company's position on each risk in light of the protective or mitigating measures it identifies." },
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
      { kind: "skeleton", text: "Article 35(2) requires the controller to seek the advice of its data protection officer where one is designated, and Article 35(9) requires the views of data subjects or their representatives to be sought where appropriate. {DPO_ADVICE_SENTENCE - conditional: the DPO's advice as recorded, attributed; the negative branch states honestly that DPO advice has not been obtained}. On the views of the people affected, the company states: {dataSubjectsViews - attributed verbatim; absent => the honest negative that no such views were sought}." },
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
      { kind: "skeleton", text: "Matters still outstanding are listed below. Each is a point this assessment could not determine from the company's answers, and each names what would resolve it." },
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

/**
 * HASH BASIS v2 (CEO-approved 2026-08-12) — the FULL spine serialization.
 *
 * One line per section header (`## <id> | <title>`) and one line per block
 * (`<kind>\t<text>`), in document order, joined with "\n". Section identity,
 * titles, block order, block kinds and block text are ALL inside the pin, so a
 * structural change — a deleted lead, a re-ordered table — moves the hash even
 * when no fixed prose changed. Basis v1 (`DPIA_SKELETON_CONTENT_HASH`) is
 * retained above for the audit trail.
 */
export function serializeDpiaSpine(
  sections: readonly DpiaSkeletonSection[] = DPIA_SKELETON_SECTIONS,
): string {
  const lines: string[] = [];
  for (const section of sections) {
    lines.push(`## ${section.id} | ${section.title}`);
    for (const block of section.blocks) lines.push(`${block.kind}\t${block.text}`);
  }
  return lines.join("\n");
}

/**
 * v4.2 SPINE HASH — SHA-256 over `serializeDpiaSpine()`. This is the shipped
 * byte-pin. Recomputed and re-ratified on every ratified spine change; a drift
 * is a HARD STOP, not a fix-up.
 */
export const DPIA_SPINE_HASH =
  "fe0ced551e06dddd0444feb7834dd4911b63f83b52198090cd1cd95e86a76190";

/** The v4.1 spine under basis v2 — retained for the audit trail. */
export const DPIA_SPINE_HASH_V41 =
  "55fad638b771095e83cf1b85b0af38b9c58e6fb1646da017a4153f2e95853cba";
