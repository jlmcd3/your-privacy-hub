// ITEM SO-8 — SPECIFIED OUTPUT ENCODE: DPA / AI Act Registration Assessment.
//
// RENDER LAW. The CEO-ratified counsel-register skeleton
// `DPA_AI_Act_Registration_Assessment_Skeleton_v3.docx` — the Aug-10 file that
// carries the 428-D named-actor correction at paragraph 16, ruled governing by
// the CEO on 2026-08-10 (the Aug-9 upload is stale and superseded) — is this
// product's render law. Every string below is transcribed BYTE-FOR-BYTE from
// that file's paragraph text. Nothing here may be reworded, re-punctuated or
// "improved" by code, by refinement, or by an agent: fixed prose is a
// protected leaf (splice-barred) and conformance byte-matches the assembled
// document against it outside the slots.
//
// THE DETERMINISTIC PRODUCT. Registration carries NO model slots. Every
// [DETERMINATION LEAD] and [GENERATED] block is composed deterministically
// from the typed determinations the pipeline already persists
// (`registration_deliverables`, `obligations_summary`, `authority_exhibit`).
// The coherence law still applies: a lead may never disagree with the typed
// determination it is bound to.
//
// PINPOINTS. This skeleton's fixed prose carries ZERO statutory pinpoints —
// no citation appears in any paragraph. Statutory content enters at runtime
// from the corpus-pinned duty registry, which the item413 reference-passage
// battery already byte-checks against `provision_texts`. There is therefore
// nothing to encode as a pinned pinpoint constant for this product (CEO
// confirmation, 2026-08-10).
//
// Block kinds:
//   "skeleton"    — FIXED PROSE. Byte-pinned; {slots} are the only mutable spans.
//   "lead"        — [DETERMINATION LEAD]: exactly one deterministic sentence,
//                   bound to the typed determination. It may not disagree with it.
//   "generated"   — [GENERATED]: counsel-voice prose under the ATTRIBUTION RULE,
//                   composed deterministically from typed surfaces.
//   "conditional" — [CONDITIONAL]: renders only when its trigger fires.
//   "rule"        — authoring/assembly directive ([BYTE-PINNED], Table of
//                   Authorities). Never printed unless the composer supplies
//                   deterministic content for it.

export const REGISTRATION_SKELETON_VERSION = "prose-plans-2026-08-30-leak-corpus-framing-repin";
export const REGISTRATION_SKELETON_SOURCE_FILE =
  "DPA_AI_Act_Registration_Assessment_Skeleton_v3.docx (Aug-10 governing copy, carrying the 428-D named-actor correction at paragraph 16)";
export const REGISTRATION_SKELETON_PROVENANCE =
  "DPA_AI_Act_Registration_Assessment_Skeleton_v3.docx — panel-delegated approval per CEO delegation 2026-08-06";

/**
 * SHA-256 over the governing skeleton's paragraph text, newline-joined, in
 * file order, computed DIRECTLY from the docx bytes (all 19 `w:p` paragraphs,
 * `w:t` runs concatenated, XML entities unescaped, joined with "\n").
 * CEO-confirmed 2026-08-10.
 *
 * The stale Aug-9 pre-correction upload, for the audit trail only:
 *   eb09f4e9f71bb42977a177e3b5bb7b967b57ce23e283aa61225ec0b358fcc0c0
 *
 * RE-PIN 2026-08-30 (expert-panel LEAK-1, CEO fix-campaign mandate): the
 * byte-pinned corpus framing note said "this product's verified corpus" —
 * product jargon in the customer document — and now reads "the verified
 * corpus behind this assessment". Nothing else changed. Prior pin:
 * 2dedc8dadf458a8c1e969a570cb10ebdc3ce5519cb49f4ee6016bf5d6ed64118.
 */
export const REGISTRATION_SKELETON_CONTENT_HASH =
  "9ebf8a9cddc6ebc970f27ceb587ef6688bd63ea2bd329f129200ae1c88bc4af2";

export const REGISTRATION_SKELETON_TITLE = "REGISTRATION ASSESSMENT";
export const REGISTRATION_SKELETON_SUBTITLE =
  "Data-broker, supervisory-authority and AI Act filing review, prepared for {organizationName}";

/** The v3 register guide, verbatim. Authoring law; never printed to a customer. */
export const REGISTRATION_REGISTER_GUIDE =
  "Register guide (v3 - CEO-ratified counsel register, senior privacy lawyers with the professors editing) - Fixed prose is a lawyer's client document: full flowing sentences, measured connectives, the law stated plainly and applied. The company's facts are always attributed (\"{org} has indicated that ...\", \"the company has described ...\") - \"the record shows\" and its family are banned. No dramatization, no rhetorical questions, no self-narration. Facts enter only through {slots} and [GENERATED] blocks under the ATTRIBUTION RULE: every factual clause names its source and traces to an intake answer or typed analysis; coverage, CSC and refinement police this mechanically. Statutory sentences in fixed prose are registry-verified at encode time. Slot notation: {field - rule}.";

/**
 * BYTE-PINNED corpus-only framing sentence (second sentence of the Executive
 * Summary fixed-prose paragraph). It is printed to the customer verbatim,
 * without the authoring marker, and may never be reworded.
 */
export const REGISTRATION_CORPUS_FRAMING_NOTE =
  "Every determination below rests on the statutes in the verified corpus behind this assessment and on nothing else.";

/**
 * The item413 register carries: the banned "on this record" family is checked
 * against the assembled body, lower-cased.
 */
export const REGISTRATION_V3_BANNED_REGISTER: readonly string[] = [
  "the record shows",
  "on this record",
  "the record reflects",
  "the record demonstrates",
  "as the record makes clear",
];

