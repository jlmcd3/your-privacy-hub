// verification-queue-drain: picks queued rows, marks them in-flight, and calls
// verification-scan in 'targeted' mode. Scheduled hourly via pg_cron.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2/cors";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const sb = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const nowIso = new Date().toISOString();
    const claimUntil = new Date(Date.now() + 10 * 60 * 1000).toISOString();

    // Select up to 10 eligible rows.
    const { data: candidates } = await sb
      .from("verification_queue")
      .select("enforcement_action_id, priority, queued_at, attempts, in_flight_until")
      .lt("attempts", 3)
      .or(`in_flight_until.is.null,in_flight_until.lt.${nowIso}`)
      .order("priority", { ascending: false })
      .order("queued_at", { ascending: true })
      .limit(10);

    const ids = (candidates ?? []).map((r) => r.enforcement_action_id);
    if (ids.length === 0) {
      return new Response(JSON.stringify({ drained: 0, message: "queue_empty" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Mark in-flight.
    await sb
      .from("verification_queue")
      .update({ in_flight_until: claimUntil, last_attempt_at: nowIso })
      .in("enforcement_action_id", ids);

    // Call verification-scan.
    const url = `${supabaseUrl}/functions/v1/verification-scan`;
    let scanError: string | null = null;
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${serviceKey}`,
        },
        body: JSON.stringify({
          mode: "targeted",
          target_ids: ids,
          batch_size: ids.length,
        }),
      });
      if (!res.ok) scanError = `http_${res.status}: ${(await res.text()).slice(0, 200)}`;
    } catch (e) {
      scanError = (e as Error).message?.slice(0, 200) ?? "unknown_error";
    }

    if (scanError) {
      // Increment attempts, clear in_flight_until.
      for (const id of ids) {
        const row = (candidates ?? []).find((r) => r.enforcement_action_id === id);
        await sb
          .from("verification_queue")
          .update({
            attempts: (row?.attempts ?? 0) + 1,
            last_error: scanError,
            in_flight_until: null,
          })
          .eq("enforcement_action_id", id);
      }
      return new Response(JSON.stringify({ drained: 0, attempted: ids.length, error: scanError }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Success — delete from queue.
    await sb.from("verification_queue").delete().in("enforcement_action_id", ids);
    return new Response(JSON.stringify({ drained: ids.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message ?? String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
