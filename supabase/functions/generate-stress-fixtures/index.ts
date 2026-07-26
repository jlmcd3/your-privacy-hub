// build-marker: stress-qi2c-biometric-none-2026-07-03
// Keep in sync: generate-stress-fixtures specs <-> src/lib/sampleFixtureShapes.ts (sample fixtures drift guard)
console.log("[build-marker] generate-stress-fixtures qi2c-biometric-none-2026-07-03");
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
async function callClaude(systemPrompt: string, userPrompt: string, maxTokens = 5000): Promise<string> {
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
- Keep strings concise: one short phrase or sentence unless the field is an array
- Use compact arrays: 2-4 items unless explicitly instructed otherwise
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
    "privacy_policy": "string", "dpo_status": "string",
    "dpia_status": "string", "incident_response": "string", "training_status": "string",
    "tool_instruction": "string", "dpa_status": "string", "transfer_status": "string"
  },
  "dpa": {
    "controllerName": "string", "controllerJurisdiction": "string",
    "processorName": "string — a realistic vendor name", "processorJurisdiction": "string",
    "services": "string", "dataCategories": ["array"],
    "retention": "string", "hasSubProcessors": boolean, "subProcessorList": "string or empty string",
    "legalFramework": "${isEU ? "GDPR" : "US"}", "auditRights": "string",
    "includeTransferClause": boolean, "transferMechanism": "string or null"
  },
  "irPlaybook": {
    "cause": "string", "dataTypes": ["array"], "affectedCount": "string",
    "jurisdictions": ["array"], "processorInvolved": boolean,
    "contained": "string", "organisationType": "string"
  },
  "biometric": {
    "orgName": "string — the company name",
    "biometricTypes": ["array"],
    "orgType": "string",
    "purpose": "string",
    "jurisdictions": ["array"]
  },
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

Always emit a biometric object for every company (tool selection is handled at the job level by selected_tools). For sectors that do not routinely use biometric identification, still emit the object using realistic minimal values (e.g. biometricTypes may be ["none currently deployed"]). Never emit null.`;
}

// ── CALL B (EU): lia, dpia, ropa, euNotice ────────────────────────────────────

function getDpiaIntakeForSector(industry: string, slot: number): {
  processing_activity_name: string;
  description: string;
  purpose: string;
  data_categories: string[];
  data_subjects: string;
  legal_basis_proposed: string;
  automated_decisions: string;
} {
  const s = industry.toLowerCase();
  if (/adtech|digital media|advertising|programmatic/i.test(s)) return {
    processing_activity_name: `Behavioural advertising and audience segmentation`,
    description: `Cross-context collection and analysis of device identifiers, browsing history, and inferred interests to build audience segments used for targeted advertising.`,
    purpose: "Deliver targeted advertising to maximise CPM; build and monetise audience segments.",
    data_categories: ["device identifiers", "browsing history", "IP addresses", "inferred interests", "location data"],
    data_subjects: "Platform users and third-party website visitors whose identifiers are collected via pixels and SDKs",
    legal_basis_proposed: "Consent (ePrivacy) for device access; legitimate interests or consent (GDPR) for profiling — to be confirmed per purpose",
    automated_decisions: "Automated audience scoring affects ad delivery; not Article 22 in scope absent significant effect on individuals.",
  };
  if (/healthcare|life science|clinical|medical|pharma/i.test(s)) return {
    processing_activity_name: `Health data processing for clinical services`,
    description: `Collection, storage, and analysis of patient health records, diagnostic data, and treatment history to support clinical decision-making and care delivery.`,
    purpose: "Provide clinical services; support diagnostic and treatment decisions; maintain medical records.",
    data_categories: ["health/medical data", "diagnostic records", "treatment history", "contact details", "identifiers"],
    data_subjects: "Patients and clinical trial participants, including potentially vulnerable individuals",
    legal_basis_proposed: "Article 9(2)(h) (healthcare purposes) + Article 6(1)(b) or (1)(c); explicit consent for non-essential processing",
    automated_decisions: "Clinical decision-support tools may generate automated recommendations; final decisions made by clinicians.",
  };
  if (/data broker|data intel|enrichment|audience data/i.test(s)) return {
    processing_activity_name: `Large-scale profiling and data commercialisation`,
    description: `Collection, aggregation, and sale or licensing of personal data from multiple third-party sources to build consumer profiles sold to commercial clients.`,
    purpose: "Build and commercialise consumer profiles; provide identity resolution, audience targeting, and credit pre-screening to business clients.",
    data_categories: ["identifiers", "inferred demographics", "purchasing behaviour", "credit indicators", "contact details"],
    data_subjects: "Individuals whose data is collected indirectly via third-party sources, public records, or data partnerships — not from direct collection",
    legal_basis_proposed: "Legal basis to be determined per purpose; legitimate interests is contested for large-scale indirect profiling — purpose-by-purpose analysis required",
    automated_decisions: "Automated profile scoring used to assign segments; no solely automated Article 22 decisions without human review.",
  };
  if (/edtech|children|child|schools|students|learning/i.test(s)) return {
    processing_activity_name: `Processing of children's personal data for educational services`,
    description: `Collection and use of students' usage logs, assessment results, and learning behaviour data within an educational technology platform serving schools and learners.`,
    purpose: "Personalise learning journeys; generate progress reports for teachers and parents; maintain educational records.",
    data_categories: ["educational records", "usage logs", "assessment data", "contact details", "identifiers"],
    data_subjects: "Children and young people aged under 18 (students/learners), parents or guardians, and teachers — a vulnerable population",
    legal_basis_proposed: "Article 6(1)(b) (contract with school/institution); Article 8 consent requirements apply where processing is information society services directed at children",
    automated_decisions: "Automated learning progress scoring; no solely automated decisions with significant legal or educational effects.",
  };
  if (/biotech|genomic|genetic|genome/i.test(s)) return {
    processing_activity_name: `Genomic and genetic data processing for biotech research`,
    description: `Sequencing, storage, and analysis of genetic and genomic data for research purposes, potentially combined with health records and clinical data.`,
    purpose: "Advance biotech research; identify genetic markers; support drug development and personalised medicine.",
    data_categories: ["genetic data", "genomic sequences", "health data", "identifiers", "research records"],
    data_subjects: "Research participants and patients who have provided samples, including family members whose genetic data may be incidentally revealed",
    legal_basis_proposed: "Article 9(2)(j) (scientific research) + explicit consent (Article 9(2)(a)); ethical approval required",
    automated_decisions: "Automated genomic analysis tools used; outputs reviewed by qualified scientists before any clinical application.",
  };
  if (/hr|employment|workforce|recruitment|payroll/i.test(s)) return {
    processing_activity_name: `Employee monitoring and workforce analytics`,
    description: `Collection and analysis of employee activity, productivity metrics, communication logs, and HR records including performance assessments and disciplinary records.`,
    purpose: "Manage workforce performance; ensure regulatory compliance; support recruitment and HR administration.",
    data_categories: ["employee records", "productivity data", "communications metadata", "health/absence data", "identifiers"],
    data_subjects: "Employees, contractors, and job applicants in a power-imbalanced relationship with the controller",
    legal_basis_proposed: "Article 6(1)(b) employment contract; Article 6(1)(c) legal obligation; consent is not freely given in employment contexts",
    automated_decisions: "Performance scoring may inform promotion or disciplinary decisions; human review mandatory for all significant employment decisions.",
  };
  if (/gov|public sector|public authority|government/i.test(s)) return {
    processing_activity_name: `Public authority data processing for statutory functions`,
    description: `Processing of personal data by a public authority in the exercise of official functions including benefits administration, licensing, or law enforcement support.`,
    purpose: "Discharge statutory public functions; administer public services; comply with legal obligations.",
    data_categories: ["identifiers", "contact details", "government records", "potentially health or criminal offence data"],
    data_subjects: "Members of the public interacting with public services; potentially including vulnerable individuals",
    legal_basis_proposed: "Article 6(1)(e) public task or Article 6(1)(c) legal obligation; Article 6(1)(f) legitimate interests does NOT apply to public authorities in the performance of their tasks",
    automated_decisions: "Administrative decisions may be partially automated; Article 22 applies to solely automated decisions with significant individual effects.",
  };
  if (/ai|machine learning|artificial intelligence|ml model/i.test(s)) return {
    processing_activity_name: `AI model training and automated decision-making`,
    description: `Training and deployment of machine learning models on large datasets of personal data to generate predictions, classifications, or recommendations affecting individuals.`,
    purpose: "Develop AI products; automate decisions or recommendations at scale; improve model performance using training data.",
    data_categories: ["behavioural data", "identifiers", "inferred characteristics", "interaction history", "potentially special-category data depending on model purpose"],
    data_subjects: "Individuals whose data is used to train or evaluate models, and individuals subject to model outputs",
    legal_basis_proposed: "Legitimate interests or consent depending on the processing purpose; Article 9 applies if training data includes special categories",
    automated_decisions: "Model outputs may constitute Article 22 automated decisions if they produce significant individual effects; human review obligations must be assessed.",
  };
  // Default: generic security monitoring (unchanged for sectors not requiring specific treatment)
  return {
    processing_activity_name: `${industry} platform monitoring`,
    description: "Monitoring service events to detect abuse and reliability issues",
    purpose: "Security, fraud prevention, and service resilience",
    data_categories: ["account IDs", "IP addresses", "event logs"],
    data_subjects: "Customers and end users",
    legal_basis_proposed: "Legitimate interests",
    automated_decisions: "No solely automated legal or similarly significant decisions",
  };
}

function buildCallBEUPrompt(industry: string, slot: number, companyName: string): string {

  return `You are generating EU-specific compliance tool payloads for "${companyName}", a ${slot === 1 ? "large enterprise" : "mid-market"} ${industry} company based in the EU/UK.
Use the same company name, domain, DPO details, and country as already established for this company.

Return a JSON object with EXACTLY these fields:
{
  "lia": {
    "organization_name": "string", "subject_anchor": "string — one line naming the single interest, e.g. Fraud screening of new account signups", "processing_description": "string", "sector": "string",
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
  "cppaCyber": null,
  "cppaAdmt": {
    "organization_name": "string", "system_name": "string", "system_type": "string",
    "system_description": "string", "decision_domains": ["array"], "human_review": "string",
    "training_data_use": "Yes or No", "profiling_use": "Yes or No",
    "notice_delivery": ["array"], "notice_has_specific_purpose": "Yes or No",
    "notice_purpose_text": "string",
    "notice_has_opt_out_desc": "Yes or No", "notice_has_access_desc": "Yes or No",
    "notice_has_anti_retaliation": "Yes or No", "notice_has_how_it_works": "Yes or No",
    "notice_has_alternative_process": "Yes or No",
    "opt_out_exception": "string", "opt_out_methods": ["array"], "opt_out_link_title": "string",
    "opt_out_no_cookie_banner": "Yes or No", "opt_out_no_account_required": "Yes or No",
    "opt_out_confirmation_mechanism": "string", "opt_out_appeal_process": "string",
    "opt_out_fairness_doc": "string",
    "opt_out_15_day_process": "string", "opt_out_service_provider_notice": "string",
    "access_submission_methods": "string", "access_verification_process": "string",
    "access_logic_disclosure": "string", "access_outcome_disclosure": "string",
    "access_response_timeline": "string", "access_trade_secret_policy": "string",
    "ca_consumer_count": "string", "third_party_admt": "Yes or No",
    "admt_system_count": "string",
    "admt_detail": {}
  }
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
    "entity_name": "string", "subject_anchor": "string — one line naming the specific processing",
    "q1_revenue": "string", "q2_consumers": "string", "q3_sector": "string",
    "q4_pi_categories": ["array"], "q5_sell_share": "string",
    "q5b_profiling_observation": "Yes or No",
    "q6_right_know": "string", "q6_right_know_multi": ["array"],
    "q7_right_delete": "string", "q8_right_correct": "string", "q9_opt_out": "string",
    "q10_id_verification": "string", "q11_policy_review": "string",
    "q12_notice_at_collection": "string", "q13_notice_content": "string",
    "q14_employee_notice": "string", "q15_sensitive_pi": "string",
    "q15b_under16_knowledge": "Yes or No",
    "q16_sensitive_limit": "string", "q17_sensitive_basis": "string",
    "q18_admt_use": "string", "q18b_admt_training": "Yes or No",
    "q19_admt_description": "string", "q20_admt_opt_out": "string",
    "i1_processing_purpose": "string", "i1b_min_pi": "string",
    "i2_retention_period": "string",
    "i2_retention_criteria": "string", "i2_retention_detail": "string",
    "i3_ca_consumer_band": "string", "i4_disclosure_mechanisms": ["array"],
    "i4b_sources": "string",
    "i5_admt_logic": "string", "i5_admt_training_source": "string",
    "i5_admt_fairness_testing": "string", "i5_admt_human_review": "string",
    "i6_vendors": "string", "i7_internal_contributors": "string",
    "i7_external_consultees": "string", "i8_certifying_exec_name": "string",
    "i8_certifying_exec_title": "string",
    "i8_contact_email": "string", "i8_contact_phone": "string",
    "i9_has_existing_dpia": "string",
    "i9_existing_dpia_summary": "string",
    "exceptions_intake": {
      "fraud_detection":    { "claimed": false, "scope": "string or empty", "safeguards": "string or empty" },
      "security_integrity": { "claimed": false, "scope": "string or empty", "safeguards": "string or empty" },
      "debugging":          { "claimed": false, "scope": "string or empty", "safeguards": "string or empty" },
      "transient_use":      { "claimed": false, "scope": "string or empty", "safeguards": "string or empty" },
      "internal_research":  { "claimed": false, "scope": "string or empty", "safeguards": "string or empty" },
      "employment_context": { "claimed": false, "scope": "string or empty", "safeguards": "string or empty" },
      "legal_compliance":   { "claimed": false, "scope": "string or empty", "safeguards": "string or empty" },
      "consumer_request":   { "claimed": false, "scope": "string or empty", "safeguards": "string or empty" }
    },
    "impact_intake": {
      "likelihood": "string", "severity": "string", "harmTypes": ["array"],
      "vulnerable": "string", "benefitsOutweigh": "Yes | No | Uncertain",
      "benefitsRationale": "string", "cyberGaps": "Yes or No",
      "businessBenefits": "string", "consumerBenefits": "string",
      "stakeholderBenefits": "string", "safeguards": "string", "harmCauses": "string"
    }
  },
  "cppaCyber": {
    "company_name": "string",
    "profile_industry": "string",
    "profile_audit": "string — e.g. Within 12 months",
    "industry_sector": "string",
    "controls": {
      "c1_auth": ["status string", "notes string"],
      "c2_encryption": ["status string", "notes string"],
      "c3_account_access": ["status string", "notes string"],
      "c4_inventory": ["status string", "notes string"],
      "c5_secure_config": ["status string", "notes string"],
      "c6_vuln_mgmt": ["status string", "notes string"],
      "c7_audit_logs": ["status string", "notes string"],
      "c8_network_mon": ["status string", "notes string"],
      "c9_anti_malware": ["status string", "notes string"],
      "c10_segmentation": ["status string", "notes string"],
      "c11_port_protocol": ["status string", "notes string"],
      "c12_awareness": ["status string", "notes string"],
      "c13_training": ["status string", "notes string"],
      "c14_secure_dev": ["status string", "notes string"],
      "c15_third_party": ["status string", "notes string"],
      "c16_retention": ["status string", "notes string"],
      "c17_incident": ["status string", "notes string"],
      "c18_continuity": ["status string", "notes string"]
    }
  },
  "cppaAdmt": {
    "organization_name": "string",
    "system_name": "string", "system_type": "string", "system_description": "string",
    "decision_domains": ["array"], "human_review": "string",
    "training_data_use": "Yes or No", "profiling_use": "Yes or No",
    "notice_delivery": ["array"], "notice_has_specific_purpose": "Yes or No",
    "notice_purpose_text": "string",
    "notice_has_opt_out_desc": "Yes or No", "notice_has_access_desc": "Yes or No",
    "notice_has_anti_retaliation": "Yes or No", "notice_has_how_it_works": "Yes or No",
    "notice_has_alternative_process": "Yes or No",
    "opt_out_exception": "string", "opt_out_methods": ["array"],
    "opt_out_link_title": "string",
    "opt_out_no_cookie_banner": "Yes or No", "opt_out_no_account_required": "Yes or No",
    "opt_out_confirmation_mechanism": "string", "opt_out_appeal_process": "string",
    "opt_out_fairness_doc": "string",
    "opt_out_15_day_process": "string",
    "opt_out_service_provider_notice": "string",
    "access_submission_methods": "string", "access_verification_process": "string",
    "access_logic_disclosure": "string", "access_outcome_disclosure": "string",
    "access_response_timeline": "string", "access_trade_secret_policy": "string",
    "ca_consumer_count": "string", "third_party_admt": "Yes or No",
    "admt_system_count": "string",
    "admt_detail": {}
  },
  "lia": null,
  "dpia": null,
  "ropa": null,
  "euNotice": null
}

Notice/opt-out/access answers must be a realistic mix — not all "Yes", not all blank — so gap analysis has real material.`;
}

