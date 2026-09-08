// DOC 217 §5.8 / DOC 217A §2 — THE READ-BACK TEMPLATES. [RATIFY] — every
// string below is presented for the CEO's ratification and is transcribed
// from doc 217A §2 (the full set; doc 217 §5.8's three examples are
// superseded by 217A's later, complete table). Nothing here is ever printed
// by a model; the gate (`lia-intake-gate`) and the classifier
// (`classify-propositions`) return DATA — reason codes, spans, prop ids —
// and the UI maps them onto these templates.
//
// LAW L6 (doc 217): the read-back never coaches a passing answer. Every
// template says what the answer failed to do or what it was read as, and
// offers revise / keep / confirm / correct / stand — never what a passing
// answer would say. tests/edge/run-li-assessment/doc217-v3-engine.test.ts
// asserts no template carries coaching language.
//
// Slots are record substrings or displayed question text only:
//   {question}        the question as displayed (field-labels.ts)
//   {span}            a verbatim byte-substring of the customer's answer (L8)
//   {closed_question} the closed question the answer disagrees with
//   {closed_answer}   the customer's own closed answer
//   {other_question}  the question the fact belongs to (field-labels.ts)
//   {label}           the proposition's inventory label
//   {date}            the date the customer stood on the answer
//
// SIX reason codes, not seven: doc 217A §2 corrects doc 217 §3.3 —
// `other_limb_field` is a COLUMN of `intake_gate_results` (the field a
// `fact_belongs_to_other_limb` fact belongs to), not a reason code.
//
// MIRROR: this file has no imports and is mirrored byte-for-byte into
// src/lib/lia/readbackTemplates.ts so the intake read-back component
// (src/components/lia/V3ReadBack.tsx) renders the SAME bytes the engine
// ratifies; tests/edge/run-li-assessment/doc217-v3-engine.test.ts pins the
// two copies identical (after line-ending normalisation).

export const LIA_READBACK_TEMPLATES_VERSION = "lia-readback-templates-v1-217A-2026-09-07";

export type LiaGateReasonCode =
  | "non_responsive"
  | "unintelligible"
  | "placeholder"
  | "contradicts_closed_answer"
  | "legal_conclusion_not_fact"
  | "fact_belongs_to_other_limb";

export const LIA_GATE_REASON_CODES: readonly LiaGateReasonCode[] = [
  "non_responsive",
  "unintelligible",
  "placeholder",
  "contradicts_closed_answer",
  "legal_conclusion_not_fact",
  "fact_belongs_to_other_limb",
];

export function isLiaGateReasonCode(v: unknown): v is LiaGateReasonCode {
  return typeof v === "string" && (LIA_GATE_REASON_CODES as readonly string[]).includes(v);
}

// ── [RATIFY] — one template per reason code (doc 217A §2, verbatim) ─────
export const LIA_READBACK_REASON_TEMPLATES: Readonly<Record<LiaGateReasonCode, string>> = {
  non_responsive:
    "This answer does not address the question as asked: \"{question}\". You may revise it, or keep it as written.",
  unintelligible:
    "We could not read this answer as a statement about the processing: \"{span}\". You may revise it, or keep it as written.",
  placeholder:
    "This answer appears to be a placeholder: \"{span}\". The assessment will treat the question as unanswered unless you revise it.",
  contradicts_closed_answer:
    "This answer, \"{span}\", does not agree with your answer to \"{closed_question}\" (\"{closed_answer}\"). You may revise either, or keep both as written; the assessment will not resolve the difference.",
  legal_conclusion_not_fact:
    "This answer states a conclusion, \"{span}\", rather than the facts on which it rests. The assessment can only weigh facts. You may add the facts, or keep the answer as written.",
  fact_belongs_to_other_limb:
    "Part of this answer, \"{span}\", concerns \"{other_question}\". It has been noted there; you may move or repeat it.",
};

// ── [RATIFY] — the reading template (doc 217A §2; the markdown bold around
// {label} in the source table is presentation, rendered by the component,
// not bytes of the sentence) ────────────────────────────────────────────
export const LIA_READBACK_READING_TEMPLATE =
  "We read this answer as stating: {label} — based on: \"{span}\".";

// ── [RATIFY] — the record of a stood answer (doc 217A §2) ───────────────
export const LIA_READBACK_STOOD_TEMPLATE =
  "You kept this answer as written on {date}; the assessment uses it exactly as given.";

// ── [RATIFY] — the action words (doc 217 §6 for the gate; doc 217A §2 for
// the reading) ───────────────────────────────────────────────────────────
export const LIA_READBACK_ACTIONS = {
  revise: "Revise",
  keep_as_written: "Keep as written",
  confirm: "Confirm",
  correct: "Correct my answer",
  not_what_i_meant: "This is not what I meant",
} as const;

export type LiaReadbackSlotName =
  | "question"
  | "span"
  | "closed_question"
  | "closed_answer"
  | "other_question"
  | "label"
  | "date";

export type LiaReadbackSlots = Partial<Record<LiaReadbackSlotName, string>>;

/** The slot names a template carries, in order. */
export function liaReadbackSlotsIn(template: string): string[] {
  return [...template.matchAll(/\{([a-z_]+)\}/g)].map((m) => m[1]);
}

/**
 * Render a template. Returns `null` when any slot the template needs is
 * missing or empty — the caller renders NOTHING for that code rather than a
 * sentence with a hole in it (the same unresolved-slot discipline the hook
 * join applies). Slot values are substituted verbatim; nothing is escaped,
 * trimmed or rewritten here.
 */
export function renderLiaReadbackTemplate(template: string, slots: LiaReadbackSlots): string | null {
  let out = template;
  for (const name of liaReadbackSlotsIn(template)) {
    const value = slots[name as LiaReadbackSlotName];
    if (typeof value !== "string" || value.length === 0) return null;
    out = out.split(`{${name}}`).join(value);
  }
  return out;
}

/** Render the reason-code template for `code`, or `null` (unknown code /
 *  unresolved slot). */
export function renderLiaReasonCode(code: string, slots: LiaReadbackSlots): string | null {
  if (!isLiaGateReasonCode(code)) return null;
  return renderLiaReadbackTemplate(LIA_READBACK_REASON_TEMPLATES[code], slots);
}
