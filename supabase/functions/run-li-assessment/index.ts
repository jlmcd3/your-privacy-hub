import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function callAnthropic(
  model: string,
  systemPrompt: string,
  userContent: string,
  maxTokens: number = 2000
): Promise<string> {
  const apiKey = Deno.env.get("ANTHROPIC_API_KEY")!;
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model,
      max_tokens: maxTokens,
      system: systemPrompt,
      messages: [{ role: "user", content: userContent }],
    }),
    signal: AbortSignal.timeout(45000),
  });
  if (!res.ok) throw new Error(`Anthropic error: ${res.status}`);
  const data = await res.json();
  return data.content?.[0]?.text || "";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { assessment_id } = await req.json();
    if (!assessment_id) {
      return new Response(JSON.stringify({ error: "assessment_id required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { data: assessment, error: fetchErr } = await supabase
      .from("li_assessments")
      .select("*")
      .eq("id", assessment_id)
      .single();

    if (fetchErr || !assessment) {
      return new Response(JSON.stringify({ error: "Assessment not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    await supabase.from("li_assessments").update({ status: "processing" })
      .eq("id", assessment_id);

    // ── STAGE 1: Classify use case ──
    const classifySystem = `You are a privacy regulatory analyst. Classify processing activities for legitimate interest analysis. Return ONLY valid JSON, no preamble.`;

    const classifyText = await callAnthropic(
      "claude-haiku-4-5-20251001",
      classifySystem,
      `Classify this processing activity for legitimate interest analysis:
Description: ${assessment.processing_description}
Data categories: ${(assessment.data_categories || []).join(", ")}
Relationship type: ${assessment.relationship_type || "not specified"}
Sector: ${assessment.sector || "not specified"}

Return JSON:
{
  "use_case_category": "one of: direct_marketing | fraud_prevention | employee_monitoring | behavioral_advertising | research_analytics | it_security | contractual_administration | other",
  "primary_data_categories": ["list of data categories involved"],
  "special_category_data": true or false,
  "relationship_exists": true or false,
  "jurisdictions_scope": ["list of relevant jurisdictions"]
}`,
      500
    );

    let classification: any = {};
    try {
      const m = classifyText.match(/\{[\s\S]*\}/);
      if (m) classification = JSON.parse(m[0]);
    } catch { classification = { use_case_category: "other" }; }

    // Fetch precedents from li_tracker_entries
    const { data: allPrecedents } = await supabase
      .from("li_tracker_entries")
      .select("*")
      .order("last_confirmed", { ascending: false })
      .limit(80);

    const precedents = (allPrecedents || []).filter((p: any) => {
      const activity = (p.processing_activity || "").toLowerCase();
      const cat = classification.use_case_category || "";
      const keywords: Record<string, string[]> = {
        direct_marketing: ["marketing", "advertising", "promotional", "newsletter"],
        fraud_prevention: ["fraud", "security", "risk", "prevention"],
        employee_monitoring: ["employee", "worker", "workplace", "monitoring"],
        behavioral_advertising: ["behavioral", "tracking", "advertising", "targeting"],
        research_analytics: ["research", "analytics", "statistics", "profiling"],
        it_security: ["security", "network", "it ", "technical", "system"],
        contractual_administration: ["contract", "administration", "service", "customer"],
      };
      const cats = keywords[cat] || [];
      return cats.some(k => activity.includes(k));
    }).slice(0, 15);

    const precedentContext = precedents.length > 0
      ? precedents.map((p: any) =>
          `[${p.outcome?.toUpperCase() || "UNKNOWN"}] ${p.processing_activity} (${p.dpa_source}, ${p.jurisdiction}) — ${p.summary}`
        ).join("\n")
      : "No closely analogous precedents found in tracked database. Analysis proceeds on regulatory principles.";

    // ── STAGE 2: Three-part test analysis ──
    const analysisSystem = `You are a senior privacy regulatory analyst producing a formal legitimate interest assessment framework. Your analysis is precise, cites specific regulatory standards, and is grounded in the precedent database provided. This is a compliance framework tool. All outputs must include the statement: "This analysis is a compliance framework tool and does not constitute legal advice. Review findings with qualified legal counsel." Return ONLY valid JSON, no preamble.`;

    const analysisText = await callAnthropic(
      "claude-sonnet-4-6",
      analysisSystem,
      `Conduct a three-part legitimate interest assessment for the following proposed processing.

PROPOSED PROCESSING:
Description: ${assessment.processing_description}
Data categories: ${(assessment.data_categories || []).join(", ")}
Relationship with data subjects: ${assessment.relationship_type || "not specified"}
Jurisdictions: ${(assessment.jurisdictions || []).join(", ")}
Sector: ${assessment.sector || "not specified"}
Stated purpose: ${assessment.stated_purpose || "not specified"}
Alternatives considered: ${assessment.alternatives_considered || "not specified"}

PRECEDENT DATABASE (tracked regulatory decisions):
${precedentContext}

Return JSON with this exact structure:
{
  "purpose_test": {
    "verdict": "passes | fails | uncertain",
    "analysis": "2-3 sentences: Is this a legitimate interest? Is it specific and present? Name the applicable regulatory standard.",
    "risk_factors": ["list any factors that weaken the purpose test"],
    "supporting_factors": ["list any factors that strengthen the purpose test"]
  },
  "necessity_test": {
    "verdict": "passes | fails | uncertain",
    "analysis": "2-3 sentences: Is processing necessary to achieve the purpose? Could a less privacy-invasive approach achieve the same result? Name alternatives if relevant.",
    "risk_factors": ["list any factors that weaken the necessity test"],
    "supporting_factors": ["list any factors that strengthen the necessity test"]
  },
  "balancing_test": {
    "verdict": "likely_passes | likely_fails | uncertain",
    "analysis": "3-4 sentences: Do data subjects' interests and rights override the legitimate interest? Consider nature of data, reasonable expectations, relationship, potential harm, ability to object.",
    "risk_factors": ["list factors that tip balance toward data subjects"],
    "supporting_factors": ["list factors that support the organisation's interest"],
    "special_category_flag": true or false
  },
  "overall_assessment": {
    "argument_strength": "strong | moderate | weak | insufficient",
    "strength_basis": "One sentence explaining why this strength rating. Reference the most analogous precedent.",
    "closest_accepted_precedent": "Name the most analogous accepted precedent from the database, or null if none",
    "closest_rejected_precedent": "Name the most analogous rejected precedent from the database, or null if none",
    "key_distinguishing_factors": ["factors that distinguish this case from the precedents"]
  }
}`,
      3000
    );

    let analysis: any = {};
    try {
      const m = analysisText.match(/\{[\s\S]*\}/);
      if (m) analysis = JSON.parse(m[0]);
    } catch { analysis = { overall_assessment: { argument_strength: "uncertain" } }; }

    // ── STAGE 3: Documentation recommendations ──
    const docsSystem = `You are a privacy regulatory analyst producing practical documentation guidance. Focus on what documentation would make this legitimate interest assessment defensible. Return ONLY valid JSON, no preamble.`;

    const docsText = await callAnthropic(
      "claude-sonnet-4-6",
      docsSystem,
      `Based on this legitimate interest analysis, provide documentation recommendations.

Processing activity: ${assessment.processing_description}
Argument strength: ${analysis.overall_assessment?.argument_strength || "uncertain"}
Balancing test status: ${analysis.balancing_test?.verdict || "uncertain"}
Key risk factors: ${JSON.stringify(analysis.balancing_test?.risk_factors || [])}

PRECEDENT DATABASE:
${precedentContext}

Return JSON:
{
  "recommended_documentation": [
    {
      "document": "Document name",
      "purpose": "Why this document is needed for a defensible LIA",
      "key_elements": ["what must be included"],
      "basis": "Which precedent or regulatory guidance requires this"
    }
  ],
  "balancing_record_elements": [
    "specific element to document in the LI balancing record"
  ],
  "opt_out_mechanism": {
    "required": true or false,
    "basis": "regulatory requirement or recommendation",
    "recommended_approach": "how to implement"
  },
  "review_triggers": [
    "circumstances that would require this LIA to be revisited"
  ],
  "disclaimer": "This analysis is a compliance framework tool and does not constitute legal advice. Review findings with qualified legal counsel before relying on legitimate interest as a processing legal basis."
}`,
      2000
    );

    let docRecs: any = {};
    try {
      const m = docsText.match(/\{[\s\S]*\}/);
      if (m) docRecs = JSON.parse(m[0]);
    } catch {
      docRecs = {
        recommended_documentation: [],
        disclaimer: "This is a compliance framework tool, not legal advice."
      };
    }

    // ── ASSEMBLE FINAL REPORT ──
    const reportData = {
      generated_at: new Date().toISOString(),
      assessment_id,
      classification,
      precedents_reviewed: precedents.length,
      precedent_database_size: (allPrecedents || []).length,
      three_part_test: analysis,
      documentation_recommendations: docRecs,
      disclaimer: "This report is a compliance framework tool produced to assist in identifying areas for legal review. It does not constitute legal advice. All findings should be reviewed with qualified legal counsel before relying on legitimate interest as a processing legal basis under GDPR Article 6(1)(f) or equivalent provisions.",
      data_currency_note: `Precedent database last updated: ${new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" })}. Regulatory positions evolve. Verify against current DPA guidance.`
    };

    await supabase.from("li_assessments").update({
      status: "complete",
      report_data: reportData,
      updated_at: new Date().toISOString(),
    }).eq("id", assessment_id);

    return new Response(JSON.stringify({ success: true, assessment_id, report: reportData }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (e) {
    console.error("run-li-assessment error:", e);
    return new Response(JSON.stringify({ error: "Assessment failed. Please try again." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
