// Runners — each invokes the SAME production edge function the subscriber
// flow uses (no Stripe, no checkout — the admin already has access). On
// success, returns { targetTable, targetId, label, payload, pdfTargetId }
// so the ledger can record it and save-sample-report:generate_pdf can render
// the resulting source row to PDF.
//
// Fixtures live in ./fixtures.ts as 4 persona variants per tool. The runner
// calls `blend([...variants], anchorKeys)` which picks each field's value
// from a random variant while pinning org + sector + jurisdiction to one
// persona — producing coherent yet sector-mixed stress payloads.

import { supabase } from "@/integrations/supabase/client";
import type { ToolType } from "./ledger";
import {
  blend,
  pickOne,
  shortId,
  LIA_VARIANTS,
  DPIA_VARIANTS,
  GOV_VARIANTS,
  BIOMETRIC_VARIANTS,
  DPA_VARIANTS,
  IR_VARIANTS,
  ROPA_VARIANTS,
  US_NOTICE_VARIANTS,
  EU_NOTICE_VARIANTS,
  REG_VARIANTS,
  CPPA_RISK_VARIANTS,
  CPPA_CYBER_VARIANTS,
} from "./fixtures";
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
    | "dpia_framework";
  /** The exact blended payload sent to the edge function — stored for traceability. */
  payload: Record<string, unknown>;
  /** Row id to hand to save-sample-report:generate_pdf (defaults to targetId where unset). */
  pdfTargetId?: string;
}

export interface RunnerCtx {
  userId: string;
  log: (msg: string) => void;
}

export type Runner = (ctx: RunnerCtx) => Promise<RunnerResult>;

// ─── shared poller ───────────────────────────────────────────────────────────

async function pollStatus(
  table: "li_assessments" | "dpia_frameworks" | "governance_assessments" | "ropa_sessions" | "eu_notice_sessions" | "ir_playbooks" | "dpa_documents",
  id: string,
  maxPolls: number,
  intervalMs: number,
  log: (m: string) => void,
): Promise<void> {
  const successByTable: Record<string, string> = {
    li_assessments: "complete",
    dpia_frameworks: "complete",
    governance_assessments: "complete",
    ropa_sessions: "generated",
    eu_notice_sessions: "generated",
    ir_playbooks: "complete",
    dpa_documents: "complete",
  };
  const successStatus = successByTable[table];
  for (let i = 0; i < maxPolls; i++) {
    await new Promise((r) => setTimeout(r, intervalMs));
    const { data } = await supabase.from(table).select("status").eq("id", id).single();
    if (data?.status === successStatus) return;
    if (data?.status === "failed" || data?.status === "error") {
      throw new Error(`${table} status=${data.status}`);
    }
    log(`… poll ${i + 1}/${maxPolls} (status: ${data?.status ?? "?"})`);
  }
  throw new Error("timeout waiting for completion");
}


// ─── LIA ─────────────────────────────────────────────────────────────────────

const runLIA: Runner = async ({ userId, log }) => {
  const intake = blend(LIA_VARIANTS, ["sector", "organization_name", "jurisdictions"]);
  log(`Blended LIA fixture (org: ${intake.organization_name}, sector: ${intake.sector})`);
  log("Inserting li_assessments row…");
  const { data: rec, error: insErr } = await supabase
    .from("li_assessments")
    .insert({ ...intake, user_id: userId })
    .select("id")
    .single();
  if (insErr || !rec) throw new Error(`insert failed: ${insErr?.message}`);

  log(`Invoking run-li-assessment (id ${rec.id})…`);
  const { error: fnErr } = await supabase.functions.invoke("run-li-assessment", {
    body: { assessment_id: rec.id },
  });
  if (fnErr) log(`Async generation started (background worker); polling for completion…`);

  await pollStatus("li_assessments", rec.id, 75, 4000, log);
  return {
    targetTable: "li_assessments",
    targetId: rec.id,
    label: `LIA · ${intake.organization_name} · ${intake.sector} · ${shortId(rec.id)}`,
    resultUrl: `/li-assessment/result/${rec.id}`,
    pdfToolType: "li_assessment",
    payload: intake as Record<string, unknown>,
    pdfTargetId: rec.id,
  };
};

// ─── DPIA ────────────────────────────────────────────────────────────────────

