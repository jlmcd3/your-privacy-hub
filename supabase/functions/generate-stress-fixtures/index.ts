// generate-stress-fixtures — given { industry, geo, company_slot, company_id }
// generates a complete, internally-consistent test company profile with payloads
// for every applicable compliance tool.
//
// Supports split fixture generation so orchestrators can run the profile call
// and geo-specific call as separate requests under the platform timeout.

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

// Streaming Claude call. SSE bytes arrive continuously from Anthropic, and the
// handler below also streams harmless JSON whitespace back to our caller so the
// platform does not close the generate-stress-fixtures request while work runs.
async function callClaude(systemPrompt: string, userPrompt: string, maxTokens = 14000): Promise<string> {
  const r = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: maxTokens,
      stream: true,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
    }),
    signal: AbortSignal.timeout(300_000),
  });
  if (!r.ok || !r.body) {
    const errText = await r.text().catch(() => "no body");
    throw new Error(`Anthropic ${r.status}: ${errText.slice(0, 300)}`);
  }

  const reader = r.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let text = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    let idx: number;
    while ((idx = buffer.indexOf("\n\n")) !== -1) {
      const frame = buffer.slice(0, idx);
      buffer = buffer.slice(idx + 2);
      for (const line of frame.split("\n")) {
        if (!line.startsWith("data:")) continue;
        const payload = line.slice(5).trim();
        if (!payload || payload === "[DONE]") continue;
        try {
          const evt = JSON.parse(payload);
          if (evt.type === "content_block_delta" && evt.delta?.type === "text_delta") {
            text += evt.delta.text ?? "";
          } else if (evt.type === "error") {
            throw new Error(`Anthropic stream error: ${JSON.stringify(evt.error).slice(0, 300)}`);
          }
        } catch (e) {
          if ((e as Error).message?.startsWith("Anthropic stream error")) throw e;
        }
      }
    }
  }

  if (!text) throw new Error("Empty response from Anthropic");
  return text;
}

function extractJson(text: string): any {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end <= start) throw new Error("No JSON object found in response");
  try {
    return JSON.parse(text.slice(start, end + 1));
  } catch (e) {
    throw new Error(`JSON parse failed: ${(e as Error).message}`);
  }
}

