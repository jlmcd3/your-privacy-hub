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

function fixtureSeed(companyId: string): number {
  return Array.from(companyId).reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
}

function buildCompany(industry: string, geo: string, slot: number, companyId: string) {
  const seed = fixtureSeed(companyId);
  const roots = ["Aster", "Nexa", "Velor", "Syntara", "Vortex", "Luma", "Civix", "Helio", "Orion", "Maris"];
  const suffix = geo === "eu" ? ["SE", "GmbH", "B.V.", "Ltd"][seed % 4] : ["Inc.", "Corp.", "LLC", "Technologies"][seed % 4];
  const sectorWord = industry.split(/\s|&/).find((w) => w.length > 3)?.replace(/[^a-z]/gi, "") || "Privacy";
  const companyName = `${roots[seed % roots.length]} ${sectorWord} ${suffix}`;
  const domain = `${companyName.toLowerCase().replace(/[^a-z0-9]+/g, "").slice(0, 22)}.${geo === "eu" ? "eu" : "com"}`;
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

function buildDeterministicProfile(industry: string, geo: string, slot: number, companyId: string) {
  const c = buildCompany(industry, geo, slot, companyId);
  const jurisdictions = geo === "eu" ? ["EU", "GB", c.countryCode] : ["US", "CA", "VA"];
  const dataCategories = ["account identifiers", "contact details", "usage logs", "device identifiers", "support records"];
  const usesBiometric = /health|financial|security|workforce|hr/i.test(industry);
  return {
    ...c,
    governance: {
      sector: industry,
      org_size: slot === 1 ? "Large Enterprise" : "Mid-Market",
      jurisdictions,
      eu_uk_data: geo === "eu" ? "Yes" : "No",
      tools: ["OneTrust", "Jira", "AWS", "Salesforce"],
      data_categories: dataCategories,
      special_category: usesBiometric || /health|hr|children|education/i.test(industry) ? "Yes" : "No",
      special_categories_list: usesBiometric ? ["biometric identifiers"] : [],
      privacy_policy: "Published and reviewed annually",
      acceptable_use: "Documented for employees and platform users",
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
      controllerJurisdiction: geo === "eu" ? c.countryCode : "United States",
      processorName: geo === "eu" ? "Nimbus Processing GmbH" : "Northstar Data Services LLC",
      processorJurisdiction: geo === "eu" ? "Germany" : "United States",
      services: `${industry} analytics, hosting, and support services`,
      dataCategories,
      dataSubjectCount: slot === 1 ? "1,000,000+" : "85,000",
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
      jurisdictions,
      processorInvolved: true,
      contained: "Credentials revoked, sessions invalidated, logs preserved, vendor access restricted",
      organisationType: `${industry} operator`,
    },
    biometric: usesBiometric ? {
      biometricTypes: ["facial template", "voiceprint"],
      orgType: `${industry} organisation`,
      purpose: "Identity verification and fraud prevention",
      jurisdictions,
      enrolledCount: slot === 1 ? "120,000" : "18,000",
    } : null,
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
      markets_served: jurisdictions,
      has_eu_establishment: geo === "eu",
      has_uk_establishment: geo === "eu",
      acts_as_data_broker: /adtech|marketing/i.test(industry),
      sells_or_shares_personal_info: /adtech|marketing|media/i.test(industry),
      processes_biometrics_for_id: usesBiometric,
    },
  };
}