const runDPIA: Runner = async ({ userId, log }) => {
  const intake = blend(DPIA_VARIANTS, ["sector", "processing_activity_name", "jurisdictions"]);
  log(`Blended DPIA fixture (sector anchor: ${intake.sector})`);
  log("Inserting dpia_frameworks row…");
  const { data: rec, error: insErr } = await supabase
    .from("dpia_frameworks")
    .insert({
      user_id: userId,
      status: "pending",
      intake_data: intake as never,
      is_subscriber_credit: true,
    })
    .select("id")
    .single();
  if (insErr || !rec) throw new Error(`insert failed: ${insErr?.message}`);

  log(`Invoking run-dpia-framework (id ${rec.id})…`);
  const { error: fnErr } = await supabase.functions.invoke("run-dpia-framework", {
    body: { dpia_id: rec.id },
  });
  if (fnErr) log(`Async generation started (background worker); polling for completion…`);

  await pollStatus("dpia_frameworks", rec.id, 90, 4000, log);
  return {
    targetTable: "dpia_frameworks",
    targetId: rec.id,
    label: `DPIA · ${intake.sector} · ${shortId(rec.id)}`,
    resultUrl: `/dpia-framework/result/${rec.id}`,
    pdfToolType: "dpia_framework",
    payload: intake as Record<string, unknown>,
    pdfTargetId: rec.id,
  };
};

// ─── Governance ──────────────────────────────────────────────────────────────

const runGovernance: Runner = async ({ userId, log }) => {
  const intake = blend(GOV_VARIANTS, ["sector", "jurisdictions"]);
  log(`Blended Governance fixture (sector anchor: ${intake.sector})`);
  log("Inserting governance_assessments row…");
  const { data: rec, error: insErr } = await supabase
    .from("governance_assessments")
    .insert({ user_id: userId, status: "pending", intake_data: intake as never })
    .select("id")
    .single();
  if (insErr || !rec) throw new Error(`insert failed: ${insErr?.message}`);

  log(`Invoking run-governance-assessment (id ${rec.id})…`);
  const { error: fnErr } = await supabase.functions.invoke("run-governance-assessment", {
    body: { assessment_id: rec.id },
  });
  if (fnErr) log(`Async generation started (background worker); polling for completion…`);

  await pollStatus("governance_assessments", rec.id, 75, 4000, log);
  return {
    targetTable: "governance_assessments",
    targetId: rec.id,
    label: `Governance · ${intake.sector} · ${shortId(rec.id)}`,
    resultUrl: `/governance-assessment/result/${rec.id}`,
    pdfToolType: "governance_assessment",
    payload: intake as Record<string, unknown>,
    pdfTargetId: rec.id,
  };
};

// ─── Biometric ───────────────────────────────────────────────────────────────

const runBiometric: Runner = async ({ userId, log }) => {
  const body = blend(BIOMETRIC_VARIANTS, ["biometricTypes", "jurisdictions"]);
  const primaryType = (body.biometricTypes as string[])?.[0] ?? "?";
  log(`Blended Biometric fixture (type anchor: ${primaryType})`);
  log("Invoking check-biometric-compliance…");
  const { data, error } = await supabase.functions.invoke("check-biometric-compliance", {
    body: { ...body, user_id: userId },
  });
  if (error || !data?.id) {
    throw new Error(error?.message || data?.error || "no id returned");
  }
  return {
    targetTable: "biometric_assessments",
    targetId: data.id,
    label: `Biometric · ${primaryType} · ${shortId(data.id)}`,
    resultUrl: `/biometric-checker/result/${data.id}`,
    pdfToolType: "biometric_checker",
    payload: body as Record<string, unknown>,
    pdfTargetId: data.id,
  };
};

// ─── DPA ─────────────────────────────────────────────────────────────────────

const runDPA: Runner = async ({ userId, log }) => {
  const body = blend(DPA_VARIANTS, ["controllerName", "processorName", "controllerJurisdiction", "processorJurisdiction"]);
  log(`Blended DPA fixture (parties anchor: ${body.controllerName} → ${body.processorName})`);
  log("Invoking generate-dpa…");
  const { data, error } = await supabase.functions.invoke("generate-dpa", {
    body: { ...body, user_id: userId },
  });
  if (error || !data?.id) {
    throw new Error(error?.message || data?.error || "no id returned");
  }
  log(`Async generation started (202); polling dpa_documents for completion…`);
  await pollStatus("dpa_documents", data.id, 60, 4000, log);
  return {
    targetTable: "dpa_documents",
    targetId: data.id,
    label: `DPA · ${body.controllerName} → ${body.processorName} · ${shortId(data.id)}`,
    resultUrl: `/dpa-generator/result/${data.id}`,
    pdfToolType: "dpa_generator",
    payload: body as Record<string, unknown>,
    pdfTargetId: data.id,
  };
};

// ─── IR Playbook ─────────────────────────────────────────────────────────────