function fixtureSeed(companyId: string): number {
  return Array.from(companyId).reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
}

function buildCompany(industry: string, geo: string, slot: number, companyId: string) {
  const seed = fixtureSeed(companyId);
  const roots = ["Aster", "Nexa", "Velor", "Syntara", "Vortex", "Luma", "Civix", "Helio", "Orion", "Maris"];
  const suffix = geo === "eu" ? ["SE", "GmbH", "B.V.", "Ltd"][seed % 4] : ["Inc.", "Corp.", "LLC", "Technologies"][seed % 4];
  const sectorWord = industry.split(/\s|&/).find((w) => w.length > 3)?.replace(/[^a-z]/gi, "") || "Privacy";
  const companyName = `${roots[seed % roots.length]} ${sectorWord} ${suffix}`;
  const domain = `${companyName.toLowerCase().replace(/[^a-z0-9]+/g, "")}.${geo === "eu" ? "eu" : "com"}`;
  const countryCode = geo === "eu" ? ["GB", "DE", "FR", "IE", "NL", "ES"][seed % 6] : "US";
  return {
    companyName,
    domain,
    privacyEmail: `privacy@${domain}`,
    dpoEmail: geo === "eu" ? `dpo@${domain}` : null,
    dpoName: geo === "eu" ? ["Mara Klein, DPO", "Elliot Byrne, Data Protection Officer", "Sofia Laurent, Privacy Counsel"][seed % 3] : null,
    countryCode,
    employeeCount: slot === 1 ? 1200 + (seed % 800) : 140 + (seed % 260),
    annualRevenue: geo === "eu" ? (slot === 1 ? "€240M" : "€58M") : (slot === 1 ? "$310M" : "$72M"),
  };
}

const COUNTRY_JURISDICTION: Record<string, string> = {
  GB: "United Kingdom",
  DE: "Germany",
  FR: "France",
  IE: "Ireland",
  NL: "Netherlands",
  ES: "Spain",
};

const COUNTRY_ADDRESS: Record<string, string> = {
  GB: "30 St Mary Axe, London, EC3A 8BF, United Kingdom",
  DE: "Unter den Linden 1, 10117 Berlin, Germany",
  FR: "1 Rue de Rivoli, 75001 Paris, France",
  IE: "1 Grand Canal Street Lower, Dublin 2, D02 H210, Ireland",
  NL: "Herengracht 500, 1017 CB Amsterdam, Netherlands",
  ES: "Paseo de la Castellana 100, 28046 Madrid, Spain",
};

function getEuNoticeCategoriesForSector(industry: string): string[] {
  const s = industry.toLowerCase();
  if (/healthcare|life science|clinical|medical|pharma/i.test(s))
    return ["identifiers", "health_medical", "financial", "internet_activity"];
  if (/biotech|genomic|genetic|genome/i.test(s))
    return ["identifiers", "health_medical", "biometric", "internet_activity"];
  if (/hr|employment|workforce|recruitment|payroll/i.test(s))
    return ["identifiers", "professional", "financial", "health_medical"];
  if (/edtech|children|child|schools|students|learning/i.test(s))
    return ["identifiers", "education", "children", "internet_activity"];
  if (/adtech|digital media|advertising|programmatic/i.test(s))
    return ["identifiers", "internet_activity", "geolocation", "commercial"];
  if (/data broker|data intel|enrichment/i.test(s))
    return ["identifiers", "commercial", "internet_activity", "geolocation"];
  if (/fintech|financial|banking|insurance/i.test(s))
    return ["identifiers", "financial", "commercial"];
  if (/kyc|identity.*verif/i.test(s))
    return ["identifiers", "biometric", "financial"];
  if (/automotive|connected vehicle|iot|smart home/i.test(s))
    return ["identifiers", "geolocation", "audio_visual", "internet_activity"];
  if (/gov|public sector|public authority/i.test(s))
    return ["identifiers", "professional", "financial"];
  return ["identifiers", "internet_activity", "commercial"];
}

function getEuNoticePurposesForSector(industry: string): string[] {
  const s = industry.toLowerCase();
  if (/healthcare|life science|clinical|medical|pharma/i.test(s))
    return ["service_delivery", "legal_compliance", "research", "security"];
  if (/adtech|digital media|advertising/i.test(s))
    return ["advertising", "analytics", "service_delivery", "security"];
  if (/data broker|data intel/i.test(s))
    return ["analytics", "advertising", "other"];
  if (/hr|employment|workforce/i.test(s))
    return ["service_delivery", "legal_compliance", "security"];
  if (/edtech|children|schools/i.test(s))
    return ["service_delivery", "account_management", "legal_compliance"];
  return ["service_delivery", "account_management", "security", "analytics", "marketing"];
}

function getEuNoticeBasisForSector(industry: string): string[] {
  const s = industry.toLowerCase();
  if (/gov|public sector|public authority/i.test(s))
    return ["public_task", "legal_obligation"];
  if (/healthcare|life science|clinical/i.test(s))
    return ["contract", "legal_obligation", "consent"];
  if (/hr|employment/i.test(s))
    return ["contract", "legal_obligation"];
  if (/data broker/i.test(s))
    return ["legitimate_interests", "consent"];
  return ["contract", "legitimate_interests", "consent"];
}

function getEuNoticeAutomatedDecisions(industry: string): string {
  const s = industry.toLowerCase();
  if (/ai|machine learning|fintech|financial|hr|employment|insurance|kyc|identity|adtech|data broker/i.test(s))
    return "yes";
  return "no";
}

function buildDeterministicProfile(industry: string, geo: string, slot: number, companyId: string) {
  const c = buildCompany(industry, geo, slot, companyId);
  // Governance intake surfaces jurisdictions as display strings; the Registration
  // engine consumes ISO codes ("US", "US-CA", "US-VA" / "EU", country ISO, "GB").
  // Keep the two representations distinct so display strings never leak into the
  // engine's `code` slot and produce duplicate jurisdictions
  // (one keyed on ISO, one keyed on the readable name).
  // Canonical mapping lives in src/data/registration_jurisdictions.ts.
  const jurisdictionsDisplay = geo === "eu"
    ? ["European Union", "United Kingdom", c.countryCode]
    : ["United States", "California (US)", "Virginia (US)"];
  const jurisdictionsIso = geo === "eu"
    ? [c.countryCode, "GB"]
    : ["US-CA", "US-VA"];

  const dataCategories = ["account identifiers", "contact details", "usage logs", "device identifiers", "support records"];
  const usesBiometric = /health|financial|security|workforce|hr/i.test(industry);
  return {
    ...c,
    governance: {
      sector: industry,
      org_size: slot === 1 ? "Large Enterprise" : "Mid-Market",
      jurisdictions: jurisdictionsDisplay,

      eu_uk_data: geo === "eu" ? "Yes" : "No",
      tools: ["OneTrust", "Jira", "AWS", "Salesforce"],
      data_categories: dataCategories,
      special_category: usesBiometric || /health|hr|children|education/i.test(industry) ? "Yes" : "No",
      special_categories_list: usesBiometric ? ["biometric identifiers"] : [],
      privacy_policy: "Published and reviewed annually",
      
      dpo_status: geo === "eu" ? "DPO appointed" : "Privacy lead appointed",
      dpia_status: "Completed for high-risk workflows",
      incident_response: "Documented playbook tested twice per year",
      training_status: "Annual mandatory privacy training",
      tool_instruction: "Centralised privacy workflow and vendor tracking",
      dpa_status: "DPAs in place for material processors",
      transfer_status: geo === "eu" ? "SCCs and UK addendum used for restricted transfers" : "Vendor transfer review completed",
    },
    dpa: {
      controllerName: c.companyName,
      controllerJurisdiction: geo === "eu" ? c.countryCode : "California",
      processorName: geo === "eu" ? "Nimbus Processing GmbH" : "Northstar Data Services LLC",
      processorJurisdiction: geo === "eu" ? "Germany" : "California",
      documentType: geo === "eu" ? "gdpr" : "us-state",
      services: `${industry} analytics, hosting, and support services`,
      dataCategories,
      
      retention: "24 months after last active relationship",
      hasSubProcessors: true,
      subProcessorList: "AWS, Snowflake, Zendesk",
      legalFramework: geo === "eu" ? "GDPR" : "US",
      auditRights: "Annual audit rights with reasonable notice",
      includeTransferClause: geo === "eu",
      transferMechanism: geo === "eu" ? "EU SCCs and UK IDTA" : null,
    },
    irPlaybook: {
      cause: "Compromised vendor credential exposed a limited support dataset",
      dataTypes: ["names", "emails", "account IDs", "support notes"],
      affectedCount: slot === 1 ? "186,000" : "24,500",
      jurisdictions: jurisdictionsDisplay,

      processorInvolved: true,
      contained: "Credentials revoked, sessions invalidated, logs preserved, vendor access restricted",
      organisationType: `${industry} operator`,
    },
    biometric: {
      orgName: c.companyName,
      biometricTypes: usesBiometric ? ["facial template", "voiceprint"] : ["none currently deployed"],
      orgType: `${industry} organisation`,
      purpose: usesBiometric
        ? "Identity verification and fraud prevention"
        : "None — no biometric systems currently in use",
      jurisdictions: jurisdictionsDisplay,
    },
    registration: {
      organization_name: c.companyName,
      organization_country: c.countryCode,
      organization_size: slot === 1 ? "large" : "medium",
      industry,
      email: c.privacyEmail,
      employee_count: c.employeeCount,
      annual_revenue_usd: slot === 1 ? 310000000 : 72000000,
      data_subjects_count: slot === 1 ? 1200000 : 95000,
      role: "controller",
      processes_personal_data: true,
      processes_special_categories: usesBiometric,
      processes_children_data: /gaming|education|media/i.test(industry),
      large_scale_monitoring: slot === 1,
      uses_ai_systems: /ai|adtech|financial|health|gaming/i.test(industry),
      ai_high_risk: /hr|health|financial/i.test(industry),
      ai_general_purpose_provider: /ai/i.test(industry),
      cross_border_transfers: true,
      markets_served: jurisdictionsIso,
      has_eu_establishment: geo === "eu",
      has_uk_establishment: geo === "eu",
      acts_as_data_broker: /adtech|marketing|data.broker|data.intel|enrichment/i.test(industry),
      sells_or_shares_personal_info: /adtech|marketing|media|data.broker|data.intel|enrichment/i.test(industry),
      processes_biometrics_for_id: usesBiometric,
    },
  };
}

const EU_EEA_MEMBER_STATE_NAMES: Record<string, string> = {
  AT: "Austria", BE: "Belgium", DE: "Germany", ES: "Spain",
  FR: "France", GB: "Great Britain", IE: "Ireland",
  LU: "Luxembourg", NL: "Netherlands", PL: "Poland", SE: "Sweden",
};

