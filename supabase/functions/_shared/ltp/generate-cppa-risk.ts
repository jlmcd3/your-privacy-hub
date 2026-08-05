/**
 * ITEM 357 — ONE SHARED CPPA-RISK GENERATION MODULE.
 *
 * Retires the cutover-attempt model (six Phase-2 failures) by removing the
 * thing that kept failing: TWO code paths (harness vs production) that had to
 * be reconciled by hand every attempt.
 *
 * This module owns the COMPLETE path:
 *
 *   entry-intake normalization (Item 350)
 *     → Pass-1 (deterministic derivePlan | model provider)
 *     → assembleReport (composers, deliverables)
 *     → emit-gate + Item-352 customer whitelist (canonical needs set)
 *     → LEAK-PREV-P2 whitelist serialization
 *     → FINAL PERSISTED-PAYLOAD SHAPE
 *
 * The value returned by `generateCppaRiskReport().report` IS the object that
 * gets written to `cppa_assessments.report_data`. Nothing may be added to the
 * payload downstream of this module — that is the invariant that makes the
 * versioned surface contract un-divergable from the shipped payload.
 *
 * ITEM 357 (2a) — TELEMETRY RELOCATION. `_engine_path` and `_ltp` were
 * top-level customer keys on the Item-355(#6) live payload (34 keys against a
 * 32-key contract). Both are telemetry: they now live under
 * `_meta.internal.engine_path` / `_meta.internal.ltp`. `risk_assessment_by_activity`
 * is the § 7152 per-activity carrier — legitimate customer content, produced by
 * the emit-gate stage, and DECLARED in the contract (33 keys).
 *
 * ITEM 357 (2b) — PASS-2R LIFECYCLE. Pass-2R no longer runs after the request
 * lifecycle has ended. `runCppaRiskPass2R` is awaited INSIDE the shell's
 * `EdgeRuntime.waitUntil` task and performs the row UPDATE itself. Silent
 * fallback is a defect: when the shipped surface stays "deterministic", a
 * non-null `pass2r_skipped_reason` (or a non-empty rejection list) is always
 * recorded on the row.
 */
import { resolveLtpIntake } from "./entry-intake.ts";
import { derivePlan } from "./derive.ts";
import { modelProvider } from "./replay/providers.ts";
import { assembleReport, buildTypeJWriteAroundBody } from "./pass2-assembler.ts";
import { runProsePassStage, PASS2R_MANIFEST } from "./pass2r-llm.ts";
import { PASS1_MANIFEST } from "./pass1-llm.ts";
import { fetchEuAuthorityCorpus } from "./eu-authority/fetch.ts";
import { runEmitGate, filterCustomerInformationNeeded } from "../emit-gate.ts";
import { serializeCustomerReport } from "../report-serialize.ts";
// UPGRADE-2 (ITEMS 2+3) — runtime §§ 7150-7157 corpus + shared authority exhibit.
import {
  fetchRiskCorpus,
  buildRiskCorpusLawBlock,
  riskCorpusProvisionsForExhibit,
  EMPTY_RISK_CORPUS,
  type RiskCorpus,
} from "./risk-corpus.ts";
import { buildAuthorityExhibit } from "../report-exhibits/authority-exhibit.ts";
import { CPPA_RISK_REPORT_SCHEMA } from "../report-schemas/cppa-risk.ts";
import { computeRecordNeeds } from "./section-composers/cppa-risk.ts";
// ITEM 378 (CORRECTION) — refinement + CSC + stamp on the ROUTED LTP path.
import { RISK_PIPELINE_STAMP } from "./risk-stamp.ts";
import { attachRiskCsc } from "./risk-csc.ts";
import { RISK_REFINEMENT_CONFIG, runRiskRefinement } from "./risk-refinement.ts";
import { emptyTelemetryFor, type RefinementDeps, type RefinementTelemetry } from "./refinement-core.ts";
// ITEM 379 — bidirectional coverage matrix + soft release ledger.
import {
  runCoverageMatrix,
  coverageListForCritic,
  coverageAnchorTokens,
  attachCoverage,
  type CoverageTelemetry,
} from "./coverage-matrix.ts";
import { attachReleaseLedger } from "./release-ledger.ts";
// ITEM 380 — the deterministic truth gate and placeholder classification.
import {
  affirmativeParagraph,
  attachRecordComplete,
  classifyPlaceholders,
  computeRecordComplete,
} from "./record-complete.ts";
import { cppaRiskContract } from "../intake-contracts/cppa-risk-assessment.ts";


