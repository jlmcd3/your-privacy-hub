// PROMPT 10A — GRADER RECALIBRATION FOR CONVERTED (skeleton-mode) DOCUMENTS.
// CEO-approved 2026-08-12. Calibration, not bar-lowering:
//   * every rule below cites a verified false positive from a real batch;
//   * filtered findings are NOT deleted — they persist to quality_findings with
//     filtered_from_scoring = true and the rule id, and render under a separate
//     "Filtered (calibration)" heading in the batch .md;
//   * the 98 certification threshold and every other check are untouched;
//   * this module is applied ONLY when grader_mode = "skeleton". Freeform
//     grading never reaches this code.
//
// NO other filter may ride along. Any additional false-positive class gets its
// own evidenced rule, CEO-approved first.

import type { LlmFinding } from "../../../_shared/grader/post-filters.ts";

// DOC 169 (2026-09-04, batch 50b8bcd4) — three deterministic rules for
// false-positive classes the PROSE calibration (DOC 165 (1)–(2), DOC 167 (4),
// (6), DOC 153 trailer) had already ratified but which both graders kept
// re-raising in the same words: cal_skeleton_7 (ratified fixed frames flagged
// as boilerplate), cal_skeleton_8 (a "truncated / cut off" claim against a
// whole-document payload), cal_skeleton_9 (§ 7150(b)(1) engaged on the
// categorical "share for advertising" answer flagged as a misapplied
// citation). Each cites the batch findings it answers. Per the doc-149
// INSTRUMENT RULE (nine tests pin it) the epoch PREFIX below is kept; the new
// rules are stamped on GRADER_CONTEXT_VERSION as the appended tag
// "+skeleton-cal-4-doc169[cal_skeleton_7|cal_skeleton_8|cal_skeleton_9]".
export const SKELETON_CAL_VERSION = "gc-2026-08-28-skeleton-cal-3-item204";

export type SkeletonCalRuleId =
  | "cal_skeleton_1"
  | "cal_skeleton_2"
  | "cal_skeleton_3"
  | "cal_skeleton_4"
  | "cal_skeleton_5"
  | "cal_skeleton_6"
  | "cal_skeleton_7"
  | "cal_skeleton_8"
  | "cal_skeleton_9";

export const SKELETON_CAL_RULE_IDS: readonly SkeletonCalRuleId[] = [
  "cal_skeleton_1",
  "cal_skeleton_2",
  "cal_skeleton_3",
  "cal_skeleton_4",
  "cal_skeleton_5",
  "cal_skeleton_6",
  "cal_skeleton_7",
  "cal_skeleton_8",
  "cal_skeleton_9",
];

/**
 * RATIFIED TEMPLATE REGISTRY — byte-pinned invariant spans of the CEO-ratified
 * assembler sentences (supabase/functions/_shared/ltp/dpia-skeleton-assemble.ts,
 * stamp dpia-skeleton-assembler@prompt8a-ratified-prose-2026-08-12, and the
 * PROMPT-10B coverage residual note).
 *
 * A registry match requires EVERY span of a template to be present, verbatim,
 * in the finding's quoted evidence (whitespace-normalised only). This is a
 * registry match, NOT a fuzzy/similarity match: prose that merely resembles a
 * template does not match, and boilerplate that is not a registered template
 * passes straight through.
 */
import { DPIA_ASK_LABELS } from "../../../_shared/ltp/dpia-ask-labels.ts";

