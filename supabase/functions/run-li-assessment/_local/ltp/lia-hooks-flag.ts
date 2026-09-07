// LIA CONVERSION — THE OFFLINE ANALOGY HOOKS FLAG (doc 213, 2026-09-07).
//
// Mirrors LIA_DETERMINISTIC_ENABLED (lia-deterministic-flag.ts): env-driven
// so a cutover is a deploy-time act, DEFAULT false so the persuasive-
// authority section is byte-untouched until the CEO flips the env var at a
// Lovable deploy. When true AND `LIA_HOOKS` (corpus/maps/lia-hooks.ts)
// carries at least one ratified row, `buildLiaPersuasiveAuthority`
// (lia-persuasive-authority.ts) runs each ranked entry through the hook
// join (`lia-deliverables/hook-join.ts`) and may replace its text with a
// ratified sentence shape, or drop it — never before both the flag is on
// and a ratified hook exists (doc 213's own "everything ships dark behind
// LIA_HOOKS_ENABLED... an unstamped hook is inert, exactly as an unstamped
// rule is").

export const LIA_HOOKS_DEFAULT = false;

export const LIA_HOOKS_ENABLED: boolean = (() => {
  try {
    const raw = Deno.env.get("LIA_HOOKS_ENABLED");
    if (raw == null || raw.trim() === "") return LIA_HOOKS_DEFAULT;
    return /^(1|true|yes|on)$/i.test(raw.trim());
  } catch {
    return LIA_HOOKS_DEFAULT;
  }
})();