export const CPPA_RISK_GENERATOR_STAMP = "generate-cppa-risk@2026-08-01-item357";
export { RISK_PIPELINE_STAMP };


export type Pass1Mode = "deterministic" | "model";

export interface GenerateCppaRiskOptions {
  /** Supabase client; only used to fetch the EU persuasive-authority corpus. */
  readonly db?: unknown;
  /** Pre-fetched EU corpus (harness / tests may pass an empty array). */
  readonly euCorpus?: unknown;
  readonly buildStamp: string;
  readonly runId?: string;
  /** "enforce" ships assembled content; "observe" is shadow-only. */
  readonly mode?: "enforce" | "observe";
  /** "deterministic" = derivePlan only (no model spend). Default "model". */
  readonly pass1?: Pass1Mode;
  readonly callerName?: string;
  /** Test/harness seam: inject the Pass-2R model call (hermetic runs, no spend). */
  // deno-lint-ignore no-explicit-any
  readonly pass2rCall?: any;
  /** Set false to skip Pass-2R entirely (records an explicit reason). */
  readonly pass2rEnabled?: boolean;
  /** UPGRADE-2 — pre-resolved §§ 7150-7157 corpus (test seam; else fetched from db). */
  readonly riskCorpus?: RiskCorpus;
  /**
   * ITEM 378 (CORRECTION) — critic/verifier callers for the refinement pass.
   * Omitted (tests/harnesses without model access) ⇒ refinement records
   * `enabled:false` telemetry and the document proceeds unchanged.
   */
  readonly refinementDeps?: RefinementDeps;
  /** Set false to skip the refinement pass explicitly. */
  readonly refinementEnabled?: boolean;
}


export interface GenerateCppaRiskResult {
  /** THE PERSISTED PAYLOAD. Write this verbatim to report_data. */
  readonly report: Record<string, unknown>;
  /** Assembled (pre-seal) body — Pass-2R merges its prose onto this. */
  readonly base: Record<string, unknown>;
  readonly plan: unknown | null;
  readonly ltpMeta: Record<string, unknown>;
  readonly typeJOrigin: string | null;
  readonly rawIntake: Record<string, unknown>;
  /** ITEM 378 — refinement telemetry when the pass ran at generate time. */
  readonly refinement?: RefinementTelemetry | null;
}


function seal(report: Record<string, unknown>, intakeRoster: unknown): {
  report: Record<string, unknown>;
  emit_gate_filtered: number;
} {
  const out = report;
  let filtered = 0;
  try {
    runEmitGate(out, { tool: "cppa_risk_assessment", intakeRoster: (intakeRoster ?? {}) as never });
  } catch (e) {
    console.warn("[generate-cppa-risk] emit-gate failed (non-fatal):", (e as Error)?.message);
  }
  try {
    filtered = filterCustomerInformationNeeded(out);
  } catch { /* fail-open */ }
  return { report: out, emit_gate_filtered: filtered };
}

function serializeCustomer(report: Record<string, unknown>): Record<string, unknown> {
  try {
    const { report: serialized, telemetry } = serializeCustomerReport(
      report as never,
      CPPA_RISK_REPORT_SCHEMA,
    );
    if (!telemetry.crashed) return serialized as Record<string, unknown>;
  } catch (e) {
    console.warn("[generate-cppa-risk] serializer failed (non-fatal):", (e as Error)?.message);
  }
  return report;
}

/**
 * Attach telemetry under `_meta.internal` — NEVER as top-level customer keys.
 * This is the single place the persisted payload is finalized.
 */
function attachInternal(
  report: Record<string, unknown>,
  ltp: Record<string, unknown>,
): Record<string, unknown> {
  const meta = (report._meta && typeof report._meta === "object" && !Array.isArray(report._meta))
    ? report._meta as Record<string, unknown>
    : {};
  const internal = (meta.internal && typeof meta.internal === "object" && !Array.isArray(meta.internal))
    ? meta.internal as Record<string, unknown>
    : {};
  internal.engine_path = "ltp";
  internal.generator = CPPA_RISK_GENERATOR_STAMP;
  internal.ltp = ltp;
  meta.internal = internal;
  report._meta = meta;
  return report;
}

