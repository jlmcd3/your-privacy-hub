// get-memo-eligible-with-freshness: partitions a set of citation IDs into
// ready / excluded / stale based on memo_eligible + verification_last_run_at.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2/cors";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const sb = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const body = await req.json().catch(() => ({}));
    const ids: string[] = Array.isArray(body.enforcement_action_ids) ? body.enforcement_action_ids : [];
    const thresholdDays: number = Number.isFinite(body.freshness_threshold_days) ? body.freshness_threshold_days : 180;
    if (ids.length === 0) {
      return new Response(JSON.stringify({ ready_ids: [], excluded_ids: [], stale_ids: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const threshold = new Date(Date.now() - thresholdDays * 24 * 3600 * 1000);

    const { data, error } = await sb
      .from("enforcement_actions")
      .select("id, memo_eligible, verification_last_run_at")
      .in("id", ids);
    if (error) throw error;

    const ready_ids: string[] = [];
    const excluded_ids: string[] = [];
    const stale_ids: string[] = [];
    for (const row of data ?? []) {
      if (!row.memo_eligible) {
        excluded_ids.push(row.id);
        continue;
      }
      const ranAt = row.verification_last_run_at ? new Date(row.verification_last_run_at) : null;
      if (!ranAt || ranAt <= threshold) {
        stale_ids.push(row.id);
      } else {
        ready_ids.push(row.id);
      }
    }
    return new Response(JSON.stringify({ ready_ids, excluded_ids, stale_ids }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message ?? String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
