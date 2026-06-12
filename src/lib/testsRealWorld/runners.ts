// Runners — each invokes the SAME production edge function the subscriber
// flow uses (no Stripe, no checkout — the admin already has access). On
// success, returns { targetTable, targetId, label } so the ledger can record it.
//
// Phase 1 tools: LIA, DPIA, Governance, Biometric, DPA, IR Playbook, Brief.
// Phase 2 (RoPA, US Notice, EU Notice, Registration, CPPA Scope/Risk/Cyber)
// share the same shape and can be added by lifting fixtures from their
// corresponding TestX.tsx pages.

import { supabase } from "@/integrations/supabase/client";
import type { ToolType } from "./ledger";
export type { ToolType };

export interface RunnerResult {
  targetTable: string;
  targetId: string;
  label: string;
  /** Subscriber-facing result URL the admin can open in a new tab. */
  resultUrl?: string;
  /** Tool key consumed by PDFDownloadButton. */
  pdfToolType?:
    | "biometric_checker"
    | "ir_playbook"
    | "dpa_generator"
    | "li_assessment"
    | "governance_assessment"
    | "dpia_framework"
    | "brief";
}

export interface RunnerCtx {
  userId: string;
  log: (msg: string) => void;
}

export type Runner = (ctx: RunnerCtx) => Promise<RunnerResult>;

// ─── shared poller ───────────────────────────────────────────────────────────

async function pollStatus(
  table: "li_assessments" | "dpia_frameworks" | "governance_assessments",
  id: string,
  maxPolls: number,
  intervalMs: number,
  log: (m: string) => void,
): Promise<void> {
  for (let i = 0; i < maxPolls; i++) {
    await new Promise((r) => setTimeout(r, intervalMs));
    const { data } = await supabase.from(table).select("status").eq("id", id).single();
    if (data?.status === "complete") return;
    if (data?.status === "failed" || data?.status === "error") {
      throw new Error(`${table} status=${data.status}`);
    }
    log(`… poll ${i + 1}/${maxPolls} (status: ${data?.status ?? "?"})`);
  }
  throw new Error("timeout waiting for completion");
}

// ─── LIA ─────────────────────────────────────────────────────────────────────

const LIA_INTAKE = {
  user_id: "" as string, // filled in
  stage: "final",
  status: "pending",
  processing_description:
    "Meridian Health Analytics processes patient health records to provide predictive analytics to NHS and private clinic clients.",
  relationship_type:
    "Existing patient (indirect — collected from clinic, not directly from patient)",
  data_categories: ["Health or medical data", "Contact details", "Device/technical data"],
  jurisdictions: ["EU (GDPR)", "United Kingdom (UK GDPR)"],
  sector: "Healthcare/Life Sciences",
  stated_purpose:
    "Identify patients at elevated risk so clinical teams can intervene earlier.",
  alternatives_considered:
    "Manual clinical review, aggregate anonymised analytics, explicit consent model — all impractical at NHS scale.",
  purpose_details: {
    interest_holder: "Controller and treating clinicians",
    interest_type: "Clinical / public-interest health benefit",
    purpose_text: "Predictive risk stratification for direct clinical benefit.",
  },
  necessity_details: {
    alternatives: "See alternatives_considered.",
    why_consent_not_used: "Operationally impractical at NHS scale.",
    data_minimised: "Only fields required for risk scoring ingested.",
    pseudonymisation_options: "Pseudonymisation applied during inference.",
  },
  balancing_details: {
    reasonable_expectation:
      "Patients expect records to be used for direct care.",
    vulnerable_subjects: ["Patients"],
    potential_harm: "Inappropriate disclosure of health data.",
    safeguards: ["Pseudonymisation", "Access restricted to treating clinicians", "Audit logging"],
    opt_out_mechanism: "Patients can opt out via the clinic.",
    special_category_data: true,
    employment_safeguards: "n/a",
    statutory_restrictions: "UK Common Law Duty of Confidentiality.",
    balancing_text: "Low risk of harm; high clinical benefit.",
  },
  preview_signal: { harness: true },
};

const runLIA: Runner = async ({ userId, log }) => {
  log("Inserting li_assessments row…");
  const { data: rec, error: insErr } = await supabase
    .from("li_assessments")
    .insert({ ...LIA_INTAKE, user_id: userId })
    .select("id")
    .single();
  if (insErr || !rec) throw new Error(`insert failed: ${insErr?.message}`);

  log(`Invoking run-li-assessment (id ${rec.id})…`);
  const { error: fnErr } = await supabase.functions.invoke("run-li-assessment", {
    body: { assessment_id: rec.id },
  });
  if (fnErr) log(`edge function returned: ${fnErr.message} — polling anyway`);

  await pollStatus("li_assessments", rec.id, 30, 4000, log);
  return {
    targetTable: "li_assessments",
    targetId: rec.id,
    label: "Meridian Health · LIA",
    resultUrl: `/li-assessment/result/${rec.id}`,
    pdfToolType: "li_assessment",
  };
};

