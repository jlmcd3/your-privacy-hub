// Reaps rows from background-dispatched generators that were killed mid-flight
// by the platform wall-clock limit / OOM / instance shutdown, which bypasses
// the function's catch block and leaves the row stuck on a non-terminal status
// forever (result page spins indefinitely).
//
// Runs every 10 minutes via pg_cron. For each table, finds rows whose status
// is in the stuck list AND whose updated_at is older than 15 minutes, then
// marks them 'failed'. Pending rows are explicitly NOT touched — those are
// legitimate pre-payment placeholders.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

const STUCK_MINUTES = 15;

interface ReapTarget {
  table: string;
  stuckStatuses: string[];
  terminalStatus: string;      // status to write when reaping (must satisfy any CHECK constraint)
  hasGenerationError: boolean; // ropa_sessions, eu_notice_sessions
  hasReportData: boolean;      // everything except ropa/eu sessions
  hasLastError?: boolean;      // RUNTIME-2 T2 — write orphan diagnosis to last_error (li_assessments)
}

// Verified against live schema + check constraints (2026-07-04):
//   - ropa_sessions allows 'processing' and 'failed' (NOT 'generating' — its
//     constraint does not include 'generating'). generate-ropa-document writes
//     'processing' as the in-flight value.
//   - eu_notice_sessions allows 'generating' and 'failed' (constraint updated
//     in migration 20260612082541_*).
//   - cppa_assessments has a CHECK constraint (cppa_assessments_status_check)
//     that permits only pending/processing/complete/error — so we reap to
//     'error', not 'failed'. Do not attempt to widen the constraint.
//   - The other 5 tables have no CHECK constraint on status; 'processing' is
//     the in-flight value written by their generators, and 'failed' is the
//     terminal value already used by their existing catch blocks.
const TARGETS: ReapTarget[] = [
  { table: "ir_playbooks",           stuckStatuses: ["processing"], terminalStatus: "failed", hasGenerationError: false, hasReportData: true  },
  { table: "dpa_documents",          stuckStatuses: ["processing"], terminalStatus: "failed", hasGenerationError: false, hasReportData: true  },
  { table: "li_assessments",         stuckStatuses: ["processing"], terminalStatus: "failed", hasGenerationError: false, hasReportData: true, hasLastError: true },
  { table: "dpia_frameworks",        stuckStatuses: ["processing"], terminalStatus: "failed", hasGenerationError: false, hasReportData: true  },
  { table: "governance_assessments", stuckStatuses: ["processing"], terminalStatus: "failed", hasGenerationError: false, hasReportData: true  },
  { table: "cppa_assessments",       stuckStatuses: ["processing"], terminalStatus: "error",  hasGenerationError: false, hasReportData: true  },
  { table: "ropa_sessions",          stuckStatuses: ["processing"], terminalStatus: "failed", hasGenerationError: true,  hasReportData: false },
  { table: "eu_notice_sessions",     stuckStatuses: ["generating"], terminalStatus: "failed", hasGenerationError: true,  hasReportData: false },
];


const TIMEOUT_MESSAGE =
  "Generation timed out — background worker did not complete. Please retry.";

