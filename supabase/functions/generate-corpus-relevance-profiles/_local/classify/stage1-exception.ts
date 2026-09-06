// DOC 191 §6.2 STAGE 1 — EXCEPTION MINING.
//
// Lexical/structural markers ONLY at this stage. No model call. Search within
// each prior bucket for rows that break their own prior: a pattern-prior row
// (an enforcement action) that actually states a holding — Cothron v. White
// Castle, the Europa Press special-category row — or a rule-prior row that is
// actually just descriptive.
//
// THE BAR IS DOC 196 §2's, not "contains the word must". Doc 196 states it
// exactly: the shape being hunted is "X can never satisfy Y" or "X is
// categorically required/excluded", AS DISTINCT FROM "a company doing X was
// fined". A curation note for an enforcement action almost always contains
// "must" or "failed to" — those alone say nothing, so plain modal verbs are
// recorded as supporting evidence but never shortlist a pattern-prior row on
// their own. Only CATEGORICAL language ("cannot", "never", "at all",
// "categorically", "precludes") or DEFINITIONAL/HOLDING language ("held
// that", "is defined as") clears the bar.
//
// Erring tight here is the safe direction (§6.1): a genuine rule left sitting
// as `pattern` costs nothing — it sits exactly where every row in the fleet
// sits today — and is caught by the next refinement round. A pattern wrongly
// pushed toward `rule` is the expensive error.

import type { ClassificationCandidate, Stage0Result, Stage1Result } from "./types.ts";

/** Categorical scope language — "this can never happen", "this is always
 *  required" — the shape doc 196 §2 names. */
export const CATEGORICAL_MARKERS: readonly RegExp[] = [
  /\bcannot\b/i,
  /\bcan never\b/i,
  /\bcould never\b/i,
  /\bmay not\b/i,
  /\bnever\b/i,
  /\bat all\b/i,
  /\bin all cases\b/i,
  /\bcategorical(?:ly)?\b/i,
  /\bin no (?:case|circumstances)\b/i,
  /\bunder no circumstances\b/i,
  /\bprecludes?\b/i,
  /\bis (?:categorically )?excluded\b/i,
  /\bdoes not permit\b/i,
  /\bcannot be relied on\b/i,
  /\bis anterior to\b/i,
  /\bregardless of\b/i,
];

/** Definitional / holding language — the regulator or court saying what the
 *  law MEANS, rather than what this party did. */
export const DEFINITIONAL_MARKERS: readonly RegExp[] = [
  /\bheld that\b/i,
  /\bruled that\b/i,
  /\bis defined as\b/i,
  /\bmeans, for the purposes of\b/i,
  /\bfor the purposes of (?:the |this )?(?:Article|Regulation|Act|Section|§)/i,
  /\bconstitutes?\b(?=[^.]*\b(?:within the meaning|for the purposes)\b)/i,
  /\bwithin the meaning of\b/i,
  /\bthe (?:test|standard) (?:is|requires)\b/i,
  /\binterprets?\b/i,
];

/** Plain modal verbs. Present in nearly every legal sentence ever written;
 *  recorded, never decisive on their own. */
export const MODAL_MARKERS: readonly RegExp[] = [
  /\brequires?\b/i,
  /\bmust\b/i,
  /\bshall\b/i,
  /\bis required\b/i,
  /\bobliged to\b/i,
];

/** Fact-pattern language — this party, this decision, this fine. */
export const FACT_PATTERN_MARKERS: readonly RegExp[] = [
  /\bthe (?:company|controller|respondent|defendant|investigated entity)\b/i,
  /\bwas fined\b/i,
  /\bimposed a fine\b/i,
  /\bfine of\b/i,
  /\bEUR\s?[\d.,]/,
  /€\s?[\d.,]/,
  /\bthe complainant\b/i,
  /\bfailed to\b/i,
  /\bin this case\b/i,
  /\bon the facts\b/i,
  /\bthe claimant\b/i,
];

function hits(text: string, patterns: readonly RegExp[]): string[] {
  const out: string[] = [];
  for (const p of patterns) {
    const m = text.match(p);
    if (m) out.push(m[0].toLowerCase());
  }
  return out;
}

export function stage1ExceptionMine(
  c: ClassificationCandidate,
  prior: Stage0Result,
): Stage1Result {
  // §6.1: the reviewable unit. Stage 1 reads the excerpt, the curation note
  // and the ratified bearing — never the source document.
  const text = [c.pinned_excerpt, c.curation_note, c.display_bearing ?? ""]
    .filter(Boolean)
    .join("\n");

  const categorical_markers = hits(text, CATEGORICAL_MARKERS);
  const definitional_markers = hits(text, DEFINITIONAL_MARKERS);
  const modal_markers = hits(text, MODAL_MARKERS);
  const fact_pattern_markers = hits(text, FACT_PATTERN_MARKERS);
  const clearsBar = categorical_markers.length > 0 || definitional_markers.length > 0;

  if (prior.prior === "pattern") {
    if (clearsBar) {
      return {
        is_exception: true,
        shortlist_for_stage2: true,
        categorical_markers,
        definitional_markers,
        modal_markers,
        fact_pattern_markers,
        basis:
          `pattern-prior row breaking its prior: categorical/definitional language present (${
            [...categorical_markers, ...definitional_markers].join(", ")
          }) — shortlisted for stage 2`,
      };
    }
    return {
      is_exception: false,
      shortlist_for_stage2: false,
      categorical_markers,
      definitional_markers,
      modal_markers,
      fact_pattern_markers,
      basis: modal_markers.length > 0
        ? `pattern-prior row holds: only plain modal language (${modal_markers.join(", ")}), which every enforcement note carries — stays at its stage-0 classification`
        : "pattern-prior row holds: no categorical or definitional language — stays at its stage-0 classification",
    };
  }

  // rule-eligible prior
  if (clearsBar) {
    return {
      is_exception: false,
      shortlist_for_stage2: true,
      categorical_markers,
      definitional_markers,
      modal_markers,
      fact_pattern_markers,
      basis:
        `rule-eligible-prior row behaving as predicted (${
          [...categorical_markers, ...definitional_markers].join(", ")
        }) — not an exception, but shortlisted for stage 2: a row that never reaches stage 2 can never be promoted`,
    };
  }
  return {
    is_exception: true,
    shortlist_for_stage2: false,
    categorical_markers,
    definitional_markers,
    modal_markers,
    fact_pattern_markers,
    basis:
      "rule-eligible-prior row breaking its prior in the SAFE direction: no categorical or definitional language, so the guidance pin reads as descriptive — flagged as an exception for the checkpoint sample, but not sent to stage 2 (there is nothing to extract) and left as pattern",
  };
}
