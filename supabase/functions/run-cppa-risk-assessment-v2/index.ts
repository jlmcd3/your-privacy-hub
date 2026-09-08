/**
 * ITEM 357 — run-cppa-risk-assessment-v2 (BLUE/GREEN V2 SHELL).
 *
 * Retires the cutover-attempt model. This is the GREEN function: legacy shell
 * plumbing (auth, revision short-circuit, entitlement, function-run logging,
 * lifecycle write order, metering, error handling) copied from the working
 * legacy `run-cppa-risk-assessment`, wrapped around ONE call to the shared
 * generation module.
 *
 * HARD RULE: NO ENGINE LOGIC IN THIS SHELL. Everything from entry-intake
 * normalization through the final persisted payload lives in
 * `_shared/ltp/generate-cppa-risk.ts`. If a key needs to change on the
 * customer surface, it changes there — never here.
 *
 * ROUTING (ITEM 359): THIS IS THE LIVE CUSTOMER PATH. Every enumerated
 * invocation site was flipped here; legacy `run-cppa-risk-assessment` stays
 * deployed but unrouted for instant string-reversion. Item 245 hold RELEASED
 * (CEO completion mandate, 2026-08-01/02).
 *
 * PASS-2R LIFECYCLE (Item 357 §2b, Item 287 pattern): the deterministic
 * payload persists first, then Pass-2R runs and UPDATEs the row from INSIDE
 * the same `EdgeRuntime.waitUntil` task. Pass-2R never runs after shutdown,
 * and a deterministic ship always carries a recorded reason.
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { verifyCaller } from "../_shared/verify-caller.ts";
import { requireEntitlement } from "../_shared/entitlement.ts";
import { handleRevisionMode } from "../_shared/revision-mode.ts";
import { lifecycleUpdate } from "../_shared/lifecycle-write.ts";
import { startFunctionRun, finishFunctionRun, failFunctionRun } from "../_shared/function-run-logger.ts";
import { recordRunMeterAndVersion } from "../_shared/run-meter.ts";
import {
  generateCppaRiskReport,
  runCppaRiskPass2R,
  CPPA_RISK_GENERATOR_STAMP,
  RISK_PIPELINE_STAMP,
} from "./_local/ltp/generate-cppa-risk.ts";
// ITEM 378 (CORRECTION) — refinement deps for the ROUTED LTP finalize point.
import { makeRiskRefinementDeps, RISK_REFINEMENT_ENABLED } from "./_local/ltp/risk-refinement-deps.ts";
import { serveWithGenerationModel, currentGenerationModel, currentSourceRowId, generationTimeoutMs, stampGenerationModel } from "../_shared/generation-model.ts"; // MODEL A/B HARNESS dispatch 1
// DOC 231 — CPPA RISK V3 (dark). RISK_HOOKS_ENABLED governs whether an
// already-settled hook may RENDER (risk-hooks-flag.ts, hook-join.ts
// consumers); RISK_V3_ENABLED governs whether an unsettled hook's fact
// agreement may be SETTLED by a two-leg model call at all
// (risk-v3-flag.ts, risk-v3-selection.ts). Both default false; both are
// inert today regardless of value because RISK_HOOKS
// (_local/corpus/maps/risk-hooks.ts) ships an empty array (doc 229 §5.3).
import { RISK_HOOKS_ENABLED } from "./_local/ltp/risk-hooks-flag.ts";
import { RISK_V3_ENABLED } from "./_local/ltp/risk-v3-flag.ts";

const FN = "run-cppa-risk-assessment-v2";
const BUILD_STAMP = "ltp-risk-v2-item359-routed@2026-08-02";
const LTP_MODE = Deno.env.get("LTP_ENFORCE_ENABLED") === "1" ? "enforce" : "shadow";
// RK1 (conversion spec §3) — Pass-1 mode is FLAG-GATED. The deterministic
// derivePlan path is coverage-proven over goldens + the full 880-row stored
// intake sweep (doc 29); the flip to deterministic is the RK1 config action,
// taken by setting RISK_PASS1_DETERMINISTIC=1 once the api_usage meter is
// verified recording (spec gate: zero Pass-1 usage must be a PROVEN zero).
// Default unchanged ("model") until the flag is set.
const PASS1_MODE = Deno.env.get("RISK_PASS1_DETERMINISTIC") === "1" ? "deterministic" as const : "model" as const;
// RK2 (conversion spec §3) — Pass-2R retired (PN-RK1 ruled: RETIRE) + post-pass
// writes off (detect-only). Both default off; re-enable via flag for rollback.
// Zero-model-call proof via the LIVE replay harness after the CEO sets both flags.
const PASS2R_ENABLED = Deno.env.get("RISK_PASS2R_ENABLED") === "1";
const POST_PASS_DETECT_ONLY = Deno.env.get("RISK_POST_PASS_DETECT_ONLY") === "1";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

console.log(`[${FN}] boot build_stamp=${BUILD_STAMP} generator=${CPPA_RISK_GENERATOR_STAMP} risk_pipeline_stamp=${RISK_PIPELINE_STAMP} ltp_mode=${LTP_MODE} pass1_mode=${PASS1_MODE} pass2r_enabled=${PASS2R_ENABLED} post_pass_detect_only=${POST_PASS_DETECT_ONLY} risk_hooks_enabled=${RISK_HOOKS_ENABLED} risk_v3_enabled=${RISK_V3_ENABLED} engine_path=ltp routed=true`);

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function runPipeline(assessmentId: string): Promise<void> {
  const t0 = Date.now();
  const { data: row, error } = await supabase
    .from("cppa_assessments")
    .select("id, user_id, intake_data")
    .eq("id", assessmentId)
    .single();
  if (error || !row) throw new Error(`load assessment: ${error?.message ?? "not found"}`);

  // DOC 231A — CPPA RISK V3 meter pre-read (closes doc 231 build-log NEED
  // #4). Mirrors run-li-assessment/index.ts's own pre-read (~line 1985-1999):
  // generation number = the meter's runs_used + 1 (no row yet, i.e. the
  // first generation for this assessment, -> 1); the cap `attachRiskHookSelection`
  // applies is 2 calls per generation x runs_allowed (doc 224 §3). Read
  // BEFORE `generateCppaRiskReport` so `riskV3Meter` carries the REAL
  // values into that call, rather than the conservative defaults
  // (runsAllowed:4, generationNo:1) `generate-cppa-risk.ts` falls back to
  // when this option is omitted. Fail-open: any read error leaves the same
  // conservative defaults in place (first-generation-shaped), never throws
  // and never blocks the pipeline — matches every other finalize step's
  // discipline in this pipeline.
  let riskV3GenerationNo = 1;
  let riskV3RunsAllowed = 4;
  try {
    const { data: meterRow } = await supabase
      .from("tool_run_meter").select("runs_used,runs_allowed")
      .eq("tool_type", "cppa_risk_assessment").eq("assessment_id", assessmentId).maybeSingle();
    if (meterRow) {
      riskV3GenerationNo = Number((meterRow as { runs_used?: number }).runs_used ?? 0) + 1;
      riskV3RunsAllowed = Number((meterRow as { runs_allowed?: number }).runs_allowed ?? 4);
    }
  } catch { /* first generation — the conservative defaults above stand */ }

  const options = {
    db: supabase,
    buildStamp: BUILD_STAMP,
    runId: assessmentId,
    mode: "enforce" as const,
    pass1: PASS1_MODE,
    pass2rEnabled: PASS2R_ENABLED,
    postPassDetectOnly: POST_PASS_DETECT_ONLY,
    callerName: FN,
    // ITEM 378 (CORRECTION) — critic/verifier injected so the refinement pass
    // runs on this (routed) path; CSC + stamp land in finalizeCppaRiskPayload.
    refinementDeps: makeRiskRefinementDeps(assessmentId, FN),
    refinementEnabled: RISK_REFINEMENT_ENABLED,
    // DOC 231 — CPPA RISK V3 hook selection (dark). Wiring the DB client
    // now (inert while RISK_V3_ENABLED is false) so the CEO's flag flip
    // does not also require a code change here.
    riskV3Db: supabase,
    // DOC 231A — the real cap/generation number, pre-read above. Inert
    // today regardless (RISK_V3_ENABLED defaults false and RISK_HOOKS
    // ships empty), but required before RISK_V3_ENABLED is ever set true
    // in a live environment (doc 231 build-log NEED #4, now closed).
    riskV3Meter: { runsAllowed: riskV3RunsAllowed, generationNo: riskV3GenerationNo },
  };

  // ── ONE CALL. The module returns the exact payload to persist. ──────
  const gen = await generateCppaRiskReport((row as { intake_data?: unknown }).intake_data ?? {}, options);

  // Metering + version retention, written BEFORE status:complete (legacy order).
  await recordRunMeterAndVersion(supabase, {
    toolType: "cppa_risk_assessment",
    assessmentId,
    userId: (row as { user_id?: string | null }).user_id ?? null,
    intake: ((row as { intake_data?: Record<string, unknown> }).intake_data ?? {}),
    reportData: gen.report,
  });

  const firstWrite = await lifecycleUpdate(supabase, "cppa_assessments", assessmentId, {
    status: "complete",
    report_data: stampGenerationModel(gen.report),
  }, { fn: FN, phase: "persist_first" });
  if (!firstWrite.ok) throw new Error(`persist_first_failed: ${(firstWrite as { message?: string }).message ?? ""}`);

  console.log(JSON.stringify({
    evt: "v2_persist_first", fn: FN, build_stamp: BUILD_STAMP,
    assessment_id: assessmentId, type_j: gen.typeJOrigin,
    pass1_mode: PASS1_MODE, pass2r_enabled: PASS2R_ENABLED,
    post_pass_detect_only: POST_PASS_DETECT_ONLY, elapsed_ms: Date.now() - t0,
  }));

  // ── PASS-2R inside the persisted lifecycle (awaited; UPDATE included).
  const p2 = await runCppaRiskPass2R(gen, options);
  if (p2.report) {
    await lifecycleUpdate(supabase, "cppa_assessments", assessmentId, {
      status: "complete",
      report_data: stampGenerationModel(p2.report),
    }, { fn: FN, phase: "pass2r_update" });
  }
  console.log(JSON.stringify({
    evt: "v2_complete", fn: FN, assessment_id: assessmentId,
    shipped_surface: p2.shipped_surface,
    pass2r_skipped_reason: p2.meta.pass2r_skipped_reason ?? null,
    pass2r_attempt_rejections: (p2.meta.pass2r_attempt_rejections as unknown[] ?? []).length,
    elapsed_ms: Date.now() - t0,
  }));
}