/**
 * UPGRADE-2 (ITEM 3) — attach the table of authorities built from the
 * citations the report ACTUALLY emits. Excerpts come only from approved
 * corpus rows; every other citation renders citation-only. Fail-open.
 */
function attachAuthorityExhibit(
  report: Record<string, unknown>,
  corpus: RiskCorpus | null | undefined,
): void {
  try {
    const cited = new Set<string>();
    const walk = (v: unknown): void => {
      if (typeof v === "string") {
        for (const m of v.matchAll(/(?:\d+\s*CCR|Cal\.\s*Civ\.\s*Code|GDPR)[^,;.)\]]*?\u00a7+\s*[\d.]+(?:\([a-z0-9]+\))*/gi)) {
          cited.add(m[0].replace(/\s+/g, " ").trim());
        }
        return;
      }
      if (Array.isArray(v)) { for (const x of v) walk(x); return; }
      if (v && typeof v === "object") {
        for (const [k, x] of Object.entries(v as Record<string, unknown>)) {
          if (k === "_meta" || k === "_staging" || k === "authority_exhibit") continue;
          walk(x);
        }
      }
    };
    walk(report);
    report.authority_exhibit = buildAuthorityExhibit(
      [...cited],
      riskCorpusProvisionsForExhibit(corpus) as never,
    ) as unknown as Record<string, unknown>;
  } catch (e) {
    console.warn("[generate-cppa-risk] authority exhibit failed (non-fatal):", (e as Error)?.message);
  }
}

/**
 * Finalize an assembled body into the exact persisted payload.
 *
 * ITEM 378 (CORRECTION) — this is THE finalize point every completed
 * cppa-risk document passes through on the routed LTP path, so the three
 * item378 attaches land here:
 *   1. refinement telemetry (the pass itself already ran on `base` — see
 *      `refineRiskBase`, which the callers await BEFORE finalizing),
 *   2. the deterministic CSC post-pass (R1–R4), run after refinement,
 *   3. the permanent `risk_pipeline_stamp`.
 * CSC and the stamp run before the payload is returned for persist.
 */