async function reap(target: ReapTarget): Promise<{ table: string; reaped: number; error?: string }> {
  const cutoff = new Date(Date.now() - STUCK_MINUTES * 60_000).toISOString();

  // Select candidate ids first so we can also conditionally patch report_data
  // only where it is currently null. RUNTIME-2 T2 — pull `stage` and
  // `updated_at` on tables with hasLastError so we can compose a per-row
  // diagnosis string for last_error.
  const cols = ["id"];
  if (target.hasReportData) cols.push("report_data");
  if (target.hasLastError) cols.push("stage", "updated_at");
  const selectCols = cols.join(", ");
  const { data: candidates, error: selErr } = await supabase
    .from(target.table)
    .select(selectCols)
    .in("status", target.stuckStatuses)
    .lt("updated_at", cutoff);

  if (selErr) {
    console.error(`[reap-stuck] ${target.table}: select failed`, selErr);
    return { table: target.table, reaped: 0, error: selErr.message };
  }
  if (!candidates || candidates.length === 0) {
    console.log(`[reap-stuck] ${target.table}: 0 rows reaped`);
    return { table: target.table, reaped: 0 };
  }

  const ids = (candidates as any[]).map((r: any) => r.id);

  if (target.hasLastError) {
    // Per-row diagnosis so /admin/function-health and the result page show
    // exactly what happened (which stage was heartbeating, how long the row
    // sat idle) rather than a NULL last_error.
    const now = Date.now();
    for (const row of candidates as any[]) {
      const minutesStuck = row.updated_at
        ? Math.round((now - new Date(row.updated_at).getTime()) / 60_000)
        : STUCK_MINUTES;
      const diagnosis =
        `Orphaned — background worker did not complete. Row was stuck ` +
        `${minutesStuck} min at stage '${row.stage ?? "unknown"}' with no heartbeat ` +
        `(likely edge-function wall-clock timeout, OOM, or instance shutdown). Safe to re-run.`;
      const patch: Record<string, unknown> = {
        status: target.terminalStatus,
        last_error: diagnosis.slice(0, 500),
      };
      const { error: updErr } = await supabase
        .from(target.table)
        .update(patch)
        .eq("id", row.id)
        .in("status", target.stuckStatuses); // race guard
      if (updErr) {
        console.error(`[reap-stuck] ${target.table} ${row.id}: update failed`, updErr);
      }
    }
  } else {
    const patch: Record<string, unknown> = { status: target.terminalStatus };
    if (target.hasGenerationError) patch.generation_error = TIMEOUT_MESSAGE;
    const { error: updErr } = await supabase
      .from(target.table)
      .update(patch)
      .in("id", ids)
      .in("status", target.stuckStatuses); // guard against races
    if (updErr) {
      console.error(`[reap-stuck] ${target.table}: update failed`, updErr);
      return { table: target.table, reaped: 0, error: updErr.message };
    }
  }

  if (target.hasReportData) {
    const nullDataIds = (candidates as any[])
      .filter((r: any) => r.report_data === null)
      .map((r: any) => r.id);
    if (nullDataIds.length > 0) {
      const { error: rdErr } = await supabase
        .from(target.table)
        .update({ report_data: { error: "reaped_stuck_generation" } })
        .in("id", nullDataIds)
        .is("report_data", null);
      if (rdErr) console.error(`[reap-stuck] ${target.table}: report_data patch failed`, rdErr);
    }
  }

  console.log(`[reap-stuck] ${target.table}: ${ids.length} rows reaped`);
  return { table: target.table, reaped: ids.length };
}

// Quality runs have a different shape: non-terminal statuses are
// pending/generating/building/evaluating, terminal column is `error` (not
// generation_error), and they carry a `progress_log` jsonb array that drives
// the admin UI's live log view. When we reap one, append an entry to that
// log so John and Katherine can see exactly why a run was terminated and
// stop / re-run accordingly.
const QUALITY_STUCK_STATUSES = ["pending", "generating", "building", "evaluating"];
const QUALITY_STUCK_MINUTES = 20; // longer than other tables — eval phase is slow

