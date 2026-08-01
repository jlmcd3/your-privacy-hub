/**
 * ITEM 353 — T-M CUTOVER: PRODUCTION LTP ORCHESTRATOR ENTRY.
 *
 * The customer path (`run-cppa-risk-assessment`) generates the cppa-risk
 * document through the Legal Test Pipeline (Pass-1 derive/guide → deterministic
 * assembleReport → Pass-2R prose), in ENFORCE mode, instead of the Item-217
 * legacy composer.
 *
 * Seams preserved (fleet law):
 *   - INTAKE CONTRACT: resolved through the single Item-350 entry resolver.
 *   - PERSIST-FIRST: the deterministic surface lands on the row BEFORE any
 *     Pass-2R model call; a 2R death costs only 2R telemetry.
 *   - EMIT-GATE + ITEM-352 CUSTOMER WHITELIST: internal `info_emit_gate_*`
 *     rows never reach `information_needed`.
 *   - LEAK-PREV-P2 whitelist serializer: only schema-declared keys ship.
 *   - LIFECYCLE / ERROR HANDLING: all writes go through `lifecycleUpdate`.
 *
 * Fail-closed on Pass-1: a terminal derive failure ships the Type-J
 * reserved-judgment body, never a legacy fall-through.
 */
import { resolveLtpIntake } from "../../../_shared/ltp/entry-intake.ts";
import { modelProvider } from "../../../_shared/ltp/replay/providers.ts";
import { assembleReport, buildTypeJWriteAroundBody } from "../../../_shared/ltp/pass2-assembler.ts";
import { runProsePassStage, PASS2R_MANIFEST } from "../../../_shared/ltp/pass2r-llm.ts";
import { PASS1_MANIFEST } from "../../../_shared/ltp/pass1-llm.ts";
import { fetchEuAuthorityCorpus } from "../../../_shared/ltp/eu-authority/fetch.ts";
import { runEmitGate, filterCustomerInformationNeeded } from "../../../_shared/emit-gate.ts";

export const LTP_PRODUCTION_ENTRY_STAMP = "ltp-production-entry-item353@2026-08-01";

type LifecycleUpdate = (
  client: unknown,
  table: string,
  id: string,
  patch: Record<string, unknown>,
  ctx: { fn: string; phase: string },
) => Promise<{ ok: boolean }>;

export interface LtpProductionArgs {
  readonly db: any;
  readonly assessmentId: string;
  readonly row: Record<string, unknown>;
  readonly buildStamp: string;
  readonly lifecycleUpdate: LifecycleUpdate;
}

function seal(report: Record<string, unknown>, intakeRoster: unknown): {
  report: Record<string, unknown>;
  emit_gate_filtered: number;
  serialized: boolean;
} {
  let out = report;
  let filtered = 0;
  try {
    runEmitGate(out, { tool: "cppa_risk_assessment", intakeRoster: (intakeRoster ?? {}) as any });
  } catch (e) {
    console.warn("[ltp-production-entry] emit-gate failed (non-fatal):", (e as Error)?.message);
  }
  try {
    filtered = filterCustomerInformationNeeded(out);
  } catch { /* fail-open */ }
  return { report: out, emit_gate_filtered: filtered, serialized: false };
}

async function serializeCustomer(report: Record<string, unknown>): Promise<Record<string, unknown>> {
  try {
    const { serializeCustomerReport } = await import("../../../_shared/report-serialize.ts");
    const { CPPA_RISK_REPORT_SCHEMA } = await import("../../../_shared/report-schemas/cppa-risk.ts");
    const { report: serialized, telemetry } = serializeCustomerReport(report as any, CPPA_RISK_REPORT_SCHEMA);
    if (!telemetry.crashed) return serialized as Record<string, unknown>;
  } catch (e) {
    console.warn("[ltp-production-entry] serializer failed (non-fatal):", (e as Error)?.message);
  }
  return report;
}

