// ITEM SO-7 — IR PLAYBOOK SLOT MAP (step 0, verified before any encode).
//
// Every slot and conditional trigger in the byte-pinned CEO-corrected v3
// skeleton, bound to a LIVE source: an intake key on the live contract
// (`_shared/intake-contracts/ir-playbook.ts`, as persisted in the request body
// / `intake_data`) or a leaf of a typed surface on the LIVE persisted report
// shape.  A slot without a live source is a STOP condition.
//
// STOP HISTORY (2026-08-10): step 0 halted on EIGHT slots with no live source —
// `{orgSize}`, `{incidentDescription}`, `{incidentStatus}`, `{incidentOwner}`,
// `{dataSubjectTypes}`, `{containmentActions}`, `{investigationStatus}`,
// `{additionalContext}`.  The CEO resolved all of them on 2026-08-10 by four
// paragraph edits: six clauses dropped outright, and `{containmentActions}` +
// `{investigationStatus}` collapsed into ONE new, narrower slot
// `{containmentState}` bound to the live tri-state `contained` field (the
// SO-5 `retentionSchedule` class of call).  `{sector}` is bound to
// `organisationType` and rendered as the reader gave it (no case-fold);
// `{escalationContacts}` is bound to `responseTeamRoster`, the only recorded
// escalation structure.  All ten remaining slots resolve.
//
// BLANK-BY-DESIGN vs MISSING-SOURCE — these are different things and are not
// conflated anywhere in this product:
//   * BLANK BY DESIGN: a worksheet slot whose live source exists on the
//     contract but is unanswered because no incident has been recorded yet.
//     The clause is dropped and the worksheet field renders as an honest
//     blank.  It is never padded with placeholder prose.
//   * MISSING SOURCE: a slot with no field on the live contract at all.  That
//     is a STOP; none remain after the CEO's four edits.

export type IrSlotSourceKind = "intake" | "typed-surface" | "composed";

export type IrSlotRender =
  | "label-map"
  | "list-as-prose"
  | "table-as-prose"
  | "quoted-attributed"
  | "verbatim"
  | "date"
  | "conditional-clause";

export interface IrSlotBinding {
  /** Slot name exactly as it appears in the skeleton, without braces. */
  readonly slot: string;
  readonly kind: IrSlotSourceKind;
  /** Intake key (as persisted) or `surface.leaf` path on the report shape. */
  readonly source: string;
  readonly render: IrSlotRender;
  /** What the document does when the source is absent. */
  readonly absent: string;
  /** Which register the slot belongs to. */
  readonly register: "playbook" | "worksheet";
  /** True where an unanswered source is CORRECT output, not a defect. */
  readonly blank_by_design: boolean;
}

export const IR_SLOT_MAP: readonly IrSlotBinding[] = [
  // Subtitle + Part One — the durable playbook register
  { slot: "organizationName", kind: "intake", source: "organizationName", render: "verbatim",
    register: "playbook", blank_by_design: false,
    absent: "required — the form gates submit on it" },
  { slot: "sector", kind: "intake", source: "organisationType", render: "verbatim",
    register: "playbook", blank_by_design: false,
    absent: "the parenthetical is dropped; CEO ruling 2026-08-10 — rendered as the reader gave it, never case-folded" },

  // Standing Sections
  { slot: "escalationContacts", kind: "intake", source: "responseTeamRoster", render: "table-as-prose",
    register: "playbook", blank_by_design: false,
    absent: "the sentence is dropped and the standing-playbook ledger carries the section; never padded" },
  { slot: "externalSupport", kind: "composed",
    source: "outsideCounselName / outsideCounselContact / forensicVendorContact / insurerContact / lawEnforcementContact",
    render: "list-as-prose", register: "playbook", blank_by_design: false,
    absent: "the sentence is dropped; the omission is carried on the ledger, per the skeleton's own absent-branch" },
  { slot: "notificationDeadlines", kind: "typed-surface", source: "notification_duties[].sa_notification_determination",
    render: "list-as-prose", register: "playbook", blank_by_design: false,
    absent: "the sentence is dropped; the clocks are stated in the composed notification analysis instead" },

  // Part Two — the operational worksheet register
  { slot: "incidentType", kind: "intake", source: "cause", render: "label-map",
    register: "worksheet", blank_by_design: true,
    absent: "BLANK BY DESIGN — no incident recorded; the sentence is dropped, never padded" },
  { slot: "discoveryDate", kind: "intake", source: "discoveryDateTime", render: "date",
    register: "worksheet", blank_by_design: true,
    absent: "BLANK BY DESIGN — no incident recorded; the sentence is dropped, never padded" },
  { slot: "dataCategories", kind: "intake", source: "dataTypes", render: "list-as-prose",
    register: "worksheet", blank_by_design: true,
    absent: "BLANK BY DESIGN — the sentence is dropped, never padded" },
  { slot: "affectedCount", kind: "intake", source: "affectedCount", render: "label-map",
    register: "worksheet", blank_by_design: true,
    absent: "BLANK BY DESIGN — the sentence is dropped, never padded" },
  { slot: "containmentState", kind: "intake", source: "contained", render: "label-map",
    register: "worksheet", blank_by_design: true,
    absent: "BLANK BY DESIGN — the sentence is dropped, never padded (CEO ruling 2026-08-10: new narrow slot replacing containmentActions / investigationStatus)" },
];

/** Slots retired by the CEO's four edits of 2026-08-10 — never re-introduced. */
export const IR_RETIRED_SLOTS: readonly string[] = [
  "orgSize",
  "incidentDescription",
  "incidentStatus",
  "incidentOwner",
  "dataSubjectTypes",
  "containmentActions",
  "investigationStatus",
  "additionalContext",
];

/** Conditional triggers carried by the skeleton, each bound to a live answer. */
export const IR_CONDITIONAL_TRIGGERS: readonly { readonly id: string; readonly source: string }[] = [
  { id: "PROCESSORS", source: 'processorInvolved === true (detail from processorName)' },
];

/** Reader labels for the tri-state containment answer. */
export const IR_CONTAINMENT_STATE_MAP: Record<string, string> = {
  "Yes": "contained",
  "No": "not contained",
  "Unknown": "not known to it",
};

/** Reader labels for the recorded cause, woven into the fixed sentence. */
export const IR_INCIDENT_TYPE_MAP: Record<string, string> = {
  "Unauthorized external access / cyberattack": "unauthorized external access or a cyberattack",
  "Ransomware or malware": "ransomware or malware",
  "Phishing / credential compromise": "phishing or credential compromise",
  "Insider threat": "an insider threat",
  "Lost or stolen device": "a lost or stolen device",
  "Accidental disclosure": "an accidental disclosure",
  "Unknown / still investigating": "an incident whose cause it is still investigating",
};

/** Reader phrasing for the affected-count band. */
export const IR_AFFECTED_COUNT_MAP: Record<string, string> = {
  "Fewer than 100": "fewer than 100 individuals",
  "100\u20131,000": "between 100 and 1,000 individuals",
  "1,000\u201310,000": "between 1,000 and 10,000 individuals",
  "10,000\u2013100,000": "between 10,000 and 100,000 individuals",
  "More than 100,000": "more than 100,000 individuals",
  "Unknown": "a number it has not yet established",
};
