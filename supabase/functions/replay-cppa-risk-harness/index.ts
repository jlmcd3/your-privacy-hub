/**
 * ITEM 255 — TRACK 2 / SPEC §7.1 Stage B(2) REPLAY HARNESS ENDPOINT.
 *
 * Single-use capability pattern:
 *   Controller INSERTs a row into public.replay_harness_jobs (status='queued'
 *   with doc_ids[]) via query_database. GET ?run=1&job=<uuid> flips the row to
 *   'running' via atomic CAS (UPDATE ... WHERE status='queued' RETURNING).
 *   If 0 rows returned, request is rejected. The random job UUID is the
 *   capability; unauthenticated calls without a valid queued job id do
 *   nothing.
 *
 * Absolute caps: <= 50 doc_ids per job. Per-doc failures append
 * "harness_error:<msg>" to that doc's per_doc_result.hard_failures and
 * CONTINUE the batch (fail-loud, never silent).
 *
 * NO customer-facing surface. Results rows live in service-role-locked
 * public.replay_harness_results.
 */
import { evaluateGtm } from "../_shared/ltp/replay/gtm-grader.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

import { PASS1_MANIFEST } from "../_shared/ltp/pass1-llm.ts";
import { MINED_PRESENCE_BAND, defaultSubstanceGateConfig }
  from "../_shared/ltp/replay/presence-band.ts";
import { modelProvider } from "../_shared/ltp/replay/providers.ts";
import { normalizeEraIntake } from "../_shared/ltp/replay/era-normalize.ts";

import { assembleReport } from "../_shared/ltp/pass2-assembler.ts";
import { runProsePassStage, PASS2R_MANIFEST } from "../_shared/ltp/pass2r-llm.ts";
import { evaluateSubstance } from "../_shared/ltp/replay/substance-gates.ts";
import { compareDoc } from "../_shared/ltp/replay/side-by-side.ts";
import type { PerDocResult, ReplayDoc, SideBySideRow }
  from "../_shared/ltp/replay/types.ts";

export const HARNESS_BUILD_STAMP =
  "replay-cppa-risk-harness-2026-07-30-item278-prose-pass";


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
  /**
   * ITEM 278 — additive, nullable. Read as `{ prose_pass?: boolean }`.
   * Absent / malformed reads as prose_pass=false, so every pre-Item-278 job
   * and every current caller is unchanged.
   */
  options: Record<string, unknown> | null;
}

interface ArchivedDoc {
  id: string;
  intake_data: Record<string, unknown>;
  report_data: Record<string, unknown> | null;
}

async function loadArchivedDoc(
  sb: ReturnType<typeof serviceClient>,
  docId: string,
): Promise<ArchivedDoc | { error: string }> {
  // ITEM 256: PostgREST does not expose the quality_archive schema
  // (INTENTIONAL — the archive sits outside the app's exposed API surface).
  // Access is via a narrow SECURITY DEFINER RPC that returns exactly one
  // row shape and is execute-locked to service_role.
  const { data, error } = await sb.rpc("replay_harness_fetch_doc", {
    p_doc_id: docId,
  });
  if (error) return { error: `archive_rpc:${error.message}` };
  const rows = (data ?? []) as Array<{
    id: string;
    intake_data: Record<string, unknown> | null;
    report_data: Record<string, unknown> | null;
  }>;
  if (rows.length === 0) return { error: "archive_row_not_found" };
  const row = rows[0];
  return {
    id: row.id,
    intake_data: (row.intake_data ?? {}) as Record<string, unknown>,
    report_data: (row.report_data ?? null) as Record<string, unknown> | null,
  };
}

interface DocProcessOutcome {
  perDoc: PerDocResult;
  sideBySide: SideBySideRow | null;
  pass1Usage: Record<string, unknown>;
  assembledReport: Record<string, unknown> | null;
  /**
   * ITEM 287 FIX 5 — PERSIST-FIRST. The locked plan is carried out of the
   * deterministic phase so the caller can persist the row FIRST and run
   * Pass-2R afterwards, against the same plan.
   */
  plan: unknown | null;
}