// ─── DPIA ────────────────────────────────────────────────────────────────────

const DPIA_INTAKE = {
  processing_activity_name: "AI-Powered Patient Risk Stratification",
  description:
    "Automated processing of patient health records using ML models to generate 30-day readmission risk scores. Systematic, large-scale, ~50,000 patients across 12 NHS clinics.",
  purpose: "Enable clinical teams to prioritise interventions for high-risk patients.",
  data_categories: ["Health or medical data", "Contact details", "Device/technical data"],
  data_subjects: "NHS and private clinic patients — vulnerable population, ~50,000 individuals.",
  volume_frequency: "~50,000 patients, continuous ingestion.",
  retention: "Risk scores 24 months. Raw patient data not retained.",
  third_party_processors: ["Microsoft Azure (EU), Snowflake (EU)"],
  automated_decisions:
    "Automated risk scores generated without human review; clinician makes final decision (not Article 22 scope).",
  existing_safeguards: [],
  jurisdictions: ["EU (GDPR)", "United Kingdom (UK GDPR)"],
  legal_basis_proposed:
    "Legitimate interests (Art 6(1)(f)) + explicit consent (Art 9(2)(a)) for special category.",
  sector: "Healthcare/Life Sciences",
  source_assessment_id: null as string | null,
};

const runDPIA: Runner = async ({ userId, log }) => {
  log("Inserting dpia_frameworks row…");
  const { data: rec, error: insErr } = await supabase
    .from("dpia_frameworks")
    .insert({
      user_id: userId,
      status: "pending",
      intake_data: DPIA_INTAKE,
      is_subscriber_credit: true,
    })
    .select("id")
    .single();
  if (insErr || !rec) throw new Error(`insert failed: ${insErr?.message}`);

  log(`Invoking run-dpia-framework (id ${rec.id})…`);
  const { error: fnErr } = await supabase.functions.invoke("run-dpia-framework", {
    body: { dpia_id: rec.id },
  });
  if (fnErr) log(`edge function: ${fnErr.message} — polling anyway`);

  await pollStatus("dpia_frameworks", rec.id, 90, 4000, log);
  return {
    targetTable: "dpia_frameworks",
    targetId: rec.id,
    label: "Meridian Health · DPIA",
    resultUrl: `/dpia-framework/result/${rec.id}`,
    pdfToolType: "dpia_framework",
  };
};

// ─── Governance ──────────────────────────────────────────────────────────────

const GOV_INTAKE = {
  sector: "Healthcare/Life Sciences",
  org_size: "51-250",
  jurisdictions: ["EU (GDPR)", "United Kingdom (UK GDPR)", "California (CCPA/CPRA)"],
  eu_uk_data: "Yes",
  tools: ["Microsoft 365 / Copilot", "ChatGPT / OpenAI", "Salesforce + Einstein"],
  data_categories: ["Health or medical data", "Employee records", "Customer records", "Financial data"],
  special_category: "Yes",
  special_categories_list: ["Health data"],
  privacy_policy: "Yes, but outdated",
  acceptable_use: "Yes, but general only",
  dpo_status: "Yes, informal privacy lead",
  dpia_status: "No, none conducted",
  incident_response: "Yes, but not tested",
  training_status: "Yes, onboarding only",
  tool_instruction: "Verbal guidance only",
  dpa_status: "Some vendors",
  transfer_status: "Yes, US-based tools",
  test_run: true,
};

const runGovernance: Runner = async ({ userId, log }) => {
  log("Inserting governance_assessments row…");
  const { data: rec, error: insErr } = await supabase
    .from("governance_assessments")
    .insert({ user_id: userId, status: "pending", intake_data: GOV_INTAKE })
    .select("id")
    .single();
  if (insErr || !rec) throw new Error(`insert failed: ${insErr?.message}`);

  log(`Invoking run-governance-assessment (id ${rec.id})…`);
  const { error: fnErr } = await supabase.functions.invoke("run-governance-assessment", {
    body: { assessment_id: rec.id },
  });
  if (fnErr) log(`edge function: ${fnErr.message} — polling anyway`);

  await pollStatus("governance_assessments", rec.id, 75, 4000, log);
  return {
    targetTable: "governance_assessments",
    targetId: rec.id,
    label: "Meridian Health · Governance",
    resultUrl: `/governance-assessment/result/${rec.id}`,
    pdfToolType: "governance_assessment",
  };
};

// ─── Biometric ───────────────────────────────────────────────────────────────

