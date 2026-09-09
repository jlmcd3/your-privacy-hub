// ADMT CONVERSION — THE V3 (TWO-LEG HOOK SELECTION) FLAG (doc 235, 2026-09-08).
//
// Mirrors LIA_V3_ENABLED (run-li-assessment/_local/ltp/lia-v3-flag.ts) and
// DPIA_V3_ENABLED / RISK_V3_ENABLED (the two prior V3 hook-selection
// builds): env-driven so a cutover is a deploy-time act, DEFAULT false so
// every live ADMT v2 report is byte-untouched until the CEO flips the env
// var at a Lovable deploy. When true (and ADMT_HOOKS_ENABLED is also true
// and ADMT_HOOKS — corpus/maps/admt-hooks.ts — carries at least one
// ratified row), run-admt-checker-v2/index.ts loads this assessment's prior
// `hook_selections` rows, plans the (field, hook) pairs still worth a call,
// invokes classify-propositions `select_hooks` (product: "admt"), resolves
// the settled selections, and joins them against the deterministic engine's
// own factor verdicts (hook-join.ts). While false: no selection is planned,
// no model call is made, no `hook_selections` row is read or written, and
// the `_meta.internal.admt_v3` record block is not written — the document
// is the V2 document, byte for byte (the dark-mode law every prior V3 build
// in this program has proven with its own zero-call regression suite).
//
// ADMT-specific gate not present in LIA/DPIA/Risk: the selection block also
// requires a real `assessment_id` (the harness/stress-test calling
// convention — direct `intake_data`, no assessment_id — has no
// `hook_selections`/`tool_run_meter` row to key off, and inserting one on a
// first-ever call would need a persisted row that does not exist until
// AFTER this block would need to run). See doc 235 for the full rationale;
// this is an ORCHESTRATOR DEFAULT, not a CEO ruling.

export const ADMT_V3_DEFAULT = false;

export const ADMT_V3_ENABLED: boolean = (() => {
  try {
    const raw = Deno.env.get("ADMT_V3_ENABLED");
    if (raw == null || raw.trim() === "") return ADMT_V3_DEFAULT;
    return /^(1|true|yes|on)$/i.test(raw.trim());
  } catch {
    return ADMT_V3_DEFAULT;
  }
})();
