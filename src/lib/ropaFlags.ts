/**
 * QA batch 2026-09-05 (ROPA 01) — which flags count toward
 * ropa_sessions.open_flags_count. Advisory flags (recommendation / cross_sell,
 * e.g. "You'll need a DPA with each processor") inform; they never block or
 * warn, so they are not "open flags". The Review page's flagged-activity list
 * already excluded them; the Documents page counter did not, and the two
 * surfaces disagreed ("No flagged or incomplete activities" vs "1 open flags").
 *
 * Pure module (no store, no client) so the rule is testable in vitest.
 */
export const ADVISORY_FLAG_TYPES: ReadonlySet<string> = new Set(["recommendation", "cross_sell"]);

/** Conservative: an unknown or absent type counts as open; only advisory types are excluded. */
export function countsAsOpenFlag(flagType: string | undefined | null): boolean {
  return !(typeof flagType === "string" && ADVISORY_FLAG_TYPES.has(flagType));
}
