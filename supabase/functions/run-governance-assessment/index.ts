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

function stripMd(s: string | undefined | null): string {
  if (!s) return s ?? "";
  return s
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/\*\*\*([^*]+)\*\*\*/g, '$1')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/(?<!\*)\*(?!\s)([^*\n]+?)\*(?!\*)/g, '$1')
    .replace(/^>\s?/gm, '')
    .replace(/^\s*\*\s+/gm, '• ')
    .replace(/^\s*-\s+/gm, '• ')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/^\s*[-_]{3,}\s*$/gm, '');
}

async function callAnthropic(model: string, system: string, user: string, maxTokens = 2000): Promise<string> {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": Deno.env.get("ANTHROPIC_API_KEY")!,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({ model, max_tokens: maxTokens, system, messages: [{ role: "user", content: user }] }),
    signal: AbortSignal.timeout(120000),
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

  let assessment_id: string | undefined;
  try {
    const caller = await verifyCaller(req);
    if (!caller.internal && !caller.userId) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    ({ assessment_id } = await req.json());
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

    const domainSystem = `You are a senior privacy and data protection compliance analyst. You are assessing an organisation's data governance practices against applicable regulatory requirements. Be specific, cite regulatory provisions where applicable (GDPR Article numbers, CCPA sections, etc.), and be direct about findings. This is a compliance framework tool. Return ONLY valid JSON, no preamble.

CITATION INTEGRITY: Cite provisions ONLY in the exact forms below. If you cannot match a citation to one of these patterns with certainty, name the law and obligation in plain language instead (e.g. 'CCPA — service provider contract requirement') rather than fabricate.
- Illinois BIPA: only the form "740 ILCS 14/<section>" (e.g. 740 ILCS 14/15(b)). NEVER write "§15-101", "§15-2", "§1401", "15 ILCS", or "15 USC".
- Colorado CPA: only "C.R.S. §6-1-1301" through "§6-1-1313". Consumer rights §6-1-1306; controller duties §6-1-1308; processor duties §6-1-1305; data protection assessments §6-1-1309.
- Virginia VCDPA: only "Va. Code §59.1-575" through "§59.1-585". Consumer rights §59.1-577; controller duties §59.1-578; processor duties §59.1-579; data protection assessments §59.1-580.
- CCPA/CPRA right to correct is §1798.106. NEVER cite §1798.120 (that is opt-out of sale) or §1798.100(a)(2) for the right to correct.
- §1798.150 is ONLY the data-breach private right of action. Do not cite §1798.150 for any other proposition.
- The CPRA service provider definition is §1798.140(ag).
- UK DPA 2018 Schedule 1 contains special-category processing conditions ONLY. Never cite Schedule 1 for general processing principles. The UK GDPR has NO Schedules — do not invent any.
- Ireland: NEVER cite specific Irish Data Protection Act 2018 section numbers. Cite the GDPR article directly and refer to "the Data Protection Act 2018 (Ireland)" generally. There is NO general registration or notification requirement with the Irish DPC.
- GDPR Recital 47 concerns legitimate interests only. Recital 39 concerns transparency and awareness. Do not swap them.
- DPO awareness-raising and training tasks are Article 39(1)(b), NOT Article 37(5). Article 37 has no SME or sector exemption — do not assert one.

VENDOR NAMING RULE: Name ONLY vendors that are explicitly provided in the intake. Never introduce additional vendor or company names that the organisation did not list.

MICROSOFT 365 COPILOT RULE: Never assert as fact that Microsoft 365 Copilot uses tenant data for AI model training. Frame any such concern as "verify Microsoft's data-handling and model-training commitments for the tenant".

ENFORCEMENT CASE RULE: Do NOT reference specific enforcement case names, fine amounts, or regulator decisions in any domain field. Enforcement precedents are injected only into the synthesis stage. Domain findings must cite statutes only.

MONETARY PENALTY RULE: In the synthesis stage, never state a specific monetary fine, penalty, or settlement amount unless that exact figure appears in the ENFORCEMENT PRECEDENTS or ENFORCEMENT CONTEXT block provided in this prompt. Training knowledge of regulatory fines is unreliable — amounts change on appeal and training data may be wrong. If a relevant case exists but its amount is not in the provided block, write "[Regulator] imposed a significant penalty for this type of violation — verify the current figure at the regulator's enforcement register" instead of recalling an amount. Known correct figures (use only if the case is in your enforcement block): ICO Clearview AI (2022) £7,552,800; ICO Interserve (2022) £4,400,000 (NOT £5.03M); ICO Capita Pension Solutions (2024) £6,090,000 (NOT £6.88M); ICO British Airways (2020) £20,000,000.`;

    const domainResults: Record<string, any> = {};

    const sector = (intake.sector || "").toLowerCase();
    const dataTypes: string[] = Array.isArray(intake.data_types) ? intake.data_types : [];
    const jurisdictionsLower: string[] = (intake.jurisdictions || []).map((j: string) => String(j).toLowerCase());
    const needsHigherQuality =
      intake.eu_uk_data ||
      intake.special_category_data ||
      sector === "healthcare" ||
      sector === "financial_services" || sector === "finance" ||
      dataTypes.some((t: string) =>
        ["biometric", "health", "financial", "genetic", "children"].includes(String(t).toLowerCase())
      ) ||
      jurisdictionsLower.some((j: string) =>
        ["us-federal", "california", "new-york"].includes(j)
      );

    const tryParseJson = (text: string): any | null => {
      try {
        const m = text.match(/\{[\s\S]*\}/);
        return m ? JSON.parse(m[0]) : null;
      } catch { return null; }
    };

    const domainResultsArray = await Promise.all(
      DOMAIN_DEFINITIONS.map(async (domain) => {
        const model = (domain.escalate && needsHigherQuality)
          ? "claude-sonnet-4-6"
          : "claude-haiku-4-5-20251001";
        const userPrompt = `DOMAIN ${domain.id}: ${domain.name}

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
}`;
        const firstText = await callAnthropic(model, domainSystem, userPrompt, 1200);
        let parsed = tryParseJson(firstText);
        if (!parsed) {
          // Retry once before giving up. Never emit placeholder "parse error"
          // copy into customer-facing report; failed domains are excluded
          // from the report entirely and recorded as a lint warning.
          console.warn(`[Governance] domain ${domain.id} (${domain.name}) parse failed; retrying once.`);
          const retryText = await callAnthropic(model, domainSystem, userPrompt, 1200);
          parsed = tryParseJson(retryText);
        }
        if (!parsed) {
          return {
            key: domain.key,
            result: { assessment_failed: true, domain_id: domain.id, domain_name: domain.name },
          };
        }
        return { key: domain.key, result: parsed };
      })
    );

    // Partition successful vs failed domains. Failed domains are excluded
    // from synthesis input, from the rendered report, and from any
    // immediate-actions list.
    const failedDomains: Array<{ domain_id: any; domain_name: string }> = [];
    for (const { key, result } of domainResultsArray) {
      if (result && (result as any).assessment_failed) {
        failedDomains.push({
          domain_id: (result as any).domain_id,
          domain_name: (result as any).domain_name,
        });
        continue;
      }
      domainResults[key] = result;
    }
    const failedDomainNames = new Set(failedDomains.map((d) => String(d.domain_name || "").toLowerCase()));

    // Fetch enforcement precedents (3-5) relevant to this org's profile (before synthesis so they can be cited)
    let enforcementPrecedents: any[] = [];
    let enforcementMeta: any = { attempted: false };
    try {
      const { data: ctxData } = await supabase.functions.invoke("get-enforcement-context", {
        body: {
          tool: "Governance",
          jurisdictions: intake.jurisdictions || [],
          sector: intake.sector || undefined,
          biometric: intake.special_category_data || undefined,
          limit: 5,
        },
      });
      enforcementPrecedents = (ctxData?.results || []).slice(0, 5);
      const descParts: string[] = [];
      if (intake.sector) descParts.push(`${intake.sector} sector`);
      if ((intake.jurisdictions || []).length) descParts.push(`governance in ${(intake.jurisdictions || []).join(", ")}`);
      enforcementMeta = {
        attempted: true,
        total_matched: typeof ctxData?.total_matched === "number" ? ctxData.total_matched : null,
        query_descriptor: descParts.join(" — ") || undefined,
      };
    } catch (e) {
      console.error("get-enforcement-context failed (non-fatal):", e);
    }

    const enforcementContextStr = enforcementPrecedents.length > 0
      ? enforcementPrecedents.map((r: any, i: number) =>
          `[E${i + 1}] id:${r.id} ${r.subject || "Unnamed"} — ${r.regulator} (${r.jurisdiction}, ${r.decision_date || "n.d."}) — Fine: €${r.fine_eur_equivalent || 0} — Failure: ${r.key_compliance_failure || r.violation || "n/a"}`
        ).join("\n")
      : "No directly analogous enforcement precedents retrieved.";

    // ── SYNTHESIS ──
    const synthesisText = await callAnthropic("claude-sonnet-4-6", domainSystem,
      `Synthesise these ten domain findings into cross-domain patterns and an executive summary.

TEN DOMAIN FINDINGS:
${JSON.stringify(domainResults, null, 2)}

ORGANISATION PROFILE:
${intakeSummary}

ENFORCEMENT PRECEDENTS (cite by [E1]–[E5] where relevant):
${enforcementContextStr}

ANNOTATION REQUIREMENT: For each enforcement action cited above (tagged [E1], [E2], etc.), if it directly supports a top risk, immediate action, or readiness rating in your synthesis, include it in the annotations array using the id value from the enforcement context exactly as provided. You MUST only cite enforcement actions from the ENFORCEMENT PRECEDENTS provided above — never cite cases from training knowledge. If an enforcement action is not in the provided context, do not cite it.

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
  "readiness_rationale": "one sentence explaining the rating",
  "annotations": [
    {
      "enforcement_action_id": "exact id string from the enforcement context above (the value after 'id:')",
      "regulator": "regulator name",
      "jurisdiction": "jurisdiction",
      "decision_date": "YYYY-MM-DD or null",
      "summary": "one sentence what the case involved, max 25 words, plain English",
      "outcome": "rejected | accepted | penalised | required",
      "relevance": "one sentence why this case is relevant to this synthesis"
    }
  ]
}`,
      5000
    );

    let synthesis: any = {};
    try {
      const m = synthesisText.match(/\{[\s\S]*\}/);
      if (m) synthesis = JSON.parse(m[0]);
    } catch (e) {
      console.error("[Governance] Synthesis parse error:", e);
      synthesis = {
        executive_summary: "Assessment complete. Review domain findings above for full detail.",
        top_three_risks: [],
        immediate_actions: [],
        overall_readiness_rating: "Initial",
        readiness_rationale: "Synthesis could not be completed.",
        interaction_effects: "",
        dpia_scope: []
      };
    }


    const strippedDomainFindings: Record<string, any> = {};
    for (const [k, v] of Object.entries(domainResults || {})) {
      const dn: any = v;
      strippedDomainFindings[k] = {
        ...dn,
        current_state: stripMd(dn?.current_state),
        gap_description: stripMd(dn?.gap_description),
        regulatory_basis: stripMd(dn?.regulatory_basis),
        recommended_action: stripMd(dn?.recommended_action),
      };
    }

    const reportData = {
      generated_at: new Date().toISOString(),
      assessment_id,
      organisation_profile: intake,
      executive_summary: stripMd(synthesis.executive_summary),
      top_three_risks: (synthesis.top_three_risks || []).map((r: any) => ({
        ...r,
        risk: stripMd(r?.risk),
        why_urgent: stripMd(r?.why_urgent),
      })),
      immediate_actions: (synthesis.immediate_actions || [])
        .filter((a: any) => !failedDomainNames.has(String(a?.domain || "").toLowerCase()))
        .map((a: any) => ({
          ...a,
          action: stripMd(a?.action),
        })),
      overall_readiness_rating: synthesis.overall_readiness_rating || "Initial",
      readiness_rationale: stripMd(synthesis.readiness_rationale || ""),
      interaction_effects: stripMd(synthesis.interaction_effects || ""),
      domain_findings: strippedDomainFindings,
      enforcement_precedents: enforcementPrecedents,
      enforcement_meta: enforcementMeta,
      annotations: (() => { try { return Array.isArray(synthesis?.annotations) ? synthesis.annotations : []; } catch { return []; } })(),
      lint_warnings: failedDomains.map((d) => ({
        code: "domain_assessment_failed",
        severity: "hard",
        detail: d.domain_name,
      })),
      disclaimer: "This report is a compliance framework tool produced to assist organisations in identifying governance gaps. It does not constitute legal advice. All findings should be reviewed with qualified legal counsel.",
    };

    const dpiaScope = synthesis.dpia_scope || [];

    await supabase.from("governance_assessments").update({
      status: "complete",
      report_data: reportData,
      dpia_scope: dpiaScope,
      updated_at: new Date().toISOString(),
    }).eq("id", assessment_id);

    // C4 RoPA accumulator: governance assessment surfaces a "Programme governance" obligation
    if (assessment.client_id) {
      supabase.functions.invoke("accumulate-ropa-activity", {
        body: {
          client_id: assessment.client_id,
          source_tool: "governance_assessment",
          source_assessment_id: assessment_id,
          display_name: "Privacy programme governance",
          source_summary: "Drafted from Governance Assessment — review domain findings and link to RoPA categories.",
          is_high_risk: false,
          category: "finance_legal",
        },
      }).catch((e: Error) => console.error("[gov] accumulate-ropa failed (non-fatal):", e.message));
    }


    const { data: userData } = await supabase.auth.admin.getUserById(
      assessment.user_id
    ).catch(() => ({ data: null as any }));

    await supabase.functions.invoke("generate-report-pdf", {
      body: {
        tool_type: "governance_assessment",
        assessment_id,
        user_email: userData?.user?.email || null,
        user_name: userData?.user?.user_metadata?.full_name || null,
        result_url: `${Deno.env.get("SITE_URL") || "https://enduserprivacy.com"}/governance-assessment/result/${assessment_id}`,
      },
    }).catch((e: Error) => console.error("PDF/email delivery failed (non-fatal):", e));

    return new Response(JSON.stringify({ success: true, assessment_id }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (e) {
    console.error("run-governance-assessment error:", e);
    if (assessment_id) {
      await supabase.from("governance_assessments")
        .update({ status: "failed" }).eq("id", assessment_id);
    }
    return new Response(JSON.stringify({ error: "Assessment failed. Please try again." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
