// generate-stress-fixtures — given { industry, geo, company_slot, company_id }
// asks Claude to generate a complete, internally-consistent test company
// profile with payloads for every applicable compliance tool. One call per
// company (~10s). Caller is the static stress orchestrator.

import { verifyCaller } from "../_shared/verify-caller.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY")!;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

const SYSTEM_PROMPT = `You are generating realistic, internally consistent test data for a privacy compliance software platform.
Given an industry, geography (US or EU/UK), and a slot number (1 or 2, for two different companies per
industry), create a complete company profile with all the data fields needed to test every applicable
compliance tool.

Rules:
- All fields for the same company must be internally consistent: same company name, domain, sector,
  contact email, DPO, and country throughout
- Data must be realistic and sector-appropriate (data categories, vendors, retention periods,
  processing activities must actually make sense for the industry)
- Company names must be plausible fictional names (not real companies)
- For US companies: include usNotice, cppaRisk, cppaCyber, governance, dpa, irPlaybook, biometric
  (if sector uses biometrics), registration. Set lia/dpia/ropa/euNotice to null.
- For EU/UK companies: include lia, dpia, governance, dpa, irPlaybook, ropa, euNotice, registration,
  biometric (if sector uses biometrics). Set usNotice/cppaRisk/cppaCyber to null.
- Slot 1 companies should be larger enterprises (500+ employees, $100M+ revenue equivalent)
- Slot 2 companies should be mid-market (100-500 employees, $20-100M revenue equivalent)

Respond ONLY with valid JSON matching the schema provided. No preamble.`;