const runBiometric: Runner = async ({ userId, log }) => {
  log("Invoking check-biometric-compliance…");
  const { data, error } = await supabase.functions.invoke("check-biometric-compliance", {
    body: {
      biometricTypes: ["Facial geometry / facial recognition"],
      orgType: "Employer (employee biometrics)",
      purpose:
        "Time and attendance — employee clock-in/clock-out for a manufacturing facility. Vendor: US cloud. Consent: contract clause. Retention: undocumented.",
      jurisdictions: ["United Kingdom", "Illinois, USA (BIPA)"],
      enrolledCount: "500-5,000",
      user_id: userId,
      is_free_tier: false,
    },
  });
  if (error || !data?.id) {
    throw new Error(error?.message || data?.error || "no id returned");
  }
  return {
    targetTable: "biometric_assessments",
    targetId: data.id,
    label: "UK + Illinois · Biometric",
    resultUrl: `/biometric-checker/result/${data.id}`,
    pdfToolType: "biometric_checker",
  };
};

// ─── DPA ─────────────────────────────────────────────────────────────────────

const runDPA: Runner = async ({ userId, log }) => {
  log("Invoking generate-dpa…");
  const { data, error } = await supabase.functions.invoke("generate-dpa", {
    body: {
      controllerName: "Meridian Health Analytics Ltd",
      controllerJurisdiction: "United Kingdom",
      processorName: "CloudMed Processing GmbH",
      processorJurisdiction: "Germany",
      services:
        "AI-powered patient risk stratification analytics, including data ingestion, model inference, risk score generation, and structured report return.",
      dataCategories: ["Health / medical data", "Employee / HR data"],
      dataSubjectCount: "approximately 50,000",
      retention: "24 months for risk scores; raw patient data not retained.",
      hasSubProcessors: true,
      subProcessorList: "Microsoft Azure (EU), Snowflake Inc (EU).",
      legalFramework: "GDPR (EU) and UK GDPR",
      auditRights: "annual third-party audit",
      includeTransferClause: true,
      transferMechanism: "EU Standard Contractual Clauses (2021/914)",
      user_id: userId,
    },
  });
  if (error || !data?.id) {
    throw new Error(error?.message || data?.error || "no id returned");
  }
  return {
    targetTable: "dpa_documents",
    targetId: data.id,
    label: "Meridian → CloudMed · DPA",
    resultUrl: `/dpa-generator/result/${data.id}`,
    pdfToolType: "dpa_generator",
  };
};

// ─── IR Playbook ─────────────────────────────────────────────────────────────

const runIRPlaybook: Runner = async ({ userId, log }) => {
  log("Invoking generate-ir-playbook…");
  const { data, error } = await supabase.functions.invoke("generate-ir-playbook", {
    body: {
      discoveryDateTime: new Date().toISOString(),
      cause:
        "Ransomware attack on EHR server. ~5,000 NHS clinic patient records potentially exfiltrated. Systems partially restored.",
      dataTypes: ["Health / medical records", "Names and contact details", "Financial / payment data"],
      affectedCount: "1,000–10,000",
      jurisdictions: ["United Kingdom", "EU/EEA", "Ireland"],
      processorInvolved: false,
      contained: "No",
      organisationType: "Healthcare provider",
      user_id: userId,
    },
  });
  if (error || !data?.id) {
    throw new Error(error?.message || data?.error || "no id returned");
  }
  return {
    targetTable: "ir_playbooks",
    targetId: data.id,
    label: "NHS ransomware · IR Playbook",
    resultUrl: `/ir-playbook/result/${data.id}`,
    pdfToolType: "ir_playbook",
  };
};

// ─── Intelligence Brief ──────────────────────────────────────────────────────

const runBrief: Runner = async ({ log }) => {
  log("Invoking admin-test-custom-brief…");
  const { data, error } = await supabase.functions.invoke("admin-test-custom-brief", {
    body: {
      prefs: {
        industries: ["healthcare"],
        jurisdictions: ["eu-uk"],
        topics: [
          "GDPR Enforcement & DPA Activity",
          "Health & Medical Data Privacy",
          "AI & Privacy",
          "Biometric Data Privacy",
          "Data Breach & Incident Response",
        ],
        role: "cpo_dpo",
        format: "full",
      },
    },
  });
  if (error || !data?.custom_brief?.id) {
    throw new Error(error?.message || data?.error || "no brief id returned");
  }
  return {
    targetTable: "custom_briefs",
    targetId: data.custom_brief.id,
    label: "Healthcare DPO · Brief",
    pdfToolType: "brief",
  };
};

// ─── RoPA ────────────────────────────────────────────────────────────────────

