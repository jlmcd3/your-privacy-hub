// ITEM SO-7 — SPECIFIED OUTPUT ENCODE: Incident Response Playbook.
//
// RENDER LAW. The CEO-ratified counsel-register skeleton —
// `Incident_Response_Playbook_Skeleton_v3.docx` as corrected on 2026-08-10 by
// the CEO's four paragraph edits (the HARD-STOP resolution: six unsourced
// slots dropped, `{containmentActions}` + `{investigationStatus}` collapsed
// into the new `{containmentState}` bound to the live `contained` field) — is
// this product's render law. Every string below is transcribed BYTE-FOR-BYTE
// from that file's paragraph text. Nothing here may be reworded,
// re-punctuated or "improved" by code, by refinement, or by an agent: fixed
// prose is a protected leaf (splice-barred) and conformance byte-matches the
// assembled document against it outside the slots.
//
// TWO REGISTERS. Part One is the durable playbook; Part Two is the operational
// worksheet. The worksheet ships blank by design where no incident is
// recorded: a blank field is correct output, never a gap, and is NEVER padded
// with placeholder prose.
//
// Block kinds:
//   "skeleton"    — FIXED PROSE. Byte-pinned; {slots} are the only mutable spans.
//   "lead"        — [DETERMINATION LEAD]: exactly one generated sentence, bound
//                   to the typed determination. A lead may not disagree with it.
//   "generated"   — [GENERATED]: counsel-voice prose under the ATTRIBUTION RULE.
//   "conditional" — [CONDITIONAL]: renders only when its trigger fires.
//   "rule"        — authoring/assembly directive ([REGISTER RULE], Table of
//                   Authorities). Never printed unless the composer supplies
//                   deterministic content for it.

export const IR_SKELETON_VERSION = "prose-plans-2026-08-30-c5-dash-grammar";
export const IR_SKELETON_SOURCE_FILE =
  "Incident_Response_Playbook_Skeleton_v3.docx (CEO-corrected 2026-08-10: four paragraph edits, six unsourced slots dropped, containmentState added)";
export const IR_SKELETON_PROVENANCE =
  "Incident_Response_Playbook_Skeleton_v3.docx, CEO correction of 2026-08-10 — panel-delegated approval per CEO delegation 2026-08-06";

/**
 * SHA-256 over the CORRECTED skeleton's paragraph text, newline-joined, in
 * file order, computed DIRECTLY from the docx bytes (all 17 `w:p` paragraphs,
 * `w:t` runs concatenated, XML entities unescaped, joined with "\n").
 *
 * Uncorrected v3 (for the audit trail), CEO-verified:
 *   3497e5085bf5151fc7802c502c4735d499d2d3cd51d2c7910c1c5035e95daea3
 */
/**
 * RE-PIN 2026-08-30 (PANEL leak fix — the framing note's trailing authoring
 * directive removed from the customer bytes; see IR_TEMPLATE_FRAMING_NOTE).
 * Prior pin, for the audit trail:
 *   61bd929aa4061f32b0944722dd537db7f3c37676e21cf94098dadff526059789
 */
/**
 * RE-PIN BATCH 21a (Wave C5, doc 113 S7.2, doc 109 §1.6 subtitle/heading
 * dash grammar) — the subtitle and both Part titles' spaced hyphens ("Part
 * One - ", "Two artifacts - ... - prepared for") became em dashes; no other
 * byte changed. Method verified by reproducing the prior value first. Prior
 * pin, for the audit trail:
 *   506affb30d42c7e6c14483d5fd56249546986fff70b54b47119c54e149dbf4fd
 */
// RE-PIN A-TEAM S4 (doc 119 S3.1, 2026-08-31): fleet ToA rename — the "Table of Authorities" section title became "Authorities Cited" (CEO-ratified, panel A1); ids and assembly rules unchanged. Old-hash reproduction verified before re-pin. Prior pin:
// 0f32a3eb39e815f9b242b86e833e5820356ddab0d434e8b0f90a935ec1e7e347.
export const IR_SKELETON_CONTENT_HASH =
  "1996129c4d0b7d018f24233128296e0c7dbd6aa421da462953214a3e0e924960";

export const IR_SKELETON_TITLE = "INCIDENT RESPONSE PLAYBOOK AND WORKSHEET";
export const IR_SKELETON_SUBTITLE =
  "Two artifacts — the standing playbook and the incident worksheet — prepared for {organizationName}";

/** The v3 register guide, verbatim. Authoring law; never printed to a customer. */
export const IR_REGISTER_GUIDE = "Register guide (v3 - CEO-ratified counsel register, senior privacy lawyers with the professors editing) - Fixed prose is a lawyer's client document: full flowing sentences, measured connectives, the law stated plainly and applied. The company's facts are always attributed (\"{org} has indicated that ...\", \"the company has described ...\") - \"the record shows\" and its family are banned. No dramatization, no rhetorical questions, no self-narration. Facts enter only through {slots} and [GENERATED] blocks under the ATTRIBUTION RULE: every factual clause names its source and traces to an intake answer or typed analysis; coverage, CSC and refinement police this mechanically. Statutory sentences in fixed prose are registry-verified at encode time. Slot notation: {field - rule}.";

