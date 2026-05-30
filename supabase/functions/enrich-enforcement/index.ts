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

const PROMPT_WITH_TEXT = `You are a privacy enforcement analyst with access to
the full text of a regulatory enforcement decision.

Your task: classify this enforcement action for a compliance intelligence
database. Return a JSON object with these fields.

SOURCE FIDELITY RULES:
1. key_compliance_failure: Extract the core compliance failure in one plain-
   English sentence. MUST be traceable to the document text provided. If you
   cannot ground this in the raw_text, return null.
2. preventive_measures: One sentence on what the organisation should have done.
   MUST be grounded in the document text. If not determinable from text, null.
3. precedent_significance: Rate 1-5 based on what the document text reveals
   about the decision's significance (novel legal theory = 4-5; routine = 1-2).
   Base this on the document, not general knowledge. If raw_text is thin, return 2.
4. data_categories and violation_types: Infer from raw_text AND title combined.
   Use the controlled vocabularies exactly.
5. fine_eur_equivalent: Convert fine_amount to EUR using known exchange rates.
   Only estimate if currency is clear from the record.

Fields:
- data_categories: string[] from: ["health","biometric","children","financial",
  "location","communications","behavioral","employment","general"]
- violation_types: string[] from: ["unlawful processing","insufficient legal
  basis","security failure","cookie consent","SAR failure","data transfer",
  "DPIA missing","retention","transparency","DPO failure","children's data",
  "biometric"]
- industry_sector: one of: adtech, healthcare, finance, retail, telecom, media,
  public sector, education, transport, hospitality, technology, employer, other
- company_type: controller | processor | joint controller | public authority |
  individual
- key_compliance_failure: string | null (grounded in document text only)
- preventive_measures: string | null (grounded in document text only)
- tool_relevance: string[] subset of: ["DPIA","LIA","Records of Processing",
  "Vendor DD","Cookie Consent","Breach Response","DSR Workflow","Children
  Compliance","Biometric Compliance","Cross-Border Transfer"]
- breach_related: boolean
- biometric_related: boolean
- dpa_related: boolean
- precedent_significance: integer 1-5
- fine_eur_equivalent: number | null

Return only valid JSON. No preamble.`;

const PROMPT_TITLE_ONLY = `You are a privacy enforcement analyst classifying an
enforcement action record that has only metadata available (no decision text).

CRITICAL CONSTRAINT: You have only the title, regulator, jurisdiction, and fine
amount. You do NOT have the decision text.

Rules for title-only classification:
- data_categories, violation_types, industry_sector, company_type,
  breach_related, biometric_related, dpa_related: infer from title keywords only.
  Use conservative defaults when title is ambiguous.
- key_compliance_failure: MUST be null. A title is not sufficient to state the
  compliance failure accurately. Do not generate this from training knowledge.
- preventive_measures: MUST be null. Same reason.
- precedent_significance: Return 1 (routine/unknown) for all title-only records.
  Do not rate significance without reading the decision.
- tool_relevance: Infer from title keywords only. Be conservative.
- fine_eur_equivalent: Convert fine_amount to EUR if currency is determinable.

Fields (same schema as above).
Return only valid JSON. No preamble.`;

async function enrichOne(row: any): Promise<{ data: Record<string, unknown> | null; hasBodyText: boolean }> {
  const apiKey = Deno.env.get("LOVABLE_API_KEY");
  if (!apiKey) throw new Error("LOVABLE_API_KEY not set");

  const hasBodyText = typeof row.raw_text === "string" &&
    row.raw_text.trim().length >= 200;

  const systemPrompt = hasBodyText ? PROMPT_WITH_TEXT : PROMPT_TITLE_ONLY;

  const context = JSON.stringify({
    regulator: row.regulator,
    jurisdiction: row.jurisdiction,
    subject: row.subject,
    sector: row.sector,
    law: row.law,
    violation: row.violation,
    fine_amount: row.fine_amount,
    fine_eur: row.fine_eur,
    raw_text: hasBodyText ? row.raw_text.slice(0, 6000) : "",
    source_quality: hasBodyText ? "full_text_available" : "title_only",
  });

  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: systemPrompt },
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
  try {
    const parsed = JSON.parse(text);
    if (!hasBodyText) {
      // Enforce null constraints regardless of model output
      parsed.key_compliance_failure = null;
      parsed.preventive_measures = null;
      parsed.precedent_significance = 1;
    }
    return { data: parsed, hasBodyText };
  } catch {
    return { data: null, hasBodyText };
  }
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