function getRopaActivitiesForSector(industry: string, companyName: string) {
  const s = industry.toLowerCase();

  if (/healthcare|life science|clinical|medical/i.test(s)) return [
    { activity_name: "Patient Data Processing", category: "patient_records", purpose: "Delivering clinical services, managing appointments, and maintaining health records for patients.", lawful_basis: "contract", special_category_basis: "Article 9(2)(h) — medical diagnosis and treatment", data_categories: ["Health or medical data", "Contact identifiers", "Identity documents"], data_subjects: "Patients and their representatives", recipients: "Clinical staff; NHS Digital; referral hospitals; insurance providers", transfer_destination: "United Kingdom", transfer_mechanism: "No third-country transfer", retention_period: "8 years post-treatment (NHS records standards)", security_measures: "Role-based access; audit logging; MFA; encryption at rest and in transit" },
    { activity_name: "Employee HR Processing", category: "hr_employment", purpose: "Payroll, recruitment, benefits, and statutory employment compliance.", lawful_basis: "contract", special_category_basis: "Article 9(2)(b) — occupational health", data_categories: ["Employee records", "Financial data", "Contact identifiers"], data_subjects: "Employees and contractors", recipients: "HR team; payroll provider; HMRC", transfer_destination: "United Kingdom", transfer_mechanism: "No third-country transfer", retention_period: "Active employment plus 6 years", security_measures: "RBAC; encrypted HR system; quarterly access reviews" },
    { activity_name: "Security and Fraud Monitoring", category: "technology", purpose: "Detecting unauthorised access and fraudulent activity on clinical systems.", lawful_basis: "legitimate_interests", special_category_basis: "Not applicable", data_categories: ["Account identifiers", "Usage logs", "Device identifiers"], data_subjects: "Employees and system users", recipients: "IT security team; SIEM vendor", transfer_destination: "United Kingdom", transfer_mechanism: "No third-country transfer", retention_period: "90 days rolling", security_measures: "Pseudonymised dashboards; least-privilege access; SOC monitoring" },
  ];

  if (/pharma|clinical research|biotech|genomic/i.test(s)) return [
    { activity_name: "Clinical Trial Data Processing", category: "patient_records", purpose: "Collecting and analysing participant data for regulatory submissions and drug development.", lawful_basis: "consent", special_category_basis: "Article 9(2)(a) — explicit consent; Article 9(2)(j) — scientific research", data_categories: ["Health or medical data", "Genetic data", "Contact identifiers"], data_subjects: "Clinical trial participants", recipients: "Principal investigators; regulatory authorities (MHRA, EMA); CRO partners", transfer_destination: "United States (FDA submission)", transfer_mechanism: "EU Standard Contractual Clauses", retention_period: "25 years post-trial (GCP requirement)", security_measures: "GxP-validated systems; audit trails; role-based access; 21 CFR Part 11 controls" },
    { activity_name: "Pharmacovigilance", category: "patient_records", purpose: "Monitoring and reporting adverse drug reactions to regulators.", lawful_basis: "legal_obligation", special_category_basis: "Article 9(2)(i) — public health", data_categories: ["Health or medical data", "Contact identifiers"], data_subjects: "Patients and healthcare professionals submitting adverse event reports", recipients: "EMA; MHRA; national competent authorities", transfer_destination: "Multiple EEA member states", transfer_mechanism: "EEA — no third-country transfer", retention_period: "10 years post-marketing authorisation withdrawal", security_measures: "Validated safety database; access controls; encrypted submissions" },
    { activity_name: "Employee HR Processing", category: "hr_employment", purpose: "Payroll, recruitment, and statutory employment compliance.", lawful_basis: "contract", special_category_basis: "Not applicable", data_categories: ["Employee records", "Financial data", "Contact identifiers"], data_subjects: "Employees and contractors", recipients: "HR team; payroll provider", transfer_destination: "United Kingdom", transfer_mechanism: "No third-country transfer", retention_period: "Active employment plus 6 years", security_measures: "RBAC; encrypted HR system" },
  ];

  if (/hr|employment|workforce|recruitment|payroll/i.test(s)) return [
    { activity_name: "Employee Lifecycle Processing", category: "hr_employment", purpose: "Recruitment, onboarding, payroll, performance management, and offboarding.", lawful_basis: "contract", special_category_basis: "Article 9(2)(b) — occupational health data", data_categories: ["Employee records", "Financial data", "Health or medical data", "Contact identifiers"], data_subjects: "Employees, contractors, and job applicants", recipients: "Line managers; payroll bureau; occupational-health provider; HMRC; DWP", transfer_destination: "United Kingdom", transfer_mechanism: "No third-country transfer", retention_period: "Active employment plus 6 years (statutory limitation period)", security_measures: "RBAC; MFA; encrypted HRIS; quarterly access reviews; DPA with payroll bureau" },
    { activity_name: "Platform User Analytics", category: "technology", purpose: "Monitoring platform usage to detect fraud and improve service reliability.", lawful_basis: "legitimate_interests", special_category_basis: "Not applicable", data_categories: ["Account identifiers", "Usage logs", "Device identifiers"], data_subjects: "HR platform users (client administrators and employee self-service users)", recipients: "Product team; cloud hosting provider (AWS); analytics vendor", transfer_destination: "United States (AWS)", transfer_mechanism: "EU Standard Contractual Clauses", retention_period: "13 months", security_measures: "Pseudonymisation; role-based access; SOC 2 hosting; vendor DPA" },
    { activity_name: "Marketing Communications", category: "marketing", purpose: "Sending product updates and event invitations to prospective and existing clients.", lawful_basis: "consent", special_category_basis: "Not applicable", data_categories: ["Contact identifiers", "Marketing preferences"], data_subjects: "HR and procurement decision-makers at client organisations", recipients: "Marketing team; email service provider (SendGrid)", transfer_destination: "United States (SendGrid)", transfer_mechanism: "EU Standard Contractual Clauses", retention_period: "Until consent withdrawn or 36 months of inactivity", security_measures: "Unsubscribe mechanism; suppression list; SOC 2 ESP" },
  ];

  if (/edtech|children|child|school|student|learning/i.test(s)) return [
    { activity_name: "Child User Account Management", category: "customer_service", purpose: "Creating and managing accounts for children using the educational platform, including parental consent workflows.", lawful_basis: "consent", special_category_basis: "Not applicable — ICO Children's Code (DPA 2018 s.123) age-appropriate design standards apply", data_categories: ["Contact identifiers", "Educational records", "Usage logs"], data_subjects: "Children (under 18) and their parents or guardians", recipients: "Platform team; school administrators (where applicable); hosting provider", transfer_destination: "European Economic Area (AWS EU)", transfer_mechanism: "EEA — no third-country transfer", retention_period: "Account active period plus 30 days post-closure; parental consent records 3 years", security_measures: "Privacy-by-default settings; age-appropriate content filtering; parental dashboard; RBAC; MFA for admin access" },
    { activity_name: "Learning Analytics", category: "technology", purpose: "Tracking progress, identifying learning gaps, and generating teacher reports.", lawful_basis: "legitimate_interests", special_category_basis: "Not applicable", data_categories: ["Educational records", "Usage logs", "Account identifiers"], data_subjects: "Children using the platform and their teachers", recipients: "Teachers and school administrators; analytics vendor", transfer_destination: "European Economic Area", transfer_mechanism: "EEA — no third-country transfer", retention_period: "Academic year plus 12 months", security_measures: "Aggregate dashboards only for non-admin users; pseudonymised raw logs; SOC 2 vendor" },
    { activity_name: "Safeguarding Records", category: "operations", purpose: "Maintaining records of safeguarding concerns and disclosures in compliance with statutory obligations.", lawful_basis: "legal_obligation", special_category_basis: "Article 9(2)(g) — substantial public interest (child protection)", data_categories: ["Educational records", "Special educational needs data", "Contact identifiers"], data_subjects: "Children and their parents or guardians", recipients: "Designated safeguarding lead; local authority children's services; police (on lawful request)", transfer_destination: "United Kingdom", transfer_mechanism: "No third-country transfer", retention_period: "Until the child reaches 25 or 35 years if serious harm (Keeping Children Safe in Education)", security_measures: "Restricted access to DSL and senior leadership only; audit log; encrypted records" },
  ];

  if (/adtech|digital media|advertising|programmatic/i.test(s)) return [
    { activity_name: "Programmatic Advertising Audience Processing", category: "marketing", purpose: "Building audience segments from behavioural signals to serve targeted advertising on behalf of advertiser clients.", lawful_basis: "consent", special_category_basis: "Not applicable — ePrivacy/PECR consent applies separately to cookie/device access", data_categories: ["Online identifiers", "Behavioural data", "Device identifiers", "Inferred interests"], data_subjects: "Online users who have consented via publisher CMP", recipients: "Advertiser clients; DSP partners; data management platform vendor", transfer_destination: "United States (DSP infrastructure)", transfer_mechanism: "EU Standard Contractual Clauses", retention_period: "Audience segments: 90 days; raw bid-stream logs: 30 days", security_measures: "Pseudonymised user IDs; no PII in bidstream; SOC 2 hosting; vendor DPA; IAB TCF compliance framework" },
    { activity_name: "Platform Fraud and Security Monitoring", category: "technology", purpose: "Detecting invalid traffic, bot activity, and unauthorised platform access.", lawful_basis: "legitimate_interests", special_category_basis: "Not applicable", data_categories: ["Account identifiers", "Usage logs", "Device identifiers", "IP addresses"], data_subjects: "Publisher and advertiser platform users", recipients: "Ad operations team; IVT detection vendor", transfer_destination: "United States", transfer_mechanism: "EU Standard Contractual Clauses", retention_period: "90 days", security_measures: "Pseudonymised logging; role-based access; SOC 2 vendor" },
    { activity_name: "Client Reporting and Analytics", category: "operations", purpose: "Providing campaign performance reports and attribution analytics to advertiser clients.", lawful_basis: "contract", special_category_basis: "Not applicable", data_categories: ["Aggregated campaign metrics", "Account identifiers"], data_subjects: "Advertiser client contacts and end-user aggregates (no individual-level data in reports)", recipients: "Advertiser clients; reporting dashboard (Looker)", transfer_destination: "United States (Google Cloud)", transfer_mechanism: "EU Standard Contractual Clauses", retention_period: "36 months post-campaign", security_measures: "Aggregated data only in client-facing views; RBAC; SOC 2 hosting" },
  ];

  if (/fintech|financial service|banking|payment/i.test(s)) return [
    { activity_name: "Account Origination and KYC", category: "finance_legal", purpose: "Identity verification, AML screening, and PEP/sanctions checks for new account applicants.", lawful_basis: "legal_obligation", special_category_basis: "Not applicable", data_categories: ["Identity documents", "Financial data", "Contact identifiers"], data_subjects: "Applicants and account holders", recipients: "Compliance team; KYC vendor; sanctions-screening vendor; FCA on request", transfer_destination: "United Kingdom", transfer_mechanism: "No third-country transfer", retention_period: "5 years post-relationship termination (Money Laundering Regulations 2017)", security_measures: "RBAC; MFA; audit logs; encrypted identity store; FCA-authorised vendor DPA" },
    { activity_name: "Transaction Fraud Detection", category: "technology", purpose: "Real-time scoring of transactions to prevent unauthorised payments and account takeover.", lawful_basis: "legitimate_interests", special_category_basis: "Not applicable", data_categories: ["Financial data", "Device identifiers", "Behavioural data", "Account identifiers"], data_subjects: "Account holders", recipients: "Fraud operations team; card scheme on dispute; fraud analytics vendor", transfer_destination: "United Kingdom", transfer_mechanism: "No third-country transfer", retention_period: "Fraud scores: 13 months; dispute records: 6 years (Limitation Act)", security_measures: "HSM-managed keys; TLS 1.3; ISO 27001; SOC 2 Type II; least-privilege analyst access" },
    { activity_name: "Regulatory Reporting", category: "finance_legal", purpose: "Submitting required data to FCA, PRA, HMRC, and other regulators.", lawful_basis: "legal_obligation", special_category_basis: "Not applicable", data_categories: ["Financial data", "Identity documents", "Account identifiers"], data_subjects: "Account holders and beneficial owners", recipients: "FCA; PRA; HMRC; Companies House", transfer_destination: "United Kingdom", transfer_mechanism: "No third-country transfer", retention_period: "6 years (FCA COBS/SYSC requirements)", security_measures: "RBAC; audit trail; encrypted submissions; data-retention schedule enforced by system controls" },
  ];

  if (/data broker|data intel|enrichment|audience data/i.test(s)) return [
    { activity_name: "Data Aggregation and Profile Enrichment", category: "third_party", purpose: "Compiling and enriching individual and business profiles from public and licensed sources for sale to B2B clients.", lawful_basis: "legitimate_interests", special_category_basis: "Not applicable — special category data not processed", data_categories: ["Contact identifiers", "Commercial data", "Publicly available information", "Inferred attributes"], data_subjects: "Business professionals and consumers whose data appears in public and licensed data sets", recipients: "B2B client subscribers; data licensing partners", transfer_destination: "United States (client infrastructure)", transfer_mechanism: "EU Standard Contractual Clauses", retention_period: "Active in product until suppressed or opted out; refresh cycle: 12 months", security_measures: "Suppression list; opt-out portal; SOC 2 Type II; contractual use restrictions on clients" },
    { activity_name: "Opt-Out and Suppression Management", category: "operations", purpose: "Processing and honouring individual opt-out and erasure requests submitted to the data broker.", lawful_basis: "legal_obligation", special_category_basis: "Not applicable", data_categories: ["Contact identifiers", "Opt-out records"], data_subjects: "Individuals who have exercised opt-out or erasure rights", recipients: "Privacy operations team; B2B clients (suppression list transmission)", transfer_destination: "United Kingdom", transfer_mechanism: "No third-country transfer", retention_period: "Opt-out record retained indefinitely to prevent re-addition; subject data suppressed immediately", security_measures: "Automated suppression within 72 hours; quarterly audits; suppression propagated to all client feeds" },
    { activity_name: "Security and Platform Monitoring", category: "technology", purpose: "Detecting unauthorised access and data exfiltration attempts on the data aggregation platform.", lawful_basis: "legitimate_interests", special_category_basis: "Not applicable", data_categories: ["Access logs", "Account identifiers", "IP addresses"], data_subjects: "Platform users (client administrators and API consumers)", recipients: "IT security team; SIEM vendor", transfer_destination: "United Kingdom", transfer_mechanism: "No third-country transfer", retention_period: "90 days", security_measures: "RBAC; SOC monitoring; anomaly detection; vendor DPA" },
  ];

  if (/insurance/i.test(s)) return [
    { activity_name: "Policyholder Underwriting and Claims", category: "finance_legal", purpose: "Assessing risk, pricing policies, processing claims, and handling disputes for policyholders.", lawful_basis: "contract", special_category_basis: "Article 9(2)(a) or 9(2)(b) — health data for life/health policies", data_categories: ["Identity documents", "Financial data", "Health or medical data", "Contact identifiers"], data_subjects: "Policyholders and claimants", recipients: "Underwriting team; reinsurer; claims assessors; FCA; medical examiners", transfer_destination: "United Kingdom", transfer_mechanism: "No third-country transfer", retention_period: "7 years post-policy expiry (FCA COBS requirements)", security_measures: "RBAC; audit log; encrypted policy management system; MFA" },
    { activity_name: "Fraud Detection and Prevention", category: "technology", purpose: "Identifying fraudulent policy applications and claims submissions.", lawful_basis: "legitimate_interests", special_category_basis: "Not applicable", data_categories: ["Claims history", "Financial data", "Device identifiers", "Account identifiers"], data_subjects: "Policyholders and claimants", recipients: "Fraud team; Insurance Fraud Bureau; Claims and Underwriting Exchange (CUE)", transfer_destination: "United Kingdom", transfer_mechanism: "No third-country transfer", retention_period: "Fraud flags: 6 years; CUE submissions: per CUE rules", security_measures: "Automated fraud scoring; least-privilege access; audit trail" },
    { activity_name: "Marketing and Product Renewal", category: "marketing", purpose: "Sending renewal reminders, cross-sell offers, and regulatory disclosures to existing and lapsed customers.", lawful_basis: "legitimate_interests", special_category_basis: "Not applicable", data_categories: ["Contact identifiers", "Policy records", "Marketing preferences"], data_subjects: "Existing and lapsed policyholders", recipients: "Marketing team; email service provider; print fulfilment house", transfer_destination: "United Kingdom", transfer_mechanism: "No third-country transfer", retention_period: "Contact until opt-out or 36 months post-lapse", security_measures: "Suppression list; FCA fair communication standards; SOC 2 ESP" },
  ];

  if (/kyc|identity.*verif/i.test(s)) return [
    { activity_name: "Identity Verification and KYC Processing", category: "finance_legal", purpose: "Verifying end-user identities and performing AML and sanctions screening on behalf of regulated clients.", lawful_basis: "legal_obligation", special_category_basis: "Article 9(2)(g) — substantial public interest for biometric processing where used", data_categories: ["Identity documents", "Biometric data (where applicable)", "Contact identifiers"], data_subjects: "Individuals being verified on behalf of the KYC platform's regulated clients", recipients: "Regulated client (controller); government identity databases where permissible; fraud-sharing consortia", transfer_destination: "United Kingdom and EEA", transfer_mechanism: "EEA — no third-country transfer; UK adequacy regulations for EEA", retention_period: "Verification result: 5 years (AML obligations); biometric data deleted within 24 hours of verification", security_measures: "Biometric data not stored post-verification; RBAC; ISO 27001; SOC 2 Type II; DPA with each regulated client" },
    { activity_name: "Fraud Signal Sharing", category: "third_party", purpose: "Sharing fraud and impersonation signals with consortium members to prevent identity crime.", lawful_basis: "legitimate_interests", special_category_basis: "Not applicable", data_categories: ["Fraud indicators", "Pseudonymised account identifiers"], data_subjects: "Individuals associated with detected fraud attempts", recipients: "Consortium members; CIFAS (UK fraud prevention service)", transfer_destination: "United Kingdom", transfer_mechanism: "No third-country transfer", retention_period: "Fraud markers: 6 years per CIFAS rules", security_measures: "Only pseudonymised tokens shared; legal basis review with each consortium member; RBAC" },
    { activity_name: "Platform Audit Logging", category: "technology", purpose: "Maintaining tamper-evident audit logs of all verification events for regulatory inspection.", lawful_basis: "legal_obligation", special_category_basis: "Not applicable", data_categories: ["Account identifiers", "Verification timestamps", "Decision outcomes"], data_subjects: "Individuals verified through the platform", recipients: "Compliance team; regulated clients (their own records only); FCA/regulators on lawful request", transfer_destination: "United Kingdom", transfer_mechanism: "No third-country transfer", retention_period: "5 years (AML Regulations)", security_measures: "Write-once audit store; restricted read access; HSM-backed integrity signing" },
  ];

  if (/gov|public sector|public authority/i.test(s)) return [
    { activity_name: "Public Service Delivery", category: "operations", purpose: "Delivering digital government services including applications, benefit processing, and citizen account management.", lawful_basis: "public_task", special_category_basis: "Article 9(2)(g) — substantial public interest where applicable", data_categories: ["Identity documents", "Contact identifiers", "Financial data", "Health or medical data (where applicable)"], data_subjects: "Citizens and residents using the digital service", recipients: "Relevant public authority departments; DWP; HMRC; NHS Digital on lawful basis", transfer_destination: "United Kingdom", transfer_mechanism: "No third-country transfer", retention_period: "Per statutory retention schedules (Public Records Act / department-specific)", security_measures: "RBAC; MFA; Cyber Essentials Plus; annual DPIA review; Data Security and Protection Toolkit" },
    { activity_name: "Audit and Accountability Records", category: "finance_legal", purpose: "Maintaining records required by public accountability and audit obligations.", lawful_basis: "legal_obligation", special_category_basis: "Not applicable", data_categories: ["Contact identifiers", "Transaction records", "Access logs"], data_subjects: "Civil servants and officials; external auditors", recipients: "National Audit Office; internal audit function; Cabinet Office on request", transfer_destination: "United Kingdom", transfer_mechanism: "No third-country transfer", retention_period: "7 years (HM Treasury guidance)", security_measures: "Write-once audit records; restricted access; ISO 27001 government cloud" },
    { activity_name: "Platform Security Monitoring", category: "technology", purpose: "Detecting cyber threats and unauthorised access to government systems.", lawful_basis: "legitimate_interests", special_category_basis: "Not applicable", data_categories: ["Access logs", "Device identifiers", "Network traffic metadata"], data_subjects: "Employees and authenticated citizens accessing systems", recipients: "IT security team; NCSC (incident reporting); managed SOC provider", transfer_destination: "United Kingdom", transfer_mechanism: "No third-country transfer", retention_period: "12 months (NCSC guidance)", security_measures: "SIEM; Cyber Essentials Plus; RBAC; incident response plan" },
  ];

  if (/non.?profit|ngo|charity|foundation/i.test(s)) return [
    { activity_name: "Supporter and Donor Management", category: "customer_service", purpose: "Processing donations, gift aid, and supporter communications for fundraising purposes.", lawful_basis: "legitimate_interests", special_category_basis: "Not applicable", data_categories: ["Contact identifiers", "Financial data", "Gift Aid records"], data_subjects: "Donors and supporters", recipients: "Fundraising team; payment processor (Stripe); HMRC (Gift Aid claims)", transfer_destination: "United States (Stripe)", transfer_mechanism: "EU Standard Contractual Clauses", retention_period: "6 years post-donation (Gift Aid statutory requirement)", security_measures: "RBAC; encrypted payment processing; SOC 2 processor; DPA with Stripe" },
    { activity_name: "Programme Beneficiary Records", category: "operations", purpose: "Maintaining records of individuals and communities served through charitable programmes.", lawful_basis: "legitimate_interests", special_category_basis: "Article 9(2)(a) — explicit consent where sensitive data is collected", data_categories: ["Contact identifiers", "Demographic data", "Programme participation records"], data_subjects: "Programme beneficiaries and service users", recipients: "Programme delivery team; impact reporting partners; funders (anonymised)", transfer_destination: "United Kingdom", transfer_mechanism: "No third-country transfer", retention_period: "Programme records: 6 years post-closure; beneficiary contact: until withdrawn", security_measures: "RBAC; minimal data collection; anonymisation for external reporting; DPO oversight" },
    { activity_name: "Volunteer and Staff Management", category: "hr_employment", purpose: "Recruiting, managing, and supporting paid staff and volunteers.", lawful_basis: "contract", special_category_basis: "Article 9(2)(b) — occupational health where applicable", data_categories: ["Employee records", "Contact identifiers", "DBS check results"], data_subjects: "Employees and volunteers", recipients: "HR function; Disclosure and Barring Service (DBS); payroll provider", transfer_destination: "United Kingdom", transfer_mechanism: "No third-country transfer", retention_period: "Employment period plus 6 years", security_measures: "RBAC; DBS results handled per Code of Practice; encrypted HR system" },
  ];

  if (/telecom|telecommunications/i.test(s)) return [
    { activity_name: "Network Traffic Data Processing", category: "technology", purpose: "Routing, billing, and managing telecommunications traffic including call records and data usage.", lawful_basis: "contract", special_category_basis: "Not applicable — PECR applies to traffic and location data processing", data_categories: ["Contact identifiers", "Traffic data (call records, data volumes)", "Location data (cell tower)", "Billing records"], data_subjects: "Subscribers and end-users", recipients: "Network operations team; interconnect partners; Ofcom on lawful request; law enforcement on lawful order", transfer_destination: "United Kingdom and EEA (interconnect routing)", transfer_mechanism: "EEA — no third-country transfer", retention_period: "12 months (Communications Data retention under IPA 2016); billing: 6 years", security_measures: "Lawful Interception compliance framework; RBAC; encrypted transit; annual PECR compliance review" },
    { activity_name: "Customer Account and Billing", category: "customer_service", purpose: "Managing subscriber accounts, processing payments, and handling customer service interactions.", lawful_basis: "contract", special_category_basis: "Not applicable", data_categories: ["Contact identifiers", "Financial data", "Service usage data"], data_subjects: "Subscribers and account holders", recipients: "Customer service team; payment processor; credit reference agencies (on arrears)", transfer_destination: "United Kingdom", transfer_mechanism: "No third-country transfer", retention_period: "6 years post-contract (Limitation Act)", security_measures: "RBAC; MFA for account changes; PCI-DSS compliant payment processing" },
    { activity_name: "Fraud and Law Enforcement Disclosure", category: "finance_legal", purpose: "Detecting fraudulent SIM swap and account takeover attempts, and responding to lawful law enforcement orders.", lawful_basis: "legal_obligation", special_category_basis: "Not applicable", data_categories: ["Account identifiers", "Traffic data", "Location data"], data_subjects: "Subscribers implicated in fraud or under lawful investigation", recipients: "Fraud team; law enforcement (under IPA 2016 / CPA 2000); Action Fraud", transfer_destination: "United Kingdom", transfer_mechanism: "No third-country transfer", retention_period: "Fraud records: 6 years; LEA disclosures: per statutory retention", security_measures: "SPoC-controlled disclosure process; tamper-evident logging; RBAC" },
  ];

  if (/iot|smart home|connected device|wearable/i.test(s)) return [
    { activity_name: "Device Telemetry and Remote Monitoring", category: "technology", purpose: "Collecting sensor data from IoT devices to deliver product functionality and enable remote diagnostics.", lawful_basis: "contract", special_category_basis: "Not applicable", data_categories: ["Device identifiers", "Sensor data (temperature, motion, energy usage)", "Location data (home network)"], data_subjects: "Device owners and household members", recipients: "Product team; cloud platform provider (AWS IoT); device firmware update service", transfer_destination: "United States (AWS)", transfer_mechanism: "EU Standard Contractual Clauses", retention_period: "Raw telemetry: 30 days; aggregated usage: 24 months", security_measures: "TLS 1.3 device-to-cloud; certificate-based device authentication; SOC 2 hosting; OTA update code-signing" },
    { activity_name: "Smart Home Automation and User Preferences", category: "customer_service", purpose: "Storing and executing user-defined automations and preferences (schedules, scenes, routines).", lawful_basis: "contract", special_category_basis: "Not applicable", data_categories: ["Device identifiers", "User preferences", "Contact identifiers"], data_subjects: "Device owners and invited household members", recipients: "App platform; third-party integrations authorised by user (e.g. Amazon Alexa, Google Home)", transfer_destination: "United States (third-party integrations)", transfer_mechanism: "EU Standard Contractual Clauses", retention_period: "Until account closure plus 30 days", security_measures: "OAuth 2.0 for third-party integrations; user-controlled revocation; encrypted preference store" },
    { activity_name: "Security and Anomaly Detection", category: "technology", purpose: "Detecting device compromise, unusual behaviour patterns, and network intrusions affecting smart home security.", lawful_basis: "legitimate_interests", special_category_basis: "Not applicable", data_categories: ["Device identifiers", "Network traffic metadata", "Sensor anomaly events"], data_subjects: "Device owners and household members", recipients: "Security team; security-monitoring vendor", transfer_destination: "United Kingdom", transfer_mechanism: "No third-country transfer", retention_period: "60 days", security_measures: "Anomaly detection models on pseudonymised device IDs; RBAC for security team" },
  ];

  if (/legal|law firm|solicitor|barrister|attorney/i.test(s)) return [
    { activity_name: "Client Matter Files", category: "finance_legal", purpose: "Processing personal data in connection with legal matters, including court proceedings and advice.", lawful_basis: "contract", special_category_basis: "Article 9(2)(f) — legal claims where special category data is relevant", data_categories: ["Contact identifiers", "Legal records", "Financial data", "Health or medical data (litigation matters)", "Criminal offence data (where relevant)"], data_subjects: "Clients, counterparties, witnesses, and opposing parties", recipients: "Fee earners; counsel; expert witnesses; courts and tribunals; regulators", transfer_destination: "United Kingdom", transfer_mechanism: "No third-country transfer", retention_period: "6 years post-matter closure (SRA Handbook minimum); longer for wills and property", security_measures: "Matter-level access controls; legal professional privilege logging; encrypted client portal; SRA Cybersecurity Guide controls" },
    { activity_name: "AML and Client Vetting", category: "finance_legal", purpose: "Performing money laundering, sanctions, and PEP checks on new and existing clients as required by the SRA.", lawful_basis: "legal_obligation", special_category_basis: "Not applicable", data_categories: ["Identity documents", "Financial data", "Contact identifiers"], data_subjects: "Clients and their beneficial owners", recipients: "Risk and compliance team; AML screening vendor; SRA on request; NCA on suspicion report", transfer_destination: "United Kingdom", transfer_mechanism: "No third-country transfer", retention_period: "5 years post-engagement (MLR 2017)", security_measures: "RBAC; encrypted identity store; AML vendor DPA; suspicious activity reporting procedure" },
    { activity_name: "Marketing and Business Development", category: "marketing", purpose: "Sending sector updates, event invitations, and capability publications to contacts.", lawful_basis: "legitimate_interests", special_category_basis: "Not applicable", data_categories: ["Contact identifiers", "Professional details"], data_subjects: "Corporate contacts and referrers", recipients: "Business development team; email platform vendor", transfer_destination: "United Kingdom", transfer_mechanism: "No third-country transfer", retention_period: "Until opt-out or 36 months of inactivity", security_measures: "Opt-out mechanism; suppression list; RBAC on CRM" },
  ];

  if (/manufactur|industrial|factory|supply chain/i.test(s)) return [
    { activity_name: "Employee Workforce Management", category: "hr_employment", purpose: "Payroll, shift scheduling, safety monitoring, and works council compliance for production employees.", lawful_basis: "contract", special_category_basis: "Article 9(2)(b) — occupational health and safety data", data_categories: ["Employee records", "Financial data", "Health or medical data", "Location data (site access)"], data_subjects: "Factory employees, contractors, and agency workers", recipients: "HR team; payroll bureau; occupational-health provider; works council (where applicable)", transfer_destination: "European Economic Area (HR system)", transfer_mechanism: "EEA — no third-country transfer", retention_period: "Active employment plus 6 years (or longer per local labour law)", security_measures: "RBAC; encrypted HRIS; works council data-processing agreement; quarterly access reviews" },
    { activity_name: "Industrial IoT and Production Monitoring", category: "technology", purpose: "Collecting machine telemetry and worker location data from factory floor for OEE optimisation and safety.", lawful_basis: "legitimate_interests", special_category_basis: "Not applicable", data_categories: ["Device telemetry", "Worker location (zone-level)", "Production records"], data_subjects: "Production employees and contractors on the factory floor", recipients: "Operations team; SCADA vendor; safety officer", transfer_destination: "European Economic Area", transfer_mechanism: "EEA — no third-country transfer", retention_period: "Raw telemetry: 90 days; safety events: 3 years", security_measures: "Zone-level (not individual-level) location tracking; RBAC; encrypted SCADA; ISO 27001 vendor" },
    { activity_name: "Supplier and Logistics Partner Processing", category: "third_party", purpose: "Managing supplier contacts, purchase orders, and logistics coordination including modern slavery checks.", lawful_basis: "legitimate_interests", special_category_basis: "Not applicable", data_categories: ["Contact identifiers", "Commercial records", "Identity documents (beneficial owner KYS)"], data_subjects: "Supplier contacts and logistics partner personnel", recipients: "Procurement team; freight forwarders; sanctions-screening vendor", transfer_destination: "Multiple countries (global supply chain)", transfer_mechanism: "Standard Contractual Clauses where applicable", retention_period: "Duration of supplier relationship plus 7 years", security_measures: "Supplier portal access controls; modern slavery compliance register; RBAC; vendor DPA" },
  ];

  if (/automotive|connected vehicle|vehicle/i.test(s)) return [
    { activity_name: "Connected Vehicle Telemetry", category: "technology", purpose: "Collecting driving behaviour, diagnostic, and location data from connected vehicles for safety, warranty, and OTA updates.", lawful_basis: "contract", special_category_basis: "Not applicable — location data processed under PECR separately for UK", data_categories: ["Location data", "Vehicle diagnostics", "Driving behaviour data", "Device identifiers"], data_subjects: "Vehicle owners and primary drivers", recipients: "Product engineering team; OTA software update vendor; roadside assistance provider", transfer_destination: "United States (cloud infrastructure)", transfer_mechanism: "EU Standard Contractual Clauses", retention_period: "Real-time telemetry: 30 days; warranty diagnostic logs: 10 years", security_measures: "TLS 1.3 vehicle-to-cloud; certificate-based vehicle authentication; SOC 2 hosting; HSM-backed firmware signing" },
    { activity_name: "Dealer and Service Network Management", category: "customer_service", purpose: "Managing customer relationships with the dealer network for servicing, recall notices, and warranty claims.", lawful_basis: "contract", special_category_basis: "Not applicable", data_categories: ["Contact identifiers", "Vehicle records", "Service history"], data_subjects: "Vehicle owners and authorised service contacts", recipients: "Dealer network; warranty claims processor; recall contact-tracing team", transfer_destination: "European Economic Area", transfer_mechanism: "EEA — no third-country transfer", retention_period: "10 years post-vehicle manufacture (product liability)", security_measures: "Dealer portal RBAC; MFA; encrypted CRM" },
    { activity_name: "Traffic and Safety Analytics", category: "operations", purpose: "Aggregating anonymised driving data to improve road safety algorithms and future vehicle software.", lawful_basis: "legitimate_interests", special_category_basis: "Not applicable", data_categories: ["Aggregated and anonymised driving events", "Road surface conditions"], data_subjects: "Aggregated fleet — no individual-level processing after anonymisation", recipients: "Data science team; road safety research partners", transfer_destination: "European Economic Area", transfer_mechanism: "EEA — no third-country transfer", retention_period: "Anonymised aggregate data: indefinite", security_measures: "Strict anonymisation before analysis; k-anonymity threshold enforced; RBAC" },
  ];

  if (/real estate|proptech|property/i.test(s)) return [
    { activity_name: "Buyer and Renter Lead Management", category: "customer_service", purpose: "Managing property enquiries, viewings, and purchase/rental applications from prospective buyers and tenants.", lawful_basis: "legitimate_interests", special_category_basis: "Not applicable", data_categories: ["Contact identifiers", "Financial data", "Rental/purchase preferences"], data_subjects: "Prospective buyers, renters, and property investors", recipients: "Sales and letting agents; mortgage broker referral partners; credit reference agencies (for tenancy checks)", transfer_destination: "United Kingdom", transfer_mechanism: "No third-country transfer", retention_period: "Enquiry records: 36 months; tenancy records: 6 years post-tenancy", security_measures: "RBAC; encrypted CRM; DPA with referral partners" },
    { activity_name: "Tenant Right to Rent and ID Verification", category: "finance_legal", purpose: "Carrying out Right to Rent checks as required by the Immigration Act 2014.", lawful_basis: "legal_obligation", special_category_basis: "Not applicable", data_categories: ["Identity documents", "Immigration status", "Contact identifiers"], data_subjects: "Prospective tenants (adults aged 18+)", recipients: "Letting agents; Home Office Landlord Checking Service", transfer_destination: "United Kingdom", transfer_mechanism: "No third-country transfer", retention_period: "Duration of tenancy plus 12 months (Right to Rent Code of Practice)", security_measures: "Document copies held securely; restricted access to compliance team; deletion schedule enforced" },
    { activity_name: "Property Listing Analytics", category: "technology", purpose: "Analysing user interactions with property listings to improve search relevance and platform experience.", lawful_basis: "legitimate_interests", special_category_basis: "Not applicable", data_categories: ["Usage logs", "Device identifiers", "Search behaviour"], data_subjects: "Platform users (registered and anonymous)", recipients: "Product team; analytics vendor", transfer_destination: "United States (analytics vendor)", transfer_mechanism: "EU Standard Contractual Clauses", retention_period: "Pseudonymised analytics: 13 months", security_measures: "Pseudonymisation before analysis; opt-out mechanism; SOC 2 vendor; DPA" },
  ];

  if (/gaming|entertainment|esport/i.test(s)) return [
    { activity_name: "Player Account and In-Game Processing", category: "customer_service", purpose: "Managing player accounts, in-game purchases, progression data, and matchmaking.", lawful_basis: "contract", special_category_basis: "Not applicable", data_categories: ["Contact identifiers", "Account identifiers", "Payment data", "Gameplay records"], data_subjects: "Players (including minors where age-gating applies)", recipients: "Game operations team; payment processor; anti-cheat vendor; platform stores (Steam, PlayStation, Xbox)", transfer_destination: "United States (platform infrastructure)", transfer_mechanism: "EU Standard Contractual Clauses", retention_period: "Active account plus 3 years post-closure; payment records 6 years", security_measures: "Age verification at registration; parental consent flow for minors; SOC 2 hosting; PCI-DSS payment processing; RBAC" },
    { activity_name: "Anti-Cheat and Trust and Safety", category: "technology", purpose: "Detecting cheating, abuse, and harmful content to maintain fair gameplay and user safety.", lawful_basis: "legitimate_interests", special_category_basis: "Not applicable", data_categories: ["Gameplay telemetry", "Device fingerprints", "Chat logs (moderation)"], data_subjects: "Players on the platform", recipients: "Trust and safety team; anti-cheat vendor; platform enforcement (where integrated)", transfer_destination: "United States (anti-cheat vendor)", transfer_mechanism: "EU Standard Contractual Clauses", retention_period: "Moderation records: 3 years; ban records: indefinite for permanent bans", security_measures: "SOC 2 vendor; RBAC for moderation team; human review for serious sanctions; appeals process" },
    { activity_name: "Marketing and Live Operations", category: "marketing", purpose: "Sending promotional offers, event announcements, and lapsed-player re-engagement campaigns.", lawful_basis: "consent", special_category_basis: "Not applicable", data_categories: ["Contact identifiers", "Marketing preferences", "Player segment data"], data_subjects: "Players who have opted in to marketing", recipients: "Marketing team; CRM platform; push notification vendor", transfer_destination: "United States (CRM vendor)", transfer_mechanism: "EU Standard Contractual Clauses", retention_period: "Marketing profile: until consent withdrawn or 36 months of inactivity", security_measures: "Double opt-in; preference centre; SOC 2 vendor; unsubscribe in every communication" },
  ];

  if (/social media|social platform|social network/i.test(s)) return [
    { activity_name: "User Profile and Content Processing", category: "customer_service", purpose: "Hosting user profiles, posts, and social connections; enabling users to share and interact with content.", lawful_basis: "contract", special_category_basis: "Article 9(2)(e) — data manifestly made public by the user", data_categories: ["Contact identifiers", "Profile data", "User-generated content", "Connection graphs"], data_subjects: "Platform users", recipients: "Platform engineering team; CDN provider; moderation service", transfer_destination: "United States (infrastructure)", transfer_mechanism: "EU Standard Contractual Clauses", retention_period: "Active account plus 30 days post-deletion; legal hold where applicable", security_measures: "E2E encryption for direct messages; RBAC; MFA; SOC 2 infrastructure" },
    { activity_name: "Content Moderation and Trust and Safety", category: "operations", purpose: "Detecting and removing harmful, illegal, or policy-violating content and accounts.", lawful_basis: "legitimate_interests", special_category_basis: "Article 9(2)(g) — substantial public interest (preventing illegal content)", data_categories: ["User-generated content", "Account identifiers", "Moderation records"], data_subjects: "Platform users and content reporters", recipients: "Trust and safety team; NCMEC (for CSAM); law enforcement on lawful order", transfer_destination: "United Kingdom; United States (NCMEC)", transfer_mechanism: "EU Standard Contractual Clauses", retention_period: "Moderation records: 3 years; CSAM hashes: per NCMEC retention rules", security_measures: "PhotoDNA for CSAM detection; RBAC for moderation team; appeals process; human review before permanent removal" },
    { activity_name: "Platform Fraud and Security Monitoring", category: "technology", purpose: "Detecting bot accounts, credential stuffing, and platform abuse.", lawful_basis: "legitimate_interests", special_category_basis: "Not applicable", data_categories: ["Account identifiers", "Usage logs", "Device identifiers", "IP addresses"], data_subjects: "Platform users", recipients: "Security team; bot-detection vendor", transfer_destination: "United Kingdom", transfer_mechanism: "No third-country transfer", retention_period: "90 days", security_measures: "Rate limiting; CAPTCHA; account takedown procedures; SOC 2 hosting" },
  ];

  if (/cybersecurity|security service|infosec/i.test(s)) return [
    { activity_name: "Security Operations and Incident Response", category: "technology", purpose: "Monitoring client networks and systems for threats, investigating incidents, and coordinating remediation.", lawful_basis: "contract", special_category_basis: "Not applicable", data_categories: ["Network logs", "Endpoint telemetry", "Incident records", "Contact identifiers (incident contacts)"], data_subjects: "Client employees and users whose data passes through monitored systems", recipients: "SOC analysts; incident response team; client CISO; NCSC (on critical incidents)", transfer_destination: "United Kingdom", transfer_mechanism: "No third-country transfer", retention_period: "Incident records: 3 years; raw telemetry: 90 days; forensic artefacts: per client contract", security_measures: "Air-gapped forensic environment; RBAC; MFA; ISO 27001; client DPA for all data-processing activities" },
    { activity_name: "Threat Intelligence Processing", category: "third_party", purpose: "Collecting and sharing threat indicators (IOCs, TTPs) with clients and intelligence-sharing communities.", lawful_basis: "legitimate_interests", special_category_basis: "Not applicable", data_categories: ["Threat indicators (IP addresses, file hashes, domain names)", "Incident metadata"], data_subjects: "Minimal — threat indicators primarily relate to infrastructure, not individuals", recipients: "Clients; CISA; NCSC; FS-ISAC and sector-specific ISACs", transfer_destination: "United States (CISA, FS-ISAC)", transfer_mechanism: "EU Standard Contractual Clauses", retention_period: "Active IOCs: refreshed quarterly; historical threat data: 3 years", security_measures: "TLP markings enforced; automated IOC expiry; RBAC; TLS-encrypted sharing feeds" },
    { activity_name: "Employee and Contractor HR Processing", category: "hr_employment", purpose: "Payroll, security clearance tracking, and employment administration for cybersecurity personnel.", lawful_basis: "contract", special_category_basis: "Not applicable", data_categories: ["Employee records", "Financial data", "Security clearance status", "Contact identifiers"], data_subjects: "Employees and contractors", recipients: "HR team; payroll provider; UKSA/DSaS (security clearance)", transfer_destination: "United Kingdom", transfer_mechanism: "No third-country transfer", retention_period: "Active employment plus 6 years", security_measures: "RBAC; encrypted HRIS; clearance records held separately with restricted access" },
  ];

  if (/travel|hospitality|hotel|tourism/i.test(s)) return [
    { activity_name: "Booking and Guest Management", category: "customer_service", purpose: "Processing reservations, check-in/check-out, loyalty programme enrolment, and guest preferences.", lawful_basis: "contract", special_category_basis: "Article 9(2)(a) — dietary or accessibility requirements disclosed by guest", data_categories: ["Contact identifiers", "Payment data", "Travel documents", "Guest preferences", "Loyalty records"], data_subjects: "Guests, bookers, and loyalty programme members", recipients: "Front desk; property management system vendor; OTA partners (Booking.com, Expedia); payment processor", transfer_destination: "United States (PMS and OTA partners)", transfer_mechanism: "EU Standard Contractual Clauses", retention_period: "Booking records: 6 years (VAT); loyalty records: active membership plus 3 years post-closure", security_measures: "PCI-DSS payment processing; RBAC; encrypted PMS; SOC 2 hosting" },
    { activity_name: "Marketing and Personalisation", category: "marketing", purpose: "Sending personalised offers, loyalty programme promotions, and destination marketing to opted-in guests.", lawful_basis: "consent", special_category_basis: "Not applicable", data_categories: ["Contact identifiers", "Booking history", "Stated preferences", "Marketing segments"], data_subjects: "Opted-in guests and loyalty members", recipients: "Marketing team; CRM platform; email service provider", transfer_destination: "United States (CRM/ESP)", transfer_mechanism: "EU Standard Contractual Clauses", retention_period: "Until consent withdrawn or 36 months of inactivity", security_measures: "Preference centre; double opt-in; suppression list; SOC 2 ESP" },
    { activity_name: "Security and Fraud Prevention", category: "technology", purpose: "Detecting fraudulent bookings, chargebacks, and unauthorised access to guest accounts.", lawful_basis: "legitimate_interests", special_category_basis: "Not applicable", data_categories: ["Booking records", "Payment indicators", "Device identifiers", "Account access logs"], data_subjects: "Guests and online bookers", recipients: "Revenue operations team; payment scheme fraud tools; chargeback processor", transfer_destination: "United Kingdom", transfer_mechanism: "No third-country transfer", retention_period: "Fraud flags: 3 years; chargeback records: 6 years", security_measures: "Velocity checks; 3DS2 authentication; RBAC" },
  ];

  if (/ai|machine learning|ml platform|artificial intelligence/i.test(s)) return [
    { activity_name: "Model Training Data Processing", category: "technology", purpose: "Processing training datasets to develop and improve AI/ML models on behalf of clients or for proprietary models.", lawful_basis: "legitimate_interests", special_category_basis: "Not applicable for generic training data — assessed per dataset", data_categories: ["Training datasets (may include contact identifiers, behavioural data, text, images)"], data_subjects: "Individuals whose data appears in training datasets", recipients: "ML engineering team; cloud training infrastructure (AWS SageMaker/Azure ML); data labelling vendor", transfer_destination: "United States (cloud training)", transfer_mechanism: "EU Standard Contractual Clauses", retention_period: "Training data: per data-sharing agreement; model artefacts: product lifetime", security_measures: "RBAC; encrypted training jobs; data-minimisation review before training; model card documentation; vendor DPA" },
    { activity_name: "AI Inference and Output Processing", category: "customer_service", purpose: "Running trained models in production to generate outputs (predictions, classifications, content) for end-users or clients.", lawful_basis: "contract", special_category_basis: "Depends on input data — assessed per use case", data_categories: ["Input data (user queries, documents, images, structured records)", "Inference outputs"], data_subjects: "End-users and client employees who interact with the AI system", recipients: "Client engineering teams; model serving infrastructure; audit logging system", transfer_destination: "United States (inference infrastructure)", transfer_mechanism: "EU Standard Contractual Clauses", retention_period: "Input/output logs: 30 days for safety monitoring; client-contractual retention otherwise", security_measures: "SOC 2 Type II infrastructure; prompt injection controls; output filtering; RBAC; GDPR Art. 22 review for automated decisions" },
    { activity_name: "AI Safety and Bias Monitoring", category: "operations", purpose: "Monitoring model outputs for bias, safety failures, and regulatory compliance including EU AI Act obligations.", lawful_basis: "legal_obligation", special_category_basis: "Not applicable", data_categories: ["Aggregated and pseudonymised inference logs", "Bias evaluation datasets"], data_subjects: "Aggregated — individuals whose outputs are sampled for bias evaluation", recipients: "AI safety team; external auditor (for high-risk AI Act assessments)", transfer_destination: "United Kingdom", transfer_mechanism: "No third-country transfer", retention_period: "Safety logs: 3 years (EU AI Act Art. 12 for high-risk systems)", security_measures: "RBAC; pseudonymisation; documented bias evaluation methodology; EU AI Act conformity assessment records" },
  ];

  if (/media|publish|news|content|broadcast/i.test(s)) return [
    { activity_name: "Subscriber and Reader Management", category: "customer_service", purpose: "Managing digital and print subscriptions, paywalls, and reader account profiles.", lawful_basis: "contract", special_category_basis: "Not applicable", data_categories: ["Contact identifiers", "Payment data", "Reading preferences", "Subscription records"], data_subjects: "Subscribers and registered readers", recipients: "Subscription management team; payment processor; email service provider", transfer_destination: "United States (payment processor, ESP)", transfer_mechanism: "EU Standard Contractual Clauses", retention_period: "Active subscription plus 6 years (VAT/tax records)", security_measures: "PCI-DSS payment processing; RBAC; SOC 2 hosting; suppression list" },
    { activity_name: "Advertising Targeting and Measurement", category: "marketing", purpose: "Serving contextual and (with consent) behavioural advertising to readers and measuring campaign effectiveness.", lawful_basis: "consent", special_category_basis: "Not applicable for contextual; behavioural requires explicit consent (ePrivacy/PECR)", data_categories: ["Contact identifiers", "Reading behaviour", "Device identifiers", "Advertising IDs"], data_subjects: "Opted-in readers and anonymous visitors (contextual only)", recipients: "Advertising team; ad server vendor; demand-side platforms (with consent); measurement vendor", transfer_destination: "United States (ad tech infrastructure)", transfer_mechanism: "EU Standard Contractual Clauses", retention_period: "Behavioural segments: 90 days; campaign reports: 36 months", security_measures: "CMP for consent; IAB TCF compliance; SOC 2 ad server; vendor DPAs" },
    { activity_name: "Editorial and Newsgathering Records", category: "operations", purpose: "Managing source contacts, editorial correspondence, and newsgathering records in connection with journalism.", lawful_basis: "legitimate_interests", special_category_basis: "Article 9(2)(g) — special category data in journalism context processed under Section 26 DPA 2018 journalism exemption", data_categories: ["Contact identifiers", "Source correspondence", "Interview records", "Legal correspondence"], data_subjects: "Journalists, sources, interviewees, and subjects of reporting", recipients: "Editorial team; legal counsel; external legal advisors", transfer_destination: "United Kingdom", transfer_mechanism: "No third-country transfer", retention_period: "Editorial records: 6 years post-publication; legal correspondence: matter lifetime plus 6 years", security_measures: "Source protection protocols; encrypted communications for sensitive sources; RBAC; legal professional privilege logging" },
  ];

  if (/mobile app|mobile application|app developer/i.test(s)) return [
    { activity_name: "App User Account and Feature Delivery", category: "customer_service", purpose: "Managing accounts, delivering personalised app features, and processing in-app purchases.", lawful_basis: "contract", special_category_basis: "Not applicable", data_categories: ["Contact identifiers", "Account identifiers", "Device identifiers", "Usage logs", "Payment data"], data_subjects: "App users (including minors where age-gating applies)", recipients: "Product team; app store platforms (Apple App Store, Google Play); payment processor", transfer_destination: "United States (app store platforms)", transfer_mechanism: "EU Standard Contractual Clauses", retention_period: "Account data: active plus 3 years post-closure; payment records: 6 years", security_measures: "App Transport Security; MFA option; age-gating; PCI-DSS payment processing; SOC 2 hosting" },
    { activity_name: "Crash Reporting and Analytics", category: "technology", purpose: "Collecting crash logs and usage analytics to diagnose bugs and improve app performance.", lawful_basis: "legitimate_interests", special_category_basis: "Not applicable — PECR applies to device-level access", data_categories: ["Device identifiers", "Crash logs", "Usage events", "App state at crash"], data_subjects: "App users", recipients: "Engineering team; crash analytics vendor (Firebase Crashlytics or equivalent)", transfer_destination: "United States (analytics vendor)", transfer_mechanism: "EU Standard Contractual Clauses", retention_period: "Crash reports: 90 days; aggregated analytics: 13 months", security_measures: "PECR-compliant consent for non-essential analytics; pseudonymised identifiers; SOC 2 vendor; DPA" },
    { activity_name: "Push Notifications and Re-engagement", category: "marketing", purpose: "Sending push notifications and re-engagement messages to opted-in users.", lawful_basis: "consent", special_category_basis: "Not applicable", data_categories: ["Device push tokens", "Contact identifiers", "Marketing preferences"], data_subjects: "Users who have granted push notification permission", recipients: "Marketing team; push notification vendor (Firebase Cloud Messaging, APNs)", transfer_destination: "United States (FCM/APNs)", transfer_mechanism: "EU Standard Contractual Clauses", retention_period: "Push tokens: active while app installed; preferences: until withdrawn", security_measures: "OS-level permission required; opt-out in app; SOC 2 vendor; DPA" },
  ];

  if (/higher ed|university|college|academic|education/i.test(s)) return [
    { activity_name: "Student Records and Academic Administration", category: "customer_service", purpose: "Managing student enrolment, academic records, assessments, graduation, and HESA statutory reporting.", lawful_basis: "contract", special_category_basis: "Article 9(2)(b) — disability and health data for reasonable adjustments", data_categories: ["Contact identifiers", "Educational records", "Financial data", "Health or medical data (disability)"], data_subjects: "Students and prospective applicants", recipients: "Academic staff; Registry; HESA; Student Loans Company; OfS; UKVI", transfer_destination: "United Kingdom", transfer_mechanism: "No third-country transfer", retention_period: "Academic records: 6 years post-graduation; financial: 7 years; CCTV: 31 days", security_measures: "RBAC; MFA for staff; JANET network security; encrypted student portal" },
    { activity_name: "Research Data Processing", category: "operations", purpose: "Processing personal data collected during approved research projects involving human participants.", lawful_basis: "consent", special_category_basis: "Article 9(2)(j) — scientific research under UK GDPR Schedule 2 para 4", data_categories: ["Research survey data", "Health or medical data", "Genetic data (where applicable)", "Contact identifiers"], data_subjects: "Research participants", recipients: "Principal investigators; ethics committee; external research collaborators; funders (anonymised reports)", transfer_destination: "Multiple jurisdictions (international research)", transfer_mechanism: "Standard Contractual Clauses; adequacy decisions where available", retention_period: "As specified in ethics approval (typically 10 years post-publication)", security_measures: "Ethics approval before processing; pseudonymisation; data sharing agreements; research data management plan" },
    { activity_name: "Campus Security and Access Control", category: "technology", purpose: "Managing electronic access to campus buildings and CCTV surveillance for safety and security.", lawful_basis: "legitimate_interests", special_category_basis: "Not applicable", data_categories: ["Staff and student ID records", "Access event logs", "CCTV footage"], data_subjects: "Students, staff, and visitors on campus", recipients: "Security team; police on lawful request", transfer_destination: "United Kingdom", transfer_mechanism: "No third-country transfer", retention_period: "Access logs: 12 months; CCTV: 31 days standard (longer for incidents)", security_measures: "RBAC; encrypted access control system; CCTV code of practice compliance; staff training" },
  ];

  if (/consult|advisory|professional service/i.test(s)) return [
    { activity_name: "Client Engagement and Delivery", category: "customer_service", purpose: "Managing client projects, deliverables, and engagement correspondence.", lawful_basis: "contract", special_category_basis: "Not applicable — special category data may arise in HR or health consulting; assessed per project", data_categories: ["Contact identifiers", "Project records", "Financial data"], data_subjects: "Client contacts and project stakeholders", recipients: "Engagement team; project management tools (Jira, SharePoint); finance team", transfer_destination: "European Economic Area", transfer_mechanism: "EEA — no third-country transfer", retention_period: "Engagement records: 6 years post-completion (Limitation Act)", security_measures: "RBAC; MFA; client portal access controls; DPA with cloud providers" },
    { activity_name: "Talent and HR Management", category: "hr_employment", purpose: "Recruiting, managing, and developing consulting staff and contractors.", lawful_basis: "contract", special_category_basis: "Not applicable", data_categories: ["Employee records", "Financial data", "Performance records", "Contact identifiers"], data_subjects: "Employees, contractors, and candidates", recipients: "HR team; payroll provider; recruitment agencies", transfer_destination: "United Kingdom", transfer_mechanism: "No third-country transfer", retention_period: "Active employment plus 6 years", security_measures: "RBAC; encrypted HRIS; access reviews" },
    { activity_name: "Marketing and Thought Leadership", category: "marketing", purpose: "Publishing research, case studies, and promotional content and managing event registrations.", lawful_basis: "legitimate_interests", special_category_basis: "Not applicable", data_categories: ["Contact identifiers", "Professional details", "Event attendance records"], data_subjects: "Prospects, clients, and event attendees", recipients: "Marketing team; webinar platform; email service provider", transfer_destination: "United States (webinar and ESP platforms)", transfer_mechanism: "EU Standard Contractual Clauses", retention_period: "Contact records: until opt-out or 36 months inactivity", security_measures: "Opt-out mechanism; RBAC on CRM; SOC 2 vendors; DPAs" },
  ];

  if (/retail|e.?commerce|consumer goods|loyalty/i.test(s)) return [
    { activity_name: "Customer Ordering and Fulfilment", category: "customer_service", purpose: "Processing purchases, managing returns, and coordinating delivery for online and in-store orders.", lawful_basis: "contract", special_category_basis: "Not applicable", data_categories: ["Contact identifiers", "Financial data", "Order history", "Delivery addresses"], data_subjects: "Customers and gift recipients", recipients: "Fulfilment team; payment processor; delivery carrier; fraud-prevention vendor", transfer_destination: "United Kingdom", transfer_mechanism: "No third-country transfer", retention_period: "Order records: 6 years (VAT); payment records: 6 years", security_measures: "PCI-DSS payment processing; RBAC; SOC 2 hosting; 3DS2 fraud reduction" },
    { activity_name: "Loyalty Programme and Personalisation", category: "marketing", purpose: "Operating the loyalty points scheme and delivering personalised product recommendations and promotional offers.", lawful_basis: "consent", special_category_basis: "Not applicable", data_categories: ["Contact identifiers", "Purchase history", "Loyalty points records", "Marketing preferences"], data_subjects: "Loyalty programme members", recipients: "Marketing team; loyalty platform vendor; email service provider", transfer_destination: "United States (loyalty platform, ESP)", transfer_mechanism: "EU Standard Contractual Clauses", retention_period: "Active membership plus 36 months after last transaction", security_measures: "Preference centre; opt-out in every email; SOC 2 vendor; DPA; double opt-in for sensitive segments" },
    { activity_name: "Fraud Prevention and Site Security", category: "technology", purpose: "Detecting fraudulent orders, account takeovers, and bot activity on the e-commerce platform.", lawful_basis: "legitimate_interests", special_category_basis: "Not applicable", data_categories: ["Account identifiers", "Device fingerprints", "Order behaviour signals", "IP addresses"], data_subjects: "Site visitors and account holders", recipients: "Fraud operations team; fraud-prevention vendor; payment scheme fraud tools", transfer_destination: "United States (fraud vendor)", transfer_mechanism: "EU Standard Contractual Clauses", retention_period: "Fraud signals: 13 months; confirmed fraud cases: 6 years", security_measures: "Velocity checks; device fingerprinting; RBAC; SOC 2 vendor; DPA" },
  ];

  if (/energy|utilities|power|grid/i.test(s)) return [
    { activity_name: "Smart Meter and Usage Data Processing", category: "technology", purpose: "Collecting half-hourly smart meter reads for billing, demand forecasting, and grid balancing.", lawful_basis: "contract", special_category_basis: "Not applicable — Ofgem smart metering requirements apply", data_categories: ["Contact identifiers", "Energy consumption data", "Smart meter identifiers"], data_subjects: "Domestic and small business customers", recipients: "Billing team; DCC (Data Communications Company); Ofgem; National Grid ESO", transfer_destination: "United Kingdom", transfer_mechanism: "No third-country transfer", retention_period: "Half-hourly reads: 5 years (Ofgem smart metering licence conditions)", security_measures: "RBAC; encrypted DCC communications; Smart Energy Code compliance; tamper detection" },
    { activity_name: "Customer Account and Billing", category: "customer_service", purpose: "Managing customer accounts, processing payments, direct debits, and handling complaints.", lawful_basis: "contract", special_category_basis: "Article 9(2)(g) — vulnerability data collected for Priority Services Register", data_categories: ["Contact identifiers", "Financial data", "Energy usage", "Vulnerability status (PSR)"], data_subjects: "Domestic and business customers", recipients: "Customer service team; payment processor; debt collection agency (on arrears); Citizens Advice; PSR partners", transfer_destination: "United Kingdom", transfer_mechanism: "No third-country transfer", retention_period: "Account records: 6 years post-closure; PSR: reviewed annually", security_measures: "RBAC; MFA; PCI-DSS payment; PSR data access restricted to vulnerability team" },
    { activity_name: "Regulatory Reporting", category: "finance_legal", purpose: "Submitting data to Ofgem, DESNZ, and other regulators as required by energy supply licences.", lawful_basis: "legal_obligation", special_category_basis: "Not applicable", data_categories: ["Aggregated consumption data", "Contact identifiers for enforcement matters"], data_subjects: "Customers (aggregated for most reporting; individual for enforcement)", recipients: "Ofgem; DESNZ; Competition and Markets Authority (on investigation)", transfer_destination: "United Kingdom", transfer_mechanism: "No third-country transfer", retention_period: "Per Ofgem licence requirements (typically 6 years)", security_measures: "RBAC; MFA; encrypted submissions; audit trail" },
  ];

  return [
    { activity_name: "Customer Account Management", category: "customer_service", purpose: `Managing user accounts, authentication, and customer support for ${companyName}'s ${industry.toLowerCase()} platform, including account creation, profile updates, and customer service interactions.`, lawful_basis: "contract", special_category_basis: "Not applicable — no special category data processed in this activity", data_categories: ["Contact identifiers (name, email, phone)", "Account credentials", "Customer service correspondence", "Transaction or service history"], data_subjects: "Registered customers and users of the platform", recipients: "Customer service team; CRM platform vendor; cloud hosting provider", transfer_destination: "United States (cloud hosting and CRM)", transfer_mechanism: "EU Standard Contractual Clauses", retention_period: "Active account plus 3 years post-closure; customer service records 2 years", security_measures: "MFA enforced; RBAC; SOC 2 Type II hosting; encrypted CRM; DPA with vendors" },
    { activity_name: "Platform Security Monitoring", category: "technology", purpose: `Detecting and responding to security incidents, fraud attempts, and unauthorised access to ${companyName}'s platform infrastructure.`, lawful_basis: "legitimate_interests", special_category_basis: "Not applicable", data_categories: ["Access logs", "Device identifiers", "IP addresses", "Usage events"], data_subjects: "Registered users and authenticated staff", recipients: "IT security team; SIEM vendor; cloud provider security services", transfer_destination: "United States (SIEM vendor)", transfer_mechanism: "EU Standard Contractual Clauses", retention_period: "Security logs: 90 days rolling; incident records: 3 years", security_measures: "SIEM alerting; RBAC; MFA; SOC 2 hosting; pseudonymised log analysis; vendor DPA" },
    { activity_name: "Marketing and Communications", category: "marketing", purpose: `Sending promotional communications, product updates, and event invitations to opted-in contacts and existing customers of ${companyName}.`, lawful_basis: "consent", special_category_basis: "Not applicable", data_categories: ["Contact identifiers", "Marketing preferences", "Engagement history"], data_subjects: "Opted-in customers and marketing contacts", recipients: "Marketing team; email service provider; CRM platform", transfer_destination: "United States (email service provider)", transfer_mechanism: "EU Standard Contractual Clauses", retention_period: "Until consent withdrawn or 36 months of inactivity", security_measures: "Double opt-in; preference centre; SOC 2 vendor; unsubscribe in every communication" },
  ];
}

