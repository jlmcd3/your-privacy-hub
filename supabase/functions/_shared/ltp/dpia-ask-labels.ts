// PROMPT 9A (CEO-RATIFIED 2026-08-12) — DPIA ASK-LABEL REGISTRY.
//
// A frozen, byte-pinned map from ask-class id → CEO-ratified COMPACT LABEL.
// The labels are the presentation form of an ask. The FULL ask (the
// `dimensions` text every producer already writes) is unchanged and continues
// to render, byte-identical, in the gap table ONLY.
//
// SLOTS
//   {op}    the QUOTED operation label, e.g. "Workforce sentiment analytics"
//   {risk}  the risk label
//   {name}  an entity name (a processor)
//   {item}  the row's data item
//   {dest}  the row's transfer destination
//
// LAW: these bytes are ratified. No renderer may re-word, truncate, sentence-
// case or punctuate a label; only the slots are filled. Nothing in this file
// is generated, and there are no model calls anywhere in this module.

export type DpiaAskClass =
  | "ask_necessity_purpose"
  | "ask_necessity_alternatives"
  | "ask_necessity_reasons"
  | "ask_proportionality_impact"
  | "ask_risk_measures"
  | "ask_art36_description"
  | "ask_art36_open_measures"
  | "ask_lb_consent"
  | "ask_lb_contract"
  | "ask_lb_legal_obligation"
  | "ask_lb_vital"
  | "ask_lb_public_task"
  | "ask_lb_basis_unresolved"
  | "ask_lb_purpose_for_test"
  | "ask_lia_purpose"
  | "ask_lia_necessity"
  | "ask_lia_balancing"
  | "ask_lia_art9"
  | "ask_lia_special_category"
  | "ask_lia_children"
  | "ask_dpo"
  | "ask_dpo_formalities"
  | "ask_processor_contract"
  | "ask_art9_condition"
  | "ask_art9_other_category"
  | "ask_transfer_mechanism"
  | "ask_dpa_contracts"
  | "ask_retention"
  | "ask_dpbd"
  | "ask_data_quality"
  | "ask_art5_table"
  | "ask_rights_table"
  | "ask_portability_conditions"
  | "ask_transfer_leg_unresolved";

/** The ratified bytes. Sorted here by producer order, hashed sorted by id. */
export const DPIA_ASK_LABELS: Readonly<Record<DpiaAskClass, string>> = Object.freeze({
  ask_necessity_purpose: "the specific purpose pursued by {op}, stated as an outcome",
  ask_necessity_alternatives: "the alternatives considered for {op}, each with its rejection reason",
  ask_necessity_reasons: "the rejection reason for each alternative already named",
  ask_proportionality_impact:
    "the impact of the processing on the data subjects, stated separately from the benefit",
  ask_risk_measures: "the measures applied against {risk}",
  ask_art36_description: "a description of the processing sufficient to identify the risks",
  ask_art36_open_measures: "the measures applied to the risks still open, and the effect of each",
  ask_lb_consent: "how consent is collected for this processing, and how withdrawal is offered",
  ask_lb_contract: "the contract relied on, and the data subject's status as a party to it",
  ask_lb_legal_obligation:
    "the specific law establishing the legal obligation, named as an instrument",
  ask_lb_vital: "the life or safety circumstance the processing protects",
  ask_lb_public_task: "the specific law laying down the public task, named as an instrument",
  ask_lb_basis_unresolved: "the Art. 6(1) basis relied on for {op}",
  ask_lb_purpose_for_test: "the specific purpose pursued by {op}, stated as an outcome",
  ask_lia_purpose: "the interest pursued by {op}, stated as an outcome",
  ask_lia_necessity:
    "each less intrusive means considered for {op}, with the reason it would not achieve the interest",
  ask_lia_balancing:
    "the effect of the processing on the data subjects, and the measures that reduce it",
  ask_lia_art9: "the Art. 9 condition relied on for the special-category items",
  ask_lia_special_category:
    "a separate assessment of the special-category items, once an appropriate Article 9(2) condition (such as explicit consent) is established",
  ask_lia_children:
    "a dedicated legitimate interests assessment for the children's data stream, with age-appropriate safeguards",
  ask_dpo: "whether a data protection officer is designated, and their contact details",
  // A-TEAM DELTA (ChatGPT post-implementation review, 2026-08-31, DPIA
  // P0-1) — S1.8 (doc 119) credits the DPO from the assessment team and
  // asks only for the formalities (a record-completion ask distinct from
  // ask_dpo, which restates "is a DPO designated" over an already-answered
  // question). That branch never set an ask_class/display_label, so once
  // ANY other gap-ledger entry carried one, mergeLabeledAsks's `!label →
  // continue` silently dropped this entry from the executive count and
  // list (live batch 0792d73b: exec said "five points," the gap table and
  // Appendix A said six). Verbatim match to build.ts's ASK_DPO_FORMALITIES
  // constant — no new wording, just a label for the sentence already
  // written. Advance-ratification ledger, CEO redline pending (same
  // footing as the 2026-08-26/08-29/08-30 additions above).
  ask_dpo_formalities:
    "the formal designation record and contact details for the data protection officer named in the assessment team",
  ask_processor_contract: "a written Art. 28 contract with {name}, and the date it was signed",
  ask_art9_condition: "the Art. 9(2) condition relied on for {item}",
  // 2026-08-26 "Other"-bypass guard (CEO batch ruling) — implementation-
  // authored label, advance-ratification ledger, CEO redline pending.
  ask_art9_other_category:
    'whether the data recorded under "Other" includes special-category data, and the Art. 9(2) condition relied on',
  ask_transfer_mechanism: "the Chapter V mechanism relied on for the transfer to {dest}",
  ask_dpa_contracts:
    "whether a written processing contract is in place with each named processor, and the date it was signed",
  ask_retention: "the retention period for {item}, and the record type it applies to",
  ask_dpbd: "the measures built into the design of this processing, and when each was implemented",
  ask_data_quality: "the measures that keep the data accurate, and how quality is checked",
  ask_art5_table:
    "the measures supporting each Article 5(1) principle, and whether each is deployed",
  ask_rights_table: "how each data-subject right can be exercised for this processing",
  // DPIA-1 (2026-08-29) — Art. 20 portability's two remaining conditions,
  // fired only once the legal-basis condition is already met. Advance-
  // ratification ledger, CEO redline pending (same footing as the
  // 2026-08-26 "Other"-bypass guard class above).
  ask_portability_conditions:
    "whether the data was provided by or observed from the data subject, and whether the processing is carried out by automated means",
  // PANEL DPIA-P3 (2026-08-30) — fired only where the intake declares zero
  // transfer flows but the processor record carries a marker outside the
  // origin regime's own territory. Advance-ratification ledger.
  ask_transfer_leg_unresolved:
    "whether a cross-border transfer arises from {party}; if so, the destination and the Chapter V mechanism relied on",
});

