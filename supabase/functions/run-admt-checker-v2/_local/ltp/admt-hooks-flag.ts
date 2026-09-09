// ADMT CONVERSION — THE OFFLINE ANALOGY HOOKS RENDER FLAG (doc 235, 2026-09-08).
//
// Mirrors LIA_HOOKS_ENABLED (run-li-assessment/_local/ltp/lia-hooks-flag.ts)
// and DPIA_HOOKS_ENABLED / RISK_HOOKS_ENABLED: env-driven, DEFAULT false so
// the assembled skeleton document is byte-untouched until the CEO flips the
// env var at a Lovable deploy. When true AND `ADMT_HOOKS`
// (corpus/maps/admt-hooks.ts) carries at least one ratified row, the join
// (hook-join.ts) may append a ratified sentence to the relevant section's
// paragraph list, or emit nothing — never before both the flag is on and a
// ratified hook exists (the same "an unstamped hook is inert" law every
// prior product in this program ships under).
//
// Two flags, not one — same separation LIA/DPIA/Risk carry: ADMT_V3_ENABLED
// gates the model-calling SELECTION pass (the two-leg agreement call);
// ADMT_HOOKS_ENABLED gates RENDERING a settled selection's sentence into the
// document. A selection can be computed and stored with the render flag off
// (inert data, no customer-visible change); rendering never happens without
// a settled, ratified hook regardless of either flag.

export const ADMT_HOOKS_DEFAULT = false;

export const ADMT_HOOKS_ENABLED: boolean = (() => {
  try {
    const raw = Deno.env.get("ADMT_HOOKS_ENABLED");
    if (raw == null || raw.trim() === "") return ADMT_HOOKS_DEFAULT;
    return /^(1|true|yes|on)$/i.test(raw.trim());
  } catch {
    return ADMT_HOOKS_DEFAULT;
  }
})();
