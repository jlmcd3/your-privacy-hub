import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function callAnthropic(model: string, system: string, user: string, maxTokens = 2500): Promise<string> {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": Deno.env.get("ANTHROPIC_API_KEY")!,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({ model, max_tokens: maxTokens, system, messages: [{ role: "user", content: user }] }),
    signal: AbortSignal.timeout(50000),
  });
  if (!res.ok) throw new Error(`Anthropic ${res.status}`);
  const d = await res.json();
  return d.content?.[0]?.text || "";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { dpia_id } = await req.json();
    if (!dpia_id) return new Response(JSON.stringify({ error: "dpia_id required" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const { data: dpia } = await supabase
      .from("dpia_frameworks").select("*").eq("id", dpia_id).single();

    if (!dpia) return new Response(JSON.stringify({ error: "Not found" }),
      { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    await supabase.from("dpia_frameworks").update({ status: "processing" }).eq("id", dpia_id);

    const intake = dpia.intake_data as any;

    let orgContext = "";
    if (dpia.source_assessment_id) {
      const { data: sourceAssessment } = await supabase
        .from("governance_assessments")
        .select("intake_data, report_data")
        .eq("id", dpia.source_assessment_id).single();
      if (sourceAssessment) {
        const srcIntake = sourceAssessment.intake_data as any;
        orgContext = `
SOURCE GOVERNANCE ASSESSMENT CONTEXT:
Organisation sector: ${srcIntake.sector || "not specified"}
Jurisdictions: ${(srcIntake.jurisdictions || []).join(", ")}
EU/UK data: ${srcIntake.eu_uk_data ? "Yes" : "No"}
DPO appointed: ${srcIntake.has_dpo ? "Yes" : "No"}
`;
      }
    }

    const system = `You are a senior privacy lawyer producing a structured DPIA framework document. The document must follow the structure required by GDPR Article 35 and applicable supervisory authority templates (EDPB, ICO). Be specific about provisions and standards. This is a framework document for the organisation's own legal or privacy team to complete and own — not a finished DPIA. Include explicit guidance notes explaining what Article 35 requires in each section. All analysis is structured as guidance and framework, not legal opinion. Return ONLY valid JSON, no preamble.`;

    const processingDesc = intake.processing_description || "Not provided";
    const purpose = intake.purpose || "Not provided";
    const dataCategories = (intake.data_categories || []).join(", ") || "Not specified";
    const dataSubjects = intake.data_subjects || "Not specified";
    const volume = intake.volume_frequency || "Not specified";
    const thirdParties = (intake.third_party_processors || []).join(", ") || "None identified";
    const safeguards = (intake.existing_safeguards || []).join(", ") || "None identified";
    const jurisdictions = (intake.jurisdictions || []).join(", ") || "Not specified";

    const reportText = await callAnthropic("claude-sonnet-4-6", system,
      `Generate a DPIA framework document for this processing activity.

PROCESSING ACTIVITY DETAILS:
Description: ${processingDesc}
Purpose: ${purpose}
Data categories: ${dataCategories}
Data subjects: ${dataSubjects}
Volume/frequency: ${volume}
Third-party processors: ${thirdParties}
Existing safeguards: ${safeguards}
Jurisdictions: ${jurisdictions}
${orgContext}

Return JSON with this exact DPIA structure:

{
  "dpia_metadata": {
    "processing_activity_name": "brief name for this processing activity",
    "framework_version": "1.0",
    "applicable_frameworks": ["list of applicable frameworks — GDPR Art. 35, UK GDPR, etc."],
    "consultation_requirement": "whether DPO consultation is required and basis",
    "supervisory_authority_consultation_trigger": "describe the condition under which consultation with the supervisory authority would be required before proceeding"
  },
  "section_1_description": {
    "title": "Description of the Processing",
    "guidance_note": "GDPR Article 35(7)(a) requires a systematic description of the processing operations and purposes. Include the nature, scope, context, and purposes of processing.",
    "processing_nature": "describe the nature of the processing",
    "processing_scope": "describe the scope — volume, range of data subjects, geographic reach",
    "processing_context": "describe the context — relationships, reasonable expectations of data subjects",
    "processing_purposes": "clearly state each purpose",
    "legal_basis_proposed": "the proposed legal basis and why",
    "completion_guidance": "What the organisation's counsel/DPO must complete or verify in this section"
  },
  "section_2_necessity": {
    "title": "Assessment of Necessity and Proportionality",
    "guidance_note": "GDPR Article 35(7)(b) requires assessment of necessity and proportionality. Could the same purpose be achieved with less privacy-invasive means?",
    "necessity_analysis": "framework analysis of whether processing is necessary for the stated purpose",
    "proportionality_analysis": "framework analysis of whether processing is proportionate",
    "alternatives_considered": "list alternatives evaluated and why rejected",
    "completion_guidance": "What the organisation must complete or verify in this section"
  },
  "section_3_risks": {
    "title": "Assessment of Risks to Data Subjects",
    "guidance_note": "GDPR Article 35(7)(c) requires identification of risks to the rights and freedoms of natural persons. Focus on harm to data subjects, not organisational risk.",
    "risk_assessment": [
      {
        "risk_type": "name of risk",
        "description": "how this risk could materialise",
        "likelihood": "Low | Medium | High",
        "severity": "Low | Medium | High",
        "affected_rights": ["which data subject rights are implicated"]
      }
    ],
    "residual_risk_assessment": "framework guidance on assessing residual risk after mitigation",
    "completion_guidance": "What the organisation must complete in this section"
  },
  "section_4_mitigation": {
    "title": "Measures to Address Risks",
    "guidance_note": "GDPR Article 35(7)(d) requires measures envisaged to address the risks, including safeguards, security measures, and mechanisms to protect personal data.",
    "proposed_measures": [
      {
        "measure": "name of measure",
        "addresses_risk": "which risk from section 3 this addresses",
        "implementation_guidance": "how to implement",
        "residual_risk_after": "expected residual risk level after implementation"
      }
    ],
    "completion_guidance": "What the organisation must complete in this section"
  },
  "section_5_consultation": {
    "title": "DPO and Stakeholder Consultation",
    "guidance_note": "Where a DPO is designated, their advice must be sought and documented. Record the advice given and the decision taken.",
    "dpo_consultation_required": true or false,
    "dpo_consultation_record": "template for recording DPO consultation outcome",
    "stakeholder_consultation": "list any other stakeholders who should be consulted",
    "completion_guidance": "What the organisation must complete in this section"
  },
  "section_6_conclusion": {
    "title": "Conclusion and Sign-Off",
    "guidance_note": "Document whether identified risks are acceptable, what residual risks remain, and whether supervisory authority consultation is required before proceeding.",
    "supervisory_authority_consultation_required": "conditional guidance on when consultation is required",
    "sign_off_template": "template for DPO/counsel sign-off attestation",
    "review_schedule": "recommended review triggers for this DPIA"
  },
  "framework_disclaimer": "This DPIA framework document is provided as a compliance framework tool to assist organisations in structuring their Data Protection Impact Assessment process. It is not a completed DPIA and does not satisfy the requirements of GDPR Article 35 on its own. The organisation's qualified Data Protection Officer or legal counsel must review, complete, and own this document. This framework does not constitute legal advice."
}`,
      5000
    );

    let reportData: any = {};
    try {
      const m = reportText.match(/\{[\s\S]*\}/);
      if (m) reportData = JSON.parse(m[0]);
    } catch {
      reportData = {
        framework_disclaimer: "This is a compliance framework tool, not legal advice.",
        error: "Report generation encountered an issue. Please retry."
      };
    }

    reportData.generated_at = new Date().toISOString();
    reportData.dpia_id = dpia_id;

    await supabase.from("dpia_frameworks").update({
      status: "complete",
      report_data: reportData,
      updated_at: new Date().toISOString(),
    }).eq("id", dpia_id);

    const { data: userData } = await supabase.auth.admin.getUserById(
      dpia.user_id
    ).catch(() => ({ data: null as any }));

    await supabase.functions.invoke("generate-report-pdf", {
      body: {
        tool_type: "dpia_framework",
        assessment_id: dpia_id,
        user_email: userData?.user?.email || null,
        user_name: userData?.user?.user_metadata?.full_name || null,
        result_url: `${Deno.env.get("SITE_URL") || "https://enduserprivacy.com"}/dpia-framework/result/${dpia_id}`,
      },
    }).catch((e: Error) => console.error("PDF/email delivery failed (non-fatal):", e));

    return new Response(JSON.stringify({ success: true, dpia_id }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (e) {
    console.error("run-dpia-framework error:", e);
    return new Response(JSON.stringify({ error: "DPIA framework generation failed. Please try again." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
