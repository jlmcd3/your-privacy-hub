// ITEM SO-2 — SPECIFIED OUTPUT ENCODE: ADMT Compliance Assessment.
//
// RENDER LAW. The CEO-ratified v3 counsel-register skeleton
// `ADMT_Compliance_Assessment_Skeleton_v3_CORRECTED_2026-08-10.docx` — the
// 2026-08-10 correction that DROPS the `{systemPurpose}` slot (the SO-2 step-0
// stop; `system_description` already carries that ground) — is this product's
// render law. Every string in ADMT_SKELETON_SECTIONS below is transcribed
// BYTE-FOR-BYTE from that file. Nothing here may be reworded, re-punctuated or
// "improved" by code, by refinement, or by an agent: the skeleton's fixed prose
// is a protected leaf (splice-barred) and the conformance check byte-matches
// the assembled document against it outside the slots.
//
// Block kinds:
//   "skeleton"    — FIXED PROSE. Byte-pinned. Slots inside {braces} are the
//                   only mutable spans; the rest is law.
//   "lead"        — [DETERMINATION LEAD]: exactly one generated sentence,
//                   bound to its typed determination. A lead may NOT disagree
//                   with the determination it leads (coherence assert).
//   "generated"   — [GENERATED]: counsel-voice prose under the ATTRIBUTION
//                   RULE; every factual clause names its source.
//   "rule"        — a deterministic assembly rule, not printed prose.
//
// The v3 ADMT skeleton carries NO standalone [CONDITIONAL] paragraph: both of
// its conditionals (NOTICE_PURPOSE_SENTENCE, EXCEPTION_SENTENCE) live INSIDE
// fixed prose as conditional slots with their own fixed first words and their
// own absent-branch — omitted entirely where the trigger fails, never padded,
// never announced.

export const ADMT_SKELETON_VERSION = "prose-plans-2026-08-10-item-so2";
export const ADMT_SKELETON_SOURCE_FILE =
  "ADMT_Compliance_Assessment_Skeleton_v3_CORRECTED_2026-08-10.docx";
export const ADMT_SKELETON_PROVENANCE =
  "ADMT_Compliance_Assessment_Skeleton_v3_CORRECTED_2026-08-10.docx — panel-delegated approval per CEO delegation 2026-08-06";
/** SHA-256 over the skeleton's paragraph text, newline-joined, in file order. */
export const ADMT_SKELETON_CONTENT_HASH =
  "bf12a8bbd882465296823072f3a58c7aad2dfda0f35fdead65f433507ecf8088";

export const ADMT_SKELETON_TITLE = "ADMT COMPLIANCE ASSESSMENT";
export const ADMT_SKELETON_SUBTITLE =
  "Prepared under 11 CCR Sections 7220-7222 for {organizationName}";
/** The v3 register guide, verbatim. Authoring law; never printed to a customer. */
export const ADMT_REGISTER_GUIDE = "Register guide (v3 - CEO-ratified counsel register, senior privacy lawyers with the professors editing) - Fixed prose is a lawyer's client document: full flowing sentences, measured connectives, the law stated plainly and applied. The company's facts are always attributed (\"{org} has indicated that ...\", \"the company has described ...\") - \"the record shows\" and its family are banned. No dramatization, no rhetorical questions, no self-narration. Facts enter only through {slots} and [GENERATED] blocks under the ATTRIBUTION RULE: every factual clause names its source and traces to an intake answer or typed analysis; coverage, CSC and refinement police this mechanically. Statutory sentences in fixed prose are registry-verified at encode time. Slot notation: {field - rule}.";

export type AdmtSkeletonBlockKind = "skeleton" | "lead" | "generated" | "rule";

export interface AdmtSkeletonBlock {
  readonly kind: AdmtSkeletonBlockKind;
  readonly text: string;
}

export interface AdmtSkeletonSection {
  readonly id: string;
  readonly title: string;
  readonly blocks: readonly AdmtSkeletonBlock[];
}