async function reapQualityRuns(): Promise<{ table: string; reaped: number; error?: string }> {
  const cutoff = new Date(Date.now() - QUALITY_STUCK_MINUTES * 60_000).toISOString();
  const { data: candidates, error: selErr } = await supabase
    .from("quality_runs")
    .select("id, tool, run_number, status, progress_log, started_at, last_heartbeat_at")
    .in("status", QUALITY_STUCK_STATUSES)
    .lt("last_heartbeat_at", cutoff);

  if (selErr) {
    console.error("[reap-stuck] quality_runs: select failed", selErr);
    return { table: "quality_runs", reaped: 0, error: selErr.message };
  }
  if (!candidates || candidates.length === 0) {
    console.log("[reap-stuck] quality_runs: 0 rows reaped");
    return { table: "quality_runs", reaped: 0 };
  }

  let reaped = 0;
  for (const row of candidates as any[]) {
    const stuckSince = row.last_heartbeat_at ?? row.started_at;
    const minutesStuck = Math.round(
      (Date.now() - new Date(stuckSince).getTime()) / 60_000,
    );
    const reapEntry = {
      ts: new Date().toISOString(),
      phase: "reaped",
      message:
        `⚠️ Auto-terminated by watchdog. Run was stuck in '${row.status}' for ${minutesStuck} min ` +
        `with no progress (likely edge-function wall-clock timeout or worker crash). ` +
        `Safe to re-run.`,
    };
    const newLog = Array.isArray(row.progress_log)
      ? [...row.progress_log, reapEntry]
      : [reapEntry];

    const { error: updErr } = await supabase
      .from("quality_runs")
      .update({
        status: "error",
        error: `Reaped after ${minutesStuck} min stuck in '${row.status}' (worker did not complete).`,
        completed_at: new Date().toISOString(),
        progress_log: newLog,
      })
      .eq("id", row.id)
      .in("status", QUALITY_STUCK_STATUSES); // race guard

    if (updErr) {
      console.error(`[reap-stuck] quality_runs ${row.id}: update failed`, updErr);
      continue;
    }
    reaped += 1;
    console.log(
      `[reap-stuck] quality_runs: reaped ${row.tool} #${row.run_number} ` +
      `(stuck ${minutesStuck}m in '${row.status}')`,
    );
  }
  return { table: "quality_runs", reaped };
}

// function_runs is per-invocation telemetry written by _shared/run-logger.ts.
// If an edge function hits the wall-clock limit / OOM / instance shutdown
// before the logger's finally block runs, the row stays at status='running'
// forever and the /admin/function-health "Latest status" card stays amber.
// Sweep anything still 'running' after 15 min and mark it errored.
const FUNCTION_RUN_STUCK_MINUTES = 15;
async function reapFunctionRuns(): Promise<{ table: string; reaped: number; error?: string }> {
  const cutoff = new Date(Date.now() - FUNCTION_RUN_STUCK_MINUTES * 60_000).toISOString();
  const { data: candidates, error: selErr } = await supabase
    .from("function_runs")
    .select("id, started_at, metadata")
    .eq("status", "running")
    .lt("started_at", cutoff);

  if (selErr) {
    console.error("[reap-stuck] function_runs: select failed", selErr);
    return { table: "function_runs", reaped: 0, error: selErr.message };
  }
  if (!candidates || candidates.length === 0) {
    console.log("[reap-stuck] function_runs: 0 rows reaped");
    return { table: "function_runs", reaped: 0 };
  }

  const now = new Date();
  let reaped = 0;
  for (const row of candidates as any[]) {
    const started = new Date(row.started_at);
    const durationMs = now.getTime() - started.getTime();
    const assessmentId = typeof row?.metadata?.assessment_id === "string" ? row.metadata.assessment_id : null;
    if (assessmentId) {
      const { data: assessment } = await supabase
        .from("cppa_assessments")
        .select("status, report_data")
        .eq("id", assessmentId)
        .maybeSingle();
      if ((assessment as any)?.status === "complete" && (assessment as any)?.report_data) {
        const { error: recoveredErr } = await supabase
          .from("function_runs")
          .update({
            status: "success",
            finished_at: now.toISOString(),
            duration_ms: durationMs,
            source_table: "cppa_assessments",
            source_row_id: assessmentId,
            error_message: null,
            metadata: { ...(row.metadata ?? {}), recovered_by_reaper: true, recovered_reason: "source_row_already_complete" },
          })
          .eq("id", row.id)
          .eq("status", "running");
        if (recoveredErr) {
          console.error(`[reap-stuck] function_runs ${row.id}: recovered-success update failed`, recoveredErr);
          continue;
        }
        reaped += 1;
        console.log(`[reap-stuck] function_runs ${row.id}: recovered as success because cppa_assessments/${assessmentId} is complete`);
        continue;
      }
    }
    const { error: updErr } = await supabase
      .from("function_runs")
      .update({
        status: "error",
        finished_at: now.toISOString(),
        duration_ms: durationMs,
        error_message:
          "Orphaned — worker did not write a finish signal (likely wall-clock timeout, OOM, or instance shutdown).",
      })
      .eq("id", row.id)
      .eq("status", "running"); // race guard
    if (updErr) {
      console.error(`[reap-stuck] function_runs ${row.id}: update failed`, updErr);
      continue;
    }
    reaped += 1;
  }
  console.log(`[reap-stuck] function_runs: ${reaped} rows reaped`);
  return { table: "function_runs", reaped };
}