const runIRPlaybook: Runner = async ({ userId, log }) => {
  const body = blend(IR_VARIANTS, ["organisationType", "jurisdictions"]);
  log(`Blended IR fixture (org-type anchor: ${body.organisationType})`);
  log("Invoking generate-ir-playbook…");
  const fullBody = { ...body, discoveryDateTime: new Date().toISOString(), user_id: userId };
  const { data, error } = await supabase.functions.invoke("generate-ir-playbook", {
    body: fullBody,
  });
  if (error || !data?.id) {
    throw new Error(error?.message || data?.error || "no id returned");
  }
  log(`Async generation started (202); polling ir_playbooks for completion…`);
  await pollStatus("ir_playbooks", data.id, 90, 4000, log);
  return {
    targetTable: "ir_playbooks",
    targetId: data.id,
    label: `IR · ${body.organisationType} · ${shortId(data.id)}`,
    resultUrl: `/ir-playbook/result/${data.id}`,
    pdfToolType: "ir_playbook",
    payload: fullBody as Record<string, unknown>,
    pdfTargetId: data.id,
  };
};

// ─── RoPA ────────────────────────────────────────────────────────────────────

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
  const persona = pickOne(ROPA_VARIANTS);
  log(`Picked RoPA persona: ${persona.org_name}`);
  const clientId = await getOrCreateClientId(userId);

  log("Upserting ropa_client_profiles…");
  await supabase.from("ropa_client_profiles").upsert(
    {
      client_id: clientId,
      legal_entity_type: persona.legal_entity_type,
      employee_band: persona.employee_band,
      is_controller: true,
      is_processor: false,
      dpo_name: persona.dpo_name,
      dpo_email: persona.dpo_email,
    },
    { onConflict: "client_id" },
  );

  log("Adding jurisdiction selections…");
  await supabase.from("ropa_jurisdiction_selections").upsert(
    persona.jurisdictions.map((j) => ({
      client_id: clientId,
      jurisdiction_code: j.code,
      jurisdiction_name: j.name,
      jurisdiction_region: j.region,
    })),
    { onConflict: "client_id,jurisdiction_code" },
  );

  log("Creating ropa_sessions row…");
  const { data: session, error: sessErr } = await supabase
    .from("ropa_sessions")
    .insert({
      client_id: clientId,
      status: "review",
      version_number: 1,
      total_activities: persona.activities.length,
      completed_activities: persona.activities.length,
      payment_confirmed: true,
      paid_at: new Date().toISOString(),
      org_name: persona.org_name,
    })
    .select("id")
    .single();
  if (sessErr || !session) throw new Error(`session: ${sessErr?.message}`);

  log(`Inserting ${persona.activities.length} processing activities…`);
  const { data: acts, error: actErr } = await supabase
    .from("ropa_processing_activities")
    .insert(
      persona.activities.map((a, i) => ({
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
    const src = persona.activities[a.display_order];
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
  const { error: genErr } = await supabase.functions.invoke("generate-ropa-document", {
    body: {
      session_id: session.id,
      format: "pdf",
      document_date: new Date().toISOString().slice(0, 10),
      author_name: `${persona.org_name} Compliance Team`,
    },
  });
  if (genErr) log(`Async generation started (background worker); polling for completion…`);

  await pollStatus("ropa_sessions", session.id, 45, 4000, log);

  const { data: ver } = await supabase
    .from("ropa_document_versions")
    .select("id, file_path, last_signed_url")
    .eq("session_id", session.id)
    .eq("document_format", "pdf")
    .eq("is_current", true)
    .maybeSingle();
  if (!ver?.id) throw new Error("generator: no ropa_document_versions row after polling");

  return {
    targetTable: "ropa_document_versions",
    targetId: session.id,
    label: `RoPA · ${persona.org_name} · ${shortId(session.id)}`,
    resultUrl: "/ropa/documents",
    payload: persona as unknown as Record<string, unknown>,
    pdfTargetId: ver.id,
  };
};


// ─── US Notice ───────────────────────────────────────────────────────────────

const runUSNotice: Runner = async ({ userId, log }) => {
  const universal = blend(US_NOTICE_VARIANTS, ["business_name"]);
  log(`Blended US Notice fixture (business anchor: ${universal.business_name})`);
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
    label: `US Notice · ${universal.business_name} · ${gen.documents.length} docs · ${shortId(session.id)}`,
    resultUrl: `/us-notices/result/${session.id}`,
    payload: universal as Record<string, unknown>,
    pdfTargetId: session.id,
  };
};

// ─── EU Notice ───────────────────────────────────────────────────────────────

const runEUNotice: Runner = async ({ userId, log }) => {
  const universal = blend(EU_NOTICE_VARIANTS, ["controller_name"]);
  log(`Blended EU Notice fixture (controller anchor: ${universal.controller_name})`);
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
  if (genErr || !gen?.session_id) {
    throw new Error(`generator: ${genErr?.message ?? gen?.error ?? "dispatch failed"}`);
  }

  log("Polling eu_notice_sessions for terminal status…");
  await pollStatus("eu_notice_sessions", session.id, 60, 4000, log);

  const { data: sessRow } = await supabase
    .from("eu_notice_sessions")
    .select("version_number")
    .eq("id", session.id)
    .maybeSingle();
  const { data: docs, error: docsErr } = await supabase
    .from("eu_notice_documents")
    .select("id")
    .eq("session_id", session.id)
    .eq("version_number", sessRow?.version_number ?? 1);
  if (docsErr) throw new Error(`docs query: ${docsErr.message}`);
  if (!docs?.length) throw new Error("generator: no documents found after polling");

  return {
    targetTable: "eu_notice_sessions",
    targetId: session.id,
    label: `EU/UK/CH Notice · ${universal.controller_name} · ${docs.length} docs · ${shortId(session.id)}`,
    resultUrl: `/eu-notices/result/${session.id}`,
    payload: universal as Record<string, unknown>,
    pdfTargetId: session.id,
  };
};

// ─── Registration ────────────────────────────────────────────────────────────

const runRegistration: Runner = async ({ userId, log }) => {
  const intake = blend(REG_VARIANTS, ["organization_name", "email", "sector"]);
  log(`Blended Registration fixture (org anchor: ${intake.organization_name})`);
  log("Invoking run-registration-assessment…");
  const { data: assess, error: assessErr } = await supabase.functions.invoke(
    "run-registration-assessment",
    { body: { intake_data: intake as never, user_id: userId } },
  );
  if (assessErr || !assess?.assessment_id) {
    throw new Error(`assessment: ${assessErr?.message ?? assess?.error}`);
  }
  const assessmentId: string = assess.assessment_id;
  const codes: string[] = (assess.recommended_jurisdictions || []).slice(0, 3);
  if (!codes.length) throw new Error("engine returned no jurisdictions");
  log(`Recommended (capped @3): ${codes.join(", ")}`);

  log("Creating registration_orders (tier=diy, paid)…");
  const { data: order, error: orderErr } = await supabase
    .from("registration_orders")
    .insert({
      user_id: userId,
      assessment_id: assessmentId,
      tier: "diy",
      jurisdictions: codes,
      organization_snapshot: intake,
      amount_cents: 0,
      currency: "usd",
      payment_status: "paid",
      fulfillment_status: "generating",
      delivery_email: intake.email,
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
    targetTable: "registration_assessments",
    targetId: order.id,
    label: `Registration · ${intake.organization_name} · ${codes.join("/")} · ${shortId(order.id)}`,
    resultUrl: `/registration/order/${order.id}`,
    payload: intake as Record<string, unknown>,
    pdfTargetId: assessmentId,
  };
};

// ─── CPPA Risk Assessment ────────────────────────────────────────────────────

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
  const intake = blend(CPPA_RISK_VARIANTS, ["q3_sector"]);
  log(`Blended CPPA Risk fixture (sector anchor: ${intake.q3_sector})`);
  log("Inserting cppa_assessments (risk_assessment)…");
  const { data: rec, error: insErr } = await supabase
    .from("cppa_assessments")
    .insert({
      user_id: userId,
      module: "risk_assessment",
      status: "pending",
      intake_data: intake as never,
    })
    .select("id")
    .single();
  if (insErr || !rec) throw new Error(`insert: ${insErr?.message}`);

  log(`Invoking run-cppa-risk-assessment-v2 (id ${rec.id})…`);
  const { error: fnErr } = await supabase.functions.invoke("run-cppa-risk-assessment-v2", {
    body: { assessment_id: rec.id },
  });
  if (fnErr) log(`Async generation started (background worker); polling for completion…`);

  await pollCppa(rec.id, log);
  return {
    targetTable: "cppa_assessments",
    targetId: rec.id,
    label: `CPPA Risk · ${intake.q3_sector} · ${shortId(rec.id)}`,
    resultUrl: `/cppa-risk-assessment/result/${rec.id}`,
    payload: intake as Record<string, unknown>,
    pdfTargetId: rec.id,
  };
};

// ─── CPPA Cybersecurity ──────────────────────────────────────────────────────

const runCppaCyber: Runner = async ({ userId, log }) => {
  const intake = pickOne(CPPA_CYBER_VARIANTS);
  log(`Picked CPPA Cyber persona: ${intake.industry_sector}`);
  log("Inserting cppa_assessments (cybersecurity)…");
  const { data: rec, error: insErr } = await supabase
    .from("cppa_assessments")
    .insert({
      user_id: userId,
      module: "cybersecurity",
      status: "pending",
      intake_data: intake as never,
    })
    .select("id")
    .single();
  if (insErr || !rec) throw new Error(`insert: ${insErr?.message}`);

  log(`Invoking run-cppa-cybersecurity (id ${rec.id})…`);
  const { error: fnErr } = await supabase.functions.invoke("run-cppa-cybersecurity", {
    body: { assessment_id: rec.id },
  });
  if (fnErr) log(`Async generation started (background worker); polling for completion…`);

  await pollCppa(rec.id, log);
  return {
    targetTable: "cppa_assessments",
    targetId: rec.id,
    label: `CPPA Cyber · ${intake.industry_sector} · ${shortId(rec.id)}`,
    resultUrl: `/cppa-cybersecurity/result/${rec.id}`,
    payload: intake as unknown as Record<string, unknown>,
    pdfTargetId: rec.id,
  };
};

// ─── CPPA ADMT ───────────────────────────────────────────────────────────────

const runCppaAdmt: Runner = async ({ userId, log }) => {
  const intake = {
    system_name: "Stress Test ADMT System",
    system_type: "ML model",
    system_description:
      "Automated loan scoring model that declines applications below threshold 40 without human review.",
    decision_domains: ["Financial or lending services (credit decisions, loans, accounts)"],
    human_review: "No — fully automated, no human review",
    training_data_use: "Yes",
    profiling_use: "No",
    notice_delivery: ["We have not yet provided a Pre-use Notice"],
    notice_has_specific_purpose: "No — uses generic language",
    notice_purpose_text: "",
    notice_has_opt_out_desc: "No",
    notice_has_access_desc: "No",
    notice_has_anti_retaliation: "No",
    notice_has_how_it_works: "No",
    notice_how_it_works_method: "",
    notice_has_alternative_process: "No",
    opt_out_exception: "No exception — we provide a full opt-out right",
    opt_out_methods: [] as string[],
    opt_out_link_title: "",
    opt_out_no_cookie_banner: "",
    opt_out_no_account_required: "",
    opt_out_confirmation_mechanism: "",
    opt_out_appeal_process: "",
    opt_out_fairness_doc: "",
    access_submission_methods: "Not yet defined",
    access_verification_process: "Not yet defined",
    access_logic_disclosure: "Not yet defined",
    access_outcome_disclosure: "Not yet defined",
    access_response_timeline: "Our process is not yet defined",
    access_trade_secret_policy: "",
  };
  log("Inserting cppa_assessments (admt)…");
  const { data: rec, error: insErr } = await supabase
    .from("cppa_assessments")
    .insert({
      user_id: userId,
      module: "admt",
      status: "pending",
      intake_data: intake as never,
    })
    .select("id")
    .single();
  if (insErr || !rec) throw new Error(`insert: ${insErr?.message}`);

  log(`Invoking run-admt-checker (id ${rec.id})…`);
  const { error: fnErr } = await supabase.functions.invoke("run-admt-checker", {
    body: { assessment_id: rec.id },
  });
  if (fnErr) log(`Async generation started (background worker); polling for completion…`);

  await pollCppa(rec.id, log);
  return {
    targetTable: "cppa_assessments",
    targetId: rec.id,
    label: `CPPA ADMT · ${shortId(rec.id)}`,
    resultUrl: `/cppa-admt-checker/result/${rec.id}`,
    payload: intake as unknown as Record<string, unknown>,
    pdfTargetId: rec.id,
  };
};

// ─── Registry ────────────────────────────────────────────────────────────────

export interface ToolDef {
  id: ToolType;
  label: string;
  group: "Assessments" | "Documents" | "CPPA" | "Notices" | "Registration";
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
  { id: "cppa-admt",   label: "ADMT Compliance Assessment (Module 3)", group: "CPPA",   runner: runCppaAdmt,   expectedSeconds: 60 },
];

export const TOOL_BY_ID: Record<ToolType, ToolDef> = Object.fromEntries(
  TOOLS.map((t) => [t.id, t]),
) as Record<ToolType, ToolDef>;

export const RUNNERS: Record<ToolType, Runner> = Object.fromEntries(
  TOOLS.map((t) => [t.id, t.runner]),
) as Record<ToolType, Runner>;
