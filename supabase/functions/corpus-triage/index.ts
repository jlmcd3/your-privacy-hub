// build-marker: corpus-triage-v1-2026-09-07
console.log("[build-marker] corpus-triage v2-2026-09-07 (sharded + LIA handoff)");
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
  isLiaHandoff,
  MAX_BATCH_SIZE,
  INVOCATION_BUDGET_MS,
  MAX_CONCURRENCY,
  parseTriageOutcome,
  parseTriageRequest,
  TRIAGE_LEASE_SECONDS,
  TRIAGE_PIPELINE_VERSION,
  shardBounds,
  type TriageOutcome,
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

async function cursorFor(runId: string, shard: { lo: string; hi: string | null }): Promise<string | null> {
  let query = admin().from("corpus_triage_results")
    .select("action_id").eq("run_id", runId).gte("action_id", shard.lo)
    .order("action_id", { ascending: false }).limit(1);
  if (shard.hi) query = query.lt("action_id", shard.hi);
  const { data, error } = await query.maybeSingle();
  if (error) throw new Error(`triage cursor read failed: ${error.message}`);
  return data?.action_id ?? null;
}

/** Next unprocessed `needs_triage` action ids, ascending, past the cursor. */
async function nextActionIds(
  runId: string,
  cursor: string | null,
  batchSize: number,
  shard: { lo: string; hi: string | null },
): Promise<string[]> {
  const db = admin();
  let query = db.from("corpus_sweep_v2")
    .select("action_id")
    .contains("usable_for", ["needs_triage"])
    .order("action_id", { ascending: true })
    .limit(Math.max(batchSize * 4, 40));
  query = query.gte("action_id", cursor ?? shard.lo);
  if (shard.hi) query = query.lt("action_id", shard.hi);
  const { data, error } = await query;
  if (error) throw new Error(`triage candidate read failed: ${error.message}`);
  const ids = (data ?? []).map((row) => row.action_id as string);
  if (ids.length === 0) return [];
  const { data: done, error: doneError } = await db.from("corpus_triage_results")
    .select("action_id").eq("run_id", runId).in("action_id", ids);
  if (doneError) throw new Error(`triage result lookup failed: ${doneError.message}`);
  const seen = new Set((done ?? []).map((row) => row.action_id as string));
  return ids.filter((id) => id !== cursor && !seen.has(id)).slice(0, batchSize);
}

async function loadActions(ids: readonly string[]): Promise<(ActionText & { law: string | null })[]> {
  if (ids.length === 0) return [];
  const { data, error } = await admin().from("enforcement_actions")
    .select("id,subject,regulator,jurisdiction,law,source_url,source_database,decision_date,source_document_text,raw_text,legacy_summary_text")
    .in("id", ids as string[]);
  if (error) throw new Error(`enforcement_actions read failed: ${error.message}`);
  return (data ?? []) as (ActionText & { law: string | null })[];
}


/**
 * REPAIR ONLY (B5-1, doc 210 ledger).
 *
 * Triage used to insert an UNRATIFIED `authority_relevance_profiles` stub for
 * every LI handoff. That was wrong: the stubs carried no quote, no factors, no
 * use-case class and a blanket 'contested' posture, and the live classifier
 * then spent Opus 5 calls on them. Profiles are now created ONLY by the classify
 * pipeline (generate-corpus-relevance-profiles, r2 shape) followed by
 * verification, exactly as the curated 254 were.
 *
 * What survives here is the record repair: a subject the deterministic sweep
 * could not parse, copied from text the model quoted, only when it is confident.
 * The handoff itself is recorded on the corpus_triage_results row and nowhere
 * else; handoff_profile_id stays null from now on.
 */
async function repairSubjectOnly(
  row: ActionText & { law: string | null },
  outcome: TriageOutcome,
): Promise<{ profile_id: string | null; repaired_subject: string | null }> {
  const db = admin();
  let repaired: string | null = null;

  if (!row.subject?.trim() && outcome.proposed_subject && (outcome.confidence ?? 0) >= 0.6) {
    const { error } = await db.from("enforcement_actions")
      .update({ subject: outcome.proposed_subject }).eq("id", row.id).is("subject", null);
    if (!error) repaired = outcome.proposed_subject;
  }

  return { profile_id: null, repaired_subject: repaired };
}