/**
 * ITEM 287 FIX 5 — DETERMINISTIC PHASE ONLY (Pass-1 + assembly + gates).
 * Pass-2R no longer runs inside this function: the harness persists this
 * result before any 2R call, so isolate death during 2R costs only the 2R
 * telemetry, never the document.
 */
async function processDoc(
  doc: ArchivedDoc,
): Promise<DocProcessOutcome> {
  try {
    // ITEM 269 FIX 1 — ERA NORMALIZER. Pre-realignment (five-stage-shaped)
    // archive rows are normalized to the flat contract keys BEFORE Pass-1
    // using the production mapping (`resolveIntakeForTestStates`) and the
    // V1→V2 band resolvers. Fail-open; unmapped legacy keys pass through.
    const era = normalizeEraIntake(doc.intake_data);
    const replayDoc: ReplayDoc = {
      doc_id: doc.id,
      intake_data: era.intake,
      legacy_report: doc.report_data ?? undefined,
    };
    const p1 = await modelProvider({
      intake: replayDoc.intake_data,
      report_data: {},
      buildStamp: `${HARNESS_BUILD_STAMP}#${doc.id}`,
    }, { callerName: "replay-cppa-risk-harness" });

    const assembled = assembleReport(p1.plan, {}, { exitMode: "observe" });
    const substance = evaluateSubstance(
      p1.plan,
      assembled,
      defaultSubstanceGateConfig(),
    );

    // Structure metrics — mirror runner.ts (kept minimal here, we do
    // not re-import the private summarizer).
    const sections =
      (assembled.telemetry as unknown as { sections?: Array<Record<string, unknown>> })
        .sections ?? [];
    const sectionsEmitted =
      sections.filter((s) => s.emitted).length ||
      assembled.telemetry.emitted_sections;
    const sectionsOmittedByClass: Record<string, number> = {};
    for (const s of sections) {
      if (s.emitted) continue;
      const cls = (s.omitted_reason_class as string | undefined) ?? "unknown";
      sectionsOmittedByClass[cls] = (sectionsOmittedByClass[cls] ?? 0) + 1;
    }

    const perDoc: PerDocResult = {
      doc_id: doc.id,
      provider_kind: "model",
      pass1_telemetry_summary: {
        ok: p1.telemetry.ok,
        attempts: p1.telemetry.attempts,
        write_around: p1.telemetry.write_around,
        grounded_note_replacement_rate:
          p1.telemetry.grounded_note_replacement_rate ?? 0,
      },
      substance: substance.metrics,
      structure: {
        sections_emitted: sectionsEmitted,
        sections_omitted_by_class: sectionsOmittedByClass,
      },
      hard_failures: substance.hard_failures,
    };

    const sideBySide = doc.report_data ? compareDoc(perDoc, doc.report_data) : null;


    // Pass-1 usage passthrough:
    // NOTE for controller/CEO: `runPass1Llm` does NOT currently surface the
    // per-call Anthropic usage (input_tokens/output_tokens/cache_*) up to
    // Pass1Telemetry. `anthropic-call.ts` DOES expose them on
    // `AnthropicCallResult` (see file: inputTokens/outputTokens/
    // cacheReadTokens/cacheCreationTokens), but a passthrough into
    // Pass1Telemetry has not been wired (would be a future optional
    // passthrough — NOT modified this turn per scope). Until that lands,
    // we record attempt-level timing only.
    const pass1Usage = {
      attempts: p1.telemetry.attempts,
      latency_ms: p1.telemetry.latency_ms,
      per_attempt_timeout_ms: p1.telemetry.per_attempt_timeout_ms,
      attempts_detail: p1.telemetry.attempts_detail,
      write_around: p1.telemetry.write_around,
      validator_issues: p1.telemetry.validator_issues,
      grounded_note: p1.telemetry.grounded_note ?? null,
      // ITEM 269 FIX 1 transparency record.
      intake_era_normalization: {
        applied: era.telemetry.applied,
        mapped_keys: era.telemetry.mapped_keys,
        mapped_key_names: era.telemetry.mapped_key_names,
        unmapped_legacy_keys: era.telemetry.unmapped_legacy_keys,
        band_labels_resolved: era.telemetry.band_labels_resolved,
        version: era.telemetry.version,
      },
      note: "token_usage_not_surfaced_by_runPass1Llm_2026-07-29",

    };

    return {
      perDoc,
      sideBySide,
      pass1Usage,
      assembledReport: assembled.report as Record<string, unknown>,
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    const perDoc: PerDocResult = {
      doc_id: doc.id,
      provider_kind: "model",
      pass1_telemetry_summary: {
        ok: false,
        attempts: 0,
        write_around: true,
        grounded_note_replacement_rate: 0,
      },
      substance: {
        presence_rate: 0,
        present_factor_count: 0,
        factors_with_ledger_refs: 0,
        note_token_diversity: 0,
        action_kind_diversity_ok: false,
        golden_shape: { review_flag: true, shortfall_keys: [] },
      },
      structure: { sections_emitted: 0, sections_omitted_by_class: {} },
      hard_failures: [`harness_error:${msg}`],
    };
    return {
      perDoc,
      sideBySide: null,
      pass1Usage: { error: msg },
      assembledReport: null,
    };
  }
}

/**
 * ITEM 260 — opportunistic reaper. Runs at the TOP of every request (ping and
 * run) before other work. Cheap, idempotent, controller-visible. Any job left
 * 'running' for > 15 minutes is presumed isolate-dead and closed out.
 */
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
    .lt("started_at", cutoff);
  if (error) console.error("[harness] reaper_failed", error.message);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  const url = new URL(req.url);

  // ITEM 260 — reaper first, on every request path.
  const reaperClient = serviceClient();
  await reapStaleJobs(reaperClient);

  // Ping — safe metadata only. No secrets echoed.
  if (url.searchParams.get("ping") === "1") {
    return json({
      ok: true,
      harness_build_stamp: HARNESS_BUILD_STAMP,
      pass1_manifest: PASS1_MANIFEST,
      mined_presence_band: MINED_PRESENCE_BAND,
      pass2r_manifest: PASS2R_MANIFEST,
      env_anthropic_key_present: !!Deno.env.get("ANTHROPIC_API_KEY"),
      env_ltp_enforce_enabled: Deno.env.get("LTP_ENFORCE_ENABLED") === "1",
    });
  }

  if (url.searchParams.get("run") !== "1") {
    return json({ error: "expected ?run=1&job=<uuid> or ?ping=1" }, 400);
  }
  const jobId = url.searchParams.get("job");
  if (!jobId) return json({ error: "missing_job_id" }, 400);

  const sb = serviceClient();

  // Atomic CAS: queued -> running. Rejects replay/double-fire.
  const casRes = await sb
    .from("replay_harness_jobs")
    .update({ status: "running", started_at: new Date().toISOString() })
    .eq("id", jobId)
    .eq("status", "queued")
    .select("id, doc_ids, status, options")
    .maybeSingle();
  if (casRes.error) {
    return json({ error: `cas_failed:${casRes.error.message}` }, 500);
  }
  const job = casRes.data as HarnessJobRow | null;
  if (!job) {
    return json({ error: "job_not_queued_or_not_found" }, 409);
  }

  // Enforce env gate FAIL-CLOSED. If LTP_ENFORCE_ENABLED is not '1', mark
  // the job errored rather than silently falling to a deterministic path.
  if (Deno.env.get("LTP_ENFORCE_ENABLED") !== "1") {
    await sb.from("replay_harness_jobs")
      .update({
        status: "error",
        finished_at: new Date().toISOString(),
        error: "harness_error:enforce_disabled (LTP_ENFORCE_ENABLED != '1')",
      })
      .eq("id", job.id);
    return json({
      error: "enforce_disabled",
      job_id: job.id,
      hint: "set LTP_ENFORCE_ENABLED=1 for this function",
    }, 412);
  }
  if (!Deno.env.get("ANTHROPIC_API_KEY")) {
    await sb.from("replay_harness_jobs")
      .update({
        status: "error",
        finished_at: new Date().toISOString(),
        error: "harness_error:anthropic_api_key_missing",
      })
      .eq("id", job.id);
    return json({ error: "anthropic_api_key_missing", job_id: job.id }, 412);
  }

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

  // ITEM 260 — BACKGROUND TASK PATTERN (mirrors run-cppa-risk-assessment
  // :3921-3953). ITEM 259 evidence: the isolate died ~199s into an
  // inline-held request with no top-level catch reached. The doc loop and
  // finalize now run in an unawaited IIFE registered with
  // EdgeRuntime.waitUntil; the request returns 202 immediately. All error
  // paths still write the job row.
  const er = (globalThis as any).EdgeRuntime;
  const hasWaitUntil = typeof er?.waitUntil === "function";
  // Append (never clobber) the background-path marker on the job row.
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

  // ITEM 278 — prose-pass flag. Default FALSE; malformed options read false.
  const jobOptions = (job.options ?? {}) as Record<string, unknown>;
  const prosePass = jobOptions.prose_pass === true;

  const wrapped = (async () => {
    const summary: Record<string, unknown>[] = [];
    try {
      for (const docId of docIds) {
        const loaded = await loadArchivedDoc(sb, String(docId));
        let outcome: DocProcessOutcome;
        if ("error" in loaded) {
          outcome = {
            perDoc: {
              doc_id: String(docId),
              provider_kind: "model",
              pass1_telemetry_summary: {
                ok: false, attempts: 0, write_around: true,
                grounded_note_replacement_rate: 0,
              },
              substance: {
                presence_rate: 0, present_factor_count: 0,
                factors_with_ledger_refs: 0, note_token_diversity: 0,
                action_kind_diversity_ok: false,
                golden_shape: { review_flag: true, shortfall_keys: [] },
              },
              structure: { sections_emitted: 0, sections_omitted_by_class: {} },
              hard_failures: [`harness_error:${loaded.error}`],
            },
            sideBySide: null,
            pass1Usage: { error: loaded.error },
            assembledReport: null,
          };
        } else {
          outcome = await processDoc(loaded, prosePass);
        }

        const ins = await sb.from("replay_harness_results").insert({
          job_id: job.id,
          doc_id: String(docId),
          per_doc_result: {
            ...outcome.perDoc,
            // ITEM 265 — GTM releasability verdict (observe/telemetry only).
            gtm: evaluateGtm(outcome.perDoc),
          },
          side_by_side: outcome.sideBySide,
          pass1_usage: outcome.pass1Usage,
          assembled_report: outcome.assembledReport,
        });
        if (ins.error) {
          // Fail-loud: record the row-insert failure in the summary but keep going.
          summary.push({
            doc_id: docId,
            insert_error: ins.error.message,
            hard_failure_count: outcome.perDoc.hard_failures.length,
          });
        } else {
          summary.push({
            doc_id: docId,
            hard_failure_count: outcome.perDoc.hard_failures.length,
          });
        }
      }

      await sb.from("replay_harness_jobs")
        .update({ status: "done", finished_at: new Date().toISOString() })
        .eq("id", job.id);

      console.log("[harness] job_done", job.id, "docs", summary.length);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      await sb.from("replay_harness_jobs")
        .update({
          status: "error",
          finished_at: new Date().toISOString(),
          error: `harness_error:top_level:${msg}`,
        })
        .eq("id", job.id);
      console.error("[harness] job_top_level_error", job.id, msg);
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

  // Local/dev fallback: no waitUntil available — await inline (prior behavior).
  await wrapped;
  return json({
    accepted: true,
    job_id: job.id,
    docs: docIds.length,
    harness_build_stamp: HARNESS_BUILD_STAMP,
    background: "inline",
  }, 202);
});
