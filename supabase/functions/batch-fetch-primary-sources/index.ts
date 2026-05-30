// Batch orchestrator for fetch-and-extract-primary-source.
// Queries enforcement_actions where primary_source_status = 'pending_fetch'
// and dispatches fetch-and-extract-primary-source for each row.
// Safe to call repeatedly — already-processed rows are skipped automatically.
// Designed to be run manually from the admin dashboard or via ad-hoc invocation.
//
// Query params:
//   ?limit=N     — max rows to process (default 20, max 50)
//   ?dry_run=true — log what would be processed without fetching
//   ?regulator=X  — filter to a specific regulator (e.g. "FTC")
//   ?source=X     — filter to a source_database value (e.g. "FTC")

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-admin-token",
};

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
  const limit = Math.min(
    parseInt(url.searchParams.get("limit") ?? "20"),
    50,
  );
  const dryRun = url.searchParams.get("dry_run") === "true";
  const regulatorFilter = url.searchParams.get("regulator") ?? null;
  const sourceFilter = url.searchParams.get("source") ?? null;

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );

  let query = supabase
    .from("enforcement_actions")
    .select("id, regulator, jurisdiction, primary_source_url, decision_date, regulator_canonical")
    .eq("primary_source_status", "pending_fetch")
    .not("primary_source_url", "is", null)
    .order("decision_date", { ascending: false })
    .limit(limit);

  if (regulatorFilter) {
    query = query.ilike("regulator", `%${regulatorFilter}%`);
  }
  if (sourceFilter) {
    query = query.eq("source_database", sourceFilter);
  }

  const { data: rows, error } = await query;
  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (!rows || rows.length === 0) {
    return new Response(
      JSON.stringify({
        ok: true,
        message: "No pending_fetch records found matching the filter.",
        pending_count: 0,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  if (dryRun) {
    return new Response(
      JSON.stringify({
        ok: true,
        dry_run: true,
        would_process: rows.length,
        rows: rows.map((r) => ({
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

  for (const row of rows) {
    try {
      const resp = await fetch(
        `${baseUrl}/functions/v1/fetch-and-extract-primary-source`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-admin-token": adminToken,
          },
          body: JSON.stringify({
            row_id: row.id,
            regulator_canonical_alias: row.regulator_canonical ?? null,
          }),
        },
      );

      if (!resp.ok) {
        results.fetch_failed++;
        results.errors.push(
          `${row.id} (${row.regulator}): HTTP ${resp.status}`,
        );
        continue;
      }

      const data = await resp.json();
      const status = data.primary_source_status ?? "unknown";
      results.processed++;

      if (status === "extracted_verbatim") results.extracted_verbatim++;
      else if (status === "extracted_unverified") results.extracted_unverified++;
      else if (status === "fetched_partial") results.fetched_partial++;
      else results.fetch_failed++;

      // Reset enrichment_version to 0 so enrich-enforcement re-processes
      // this record with the newly fetched text.
      if (status === "extracted_verbatim" || status === "extracted_unverified") {
        await supabase
          .from("enforcement_actions")
          .update({ enrichment_version: 0 })
          .eq("id", row.id);
      }

      await new Promise((r) => setTimeout(r, 1500));
    } catch (e) {
      results.fetch_failed++;
      results.errors.push(`${row.id}: ${(e as Error).message}`);
    }
  }

  // Trigger enrich-enforcement for the records we just reset.
  if (results.extracted_verbatim + results.extracted_unverified > 0) {
    try {
      await fetch(
        `${baseUrl}/functions/v1/enrich-enforcement?limit=${results.extracted_verbatim + results.extracted_unverified}`,
        {
          method: "GET",
          headers: { "Content-Type": "application/json" },
        },
      );
    } catch (e) {
      console.warn("enrich-enforcement trigger failed:", (e as Error).message);
    }
  }

  return new Response(
    JSON.stringify({
      ok: true,
      queried: rows.length,
      ...results,
    }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});