const ROPA_ORG = "Meridian Health Analytics Ltd";
const ROPA_ACTIVITIES = [
  {
    activity_name: "Patient Risk Stratification Analytics",
    category: "technology",
    purpose: "AI-powered predictive analytics identifying patients at elevated risk of readmission",
    lawful_basis: "legitimate_interests",
    special_category_basis: "Article 9(2)(a) — explicit consent for health data",
    data_categories: ["Health or medical data", "Contact identifiers"],
    data_subjects: "NHS and private clinic patients",
    recipients: "Clinic clinical teams; CloudMed Processing GmbH (processor, Germany)",
    transfer_destination: "Germany (Azure EU)",
    transfer_mechanism: "EEA — no third-country transfer",
    retention_period: "Risk scores: 24 months. Raw patient data: not retained.",
    security_measures: "AES-256 at rest, TLS 1.3 in transit. SOC 2 certified.",
  },
  {
    activity_name: "Employee HR Processing",
    category: "hr_employment",
    purpose: "Recruitment, payroll, benefits administration, statutory employment compliance",
    lawful_basis: "contract",
    special_category_basis: "Not applicable",
    data_categories: ["Employee records", "Financial data", "Contact identifiers"],
    data_subjects: "Employees and contractors",
    recipients: "HR team; ADP payroll (US); HMRC",
    transfer_destination: "United States (ADP)",
    transfer_mechanism: "EU Standard Contractual Clauses",
    retention_period: "Active employment + 6 years post-termination",
    security_measures: "RBAC, MFA, encryption at rest",
  },
];

async function getOrCreateClientId(userId: string): Promise<string> {
  const { data } = await supabase
    .from("clients")
    .select("id")
    .eq("owner_id", userId)
    .eq("is_active", true)
    .limit(1);
  if (data?.[0]) return data[0].id;
  throw new Error("No personal workspace client found for admin");
}

const runRoPA: Runner = async ({ userId, log }) => {
  const clientId = await getOrCreateClientId(userId);

  log("Upserting ropa_client_profiles…");
  await supabase.from("ropa_client_profiles").upsert(
    {
      client_id: clientId,
      legal_entity_type: "Private limited company (UK)",
      employee_band: "50-249",
      is_controller: true,
      is_processor: false,
      dpo_name: "Dr. Eleanor Hartley",
      dpo_email: "dpo@meridianhealth.example",
    },
    { onConflict: "client_id" },
  );

  log("Adding jurisdiction selections…");
  await supabase.from("ropa_jurisdiction_selections").upsert(
    [
      { client_id: clientId, jurisdiction_code: "EU_GDPR", jurisdiction_name: "European Union", jurisdiction_region: "EU & UK" },
      { client_id: clientId, jurisdiction_code: "UK_GDPR", jurisdiction_name: "United Kingdom", jurisdiction_region: "EU & UK" },
    ],
    { onConflict: "client_id,jurisdiction_code" },
  );

  log("Creating ropa_sessions row…");
  const { data: session, error: sessErr } = await supabase
    .from("ropa_sessions")
    .insert({
      client_id: clientId,
      status: "review",
      version_number: 1,
      total_activities: ROPA_ACTIVITIES.length,
      completed_activities: ROPA_ACTIVITIES.length,
      payment_confirmed: true,
      paid_at: new Date().toISOString(),
      org_name: ROPA_ORG,
    })
    .select("id")
    .single();
  if (sessErr || !session) throw new Error(`session: ${sessErr?.message}`);

  log(`Inserting ${ROPA_ACTIVITIES.length} processing activities…`);
  const { data: acts, error: actErr } = await supabase
    .from("ropa_processing_activities")
    .insert(
      ROPA_ACTIVITIES.map((a, i) => ({
        session_id: session.id,
        client_id: clientId,
        display_name: a.activity_name,
        category: a.category,
        status: "complete" as const,
        completion_pct: 100,
        display_order: i,
      })),
    )
    .select("id, display_order");
  if (actErr || !acts) throw new Error(`activities: ${actErr?.message}`);

  log("Inserting answers…");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ansRows: Array<{ activity_id: string; session_id: string; question_key: string; answer_value: any }> = [];
  for (const a of acts) {
    const src = ROPA_ACTIVITIES[a.display_order];
    const map: Record<string, unknown> = {
      purpose: src.purpose,
      lawful_basis: src.lawful_basis,
      special_category_basis: src.special_category_basis,
      data_subjects: src.data_subjects,
      data_categories: src.data_categories,
      recipients: src.recipients,
      transfer_destination: src.transfer_destination,
      transfer_mechanism: src.transfer_mechanism,
      retention_period: src.retention_period,
      security_measures: src.security_measures,
    };
    for (const [k, v] of Object.entries(map)) {
      ansRows.push({ activity_id: a.id, session_id: session.id, question_key: k, answer_value: v });
    }
  }
  await supabase.from("ropa_answers").insert(ansRows);

  log("Invoking generate-ropa-document (PDF)…");
  const { data: gen, error: genErr } = await supabase.functions.invoke("generate-ropa-document", {
    body: {
      session_id: session.id,
      format: "pdf",
      document_date: new Date().toISOString().slice(0, 10),
      author_name: "Meridian Compliance Team",
    },
  });
  if (genErr || !gen?.download_url) {
    throw new Error(`generator: ${genErr?.message ?? gen?.error ?? "no download_url"}`);
  }

  return {
    targetTable: "ropa_sessions",
    targetId: session.id,
    label: `${ROPA_ORG} · RoPA v1`,
    resultUrl: "/ropa/documents",
  };
};

