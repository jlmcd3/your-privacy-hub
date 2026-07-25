// DELIVERY SENTINEL — DS-T2
// Runs every 60s via pg_cron. Sweeps live delivery_contracts and takes the
// smallest safe recovery action for each stale row. Never touches grades.
//
// Actions per class:
//   customer:
//     - heartbeat_at older than stage_deadline_at → increment attempts,
//       set failure_class='model_timeout' (or the caller-provided class),
//       best-effort re-invoke a "resume-XXX" endpoint keyed off tool
//     - overall_deadline_at breached AND stage in {render,deliver}:
//       enqueue pdf_render_queue row (HTML-first fallback), terminate
//       contract with terminal_state='delivered_html_pdf_queued'
//     - overall_deadline_at breached AND stage in {generate,assemble,validate}:
//       terminate contract with 'admin_escalated' (deep failure; humans in loop)
//   harness:
//     - heartbeat stale → attempt resume of ql2-orchestrator / batch pickup
//     - attempts on same stage >= 3 → terminate 'harness_stalled' with
//       failure_class already recorded (attribution preserved)
//
// Every action increments attempts + writes failure_class + last_error so
// DS-T3's admin SLO surface has data.
//
// Build stamp: ds-t2b@2026-07-25T01:44:00Z

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MAX_STAGE_ATTEMPTS = 3;

interface ContractRow {
  id: string;
  run_class: "customer" | "harness";
  user_id: string | null;
  tool: string;
  subject_table: string;
  subject_id: string;
  stage: string;
  stage_deadline_at: string;
  overall_deadline_at: string;
  heartbeat_at: string;
  attempts: Record<string, number>;
  failure_class: string | null;
  checkpoint_ref: Record<string, unknown>;
}

async function bumpAttemptsAndFailure(
  admin: any, row: ContractRow, failureClass: string, note: string,
): Promise<number> {
  const attempts = { ...(row.attempts ?? {}) };
  attempts[row.stage] = (attempts[row.stage] ?? 0) + 1;
  await admin.from("delivery_contracts").update({
    attempts,
    failure_class: failureClass,
    last_error: note.slice(0, 4000),
    heartbeat_at: new Date().toISOString(),
  }).eq("id", row.id).is("terminal_state", null);
  return attempts[row.stage];
}

async function terminate(admin: any, id: string, state: string, note?: string) {
  const patch: Record<string, unknown> = {
    terminal_state: state,
    heartbeat_at: new Date().toISOString(),
  };
  if (note) patch.last_error = note.slice(0, 4000);
  await admin.from("delivery_contracts").update(patch)
    .eq("id", id).is("terminal_state", null);
}

// DS-T2b: when a harness contract stalls out on a quality_batch_runs subject,
// also reconcile the batch row itself the way the manual wave-10/13 recoveries
// did — status=cancelled, phase=done, last_error set, completed_at set. Only
// touches rows that are still non-terminal. Fail-open; contract termination
// stands regardless.
export async function reconcileQualityBatchRun(
  admin: any, subjectId: string, note: string,
): Promise<{ reconciled: boolean; reason?: string }> {
  try {
    const { data, error } = await admin.from("quality_batch_runs")
      .update({
        status: "cancelled",
        phase: "done",
        last_error: `[delivery-sentinel] ${note}`.slice(0, 500),
        completed_at: new Date().toISOString(),
      })
      .eq("id", subjectId)
      .not("status", "in", "(complete,failed,cancelled)")
      .select("id");
    if (error) return { reconciled: false, reason: error.message };
    return { reconciled: (data?.length ?? 0) > 0 };
  } catch (e) {
    return { reconciled: false, reason: (e as Error).message };
  }
}

async function enqueuePdfFallback(admin: any, row: ContractRow) {
  // Idempotent: skip if a pending/rendering row already exists for this subject.
  const { data: existing } = await admin
    .from("pdf_render_queue")
    .select("id")
    .eq("subject_table", row.subject_table)
    .eq("subject_id", row.subject_id)
    .in("status", ["pending", "rendering", "done"])
    .maybeSingle();
  if (existing) return;

  await admin.from("pdf_render_queue").insert({
    run_class: row.run_class,
    tool: row.tool,
    subject_table: row.subject_table,
    subject_id: row.subject_id,
    user_id: row.user_id,
    contract_id: row.id,
    title: `${row.tool} report`,
    status: "pending",
  });
}

