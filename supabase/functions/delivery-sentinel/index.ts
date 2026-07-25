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
// Build stamp: ds-t2d-sentinel@2026-07-25T15:03:25Z

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MAX_STAGE_ATTEMPTS = 3;
const LIVENESS_WINDOW_MS = 5 * 60 * 1000; // DS-T2c: subject fresher than this ⇒ contract is LIVE
const HARNESS_STAGE_REFRESH_S = 900;      // must match HARNESS_SLA.stageSeconds

// DS-T2c: cross-check a harness/quality_batch_runs contract against the
// subject row AND its in-flight quality_runs before any bump/terminate.
// Returns the most recent heartbeat across (batch row, in-flight runs).
export async function latestHarnessBatchActivity(
  admin: any, batchId: string,
): Promise<{ latestMs: number; anySignal: boolean }> {
  let latestMs = 0;
  let anySignal = false;
  try {
    const { data: batch } = await admin.from("quality_batch_runs")
      .select("last_heartbeat_at, status").eq("id", batchId).maybeSingle();
    if (batch?.last_heartbeat_at) {
      anySignal = true;
      latestMs = Math.max(latestMs, new Date(batch.last_heartbeat_at).getTime());
    }
    const { data: kids } = await admin.from("quality_runs")
      .select("last_heartbeat_at, status")
      .eq("batch_id", batchId)
      .in("status", ["pending", "building", "grading", "cross_review", "running"]);
    for (const k of (kids ?? [])) {
      const hb = (k as any)?.last_heartbeat_at;
      if (hb) {
        anySignal = true;
        latestMs = Math.max(latestMs, new Date(hb).getTime());
      }
    }
  } catch (e) {
    console.log(JSON.stringify({
      evt: "sentinel_liveness_probe_error",
      batch_id: batchId, err: (e as Error).message,
    }));
  }
  return { latestMs, anySignal };
}

async function refreshHarnessContract(admin: any, id: string, note: string) {
  const now = new Date();
  await admin.from("delivery_contracts").update({
    heartbeat_at: now.toISOString(),
    stage_deadline_at: new Date(now.getTime() + HARNESS_STAGE_REFRESH_S * 1000).toISOString(),
    last_error: `[liveness_guard] ${note}`.slice(0, 4000),
  }).eq("id", id).is("terminal_state", null);
}

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

// DS-T2d: "all-children-terminal" reap branch. When every child quality_run
// for the subject batch is terminal, the parent batch heartbeat is stale
// >5min, AND the contract stage_deadline_at is breached, reconcile the batch
// AND the contract with an outcome that follows the children — WITHOUT
// bumping attempts. Closes the DS-T2c gap where nothing heartbeats and the
// overall deadline never fires (wave-18 isolate-death shape).
const CHILD_INFLIGHT = ["pending", "building", "grading", "cross_review", "running"];
const CHILD_BAD = ["error", "cancelled", "failed"];