export const ADMT_SKELETON_SECTIONS: readonly AdmtSkeletonSection[] = [
  {
    id: "executive_summary",
    title: "Executive Summary",
    blocks: [
      { kind: "lead", text: "[DETERMINATION LEAD] One sentence stating whether the company's use of the system for the decisions at issue meets the ADMT requirements on its answers." },
      { kind: "skeleton", text: "California regulates the use of automated decisionmaking technology in significant decisions concerning consumers. {organizationName} has indicated that it uses {systemName}, {SYSTEM_TYPE_PHRASE - reader label}, which it describes as follows: {systemDescription - own sentence}, and identifies the decision domains in which it participates as {decisionDomains - reader labels as prose}." },
      { kind: "generated", text: "[GENERATED] Three sentences in counsel's voice: the posture across the three duty families - notice, opt-out and appeal, access - with the decisive fact for each." },
    ],
  },
  {
    id: "applicability",
    title: "I. Applicability",
    blocks: [
      { kind: "lead", text: "[DETERMINATION LEAD] One sentence stating whether the regulation applies and by which limb." },
      { kind: "generated", text: "[GENERATED] The applicability analysis from the typed determination, attributed to the company's answers; pinpoints registry-sourced." },
    ],
  },
  {
    id: "pre_use_notice",
    title: "II. Pre-use Notice",
    blocks: [
      { kind: "lead", text: "[DETERMINATION LEAD] One sentence stating whether the pre-use notice duty is discharged." },
      { kind: "skeleton", text: "The company delivers its pre-use notice {NOTICE_DELIVERY_PHRASE - reader label rendered adverbially}. {NOTICE_PURPOSE_SENTENCE - conditional on noticeHasSpecificPurpose: \"The notice states the specific purpose in these terms: \" + noticePurposeText quoted and attributed; negative => the honest sentence that the notice does not yet state a specific purpose}." },
      { kind: "generated", text: "[GENERATED] Notice-content findings against the enumerated elements; each element's citation resolves from the finding, and any action derived from a finding inherits that finding's pinpoint." },
    ],
  },
  {
    id: "opt_out_appeal",
    title: "III. Opt-Out and Human Appeal",
    blocks: [
      { kind: "lead", text: "[DETERMINATION LEAD] One sentence stating the opt-out and appeal posture." },
      { kind: "skeleton", text: "{OPT_OUT_SENTENCE - the company's recorded opt-out position, attributed}. {EXCEPTION_SENTENCE - conditional on optOutException: \"The company claims the \" + exception reader label + \" exception; where that exception depends on a human appeal, the company describes its appeal process as \" + optOutAppealProcess + \".\"; absent => omitted}." },
      { kind: "generated", text: "[GENERATED] The findings under the opt-out provisions, including the exception analysis where claimed, attributed throughout." },
    ],
  },
  {
    id: "access_explanation",
    title: "IV. Access and Explanation",
    blocks: [
      { kind: "lead", text: "[DETERMINATION LEAD] One sentence stating whether access responses deliver what the regulation requires." },
      { kind: "skeleton", text: "The company has indicated that consumers may submit access requests {accessSubmissionMethods - as prose, adverbially}, that requests are verified by {accessVerificationProcess - own clause}, and that responses issue within {accessResponseTimeline}. In an access response, the company explains the system's logic in these terms: {accessLogicDisclosure - own sentence, attributed}; and the decision's outcome in these: {accessOutcomeDisclosure - own sentence, attributed}." },
      { kind: "generated", text: "[GENERATED] The access-rights findings; authorities outside the verified range ship as duty stated with pinpoint withheld, per the verified-range rule." },
    ],
  },
  {
    id: "findings_actions",
    title: "V. Findings and Recommended Actions",
    blocks: [
      { kind: "lead", text: "[DETERMINATION LEAD] One sentence stating the overall determination." },
      { kind: "generated", text: "[GENERATED] Priority actions from the typed records via the canonical formatter - finding-derived actions inherit their finding's pinpoint; the top-three actions render as shipped." },
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
export const ADMT_PROTECTED_FIXED_PROSE: readonly string[] = ADMT_SKELETON_SECTIONS
  .flatMap((s) => s.blocks)
  .filter((b) => b.kind === "skeleton")
  .map((b) => b.text);

/**
 * v3 REGISTER BANS — the attribution voice is law: the company's facts are
 * attributed to the company, never to "the record".
 */
export const ADMT_V3_BANNED_REGISTER: readonly string[] = [
  "the record shows",
  "the record reflects",
  "the record indicates",
  "the record demonstrates",
  "the record establishes",
  "on this record",
  "as the record makes clear",
];

/**
 * The conditional slots the v3 ADMT skeleton carries INSIDE its fixed prose:
 * each with its trigger, its fixed first words, and its absent branch.
 */
export interface AdmtInlineConditional {
  readonly slot: string;
  readonly trigger: string;
  readonly fixed_first_words: string;
  readonly absent: string;
}

export const ADMT_INLINE_CONDITIONALS: readonly AdmtInlineConditional[] = [
  {
    slot: "NOTICE_PURPOSE_SENTENCE",
    trigger: "notice_has_specific_purpose",
    fixed_first_words: "The notice states the specific purpose in these terms: ",
    absent: "the honest sentence that the notice does not yet state a specific purpose",
  },
  {
    slot: "EXCEPTION_SENTENCE",
    trigger: "opt_out_exception",
    fixed_first_words: "The company claims the ",
    absent: "omitted",
  },
];

/**
 * The lawyer-flagged verification set: every statutory pinpoint that appears in
 * the skeleton's FIXED prose (including the subtitle), with the corpus row that
 * must support it.
 */
export interface AdmtSkeletonPinpoint {
  readonly pinpoint: string;
  readonly corpus_key: string;
  /** A substring that must appear in the corpus row's verbatim excerpt. */
  readonly supports: string;
}

export const ADMT_SKELETON_PINPOINTS: readonly AdmtSkeletonPinpoint[] = [
  { pinpoint: "Section 7220", corpus_key: "cppa-7220",
    supports: "Pre-use Notice" },
  { pinpoint: "Section 7221", corpus_key: "cppa-7221",
    supports: "Requests to Opt-Out of ADMT" },
  { pinpoint: "Section 7222", corpus_key: "cppa-7222",
    supports: "Requests to Access ADMT" },
];

/**
 * TABLE OF AUTHORITIES — deterministic assembly rule, verbatim from the
 * skeleton. An authority appears iff it is cited in the assembled document.
 */
export const ADMT_TOA_RULE = "Assembled deterministically from the document's citation ledger: an authority appears here if and only if it is cited above, with pinpoints consolidated and section back-references. Grouped in brief order - Regulations; Statutes; Guidance and Persuasive Authority (labelled persuasive, never binding). Source links deferred.";
export const ADMT_TOA_GROUPS: readonly string[] = [
  "Regulations",
  "Statutes",
  "Guidance and Persuasive Authority",
];
