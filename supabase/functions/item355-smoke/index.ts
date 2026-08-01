// ITEM 355 — T-M CUTOVER ATTEMPT #6, PHASE 2 LIVE DUAL SMOKE DRIVER.
// One-off, throwaway. Invokes the deployed production `run-cppa-risk-assessment`
// with the service-role token for the TWO hard-pinned smoke fixture rows only.
// Deleted immediately after the smoke completes.
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const ALLOWED = new Set([
  "a3550000-0000-4000-8000-000000000001",
  "a3550000-0000-4000-8000-000000000002",
]);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  let body: any = {};
  try { body = await req.json(); } catch { /* empty */ }
  const id = String(body?.assessment_id ?? "");
  if (!ALLOWED.has(id)) {
    return new Response(JSON.stringify({ error: "not_a_smoke_fixture" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  if (body?.mode === "fetch") {
    const rr = await fetch(`${SUPABASE_URL}/rest/v1/cppa_assessments?id=eq.${id}&select=id,status,report_data`, {
      headers: { "Authorization": `Bearer ${SERVICE_ROLE}`, "apikey": SERVICE_ROLE },
    });
    const t = await rr.text();
    return new Response(t, { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
  const r = await fetch(`${SUPABASE_URL}/functions/v1/run-cppa-risk-assessment`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${SERVICE_ROLE}`,
      "apikey": SERVICE_ROLE,
    },
    body: JSON.stringify({ assessment_id: id, stress_run: true }),
  });
  const text = await r.text();
  return new Response(JSON.stringify({ upstream_status: r.status, upstream_body: text }), {
    status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
