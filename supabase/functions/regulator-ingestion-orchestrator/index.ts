// Fire-and-forget Orchestrator: returns 202 immediately with an ingestion_runs.id,
// then keeps batching per-regulator-ingestion calls in the background via
// EdgeRuntime.waitUntil(). Client polls ingestion_runs.status for progress.
//
// Body: {
//   regulator_canonical: string,
//   total_rows?: number,     // default 50
//   batch_size?: number,     // default 8
//   dry_run?: boolean,       // default false
//   gap_ms?: number          // default 5000 sequential gap
// }
//
// Response 202: { ok:true, run_id, regulator_canonical, requested_rows }
// Auth: Admin only via x-admin-token header matching ADMIN_SECRET_TOKEN.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-admin-token",
};

// EdgeRuntime global is provided by Supabase Edge Runtime.
// deno-lint-ignore no-explicit-any
declare const EdgeRuntime: any;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const adminToken = req.headers.get("x-admin-token");
  if (adminToken !== Deno.env.get("ADMIN_SECRET_TOKEN")) {
    return new Response(JSON.stringify({ error: "unauthorized" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const body = await req.json().catch(() => ({}));
  const regulator_canonical: string = body.regulator_canonical;
  const total_rows: number = Number(body.total_rows ?? 50);
  const batch_size: number = Number(body.batch_size ?? 8);
  const dry_run: boolean = Boolean(body.dry_run ?? false);
  const gap_ms: number = Number(body.gap_ms ?? 5000);

  if (!regulator_canonical) {
    return new Response(JSON.stringify({ error: "regulator_canonical required" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supaUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const fnUrl = `${supaUrl}/functions/v1/per-regulator-ingestion`;

  const supabase = createClient(supaUrl, serviceKey, { auth: { persistSession: false } });

  // Create the run row up front; status="queued" -> "running" -> "complete"|"failed"
  const startedAt = new Date().toISOString();
  const { data: runRow, error: runErr } = await supabase
    .from("ingestion_runs")
    .insert({
      job_name: "regulator-ingestion-orchestrator",
      regulator_canonical,
      run_at: startedAt,
      started_at: startedAt,
      status: "queued",
      metadata: { total_rows, batch_size, dry_run, gap_ms },
    })
    .select("id")
    .single();

  if (runErr || !runRow) {
    return new Response(JSON.stringify({ error: "failed_to_create_run", detail: runErr?.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const runId = runRow.id;
  const startedMs = Date.now();

  const numBatches = Math.ceil(total_rows / batch_size);
  const batches: Array<{ offset: number; max_rows: number }> = [];
  for (let i = 0; i < numBatches; i++) {
    batches.push({ offset: i * batch_size, max_rows: Math.min(batch_size, total_rows - i * batch_size) });
  }

  const callBatch = async (b: { offset: number; max_rows: number }) => {
    const r = await fetch(fnUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": anonKey,
        "Authorization": `Bearer ${anonKey}`,
        "x-admin-token": adminToken!,
      },
      body: JSON.stringify({
        regulator_canonical,
        max_rows: b.max_rows,
        offset: b.offset,
        dry_run,
      }),
      signal: AbortSignal.timeout(160_000),
    });
    const j = await r.json().catch(() => ({}));
    return { offset: b.offset, ok: r.ok, status: r.status, counts: j.counts, errors: j.errors };
  };

  const work = (async () => {
    let totalDiscovered = 0, totalMatched = 0, totalInserted = 0, totalFailed = 0, totalLlm = 0;
    const batchLog: Array<Record<string, unknown>> = [];
    let consecutiveFailures = 0;

    await supabase.from("ingestion_runs").update({
      status: "running",
      notes: `Starting ${batches.length} batches of ${batch_size}`,
    }).eq("id", runId);

    for (let i = 0; i < batches.length; i++) {
      const b = batches[i];
      let result: Awaited<ReturnType<typeof callBatch>> | { offset: number; ok: false; error: string };
      try {
        result = await callBatch(b);
      } catch (e) {
        result = { offset: b.offset, ok: false, error: (e as Error).message };
      }

      batchLog.push(result);

      if (!(result as { ok: boolean }).ok) {
        consecutiveFailures++;
        if (consecutiveFailures >= 3) {
          await supabase.from("ingestion_runs").update({
            status: "failed",
            finished_at: new Date().toISOString(),
            completed_at: new Date().toISOString(),
            duration_ms: Date.now() - startedMs,
            error_message: `3 consecutive batch failures; last: ${JSON.stringify(result).slice(0, 1500)}`,
            rows_discovered: totalDiscovered,
            rows_matched_legacy: totalMatched,
            rows_inserted_new: totalInserted,
            rows_failed: totalFailed,
            llm_calls_made: totalLlm,
            inserted: totalInserted,
            errors: batchLog,
          }).eq("id", runId);
          return;
        }
      } else {
        consecutiveFailures = 0;
        const c = (result as { counts?: Record<string, number> }).counts || {};
        totalDiscovered += c.discovered || 0;
        totalMatched += c.matched || 0;
        totalInserted += c.inserted || 0;
        totalFailed += c.failed || 0;
        totalLlm += c.llm_calls || 0;

        // Stop if a batch discovered 0 rows (end of pages)
        if ((c.discovered ?? 0) === 0) {
          break;
        }
      }

      // Progress update after each batch
      await supabase.from("ingestion_runs").update({
        rows_discovered: totalDiscovered,
        rows_matched_legacy: totalMatched,
        rows_inserted_new: totalInserted,
        rows_failed: totalFailed,
        llm_calls_made: totalLlm,
        inserted: totalInserted,
        notes: `Batch ${i + 1}/${batches.length} done (offset=${b.offset})`,
      }).eq("id", runId);

      if (i < batches.length - 1 && gap_ms > 0) {
        await new Promise((res) => setTimeout(res, gap_ms));
      }
    }

    const finishedAt = new Date().toISOString();
    await supabase.from("ingestion_runs").update({
      status: "complete",
      finished_at: finishedAt,
      completed_at: finishedAt,
      duration_ms: Date.now() - startedMs,
      rows_discovered: totalDiscovered,
      rows_matched_legacy: totalMatched,
      rows_inserted_new: totalInserted,
      rows_failed: totalFailed,
      llm_calls_made: totalLlm,
      inserted: totalInserted,
      errors: batchLog,
      notes: `Completed ${batchLog.length} batches`,
    }).eq("id", runId);
  })();

  // Fire and forget
  if (typeof EdgeRuntime !== "undefined" && EdgeRuntime?.waitUntil) {
    EdgeRuntime.waitUntil(work);
  } else {
    // Fallback (shouldn't happen on Supabase Edge Runtime)
    work.catch((e) => console.error("orchestrator background error:", e));
  }

  return new Response(JSON.stringify({
    ok: true,
    run_id: runId,
    regulator_canonical,
    requested_rows: total_rows,
    batches_planned: batches.length,
    poll_hint: `SELECT status, rows_inserted_new, rows_discovered, notes FROM ingestion_runs WHERE id = '${runId}'`,
  }), {
    status: 202,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
