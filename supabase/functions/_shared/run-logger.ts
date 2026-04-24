// Shared helper to record cron/ingestion run telemetry into `ingestion_runs`.
// Usage:
//   const run = await startRun(supabase, 'fetch-newsapi');
//   try { ...; await finishRun(supabase, run, { fetched, inserted, enriched }); }
//   catch (e) { await failRun(supabase, run, e); throw e; }

import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

export interface RunHandle {
  id: string;
  job_name: string;
  started_at: string;
  startedMs: number;
}

export interface RunResultCounts {
  fetched?: number;
  inserted?: number;
  skipped?: number;
  enriched?: number;
  enrichmentFailed429?: number;
  enrichmentFailedOther?: number;
  metadata?: Record<string, unknown>;
  status?: "success" | "partial" | "error";
}

export function getServiceClient(): SupabaseClient {
  const url = Deno.env.get("SUPABASE_URL")!;
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  return createClient(url, key, { auth: { persistSession: false } });
}

export async function startRun(
  supabase: any,
  jobName: string,
  metadata: Record<string, unknown> = {},
): Promise<RunHandle> {
  const startedAt = new Date().toISOString();
  const { data, error } = await supabase
    .from("ingestion_runs")
    .insert({
      job_name: jobName,
      run_at: startedAt,
      started_at: startedAt,
      status: "running",
      metadata,
    })
    .select("id")
    .single();

  if (error || !data) {
    console.error(`[run-logger] startRun failed for ${jobName}:`, error);
    // Return a handle with empty id; subsequent updates will no-op but won't break the job.
    return { id: "", job_name: jobName, started_at: startedAt, startedMs: Date.now() };
  }
  return { id: data.id, job_name: jobName, started_at: startedAt, startedMs: Date.now() };
}

export async function finishRun(
  supabase: any,
  run: RunHandle,
  result: RunResultCounts = {},
): Promise<void> {
  if (!run.id) return;
  const finishedAt = new Date().toISOString();
  const durationMs = Date.now() - run.startedMs;
  const status = result.status
    ?? ((result.enrichmentFailed429 ?? 0) + (result.enrichmentFailedOther ?? 0) > 0 ? "partial" : "success");

  const { error } = await supabase
    .from("ingestion_runs")
    .update({
      finished_at: finishedAt,
      duration_ms: durationMs,
      status,
      fetched: result.fetched ?? 0,
      inserted: result.inserted ?? 0,
      skipped: result.skipped ?? 0,
      enriched: result.enriched ?? 0,
      summaries_generated: result.enriched ?? 0,
      enrichment_failed_429: result.enrichmentFailed429 ?? 0,
      enrichment_failed_other: result.enrichmentFailedOther ?? 0,
      metadata: result.metadata ?? {},
    })
    .eq("id", run.id);

  if (error) console.error(`[run-logger] finishRun failed for ${run.job_name}:`, error);
}

export async function failRun(
  supabase: any,
  run: RunHandle,
  err: unknown,
  partialCounts: RunResultCounts = {},
): Promise<void> {
  if (!run.id) return;
  const finishedAt = new Date().toISOString();
  const durationMs = Date.now() - run.startedMs;
  const message = err instanceof Error ? `${err.name}: ${err.message}` : String(err);

  const { error } = await supabase
    .from("ingestion_runs")
    .update({
      finished_at: finishedAt,
      duration_ms: durationMs,
      status: "error",
      error_message: message.slice(0, 2000),
      fetched: partialCounts.fetched ?? 0,
      inserted: partialCounts.inserted ?? 0,
      skipped: partialCounts.skipped ?? 0,
      enriched: partialCounts.enriched ?? 0,
      summaries_generated: partialCounts.enriched ?? 0,
      enrichment_failed_429: partialCounts.enrichmentFailed429 ?? 0,
      enrichment_failed_other: partialCounts.enrichmentFailedOther ?? 0,
      metadata: partialCounts.metadata ?? {},
    })
    .eq("id", run.id);

  if (error) console.error(`[run-logger] failRun failed for ${run.job_name}:`, error);
}