/**
 * BYTE-PINNED authority-framing note (skeleton law, second sentence of the
 * Part One fixed-prose paragraph). It is printed to the customer verbatim,
 * without the authoring marker.
 *
 * PANEL-2026-08-30 (expert-panel leak class; advance-ratification ledger):
 * the pinned bytes used to END with "; that framing note is fixed and may
 * never be reworded" — an AUTHORING directive that printed into both
 * customer playbooks. The directive belongs in this comment, not in the
 * customer's document: the note's fixedness is enforced by the content hash
 * below, not by announcing it to the reader. Substantive framing sentence
 * unchanged; hash re-pinned (old hash in the audit trail above it).
 */
export const IR_TEMPLATE_FRAMING_NOTE =
  "Template material drawn from NIST SP 800-61r3, the CISA playbooks and the ICO toolkit is drafting scaffolding and not legal authority.";

/**
 * The register rule for the two artifacts. Authoring law; never printed.
 */
export const IR_REGISTER_RULE =
  "[REGISTER RULE] Playbook sections are written in the durable register; worksheet sections in the operational register; the two do not mix.";

/**
 * Statutory pinpoints carried by FIXED PROSE / fixed conditional first words.
 * Each verbatim quote is a byte-exact substring of its APPROVED corpus row
 * (`provision_texts`), verified 2026-08-10 post-edit.
 */
export const IR_SKELETON_PINPOINTS: readonly {
  readonly pinpoint: string;
  readonly corpus_key: string;
  readonly verbatim: string;
}[] = [
  {
    pinpoint: "GDPR Art. 33(2)",
    corpus_key: "gdpr-art-33",
    verbatim:
      "The processor shall notify the controller without undue delay after becoming aware of a personal data breach.",
  },
  {
    pinpoint: "GDPR Art. 28(3)(f)",
    corpus_key: "gdpr-art-28",
    verbatim:
      "assists the controller in ensuring compliance with the obligations pursuant to Articles 32 to 36 taking into account the nature of processing and the information available to the processor;",
  },
];

/** The v3 banned register, lower-cased for the assembled-body check. */
export const IR_V3_BANNED_REGISTER: readonly string[] = [
  "the record shows",
  "on this record",
  "the record reflects",
  "the record demonstrates",
  "as the record makes clear",
];

// BATCH 18b (Wave C1, doc 113 S2.1) — "table" joins the union (biometric
// Batch-18a precedent). Table blocks carry text: "" — no customer bytes ride
// the spine; the tables the product exists for are built from the typed
// surfaces at assembly time and are honestly absent when their rows are.
export type IrSkeletonBlockKind = "skeleton" | "lead" | "generated" | "conditional" | "rule" | "table";

export interface IrSkeletonBlock {
  readonly kind: IrSkeletonBlockKind;
  readonly text: string;
}

export interface IrSkeletonSection {
  readonly id: string;
  readonly title: string;
  readonly blocks: readonly IrSkeletonBlock[];
}

