// Stage 1 Acceptance Harness — run-meter + locking + regen + extension.
// Admin-only. Runs a full LIA meter lifecycle end-to-end and reports 12 assertions.
//
// POST { action: "start" } -> { job_id }  (background runs to completion)
// Client polls public.long_running_jobs (admin RLS) for the result.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

const ZERO_UUID = "00000000-0000-0000-0000-000000000000";
const TOOL_TYPE = "li_assessment";
const SETUP_DESC =
  "Score new signups against velocity and device signals; holds go to manual review.";

type Assertion = { name: string; pass: boolean; detail: string };

function j(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// Settle-poll for meter/version reads. The generator writes meter+versions
// immediately before status:complete, but PostgREST cache/eventual-consistency
// can lag by a beat — poll every 2s up to 30s until the expected condition
// holds (or return the final observation). Returns { value, waitedMs }.
async function settlePoll<T>(
  read: () => Promise<T>,
  ok: (v: T) => boolean,
  maxMs = 30_000,
  stepMs = 2_000,
): Promise<{ value: T; waitedMs: number }> {
  const start = Date.now();
  let value = await read();
  while (!ok(value) && Date.now() - start < maxMs) {
    await new Promise((r) => setTimeout(r, stepMs));
    value = await read();
  }
  return { value, waitedMs: Date.now() - start };
}

async function pollLIA(
  svc: ReturnType<typeof createClient>,
  id: string,
  maxSec = 180,
): Promise<string> {
  const start = Date.now();
  while (Date.now() - start < maxSec * 1000) {
    await new Promise((r) => setTimeout(r, 3000));
    const { data } = await svc
      .from("li_assessments")
      .select("status")
      .eq("id", id)
      .maybeSingle();
    const status = (data as any)?.status ?? "unknown";
    if (status === "complete" || status === "failed") return status;
  }
  return "timeout";
}

// Hardened generation-await for B/D steps. Terminates on complete OR failed,
// hard-caps at 4 minutes, and returns { status, detail } so the harness can
// record a FAIL with the row's error detail instead of throwing.
async function awaitGeneration(
  svc: ReturnType<typeof createClient>,
  id: string,
  maxSec = 240,
): Promise<{ status: "complete" | "failed" | "timeout"; detail: string }> {
  const start = Date.now();
  while (Date.now() - start < maxSec * 1000) {
    await new Promise((r) => setTimeout(r, 3000));
    const { data } = await svc
      .from("li_assessments")
      .select("status, updated_at")
      .eq("id", id)
      .maybeSingle();
    const row = (data as any) ?? {};
    const status = row.status ?? "unknown";
    if (status === "complete") {
      return { status: "complete", detail: `complete after ${Date.now() - start}ms` };
    }
    if (status === "failed") {
      return {
        status: "failed",
        detail: `failed after ${Date.now() - start}ms; last updated_at=${row.updated_at ?? "n/a"}`,
      };
    }

  }
  return { status: "timeout", detail: `generation timed out after ${maxSec}s (cap=4min)` };
}


async function callRegen(
  authHeader: string,
  body: Record<string, unknown>,
): Promise<{ status: number; body: any }> {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/regenerate-assessment`, {
    method: "POST",
    headers: {
      Authorization: authHeader,
      apikey: ANON_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  let parsed: any = null;
  try {
    parsed = await res.json();
  } catch {
    parsed = null;
  }
  return { status: res.status, body: parsed };
}

async function runAcceptance(
  svc: ReturnType<typeof createClient>,
  authHeader: string,
  userId: string,
  jobId: string,
): Promise<void> {
  const assertions: Assertion[] = [];
  const push = async (name: string, pass: boolean, detail: string) => {
    assertions.push({ name, pass, detail });
    await svc
      .from("long_running_jobs")
      .update({
        progress: `${assertions.length}/12 — ${name}`,
        result: { assertions },
        updated_at: new Date().toISOString(),
      })
      .eq("id", jobId);
  };

  let assessmentId: string | null = null;

  try {
    // ── SETUP ─────────────────────────────────────────────────────────────────
    const intake = {
      organization_name: "Meter Acceptance Test Co",
      subject_anchor: "Fraud screening of new account signups",
      relationship_type: "customers",
      jurisdictions: ["UK"],
      data_categories: ["contact"],
      processing_description: SETUP_DESC,
    };
    const { data: inserted, error: insErr } = await svc
      .from("li_assessments")
      .insert({
        user_id: userId,
        status: "pending",
        purchase_price_cents: 0,
        organization_name: intake.organization_name,
        subject_anchor: intake.subject_anchor,
        relationship_type: intake.relationship_type,
        jurisdictions: intake.jurisdictions,
        data_categories: intake.data_categories,
        processing_description: intake.processing_description,
      })
      .select("id")
      .single();
    if (insErr || !inserted) throw new Error(`setup insert failed: ${insErr?.message}`);
    assessmentId = (inserted as any).id as string;

    // ── (a) RUN 1 ─────────────────────────────────────────────────────────────
    const inv1 = await svc.functions.invoke("run-li-assessment", {
      body: { assessment_id: assessmentId },
    });
    if (inv1.error) throw new Error(`run 1 invoke failed: ${inv1.error.message}`);
    const s1 = await pollLIA(svc, assessmentId);
    if (s1 !== "complete") throw new Error(`run 1 status=${s1}`);

    const readMeter = () =>
      svc
        .from("tool_run_meter")
        .select("*")
        .eq("tool_type", TOOL_TYPE)
        .eq("assessment_id", assessmentId)
        .maybeSingle()
        .then((r: any) => r.data);
    const readVersions = () =>
      svc
        .from("tool_run_versions")
        .select("version")
        .eq("tool_type", TOOL_TYPE)
        .eq("assessment_id", assessmentId)
        .then((r: any) => ((r.data as any[]) ?? []).map((v) => v.version).sort());

    const { value: meter1, waitedMs: waitA1 } = await settlePoll(
      readMeter,
      (m: any) => !!m && m.runs_used === 1 && m.runs_allowed === 4,
    );
    await push(
      "A1 meter created with runs_used=1, runs_allowed=4",
      !!meter1 && meter1.runs_used === 1 && meter1.runs_allowed === 4,
      meter1
        ? `runs_used=${meter1.runs_used} runs_allowed=${meter1.runs_allowed} (waited ${waitA1}ms)`
        : `no meter row (waited ${waitA1}ms)`,
    );
    const lockedAnchor = meter1?.locked_fields?.subject_anchor;
    await push(
      "A2 locked_fields.subject_anchor matches setup",
      lockedAnchor === intake.subject_anchor,
      `locked_fields.subject_anchor=${JSON.stringify(lockedAnchor)}`,
    );
    const { value: versions1, waitedMs: waitA3 } = await settlePoll(
      readVersions,
      (vs) => vs.length === 1 && vs[0] === 1,
    );
    await push(
      "A3 tool_run_versions has exactly one row, version=1",
      versions1.length === 1 && versions1[0] === 1,
      `versions=${JSON.stringify(versions1)} (waited ${waitA3}ms)`,
    );

    // ── (b) OPEN-FIELD REGEN ──────────────────────────────────────────────────
    const bDesc = `${SETUP_DESC} Holds are reviewed within 24 hours.`;
    const bRes = await callRegen(authHeader, {
      tool_type: TOOL_TYPE,
      assessment_id: assessmentId,
      edited_fields: { processing_description: bDesc },
    });
    await push(
      "B1 regen (open field) returned HTTP ok",
      bRes.status === 200 && bRes.body?.ok === true,
      `HTTP ${bRes.status} body=${JSON.stringify(bRes.body)}`,
    );
    const g2 = await awaitGeneration(svc, assessmentId);
    if (g2.status !== "complete") {
      await push(`B-await run 2 generation completed`, false, g2.detail);
      return;
    }

    const { value: b2, waitedMs: waitB2 } = await settlePoll(
      async () => ({ meter: await readMeter(), versions: await readVersions() }),
      (x: any) => x.meter?.runs_used === 2 && x.versions.includes(2),
    );
    await push(
      "B2 meter runs_used=2 and version 2 exists",
      b2.meter?.runs_used === 2 && b2.versions.includes(2),
      `runs_used=${b2.meter?.runs_used} versions=${JSON.stringify(b2.versions)} (waited ${waitB2}ms)`,
    );

    // Read persisted intake — LIA stores it in top-level columns; also check
    // intake_data JSON if the column exists on this row (some generators use it).
    const { data: liRow } = await svc
      .from("li_assessments")
      .select("*")
      .eq("id", assessmentId)
      .maybeSingle();
    const liAny = liRow as any;
    const persistedDesc: string =
      liAny?.intake_data?.processing_description ??
      liAny?.processing_description ??
      "";
    await push(
      "B3 persisted processing_description contains '24 hours'",
      typeof persistedDesc === "string" && persistedDesc.includes("24 hours"),
      `processing_description="${(persistedDesc || "").slice(0, 120)}"`,
    );

    // ── (c) LOCKED-FIELD REGEN ────────────────────────────────────────────────
    const cRes = await callRegen(authHeader, {
      tool_type: TOOL_TYPE,
      assessment_id: assessmentId,
      edited_fields: { subject_anchor: "A different interest" },
    });
    await push(
      "C1 locked-field regen returns 409 locked_field_changed / field=subject_anchor",
      cRes.status === 409 &&
        cRes.body?.error === "locked_field_changed" &&
        cRes.body?.field === "subject_anchor",
      `HTTP ${cRes.status} body=${JSON.stringify(cRes.body)}`,
    );
    const { data: mC } = await svc
      .from("tool_run_meter")
      .select("runs_used")
      .eq("tool_type", TOOL_TYPE)
      .eq("assessment_id", assessmentId)
      .maybeSingle();
    await push(
      "C2 meter unchanged at runs_used=2 after locked-field 409",
      (mC as any)?.runs_used === 2,
      `runs_used=${(mC as any)?.runs_used}`,
    );

    // ── (d) EXHAUSTION ────────────────────────────────────────────────────────
    for (const [i, tag] of [[3, "run3"], [4, "run4"]] as const) {
      // Space back-to-back regens to avoid hammering the model API — 15s
      // between the two D-step generations. First iteration has no prior
      // D-step call to space from.
      if (i === 4) {
        await new Promise((r) => setTimeout(r, 15_000));
      }
      const r = await callRegen(authHeader, {
        tool_type: TOOL_TYPE,
        assessment_id: assessmentId,
        edited_fields: {
          processing_description: `${SETUP_DESC} Iteration ${i}.`,
        },
      });
      if (r.status !== 200 || r.body?.ok !== true) {
        await push(
          `D-await ${tag} regen HTTP ok`,
          false,
          `HTTP ${r.status} body=${JSON.stringify(r.body)}`,
        );
        return;
      }
      const g = await awaitGeneration(svc, assessmentId);
      if (g.status !== "complete") {
        await push(`D-await ${tag} generation completed`, false, g.detail);
        return;
      }
    }

    const r5 = await callRegen(authHeader, {
      tool_type: TOOL_TYPE,
      assessment_id: assessmentId,
      edited_fields: {
        processing_description: `${SETUP_DESC} Iteration 5.`,
      },
    });
    await push(
      "D1 5th regen returns 402 budget_exhausted / can_extend=true",
      r5.status === 402 &&
        r5.body?.error === "budget_exhausted" &&
        r5.body?.can_extend === true,
      `HTTP ${r5.status} body=${JSON.stringify(r5.body)}`,
    );
    const { value: mD, waitedMs: waitD2 } = await settlePoll(
      readMeter,
      (m: any) => m?.runs_used === 4 && m?.runs_allowed === 4,
    );
    await push(
      "D2 meter shows runs_used=4, runs_allowed=4",
      (mD as any)?.runs_used === 4 && (mD as any)?.runs_allowed === 4,
      `runs_used=${(mD as any)?.runs_used} runs_allowed=${(mD as any)?.runs_allowed} (waited ${waitD2}ms)`,
    );


    // ── (e) EXTENSION GRANT (simulated webhook) ───────────────────────────────
    await svc
      .from("tool_run_meter")
      .update({
        runs_allowed: 8,
        extension_count: 1,
        updated_at: new Date().toISOString(),
      })
      .eq("tool_type", TOOL_TYPE)
      .eq("assessment_id", assessmentId);
    const rE = await callRegen(authHeader, {
      tool_type: TOOL_TYPE,
      assessment_id: assessmentId,
      edited_fields: {
        processing_description: `${SETUP_DESC} Extension iteration.`,
      },
    });
    if (rE.status !== 200 || rE.body?.ok !== true) {
      await push(
        "E1 post-extension regen ok + meter 5/8/ext=1",
        false,
        `HTTP ${rE.status} body=${JSON.stringify(rE.body)}`,
      );
    } else {
      const s = await pollLIA(svc, assessmentId);
      if (s !== "complete") {
        await push(
          "E1 post-extension regen ok + meter 5/8/ext=1",
          false,
          `run status=${s}`,
        );
      } else {
        const { value: mE, waitedMs: waitE1 } = await settlePoll(
          readMeter,
          (m: any) =>
            m?.runs_used === 5 && m?.runs_allowed === 8 && m?.extension_count === 1,
        );
        const mEa = mE as any;
        await push(
          "E1 post-extension regen ok + meter 5/8/ext=1",
          mEa?.runs_used === 5 && mEa?.runs_allowed === 8 && mEa?.extension_count === 1,
          `runs_used=${mEa?.runs_used} runs_allowed=${mEa?.runs_allowed} extension_count=${mEa?.extension_count} (waited ${waitE1}ms)`,
        );

      }
    }

    // ── (f) FAILED RUN IS FREE ────────────────────────────────────────────────
    await svc.functions.invoke("run-li-assessment", {
      body: { assessment_id: ZERO_UUID },
    });
    // no polling needed — generator errors before any success path
    await new Promise((r) => setTimeout(r, 2000));
    const { data: mZ } = await svc
      .from("tool_run_meter")
      .select("id")
      .eq("tool_type", TOOL_TYPE)
      .eq("assessment_id", ZERO_UUID)
      .maybeSingle();
    await push(
      "F1 no tool_run_meter row created for nonexistent assessment_id",
      !mZ,
      `zero-uuid meter=${JSON.stringify(mZ)}`,
    );
    const { data: mF } = await svc
      .from("tool_run_meter")
      .select("runs_used")
      .eq("tool_type", TOOL_TYPE)
      .eq("assessment_id", assessmentId)
      .maybeSingle();
    await push(
      "F2 test-assessment meter unchanged at runs_used=5",
      (mF as any)?.runs_used === 5,
      `runs_used=${(mF as any)?.runs_used}`,
    );
  } catch (err) {
    assertions.push({
      name: "FATAL",
      pass: false,
      detail: (err as Error)?.message ?? String(err),
    });
  } finally {
    // ── TEARDOWN ─────────────────────────────────────────────────────────────
    if (assessmentId) {
      await svc
        .from("tool_run_versions")
        .delete()
        .eq("tool_type", TOOL_TYPE)
        .eq("assessment_id", assessmentId);
      await svc
        .from("tool_run_meter")
        .delete()
        .eq("tool_type", TOOL_TYPE)
        .eq("assessment_id", assessmentId);
      await svc.from("li_assessments").delete().eq("id", assessmentId);
    }

    const passed = assertions.filter((a) => a.pass && a.name !== "FATAL").length;
    const summary = `STAGE1 ACCEPTANCE: ${passed}/12 PASS`;
    await svc
      .from("long_running_jobs")
      .update({
        status: "complete",
        progress: summary,
        result: { assertions, summary, passed, total: 12 },
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", jobId);
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return j({ error: "method_not_allowed" }, 405);

  const authHeader = req.headers.get("Authorization") ?? "";
  if (!authHeader.toLowerCase().startsWith("bearer ")) {
    return j({ error: "unauthenticated" }, 401);
  }

  const anonClient = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: authData, error: authErr } = await anonClient.auth.getUser();
  if (authErr || !authData?.user) return j({ error: "unauthenticated" }, 401);
  const userId = authData.user.id;

  const svc = createClient(SUPABASE_URL, SERVICE_ROLE);

  // Admin gate: user_roles must have admin or moderator.
  const { data: roles } = await svc
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .in("role", ["admin", "moderator"]);
  if (!roles || roles.length === 0) return j({ error: "forbidden" }, 403);

  // Create job row.
  const { data: job, error: jobErr } = await svc
    .from("long_running_jobs")
    .insert({
      kind: "run_meter_acceptance",
      tool: TOOL_TYPE,
      status: "running",
      requested_by: userId,
      progress: "starting",
    })
    .select("id")
    .single();
  if (jobErr || !job) return j({ error: "job_create_failed", detail: jobErr?.message }, 500);
  const jobId = (job as any).id as string;

  // @ts-ignore — EdgeRuntime is provided by Supabase Edge runtime.
  EdgeRuntime.waitUntil(runAcceptance(svc, authHeader, userId, jobId));

  return j({ job_id: jobId });
});
