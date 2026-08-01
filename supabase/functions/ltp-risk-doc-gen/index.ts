/**
 * ITEM 335 — HARNESS-ONLY LTP DOCUMENT GENERATOR (cppa-risk).
 *
 * Purpose: let the shared quality-batch runner generate cppa-risk test
 * documents through the NEW LTP pipeline (Pass-1 -> assembleReport ->
 * Pass-2R) instead of invoking production `run-cppa-risk-assessment`, which
 * remains pinned to the Item-217 legacy engine by the Item 245 rollback hold.
 *
 * SCOPE GUARD: this function is reachable ONLY with the service-role bearer,
 * and is only ever called by
 * run-quality-batch when a run row carries `engine_path = 'ltp'`. Nothing
 * customer-facing routes here. `run-cppa-risk-assessment` is untouched.
 *
 * PERSIST-FIRST (fleet law): the deterministic report is written to the
 * cppa_assessments row BEFORE Pass-2R runs. Pass-2R output is folded in
 * afterwards; isolate death during 2R costs only the 2R telemetry.
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { modelProvider } from "../_shared/ltp/replay/providers.ts";
import { normalizeEraIntake } from "../_shared/ltp/replay/era-normalize.ts";
import { assembleReport } from "../_shared/ltp/pass2-assembler.ts";
import { runProsePassStage, PASS2R_MANIFEST } from "../_shared/ltp/pass2r-llm.ts";
import { PASS1_MANIFEST } from "../_shared/ltp/pass1-llm.ts";

const BUILD_STAMP = "ltp-risk-doc-gen-item335-2026-08-01";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function generate(assessmentId: string): Promise<void> {
  const db = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });
  try {
    const { data: row, error } = await db
      .from("cppa_assessments")
      .select("id, intake_data")
      .eq("id", assessmentId)
      .single();
    if (error || !row) throw new Error(`load assessment: ${error?.message ?? "not found"}`);

    await db.from("cppa_assessments").update({ status: "processing" }).eq("id", assessmentId);

    const era = normalizeEraIntake((row.intake_data ?? {}) as Record<string, unknown>);
    const p1 = await modelProvider(
      { intake: era.intake, report_data: {}, buildStamp: `${BUILD_STAMP}#${assessmentId}` },
      { callerName: "ltp-risk-doc-gen" },
    );
    const assembled = assembleReport(p1.plan, {}, { exitMode: "observe" });

    // ---- PERSIST-FIRST: deterministic surface lands before any 2R call.
    const deterministic: Record<string, unknown> = {
      ...(assembled.report as Record<string, unknown>),
      _engine_path: "ltp",
      _ltp: {
        build_stamp: BUILD_STAMP,
        pass1_manifest: PASS1_MANIFEST,
        pass2r_manifest: PASS2R_MANIFEST,
        pass1_telemetry: {
          ok: p1.telemetry.ok,
          attempts: p1.telemetry.attempts,
          write_around: p1.telemetry.write_around,
          latency_ms: p1.telemetry.latency_ms,
        },
        assembler_telemetry: assembled.telemetry,
        intake_era_normalization: era.telemetry,
        shipped_surface: "deterministic",
      },
    };
    await db.from("cppa_assessments").update({
      status: "complete",
      report_data: deterministic,
    }).eq("id", assessmentId);

    // ---- PASS-2R. FALLBACK LAW: prose only ships when the stage accepts it.
    try {
      const stage = await runProsePassStage(
        p1.plan as never,
        assembled.report as Record<string, unknown>,
        { enabled: true, callerName: "ltp-risk-doc-gen" },
      );
      const shipped = stage.shipped_surface === "prose" && stage.prose
        ? { ...(assembled.report as Record<string, unknown>), ...(stage.prose as Record<string, unknown>) }
        : (assembled.report as Record<string, unknown>);
      await db.from("cppa_assessments").update({
        report_data: {
          ...deterministic,
          ...shipped,
          _ltp: {
            ...(deterministic._ltp as Record<string, unknown>),
            shipped_surface: stage.shipped_surface,
            pass2r_telemetry: stage.telemetry ?? null,
            pass2r_skipped_reason: (stage as { skipped_reason?: string }).skipped_reason ?? null,
          },
        },
      }).eq("id", assessmentId);
    } catch (e) {
      console.warn("[ltp-risk-doc-gen] pass2r failed (non-fatal):", (e as Error).message);
    }
  } catch (e) {
    const msg = (e as Error).message ?? String(e);
    console.error("[ltp-risk-doc-gen] fatal:", msg);
    try {
      await createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } })
        .from("cppa_assessments")
        .update({ status: "error", error_message: msg.slice(0, 500) })
        .eq("id", assessmentId);
    } catch { /* best effort */ }
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "POST only", build_stamp: BUILD_STAMP }, 405);

  const token = (req.headers.get("Authorization") ?? "").replace("Bearer ", "");
  const internal = token === SERVICE_KEY;
  if (!internal) return json({ error: "internal harness only" }, 403);

  let body: Record<string, unknown> = {};
  try { body = await req.json(); } catch { /* */ }
  const assessmentId = String(body?.assessment_id ?? "");
  if (!assessmentId) return json({ error: "assessment_id required" }, 400);

  // @ts-ignore EdgeRuntime is provided by the Deno edge runtime.
  EdgeRuntime.waitUntil(generate(assessmentId));
  return json({ ok: true, assessment_id: assessmentId, build_stamp: BUILD_STAMP }, 202);
});
