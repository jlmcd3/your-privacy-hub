// INSTRUMENT-EPOCH-AUDIT-S6 kick helper (2026-07-27, ledger item 155).
// AMENDED ENFORCE-MODE-REGRESSION-2026-07-27 (ledger item 159): now
// implements the measurement-validity law (LEGAL-TEST-PIPELINE.md §16).
// One-shot resume kicker for the Wave-B RELAUNCH standing rule (ledger
// item 152): every measurement run MUST be batch-wrapped. Caller supplies
// a pre-inserted `quality_batch_runs.id`; this function invokes the
// quality-batch-orchestrator with service-role + x-internal-resume so
// `runUnit(runId)` picks the batch up.
//
// MEASUREMENT-VALIDITY LAW: caller may also supply `mode_expected` and
// `target_fn` (a slug like "run-cppa-risk-assessment"). When provided,
// this kicker PINGS the target function's GET /?ping=1 endpoint and
// aborts with 409 if the target's reported `ltp_mode` differs from
// `mode_expected` — the batch NEVER launches on a mismatched generator.
import { corsHeaders as cors } from "npm:@supabase/supabase-js@2/cors";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  let body: any = {};
  try { body = await req.json(); } catch { /* */ }
  const runId = String(body?.run_id ?? "");
  const modeExpected = body?.mode_expected ? String(body.mode_expected) : null;
  const targetFn = body?.target_fn ? String(body.target_fn) : null;

  if (!runId) {
    return new Response(JSON.stringify({ error: "run_id required (quality_batch_runs.id)" }), {
      status: 400, headers: { ...cors, "Content-Type": "application/json" },
    });
  }

  // Measurement-validity pre-assertion (LEGAL-TEST-PIPELINE.md §16).
  let mode_check: Record<string, unknown> | null = null;
  if (modeExpected && targetFn) {
    try {
      const pr = await fetch(`${SUPABASE_URL}/functions/v1/${targetFn}?ping=1`, {
        method: "GET",
        headers: { "Authorization": `Bearer ${SERVICE_KEY}`, "apikey": SERVICE_KEY },
      });
      const pj = await pr.json().catch(() => ({} as any));
      const actual = pj?.ltp_mode ?? null;
      mode_check = { target_fn: targetFn, expected: modeExpected, actual, build_stamp: pj?.build_stamp ?? null };
      if (actual !== modeExpected) {
        console.log(JSON.stringify({ evt: "kick_wrapped_batch_mode_mismatch_abort", run_id: runId, mode_check }));
        return new Response(JSON.stringify({
          error: "ltp_mode_mismatch",
          law: "LEGAL-TEST-PIPELINE.md §16 measurement-validity",
          mode_check,
        }), { status: 409, headers: { ...cors, "Content-Type": "application/json" } });
      }
    } catch (e) {
      return new Response(JSON.stringify({
        error: "mode_precheck_failed",
        law: "LEGAL-TEST-PIPELINE.md §16 measurement-validity",
        detail: (e as Error)?.message ?? "unknown",
      }), { status: 409, headers: { ...cors, "Content-Type": "application/json" } });
    }
  }

  const r = await fetch(`${SUPABASE_URL}/functions/v1/quality-batch-orchestrator`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${SERVICE_KEY}`,
      "apikey": SERVICE_KEY,
      "Content-Type": "application/json",
      "x-internal-resume": "1",
    },
    body: JSON.stringify({ run_id: runId }),
  });
  const txt = await r.text();
  return new Response(JSON.stringify({
    status: r.status,
    upstream: txt.slice(0, 500),
    mode_check,
  }), {
    status: 200, headers: { ...cors, "Content-Type": "application/json" },
  });
});