export function finalizeCppaRiskPayload(
  base: Record<string, unknown>,
  ltpMeta: Record<string, unknown>,
  rawIntake: unknown,
  riskCorpus?: RiskCorpus | null,
  extras?: { refinement?: RefinementTelemetry | null },
): { report: Record<string, unknown>; emit_gate_filtered: number } {
  const sealed = seal({ ...base }, rawIntake);
  // The exhibit is attached BEFORE serialization so the schema allow-list
  // governs it like every other customer surface.
  attachAuthorityExhibit(sealed.report, riskCorpus);
  const serialized = serializeCustomer(sealed.report);
  const report = attachInternal(serialized, {
    ...ltpMeta,
    emit_gate_filtered: sealed.emit_gate_filtered,
  });

  // (1) refinement telemetry (the splices are already in `base`). This key is
  // unconditional: enabled, disabled, and fail-open runs all carry a record.
  try {
    const internal = ((report._meta as Record<string, unknown>).internal) as Record<string, unknown>;
    internal.risk_refinement = extras?.refinement ??
      emptyTelemetryFor(RISK_REFINEMENT_CONFIG, false, "refinement_not_invoked");
  } catch { /* non-fatal */ }

  // (2) CSC — deterministic post-pass, after refinement, before persist.
  try {
    attachRiskCsc(report, {
      intake: (rawIntake && typeof rawIntake === "object" ? rawIntake : {}) as Record<string, unknown>,
    });
  } catch (e) {
    console.warn("[generate-cppa-risk] risk-csc failed (non-fatal):", (e as Error)?.message);
  }

  // (3) ITEM 379 — bidirectional coverage matrix (flag-only) on the FINAL
  // document, alongside CSC. No repairs; telemetry only.
  let coverage: CoverageTelemetry | null = null;
  try {
    coverage = attachCoverage(
      report,
      "risk_coverage",
      runCoverageMatrix("cppa-risk", report, rawIntake),
    );
    console.log(JSON.stringify({
      evt: "risk_coverage", fn: "generate-cppa-risk",
      version: coverage.version, orphans: coverage.counts.orphans,
      unused_intake_facts: coverage.counts.unused_intake_facts,
      links_checked: coverage.counts.links_checked, crashed: coverage.crashed,
    }));
  } catch (e) {
    console.warn("[generate-cppa-risk] coverage matrix failed (non-fatal):", (e as Error)?.message);
  }

  // (4) permanent pipeline stamp on every document.
  try {
    const meta = (report._meta ??= {}) as Record<string, unknown>;
    const internal = (meta.internal ??= {}) as Record<string, unknown>;
    internal.risk_pipeline_stamp = RISK_PIPELINE_STAMP;
  } catch { /* non-fatal */ }

  // (5) ITEM 380 — THE TRUTH GATE + PLACEHOLDER CLASSIFICATION. Deterministic,
  // no model. Reads the coverage/CSC telemetry written above plus the LTP
  // build's own `record_needs.missing_data`. Fail-closed on the affirmative
  // claim: on any error `record_complete.value` stays false and every draft
  // framing renders exactly as it does today.
  try {
    const internal = ((report._meta as Record<string, unknown>)?.internal ?? {}) as Record<string, unknown>;
    const missingData = Number(
      ((internal.record_needs ?? (ltpMeta.record_needs as Record<string, unknown>)) as
        Record<string, unknown> | undefined)?.missing_data ?? NaN,
    );
    const telemetry = computeRecordComplete({
      product: "cppa-risk",
      contract: cppaRiskContract,
      intake: (rawIntake && typeof rawIntake === "object" ? rawIntake : {}) as Record<string, unknown>,
      coverage: internal.risk_coverage as never,
      csc: internal.risk_csc as never,
      recordNeedsMissingData: Number.isFinite(missingData) ? missingData : undefined,
    });
    const classification = classifyPlaceholders(report, rawIntake ?? {});
    attachRecordComplete(report, telemetry, classification);
    applyRiskRecordCompleteFraming(report, telemetry, classification);
    console.log(JSON.stringify({
      evt: "risk_record_complete", fn: "generate-cppa-risk",
      value: telemetry.value, failed_conditions: telemetry.failed_conditions,
      ...classification.counts,
    }));
  } catch (e) {
    console.warn("[generate-cppa-risk] record-complete gate failed (non-fatal):", (e as Error)?.message);
  }

  // (6) ITEM 379 — RELEASE LEDGER. Soft, non-blocking; alerts when non-clean.
  try {
    const internal = ((report._meta as Record<string, unknown>)?.internal ?? {}) as Record<string, unknown>;
    attachReleaseLedger(report, {
      refinement: internal.risk_refinement,
      csc: internal.risk_csc,
      coverage,
    }, { fn: "generate-cppa-risk", product: "cppa_risk_assessment" });
  } catch { /* non-fatal */ }

  return { report, emit_gate_filtered: sealed.emit_gate_filtered };
}

/**
 * ITEM 380 §3 (RISK) — the determination-equivalent surface for cppa-risk is
 * the record-sufficiency surface in the executive summary. When, and ONLY
 * when, the truth gate holds, its draft framing is replaced by the affirmative
 * paragraph; otherwise the surface is left byte-identical.
 */
export function applyRiskRecordCompleteFraming(
  report: Record<string, unknown>,
  telemetry: { value: boolean },
  classification: { counts: { action_item: number; preconditions: number } },
): void {
  if (!telemetry?.value) return;
  const text = affirmativeParagraph(
    classification.counts.action_item,
    classification.counts.preconditions,
  );
  // ITEM 380 r2 (DEFECT C) — SHAPE-AWARE WRITE. On the live LTP path the two
  // surfaces are NOT objects: `executive_summary` is a STRING and
  // `record_sufficiency` is an ARRAY of paragraphs. The item-380 object-only
  // write therefore silently no-opped and neither affirmative surface reached
  // the persisted document. Both shapes are now handled, and the surface SHAPE
  // is still never changed (a string stays a string, an array stays an array
  // of paragraph strings — the renderer prints both as-is).
  const es = report.executive_summary;
  if (typeof es === "string") {
    report.executive_summary = es.includes(text) ? es : `${es.trim()}\n\n${text}`.trim();
  } else if (es && typeof es === "object" && !Array.isArray(es)) {
    (es as Record<string, unknown>).record_sufficiency_statement = text;
  } else if (es === undefined || es === null) {
    report.executive_summary = { record_sufficiency_statement: text };
  }
  // Mirrored as a top-level statement so telemetry/tests and any surface-level
  // consumer can read the affirmative claim without reparsing prose.
  report.record_sufficiency_statement = text;

  const rs = report.record_sufficiency;
  if (Array.isArray(rs)) {
    if (!rs.some((p) => typeof p === "string" && p.includes(text))) rs.unshift(text);
  } else if (rs && typeof rs === "object") {
    (rs as Record<string, unknown>).prose = text;
  } else if (typeof rs === "string") {
    report.record_sufficiency = rs.includes(text) ? rs : `${text}\n\n${rs}`.trim();
  } else {
    report.record_sufficiency = [text];
  }
}


