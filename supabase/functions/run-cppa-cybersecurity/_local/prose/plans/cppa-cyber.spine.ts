// ITEM SO-4 — SPECIFIED OUTPUT ENCODE: CPPA Cybersecurity Audit Readiness.
//
// RENDER LAW. The CEO-ratified skeleton `CPPA_Cybersecurity_Audit_Skeleton_v3.docx`
// (the v3, v3-2 and v3-3 resupplies are byte-identical — verified at encode
// time) is this product's render law. Every string in
// CYBER_SKELETON_SECTIONS below is transcribed BYTE-FOR-BYTE from that file's
// paragraph text. Nothing here may be reworded, re-punctuated or "improved" by
// code, by refinement, or by an agent: fixed prose is a protected leaf
// (splice-barred) and conformance byte-matches the assembled document against
// it outside the slots.
//
// Block kinds:
//   "skeleton"  — FIXED PROSE. Byte-pinned; {slots} are the only mutable spans.
//   "lead"      — [DETERMINATION LEAD]: exactly one generated sentence, bound to
//                 its typed determination (readiness_determination /
//                 control_status_counts). A lead may not disagree with it.
//   "generated" — [GENERATED]: counsel-voice prose under the ATTRIBUTION RULE.
//   "corpus"    — [BYTE-PINNED - the ITEM-204 ruling]: the § 7121(a) phase-in
//                 schedule, all three tiers, quoted from the approved
//                 `provision_texts` row `cppa-7121`. No slot, no generation, no
//                 cohort computed — the customer, with counsel, picks the tier.
//   "rule"      — deterministic assembly rule (Table of Authorities).

// v3.1 (2026-08-24, CEO report review) — adds the "Signature" section
// between Section IV (Conclusion) and the Table of Authorities: a
// not-pre-filled Name/Title/Signature/Date table with a scoping statement
// before it and a clarifying disclaimer after it. No component finding,
// determination, or intake contract changed.
//
// v3.2 (2026-08-25, Conversion C1.2) — adds ONE new `{kind:"table"}` block
// as the FIRST block of Section I ("audit_scope"), before the existing
// fixed prose: the doc-64-ratified § 7120(a)-(b) applicability table
// (computed from six new intake fields, gated behind
// CYBER_DETERMINISTIC_ENABLED — absent under the flag, per the NO-PADDING
// law in skeleton-render.ts). No new fixed prose is added (none is
// available to transcribe byte-for-byte from a ratified docx for this
// insertion; the table's own title/columns/note carry its framing,
// matching the v3.1 Signature-table precedent). The existing Section I
// skeleton prose and the byte-pinned ITEM-204 corpus block shift from
// blocks[0]/[1] to blocks[1]/[2] — their TEXT is unchanged, only their
// position, so CYBER_SKELETON_CONTENT_HASH (which hashes only `kind:
// "skeleton"` block text, in order) is unaffected and NOT recomputed.
// Deliberately does NOT touch the § 7121(a)/(b) deadline/cadence content:
// that block's own text states "No slot, no generation, no cohort
// computed" as the ITEM-204 design law, and computing a tier there would
// contradict already-shipped, CEO-ratified prose — see the intake
// contract's header comment for the full reasoning.
export const CYBER_SKELETON_VERSION = "prose-plans-2026-08-25-item-so4-v3.2";
export const CYBER_SKELETON_SOURCE_FILE = "CPPA_Cybersecurity_Audit_Skeleton_v3.docx";
export const CYBER_SKELETON_PROVENANCE =
  "CPPA_Cybersecurity_Audit_Skeleton_v3.docx — panel-delegated approval per CEO delegation 2026-08-06";

/**
 * SHA-256 over the skeleton's paragraph text, newline-joined, in file order,
 * computed DIRECTLY from the docx (all 22 `w:p` paragraphs, `w:t` runs
 * concatenated, XML entities unescaped, joined with "\n") — the same method
 * that produced the cppa-risk, cppa-admt and governance hashes.
 */
export const CYBER_SKELETON_CONTENT_HASH =
  "fd804ea63455ca8e4012da3380195c0d8cf27be65637b7aefd00bcc17306a873";