export const RATIFIED_TEMPLATE_REGISTRY: Readonly<Record<string, readonly string[]>> =
  Object.freeze({
    // composeRiskBody — per-risk scoring head (rules 1 and 4). PROMPT 8D bytes.
    // Re-pinned 2026-08-21: PROMPT 9L.1 item 4 (CEO-ratified 2026-08-16) added
    // "aggregate" to this span ("with an aggregate initial risk level of") but
    // the registry span here was never updated to match, so three genuinely
    // ratified-template quotations escaped cal_skeleton_1 in batch ba742475.
    tmpl_risk_scoring_head: [
      "is assessed at",
      "likelihood and",
      "severity under this assessment's pre-set risk taxonomy",
      "an aggregate initial risk level of",
    ],
    // composeRiskBody — level not broken down (likelihood/severity not both recorded).
    tmpl_risk_band_not_decomposed: [
      "carries an initial risk level of",
      "under this assessment's pre-set risk taxonomy",
      "likelihood and severity are not both recorded, so that level is not broken down here",
    ],
    // composeRiskBody — measures mitigate the risk.
    tmpl_risk_measures_answer: [
      "The company's recorded",
      "mitigate it, and the remaining risk level",
    ],
    // composeRiskBody — no measure recorded.
    tmpl_risk_no_measure: [
      "The company records no measure against it, and the remaining risk level",
    ],
    // composeRiskBody — re-scoring caveat, stated once.
    tmpl_risk_caveat_first: [
      "the remaining risk level — preliminary until",
      "re-scores it against the mitigating measures once they have been deployed",
    ],
    // composeRiskBody — later rows reference the caveat.
    tmpl_risk_caveat_subsequent: [
      "the remaining risk level is",
      "on the same preliminary basis",
    ],
    // composeRiskBody — safeguards closer.
    tmpl_risk_safeguards_closer: [
      "Across the processing as a whole the company records",
    ],
    // composeExecutiveBody — the CEO canonical model (PROMPT 8D).
    tmpl_executive_canonical: [
      "This assessment reviews",
      "the measures the company has put in place to mitigate",
    ],
    // composeExecutiveBody — the preliminary-levels caveat.
    tmpl_executive_preliminary: [
      "the risk levels in this document are preliminary until",
      "re-scores them against the mitigating measures once they have been deployed",
    ],
    // buildRiskCountNote — the plain-form reconciliation disclosure (PROMPT 8D).
    tmpl_risk_count_note: [
      "The company self-identified",
      "this assessment surfaces",
    ],
    // PROMPT 8E item 1 — the reversed (stated > register) variant carries
    // "after consolidation" in place of "this assessment surfaces".
    tmpl_risk_count_note_reversed: [
      "The company self-identified",
      "after consolidation",
    ],
    // PROMPT 8F item 1 — composeArt36Sentence, the ratified DPO-advice
    // disclosure that rides beside the typed Art. 36 determination.
    tmpl_art36_dpo_disclosure: [
      "The company's data protection officer has advised that the supervisory authority be consulted on this processing",
      "which is stated above and is unchanged by it",
    ],
    // buildSection2Coverage — credit-first residual note (PROMPT 10B).
    tmpl_coverage_residual_note: [
      "The company's account above covers this ground",
      "would complete the table but no determination in this assessment turns on it",
    ],
    // PROMPT 9A — the R4 scope suffixes, ratified with the label registry.
    tmpl_ask_label_scope_two: [
      "for both the primary and the secondary use",
    ],
    tmpl_ask_label_scope_many: [
      "operations named in this assessment",
    ],
    // ── v4.6.2 (2026-08-25) — the DPIA polish round reworded the risk and
    // executive surfaces (preliminary-until-re-scored retired; "pre-set risk
    // taxonomy" → "the assessment's defined risk matrix"; risk-count note
    // recast with a Section 4 cross-reference; Article 5 / rights notes
    // restated as finished findings). The OLD entries above are retained so
    // findings quoting documents generated before the change still match;
    // the entries below pin the new composer bytes.
    tmpl_risk_scoring_head_v462: [
      "is assessed at",
      "likelihood and",
      "severity under the assessment's defined risk matrix",
      "an aggregate initial risk level of",
    ],
    tmpl_risk_band_not_decomposed_v462: [
      "carries an initial risk level of",
      "under the assessment's defined risk matrix",
      "likelihood and severity are not both recorded, so that level is not broken down here",
    ],
    tmpl_risk_residual_after_measures_v462: [
      "the remaining risk level is",
      "after those measures are taken into account",
    ],
    tmpl_executive_no_high_v462: [
      "Following application of the recorded mitigating measures",
      "no residual risk is rated High",
    ],
    tmpl_executive_ratings_reflect_v462: [
      "The residual-risk ratings stated in this assessment reflect the mitigating measures recorded in the assessment record",
    ],
    tmpl_risk_count_note_v462: [
      "The risk register contains",
      "identified through this assessment",
      "set out in Section 4",
    ],
    tmpl_risk_count_note_reversed_v462: [
      "risks in its own account",
      "after consolidation",
    ],
    tmpl_coverage_residual_note_principles_v462: [
      "no additional principle-by-principle breakdown is necessary to the determinations reached in this DPIA",
    ],
    tmpl_coverage_residual_note_rights_v462: [
      "no additional right-by-right breakdown is necessary to the determinations reached in this DPIA",
    ],
    // ── 2026-08-25 (batch be0f9e02) — DPIA Section 3's ratified template
    // sentences (dpia-skeleton-assemble.ts: the step leads, the step-3
    // conclusion, and the 9L.1 balance template). A finding that quotes
    // these frames is quoting ratified bytes; the SUBSTANCE inside the
    // quotes was separately fixed this same day (boundedPassage replaced
    // the clause bound, so fragments no longer render).
    tmpl_s3_step2_lead: [
      "The company describes how the processing achieves that goal",
    ],
    tmpl_s3_alternatives_lead: [
      "possible alternative", "to the proposed processing",
    ],
    tmpl_s3_step3_conclusion: [
      "whether a realistic, less intrusive method could achieve the same purpose",
      "each alternative the company considered was rejected for the reasons recorded",
    ],
    tmpl_s3_impact_lead: [
      "The impact on individual privacy rights is stated by the company separately from the benefit",
    ],
    tmpl_s3_balance: [
      "Balancing that impact against the goal stated above",
      "the processing is proportionate to the stated goal",
    ],
    // PROMPT 9A — one entry per ratified compact ask label (`tmpl_ask_label_<id>`),
    // derived from the pinned registry so the calibrated spans can never drift
    // from the label bytes. Slots are cut out; the fixed prose around them is
    // what a grader finding would quote.
    ...askLabelSpans(),

  });

