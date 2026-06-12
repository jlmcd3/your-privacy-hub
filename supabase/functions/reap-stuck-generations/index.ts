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
  hasGenerationError: boolean; // ropa_sessions, eu_notice_sessions
  hasReportData: boolean;      // everything except ropa/eu sessions
}

// Verified against live schema + check constraints (2026-06-12):
//   - ropa_sessions allows 'processing' and 'failed' (NOT 'generating' — its
//     constraint does not include 'generating'). generate-ropa-document writes
//     'processing' as the in-flight value.
//   - eu_notice_sessions allows 'generating' and 'failed' (constraint updated
//     in migration 20260612082541_*).
//   - The other 6 tables have no CHECK constraint on status; 'processing' is
//     the in-flight value written by their generators, and 'failed' is the
//     terminal value already used by their existing catch blocks.
const TARGETS: ReapTarget[] = [
  { table: "ir_playbooks",           stuckStatuses: ["processing"], hasGenerationError: false, hasReportData: true  },
  { table: "dpa_documents",          stuckStatuses: ["processing"], hasGenerationError: false, hasReportData: true  },
  { table: "li_assessments",         stuckStatuses: ["processing"], hasGenerationError: false, hasReportData: true  },
  { table: "dpia_frameworks",        stuckStatuses: ["processing"], hasGenerationError: false, hasReportData: true  },
  { table: "governance_assessments", stuckStatuses: ["processing"], hasGenerationError: false, hasReportData: true  },
  { table: "cppa_assessments",       stuckStatuses: ["processing"], hasGenerationError: false, hasReportData: true  },
  { table: "ropa_sessions",          stuckStatuses: ["processing"], hasGenerationError: true,  hasReportData: false },
  { table: "eu_notice_sessions",     stuckStatuses: ["generating"], hasGenerationError: true,  hasReportData: false },
];

const TIMEOUT_MESSAGE =
  "Generation timed out — background worker did not complete. Please retry.";

async function reap(target: ReapTarget): Promise<{ table: string; reaped: number; error?: string }> {
  const cutoff = new Date(Date.now() - STUCK_MINUTES * 60_000).toISOString();

  // Select candidate ids first so we can also conditionally patch report_data
  // only where it is currently null.
  const selectCols = target.hasReportData ? "id, report_data" : "id";
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

  const ids = candidates.map((r: any) => r.id);
  const patch: Record<string, unknown> = { status: "failed" };
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

  // Set report_data: { error: 'reaped_stuck_generation' } ONLY where it is
  // currently null, so we never clobber partial output written by the worker.
  if (target.hasReportData) {
    const nullDataIds = candidates
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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const results = [];
    for (const t of TARGETS) results.push(await reap(t));
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