/**
 * ITEM 378 (CORRECTION) — run the refinement pass (CRITIC → VERIFIER →
 * DETERMINISTIC SPLICER) on the assembled body, IN PLACE, before finalize.
 * Fail-open: any error yields telemetry with `crashed` set and the body is
 * unchanged. Without `refinementDeps` the pass is recorded as disabled.
 */
export async function refineRiskBase(
  base: Record<string, unknown>,
  rawIntake: Record<string, unknown>,
  options: GenerateCppaRiskOptions,
): Promise<RefinementTelemetry> {
  const deps = options.refinementDeps;
  const enabled = options.refinementEnabled !== false;
  let telemetry = emptyTelemetryFor(
    RISK_REFINEMENT_CONFIG,
    enabled,
    enabled && !deps ? "missing_refinement_dependencies" : null,
  );
  try {
    if (enabled && deps) {
      // ITEM 379 §3 — the coverage list is computed BEFORE the critic call and
      // handed to it as the ONLY permitted anchor set for material-omission
      // findings. It is recomputed after splice for the final telemetry.
      const pre = runCoverageMatrix("cppa-risk", base, rawIntake);
      telemetry = await runRiskRefinement(base, rawIntake, deps, {
        enabled: true,
        coverageList: coverageListForCritic(pre),
        coverageAnchors: coverageAnchorTokens(pre),
      });
    } else if (!enabled) {
      telemetry = emptyTelemetryFor(RISK_REFINEMENT_CONFIG, false);
    }
  } catch (e) {
    telemetry = emptyTelemetryFor(
      RISK_REFINEMENT_CONFIG,
      enabled,
      `refinement_error:${(e as Error)?.message?.slice(0, 120) ?? "unknown"}`,
    );
    console.warn("[generate-cppa-risk] risk refinement failed (non-fatal):", (e as Error)?.message);
  } finally {
    console.log(JSON.stringify({
      evt: "risk_refinement", fn: options.callerName ?? "generate-cppa-risk",
      build_stamp: options.buildStamp, risk_pipeline_stamp: RISK_PIPELINE_STAMP, ...telemetry,
    }));
  }
  return telemetry;
}


