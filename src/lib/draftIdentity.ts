/**
 * Draft identity — pure helpers for useToolDraft.
 *
 * LIA F01 / Governance F02 / DPIA F02 (intake master reviews, 2026-09-15):
 * the shared draft hook found the latest unfinished row for the user, tool
 * and client and started UPDATING it as soon as the customer typed, without
 * a Resume or Discard decision and without checking which assessment the
 * row belonged to. These helpers make the identity explicit and testable:
 *
 *  - a draft can be scoped to an `assessmentKey` (the LIA route id) that is
 *    stored inside session_data and required on lookup;
 *  - the blank-payload guard ignores the identity key, so a form that has
 *    only its identity is still blank;
 *  - the customer's choice about a found draft is a small state machine.
 *
 * No React, no client — vitest-testable.
 */

export const DRAFT_ASSESSMENT_KEY = "assessment_id";

export type DraftChoice =
  /** No saved draft was found (or it has been discarded). */
  | "none"
  /** A saved draft was found and the customer has not chosen yet. */
  | "unresolved"
  /** The customer resumed the saved draft; autosave targets it. */
  | "resumed"
  /** The customer kept the saved draft aside; autosave targets a separate row. */
  | "separate";

/** The payload that is saved: the answers plus, when scoped, the identity key. */
export function withAssessmentKey(
  data: Record<string, unknown>,
  assessmentKey: string | null | undefined,
): Record<string, unknown> {
  if (!assessmentKey) return data;
  return { ...data, [DRAFT_ASSESSMENT_KEY]: assessmentKey };
}

/** The answers alone — the identity key is not content (LIA F01: a blank
 *  form carrying only its route id used to count as content). */
export function withoutAssessmentKey(data: Record<string, unknown>): Record<string, unknown> {
  if (!(DRAFT_ASSESSMENT_KEY in data)) return data;
  const { [DRAFT_ASSESSMENT_KEY]: _omit, ...rest } = data;
  return rest;
}

/** True when a stored row may be offered for THIS assessment. A row that
 *  carries a different identity is never offered; a legacy row with no
 *  identity is offered only when the page is not scoped. */
export function draftRowMatches(
  sessionData: unknown,
  assessmentKey: string | null | undefined,
): boolean {
  const stored =
    sessionData && typeof sessionData === "object"
      ? (sessionData as Record<string, unknown>)[DRAFT_ASSESSMENT_KEY]
      : undefined;
  if (!assessmentKey) return true;
  return typeof stored === "string" && stored === assessmentKey;
}

/** Whether autosave may write to the FOUND row under the current choice. */
export function mayTargetFoundDraft(choice: DraftChoice): boolean {
  return choice === "resumed";
}

/** Whether the customer still owes a decision about a found draft. */
export function awaitingDraftChoice(choice: DraftChoice, draftFound: boolean): boolean {
  return draftFound && choice === "unresolved";
}