function streamJsonWork(work: () => Promise<unknown>): Response {
  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let keepalive: number | undefined;
      try {
        controller.enqueue(encoder.encode("\n"));
        keepalive = setInterval(() => {
          try {
            controller.enqueue(encoder.encode("\n"));
          } catch {
            if (keepalive) clearInterval(keepalive);
          }
        }, 10_000);

        const result = await work();
        controller.enqueue(encoder.encode(JSON.stringify(result)));
      } catch (e) {
        controller.enqueue(encoder.encode(JSON.stringify({
          error: "fixture generation failed",
          detail: (e as Error).message,
        })));
      } finally {
        if (keepalive) clearInterval(keepalive);
        controller.close();
      }
    },
  });

  return new Response(stream, {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

const SYSTEM_PROMPT = `You are generating realistic, internally consistent test data for a privacy compliance software platform.
Rules:
- All fields for the same company must use the same company name, domain, sector, contact email, DPO, and country
- Data must be realistic and sector-appropriate (data categories, vendors, retention periods, processing activities)
- Company names must be plausible fictional names (not real companies)
- Slot 1: large enterprises (500+ employees, $100M+ revenue equivalent)
- Slot 2: mid-market (100-500 employees, $20-100M revenue equivalent)
- Respond ONLY with valid JSON. No preamble, no markdown fences.`;

// ── CALL A: Company profile + tools that apply to both US and EU ──────────────

function buildCallAPrompt(industry: string, geo: string, slot: number, companyId: string): string {
  const isEU = geo === "eu";
  return `Generate test data for:
Industry: ${industry}
Geography: ${geo} (${isEU ? "EU / United Kingdom" : "United States"})
Company slot: ${slot} (${slot === 1 ? "large enterprise" : "mid-market"})
Company ID: ${companyId}

Return a JSON object with EXACTLY these top-level fields:
{
  "companyName": "string — full legal name",
  "domain": "string — e.g. nexagenhealth.com",
  "privacyEmail": "string — privacy@domain",
  "dpoEmail": ${isEU ? '"string — dpo@domain"' : '"string or null"'},
  "dpoName": ${isEU ? '"string — Full Name, Title"' : '"string or null"'},
  "countryCode": "string — ISO-2 (${isEU ? "GB, DE, FR, IE, NL, etc." : "US"})",
  "employeeCount": number,
  "annualRevenue": "string — e.g. ${isEU ? "€92M" : "$145M"}",
  "governance": {
    "sector": "string", "org_size": "string", "jurisdictions": ["array"],
    "eu_uk_data": "${isEU ? "Yes" : "No"}", "tools": ["array"], "data_categories": ["array"],
    "special_category": "Yes or No", "special_categories_list": [],
    "privacy_policy": "string", "acceptable_use": "string", "dpo_status": "string",
    "dpia_status": "string", "incident_response": "string", "training_status": "string",
    "tool_instruction": "string", "dpa_status": "string", "transfer_status": "string"
  },
  "dpa": {
    "controllerName": "string", "controllerJurisdiction": "string",
    "processorName": "string — a realistic vendor name", "processorJurisdiction": "string",
    "services": "string", "dataCategories": ["array"], "dataSubjectCount": "string",
    "retention": "string", "hasSubProcessors": boolean, "subProcessorList": "string or empty string",
    "legalFramework": "${isEU ? "GDPR" : "US"}", "auditRights": "string",
    "includeTransferClause": boolean, "transferMechanism": "string or null"
  },
  "irPlaybook": {
    "cause": "string", "dataTypes": ["array"], "affectedCount": "string",
    "jurisdictions": ["array"], "processorInvolved": boolean,
    "contained": "string", "organisationType": "string"
  },
  "biometric": null,
  "registration": {
    "organization_name": "string", "organization_country": "string",
    "organization_size": "string", "industry": "string", "email": "string",
    "employee_count": number, "annual_revenue_usd": number, "data_subjects_count": number,
    "role": "controller or processor", "processes_personal_data": boolean,
    "processes_special_categories": boolean, "processes_children_data": boolean,
    "large_scale_monitoring": boolean, "uses_ai_systems": boolean, "ai_high_risk": boolean,
    "ai_general_purpose_provider": boolean, "cross_border_transfers": boolean,
    "markets_served": ["array"], "has_eu_establishment": boolean, "has_uk_establishment": boolean,
    "acts_as_data_broker": boolean, "sells_or_shares_personal_info": boolean,
    "processes_biometrics_for_id": boolean
  }
}

Only set biometric to a non-null object if the ${industry} sector routinely uses biometric identification (e.g. healthcare, physical security, financial services). For all other sectors set biometric to null.
The biometric object structure if used: { "biometricTypes": ["array"], "orgType": "string", "purpose": "string", "jurisdictions": ["array"], "enrolledCount": "string" }`;
}

// ── CALL B (EU): lia, dpia, ropa, euNotice ────────────────────────────────────

function buildCallBEUPrompt(industry: string, slot: number, companyName: string): string {
  return `You are generating EU-specific compliance tool payloads for "${companyName}", a ${slot === 1 ? "large enterprise" : "mid-market"} ${industry} company based in the EU/UK.
Use the same company name, domain, DPO details, and country as already established for this company.

Return a JSON object with EXACTLY these fields:
{
  "lia": {
    "organization_name": "string", "processing_description": "string", "sector": "string",
    "stated_purpose": "string", "relationship_type": "string", "data_categories": ["array"],
    "jurisdictions": ["array"], "alternatives_considered": "string",
    "purpose_details": { "interest_holder": "string", "interest_type": "string", "purpose_text": "string" },
    "necessity_details": { "alternatives": "string", "why_consent_not_used": "string", "data_minimised": "string", "pseudonymisation_options": "string" },
    "balancing_details": { "reasonable_expectation": "string", "vulnerable_subjects": [], "potential_harm": "string", "safeguards": ["array"], "opt_out_mechanism": "string", "special_category_data": boolean, "balancing_text": "string" }
  },
  "dpia": {
    "processing_activity_name": "string", "description": "string", "purpose": "string",
    "data_categories": ["array"], "data_subjects": "string", "volume_frequency": "string",
    "retention": "string", "third_party_processors": ["array"], "automated_decisions": "string",
    "existing_safeguards": ["array"], "jurisdictions": ["array"],
    "legal_basis_proposed": "string", "sector": "string"
  },
  "ropa": {
    "org_name": "string", "legal_entity_type": "string", "employee_band": "string",
    "dpo_name": "string", "dpo_email": "string",
    "jurisdictions": [{ "code": "string", "name": "string", "region": "string" }],
    "activities": [
      {
        "activity_name": "string", "category": "string", "purpose": "string",
        "lawful_basis": "string", "special_category_basis": "string or null",
        "data_categories": ["array"], "data_subjects": "string", "recipients": "string",
        "transfer_destination": "string or null", "transfer_mechanism": "string or null",
        "retention_period": "string", "security_measures": "string"
      }
    ]
  },
  "euNotice": {
    "controller_name": "string", "controller_address": "string", "contact_email": "string",
    "dpo_details": "string", "dpo_name": "string", "dpo_email": "string",
    "processing_purposes": ["array"], "data_categories": ["array"], "lawful_basis": ["array"],
    "third_party_recipients": ["array"], "transfer_outside_eea": "string",
    "transfer_safeguards": ["array"], "retention_period": "string",
    "automated_decisions": "string", "special_category_basis": "string or null",
    "supervisory_authority_eu": "string", "supervisory_authority_uk": "string or null"
  },
  "usNotice": null,
  "cppaRisk": null,
  "cppaCyber": null
}

Include 3-5 realistic processing activities in ropa.activities for a ${industry} company.`;
}

// ── CALL B (US): usNotice, cppaRisk, cppaCyber ───────────────────────────────

function buildCallBUSPrompt(industry: string, slot: number, companyName: string): string {
  return `You are generating US-specific compliance tool payloads for "${companyName}", a ${slot === 1 ? "large enterprise" : "mid-market"} ${industry} company based in the United States.
Use the same company name, domain, and contact info as already established for this company.

Return a JSON object with EXACTLY these fields:
{
  "usNotice": {
    "business_name": "string", "business_description": "string", "contact_email": "string",
    "data_categories": "string — prose description", "collection_purposes": "string",
    "third_party_sharing": "string", "third_party_categories": "string",
    "sale_or_sharing": "string", "retention_general": "string",
    "sensitive_data_types": "string", "data_sources": "string"
  },
  "cppaRisk": {
    "q1_revenue": "string", "q2_consumers": "string", "q3_sector": "string",
    "q4_pi_categories": ["array"], "q5_sell_share": "string", "q6_right_know": "string",
    "q7_right_delete": "string", "q8_right_correct": "string", "q9_opt_out": "string",
    "q10_id_verification": "string", "q11_policy_review": "string",
    "q12_notice_at_collection": "string", "q13_notice_content": "string",
    "q14_employee_notice": "string", "q15_sensitive_pi": "string",
    "q16_sensitive_limit": "string", "q17_sensitive_basis": "string",
    "q18_admt_use": "string", "q19_admt_description": "string", "q20_admt_opt_out": "string",
    "i1_processing_purpose": "string", "i2_retention_period": "string",
    "i2_retention_criteria": "string", "i2_retention_detail": "string",
    "i3_ca_consumer_band": "string", "i4_disclosure_mechanisms": ["array"],
    "i5_admt_logic": "string", "i5_admt_training_source": "string",
    "i5_admt_fairness_testing": "string", "i5_admt_human_review": "string",
    "i6_vendors": "string", "i7_internal_contributors": "string",
    "i7_external_consultees": "string", "i8_certifying_exec_name": "string",
    "i8_certifying_exec_title": "string", "i9_has_existing_dpia": "string",
    "i9_existing_dpia_summary": "string"
  },
  "cppaCyber": {
    "profile": { "industry": "string", "incidents_12mo": "string", "framework": "string", "last_audit": "string" },
    "industry_sector": "string",
    "controls": {
      "c1_auth": ["status string", "notes string"],
      "c2_encryption": ["status string", "notes string"],
      "c3_zero_trust": ["status string", "notes string"],
      "c4_account_mgmt": ["status string", "notes string"],
      "c5_inventory": ["status string", "notes string"],
      "c7_vuln_mgmt": ["status string", "notes string"],
      "c8_audit_logs": ["status string", "notes string"],
      "c9_network_mon": ["status string", "notes string"],
      "c10_anti_malware": ["status string", "notes string"],
      "c14_third_party": ["status string", "notes string"],
      "c15_retention": ["status string", "notes string"],
      "c16_training": ["status string", "notes string"],
      "c17_incident": ["status string", "notes string"],
      "c18_continuity": ["status string", "notes string"]
    }
  },
  "lia": null,
  "dpia": null,
  "ropa": null,
  "euNotice": null
}`;
}

// ── Main handler ──────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const caller = await verifyCaller(req);
  if (!caller.internal) {
    if (!caller.userId) return json({ error: "forbidden" }, 403);
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const { data: isAdmin } = await admin.rpc("has_role", { _user_id: caller.userId, _role: "admin" });
    if (!isAdmin) return json({ error: "forbidden" }, 403);
  }

  let body: any;
  try { body = await req.json(); } catch { return json({ error: "invalid json" }, 400); }
  const { industry, geo, company_slot, company_id, part, company_name } = body ?? {};
  if (!industry || !geo || !company_slot || !company_id) {
    return json({ error: "missing required fields: industry, geo, company_slot, company_id" }, 400);
  }

  return streamJsonWork(async () => {
    if (part === "profile") {
      const callAText = await callClaude(SYSTEM_PROMPT, buildCallAPrompt(industry, geo, company_slot, company_id));
      return extractJson(callAText);
    }

    if (part === "geo") {
      const name = company_name || company_id;
      const callBText = await callClaude(
        SYSTEM_PROMPT,
        geo === "eu"
          ? buildCallBEUPrompt(industry, company_slot, name)
          : buildCallBUSPrompt(industry, company_slot, name),
      );
      return extractJson(callBText);
    }

    // Call A: company profile + shared tools (governance, dpa, irPlaybook, biometric, registration)
    const callAText = await callClaude(SYSTEM_PROMPT, buildCallAPrompt(industry, geo, company_slot, company_id));
    const profileData = extractJson(callAText);
    const companyName: string = profileData.companyName ?? company_id;

    // Call B: geo-specific tools
    const callBText = await callClaude(
      SYSTEM_PROMPT,
      geo === "eu"
        ? buildCallBEUPrompt(industry, company_slot, companyName)
        : buildCallBUSPrompt(industry, company_slot, companyName),
    );
    const geoData = extractJson(callBText);

    // Merge: geoData fields overwrite profileData where both exist (shouldn't overlap)
    return { ...profileData, ...geoData };
  });
});
