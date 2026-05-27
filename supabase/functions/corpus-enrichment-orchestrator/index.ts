// Fire-and-forget orchestrator for enrich-legacy-corpus.
// Body: { regulator_canonical, total_rows, batch_size?, dry_run?, gap_ms? }
// Returns 202 + run_id immediately, processes batches in EdgeRuntime.waitUntil().

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-admin-token",
};

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
  const batch_size: number = Number(body.batch_size ?? 10);
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
  const fnUrl = `${supaUrl}/functions/v1/enrich-legacy-corpus`;

  const supabase = createClient(supaUrl, serviceKey, { auth: { persistSession: false } });

  const startedAt = new Date().toISOString();
  const { data: runRow, error: runErr } = await supabase.from("ingestion_runs").insert({
    job_name: "corpus-enrichment-orchestrator",
    regulator_canonical,
    run_at: startedAt,
    started_at: startedAt,
    status: "queued",
    metadata: { total_rows, batch_size, dry_run, gap_ms },
  }).select("id").single();

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
      body: JSON.stringify({ regulator_canonical, max_rows: b.max_rows, offset: b.offset, dry_run }),
      signal: AbortSignal.timeout(160_000),
    });
    const j = await r.json().catch(() => ({}));
    return { offset: b.offset, ok: r.ok, status: r.status, counts: j.counts, llm_calls: j.llm_calls };
  };

  const work = (async () => {
    const totals: Record<string, number> = {
      selected: 0, corpus_enriched: 0, corpus_extraction_partial: 0,
      corpus_url_dead: 0, corpus_url_blocked: 0, corpus_url_timeout: 0,
      corpus_url_too_large: 0, update_errors: 0, llm_calls: 0,
    };
    const log: Array<Record<string, unknown>> = [];
    let consecutiveFailures = 0;

    await supabase.from("ingestion_runs").update({
      status: "running",
      notes: `Starting ${batches.length} batches of ${batch_size}`,
    }).eq("id", runId);

    for (let i = 0; i < batches.length; i++) {
      const b = batches[i];
      let result: Awaited<ReturnType<typeof callBatch>> | { offset: number; ok: false; error: string };
      try { result = await callBatch(b); }
      catch (e) { result = { offset: b.offset, ok: false, error: (e as Error).message }; }
      log.push(result);

      if (!(result as { ok: boolean }).ok) {
        consecutiveFailures++;
        if (consecutiveFailures >= 3) {
          await supabase.from("ingestion_runs").update({
            status: "failed",
            finished_at: new Date().toISOString(),
            completed_at: new Date().toISOString(),
            duration_ms: Date.now() - startedMs,
            error_message: `3 consecutive batch failures; last: ${JSON.stringify(result).slice(0, 1500)}`,
            errors: { totals, log },
            notes: `Aborted at batch ${i + 1}/${batches.length}`,
          }).eq("id", runId);
          return;
        }
      } else {
        consecutiveFailures = 0;
        const c = (result as { counts?: Record<string, number>; llm_calls?: number });
        if (c.counts) for (const k of Object.keys(totals)) totals[k] += (c.counts as Record<string, number>)[k] || 0;
        totals.llm_calls += c.llm_calls || 0;
        // Stop if a batch processed 0 rows (corpus exhausted)
        if ((c.counts?.selected ?? 0) === 0) break;
      }

      await supabase.from("ingestion_runs").update({
        rows_discovered: totals.selected,
        rows_matched_legacy: totals.corpus_enriched + totals.corpus_extraction_partial,
        rows_failed: totals.corpus_url_dead + totals.corpus_url_blocked + totals.corpus_url_timeout + totals.corpus_url_too_large + totals.update_errors,
        llm_calls_made: totals.llm_calls,
        llm_cost_usd: Math.round(totals.llm_calls * 0.0008 * 10000) / 10000,
        errors: { totals },
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
      rows_discovered: totals.selected,
      rows_matched_legacy: totals.corpus_enriched + totals.corpus_extraction_partial,
      rows_failed: totals.corpus_url_dead + totals.corpus_url_blocked + totals.corpus_url_timeout + totals.corpus_url_too_large + totals.update_errors,
      llm_calls_made: totals.llm_calls,
      llm_cost_usd: Math.round(totals.llm_calls * 0.0008 * 10000) / 10000,
      errors: { totals, batches: log.length },
      notes: `Completed ${log.length} batches`,
    }).eq("id", runId);
  })();

  if (typeof EdgeRuntime !== "undefined" && EdgeRuntime?.waitUntil) {
    EdgeRuntime.waitUntil(work);
  } else {
    work.catch((e) => console.error("orchestrator background error:", e));
  }

  return new Response(JSON.stringify({
    ok: true,
    run_id: runId,
    regulator_canonical,
    requested_rows: total_rows,
    batches_planned: batches.length,
    poll_hint: `SELECT status, notes, errors FROM ingestion_runs WHERE id = '${runId}'`,
  }), {
    status: 202,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
