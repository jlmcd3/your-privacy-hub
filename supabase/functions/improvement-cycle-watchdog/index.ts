// improvement-cycle-watchdog — G2 universal net.
//
// Runs every 5 min via pg_cron. Any tool_improvement_cycles row in status="running"
// whose last_heartbeat_at has not advanced in >12 minutes is force-failed so the
// UI spinner clears and no cycle can hang indefinitely.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  const admin = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });
  const cutoff = new Date(Date.now() - 12 * 60_000).toISOString();

  // Find running cycles with stale (or missing) heartbeat.
  const { data: stale, error } = await admin
    .from("tool_improvement_cycles")
    .select("id, phase, last_heartbeat_at, started_at, last_error")
    .eq("status", "running")
    .or(`last_heartbeat_at.lt.${cutoff},last_heartbeat_at.is.null`);
  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...cors, "Content-Type": "application/json" },
    });
  }

  // Don't fail brand-new cycles that simply haven't written a heartbeat yet
  // (give them 12 minutes from started_at before the watchdog reaps them).
  const reapable = (stale ?? []).filter((c: any) => {
    if (c.last_heartbeat_at) return true;
    const startedMs = c.started_at ? new Date(c.started_at).getTime() : 0;
    return startedMs && Date.now() - startedMs > 12 * 60_000;
  });

  let failed = 0;
  for (const row of reapable) {
    const note = ` [watchdog: no heartbeat >12m at phase ${(row as any).phase ?? "?"}]`;
    const { error: upErr } = await admin.from("tool_improvement_cycles").update({
      status: "failed",
      last_error: ((row as any).last_error ?? "") + note,
      completed_at: new Date().toISOString(),
    }).eq("id", (row as any).id).eq("status", "running");
    if (!upErr) failed++;
  }

  return new Response(JSON.stringify({ checked: stale?.length ?? 0, reaped: failed }), {
    headers: { ...cors, "Content-Type": "application/json" },
  });
});
