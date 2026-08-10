// ITEM SO-5 — SPECIFIED OUTPUT ENCODE: Impact Assessment Builder (DPIA).
//
// RENDER LAW. The CEO-ratified skeleton — `Impact_Assessment_Builder_DPIA_
// Skeleton_v3.docx` as corrected on 2026-08-10 by the CEO's own single-
// paragraph edit dropping the `{dataSources}` clause (the HARD STOP
// resolution) — is this product's render law. Every string in
// DPIA_SKELETON_SECTIONS below is transcribed BYTE-FOR-BYTE from that file's
// paragraph text. Nothing here may be reworded, re-punctuated or "improved" by
// code, by refinement, or by an agent: fixed prose is a protected leaf
// (splice-barred) and conformance byte-matches the assembled document against
// it outside the slots.
//
// Block kinds:
//   "skeleton"  — FIXED PROSE. Byte-pinned; {slots} are the only mutable spans.
//   "lead"      — [DETERMINATION LEAD]: exactly one generated sentence, bound
//                 to its typed determination (`determination`,
//                 `art36_consultation`, `necessity_findings`, `risk_register`).
//                 A lead may not disagree with it.
//   "generated" — [GENERATED]: counsel-voice prose under the ATTRIBUTION RULE.
//   "rule"      — deterministic assembly rule (Table of Authorities).

export const DPIA_SKELETON_VERSION = "prose-plans-2026-08-10-item-so5";
export const DPIA_SKELETON_SOURCE_FILE =
  "Impact_Assessment_Builder_DPIA_Skeleton_v3.docx (CEO-corrected 2026-08-10: {dataSources} clause dropped)";
export const DPIA_SKELETON_PROVENANCE =
  "Impact_Assessment_Builder_DPIA_Skeleton_v3.docx, CEO correction of 2026-08-10 — panel-delegated approval per CEO delegation 2026-08-06";

/**
 * SHA-256 over the CORRECTED skeleton's paragraph text, newline-joined, in
 * file order, computed DIRECTLY from the docx (all 22 `w:p` paragraphs, `w:t`
 * runs concatenated, XML entities unescaped, joined with "\n") — the same
 * method that produced the cppa-risk, cppa-admt, governance and cyber hashes.
 *
 * Uncorrected v3 (for the audit trail):
 *   a69298dfa38ecd72fdeed57805fbc7da78b4b820cdaffedc6d1469047ea6aea5
 */
export const DPIA_SKELETON_CONTENT_HASH =
  "ad0a012c14ca74f52f4abfe6cb3ed617415d72e705a2c4e5216453ffff46cead";

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

export type DpiaSkeletonBlockKind = "skeleton" | "lead" | "generated" | "rule";

export interface DpiaSkeletonBlock {
  readonly kind: DpiaSkeletonBlockKind;
  readonly text: string;
}

export interface DpiaSkeletonSection {
  readonly id: string;
  readonly title: string;
  readonly blocks: readonly DpiaSkeletonBlock[];
}

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
    id: "the_processing",
    title: "I. The Processing: Nature, Scope, Context and Purposes",
    blocks: [
      { kind: "skeleton", text: "The company has stated the purpose of the processing as {purpose}. It has identified the people affected as {dataSubjects - reader labels} and the categories of data as {dataCategories - reader labels}; it estimates the scale at {volume - band rendered as prose}. Its account of how the data moves through the organisation is as follows: {dataFlow - own paragraph, attributed}." },
    ],
  },
  {
    id: "lawfulness",
    title: "II. Lawfulness, Necessity and Proportionality",
    blocks: [
      { kind: "lead", text: "[DETERMINATION LEAD] One sentence stating whether necessity and proportionality are made out on the company's answers." },
      { kind: "skeleton", text: "The company relies on {LEGAL_BASIS_PHRASE - reader label} as its legal basis. {ARTICLE_9_SENTENCE - conditional on special categories: \"Because special categories of data are involved, the company relies on \" + article9Condition + \" under Article 9(2).\"; absent => omitted}. Its case on necessity and proportionality, as recorded: {necessityProportionality - own paragraph, attributed}. On minimisation, the company states {dataMinimisationJustification - attributed}{QUALITY_CLAUSE - \"; on accuracy, \" + dataQualityMeasures; absent => omitted}." },
      { kind: "generated", text: "[GENERATED] The necessity and proportionality analysis: less-intrusive-means discipline applied to the company's answers; record facts only." },
    ],
  },
  {
    id: "risks_and_measures",
    title: "III. Risks and Measures",
    blocks: [
      { kind: "lead", text: "[DETERMINATION LEAD] One sentence identifying the most significant residual risk after measures." },
      { kind: "generated", text: "[GENERATED] From the typed risk register: each risk with its likelihood and severity, the measure that answers it, and the residual position, attributed throughout; the renderer draws the table, and the prose analyses only what bears on the decision. The safeguards the company has recorded: {safeguards - as prose}." },
    ],
  },
  {
    id: "consultation_and_signoff",
    title: "IV. Consultation and Sign-off",
    blocks: [
      { kind: "skeleton", text: "The assessment was prepared by {dpiaPreparedBy}; the wider team the company has recorded is {dpiaTeam - rendered as prose}. {DPO_ADVICE_SENTENCE - conditional: the DPO's advice as recorded in dpoInfo, attributed; the negative branch is the honest sentence that DPO advice has not yet been obtained}. The contact for this assessment is {controllerContact}." },
      { kind: "lead", text: "[DETERMINATION LEAD] One sentence stating the sign-off determination with any condition attached." },
      { kind: "generated", text: "[GENERATED] The approval basis in counsel's voice: which residual risks were accepted and by whom ({dpiaApprovedByName}), with any condition; the scope note {dpiaScopeNote} and review window {endDate} where the company has recorded them." },
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
 *   Article 35 GDPR   → `gdpr-art-35`  (Art. 35(1) high-risk trigger sentence)
 *   Article 36 GDPR   → `gdpr-art-36`  (prior consultation, lead conditional)
 *   Article 9(2) GDPR → `gdpr-art-9`   (special-category condition)
 */
export const DPIA_SKELETON_PINPOINTS: readonly { readonly citation: string; readonly corpus_key: string }[] = [
  { citation: "GDPR Art. 35", corpus_key: "gdpr-art-35" },
  { citation: "GDPR Art. 36", corpus_key: "gdpr-art-36" },
  { citation: "GDPR Art. 9", corpus_key: "gdpr-art-9" },
];