export const DPIA_ASK_CLASSES: readonly DpiaAskClass[] = Object.freeze(
  Object.keys(DPIA_ASK_LABELS).sort() as DpiaAskClass[],
);

/**
 * Serialization the hash is taken over: entries sorted by id, each rendered as
 * `id + label` (no separator), joined with "\n". Exported so a test can prove
 * the pinned hash rather than trust it.
 */
export function serializeAskLabels(): string {
  return DPIA_ASK_CLASSES.map((id) => `${id}${DPIA_ASK_LABELS[id]}`).join("\n");
}

/** SHA-256 over serializeAskLabels(), lower-case hex. PINNED.
 *  Re-pinned 2026-08-31 (ask_dpo_formalities — A-TEAM DELTA, ChatGPT
 *  post-implementation review DPIA P0-1; verbatim match to the S1.8
 *  ASK_DPO_FORMALITIES sentence, one new label only, no re-wording).
 *  Audit trail — 9A pin: b1b55a5dc1f1adcfa41497f0376330f59d6ca044e5404bf8dbff8bd10d739fb4
 *  9M pin: 290608efbd8dbbde9249db5c7a81baf03bcd84cf5e846f58e02fc02f2e112bdd
 *  2026-08-26 re-pin (ask_art9_other_category): 8ed74af5082d0e0472ef96d81d571f1b26b213ede8f27a51019d0284077a5df1
 *  2026-08-29 re-pin (ask_portability_conditions): 0e51b7e9ab67f0339e8afa42cb1f2a76552d3924ef351e2530270b1b45ef4340
 *  2026-08-30 re-pin (ask_transfer_leg_unresolved): 858c465a9d12f30b8334d100feb37db00117851a6364d3e1732ce41097ff7a80 */
export const DPIA_ASK_LABELS_HASH =
  "201a87bfc428d09f2903b807f80486ed9078e3ceb6183dbf85df9f880906e8a9";


