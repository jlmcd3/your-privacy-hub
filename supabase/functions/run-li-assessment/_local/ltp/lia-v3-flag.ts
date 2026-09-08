// LIA CONVERSION — THE V3 (B+ PIPELINE) FLAG (doc 217 D1, 2026-09-07).
//
// Mirrors LIA_DETERMINISTIC_ENABLED (lia-deterministic-flag.ts) and
// LIA_HOOKS_ENABLED (lia-hooks-flag.ts): env-driven so a cutover is a
// deploy-time act, DEFAULT false so every live report is byte-untouched
// until the CEO flips the env var at a Lovable deploy. When true (and the
// deterministic path is on), run-li-assessment loads this assessment's
// `intake_readings` rows and passes them to BOTH the rule pass (confirmed
// readings become `prop:` atoms — doc 217 §5.1/§5.2) AND the skeleton
// assembler (the Schedule of Readings, §5.4; the method statement, §5.5),
// and writes the `_meta.internal.lia_v3` record block (§5.6). While false:
// no readings are loaded, no `prop:` atom can exist, no Schedule renders,
// no method statement prints, no record block is written — the document
// is the V2 document, byte for byte (the doc 217 dark-mode law).
//
// The client half of the same feature (the intake read-back component,
// doc 217 §6) has its own flag, VITE_LIA_V3_READBACK_ENABLED; the two flip
// independently and this one governs the engine only.

export const LIA_V3_DEFAULT = false;

export const LIA_V3_ENABLED: boolean = (() => {
  try {
    const raw = Deno.env.get("LIA_V3_ENABLED");
    if (raw == null || raw.trim() === "") return LIA_V3_DEFAULT;
    return /^(1|true|yes|on)$/i.test(raw.trim());
  } catch {
    return LIA_V3_DEFAULT;
  }
})();
