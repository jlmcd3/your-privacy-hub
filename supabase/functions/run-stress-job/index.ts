// run-stress-job — autonomous orchestrator for the static stress test.
// Claims one pending job in a batch, runs the corresponding tool by calling
// the same production edge function the subscriber flow uses, renders a PDF
// via save-sample-report, marks the job complete, then self-invokes to
// process the next pending job in the same batch. The HTTP response returns
// 202 immediately; all work happens in EdgeRuntime.waitUntil().

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { verifyCaller } from "../_shared/verify-caller.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-admin-token",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ADMIN_TOKEN = Deno.env.get("ADMIN_SECRET_TOKEN") ?? "";

// deno-lint-ignore no-explicit-any
type Admin = any;

const TOOL_SLUG_MAP: Record<string, string> = {
  "lia": "li_assessment",
  "dpia": "dpia",
  "governance": "governance",
  "biometric": "biometric",
  "dpa": "dpa",
  "ir-playbook": "ir_playbook",
  "ropa": "ropa",
  "us-notice": "us_notice",
  "eu-notice": "eu_notice",
  "cppa-risk": "cppa_risk",
  "cppa-cyber": "cppa_cyber",
  "cppa-admt": "cppa_admt",
  "registration": "registration",
};

const TOOL_LABEL_MAP: Record<string, string> = {
  "lia": "LIA", "dpia": "DPIA", "governance": "Governance", "biometric": "Biometric",
  "dpa": "DPA", "ir-playbook": "IR Playbook", "ropa": "RoPA",
  "us-notice": "US Notice", "eu-notice": "EU Notice",
  "cppa-risk": "CPPA Risk", "cppa-cyber": "CPPA Cyber", "cppa-admt": "CPPA ADMT Assessment", "registration": "Registration",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// ─── Polling helpers ──────────────────────────────────────────────────────────

async function pollStatus(
  admin: Admin,
  table: string,
  id: string,
  successStatus: string,
  maxPolls = 450,
  intervalMs = 3000,
): Promise<void> {
  for (let i = 0; i < maxPolls; i++) {
    await new Promise((r) => setTimeout(r, intervalMs));
    const { data } = await admin.from(table).select("status").eq("id", id).single();
    if (data?.status === successStatus) return;
    if (data?.status === "failed" || data?.status === "error") {
      throw new Error(`${table} status=${data.status}`);
    }
  }
  throw new Error(`timeout polling ${table}`);
}

async function pollCppa(admin: Admin, id: string, maxPolls = 450): Promise<void> {
  for (let i = 0; i < maxPolls; i++) {
    await new Promise((r) => setTimeout(r, 3000));
    const { data } = await admin.from("cppa_assessments").select("status").eq("id", id).single();
    if (data?.status === "complete") return;
    if (data?.status === "error" || data?.status === "failed") {
      throw new Error(`cppa_assessments status=${data.status}`);
    }
  }
  throw new Error("timeout polling cppa_assessments");
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function invokeFn(name: string, body: unknown): Promise<any> {
  const r = await fetch(`${SUPABASE_URL}/functions/v1/${name}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${SERVICE_KEY}`,
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(540_000),
  });
  let data: any = null;
  try { data = await r.json(); } catch { /* ignore */ }
  if (!r.ok) throw new Error(`${name} ${r.status}: ${JSON.stringify(data ?? {}).slice(0, 200)}`);
  return data;
}

async function getOrCreateClientId(admin: Admin, userId: string): Promise<string> {
  const { data } = await admin
    .from("clients").select("id")
    .eq("owner_id", userId).eq("is_active", true).limit(1);
  if (data?.[0]) return data[0].id;
  throw new Error("No personal workspace client for batch user");
}

async function callSaveSampleReport(payload: Record<string, unknown>): Promise<any> {
  const r = await fetch(`${SUPABASE_URL}/functions/v1/save-sample-report`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-admin-token": ADMIN_TOKEN,
      "Authorization": `Bearer ${SERVICE_KEY}`,
    },
    body: JSON.stringify({ action: "generate_pdf", ...payload }),
    signal: AbortSignal.timeout(360_000),
  });
  if (!r.ok) throw new Error(`save-sample-report ${r.status}: ${(await r.text()).slice(0, 200)}`);
  return await r.json();
}

// ─── Tool runners ─────────────────────────────────────────────────────────────

