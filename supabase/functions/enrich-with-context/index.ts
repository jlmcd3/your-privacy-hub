import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { article_id, force = false } = await req.json();

    if (!article_id) {
      return new Response(JSON.stringify({ error: "article_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: article, error: fetchError } = await supabase
      .from("updates")
      .select("id, title, summary, ai_summary, url, category, affected_jurisdictions, direct_jurisdictions, published_at, contextual_record, enrichment_quality")
      .eq("id", article_id)
      .single();

    if (fetchError || !article) {
      return new Response(JSON.stringify({ error: "Article not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const ai = (article.ai_summary as any) || {};
    const whyItMatters: string = ai.why_it_matters || "";
    const jurisdiction = (article.direct_jurisdictions?.[0] || article.affected_jurisdictions?.[0] || "") as string;

    // Quality gate
    if (!article.title || (!article.summary && !whyItMatters)) {
      return new Response(JSON.stringify({
        skipped: true, reason: "quality_gate_failed", article_id,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (!force && article.contextual_record && article.enrichment_quality === "contextual") {
      return new Response(JSON.stringify({
        skipped: true, reason: "already_enriched", article_id,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const baseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const authHeader = { Authorization: `Bearer ${serviceKey}`, "Content-Type": "application/json" };

    let enforcementContext = "";
    try {
      const enfResp = await fetch(`${baseUrl}/functions/v1/get-enforcement-context`, {
        method: "POST",
        headers: authHeader,
        body: JSON.stringify({
          category: article.category,
          jurisdiction,
          article_title: article.title,
          article_summary: article.summary || whyItMatters || "",
        }),
      });
      if (enfResp.ok) {
        const enfData = await enfResp.json();
        enforcementContext = enfData.context || enfData.enforcement_context || JSON.stringify(enfData?.results || "").slice(0, 4000);
      }
    } catch (e) {
      console.warn("get-enforcement-context failed:", (e as Error).message);
    }

    let longitudinalContext = "";
    try {
      const longResp = await fetch(`${baseUrl}/functions/v1/generate-longitudinal-synthesis`, {
        method: "POST",
        headers: authHeader,
        body: JSON.stringify({
          topic: article.title,
          category: article.category,
          jurisdiction,
        }),
      });
      if (longResp.ok) {
        const longData = await longResp.json();
        longitudinalContext = longData.synthesis || longData.context || "";
      }
    } catch (e) {
      console.warn("generate-longitudinal-synthesis failed:", (e as Error).message);
    }

    const anthropicKey = Deno.env.get("ANTHROPIC_API_KEY")!;

    const articleContext = `
ARTICLE TITLE: ${article.title}
SUMMARY: ${article.summary || ""}
WHY IT MATTERS: ${whyItMatters}
CATEGORY: ${article.category || ""}
JURISDICTION: ${jurisdiction}
PUBLISHED: ${article.published_at || ""}
    `.trim();

    const systemPrompt = `You are a privacy regulatory intelligence analyst.

You produce structured contextual intelligence grounded STRICTLY in the article text AND the two corpus context blocks provided below. You DO NOT draw on outside knowledge of cases, fines, regulators, or enforcement statistics.

ENFORCEMENT CORPUS CONTEXT (the ONLY source of enforcement patterns and case references you may cite):
${enforcementContext || "NO ENFORCEMENT CONTEXT AVAILABLE."}

LONGITUDINAL PATTERN CONTEXT (the ONLY source of trend claims you may cite):
${longitudinalContext || "NO LONGITUDINAL CONTEXT AVAILABLE."}

SOURCE FIDELITY RULES (non-negotiable):
- If a claim is not supported by (a) the article text, (b) the enforcement corpus context, or (c) the longitudinal context, you MUST NOT include it.
- Do not invent case names, fine amounts, frequencies, regulator positions, or comparators.
- If enforcement corpus context is "NO ENFORCEMENT CONTEXT AVAILABLE" or thin: enforcement_pattern must say so honestly (e.g. "No comparable enforcement found in corpus for this theory") and key_cases MUST be [].
- If longitudinal context is missing: precedent_novelty must rely only on what the article itself says about prior practice, or be a conservative "Routine application of established obligation" rather than a fabricated trend.
- Better to produce a short, honest, narrowly-grounded record than a confident-sounding fabrication.

You must respond with valid JSON only. No preamble, no markdown fences.`;

    const userPrompt = `Analyse this regulatory development and produce contextual intelligence for privacy professionals — grounded ONLY in the article text and the corpus context above.

${articleContext}

Produce a JSON object with exactly these fields:

{
  "why_it_matters_short": "One to two plain-English sentences explaining the significance of this development for any reader, including non-specialists. No jargon. No references to specific articles or cases.",

  "contextual_teaser": "One sentence that tells a free-tier reader that contextual intelligence exists for this article, without revealing the substance. Example: 'This decision connects to 11 prior enforcement patterns in our corpus involving the same legal theory.' Only claim a numeric pattern count if the enforcement corpus context above explicitly supports it.",

  "action_items": [
    { "time_horizon": "now", "action": "Specific, concrete action a privacy professional should take immediately (within 2 weeks), tied to a law or regulator explicitly named in the article", "role": "DPO" },
    { "time_horizon": "this_quarter", "action": "Action to complete within the next 3 months, tied to a named obligation", "role": "Legal" },
    { "time_horizon": "ongoing", "action": "Standing practice or monitoring activity", "role": "All" }
  ],

  "contextual_record": {
    "regulatory_theory": "The legal or regulatory principle at the core of this development, drawn from the article text. Name the article/section/statute if and only if the article text names it.",
    "precedent_novelty": "How does this development extend, confirm, or depart from existing precedent? Cite ONLY precedent that appears in the corpus or longitudinal context above. If neither supports a comparison, write 'Insufficient corpus context to assess novelty.'",
    "enforcement_pattern": "What pattern does this fit in the enforcement corpus? Use ONLY the enforcement corpus context above. If that context is empty or thin, write 'No comparable enforcement found in corpus.' Do not invent frequencies or averages.",
    "key_cases": ["Short reference to a related case taken VERBATIM from the enforcement corpus context above"]
  }
}

Rules:
- action_items must have exactly one item per time_horizon value. Do not repeat time_horizon values.
- contextual_record fields must be substantive paragraphs, not one-liners — but only as substantive as the grounded evidence allows.
- key_cases MUST be [] unless the enforcement corpus context above contains explicit case references; never fabricate.
- why_it_matters_short must be genuinely short (max 40 words).
- contextual_teaser must be one sentence, max 25 words, and must not assert numeric pattern counts unless the corpus context provides them.`;

    const claudeResp = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": anthropicKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-5",
        max_tokens: 1500,
        system: systemPrompt,
        messages: [{ role: "user", content: userPrompt }],
      }),
    });

    if (!claudeResp.ok) {
      const err = await claudeResp.text();
      throw new Error(`Claude API error: ${err}`);
    }

    const claudeData = await claudeResp.json();
    const rawText = claudeData.content?.[0]?.text || "";

    let generated: {
      why_it_matters_short: string;
      contextual_teaser: string;
      action_items: Array<{ time_horizon: string; action: string; role: string }>;
      contextual_record: {
        regulatory_theory: string;
        precedent_novelty: string;
        enforcement_pattern: string;
        key_cases: string[];
      };
    };

    try {
      const clean = rawText.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
      generated = JSON.parse(clean);
    } catch {
      throw new Error(`Failed to parse Claude response as JSON: ${rawText.slice(0, 200)}`);
    }

    if (!generated.why_it_matters_short || !generated.contextual_record) {
      throw new Error("Claude response missing required fields");
    }

    const { error: updateError } = await supabase
      .from("updates")
      .update({
        why_it_matters_short: generated.why_it_matters_short,
        contextual_teaser: generated.contextual_teaser,
        action_items: generated.action_items,
        contextual_record: generated.contextual_record,
        enrichment_quality: "contextual",
      })
      .eq("id", article_id);

    if (updateError) throw updateError;

    return new Response(JSON.stringify({
      success: true,
      article_id,
      fields_updated: ["why_it_matters_short", "contextual_teaser", "action_items", "contextual_record", "enrichment_quality"],
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (err) {
    console.error("enrich-with-context error:", err);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
