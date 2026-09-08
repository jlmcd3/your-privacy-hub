// DPIA CONVERSION — THE OFFLINE ANALOGY HOOKS FLAG (doc 230, doc 213
// pattern, 2026-09-08).
//
// Mirrors LIA_HOOKS_ENABLED (run-li-assessment/_local/ltp/lia-hooks-flag.ts):
// env-driven so a cutover is a deploy-time act, DEFAULT false so the DPIA
// body is byte-untouched until the CEO flips the env var at a Lovable
// deploy. When true AND `DPIA_HOOKS` (corpus/maps/dpia-hooks.ts) carries at
// least one ratified row, the skeleton assembler
// (_shared/ltp/dpia-skeleton-assemble.ts) runs each nominated hook through
// the DPIA hook join (dpia-deliverables/dpia-hook-join.ts) and may append a
// ratified persuasive-authority sentence beside the determination it bears
// on — never before both the flag is on and a ratified hook exists (the
// same "an unstamped hook is inert" law doc 213 established for LIA).

export const DPIA_HOOKS_DEFAULT = false;

export const DPIA_HOOKS_ENABLED: boolean = (() => {
  try {
    const raw = Deno.env.get("DPIA_HOOKS_ENABLED");
    if (raw == null || raw.trim() === "") return DPIA_HOOKS_DEFAULT;
    return /^(1|true|yes|on)$/i.test(raw.trim());
  } catch {
    return DPIA_HOOKS_DEFAULT;
  }
})();
