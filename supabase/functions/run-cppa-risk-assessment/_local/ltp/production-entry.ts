/**
 * ITEM 353 → ITEM 357 — PRODUCTION LTP ORCHESTRATOR ENTRY (thin delegation).
 *
 * The dual-wiring reconciliation tactic is retired (six Phase-2 failures).
 * This module no longer carries its own copy of the generation path: it
 * delegates to the ONE shared module `_shared/ltp/generate-cppa-risk.ts`,
 * which owns entry-intake normalization → Pass-1 → assembleReport →
 * emit-gate + Item-352 customer whitelist → LEAK-PREV-P2 serialization →
 * the final persisted payload.
 *
 * Retained only so the legacy function keeps a compiling LTP seam. The
 * blue/green replacement is `run-cppa-risk-assessment-v2`.
 */
import {
  generateCppaRiskReport,
  runCppaRiskPass2R,
  CPPA_RISK_GENERATOR_STAMP,
} from "../../../_shared/ltp/generate-cppa-risk.ts";

export const LTP_PRODUCTION_ENTRY_STAMP = "ltp-production-entry-item357@2026-08-01";

type LifecycleUpdate = (
  client: unknown,
  table: string,
  id: string,
  patch: Record<string, unknown>,
  ctx: { fn: string; phase: string },
) => Promise<{ ok: boolean }>;

export interface LtpProductionArgs {
  // deno-lint-ignore no-explicit-any
  readonly db: any;
  readonly assessmentId: string;
  readonly row: Record<string, unknown>;
  readonly buildStamp: string;
  readonly lifecycleUpdate: LifecycleUpdate;
}

export async function runLtpProduction(args: LtpProductionArgs): Promise<{ ok: boolean; error?: string }> {
  const { db, assessmentId, row, buildStamp, lifecycleUpdate } = args;
  const t0 = Date.now();
  const options = {
    db,
    buildStamp,
    runId: assessmentId,
    mode: "enforce" as const,
    pass1: "model" as const,
    callerName: "run-cppa-risk-assessment",
  };
  try {
    const gen = await generateCppaRiskReport((row as { intake_data?: unknown }).intake_data ?? {}, options);

    const firstWrite = await lifecycleUpdate(db, "cppa_assessments", assessmentId, {
      status: "complete",
      report_data: gen.report,
    }, { fn: "run-cppa-risk-assessment", phase: "ltp_persist_first" });
    if (!firstWrite.ok) return { ok: false, error: "persist_first_failed" };

    console.log(JSON.stringify({
      evt: "ltp_production_persist_first", fn: "run-cppa-risk-assessment",
      build_stamp: buildStamp, entry_stamp: LTP_PRODUCTION_ENTRY_STAMP,
      generator: CPPA_RISK_GENERATOR_STAMP, type_j: gen.typeJOrigin,
      elapsed_ms: Date.now() - t0,
    }));

    // Pass-2R inside the persisted lifecycle; the UPDATE is part of this task.
    const p2 = await runCppaRiskPass2R(gen, options);
    if (p2.report) {
      await lifecycleUpdate(db, "cppa_assessments", assessmentId, {
        status: "complete",
        report_data: p2.report,
      }, { fn: "run-cppa-risk-assessment", phase: "ltp_pass2r" });
    }
    console.log(JSON.stringify({
      evt: "ltp_production_complete", fn: "run-cppa-risk-assessment",
      assessment_id: assessmentId, shipped_surface: p2.shipped_surface,
      pass2r_skipped_reason: p2.meta.pass2r_skipped_reason ?? null,
      elapsed_ms: Date.now() - t0,
    }));
    return { ok: true };
  } catch (e) {
    const msg = (e as Error)?.message ?? String(e);
    console.error("[ltp-production-entry] fatal:", msg);
    try {
      await lifecycleUpdate(db, "cppa_assessments", assessmentId, {
        status: "error",
        error_message: msg.slice(0, 500),
      }, { fn: "run-cppa-risk-assessment", phase: "terminal_error_ltp" });
    } catch { /* best effort */ }
    return { ok: false, error: msg };
  }
}