interface RunResult { sourceTable: string; sourceRowId: string; }

// Normalize free-text RoPA activity categories from fixture generation
// to the 9 valid enum values in ropa_processing_activities_category_check.
// Claude generates descriptive names; this maps them to the nearest enum.
const VALID_ROPA_CATEGORIES = new Set([
  "hr_employment", "marketing", "customer_service", "patient_records",
  "technology", "finance_legal", "third_party", "operations", "other",
]);

function normalizeRopaCategory(raw: string | null | undefined): string {
  if (!raw) return "other";
  const lower = raw.toLowerCase();
  if (VALID_ROPA_CATEGORIES.has(lower)) return lower;
  if (lower.includes("hr") || lower.includes("human resource") || lower.includes("employ") || lower.includes("payroll") || lower.includes("recruit")) return "hr_employment";
  if (lower.includes("market") || lower.includes("advertis") || lower.includes("campaign") || lower.includes("email blast") || lower.includes("analytic")) return "marketing";
  if (lower.includes("customer") || lower.includes("client") || lower.includes("support") || lower.includes("crm") || lower.includes("service")) return "customer_service";
  if (lower.includes("patient") || lower.includes("health") || lower.includes("medical") || lower.includes("clinical") || lower.includes("care")) return "patient_records";
  if (lower.includes("tech") || lower.includes("it ") || lower.includes("system") || lower.includes("software") || lower.includes("cloud") || lower.includes("security") || lower.includes("infra")) return "technology";
  if (lower.includes("financ") || lower.includes("legal") || lower.includes("compliance") || lower.includes("audit") || lower.includes("tax") || lower.includes("invoic") || lower.includes("account")) return "finance_legal";
  if (lower.includes("third") || lower.includes("vendor") || lower.includes("partner") || lower.includes("supplier") || lower.includes("processor")) return "third_party";
  if (lower.includes("operat") || lower.includes("logistic") || lower.includes("supply") || lower.includes("facilit") || lower.includes("procur")) return "operations";
  return "other";
}

