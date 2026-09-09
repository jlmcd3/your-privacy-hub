// DOC 235 — THE ROO ASK, byte-mirrored from LIA's CEO-ratified bytes
// (`LIA_ROO_UNSETTLED_TEMPLATE`, run-li-assessment/_local/ltp/v3/
// readback-templates.ts), exactly as DPIA's `DPIA_ROO_UNSETTLED_TEMPLATE`
// and CPPA Risk's `RISK_ROO_UNSETTLED_TEMPLATE` did (doc 232 §3-1, doc 231
// §2). Per the CEO's 2026-09-08 construct ruling: readings are NEVER shown
// to a customer; where the two-leg selection legs disagree, the engine
// emits ONE `information_needed`-shaped entry using this exact template —
// never the authority, the fact, or what a passing answer would say.
//
// This is data only; whether/how ADMT actually surfaces this to a customer
// is a SEPARATE, unresolved question — see doc 235 §8 ("the ROO surface").
// ADMT's report schema (report-schemas/admt-v2.ts) has NO
// `information_needed` top-level key at all today (unlike LIA/DPIA/Risk),
// so this build does not push this string onto any customer-facing report
// field; it is recorded only in `_meta.internal.admt_v3.roo_asks` (the doc
// 224 §4.A.5 audit record) pending a CEO/orchestrator decision on where —
// or whether — ADMT would ever show this to a customer at all.

export const ADMT_ROO_UNSETTLED_TEMPLATE =
  "The specificity of your answer here is important to check whether a relevant regulator action in our database may be related to your situation. Given the facts you've provided, our database has not found applicable regulator actions. If you can describe the facts more specifically, revise this answer with those additional facts; otherwise keep it as written and the assessment will not address any regulator action for this issue.";
