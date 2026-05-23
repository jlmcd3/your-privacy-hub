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
    signal: AbortSignal.timeout(120000),
  });
  if (!res.ok) throw new Error(`Anthropic error: ${res.status}`);
  const data = await res.json();
  return data.content?.[0]?.text || "";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  let assessment_id: string | undefined;
  try {
    ({ assessment_id } = await req.json());
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

    // Run classification and enforcement context fetch in parallel
    const [classifyText, enforcementCtxResult] = await Promise.all([
      callAnthropic(
        "claude-haiku-4-5-20251001",
        classifySystem,
        `Classify this processing activity for legitimate interest analysis:\nDescription: ${assessment.processing_description}\nData categories: ${(assessment.data_categories || []).join(", ")}\nRelationship type: ${assessment.relationship_type || "not specified"}\nSector: ${assessment.sector || "not specified"}\n\nReturn JSON:\n{\n  "use_case_category": "one of: direct_marketing | fraud_prevention | employee_monitoring | behavioral_advertising | research_analytics | it_security | contractual_administration | other",\n  "primary_data_categories": ["list of data categories involved"],\n  "special_category_data": true or false,\n  "relationship_exists": true or false,\n  "jurisdictions_scope": ["list of relevant jurisdictions"]\n}`,
        500
      ),
      supabase.functions.invoke("get-enforcement-context", {
        body: {
          tool: "LIA",
          data_categories: assessment.data_categories || [],
          jurisdictions: assessment.jurisdictions || [],
          sector: assessment.sector || undefined,
          limit: 5,
        },
      }).catch((e: Error) => { console.error("get-enforcement-context failed (non-fatal):", e); return { data: null }; })
    ]);

    let classification: any = {};
    try {
      const m = classifyText.match(/\{[\s\S]*\}/);
      if (m) classification = JSON.parse(m[0]);
    } catch { classification = { use_case_category: "other" }; }

    let enforcementPrecedents: any[] = [];
    try {
      enforcementPrecedents = ((enforcementCtxResult as any)?.data?.results || []).slice(0, 5);
    } catch { /* non-fatal */ }

    const enforcementContextStr = enforcementPrecedents.length > 0
      ? enforcementPrecedents.map((r: any, i: number) =>
          `[E${i + 1}] ${r.subject || "Unnamed"} — ${r.regulator} (${r.jurisdiction}, ${r.decision_date || "n.d."}) — Fine: €${r.fine_eur_equivalent || 0} — Failure: ${r.key_compliance_failure || r.violation || "n/a"}`
        ).join("\n")
      : "No directly analogous enforcement precedents retrieved.";

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

    // ── STAGE 2: Three-part test analysis (EDPB Guidelines 1/2024 grounded) ──
    const purposeDetails = (assessment as any).purpose_details || {};
    const necessityDetails = (assessment as any).necessity_details || {};
    const balancingDetails = (assessment as any).balancing_details || {};

    const analysisSystem = `You are a senior privacy regulatory analyst producing a formal legitimate interest assessment. Your analysis is precise, cites specific regulatory standards (Article 6(1)(f) GDPR, EDPB Guidelines 1/2024 on legitimate interests, ICO LIA guidance, applicable national DPA positions), and is grounded strictly in the facts provided and precedent database. Do NOT invent facts the user did not provide. Where a relevant fact is missing, say so and flag it as an open question. This is a compliance framework tool. All outputs must include the statement: "This analysis is a compliance framework tool and does not constitute legal advice. Review findings with qualified legal counsel." Return ONLY valid JSON, no preamble.

MANDATORY FIELD RULES — violations will cause downstream system failures:

1. The "verdict" field is REQUIRED in every test object (purpose_test, necessity_test, balancing_test). You MUST include it even when evidence is incomplete or the outcome is genuinely uncertain. Use "uncertain" — never omit the field.

2. The "closest_accepted_precedent" field MUST be a non-empty string. If no close match exists in the database, write "None identified in current database" — never return null.

3. The "closest_rejected_precedent" field MUST be a non-empty string. If none, write "None identified in current database".`;

    const analysisText = await callAnthropic(
      "claude-sonnet-4-6",
      analysisSystem,
      `Conduct a three-part legitimate interest assessment for the following proposed processing.

PROPOSED PROCESSING (Stage A):
Description: ${assessment.processing_description}
Data categories: ${(assessment.data_categories || []).join(", ")}
Relationship with data subjects: ${assessment.relationship_type || "not specified"}
Jurisdictions: ${(assessment.jurisdictions || []).join(", ")}
Sector: ${assessment.sector || "not specified"}

STAGE B — PURPOSE FACTS:
Whose interest: ${purposeDetails.interest_holder || "not specified"}
Type of interest: ${purposeDetails.interest_type || "not specified"}
Stated purpose to data subjects: ${assessment.stated_purpose || "not specified"}
Statutory restrictions noted: ${balancingDetails.statutory_restrictions || "none noted"}

STAGE B — NECESSITY FACTS:
Alternatives considered: ${necessityDetails.alternatives || assessment.alternatives_considered || "not specified"}
Why consent not used: ${necessityDetails.why_consent_not_used || "not addressed"}
Data minimisation steps: ${necessityDetails.data_minimised || "not specified"}
Pseudonymisation/aggregation options: ${necessityDetails.pseudonymisation_options || "not addressed"}

STAGE B — BALANCING FACTS:
Reasonable expectation: ${balancingDetails.reasonable_expectation || "not specified"}
Vulnerable subjects involved: ${(balancingDetails.vulnerable_subjects || []).join(", ") || "none indicated"}
Worst-case harm: ${balancingDetails.potential_harm || "not specified"}
Safeguards in place: ${(balancingDetails.safeguards || []).join(", ") || "none specified"}
Opt-out mechanism: ${balancingDetails.opt_out_mechanism || "not specified"}
Special category data flag: ${balancingDetails.special_category_data ? "YES — Article 9 condition required in addition" : "no"}
Employment-context safeguards: ${balancingDetails.employment_safeguards || "not applicable / not addressed"}

PRECEDENT DATABASE (tracked regulatory decisions):
${precedentContext}

ENFORCEMENT PRECEDENTS (recent regulator fines/decisions, cite by code [E1]–[E5]):
${enforcementContextStr}

Apply the EDPB Guidelines 1/2024 three-part test. For each step, test the SPECIFIC facts above — do not generalise. Return JSON with this exact structure:
{
  "purpose_test": {
    "verdict": "passes | fails | uncertain",
    "analysis": "3-4 sentences testing whether the named interest holder has a lawful, specific, present interest. Address any statutory restrictions noted. Cite the applicable standard.",
    "risk_factors": ["factors weakening the purpose test, drawn from the facts above"],
    "supporting_factors": ["factors strengthening it, drawn from the facts above"],
    "open_questions": ["facts the user did not provide that would affect this verdict"]
  },
  "necessity_test": {
    "verdict": "passes | fails | uncertain",
    "analysis": "3-4 sentences. Test whether the processing is the LEAST intrusive way to achieve the stated purpose, given the alternatives the user considered, the data minimisation they described, and any pseudonymisation potential.",
    "risk_factors": ["factors weakening necessity, e.g. overly broad data, weak alternatives analysis"],
    "supporting_factors": ["factors strengthening necessity"],
    "open_questions": ["facts that would affect this verdict"]
  },
  "balancing_test": {
    "verdict": "likely_passes | likely_fails | uncertain",
    "analysis": "4-5 sentences applying the EDPB four-factor balancing: (1) reasonable expectations, (2) nature of the relationship, (3) potential impact and severity, (4) safeguards including opt-out. Address vulnerable subjects if any.",
    "risk_factors": ["factors tipping the balance toward data subjects"],
    "supporting_factors": ["factors supporting the controller's interest"],
    "open_questions": ["facts that would affect this verdict"],
    "special_category_flag": ${balancingDetails.special_category_data ? "true" : "false"},
    "vulnerable_subject_flag": ${(balancingDetails.vulnerable_subjects || []).filter((v: string) => v && v !== "None").length > 0 ? "true" : "false"}
  },
  "overall_assessment": {
    "argument_strength": "strong | moderate | weak | insufficient",
    "strength_basis": "One sentence explaining why this rating, referencing the strongest analogous precedent.",
    "closest_accepted_precedent": "Name from the database, or null",
    "closest_rejected_precedent": "Name from the database, or null",
    "key_distinguishing_factors": ["factors distinguishing this case from precedents"],
    "blocking_issues": ["issues that would prevent reliance on legitimate interest unless resolved — empty array if none"]
  }
}`,
      3500
    );

    let analysis: any = {};
    try {
      const m = analysisText.match(/\{[\s\S]*\}/);
      if (m) {
        analysis = JSON.parse(m[0]);
      } else {
        console.error("[LIA] No JSON object found in analysis response. Response length:", analysisText.length);
        console.error("[LIA] Response preview:", analysisText.slice(0, 500));
      }
    } catch (parseErr) {
      console.error("[LIA] JSON parse error:", parseErr);
      console.error("[LIA] Raw response length:", analysisText.length);
      console.error("[LIA] Raw response tail:", analysisText.slice(-200));
      analysis = { overall_assessment: { argument_strength: "uncertain" } };
    }

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

IMPORTANT: You must return at least 2–4 items in recommended_documentation regardless of argument strength. Even a weak or insufficient LIA requires documentation to be defensible or to support a re-assessment. Every LIA requires at minimum: (1) a balancing record document, and (2) a legitimate interests notice or transparency document.

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
      1500
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
      enforcement_precedents: enforcementPrecedents,
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

    // Fetch user email for delivery
    const { data: userData } = await supabase.auth.admin.getUserById(
      assessment.user_id
    ).catch(() => ({ data: null as any }));

    await supabase.functions.invoke("generate-report-pdf", {
      body: {
        tool_type: "li_assessment",
        assessment_id,
        user_email: userData?.user?.email || null,
        user_name: userData?.user?.user_metadata?.full_name || null,
        result_url: `${Deno.env.get("SITE_URL") || "https://enduserprivacy.com"}/li-assessment/result/${assessment_id}`,
      },
    }).catch((e: Error) => console.error("PDF/email delivery failed (non-fatal):", e));

    return new Response(JSON.stringify({ success: true, assessment_id, report: reportData }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (e) {
    console.error("run-li-assessment error:", e);
    if (assessment_id) {
      await supabase.from("li_assessments")
        .update({ status: "failed" }).eq("id", assessment_id);
    }
    return new Response(JSON.stringify({ error: "Assessment failed. Please try again." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
