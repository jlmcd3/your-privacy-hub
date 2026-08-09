// ─────────────────────────────────────────────────────────────────────────────
// ITEM 414 — THE IR FINALIZE BATTERY.
//
// ONE SEAM. `generate-ir-playbook` has exactly ONE place where a report becomes
// a persisted document: the background task in `index.ts` that builds
// `report_data`, runs the emit gate and the P2 serializer, and then writes it
// through `lifecycleUpdate(... "terminal_complete")` (index.ts ~L1914). Both
// artifacts (`standing_playbook`, `incident_worksheet`) are assembled into that
// SAME `report_data` object a few lines earlier (~L1825), and there is no
// second invocation path: the quality harness dispatches this product over the
// same HTTP entry, and the only other `lifecycleUpdate` calls in the file are
// status transitions (`processing`, `failed`, `incomplete_generation`) that
// carry no assembled document. The 412-B/D lesson is therefore satisfied by
// construction — the battery sits at the single seam every path flows through,
// BEFORE the emit gate, so the gate and serializer see the repaired prose and
// `_meta.internal.ir_pipeline_stamp` survives the P2 whitelist (the schema
// preserves `_meta.internal` verbatim).
//
// FAIL-OPEN in every leg: a battery defect must never cost a customer their
// document.
// ─────────────────────────────────────────────────────────────────────────────

import { applyIrProseGold, IR_PIPELINE_STAMP, IR_PROSE_GOLD_VERSION } from "./ir-prose-gold.ts";
import { attachCoverage, runCoverageMatrix, type CoverageTelemetry } from "../../../_shared/ltp/coverage-matrix.ts";
import { attachProseLint, PROSE_LINT_VERSION, type ProseLintResult } from "../../../_shared/prose/assembled-prose-lint.ts";
import { FIRST_HOUR_ITEMS } from "./ir-playbook-deliverables/standing-playbook.ts";

export { IR_PIPELINE_STAMP };

export interface IrFinalizeResult {
  readonly report: Record<string, unknown>;
  readonly coverage: CoverageTelemetry;
  readonly prose_lint: ProseLintResult | null;
  readonly repaired_paths: readonly string[];
  readonly restored_checklist_cells: number;
}

export function runIrFinalizeBattery(
  reportIn: Record<string, unknown>,
  intake: Record<string, unknown>,
): IrFinalizeResult {
  let report = reportIn;
  let repaired: readonly string[] = [];
  let restored = 0;

  // (a) PROSE GOLD (IR-1 .. IR-6) + the pipeline stamp.
  try {
    const gold = applyIrProseGold(report, FIRST_HOUR_ITEMS.map((i) => i.item));
    report = gold.report;
    repaired = gold.repaired_paths;
    restored = gold.restored_checklist_cells;
  } catch (e) {
    console.warn("[generate-ir-playbook] prose gold skipped:", (e as Error)?.message);
  }

  // (b) COVERAGE — standing playbook only; the worksheet is blank by design.
  let coverage: CoverageTelemetry;
  try {
    coverage = runCoverageMatrix("ir-playbook", report, intake);
    attachCoverage(report, "ir_coverage", coverage);
  } catch (e) {
    coverage = {
      version: "unavailable",
      product: "ir-playbook",
      orphans: [],
      unused_intake_facts: [],
      counts: { orphans: 0, unused_intake_facts: 0, links_checked: 0 },
      crashed: true,
      error: (e as Error)?.message?.slice(0, 200),
    };
  }

  // (c) R11 — assembled-prose lint over the FINAL strings of BOTH artifacts.
  let lint: ProseLintResult | null = null;
  try {
    lint = attachProseLint(report);
  } catch (e) {
    console.warn("[generate-ir-playbook] prose lint skipped:", (e as Error)?.message);
  }

  console.log(JSON.stringify({
    evt: "ir_finalize_battery",
    fn: "generate-ir-playbook",
    stamp: IR_PIPELINE_STAMP,
    prose_gold_version: IR_PROSE_GOLD_VERSION,
    coverage_version: coverage.version,
    prose_lint_version: PROSE_LINT_VERSION,
    repaired_paths: repaired.length,
    restored_checklist_cells: restored,
    coverage_orphans: coverage.counts.orphans,
    coverage_links_checked: coverage.counts.links_checked,
    prose_lint_findings: lint?.findings?.length ?? null,
  }));

  return { report, coverage, prose_lint: lint, repaired_paths: repaired, restored_checklist_cells: restored };
}
