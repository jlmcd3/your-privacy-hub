// ITEM SO-5 / PROMPT 8D — SPECIFIED OUTPUT ENCODE: Impact Assessment Builder
// (DPIA). SPINE v4.6 — citation-review pass over v4.5.1's fixed prose plus a
// factor/intake/determination/authority Appendix A replacing the Table of
// Authorities, CEO-ratified 2026-08-21
// (`DPIA_Framework_Spine_v4.6_Citation_Review_and_Factor_Appendix_CORRECTED.docx`).
// v4.6 keeps the architecture, the Intake Contract, every table surface, and
// every generated/determination-lead output unchanged; it (a) tightens
// statutory grounding in roughly a dozen skeleton blocks (added subsections,
// statutory provisos, and one new skeleton block in Section 2 that did not
// exist before), and (b) replaces the Table of Authorities with Appendix A,
// the same pattern used for CPPA ADMT's Appendix B and CPPA Risk's Appendix
// G. Scoped and verified in doc 42 (`42-DPIA-SPINE-4.6-SCOPE.md`) before
// implementation.
//
// RENDER LAW. v3 (the CEO-corrected `Impact_Assessment_Builder_DPIA_Skeleton_
// v3.docx` of 2026-08-10) was superseded on 2026-08-11 by spine v4; v4 by the
// v4.1 prose ratification of 2026-08-12; v4.1 by v4.2 (PROMPT 8D, CEO-
// ratified 2026-08-12), which DELETES the executive-summary [DETERMINATION
// LEAD] block; v4.2 by v4.3 (PROMPT 9I) and v4.5.1 (PROMPT 9L.2) via targeted
// fixed-prose and composition-order edits; and v4.5.1 by v4.6 above. The
// decision statement continues to close the executive body per the v4.2
// canonical model.
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

// v4.6.2 (2026-08-25, CEO-ordered polish round — ChatGPT DPIA output
// review; EDPB Section 0–6 STRUCTURE explicitly unchanged per CEO ruling):
//   (1) Section 6's "Matters still outstanding are listed below" fixed
//       sentence printed even when the gap ledger was empty — the clearest
//       template tell in the report. Converted to the
//       {OUTSTANDING_MATTERS} slot: listing lead when entries exist,
//       "Outstanding Matters. None identified." otherwise.
//   (2) Appendix A's intro dropped its final sentence ("Internal field
//       keys, variable names, and reasoning traces are never printed in
//       the customer report") — internal product documentation, not
//       customer prose.
export const DPIA_SKELETON_VERSION = "dpia-v4.8-2026-08-30";

/** The v4.7 spine version — retained for the audit trail. */
export const DPIA_SKELETON_VERSION_V47 = "dpia-v4.7-2026-08-30";

/** The v4.6.1 spine version — retained for the audit trail. */
export const DPIA_SKELETON_VERSION_V461 = "dpia-v4.6.1-2026-08-22";

/** The v4.6 spine version — retained for the audit trail. */
export const DPIA_SKELETON_VERSION_V46 = "dpia-v4.6-2026-08-21";

/** The v4.5.1 spine version — retained for the audit trail. */
export const DPIA_SKELETON_VERSION_V451 = "prose-plans-2026-08-16-prompt9l2-v4-5-1";

/** The v4.5 spine version — retained for the audit trail. */
export const DPIA_SKELETON_VERSION_V45 = "prose-plans-2026-08-16-prompt9l1-v4-5";

/** The v4.3 spine version — retained for the audit trail. */
export const DPIA_SKELETON_VERSION_V43 = "prose-plans-2026-08-15-prompt9i-v4-3";

/** The superseded v4.2 spine version string, kept for documents already assembled. */
export const DPIA_SKELETON_VERSION_V42 = "prose-plans-2026-08-12-prompt8d-v4-2";
export const DPIA_SKELETON_SOURCE_FILE =
  "DPIA spine v4.3 (EDPB harmonised DPIA template v1.0, adopted 10 March 2026), CEO-ratified 2026-08-15 (PROMPT 9I redline of document 03, batch 3a4f10c4); supersedes DPIA spine v4.2 (EDPB harmonised DPIA template v1.0, adopted 10 March 2026), CEO-ratified 2026-08-12; supersedes spine v4.1 (CEO-ratified 2026-08-12), spine v4 (CEO-ratified 2026-08-11) and Impact_Assessment_Builder_DPIA_Skeleton_v3.docx (CEO-corrected 2026-08-10)";
