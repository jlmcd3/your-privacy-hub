// /admin/product-test — "Tools & batch scores" matrix (CEO request,
// 2026-09-18, mirroring the matrix on /admin/all-products-test): products
// stay pinned as rows, runs are columns newest-right, each cell carries the
// run's check pass rate and document pass rate for that product, and one
// column can be pinned as the baseline so every later cell shows its delta.
// Pure functions over run rows; no Supabase, no time.

import type { PanelTool, RunRow, ToolSummary } from "./types";
import { TOOL_GROUPS } from "./plan";

export interface ScoreCell {
  runId: string;
  checkPassRate: number;
  documentPassRate: number;
  documents: number;
  critical: number;
  high: number;
  editorial: number;
  /** Check-pass-rate delta against the baseline column's cell, in rate
   *  units (0.02 = two points); null when there is no baseline cell. */
  deltaVsBaseline: number | null;
}

export interface ScoreColumn {
  runId: string;
  /** 1-based, oldest first, so a re-run keeps its number. */
  n: number;
  createdAt: string;
  status: RunRow["status"];
  variantKinds: string[];
}

export interface ScoreMatrix {
  columns: ScoreColumn[];
  rows: Array<{ tool: PanelTool; cells: Array<ScoreCell | null> }>;
  baselineRunId: string | null;
}

const ALL_TOOLS: PanelTool[] = TOOL_GROUPS.flatMap((g) => g.tools);

function cellOf(runId: string, ts: ToolSummary | undefined, base: ToolSummary | undefined): ScoreCell | null {
  if (!ts || !ts.documents) return null;
  return {
    runId,
    checkPassRate: ts.check_pass_rate,
    documentPassRate: ts.document_pass_rate,
    documents: ts.documents,
    critical: ts.critical,
    high: ts.high,
    editorial: ts.editorial,
    deltaVsBaseline: base && base.documents ? ts.check_pass_rate - base.check_pass_rate : null,
  };
}

/**
 * Runs with a summary become columns, oldest first (so "Batch 3" stays
 * "Batch 3" when a newer run lands). Tools with no scored run in the window
 * are left out of the rows. `baselineRunId` must be one of the columns or
 * it is ignored.
 */
export function buildScoreMatrix(runs: readonly RunRow[], baselineRunId: string | null): ScoreMatrix {
  const scored = runs
    .filter((r) => r.summary && r.summary.byTool)
    .slice()
    .sort((a, b) => a.created_at.localeCompare(b.created_at));
  const columns: ScoreColumn[] = scored.map((r, i) => ({
    runId: r.id,
    n: i + 1,
    createdAt: r.created_at,
    status: r.status,
    variantKinds: r.settings?.variantKinds ?? ["golden"],
  }));
  const baseline = baselineRunId && scored.some((r) => r.id === baselineRunId) ? baselineRunId : null;
  const baseRun = baseline ? scored.find((r) => r.id === baseline) : undefined;

  const rows = ALL_TOOLS
    .map((tool) => ({
      tool,
      cells: scored.map((r) => cellOf(r.id, r.summary!.byTool[tool], baseRun?.summary?.byTool[tool])),
    }))
    .filter((row) => row.cells.some((c) => c !== null));

  return { columns, rows, baselineRunId: baseline };
}

export function formatDelta(d: number | null): string {
  if (d === null) return "";
  const pts = d * 100;
  if (Math.abs(pts) < 0.05) return "±0.0";
  return `${pts > 0 ? "+" : ""}${pts.toFixed(1)}`;
}