function buildAdmtFallback(companyName: string, industry: string, slot: number) {
  const isFintech = /fintech/i.test(industry);
  const isHr = /\bhr\b|human resources|hiring|recruit/i.test(industry);
  const isAdtech = /adtech|marketing|advertis/i.test(industry);
  const isGaming = /gaming|entertainment/i.test(industry);
  return {
    organization_name: companyName,
    system_name:
      isFintech ? "Credit Risk Scoring Model" :
      isHr ? "Candidate Screening System" :
      isAdtech ? "Audience Segmentation Engine" :
      isGaming ? "Dynamic Difficulty and Monetization Engine" :
      "AI Decisioning Engine",
    system_type: "ML model",
    system_description:
      isFintech
        ? "Logistic regression model trained on payment history, utilization, and income proxies to produce a 0–850 creditworthiness score used for loan approval and credit limit decisions for California consumers."
        : isHr
        ? "NLP-based resume parser and ranking model that scores applicants 0–100 for initial screening shortlists; human recruiter reviews all shortlisted candidates before any employment decision is made."
        : isAdtech
        ? "Collaborative-filtering model that assigns consumers to behavioral segments used for targeted advertising on third-party platforms. The model processes browsing history, purchase signals, and demographic inferences to determine which advertising audiences a consumer is placed in."
        : isGaming
        ? "Reinforcement-learning model that adjusts in-game difficulty and surfaces in-game purchase offers based on player behavior signals. The system determines which items are shown to which players and at what price points, and is used solely for entertainment service personalization — not for any financial, housing, employment, education, or healthcare decision."
        : "Gradient-boosted ensemble that produces a risk score used to determine service eligibility and pricing tiers for California consumers.",
    decision_domains:
      isFintech ? ["financial_services"] :
      isHr ? ["employment"] :
      isAdtech ? ["advertising"] :
      isGaming ? ["entertainment_personalization"] :
      ["service_eligibility"],
    human_review: isHr
      ? "Yes — recruiter reviews all shortlisted candidates before any employment decision"
      : "No — fully automated; opt-out suppresses scoring immediately",
    training_data_use: "Yes",
    profiling_use: "Yes",
    notice_delivery: ["privacy_policy", "just_in_time"],
    notice_has_specific_purpose: "Yes",
    notice_purpose_text:
      isFintech ? "To assess your creditworthiness using automated analysis of your payment history and financial data, for the purpose of determining your eligibility for a loan or credit product." :
      isHr ? "To screen and rank your job application using automated analysis of your resume and application materials, for the purpose of initial candidate shortlisting for employment opportunities." :
      isAdtech ? "To assign you to behavioral audience segments for the purpose of delivering targeted advertising on behalf of our advertising clients." :
      isGaming ? "To personalize your in-game experience and surface relevant in-game offers using automated analysis of your gameplay behavior." :
      "To assess eligibility and personalize your experience using automated analysis of your data.",
    notice_has_opt_out_desc: "Yes",
    notice_has_access_desc: "Yes",
    notice_has_anti_retaliation: "Yes",
    notice_has_how_it_works: isAdtech || isGaming ? "No" : "Yes",
    notice_has_alternative_process: isHr ? "Yes" : "No",
    opt_out_exception: "none",
    opt_out_methods: ["webform", "email"],
    opt_out_link_title: "Opt Out of Automated Decisions",
    opt_out_no_cookie_banner: "Yes",
    opt_out_no_account_required: "Yes",
    opt_out_confirmation_mechanism: "Email confirmation within 24 hours",
    opt_out_appeal_process: "Consumer may request human review within 30 days",
    opt_out_fairness_doc: isAdtech || isGaming ? "" : "Fairness testing documented in the model card and reviewed quarterly.",
    opt_out_15_day_process: "Requests actioned within 15 business days; log maintained.",
    opt_out_service_provider_notice: "Downstream service providers notified within 24 hours of an accepted opt-out.",
    access_submission_methods: "Webform at privacy.example.com/access-request",
    access_verification_process: "Email verification plus last-4 of account identifier",
    access_logic_disclosure: isAdtech
      ? "No — pending publication of a plain-language logic summary"
      : "Yes — plain-language description of inputs and weightings provided",
    access_outcome_disclosure: "Yes — score and tier communicated at point of decision",
    access_response_timeline: "45 days",
    access_trade_secret_policy: "Proprietary model weights withheld; all other factors disclosed",
    ca_consumer_count: slot === 1 ? "500,000+" : "75,000",
    third_party_admt: isAdtech ? "Yes" : "No",
    admt_system_count: slot === 1 ? "3" : "1",
    // prior_access_requests_12mo removed (RC-P6).
    admt_detail: {},
  };
}

