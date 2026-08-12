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

import type { LlmFinding } from "./post-filters.ts";

export const SKELETON_CAL_VERSION = "gc-2026-08-12-skeleton-cal-1";

export type SkeletonCalRuleId =
  | "cal_skeleton_1"
  | "cal_skeleton_2"
  | "cal_skeleton_3"
  | "cal_skeleton_4";

export const SKELETON_CAL_RULE_IDS: readonly SkeletonCalRuleId[] = [
  "cal_skeleton_1",
  "cal_skeleton_2",
  "cal_skeleton_3",
  "cal_skeleton_4",
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
export const RATIFIED_TEMPLATE_REGISTRY: Readonly<Record<string, readonly string[]>> =
  Object.freeze({
    // composeRiskBody — per-risk scoring head (rules 1 and 4). PROMPT 8D bytes.
    tmpl_risk_scoring_head: [
      "is assessed at",
      "likelihood and",
      "severity under this assessment's pre-set risk taxonomy",
      "an initial risk level of",
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

  });

const norm = (s: string) => String(s ?? "").replace(/\s+/g, " ").trim();

/** Returns the registry id of the ratified template the evidence quotes, or null. */
export function matchRatifiedTemplate(evidence: string): string | null {
  const ev = norm(evidence);
  if (!ev) return null;
  for (const [id, spans] of Object.entries(RATIFIED_TEMPLATE_REGISTRY)) {
    if (spans.every((sp) => ev.includes(norm(sp)))) return id;
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

export type SkeletonCalFiltered = {
  rule: SkeletonCalRuleId;
  template_id: string | null;
  check_id: string;
  finding: LlmFinding;
};

/**
 * Applies the four CEO-approved skeleton calibration rules. Callers MUST gate
 * on grader_mode === "skeleton" — this function does not know the mode.
 */
export function applySkeletonCalibration(findings: LlmFinding[]): {
  kept: LlmFinding[];
  filtered: SkeletonCalFiltered[];
  counts: Record<SkeletonCalRuleId, number>;
} {
  const counts: Record<SkeletonCalRuleId, number> = {
    cal_skeleton_1: 0,
    cal_skeleton_2: 0,
    cal_skeleton_3: 0,
    cal_skeleton_4: 0,
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
    }

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

    kept.push(f);
  }

  return { kept, filtered, counts };
}
