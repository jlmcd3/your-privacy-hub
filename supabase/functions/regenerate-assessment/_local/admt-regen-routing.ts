// BUGFIX (2026-09-08) — pure module-aware engine resolver for ADMT regen
// routing. Extracted to its own file (matching the fleet's established
// "pure decision logic lives in _local/, index.ts just wires through it"
// pattern — see run-li-assessment/_local/legacy-fetch-policy.ts) so it is
// directly unit-testable without starting index.ts's Deno.serve listener.
//
// ADMT is the only tool_type with a live v1/v2 engine split recorded on the
// assessment row itself: cppa_assessments.module is "admt" for legacy rows
// and "admt_v2" for CONVERSION SWAP (2026-08-20) rows (see
// run-admt-checker-v2/index.ts's header comment and payments-webhook's
// fnMap comment). Before this fix, regenerate-assessment's FN_MAP had a
// single static cppa_admt -> "run-admt-checker" entry, so every regen of a
// v2-generated assessment was dispatched to the LEGACY v1 function, which
// queries `.eq("module", "admt")` and finds no row for a v2 row (module =
// "admt_v2") -> 404 "Assessment not found". This resolver is the
// server-side equivalent of the module check ADMTCheckerResult.tsx already
// does client-side for the first-generation kick (L317-323).
export const RUN_ADMT_CHECKER_V1_FN = "run-admt-checker";
export const RUN_ADMT_CHECKER_V2_FN = "run-admt-checker-v2";
export const ADMT_V2_MODULE_VALUE = "admt_v2";

/**
 * Given the `module` column value from a cppa_assessments row, returns the
 * edge function that must regenerate it. Anything other than the exact v2
 * sentinel ("admt_v2") — including the legacy "admt" value, null, undefined,
 * or an unrecognized value — falls back to the v1 function, since v1 is the
 * only engine that can read a non-v2-shaped row (a v1-generated assessment
 * must keep regenerating through v1; forcing it to v2 would break on data
 * v2's deterministic engine doesn't expect).
 */
export function resolveAdmtRegenFn(moduleValue: unknown): string {
  return moduleValue === ADMT_V2_MODULE_VALUE ? RUN_ADMT_CHECKER_V2_FN : RUN_ADMT_CHECKER_V1_FN;
}