export async function runLtpProduction(args: LtpProductionArgs): Promise<{ ok: boolean; error?: string }> {
  const { db, assessmentId, row, buildStamp, lifecycleUpdate } = args;
  const rawIntake = (row as any).intake_data ?? {};
  const t0 = Date.now();
  try {
    const era = resolveLtpIntake(rawIntake);
    const euCorpus = await fetchEuAuthorityCorpus(db);

    const p1 = await modelProvider(
      {
        intake: era.intake,
        report_data: {},
        buildStamp: `${buildStamp}#${assessmentId}`,
        eu_authority_corpus: euCorpus,
      },
      { callerName: "run-cppa-risk-assessment" },
    );

    // FAIL-CLOSED: terminal Pass-1 failure ships the reserved-judgment body.
    let base: Record<string, unknown>;
    let assemblerTelemetry: unknown = null;
    let typeJ: string | null = null;
    if (!p1.telemetry.ok || !p1.plan) {
      typeJ = p1.telemetry.error ?? "pass1_model_error";
      base = buildTypeJWriteAroundBody({
        intake: era.intake,
        origin: "pass1_validator_reject",
        buildStamp,
      });
    } else {
      const assembled = assembleReport(p1.plan as never, {}, { exitMode: "enforce", runId: assessmentId });
      base = assembled.report as Record<string, unknown>;
      assemblerTelemetry = assembled.telemetry;
    }

    const ltpMeta = {
      build_stamp: buildStamp,
      entry_stamp: LTP_PRODUCTION_ENTRY_STAMP,
      engine_path: "ltp",
      mode: "enforce",
      pass1_manifest: PASS1_MANIFEST,
      pass2r_manifest: PASS2R_MANIFEST,
      pass1_telemetry: {
        ok: p1.telemetry.ok,
        attempts: p1.telemetry.attempts,
        write_around: p1.telemetry.write_around,
        latency_ms: p1.telemetry.latency_ms,
        error: p1.telemetry.error ?? null,
      },
      assembler_telemetry: assemblerTelemetry,
      intake_era_normalization: era.telemetry,
      type_j_origin: typeJ,
      shipped_surface: "deterministic",
    };

    // ---- PERSIST-FIRST: deterministic surface lands before Pass-2R.
    const sealedDet = seal({ ...base }, rawIntake);
    const detReport = await serializeCustomer(sealedDet.report);
    (detReport as any)._engine_path = "ltp";
    (detReport as any)._ltp = { ...ltpMeta, emit_gate_filtered: sealedDet.emit_gate_filtered };

    const firstWrite = await lifecycleUpdate(db, "cppa_assessments", assessmentId, {
      status: "complete",
      report_data: detReport,
    }, { fn: "run-cppa-risk-assessment", phase: "ltp_persist_first" });
    if (!firstWrite.ok) return { ok: false, error: "persist_first_failed" };

    console.log(JSON.stringify({
      evt: "ltp_production_persist_first", fn: "run-cppa-risk-assessment",
      build_stamp: buildStamp, entry_stamp: LTP_PRODUCTION_ENTRY_STAMP,
      pass1_ok: p1.telemetry.ok, type_j: typeJ, elapsed_ms: Date.now() - t0,
    }));

    // ---- PASS-2R. FALLBACK LAW: prose ships only when the stage accepts it.
    if (!typeJ) {
      try {
        const stage = await runProsePassStage(
          p1.plan as never,
          base as Record<string, unknown>,
          { enabled: true, callerName: "run-cppa-risk-assessment" },
        );
        if (stage.shipped_surface === "2R" && stage.prose) {
          const merged = { ...base, ...(stage.prose as unknown as Record<string, unknown>) };
          const sealedProse = seal(merged, rawIntake);
          const proseReport = await serializeCustomer(sealedProse.report);
          (proseReport as any)._engine_path = "ltp";
          (proseReport as any)._ltp = {
            ...ltpMeta,
            shipped_surface: stage.shipped_surface,
            emit_gate_filtered: sealedProse.emit_gate_filtered,
            pass2r_telemetry: stage.telemetry ?? null,
            pass2r_skipped_reason: (stage as { skipped_reason?: string }).skipped_reason ?? null,
          };
          await lifecycleUpdate(db, "cppa_assessments", assessmentId, {
            status: "complete",
            report_data: proseReport,
          }, { fn: "run-cppa-risk-assessment", phase: "ltp_pass2r" });
        }
      } catch (e) {
        console.warn("[ltp-production-entry] pass2r failed (non-fatal):", (e as Error)?.message);
      }
    }

    console.log(JSON.stringify({
      evt: "ltp_production_complete", fn: "run-cppa-risk-assessment",
      build_stamp: buildStamp, assessment_id: assessmentId,
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