// Best-effort resume dispatch — never throws. The receivers are all
// idempotent; failing to reach them just means the next sweep tries again.
async function tryResume(row: ContractRow): Promise<{ ok: boolean; via: string }> {
  const auth = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${SERVICE_KEY}`,
    apikey: SERVICE_KEY,
    "x-internal-resume": "1",
  };
  const post = async (fn: string, body: unknown) => {
    try {
      await fetch(`${SUPABASE_URL}/functions/v1/${fn}`, {
        method: "POST", headers: auth, body: JSON.stringify(body),
        signal: AbortSignal.timeout(15_000),
      });
      return true;
    } catch { return false; }
  };
  if (row.run_class === "harness") {
    if (row.subject_table === "quality_loop2_runs") {
      return { ok: await post("ql2-orchestrator", { run_id: row.subject_id }), via: "ql2-orchestrator" };
    }
    if (row.subject_table === "quality_batch_runs") {
      return { ok: await post("quality-batch-orchestrator", { batch_id: row.subject_id, resume: true }), via: "quality-batch-orchestrator" };
    }
    return { ok: false, via: "unmapped" };
  }
  // customer resume — best-effort, tool-specific dispatch handled by the tool's own resumable path
  return { ok: false, via: "customer-no-resume-endpoint" };
}

async function handleCustomer(admin: any, row: ContractRow) {
  const now = Date.now();
  const overallBreached = new Date(row.overall_deadline_at).getTime() < now;
  const stageStale = new Date(row.heartbeat_at).getTime() < new Date(row.stage_deadline_at).getTime();

  if (overallBreached) {
    if (row.stage === "render" || row.stage === "deliver") {
      await enqueuePdfFallback(admin, row);
      await bumpAttemptsAndFailure(admin, row, "pdf_render",
        "overall deadline breached in render/deliver — HTML delivered, PDF queued");
      await terminate(admin, row.id, "delivered_html_pdf_queued",
        "HTML fallback delivered; PDF will finish out-of-band and email the user");
      return { action: "html_fallback+pdf_queued" };
    }
    await bumpAttemptsAndFailure(admin, row, row.failure_class ?? "model_timeout",
      `overall deadline breached at stage ${row.stage}`);
    await terminate(admin, row.id, "admin_escalated",
      "overall SLA exceeded before render — escalated for human review");
    return { action: "admin_escalated" };
  }

  if (stageStale) {
    const n = await bumpAttemptsAndFailure(admin, row, "model_timeout",
      `stage ${row.stage} heartbeat stale`);
    // Customer-side resume endpoints are tool-owned; sentinel records the
    // stall so the tool can pick it up on next user retry.
    return { action: "stage_stall_recorded", attempts: n };
  }
  return { action: "noop" };
}

async function handleHarness(admin: any, row: ContractRow) {
  const now = Date.now();
  const overallBreached = new Date(row.overall_deadline_at).getTime() < now;
  const stageStale = new Date(row.heartbeat_at).getTime() < new Date(row.stage_deadline_at).getTime();
  const stageAttempts = row.attempts?.[row.stage] ?? 0;

  if (overallBreached || stageAttempts >= MAX_STAGE_ATTEMPTS) {
    const note = `harness_stalled: stage=${row.stage} attempts=${stageAttempts} overall=${overallBreached}`;
    await bumpAttemptsAndFailure(admin, row, "harness_stall", note);
    await terminate(admin, row.id, "harness_stalled",
      `attribution: stage=${row.stage} last_failure=${row.failure_class ?? "unknown"}`);
    // DS-T2b: orchestrator-class subject → auto-reconcile the batch row so
    // the UI clears and the wave doesn't sit on a zombie 'running' forever.
    let reconciled: { reconciled: boolean; reason?: string } | undefined;
    if (row.subject_table === "quality_batch_runs") {
      reconciled = await reconcileQualityBatchRun(admin, row.subject_id, note);
    }
    return { action: "harness_stalled", reconciled };
  }

  if (stageStale) {
    const resume = await tryResume(row);
    const n = await bumpAttemptsAndFailure(admin, row, "harness_stall",
      `resume attempt via ${resume.via} ok=${resume.ok}`);
    return { action: "resumed", via: resume.via, ok: resume.ok, attempts: n };
  }
  return { action: "noop" };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  const started = Date.now();
  const admin = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

  const nowIso = new Date().toISOString();
  // Live contracts whose heartbeat is stale OR overall deadline breached.
  const { data: contracts, error } = await admin
    .from("delivery_contracts")
    .select("id, run_class, user_id, tool, subject_table, subject_id, stage, stage_deadline_at, overall_deadline_at, heartbeat_at, attempts, failure_class, checkpoint_ref")
    .is("terminal_state", null)
    .or(`heartbeat_at.lt.${nowIso},stage_deadline_at.lt.${nowIso},overall_deadline_at.lt.${nowIso}`)
    .limit(200);

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...cors, "Content-Type": "application/json" },
    });
  }

  const results: Array<Record<string, unknown>> = [];
  for (const r of (contracts ?? []) as ContractRow[]) {
    try {
      const out = r.run_class === "harness"
        ? await handleHarness(admin, r)
        : await handleCustomer(admin, r);
      results.push({ id: r.id, class: r.run_class, tool: r.tool, stage: r.stage, ...out });
    } catch (e) {
      results.push({ id: r.id, error: (e as Error).message });
    }
  }

  const duration_ms = Date.now() - started;
  console.log(JSON.stringify({
    evt: "delivery_sentinel_sweep",
    scanned: contracts?.length ?? 0,
    duration_ms,
  }));

  return new Response(JSON.stringify({
    scanned: contracts?.length ?? 0,
    duration_ms,
    results,
    build: "ds-t2@2026-07-24T11:15:00Z",
  }), { headers: { ...cors, "Content-Type": "application/json" } });
});
