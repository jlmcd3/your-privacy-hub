// admin-toolbox-action — dispatch a small set of allowlisted operator actions
// and record every call in admin_action_log. Actions are named, not
// free-form; the palette on /admin/tools posts here.
//
// Phase 1 allowlist:
//   - reap_sweep    → invoke reap-stuck-generations
//   - ping          → no-op (health check for the palette)
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { verifyCaller } from "../_shared/verify-caller.ts";
import { writeActionLog } from "../_shared/write-action-log.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const ALLOWED = new Set(["reap_sweep", "ping", "invoke_generator"]);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405, headers: corsHeaders });
  }

  const auth = await verifyCaller(req, "admin");
  if (!auth.ok) {
    return new Response(JSON.stringify({ error: auth.error }), {
      status: auth.status ?? 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let body: { action?: string; params?: Record<string, unknown> };
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "invalid_json" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  const action = String(body.action ?? "");
  if (!ALLOWED.has(action)) {
    return new Response(JSON.stringify({ error: "action_not_allowed", action }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );

  let result: Record<string, unknown> = {};
  let ok = true;
  try {
    if (action === "ping") {
      result = { pong: true, at: new Date().toISOString() };
    } else if (action === "reap_sweep") {
      const { data, error } = await supabase.functions.invoke("reap-stuck-generations", {
        body: body.params ?? {},
      });
      if (error) { ok = false; result = { error: error.message }; }
      else { result = { invoked: "reap-stuck-generations", response: data }; }
    }
  } catch (err) {
    ok = false;
    result = { error: err instanceof Error ? err.message : String(err) };
  }

  await writeActionLog(supabase, {
    actor_user_id: auth.userId!,
    action,
    payload: body.params ?? {},
    result,
    ok,
  });

  return new Response(JSON.stringify({ ok, action, result }), {
    status: ok ? 200 : 500,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
