/**
 * ITEM 321 (PROMPT C) — SINGLE SOURCE OF TRUTH for the § 7156(a)
 * comparable-set bundling recommendation.
 *
 * Item 319 (Prompt A) introduced the directive recommendation inside the
 * cppa-risk section composer. Prompt C surfaces the SAME recommendation as an
 * in-app follow-up panel, so the verdict, the diverging-dimension list and the
 * recommendation prose are lifted here VERBATIM and consumed by both:
 *
 *   - `section-composers/cppa-risk.ts`  (report prose, Item 319)
 *   - `src/components/cppa/SecondaryActivityFollowUps.tsx` (in-app panel)
 *
 * The panel must never re-derive the recommendation; if these two ever
 * disagree the report and the UI would give the customer conflicting advice.
 * This module is pure TypeScript with no Deno/runtime imports precisely so the
 * browser bundle can import it.
 *
 * SCOPE BOUNDARY (CEO, Item 319): this concerns ONLY the bundling /
 * comparable-set call for SECONDARY activities. Nothing here touches the
 * primary activity's five § 7152 analytic deliverables.
 */

/** § 7156(a) comparable-set dimensions, keyed as the Item-275 intake emits them. */
export const DIVERGENCE_DIMENSION_LABELS: Readonly<Record<string, string>> = {
  data: "the personal information used",
  purpose: "the purpose of the processing",
  systems: "the systems, technology, and service providers used",
  people: "the consumers whose information is processed",
  risks: "the risks to consumers' privacy and the safeguards applied",
};

export const SECONDARY_ANCHOR_7156A = "11 CCR § 7156(a)";

/**
 * Closing line required by Item 319: the recommendation is the tool's
 * operational recommendation, never a statement of what the law requires.
 */
export const SECONDARY_RECOMMENDATION_DISCLAIMER =
  "The recommendation above is this tool's operational recommendation on the record as submitted — it is not a statement of what the law requires, is not legal advice, and does not replace review by qualified counsel.";

export interface SecondaryActivityRow {
  readonly name: string;
  readonly purpose: string;
  readonly divergence: Readonly<Record<string, string>>;
}

export type SecondaryVerdict = "single" | "separate" | "unresolved";

export interface SecondaryRecommendationResult {
  readonly verdict: SecondaryVerdict;
  readonly diverging: string[];
  readonly unresolved: string[];
}

const joinList = (labels: readonly string[]): string => {
  const clean = labels.filter((s) => typeof s === "string" && s.trim().length > 0);
  if (clean.length === 0) return "";
  if (clean.length === 1) return clean[0];
  if (clean.length === 2) return `${clean[0]} and ${clean[1]}`;
  return `${clean.slice(0, -1).join(", ")}, and ${clean[clean.length - 1]}`;
};

/**
 * ITEM 319 (PROMPT A) — SHIPPED DIVERGENCE THRESHOLD.
 *
 * A dimension "diverges" ONLY when the record answers "Different". The
 * recommendation threshold is ANY-DIVERGENCE: one divergent dimension out of
 * the five § 7156(a)(1)-derived dimensions is enough to recommend a separate
 * risk assessment. Where nothing diverges but one or more dimensions are
 * unresolved ("Not sure"), the tool does NOT recommend bundling — it
 * recommends resolving the unresolved dimensions first. Locked by
 * `item319-secondary-recommendation.test.ts`; do not change silently.
 */
export function secondaryRecommendation(
  divergence: Readonly<Record<string, string>>,
): SecondaryRecommendationResult {
  const keys = Object.keys(DIVERGENCE_DIMENSION_LABELS);
  const diverging = keys.filter((k) => divergence[k] === "Different");
  // ITEM 336 (a): anything that is neither "Same" nor "Different" — including a
  // missing key and any malformed/unrecognized value — is UNRESOLVED. Before
  // this fix an unrecognized value silently counted as "Same" and leaned the
  // verdict toward bundling.
  const unresolved = keys.filter((k) => {
    const v = divergence[k];
    return v !== "Same" && v !== "Different";
  });
  const verdict: SecondaryVerdict = diverging.length > 0
    ? "separate"
    : unresolved.length > 0
      ? "unresolved"
      : "single";
  return { verdict, diverging, unresolved };
}

