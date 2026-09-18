// /admin/product-test — lead summary and batch score matrix (doc 275 follow-up).
import { describe, expect, it } from "vitest";
import { buildLeadSummary } from "../leadSummary";
import { buildScoreMatrix, formatDelta } from "../scoreMatrix";
import type { CheckRow, DocumentRow, RunRow, ToolSummary } from "../types";

const ts = (over: Partial<ToolSummary> = {}): ToolSummary => ({
  documents: 1, document_pass_rate: 1, checks_total: 48, checks_passed: 48, check_pass_rate: 1,
  critical: 0, high: 0, editorial: 0, ...over,
});

const run = (id: string, createdAt: string, byTool: RunRow["summary"] extends infer S ? (S extends { byTool: infer B } ? B : never) : never, over: Partial<RunRow> = {}): RunRow => ({
  id, created_at: createdAt, created_by: null, status: "complete",
  settings: { tools: Object.keys(byTool) as never, copies: 1, repeatSameFixture: false, variantKinds: ["golden"], concurrency: 3 },
  log: [], summary: { overall: ts(), byTool }, ...over,
});

const doc = (over: Partial<DocumentRow>): DocumentRow => ({
  id: "d1", run_id: "r1", tool: "cppa-risk", fixture_id: "cppa-risk-p01", variant_id: "golden", copy_index: 1,
  source_table: "cppa_assessments", source_row_id: "abc", status: "graded", error: null, document_hash: "h",
  checks_total: 48, checks_failed: 2, critical: 1, high: 1, editorial: 0, document_pass: false,
  created_at: "2026-09-18T09:53:43Z", completed_at: "2026-09-18T09:53:49Z", ...over,
});

const check = (over: Partial<CheckRow>): CheckRow => ({
  id: 1, run_id: "r1", document_id: "d1", tool: "cppa-risk", fixture_id: "cppa-risk-p01", variant_id: "golden",
  check_id: "legal.cross_regime_contamination", family: "legal", severity: "critical", passed: false,
  block_key: null, quote: "GDPR", expected: "none", actual: "GDPR", rule_ref: null, status: "open", class: null, note: null,
  created_at: "2026-09-18T09:53:49Z", ...over,
});

describe("buildLeadSummary", () => {
  it("carries the run id, settings, per-tool figures and one line per failed check with coordinates", () => {
    const r = run("9ee40db6-a0c6-45ce-8e2c-25ee51d26b31", "2026-09-18T09:53:42Z", { "cppa-risk": ts({ document_pass_rate: 0, checks_passed: 46, critical: 1, high: 1 }) }, { lead_note: "Section 4.B reads wrongly" });
    const out = buildLeadSummary(r, [doc({})], [
      check({}),
      check({ id: 2, check_id: "cross-block.table_of_authorities_complete", family: "cross-block", severity: "high", block_key: "table_of_authorities", quote: "11 CCR § 7150(b)", status: "ceo", class: "ceo-decision", note: "matrix need not list passing mentions" }),
      check({ id: 3, passed: true }),
    ]);
    expect(out).toContain("run 9ee40db6-a0c6-45ce-8e2c-25ee51d26b31");
    expect(out).toContain("tools=cppa-risk copies=1 repeat=no variants=golden");
    expect(out).toContain("report note: Section 4.B reads wrongly");
    expect(out).toContain("cppa-risk: 1 doc(s), doc pass 0.0%, checks 46/48, critical 1, high 1, editorial 0");
    expect(out).toContain("failed checks: 2");
    expect(out).toContain("- [critical] legal.cross_regime_contamination — cppa-risk · cppa-risk-p01 · golden · -");
    expect(out).toContain("[ceo/ceo-decision]");
    expect(out).toContain("note: matrix need not list passing mentions");
    expect(out).not.toContain("passed");
  });

  it("names generation failures", () => {
    const r = run("r1", "2026-09-18T09:00:00Z", { "dpia": ts({ documents: 1, document_pass_rate: 0 }) });
    const out = buildLeadSummary(r, [doc({ tool: "dpia", status: "failed", error: "Timeout after 90 polls" })], []);
    expect(out).toContain("GENERATION FAILED cppa-risk-p01 · golden · copy 1: Timeout after 90 polls");
  });
});

describe("buildScoreMatrix", () => {
  const r1 = run("r1", "2026-09-18T09:00:00Z", { "cppa-risk": ts({ check_pass_rate: 0.958 }), "dpia": ts() });
  const r2 = run("r2", "2026-09-18T10:00:00Z", { "cppa-risk": ts({ check_pass_rate: 1 }) });
  const r3 = run("r3", "2026-09-18T08:00:00Z", { "lia": ts() }, { summary: null }); // unscored: no column

  it("orders columns oldest first and numbers them stably; unscored runs are not columns", () => {
    const m = buildScoreMatrix([r2, r1, r3], null);
    expect(m.columns.map((c) => c.runId)).toEqual(["r1", "r2"]);
    expect(m.columns.map((c) => c.n)).toEqual([1, 2]);
  });

  it("rows are the tools with a scored cell; a tool absent from a run has a null cell", () => {
    const m = buildScoreMatrix([r1, r2], null);
    expect(m.rows.map((r) => r.tool)).toEqual(["cppa-risk", "dpia"]);
    const dpia = m.rows.find((r) => r.tool === "dpia")!;
    expect(dpia.cells[0]?.checkPassRate).toBe(1);
    expect(dpia.cells[1]).toBeNull();
  });

  it("baseline column gives deltas in the other columns; an unknown baseline is ignored", () => {
    const m = buildScoreMatrix([r1, r2], "r1");
    const risk = m.rows.find((r) => r.tool === "cppa-risk")!;
    expect(risk.cells[0]?.deltaVsBaseline).toBeCloseTo(0);
    expect(risk.cells[1]?.deltaVsBaseline).toBeCloseTo(0.042);
    expect(formatDelta(risk.cells[1]!.deltaVsBaseline)).toBe("+4.2");
    expect(formatDelta(0)).toBe("±0.0");
    expect(buildScoreMatrix([r1, r2], "nope").baselineRunId).toBeNull();
  });
});
