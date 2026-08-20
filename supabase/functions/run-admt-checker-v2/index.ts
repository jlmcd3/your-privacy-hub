// CPPA ADMT Compliance Audit — v2 (CONVERSION BUILD).
//
// Implements CPPA_ADMT_Audit_Spine_v1.2_Revised.docx (CEO-authored
// 2026-08-19/20) in full: Part I customer-facing spine + Part II
// deterministic-variable specification. NO MODEL CALL — every determination
// is a pure function of the existing ADMT intake contract (cppa-admt.ts).
// Per the CEO's authority (2026-08-20 build directive), no Fable 5 / factor
// engine is required for this product: the spine names no {{FACTOR.*}}
// slots, only closed-form deterministic (D_) and bounded-template generated
// (G_) variables, both computed in-process.
//
// v1 (`run-admt-checker`) is UNTOUCHED. This function reuses the same
// `cppa_assessments` table with a distinct `module` value ("admt_v2") so no
// migration is required and no v1 row can collide with a v2 row.
//
// Synchronous by design: deterministic computation completes in
// milliseconds, so this function does not need v1's background-job /
// heartbeat / wall-clock-budget machinery (built for its 250s+ LLM calls).

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { computeAdmtV2 } from "./_local/ltp/admt-v2-deterministic.ts";
import { assembleAdmtV2Document, ADMT_V2_SPINE_VERSION } from "./_local/ltp/admt-v2-assemble.ts";
import { buildAuthorityExhibit } from "../_shared/report-exhibits/authority-exhibit.ts";
import { vaRegistryAsProvisions } from "./_local/ltp/admt-v2-corpus.ts";
import { serializeCustomerReport } from "../_shared/report-serialize.ts";
import { ADMT_V2_REPORT_SCHEMA } from "./_local/report-schemas/admt-v2.ts";
import { startFunctionRun, finishFunctionRun, failFunctionRun } from "../_shared/function-run-logger.ts";

export const BUILD_STAMP = "run-admt-checker-v2@2026-08-20T00:00:00Z-conversion-so12";
console.log(`[run-admt-checker-v2] boot build_stamp=${BUILD_STAMP} spine=${ADMT_V2_SPINE_VERSION}`);

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

/** Gathers every citation string a computed result actually emits (finding
 * authorities + the two header/statutory-framing citations), deduplicated.
 * This is the SAME "only what the document actually cites" discipline every
 * other product's authority exhibit already follows. */
function gatherCitations(findingAuthorities: string[]): string[] {
  const extra = ["11 CCR § 7200", "11 CCR § 7150(b)(3)"];
  return [...new Set([...findingAuthorities, ...extra].filter((c) => c && c.trim()))];
}

/** LEAK-PREV-P2 — schema-driven whitelist pass, matching
 * run-registration-assessment's call-site pattern (static import, small
 * local helper; this product is synchronous like registration, not
 * background/async like v1's LLM pipeline). Fail-visible: the serializer
 * never throws outward, and on internal crash returns the report unchanged
 * rather than blocking availability — see report-serialize.ts. */