export async function reapAllChildrenTerminal(
  admin: any, row: ContractRow, nowMs: number,
): Promise<{ acted: boolean; outcome?: "complete" | "cancelled"; reason?: string; child_count?: number }> {
  if (row.subject_table !== "quality_batch_runs") {
    return { acted: false, reason: "not_batch_subject" };
  }
  try {
    // (c) stage_deadline_at breached
    const stageBreached = new Date(row.stage_deadline_at).getTime() < nowMs;
    if (!stageBreached) return { acted: false, reason: "stage_not_breached" };
    // (b) parent batch heartbeat stale > 5 min (LIVENESS_WINDOW_MS)
    const { data: batch, error: bErr } = await admin.from("quality_batch_runs")
      .select("last_heartbeat_at, status, phase").eq("id", row.subject_id).maybeSingle();
    if (bErr) return { acted: false, reason: `batch_read_err:${bErr.message}` };
    if (!batch) return { acted: false, reason: "batch_missing" };
    const hbMs = batch.last_heartbeat_at ? new Date(batch.last_heartbeat_at).getTime() : 0;
    if (hbMs && (nowMs - hbMs) <= LIVENESS_WINDOW_MS) {
      return { acted: false, reason: `parent_hb_fresh:${Math.round((nowMs - hbMs) / 1000)}s` };
    }
    // (a) every child quality_run terminal
    const { data: kids, error: kErr } = await admin.from("quality_runs")
      .select("id, status").eq("batch_id", row.subject_id);
    if (kErr) return { acted: false, reason: `kids_read_err:${kErr.message}` };
    const list = (kids ?? []) as Array<{ id: string; status: string }>;
    if (list.length === 0) return { acted: false, reason: "no_children" };
    const stillRunning = list.filter((k) => CHILD_INFLIGHT.includes(k.status));
    if (stillRunning.length > 0) {
      return { acted: false, reason: `children_in_flight:${stillRunning.length}` };
    }
    const anyBad = list.some((k) => CHILD_BAD.includes(k.status));
    const outcome: "complete" | "cancelled" = anyBad ? "cancelled" : "complete";
    const note = `[ds-t2d-reap] all ${list.length} children terminal (bad=${anyBad}); parent hb stale; stage deadline breached`;

    // Reconcile batch (only if not already terminal)
    await admin.from("quality_batch_runs").update({
      status: outcome,
      phase: "done",
      last_error: anyBad ? note.slice(0, 500) : null,
      completed_at: new Date(nowMs).toISOString(),
    }).eq("id", row.subject_id).not("status", "in", "(complete,failed,cancelled)");

    // Terminate contract with matching terminal state — NO attempt bump.
    const contractTerminal = anyBad ? "harness_stalled" : "harness_completed_reaped";
    await admin.from("delivery_contracts").update({
      terminal_state: contractTerminal,
      heartbeat_at: new Date(nowMs).toISOString(),
      last_error: note.slice(0, 4000),
    }).eq("id", row.id).is("terminal_state", null);

    console.log(JSON.stringify({
      evt: "sentinel_reap_children_terminal",
      contract_id: row.id, batch_id: row.subject_id,
      child_count: list.length, any_bad: anyBad, outcome,
    }));
    return { acted: true, outcome, child_count: list.length };
  } catch (e) {
    console.log(JSON.stringify({
      evt: "sentinel_reap_error",
      contract_id: row.id, batch_id: row.subject_id, err: (e as Error).message,
    }));
    return { acted: false, reason: `exception:${(e as Error).message}` };
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
  // DS-T2c: same inversion fix as harness branch — see handleHarness.
  const stageDeadlineMs = new Date(row.stage_deadline_at).getTime();
  const stageStale = stageDeadlineMs < now
    && new Date(row.heartbeat_at).getTime() < stageDeadlineMs;

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
  // DS-T2c: stageStale = deadline in the past AND heartbeat older than deadline.
  // (Old logic `heartbeat_at < stage_deadline_at` was inverted — a fresh
  // contract with a future deadline was always "stale", guaranteeing the
  // sentinel bumped attempts on every sweep. That was the wave-18 false-kill.)
  const stageDeadlineMs = new Date(row.stage_deadline_at).getTime();
  const heartbeatMs = new Date(row.heartbeat_at).getTime();
  const stageStale = stageDeadlineMs < now && heartbeatMs < stageDeadlineMs;
  const stageAttempts = row.attempts?.[row.stage] ?? 0;

  // DS-T2c LIVENESS GUARD — for harness/quality_batch_runs, never bump or
  // terminate a contract whose subject is genuinely alive. Only a subject
  // silent for >5 min falls through to the resume/terminate path.
  if (row.subject_table === "quality_batch_runs" && (overallBreached || stageStale || stageAttempts >= MAX_STAGE_ATTEMPTS)) {
    const { latestMs, anySignal } = await latestHarnessBatchActivity(admin, row.subject_id);
    const freshMs = anySignal ? now - latestMs : Number.POSITIVE_INFINITY;
    if (anySignal && freshMs < LIVENESS_WINDOW_MS) {
      await refreshHarnessContract(admin, row.id,
        `subject alive: fresh=${Math.round(freshMs / 1000)}s < ${Math.round(LIVENESS_WINDOW_MS / 1000)}s`);
      console.log(JSON.stringify({
        evt: "sentinel_liveness_guard_hit",
        contract_id: row.id, batch_id: row.subject_id, stage: row.stage,
        stageStale, overallBreached, stageAttempts,
        subject_last_heartbeat_ms_ago: Math.round(freshMs),
      }));
      return { action: "liveness_guard_refresh", freshMs: Math.round(freshMs) };
    }
  }

  // DS-T2d: all-children-terminal reap — preempts the attempt-bumping
  // terminate path when the batch is dead but silent (nothing to heartbeat
  // against). Triple-gated: subject=batch, stage deadline breached, parent
  // hb stale >5min, every child terminal. NO attempt bump on this branch.
  if (row.subject_table === "quality_batch_runs") {
    const reap = await reapAllChildrenTerminal(admin, row, now);
    if (reap.acted) {
      return { action: `reaped_children_terminal_${reap.outcome}`, child_count: reap.child_count };
    }
  }

  if (overallBreached || stageAttempts >= MAX_STAGE_ATTEMPTS) {
    const note = `harness_stalled: stage=${row.stage} attempts=${stageAttempts} overall=${overallBreached}`;
    await bumpAttemptsAndFailure(admin, row, "harness_stall", note);
    await terminate(admin, row.id, "harness_stalled",
      `attribution: stage=${row.stage} last_failure=${row.failure_class ?? "unknown"}`);
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
    build: "ds-t2c-sentinel-livenessguard@2026-07-25T04:53:30Z",
  }), { headers: { ...cors, "Content-Type": "application/json" } });
});
