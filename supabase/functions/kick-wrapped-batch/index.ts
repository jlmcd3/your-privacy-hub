// INSTRUMENT-EPOCH-AUDIT-S6 kick helper (2026-07-27, ledger item 155).
// One-shot resume kicker for the Wave-B RELAUNCH standing rule (ledger
// item 152): every measurement run MUST be batch-wrapped. Caller supplies
// a pre-inserted `quality_batch_runs.id`; this function invokes the
// quality-batch-orchestrator with service-role + x-internal-resume so
// `runUnit(runId)` picks the batch up. No secrets returned. Replaces the
// bare `kick-perfect-intake` path for multi-doc measurement runs.
import { corsHeaders as cors } from "npm:@supabase/supabase-js@2/cors";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  let body: any = {};
  try { body = await req.json(); } catch { /* */ }
  const runId = String(body?.run_id ?? "");
  if (!runId) {
    return new Response(JSON.stringify({ error: "run_id required (quality_batch_runs.id)" }), {
      status: 400, headers: { ...cors, "Content-Type": "application/json" },
    });
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
  return new Response(JSON.stringify({ status: r.status, upstream: txt.slice(0, 500) }), {
    status: 200, headers: { ...cors, "Content-Type": "application/json" },
  });
});
