// Enrich enforcement_actions rows with normalized fields via Claude Haiku.
// Selects rows where enrichment_version = 0 and updates intelligence columns.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ENRICHMENT_VERSION = 1;

const PROMPT = `You are a privacy enforcement analyst. Given the following enforcement action record, return a JSON object with these fields (no preamble, no commentary):
- data_categories: string[] (e.g. ["health","biometric","children","financial","location","communications","behavioral","employment"])
- violation_types: string[] (e.g. ["unlawful processing","insufficient legal basis","security failure","cookie consent","SAR failure","data transfer","DPIA missing","retention","transparency","DPO failure","children's data","biometric"])
- industry_sector: string (one of: adtech, healthcare, finance, retail, telecom, media, public sector, education, transport, hospitality, technology, employer, other)
- company_type: string (controller, processor, joint controller, public authority, individual)
- key_compliance_failure: string (one sentence, plain English)
- preventive_measures: string (one sentence, plain English; what the org should have done)
- tool_relevance: string[] (subset of: ["DPIA","LIA","Records of Processing","Vendor DD","Cookie Consent","Breach Response","DSR Workflow","Children Compliance","Biometric Compliance","Cross-Border Transfer"])
- breach_related: boolean
- biometric_related: boolean
- dpa_related: boolean (true if a DPA/regulator action; false if civil litigation)
- precedent_significance: integer 1-5 (1 = routine, 5 = landmark)
- fine_eur_equivalent: number | null (estimate in EUR if possible)
Return only valid JSON.`;

async function enrichOne(row: any): Promise<Record<string, unknown> | null> {
  const apiKey = Deno.env.get("LOVABLE_API_KEY");
  if (!apiKey) throw new Error("LOVABLE_API_KEY not set");

  const context = JSON.stringify({
    regulator: row.regulator,
    jurisdiction: row.jurisdiction,
    subject: row.subject,
    sector: row.sector,
    law: row.law,
    violation: row.violation,
    fine_amount: row.fine_amount,
    fine_eur: row.fine_eur,
    raw_text: (row.raw_text || "").slice(0, 6000),
  });

  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: PROMPT },
        { role: "user", content: context },
      ],
      response_format: { type: "json_object" },
    }),
  });

  if (res.status === 429) throw new Error("rate_limited");
  if (res.status === 402) throw new Error("payment_required");
  if (!res.ok) throw new Error(`AI ${res.status}`);
  const data = await res.json();
  const text = data.choices?.[0]?.message?.content;
  try { return JSON.parse(text); } catch { return null; }
}

import { startRun, finishRun, failRun } from "../_shared/run-logger.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const url = new URL(req.url);
  const limit = Math.min(parseInt(url.searchParams.get("limit") ?? "25"), 100);

  const run = await startRun(supabase, "enrich-enforcement", { limit });

  // Atomically claim a batch via FOR UPDATE SKIP LOCKED RPC.
  // Claimed rows are marked enrichment_version = -1 (in-progress) so parallel
  // workers do not pick them up.
  const { data: rows, error } = await supabase.rpc("claim_enforcement_for_enrichment", {
    _limit: limit,
    _target_version: ENRICHMENT_VERSION,
  });

  if (error) {
    await failRun(supabase, run, error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  let updated = 0, failed = 0, rateLimited = 0;

  try {
    for (const row of rows ?? []) {
      try {
        const enriched = await enrichOne(row);
        if (!enriched) {
          failed++;
          await supabase.from("enforcement_actions").update({ enrichment_version: 0 }).eq("id", row.id);
          continue;
        }

        const update: Record<string, unknown> = {
          data_categories: Array.isArray(enriched.data_categories) ? enriched.data_categories : null,
          violation_types: Array.isArray(enriched.violation_types) ? enriched.violation_types : null,
          industry_sector: typeof enriched.industry_sector === "string" ? enriched.industry_sector : null,
          company_type: typeof enriched.company_type === "string" ? enriched.company_type : null,
          key_compliance_failure: typeof enriched.key_compliance_failure === "string" ? enriched.key_compliance_failure : null,
          preventive_measures: typeof enriched.preventive_measures === "string" ? enriched.preventive_measures : null,
          tool_relevance: Array.isArray(enriched.tool_relevance) ? enriched.tool_relevance : null,
          breach_related: Boolean(enriched.breach_related),
          biometric_related: Boolean(enriched.biometric_related),
          dpa_related: Boolean(enriched.dpa_related),
          precedent_significance: typeof enriched.precedent_significance === "number" ? Math.max(1, Math.min(5, Math.round(enriched.precedent_significance))) : null,
          fine_eur_equivalent: typeof enriched.fine_eur_equivalent === "number" ? enriched.fine_eur_equivalent : row.fine_eur ?? null,
          enrichment_version: ENRICHMENT_VERSION,
        };

        const { error: upErr } = await supabase.from("enforcement_actions").update(update).eq("id", row.id);
        if (upErr) {
          failed++;
          console.error("update", row.id, upErr.message);
          await supabase.from("enforcement_actions").update({ enrichment_version: 0 }).eq("id", row.id);
        } else {
          updated++;
        }
      } catch (e) {
        const msg = (e as Error).message;
        if (msg === "rate_limited") { rateLimited++; await new Promise((r) => setTimeout(r, 2000)); }
        else { failed++; console.error("enrich", row.id, msg); }
        await supabase.from("enforcement_actions").update({ enrichment_version: 0 }).eq("id", row.id);
      }
      await new Promise((r) => setTimeout(r, 300));
    }
  } catch (e) {
    await failRun(supabase, run, e, {
      fetched: rows?.length ?? 0,
      enriched: updated,
      enrichmentFailed429: rateLimited,
      enrichmentFailedOther: failed,
    });
    throw e;
  }

  await finishRun(supabase, run, {
    fetched: rows?.length ?? 0,
    enriched: updated,
    enrichmentFailed429: rateLimited,
    enrichmentFailedOther: failed,
    status: (failed > 0 || rateLimited > 0) ? "partial" : "success",
  });

  return new Response(JSON.stringify({ candidates: rows?.length ?? 0, updated, failed, rateLimited }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } });
});
