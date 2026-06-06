import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { verifyCaller } from "../_shared/verify-caller.ts";

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
    signal: AbortSignal.timeout(140_000),
  });
  if (!res.ok) throw new Error(`Anthropic ${res.status}`);
  const d = await res.json();
  return d.content?.[0]?.text || "";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const caller = await verifyCaller(req);
    if (!caller.internal && !caller.userId) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
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

    const system = `You are a senior privacy lawyer producing a structured DPIA framework document. The document must follow the structure required by GDPR Article 35 and applicable supervisory authority templates (EDPB, ICO). Be specific but CONCISE: every string value must be at most 2 sentences (<= 300 characters). Risk arrays must contain at most 4 items; measure arrays at most 4 items. This is a framework document for the organisation's own legal or privacy team to complete and own — not a finished DPIA. All analysis is structured as guidance and framework, not legal opinion. Return ONLY valid JSON, no preamble, no markdown fences. Ensure the JSON is complete and well-formed. When citing regulatory provisions, use only well-established article numbers (e.g. GDPR Article 35, Article 32). Do not invent sub-article or paragraph numbers you are not certain of — write the article reference only (e.g. 'GDPR Article 35' not 'GDPR Article 35(3)(b)(ii)') unless the sub-provision is explicitly described in the processing context. Do NOT reference specific enforcement case names, fine amounts, or regulator decisions in framework section content — enforcement context is injected separately and must only appear in the annotations array. CITATION INTEGRITY RULE (6): Where specifying encryption-in-transit standards, always use the phrase "TLS 1.2 or higher (TLS 1.3 recommended)" — never state a single version in isolation. This applies to all security measures sections and mitigation sections, so that no two sections of the document specify different TLS versions. EDPB GUIDELINE CITATION RULE: The authoritative EDPB guidance on DPIAs is "Guidelines on Data Protection Impact Assessment (WP248 rev.01)" — endorsed by the EDPB as successor to the Article 29 Working Party. Do NOT cite "EDPB Guidelines 09/2022" for DPIAs — Guidelines 09/2022 addresses personal data breach notification, not DPIAs. When citing DPIA guidance, use: "EDPB (endorsed) Guidelines on DPIA (WP248 rev.01)". MONETARY PENALTY RULE: Never state a specific monetary fine, penalty, or settlement amount unless that exact figure appears in the ENFORCEMENT PRECEDENTS or ENFORCEMENT CONTEXT block provided in this prompt. Training knowledge of regulatory fines is unreliable. If a relevant case exists but its amount is not in the provided block, write "[Regulator] imposed a significant penalty for this type of violation — verify the current figure at the regulator's enforcement register" instead of recalling an amount. Known correct figures (use only if the case is in your enforcement block): ICO Clearview AI (2022) £7,552,800; ICO Interserve (2022) £4,400,000; ICO Capita Pension Solutions (2024) £6,090,000; ICO British Airways (2020) £20,000,000.`;

    const processingDesc = intake.processing_description || "Not provided";
    const purpose = intake.purpose || "Not provided";
    const dataCategories = (intake.data_categories || []).join(", ") || "Not specified";
    const dataSubjects = intake.data_subjects || "Not specified";
    const volume = intake.volume_frequency || "Not specified";
    const thirdParties = (intake.third_party_processors || []).join(", ") || "None identified";
    const safeguards = (intake.existing_safeguards || []).join(", ") || "None identified";
    const jurisdictions = (intake.jurisdictions || []).join(", ") || "Not specified";

    // Fetch enforcement precedents (3-5) for this DPIA scope
    let enforcementPrecedents: any[] = [];
    try {
      const { data: ctxData } = await supabase.functions.invoke("get-enforcement-context", {
        body: {
          tool: "DPIA",
          data_categories: intake.data_categories || [],
          jurisdictions: intake.jurisdictions || [],
          sector: intake.sector || undefined,
          limit: 5,
        },
      });
      enforcementPrecedents = (ctxData?.results || []).slice(0, 5);
    } catch (e) {
      console.error("get-enforcement-context failed (non-fatal):", e);
    }

    const enforcementContextStr = enforcementPrecedents.length > 0
      ? enforcementPrecedents.map((r: any, i: number) =>
          `[E${i + 1}] id:${r.id} ${r.subject || "Unnamed"} — ${r.regulator} (${r.jurisdiction}, ${r.decision_date || "n.d."}) — Fine: €${r.fine_eur_equivalent || 0} — Failure: ${r.key_compliance_failure || r.violation || "n/a"} — Preventive: ${r.preventive_measures || "n/a"}`
        ).join("\n")
      : "No directly analogous enforcement precedents retrieved.";

    // ── Split DPIA generation into two parallel calls to stay within timeout ──
    const sharedContext = `PROCESSING ACTIVITY DETAILS:
Description: ${processingDesc}
Purpose: ${purpose}
Data categories: ${dataCategories}
Data subjects: ${dataSubjects}
Volume/frequency: ${volume}
Third-party processors: ${thirdParties}
Existing safeguards: ${safeguards}
Jurisdictions: ${jurisdictions}
${orgContext}

ENFORCEMENT PRECEDENTS (cite by [E1]–[E5] where relevant):
${enforcementContextStr}

ANNOTATION REQUIREMENT: For each enforcement action cited above (tagged [E1], [E2], etc.), if it directly supports a risk identification, severity rating, or mitigation measure in section_3_risks, include it in the section_3_risks.annotations array using the id value from the enforcement context exactly as provided. You MUST only cite enforcement actions from the ENFORCEMENT PRECEDENTS provided above — never cite cases from training knowledge. If an enforcement action is not in the provided context, do not cite it.`;

    const [textA, textB] = await Promise.all([
      callAnthropic("claude-sonnet-4-6", system,
        `${sharedContext}

Generate the first half of a DPIA framework document. Return ONLY this JSON structure, no preamble:

{
  "dpia_metadata": {
    "processing_activity_name": "brief name for this processing activity",
    "framework_version": "1.0",
    "applicable_frameworks": ["list of applicable frameworks — GDPR Art. 35, UK GDPR, etc."],
    "consultation_requirement": "whether DPO consultation is required and basis",
    "supervisory_authority_consultation_trigger": "describe when supervisory authority consultation is required"
  },
  "section_1_description": {
    "title": "Description of the Processing",
    "guidance_note": "GDPR Article 35(7)(a) requires a systematic description of the processing operations and purposes.",
    "processing_nature": "describe the nature of the processing",
    "processing_scope": "describe the scope — volume, range of data subjects, geographic reach",
    "processing_context": "describe the context — relationships, reasonable expectations of data subjects",
    "processing_purposes": "clearly state each purpose",
    "legal_basis_proposed": "the proposed legal basis and why",
    "completion_guidance": "What the organisation's counsel/DPO must complete or verify in this section"
  },
  "section_2_necessity": {
    "title": "Assessment of Necessity and Proportionality",
    "guidance_note": "GDPR Article 35(7)(b) requires assessment of necessity and proportionality.",
    "necessity_analysis": "framework analysis of whether processing is necessary for the stated purpose",
    "proportionality_analysis": "framework analysis of whether processing is proportionate",
    "alternatives_considered": "list alternatives evaluated and why rejected",
    "completion_guidance": "What the organisation must complete or verify in this section"
  },
  "section_3_risks": {
    "title": "Assessment of Risks to Data Subjects",
    "guidance_note": "GDPR Article 35(7)(c) requires identification of risks to the rights and freedoms of natural persons.",
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
    "completion_guidance": "What the organisation must complete in this section",
    "annotations": [
      {
        "enforcement_action_id": "exact id string from the enforcement context above (the value after 'id:')",
        "regulator": "regulator name",
        "jurisdiction": "jurisdiction",
        "decision_date": "YYYY-MM-DD or null",
        "summary": "one sentence what the case involved, max 25 words, plain English",
        "outcome": "rejected | accepted | penalised | required",
        "relevance": "one sentence why this case is relevant to a risk in this DPIA"
      }
    ]
  }
}`,
        6000
      ),
      callAnthropic("claude-sonnet-4-6", system,
        `${sharedContext}

Generate the second half of a DPIA framework document. Return ONLY this JSON structure, no preamble:

{
  "section_4_mitigation": {
    "title": "Measures to Address Risks",
    "guidance_note": "GDPR Article 35(7)(d) requires measures envisaged to address the risks.",
    "proposed_measures": [
      {
        "measure": "name of measure",
        "addresses_risk": "which risk this addresses",
        "implementation_guidance": "how to implement",
        "residual_risk_after": "expected residual risk level after implementation"
      }
    ],
    "completion_guidance": "What the organisation must complete in this section"
  },
  "section_5_consultation": {
    "title": "DPO and Stakeholder Consultation",
    "guidance_note": "Where a DPO is designated, their advice must be sought and documented.",
    "dpo_consultation_required": true,
    "dpo_consultation_record": "template for recording DPO consultation outcome",
    "stakeholder_consultation": "list any other stakeholders who should be consulted",
    "completion_guidance": "What the organisation must complete in this section"
  },
  "section_6_conclusion": {
    "title": "Conclusion and Sign-Off",
    "guidance_note": "Document whether identified risks are acceptable and whether supervisory authority consultation is required.",
    "supervisory_authority_consultation_required": "conditional guidance on when consultation is required",
    "sign_off_template": "template for DPO/counsel sign-off attestation",
    "review_schedule": "recommended review triggers for this DPIA"
  },
  "framework_disclaimer": "This DPIA framework document is provided as a compliance framework tool to assist organisations in structuring their Data Protection Impact Assessment process. It is not a completed DPIA and does not satisfy the requirements of GDPR Article 35 on its own. The organisation's qualified Data Protection Officer or legal counsel must review, complete, and own this document. This framework does not constitute legal advice."
}`,
        6000
      )
    ]);

    let partA: any = {};
    let partB: any = {};
    try {
      const mA = textA.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').match(/\{[\s\S]*\}/);
      if (mA) partA = JSON.parse(mA[0]);
      else console.error("[DPIA] No JSON in part A. Length:", textA.length, "Preview:", textA.slice(0, 300));
    } catch (e) { console.error("[DPIA] Part A parse error:", e, "Tail:", textA.slice(-200)); }
    try {
      const mB = textB.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').match(/\{[\s\S]*\}/);
      if (mB) partB = JSON.parse(mB[0]);
      else console.error("[DPIA] No JSON in part B. Length:", textB.length, "Preview:", textB.slice(0, 300));
    } catch (e) { console.error("[DPIA] Part B parse error:", e, "Tail:", textB.slice(-200)); }

    let reportData: any = { ...partA, ...partB };
    if (!reportData.section_1_description && !reportData.section_4_mitigation) {
      reportData = {
        framework_disclaimer: "This is a compliance framework tool, not legal advice.",
        error: "Report generation encountered an issue. Please retry."
      };
    }

    reportData.generated_at = new Date().toISOString();
    reportData.dpia_id = dpia_id;
    reportData.enforcement_precedents = enforcementPrecedents;
    try {
      reportData.annotations = Array.isArray(reportData?.section_3_risks?.annotations)
        ? reportData.section_3_risks.annotations
        : [];
    } catch { reportData.annotations = []; }

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