export const CYBER_SKELETON_TITLE = "CPPA CYBERSECURITY AUDIT READINESS REPORT";
export const CYBER_SKELETON_SUBTITLE = "Prepared under 11 CCR Sections 7120-7124 for {profile.entity_name}";
/** The v3 register guide, verbatim. Authoring law; never printed to a customer. */
export const CYBER_REGISTER_GUIDE = "Register guide (v3 - CEO-ratified counsel register, senior privacy lawyers with the professors editing) - Fixed prose is a lawyer's client document: full flowing sentences, measured connectives, the law stated plainly and applied. The company's facts are always attributed (\"{org} has indicated that ...\", \"the company has described ...\") - \"the record shows\" and its family are banned. No dramatization, no rhetorical questions, no self-narration. Facts enter only through {slots} and [GENERATED] blocks under the ATTRIBUTION RULE: every factual clause names its source and traces to an intake answer or typed analysis; coverage, CSC and refinement police this mechanically. Statutory sentences in fixed prose are registry-verified at encode time. Slot notation: {field - rule}.";

export type CyberSkeletonBlockKind = "skeleton" | "lead" | "generated" | "corpus" | "rule" | "table";

export interface CyberSkeletonBlock {
  readonly kind: CyberSkeletonBlockKind;
  readonly text: string;
}

export interface CyberSkeletonSection {
  readonly id: string;
  readonly title: string;
  readonly blocks: readonly CyberSkeletonBlock[];
}