function buildDeterministicGeo(industry: string, geo: string, slot: number, companyId: string, companyName?: string) {
  const c = { ...buildCompany(industry, geo, slot, companyId), companyName: companyName || buildCompany(industry, geo, slot, companyId).companyName };
  if (geo === "eu") {


    return {
      lia: {
        organization_name: c.companyName,
        subject_anchor: `${industry} — fraud screening and security monitoring of authenticated users`,
        processing_description: `${industry} service analytics and fraud prevention`,
        sector: industry,
        stated_purpose: "Improve reliability, prevent fraud, and support users",
        relationship_type: "Direct customer relationship",
        data_categories: ["account data", "usage logs", "device identifiers"],
        jurisdictions: ["EU", "UK"],
        alternatives_considered: "Consent and aggregate-only analytics were considered but would not support security monitoring",
        purpose_details: { interest_holder: c.companyName, interest_type: "Operational security", purpose_text: "Maintain secure and reliable services" },
        necessity_details: { alternatives: "Aggregate reporting and shorter retention", why_consent_not_used: "Security controls must operate consistently", data_minimised: "Only event metadata is processed", pseudonymisation_options: "User IDs are pseudonymised in analytics" },
        balancing_details: { reasonable_expectation: "Users expect security and service telemetry", vulnerable_subjects: [], potential_harm: "Unexpected profiling if safeguards fail", safeguards: ["opt-out where applicable", "role-based access", "short retention"], opt_out_mechanism: "Privacy centre preference controls", special_category_data: false, balancing_text: "Benefits outweigh limited privacy impact with safeguards" },
      },
      dpia: (() => {
        const dpiaIntake = getDpiaIntakeForSector(industry, slot);
        return {
          ...dpiaIntake,
          volume_frequency: slot === 1 ? "Large-scale — confirm exact volume from operational data" : "Mid-scale — confirm exact volume from operational data",
          retention: "To be confirmed per data category",
          third_party_processors: ["AWS", "Snowflake", "Zendesk"],
          existing_safeguards: ["encryption", "MFA", "DPIA review", "vendor DPAs"],
          jurisdictions: ["EU (GDPR)"],
          sector: industry,
        };
      })(),

      ropa: {
        org_name: c.companyName,
        sector: industry,
        legal_entity_type: (() => {
          const s = industry.toLowerCase();
          if (/gov|public sector|public authority/i.test(s)) return "Public sector body";
          if (/non.?profit|ngo|charity|foundation/i.test(s)) return "Registered charity";
          if (/university|college|higher ed/i.test(s)) return "Higher education institution";
          const sfx = geo === "eu" ? ["SE", "GmbH", "B.V.", "Ltd"][fixtureSeed(companyId) % 4] : "Inc.";
          if (sfx === "SE") return "Societas Europaea (SE)";
          if (sfx === "GmbH") return "Gesellschaft mit beschränkter Haftung (GmbH)";
          if (sfx === "B.V.") return "Besloten Vennootschap (B.V.)";
          if (sfx === "Ltd") return "Private limited company (UK)";
          return "Private limited company";
        })(),
        employee_band: (() => {
          const s = industry.toLowerCase();
          if (/non.?profit|ngo|charity|foundation/i.test(s)) return slot === 1 ? "50-249" : "1-49";
          if (/consult|advisory/i.test(s)) return slot === 1 ? "250-999" : "50-249";
          return slot === 1 ? "1000+" : "250-999";
        })(),
        dpo_name: c.dpoName,
        dpo_email: c.dpoEmail,
        jurisdictions: [
          { code: "EU_GDPR", name: "European Union", region: "EU & UK" },
          { code: "UK_GDPR", name: "United Kingdom", region: "EU & UK" },
          { code: c.countryCode, name: EU_EEA_MEMBER_STATE_NAMES[c.countryCode] ?? c.countryCode, region: "EU Member State" },
        ],
        activities: getRopaActivitiesForSector(industry, c.companyName),
      },
      euNotice: {
        controller_name: c.companyName,
        controller_address: COUNTRY_ADDRESS[c.countryCode] ?? COUNTRY_ADDRESS["IE"],
        contact_email: c.privacyEmail,
        dpo_details: "yes",            // token: "yes" means DPO is designated
        dpo_name: c.dpoName ?? "",
        dpo_email: c.dpoEmail ?? "",
        establishment_jurisdiction: COUNTRY_JURISDICTION[c.countryCode] ?? "Ireland",
        processing_purposes: getEuNoticePurposesForSector(industry),
        data_categories: getEuNoticeCategoriesForSector(industry),
        lawful_basis: getEuNoticeBasisForSector(industry),
        third_party_recipients: ["service_providers", "analytics", "regulators"],
        transfer_outside_eea: "yes",   // token: "yes" triggers the transfer section
        transfer_safeguards: ["sccs"],
        transfer_destinations: "United States and other countries with appropriate safeguards",
        retention_period: "24 months after account closure, unless a longer period is required by applicable law",
        automated_decisions: getEuNoticeAutomatedDecisions(industry),
        special_category_basis: null,
      },
      usNotice: null,
      cppaRisk: null,
      cppaCyber: null,
      cppaAdmt: buildAdmtFallback(c.companyName, industry, slot),
    };
  }
  const base = {
    usNotice: {
      business_name: c.companyName,
      business_description: `${industry} provider operating digital services in the United States`,
      contact_email: c.privacyEmail,
      data_categories: "Identifiers, contact details, device data, usage data, transaction records, and support communications",
      collection_purposes: "Provide services, secure accounts, process transactions, support users, and improve products",
      third_party_sharing: "Shared with service providers for hosting, analytics, payments, and support",
      third_party_categories: "Cloud hosting, analytics, payment, customer support, and security vendors",
      sale_or_sharing: (() => {
        const s = industry.toLowerCase();
        if (/adtech|data broker|social media|social platform/i.test(s)) return "sell_and_share";
        if (/gaming|media|publishing|retail|mobile app|web service|online/i.test(s)) return "share_only";
        return "no_sale";
      })(),
      retention_general: "Retained for the account life plus 24 months unless law requires longer",
      sensitive_data_types: /health|financial|hr/i.test(industry) ? "Account credentials and sector-specific sensitive data" : "Account credentials only",
      data_sources: "Provided by users, generated during service use, and received from service providers",
    },
    cppaRisk: {
      entity_name: c.companyName,
      subject_anchor:
        /fintech|financial/i.test(industry) ? "Automated credit-risk scoring of California loan applicants" :
        /hr|employment|workforce/i.test(industry) ? "Automated screening of California job applicants" :
        /adtech|marketing|media/i.test(industry) ? "Behavioural audience segmentation of California consumers" :
        /health|clinical|pharma|biotech/i.test(industry) ? "Care-management risk scoring of California patients" :
        `Automated risk scoring of California customers in ${industry}`,
      q1_revenue: slot === 1 ? "Over $100M" : "$25M to under $50M",
      q2_consumers: slot === 1 ? "1,000,000 or more" : "Under 100,000",
      q3_sector: industry,
      q4_pi_categories: ["identifiers", "internet activity", "commercial information"],
      q5_sell_share: "Yes",
      q5b_profiling_observation: /adtech|marketing|data.broker|ai|financial|hr/i.test(industry) ? "Yes" : "No",
      q6_right_know: "Yes",
      q6_right_know_multi: ["categories", "specific pieces", "sources", "purposes"],
      q7_right_delete: "Yes", q8_right_correct: "Yes", q9_opt_out: "Yes",
      q10_id_verification: "Documented", q11_policy_review: "Annual",
      q12_notice_at_collection: "Provided", q13_notice_content: "Complete", q14_employee_notice: "Provided",
      q15_sensitive_pi: /health|financial|hr/i.test(industry) ? "Yes" : "No",
      q15b_under16_knowledge: /gaming|edtech|children|social/i.test(industry) ? "Yes" : "No",
      q16_sensitive_limit: "Available where required", q17_sensitive_basis: "Service delivery and security",
      q18_admt_use: /ai|financial|hr|adtech/i.test(industry) ? "Yes" : "No",
      q18b_admt_training: /ai|adtech|financial|hr/i.test(industry) ? "Yes" : "No",
      q19_admt_description: "Risk scoring and service personalization",
      q20_admt_opt_out: "Available where required",
      i1_processing_purpose: "Service delivery, security, analytics, and support",
      i1b_min_pi: "Account identifier, contact email, and transaction history necessary to score risk and deliver service.",
      i2_retention_period: "24 months",
      i2_retention_criteria: "Account lifecycle and legal requirements",
      i2_retention_detail: "Deleted or de-identified after retention window",
      i3_ca_consumer_band: slot === 1 ? "100k+" : "50k-100k",
      i4_disclosure_mechanisms: ["privacy notice", "preference centre", "DSAR portal"],
      i4b_sources: "Directly from the consumer at signup; generated during service use; supplemented by service providers and public records.",
      i5_admt_logic: "Rules-based scoring with human review",
      i5_admt_training_source: "Internal operational data",
      i5_admt_fairness_testing: "Quarterly bias review",
      i5_admt_human_review: "Available on request",
      i6_vendors: "AWS, Snowflake, Zendesk",
      i7_internal_contributors: "Privacy, security, legal, product",
      i7_external_consultees: "Outside privacy counsel",
      i8_certifying_exec_name: "Jordan Lee",
      i8_certifying_exec_title: "Chief Privacy Officer",
      i8_contact_email: c.privacyEmail,
      i8_contact_phone: "+1-415-555-0180",
      i9_has_existing_dpia: "Yes",
      i9_existing_dpia_summary: "Existing DPIA covers analytics and security monitoring",
      exceptions_intake: {
        fraud_detection:    { claimed: true,  scope: "Automated fraud signals on account access and payment events.", safeguards: "Reviewed quarterly; limited retention (90 days); RBAC." },
        security_integrity: { claimed: true,  scope: "Anomaly detection across authentication and API traffic.",       safeguards: "SIEM alerts; least-privilege access; pseudonymised dashboards." },
        debugging:          { claimed: false, scope: "", safeguards: "" },
        transient_use:      { claimed: false, scope: "", safeguards: "" },
        internal_research:  { claimed: false, scope: "", safeguards: "" },
        employment_context: { claimed: /hr|employment|workforce/i.test(industry), scope: /hr|employment|workforce/i.test(industry) ? "Workforce-context data used only for HR administration." : "", safeguards: /hr|employment|workforce/i.test(industry) ? "Segregated HRIS; RBAC; retention aligned to statutory periods." : "" },
        legal_compliance:   { claimed: true,  scope: "Retention for tax and regulatory reporting obligations.", safeguards: "Retention schedule enforced by system controls." },
        consumer_request:   { claimed: false, scope: "", safeguards: "" },
      },
      impact_intake: {
        likelihood: "Possible",
        severity: /health|financial|hr/i.test(industry) ? "Significant" : "Moderate",
        harmTypes: ["Unauthorised access, destruction, use, modification, or disclosure", "Impairment of consumer control over personal information"],
        vulnerable: /gaming|edtech|children|health/i.test(industry) ? "Minors may be affected; processing is limited to service delivery." : "No specific vulnerable population identified.",
        benefitsOutweigh: "Yes",
        benefitsRationale: "Fraud prevention and service reliability benefits materially exceed the limited privacy impact after safeguards.",
        cyberGaps: "No",
        businessBenefits: "Reduces fraud losses and supports service continuity.",
        consumerBenefits: "Protects account integrity and service availability.",
        stakeholderBenefits: "Reduces systemic fraud exposure across the ecosystem.",
        safeguards: "RBAC; MFA; pseudonymisation in analytics; annual vendor DPA review; retention window enforced.",
        harmCauses: "Any harm would arise from unauthorised access to processed data or misconfiguration of automated scoring.",
      },
    },
    cppaCyber: {
      profile_industry: industry,
      profile_audit: "Within 12 months",
      industry_sector: industry,
      company_name: c.companyName,
      controls: Object.fromEntries(
        ["c1_auth","c2_encryption","c3_account_access","c4_inventory","c5_secure_config","c6_vuln_mgmt","c7_audit_logs","c8_network_mon","c9_anti_malware","c10_segmentation","c11_port_protocol","c12_awareness","c13_training","c14_secure_dev","c15_third_party","c16_retention","c17_incident","c18_continuity"]
          .map((k) => [k, ["implemented", "Documented and reviewed"]])
      ),
    },
    cppaAdmt: buildAdmtFallback(c.companyName, industry, slot),
    lia: null,
    dpia: null,
    ropa: null,
    euNotice: null,
  };

  // Doc O Step 4 (BELIEVED fixture, R8): new industry-scoped override.
  // Company_id "us-believed-slot1" (source_row_id "static-us-believed-slot1").
  // Field selection is PROVISIONAL pending Katherine's P4 enumeration —
  // uses only REAL intake keys from CPPARiskAssessment.tsx (Doc V
  // Theme-2 lesson: never invent intake keys).
  if (/^Believed-basis Pilot$/i.test(industry)) {
    // Deliberate content contradiction on a CONFIRMED pair: q18_admt_use
    // reads "No" while i5_admt_logic + i5_admt_human_review + i5_admt_fairness_testing
    // are populated. Both sides are marked CONFIRMED so the RESOLVE
    // behavior (inconsistency_flags) is exercised alongside STRENGTHEN.
    (base as any).cppaRisk.q18_admt_use = "No";
    (base as any).cppaRisk.q18b_admt_training = "No";
    (base as any).cppaRisk.q19_admt_description = "Rules-based scoring with human review is in place";
    // Assertions ride on intake_data.assertions per Doc N R1 (values unchanged).
    (base as any).cppaRisk.assertions = {
      // BELIEVED, standard_template
      i6_vendors: { state: "believed", basis: "standard_template" },
      // BELIEVED, written_policy
      i2_retention_period: { state: "believed", basis: "written_policy" },
      // CONFIRMED sides of the deliberate contradiction
      q18_admt_use: { state: "confirmed", basis: null },
      i5_admt_logic: { state: "confirmed", basis: null },
      // CONFIRMED (baseline)
      q11_policy_review: { state: "confirmed", basis: null },
      // UNKNOWN (evidence-heavy safeguard; treat as unanswered)
      i5_admt_fairness_testing: { state: "unknown", basis: null },
    };
  }

  return base;
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
  const { industry, geo, company_slot, company_id, part, company_name, use_claude } = body ?? {};
  if (!industry || !geo || !company_slot || !company_id) {
    return json({ error: "missing required fields: industry, geo, company_slot, company_id" }, 400);
  }

  try {
    if (part === "profile") {
      if (!use_claude) return json(buildDeterministicProfile(industry, geo, company_slot, company_id), 200);
      return streamJsonWork(async () => {
        const callAText = await callClaude(SYSTEM_PROMPT, buildCallAPrompt(industry, geo, company_slot, company_id), 6000);
        return extractJson(callAText);
      });
    }

    if (part === "geo") {
      const name = company_name || company_id;
      if (!use_claude) return json(normalizeCppaRiskTriggers(buildDeterministicGeo(industry, geo, company_slot, company_id, name)), 200);
      return streamJsonWork(async () => {
        const callBText = await callClaude(
          SYSTEM_PROMPT,
          geo === "eu"
            ? buildCallBEUPrompt(industry, company_slot, name)
            : buildCallBUSPrompt(industry, company_slot, name),
          4500,
        );
        return normalizeCppaRiskTriggers(extractJson(callBText));
      });
    }
  } catch (e) {
    return json({ error: "fixture generation failed", detail: (e as Error).message }, 502);
  }

  if (!use_claude) {
    return json(normalizeCppaRiskTriggers({
      ...buildDeterministicProfile(industry, geo, company_slot, company_id),
      ...buildDeterministicGeo(industry, geo, company_slot, company_id),
    }), 200);
  }

  return streamJsonWork(async () => {
    const callAText = await callClaude(SYSTEM_PROMPT, buildCallAPrompt(industry, geo, company_slot, company_id), 6000);
    const profileData = extractJson(callAText);
    const companyName: string = profileData.companyName ?? company_id;

    const callBText = await callClaude(
      SYSTEM_PROMPT,
      geo === "eu"
        ? buildCallBEUPrompt(industry, company_slot, companyName)
        : buildCallBUSPrompt(industry, company_slot, companyName),
      4500,
    );
    const geoData = extractJson(callBText);

    return normalizeCppaRiskTriggers({ ...profileData, ...geoData });
  });
});

// Ensure CPPA Risk fixture always has at least one § 7150(b) trigger so the
// stress run actually exercises the generator instead of hitting the
// "no triggering activity" validation. Forces q5_sell_share = "Yes" on the
// cppaRisk slice when present; non-destructive for other tools.
function normalizeCppaRiskTriggers<T extends Record<string, any>>(data: T): T {
  const r = (data as any)?.cppaRisk;
  if (r && typeof r === "object") {
    const triggerYes = (v: any) => typeof v === "string" && /^yes/i.test(v);
    const hasTrigger =
      triggerYes(r.q5_sell_share) ||
      triggerYes(r.q15_sensitive_pi) ||
      triggerYes(r.q18_admt_use) ||
      triggerYes(r.q15b_under16_knowledge);
    if (!hasTrigger) r.q5_sell_share = "Yes";
  }
  return data;
}
