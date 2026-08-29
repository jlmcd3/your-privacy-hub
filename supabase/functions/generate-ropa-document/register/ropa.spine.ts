// ITEM SO-10 — SPECIFIED OUTPUT ENCODE: RoPA (Record of Processing Activities).
//
// RENDER LAW. The CEO-ratified counsel-register skeleton
// `RoPA_Record_of_Processing_Activities_Skeleton_v3.docx` is this product's
// render law. Every string below is transcribed BYTE-FOR-BYTE from that file's
// paragraph text. Nothing here may be reworded, re-punctuated or "improved" by
// code, by an agent, or by any downstream repair pass: fixed prose is a
// protected leaf (splice-barred) and conformance byte-matches the assembled
// document against it outside the slots.
//
// PROVENANCE: RoPA_Record_of_Processing_Activities_Skeleton_v3.docx —
// panel-delegated approval per CEO delegation 2026-08-06.
//
// FLEET EXEMPTION STANDS. This is a render-encode item, not a plan-row item:
// no gate machinery, no CSC, no coverage, no refinement loop is added here.
// The register is composed deterministically from the persisted RoPA intake.
//
// PINPOINTS. The fixed prose carries Article 30 GDPR (subtitle and the
// repeating-record mapping directive). The Article 27 representative sentence
// is composed at runtime and cites Art. 27 of the applicable instrument. Both
// are byte-checked against `provision_texts` (`gdpr-art-30`, `ukgdpr-art-30`,
// `gdpr-art-27`, `ukgdpr-art-27`, all status = approved) by the SO-10 battery.
//
// Block kinds:
//   "skeleton"    — FIXED PROSE. Byte-pinned; {slots} are the only mutable spans.
//   "lead"        — [DETERMINATION LEAD]: one deterministic sentence bound to the
//                   typed completeness determination; it may not disagree with it.
//   "generated"   — [GENERATED]: counsel-voice prose under the ATTRIBUTION RULE,
//                   composed deterministically from typed surfaces.
//   "record"      — [REPEATING RECORD]: one rendered row per activity, mapped to
//                   Article 30(1)(a)-(g). NOT a single-instance slot fill.
//   "rule"        — authoring/assembly directive (Table of Authorities). Never
//                   printed unless the composer supplies deterministic content.

export const ROPA_SKELETON_VERSION = "prose-plans-2026-08-10-item-so10";
export const ROPA_SKELETON_SOURCE_FILE =
  "RoPA_Record_of_Processing_Activities_Skeleton_v3.docx";
export const ROPA_SKELETON_PROVENANCE =
  "RoPA_Record_of_Processing_Activities_Skeleton_v3.docx — panel-delegated approval per CEO delegation 2026-08-06";

/**
 * SHA-256 over the skeleton's 12 paragraphs, newline-joined, in file order,
 * computed directly from `word/document.xml` (`w:t` runs concatenated, XML
 * entities unescaped). Independently confirmed by the CEO, 2026-08-10.
 */
export const ROPA_SKELETON_CONTENT_HASH =
  "71b06e5f68647fd78af989368210b577d0301ef7f51e48c9dfb08edee9a73ff6";

export const ROPA_SKELETON_TITLE = "RECORD OF PROCESSING ACTIVITIES";
export const ROPA_SKELETON_SUBTITLE =
  "Prepared to support Article 30 GDPR accountability - {organisation_name}";

/** The v3 register guide, verbatim. Authoring law; never printed to a customer. */
export const ROPA_REGISTER_GUIDE =
  "Register guide (v3 - CEO-ratified counsel register, senior privacy lawyers with the professors editing) - Fixed prose is a lawyer's client document: full flowing sentences, measured connectives, the law stated plainly and applied. The company's facts are always attributed (\"{org} has indicated that ...\", \"the company has described ...\") - \"the record shows\" and its family are banned. No dramatization, no rhetorical questions, no self-narration. Facts enter only through {slots} and [GENERATED] blocks under the ATTRIBUTION RULE: every factual clause names its source and traces to an intake answer or typed analysis; coverage, CSC and refinement police this mechanically. Statutory sentences in fixed prose are registry-verified at encode time. Slot notation: {field - rule}.";

/**
 * Banned register, v3. Checked against the assembled body, lower-cased. The
 * "the record shows" family plus the v3 additions.
 */
export const ROPA_V3_BANNED_REGISTER: readonly string[] = [
  "the record shows",
  "on this record",
  "the record reflects",
  "the record demonstrates",
  "the record makes clear",
  "the record establishes",
  "it is clear that",
  "needless to say",
];