/** The exact Item-319 recommendation sentence for one secondary activity. */
export function secondaryRecommendationSentence(row: SecondaryActivityRow): string {
  const { verdict, diverging, unresolved } = secondaryRecommendation(row.divergence);
  const labels = (keys: string[]) => joinList(keys.map((k) => DIVERGENCE_DIMENSION_LABELS[k]));
  if (verdict === "separate") {
    return `Recommended: conduct a separate risk assessment for ${row.name}. We recommend this because ${
      diverging.length === 1 ? "one dimension of the comparison diverges" : `${diverging.length} dimensions of the comparison diverge`
    } from the assessed activity — ${labels(diverging)}.`;
  }
  if (verdict === "unresolved") {
    return `Recommended: resolve the open dimensions for ${row.name} before deciding. No dimension is recorded as different, but ${labels(unresolved)} ${
      unresolved.length === 1 ? "is" : "are"
    } unresolved on the record; we recommend a separate risk assessment for this activity unless ${
      unresolved.length === 1 ? "that dimension is" : "those dimensions are"
    } confirmed to be the same.`;
  }
  return `Recommended: ${row.name} can be addressed within this single assessment. We recommend this because none of the five comparison dimensions is recorded as differing from the assessed activity.`;
}

/** The customer's own comparison, reproduced in full (recommendation is additive). */
export function secondaryComparisonLines(
  row: SecondaryActivityRow,
): { key: string; label: string; verdict: string }[] {
  return Object.keys(DIVERGENCE_DIMENSION_LABELS).map((k) => {
    const answer = row.divergence[k] || "Not sure";
    return {
      key: k,
      label: DIVERGENCE_DIMENSION_LABELS[k],
      verdict: answer === "Same"
        ? "recorded as the same as the assessed activity"
        : answer === "Different"
          ? "recorded as different from the assessed activity"
          : "not resolved on the record",
    };
  });
}

/**
 * Normalizes raw `secondary_activities` intake (array OR the JSON string the
 * ledger carries) into rows. Malformed payloads degrade to an empty set.
 */
export function parseSecondaryActivities(raw: unknown): SecondaryActivityRow[] {
  let value: unknown = raw;
  if (typeof value === "string") {
    if (!value.trim()) return [];
    try {
      value = JSON.parse(value);
    } catch {
      return [];
    }
  }
  if (!Array.isArray(value)) return [];
  const out: SecondaryActivityRow[] = [];
  for (const r of value) {
    if (!r || typeof r !== "object") continue;
    const rec = r as Record<string, unknown>;
    const name = typeof rec.name === "string" ? rec.name.trim() : "";
    if (!name) continue;
    const purpose = typeof rec.purpose === "string" ? rec.purpose.trim() : "";
    const divergence: Record<string, string> = {};
    const d = rec.divergence;
    if (d && typeof d === "object") {
      for (const [k, v] of Object.entries(d as Record<string, unknown>)) {
        if (typeof v === "string" && v.trim()) divergence[k] = v.trim();
      }
    }
    out.push({ name, purpose, divergence });
  }
  return out;
}

export interface SecondaryFollowUp {
  readonly row: SecondaryActivityRow;
  readonly verdict: SecondaryVerdict;
  readonly diverging: string[];
  readonly unresolved: string[];
  readonly recommendation: string;
  readonly comparison: { key: string; label: string; verdict: string }[];
}

/**
 * ITEM 321 — the follow-up SET: exactly those secondary activities whose
 * Item-319 verdict is NOT "single". A "single" verdict means the activity can
 * be addressed within this assessment, so it gets no panel and no action.
 */
export function secondaryFollowUps(raw: unknown): SecondaryFollowUp[] {
  return parseSecondaryActivities(raw)
    .map((row) => {
      const { verdict, diverging, unresolved } = secondaryRecommendation(row.divergence);
      return {
        row,
        verdict,
        diverging,
        unresolved,
        recommendation: secondaryRecommendationSentence(row),
        comparison: secondaryComparisonLines(row),
      };
    })
    .filter((f) => f.verdict !== "single");
}
