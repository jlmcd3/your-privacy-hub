// A2 (2026-07-24) — DETERMINISTIC aggregate computation and pre-emit scrub
// for cppa-cyber. The model must NEVER author aggregate figures (mean,
// average, count-out-of-N distributions) over the 18 § 7123(c) components.
// This module:
//   1. Computes the aggregates from the report's own controls[] array using
//      the STATUS↔SCORE rubric (PF6 T2 doctrine: mean is over SCORED
//      components only, excluding "Insufficient information").
//   2. Scrubs model-authored mean/average phrasing from executive_summary
//      (and top_risks / next_steps prose) and replaces it with the
//      deterministic sentence.
//   3. Injects the aggregates block into the report as a first-class slot
//      so downstream renderers can surface a canonical figure.
//   4. Emits telemetry counters for replacements performed.
//
// Idempotent, fail-open. No LLM calls. No fabrication.

export const W10_CYBER_AGG_STAMP = "w10-cyber-aggregates@2026-07-24";

const INSUFF_RE = /^\s*insufficient\s+information\s*$/i;

export interface CyberAggregates {
  total_components: number;         // always 18 (canonical)
  scored_count: number;             // status ∈ {Critical Gap, Gap, Partial, Implemented, Mature}
  insufficient_count: number;       // status = Insufficient information
  mean_score: number | null;        // rounded to nearest int over SCORED only; null when scored_count = 0
  distribution: Record<string, number>;
  canonical_sentence: string;
}

function normStatus(s: unknown): string {
  return String(s ?? "").trim();
}

export function computeCyberAggregates(controls: any[]): CyberAggregates {
  const list = Array.isArray(controls) ? controls : [];
  const distribution: Record<string, number> = {};
  let scoredSum = 0;
  let scoredCount = 0;
  let insufficient = 0;
  for (const c of list) {
    const status = normStatus((c as any)?.status);
    distribution[status] = (distribution[status] ?? 0) + 1;
    if (INSUFF_RE.test(status)) { insufficient++; continue; }
    if (!status) continue;
    const score = Number((c as any)?.score);
    if (!Number.isFinite(score)) continue;
    scoredSum += score;
    scoredCount++;
  }
  const mean = scoredCount > 0 ? Math.round(scoredSum / scoredCount) : null;
  const canonical_sentence = mean === null
    ? `No components were scored on this record; ${insufficient} of 18 § 7123(c) components are Insufficient information.`
    : `Mean of ${mean} across the ${scoredCount} scored component${scoredCount === 1 ? "" : "s"} (excluding ${insufficient} Insufficient-information component${insufficient === 1 ? "" : "s"}).`;
  return {
    total_components: 18,
    scored_count: scoredCount,
    insufficient_count: insufficient,
    mean_score: mean,
    distribution,
    canonical_sentence,
  };
}

// Sentence-level replacer: any sentence containing a mean/average/aggregate
// score phrasing is replaced by the deterministic canonical sentence.
const AGG_SENTENCE_RE = /[^.;]*\b(?:mean|average|aggregate)(?:\s+(?:score|of))?[^.;]*\b\d{1,3}(?:\.\d+)?[^.;]*[.;]/gi;

// Broader single-figure catch: "score of 81", "scored 81", "an 81", "mean score 81".
const LOOSE_SCORE_RE = /\b(?:mean(?:\s+score)?|average(?:\s+score)?|aggregate(?:\s+score)?)\s+(?:of\s+)?\d{1,3}(?:\.\d+)?\b/gi;

export function scrubAuthoredAggregates(
  text: string,
  agg: CyberAggregates,
): { out: string; replaced: number } {
  if (!text || typeof text !== "string") return { out: text ?? "", replaced: 0 };
  let replaced = 0;
  let out = text;
  // ITEM 315 — DEDUP LAW. Prior behaviour replaced EVERY authored aggregate
  // sentence with the same canonical sentence, so a summary carrying two mean
  // sentences emitted the canonical sentence verbatim twice. Only the FIRST
  // occurrence now emits the canonical sentence; later occurrences are dropped.
  let emitted = false;
  const emit = (): string => {
    replaced++;
    if (emitted) return " ";
    emitted = true;
    return ` ${agg.canonical_sentence}`;
  };
  // Full-sentence replacement first — preserves paragraph structure.
  out = out.replace(AGG_SENTENCE_RE, emit);
  // Fallback: neutralize any surviving loose mean/average token.
  out = out.replace(LOOSE_SCORE_RE, () => {
    replaced++;
    if (emitted) return "figure stated above";
    emitted = true;
    return agg.canonical_sentence.replace(/\.$/, "");
  });
  return { out: out.replace(/\s{2,}/g, " ").trim(), replaced };
}


export interface AggApplyResult {
  aggregates: CyberAggregates;
  authoredAggregatesReplaced: number;
  slotsInjected: string[];
}

export function attachCyberAggregates(report: any): AggApplyResult {
  const result: AggApplyResult = {
    aggregates: computeCyberAggregates(Array.isArray(report?.controls) ? report.controls : []),
    authoredAggregatesReplaced: 0,
    slotsInjected: [],
  };
  if (!report || typeof report !== "object") return result;
  const agg = result.aggregates;

  if (typeof report.executive_summary === "string") {
    const { out, replaced } = scrubAuthoredAggregates(report.executive_summary, agg);
    if (replaced > 0) report.executive_summary = out;
    result.authoredAggregatesReplaced += replaced;
  }
  for (const key of ["top_risks", "next_steps"] as const) {
    const arr = (report as any)[key];
    if (!Array.isArray(arr)) continue;
    for (let i = 0; i < arr.length; i++) {
      const item = arr[i];
      if (typeof item === "string") {
        const { out, replaced } = scrubAuthoredAggregates(item, agg);
        if (replaced > 0) { arr[i] = out; result.authoredAggregatesReplaced += replaced; }
      } else if (item && typeof item === "object") {
        for (const k of Object.keys(item)) {
          if (typeof item[k] !== "string") continue;
          const { out, replaced } = scrubAuthoredAggregates(item[k], agg);
          if (replaced > 0) { item[k] = out; result.authoredAggregatesReplaced += replaced; }
        }
      }
    }
  }

  (report as any).aggregates = agg;
  result.slotsInjected.push("aggregates");
  return result;
}
