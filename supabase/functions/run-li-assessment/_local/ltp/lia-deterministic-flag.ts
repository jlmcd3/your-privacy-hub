// LIA CONVERSION — THE DETERMINISTIC FLAG (L3, 2026-08-26).
//
// Mirrors CYBER_DETERMINISTIC_ENABLED / DPIA_UNITS_MINIMAL: env-driven so
// production cutover is a deploy-time act, DEFAULT false so the legacy
// (model-authored) path is byte-untouched until the CEO flips the env var
// at a Lovable deploy. When true: Stage 1 (Haiku classification), Stage 2
// (the three-part-test analysis) and Stage 3 (documentation
// recommendations) are replaced by the typed builders
// (three-part-test-typed.ts), the refinement pass is forced off, the
// semantic limb of the GDPR-context fetch is dropped (the DPIA
// determinism-fix pattern), and the skeleton assembles through the v2
// section list (persuasive-authority appendix included). Zero model calls
// anywhere in document generation.

export const LIA_DETERMINISTIC_DEFAULT = false;

export const LIA_DETERMINISTIC_ENABLED: boolean = (() => {
  try {
    const raw = Deno.env.get("LIA_DETERMINISTIC_ENABLED");
    if (raw == null || raw.trim() === "") return LIA_DETERMINISTIC_DEFAULT;
    return /^(1|true|yes|on)$/i.test(raw.trim());
  } catch {
    return LIA_DETERMINISTIC_DEFAULT;
  }
})();
