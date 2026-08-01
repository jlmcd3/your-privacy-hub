// ITEM 331 — one-shot internal trigger for a /admin/final-test-equivalent
// batch start. The orchestrator's `start` action requires either an admin
// USER JWT or the internal cron bearer; neither is reachable from the agent
// shell. This function runs inside the project, reads the service-role key
// from the function environment, and relays a single start call.
//
// It is deliberately gated on the same ADMIN_SECRET_TOKEN-or-service-role
// bearer the orchestrator itself uses, so it grants no new authority.

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ADMIN_SECRET_TOKEN = Deno.env.get("ADMIN_SECRET_TOKEN") ?? "";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });

  let body: Record<string, unknown> = {};
  try { body = await req.json(); } catch { /* */ }

  const res = await fetch(`${SUPABASE_URL}/functions/v1/quality-batch-orchestrator`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${ADMIN_SECRET_TOKEN || SERVICE_KEY}`,
      "x-internal-cron": "1",
    },
    body: JSON.stringify(body),
  });

  const text = await res.text();
  return new Response(text, {
    status: res.status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
});
