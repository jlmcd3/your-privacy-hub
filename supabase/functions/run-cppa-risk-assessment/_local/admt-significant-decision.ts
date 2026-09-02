// DOC 137 (2026-09-02) — shared § 7150(b)(3) / § 7001(ddd) "significant
// decision" category classifier for CPPA Risk.
//
// ROOT CAUSE: `_w9_risk_slots.ts` (computeIntakeSelectedSubsections) and
// `_local/openings/risk-opening.ts` (buildRiskOpening's S1 trigger list)
// each fired the § 7150(b)(3) ADMT-significant-decision trigger purely on
// "does the Company use ADMT at all" (q18_admt_use === "Yes"), with ZERO
// check of which § 7001(ddd) significant-decision category the described
// activity actually falls into, and without the FSOR advertising exclusion
// (11 CCR § 7001(ddd)(6): "Significant decision does not include
// advertising to a consumer") the separate CPPA ADMT product already
// implements correctly (run-admt-checker-v2/_local/ltp/admt-v2-deterministic.ts,
// computeScope's clearAdvertisingExclusion / advertisingEffect branches).
//
// The CPPA ADMT product can do this cleanly because its `decision_domains`
// intake field is a CLOSED multi-select enum whose every member is itself
// a regulated § 7001(ddd) category (see SIGNIFICANT_DECISION_DOMAINS in
// _shared/intake-contracts/cppa-admt.ts) — so "one or more domains
// selected" already IS the category-match test, and a separate
// `solely_advertising` Yes/No field carries the exclusion.
//
// CPPA Risk has no such categorical field: the ADMT activity is described
// only in q19_admt_description free text (_shared/intake-contracts/
// cppa-risk-assessment.ts). This module keyword-matches that free text
// against the SAME seven § 7001(ddd) categories the ADMT product's enum
// already encodes (financial/lending, housing, education, hiring, work
// allocation/compensation, promotion/demotion/termination, healthcare),
// plus an advertising-only signal mirroring the FSOR exclusion. Where the
// description establishes neither — the fleet's honest-degradation
// convention (see risk-opening.ts's "omission over invention" rule, and
// ADMT's own UNABLE_TO_ASSESS state for an unresolved record) — the
// classification is "unresolved": the trigger must NOT fire, and the
// unresolved state is recorded rather than silently defaulting either way.

export type AdmtSignificantDecisionClass =
  | "significant"
  | "advertising_only"
  | "unresolved";

// Mirrors SIGNIFICANT_DECISION_DOMAINS (_shared/intake-contracts/cppa-admt.ts,
// itself copied verbatim from src/pages/admt/ADMTChecker.tsx), one keyword
// pattern per enumerated § 7001(ddd) category. Free text is matched instead
// of an enum value because CPPA Risk's q19_admt_description has no
// categorical field to read.
const SIGNIFICANT_DECISION_CATEGORY_PATTERNS: readonly RegExp[] = [
  // Financial or lending services (credit decisions, loans, accounts)
  /\b(credit\s*(score|decision|eligibility|application|denial)?|loan|lending|financing|mortgage\s*(approval|underwriting)?|underwrit(e|ing)|line of credit|bank\s*account\s*(opening|eligibility))\b/i,
  // Housing (rental or purchase eligibility)
  /\b(housing|rental\s*(application|eligibility)|tenant\s*screening|lease\s*eligibility|mortgage\s*(approval)?)\b/i,
  // Education enrollment or opportunities (admission, credentials, suspension)
  /\b(admission|enrollment|enrolment|academic\s*(program|credential)|educational\s*credential|expulsion|school\s*suspension)\b/i,
  // Hiring or admission decisions
  /\b(hiring|recruit(ing|ment)?|job\s*applicant|candidate\s*screening|employment\s*offer)\b/i,
  // Work allocation, scheduling, or compensation
  /\b(work\s*allocation|shift\s*scheduling|scheduling\s*of\s*work|wage|compensation|salary|bonus\s*allocation)\b/i,
  // Promotion, demotion, suspension, or termination
  /\b(promotion|demotion|termination|firing|layoff|employee\s*suspension)\b/i,
  // Healthcare services (diagnosis, treatment, care eligibility)
  /\b(diagnos(is|e|tic)|medical\s*treatment|patient\s*care|healthcare\s*eligibility|clinical\s*(decision|recommendation))\b/i,
];

// FSOR advertising exclusion (11 CCR § 7001(ddd)(6)) — mirrors the ADMT
// product's `solely_advertising` signal, matched from free text here.
const ADVERTISING_ONLY_PATTERN =
  /\b(advertis(e|ing|ement)|ad\s*targeting|ad\s*personalization|marketing\s*(campaign|targeting))\b/i;

/**
 * Classify a free-text ADMT activity description against the § 7001(ddd)
 * significant-decision categories. Pure, deterministic, no model call.
 *
 * - "significant": the description names an enumerated § 7001(ddd)
 *   category (financial/lending, housing, education, hiring, work
 *   allocation/compensation, promotion/demotion/termination, healthcare).
 *   A category match wins even where the text also mentions advertising —
 *   the FSOR exclusion only ever covers a system used SOLELY for
 *   advertising, so a record naming both is not a clean exclusion case.
 * - "advertising_only": no enumerated category is named, and the
 *   description reads as advertising/marketing use.
 * - "unresolved": neither is established from the text (including empty
 *   text). Callers must not fire § 7150(b)(3) on this class, and should
 *   record the open question rather than assert either way.
 */
export function classifyAdmtSignificantDecision(
  description: string,
): AdmtSignificantDecisionClass {
  const text = (description ?? "").trim();
  if (!text) return "unresolved";
  if (SIGNIFICANT_DECISION_CATEGORY_PATTERNS.some((re) => re.test(text))) {
    return "significant";
  }
  if (ADVERTISING_ONLY_PATTERN.test(text)) return "advertising_only";
  return "unresolved";
}