// ─── US Notice ───────────────────────────────────────────────────────────────

const runUSNotice: Runner = async ({ userId, log }) => {
  const clientId = await getOrCreateClientId(userId);

  log("Creating us_notice_session…");
  const { data: session, error: sessErr } = await supabase
    .from("us_notice_sessions")
    .insert({
      client_id: clientId,
      status: "review",
      scope: "all_states",
      mode: "standalone",
      payment_confirmed: true,
      paid_at: new Date().toISOString(),
    })
    .select("id")
    .single();
  if (sessErr || !session) throw new Error(`session: ${sessErr?.message}`);

  log("Inserting state selections (CA, VA, TX)…");
  await supabase.from("us_notice_state_selections").insert([
    { session_id: session.id, state_code: "CA", state_name: "California", framework_type: "ccpa" },
    { session_id: session.id, state_code: "VA", state_name: "Virginia", framework_type: "virginia_model" },
    { session_id: session.id, state_code: "TX", state_name: "Texas", framework_type: "virginia_model" },
  ]);

  log("Inserting universal answers…");
  const universal: Record<string, unknown> = {
    business_name: "Meridian Health Analytics Ltd",
    business_description: "AI-powered patient risk-stratification analytics for clinics in the UK and US.",
    contact_email: "privacy@meridianhealth.io",
    data_categories: "Identifiers; Health information; Employment data; Internet activity",
    collection_purposes: "Service delivery; R&D; Marketing; Fraud prevention; Legal compliance",
    third_party_sharing: "yes",
    third_party_categories: "Cloud infrastructure; payroll (US); email marketing (US); regulators",
    sale_or_sharing: "neither",
    retention_general: "Risk scores 24 months; marketing 2 years post-engagement.",
    sensitive_data_types: "Health information; precise geolocation",
    data_sources: "Directly from individuals; Clinic EHR systems; analytics vendors",
  };
  await supabase.from("us_notice_answers").insert(
    Object.entries(universal).map(([k, v]) => ({
      session_id: session.id,
      question_key: k,
      answer_value: v as never,
    })),
  );

  log("Invoking generate-us-notice…");
  const { data: gen, error: genErr } = await supabase.functions.invoke("generate-us-notice", {
    body: { session_id: session.id },
  });
  if (genErr || !gen?.documents?.length) {
    throw new Error(`generator: ${genErr?.message ?? gen?.error ?? "no documents"}`);
  }

  return {
    targetTable: "us_notice_sessions",
    targetId: session.id,
    label: `US Notice · CA + VA + TX (${gen.documents.length} docs)`,
    resultUrl: `/us-notices/result/${session.id}`,
  };
};

// ─── EU Notice ───────────────────────────────────────────────────────────────

const runEUNotice: Runner = async ({ userId, log }) => {
  const clientId = await getOrCreateClientId(userId);

  log("Creating eu_notice_session…");
  const { data: session, error: sessErr } = await supabase
    .from("eu_notice_sessions")
    .insert({
      client_id: clientId,
      status: "review",
      scope: "suite",
      mode: "standalone",
      payment_confirmed: true,
      paid_at: new Date().toISOString(),
    })
    .select("id")
    .single();
  if (sessErr || !session) throw new Error(`session: ${sessErr?.message}`);

  log("Inserting framework selections (EU + UK + CH)…");
  await supabase.from("eu_notice_framework_selections").insert([
    { session_id: session.id, framework_code: "EU_GDPR", framework_name: "EU GDPR", region: "EU" },
    { session_id: session.id, framework_code: "UK_GDPR", framework_name: "UK GDPR", region: "UK" },
    { session_id: session.id, framework_code: "CH_FADP", framework_name: "Swiss FADP", region: "CH" },
  ]);

  log("Inserting universal answers…");
  const universal: Record<string, unknown> = {
    controller_name: "Meridian Health Analytics Ltd",
    controller_address: "1 Innovation Square, London EC2A 4BX, UK",
    contact_email: "privacy@meridianhealth.io",
    dpo_details: "yes",
    dpo_name: "Dr. Sarah Chen, Privacy Officer",
    dpo_email: "privacy@meridianhealth.io",
    processing_purposes: ["service_delivery", "analytics", "marketing", "security", "legal_compliance"],
    data_categories: ["identifiers", "health_medical", "professional", "internet_activity"],
    lawful_basis: ["legitimate_interests", "contract", "legal_obligation", "consent"],
    third_party_recipients: ["service_providers", "analytics", "regulators"],
    transfer_outside_eea: "yes",
    transfer_safeguards: ["sccs", "uk_addendum"],
    retention_period: "Risk scores 24 months; HR records active+6yr; marketing 2yr.",
    automated_decisions: "yes",
    special_category_basis: "Article 9(2)(a) explicit consent for health data",
    supervisory_authority_eu: "Irish Data Protection Commission (DPC)",
    supervisory_authority_uk: "Information Commissioner's Office (ICO)",
  };
  await supabase.from("eu_notice_answers").insert(
    Object.entries(universal).map(([k, v]) => ({
      session_id: session.id,
      question_key: k,
      answer_value: v as never,
    })),
  );

  log("Invoking generate-eu-notice…");
  const { data: gen, error: genErr } = await supabase.functions.invoke("generate-eu-notice", {
    body: { session_id: session.id },
  });
  if (genErr || !gen?.documents?.length) {
    throw new Error(`generator: ${genErr?.message ?? gen?.error ?? "no documents"}`);
  }

  return {
    targetTable: "eu_notice_sessions",
    targetId: session.id,
    label: `EU/UK/CH Notice (${gen.documents.length} docs)`,
    resultUrl: `/eu-notices/result/${session.id}`,
  };
};

