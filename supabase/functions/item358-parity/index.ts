/**
 * ITEM 358 — TEMPORARY PARITY / LIVE-SMOKE DRIVER.
 *
 * Same pattern as the Item 357 `item357-parity` driver: creates the two smoke
 * rows from the pinned fixtures, invokes the DEPLOYED
 * `run-cppa-risk-assessment-v2` over HTTP with the internal service key, waits
 * for the persisted payload, and returns the live `report_data` plus the v2
 * Pass-2R telemetry for both records.
 *
 * DELETE AFTER THE ITEM 358 SMOKE. Nothing routes to it; it is not referenced
 * by any UI surface.
 */
import { runConformanceChecks, formatResults } from "../_shared/ltp/conformance/conformance-checks.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

import PERFECT from "./perfect-a073d9c5.json" with { type: "json" };
import MESSY from "./messy-bd458f0d.json" with { type: "json" };

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

const FIXTURES: Record<string, Record<string, unknown>> = {
  "perfect-a073d9c5": PERFECT as Record<string, unknown>,
  "messy-bd458f0d": MESSY as Record<string, unknown>,
};

async function ownerId(): Promise<string | null> {
  const { data } = await supabase
    .from("cppa_assessments")
    .select("user_id")
    .not("user_id", "is", null)
    .limit(1)
    .maybeSingle();
  return (data as { user_id?: string } | null)?.user_id ?? null;
}

async function runOne(name: string, uid: string | null) {
  const { data: ins, error: insErr } = await supabase
    .from("cppa_assessments")
    .insert({
      user_id: uid,
      status: "pending",
      module: "risk_assessment",
      intake_data: { ...FIXTURES[name], _item358_smoke: name },
    })
    .select("id")
    .single();
  if (insErr || !ins) return { name, error: `insert: ${insErr?.message}` };
  const id = (ins as { id: string }).id;

  const res = await fetch(`${SUPABASE_URL}/functions/v1/run-cppa-risk-assessment-v2`, {
    method: "POST",
    headers: { Authorization: `Bearer ${SERVICE_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ assessment_id: id }),
  });
  const accepted = await res.json().catch(() => ({}));

  return { name, assessment_id: id, accepted };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const u = new URL(req.url);
  const check = u.searchParams.get("check");
  if (check) {
    const ids = check.split(",");
    const out = [];
    for (const id of ids) {
      const { data } = await supabase.from("cppa_assessments").select("status, report_data").eq("id", id).single();
      const report = ((data as Record<string, unknown> | null)?.report_data ?? {}) as Record<string, unknown>;
      const internal = (((report._meta as Record<string, unknown> | undefined)?.internal) ?? {}) as Record<string, unknown>;
      const results = runConformanceChecks(report);
      out.push({
        id,
        status: (data as Record<string, unknown> | null)?.status ?? null,
        keys: Object.keys(report).sort(),
        risk_level: report.risk_level,
        overall_score: report.overall_score,
        information_needed: report.information_needed,
        record_sufficiency: report.record_sufficiency,
        engine_path: internal.engine_path,
        ltp: internal.ltp,
        conformance: formatResults(id, results),
        failed: results.filter((r) => !r.ok),
      });
    }
    return new Response(JSON.stringify({ item: 358, check: out }, null, 2), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const uid = await ownerId();
  const out = [];
  for (const name of Object.keys(FIXTURES)) out.push(await runOne(name, uid));
  return new Response(JSON.stringify({ item: 358, results: out }, null, 2), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
