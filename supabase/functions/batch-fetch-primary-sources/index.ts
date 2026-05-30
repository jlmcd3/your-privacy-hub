// Batch orchestrator for fetch-and-extract-primary-source.
// Queries enforcement_actions where primary_source_status = 'pending_fetch'
// and dispatches fetch-and-extract-primary-source for each row.
// Safe to call repeatedly — already-processed rows are skipped automatically.
//
// Query params:
//   ?limit=N      — max rows to process (default 20, max 50)
//   ?dry_run=true — log what would be processed without fetching
//   ?regulator=X  — filter to a specific regulator (e.g. "FTC")
//   ?source=X     — filter to a source_database value (e.g. "FTC")
//
// Body (optional):
//   { "run_id": "<uuid>" } — if present, the function streams per-row
//   progress into public.primary_source_fetch_runs for live UI tailing.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-admin-token",
};

type Event = { ts: string; level: "info" | "ok" | "warn" | "error"; msg: string };

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const adminTok = req.headers.get("x-admin-token");
  if (!adminTok || adminTok !== Deno.env.get("ADMIN_SECRET_TOKEN")) {
    return new Response(JSON.stringify({ error: "unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const url = new URL(req.url);
  const limit = Math.min(parseInt(url.searchParams.get("limit") ?? "20"), 50);
  const dryRun = url.searchParams.get("dry_run") === "true";
  const regulatorFilter = url.searchParams.get("regulator") ?? null;
  const sourceFilter = url.searchParams.get("source") ?? null;

  let runId: string | null = null;
  if (req.method === "POST") {
    try {
      const body = await req.json();
      if (body && typeof body.run_id === "string") runId = body.run_id;
    } catch (_) { /* no body, ignore */ }
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );

  // ---- run-log helpers --------------------------------------------------
  const events: Event[] = [];
  const log = async (level: Event["level"], msg: string) => {
    const ev: Event = { ts: new Date().toISOString(), level, msg };
    events.push(ev);
    console.log(`[${level}] ${msg}`);
    if (runId) {
      // Replace whole events array — cheap for batches of <=50.
      await supabase
        .from("primary_source_fetch_runs")
        .update({ events: events as unknown as object })
        .eq("id", runId);
    }
  };

  const patchRun = async (patch: Record<string, unknown>) => {
    if (!runId) return;
    await supabase
      .from("primary_source_fetch_runs")
      .update(patch)
      .eq("id", runId);
  };

  await patchRun({ status: "running", started_at: new Date().toISOString() });
  await log("info", `Starting ${dryRun ? "DRY-RUN" : "real run"} (limit=${limit}, source=${sourceFilter ?? "*"}, regulator=${regulatorFilter ?? "*"})`);

  // ---- query candidates -------------------------------------------------
  let query = supabase
    .from("enforcement_actions")
    .select("id, regulator, jurisdiction, primary_source_url, decision_date, regulator_canonical")
    .eq("primary_source_status", "pending_fetch")
    .not("primary_source_url", "is", null)
    .order("decision_date", { ascending: false })
    .limit(limit);

  if (regulatorFilter) query = query.ilike("regulator", `%${regulatorFilter}%`);
  if (sourceFilter) query = query.eq("source_database", sourceFilter);

  const { data: rows, error } = await query;
  if (error) {
    await log("error", `Query failed: ${error.message}`);
    await patchRun({ status: "error", error: error.message, completed_at: new Date().toISOString() });
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const queriedCount = rows?.length ?? 0;
  await patchRun({ queried: queriedCount });
  await log("info", `Matched ${queriedCount} pending_fetch row(s).`);

  if (queriedCount === 0) {
    await patchRun({ status: "complete", completed_at: new Date().toISOString() });
    return new Response(
      JSON.stringify({ ok: true, message: "No pending_fetch records found.", pending_count: 0 }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  if (dryRun) {
    for (const r of rows!) {
      await log("info", `[dry] ${r.regulator ?? "?"} • ${r.decision_date ?? "—"} • ${r.primary_source_url}`);
    }
    await patchRun({ status: "complete", completed_at: new Date().toISOString() });
    return new Response(
      JSON.stringify({
        ok: true,
        dry_run: true,
        would_process: rows!.length,
        rows: rows!.map((r) => ({
          id: r.id,
          regulator: r.regulator,
          jurisdiction: r.jurisdiction,
          url: r.primary_source_url,
          date: r.decision_date,
        })),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  // ---- real run ---------------------------------------------------------
  const baseUrl = Deno.env.get("SUPABASE_URL")!;
  const adminToken = Deno.env.get("ADMIN_SECRET_TOKEN")!;

  const results = {
    processed: 0,
    extracted_verbatim: 0,
    extracted_unverified: 0,
    fetched_partial: 0,
    fetch_failed: 0,
    errors: [] as string[],
  };

  for (const row of rows!) {
    const label = `${row.regulator ?? "?"} ${row.id.slice(0, 8)}`;
    try {
      const resp = await fetch(`${baseUrl}/functions/v1/fetch-and-extract-primary-source`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-admin-token": adminToken },
        body: JSON.stringify({
          row_id: row.id,
          regulator_canonical_alias: row.regulator_canonical ?? null,
        }),
      });

      if (!resp.ok) {
        results.fetch_failed++;
        const errTxt = `HTTP ${resp.status}`;
        results.errors.push(`${row.id} (${row.regulator}): ${errTxt}`);
        await log("error", `${label} → ${errTxt}`);
      } else {
        const data = await resp.json();
        const status = data.primary_source_status ?? "unknown";
        results.processed++;
        if (status === "extracted_verbatim") {
          results.extracted_verbatim++;
          await log("ok", `${label} → extracted_verbatim`);
        } else if (status === "extracted_unverified") {
          results.extracted_unverified++;
          await log("ok", `${label} → extracted_unverified`);
        } else if (status === "fetched_partial") {
          results.fetched_partial++;
          await log("warn", `${label} → fetched_partial`);
        } else {
          results.fetch_failed++;
          await log("warn", `${label} → ${status}`);
        }

        if (status === "extracted_verbatim" || status === "extracted_unverified") {
          await supabase
            .from("enforcement_actions")
            .update({ enrichment_version: 0 })
            .eq("id", row.id);
        }
      }
    } catch (e) {
      results.fetch_failed++;
      const msg = (e as Error).message;
      results.errors.push(`${row.id}: ${msg}`);
      await log("error", `${label} → ${msg}`);
    }

    await patchRun({
      processed: results.processed,
      extracted_verbatim: results.extracted_verbatim,
      extracted_unverified: results.extracted_unverified,
      fetched_partial: results.fetched_partial,
      fetch_failed: results.fetch_failed,
    });

    await new Promise((r) => setTimeout(r, 1500));
  }

  if (results.extracted_verbatim + results.extracted_unverified > 0) {
    await log("info", `Triggering enrich-enforcement for ${results.extracted_verbatim + results.extracted_unverified} record(s).`);
    try {
      await fetch(
        `${baseUrl}/functions/v1/enrich-enforcement?limit=${results.extracted_verbatim + results.extracted_unverified}`,
        { method: "GET", headers: { "Content-Type": "application/json" } },
      );
    } catch (e) {
      await log("warn", `enrich-enforcement trigger failed: ${(e as Error).message}`);
    }
  }

  await log("info", `Done. processed=${results.processed} failed=${results.fetch_failed}`);
  await patchRun({ status: "complete", completed_at: new Date().toISOString() });

  return new Response(
    JSON.stringify({ ok: true, queried: rows!.length, ...results }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});