export async function generateCppaRiskReport(
  rawIntakeInput: unknown,
  options: GenerateCppaRiskOptions,
): Promise<GenerateCppaRiskResult> {
  const rawIntake = (rawIntakeInput && typeof rawIntakeInput === "object" ? rawIntakeInput : {}) as Record<string, unknown>;
  const mode = options.mode ?? "enforce";
  const pass1Mode: Pass1Mode = options.pass1 ?? "model";
  const runId = options.runId ?? "no-run-id";
  const era = resolveLtpIntake(rawIntake);

  // UPGRADE-2 (ITEM 2) — resolve the governing chapter once per run.
  let riskCorpus: RiskCorpus = options.riskCorpus ?? EMPTY_RISK_CORPUS;
  if (!options.riskCorpus && options.db) {
    try {
      riskCorpus = await fetchRiskCorpus(options.db);
    } catch (e) {
      console.warn("[generate-cppa-risk] risk corpus fetch failed (non-fatal):", (e as Error)?.message);
    }
  }

  let euCorpus = options.euCorpus;
  if (euCorpus === undefined && options.db) {
    try {
      euCorpus = await fetchEuAuthorityCorpus(options.db as never);
    } catch (e) {
      console.warn("[generate-cppa-risk] eu corpus fetch failed (non-fatal):", (e as Error)?.message);
    }
  }

  let plan: unknown | null = null;
  let typeJOrigin: string | null = null;
  let pass1Telemetry: Record<string, unknown>;

  if (pass1Mode === "deterministic") {
    plan = derivePlan({
      intake: era.intake,
      report_data: {},
      buildStamp: options.buildStamp,
      ...(euCorpus !== undefined ? { eu_authority_corpus: euCorpus } : {}),
    } as never);
    pass1Telemetry = { ok: true, attempts: 0, write_around: false, latency_ms: 0, error: null, deterministic: true };
  } else {
    const p1 = await modelProvider(
      {
        intake: era.intake,
        report_data: {},
        buildStamp: `${options.buildStamp}#${runId}`,
        eu_authority_corpus: euCorpus,
        // UPGRADE-2 (ITEM 2) — corpus law block into Pass-1 prompt assembly.
        corpus_law_block: buildRiskCorpusLawBlock(riskCorpus),
      } as never,
      { callerName: options.callerName ?? "generate-cppa-risk" },
    );
    plan = p1.plan ?? null;
    if (!p1.telemetry.ok || !p1.plan) typeJOrigin = p1.telemetry.error ?? "pass1_model_error";
    pass1Telemetry = {
      ok: p1.telemetry.ok,
      attempts: p1.telemetry.attempts,
      write_around: p1.telemetry.write_around,
      latency_ms: p1.telemetry.latency_ms,
      error: p1.telemetry.error ?? null,
      deterministic: false,
    };
  }

  let base: Record<string, unknown>;
  let assemblerTelemetry: unknown = null;
  if (typeJOrigin || !plan) {
    // FAIL-CLOSED: ship the Type-J reserved-judgment body, never a fall-through.
    typeJOrigin = typeJOrigin ?? "pass1_no_plan";
    base = buildTypeJWriteAroundBody({
      intake: era.intake,
      origin: "pass1_validator_reject",
      buildStamp: options.buildStamp,
    } as never) as Record<string, unknown>;
  } else {
    const assembled = assembleReport(plan as never, {}, { exitMode: mode, runId } as never);
    base = assembled.report as Record<string, unknown>;
    assemblerTelemetry = assembled.telemetry;
  }

  // ITEM 358 (FIX 1) — needs classification telemetry. The conformance suite
  // reads this to assert the band law: zero `missing_data` needs ⇒ a genuine
  // band, never "Insufficient basis". Reserved decisions do not gate.
  let recordNeeds: Record<string, unknown> = { missing_data: null, reserved_decision: null };
  if (plan && !typeJOrigin) {
    try {
      const needs = computeRecordNeeds(plan as never);
      recordNeeds = {
        missing_data: needs.filter((n) => n.kind === "missing_data").length,
        reserved_decision: needs.filter((n) => n.kind === "reserved_decision").length,
        reserved_need_ids: needs.filter((n) => n.kind === "reserved_decision").map((n) => n.need_id),
      };
    } catch { /* fail-open: telemetry only */ }
  }

  const ltpMeta: Record<string, unknown> = {
    record_needs: recordNeeds,
    build_stamp: options.buildStamp,
    generator_stamp: CPPA_RISK_GENERATOR_STAMP,
    engine_path: "ltp",
    mode,
    pass1_mode: pass1Mode,
    pass1_manifest: PASS1_MANIFEST,
    pass2r_manifest: PASS2R_MANIFEST,
    pass1_telemetry: pass1Telemetry,
    assembler_telemetry: assemblerTelemetry,
    intake_era_normalization: era.telemetry,
    type_j_origin: typeJOrigin,
    shipped_surface: "deterministic",
    // ITEM 357(2b) — a deterministic ship must always carry a reason.
    pass2r_skipped_reason: typeJOrigin ? "type_j_write_around" : "pass2r_not_run_yet",
    pass2r_attempt_rejections: [],
    pass2r_prose_rejected: false,
    risk_corpus: {
      version: riskCorpus.version,
      resolved: riskCorpus.resolved_count,
      approved: riskCorpus.approved_count,
      spine_requirements: riskCorpus.spine_requirements.length,
    },
  };

  // ITEM 378 (CORRECTION 2) — persist-first is itself a completed customer
  // payload, so it must already contain refinement telemetry. If Pass-2R later
  // ships a different surface, that surface is refined and finalized again.
  const refinement = await refineRiskBase(base, rawIntake, options);

  const { report } = finalizeCppaRiskPayload(base, ltpMeta, rawIntake, riskCorpus, { refinement });
  return { report, base, plan, ltpMeta, typeJOrigin, rawIntake, refinement };
}