// ─── Registration ────────────────────────────────────────────────────────────

const REG_INTAKE = {
  organization_name: "Meridian Health Analytics Ltd",
  organization_country: "GB",
  organization_size: "medium",
  industry: "Healthcare / Life Sciences",
  email: "privacy@meridianhealth.io",
  employee_count: 180,
  annual_revenue_usd: 60_000_000,
  data_subjects_count: 250_000,
  role: "controller",
  processes_personal_data: true,
  processes_special_categories: true,
  processes_children_data: false,
  large_scale_monitoring: true,
  uses_ai_systems: true,
  ai_high_risk: true,
  ai_general_purpose_provider: false,
  cross_border_transfers: true,
  markets_served: ["GB", "DE", "FR", "IE", "NL"],
  has_eu_establishment: false,
  has_uk_establishment: true,
  acts_as_data_broker: false,
  sells_or_shares_personal_info: false,
  processes_biometrics_for_id: false,
};

const runRegistration: Runner = async ({ userId, log }) => {
  log("Invoking run-registration-assessment…");
  const { data: assess, error: assessErr } = await supabase.functions.invoke(
    "run-registration-assessment",
    { body: { intake_data: REG_INTAKE, user_id: userId } },
  );
  if (assessErr || !assess?.assessment_id) {
    throw new Error(`assessment: ${assessErr?.message ?? assess?.error}`);
  }
  const codes: string[] = (assess.recommended_jurisdictions || []).slice(0, 3);
  if (!codes.length) throw new Error("engine returned no jurisdictions");
  log(`Recommended (capped @3): ${codes.join(", ")}`);

  log("Creating registration_orders (tier=diy, paid)…");
  const { data: order, error: orderErr } = await supabase
    .from("registration_orders")
    .insert({
      user_id: userId,
      assessment_id: assess.assessment_id,
      tier: "diy",
      jurisdictions: codes,
      organization_snapshot: REG_INTAKE,
      amount_cents: 0,
      currency: "usd",
      payment_status: "paid",
      fulfillment_status: "generating",
      delivery_email: REG_INTAKE.email,
      renewal_reminders_enabled: false,
    })
    .select("id")
    .single();
  if (orderErr || !order) throw new Error(`order: ${orderErr?.message}`);

  log("Invoking generate-registration-docs (30–90s)…");
  const { error: genErr } = await supabase.functions.invoke("generate-registration-docs", {
    body: { order_id: order.id },
  });
  if (genErr) throw new Error(`generator: ${genErr.message}`);

  return {
    targetTable: "registration_orders",
    targetId: order.id,
    label: `Registration · ${codes.join("/")}`,
    resultUrl: `/registration/order/${order.id}`,
  };
};

// ─── CPPA Risk Assessment ────────────────────────────────────────────────────

