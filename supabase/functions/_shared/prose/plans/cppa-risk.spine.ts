// ITEM SO-1 — SPECIFIED OUTPUT ENCODE: CPPA Risk Assessment.
//
// RENDER LAW. The CEO-ratified v3 counsel-register skeleton
// `CPPA_Risk_Assessment_Skeleton_v3.docx` (current set: the 2026-08-10
// resupply carrying the Section 7152(a)(7) correction) is this product's
// render law. Every string in SKELETON_SECTIONS below is transcribed
// BYTE-FOR-BYTE from that file. Nothing here may be reworded, re-punctuated
// or "improved" by code, by refinement, or by an agent: the skeleton's fixed
// prose is a protected leaf (splice-barred) and the conformance check
// byte-matches the assembled document against it outside the slots.
//
// Block kinds:
//   "skeleton"    — FIXED PROSE. Byte-pinned. Slots inside {braces} are the
//                   only mutable spans; the rest is law.
//   "lead"        — [DETERMINATION LEAD]: exactly one generated sentence,
//                   bound to its typed determination. A lead may NOT disagree
//                   with the determination it leads (coherence assert).
//   "generated"   — [GENERATED]: counsel-voice prose under the ATTRIBUTION
//                   RULE; every factual clause names its source.
//   "conditional" — [CONDITIONAL]: renders only when its trigger holds, with
//                   the skeleton's fixed first words; otherwise omitted
//                   entirely (never padded, never announced).
//   "rule"        — a deterministic assembly rule, not printed prose.
//
// Provenance of the approval act: `prose_document_plans` row
// 5f1ef353-39e8-4b1c-bff5-779bab03be4b, superseded at SO-1 with
// "panel-delegated approval per CEO delegation 2026-08-06".

export const RISK_SKELETON_VERSION = "prose-plans-2026-08-10-item-so1";
export const RISK_SKELETON_SOURCE_FILE = "CPPA_Risk_Assessment_Skeleton_v3.docx";
export const RISK_SKELETON_PROVENANCE =
  "CPPA_Risk_Assessment_Skeleton_v3.docx — panel-delegated approval per CEO delegation 2026-08-06";
/** SHA-256 over the skeleton's paragraph text, newline-joined, in file order. */
export const RISK_SKELETON_CONTENT_HASH =
  "f0276a8e4768020169d08c28aba3b25d72327194804c1001d0c226b7501213a9";

export const RISK_SKELETON_TITLE = "CPPA PRIVACY RISK ASSESSMENT";
export const RISK_SKELETON_SUBTITLE = "Prepared under 11 CCR Sections 7150-7157 for {entityName}";
/** The v3 register guide, verbatim. Authoring law; never printed to a customer. */
export const RISK_REGISTER_GUIDE = "Register guide (v3 - CEO-ratified counsel register, senior privacy lawyers with the professors editing) - Fixed prose is a lawyer's client document: full flowing sentences, measured connectives, the law stated plainly and applied. The company's facts are always attributed (\"{org} has indicated that ...\", \"the company has described ...\") - \"the record shows\" and its family are banned. No dramatization, no rhetorical questions, no self-narration. Facts enter only through {slots} and [GENERATED] blocks under the ATTRIBUTION RULE: every factual clause names its source and traces to an intake answer or typed analysis; coverage, CSC and refinement police this mechanically. Statutory sentences in fixed prose are registry-verified at encode time. Slot notation: {field - rule}.";

export type SkeletonBlockKind =
  | "skeleton"
  | "lead"
  | "generated"
  | "conditional"
  | "rule";

export interface SkeletonBlock {
  readonly kind: SkeletonBlockKind;
  readonly text: string;
}

export interface SkeletonSection {
  readonly id: string;
  readonly title: string;
  readonly blocks: readonly SkeletonBlock[];
}

