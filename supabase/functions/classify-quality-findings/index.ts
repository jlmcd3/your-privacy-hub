// classify-quality-findings — CPPA-PRODUCT-1 L5.
//
// Reads failing quality_findings across all history, buckets by (check_id, tool),
// derives wave_number per batch from quality_campaigns.wave_number /
// last_wave_started_at / wave_interval_minutes, pulls grader_hash from
// quality_runs.grader_context_version, applies the change-controlled
// classification rules table, and upserts rows into
// public.quality_finding_backlog.
//
// Standing rule: BUILD_STAMP = actual build time at authoring, never projected.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { classify } from "../_shared/quality-backlog/classification-rules.ts";

const BUILD_STAMP = "classify-quality-findings@2026-07-24T07:18:44Z";

console.log(JSON.stringify({ evt: "boot", fn: "classify-quality-findings", build_stamp: BUILD_STAMP }));

interface Aggregate {
  check_id: string;
  tool: string;
  occurrence_count: number;
  first_seen_wave: number | null;
  last_seen_wave: number | null;
  grader_hash: string | null;
}

function deriveWave(
  batchStartedAt: string | null,
  campaign: {
    wave_number: number | null;
    last_wave_started_at: string | null;
    wave_interval_minutes: number | null;
  } | undefined | null,
): number | null {
  if (!campaign || campaign.wave_number == null) return null;
  const N = campaign.wave_number;
  if (!batchStartedAt || !campaign.last_wave_started_at || !campaign.wave_interval_minutes) {
    // No timing info — best available attribution is the current wave.
    return N;
  }
  const started = Date.parse(batchStartedAt);
  const lastWave = Date.parse(campaign.last_wave_started_at);
  const intervalMs = campaign.wave_interval_minutes * 60_000;
  if (!isFinite(started) || !isFinite(lastWave) || intervalMs <= 0) return N;
  const wavesBack = Math.floor((lastWave - started) / intervalMs);
  return Math.max(1, N - Math.max(0, wavesBack));
}

