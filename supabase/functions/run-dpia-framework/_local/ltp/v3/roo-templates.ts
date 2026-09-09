// DPIA CONVERSION — THE ROO ASK, byte-mirrored from LIA (doc 232 §9-1,
// ORCHESTRATOR DEFAULT: reuse LIA_ROO_UNSETTLED_TEMPLATE's bytes unchanged;
// the CEO may rule a DPIA-specific text separately).
//
// `run-li-assessment/_local/ltp/v3/readback-templates.ts` is off limits (the
// "do not modify anything under run-li-assessment/" rule), so this is a
// BYTE-MIRROR, not an import — the same relationship LIA's own
// src/lib/lia/readbackTemplates.ts has to the edge-function original, pinned
// by a test that fails if the two ever diverge
// (tests/edge/run-dpia-framework/doc232-dpia-roo-template-pin.test.ts).
//
// THE CONSTRUCT (CEO, 2026-09-08, carried into this build): readings are
// NEVER shown to a customer. When the two-leg selection cannot settle a
// nominated hook's fact agreement, the engine emits ONE `information_needed`
// entry naming the QUESTION ONLY — never the authority, the fact, or what a
// passing answer would say (doc 224A §8 D5, R5/L6). An unrevised answer on
// the next generation lapses to `unsettled_final` and is never re-asked
// (doc 224A §3.4 "we let it go").
//
// DO NOT RE-WORD THESE BYTES. Doc 230 §4.4 suggested renaming the constant
// to a product-agnostic `HOOK_ROO_UNSETTLED_TEMPLATE` — the build brief
// explicitly says not to: LIA's own file keeps its name and its own
// byte-mirror pins, and this file is DPIA's byte-mirror of the SAME ratified
// text under DPIA's own constant name.

export const DPIA_ROO_TEMPLATES_VERSION = "dpia-roo-templates-v1-byte-mirror-of-lia-2026-09-08";

// ── BYTE-MIRROR of LIA_ROO_UNSETTLED_TEMPLATE
// (run-li-assessment/_local/ltp/v3/readback-templates.ts). CEO-ratified
// 2026-09-08 (LIA build log doc 225 §13). Pinned identical by
// doc232-dpia-roo-template-pin.test.ts. ──────────────────────────────────
export const DPIA_ROO_UNSETTLED_TEMPLATE =
  "The specificity of your answer here is important to check whether a relevant regulator action in our database may be related to your situation. Given the facts you've provided, our database has not found applicable regulator actions. If you can describe the facts more specifically, revise this answer with those additional facts; otherwise keep it as written and the assessment will not address any regulator action for this issue.";