export const CYBER_SKELETON_SECTIONS: readonly CyberSkeletonSection[] = [
  {
    id: "executive_summary",
    title: "Executive Summary",
    blocks: [
      { kind: "lead", text: "[DETERMINATION LEAD] One sentence stating whether the company's recorded programme is ready for the certified audit, and the posture across the eighteen components." },
      { kind: "skeleton", text: "California requires an annual cybersecurity audit, performed by a qualified and independent auditor, addressing each component of the business's cybersecurity program that the regulation enumerates. {profile.entity_name} has provided the account of its programme on which this report rests. The analysis sets that account against each required component in turn and states what a qualified auditor would find; where the company's answers leave a component unsupported, the report says so." },
      { kind: "generated", text: "[GENERATED] Three to five sentences in counsel's voice from the typed control tally: the overall posture, where the programme is strongest, where the material gaps sit. The tally itself is rendered as a typed surface; this prose states conclusions, never arithmetic." },
    ],
  },
  {
    id: "audit_scope",
    title: "I. Audit Scope and the Auditor",
    blocks: [
      // v3.2 (Conversion C1.2) — the § 7120(a)-(b) applicability table.
      // Gated behind CYBER_DETERMINISTIC_ENABLED at the assembler; absent
      // (NO-PADDING law) when the flag is off.
      { kind: "table", text: "" },
      { kind: "skeleton", text: "The company has indicated that its programme is built on {profile.framework - verbatim option value rendered in a sentence}, and that the frameworks in scope for the audit are {profile.in_scope_frameworks - as prose}. Its rationale for the audit's scope, as recorded: {profile.audit_scope_rationale - own paragraph, attributed}. As to the auditor, the company reports {AUDITOR_PHRASE - reader label from auditor_engagement_status}. {PRIOR_AUDIT_SENTENCE - from prior_audit_scope, attributed; absent => the honest sentence that no prior audit coverage was recorded}. The company reports {profile.incidents_12mo - rendered as prose} in the preceding twelve months, and that its last audit occurred {profile.last_audit - adverbial phrase}." },
      { kind: "corpus", text: "[BYTE-PINNED - the ITEM-204 ruling] The certification phase-in schedule is stated as law, all three tiers, corpus-quoted from the verified Section 7121 row; the company, in consultation with counsel, determines which tier its revenue places it in. No slot, no generation, no cohort computed." },
    ],
  },
  {
    id: "required_components",
    title: "II. The Required Components",
    blocks: [
      { kind: "lead", text: "[DETERMINATION LEAD] One sentence stating how many components the company's answers support and where the material gaps lie." },
      { kind: "generated", text: "[GENERATED] Per-component findings from the typed controls array, each attributed to the company's answers - status, the evidence the company holds, the finding, and the remediation where one is needed. The renderer draws the table; comparative-framework references remain orientation only, with the operative requirement always the cited regulation." },
    ],
  },
  {
    id: "findings_remediation",
    title: "III. Findings, Gaps and Remediation",
    blocks: [
      { kind: "lead", text: "[DETERMINATION LEAD] One sentence stating the remediation posture." },
      { kind: "skeleton", text: "The gaps identified above resolve into the actions below. Each action names the component it addresses, the role responsible, and its timeframe; priority labels express operational urgency only, and remediation timing is tied where relevant to the applicable certification tier rather than to any invented deadline." },
      { kind: "generated", text: "[GENERATED] Gap-by-gap remediation from the typed findings, attributed and concrete." },
    ],
  },
  {
    id: "conclusion",
    title: "IV. Conclusion",
    blocks: [
      { kind: "lead", text: "[DETERMINATION LEAD] One sentence stating the audit-readiness conclusion with any condition attached." },
      { kind: "generated", text: "[GENERATED] Counsel's closing analysis, ending on the single next act." },
    ],
  },
  // CEO report review 2026-08-24 — a blank, NOT pre-filled signature page,
  // positioned before the Table of Authorities. Deliberately does not use
  // "certification" or "attestation": neither the § 7123(e)(8) auditor
  // statement nor the § 7124 executive certification can be produced by a
  // self-reported readiness tool (see the discussion this section closes
  // out — § 7122(d) requires findings to rest primarily on evidence an
  // auditor reviewed, not on the company's own assertions). This
  // signature acknowledges the information above; it is not that
  // certification.
  {
    id: "signature",
    title: "Signature",
    blocks: [
      { kind: "skeleton", text: "This information is provided for the purposes of a cybersecurity audit as required pursuant to 11 CCR §§ 7120-7124." },
      { kind: "table", text: "" },
      { kind: "skeleton", text: "This signature acknowledges the information above, and is not the certification described in 11 CCR § 7124." },
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
export const CYBER_PROTECTED_FIXED_PROSE: readonly string[] = CYBER_SKELETON_SECTIONS
  .flatMap((s) => s.blocks)
  .filter((b) => b.kind === "skeleton")
  .map((b) => b.text);

/**
 * v3 REGISTER BANS — the attribution voice is law: the company's facts are
 * attributed to the company, never to "the record".
 */
export const CYBER_V3_BANNED_REGISTER: readonly string[] = [
  "the record shows",
  "the record reflects",
  "the record indicates",
  "the record demonstrates",
  "the record establishes",
  "on this record",
  "as the record makes clear",
];

/**
 * The conditional slot the v3 cyber skeleton carries INSIDE its fixed prose,
 * with its trigger, its fixed first words, and its absent branch.
 */
export const CYBER_INLINE_CONDITIONALS = [
  {
    slot: "PRIOR_AUDIT_SENTENCE",
    trigger: "profile.prior_audit_scope",
    fixed_first_words: "The company has described the coverage of its prior audit as ",
    absent: "the honest sentence that no prior audit coverage was recorded",
  },
] as const;

/**
 * The lawyer-flagged verification set: every statutory pinpoint appearing in
 * the skeleton's FIXED prose (including the subtitle and the byte-pinned
 * corpus block), with the corpus row that must support it.
 */
export interface CyberSkeletonPinpoint {
  readonly pinpoint: string;
  readonly corpus_key: string;
  /** A substring that must appear in the corpus row's verbatim excerpt. */
  readonly supports: string;
}

export const CYBER_SKELETON_PINPOINTS: readonly CyberSkeletonPinpoint[] = [
  { pinpoint: "11 CCR § 7120", corpus_key: "cppa-7120", supports: "7120" },
  { pinpoint: "11 CCR § 7121", corpus_key: "cppa-7121", supports: "April 1, 2028" },
  { pinpoint: "11 CCR § 7122", corpus_key: "cppa-7122", supports: "qualified, objective, independent" },
  { pinpoint: "11 CCR § 7123", corpus_key: "cppa-7123", supports: "7123" },
  { pinpoint: "11 CCR § 7124", corpus_key: "cppa-7124", supports: "7124" },
];

/** The corpus row the [BYTE-PINNED] block quotes. ITEM-204: no paraphrase. */
export const CYBER_PHASE_IN_CORPUS_KEY = "cppa-7121";
