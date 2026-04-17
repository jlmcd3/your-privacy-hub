import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function callAnthropic(model: string, system: string, user: string, maxTokens = 2000): Promise<string> {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": Deno.env.get("ANTHROPIC_API_KEY")!,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({ model, max_tokens: maxTokens, system, messages: [{ role: "user", content: user }] }),
    signal: AbortSignal.timeout(45000),
  });
  if (!res.ok) throw new Error(`Anthropic ${res.status}`);
  const d = await res.json();
  return d.content?.[0]?.text || "";
}

const DOMAIN_DEFINITIONS = [
  { id: 1, name: "Tool Inventory and Sanctioning", key: "tool_inventory", escalate: false,
    prompt: "Assess whether the organisation has a complete, formally sanctioned inventory of technology tools used to process personal data. Review: completeness of inventory, formal approval process, shadow tool detection, DPA review status per tool. Rate severity: Critical/High/Medium/Low." },
  { id: 2, name: "Data Submission Risk", key: "data_submission", escalate: false,
    prompt: "Assess the risk of sensitive or personal data being submitted to external technology tools without appropriate controls. Review: prohibited data categories policy, technical controls enforcing restrictions, employee awareness of data minimisation obligations. Rate severity." },
  { id: 3, name: "Vendor Data Terms Compliance", key: "vendor_terms", escalate: true,
    prompt: "Assess whether vendor data terms for each external tool comply with applicable data protection law. Review: DPA/DPA equivalent signed, data residency compliance, subprocessor review, training opt-out where applicable, transfer mechanism for cross-border processing. Rate severity." },
  { id: 4, name: "Internal Policy Coverage", key: "internal_policy", escalate: false,
    prompt: "Assess whether internal policies adequately govern how employees use technology tools that process personal data. Review: policy existence, data minimisation instruction, prohibited data categories, personal data handling, update recency. Rate severity." },
  { id: 5, name: "Employee Training and Awareness", key: "training", escalate: false,
    prompt: "Assess whether employees understand their obligations when using technology tools that process personal data. Review: onboarding training, periodic refreshers, prohibited submission awareness, escalation path for incidents. Rate severity." },
  { id: 6, name: "Incident Response and Breach Readiness", key: "incident_response", escalate: true,
    prompt: "Assess whether the incident response plan covers data exposure through external technology tools as a notifiable breach scenario. Review: plan coverage, notification timelines, vendor contact procedures, regulatory reporting triggers. Rate severity." },
  { id: 7, name: "Regulatory Exposure Summary", key: "regulatory_exposure", escalate: true,
    prompt: "Map the organisation's data processing activities to applicable regulatory frameworks based on jurisdictions and data types. Identify specific provisions triggered. Rate severity." },
  { id: 8, name: "Privacy Impact Assessment Status", key: "dpia_status", escalate: true,
    prompt: "Assess whether Data Protection Impact Assessments have been conducted for high-risk processing activities. Identify which processing activities require a DPIA under Article 35 GDPR or equivalent. Rate severity." },
  { id: 9, name: "Data Subject Rights Integrity", key: "subject_rights", escalate: false,
    prompt: "Assess whether the organisation can fulfil data subject rights (erasure, access, portability) for data held by or processed through external technology tools. Rate severity." },
  { id: 10, name: "Privacy Notice Accuracy", key: "privacy_notice", escalate: false,
    prompt: "Assess whether the organisation's privacy notice accurately describes all processing activities including those involving external technology tools. Rate severity." },
];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { assessment_id } = await req.json();
    if (!assessment_id) return new Response(JSON.stringify({ error: "assessment_id required" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const { data: assessment } = await supabase
      .from("governance_assessments")
      .select("*").eq("id", assessment_id).single();

    if (!assessment) return new Response(JSON.stringify({ error: "Not found" }),
      { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    await supabase.from("governance_assessments")
      .update({ status: "processing" }).eq("id", assessment_id);

    const intake = assessment.intake_data as any;
    const intakeSummary = `
Organisation sector: ${intake.sector || "not specified"}
Organisation size: ${intake.org_size || "not specified"}
Jurisdictions of operation: ${(intake.jurisdictions || []).join(", ")}
EU/UK personal data processed: ${intake.eu_uk_data ? "Yes" : "No"}
Technology tools in use: ${(intake.tools || []).join(", ")}
Existing privacy policy: ${intake.has_privacy_policy ? "Yes" : "No"}
Existing acceptable use policy: ${intake.has_aup ? "Yes" : "No"}
DPO appointed: ${intake.has_dpo ? "Yes" : "No"}
DPIA conducted previously: ${intake.has_conducted_dpia ? "Yes" : "No"}
Incident response plan exists: ${intake.has_ir_plan ? "Yes" : "No"}
Employee privacy training conducted: ${intake.has_privacy_training ? "Yes" : "No"}
Health or special category data processed: ${intake.special_category_data ? "Yes" : "No"}
`;

    const domainSystem = `You are a senior privacy and data protection compliance analyst. You are assessing an organisation's data governance practices against applicable regulatory requirements. Be specific, cite regulatory provisions where applicable (GDPR Article numbers, CCPA sections, etc.), and be direct about findings. This is a compliance framework tool. Return ONLY valid JSON, no preamble.`;

    const domainResults: Record<string, any> = {};

    for (const domain of DOMAIN_DEFINITIONS) {
      const model = domain.escalate && (intake.eu_uk_data || intake.special_category_data)
        ? "claude-sonnet-4-6"
        : "claude-haiku-4-5-20251001";

      const text = await callAnthropic(model, domainSystem,
        `DOMAIN ${domain.id}: ${domain.name}

ORGANISATION PROFILE:
${intakeSummary}

ASSESSMENT TASK:
${domain.prompt}

Return JSON:
{
  "domain_id": ${domain.id},
  "domain_name": "${domain.name}",
  "current_state": "one sentence describing what exists today",
  "gap_description": "one sentence describing what is missing or inadequate, or null if no gap",
  "severity": "Critical | High | Medium | Low | Compliant",
  "regulatory_basis": "specific regulatory provision(s) requiring this — e.g. GDPR Art. 28, CCPA §1798.100",
  "recommended_action": "specific action required — must name the regulation and the action",
  "suggested_owner": "DPO | Legal Counsel | CISO | CTO | HR | Compliance Manager",
  "suggested_timeline": "Immediate (within 7 days) | This quarter | This year | Ongoing"
}`,
        800
      );

      try {
        const m = text.match(/\{[\s\S]*\}/);
        if (m) domainResults[domain.key] = JSON.parse(m[0]);
      } catch { domainResults[domain.key] = { domain_id: domain.id, severity: "Unknown" }; }

      await new Promise(r => setTimeout(r, 200));
    }

    // ── SYNTHESIS ──
    const synthesisText = await callAnthropic("claude-sonnet-4-6", domainSystem,
      `Synthesise these ten domain findings into cross-domain patterns and an executive summary.

TEN DOMAIN FINDINGS:
${JSON.stringify(domainResults, null, 2)}

ORGANISATION PROFILE:
${intakeSummary}

Return JSON:
{
  "executive_summary": "3-5 sentence board-ready summary. Name the top three risks. Specify if immediate action is required. No jargon.",
  "top_three_risks": [
    { "risk": "risk name", "domain": "domain name", "why_urgent": "one sentence", "severity": "Critical|High" }
  ],
  "immediate_actions": [
    { "action": "specific action", "domain": "domain name", "timeline": "within X days", "owner": "role" }
  ],
  "interaction_effects": "one paragraph describing where findings in multiple domains compound each other",
  "dpia_scope": [
    { "processing_activity": "name the activity", "regulatory_basis": "why a DPIA is required", "priority": "Immediate | This quarter" }
  ],
  "overall_readiness_rating": "one of: Initial | Developing | Defined | Managed | Optimised",
  "readiness_rationale": "one sentence explaining the rating"
}`,
      3000
    );

    let synthesis: any = {};
    try {
      const m = synthesisText.match(/\{[\s\S]*\}/);
      if (m) synthesis = JSON.parse(m[0]);
    } catch { synthesis = { executive_summary: "Assessment complete. Review domain findings.", dpia_scope: [] }; }

    const reportData = {
      generated_at: new Date().toISOString(),
      assessment_id,
      organisation_profile: intake,
      executive_summary: synthesis.executive_summary,
      top_three_risks: synthesis.top_three_risks || [],
      immediate_actions: synthesis.immediate_actions || [],
      overall_readiness_rating: synthesis.overall_readiness_rating || "Initial",
      readiness_rationale: synthesis.readiness_rationale || "",
      interaction_effects: synthesis.interaction_effects || "",
      domain_findings: domainResults,
      disclaimer: "This report is a compliance framework tool produced to assist organisations in identifying governance gaps. It does not constitute legal advice. All findings should be reviewed with qualified legal counsel.",
    };

    const dpiaScope = synthesis.dpia_scope || [];

    await supabase.from("governance_assessments").update({
      status: "complete",
      report_data: reportData,
      dpia_scope: dpiaScope,
      updated_at: new Date().toISOString(),
    }).eq("id", assessment_id);

    return new Response(JSON.stringify({ success: true, assessment_id }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (e) {
    console.error("run-governance-assessment error:", e);
    return new Response(JSON.stringify({ error: "Assessment failed. Please try again." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