/** Article 30(1)(a)-(g) — the register columns the repeating record maps to. */
export const ART30_SUBITEMS = [
  { key: "a", pinpoint: "Art. 30(1)(a) GDPR", label: "Controller, representative and DPO contact details" },
  { key: "b", pinpoint: "Art. 30(1)(b) GDPR", label: "Purposes of the processing" },
  { key: "c", pinpoint: "Art. 30(1)(c) GDPR", label: "Categories of data subjects and of personal data" },
  { key: "d", pinpoint: "Art. 30(1)(d) GDPR", label: "Categories of recipients" },
  { key: "e", pinpoint: "Art. 30(1)(e) GDPR", label: "Transfers to third countries and safeguards" },
  { key: "f", pinpoint: "Art. 30(1)(f) GDPR", label: "Envisaged erasure time limits" },
  { key: "g", pinpoint: "Art. 30(1)(g) GDPR", label: "Technical and organisational security measures" },
] as const;

export type Art30Key = typeof ART30_SUBITEMS[number]["key"];

export type RopaSkeletonBlockKind =
  | "skeleton"
  | "lead"
  | "generated"
  | "record"
  | "conditional"
  | "rule";

export interface RopaSkeletonBlock {
  readonly kind: RopaSkeletonBlockKind;
  readonly text: string;
}

export interface RopaSkeletonSection {
  readonly id: string;
  readonly title: string;
  readonly blocks: readonly RopaSkeletonBlock[];
}

/**
 * Paragraph 5, verbatim, split at its sentence boundary for rendering. The
 * final sentence ("It operates from {home_base}, ...") is byte-pinned; when
 * `home_base` was never captured the whole sentence drops and the composer
 * supplies the honest alternate through the `conditional` block that follows.
 */
export const ROPA_CONTROLLER_PARAGRAPH =
  "{organisation_name} is a {legal_entity_type - reader label} incorporated in {incorporation_jurisdiction}{REG_CLAUSE - \", registration \" + registration_number; absent => omitted}, with its registered address at {registered_address}. The company has indicated that it acts as {roles - reader labels as prose}. {DPO_BLOCK - conditional on has_dpo: \"Its data protection officer is \" + dpo_name + \", reachable at \" + dpo_email + / + dpo_phone; negative => the honest sentence that no officer has been designated}. {EU_REP_SENTENCE - conditional on eu_rep_name: the Article 27 representative, named}. It operates from {home_base}, across {jurisdictions - as prose}, with a workforce of {employee_band - band as prose}.";

export const ROPA_REPEATING_RECORD =
  "[REPEATING RECORD - one per activity; the renderer draws the register as a table mapped to Article 30(1)(a)-(g).] The activity {activity_name}, owned by {activity_owner}, is conducted for {purpose}, on the lawful basis of {lawful_basis - reader label}. It concerns {data_subjects - reader labels} and the categories {data_categories - reader labels}, collected from {collection_sources - as prose}. The operations performed: {processing_operations - as prose}. Recipients and platforms: {processor_platform - as prose}. The company retains the data {RETENTION_PHRASE - from retention_period, or per category where retention_varies_by_category}. Security measures: {security_measures - reader labels}; access is controlled as the company describes: {access_controls - the recorded answer rendered as prose}. {TRANSFER_CLAUSE - conditional: the transfer mechanism named}. Rights requests are handled {rights_handling - as prose}{OVERRIDE_CLAUSE - from rights_handling_override; absent => omitted}.";

/**
 * The per-activity sentence template, i.e. the repeating record with its
 * authoring marker removed. This is the byte-pinned fixed prose each rendered
 * activity row is assembled through.
 */
export const ROPA_ACTIVITY_SENTENCE_TEMPLATE = ROPA_REPEATING_RECORD.replace(
  "[REPEATING RECORD - one per activity; the renderer draws the register as a table mapped to Article 30(1)(a)-(g).] ",
  "",
);

export const ROPA_COMPLETENESS_LEAD =
  "[DETERMINATION LEAD] One sentence stating whether the register is complete on its face against Article 30, and naming what is missing where it is not.";

export const ROPA_COMPLETENESS_GENERATED =
  "[GENERATED] The completeness findings in counsel's voice: notices displayed ({notices_displayed}), the incident log ({incident_log}), and related assessments ({related_assessments - rendered as citations to the company's own documents}); each gap named with what would fill it.";

export const ROPA_TOA_RULE =
  "Assembled deterministically from the document's citation ledger: an authority appears here if and only if it is cited above, with pinpoints consolidated and section back-references. Grouped in brief order - Regulations; Statutes; Guidance and Persuasive Authority (labelled persuasive, never binding). Source links deferred.";