const CPPA_RISK_INTAKE = {
  q1_revenue: "Over $500M",
  q2_consumers: "1–10 million",
  q3_sector: "Healthcare/Life Sciences",
  q4_pi_categories: [
    "Health or medical information",
    "Contact identifiers (name, email, phone)",
    "Device identifiers (IP, cookies, device IDs)",
    "Internet or network activity",
    "Employment information",
  ],
  q5_sell_share: "Both",
  q6_right_know: "Online form with identity verification",
  q7_right_delete: "Manual process, documented",
  q8_right_correct: "Handled via support",
  q9_opt_out: "Yes, but in footer only",
  q10_id_verification: "Informal verification",
  q11_policy_review: "12–24 months ago",
  q12_notice_at_collection: "Yes, partial coverage",
  q13_notice_content: "Some elements",
  q14_employee_notice: "No — we use our general privacy policy",
  q15_sensitive_pi: "Yes",
  q16_sensitive_limit: "No",
  q17_sensitive_basis: "Treatment, payment, and healthcare operations",
  q18_admt_use: "Yes",
  q19_admt_description: "ML model generates per-patient risk scores used by clinicians.",
  q20_admt_opt_out: "No",
  i1_processing_purpose: "Per-patient clinical-risk scores at point of care.",
  i2_retention_period: "60 months from encounter close",
  i2_retention_criteria: "Statutory retention requirement",
  i2_retention_detail: "California medical-record retention rules apply.",
  i3_ca_consumer_band: "More than 1,000,000",
  i4_disclosure_mechanisms: ["Notice at Collection", "Privacy policy", "Just-in-time notice"],
  i5_admt_logic: "Gradient-boosted ensemble; risk score 0–100 plus Low/Med/High bucket.",
  i5_admt_training_source: "De-identified historical encounters 2018–2024.",
  i5_admt_fairness_testing: "Quarterly subgroup AUC + calibration audit.",
  i5_admt_human_review: "Score advisory; attending physician decides.",
  i6_vendors: "Azure; Snowflake; Epic; Acme Analytics",
  i7_internal_contributors: "CISO; CPO; VP Clinical Informatics; GC; Product Owner",
  i7_external_consultees: "External healthcare-privacy counsel; bias auditor (annual)",
  i8_certifying_exec_name: "Dr. Alex Morgan",
  i8_certifying_exec_title: "Chief Privacy Officer",
  i9_has_existing_dpia: "No",
  i9_existing_dpia_summary: "",
};

async function pollCppa(id: string, log: (m: string) => void): Promise<void> {
  for (let i = 0; i < 120; i++) {
    await new Promise((r) => setTimeout(r, 4000));
    const { data } = await supabase
      .from("cppa_assessments")
      .select("status")
      .eq("id", id)
      .single();
    if (data?.status === "complete") return;
    if (data?.status === "error" || data?.status === "failed") {
      throw new Error(`cppa_assessments status=${data.status}`);
    }
    log(`… poll ${i + 1}/120 (status: ${data?.status ?? "?"})`);
  }
  throw new Error("timeout waiting for CPPA completion");
}

const runCppaRisk: Runner = async ({ userId, log }) => {
  log("Inserting cppa_assessments (risk_assessment)…");
  const { data: rec, error: insErr } = await supabase
    .from("cppa_assessments")
    .insert({
      user_id: userId,
      module: "risk_assessment",
      status: "pending",
      intake_data: CPPA_RISK_INTAKE,
    })
    .select("id")
    .single();
  if (insErr || !rec) throw new Error(`insert: ${insErr?.message}`);

  log(`Invoking run-cppa-risk-assessment (id ${rec.id})…`);
  const { error: fnErr } = await supabase.functions.invoke("run-cppa-risk-assessment", {
    body: { assessment_id: rec.id },
  });
  if (fnErr) log(`edge function: ${fnErr.message} — polling anyway`);

  await pollCppa(rec.id, log);
  return {
    targetTable: "cppa_assessments",
    targetId: rec.id,
    label: "Meridian · CPPA Risk Assessment",
    resultUrl: `/cppa-risk-assessment/result/${rec.id}`,
  };
};

// ─── CPPA Cybersecurity ──────────────────────────────────────────────────────

const CPPA_CYBER_INTAKE = {
  profile: {
    industry: "Healthcare/Life Sciences",
    incidents_12mo: "1",
    framework: "SOC 2",
    last_audit: "Within 12 months",
  },
  controls: [
    { key: "c1_auth", label: "Authentication and access controls", maturity: "Implemented across organisation", notes: "MFA enforced; RBAC configured." },
    { key: "c2_encryption", label: "Encryption of personal information", maturity: "Implemented with continuous monitoring", notes: "AES-256 at rest; TLS 1.3." },
    { key: "c3_zero_trust", label: "Zero-trust architecture", maturity: "Documented, partially implemented", notes: "Roadmap approved." },
    { key: "c4_account_mgmt", label: "Account management and access control", maturity: "Implemented across organisation", notes: "Automated provisioning via Entra ID." },
    { key: "c5_inventory", label: "Inventory of personal information and systems", maturity: "Ad hoc / informal", notes: "No formal data map." },
    { key: "c6_secure_config", label: "Secure configuration of hardware and software", maturity: "Documented, partially implemented", notes: "CIS benchmarks adopted." },
    { key: "c7_vuln_mgmt", label: "Vulnerability management and patching", maturity: "Implemented across organisation", notes: "Qualys weekly; critical patches in 48h." },
    { key: "c8_audit_logs", label: "Audit-log management", maturity: "Implemented across organisation", notes: "Sentinel SIEM; 12-month retention." },
    { key: "c9_network_mon", label: "Network monitoring and defence", maturity: "Implemented with continuous monitoring", notes: "24/7 SOC; IDS/IPS active." },
    { key: "c10_anti_malware", label: "Anti-malware protections", maturity: "Implemented across organisation", notes: "Defender for Endpoint." },
    { key: "c11_segmentation", label: "Network segmentation", maturity: "Documented, partially implemented", notes: "Prod health env segmented." },
    { key: "c12_physical", label: "Limitation of physical access", maturity: "Implemented across organisation", notes: "Azure only." },
    { key: "c13_secure_dev", label: "Secure development of software", maturity: "Ad hoc / informal", notes: "No formal SDLC security gates." },
    { key: "c14_third_party", label: "Oversight of service providers and third parties", maturity: "Documented, partially implemented", notes: "MSA + DPA in place." },
    { key: "c15_retention", label: "Retention schedules and secure disposal", maturity: "Ad hoc / informal", notes: "No formal retention schedule." },
    { key: "c16_training", label: "Cybersecurity awareness, education and training", maturity: "Implemented across organisation", notes: "Annual + quarterly phishing sims." },
    { key: "c17_incident", label: "Incident response and post-incident analysis", maturity: "Documented, partially implemented", notes: "Plan documented; one tabletop." },
    { key: "c18_continuity", label: "Business continuity and disaster recovery", maturity: "Documented, partially implemented", notes: "BCP not tested in 18mo." },
  ],
  industry_sector: "Healthcare/Life Sciences",
};