/**
 * PROMPT 9A — the fixed (slot-free) segments of every ratified ask label.
 * A finding matches only when it quotes ALL of a label's fixed segments.
 */
function askLabelSpans(): Record<string, readonly string[]> {
  const out: Record<string, readonly string[]> = {};
  for (const [id, template] of Object.entries(DPIA_ASK_LABELS)) {
    const spans = template
      .split(/\{[a-z_]+\}/gu)
      .map((x) => x.replace(/\s+/gu, " ").trim())
      .filter((x) => x.length > 8);
    if (spans.length > 0) out[`tmpl_ask_label_${id}`] = Object.freeze(spans);
  }
  return out;
}

const norm = (s: string) => String(s ?? "").replace(/\s+/g, " ").trim();

// PROMPT 9J item 2 (CEO-approved 2026-08-16) — cal_skeleton_1 REGISTRY RE-PIN.
//
// MATCHER GAP, verified on run 2b21e54a finding 21a328d8: the grader quoted the
// shipped per-risk scoring head THREE TIMES and ELIDED each one with "..."
// ("...is assessed at Unlikely likelihood and Significant severity... Loss of
// control ... is assessed at Unlikely likelihood and Moderate severity..."),
// so the registry's trailing spans ("severity under this assessment's pre-set
// risk taxonomy", "an initial risk level of") were never present verbatim and
// the every-span rule failed. The 9I.1 paragraph split made elided multi-row
// quotations the normal shape of such a finding.
//
// The re-pin keeps the registry bytes and the exact (non-fuzzy) rule, and adds
// ONE tolerance: an ELIDED quotation of a registered template matches when the
// evidence carries an ellipsis and quotes an in-order PREFIX RUN of at least
// two of that template's spans. No new rule, no scope change.
const ELISION_RE = /(?:\u2026|\.\.\.)/;

function matchesAllSpans(ev: string, spans: readonly string[]): boolean {
  return spans.every((sp) => ev.includes(norm(sp)));
}

