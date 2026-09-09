// DPIA CONVERSION — THE V3 (HOOK SELECTION) FLAG (doc 230 §4.2, doc 232, 2026-09-08).
//
// Mirrors LIA's LIA_V3_ENABLED (run-li-assessment/_local/ltp/lia-v3-flag.ts)
// byte-for-byte in structure: env-driven so a cutover is a deploy-time act,
// DEFAULT false so every live report is byte-untouched until the CEO flips
// the env var at a Lovable deploy. When true, run-dpia-framework runs the
// two-leg hook-selection pass (doc 230 §4.1) between the deterministic
// deliverables attach (attachDpiaDeliverables) and the skeleton assembly,
// and writes the `_meta.internal.dpia_v3` record block. While false: no
// selection call is ever made, no `hook_selections` row is ever read, no
// record block is written — the document is the V2 document, byte for byte
// (the same dark-mode law doc 217 established for LIA).
//
// A second, independent flag (DPIA_HOOKS_ENABLED, dpia-hooks-flag.ts)
// governs whether a RATIFIED hook may render at all — mirroring LIA's own
// two-flag split (LIA_V3_ENABLED for selection, LIA_HOOKS_ENABLED for
// render). Both default false; both must be true, AND at least one ratified
// row must exist in DPIA_HOOKS (corpus/maps/dpia-hooks.ts), before any
// customer-facing byte can change.

export const DPIA_V3_DEFAULT = false;

export const DPIA_V3_ENABLED: boolean = (() => {
  try {
    const raw = Deno.env.get("DPIA_V3_ENABLED");
    if (raw == null || raw.trim() === "") return DPIA_V3_DEFAULT;
    return /^(1|true|yes|on)$/i.test(raw.trim());
  } catch {
    return DPIA_V3_DEFAULT;
  }
})();
