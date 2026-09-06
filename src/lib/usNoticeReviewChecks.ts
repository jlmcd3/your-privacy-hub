// QA round two (US-A-01, 2026-09-06) — US Notice review-panel quality checks.
//
// The review panel warned "No retention period specified" over a fully
// answered questionnaire because it read `data_retention_period`, a key from an
// earlier vocabulary that no US notice question writes. The retention questions
// are `retention_general` (Q9) and `retention_criteria` (Q10).
//
// The rule lives here, not inline in the page, so it can be tested and so it
// stays aligned with the generator, which applies exactly the same test in
// generate-us-notice/_local/spine.ts.

function isEmptyAnswer(v: unknown): boolean {
  if (v == null) return true;
  if (typeof v === "string") return v.trim() === "";
  if (Array.isArray(v)) return v.length === 0;
  return false;
}

/**
 * True when the record supplies neither a retention period nor the criteria
 * used to determine one.
 *
 * 11 CCR § 7012(e)(4) is satisfied by EITHER limb: a business that cannot state
 * a fixed period may state the criteria instead. Warning on a missing period
 * while criteria are present would tell a compliant customer they are
 * incomplete.
 */
export function retentionDisclosureMissing(answers: Record<string, unknown>): boolean {
  return isEmptyAnswer(answers["retention_general"]) && isEmptyAnswer(answers["retention_criteria"]);
}