const runCppaCyber: Runner = async ({ userId, log }) => {
  log("Inserting cppa_assessments (cybersecurity)…");
  const { data: rec, error: insErr } = await supabase
    .from("cppa_assessments")
    .insert({
      user_id: userId,
      module: "cybersecurity",
      status: "pending",
      intake_data: CPPA_CYBER_INTAKE,
    })
    .select("id")
    .single();
  if (insErr || !rec) throw new Error(`insert: ${insErr?.message}`);

  log(`Invoking run-cppa-cybersecurity (id ${rec.id})…`);
  const { error: fnErr } = await supabase.functions.invoke("run-cppa-cybersecurity", {
    body: { assessment_id: rec.id },
  });
  if (fnErr) log(`edge function: ${fnErr.message} — polling anyway`);

  await pollCppa(rec.id, log);
  return {
    targetTable: "cppa_assessments",
    targetId: rec.id,
    label: "Meridian · CPPA Cybersecurity Audit",
    resultUrl: `/cppa-cybersecurity/result/${rec.id}`,
  };
};

// ─── Registry ────────────────────────────────────────────────────────────────

export interface ToolDef {
  id: ToolType;
  label: string;
  group: "Assessments" | "Documents" | "Briefing" | "CPPA" | "Notices" | "Registration";
  runner: Runner;
  /** Approximate generation time for user expectations. */
  expectedSeconds: number;
}

export const TOOLS: ToolDef[] = [
  { id: "lia",         label: "Legitimate Interest Assessment", group: "Assessments", runner: runLIA,        expectedSeconds: 60 },
  { id: "dpia",        label: "DPIA Framework",                 group: "Assessments", runner: runDPIA,       expectedSeconds: 70 },
  { id: "governance",  label: "Governance Assessment",          group: "Assessments", runner: runGovernance, expectedSeconds: 80 },
  { id: "biometric",   label: "Biometric Compliance",           group: "Assessments", runner: runBiometric,  expectedSeconds: 60 },
  { id: "dpa",         label: "DPA Generator",                  group: "Documents",   runner: runDPA,        expectedSeconds: 60 },
  { id: "ir-playbook", label: "IR Playbook",                    group: "Documents",   runner: runIRPlaybook, expectedSeconds: 60 },
  { id: "ropa",        label: "RoPA (Article 30) Builder",      group: "Documents",   runner: runRoPA,       expectedSeconds: 45 },
  { id: "us-notice",   label: "US Privacy Notice Builder",      group: "Notices",     runner: runUSNotice,   expectedSeconds: 30 },
  { id: "eu-notice",   label: "EU / Global Privacy Notice Builder", group: "Notices", runner: runEUNotice,   expectedSeconds: 30 },
  { id: "registration",label: "Registration Manager (DIY)",     group: "Registration",runner: runRegistration, expectedSeconds: 90 },
  { id: "cppa-risk",   label: "CPPA Risk Assessment (Module 1)",group: "CPPA",        runner: runCppaRisk,   expectedSeconds: 120 },
  { id: "cppa-cyber",  label: "CPPA Cybersecurity Audit (Module 2)", group: "CPPA",   runner: runCppaCyber,  expectedSeconds: 120 },
  { id: "brief",       label: "Intelligence Brief",             group: "Briefing",    runner: runBrief,      expectedSeconds: 90 },
];

export const TOOL_BY_ID: Record<ToolType, ToolDef> = Object.fromEntries(
  TOOLS.map((t) => [t.id, t]),
) as Record<ToolType, ToolDef>;
