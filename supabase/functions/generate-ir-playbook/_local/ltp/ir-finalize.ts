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
import {
  attachRecordComplete,
  classifyPlaceholders,
  computeRecordComplete,
  type RecordCompleteTelemetry,
} from "../../../_shared/ltp/record-complete.ts";
import { irPlaybookContract } from "../../../_shared/intake-contracts/ir-playbook.ts";
import { attachIrCsc, type IrCscTelemetry, runIrCsc } from "./ir-csc.ts";

export { IR_PIPELINE_STAMP };

// ITEM 416 LEG C — THE REAL CSC.
//
// Leg B shipped a PRESENT-but-empty placeholder here so the fail-closed
// record-complete gate could turn on evidence it could read. Leg C replaces it
// with the real cross-surface consistency pass (`ir-csc.ts`), and
// `FALSE_ABSENCE_CHECK_IDS["ir-playbook"]` now names `i2_absence_claim_vs_record`,
// so an UNREPAIRED false absence fails the gate.
//
// `irCscPlaceholder` is retained as a NAMED, HONEST shape for the fail-open
// leg only: if the real pass throws, the battery still attaches telemetry that
// says plainly that no check ran, and the gate — which requires uncrashed CSC
// evidence — decides on that.
export const IR_CSC_PLACEHOLDER_VERSION = "ir-csc-placeholder@item415-2026-08-09";

export interface IrCscPlaceholder {
  readonly version: string;
  readonly product: "ir-playbook";
  readonly placeholder: true;
  readonly checks_run: 0;
  readonly violations: readonly never[];
  readonly crashed: false;
}

export function irCscPlaceholder(): IrCscPlaceholder {
  return {
    version: IR_CSC_PLACEHOLDER_VERSION,
    product: "ir-playbook",
    placeholder: true,
    checks_run: 0,
    violations: [],
    crashed: false,
  };
}

export interface IrFinalizeResult {
  readonly report: Record<string, unknown>;
  readonly coverage: CoverageTelemetry;
  readonly csc: IrCscTelemetry | IrCscPlaceholder;
  readonly prose_lint: ProseLintResult | null;
  readonly repaired_paths: readonly string[];
  readonly restored_checklist_cells: number;
  readonly record_complete: RecordCompleteTelemetry | null;
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

  // (b) CSC — the real cross-surface consistency pass. Repairs are single-
  // writer splices from `buildStandingPlaybook`; on a silent record it does
  // nothing and every absence sentence survives byte-for-byte.
  let csc: IrCscTelemetry | IrCscPlaceholder = irCscPlaceholder();
  try {
    csc = runIrCsc(report, { intake });
    attachIrCsc(report, csc as IrCscTelemetry);
  } catch (e) {
    console.warn("[generate-ir-playbook] csc skipped:", (e as Error)?.message);
    try {
      const meta = ((report as Record<string, unknown>)._meta ??= {}) as Record<string, unknown>;
      const internal = (meta.internal ??= {}) as Record<string, unknown>;
      internal.ir_csc = csc;
    } catch { /* non-fatal */ }
  }


  // (c) COVERAGE — standing playbook only; the worksheet is blank by design.
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

  // (d) R11 — assembled-prose lint over the FINAL strings of BOTH artifacts.
  let lint: ProseLintResult | null = null;
  try {
    lint = attachProseLint(report);
  } catch (e) {
    console.warn("[generate-ir-playbook] prose lint skipped:", (e as Error)?.message);
  }

  // (e) RECORD-COMPLETE GATE — fail-closed, LAST, so it reads the coverage and
  // CSC telemetry this same battery just attached. `intake` is the FULL record
  // the function analyses (index.ts merges `ir_playbooks.intake_data` into
  // `body` at L647 before any surface is built), so the gate's contract
  // completeness check sees exactly what the generator saw.
  let recordComplete: RecordCompleteTelemetry | null = null;
  try {
    const internal = ((((report as Record<string, unknown>)._meta ?? {}) as Record<string, unknown>)
      .internal ?? {}) as Record<string, unknown>;
    recordComplete = computeRecordComplete({
      product: "ir-playbook",
      contract: irPlaybookContract,
      intake,
      coverage: (internal.ir_coverage ?? null) as never,
      csc: (internal.ir_csc ?? null) as never,
    });
    const classification = classifyPlaceholders(report, intake, recordComplete.value);
    attachRecordComplete(report, recordComplete, classification);
    console.log(JSON.stringify({
      evt: "ir_record_complete",
      fn: "generate-ir-playbook",
      ir_pipeline_stamp: IR_PIPELINE_STAMP,
      version: recordComplete.version,
      value: recordComplete.value,
      failed_conditions: recordComplete.failed_conditions,
      counts: recordComplete.counts,
      empty_required_keys: recordComplete.empty_required_keys.slice(0, 20),
    }));
  } catch (e) {
    console.warn("[generate-ir-playbook] ITEM 415 record-complete gate failed (non-fatal):", (e as Error)?.message);
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
    csc_violations: (csc as IrCscTelemetry)?.violations?.length ?? 0,
    csc_repairs: (csc as IrCscTelemetry)?.repairs ?? 0,
    csc_crashed: Boolean((csc as IrCscTelemetry)?.crashed),
    coverage_links_checked: coverage.counts.links_checked,
    prose_lint_findings: lint?.findings?.length ?? null,
  }));

  return {
    report,
    coverage,
    csc,
    prose_lint: lint,
    repaired_paths: repaired,
    restored_checklist_cells: restored,
    record_complete: recordComplete,
  };
}