async function runTool(admin: Admin, job: any, userId: string): Promise<RunResult> {

  const intake: Record<string, any> = { ...(job.fixture_data ?? {}) };

  // Some tools' shims read intake.entity_name / company_name (e.g. cppa-risk's
  // legacy-flat → five-stage shim). Backfill them ONLY into inline-invoke bodies and
  // intake_data jsonb — NEVER into raw column-spread inserts, whose tables have fixed columns.
  // RULE: never spread synthesized/non-fixture fields into a raw `.insert()`;
  // only into inline edge-function bodies or `intake_data` jsonb.
  const withNames = (obj: Record<string, any>): Record<string, any> => {
    const o = { ...obj };
    if (job.company_name) {
      if (o.entity_name === undefined)  o.entity_name  = job.company_name;
      if (o.company_name === undefined) o.company_name = job.company_name;
    }
    return o;
  };

  switch (job.tool_slug) {
    case "lia": {
      // Raw column-spread insert — li_assessments has fixed columns (organization_name, not entity_name).
      // Use the original fixture only; do NOT inject synthesized names here.
      const { data: rec, error } = await admin.from("li_assessments")
        .insert({ ...(job.fixture_data ?? {}), user_id: userId }).select("id").single();
      if (error || !rec) throw new Error(`lia insert: ${error?.message}`);
      await invokeFn("run-li-assessment", { assessment_id: rec.id })
        .catch((e) => console.warn("[run-stress-job] run-li-assessment trigger failed (will poll):", e));
      await pollStatus(admin, "li_assessments", rec.id, "complete");
      return { sourceTable: "li_assessments", sourceRowId: rec.id };
    }
    case "dpia": {
      const { data: rec, error } = await admin.from("dpia_frameworks").insert({
        user_id: userId, status: "pending", intake_data: withNames(intake), is_subscriber_credit: true,
      }).select("id").single();
      if (error || !rec) throw new Error(`dpia insert: ${error?.message}`);
      await invokeFn("run-dpia-framework", { dpia_id: rec.id })
        .catch((e) => console.warn("[run-stress-job] run-dpia-framework trigger failed (will poll):", e));
      await pollStatus(admin, "dpia_frameworks", rec.id, "complete");
      return { sourceTable: "dpia_frameworks", sourceRowId: rec.id };
    }
    case "governance": {
      const { data: rec, error } = await admin.from("governance_assessments")
        .insert({ user_id: userId, status: "pending", intake_data: withNames(intake) })
        .select("id").single();
      if (error || !rec) throw new Error(`governance insert: ${error?.message}`);
      await invokeFn("run-governance-assessment", { assessment_id: rec.id, stress_run: true })
        .catch((e) => console.warn("[run-stress-job] run-governance-assessment trigger failed (will poll):", e));
      await pollStatus(admin, "governance_assessments", rec.id, "complete");
      return { sourceTable: "governance_assessments", sourceRowId: rec.id };
    }
    case "biometric": {
      const data = await invokeFn("check-biometric-compliance", withNames({ ...intake, user_id: userId, stress_run: true }));
      if (!data?.id) throw new Error("biometric: no id");
      return { sourceTable: "biometric_assessments", sourceRowId: data.id };
    }
    case "dpa": {
      const data = await invokeFn("generate-dpa", withNames({ ...intake, user_id: userId }));
      if (!data?.id) throw new Error("dpa: no id");
      await pollStatus(admin, "dpa_documents", data.id, "complete");
      return { sourceTable: "dpa_documents", sourceRowId: data.id };
    }
    case "ir-playbook": {
      const data = await invokeFn("generate-ir-playbook", withNames({
        ...intake, discoveryDateTime: new Date().toISOString(), user_id: userId,
      }));
      if (!data?.id) throw new Error("ir-playbook: no id");
      await pollStatus(admin, "ir_playbooks", data.id, "complete");
      return { sourceTable: "ir_playbooks", sourceRowId: data.id };
    }

    case "ropa": {
      const persona = intake;
      const clientId = await getOrCreateClientId(admin, userId);
      await admin.from("ropa_client_profiles").upsert({
        client_id: clientId,
        legal_entity_type: persona.legal_entity_type,
        employee_band: persona.employee_band,
        is_controller: true, is_processor: false,
        dpo_name: persona.dpo_name, dpo_email: persona.dpo_email,
      }, { onConflict: "client_id" });

      // Write sector to clients table — generate-ropa-document reads sector from clients.sector
      if (persona.sector) {
        await admin.from("clients").update({ sector: persona.sector }).eq("id", clientId);
      }
      if (Array.isArray(persona.jurisdictions) && persona.jurisdictions.length) {
        await admin.from("ropa_jurisdiction_selections").upsert(
          persona.jurisdictions.map((j: any) => ({
            client_id: clientId,
            jurisdiction_code: j.code, jurisdiction_name: j.name, jurisdiction_region: j.region,
          })),
          { onConflict: "client_id,jurisdiction_code" },
        );
      }
      const acts = Array.isArray(persona.activities) ? persona.activities : [];
      const { data: session, error: sErr } = await admin.from("ropa_sessions").insert({
        client_id: clientId, status: "review", version_number: 1,
        total_activities: acts.length, completed_activities: acts.length,
        payment_confirmed: true, paid_at: new Date().toISOString(),
        org_name: persona.org_name,
      }).select("id").single();
      if (sErr || !session) throw new Error(`ropa session: ${sErr?.message}`);
      const { data: actRows, error: aErr } = await admin.from("ropa_processing_activities").insert(
        acts.map((a: any, i: number) => ({
          session_id: session.id, client_id: clientId,
          display_name: a.activity_name, category: normalizeRopaCategory(a.category),
          status: "complete", completion_pct: 100, display_order: i,
        })),
      ).select("id, display_order");
      if (aErr || !actRows) throw new Error(`ropa activities: ${aErr?.message}`);
      const ansRows: any[] = [];
      for (const a of actRows) {
        const src = acts[a.display_order];
        const map: Record<string, unknown> = {
          purpose: src.purpose, lawful_basis: src.lawful_basis,
          special_category_basis: src.special_category_basis,
          data_subjects: src.data_subjects, data_categories: src.data_categories,
          recipients: src.recipients, transfer_destination: src.transfer_destination,
          transfer_mechanism: src.transfer_mechanism,
          retention_period: src.retention_period, security_measures: src.security_measures,
        };
        for (const [k, v] of Object.entries(map)) {
          ansRows.push({ activity_id: a.id, session_id: session.id, question_key: k, answer_value: v });
        }
      }
      if (ansRows.length) {
        try {
          await admin.from("ropa_answers").insert(ansRows);
        } catch (e) {
          console.warn("[run-stress-job] ropa_answers insert failed:", e);
        }
      }
      await invokeFn("generate-ropa-document", {
        session_id: session.id, format: "pdf",
        document_date: new Date().toISOString().slice(0, 10),
        author_name: `${persona.org_name} Compliance Team`,
      }).catch((e) => console.warn("[run-stress-job] generate-ropa-document trigger failed (will poll):", e));
      await pollStatus(admin, "ropa_sessions", session.id, "generated");
      const { data: ver } = await admin.from("ropa_document_versions")
        .select("id").eq("session_id", session.id).eq("document_format", "pdf")
        .eq("is_current", true).maybeSingle();
      if (!ver?.id) throw new Error("ropa: no document version after polling");
      return { sourceTable: "ropa_document_versions", sourceRowId: ver.id };
    }
    case "us-notice": {
      const clientId = await getOrCreateClientId(admin, userId);
      const { data: session, error: sErr } = await admin.from("us_notice_sessions").insert({
        client_id: clientId, status: "review", scope: "all_states", mode: "standalone",
        payment_confirmed: true, paid_at: new Date().toISOString(),
      }).select("id").single();
      if (sErr || !session) throw new Error(`us-notice session: ${sErr?.message}`);
      try {
        // Slot derived from company_id char-sum so coverage varies across the batch.
        const slot = ((job.company_id ?? "").toString()
          .split("").reduce((a: number, c: string) => a + c.charCodeAt(0), 0)) % 2 === 0 ? 1 : 2;
        const core = [
          { session_id: session.id, state_code: "CA", state_name: "California", framework_type: "ccpa" },
          { session_id: session.id, state_code: "VA", state_name: "Virginia", framework_type: "virginia_model" },
          { session_id: session.id, state_code: "TX", state_name: "Texas", framework_type: "virginia_model" },
        ];
        const slot1Extra = [
          { session_id: session.id, state_code: "CO", state_name: "Colorado", framework_type: "virginia_model" },
          { session_id: session.id, state_code: "CT", state_name: "Connecticut", framework_type: "virginia_model" },
        ];
        const slot2Extra = [
          { session_id: session.id, state_code: "OR", state_name: "Oregon", framework_type: "virginia_model" },
          { session_id: session.id, state_code: "MT", state_name: "Montana", framework_type: "virginia_model" },
        ];
        await admin.from("us_notice_state_selections").insert(
          slot === 1 ? [...core, ...slot1Extra] : [...core, ...slot2Extra],
        );
      } catch (e) {
        console.warn("[run-stress-job] us_notice_state_selections insert failed:", e);
      }
      try {
        await admin.from("us_notice_answers").insert(
          Object.entries(withNames(intake)).map(([k, v]) => ({
            session_id: session.id, question_key: k, answer_value: v as any,
          })),
        );
      } catch (e) {
        console.warn("[run-stress-job] us_notice_answers insert failed:", e);
      }

      const gen = await invokeFn("generate-us-notice", { session_id: session.id });
      if (!gen?.documents?.length) throw new Error("us-notice: no documents");
      return { sourceTable: "us_notice_sessions", sourceRowId: session.id };
    }
    case "eu-notice": {
      const clientId = await getOrCreateClientId(admin, userId);
      const { data: session, error: sErr } = await admin.from("eu_notice_sessions").insert({
        client_id: clientId, status: "review", scope: "suite", mode: "standalone",
        payment_confirmed: true, paid_at: new Date().toISOString(),
      }).select("id").single();
      if (sErr || !session) throw new Error(`eu-notice session: ${sErr?.message}`);
      // Derive whether UK GDPR applies from the controller's country code.
      // Only UK-established controllers are subject to UK GDPR.
      const noticeCountry = (intake as any).establishment_jurisdiction ?? "";
      const isUKEstablished = /united kingdom|england|scotland|wales/i.test(String(noticeCountry));
      const frameworks = [
        { session_id: session.id, framework_code: "EU_GDPR", framework_name: "EU GDPR", region: "EU" },
        ...(isUKEstablished
          ? [{ session_id: session.id, framework_code: "UK_GDPR", framework_name: "UK GDPR", region: "UK" }]
          : []),
      ];
      try {
        await admin.from("eu_notice_framework_selections").insert(frameworks);
      } catch (e) {
        console.warn("[run-stress-job] eu_notice_framework_selections insert failed:", e);
      }
      try {
        await admin.from("eu_notice_answers").insert(
          Object.entries(intake).map(([k, v]) => ({
            session_id: session.id, question_key: k, answer_value: v as any,
          })),
        );
      } catch (e) {
        console.warn("[run-stress-job] eu_notice_answers insert failed:", e);
      }
      await invokeFn("generate-eu-notice", { session_id: session.id })
        .catch((e) => console.warn("[run-stress-job] generate-eu-notice trigger failed (will poll):", e));
      await pollStatus(admin, "eu_notice_sessions", session.id, "generated");
      return { sourceTable: "eu_notice_sessions", sourceRowId: session.id };
    }
    case "cppa-risk": {
      const { data: rec, error } = await admin.from("cppa_assessments").insert({
        user_id: userId, module: "risk_assessment", status: "pending", intake_data: withNames(intake),
      }).select("id").single();
      if (error || !rec) throw new Error(`cppa-risk insert: ${error?.message}`);
      await invokeFn("run-cppa-risk-assessment-v2", { assessment_id: rec.id })
        .catch((e) => console.warn("[run-stress-job] run-cppa-risk-assessment trigger failed (will poll):", e));
      await pollCppa(admin, rec.id);
      return { sourceTable: "cppa_assessments", sourceRowId: rec.id };
    }
    case "cppa-cyber": {
      const { data: rec, error } = await admin.from("cppa_assessments").insert({
        user_id: userId, module: "cybersecurity", status: "pending", intake_data: withNames(intake),
      }).select("id").single();
      if (error || !rec) throw new Error(`cppa-cyber insert: ${error?.message}`);
      await invokeFn("run-cppa-cybersecurity", { assessment_id: rec.id })
        .catch((e) => console.warn("[run-stress-job] run-cppa-cybersecurity trigger failed (will poll):", e));
      await pollCppa(admin, rec.id);
      return { sourceTable: "cppa_assessments", sourceRowId: rec.id };
    }
    case "cppa-admt": {
      const { data: rec, error } = await admin.from("cppa_assessments").insert({
        user_id: userId, module: "admt", status: "pending", intake_data: withNames(intake),
      }).select("id").single();

      if (error || !rec) throw new Error(`cppa-admt insert: ${error?.message}`);
      await invokeFn("run-admt-checker", { assessment_id: rec.id })
        .catch((e) => console.warn("[run-stress-job] run-admt-checker trigger failed (will poll):", e));
      await pollCppa(admin, rec.id);
      return { sourceTable: "cppa_assessments", sourceRowId: rec.id };
    }
    case "registration": {
      const assess = await invokeFn("run-registration-assessment", {
        intake_data: intake, user_id: userId,
      });
      const assessmentId = assess?.assessment_id;
      if (!assessmentId) throw new Error("registration: no assessment_id");
      const codes: string[] = (assess.recommended_jurisdictions || []).slice(0, 8);
      if (!codes.length) throw new Error("registration: no jurisdictions");
      const { data: order, error: oErr } = await admin.from("registration_orders").insert({
        user_id: userId, assessment_id: assessmentId, tier: "diy",
        jurisdictions: codes, organization_snapshot: intake,
        amount_cents: 0, currency: "usd",
        payment_status: "paid", fulfillment_status: "generating",
        delivery_email: intake.email, renewal_reminders_enabled: false,
      }).select("id").single();
      if (oErr || !order) throw new Error(`registration order: ${oErr?.message}`);
      await invokeFn("generate-registration-docs", { order_id: order.id })
        .catch((e) => console.warn("[run-stress-job] generate-registration-docs trigger failed:", e));
      return { sourceTable: "registration_assessments", sourceRowId: assessmentId };
    }
    default:
      throw new Error(`unknown tool_slug: ${job.tool_slug}`);
  }
}

