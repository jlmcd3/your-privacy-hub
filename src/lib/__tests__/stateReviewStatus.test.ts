import { describe, it, expect } from "vitest";
import stateData from "@/data/us_state_comparison.json";
import {
  computeReviewRollup,
  REVIEW_CADENCE_DAYS,
  type ReviewLogRow,
} from "../stateReviewStatus";

const enacted = (stateData.states as Array<{ abbr: string; status: string }>)
  .filter((s) => s.status === "enacted")
  .map((s) => s.abbr.toLowerCase());

const NOW = new Date("2026-07-19T12:00:00Z").getTime();
const daysAgo = (n: number) => new Date(NOW - n * 86400000).toISOString();

function okRows(slugs: string[], age = 10): ReviewLogRow[] {
  return slugs.map((slug) => ({ state_slug: slug, status: "ok", reviewed_at: daysAgo(age) }));
}

describe("stateReviewStatus — cadence source of truth", () => {
  it("REVIEW_CADENCE_DAYS is a positive integer from JSON", () => {
    expect(Number.isInteger(REVIEW_CADENCE_DAYS)).toBe(true);
    expect(REVIEW_CADENCE_DAYS).toBeGreaterThan(0);
  });
});

describe("computeReviewRollup — cycle rollup", () => {
  it("no rows → nobody in cycle, everyone never-reviewed, not fully reviewed", () => {
    const r = computeReviewRollup([], NOW);
    expect(r.totalEnacted).toBe(enacted.length);
    expect(r.reviewedInCycleCount).toBe(0);
    expect(r.neverReviewedCount).toBe(enacted.length);
    expect(r.fullyReviewed).toBe(false);
    expect(r.cycleCompletedAt).toBeUndefined();
  });

  it("all states OK within cadence → fully reviewed with a cycle timestamp", () => {
    const r = computeReviewRollup(okRows(enacted, 10), NOW);
    expect(r.fullyReviewed).toBe(true);
    expect(r.cycleCompletedAt).toBeDefined();
    expect(r.reviewedInCycleCount).toBe(enacted.length);
  });

  it("one state past cadence → not fully reviewed, overdue counted", () => {
    const rows = okRows(enacted.slice(1), 10);
    rows.push({ state_slug: enacted[0], status: "ok", reviewed_at: daysAgo(REVIEW_CADENCE_DAYS + 5) });
    const r = computeReviewRollup(rows, NOW);
    expect(r.fullyReviewed).toBe(false);
    expect(r.overdueCount).toBe(1);
  });

  it("needs_update state is stale even if timestamp is fresh", () => {
    const rows = okRows(enacted.slice(1), 5);
    rows.push({ state_slug: enacted[0], status: "needs_update", reviewed_at: daysAgo(1) });
    const r = computeReviewRollup(rows, NOW);
    expect(r.needsUpdateCount).toBe(1);
    expect(r.fullyReviewed).toBe(false);
    const info = r.perState.find((p) => p.slug === enacted[0])!;
    expect(info.stale).toBe(true);
  });

  it("material_change immediately marks the comparison stale", () => {
    const rows = okRows(enacted.slice(1), 5);
    rows.push({ state_slug: enacted[0], status: "material_change", reviewed_at: daysAgo(0) });
    const r = computeReviewRollup(rows, NOW);
    expect(r.materialChangeCount).toBe(1);
    expect(r.fullyReviewed).toBe(false);
  });

  it("newly added state (never in log) prevents fullyReviewed", () => {
    const rows = okRows(enacted.slice(0, -1), 5);
    const r = computeReviewRollup(rows, NOW);
    expect(r.fullyReviewed).toBe(false);
    expect(r.neverReviewedCount).toBe(1);
  });

  it("latest row per state wins over stale rows for the same slug", () => {
    const slug = enacted[0];
    const rows: ReviewLogRow[] = [
      { state_slug: slug, status: "needs_update", reviewed_at: daysAgo(30) },
      { state_slug: slug, status: "ok", reviewed_at: daysAgo(2) },
    ];
    const r = computeReviewRollup(rows, NOW);
    const info = r.perState.find((p) => p.slug === slug)!;
    expect(info.last?.status).toBe("ok");
  });

  it("partial cycle reports reviewedInCycleCount truthfully", () => {
    const rows = okRows(enacted.slice(0, 5), 5);
    const r = computeReviewRollup(rows, NOW);
    expect(r.fullyReviewed).toBe(false);
    expect(r.reviewedInCycleCount).toBe(5);
    expect(r.totalEnacted).toBe(enacted.length);
  });
});