export const DPIA_SKELETON_PROVENANCE =
  "PROMPT 9I spine v4.3 — CEO redline ratification of 2026-08-15, generated from the shipped v4.2 spine bytes: thirteen fixed-prose edits, and two composition moves (Section 3 determination last, Section 4 summary last). Slot inventory unchanged. Prior provenance: PROMPT 8D spine v4.2 — CEO ratification of 2026-08-12 (plain-language sweep), generated from the shipped v4.1 spine bytes; one structural change, the deletion of the executive-summary [DETERMINATION LEAD] block. Fixed prose unchanged.";

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
export const DPIA_SKELETON_CONTENT_HASH_V41 =
  "5e538c3c50a0d8098acdffd9067166d92cb343da7f1b117158df9f7d66a4d7b2";

/**
 * FIXED-PROSE HASH (BASIS v1) at spine v4.3 — the PROMPT 9I redline changed
 * fixed prose, so this value moves with it. Retained for the audit trail only;
 * `DPIA_SPINE_HASH` (basis v2) is the shipped pin.
 */
export const DPIA_SKELETON_CONTENT_HASH_V43 =
  "615664dc04dd04392f7d158511ccda8a1d7b5fa009bd7ab7e958745ebda1eb72";

/** The v4.4 fixed prose under basis v1 — retained for the audit trail. */
export const DPIA_SKELETON_CONTENT_HASH_V44 =
  "ef9a38e435f1c04c2fa3d9a7e6006a509aa9278a48d2f40205c08c420ef57429";

/** The v4.5 fixed prose under basis v1 — retained for the audit trail. */
export const DPIA_SKELETON_CONTENT_HASH_V45 =
  "e2752c976328626a4bb34fe35a71c9d36bd7be8e5b408d38cc9c6ce1b4421517";

/**
 * FIXED-PROSE HASH (BASIS v1) at spine v4.5.1 — PROMPT 9L.2 reordered the
 * Section 4 blocks (statutory frame first, then the design-risk intro and
 * table). No sentence bytes changed, but the basis-v1 concatenation order did.
 * Retained for the audit trail only; `DPIA_SPINE_HASH` (basis v2) is the pin.
 */
export const DPIA_SKELETON_CONTENT_HASH_V451 =
  "cb168a5e3155c60054d4e301f5bffeb18df01c051d3c717e6f19653a276c9c0a";

/**
 * FIXED-PROSE HASH (BASIS v1) at spine v4.6 — the citation-review pass
 * reworded roughly a dozen skeleton blocks, added one new skeleton block in
 * Section 2, and added the Appendix A intro skeleton block (18 skeleton
 * blocks total, up from 16). Retained for the audit trail only;
 * `DPIA_SPINE_HASH` (basis v2) is the shipped pin.
 */
export const DPIA_SKELETON_CONTENT_HASH_V46 =
  "da472b222b97e8eaacdf9c59d5abcb63d3699e82af4fa267e5b5c4ed4695234e";

/**
 * FIXED-PROSE HASH (BASIS v1) at spine v4.6.1 — retained for the audit
 * trail only; `DPIA_SPINE_HASH` (basis v2) is the shipped pin.
 */
export const DPIA_SKELETON_CONTENT_HASH_V461 =
  "dea0ea23c3562a686c52e1c69fb532625eb474c19995a834ee82cf600f8c567b";

/**
 * FIXED-PROSE HASH (BASIS v1) at spine v4.6.2 — retained for the audit
 * trail only; `DPIA_SPINE_HASH` (basis v2) is the shipped pin.
 */
