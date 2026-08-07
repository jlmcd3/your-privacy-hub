/**
 * LTP RENDERER WIRING — Item 181 · STAGE-B CONTINUATION-4 (2026-07-27, item 195).
 *
 * Three deterministic renderer controls, folded into the subordinated
 * Pass-2/summary composer per §28 (Engine-B primacy with subordinated
 * artifacts). None mutate customer surfaces on their own; each is a
 * pure assertion + a pure emitter helper that the composer calls.
 *
 *   (a) FACTOR_LINE COMPOSITION ORDER — factor_line entries MUST appear
 *       BEFORE the firm/hedged conclusion in the assembled narrative.
 *       Composer already places activity_lines before docs/closing; this
 *       assertion guards regression via a positional check.
 *
 *   (b) AGGREGATION_NOTE N>1 GATE — the "aggregation reflects the most
 *       cautious outcome" note emits ONLY when N (outcome count) > 1.
 *       At N=1 the note is a tautology and MUST be suppressed.
 *
 *   (c) (B)-QUESTION PREDICATE — the info_needed emitter accepts an
 *       intake_ledger entry ONLY when the entry represents a (B)-question
 *       (a customer-facing question ending in "?" or beginning with a
 *       question stem). Structured determinations are never emitted as
 *       info_needed asks.
 *
 * Pure; never throws. Callers inspect returned strings/booleans.
 */

export const RENDERER_181_STAMP = "ltp-renderer-181@2026-07-27T13:30:00Z";
export const RENDERER_181_VERSION = "renderer-181-v1";

/** (a) Order assertion: firm/hedged conclusion index must exceed the last factor_line index. */
export function assertFactorLineBeforeConclusion(
  parts: readonly { kind: string }[],
): string | null {
  let lastFactorIdx = -1;
  let firstConclusionIdx = -1;
  parts.forEach((p, i) => {
    if (p.kind === "factor_line" || p.kind === "activity_line") lastFactorIdx = i;
    if ((p.kind === "conclusion_firm" || p.kind === "conclusion_hedged" ||
         p.kind === "closing") && firstConclusionIdx === -1) firstConclusionIdx = i;
  });
  if (lastFactorIdx === -1 || firstConclusionIdx === -1) return null; // nothing to assert
  if (lastFactorIdx > firstConclusionIdx) {
    return `factor_line_after_conclusion:last_factor=${lastFactorIdx},first_conclusion=${firstConclusionIdx}`;
  }
  return null;
}

/** (b) Emit aggregation note only when N>1. */
export const AGGREGATION_NOTE_TEXT =
  "This overall calibration reflects the most cautious outcome across the assessed activities; " +
  "it is neither averaged nor determined by majority.";

export function emitAggregationNoteIfMulti(outcomeCount: number): string {
  return outcomeCount > 1 ? AGGREGATION_NOTE_TEXT : "";
}

/** (c) (B)-question predicate for the info_needed emitter. */
const QUESTION_STEM_RE = /^(please|describe|what|which|how|does|do you|when|why|list|is|are|can|could|would|should)\b/i;

export function isBQuestionIntake(label: unknown): boolean {
  if (typeof label !== "string") return false;
  const s = label.trim();
  if (!s) return false;
  if (s.endsWith("?")) return true;
  if (QUESTION_STEM_RE.test(s)) return true;
  return false;
}

/** Convenience: filter an info_needed candidate list to (B)-questions only. */
export function filterInfoNeededToBQuestions<T extends { intake_label?: string; label?: string }>(
  entries: readonly T[],
): T[] {
  return entries.filter((e) => isBQuestionIntake(e.intake_label ?? e.label));
}