// NOTE: Registration order sweeping has moved to `retry-failed-generations`
// (which is the only cross-product sweeper actually scheduled via pg_cron).
// This function is not on a schedule, so a registration backstop here would
// never run. See retry-failed-generations/index.ts → sweepRegistrationOrders.

// RC-D.7 D-REGEN-ORPHAN-1 backstop: revert *revision-mode* rows that were
// left orphaned in `processing` by a killed regenerate→invoke chain. Distinct
// from the initial-generation TARGETS above:
//   - shorter threshold (5 min — the row already has a complete prior report,
//     nothing is at risk from an early revert)
//   - reverts to `complete` (the pre-revision terminal state) instead of
//     failing/erroring — the user still has their prior report intact
//   - only fires when report_data.open_items exists (i.e. a prior complete
//     run's open-items rail is present, which is the signature of a revision
//     dispatch mid-flight and not an initial generation)
// The primary fix is the revert-on-invoke-failure in regenerate-assessment;
// this is the safety net for platform-level chain terminations that bypass
// regenerate's catch entirely.
const REVISION_STUCK_MINUTES = 5;
const REVISION_TARGETS: Array<{ table: string; inflight: string; revertTo: string }> = [
  { table: "cppa_assessments",       inflight: "processing", revertTo: "complete" },
  { table: "governance_assessments", inflight: "processing", revertTo: "complete" },
  { table: "dpia_frameworks",        inflight: "processing", revertTo: "complete" },
  { table: "li_assessments",         inflight: "processing", revertTo: "complete" },
  { table: "ir_playbooks",           inflight: "processing", revertTo: "complete" },
  { table: "biometric_assessments",  inflight: "processing", revertTo: "complete" },
  { table: "dpa_documents",          inflight: "processing", revertTo: "complete" },
];

async function reapRevisionInFlight(t: { table: string; inflight: string; revertTo: string }) {
  const cutoff = new Date(Date.now() - REVISION_STUCK_MINUTES * 60_000).toISOString();
  const { data: candidates, error: selErr } = await supabase
    .from(t.table)
    .select("id, report_data, updated_at")
    .eq("status", t.inflight)
    .lt("updated_at", cutoff);
  if (selErr) {
    console.error(`[reap-stuck] revision ${t.table}: select failed`, selErr);
    return { table: `${t.table}:revision`, reaped: 0, error: selErr.message };
  }
  const eligible = (candidates ?? []).filter((r: any) =>
    Array.isArray(r?.report_data?.open_items),
  );
  if (eligible.length === 0) {
    console.log(`[reap-stuck] revision ${t.table}: 0 rows reaped`);
    return { table: `${t.table}:revision`, reaped: 0 };
  }
  let reaped = 0;
  for (const row of eligible as any[]) {
    const { error: updErr } = await supabase
      .from(t.table)
      .update({ status: t.revertTo, updated_at: new Date().toISOString() })
      .eq("id", row.id)
      .eq("status", t.inflight); // race guard
    if (updErr) {
      console.error(`[reap-stuck] revision ${t.table} ${row.id}: revert failed`, updErr);
      continue;
    }
    reaped += 1;
    console.log(`[reap-stuck] revision ${t.table}: reverted ${row.id} → ${t.revertTo}`);
  }
  return { table: `${t.table}:revision`, reaped };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const results = [];
    for (const t of REVISION_TARGETS) results.push(await reapRevisionInFlight(t));
    for (const t of TARGETS) results.push(await reap(t));
    results.push(await reapQualityRuns());
    results.push(await reapFunctionRuns());

    // Registration orders are swept by retry-failed-generations (scheduled).
    const total = results.reduce((n, r) => n + r.reaped, 0);

    return new Response(
      JSON.stringify({
        ok: true,
        checked_at: new Date().toISOString(),
        stuck_threshold_minutes: STUCK_MINUTES,
        total_reaped: total,
        results,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("reap-stuck-generations error:", e);
    return new Response(JSON.stringify({ ok: false, error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
