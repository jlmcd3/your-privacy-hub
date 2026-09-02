// DOC 137 (2026-09-02) — shared § 7150(b)(3) / § 7001(ddd) "significant
// decision" category classifier for CPPA Risk.
//
// DOC 148 (2026-09-02) — CANONICAL COPY MOVED HERE (_shared/ltp) so the risk
// factor engine can apply the same classification at the render chokepoint
// (the A-Team Batch-8 finding: the doc-137 gate never reached the surface
// customers read). The four _local copies are now byte-identical re-export
// stubs; edit THIS file only.
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
//
// DOC 138 (2026-09-02) — WIDENED to common programmatic-advertising / ad-tech
// vocabulary. Direct verification of the DOC 137 grading-run fixture (see the
// negation-awareness comment below) found that removing the false-positive
// "housing" category match alone left the description classifying as
// "unresolved", not "advertising_only": its actual text ("Audience-scoring
// models segment consumers into interest cohorts and predicted-purchase-
// intent bands. Outputs drive bid eligibility and frequency caps.") never
// uses the literal words "advertis-", "ad targeting/personalization", or
// "marketing campaign/targeting" — it describes the SAME FSOR-excluded
// advertising activity in the industry's own ad-auction vocabulary instead.
// That is an independent under-inclusiveness gap in this pattern (not a
// negation problem), fixed generally by adding the standard ad-tech terms
// for the same activity — audience segmentation/scoring, bid eligibility,
// frequency capping, purchase-intent modeling, interest cohorts — rather
// than special-casing this one fixture's exact wording.
const ADVERTISING_ONLY_PATTERN =
  /\b(advertis(e|ing|ement)|ad\s*targeting|ad\s*personalization|ad\s*auction|ad\s*exchange|programmatic\s*advertising|real-time\s*bidding|marketing\s*(campaign|targeting)|audience[-\s]?(segment(ation)?|scoring)|bid(?:ding)?\s*eligibility|frequency\s*cap(?:s|ping)?|purchase[-\s]?intent|interest\s*cohort)\b/i;

// DOC 138 (2026-09-02) — NEGATION-AWARE category matching (the same
// DPO-negation defect class already fixed once in the biometric product,
// see check-biometric-compliance/_local/ltp/biometric-deliverables/build.ts
// FD703575-B2's scheduleDenied/triggerDenied pattern, mirrored here rather
// than reinvented). A fresh grading run found this classifier still firing
// § 7150(b)(3) "significant" for a PURE ADVERTISING fixture whose q19
// description reads: "Audience-scoring models segment consumers into
// interest cohorts and predicted-purchase-intent bands. Outputs drive bid
// eligibility and frequency caps. No financial-eligibility, employment, or
// housing decisions." SIGNIFICANT_DECISION_CATEGORY_PATTERNS' bare
// `/\bhousing\b/i` keyword matched the word "housing" INSIDE that sentence's
// own explicit exclusion clause ("No ... or housing decisions"), which then
// won outright over the advertising-only check per this module's documented
// precedence rule (comment above, "A category match wins ..."). The same
// false-positive risk exists for every one of the seven enumerated
// categories, since explicitly disclaiming the regulated categories a
// system does NOT engage is a natural, honest way for an intake to describe
// an advertising-only activity — this is therefore fixed generally, not as
// a fixture-specific carve-out for "housing".
//
// Fix: category patterns are now tested SENTENCE BY SENTENCE (splitting on
// ./!/? the same way FD703575-B2 did), and a match is discarded when a
// negation/exclusion cue ("no", "not", "none of", "excluding", "excludes",
// "without any", "absent any", "isn't a", "is not a") appears earlier in
// the SAME sentence with no intervening sentence boundary — i.e. the match
// sits inside that sentence's own disclaimer clause. Scoping the check to
// one sentence (rather than the whole free-text field) is deliberate: a
// genuine positive match in one sentence must NOT be suppressed by an
// unrelated negation elsewhere in the same multi-sentence description (see
// the doc138 employment-with-a-"no housing"-disclaimer regression test).
const NEGATION_CUE_RE =
  /\b(?:no|not|none of|excluding|excludes|without any|absent any|isn't a|is not a)\b[^.!?]{0,60}$/i;

function splitIntoSentences(text: string): string[] {
  return text.split(/(?<=[.!?])\s+/).filter((s) => s.length > 0);
}

// Tests a single category pattern against a single sentence, walking every
// match in that sentence (not just the first) so a later, un-negated match
// in the same sentence still counts even if an earlier one was negated.
function sentenceHasUnnegatedMatch(sentence: string, pattern: RegExp): boolean {
  const flags = pattern.flags.includes("g") ? pattern.flags : pattern.flags + "g";
  const re = new RegExp(pattern.source, flags);
  let m: RegExpExecArray | null;
  while ((m = re.exec(sentence)) !== null) {
    const prefix = sentence.slice(0, m.index);
    if (!NEGATION_CUE_RE.test(prefix)) return true;
    if (m.index === re.lastIndex) re.lastIndex += 1; // guard zero-length matches
  }
  return false;
}

function textHasUnnegatedCategoryMatch(text: string, pattern: RegExp): boolean {
  return splitIntoSentences(text).some((sentence) =>
    sentenceHasUnnegatedMatch(sentence, pattern)
  );
}

/**
 * Classify a free-text ADMT activity description against the § 7001(ddd)
 * significant-decision categories. Pure, deterministic, no model call.
 *
 * - "significant": the description names an enumerated § 7001(ddd)
 *   category (financial/lending, housing, education, hiring, work
 *   allocation/compensation, promotion/demotion/termination, healthcare)
 *   OUTSIDE of that category keyword's own negation/exclusion clause (see
 *   DOC 138 above). A category match wins even where the text also
 *   mentions advertising — the FSOR exclusion only ever covers a system
 *   used SOLELY for advertising, so a record naming both is not a clean
 *   exclusion case.
 * - "advertising_only": no enumerated category is named (net of negated
 *   matches), and the description reads as advertising/marketing use.
 * - "unresolved": neither is established from the text (including empty
 *   text). Callers must not fire § 7150(b)(3) on this class, and should
 *   record the open question rather than assert either way.
 */
export function classifyAdmtSignificantDecision(
  description: string,
): AdmtSignificantDecisionClass {
  const text = (description ?? "").trim();
  if (!text) return "unresolved";
  if (
    SIGNIFICANT_DECISION_CATEGORY_PATTERNS.some((re) =>
      textHasUnnegatedCategoryMatch(text, re)
    )
  ) {
    return "significant";
  }
  if (ADVERTISING_ONLY_PATTERN.test(text)) return "advertising_only";
  return "unresolved";
}