export const ROPA_SKELETON_SECTIONS: readonly RopaSkeletonSection[] = [
  {
    id: "controller_and_accountability",
    title: "Controller and Accountability",
    blocks: [
      { kind: "skeleton", text: ROPA_CONTROLLER_PARAGRAPH },
      // Honest alternate for the final sentence when {home_base} was never
      // captured. Composed only in that branch; otherwise absent entirely.
      { kind: "conditional", text: "[CONDITIONAL] Trigger - no home base recorded: the operating sentence without the home-base clause." },
      // ROPA-1 (2026-08-29, advance-ratification ledger) — Art. 30(2) scope
      // statement. Composed ONLY where the company records a processor role:
      // this register renders the Art. 30(1) controller format, and a
      // processor's register under Art. 30(2) has its own required columns
      // (each controller's name and contact details among them) that the
      // intake does not capture. Stating the boundary is honest scope, not a
      // new determination. Composed prose, so the byte-pinned docx paragraphs
      // and ROPA_SKELETON_CONTENT_HASH are untouched.
      { kind: "conditional", text: "[CONDITIONAL] Trigger - processor role recorded: the Article 30(2) scope statement." },
    ],
  },
  {
    id: "processing_activities",
    title: "Processing Activities",
    blocks: [
      { kind: "record", text: ROPA_REPEATING_RECORD },
    ],
  },
  {
    id: "completeness_review",
    title: "Completeness Review",
    blocks: [
      { kind: "lead", text: ROPA_COMPLETENESS_LEAD },
      { kind: "generated", text: ROPA_COMPLETENESS_GENERATED },
    ],
  },
  {
    id: "table_of_authorities",
    title: "Table of Authorities",
    blocks: [
      { kind: "rule", text: ROPA_TOA_RULE },
    ],
  },
];

/**
 * The skeleton's 12 paragraphs, in file order, exactly as the docx carries
 * them. The content hash above is SHA-256 over these joined with "\n".
 */
export const ROPA_SKELETON_PARAGRAPHS: readonly string[] = [
  ROPA_SKELETON_TITLE,
  ROPA_SKELETON_SUBTITLE,
  ROPA_REGISTER_GUIDE,
  "Controller and Accountability",
  ROPA_CONTROLLER_PARAGRAPH,
  "Processing Activities",
  ROPA_REPEATING_RECORD,
  "Completeness Review",
  ROPA_COMPLETENESS_LEAD,
  ROPA_COMPLETENESS_GENERATED,
  "Table of Authorities",
  ROPA_TOA_RULE,
];

// ── Pinpoint register (SO-10 step 1) ────────────────────────────────────────
//
// Every statutory pinpoint carried by the fixed prose, with the corpus row it
// was verified against on 2026-08-10. All four rows are `status = approved` in
// `provision_texts`. The skeleton QUOTES NO STATUTE — these are pinpoints and
// the Art. 30(1)(a)-(g) column mapping only — so the verification obligation is
// that each pinpoint exists, is approved, and that each column label is a
// faithful short label for the corresponding limb of the verified text.

export interface RopaPinpoint {
  readonly pinpoint: string;
  readonly provisionKey: string;
  readonly jurisdiction: "EU" | "UK";
  /** Byte-copied fragment of the approved corpus text this label maps to. */
  readonly verifiedFragment: string;
}

export const ROPA_SKELETON_PINPOINTS: readonly RopaPinpoint[] = [
  {
    pinpoint: "Art. 30 GDPR",
    provisionKey: "gdpr-art-30",
    jurisdiction: "EU",
    verifiedFragment:
      "shall maintain a record of processing activities under its responsibility",
  },
  {
    pinpoint: "Art. 30 UK GDPR",
    provisionKey: "ukgdpr-art-30",
    jurisdiction: "UK",
    verifiedFragment:
      "shall maintain a record of processing activities under its responsibility",
  },
  {
    pinpoint: "Art. 27 GDPR",
    provisionKey: "gdpr-art-27",
    jurisdiction: "EU",
    verifiedFragment:
      "the controller or the processor shall designate in writing a representative in the Union",
  },
  {
    pinpoint: "Art. 27 UK GDPR",
    provisionKey: "ukgdpr-art-27",
    jurisdiction: "UK",
    verifiedFragment:
      "shall designate in writing a representative in the United Kingdom",
  },
];

/**
 * The Art. 30(1)(a)-(g) limbs as they read in the approved `gdpr-art-30`
 * corpus row, byte-copied 2026-08-10. The register's column labels are checked
 * against these by the SO-10 battery so a label can never drift away from the
 * limb it claims to record.
 */
export const ART30_VERIFIED_LIMBS: Readonly<Record<string, string>> = {
  a: "the name and contact details of the controller and, where applicable, the joint controller, the controller's representative and the data protection officer",
  b: "the purposes of the processing",
  c: "a description of the categories of data subjects and of the categories of personal data",
  d: "the categories of recipients to whom the personal data have been or will be disclosed including recipients in third countries or international organisations",
  e: "where applicable, transfers of personal data to a third country or an international organisation, including the identification of that third country or international organisation",
  f: "where possible, the envisaged time limits for erasure of the different categories of data",
  g: "where possible, a general description of the technical and organisational security measures referred to in Article 32(1)",
};
