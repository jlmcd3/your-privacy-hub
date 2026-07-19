// STATES-1b — Single source of truth for state review freshness.
//
// The public /compare/us-states page and the admin review page both derive
// per-state review status (never-reviewed / overdue / ok / needs_update /
// material_change) from the same log rows, using the same cadence constant.
// The global "last reviewed" claim renders only when every enacted state
// has an in-cycle OK row.

import stateData from "@/data/us_state_comparison.json";

export type ReviewStatus = "ok" | "needs_update" | "material_change";

export interface ReviewLogRow {
  id?: string;
  state_slug: string;
  state_name?: string;
  status: ReviewStatus;
  notes?: string | null;
  reviewed_by?: string | null;
  reviewed_at: string;
}

export interface StateMeta {
  abbr: string;
  name: string;
  law: string;
  status: string;
  effective: string;
}

export interface StateReviewInfo {
  slug: string;
  abbr: string;
  name: string;
  last?: ReviewLogRow;
  ageDays: number; // Infinity if never reviewed
  overdue: boolean; // cadence-based
  needsUpdate: boolean;
  materialChange: boolean;
  stale: boolean; // needsUpdate OR materialChange OR overdue OR never
}

export interface ReviewRollup {
  perState: StateReviewInfo[];
  totalEnacted: number;
  reviewedInCycleCount: number;
  needsUpdateCount: number;
  materialChangeCount: number;
  overdueCount: number;
  neverReviewedCount: number;
  fullyReviewed: boolean;
  /**
   * Timestamp at which the current cycle was fully completed — the most-recent
   * `reviewed_at` among the in-cycle OK rows. Only defined when fullyReviewed.
   */
  cycleCompletedAt?: string;
}

/** Numeric cadence in days, from the JSON. */
export const REVIEW_CADENCE_DAYS: number =
  (stateData as any).reviewCadenceDays ?? 90;

export function enactedStates(): StateMeta[] {
  return (stateData.states as StateMeta[]).filter((s) => s.status === "enacted");
}

/** Latest log row per state_slug, given rows in any order. */
export function latestByState(rows: ReviewLogRow[]): Map<string, ReviewLogRow> {
  const sorted = [...rows].sort(
    (a, b) => new Date(b.reviewed_at).getTime() - new Date(a.reviewed_at).getTime(),
  );
  const out = new Map<string, ReviewLogRow>();
  for (const r of sorted) if (!out.has(r.state_slug)) out.set(r.state_slug, r);
  return out;
}

export function computeReviewRollup(
  rows: ReviewLogRow[],
  now: number = Date.now(),
  cadenceDays: number = REVIEW_CADENCE_DAYS,
): ReviewRollup {
  const latest = latestByState(rows);
  const enacted = enactedStates();

  const perState: StateReviewInfo[] = enacted.map((s) => {
    const slug = s.abbr.toLowerCase();
    const last = latest.get(slug);
    const ageDays = last
      ? (now - new Date(last.reviewed_at).getTime()) / 86400000
      : Infinity;
    const needsUpdate = last?.status === "needs_update";
    const materialChange = last?.status === "material_change";
    const overdue = !last || ageDays > cadenceDays;
    return {
      slug,
      abbr: s.abbr,
      name: s.name,
      last,
      ageDays,
      overdue,
      needsUpdate,
      materialChange,
      stale: !last || overdue || needsUpdate || materialChange,
    };
  });

  const inCycleOk = perState.filter(
    (x) => x.last && x.last.status === "ok" && x.ageDays <= cadenceDays,
  );
  const reviewedInCycleCount = inCycleOk.length;
  const fullyReviewed = reviewedInCycleCount === enacted.length && enacted.length > 0;
  const cycleCompletedAt = fullyReviewed
    ? new Date(
        Math.max(...inCycleOk.map((x) => new Date(x.last!.reviewed_at).getTime())),
      ).toISOString()
    : undefined;

  return {
    perState,
    totalEnacted: enacted.length,
    reviewedInCycleCount,
    needsUpdateCount: perState.filter((x) => x.needsUpdate).length,
    materialChangeCount: perState.filter((x) => x.materialChange).length,
    overdueCount: perState.filter((x) => x.overdue && !x.materialChange && !x.needsUpdate).length,
    neverReviewedCount: perState.filter((x) => !x.last).length,
    fullyReviewed,
    cycleCompletedAt,
  };
}
