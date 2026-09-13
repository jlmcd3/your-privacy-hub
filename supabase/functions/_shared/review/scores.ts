// /all-ptest — SCORING.
//
// Two independent numbers per reviewed document:
//
//   REPORTED  (Option B) — the reviewer's own six-dimension verdict, using the
//             SAME dimensions /all-products-test grades on, so batches here are
//             comparable with the grader history. It rides in the existing
//             review response; no extra model call is made for it.
//   DERIVED   (Option A) — computed here from the validated findings alone:
//             100 minus a severity-weighted deduction per finding. Free,
//             deterministic, and fully traceable to quoted text.
//
// The reported score is the headline (CEO decision, 2026-09-13). The derived
// score is the cross-check: when the two diverge by more than DIVERGENCE_FLAG
// the reviewer's number and its own findings disagree, which is a signal about
// the REVIEW, not about the document. The divergence is recorded, never hidden.

/** The six /all-products-test dimensions, reused verbatim for comparability. */
export const SCORE_DIMENSIONS = [
  "accuracy",
  "citation",
  "hallucination",
  "analysis",
  "intelligence",
  "formatting",
] as const;

export type ScoreDimension = typeof SCORE_DIMENSIONS[number];
export type DimensionScores = Record<ScoreDimension, number>;

/** Deduction per finding, by severity. CEO-approved values (2026-09-13). */
export const SEVERITY_WEIGHTS: Record<string, number> = {
  critical: 15,
  major: 7,
  high: 7,
  minor: 3,
  editorial: 1,
};
const DEFAULT_WEIGHT = 3;

/** Reported vs derived gap, in points, above which the pair is flagged. */
export const DIVERGENCE_FLAG = 15;

const clamp = (n: number) => Math.max(0, Math.min(100, n));

const num = (v: unknown): number | null => {
  const n = typeof v === "number" ? v : typeof v === "string" ? Number(v) : NaN;
  return Number.isFinite(n) ? clamp(n) : null;
};

export interface ParsedScores {
  dimension_scores: DimensionScores | null;
  overall_score: number | null;
}

/**
 * Reads the reviewer's score block. A missing or unparseable block is NOT an
 * error — findings are the primary product of a review and must never be lost
 * because a number was malformed. Missing scores read as null.
 */
export function parseReportedScores(raw: unknown): ParsedScores {
  const src = (raw ?? {}) as Record<string, unknown>;
  const dims = (src.dimension_scores ?? null) as Record<string, unknown> | null;
  let dimension_scores: DimensionScores | null = null;

  if (dims && typeof dims === "object") {
    const out = {} as DimensionScores;
    let found = 0;
    for (const d of SCORE_DIMENSIONS) {
      const v = num(dims[d]);
      if (v !== null) found++;
      out[d] = v ?? 60;
    }
    // A block naming fewer than half the dimensions is not a verdict.
    if (found >= SCORE_DIMENSIONS.length / 2) dimension_scores = out;
  }

  let overall = num(src.overall_score);
  if (overall === null && dimension_scores) {
    const total = SCORE_DIMENSIONS.reduce((s, d) => s + dimension_scores![d], 0);
    overall = clamp(Math.round((total / SCORE_DIMENSIONS.length) * 10) / 10);
  }
  return { dimension_scores, overall_score: overall };
}

/** Option A: 100 minus the severity-weighted deduction for every finding. */
export function deriveScoreFromFindings(findings: Array<{ severity?: string | null }>): number {
  let deduction = 0;
  for (const f of findings) {
    const key = (f.severity ?? "").toString().trim().toLowerCase();
    deduction += SEVERITY_WEIGHTS[key] ?? DEFAULT_WEIGHT;
  }
  return clamp(Math.round((100 - deduction) * 10) / 10);
}

/** Arithmetic mean to one decimal, or null when nothing is scored. */
export function mean(values: Array<number | null | undefined>): number | null {
  const nums = values.filter((v): v is number => typeof v === "number" && Number.isFinite(v));
  if (!nums.length) return null;
  return Math.round((nums.reduce((a, b) => a + b, 0) / nums.length) * 10) / 10;
}

/** Human-readable note when the reported and derived scores disagree. */
export function divergenceNote(reported: number | null, derived: number | null): string | null {
  if (reported === null || derived === null) return null;
  const gap = Math.round(Math.abs(reported - derived) * 10) / 10;
  if (gap <= DIVERGENCE_FLAG) return null;
  return `reported ${reported} vs derived ${derived} — ${gap} point gap between the reviewer's score and its own findings`;
}