function buildUserPrompt(industry: string, geo: string, company_slot: number, company_id: string) {
  return `Generate test data for:
Industry: ${industry}
Geography: ${geo} (${geo === "us" ? "United States" : "EU / United Kingdom"})
Company slot: ${company_slot} (${company_slot === 1 ? "large enterprise" : "mid-market"})
Company ID: ${company_id}

Return a JSON object with this exact structure:
{
  "companyName": "string — full legal name",
  "domain": "string — e.g. nexagenhealth.com",
  "privacyEmail": "string — privacy@domain",
  "dpoEmail": "string or null — dpo@domain (null for US companies unless they have a DPO)",
  "dpoName": "string or null — Full Name, Title",
  "countryCode": "string — ISO-2 (US, GB, DE, FR, IE, NL, etc.)",
  "employeeCount": number,
  "annualRevenue": "string — e.g. $145M or €92M",

  "lia": null or { "organization_name", "processing_description", "sector", "stated_purpose", "relationship_type", "data_categories": [], "jurisdictions": [], "alternatives_considered", "purpose_details": { "interest_holder", "interest_type", "purpose_text" }, "necessity_details": { "alternatives", "why_consent_not_used", "data_minimised", "pseudonymisation_options" }, "balancing_details": { "reasonable_expectation", "vulnerable_subjects": [], "potential_harm", "safeguards": [], "opt_out_mechanism", "special_category_data": bool, "balancing_text" } },

  "dpia": null or { "processing_activity_name", "description", "purpose", "data_categories": [], "data_subjects", "volume_frequency", "retention", "third_party_processors": [], "automated_decisions", "existing_safeguards": [], "jurisdictions": [], "legal_basis_proposed", "sector" },

  "governance": null or { "sector", "org_size", "jurisdictions": [], "eu_uk_data": "Yes or No", "tools": [], "data_categories": [], "special_category": "Yes or No", "special_categories_list": [], "privacy_policy", "acceptable_use", "dpo_status", "dpia_status", "incident_response", "training_status", "tool_instruction", "dpa_status", "transfer_status" },

  "biometric": null or { "biometricTypes": [], "orgType", "purpose", "jurisdictions": [], "enrolledCount" },

  "dpa": null or { "controllerName", "controllerJurisdiction", "processorName", "processorJurisdiction", "services", "dataCategories": [], "dataSubjectCount", "retention", "hasSubProcessors": bool, "subProcessorList", "legalFramework", "auditRights", "includeTransferClause": bool, "transferMechanism" },

  "irPlaybook": null or { "cause", "dataTypes": [], "affectedCount", "jurisdictions": [], "processorInvolved": bool, "contained", "organisationType" },

  "ropa": null or { "org_name", "legal_entity_type", "employee_band", "dpo_name", "dpo_email", "jurisdictions": [{"code", "name", "region"}], "activities": [{ "activity_name", "category", "purpose", "lawful_basis", "special_category_basis", "data_categories": [], "data_subjects", "recipients", "transfer_destination", "transfer_mechanism", "retention_period", "security_measures" }] },

  "usNotice": null or { "business_name", "business_description", "contact_email", "data_categories", "collection_purposes", "third_party_sharing", "third_party_categories", "sale_or_sharing", "retention_general", "sensitive_data_types", "data_sources" },

  "euNotice": null or { "controller_name", "controller_address", "contact_email", "dpo_details", "dpo_name", "dpo_email", "processing_purposes": [], "data_categories": [], "lawful_basis": [], "third_party_recipients": [], "transfer_outside_eea", "transfer_safeguards": [], "retention_period", "automated_decisions", "special_category_basis", "supervisory_authority_eu", "supervisory_authority_uk" },

  "cppaRisk": null or { "q1_revenue", "q2_consumers", "q3_sector", "q4_pi_categories": [], "q5_sell_share", "q6_right_know", "q7_right_delete", "q8_right_correct", "q9_opt_out", "q10_id_verification", "q11_policy_review", "q12_notice_at_collection", "q13_notice_content", "q14_employee_notice", "q15_sensitive_pi", "q16_sensitive_limit", "q17_sensitive_basis", "q18_admt_use", "q19_admt_description", "q20_admt_opt_out", "i1_processing_purpose", "i2_retention_period", "i2_retention_criteria", "i2_retention_detail", "i3_ca_consumer_band", "i4_disclosure_mechanisms": [], "i5_admt_logic", "i5_admt_training_source", "i5_admt_fairness_testing", "i5_admt_human_review", "i6_vendors", "i7_internal_contributors", "i7_external_consultees", "i8_certifying_exec_name", "i8_certifying_exec_title", "i9_has_existing_dpia", "i9_existing_dpia_summary" },

  "cppaCyber": null or { "profile": { "industry", "incidents_12mo", "framework", "last_audit" }, "industry_sector", "controls": { "c1_auth": ["status", "notes"], "c2_encryption": ["status", "notes"], "c3_zero_trust": ["status", "notes"], "c4_account_mgmt": ["status", "notes"], "c5_inventory": ["status", "notes"], "c7_vuln_mgmt": ["status", "notes"], "c8_audit_logs": ["status", "notes"], "c9_network_mon": ["status", "notes"], "c10_anti_malware": ["status", "notes"], "c14_third_party": ["status", "notes"], "c15_retention": ["status", "notes"], "c16_training": ["status", "notes"], "c17_incident": ["status", "notes"], "c18_continuity": ["status", "notes"] } },

  "registration": null or { "organization_name", "organization_country", "organization_size", "industry", "email", "employee_count": number, "annual_revenue_usd": number, "data_subjects_count": number, "role", "processes_personal_data": bool, "processes_special_categories": bool, "processes_children_data": bool, "large_scale_monitoring": bool, "uses_ai_systems": bool, "ai_high_risk": bool, "ai_general_purpose_provider": bool, "cross_border_transfers": bool, "markets_served": [], "has_eu_establishment": bool, "has_uk_establishment": bool, "acts_as_data_broker": bool, "sells_or_shares_personal_info": bool, "processes_biometrics_for_id": bool }
}`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const caller = await verifyCaller(req);
  if (!caller.internal) {
    if (!caller.userId) return json({ error: "forbidden" }, 403);
    // Allow admin users to call directly from the admin UI.
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const { data: isAdmin } = await admin.rpc("has_role", { _user_id: caller.userId, _role: "admin" });
    if (!isAdmin) return json({ error: "forbidden" }, 403);
  }

  let body: any;
  try { body = await req.json(); } catch { return json({ error: "invalid json" }, 400); }
  const { industry, geo, company_slot, company_id } = body ?? {};
  if (!industry || !geo || !company_slot || !company_id) {
    return json({ error: "missing required fields: industry, geo, company_slot, company_id" }, 400);
  }

  try {
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 32000,
        stream: true,
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: buildUserPrompt(industry, geo, company_slot, company_id) }],
      }),
      signal: AbortSignal.timeout(360_000),
    });
    if (!r.ok || !r.body) {
      const errText = r.body ? await r.text() : "no body";
      return json({ error: "fixture generation failed", detail: `anthropic ${r.status}: ${errText.slice(0, 400)}` }, 502);
    }
    // Consume SSE stream and accumulate text deltas
    const reader = r.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let text = "";
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";
      for (const line of lines) {
        if (!line.startsWith("data:")) continue;
        const payload = line.slice(5).trim();
        if (!payload || payload === "[DONE]") continue;
        try {
          const evt = JSON.parse(payload);
          if (evt.type === "content_block_delta" && evt.delta?.type === "text_delta") {
            text += evt.delta.text ?? "";
          }
        } catch { /* ignore parse errors on keep-alives */ }
      }
    }
    // Extract JSON object
    const start = text.indexOf("{");
    const end = text.lastIndexOf("}");
    if (start < 0 || end <= start) {
      return json({ error: "fixture generation failed", detail: "no JSON object in response" }, 502);
    }
    let parsed: any;
    try {
      parsed = JSON.parse(text.slice(start, end + 1));
    } catch (e) {
      return json({ error: "fixture generation failed", detail: `invalid JSON: ${(e as Error).message}` }, 502);
    }
    return json(parsed, 200);
  } catch (e) {
    return json({ error: "fixture generation failed", detail: (e as Error).message }, 502);
  }
});
