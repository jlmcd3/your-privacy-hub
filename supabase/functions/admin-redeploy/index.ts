// admin-redeploy — MC-S1b Task 1.
//
// Runs the two-source conflict gate. If clear (or the caller supplies the
// typed OVERRIDE-REDEPLOY string) it writes a durable `redeploy_queue` row
// (status='queued') for a human courier to execute. Every path — conflict,
// override, queued — writes admin_action_log.
//
// This function DOES NOT and MUST NOT call the Supabase Management API. The
// final "execute deploy" step is out of scope. When the human-courier step is
// later automated, only the block after "PATH C" changes; the gate contract
// stays.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { verifyCaller } from "../_shared/verify-caller.ts";
import { writeActionLog } from "../_shared/write-action-log.ts";
import { detectRedeployConflicts, summariseConflicts, OVERRIDE_TOKEN } from "./_local/redeploy-gate.ts";

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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  const auth = await verifyCaller(req, "admin");
  if (!auth.ok) return json({ error: auth.error }, auth.status ?? 401);

  let body: { function_name?: string; reason?: string; override?: string };
  try { body = await req.json(); } catch { return json({ error: "invalid_json" }, 400); }

  const fn = String(body.function_name ?? "").trim();
  const reason = String(body.reason ?? "").trim();
  const override = String(body.override ?? "").trim();
  if (!fn) return json({ error: "missing_function_name" }, 400);
  if (!reason) return json({ error: "missing_reason" }, 400);

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );

  // Run the gate.
  const conflicts = await detectRedeployConflicts(supabase);
  const overrideUsed = override === OVERRIDE_TOKEN;

  // PATH A — conflicts and no override: 409.
  if (conflicts.length > 0 && !overrideUsed) {
    await writeActionLog(supabase, {
      actor_user_id: auth.userId!,
      action: "admin_redeploy",
      target_table: "redeploy_queue",
      target_id: null,
      payload: { function_name: fn, reason },
      result: { blocked: true, conflicts: conflicts.slice(0, 50), summary: summariseConflicts(conflicts) },
      ok: false,
    });
    return json({
      ok: false, blocked: true,
      conflicts: conflicts.slice(0, 50),
      summary: summariseConflicts(conflicts),
      hint: `retry with override='${OVERRIDE_TOKEN}' after confirming these are safe to interrupt`,
    }, 409);
  }

  // PATH B / C — gate clear or override provided: queue the marker row.
  const { data: queued, error: qErr } = await supabase.from("redeploy_queue").insert({
    function_name: fn,
    reason,
    requested_by: auth.userId,
    override_used: overrideUsed,
    conflicts: conflicts.slice(0, 50),
    status: "queued",
  }).select("id, requested_at").single();

  const okQueue = !qErr && !!queued;
  await writeActionLog(supabase, {
    actor_user_id: auth.userId!,
    action: "admin_redeploy",
    target_table: "redeploy_queue",
    target_id: (queued as any)?.id ?? null,
    payload: { function_name: fn, reason, override_used: overrideUsed },
    result: {
      queued: okQueue,
      queue_id: (queued as any)?.id ?? null,
      conflicts_at_gate: conflicts.length,
      note: "Marker row only. Human courier executes the deploy; management-API auto-execute is intentionally not wired.",
    },
    ok: okQueue,
  });

  if (!okQueue) return json({ ok: false, error: "queue_insert_failed", detail: qErr?.message }, 500);
  return json({
    ok: true,
    queued: true,
    queue_id: (queued as any).id,
    requested_at: (queued as any).requested_at,
    override_used: overrideUsed,
    note: "Redeploy queued for courier execution. Management-API auto-execute is not wired by policy.",
  }, 202);
});