function buildDeterministicGeo(industry: string, geo: string, slot: number, companyId: string, companyName?: string) {
  const c = { ...buildCompany(industry, geo, slot, companyId), companyName: companyName || buildCompany(industry, geo, slot, companyId).companyName };
  if (geo === "eu") {
    const activities = ["Customer account management", "Security monitoring", "Marketing preferences"].map((name, i) => ({
      activity_name: name,
      category: ["customer_service", "technology", "marketing"][i],
      purpose: `${name} for ${industry.toLowerCase()} services`,
      lawful_basis: i === 2 ? "Consent" : "Legitimate interests",
      special_category_basis: null,
      data_categories: ["contact details", "account identifiers", "usage logs"],
      data_subjects: "Customers and platform users",
      recipients: "Hosting, analytics, and support providers",
      transfer_destination: "United States",
      transfer_mechanism: "EU SCCs and UK IDTA",
      retention_period: "24 months after account closure",
      security_measures: "MFA, encryption, access logging, vendor review",
    }));
    return {
      lia: {
        organization_name: c.companyName,
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

      ropa: { org_name: c.companyName, legal_entity_type: "Private company", employee_band: slot === 1 ? "1000+" : "100-499", dpo_name: c.dpoName, dpo_email: c.dpoEmail, jurisdictions: [{ code: c.countryCode, name: c.countryCode === "GB" ? "United Kingdom" : "European Union", region: "Europe" }], activities },
      euNotice: {
        controller_name: c.companyName,
        controller_address: "1 Privacy Square, Dublin, Ireland",
        contact_email: c.privacyEmail,
        dpo_details: `${c.dpoName}, ${c.dpoEmail}`,
        dpo_name: c.dpoName,
        dpo_email: c.dpoEmail,
        processing_purposes: ["Provide services", "Secure accounts", "Customer support", "Marketing preferences"],
        data_categories: ["identity data", "contact data", "usage data", "device data"],
        lawful_basis: ["Contract", "Legitimate interests", "Consent"],
        third_party_recipients: ["hosting providers", "analytics providers", "support providers"],
        transfer_outside_eea: "Yes, with SCCs and UK IDTA where required",
        transfer_safeguards: ["SCCs", "transfer impact assessments", "encryption"],
        retention_period: "24 months after account closure unless law requires longer",
        automated_decisions: "No solely automated legal or similarly significant decisions",
        special_category_basis: null,
        supervisory_authority_eu: "Irish Data Protection Commission",
        supervisory_authority_uk: "UK Information Commissioner's Office",
      },
      usNotice: null,
      cppaRisk: null,
      cppaCyber: null,
      cppaAdmt: null,
    };
  }
  return {
    usNotice: {
      business_name: c.companyName,
      business_description: `${industry} provider operating digital services in the United States`,
      contact_email: c.privacyEmail,
      data_categories: "Identifiers, contact details, device data, usage data, transaction records, and support communications",
      collection_purposes: "Provide services, secure accounts, process transactions, support users, and improve products",
      third_party_sharing: "Shared with service providers for hosting, analytics, payments, and support",
      third_party_categories: "Cloud hosting, analytics, payment, customer support, and security vendors",
      sale_or_sharing: /adtech|marketing|media/i.test(industry) ? "Limited sharing for cross-context advertising" : "No sale; limited service-provider disclosure",
      retention_general: "Retained for the account life plus 24 months unless law requires longer",
      sensitive_data_types: /health|financial|hr/i.test(industry) ? "Account credentials and sector-specific sensitive data" : "Account credentials only",
      data_sources: "Provided by users, generated during service use, and received from service providers",
    },
    cppaRisk: {
      q1_revenue: slot === 1 ? "Over $25 million" : "$20M-$100M", q2_consumers: slot === 1 ? "Over 100,000" : "50,000-100,000", q3_sector: industry,
      q4_pi_categories: ["identifiers", "internet activity", "commercial information"], q5_sell_share: /adtech|marketing|media/i.test(industry) ? "Yes" : "No", q6_right_know: "Yes", q7_right_delete: "Yes", q8_right_correct: "Yes", q9_opt_out: "Yes", q10_id_verification: "Documented", q11_policy_review: "Annual", q12_notice_at_collection: "Provided", q13_notice_content: "Complete", q14_employee_notice: "Provided", q15_sensitive_pi: /health|financial|hr/i.test(industry) ? "Yes" : "No", q16_sensitive_limit: "Available where required", q17_sensitive_basis: "Service delivery and security", q18_admt_use: /ai|financial|hr/i.test(industry) ? "Yes" : "No", q19_admt_description: "Risk scoring and service personalization", q20_admt_opt_out: "Available where required", i1_processing_purpose: "Service delivery, security, analytics, and support", i2_retention_period: "24 months", i2_retention_criteria: "Account lifecycle and legal requirements", i2_retention_detail: "Deleted or de-identified after retention window", i3_ca_consumer_band: slot === 1 ? "100k+" : "50k-100k", i4_disclosure_mechanisms: ["privacy notice", "preference centre", "DSAR portal"], i5_admt_logic: "Rules-based scoring with human review", i5_admt_training_source: "Internal operational data", i5_admt_fairness_testing: "Quarterly bias review", i5_admt_human_review: "Available on request", i6_vendors: "AWS, Snowflake, Zendesk", i7_internal_contributors: "Privacy, security, legal, product", i7_external_consultees: "Outside privacy counsel", i8_certifying_exec_name: "Jordan Lee", i8_certifying_exec_title: "Chief Privacy Officer", i9_has_existing_dpia: "Yes", i9_existing_dpia_summary: "Existing DPIA covers analytics and security monitoring",
    },
    cppaCyber: {
      profile: { industry, incidents_12mo: "1", framework: "NIST CSF 2.0", last_audit: "Within 12 months" },
      industry_sector: industry,
      company_name: c.companyName,
      controls: Object.fromEntries(["c1_auth", "c2_encryption", "c3_zero_trust", "c4_account_mgmt", "c5_inventory", "c7_vuln_mgmt", "c8_audit_logs", "c9_network_mon", "c10_anti_malware", "c14_third_party", "c15_retention", "c16_training", "c17_incident", "c18_continuity"].map((k) => [k, ["implemented", "Documented and reviewed"]])),
    },
    cppaAdmt: /ai|fintech|hr|adtech/i.test(industry) ? {
      system_name: /ai/i.test(industry) ? "AI Decisioning Engine" : /fintech/i.test(industry) ? "Credit Risk Scoring Model" : /hr/i.test(industry) ? "Candidate Screening System" : "Audience Segmentation Engine",
      system_type: "ML model",
      system_description: /ai/i.test(industry)
        ? "Gradient-boosted ensemble that produces a risk score used to determine service eligibility and pricing tiers for California consumers."
        : /fintech/i.test(industry)
        ? "Logistic regression model trained on payment history, utilisation, and income proxies to produce a 0–850 creditworthiness score used for loan approval."
        : /hr/i.test(industry)
        ? "NLP-based resume parser and ranking model that scores applicants 0–100 for initial screening shortlists; human recruiter reviews all shortlisted candidates."
        : "Collaborative-filtering model that assigns consumers to behavioural segments used for targeted advertising on third-party platforms.",
      decision_domains: /ai/i.test(industry) ? ["service_eligibility"] : /fintech/i.test(industry) ? ["financial_services"] : /hr/i.test(industry) ? ["employment"] : ["advertising"],
      human_review: /hr/i.test(industry) ? "Yes — recruiter reviews all shortlisted candidates before any employment decision" : "No — fully automated; opt-out suppresses scoring immediately",
      training_data_use: "Yes",
      profiling_use: "Yes",
      notice_delivery: ["privacy_policy", "just_in_time"],
      notice_has_specific_purpose: "Yes",
      notice_purpose_text: "To assess eligibility and personalise your experience using automated analysis of your data.",
      notice_has_opt_out_desc: "Yes",
      notice_has_access_desc: "Yes",
      notice_has_anti_retaliation: "Yes",
      notice_has_how_it_works: "Yes",
      notice_has_alternative_process: /hr/i.test(industry) ? "Yes" : "No",
      opt_out_exception: "none",
      opt_out_methods: ["webform", "email"],
      opt_out_link_title: "Opt Out of Automated Decisions",
      opt_out_no_cookie_banner: "Yes",
      opt_out_no_account_required: "Yes",
      opt_out_confirmation_mechanism: "Email confirmation within 24 hours",
      opt_out_appeal_process: "Consumer may request human review within 30 days",
      opt_out_fairness_doc: "",
      access_submission_methods: "Webform at privacy.example.com/access-request",
      access_verification_process: "Email verification plus last-4 of account identifier",
      access_logic_disclosure: "Yes — plain-language description of inputs and weightings provided",
      access_outcome_disclosure: "Yes — score and tier communicated at point of decision",
      access_response_timeline: "45 days",
      access_trade_secret_policy: "Proprietary model weights withheld; all other factors disclosed",
    } : null,
    lia: null,
    dpia: null,
    ropa: null,
    euNotice: null,
  };
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
      if (!use_claude) return json(buildDeterministicGeo(industry, geo, company_slot, company_id, name), 200);
      return streamJsonWork(async () => {
        const callBText = await callClaude(
          SYSTEM_PROMPT,
          geo === "eu"
            ? buildCallBEUPrompt(industry, company_slot, name)
            : buildCallBUSPrompt(industry, company_slot, name),
          4500,
        );
        return extractJson(callBText);
      });
    }
  } catch (e) {
    return json({ error: "fixture generation failed", detail: (e as Error).message }, 502);
  }

  if (!use_claude) {
    return json({
      ...buildDeterministicProfile(industry, geo, company_slot, company_id),
      ...buildDeterministicGeo(industry, geo, company_slot, company_id),
    }, 200);
  }

  return streamJsonWork(async () => {

    // Call A: company profile + shared tools (governance, dpa, irPlaybook, biometric, registration)
    const callAText = await callClaude(SYSTEM_PROMPT, buildCallAPrompt(industry, geo, company_slot, company_id), 6000);
    const profileData = extractJson(callAText);
    const companyName: string = profileData.companyName ?? company_id;

    // Call B: geo-specific tools
    const callBText = await callClaude(
      SYSTEM_PROMPT,
      geo === "eu"
        ? buildCallBEUPrompt(industry, company_slot, companyName)
        : buildCallBUSPrompt(industry, company_slot, companyName),
      4500,
    );
    const geoData = extractJson(callBText);

    // Merge: geoData fields overwrite profileData where both exist (shouldn't overlap)
    return { ...profileData, ...geoData };
  });
});
