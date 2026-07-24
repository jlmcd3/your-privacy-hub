// classify-quality-findings — CPPA-PRODUCT-1 L5.
//
// Reads new quality_findings since the last run, buckets by (check_id, tool),
// derives wave_number + grader_hash via quality_batch_runs -> quality_campaigns,
// applies the change-controlled classification rules table, and upserts rows
// into public.quality_finding_backlog. On first run (backlog empty) it
// backfills across ALL waves and all ten tools.
//
// Standing rule: BUILD_STAMP = actual build time at authoring, never projected.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { classify } from "../_shared/quality-backlog/classification-rules.ts";

const BUILD_STAMP = "classify-quality-findings@2026-07-24T06:42:28Z";

console.log(JSON.stringify({ evt: "boot", fn: "classify-quality-findings", build_stamp: BUILD_STAMP }));

interface Aggregate {
  check_id: string;
  tool: string;
  occurrence_count: number;
  first_seen_wave: number | null;
  last_seen_wave: number | null;
  grader_hash: string | null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  try {
    // Aggregate failing findings across ALL history, joining through
    // quality_batch_runs.tool_results (jsonb) to reach quality_campaigns for
    // wave_number + grader_context_version.
    const aggSql = `
      WITH run_wave AS (
        SELECT DISTINCT ON (qr.id)
          qr.id AS run_id,
          qc.wave_number,
          qc.grader_context_version AS grader_hash
        FROM public.quality_runs qr
        LEFT JOIN public.quality_batch_runs qbr
          ON qbr.tool_results::text LIKE '%' || qr.id::text || '%'
        LEFT JOIN public.quality_campaigns qc
          ON qc.id = qbr.campaign_id
        ORDER BY qr.id, qbr.started_at DESC NULLS LAST
      )
      SELECT
        f.check_id,
        f.tool,
        COUNT(*)::int                                    AS occurrence_count,
        MIN(rw.wave_number)::int                         AS first_seen_wave,
        MAX(rw.wave_number)::int                         AS last_seen_wave,
        (array_agg(rw.grader_hash ORDER BY f.created_at DESC)
          FILTER (WHERE rw.grader_hash IS NOT NULL))[1]  AS grader_hash
      FROM public.quality_findings f
      LEFT JOIN run_wave rw ON rw.run_id = f.run_id
      WHERE f.passed = false
      GROUP BY f.check_id, f.tool
    `;

    const { data: rows, error: aggErr } = await supabase.rpc("exec_sql_readonly", { sql: aggSql }).catch(() => ({ data: null, error: { message: "rpc_missing" } as any }));

    let aggregates: Aggregate[];
    if (aggErr || !rows) {
      // Fallback: no exec_sql_readonly RPC available — do it client-side.
      const { data: findings, error: fErr } = await supabase
        .from("quality_findings")
        .select("check_id, tool, run_id, created_at")
        .eq("passed", false);
      if (fErr) throw fErr;

      const { data: batches } = await supabase
        .from("quality_batch_runs")
        .select("campaign_id, tool_results, started_at");
      const { data: campaigns } = await supabase
        .from("quality_campaigns")
        .select("id, wave_number, grader_context_version");

      const campaignById = new Map<string, { wave_number: number | null; grader_context_version: string | null }>();
      (campaigns ?? []).forEach((c: any) => campaignById.set(c.id, c));

      // run_id -> {wave, grader}
      const runWave = new Map<string, { wave: number | null; grader: string | null }>();
      (batches ?? []).forEach((b: any) => {
        const camp = b.campaign_id ? campaignById.get(b.campaign_id) : null;
        const wave = camp?.wave_number ?? null;
        const grader = camp?.grader_context_version ?? null;
        const blob = JSON.stringify(b.tool_results ?? {});
        // extract UUIDs in tool_results
        const uuids = blob.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi) ?? [];
        for (const u of uuids) {
          if (!runWave.has(u)) runWave.set(u, { wave, grader });
        }
      });

      const bucket = new Map<string, Aggregate>();
      (findings ?? []).forEach((f: any) => {
        const key = `${f.tool}::${f.check_id}`;
        const rw = runWave.get(f.run_id) ?? { wave: null, grader: null };
        const cur = bucket.get(key);
        if (!cur) {
          bucket.set(key, {
            check_id: f.check_id,
            tool: f.tool,
            occurrence_count: 1,
            first_seen_wave: rw.wave,
            last_seen_wave: rw.wave,
            grader_hash: rw.grader,
          });
        } else {
          cur.occurrence_count += 1;
          if (rw.wave != null) {
            cur.first_seen_wave = cur.first_seen_wave == null ? rw.wave : Math.min(cur.first_seen_wave, rw.wave);
            cur.last_seen_wave = cur.last_seen_wave == null ? rw.wave : Math.max(cur.last_seen_wave, rw.wave);
          }
          if (rw.grader && !cur.grader_hash) cur.grader_hash = rw.grader;
        }
      });
      aggregates = Array.from(bucket.values());
    } else {
      aggregates = rows as Aggregate[];
    }

    // Upsert into quality_finding_backlog. On conflict merge counts + widen
    // wave range; keep existing status/notes intact.
    const upserts = aggregates.map((a) => {
      const rule = classify(a.check_id);
      return {
        finding_check_id: a.check_id,
        tool: a.tool,
        first_seen_wave: a.first_seen_wave,
        last_seen_wave: a.last_seen_wave,
        occurrence_count: a.occurrence_count,
        class: rule.class,
        proposed_lever: rule.lever,
        grader_hash: a.grader_hash,
      };
    });

    let written = 0;
    const CHUNK = 200;
    for (let i = 0; i < upserts.length; i += CHUNK) {
      const chunk = upserts.slice(i, i + CHUNK);
      const { error } = await supabase
        .from("quality_finding_backlog")
        .upsert(chunk, { onConflict: "finding_check_id,tool" });
      if (error) throw error;
      written += chunk.length;
    }

    const summary = {
      ok: true,
      build_stamp: BUILD_STAMP,
      aggregates: aggregates.length,
      upserted: written,
      classified: upserts.filter((u) => u.class !== "unclassified").length,
      unclassified: upserts.filter((u) => u.class === "unclassified").length,
    };
    console.log(JSON.stringify({ evt: "classify_done", ...summary }));

    return new Response(JSON.stringify(summary), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error(JSON.stringify({ evt: "classify_failed", error: msg }));
    return new Response(JSON.stringify({ ok: false, error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