export type RegistrationSkeletonBlockKind =
  | "skeleton"
  | "lead"
  | "generated"
  | "conditional"
  | "rule";

export interface RegistrationSkeletonBlock {
  readonly kind: RegistrationSkeletonBlockKind;
  readonly text: string;
}

export interface RegistrationSkeletonSection {
  readonly id: string;
  readonly title: string;
  readonly blocks: readonly RegistrationSkeletonBlock[];
}

export const REGISTRATION_SKELETON_SECTIONS: readonly RegistrationSkeletonSection[] = [
  {
    id: "executive_summary",
    title: "Executive Summary",
    blocks: [
      { kind: "lead", text: "[DETERMINATION LEAD] One sentence stating how many registration duties attach on the company's answers and how many are presently satisfied." },
      { kind: "skeleton", text: "{organizationName}, operating in {sector - reader label} at a size of {orgSize - band as prose}, has indicated that it operates across {jurisdictions - as prose} and processes {dataTypes - reader labels}." },
      { kind: "rule", text: "[BYTE-PINNED] Every determination below rests on the statutes in the verified corpus behind this assessment and on nothing else." },
      { kind: "generated", text: "[GENERATED] The filing posture in two to three sentences: duties attached, satisfied, and open, attributed." },
    ],
  },
  {
    id: "data_broker_registration",
    title: "I. Data Broker Registration",
    blocks: [
      { kind: "lead", text: "[DETERMINATION LEAD] One sentence stating whether data-broker registration duties attach and in which states." },
      { kind: "conditional", text: "[CONDITIONAL] Trigger - broker activity recorded in {dataBrokerDetail}: each state's duty stated from its verified passage, with the company's position set beside it; where no broker activity is recorded, one honest sentence says that no such duty attaches on the company's answers." },
      { kind: "generated", text: "[GENERATED] The per-jurisdiction analysis from the typed determinations; fees and deadlines appear only from registry rows." },
    ],
  },
  {
    id: "supervisory_and_ai_act",
    title: "II. Supervisory-Authority and AI Act Registrations",
    blocks: [
      { kind: "lead", text: "[DETERMINATION LEAD] One sentence stating the EU, UK and AI Act filing posture." },
      { kind: "generated", text: "[GENERATED] The determinations for each recorded establishment and market, in counsel's voice: representative duties, surviving notification duties, and AI Act provider or deployer registrations per the company's recorded AI answers; each duty from its verified passage; where the intake does not collect a fact a determination needs, the assessment says what is missing rather than assuming it." },
    ],
  },
  {
    id: "filing_readiness",
    title: "III. Filing Readiness",
    blocks: [
      { kind: "lead", text: "[DETERMINATION LEAD] One sentence stating what stands between the company's answers and complete filings." },
      { kind: "generated", text: "[GENERATED] The readiness findings: each open duty with the company's recorded state and what closes it, naming the specific responsible party the record supplies rather than an unnamed role (the 428-D named-actor law); the attestation from the typed block." },
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
 * The governing skeleton's 19 paragraphs, in file order, exactly as the docx
 * carries them. The content hash above is SHA-256 over these joined with "\n".
 * Paragraph 5 is split across two spine blocks (fixed prose + the byte-pinned
 * framing note), so it is reassembled here in file form.
 */
export const REGISTRATION_SKELETON_PARAGRAPHS: readonly string[] = [
  "REGISTRATION ASSESSMENT",
  "Data-broker, supervisory-authority and AI Act filing review, prepared for {organizationName}",
  REGISTRATION_REGISTER_GUIDE,
  "Executive Summary",
  "[DETERMINATION LEAD] One sentence stating how many registration duties attach on the company's answers and how many are presently satisfied.",
  `${REGISTRATION_SKELETON_SECTIONS[0].blocks[1].text} ${REGISTRATION_SKELETON_SECTIONS[0].blocks[2].text}`,
  "[GENERATED] The filing posture in two to three sentences: duties attached, satisfied, and open, attributed.",
  "I. Data Broker Registration",
  "[DETERMINATION LEAD] One sentence stating whether data-broker registration duties attach and in which states.",
  "[CONDITIONAL] Trigger - broker activity recorded in {dataBrokerDetail}: each state's duty stated from its verified passage, with the company's position set beside it; where no broker activity is recorded, one honest sentence says that no such duty attaches on the company's answers.",
  "[GENERATED] The per-jurisdiction analysis from the typed determinations; fees and deadlines appear only from registry rows.",
  "II. Supervisory-Authority and AI Act Registrations",
  "[DETERMINATION LEAD] One sentence stating the EU, UK and AI Act filing posture.",
  "[GENERATED] The determinations for each recorded establishment and market, in counsel's voice: representative duties, surviving notification duties, and AI Act provider or deployer registrations per the company's recorded AI answers; each duty from its verified passage; where the intake does not collect a fact a determination needs, the assessment says what is missing rather than assuming it.",
  "III. Filing Readiness",
  "[DETERMINATION LEAD] One sentence stating what stands between the company's answers and complete filings.",
  "[GENERATED] The readiness findings: each open duty with the company's recorded state and what closes it, naming the specific responsible party the record supplies rather than an unnamed role (the 428-D named-actor law); the attestation from the typed block.",
  "Table of Authorities",
  "Assembled deterministically from the document's citation ledger: an authority appears here if and only if it is cited above, with pinpoints consolidated and section back-references. Grouped in brief order - Regulations; Statutes; Guidance and Persuasive Authority (labelled persuasive, never binding). Source links deferred.",
];

/** This product's fixed prose carries no statutory pinpoints. */
export const REGISTRATION_SKELETON_PINPOINTS: readonly {
  readonly pinpoint: string;
  readonly corpus_key: string;
  readonly verbatim: string;
}[] = [];
