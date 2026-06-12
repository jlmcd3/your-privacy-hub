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

// ─── Registry ────────────────────────────────────────────────────────────────

export interface ToolDef {
  id: ToolType;
  label: string;
  group: "Assessments" | "Documents" | "Briefing";
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
  { id: "brief",       label: "Intelligence Brief",             group: "Briefing",    runner: runBrief,      expectedSeconds: 90 },
];

export const TOOL_BY_ID: Record<ToolType, ToolDef> = Object.fromEntries(
  TOOLS.map((t) => [t.id, t]),
) as Record<ToolType, ToolDef>;
