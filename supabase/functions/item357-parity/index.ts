/**
 * ITEM 357 — THROWAWAY PARITY DRIVER (deleted after use).
 *
 * Invokes the DEPLOYED `run-cppa-risk-assessment-v2` for the two hard-pinned
 * parity fixtures with the service-role bearer. No customer surface, no
 * routing, service-role only. Delete after the parity gate runs.
 */
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const IDS = [
  "a3570000-0000-4000-8000-000000000001",
  "a3570000-0000-4000-8000-000000000002",
];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  // Throwaway: no caller gate; the only effect is regenerating two hard-pinned
  // internal fixture rows. Deleted immediately after the parity gate runs.
  const results: unknown[] = [];
  for (const id of IDS) {
    const r = await fetch(`${SUPABASE_URL}/functions/v1/run-cppa-risk-assessment-v2`, {
      method: "POST",
      headers: { Authorization: `Bearer ${SERVICE_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ assessment_id: id }),
    });
    results.push({ id, status: r.status, body: await r.text() });
  }
  return new Response(JSON.stringify({ ok: true, results }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
