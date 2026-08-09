// ─────────────────────────────────────────────────────────────────────────────
// ITEM 413 — THE REGISTRATION FINALIZE BATTERY.
//
// ONE SEAM. `run-registration-assessment` has exactly one place where a report
// becomes a persisted document: the `serializeCustomer(result_summary)` call
// immediately before `persistPayload` is built (index.ts). There is no second
// persist path — the quality harness dispatches this product over the same HTTP
// entry point (evidenced by quality_run_documents row
// a226f707-…, whose failure is "dispatch failed: run-registration-assessment
// 404", i.e. an HTTP dispatch, not an in-process call). The battery therefore
// sits immediately BEFORE that call, so every path carries it.
//
// The battery is deterministic end to end. Registration makes no model calls,
// so there is no refinement, no critic and no verifier here — by design, not by
// omission.
// ─────────────────────────────────────────────────────────────────────────────

import {
  applyRegistrationProseGold,
  REGISTRATION_PIPELINE_STAMP,
  REGISTRATION_PROSE_GOLD_VERSION,
} from "./registration-prose-gold.ts";
import {
  checkPassageShape,
  formatDrift,
  REGISTRATION_REFERENCE_PASSAGE_VERSION,
  toRegistrationReferencePassages,
  type RegistrationDutyRowLike,
} from "../prose/registration-reference-passages.ts";
import { attachCoverage, runCoverageMatrix, type CoverageTelemetry } from "../../../../_shared/ltp/coverage-matrix.ts";
import { attachProseLint, PROSE_LINT_VERSION, type ProseLintResult } from "../../../../_shared/prose/assembled-prose-lint.ts";

export { REGISTRATION_PIPELINE_STAMP };

export interface RegistrationFinalizeResult {
  readonly report: Record<string, unknown>;
  readonly coverage: CoverageTelemetry;
  readonly prose_lint: ProseLintResult | null;
  readonly repaired_paths: readonly string[];
  readonly passage_shape_drift: readonly string[];
}

/**
 * Runs the whole battery over the assembled report and returns the report to
 * persist. FAIL-OPEN in every leg: a battery defect must never cost a customer
 * their document. Each failure is logged and named in telemetry instead.
 */
export function runRegistrationFinalizeBattery(
  reportIn: Record<string, unknown>,
  intake: Record<string, unknown>,
  dutyRows: readonly RegistrationDutyRowLike[],
): RegistrationFinalizeResult {
  let report = reportIn;
  let repaired: readonly string[] = [];
  let passageDrift: string[] = [];
  const passages = (() => {
    try {
      return toRegistrationReferencePassages(dutyRows);
    } catch {
      return [];
    }
  })();

  // (a) REFERENCE-PASSAGE SHAPE. The corpus byte-match itself needs the corpus
  // and runs in the item413 test; this boot-time leg catches the shape defects
  // that need no database (empty bytes, empty corpus key, empty citation).
  try {
    const drift = checkPassageShape(passages);
    passageDrift = drift.map((d) => `${d.id}:${d.reason}`);
    if (drift.length) {
      console.warn(
        `[run-registration-assessment] reference-passage shape drift: ${formatDrift(drift)}`,
      );
    }
  } catch (e) {
    console.warn("[run-registration-assessment] passage shape check skipped:", (e as Error)?.message);
  }

  // (b) PROSE GOLD (RG-1..RG-4) + the pipeline stamp.
  try {
    const gold = applyRegistrationProseGold(report, passages);
    report = gold.report;
    repaired = gold.repaired_paths;
  } catch (e) {
    console.warn("[run-registration-assessment] prose gold skipped:", (e as Error)?.message);
  }

  // (c) COVERAGE — deterministic, declared anchorage only.
  let coverage: CoverageTelemetry;
  try {
    coverage = runCoverageMatrix("registration", report, intake);
    attachCoverage(report, "registration_coverage", coverage);
  } catch (e) {
    coverage = {
      version: "unavailable",
      product: "registration",
      orphans: [],
      unused_intake_facts: [],
      counts: { orphans: 0, unused_intake_facts: 0, links_checked: 0 },
      crashed: true,
      error: (e as Error)?.message?.slice(0, 200),
    };
  }

  // (d) R11 — assembled-prose lint over the FINAL strings.
  let lint: ProseLintResult | null = null;
  try {
    lint = attachProseLint(report);
  } catch (e) {
    console.warn("[run-registration-assessment] prose lint skipped:", (e as Error)?.message);
  }

  console.log(JSON.stringify({
    evt: "registration_finalize_battery",
    fn: "run-registration-assessment",
    stamp: REGISTRATION_PIPELINE_STAMP,
    prose_gold_version: REGISTRATION_PROSE_GOLD_VERSION,
    passages_version: REGISTRATION_REFERENCE_PASSAGE_VERSION,
    coverage_version: coverage.version,
    prose_lint_version: PROSE_LINT_VERSION,
    repaired_paths: repaired.length,
    passage_shape_drift: passageDrift.length,
    coverage_orphans: coverage.counts.orphans,
    coverage_links_checked: coverage.counts.links_checked,
    prose_lint_findings: lint?.findings?.length ?? null,
  }));

  return {
    report,
    coverage,
    prose_lint: lint,
    repaired_paths: repaired,
    passage_shape_drift: passageDrift,
  };
}
