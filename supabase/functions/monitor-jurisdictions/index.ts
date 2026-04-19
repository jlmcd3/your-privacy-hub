// Monthly + weekly-AI-Act monitoring of jurisdiction authority pages.
// Fetches each authority_url, hashes the body, and logs changes to
// jurisdiction_monitoring_log for human review. Lightweight signal-only —
// the human reviewer follows up on the actual diff.
//
// Triggered by pg_cron:
//   - monthly: all rows
//   - weekly:  rows where law_name ILIKE '%AI Act%' or jurisdiction_code='EU-AI'

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

async function sha256(s: string): Promise<string> {
  const buf = new TextEncoder().encode(s);
  const hash = await crypto.subtle.digest("SHA-256", buf);
  return Array.from(new Uint8Array(hash)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { mode } = await req.json().catch(() => ({ mode: "monthly" }));
    const isWeekly = mode === "weekly_ai_act";

    let query = supabase.from("jurisdiction_requirements").select("*");
    if (isWeekly) {
      query = query.or("law_name.ilike.%AI Act%,jurisdiction_code.eq.EU-AI,ai_registration_required.eq.true");
    }

    const { data: reqs, error } = await query;
    if (error) throw error;

    const checked: string[] = [];
    const changes: Array<{ jurisdiction_code: string; check_type: string }> = [];

    for (const r of reqs || []) {
      if (!r.authority_url) continue;
      checked.push(r.jurisdiction_code);
      try {
        const resp = await fetch(r.authority_url, {
          headers: { "User-Agent": "EndUserPrivacy-RegistrationMonitor/1.0" },
          signal: AbortSignal.timeout(15000),
        });
        if (!resp.ok) continue;
        const body = (await resp.text()).slice(0, 200_000);
        const hash = await sha256(body);

        // Get previous hash from monitoring log
        const { data: prev } = await supabase
          .from("jurisdiction_monitoring_log")
          .select("new_value")
          .eq("jurisdiction_code", r.jurisdiction_code)
          .eq("check_type", "page_hash")
          .order("detected_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (!prev || prev.new_value !== hash) {
          await supabase.from("jurisdiction_monitoring_log").insert({
            jurisdiction_code: r.jurisdiction_code,
            check_type: "page_hash",
            previous_value: prev?.new_value || null,
            new_value: hash,
            source_url: r.authority_url,
          });
          changes.push({ jurisdiction_code: r.jurisdiction_code, check_type: "page_hash" });
        }

        // Update last_verified_at on the requirement row
        await supabase.from("jurisdiction_requirements")
          .update({ last_verified_at: new Date().toISOString() })
          .eq("id", r.id);
      } catch (e) {
        console.warn(`Monitor failed for ${r.jurisdiction_code}:`, (e as Error).message);
      }
    }

    return new Response(JSON.stringify({
      mode: isWeekly ? "weekly_ai_act" : "monthly",
      checked: checked.length,
      changes_detected: changes.length,
      changes,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("monitor-jurisdictions error", e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
