// DOC 217 §5.8 / DOC 217A §2, as amended by DOC 224 / 224A (2026-09-08) —
// THE CUSTOMER-FACING TEMPLATES. [RATIFY] — every string below is presented
// for the CEO's ratification. Nothing here is ever printed by a model; the
// gate (`lia-intake-gate`) returns DATA — reason codes, spans — and the UI
// maps them onto these templates; the engine emits the ROO ask (below) into
// `information_needed` where the two-leg selection could not settle.
//
// THE CONSTRUCT (CEO, 2026-09-08): readings are NEVER shown to a customer.
// Doc 217A's reading template, its stood template and its confirm / correct /
// "not what I meant" actions are WITHDRAWN. What remains customer-facing: the six conformance
// reason codes (matter 1 — a garbled answer is caught before paying) and
// the one ROO ask, which names the question and the nature of the gap and
// never the authority, the fact, or what a passing answer would say.
//
// LAW L6 (doc 217): no template coaches a passing answer.
// tests/edge/run-li-assessment/doc217-v3-engine.test.ts asserts no template
// carries coaching language.
//
// Slots are record substrings or displayed question text only:
//   {question}        the question as displayed (field-labels.ts)
//   {span}            a verbatim byte-substring of the customer's answer (L8)
//   {closed_question} the closed question the answer disagrees with
//   {closed_answer}   the customer's own closed answer
//   {other_question}  the question the fact belongs to (field-labels.ts)
//
// SIX reason codes, not seven: doc 217A §2 corrects doc 217 §3.3 —
// `other_limb_field` is a COLUMN of `intake_gate_results` (the field a
// `fact_belongs_to_other_limb` fact belongs to), not a reason code.
//
// MIRROR: this file has no imports and is mirrored byte-for-byte into
// src/lib/lia/readbackTemplates.ts so the intake component
// (src/components/lia/V3ReadBack.tsx) renders the SAME bytes the engine
// ratifies; tests/edge/run-li-assessment/doc217-v3-engine.test.ts pins the
// two copies identical (after line-ending normalisation).

export const LIA_READBACK_TEMPLATES_VERSION = "lia-readback-templates-v3-ceo-ratified-2026-09-08";

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

// ── RATIFIED by the CEO 2026-09-08 (his bytes; the ruling's two double
// spaces normalised to single) — the ROO ask (doc 224A §8 D5) — the
// `information_needed` entry the engine emits for a free-text answer on
// which the two-leg selection could not settle. Names the question (the
// entry's own `field`), the nature of the gap, and that no regulator action
// was found; never the authority, the fact, or what a passing answer says.
// Emitted once per answer; an unrevised answer is let go on the next
// generation (224A §3.4) ──────────────────────────────────────────────────
export const LIA_ROO_UNSETTLED_TEMPLATE =
  "The specificity of your answer here is important to check whether a relevant regulator action in our database may be related to your situation. Given the facts you've provided, our database has not found applicable regulator actions. If you can describe the facts more specifically, revise this answer with those additional facts; otherwise keep it as written and the assessment will not address any regulator action for this issue.";

// ── [RATIFY] — the action words (doc 217 §6 for the gate) ────────────────
export const LIA_READBACK_ACTIONS = {
  revise: "Revise",
  keep_as_written: "Keep as written",
} as const;

export type LiaReadbackSlotName =
  | "question"
  | "span"
  | "closed_question"
  | "closed_answer"
  | "other_question";

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