export const DPIA_SKELETON_CONTENT_HASH_V462 =
  "a37b95f8ad6f493a89a1882899f63a42cb437dbaca4dd7d62915ae8d29805026";

/**
 * FIXED-PROSE HASH (BASIS v1) at spine v4.7 — BATCH 19b (doc 113 Part D,
 * doc 109 DPIA item 1, doc 111 D2 verdict-first): the Executive Summary's
 * statutory frame cut to under eighty words (the Article 35(3) three-case
 * enumeration retired; the WP248 sentence moved verbatim to the Appendix A
 * intro) and the exec blocks reordered determination-first. Recomputed with
 * the same method as every prior encode (skeleton-block text,
 * newline-joined, in document order; verified by reproducing the v4.6.2
 * value first).
 */
export const DPIA_SKELETON_CONTENT_HASH =
  "35d9a83b15c7bb538a0dd48c6bf83978fe35f6de11431aa9ed59ce5bd81c6c18";



export const DPIA_SKELETON_TITLE = "DATA PROTECTION IMPACT ASSESSMENT";
export const DPIA_SKELETON_SUBTITLE = "Prepared under Article 35 GDPR — {name}, for {organizationName}";

/**
 * PROMPT 9H.1 item 2 (CEO-ratified by inclusion, 2026-08-15) — regime subtitles
 * as ratified constants. The assembler selects by readDpiaRegime; no ratified
 * spine constant is rewritten at render time.
 */
