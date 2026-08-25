/**
 * REPLAY-DPIA-HARNESS — DPIA clone of the ITEM 255 replay harness.
 *
 * Single-use capability pattern (identical to replay-cppa-risk-harness):
 *   Controller INSERTs a row into public.replay_harness_jobs
 *   (status='queued', tool='dpia', doc_ids[]). GET ?run=1&job=<uuid> flips it
 *   to 'running' via atomic CAS. The random job UUID is the capability.
 *
 * Caps: <= 50 doc_ids. Per-doc failures append "harness_error:<msg>" to that
 * doc's per_doc_result.hard_failures and CONTINUE the batch.
 *
 * NO model calls anywhere: the harness runs the DETERMINISTIC PHASE ONLY
 * (builders → attestation → skeleton assembler). NO writes to dpia_frameworks.
 * Results land in service-role-locked public.replay_harness_results.
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { replayDpiaDoc, DPIA_REPLAY_STAMP } from "./_local/ltp/replay/dpia-replay.ts";

export const HARNESS_BUILD_STAMP = "replay-dpia-harness-2026-08-17-so-clone";

const MAX_DOC_IDS = 50;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function serviceClient() {
  const url = Deno.env.get("SUPABASE_URL")!;
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  return createClient(url, key, { auth: { persistSession: false } });
}

interface HarnessJobRow {
  id: string;
  doc_ids: string[];
  status: string;
  options: Record<string, unknown> | null;
}

/** ITEM 260 — reaper. Any job left 'running' > 15 minutes is isolate-dead. */
async function reapStaleJobs(sb: ReturnType<typeof serviceClient>): Promise<void> {
  const cutoff = new Date(Date.now() - 15 * 60 * 1000).toISOString();
  const { error } = await sb
    .from("replay_harness_jobs")
    .update({
      status: "error",
      finished_at: new Date().toISOString(),
      error: "reaper:stale_running_over_15m",
    })
    .eq("status", "running")
    .eq("tool", "dpia")
    .lt("started_at", cutoff);
  if (error) console.error("[dpia-harness] reaper_failed", error.message);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  const url = new URL(req.url);

  const sb = serviceClient();
  await reapStaleJobs(sb);

  if (url.searchParams.get("ping") === "1") {
    return json({
      ok: true,
      harness_build_stamp: HARNESS_BUILD_STAMP,
      replay_stamp: DPIA_REPLAY_STAMP,
      model_calls: 0,
      deterministic_only: true,
    });
  }

  if (url.searchParams.get("run") !== "1") {
    return json({ error: "expected ?run=1&job=<uuid> or ?ping=1" }, 400);
  }
  const jobId = url.searchParams.get("job");
  if (!jobId) return json({ error: "missing_job_id" }, 400);

  // Atomic CAS: queued -> running. Rejects replay/double-fire.
  const casRes = await sb
    .from("replay_harness_jobs")
    .update({ status: "running", started_at: new Date().toISOString() })
    .eq("id", jobId)
    .eq("status", "queued")
    .eq("tool", "dpia")
    .select("id, doc_ids, status, options")
    .maybeSingle();
  if (casRes.error) return json({ error: `cas_failed:${casRes.error.message}` }, 500);
  const job = casRes.data as HarnessJobRow | null;
  if (!job) return json({ error: "job_not_queued_or_not_found" }, 409);

  const docIds = Array.isArray(job.doc_ids) ? job.doc_ids : [];
  if (docIds.length === 0 || docIds.length > MAX_DOC_IDS) {
    await sb.from("replay_harness_jobs")
      .update({
        status: "error",
        finished_at: new Date().toISOString(),
        error: `harness_error:invalid_doc_ids_length:${docIds.length}`,
      })
      .eq("id", job.id);
    return json({
      error: "invalid_doc_ids_length",
      job_id: job.id,
      length: docIds.length,
      max: MAX_DOC_IDS,
    }, 400);
  }

  const jobOptions = (job.options ?? {}) as Record<string, unknown>;
  const unitsMinimal = jobOptions.units_minimal === false ? false : true;

  const er = (globalThis as any).EdgeRuntime;
  const hasWaitUntil = typeof er?.waitUntil === "function";
  {
    const prior = await sb.from("replay_harness_jobs")
      .select("notes").eq("id", job.id).maybeSingle();
    const priorNotes = (prior.data?.notes as string | null) ?? "";
    await sb.from("replay_harness_jobs")
      .update({
        notes: `${priorNotes}${priorNotes ? " " : ""}[bg:${hasWaitUntil ? "waitUntil" : "inline"}]`,
      })
      .eq("id", job.id);
  }

  const wrapped = (async () => {
    const summary: Record<string, unknown>[] = [];
    try {
      for (const rawId of docIds) {
        const docId = String(rawId);
        // READ-ONLY load from dpia_frameworks. Nothing here ever writes back.
        const { data, error } = await sb
          .from("dpia_frameworks")
          .select("id, intake_data, report_data")
          .eq("id", docId)
          .maybeSingle();

        const outcome = (error || !data)
          ? {
            perDoc: {
              doc_id: docId,
              tool: "dpia" as const,
              provider_kind: "deterministic" as const,
              replay_stamp: DPIA_REPLAY_STAMP,
              assembler_stamp: "",
              builders: { deliverables: null, attestation: null },
              determination: null,
              band_counts: {},
              gap_ledger_size: 0,
              surfaces_present: [],
              surfaces_absent: [],
              conformance_findings: 0,
              register_findings: [],
              sections: 0,
              hard_failures: [
                `harness_error:${error ? `load:${error.message}` : "row_not_found"}`,
              ],
            },
            sideBySide: null,
            assembledReport: null,
          }
          : replayDpiaDoc(
            {
              id: String((data as any).id),
              intake_data: ((data as any).intake_data ?? {}) as Record<string, unknown>,
              report_data: ((data as any).report_data ?? null) as Record<string, unknown> | null,
            },
            { unitsMinimal },
          );

        const ins = await sb.from("replay_harness_results").insert({
          job_id: job.id,
          doc_id: docId,
          per_doc_result: outcome.perDoc,
          side_by_side: outcome.sideBySide,
          pass1_usage: { model_calls: 0, deterministic_only: true },
          assembled_report: outcome.assembledReport
            ? { skeleton_document: outcome.assembledReport }
            : null,
        }).select("id").maybeSingle();

        summary.push({
          doc_id: docId,
          hard_failure_count: outcome.perDoc.hard_failures.length,
          blocks_changed: outcome.sideBySide?.summary.blocks_changed ?? null,
          ...(ins.error ? { insert_error: ins.error.message } : {}),
        });
      }

      await sb.from("replay_harness_jobs")
        .update({ status: "done", finished_at: new Date().toISOString() })
        .eq("id", job.id);
      console.log("[dpia-harness] job_done", job.id, "docs", summary.length);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      await sb.from("replay_harness_jobs")
        .update({
          status: "error",
          finished_at: new Date().toISOString(),
          error: `harness_error:top_level:${msg}`,
        })
        .eq("id", job.id);
      console.error("[dpia-harness] job_top_level_error", job.id, msg);
    }
  })();

  if (hasWaitUntil) {
    er.waitUntil(wrapped);
    return json({
      accepted: true,
      job_id: job.id,
      docs: docIds.length,
      harness_build_stamp: HARNESS_BUILD_STAMP,
    }, 202);
  }

  await wrapped;
  return json({
    accepted: true,
    job_id: job.id,
    docs: docIds.length,
    harness_build_stamp: HARNESS_BUILD_STAMP,
    background: "inline",
  }, 202);
});
