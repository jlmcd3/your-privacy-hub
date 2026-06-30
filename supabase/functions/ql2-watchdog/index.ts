// ql2-watchdog — re-invoke ql2-orchestrator for any running run whose
// heartbeat is > 8 minutes stale. Service-role; no auth on inbound (called
// by pg_cron). Does NOT mark anything failed — orchestrator is idempotent.

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
  const cutoff = new Date(Date.now() - 8 * 60_000).toISOString();
  const { data: stale, error } = await admin
    .from("quality_loop2_runs")
    .select("id, phase, last_heartbeat_at")
    .eq("status", "running")
    .or(`last_heartbeat_at.lt.${cutoff},last_heartbeat_at.is.null`);
  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...cors, "Content-Type": "application/json" },
    });
  }
  let resumed = 0;
  for (const row of stale ?? []) {
    try {
      await fetch(`${SUPABASE_URL}/functions/v1/ql2-orchestrator`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${SERVICE_KEY}`,
          apikey: SERVICE_KEY,
          "x-internal-resume": "1",
        },
        body: JSON.stringify({ run_id: (row as any).id }),
      });
      resumed++;
    } catch (e) {
      console.warn("[ql2-watchdog] resume failed", (row as any).id, (e as Error).message);
    }
  }
  return new Response(JSON.stringify({ checked: stale?.length ?? 0, resumed }), {
    headers: { ...cors, "Content-Type": "application/json" },
  });
});