export interface Pass2RResult {
  /** New persisted payload when 2R shipped; null when the deterministic surface stands. */
  readonly report: Record<string, unknown> | null;
  readonly shipped_surface: "deterministic" | "2R";
  readonly meta: Record<string, unknown>;
}

/**
 * ITEM 357(2b) — Pass-2R, run INSIDE the persisted lifecycle.
 *
 * Returns the payload to UPDATE the row with. On a 2R ship, that is the merged
 * prose payload; on rejection/skip it is the deterministic payload re-finalized
 * with the recorded reason, so the row NEVER carries a silent fallback.
 */
export async function runCppaRiskPass2R(
  gen: GenerateCppaRiskResult,
  options: GenerateCppaRiskOptions,
): Promise<Pass2RResult> {
  const enforce = (options.mode ?? "enforce") === "enforce";
  // UPGRADE-2 — the same corpus that governed Pass-1 governs the 2R re-finalize.
  let riskCorpus: RiskCorpus = options.riskCorpus ?? EMPTY_RISK_CORPUS;
  if (!options.riskCorpus && options.db) {
    try { riskCorpus = await fetchRiskCorpus(options.db); } catch { /* fail-open */ }
  }
  if (gen.typeJOrigin || !gen.plan) {
    return {
      report: null,
      shipped_surface: "deterministic",
      meta: {
        pass2r_telemetry: null,
        pass2r_skipped_reason: "type_j_write_around",
        pass2r_attempt_rejections: [],
        pass2r_prose_rejected: false,
      },
    };
  }
  try {
    const stage = await runProsePassStage(
      gen.plan as never,
      gen.base,
      {
        enabled: options.pass2rEnabled !== false,
        enforce,
        callerName: options.callerName ?? "generate-cppa-risk",
        // UPGRADE-2 (ITEM 2) — same corpus law block into Pass-2R.
        corpusLawBlock: buildRiskCorpusLawBlock(riskCorpus),
        ...(options.pass2rCall ? { call: options.pass2rCall } : {}),
      } as never,
    );
    const rejections = stage.attempt_rejections ?? [];
    const meta = {
      pass2r_telemetry: stage.telemetry ?? null,
      pass2r_skipped_reason: stage.skipped_reason ??
        (stage.shipped_surface === "2R" ? null : (rejections.length ? "prose_rejected" : "unknown_no_ship")),
      pass2r_attempt_rejections: rejections,
      pass2r_prose_rejected: stage.prose_rejected ? true : false,
    };
    if (stage.shipped_surface === "2R" && stage.prose) {
      const merged = { ...gen.base, ...(stage.prose as unknown as Record<string, unknown>) };
      // ITEM 378 — refinement on the shipped surface, BEFORE CSC/finalize.
      const refinement = await refineRiskBase(merged, gen.rawIntake, options);
      const { report } = finalizeCppaRiskPayload(
        merged,
        { ...gen.ltpMeta, shipped_surface: "2R", ...meta },
        gen.rawIntake,
        riskCorpus,
        { refinement },
      );
      return { report, shipped_surface: "2R", meta };
    }
    const refinementDet = gen.refinement ?? await refineRiskBase(gen.base, gen.rawIntake, options);
    const { report } = finalizeCppaRiskPayload(
      gen.base,
      { ...gen.ltpMeta, shipped_surface: "deterministic", ...meta },
      gen.rawIntake,
      riskCorpus,
      { refinement: refinementDet },
    );
    return { report, shipped_surface: "deterministic", meta };

  } catch (e) {
    const meta = {
      pass2r_telemetry: null,
      pass2r_skipped_reason: `pass2r_threw:${(e as Error)?.message ?? "unknown"}`.slice(0, 200),
      pass2r_attempt_rejections: [],
      pass2r_prose_rejected: false,
    };
    const refinementFallback = gen.refinement ?? await refineRiskBase(gen.base, gen.rawIntake, options);
    const { report } = finalizeCppaRiskPayload(
      gen.base,
      { ...gen.ltpMeta, shipped_surface: "deterministic", ...meta },
      gen.rawIntake,
      riskCorpus,
      { refinement: refinementFallback },
    );

    return { report, shipped_surface: "deterministic", meta };
  }
}