// ─── Orchestrator ─────────────────────────────────────────────────────────────

async function finaliseBatch(admin: Admin, batchId: string) {
  // A batch is final only when NO job is pending or running. Callers only
  // check "no pending" — a claimed job is 'running' and still in flight.
  const { count: active } = await admin.from("static_stress_jobs")
    .select("id", { count: "exact", head: true })
    .eq("batch_id", batchId)
    .in("status", ["pending", "running"]);
  if ((active ?? 0) > 0) return;

  // Check first — multiple workers may reach here simultaneously when the
  // last few jobs complete. The update is idempotent but we log it cleanly.
  const { data: batch } = await admin.from("static_stress_batches")
    .select("status").eq("id", batchId).single();
  if (batch?.status === "complete") return; // already finalised by another worker
  await admin.from("static_stress_batches").update({
    status: "complete",
    completed_at: new Date().toISOString(),
  }).eq("id", batchId).neq("status", "complete"); // safe: neq prevents double-write
}

async function processNextJob(batchId: string, specificJobId: string | null): Promise<void> {
  const admin = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });
  let job: any = null;

  try {
    // Check for cancellation — preserve any completed jobs and stop the chain
    const { data: batchStatus } = await admin.from("static_stress_batches")
      .select("status").eq("id", batchId).single();
    if (batchStatus?.status === "cancelled") {
      await admin.from("static_stress_jobs")
        .update({ status: "cancelled", completed_at: new Date().toISOString() })
        .eq("batch_id", batchId).eq("status", "pending");
      await admin.from("static_stress_batches").update({
        completed_at: new Date().toISOString(),
      }).eq("id", batchId);
      return;
    }

    // Rescue jobs stuck in 'running' for more than 10 minutes (prior killed execution)
    try {
      const stuckCutoff = new Date(Date.now() - 10 * 60 * 1000).toISOString();
      await admin.from("static_stress_jobs")
        .update({ status: "pending", started_at: null })
        .eq("batch_id", batchId)
        .eq("status", "running")
        .lt("started_at", stuckCutoff);
    } catch (e) {
      console.warn("[run-stress-job] stuck-job rescue failed:", e);
    }


    // Claim a job
    if (specificJobId) {
      const { data } = await admin.from("static_stress_jobs")
        .update({ status: "running", started_at: new Date().toISOString() })
        .eq("id", specificJobId).eq("status", "pending")
        .select().single();
      job = data;
    } else {
      const { data: next } = await admin.from("static_stress_jobs")
        .select("*").eq("batch_id", batchId).eq("status", "pending")
        .order("created_at", { ascending: true }).limit(1).maybeSingle();
      if (!next) {
        // No pending jobs right now — but check setup is actually complete
        // before finalising. During the interleaved phase this may just be
        // a lull between company fixture insertions.
        const { data: batchCheck } = await admin.from("static_stress_batches")
          .select("setup_done, setup_total")
          .eq("id", batchId).single();
        const setupComplete =
          (batchCheck?.setup_done ?? 0) >= (batchCheck?.setup_total ?? 1) &&
          (batchCheck?.setup_total ?? 0) > 0;
        if (setupComplete) {
          await finaliseBatch(admin, batchId);
        }
        // else: setup still in progress, exit gracefully — selfInvokeNext
        // in finally will recheck and keep the chain alive.
        return;
      }
      const { data: claimed } = await admin.from("static_stress_jobs")
        .update({ status: "running", started_at: new Date().toISOString() })
        .eq("id", next.id).eq("status", "pending")
        .select().single();
      job = claimed;
    }
    if (!job) {
      // race-lost — chain in finally
      return;
    }

    // Resolve user_id from batch
    const { data: batchRow } = await admin.from("static_stress_batches")
      .select("run_by").eq("id", batchId).single();
    const userId = batchRow?.run_by;
    if (!userId) {
      await admin.from("static_stress_jobs").update({
        status: "failed",
        error_message: "batch has no run_by user_id",
        completed_at: new Date().toISOString(),
      }).eq("id", job.id);
      try {
        await admin.rpc("increment_batch_failed", { batch_id: batchId });
      } catch (e: unknown) {
        console.warn("[run-stress-job] increment_batch_failed failed:", e);
      }
      return;
    }

    try {
      // 9-minute hard timeout — must be < 10-minute stuck-rescue window
      const TOOL_TIMEOUT_MS = 9 * 60 * 1000;
      const { sourceTable, sourceRowId } = await Promise.race([
        runTool(admin, job, userId),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error(`Tool timeout after 9 minutes: ${job.tool_slug}`)), TOOL_TIMEOUT_MS)
        ),
      ]) as RunResult;

      let pdfPath: string | null = null;
      try {
        const pdfResult = await callSaveSampleReport({
          tool_slug: TOOL_SLUG_MAP[job.tool_slug],
          variant: `static-${job.company_id}`,
          title: `[${job.industry}] ${job.company_name} — ${TOOL_LABEL_MAP[job.tool_slug]}`,
          scenario_summary: `Static accuracy test: ${job.company_name} (${job.geo.toUpperCase()}, ${job.industry})`,
          fixture: job.fixture_data,
          source_table: sourceTable,
          source_row_id: sourceRowId,
        });
        pdfPath = pdfResult?.row?.pdf_path ?? null;
      } catch (pdfErr) {
        console.warn(`[run-stress-job] PDF failed for ${job.id}:`, pdfErr);
      }

      await admin.from("static_stress_jobs").update({
        status: "complete",
        source_table: sourceTable,
        source_row_id: sourceRowId,
        pdf_path: pdfPath,
        completed_at: new Date().toISOString(),
      }).eq("id", job.id);
      try {
        await admin.rpc("increment_batch_completed", { batch_id: batchId });
      } catch (e: unknown) {
        console.warn("[run-stress-job] increment_batch_completed failed:", e);
      }
    } catch (err) {
      const errMsg = (err as Error).message?.slice(0, 480) ?? "unknown error";
      const currentRetries = job.retry_count ?? 0;

      if (currentRetries < 1) {
        console.warn(`[run-stress-job] job ${job.id} (${job.tool_slug}) failed (attempt ${currentRetries + 1}), scheduling retry:`, errMsg);
        try {
          await admin.from("static_stress_jobs").update({
            status: "pending",
            retry_count: currentRetries + 1,
            error_message: `Attempt ${currentRetries + 1} failed: ${errMsg} — retrying`,
            started_at: null,
          }).eq("id", job.id);
        } catch (e: unknown) {
          console.warn("[run-stress-job] retry reset failed:", e);
        }
      } else {
        console.error(`[run-stress-job] job ${job.id} (${job.tool_slug}) failed permanently after ${currentRetries + 1} attempts:`, errMsg);
        try {
          await admin.from("static_stress_jobs").update({
            status: "failed",
            error_message: `Failed after ${currentRetries + 1} attempts. Last error: ${errMsg}`,
            completed_at: new Date().toISOString(),
          }).eq("id", job.id);
        } catch (e: unknown) {
          console.warn("[run-stress-job] failed status update failed:", e);
        }
        try {
          await admin.rpc("increment_batch_failed", { batch_id: batchId });
        } catch (e: unknown) {
          console.warn("[run-stress-job] increment_batch_failed failed:", e);
        }
      }
    }
  } catch (fatalErr) {
    console.error("[run-stress-job] fatal error in processNextJob:", fatalErr);
    if (job?.id) {
      try {
        await admin.from("static_stress_jobs").update({
          status: "failed",
          error_message: `Fatal: ${(fatalErr as Error).message?.slice(0, 480) ?? "unknown"}`,
          completed_at: new Date().toISOString(),
        }).eq("id", job.id);
        try { await admin.rpc("increment_batch_failed", { batch_id: batchId }); } catch { /* best-effort */ }
      } catch { /* best-effort */ }
    }
  } finally {
    selfInvokeNext(batchId);
  }
}