/** In-order prefix run of registry spans present in an elided quotation. */
function elidedPrefixRun(ev: string, spans: readonly string[]): number {
  let from = 0;
  let matched = 0;
  for (const sp of spans) {
    const needle = norm(sp);
    const at = ev.indexOf(needle, from);
    if (at < 0) break;
    from = at + needle.length;
    matched++;
  }
  if (matched === 0) return 0;
  // The elision must sit at or after the quoted run — an unrelated ellipsis
  // earlier in the grader's own prose does not license the match.
  return ELISION_RE.test(ev.slice(from - 1)) ? matched : 0;
}

/** Returns the registry id of the ratified template the evidence quotes, or null. */
export function matchRatifiedTemplate(evidence: string): string | null {
  const ev = norm(evidence);
  if (!ev) return null;
  for (const [id, spans] of Object.entries(RATIFIED_TEMPLATE_REGISTRY)) {
    if (matchesAllSpans(ev, spans)) return id;
  }
  if (!ELISION_RE.test(ev)) return null;
  for (const [id, spans] of Object.entries(RATIFIED_TEMPLATE_REGISTRY)) {
    if (spans.length >= 2 && elidedPrefixRun(ev, spans) >= 2) return id;
  }
  return null;
}

// RULE 2 — faithful reproduction of the controller's own legal-basis selection.
// The grader's own text concedes the document reproduces the intake faithfully
// and carries the non-substitution caveat (batches 44ce3b79, aaccfc99).
const R2_SUBJECT_RES: readonly RegExp[] = [
  /\blegal basis\b/i,
  /\bArticle\s*6\s*\(\s*1\s*\)/i,
  /\bArt\.?\s*6\s*\(\s*1\s*\)/i,
  /\bbasis selection\b/i,
  /\bselected basis\b/i,
];
const R2_CONCESSION_RES: readonly RegExp[] = [
  /\bfaithful(?:ly)?\s+reproduc\w*/i,
  /\breproduces?\s+the\s+intake\b/i,
  /\breproduces?\s+the\s+(?:controller|company)(?:'s)?\s+(?:own\s+)?(?:selection|answer|choice)\b/i,
  /\bnon-?substitution\b/i,
  /\bdoes not substitute\b/i,
  /\bthe assessment does not (?:re-?select|substitute|override)\b/i,
];

// RULE 3 — a disclosed, attributed reconciliation is not an unsupported claim.
// The risk_count_note carries the provenance disclosure in full (run 48f60433).
const R3_PROVENANCE_RE =
  /includes risks this assessment itself projects/i;

// RULE 5 — INITIAL/REMAINING CONFLATION. CEO-approved 2026-08-12.
//
// EVIDENCE: run b82ba671 (batch run #182), documents 3 and 4 — high-severity
// citation/actionability findings quoting the ratified executive sentence
// "None is deemed a high risk based on the information the company provided"
// and calling it contradicted by Section 4's "initial risk level of high".
// The persisted risk registers for both documents carry NO row with
// residual_band === "high": the executive sentence speaks to the REMAINING
// level and is correct; the grader conflated the initial (inherent) level
// with the remaining one.
//
// The matcher is deliberately narrow: all three conditions must hold.
//   (a) the finding quotes the executive high-risk sentence (or its
//       {n}-are-deemed variants) and calls it contradicted/inconsistent;
//   (b) the contradiction it cites is an INITIAL/inherent-level statement,
//       and it does NOT cite a remaining/residual high level;
//   (c) the persisted register shows no residual_band === "high".
// A genuine remaining-high contradiction, or a register that really does
// carry a residual high, passes straight through.
const R5_EXEC_SENTENCE_RES: readonly RegExp[] = [
  /None is deemed a high risk based on the information the company provided/i,
  /\bof these risks (?:is deemed a high risk|are deemed high risks)\b/i,
  // v4.6.2 wording — same REMAINING-level semantics, new bytes.
  /Following application of the recorded mitigating measures, no residual risk is rated High/i,
  /\bof these risks (?:is|are) rated High after the recorded mitigating measures\b/i,
];
const R5_CONTRADICTION_RE =
  /\b(contradict\w*|inconsisten\w*|conflict\w*|at odds with|is not consistent with)\b/i;
const R5_INITIAL_RES: readonly RegExp[] = [
  /\binitial risk level of high\b/i,
  /\binherent risk level of high\b/i,
  /\binitial (?:risk )?(?:level|rating|band)\b[^.]{0,60}\bhigh\b/i,
  /\bsevere severity\b[^.]{0,80}\binitial\b/i,
  /\binitial\b[^.]{0,80}\bsevere severity\b/i,
];
const R5_REMAINING_HIGH_RES: readonly RegExp[] = [
  /\b(remaining|residual) risk level (?:of |is |: )?high\b/i,
  /\bhigh\b[^.]{0,40}\b(remaining|residual) risk level\b/i,
  /\b(remaining|residual) (?:risk )?(?:level|band|rating)\b[^.]{0,60}\bhigh\b/i,
];

/** True when the persisted report's risk register carries a residual high row. */
export function registerHasResidualHigh(report: unknown): boolean {
  const rows = (report as Record<string, unknown> | null | undefined)?.["risk_register"];
  if (!Array.isArray(rows)) return false;
  return rows.some((r) =>
    String((r as Record<string, unknown>)?.residual_band ?? "").trim().toLowerCase() === "high"
  );
}

function matchesRule5(ev: string, report: unknown): boolean {
  if (!R5_EXEC_SENTENCE_RES.some((r) => r.test(ev))) return false;
  if (!R5_CONTRADICTION_RE.test(ev)) return false;
  if (R5_REMAINING_HIGH_RES.some((r) => r.test(ev))) return false;
  if (!R5_INITIAL_RES.some((r) => r.test(ev))) return false;
  if (registerHasResidualHigh(report)) return false;
  return true;
}

// RULE 6 — ITEM-204: THE REPORT COMPUTES NO § 7121(a) COHORT. CEO-ruled
// 2026-08-25 (settled), calibration entry CEO-approved 2026-08-28 after the
// deduction recurred in three consecutive batches (fd703575, 3e9ad759,
// d1d2b3b8 — live instance: run 19d83cb4, "The report does not surface the
// April 1, 2028 cohort deadline applicable to Harborstone (revenue 'Over
// $100M' maps to the first cohort under 11 CCR § 7121(a)(1))"). The cyber
// product DELIBERATELY does not map the company's revenue to a § 7121(a)
// certification cohort or compute the preparation window; this rule encodes
// that ratified product-scope ruling, exactly as the skeleton-template rules
// encode ratified prose. DELIBERATELY NARROW: it matches only a finding
// whose complaint is that the report FAILS TO PERFORM the cohort mapping /
// deadline computation. A finding that the report MISSTATED a cohort,
// misquoted § 7121, or got a deadline WRONG carries an affirmative-error
// verb shape, not this omission shape, and passes straight through.
const R6_COHORT_RE = /\bcohorts?\b/i;
const R6_7121_RE = /7121\s*\(\s*a\s*\)/;
const R6_OMISSION_RES: readonly RegExp[] = [
  /\bdoes not (?:surface|state|map|identify|calculate|compute|provide)\b/i,
  /\bnever (?:states|maps|identifies|calculates|computes)\b/i,
  /\bfails? to (?:surface|state|map|identify|calculate|compute)\b/i,
  /\bmust perform the mapping\b/i,
  /\b(?:no|without a?n?y?) (?:cohort|deadline) (?:mapping|determination|analysis|calculation)\b/i,
];
const R6_AFFIRMATIVE_ERROR_RES: readonly RegExp[] = [
  /\b(?:incorrect|wrong|misstate\w*|misquote\w*|misappl\w*|erroneous)\b/i,
  /\bcontradict\w*\b/i,
];

function matchesRule6(ev: string): boolean {
  if (!R6_7121_RE.test(ev)) return false;
  if (!R6_COHORT_RE.test(ev)) return false;
  if (!R6_OMISSION_RES.some((r) => r.test(ev))) return false;
  if (R6_AFFIRMATIVE_ERROR_RES.some((r) => r.test(ev))) return false;
  return true;
}

// RULE 7 — RATIFIED FIXED FRAMES ARE NOT BOILERPLATE. DOC 169 (batch
// 50b8bcd4, 2026-09-04): five rubric_generic_boilerplate findings across
// four cppa_risk documents quoted, in the same words, sentences the prose
// calibration had already ratified as fixed frames — the § 3.C choice-
// architecture confirmed/unconfirmed sentence (DOC 165 (1): Velospan,
// Cloverpath, Velostream), Section 1 "How This Assessment Decides" (DOC 165
// (2): Claritex, Velospan) and the § 3.B closer "The necessity analysis is
// qualified" (DOC 167 (6): Velostream). The match is on the ratified
// sentence's own invariant words, never on a paraphrase.
const R7_RATIFIED_FRAME_RES: readonly RegExp[] = [
  /How This Assessment Decides/i,
  /EUP Decision Logic/i,
  /Qualitative Refinement/i,
  /\bSection 1\b[^.]{0,160}\b(?:fixed|framework|methodology)\b/i,
  /does not confirm the absence of steering design elements/i,
  /Each unconfirmed fact is treated as a live interference risk/i,
  /The necessity analysis is qualified/i,
  /the Activity may proceed while the conditions in § ?4\.D are completed/i,
  /The Company states the purpose of the Activity as follows/i,
];

// RULE 8 — A TRUNCATION CLAIM AGAINST A WHOLE-DOCUMENT PAYLOAD. DOC 153 made
// completeness a fact the grader reads (the END OF DOCUMENT trailer); DOC 169
// (batch 50b8bcd4): two rubric_actionability findings (Clearpath, Velostream)
// reported the report "truncated at" § 4.B — the all-products path had in
// fact sliced the document to a 30,000-character budget, which DOC 169 also
// fixed. With the payload whole, a truncation claim is the grader's own
// inference, not a defect; callers that KNOW the payload was cut pass
// `payloadComplete: false` and the rule stands down.
const R8_TRUNCATION_CLAIM_RES: readonly RegExp[] = [
  /\b(?:document|report|text|section)\b[^.]{0,80}\b(?:is|was|appears(?: to be)?|seems(?: to be)?)\s+truncated\b/i,
  /\btruncated at\b/i,
  /\bcut(?:s)? off\b/i,
  /\bnot visible in the graded text\b/i,
  /\b(?:is|was|appears) (?:incomplete|missing) (?:in|from) the graded (?:text|document|payload)\b/i,
];

// RULE 9 — § 7150(b)(1) ENGAGED ON THE CATEGORICAL SELL/SHARE ANSWER (DOC 167
// (4), restated in DOC 169): "Yes — share for advertising only" is the
// paradigm case of "sharing" (cross-context behavioral advertising, Cal. Civ.
// Code § 1798.140(ah)); a citation finding that the trigger row "does not
// mention cross-context behavioral advertising" (Velospan, batch 50b8bcd4)
// asks the row to restate the statutory definition, which is not a defect.
const R9_B1_SUBJECT_RE = /7150\s*\(\s*b\s*\)\s*\(\s*1\s*\)/i;
const R9_B1_SHARING_RES: readonly RegExp[] = [
  /cross-?context behavio(?:u)?ral advertising/i,
  /share(?:s|d)? for advertising/i,
  /\bsharing\b[^.]{0,80}\badvertising\b/i,
];

export function matchesRule7(checkId: string, ev: string): boolean {
  return checkId === "rubric_generic_boilerplate" && R7_RATIFIED_FRAME_RES.some((r) => r.test(ev));
}
export function matchesRule8(ev: string, payloadComplete: boolean | undefined): boolean {
  if (payloadComplete === false) return false;
  return R8_TRUNCATION_CLAIM_RES.some((r) => r.test(ev));
}
export function matchesRule9(checkId: string, ev: string): boolean {
  return checkId === "rubric_citation_misapplied" && R9_B1_SUBJECT_RE.test(ev) && R9_B1_SHARING_RES.some((r) => r.test(ev));
}

export type SkeletonCalFiltered = {
  rule: SkeletonCalRuleId;
  template_id: string | null;
  check_id: string;
  finding: LlmFinding;
};

export type SkeletonCalContext = {
  /** The persisted report whose register rule 5 consults. */
  readonly report?: unknown;
  /** DOC 169 — false when the caller KNOWS the payload was sliced; rule 8
   *  then stands down. Undefined/true = the payload carried the whole document. */
  readonly payloadComplete?: boolean;
};

/**
 * Applies the six CEO-approved skeleton calibration rules. Callers MUST gate
 * on grader_mode === "skeleton" — this function does not know the mode.
 */
export function applySkeletonCalibration(
  findings: LlmFinding[],
  ctx: SkeletonCalContext = {},
): {
  kept: LlmFinding[];
  filtered: SkeletonCalFiltered[];
  counts: Record<SkeletonCalRuleId, number>;
} {
  const counts: Record<SkeletonCalRuleId, number> = {
    cal_skeleton_1: 0,
    cal_skeleton_2: 0,
    cal_skeleton_3: 0,
    cal_skeleton_4: 0,
    cal_skeleton_5: 0,
    cal_skeleton_6: 0,
    cal_skeleton_7: 0,
    cal_skeleton_8: 0,
    cal_skeleton_9: 0,
  };
  const filtered: SkeletonCalFiltered[] = [];
  const kept: LlmFinding[] = [];

  for (const f of findings ?? []) {
    if (!f || typeof f !== "object") continue;
    const checkId = typeof f.check_id === "string" ? f.check_id : "";
    const ev = typeof f.evidence === "string" ? f.evidence : String(f.evidence ?? "");
    // Only real findings are candidates; passes are never filtered.
    if (f.passed === true || !ev) { kept.push(f); continue; }

    const drop = (rule: SkeletonCalRuleId, template_id: string | null) => {
      counts[rule]++;
      filtered.push({ rule, template_id, check_id: checkId || "unknown", finding: f });
    };

    // RULE 1 — ratified-template repetition is not boilerplate.
    if (checkId === "rubric_generic_boilerplate") {
      const t = matchRatifiedTemplate(ev);
      if (t) { drop("cal_skeleton_1", t); continue; }
      // RULE 7 — DOC 169: the ratified fixed frames (DOC 165 (1)–(2), DOC 167 (6)).
      if (matchesRule7(checkId, ev)) { drop("cal_skeleton_7", null); continue; }
    }

    // RULE 9 — DOC 169: § 7150(b)(1) on the categorical sell/share answer (DOC 167 (4)).
    if (matchesRule9(checkId, ev)) { drop("cal_skeleton_9", null); continue; }

    // RULE 2 — faithful reproduction of the controller's selection is not miscitation.
    if (checkId === "rubric_citation_misapplied") {
      if (
        R2_SUBJECT_RES.some((r) => r.test(ev)) &&
        R2_CONCESSION_RES.some((r) => r.test(ev))
      ) { drop("cal_skeleton_2", null); continue; }
    }

    if (checkId === "rubric_unsupported_business_claim") {
      // RULE 3 — disclosed, attributed reconciliation.
      if (R3_PROVENANCE_RE.test(ev)) { drop("cal_skeleton_3", null); continue; }
      // RULE 4 — the assessment's own attributed analysis is not a business claim.
      const t = matchRatifiedTemplate(ev);
      if (t) { drop("cal_skeleton_4", t); continue; }
    }

    // RULE 5 — initial/remaining conflation against the ratified executive
    // high-risk sentence (run b82ba671 docs 3 and 4).
    if (matchesRule5(ev, ctx.report)) { drop("cal_skeleton_5", null); continue; }

    // RULE 6 — ITEM-204: the report deliberately computes no § 7121(a)
    // cohort; the recurring omission complaint enforces a superseded
    // expectation, not a defect (run 19d83cb4 and two prior batches).
    if (matchesRule6(ev)) { drop("cal_skeleton_6", null); continue; }

    // RULE 8 — DOC 169: a truncation claim against a whole-document payload
    // (DOC 153's END OF DOCUMENT trailer makes completeness a read fact).
    if (matchesRule8(ev, ctx.payloadComplete)) { drop("cal_skeleton_8", null); continue; }

    kept.push(f);
  }

  return { kept, filtered, counts };
}