Deno.serve(serveWithGenerationModel(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const url = new URL(req.url);
  if (req.method === "GET" && url.searchParams.get("ping") === "1") {
    return json({
      fn: FN,
      build_stamp: BUILD_STAMP,
      generator_stamp: CPPA_RISK_GENERATOR_STAMP,
      ltp_mode: LTP_MODE,
      // ITEM 362 — parity with the legacy ping: the batch preflight reads
      // `composition_enforce` and aborted with composition_enforce_mismatch
      // (expected "1", actual null) because v2 never reported it.
      composition_enforce: Deno.env.get("LTP_COMPOSITION_ENFORCE") === "1" ? "1" : "0",
      pass1_mode: PASS1_MODE,
      pass2r_enabled: PASS2R_ENABLED,
      post_pass_detect_only: POST_PASS_DETECT_ONLY,
      engine_path: "ltp",
      routed: true,
    });
  }

  const caller = await verifyCaller(req, "user");
  if (!caller.ok) return json({ error: caller.error ?? "Unauthorized" }, caller.status ?? 401);

  let body: Record<string, unknown> = {};
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }
  const assessment_id = body?.assessment_id as string | undefined;
  if (!assessment_id) return json({ error: "assessment_id required" }, 400);

  // RC-B.1 — scoped-delta revision short-circuit (identical to legacy).
  const rev = await handleRevisionMode(supabase, body, { toolType: "cppa_risk_assessment" });
  if (rev) return rev;

  const ent = await requireEntitlement(caller, "cppa_risk_assessment", { rowId: assessment_id });
  if (!ent.ok) {
    console.log(JSON.stringify({ evt: "entitlement_denied", fn: FN, reason: ent.reason }));
    return json({ error: "forbidden" }, ent.status ?? 403);
  }

  const fnRun = await startFunctionRun(supabase, FN, {
    archetype: "background",
    trustClass: "user",
    invokedBy: "user",
    metadata: { assessment_id },
  });
  const proc = await lifecycleUpdate(supabase, "cppa_assessments", assessment_id, { status: "processing" }, { fn: FN, phase: "pre_generation_http" });
  if (!proc.ok) {
    await failFunctionRun(supabase, fnRun, new Error(`lifecycle_write_failed: ${(proc as { message?: string }).message}`), { metadata: { assessment_id, phase: "pre_generation_http" } });
    return json({ error: "lifecycle_write_failed", message: (proc as { message?: string }).message }, 500);
  }

  const wrapped = (async () => {
    try {
      await runPipeline(assessment_id);
      await finishFunctionRun(supabase, fnRun, { status: "success", sourceTable: "cppa_assessments", sourceRowId: assessment_id });
    } catch (e) {
      console.error(`[${FN}] pipeline error:`, e);
      try {
        await lifecycleUpdate(supabase, "cppa_assessments", assessment_id, {
          status: "error",
          error_message: ((e as Error)?.message ?? String(e)).slice(0, 500),
        }, { fn: FN, phase: "terminal_error" });
      } catch { /* best effort */ }
      await failFunctionRun(supabase, fnRun, e, { metadata: { assessment_id } });
    }
  })();

  // @ts-ignore Deno Edge Runtime API
  const er = (globalThis as any).EdgeRuntime;
  if (er?.waitUntil) er.waitUntil(wrapped);

  return json({ accepted: true, assessment_id, build_stamp: BUILD_STAMP }, 202);
}));