function serializeCustomer(report: Record<string, unknown>): Record<string, unknown> {
  try {
    const { report: serialized, telemetry } = serializeCustomerReport(report as never, ADMT_V2_REPORT_SCHEMA);
    if (!telemetry.crashed) return serialized as Record<string, unknown>;
    console.warn("[run-admt-checker-v2] LEAK-PREV-P2 serializer crashed (non-fatal):", telemetry.crash_message);
  } catch (e) {
    console.warn("[run-admt-checker-v2] LEAK-PREV-P2 serializer threw (non-fatal):", (e as Error)?.message);
  }
  return report;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "POST required" }, 405);

  const t0 = Date.now();
  let body: any;
  try { body = await req.json(); } catch { return json({ error: "Invalid JSON" }, 400); }

  // Two calling conventions, matching the fleet's two existing patterns:
  //  (a) { assessment_id } — read intake_data from an existing cppa_assessments row.
  //  (b) { intake_data, user_id?, client_id? } — direct intake, no prior row
  //      (used by the eval harness / stress runners, matching run-cppa-risk-
  //      assessment-v2's own convention).
  let intake: Record<string, unknown>;
  let assessmentId: string | null = body?.assessment_id ? String(body.assessment_id) : null;
  const userId: string | null = body?.user_id ? String(body.user_id) : null;
  const clientId: string | null = body?.client_id ? String(body.client_id) : null;

  // Synchronous/foreground archetype: this handler computes and returns the
  // completed report in the same request (no background dispatch), unlike
  // v1's LLM pipeline.
  const fnRun = await startFunctionRun(supabase, "run-admt-checker-v2", {
    archetype: "foreground",
    trustClass: "user",
    invokedBy: userId ? "user" : "internal",
    userId,
    metadata: { assessment_id: assessmentId, build_stamp: BUILD_STAMP },
  });

  if (assessmentId) {
    const { data: row, error } = await supabase
      .from("cppa_assessments").select("*").eq("id", assessmentId).eq("module", "admt_v2").single();
    if (error || !row) {
      await failFunctionRun(supabase, fnRun, new Error(error?.message ?? "assessment_not_found"), { metadata: { assessment_id: assessmentId } });
      return json({ error: "Assessment not found" }, 404);
    }
    intake = (row.intake_data ?? {}) as Record<string, unknown>;
  } else if (body?.intake_data && typeof body.intake_data === "object") {
    intake = body.intake_data as Record<string, unknown>;
  } else {
    await failFunctionRun(supabase, fnRun, new Error("assessment_id or intake_data required"));
    return json({ error: "assessment_id or intake_data required" }, 400);
  }

  console.log(JSON.stringify({ evt: "admt_v2_generation_start", fn: "run-admt-checker-v2", build_stamp: BUILD_STAMP, assessment_id: assessmentId }));

  let report: Record<string, unknown>;
  let computed: ReturnType<typeof computeAdmtV2>;
  try {
    computed = computeAdmtV2(intake);
    const organizationName = String((intake as any)?.organization_name ?? "").trim();
    const systemName = String((intake as any)?.system_name ?? "").trim();

    const citations = gatherCitations(computed.allFindings.map((f) => f.authority).filter(Boolean));
    const exhibit = buildAuthorityExhibit(citations, vaRegistryAsProvisions());

    const skeleton = assembleAdmtV2Document({ intake, computed, exhibit, organizationName, systemName });

    report = {
      _meta: {
        internal: {
          admt_v2_pipeline_stamp: BUILD_STAMP,
          spine_version: ADMT_V2_SPINE_VERSION,
          spine_source: "CPPA_ADMT_Audit_Spine_v1.2_Revised.docx",
          overall_posture_label: computed.overallPostureLabel,
          overall_record_grade: computed.overallRecordGrade,
          scope_state: computed.scope.scopeState,
          opt_out_path: computed.optOutPath,
          finding_count: computed.allFindings.length,
          // LEAK-PREV-P2: typed findings (finding_id, source_fields,
          // closure_condition, and other internal-only fields) are kept
          // here — never at the top level — so a future on-screen result
          // page, or a follow-on battery, can still read the same typed
          // objects the document was built from, without shipping the
          // internal machinery to the customer's browser.
          findings: computed.allFindings,
        },
      },
      skeleton_document: skeleton,
      authority_exhibit: exhibit,
    };
    report = serializeCustomer(report);
  } catch (e) {
    console.error("[run-admt-checker-v2] generation failed:", (e as Error)?.message, (e as Error)?.stack);
    await failFunctionRun(supabase, fnRun, e, { metadata: { assessment_id: assessmentId } });
    return json({ error: "generation_failed", message: (e as Error)?.message }, 500);
  }

  console.log(JSON.stringify({
    evt: "admt_v2_generated", fn: "run-admt-checker-v2", build_stamp: BUILD_STAMP, assessment_id: assessmentId,
    overall_posture_label: computed.overallPostureLabel, finding_count: computed.allFindings.length,
    elapsed_ms: Date.now() - t0,
  }));

  const persistPayload = {
    module: "admt_v2",
    status: "complete",
    intake_data: intake,
    report_data: report,
    user_id: userId,
    client_id: clientId,
    updated_at: new Date().toISOString(),
  };

  if (assessmentId) {
    const { error } = await supabase.from("cppa_assessments").update(persistPayload).eq("id", assessmentId);
    if (error) {
      await failFunctionRun(supabase, fnRun, error, { metadata: { assessment_id: assessmentId } });
      return json({ error: "persist_failed", message: error.message }, 500);
    }
  } else {
    const { data, error } = await supabase.from("cppa_assessments").insert(persistPayload).select("id").single();
    if (error) {
      await failFunctionRun(supabase, fnRun, error);
      return json({ error: "persist_failed", message: error.message }, 500);
    }
    assessmentId = data?.id ?? null;
  }

  console.log(JSON.stringify({ evt: "admt_v2_complete", fn: "run-admt-checker-v2", build_stamp: BUILD_STAMP, assessment_id: assessmentId, elapsed_ms: Date.now() - t0 }));
  await finishFunctionRun(supabase, fnRun, { status: "success", sourceTable: "cppa_assessments", sourceRowId: assessmentId, metadata: { assessment_id: assessmentId, build_stamp: BUILD_STAMP, elapsed_ms: Date.now() - t0 } });

  return json({ assessment_id: assessmentId, status: "complete", report_data: report });
});