export const DPIA_SKELETON_SUBTITLE_EU = DPIA_SKELETON_SUBTITLE;
export const DPIA_SKELETON_SUBTITLE_UK =
  "Prepared under Article 35 UK GDPR — {name}, for {organizationName}";

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
      // BATCH 19b (v4.7, doc 113 S4.1/S4.3 — doc 111 D2 verdict-first
      // supersedes PROMPT 8D's decision-closes-the-section placement): the
      // determination-led executive body OPENS the section; the statutory
      // frame closes it. The decision statement's ratified sentence bytes
      // are unchanged (RULING 3.2) — it moved and gained the
      // "Determination." style label, nothing more.
      { kind: "generated", text: "[GENERATED] The executive body, determination first: the grounded decision statement opens the section as the styled determination; then the risks reviewed and the measures mitigating them; whether any is deemed high; the self-identified/surfaced split; and the open points as a dash list." },
      // BATCH 19b (v4.7, doc 113 S4.2 — doc 109 DPIA item 1): the statutory
      // frame cut to under eighty words. Article 35(1)'s requirement
      // sentence keeps its bytes; the Article 35(3) three-case enumeration
      // retires from the exec (the provision stays cited; the cases live in
      // the record's own reasons-to-conduct and Appendix A's authorities);
      // the WP248 sentence moved VERBATIM to the Appendix A intro.
      { kind: "skeleton", text: "Article 35(1) of the General Data Protection Regulation for the EU and UK (“GDPR”) requires a data protection impact assessment before processing that, taking into account its nature, scope, context and purposes, is likely to result in a high risk to the rights and freedoms of natural persons, and Article 35(3) identifies the cases in which one is required in particular. {organizationName} believes that this assessment may be required because {reasonsToConduct - reader phrases as prose}. The processing under assessment is described as the following: {description - own sentence}{VERSION_CLAUSE - \", version \" + processingVersion; absent => omitted}{LAUNCH_CLAUSE - \", planned to commence \" + launchDate; absent => omitted}." },
    ],
  },
  {
    id: "section_0_overview",
    title: "Section 0 — Overview of the Processing",
    blocks: [
      { kind: "skeleton", text: "This section identifies the controller, processors, planning information, assessment scope, materials, assessment team, and approval record. Article 35 places responsibility for the DPIA on the controller, while Articles 24 and 28 require the controller to remain accountable for the processing and to use processors that provide sufficient guarantees. {organizationName} is the controller of the processing being assessed, and the tables below identify the processors it has engaged and the particulars of the engagements. Where the company has not provided information, the absence of that information is noted rather than assumed." },
      { kind: "table", text: "processing_inventory.controllers" },
      { kind: "table", text: "processing_inventory.processors" },
      { kind: "table", text: "processing_inventory.planning" },
      { kind: "skeleton", text: "Below, the company identifies the reasons the assessment was undertaken, its scope, the materials relied upon, and the company's intention as to publication, if applicable." },
      { kind: "table", text: "assessment_particulars" },
      { kind: "skeleton", text: "The assessment team and the approval process are reproduced as identified by the company." },
      { kind: "table", text: "assessment_team" },
      { kind: "table", text: "validation_approval" },
    ],
  },
  {
    id: "section_1_description",
    title: "Section 1 — Systematic Description of the Processing",
    blocks: [
      { kind: "skeleton", text: "Article 35(7)(a) requires a systematic description of the envisaged processing operations and their purposes, including the legitimate interest pursued by the controller where applicable. Pursuant to that requirement, the tables below identify the categories of data, purposes of the processing, and any further uses of the data. The additional narrative describes the nature, scope, context, functional operation, and supporting assets so that the later necessity and risk analysis is tied to the processing actually proposed." },
      { kind: "table", text: "processing_inventory.data_items" },
      { kind: "table", text: "processing_inventory.purposes" },
      { kind: "table", text: "processing_inventory.secondary_uses" },
      { kind: "skeleton", text: "On the nature, scope and context of the processing, the company has stated the following: {natureScopeContext - attributed verbatim}. The company describes the operation functionally as follows: {functionalDescription - attributed verbatim}. The company identifies the assets supporting the processing as follows: {supportingAssets - attributed verbatim}." },
    ],
  },
  {
    id: "section_2_analysis",
    title: "Section 2 — Analysis of the Processing",
    blocks: [
      { kind: "skeleton", text: "A DPIA is not limited to identifying risks; it must also assess necessity and proportionality and identify measures that demonstrate compliance and protect data subjects. This section therefore reviews the legal bases under Article 6(1): consent, contract necessity, legal obligation, vital interests, public task, or legitimate interests, and any applicable Article 9 conditions for special-category data as described below, the Article 5 principles also as described below, data-subject rights, international transfers, processor governance, data protection by design and by default, and security. In the first table below, the company asserts the lawful basis of the processing under Article 6(1). Each subsequent table states what {organizationName} has recorded, what that supports, and, where information is lacking, what remains to be established. An entry marked as insufficient describes the sufficiency of the assessment record and is not, by itself, a finding of GDPR non-compliance." },
      { kind: "table", text: "legal_basis" },
      { kind: "skeleton", text: "Article 9. Where special categories of personal data are processed, Article 9(1) generally prohibits the processing unless an Article 9(2) condition applies in addition to an Article 6 lawful basis. The condition under Article 9(2) that the company has selected, and the company's corresponding reasoning, are set forth below." },
      { kind: "table", text: "section2_coverage.special_category_conditions" },
      // v4.6 — new skeleton block: this framing paragraph did not exist in
      // v4.5.1, which went straight from the special-category table to
      // data_minimisation_retention with no intervening prose. Safe to
      // insert: section_2_analysis carries no generated/lead composed
      // content anywhere, and every table block resolves by surface name
      // (block.text), not by its array position, so the later table blocks'
      // shifted indices are recomputed correctly at render time.
      { kind: "skeleton", text: "Article 5; Articles 12-22. Article 5 outlines the core principles of lawfulness, fairness and transparency; purpose limitation; data minimisation; accuracy; storage limitation; integrity/confidentiality; and accountability with respect the processing of personal data. Specifically, Article 5(1)(b)–(e) requires purpose limitation, data minimisation, accuracy, and storage limitation. The following tables test whether the company has limited the data and retention period to what is necessary, maintains appropriate data quality, and has identified measures supporting the Article 5 principles and the exercise of data-subjects’ rights to their personal data and control over it under Articles 12–22." },
      { kind: "table", text: "section2_coverage.data_minimisation_retention" },
      { kind: "table", text: "section2_coverage.data_quality" },
      { kind: "table", text: "section2_coverage.measures_article5" },
      { kind: "table", text: "section2_coverage.measures_rights" },
      { kind: "skeleton", text: "Operational Compliance. The GDPR also requires the controller to address several operational compliance measures relevant to proportionality and risk. Articles 12–22 govern the principal data-subject rights. Article 25 requires data protection by design and by default, and Article 32 requires security appropriate to risk. For international transfers, Article 44 and the remainder of Chapter V require a valid transfer framework for transfers to third countries or international organisations. Under Article 28(1), a controller may use only processors providing sufficient guarantees, and Article 28(3) requires the controller-processor relationship to be governed by a binding contract or other legal act containing the specified terms. The company's position on each is set out below; where no international transfer is identified, the assessment does not assume one." },
      { kind: "table", text: "section2_coverage.measures_other" },
      { kind: "table", text: "section2_coverage.measures_dpbd" },
      { kind: "table", text: "section2_coverage.measures_security" },
    ],
  },
  {
    id: "section_3_necessity_proportionality",
    title: "Section 3 — Considerations on Necessity and Proportionality",
    blocks: [
      // PROMPT 9I item 4 (CEO-ratified 2026-08-15) — SECTION 3 COMPOSITION
      // ORDER (S3-R1): statutory frame → necessity per operation →
      // proportionality per operation → the Section-3 determination LAST. Only
      // the two composed blocks swap position; no block's bytes move.
      { kind: "skeleton", text: "Article 35(7)(b) requires an assessment of whether the processing is necessary and proportionate to its stated purposes. That analysis is informed by the Article 5 principles—particularly purpose limitation and data minimisation—and by whether a realistic, less intrusive means could achieve the same purpose with materially lower impact on individuals. The following discussion applies that discipline to the company's stated goals, alternatives, data use, and impact on data-subject rights, based only on the information the company provided." },
      { kind: "generated", text: "[GENERATED] The necessity and proportionality analysis: less-intrusive-means discipline applied to the company's answers; record facts only." },
      { kind: "lead", text: "[DETERMINATION LEAD] One sentence stating whether necessity and proportionality are made out on the company's answers." },
      // PROMPT 9L.1 item 5 (CEO comment 9; EDPB alignment) — the design-risks
      // intro and its table MOVED to the top of Section 4. Section 3 now ENDS
      // on the determination sentence.

    ],
  },
  {
    id: "section_4_risk_management",
    title: "Section 4 — Risk Assessment and Management",
    blocks: [
      // PROMPT 9L.2 item 1 (CEO-ratified 2026-08-16) — pure block reorder: the
      // statutory-frame block opens Section 4, and the relocated design-risk
      // intro and table follow IMMEDIATELY AFTER it. Block bytes unchanged.
      // PROMPT 9I item 3 (CEO-ratified 2026-08-15) — the most-significant-risk
      // summary is the section's CLOSING paragraph, so the [DETERMINATION LEAD]
      // block moves last. Block bytes are unchanged.
      { kind: "skeleton", text: "Article 35(7)(c) requires an assessment of the risks to the rights and freedoms of data subjects. Article 35(7)(d) then requires the DPIA to identify the measures envisaged to address those risks, including safeguards, security measures, and mechanisms to ensure the protection of personal data and demonstrate compliance, taking into account the rights and legitimate interests of data subjects and other persons concerned. This section therefore considers both risks inherent in the processing design and risks arising from failure, misuse, deviation, or attack, and then evaluates the company's identified measures and the residual position." },
      // PROMPT 9L.1 item 5 — the design-risk intro and table are the starting
      // point of the risk assessment (moved from the end of §3).
      { kind: "skeleton", text: "Risk Assessments. The first register captures design risk: harm that may arise from the processing even when the system operates as intended. The incident register separately captures risks arising from error, misuse, unauthorised access, technical failure, or other adverse events. The combined register then supports the residual-risk determination after the company's measures are considered." },
      { kind: "table", text: "risk_register.design" },
      { kind: "table", text: "risk_register.incident" },
      { kind: "table", text: "risk_register" },
      { kind: "generated", text: "[GENERATED] From the typed risk register: each risk with its likelihood and severity, the measure that answers it, and the residual position, attributed throughout; the renderer draws the table, and the prose analyses only what bears on the decision. The safeguards the company has recorded: {safeguards - as prose}." },
      { kind: "lead", text: "[DETERMINATION LEAD] One sentence identifying the most significant residual risk after measures." },
    ],
  },

  {
    id: "section_5_interested_parties",
    title: "Section 5 — Involvement of Interested Parties",
    blocks: [
      { kind: "skeleton", text: "Article 35(2) requires the controller to seek the advice of its data protection officer, where one is designated, when carrying out the DPIA. Article 35(9) requires the controller, where appropriate, to seek the views of data subjects or their representatives on the intended processing, subject to protection of commercial or public interests and the security of processing operations. {DPO_ADVICE_SENTENCE - conditional: the DPO's advice as recorded, attributed; the negative branch states honestly that DPO advice has not been obtained}. With respect to the views of the people affected, the company states: {dataSubjectsViews - attributed verbatim; absent => the honest negative that no such views were sought}." },
    ],
  },
  {
    id: "section_6_conclusion",
    title: "Section 6 — Conclusion and Decision",
    blocks: [
      { kind: "skeleton", text: "This section states the DPIA determination, any conditions or unresolved points, the approval basis, and whether prior consultation is required. Article 35(11) also requires the controller to review the DPIA where necessary, at least when a change in the risk represented by the processing occurs." },
      { kind: "table", text: "decision" },
      { kind: "lead", text: "[DETERMINATION LEAD] One sentence stating the sign-off determination with any condition attached." },
      { kind: "generated", text: "[GENERATED] The approval basis in counsel's voice: which residual risks were accepted and by whom ({dpiaApprovedByName}), with any condition; the scope note {dpiaScopeNote} and review window {endDate} where the company has recorded them." },
      { kind: "skeleton", text: "{ART36_SENTENCE - from art36_consultation: where the DPIA concludes that the intended processing would still result in a high risk because the controller cannot sufficiently mitigate it through available measures, Article 36(1) requires prior consultation with the supervisory authority before processing begins; the negative branch states that prior consultation is not required on this assessment's determination}." },
      // v4.6.2 — was an unconditional fixed sentence; with an empty gap
      // ledger it announced a list that never appeared. Now a slot.
      { kind: "skeleton", text: "{OUTSTANDING_MATTERS - conditional: when the gap ledger carries entries, the listing lead (\"Matters still outstanding are listed below. Each is a point this assessment could not determine from the company's answers, and each names what would resolve it.\"); absent => \"Outstanding Matters. None identified.\"}" },
      { kind: "table", text: "gap_ledger" },
    ],
  },
  {
    // Section id kept as "table_of_authorities": generate-report-pdf forces a
    // fresh page on this id across every SO spine, and the same id also
    // routes past SkeletonDocumentView.tsx's ToA-vs-plain-prose switch
    // (guarded there by block kind, not by section id alone, since the CPPA
    // Risk Appendix G build). v4.6 repurposed the section itself — the Table
    // of Authorities is gone; this is Appendix A, the factor/determination/
    // authority matrix (the same pattern used for CPPA ADMT's Appendix B and
    // CPPA Risk's Appendix G). v4.6.1 (CEO-ratified 2026-08-22) drops the
    // separate intake-data column: intake facts and report language merge
    // into one Report Determination sentence per factor, so the opener below
    // describes three columns, not four.
    id: "table_of_authorities",
    title: "Appendix A — Factor, Determination, and Authority Matrix",
    blocks: [
      // v4.6.2 — the final sentence ("Internal field keys, variable names,
      // and reasoning traces are never printed…") was internal product
      // documentation, not customer prose; dropped.
      // BATCH 19b (v4.7, doc 113 S4.2): the WP248 sentence moved here
      // VERBATIM from the Executive Summary's statutory frame.
      { kind: "skeleton", text: "This appendix is a factor-by-factor audit trail for the material determinations in this DPIA. Each row states the factor assessed, the report's determination on that factor, and the primary legal authority that governs it. Every determination is drawn from the analysis already presented in this report, so nothing here is a new conclusion. The EDPB-endorsed WP248 rev.01 criteria and applicable supervisory-authority lists may identify additional processing likely to present high risk." },
      // {{DERIVED.factor_input_determination_authority_matrix}}, assembled in
      // dpia-skeleton-assemble.ts from the same composed values/tables that
      // already render in the body -- no new legal content, no new intake or
      // output variable. A row suppressed here means the underlying factor
      // did not compose for this document (no-padding law).
      { kind: "table", text: "factor_authority_matrix" },
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
 * v4.6 SPINE HASH — SHA-256 over `serializeDpiaSpine()`. This is the shipped
 * byte-pin. Recomputed and re-ratified on every ratified spine change; a drift
 * is a HARD STOP, not a fix-up.
 */
export const DPIA_SPINE_HASH_V46 =
  "2c8c607725ca0094f22a3ec1ed8930deff4875313bb40d84f425b384c56204bf";

/** v4.6.1 spine hash — retained for the audit trail. */
export const DPIA_SPINE_HASH_V461 =
  "759ed3f3555d9039961c3de736bdc0469c4fc5e5da32a1805a9b8fde0faa4075";

/** v4.6.2 spine hash — retained for the audit trail. */
export const DPIA_SPINE_HASH_V462 =
  "2a384cc03a59c3aaa2df66dd34885b1da4450ac2e555175228027f4049d76132";

/** v4.7 spine hash — BATCH 19b (doc 113 Part D): the Executive Summary
 * reordered determination-first, its statutory frame cut, and the WP248
 * sentence moved to the Appendix A intro (method verified by reproducing
 * the v4.6.2 value first). Retained for the audit trail. */
export const DPIA_SPINE_HASH_V47 =
  "dbd7036915ff12a7694d762990884acd17c32bc5a5aaa6bcd324e9c1fcbce6ee";

/** v4.8 spine hash — BATCH 21a (Wave C5, doc 113 S7.2, doc 109 §1.6): the
 * subtitle (both EU and UK forms) and all seven Section titles' spaced
 * hyphens became em dashes. Basis-v1 (skeleton-block text only) is
 * UNCHANGED by this edit, confirming titles carry no fixed prose; only the
 * basis-v2 full serialization (which embeds title text) moves. Method
 * verified by reproducing the v4.7 value first. */
export const DPIA_SPINE_HASH =
  "2e71661a3f2b46dc6f640217e93782a403aed455fa2836fa082e82bdeb724549";

/** The v4.5.1 spine under basis v2 — retained for the audit trail. */
export const DPIA_SPINE_HASH_V451 =
  "6260f748f34385573e32dc4e5c32d97e1ef52938dad3127ec041573e72541960";

/** The v4.5 spine under basis v2 — retained for the audit trail. */
export const DPIA_SPINE_HASH_V45 =
  "bcfc3c514767ea0f653af7b89951a76ab7b901ed6dc3517537fc5bf1a88baab6";

/** The v4.4 spine under basis v2 — retained for the audit trail. */
export const DPIA_SPINE_HASH_V44 =
  "ca79e31fdec77b47f0da56cdb6655295fdd877460db51f070d39b15237eb1210";

/** The v4.3 spine under basis v2 — retained for the audit trail. */
export const DPIA_SPINE_HASH_V43 =
  "a773b8f93a77ee53682206a823b881ed0fef412de1254b2edd1fc2ca2a7942b1";

/** The v4.2 spine under basis v2 — retained for the audit trail. */
export const DPIA_SPINE_HASH_V42 =
  "fe0ced551e06dddd0444feb7834dd4911b63f83b52198090cd1cd95e86a76190";

/** The v4.1 spine under basis v2 — retained for the audit trail. */
export const DPIA_SPINE_HASH_V41 =
  "55fad638b771095e83cf1b85b0af38b9c58e6fb1646da017a4153f2e95853cba";