export const SKELETON_SECTIONS: readonly SkeletonSection[] = [
  {
    id: "executive_summary",
    title: "Executive Summary",
    blocks: [
      { kind: "lead", text: "[DETERMINATION LEAD] One sentence stating the conclusion of the Section 7152(a) and Section 7154(a) weighing as a finding - or the honest negative, or the not-determinable form naming the unanswered element." },
      { kind: "skeleton", text: "California requires a business to complete a risk assessment before undertaking processing that presents significant risk to consumers' privacy, and to weigh the benefits of that processing against its potential negative impacts. {entityName} has undertaken that assessment for the activity described below. The analysis proceeds from the company's own account of the activity, through the personal information it involves and the impacts it could have, to the weighing that Section 7152(a) and Section 7154(a) require; the conclusions reached rest on the facts the company has provided and on the cited regulatory text, and on nothing else." },
      { kind: "generated", text: "[GENERATED] Three to five sentences completing the summary in counsel's voice: the triggers that bring the activity within the regulation, the principal benefit the company has identified, the most significant risk found on analysis, and the safeguard posture. ATTRIBUTION RULE applies to every factual clause; no restatement of the lead." },
    ],
  },
  {
    id: "activity_under_assessment",
    title: "I. The Activity Under Assessment",
    blocks: [
      { kind: "skeleton", text: "{entityName} has identified the activity under assessment as {primaryActivityName - noun phrase}. The company has described the purpose of this activity as {primaryActivityPurpose - rendered as its own clause}, and the description that follows in this assessment is drawn from its submission." },
      { kind: "conditional", text: "[CONDITIONAL] SECONDARY USES - trigger {hasSecondaryUses}=Yes: fixed first words \"The company has further indicated that the same information serves additional purposes.\" followed by each further use, attributed. Absent => omitted." },
    ],
  },
  {
    id: "applicability",
    title: "II. Applicability of the Risk-Assessment Requirement",
    blocks: [
      { kind: "lead", text: "[DETERMINATION LEAD] One sentence identifying which processing triggers under Section 7150(b) are engaged on the company's answers." },
      { kind: "skeleton", text: "Section 7150(b) enumerates the categories of processing that require a risk assessment. Whether this activity falls within any of them is determined by the company's own responses, which are applied to each trigger in turn below; where a trigger is not engaged, that conclusion is stated with the same precision as where one is." },
      { kind: "generated", text: "[GENERATED] Per-trigger analysis from the typed trigger determinations, engaged and not-engaged both treated, each attributed to the company's answers; pinpoints registry-sourced." },
    ],
  },
  {
    id: "personal_information",
    title: "III. The Personal Information Involved",
    blocks: [
      { kind: "lead", text: "[DETERMINATION LEAD] One sentence characterising the information at issue - its categories, scale, and the parties who receive it." },
      { kind: "skeleton", text: "{entityName} has indicated that the activity processes {i1bMinPi - reader labels woven into the sentence}, collected from {i4bSources - as prose}. The company discloses this information to {i4Disclosures - recipients as prose}, and estimates that approximately {i3CaConsumerBand - band rendered as prose} California consumers are affected. With respect to retention, the company has indicated that {RETENTION_CLAUSE - from i2RetentionPeriod where fixed: \"it retains the information for \" + period; otherwise: \"retention is governed by \" + i2RetentionCriteria rendered as prose}. {RETENTION_DETAIL_SENTENCE - from i2RetentionDetail, attributed; absent => omitted}." },
    ],
  },
  {
    id: "necessity_minimisation",
    title: "IV. Necessity and Minimisation",
    blocks: [
      { kind: "lead", text: "[DETERMINATION LEAD] One sentence stating whether the processing is confined to what the identified purpose requires." },
      { kind: "skeleton", text: "A stated purpose justifies only the processing necessary to achieve it. The company's submission addresses that requirement element by element, and the analysis below considers whether each category of information collected is supported by the need the company has articulated for it." },
      { kind: "generated", text: "[GENERATED] The necessity analysis from the typed a2 operands: each element with the company's stated justification, in prose where four or fewer elements, in a table where more; any element for which the company offered no justification is identified as unsupported rather than assumed." },
    ],
  },
  {
    id: "impacts_safeguards",
    title: "V. Potential Negative Impacts and Safeguards",
    blocks: [
      { kind: "lead", text: "[DETERMINATION LEAD] One sentence identifying the most significant realistic impact and stating whether the recorded safeguards adequately address it." },
      { kind: "skeleton", text: "Section 7152(a)(5) requires the assessment to identify the negative impacts the processing could have on consumers, and Section 7152(a)(6) the safeguards the business will apply. The company has identified the impacts and safeguards set out below; the analysis considers the likelihood and severity of each impact in light of the corresponding safeguards, and identifies any impact for which no adequate safeguard has been recorded." },
      { kind: "generated", text: "[GENERATED] The impacts-and-safeguards analysis from the typed per-activity record: each adverse effect with its likelihood and severity, the safeguards the company has implemented against it, and any gap, all attributed; the renderer draws the table; the prose supplies the analysis. The most significant fact weighing against the ultimate conclusion must be addressed here." },
      { kind: "conditional", text: "[CONDITIONAL] ADMT - trigger {q18}=Yes: fixed first words \"Because automated decisionmaking technology participates in these decisions, additional analysis is required.\" followed by the company's accounts of the system's logic ({i5AdmtLogic}), human review ({i5AdmtHumanReview}), fairness testing ({i5AdmtFairnessTesting}), and training-data provenance ({i5AdmtTrainingSource}), each attributed and each analysed." },
    ],
  },
  {
    id: "benefits_weighing",
    title: "VI. Benefits and the Section 7152(a) and Section 7154(a) Weighing",
    blocks: [
      { kind: "lead", text: "[DETERMINATION LEAD] One sentence stating the outcome of the weighing as the assessment's finding." },
      { kind: "skeleton", text: "Section 7152(a)(4) identifies the benefits of the processing - to the business, to consumers, to other stakeholders, and to the public - and Section 7152(a) and Section 7154(a) require the business to weigh those benefits against the negative impacts identified above. {entityName} has identified the benefit to the business as {a4BenefitBusiness}, supported by {a4BenefitBusinessFact}; the benefit to consumers as {a4BenefitConsumer}, supported by {a4BenefitConsumerFact}. {OTHER_STAKEHOLDER_SENTENCE - from a4BenefitOtherStakeholders + Fact, attributed; absent => the honest absence sentence}. {PUBLIC_SENTENCE - same rule}. Each benefit and its supporting fact is stated once here; the weighing that follows refers to them without restating them." },
      { kind: "generated", text: "[GENERATED] The weighing: a two-sided analysis in counsel's voice, engaging the most significant adverse effect directly and concluding in the direction of the typed benefits-outweigh determination; the prose may not reach a different conclusion than the determination, and the document may not issue if they disagree." },
      { kind: "conditional", text: "[CONDITIONAL] EXCEPTIONS - trigger: an exception claimed in the company's exceptions responses, or an explicit statement that none is claimed. Claimed => the typed nine-leaf exception records with registry pinpoints; explicit none => one attributed sentence; neither => the section is omitted." },
    ],
  },
  {
    id: "recommended_actions",
    title: "VII. Recommended Actions",
    blocks: [
      { kind: "lead", text: "[DETERMINATION LEAD] One sentence stating the remediation posture." },
      { kind: "skeleton", text: "The actions below follow from the findings above. Each identifies the finding it addresses, carries the citation that finding carried, and names the role responsible and the applicable timeframe with its basis." },
      { kind: "generated", text: "[GENERATED] Priority actions from the typed action records via the canonical formatter - pinpoint once, owner once, deadlines with their bases, ordered by severity." },
    ],
  },
  {
    id: "accountability_certification",
    title: "VIII. Accountability and Certification",
    blocks: [
      { kind: "skeleton", text: "This assessment was prepared with contributions from {i7InternalContributors - as prose}{EXTERNAL_CLAUSE - from i7ExternalConsultees: \", together with \" + list rendered as prose; absent => omitted}. {PROVIDERS_SENTENCE - from a8InformationProviders, attributed; absent => omitted}. It is certified on behalf of {entityName} by {i8ExecName}, {i8ExecTitle}. {APPROVAL_SENTENCE - from a9 fields; absent => omitted}." },
      { kind: "conditional", text: "[CONDITIONAL] DPIA CROSS-REFERENCE - trigger {i9HasDpia}=Yes: \"A data protection impact assessment covering this activity has been completed, and the company has provided its summary: {i9DpiaSummary}.\"" },
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

/** Every byte-pinned fixed-prose string, in document order. Splice-barred. */
export const RISK_PROTECTED_FIXED_PROSE: readonly string[] = SKELETON_SECTIONS
  .flatMap((s) => s.blocks)
  .filter((b) => b.kind === "skeleton")
  .map((b) => b.text);

/**
 * v3 REGISTER BANS — extend the existing banned-register list. The attribution
 * voice is law: the company's facts are attributed to the company, never to
 * "the record".
 */
export const RISK_V3_BANNED_REGISTER: readonly string[] = [
  "the record shows",
  "the record reflects",
  "the record indicates",
  "the record demonstrates",
  "the record establishes",
  "on this record",
  "as the record makes clear",
];

/**
 * The lawyer-flagged verification set: every statutory pinpoint that appears
 * in the skeleton's FIXED prose, with the corpus row that must support it.
 * `tests/edge/so1/pinpoints.test.ts` byte-checks each against `provision_texts`.
 */
export interface SkeletonPinpoint {
  readonly pinpoint: string;
  readonly corpus_key: string;
  /** A substring that must appear in the corpus row's verbatim excerpt. */
  readonly supports: string;
}

export const RISK_SKELETON_PINPOINTS: readonly SkeletonPinpoint[] = [
  { pinpoint: "Section 7150(b)", corpus_key: "cppa-7150",
    supports: "Each of the following processing activities presents significant risk" },
  { pinpoint: "Section 7152(a)", corpus_key: "cppa-7152",
    supports: "A business must conduct a risk assessment to determine whether the risks" },
  { pinpoint: "Section 7152(a)(4)", corpus_key: "cppa-7152",
    supports: "Identify the benefits to the business, the consumer, other stakeholders" },
  { pinpoint: "Section 7152(a)(5)", corpus_key: "cppa-7152",
    supports: "Identify the negative impacts to consumers" },
  { pinpoint: "Section 7152(a)(6)", corpus_key: "cppa-7152",
    supports: "any safeguards that" },
  { pinpoint: "Section 7154(a)", corpus_key: "cppa-7154",
    supports: "The goal of a risk assessment is restricting or prohibiting the processing" },
];

/**
 * TABLE OF AUTHORITIES — deterministic assembly rule, verbatim from the
 * skeleton. An authority appears iff it is cited in the assembled document.
 */
export const RISK_TOA_RULE = "Assembled deterministically from the document's citation ledger: an authority appears here if and only if it is cited above, with pinpoints consolidated and section back-references. Grouped in brief order - Regulations; Statutes; Guidance and Persuasive Authority (labelled persuasive, never binding). Source links deferred.";
export const RISK_TOA_GROUPS: readonly string[] = [
  "Regulations",
  "Statutes",
  "Guidance and Persuasive Authority",
];
