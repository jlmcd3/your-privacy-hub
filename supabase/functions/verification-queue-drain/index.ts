// verification-queue-drain: picks queued rows, marks them in-flight, and calls
// verification-scan in 'targeted' mode. Scheduled hourly via pg_cron.
//
// Item 333 (2026-08-01): the drain used to hand ALL claimed ids to a single
// verification-scan invocation. One oversized source document (up to 160k
// chars, two LLM calls each) killed the whole worker with
// WORKER_RESOURCE_LIMIT / IDLE_TIMEOUT, and every id in that batch took an
// attempts++ for a failure it did not cause — which is how 24 rows reached
// attempts>=3 and stalled permanently. The drain now:
//   1. calls verification-scan ONCE PER ROW (batch_size 1), so one bad
//      document cannot poison its neighbours;
//   2. stops early on a wall-clock budget, well inside the worker's limit;
//   3. attributes attempts++ / last_error to the individual failing row;
//   4. EXHAUSTION POLICY — a row that reaches attempts>=MAX_ATTEMPTS is not
//      left in the queue forever. Its enforcement_actions.verification_status
//      is set to 'failed', the last_error is preserved as a visible
//      verification_results row ('queue_drain_exhausted'), and the queue entry
//      is removed. No permanent silent holes.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2/cors";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const sb = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

const MAX_ATTEMPTS = 3;
const MAX_ROWS_PER_RUN = 6;
const WALL_CLOCK_BUDGET_MS = 110_000;

async function retireExhausted(id: string, lastError: string) {
  await sb.from("verification_results").insert({
    enforcement_action_id: id,
    check_name: "queue_drain_exhausted",
    check_category: "fetch",
    verdict: "fail",
    evidence_text: lastError.slice(0, 500),
    notes: `retired from verification_queue after ${MAX_ATTEMPTS} failed drain attempts`,
    ran_at: new Date().toISOString(),
  });
  await sb.from("enforcement_actions").update({
    verification_status: "failed",
    verification_deterministic_pass: false,
    memo_eligible: false,
    verification_last_run_at: new Date().toISOString(),
  }).eq("id", id);
  await sb.from("verification_queue").delete().eq("enforcement_action_id", id);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const startedAt = Date.now();
  try {
    const nowIso = new Date().toISOString();
    const claimUntil = new Date(Date.now() + 10 * 60 * 1000).toISOString();

    const { data: candidates } = await sb
      .from("verification_queue")
      .select("enforcement_action_id, priority, queued_at, attempts, in_flight_until")
      .lt("attempts", MAX_ATTEMPTS)
      .or(`in_flight_until.is.null,in_flight_until.lt.${nowIso}`)
      .order("priority", { ascending: false })
      .order("queued_at", { ascending: true })
      .limit(MAX_ROWS_PER_RUN);

    const rows = candidates ?? [];
    if (rows.length === 0) {
      return new Response(JSON.stringify({ drained: 0, message: "queue_empty" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const ids = rows.map((r) => r.enforcement_action_id);
    await sb
      .from("verification_queue")
      .update({ in_flight_until: claimUntil, last_attempt_at: nowIso })
      .in("enforcement_action_id", ids);

    const url = `${supabaseUrl}/functions/v1/verification-scan`;
    let drained = 0;
    let failed = 0;
    let retired = 0;
    let skipped_budget = 0;
    const errors: Record<string, string> = {};

    for (const row of rows) {
      const id = row.enforcement_action_id as string;
      if (Date.now() - startedAt > WALL_CLOCK_BUDGET_MS) {
        // Release the claim without penalising the row — it was never tried.
        await sb
          .from("verification_queue")
          .update({ in_flight_until: null })
          .eq("enforcement_action_id", id);
        skipped_budget++;
        continue;
      }

      let scanError: string | null = null;
      try {
        // One row per invocation: an oversized document can only take down
        // its own scan, and the scan worker gets the full budget for it.
        const res = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${serviceKey}`,
          },
          body: JSON.stringify({
            mode: "targeted",
            target_ids: [id],
            batch_size: 1,
          }),
        });
        if (!res.ok) scanError = `http_${res.status}: ${(await res.text()).slice(0, 200)}`;
      } catch (e) {
        scanError = (e as Error).message?.slice(0, 200) ?? "unknown_error";
      }

      if (!scanError) {
        await sb.from("verification_queue").delete().eq("enforcement_action_id", id);
        drained++;
        continue;
      }

      const nextAttempts = (row.attempts ?? 0) + 1;
      errors[id] = scanError;
      if (nextAttempts >= MAX_ATTEMPTS) {
        await retireExhausted(id, scanError);
        retired++;
      } else {
        await sb
          .from("verification_queue")
          .update({ attempts: nextAttempts, last_error: scanError, in_flight_until: null })
          .eq("enforcement_action_id", id);
        failed++;
      }
    }

    return new Response(JSON.stringify({
      drained,
      failed,
      retired,
      skipped_budget,
      attempted: rows.length,
      elapsed_ms: Date.now() - startedAt,
      errors,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message ?? String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
