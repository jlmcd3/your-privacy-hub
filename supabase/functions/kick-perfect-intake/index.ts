// PERFECT-INTAKE-EXPERIMENT-RISK kick helper (2026-07-26).
// One-shot resume kicker used by controller to launch a pinned-intake
// quality_runs row through run-quality-batch's internal-resume path,
// which requires SERVICE_ROLE bearer. No secrets ever returned to caller.
import { corsHeaders as cors } from "npm:@supabase/supabase-js@2/cors";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  let body: any = {};
  try { body = await req.json(); } catch {}
  const runId = String(body?.run_id ?? "");
  if (!runId) return new Response(JSON.stringify({ error: "run_id required" }), { status: 400, headers: { ...cors, "Content-Type": "application/json" } });

  const r = await fetch(`${SUPABASE_URL}/functions/v1/run-quality-batch`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${SERVICE_KEY}`,
      "apikey": SERVICE_KEY,
      "Content-Type": "application/json",
      "x-internal-resume": "1",
    },
    body: JSON.stringify({ resume_run_id: runId }),
  });
  const txt = await r.text();
  return new Response(JSON.stringify({ status: r.status, upstream: txt.slice(0, 500) }), {
    status: 200, headers: { ...cors, "Content-Type": "application/json" },
  });
});
