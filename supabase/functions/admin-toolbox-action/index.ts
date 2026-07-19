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

// MC-S1b — Task 3/6/7: extended action set. `redeploy_request` fronts
// admin-redeploy (which owns the two-source conflict gate). `cancel_stale_run`
// marks a quality_batch_runs row cancelled after typed confirmation.
// `resnap_baseline` writes an epoch marker to quality_batch_baselines.
// `invoke_backfill` is the wired handler for the /admin/ops Backfill buttons.
const ALLOWED = new Set([
  "reap_sweep", "ping", "invoke_generator",
  "cancel_stale_run", "redeploy_request", "resnap_baseline", "invoke_backfill",
]);


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
    } else if (action === "invoke_generator") {
      // Diagnostic: directly invoke any generator via raw fetch using the
      // service key, so we can capture the true HTTP status + body when the
      // supabase-js `functions.invoke` wrapper masks non-2xx responses as
      // "Edge Function returned a non-2xx status code".
      const params = (body.params ?? {}) as { fn?: string; payload?: Record<string, unknown> };
      const fn = String(params.fn ?? "");
      if (!fn) {
        ok = false;
        result = { error: "missing_fn" };
      } else {
        const url = `${Deno.env.get("SUPABASE_URL")}/functions/v1/${fn}`;
        const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
        const t0 = Date.now();
        const res = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${key}`,
            "apikey": key,
          },
          body: JSON.stringify(params.payload ?? {}),
        });
        const text = await res.text();
        result = {
          invoked: fn,
          status: res.status,
          elapsed_ms: Date.now() - t0,
          body: text.slice(0, 2000),
        };
        if (!res.ok) ok = false;
      }
    } else if (action === "cancel_stale_run") {
      // MC-G5. Requires typed confirmation and a run_id. Only marks rows that
      // are actually stale (heartbeat > 30m OR no heartbeat and running > 30m).
      const params = (body.params ?? {}) as { run_id?: string; confirm?: string };
      if (params.confirm !== "CANCEL-STALE") {
        ok = false; result = { error: "missing_confirmation", expected: "CANCEL-STALE" };
      } else if (!params.run_id) {
        ok = false; result = { error: "missing_run_id" };
      } else {
        const { data: row } = await supabase
          .from("quality_batch_runs")
          .select("id,status,last_heartbeat_at,created_at")
          .eq("id", params.run_id).maybeSingle();
        if (!row) { ok = false; result = { error: "run_not_found" }; }
        else if (row.status !== "running") {
          ok = false; result = { error: "not_running", status: row.status };
        } else {
          const hb = row.last_heartbeat_at ? new Date(row.last_heartbeat_at).getTime() : new Date(row.created_at).getTime();
          const staleMs = Date.now() - hb;
          if (staleMs < 30 * 60_000) {
            ok = false; result = { error: "not_stale_yet", stale_ms: staleMs };
          } else {
            const { error: uErr } = await supabase.from("quality_batch_runs").update({
              status: "cancelled", phase: "done",
              cancel_requested: true,
              last_error: "cancelled by operator (stale-run cancel)",
              completed_at: new Date().toISOString(),
            }).eq("id", params.run_id);
            if (uErr) { ok = false; result = { error: uErr.message }; }
            else result = { cancelled: params.run_id, stale_ms: staleMs };
          }
        }
      }
    } else if (action === "redeploy_request") {
      // MC-S1b Task 3 — thin dispatcher to admin-redeploy. Body: { function_name, reason, override? }
      const params = (body.params ?? {}) as { function_name?: string; reason?: string; override?: string };
      const url = `${Deno.env.get("SUPABASE_URL")}/functions/v1/admin-redeploy`;
      const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      // Forward the ORIGINAL admin user's JWT so admin-redeploy's verifyCaller
      // stamps the request with the correct actor_user_id.
      const auth = req.headers.get("Authorization") ?? `Bearer ${key}`;
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": auth, "apikey": key },
        body: JSON.stringify(params),
      });
      const text = await res.text();
      result = { status: res.status, body: text.slice(0, 2000) };
      if (!res.ok) ok = false;
    } else if (action === "resnap_baseline") {
      // MC-S1b Task 3 + HF2 Task 7(d) — write an epoch marker into
      // quality_batch_baselines stamped with the current
      // GRADER_CONTEXT_VERSION. quality_batch_baselines has (tool PRIMARY
      // KEY, claude_score, gpt_score, avg_score, captured_at, instrument_version)
      // — no `id`, no `note` column. Callers must pass a `tool` value; we
      // UPSERT so a resnap replaces the prior baseline row for that tool.
      const params = (body.params ?? {}) as { confirm?: string; tool?: string };
      if (params.confirm !== "RESNAP-BASELINE") {
        ok = false; result = { error: "missing_confirmation", expected: "RESNAP-BASELINE" };
      } else if (!params.tool || typeof params.tool !== "string") {
        ok = false; result = { error: "missing_tool", expected: "tool: 'cppa-risk'|'dpia'|'lia'|'dpa'|..." };
      } else {
        const { GRADER_CONTEXT_VERSION } = await import("../_shared/grader/context.ts");
        const { error } = await supabase.from("quality_batch_baselines").upsert({
          tool: params.tool,
          instrument_version: GRADER_CONTEXT_VERSION,
          captured_at: new Date().toISOString(),
        }, { onConflict: "tool" });
        if (error) { ok = false; result = { error: error.message }; }
        else result = { tool: params.tool, instrument_version: GRADER_CONTEXT_VERSION };
      }
    } else if (action === "invoke_backfill") {
      // MC-S1b Task 3 — wire /admin/ops Backfill buttons. Body: { fn, batch_size? }
      const params = (body.params ?? {}) as { fn?: string; batch_size?: number };
      const fn = String(params.fn ?? "");
      if (!fn.startsWith("backfill-") && !fn.startsWith("enrich-")) {
        ok = false; result = { error: "fn_not_allowed", fn };
      } else {
        const url = `${Deno.env.get("SUPABASE_URL")}/functions/v1/${fn}`;
        const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
        const res = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json", "Authorization": `Bearer ${key}`, "apikey": key },
          body: JSON.stringify({ batchSize: Math.max(1, Math.min(500, Number(params.batch_size) || 25)) }),
        });
        const text = await res.text();
        result = { invoked: fn, status: res.status, body: text.slice(0, 1500) };
        if (!res.ok) ok = false;
      }
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
