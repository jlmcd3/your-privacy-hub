// CPPA RISK V3 CONVERSION — THE OFFLINE ANALOGY HOOKS FLAG (doc 229 §5.1,
// doc 231, 2026-09-08). Copied from the LIA pattern
// (run-li-assessment/_local/ltp/lia-hooks-flag.ts) verbatim, `LIA_HOOKS` ->
// `RISK_HOOKS`, env var `LIA_HOOKS_ENABLED` -> `RISK_HOOKS_ENABLED`.
//
// Env-driven so a cutover is a deploy-time act, DEFAULT false so the
// persuasive-authority surface is byte-untouched until the CEO flips the
// env var at a Lovable deploy. When true AND `RISK_HOOKS`
// (corpus/maps/risk-hooks.ts) carries at least one ratified row, the
// persuasive-authority join (hook-join.ts) runs each nominated candidate
// through the direction matrix and may render a ratified sentence, or drop
// it — never before both the flag is on and a ratified hook exists. Today
// `RISK_HOOKS` is an empty array (doc 231 §5.4 of doc 229), so this flag is
// inert regardless of its value until the first hook is drafted, critiqued,
// settled and ratified.

export const RISK_HOOKS_DEFAULT = false;

export const RISK_HOOKS_ENABLED: boolean = (() => {
  try {
    const raw = Deno.env.get("RISK_HOOKS_ENABLED");
    if (raw == null || raw.trim() === "") return RISK_HOOKS_DEFAULT;
    return /^(1|true|yes|on)$/i.test(raw.trim());
  } catch {
    return RISK_HOOKS_DEFAULT;
  }
})();