/** Bounded-concurrency map that preserves input order. */
async function pooled<T, R>(items: readonly T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const out = new Array<R>(items.length);
  let next = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (true) {
      const index = next++;
      if (index >= items.length) return;
      out[index] = await fn(items[index]);
    }
  });
  await Promise.all(workers);
  return out;
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

    // Lease per shard: workers on disjoint slices must not block each other.
    leaseKey = `corpus-triage:${parsed.run_id}:${parsed.shard_index}/${parsed.shard_count}`;
    const { data: acquired, error: leaseError } = await db.rpc("try_acquire_job_lease", {
      _key: leaseKey, _seconds: TRIAGE_LEASE_SECONDS, _holder: crypto.randomUUID(),
    });
    if (leaseError) throw new Error(`triage lease failed: ${leaseError.message}`);
    if (!acquired) return json({ error: "triage run already active", run_id: parsed.run_id }, 409);

    const shard = shardBounds(parsed.shard_index, parsed.shard_count);
    // WAVES: one invocation keeps pulling bounded batches until its wall-clock
    // budget is spent or the queue drains, so a single scheduled tick clears far
    // more of the finite backlog than one batch could.
    let cursor = parsed.cursor === undefined ? await cursorFor(parsed.run_id, shard) : parsed.cursor;
    const totals = { ok: 0, unusable: 0, error: 0 };
    let processedTotal = 0;
    let handedOffTotal = 0;
    let repairedTotal = 0;
    let waves = 0;
    let drained = false;

    while (Date.now() - started < INVOCATION_BUDGET_MS) {
      const ids = await nextActionIds(parsed.run_id, cursor ?? null, batchSize, shard);
      if (ids.length === 0) { drained = true; break; }
      waves += 1;

      const actions = await loadActions(ids);
      const byId = new Map(actions.map((row) => [row.id, row]));
      const rows: Record<string, unknown>[] = [];
      let lastId = cursor ?? null;
      let breaker: { status: number; message: string } | null = null;

      // Model calls run in parallel (bounded) — a batch is dominated by
      // round-trip latency. Persistence stays sequential and idempotent.
      const results = await pooled(ids, MAX_CONCURRENCY, async (id) => {
        const row = byId.get(id);
        if (!row) return { id, row: null, raw: "", failure: null as null | { status: number; message: string } };
        try {
          return { id, row, raw: await callModel(triageExcerpt(row)), failure: null };
        } catch (e) {
          const status = (e as { status?: number }).status ?? 0;
          const message = e instanceof Error ? e.message : String(e);
          return { id, row, raw: "", failure: { status, message } };
        }
      });

      for (const result of results) {
        if (!result.row) continue;
        if (result.failure) {
          const { status, message } = result.failure;
          if (status === 402 || status === 403 || status === 429) {
            // Circuit breaker: halt the whole run, not just this item.
            breaker = { status, message };
            continue;
          }
          rows.push({
            run_id: parsed.run_id, action_id: result.id, model: TRIAGE_MODEL,
            status: "error", rationale: message.slice(0, 400),
          });
          totals.error += 1;
          lastId = result.id;
          continue;
        }
        const outcome = parseTriageOutcome(result.raw);
        totals[outcome.status] += 1;

        let handoff: { profile_id: string | null; repaired_subject: string | null } =
          { profile_id: null, repaired_subject: null };
        // B5-1: the handoff is recorded on the triage row only. No profile is
        // created here, so handoff_profile_id stays null; the counter now
        // measures rows MARKED for the classify pipeline, not rows inserted.
        if (!parsed.dry_run && isLiaHandoff(outcome, result.row.law)) {
          handoff = await repairSubjectOnly(result.row, outcome);
          handedOffTotal += 1;
          if (handoff.repaired_subject) repairedTotal += 1;
        }

        rows.push({
          run_id: parsed.run_id,
          action_id: result.id,
          model: TRIAGE_MODEL,
          proposed_subject: outcome.proposed_subject,
          proposed_record_class: outcome.proposed_record_class,
          proposed_usable_for: outcome.proposed_usable_for,
          proposed_topic_tags: outcome.proposed_topic_tags,
          proposed_li_relevance: outcome.proposed_li_relevance,
          confidence: outcome.confidence,
          rationale: outcome.rationale,
          raw_head: result.raw.slice(0, 600),
          status: outcome.status,
          handoff_profile_id: handoff.profile_id,
          repaired_subject: handoff.repaired_subject,
        });
        lastId = result.id;
      }

      if (!parsed.dry_run && rows.length > 0) {
        const { error } = await db.from("corpus_triage_results").upsert(rows, { onConflict: "run_id,action_id" });
        if (error) throw new Error(`triage result write failed: ${error.message}`);
      }
      processedTotal += rows.length;
      cursor = lastId;

      if (breaker) {
        await setRunStatus(parsed.run_id, breaker.status === 429 ? "rate_limited" : "paused",
          breaker.status, breaker.message);
        return json({
          ok: false, run_id: parsed.run_id, paused: true, status: breaker.status,
          error: breaker.message, processed: processedTotal, cursor,
        }, breaker.status);
      }
      if (paused) break; // single probe item while paused
    }

    // A successful batch clears an earlier pause (probe recovery).
    if (paused && totals.error === 0 && processedTotal > 0) {
      await setRunStatus(parsed.run_id, "ready", null, null);
    }

    return json({
      ok: true,
      run_id: parsed.run_id,
      pipeline_version: TRIAGE_PIPELINE_VERSION,
      model: TRIAGE_MODEL,
      dry_run: parsed.dry_run,
      probe: paused,
      waves,
      processed: processedTotal,
      counts: totals,
      shard: `${parsed.shard_index}/${parsed.shard_count}`,
      handed_off_to_lia: handedOffTotal,
      repaired_subjects: repairedTotal,
      cursor,
      done: drained,
      message: drained ? "shard queue drained" : undefined,
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
