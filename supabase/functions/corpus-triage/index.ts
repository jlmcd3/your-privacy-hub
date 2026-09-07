// build-marker: corpus-triage-v1-2026-09-07
console.log("[build-marker] corpus-triage v1-2026-09-07");
//
// BACKGROUND TRIAGE PASS over the `needs_triage` bucket left by the
// deterministic sweep (corpus_sweep_v2). Cheap model, small bounded batches,
// resumable by cursor, idempotent per (run_id, action_id).
//
// DARK BY CONSTRUCTION: writes only to corpus_triage_results. Nothing in
// enforcement_actions or corpus_sweep_v2 is modified, and nothing reaches a
// customer surface without a separate human ratification step.

import { verifyCaller } from "../_shared/verify-caller.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  type ActionText,
  MAX_BATCH_SIZE,
  parseTriageOutcome,
  parseTriageRequest,
  TRIAGE_LEASE_SECONDS,
  TRIAGE_PIPELINE_VERSION,
  TRIAGE_SYSTEM,
  triageExcerpt,
} from "./_local/triage.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// Extraction-class pass over corpus content: the codebase convention for that
// is Haiku (_shared/llm-extraction.ts), which is what keeps this cheap.
const TRIAGE_MODEL = Deno.env.get("CORPUS_TRIAGE_MODEL") ?? "claude-haiku-4-5-20251001";
const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");

function admin() {
  return createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
}

async function callModel(user: string): Promise<string> {
  if (!ANTHROPIC_API_KEY) throw new Error("ANTHROPIC_API_KEY is not configured");
  const r = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: TRIAGE_MODEL,
      max_tokens: 1024,
      system: TRIAGE_SYSTEM,
      messages: [{ role: "user", content: user }],
    }),
    signal: AbortSignal.timeout(120_000),
  });
  if (!r.ok) {
    const text = await r.text().catch(() => "no body");
    throw Object.assign(new Error(`Anthropic ${r.status}: ${text.slice(0, 300)}`), { status: r.status });
  }
  const body = await r.json();
  const blocks = Array.isArray(body?.content) ? body.content : [];
  const block = blocks.find((b: { type?: string }) => b?.type === "text");
  if (!block || typeof block.text !== "string" || block.text.length === 0) {
    const types = blocks.map((b: { type?: string }) => String(b?.type ?? "unknown")).join(",") || "none";
    throw new Error(`Anthropic returned no text block (stop_reason=${String(body?.stop_reason ?? "unknown")}; blocks=[${types}])`);
  }
  return String(block.text);
}

async function runStatus(runId: string) {
  const { data, error } = await admin().from("corpus_triage_job_state")
    .select("status,pause_status,pause_message,updated_at").eq("run_id", runId).maybeSingle();
  if (error) throw new Error(`triage job-state read failed: ${error.message}`);
  return data as
    | { status: "ready" | "paused" | "rate_limited"; pause_status: number | null; pause_message: string | null }
    | null;
}

async function setRunStatus(
  runId: string,
  status: "ready" | "paused" | "rate_limited",
  pauseStatus: number | null,
  pauseMessage: string | null,
) {
  const { error } = await admin().from("corpus_triage_job_state").upsert({
    run_id: runId,
    status,
    pause_status: pauseStatus,
    pause_message: pauseMessage,
    paused_at: status === "ready" ? null : new Date().toISOString(),
    updated_at: new Date().toISOString(),
  });
  if (error) throw new Error(`triage job-state write failed: ${error.message}`);
}

async function cursorFor(runId: string): Promise<string | null> {
  const { data, error } = await admin().from("corpus_triage_results")
    .select("action_id").eq("run_id", runId).order("action_id", { ascending: false }).limit(1).maybeSingle();
  if (error) throw new Error(`triage cursor read failed: ${error.message}`);
  return data?.action_id ?? null;
}