export const IR_SKELETON_SECTIONS: readonly IrSkeletonSection[] = [
  {
    id: "standing_playbook",
    title: "Part One — The Standing Playbook",
    blocks: [
      { kind: "lead", text: "[DETERMINATION LEAD] One sentence stating whether the company's standing preparedness, on its answers, would carry it through a notifiable incident." },
      { kind: "skeleton", text: "This playbook is {organizationName}'s own: it is assembled from the team, contacts, deadlines and processor relationships the company has recorded, for an organisation in its sector ({sector - reader label})." },
      { kind: "rule", text: "[BYTE-PINNED] Template material drawn from NIST SP 800-61r3, the CISA playbooks and the ICO toolkit is drafting scaffolding and not legal authority." },
      { kind: "generated", text: "[GENERATED] The programme posture in counsel's voice from the company's answers - plan, team, testing, register, insurance - determination-led; sections the company has not recorded take the single ledger sentence with each section stating what would fill it." },
      // BATCH 18b (doc 113 S2.4) — the preparedness-gaps register, built from
      // the deduped standing-gap ledger. Carries no fixed text.
      { kind: "table", text: "standing_playbook.sections[record_insufficient]" },
    ],
  },
  {
    id: "standing_sections",
    title: "Standing Sections",
    blocks: [
      { kind: "skeleton", text: "The escalation path the company has recorded: {escalationContacts - rendered as a table}. External support: {externalSupport - as prose; absent => carried on the ledger}. Notification obligations and their clocks: {notificationDeadlines - each stated with its statutory basis, registry-sourced}." },
      { kind: "rule", text: "[REGISTER RULE] Playbook sections are written in the durable register; worksheet sections in the operational register; the two do not mix." },
      // BATCH 18b (doc 113 S2.2/S2.3) — the tables the pinned sentence's own
      // slot descriptors call for ("rendered as a table"); the slot VALUES
      // become pointer prose to these. No fixed bytes change.
      { kind: "table", text: "responseTeamRoster" },
      { kind: "table", text: "externalSupport" },
      { kind: "table", text: "notification_duties+state_notification_duties" },
    ],
  },
  {
    id: "incident_worksheet",
    title: "Part Two — The Incident Worksheet",
    blocks: [
      { kind: "lead", text: "[DETERMINATION LEAD] One sentence, incident-specific, generated only where an incident is recorded: the classification and immediate posture. Otherwise the worksheet ships blank by design - blank fields are correct output, never gaps." },
      { kind: "skeleton", text: "The company classifies the incident as {incidentType - reader label}, discovered on {discoveryDate}. The data involved: {dataCategories - reader labels}. The scale of those affected is estimated at {affectedCount - band as prose}." },
      // BATCH 18b (doc 113 S2.10/S2.6/S2.8) — the incident facts strip, the
      // one amber deadline callout, and the deadline board. All three are
      // honestly absent where no incident is recorded; the pinned blocks'
      // relative order (classify -> processors -> containment -> analysis)
      // is preserved around them.
      { kind: "table", text: "incident_worksheet.intake_facts" },
      { kind: "generated", text: "[GENERATED] Deadline callout - the operative supervisory-authority outer limit, stated once for the whole document; renders only where a GDPR-family duty is engaged or reserved and a discovery timestamp is recorded." },
      { kind: "table", text: "notification_duties+state_notification_duties+breachNoticeContracts" },
      { kind: "conditional", text: "[CONDITIONAL] PROCESSORS - trigger {processorsInvolved}: fixed first words \"A processor is involved.\" followed by {processorDetail - attributed} and the Article 28 / 33(2) notification-clock analysis." },
      { kind: "skeleton", text: "The company reports the incident's containment state as {containmentState - reader label}." },
      { kind: "generated", text: "[GENERATED] The notification analysis in counsel's voice: each duty with its clock, jurisdiction by jurisdiction, from the company's answers; the action plan in time order; determinations reserved to counsel stay reserved." },
      // BATCH 18b (doc 113 S2.7) — the jurisdiction action plan as a table
      // (Order | Duty | Status | Deadline | Owner | Citation); no-GDPR path.
      { kind: "table", text: "state_notification_duties+breachNoticeContracts.action_plan" },
      // A-TEAM DELTA (ChatGPT multi-instance review, 2026-08-31, EU IR P1-3)
      // — the Art. 33(3) content plan as a table, GDPR-engaged path. Not
      // part of the docx's 17 fixed-prose paragraphs (hash above is
      // unaffected); a "table" block, honestly absent when its rows are.
      { kind: "table", text: "content_owner_mapping.art33_content_plan" },
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

/** The fixed first words the processors conditional must open with. */
export const IR_PROCESSOR_FIXED_FIRST_WORDS = "A processor is involved.";


/**
 * The CORRECTED skeleton's 17 paragraphs, in file order, exactly as the docx
 * carries them. The content hash above is SHA-256 over these joined with "\n".
 * Paragraph 5 and paragraph 8 are split across two spine blocks each (fixed
 * prose + authoring note), so they are reassembled here in file form.
 */
export const IR_SKELETON_PARAGRAPHS: readonly string[] = [
  "INCIDENT RESPONSE PLAYBOOK AND WORKSHEET",
  "Two artifacts - the standing playbook and the incident worksheet - prepared for {organizationName}",
  IR_REGISTER_GUIDE,
  "Part One — The Standing Playbook",
  "[DETERMINATION LEAD] One sentence stating whether the company's standing preparedness, on its answers, would carry it through a notifiable incident.",
  `${IR_SKELETON_SECTIONS[0].blocks[1].text} ${IR_SKELETON_SECTIONS[0].blocks[2].text}`,
  "[GENERATED] The programme posture in counsel's voice from the company's answers - plan, team, testing, register, insurance - determination-led; sections the company has not recorded take the single ledger sentence with each section stating what would fill it.",
  "Standing Sections",
  `${IR_SKELETON_SECTIONS[1].blocks[0].text} ${IR_REGISTER_RULE}`,
  "Part Two — The Incident Worksheet",
  "[DETERMINATION LEAD] One sentence, incident-specific, generated only where an incident is recorded: the classification and immediate posture. Otherwise the worksheet ships blank by design - blank fields are correct output, never gaps.",
  "The company classifies the incident as {incidentType - reader label}, discovered on {discoveryDate}. The data involved: {dataCategories - reader labels}. The scale of those affected is estimated at {affectedCount - band as prose}.",
  "[CONDITIONAL] PROCESSORS - trigger {processorsInvolved}: fixed first words \"A processor is involved.\" followed by {processorDetail - attributed} and the Article 28 / 33(2) notification-clock analysis.",
  "The company reports the incident's containment state as {containmentState - reader label}.",
  "[GENERATED] The notification analysis in counsel's voice: each duty with its clock, jurisdiction by jurisdiction, from the company's answers; the action plan in time order; determinations reserved to counsel stay reserved.",
  "Authorities Cited",
  "Assembled deterministically from the document's citation ledger: an authority appears here if and only if it is cited above, with pinpoints consolidated and section back-references. Grouped in brief order - Regulations; Statutes; Guidance and Persuasive Authority (labelled persuasive, never binding). Source links deferred.",
];
