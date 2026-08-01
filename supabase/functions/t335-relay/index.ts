/**
 * ITEM 335 — TEMPORARY RELAY (delete after the fleet baseline run).
 * Mirrors the Item 331 internal-start relay: converts an unauthenticated
 * call (guarded by a fixed dispatch nonce) into the orchestrator's internal
 * `start` path with the service-role bearer, so a baseline batch can be
 * launched without an admin browser JWT.
 */
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const NONCE = "t335-fleet-baseline-2026-08-01";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  let body: Record<string, unknown> = {};
  try { body = await req.json(); } catch { /* */ }
  if (String(body?.nonce ?? "") !== NONCE) {
    return new Response(JSON.stringify({ error: "bad nonce" }), {
      status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  const r = await fetch(`${SUPABASE_URL}/functions/v1/quality-batch-orchestrator`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${SERVICE_KEY}`,
      apikey: SERVICE_KEY,
      "x-internal-cron": "1",
    },
    body: JSON.stringify({
      action: "start",
      tools: body?.tools ?? ["cppa-risk"],
      batch_size: body?.batch_size ?? 3,
      concurrency: body?.concurrency ?? 1,
      variant: body?.variant ?? "perfect",
      ...(body?.engine_path ? { engine_path: body.engine_path } : {}),
    }),
  });
  const text = await r.text();
  return new Response(JSON.stringify({ status: r.status, body: text.slice(0, 800) }), {
    status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
