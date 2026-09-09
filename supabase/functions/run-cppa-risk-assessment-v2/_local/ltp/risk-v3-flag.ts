// CPPA RISK V3 CONVERSION — THE SELECTION FLAG (doc 224/224A/229, doc 231,
// 2026-09-08). Copied from the LIA pattern
// (run-li-assessment/_local/ltp/lia-v3-flag.ts) verbatim, `LIA_V3` ->
// `RISK_V3`, env var `LIA_V3_ENABLED` -> `RISK_V3_ENABLED`.
//
// Env-driven so a cutover is a deploy-time act, DEFAULT false so every live
// report is byte-untouched until the CEO flips the env var at a Lovable
// deploy. When true, the finalize pipeline (generate-cppa-risk.ts) runs the
// two-leg hook-selection planner for any nominated hook whose atom
// agreement is `unknown`, subject to the matrix pre-filter (doc 224A §8
// D1), the content-addressed store (D2/D6), the answer-usability check
// (D4) and the per-generation call cap. While false: no plan is built, no
// `classify-propositions` call is ever made, no `hook_selections` row is
// read or written, and the persisted `report_data` is byte-identical to
// the RISK_HOOKS_ENABLED-only path (doc 231's zero-call regression test).
//
// RISK_HOOKS_ENABLED (risk-hooks-flag.ts) governs whether an ALREADY
// SETTLED hook may render; RISK_V3_ENABLED governs whether an UNSETTLED
// hook's fact agreement may be settled by a model call at all. The two
// flip independently, exactly as LIA_HOOKS_ENABLED / LIA_V3_ENABLED do.

export const RISK_V3_DEFAULT = false;

export const RISK_V3_ENABLED: boolean = (() => {
  try {
    const raw = Deno.env.get("RISK_V3_ENABLED");
    if (raw == null || raw.trim() === "") return RISK_V3_DEFAULT;
    return /^(1|true|yes|on)$/i.test(raw.trim());
  } catch {
    return RISK_V3_DEFAULT;
  }
})();