/** Next unprocessed `needs_triage` action ids, ascending, past the cursor. */
async function nextActionIds(runId: string, cursor: string | null, batchSize: number): Promise<string[]> {
  const db = admin();
  let query = db.from("corpus_sweep_v2")
    .select("action_id")
    .contains("usable_for", ["needs_triage"])
    .order("action_id", { ascending: true })
    .limit(Math.max(batchSize * 4, 40));
  if (cursor) query = query.gt("action_id", cursor);
  const { data, error } = await query;
  if (error) throw new Error(`triage candidate read failed: ${error.message}`);
  const ids = (data ?? []).map((row) => row.action_id as string);
  if (ids.length === 0) return [];
  const { data: done, error: doneError } = await db.from("corpus_triage_results")
    .select("action_id").eq("run_id", runId).in("action_id", ids);
  if (doneError) throw new Error(`triage result lookup failed: ${doneError.message}`);
  const seen = new Set((done ?? []).map((row) => row.action_id as string));
  return ids.filter((id) => !seen.has(id)).slice(0, batchSize);
}

async function loadActions(ids: readonly string[]): Promise<ActionText[]> {
  if (ids.length === 0) return [];
  const { data, error } = await admin().from("enforcement_actions")
    .select("id,subject,regulator,jurisdiction,source_url,source_database,decision_date,source_document_text,raw_text,legacy_summary_text")
    .in("id", ids as string[]);
  if (error) throw new Error(`enforcement_actions read failed: ${error.message}`);
  return (data ?? []) as ActionText[];
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  // pg_cron cannot read edge-function secrets, so the scheduled driver presents
  // a DB-held handshake token. Auth only — it grants no extra capability.
  const adminTok = req.headers.get("x-admin-token");
  const driverTok = req.headers.get("x-driver-token");
  let internalByToken = !!adminTok && adminTok === Deno.env.get("ADMIN_SECRET_TOKEN");
  if (!internalByToken && driverTok) {
    const { data: tokenRow } = await admin().from("internal_driver_tokens")
      .select("token").eq("name", "corpus-triage").maybeSingle();
    if (tokenRow?.token && tokenRow.token === driverTok) internalByToken = true;
  }
  if (!internalByToken) {
    const caller = await verifyCaller(req);
    if (!caller.internal) {
      if (!caller.userId) return json({ error: "unauthorized" }, 401);
      const { data: isAdmin } = await admin().rpc("has_role", { _user_id: caller.userId, _role: "admin" });
      if (!isAdmin) return json({ error: "forbidden" }, 403);
    }
  }

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return json({ error: "invalid json" }, 400);
  }
  const action = typeof body.action === "string" ? body.action : "triage_batch";

  if (action === "status") {
    const runId = typeof body.run_id === "string" ? body.run_id : "";
    if (!runId) return json({ error: "missing required field: run_id" }, 400);
    const db = admin();
    const [{ count: doneCount }, { count: queueCount }, state] = await Promise.all([
      db.from("corpus_triage_results").select("id", { count: "exact", head: true }).eq("run_id", runId),
      db.from("corpus_sweep_v2").select("id", { count: "exact", head: true }).contains("usable_for", ["needs_triage"]),
      runStatus(runId),
    ]);
    return json({
      ok: true,
      run_id: runId,
      pipeline_version: TRIAGE_PIPELINE_VERSION,
      model: TRIAGE_MODEL,
      processed: doneCount ?? 0,
      queue_total: queueCount ?? 0,
      job_state: state ?? { status: "ready" },
    });
  }

  if (action !== "triage_batch") return json({ error: `unknown action "${action}"` }, 400);

  let leaseKey: string | null = null;
  const started = Date.now();
  try {
    const parsed = parseTriageRequest(body);
    const db = admin();

    // Paused-state guard: the scheduler keeps firing regardless of job state.
    const state = await runStatus(parsed.run_id);
    const paused = state?.status === "paused";
    const batchSize = paused ? 1 : parsed.batch_size; // probe a single item while paused

    leaseKey = `corpus-triage:${parsed.run_id}`;
    const { data: acquired, error: leaseError } = await db.rpc("try_acquire_job_lease", {
      _key: leaseKey, _seconds: TRIAGE_LEASE_SECONDS, _holder: crypto.randomUUID(),
    });
    if (leaseError) throw new Error(`triage lease failed: ${leaseError.message}`);
    if (!acquired) return json({ error: "triage run already active", run_id: parsed.run_id }, 409);

    const cursor = parsed.cursor === undefined ? await cursorFor(parsed.run_id) : parsed.cursor;
    const ids = await nextActionIds(parsed.run_id, cursor ?? null, batchSize);
    if (ids.length === 0) {
      return json({
        ok: true, run_id: parsed.run_id, done: true, processed: 0, cursor,
        message: "queue drained — stop the driver",
      });
    }

    const actions = await loadActions(ids);
    const byId = new Map(actions.map((row) => [row.id, row]));
    const rows: Record<string, unknown>[] = [];
    let lastId = cursor ?? null;
    let counted = { ok: 0, unusable: 0, error: 0 };

    for (const id of ids) {
      const row = byId.get(id);
      if (!row) continue;
      let raw = "";
      try {
        raw = await callModel(triageExcerpt(row));
      } catch (e) {
        const status = (e as { status?: number }).status ?? 0;
        const message = e instanceof Error ? e.message : String(e);
        if (status === 402 || status === 403 || status === 429) {
          // Circuit breaker: halt the whole run, not just this item.
          await setRunStatus(parsed.run_id, status === 429 ? "rate_limited" : "paused", status, message);
          if (rows.length > 0) await db.from("corpus_triage_results").upsert(rows, { onConflict: "run_id,action_id" });
          return json({ ok: false, run_id: parsed.run_id, paused: true, status, error: message, processed: rows.length }, status);
        }
        rows.push({
          run_id: parsed.run_id, action_id: id, model: TRIAGE_MODEL,
          status: "error", rationale: message.slice(0, 400),
        });
        counted.error += 1;
        lastId = id;
        continue;
      }
      const outcome = parseTriageOutcome(raw);
      counted[outcome.status] += 1;
      rows.push({
        run_id: parsed.run_id,
        action_id: id,
        model: TRIAGE_MODEL,
        proposed_subject: outcome.proposed_subject,
        proposed_record_class: outcome.proposed_record_class,
        proposed_usable_for: outcome.proposed_usable_for,
        proposed_topic_tags: outcome.proposed_topic_tags,
        proposed_li_relevance: outcome.proposed_li_relevance,
        confidence: outcome.confidence,
        rationale: outcome.rationale,
        raw_head: raw.slice(0, 600),
        status: outcome.status,
      });
      lastId = id;
    }

    if (!parsed.dry_run && rows.length > 0) {
      const { error } = await db.from("corpus_triage_results").upsert(rows, { onConflict: "run_id,action_id" });
      if (error) throw new Error(`triage result write failed: ${error.message}`);
    }
    // A successful batch clears an earlier pause (probe recovery).
    if (paused && counted.error === 0) await setRunStatus(parsed.run_id, "ready", null, null);

    return json({
      ok: true,
      run_id: parsed.run_id,
      pipeline_version: TRIAGE_PIPELINE_VERSION,
      model: TRIAGE_MODEL,
      dry_run: parsed.dry_run,
      probe: paused,
      processed: rows.length,
      counts: counted,
      cursor: lastId,
      done: false,
      elapsed_ms: Date.now() - started,
    });
  } catch (e) {
    const status = (e as { status?: number }).status;
    const message = e instanceof Error ? e.message : String(e);
    return json({ ok: false, error: message, max_batch_size: MAX_BATCH_SIZE }, status && status >= 400 ? status : 500);
  } finally {
    if (leaseKey) {
      try {
        await admin().rpc("release_job_lease", { _key: leaseKey });
      } catch { /* lease expires on its own */ }
    }
  }
});