async function fetchAllPaginated<T>(
  supabase: any,
  table: string,
  select: string,
  filter?: (q: any) => any,
  pageSize = 1000,
): Promise<T[]> {
  const out: T[] = [];
  let from = 0;
  while (true) {
    let q = supabase.from(table).select(select).range(from, from + pageSize - 1);
    if (filter) q = filter(q);
    const { data, error } = await q;
    if (error) throw new Error(`select ${table}: ${error.message}`);
    if (!data || data.length === 0) break;
    out.push(...(data as T[]));
    if (data.length < pageSize) break;
    from += pageSize;
  }
  return out;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  try {
    // ---- Load campaigns (source of truth for wave timing) ----
    const campaigns = await fetchAllPaginated<{
      id: string;
      wave_number: number | null;
      last_wave_started_at: string | null;
      wave_interval_minutes: number | null;
    }>(supabase, "quality_campaigns", "id, wave_number, last_wave_started_at, wave_interval_minutes");
    const campaignById = new Map<string, { wave_number: number | null; last_wave_started_at: string | null; wave_interval_minutes: number | null }>();
    campaigns.forEach((c) => campaignById.set(c.id, c));

    // ---- Load batch runs; derive wave per batch, extract embedded run_ids ----
    const batches = await fetchAllPaginated<{
      campaign_id: string | null;
      tool_results: unknown;
      started_at: string | null;
    }>(supabase, "quality_batch_runs", "campaign_id, tool_results, started_at");

    // run_id -> {wave}
    const runWave = new Map<string, number | null>();
    for (const b of batches) {
      const camp = b.campaign_id ? campaignById.get(b.campaign_id) : null;
      const wave = deriveWave(b.started_at ?? null, camp ?? null);
      const blob = JSON.stringify(b.tool_results ?? {});
      const uuids = blob.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi) ?? [];
      for (const u of uuids) {
        const uLower = u.toLowerCase();
        // Widen the range: keep MIN wave (earliest sighting) — later reconciled per finding.
        const cur = runWave.get(uLower);
        if (cur == null || (wave != null && (cur == null || wave < cur))) {
          runWave.set(uLower, wave);
        }
      }
    }

    // ---- Load quality_runs for grader_context_version per run_id ----
    const runs = await fetchAllPaginated<{
      id: string;
      grader_context_version: string | null;
    }>(supabase, "quality_runs", "id, grader_context_version");
    const runGrader = new Map<string, string | null>();
    runs.forEach((r) => runGrader.set(r.id.toLowerCase(), r.grader_context_version ?? null));

    // ---- Load failing findings (paginated) ----
    const findings = await fetchAllPaginated<{
      check_id: string;
      tool: string;
      run_id: string;
      created_at: string;
    }>(
      supabase,
      "quality_findings",
      "check_id, tool, run_id, created_at",
      (q) => q.eq("passed", false),
      1000,
    );

    // ---- Aggregate ----
    const bucket = new Map<string, Aggregate>();
    for (const f of findings) {
      const key = `${f.tool}::${f.check_id}`;
      const runIdLower = (f.run_id ?? "").toLowerCase();
      const wave = runWave.has(runIdLower) ? runWave.get(runIdLower)! : null;
      const grader = runGrader.get(runIdLower) ?? null;
      const cur = bucket.get(key);
      if (!cur) {
        bucket.set(key, {
          check_id: f.check_id,
          tool: f.tool,
          occurrence_count: 1,
          first_seen_wave: wave,
          last_seen_wave: wave,
          grader_hash: grader,
        });
      } else {
        cur.occurrence_count += 1;
        if (wave != null) {
          cur.first_seen_wave = cur.first_seen_wave == null ? wave : Math.min(cur.first_seen_wave, wave);
          cur.last_seen_wave = cur.last_seen_wave == null ? wave : Math.max(cur.last_seen_wave, wave);
        }
        if (grader && !cur.grader_hash) cur.grader_hash = grader;
      }
    }
    const aggregates = Array.from(bucket.values());

    // ---- Upsert into backlog ----
    const upserts = aggregates.map((a) => {
      const rule = classify(a.check_id);
      const row: Record<string, unknown> = {
        finding_check_id: a.check_id,
        tool: a.tool,
        first_seen_wave: a.first_seen_wave,
        last_seen_wave: a.last_seen_wave,
        occurrence_count: a.occurrence_count,
        class: rule.class,
        proposed_lever: rule.lever,
        grader_hash: a.grader_hash,
      };
      // Only set status/notes when the rule specifies them, so operator
      // edits on rows without rule-supplied metadata are preserved on
      // conflict (absent keys aren't in EXCLUDED and won't overwrite).
      if (rule.status) row.status = rule.status;
      if (rule.notes) row.notes = rule.notes;
      return row;
    });

    let written = 0;
    const CHUNK = 200;
    for (let i = 0; i < upserts.length; i += CHUNK) {
      const chunk = upserts.slice(i, i + CHUNK);
      const { error } = await supabase
        .from("quality_finding_backlog")
        .upsert(chunk, { onConflict: "finding_check_id,tool" });
      if (error) throw new Error(`upsert quality_finding_backlog: ${error.message}`);
      written += chunk.length;
    }

    const summary = {
      ok: true,
      build_stamp: BUILD_STAMP,
      findings_scanned: findings.length,
      batches_scanned: batches.length,
      campaigns_scanned: campaigns.length,
      runs_scanned: runs.length,
      aggregates: aggregates.length,
      upserted: written,
      classified: upserts.filter((u) => u.class !== "unclassified").length,
      unclassified: upserts.filter((u) => u.class === "unclassified").length,
      with_wave: upserts.filter((u) => u.first_seen_wave != null).length,
      with_grader: upserts.filter((u) => u.grader_hash != null).length,
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
