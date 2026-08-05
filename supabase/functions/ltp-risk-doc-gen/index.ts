/**
 * ITEM 335 — HARNESS-ONLY LTP DOCUMENT GENERATOR (cppa-risk).
 *
 * ITEM 357 REFACTOR: this harness no longer carries its own copy of the
 * generation path. It calls the ONE shared module
 * (`_shared/ltp/generate-cppa-risk.ts`), which owns entry-intake → Pass-1 →
 * assembleReport → emit-gate → serialization → the final persisted payload.
 * The harness is now pure plumbing: load row, call module, persist, run
 * Pass-2R inside the awaited lifecycle, update.
 *
 * SCOPE GUARD: reachable ONLY with the service-role bearer; called only by
 * run-quality-batch when a run row carries `engine_path = 'ltp'`. Nothing
 * customer-facing routes here.
 *
 * PERSIST-FIRST (fleet law): the deterministic payload is written BEFORE
 * Pass-2R runs; Pass-2R then UPDATEs the row from inside the same awaited task.
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import {
  generateCppaRiskReport,
  runCppaRiskPass2R,
  CPPA_RISK_GENERATOR_STAMP,
} from "../_shared/ltp/generate-cppa-risk.ts";
import { makeRiskRefinementDeps, RISK_REFINEMENT_ENABLED } from "../_shared/ltp/risk-refinement-deps.ts";

const BUILD_STAMP = "ltp-risk-doc-gen-item357-2026-08-01";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

console.log(`[ltp-risk-doc-gen] boot build_stamp=${BUILD_STAMP} generator=${CPPA_RISK_GENERATOR_STAMP}`);

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

    const options = {
      db,
      buildStamp: BUILD_STAMP,
      runId: assessmentId,
      mode: "observe" as const,
      pass1: "model" as const,
      callerName: "ltp-risk-doc-gen",
      refinementDeps: makeRiskRefinementDeps(assessmentId, "ltp-risk-doc-gen"),
      refinementEnabled: RISK_REFINEMENT_ENABLED,
    };
    const gen = await generateCppaRiskReport(row.intake_data ?? {}, options);

    // ---- PERSIST-FIRST: deterministic payload lands before any 2R call.
    await db.from("cppa_assessments").update({
      status: "complete",
      report_data: gen.report,
    }).eq("id", assessmentId);

    // ---- PASS-2R inside the awaited lifecycle; the UPDATE is part of the task.
    const p2 = await runCppaRiskPass2R(gen, options);
    if (p2.report) {
      await db.from("cppa_assessments").update({ report_data: p2.report }).eq("id", assessmentId);
    }
    console.log(JSON.stringify({
      evt: "ltp_risk_doc_gen_complete", assessment_id: assessmentId,
      shipped_surface: p2.shipped_surface, skipped_reason: p2.meta.pass2r_skipped_reason ?? null,
    }));
  } catch (e) {
    const msg = (e as Error).message ?? String(e);
    console.error("[ltp-risk-doc-gen] fatal:", msg);
    try {
      await db.from("cppa_assessments")
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
