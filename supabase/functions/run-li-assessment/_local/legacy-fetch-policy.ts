// DOC 207 TRACK 1 — CUTOVER GUARDS, THE TWO LEGACY-ONLY FETCHES.
//
// 206B0 §7-8 established, by reading the live deterministic-path modules
// (lia-deliverables/*, lia-skeleton-assemble.ts, lia-persuasive-authority.ts):
// no renderer on the deterministic path reads `enforcement_precedents`,
// `precedents_reviewed`, `precedent_database_size`, `precedentContext`, or
// `classification` in its Stage-1 model shape. Both `get-enforcement-context`
// and the `li_tracker_entries` query (index.ts) are legacy-model-path-only
// inputs — real on every report row, but consumed only by prompt
// construction and model-output annotation validation that never runs once
// `LIA_DETERMINISTIC_ENABLED` is true (Stage 2/3 are replaced by the typed
// builders and `analysis.annotations` is forced to `[]`).
//
// These two pure predicates are the cutover guard's actual decision logic,
// extracted out of `index.ts` so they are unit-testable in isolation:
// `index.ts` calls `Deno.serve(serveWithGenerationModel(...))` at module
// load, so importing it directly in a test starts a server rather than
// exercising its logic (the existing LIA test suite reads `index.ts`'s
// source text with `Deno.readTextFileSync` for the same reason — see
// tests/edge/run-li-assessment/upgrade4.test.ts ITEM 3).
//
// Both default to `true` (fetch) when NOT deterministic, so the legacy model
// path is byte-untouched: this module changes nothing about what any given
// run fetches, only where that decision is expressed.

/** Whether `index.ts` should invoke `get-enforcement-context` this run. */
export function shouldFetchEnforcementContext(deterministic: boolean): boolean {
  return !deterministic;
}

/** Whether `index.ts` should query `li_tracker_entries` this run. */
export function shouldFetchTrackerPrecedents(deterministic: boolean): boolean {
  return !deterministic;
}
