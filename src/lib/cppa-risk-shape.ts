/**
 * ITEM 274 — VIEWER/PDF SHAPE PARITY.
 *
 * Frontend mirror of the LTP (Track-2) cppa-risk shape contract that lives at
 * supabase/functions/_shared/report-contracts/cppa-risk-shape.ts. The edge
 * exporter (generate-report-pdf/index.ts:1163-1171 `isLtpRiskShape`) branched
 * on this shape while the shipped on-screen viewer did not, so LTP reports
 * fell through to the V4 renderer — which expects object-shaped sections —
 * and rendered blank.
 *
 * SINGLE DISCRIMINATOR LAW: both the PDF path and the viewer dispatch MUST
 * consume `isLtpRiskShape` below (byte-equivalent logic to the edge copy).
 * Deno edge code cannot import from src/, so this module is the sanctioned
 * mirror; the parity test pins the two implementations to the same verdicts.
 */

/** Customer-first section headers — mirror of CPPA_RISK_HEADER_MAP. */
export const CPPA_RISK_HEADER_MAP: Readonly<Record<string, string>> = {
  opening_summary: "About this assessment",
  executive_summary: "What this assessment concludes",
  assessment_summary: "Why we reached this conclusion",
  scope_and_triggers: "What this assessment covers and what triggered it",
  scope_confirmation: "What this assessment covers and what triggered it",
  processing_narrative: "How the business processes personal information",
  risk_assessment_by_activity: "How the balancing frame reads for each covered activity",
  priority_actions: "What to do next, in order of priority",
  next_steps: "What to confirm on the record",
  strengthen_items: "Where the record is strong and how to keep it strong",
  exception_analysis: "Where the record admits a reserved exception",
  record_sufficiency: "How complete the record is against § 7152(a)",
  activity_analytics: "The § 7152(a) analysis, activity by activity",
  information_needed: "Items for your review",
  submission_summary: "How to submit and retain this assessment",
};

export function headerForSection(key: string, fallback?: string): string {
  return CPPA_RISK_HEADER_MAP[key] ?? fallback ?? key.replace(/_/g, " ");
}

/** Coerce a template render (string | string[]) to a single string. */
export function coerceNarrativeScalar(v: unknown): string | undefined {
  if (v === undefined || v === null) return undefined;
  if (typeof v === "string") return v.trim() ? v : undefined;
  if (Array.isArray(v)) {
    const parts = v
      .map((x) => (typeof x === "string" ? x : ""))
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
    return parts.length ? parts.join("\n\n") : undefined;
  }
  return undefined;
}

/** Coerce a narrative-list value into a string[] (paragraphs). */
export function coerceNarrativeList(v: unknown): string[] | undefined {
  if (v === undefined || v === null) return undefined;
  if (Array.isArray(v)) {
    const strs = v
      .map((x) => (typeof x === "string" ? x : ""))
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
    return strs.length ? strs : undefined;
  }
  if (typeof v === "string" && v.trim()) return [v];
  return undefined;
}

/**
 * THE discriminator. Byte-equivalent to generate-report-pdf's
 * `isLtpRiskShape` (index.ts:1163-1171).
 */
export function isLtpRiskShape(report: any): boolean {
  if (!report || typeof report !== "object") return false;
  const es = report.executive_summary;
  const as = report.assessment_summary;
  const hasStringExec = typeof es === "string" && es.trim().length > 0;
  const hasNarrativeBag =
    as && typeof as === "object" && !Array.isArray(as) && typeof as.narrative === "string";
  const hasStringOpening =
    typeof report.opening_summary === "string" && report.opening_summary.trim().length > 0;
  return hasStringExec || hasNarrativeBag || hasStringOpening;
}

/** Section keys the golden-shape quota table names, in shipped render order. */
export const LTP_SECTION_ORDER: readonly string[] = [
  "opening_summary",
  "executive_summary",
  "assessment_summary",
  "scope_and_triggers",
  "processing_narrative",
  "risk_assessment_by_activity",
  "exception_analysis",
  "priority_actions",
  "next_steps",
  "strengthen_items",
  "information_needed",
  "record_sufficiency",
  "submission_summary",
];

/**
 * ITEM 279 / ISSUE 12 — FAIL-LOUD VIEWER GUARD.
 *
 * Single place that names which renderer a report dispatches to. The viewer
 * MUST NEVER render an empty body for a payload no renderer claims: an
 * unrecognized shape is a defect, and it surfaces as an explicit error card
 * plus a console.error carrying this discriminator result.
 */
export type CppaRiskShape = "prose9" | "ltp" | "v3" | "v4" | "unrecognized";

/**
 * ITEM 369 — prose-9 envelope discriminator. MIRROR of `hasProse9Document` in
 * supabase/functions/_shared/report-contracts/cppa-risk-prose9.ts. Deno edge
 * code cannot import from src/, so this is the sanctioned mirror; both the PDF
 * exporter and this viewer MUST branch on this and nothing else.
 */
export const CPPA_RISK_PROSE9_SHAPE_VERSION = "cppa-risk-shape@2026-08-02-item369-prose9";

export function hasProse9Document(report: any): boolean {
  const d = report?.prose_document;
  return (
    !!d &&
    typeof d === "object" &&
    d.version === CPPA_RISK_PROSE9_SHAPE_VERSION &&
    Array.isArray(d.sections) &&
    d.sections.length > 0
  );
}

export interface CppaRiskShapeResult {
  shape: CppaRiskShape;
  recognized: boolean;
  reportId?: string;
  schemaVersion?: string;
  topLevelKeys: string[];
}

export function describeCppaRiskShape(
  report: any,
  isV4: (r: any) => boolean,
): CppaRiskShapeResult {
  const obj = report && typeof report === "object" ? report : {};
  const isProse9 = hasProse9Document(report);
  const isLtp = !isProse9 && isLtpRiskShape(report);
  const isV3 = !isProse9 && !isLtp && !!(obj.schema_version === "v3-part-a-part-b" && obj.part_a);
  const v4 = !isProse9 && !isLtp && !isV3 && isV4(report);
  const shape: CppaRiskShape = isProse9
    ? "prose9"
    : isLtp
      ? "ltp"
      : isV3
        ? "v3"
        : v4
          ? "v4"
          : "unrecognized";
  return {
    shape,
    recognized: shape !== "unrecognized",
    reportId:
      typeof obj.id === "string"
        ? obj.id
        : typeof obj.report_id === "string"
          ? obj.report_id
          : undefined,
    schemaVersion: typeof obj.schema_version === "string" ? obj.schema_version : undefined,
    topLevelKeys: Object.keys(obj).slice(0, 40),
  };
}