function selfInvokeNext(batchId: string): void {
  const attempt = (remaining: number) => {
    (async () => {
      try {
        const r = await fetch(`${SUPABASE_URL}/functions/v1/run-stress-job`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${SERVICE_KEY}`,
          },
          body: JSON.stringify({ batch_id: batchId, job_id: null }),
          signal: AbortSignal.timeout(15_000),
        });
        if (!r.ok && remaining > 1) {
          console.warn(`[run-stress-job] self-invoke returned ${r.status}, retrying (${remaining - 1} left)`);
          setTimeout(() => attempt(remaining - 1), 2000);
        }
      } catch (e) {
        console.warn(`[run-stress-job] self-invoke failed: ${(e as Error).message}`);
        if (remaining > 1) {
          setTimeout(() => attempt(remaining - 1), 2000);
        } else {
          console.error("[run-stress-job] self-invoke exhausted all retries — batch chain broken for batch", batchId);
          try {
            const admin = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });
            await admin.from("static_stress_batches").update({
              error_log: `Chain interrupted at ${new Date().toISOString()} — self-invoke failed after 3 attempts. Click "Resume" to restart.`,
            }).eq("id", batchId).eq("status", "running");
          } catch { /* best-effort */ }
        }
      }
    })();
  };

  const admin = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });
  admin.from("static_stress_batches")
    .select("status").eq("id", batchId).single()
    .then(({ data: b }) => {
      if (b?.status === "cancelled") {
        // Mark remaining pending jobs cancelled; do not chain.
        admin.from("static_stress_jobs")
          .update({ status: "cancelled", completed_at: new Date().toISOString() })
          .eq("batch_id", batchId).eq("status", "pending")
          .then(() => {
            admin.from("static_stress_batches").update({
              completed_at: new Date().toISOString(),
            }).eq("id", batchId).then(() => {});
          });
        return;
      }
      // Check both pending jobs AND setup completion before finalising.
      // During the interleaved phase, 0 pending jobs might just mean setup
      // hasn't inserted the next company's jobs yet — not a true end.
      Promise.all([
        admin.from("static_stress_jobs")
          .select("id", { count: "exact", head: true })
          .eq("batch_id", batchId)
          .eq("status", "pending"),
        admin.from("static_stress_batches")
          .select("setup_done, setup_total, status")
          .eq("id", batchId)
          .single(),
      ]).then(([{ count: pendingCount }, { data: batchRow }]) => {
        const pending = pendingCount ?? 0;
        const setupDone = batchRow?.setup_done ?? 0;
        const setupTotal = batchRow?.setup_total ?? 0;
        const setupComplete = setupDone >= setupTotal && setupTotal > 0;

        if (pending > 0) {
          attempt(3);
        } else if (!setupComplete) {
          // Setup still in progress — wait 10s and check again rather than
          // dying. This handles the lull between company fixture insertions.
          setTimeout(() => {
            admin.from("static_stress_jobs")
              .select("id", { count: "exact", head: true })
              .eq("batch_id", batchId)
              .eq("status", "pending")
              .then(({ count: recheck }) => {
                if ((recheck ?? 0) > 0) {
                  attempt(3);
                } else {
                  admin.from("static_stress_batches")
                    .select("setup_done, setup_total")
                    .eq("id", batchId)
                    .single()
                    .then(({ data: recheckBatch }) => {
                      const recheckSetupComplete =
                        (recheckBatch?.setup_done ?? 0) >= (recheckBatch?.setup_total ?? 1) &&
                        (recheckBatch?.setup_total ?? 0) > 0;
                      if (recheckSetupComplete) {
                        finaliseBatch(admin, batchId).catch(console.error);
                      }
                      // else: setup still going, this worker exits gracefully.
                    });
                }
              });
          }, 10_000);
        } else {
          finaliseBatch(admin, batchId).catch(console.error);
        }
      });
    });
}


Deno.serve(async (req) => {
  console.log("[run-stress-job] build 2026-07-02-guard-v2");
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  // Accept admin-token header from pg_cron watchdog as internal auth.
  // The token is stored in DB Vault for cron; it may not also be present in
  // this Edge Function's runtime env, so validate against the backend helper.
  const adminTokenHeader = req.headers.get("x-admin-token") ?? "";
  let isWatchdog = Boolean(ADMIN_TOKEN && adminTokenHeader === ADMIN_TOKEN);

  if (!isWatchdog && adminTokenHeader) {
    try {
      const admin = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });
      const { data, error } = await admin.rpc("verify_admin_secret_token", { _token: adminTokenHeader });
      isWatchdog = !error && data === true;
    } catch (e) {
      console.warn("[run-stress-job] watchdog token verification failed:", e);
    }
  }

  if (!isWatchdog) {
    const caller = await verifyCaller(req);
    if (!caller.internal) {
      if (!caller.userId) return json({ error: "forbidden" }, 403);
      const admin = createClient(SUPABASE_URL, SERVICE_KEY);
      const { data: isAdmin } = await admin.rpc("has_role", { _user_id: caller.userId, _role: "admin" });
      if (!isAdmin) return json({ error: "forbidden" }, 403);
    }
  }

  let body: any;
  try { body = await req.json(); } catch { return json({ error: "invalid json" }, 400); }
  const { batch_id, job_id } = body ?? {};
  if (!batch_id) return json({ error: "batch_id required" }, 400);

  // @ts-ignore EdgeRuntime is available in Supabase Edge runtime
  EdgeRuntime.waitUntil(processNextJob(batch_id, job_id ?? null));
  return json({ accepted: true }, 202);
});