/** Recompute the hash (async — Web Crypto). Used by the pin test. */
export async function computeAskLabelsHash(): Promise<string> {
  const bytes = new TextEncoder().encode(serializeAskLabels());
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

// ── SEAM RULES (R3) — applied OUTSIDE the gap table only ────────────────────

/**
 * Terminal punctuation of spliced customer data is stripped at the seam, so a
 * label never produces ". —", ".;" or a doubled stop when it is composed into
 * a ratified template.
 */
export function stripTerminal(value: string): string {
  return String(value ?? "").trim().replace(/[\s.;,:!?]+$/u, "").trim();
}

/** A parenthetical splice is bounded to 12 words at a word boundary with "…". */
export function boundParenthetical(value: string, maxWords = 12): string {
  const t = stripTerminal(value);
  if (!t) return "";
  const words = t.split(/\s+/u);
  if (words.length <= maxWords) return t;
  return `${words.slice(0, maxWords).join(" ")}…`;
}

/** True when the text contains a seam defect the rules above must prevent. */
export function hasSeamDefect(text: string): boolean {
  return /\.\s*[—;]/u.test(text) || /\.\s*\./u.test(text) || /\s+[.;,]/u.test(text);
}

// ── LABEL RESOLUTION ────────────────────────────────────────────────────────

export interface AskSlots {
  /** Operation label — quoted by the resolver; never pre-quote it. */
  readonly op?: string;
  readonly risk?: string;
  readonly name?: string;
  readonly item?: string;
  readonly dest?: string;
  /** PANEL DPIA-P3 — the processor entry (or entries) whose marker sits
   *  outside the origin regime's territory. */
  readonly party?: string;
}

/** The quoted operation label, the ONLY form an operation is named in (R2). */
export function quotedOp(label: string): string {
  const t = stripTerminal(label);
  return t ? `"${t}"` : "the processing";
}

/**
 * Resolve a ratified label template against its slots. Slot values are
 * customer data, so each is seam-stripped (R3) before it is spliced.
 */
export function resolveAskLabel(id: DpiaAskClass, slots: AskSlots = {}): string {
  const template = DPIA_ASK_LABELS[id];
  if (!template) return "";
  return template
    .replace("{op}", quotedOp(str(slots.op)))
    .replace("{risk}", stripTerminal(str(slots.risk)) || "the risk recorded")
    .replace("{name}", stripTerminal(str(slots.name)) || "the processor named")
    .replace("{item}", lower(stripTerminal(str(slots.item))) || "this data")
    .replace("{dest}", stripTerminal(str(slots.dest)) || "the destination stated")
    .replace("{party}", stripTerminal(str(slots.party)) || "the processor engagement marked outside the origin territory");
}

function str(v: unknown): string {
  return typeof v === "string" ? v : v == null ? "" : String(v);
}

function lower(v: string): string {
  // Acronym-safe: "IP addresses" keeps its case; "Health or medical data" does not.
  return /^[A-Z]{2,}/.test(v) ? v : v.charAt(0).toLowerCase() + v.slice(1);
}

// ── MERGE RULE (R4) ─────────────────────────────────────────────────────────

const NUMBER_WORD: Record<number, string> = {
  1: "one", 2: "two", 3: "three", 4: "four", 5: "five",
  6: "six", 7: "seven", 8: "eight", 9: "nine", 10: "ten",
};

export function numberWordFor(n: number): string {
  return NUMBER_WORD[n] ?? String(n);
}

/** The scope suffix carried by a label that fired for several operations. */
export function scopeSuffix(operationCount: number): string {
  if (operationCount <= 1) return "";
  if (operationCount === 2) return " — for both the primary and the secondary use";
  return ` — across all ${numberWordFor(operationCount)} operations named in this assessment`;
}

export interface LabeledAskItem {
  readonly ask_class?: string;
  readonly label: string;
  readonly enables?: string;
  /** The operation this entry fired for; distinct values drive the R4 suffix. */
  readonly scope_op?: string;
}

export interface MergedAskItem {
  ask_class?: string;
  label: string;
  enables: string[];
  ops: string[];
}

/**
 * R4 — the same ask_class with an identical resolved label, fired for several
 * operations, renders ONCE with a scope suffix. Applies to the executive list,
 * the Matters cell and the decision blockers. The gap table is NOT merged.
 */
export function mergeLabeledAsks(items: readonly LabeledAskItem[]): MergedAskItem[] {
  const out: MergedAskItem[] = [];
  for (const it of items) {
    const label = stripTerminal(it.label);
    if (!label) continue;
    const key = `${it.ask_class ?? ""}\u0000${label}`;
    let hit = out.find((o) => `${o.ask_class ?? ""}\u0000${o.label}` === key);
    if (!hit) {
      hit = { ask_class: it.ask_class, label, enables: [], ops: [] };
      out.push(hit);
    }
    const enables = stripTerminal(it.enables ?? "");
    if (enables && !hit.enables.some((x) => x.toLowerCase() === enables.toLowerCase())) {
      hit.enables.push(enables);
    }
    const op = stripTerminal(it.scope_op ?? "");
    if (op && !hit.ops.includes(op)) hit.ops.push(op);
  }
  return out;
}

/** The merged label as it renders on a composed surface (label + R4 suffix). */
export function renderMergedLabel(m: MergedAskItem): string {
  return `${m.label}${scopeSuffix(m.ops.length)}`;
}
