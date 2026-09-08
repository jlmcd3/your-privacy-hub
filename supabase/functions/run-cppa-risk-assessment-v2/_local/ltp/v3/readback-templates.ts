// DOC 224A §8 D5 / CEO RATIFICATION 2026-09-08 (doc 225 §13) / DOC 231 —
// THE ROO ASK, BYTE-MIRRORED FOR CPPA RISK.
//
// `RISK_ROO_UNSETTLED_TEMPLATE` below MUST remain byte-identical to
// `LIA_ROO_UNSETTLED_TEMPLATE` in
// run-li-assessment/_local/ltp/v3/readback-templates.ts (a file this build
// does not modify — run-li-assessment/ is off-limits). The CEO ratified
// this text as the ONE ask emitted for ANY product's hook disagreement
// (doc 224A §8 D5: "the same logic applies to every ROO product" — doc 224
// §0 rule 6). It names the question and the nature of the gap; it never
// names the authority, the fact, or what a passing answer would say.
//
// A product copy exists (rather than an import) because run-li-assessment/
// may not be imported by another product's function (cross-function-import
// ban) and because the CEO's ratification is product-agnostic prose, not a
// LIA-owned artifact — the same reasoning the LIA build itself used for
// src/lib/lia/readbackTemplates.ts's client-side mirror.
//
// tests/edge/run-cppa-risk-assessment-v2/doc231-roo-template-pin.test.ts
// pins this file's `RISK_ROO_UNSETTLED_TEMPLATE` byte-identical to LIA's
// (after CRLF/LF normalisation) — the doc 207c lesson, applied here too.

export const RISK_ROO_TEMPLATES_VERSION = "risk-roo-templates-v1-mirrors-lia-v3-ceo-ratified-2026-09-08";

// ── RATIFIED BYTES (LIA_ROO_UNSETTLED_TEMPLATE, byte-for-byte) ───────────
export const RISK_ROO_UNSETTLED_TEMPLATE =
  "The specificity of your answer here is important to check whether a relevant regulator action in our database may be related to your situation. Given the facts you've provided, our database has not found applicable regulator actions. If you can describe the facts more specifically, revise this answer with those additional facts; otherwise keep it as written and the assessment will not address any regulator action for this issue.";
