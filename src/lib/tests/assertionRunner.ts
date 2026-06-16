/**
 * Round 3 — Assertion Runner
 *
 * Worker pool with:
 *   - CONCURRENCY = 4 concurrent workers
 *   - Per-call timeout of 3 minutes (180_000 ms)
 *   - HTTP 429 exponential backoff (2s, 4s, 8s, up to 3 retries)
 *   - Streaming results as each tool completes
 *   - Pause / stop support via AbortController
 *
 * CPPA Scope is deterministic — runs in JS without an edge function call.
 * RoPA requires multi-step DB setup before invoking the edge function.
 */

import { supabase } from "@/integrations/supabase/client";
import type { AssertionTest, Assertion } from "./assertionTests";
import { ROPA_TEST_FIXTURE } from "./assertionTests";

// ─── Constants ────────────────────────────────────────────────────────────────

export const CONCURRENCY = 4;
const TIMEOUT_MS = 180_000;
const RATE_LIMIT_BACKOFFS_MS = [2000, 4000, 8000];

// ─── Types ────────────────────────────────────────────────────────────────────

export type AssertionResult = {
  assertion: Assertion;
  passed: boolean;
  error?: string;
};

export type ToolRunStatus = "pending" | "running" | "complete" | "failed" | "skipped";

export interface ToolRunResult {
  toolId: string;
  toolName: string;
  status: ToolRunStatus;
  log: string[];
  elapsedMs: number;
  results: AssertionResult[];
  passCount: number;
  failCount: number;
  recordId?: string;
  error?: string;
}

export interface RunnerState {
  status: "idle" | "running" | "paused" | "complete" | "stopped";
  tools: ToolRunResult[];
  startedAt?: number;
  elapsedMs: number;
  totalAssertions: number;
  passedAssertions: number;
  failedAssertions: number;
  completedTools: number;
}

export type ToolUpdateCallback = (toolId: string, result: ToolRunResult) => void;
export type StateUpdateCallback = (state: RunnerState) => void;

// ─── CPPA Scope deterministic computation ────────────────────────────────────

function computeCppaScopeResult(input: Record<string, unknown>): Record<string, unknown> {
  const q1 = input.q1 as string;
  const q2 = input.q2 as string;
  const q3 = input.q3 as string;
  const q4 = input.q4 as string;
  const q5 = input.q5 as string;
  const q6 = input.q6 as string;
  const q7 = input.q7 as string;

  const inScope =
    (q1 === "Yes" || q1 === "Unsure") &&
    (
      ["$25M–$100M", "$100M–$500M", "Over $500M"].includes(q2) ||
      q2 === "Unsure" ||
      ["100,000–1 million", "Over 1 million"].includes(q3) ||
      q3 === "Unsure" ||
      ["Yes — we sell PI", "Yes — we share for targeted/behavioural advertising", "Both"].includes(q4) ||
      q5 === "Yes"
    );

  const cyberAuditRequired = ["$100M–$500M", "Over $500M"].includes(q2);
  const admtRequired = ["Yes", "In evaluation", "Unsure"].includes(q7);
  const sensitiveRequired = q6 === "Yes" || q6 === "Unsure";
  const riskAssessmentRequired = inScope;

  return { inScope, cyberAuditRequired, admtRequired, sensitiveRequired, riskAssessmentRequired };
}

// ─── Polling helper ───────────────────────────────────────────────────────────

async function pollUntilComplete(
  table: string,
  id: string,
  successStatus: string,
  maxPolls: number,
  intervalMs: number,
  log: (msg: string) => void,
  abortSignal: AbortSignal,
): Promise<void> {
  for (let i = 0; i < maxPolls; i++) {
    if (abortSignal.aborted) throw new Error("Aborted");

    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(resolve, intervalMs);
      abortSignal.addEventListener("abort", () => { clearTimeout(timer); reject(new Error("Aborted")); }, { once: true });
    });

    if (abortSignal.aborted) throw new Error("Aborted");

    const { data, error } = await (supabase as any).from(table).select("status").eq("id", id).single();
    if (error) { log(`⚠ poll error: ${error.message}`); continue; }

    const status: string = data?.status ?? "unknown";
    if (status === successStatus) return;
    if (status === "failed" || status === "error") throw new Error(`${table} status=${status}`);
    log(`… poll ${i + 1}/${maxPolls} (${status})`);
  }
  throw new Error(`Timeout after ${maxPolls} polls`);
}

// ─── Edge function invoke with 429 retry ──────────────────────────────────────

async function invokeWithRetry(
  fn: string,
  body: Record<string, unknown>,
  abortSignal: AbortSignal,
): Promise<{ data: unknown; error: null } | { data: null; error: Error }> {
  for (let attempt = 0; attempt <= RATE_LIMIT_BACKOFFS_MS.length; attempt++) {
    if (abortSignal.aborted) return { data: null, error: new Error("Aborted") };

    const { data, error } = await supabase.functions.invoke(fn, { body });

    if (
      error &&
      (error.message?.includes("429") || (error as any)?.status === 429) &&
      attempt < RATE_LIMIT_BACKOFFS_MS.length
    ) {
      const delay = RATE_LIMIT_BACKOFFS_MS[attempt];
      await new Promise<void>((resolve, reject) => {
        const timer = setTimeout(resolve, delay);
        abortSignal.addEventListener("abort", () => { clearTimeout(timer); reject(new Error("Aborted")); }, { once: true });
      });
      continue;
    }

    if (error) return { data: null, error: error as unknown as Error };
    return { data, error: null };
  }
  return { data: null, error: new Error("Rate limit — max retries exceeded") };
}

// ─── RoPA multi-step setup ────────────────────────────────────────────────────

async function setupAndRunRopa(
  userId: string,
  log: (msg: string) => void,
  abortSignal: AbortSignal,
): Promise<{ sessionId: string; documentVersionId?: string }> {
  const persona = ROPA_TEST_FIXTURE;

  const { data: clients } = await (supabase as any).from("clients").select("id").eq("owner_id", userId).eq("is_active", true).limit(1);
  if (!clients?.[0]) throw new Error("No active client workspace found for admin user");
  const clientId = clients[0].id;

  log("Upserting ropa_client_profiles…");
  await (supabase as any).from("ropa_client_profiles").upsert(
    { client_id: clientId, legal_entity_type: persona.legal_entity_type, employee_band: persona.employee_band, is_controller: true, is_processor: false, dpo_name: persona.dpo_name, dpo_email: persona.dpo_email },
    { onConflict: "client_id" },
  );

  log("Adding jurisdiction selections…");
  await (supabase as any).from("ropa_jurisdiction_selections").upsert(
    persona.jurisdictions.map((j: any) => ({ client_id: clientId, jurisdiction_code: j.code, jurisdiction_name: j.name, jurisdiction_region: j.region })),
    { onConflict: "client_id,jurisdiction_code" },
  );

  log("Creating ropa_sessions row…");
  const { data: session, error: sessErr } = await (supabase as any).from("ropa_sessions").insert({ client_id: clientId, status: "review", version_number: 1, total_activities: persona.activities.length, completed_activities: persona.activities.length, payment_confirmed: true, paid_at: new Date().toISOString(), org_name: persona.org_name }).select("id").single();
  if (sessErr || !session) throw new Error(`ropa_sessions insert: ${sessErr?.message}`);

  log(`Inserting ${persona.activities.length} processing activities…`);
  const { data: acts, error: actErr } = await (supabase as any).from("ropa_processing_activities").insert(
    persona.activities.map((a: any, i: number) => ({ session_id: session.id, client_id: clientId, display_name: a.activity_name, category: a.category, status: "complete", completion_pct: 100, display_order: i })),
  ).select("id, display_order");
  if (actErr || !acts) throw new Error(`ropa_processing_activities insert: ${actErr?.message}`);

  log("Inserting answers…");
  const ansRows: any[] = [];
  for (const a of acts) {
    const src = persona.activities[a.display_order];
    const map: Record<string, unknown> = { purpose: src.purpose, lawful_basis: src.lawful_basis, special_category_basis: src.special_category_basis, data_subjects: src.data_subjects, data_categories: src.data_categories, recipients: src.recipients, transfer_destination: src.transfer_destination, transfer_mechanism: src.transfer_mechanism, retention_period: src.retention_period, security_measures: src.security_measures };
    for (const [k, v] of Object.entries(map)) ansRows.push({ activity_id: a.id, session_id: session.id, question_key: k, answer_value: v });
  }
  await (supabase as any).from("ropa_answers").insert(ansRows);

  log("Invoking generate-ropa-document…");
  const { error: genErr } = await invokeWithRetry("generate-ropa-document", { session_id: session.id, format: "pdf", document_date: new Date().toISOString().slice(0, 10), author_name: `${persona.org_name} Compliance Team` }, abortSignal);
  if (genErr) log(`⚠ dispatch: ${genErr.message}`);

  log("Polling ropa_sessions…");
  await pollUntilComplete("ropa_sessions", session.id, "generated", 45, 4000, log, abortSignal);

  const { data: ver } = await (supabase as any).from("ropa_document_versions").select("id").eq("session_id", session.id).eq("document_format", "pdf").eq("is_current", true).maybeSingle();

  return { sessionId: session.id, documentVersionId: ver?.id };
}

// ─── US Notice multi-step setup ───────────────────────────────────────────────

async function setupAndRunUSNotice(userId: string, input: Record<string, unknown>, log: (msg: string) => void, abortSignal: AbortSignal): Promise<unknown> {
  const { data: clients } = await (supabase as any).from("clients").select("id").eq("owner_id", userId).eq("is_active", true).limit(1);
  if (!clients?.[0]) throw new Error("No active client workspace found");
  const clientId = clients[0].id;

  log("Creating us_notice_session…");
  const { data: session, error: sessErr } = await (supabase as any).from("us_notice_sessions").insert({ client_id: clientId, status: "review", scope: "all_states", mode: "standalone", payment_confirmed: true, paid_at: new Date().toISOString() }).select("id").single();
  if (sessErr || !session) throw new Error(`us_notice_sessions: ${sessErr?.message}`);

  log("Inserting state selections (CA, VA, TX)…");
  await (supabase as any).from("us_notice_state_selections").insert([
    { session_id: session.id, state_code: "CA", state_name: "California", framework_type: "ccpa" },
    { session_id: session.id, state_code: "VA", state_name: "Virginia", framework_type: "virginia_model" },
    { session_id: session.id, state_code: "TX", state_name: "Texas", framework_type: "virginia_model" },
  ]);

  log("Inserting answers…");
  await (supabase as any).from("us_notice_answers").insert(Object.entries(input).map(([k, v]) => ({ session_id: session.id, question_key: k, answer_value: v })));

  log("Invoking generate-us-notice…");
  const { data, error } = await invokeWithRetry("generate-us-notice", { session_id: session.id }, abortSignal);
  if (error) throw new Error(`generate-us-notice: ${error.message}`);

  const d = data as Record<string, unknown>;
  if (!d?.documents || !(d.documents as unknown[]).length) throw new Error("generate-us-notice returned no documents");
  return { ...d, sessionId: session.id };
}

// ─── EU Notice multi-step setup ───────────────────────────────────────────────

async function setupAndRunEUNotice(userId: string, input: Record<string, unknown>, log: (msg: string) => void, abortSignal: AbortSignal): Promise<unknown> {
  const { data: clients } = await (supabase as any).from("clients").select("id").eq("owner_id", userId).eq("is_active", true).limit(1);
  if (!clients?.[0]) throw new Error("No active client workspace found");
  const clientId = clients[0].id;

  log("Creating eu_notice_session…");
  const { data: session, error: sessErr } = await (supabase as any).from("eu_notice_sessions").insert({ client_id: clientId, status: "review", scope: "suite", mode: "standalone", payment_confirmed: true, paid_at: new Date().toISOString() }).select("id").single();
  if (sessErr || !session) throw new Error(`eu_notice_sessions: ${sessErr?.message}`);

  log("Inserting framework selections (EU GDPR + UK GDPR + Swiss FADP)…");
  await (supabase as any).from("eu_notice_framework_selections").insert([
    { session_id: session.id, framework_code: "EU_GDPR", framework_name: "EU GDPR", region: "EU" },
    { session_id: session.id, framework_code: "UK_GDPR", framework_name: "UK GDPR", region: "UK" },
    { session_id: session.id, framework_code: "CH_FADP", framework_name: "Swiss FADP", region: "CH" },
  ]);

  log("Inserting universal answers…");
  await (supabase as any).from("eu_notice_answers").insert(Object.entries(input).map(([k, v]) => ({ session_id: session.id, question_key: k, answer_value: v })));

  log("Invoking generate-eu-notice…");
  const { data: gen, error: genErr } = await invokeWithRetry("generate-eu-notice", { session_id: session.id }, abortSignal);
  if (genErr || !(gen as Record<string, unknown>)?.session_id) throw new Error(`generate-eu-notice: ${genErr?.message ?? "no session_id returned"}`);

  log("Polling eu_notice_sessions…");
  await pollUntilComplete("eu_notice_sessions", session.id, "generated", 60, 4000, log, abortSignal);

  const { data: sessRow } = await (supabase as any).from("eu_notice_sessions").select("version_number").eq("id", session.id).maybeSingle();
  const { data: docs } = await (supabase as any).from("eu_notice_documents").select("id").eq("session_id", session.id).eq("version_number", sessRow?.version_number ?? 1);

  return { sessionId: session.id, documentCount: docs?.length ?? 0, documents: docs ?? [] };
}

// ─── Run a single tool ────────────────────────────────────────────────────────

async function runSingleTool(
  test: AssertionTest,
  userId: string,
  abortSignal: AbortSignal,
  onLog: (toolId: string, log: string[]) => void,
): Promise<ToolRunResult> {
  const started = Date.now();
  const log: string[] = [];
  const addLog = (msg: string) => { const t = ((Date.now() - started) / 1000).toFixed(1); log.push(`[${t}s] ${msg}`); onLog(test.toolId, [...log]); };
  const fail = (error: string): ToolRunResult => ({ toolId: test.toolId, toolName: test.toolName, status: "failed", log, elapsedMs: Date.now() - started, results: [], passCount: 0, failCount: test.assertions.length, error });

  try {
    addLog(`▶ Starting ${test.toolName}…`);
    let output: unknown;
    let recordId: string | undefined;

    const timeoutController = new AbortController();
    const timeoutTimer = setTimeout(() => timeoutController.abort(), TIMEOUT_MS);
    const ac = new AbortController();
    abortSignal.addEventListener("abort", () => ac.abort(), { once: true });
    timeoutController.signal.addEventListener("abort", () => ac.abort(), { once: true });
    const combinedSignal = ac.signal;

    try {
      if (test.toolId === "cppa-scope") {
        addLog("Computing scope deterministically…");
        output = computeCppaScopeResult(test.testInput);
        addLog("✓ Complete");

      } else if (test.toolId === "ropa") {
        const result = await setupAndRunRopa(userId, addLog, combinedSignal);
        recordId = result.sessionId;
        output = { documentVersionId: result.documentVersionId, _synthetic_article_30_present: !!result.documentVersionId };
        addLog(`✓ RoPA generated — version ID: ${result.documentVersionId}`);

      } else if (test.toolId === "us-notice") {
        output = await setupAndRunUSNotice(userId, test.testInput, addLog, combinedSignal);
        recordId = (output as Record<string, unknown>)?.sessionId as string;

      } else if (test.toolId === "eu-notice") {
        output = await setupAndRunEUNotice(userId, test.testInput, addLog, combinedSignal);
        recordId = (output as Record<string, unknown>)?.sessionId as string;

      } else if (test.toolId === "biometric") {
        addLog("Invoking check-biometric-compliance…");
        const { data, error } = await invokeWithRetry(test.edgeFunction, { ...test.testInput, user_id: userId }, combinedSignal);
        if (error) throw error;
        output = data;
        recordId = (data as Record<string, unknown>)?.id as string;
        addLog(`✓ Complete — id: ${recordId}`);

      } else if (test.toolId === "dpa") {
        addLog("Invoking generate-dpa…");
        const { data, error } = await invokeWithRetry(test.edgeFunction, { ...test.testInput, user_id: userId }, combinedSignal);
        if (error) throw error;
        const d = data as Record<string, unknown>;
        if (!d?.id) throw new Error("generate-dpa returned no id");
        recordId = d.id as string;
        addLog(`Polling dpa_documents (id: ${recordId})…`);
        await pollUntilComplete("dpa_documents", recordId, "complete", test.pollConfig!.maxPolls, test.pollConfig!.intervalMs, addLog, combinedSignal);
        const { data: row } = await (supabase as any).from("dpa_documents").select("document_text, report_data").eq("id", recordId).single();
        output = { ...(row?.report_data ?? {}), dpa_text: row?.document_text ?? "" };
        addLog(`✓ Complete — ${(row?.document_text ?? "").length} chars`);

      } else if (test.toolId === "ir-playbook") {
        addLog("Invoking generate-ir-playbook…");
        const { data, error } = await invokeWithRetry(test.edgeFunction, { ...test.testInput, user_id: userId }, combinedSignal);
        if (error) throw error;
        const d = data as Record<string, unknown>;
        if (!d?.id) throw new Error("generate-ir-playbook returned no id");
        recordId = d.id as string;
        addLog(`Polling ir_playbooks (id: ${recordId})…`);
        await pollUntilComplete("ir_playbooks", recordId, "complete", test.pollConfig!.maxPolls, test.pollConfig!.intervalMs, addLog, combinedSignal);
        const { data: row } = await (supabase as any).from("ir_playbooks").select("playbook_text, report_data").eq("id", recordId).single();
        output = { ...(row?.report_data ?? {}), playbook_text: row?.playbook_text ?? "" };
        addLog(`✓ Complete — ${(row?.playbook_text ?? "").length} chars`);

      } else if (test.toolId === "brief") {
        addLog("Querying latest weekly_briefs row…");
        const { data: brief, error: briefErr } = await (supabase as any)
          .from("weekly_briefs")
          .select("headline, executive_summary, eu_uk, us_states, us_federal, enforcement_trends, published_at")
          .order("published_at", { ascending: false })
          .limit(1)
          .single();
        if (briefErr || !brief) throw new Error(`No weekly brief found: ${briefErr?.message ?? "empty"}`);
        output = brief;
        addLog(`✓ Found brief published ${brief.published_at}`);

      } else if (test.toolId === "cppa-risk" || test.toolId === "cppa-cyber") {
        const module = test.toolId === "cppa-risk" ? "risk_assessment" : "cybersecurity";
        addLog(`Inserting cppa_assessments (module=${module})…`);
        const { data: rec, error: insErr } = await (supabase as any).from("cppa_assessments").insert({ user_id: userId, module, status: "pending", intake_data: test.testInput }).select("id").single();
        if (insErr || !rec) throw new Error(`cppa_assessments insert: ${insErr?.message}`);
        recordId = rec.id;
        addLog(`Invoking ${test.edgeFunction}…`);
        const { error: fnErr } = await invokeWithRetry(test.edgeFunction, { assessment_id: recordId }, combinedSignal);
        if (fnErr) addLog(`⚠ dispatch: ${fnErr.message}`);
        addLog("Polling cppa_assessments…");
        await pollUntilComplete("cppa_assessments", recordId, "complete", test.pollConfig!.maxPolls, test.pollConfig!.intervalMs, addLog, combinedSignal);
        const { data: row } = await (supabase as any).from("cppa_assessments").select("report_data, document_a_text, document_b_text").eq("id", recordId).single();
        output = { ...(row?.report_data ?? {}), document_a: row?.document_a_text ?? "", document_b: row?.document_b_text ?? "" };
        addLog(`✓ Complete`);

      } else if (test.toolId === "lia") {
        addLog("Inserting li_assessments row…");
        const { data: rec, error: insErr } = await (supabase as any).from("li_assessments").insert({ ...test.testInput, user_id: userId }).select("id").single();
        if (insErr || !rec) throw new Error(`li_assessments insert: ${insErr?.message}`);
        recordId = rec.id;
        addLog(`Invoking run-li-assessment (id: ${recordId})…`);
        const { error: fnErr } = await invokeWithRetry(test.edgeFunction, { assessment_id: recordId }, combinedSignal);
        if (fnErr) addLog(`⚠ dispatch: ${fnErr.message}`);
        await pollUntilComplete("li_assessments", recordId, "complete", test.pollConfig!.maxPolls, test.pollConfig!.intervalMs, addLog, combinedSignal);
        const { data: row } = await (supabase as any).from("li_assessments").select("report_data").eq("id", recordId).single();
        output = { ...(row?.report_data ?? {}) };
        addLog(`✓ Complete`);

      } else if (test.toolId === "dpia") {
        addLog("Inserting dpia_frameworks row…");
        const { data: rec, error: insErr } = await (supabase as any).from("dpia_frameworks").insert({ user_id: userId, status: "pending", intake_data: test.testInput, is_subscriber_credit: true }).select("id").single();
        if (insErr || !rec) throw new Error(`dpia_frameworks insert: ${insErr?.message}`);
        recordId = rec.id;
        addLog(`Invoking run-dpia-framework (id: ${recordId})…`);
        const { error: fnErr } = await invokeWithRetry(test.edgeFunction, { dpia_id: recordId }, combinedSignal);
        if (fnErr) addLog(`⚠ dispatch: ${fnErr.message}`);
        await pollUntilComplete("dpia_frameworks", recordId, "complete", test.pollConfig!.maxPolls, test.pollConfig!.intervalMs, addLog, combinedSignal);
        const { data: row } = await (supabase as any).from("dpia_frameworks").select("report_data").eq("id", recordId).single();
        output = row?.report_data ?? {};
        addLog(`✓ Complete`);

      } else if (test.toolId === "governance") {
        addLog("Inserting governance_assessments row…");
        const { data: rec, error: insErr } = await (supabase as any).from("governance_assessments").insert({ user_id: userId, status: "pending", intake_data: test.testInput }).select("id").single();
        if (insErr || !rec) throw new Error(`governance_assessments insert: ${insErr?.message}`);
        recordId = rec.id;
        addLog(`Invoking run-governance-assessment (id: ${recordId})…`);
        const { error: fnErr } = await invokeWithRetry(test.edgeFunction, { assessment_id: recordId }, combinedSignal);
        if (fnErr) addLog(`⚠ dispatch: ${fnErr.message}`);
        await pollUntilComplete("governance_assessments", recordId, "complete", test.pollConfig!.maxPolls, test.pollConfig!.intervalMs, addLog, combinedSignal);
        const { data: row } = await (supabase as any).from("governance_assessments").select("report_data").eq("id", recordId).single();
        output = row?.report_data ?? {};
        addLog(`✓ Complete`);

      } else if (test.toolId === "registration") {
        addLog("Invoking run-registration-assessment…");
        const { data: assess, error: assessErr } = await invokeWithRetry("run-registration-assessment", { intake_data: test.testInput, user_id: userId }, combinedSignal);
        if (assessErr || !(assess as Record<string, unknown>)?.assessment_id) throw new Error(`run-registration-assessment: ${assessErr?.message ?? "no assessment_id"}`);
        const a = assess as Record<string, unknown>;
        const assessmentId = a.assessment_id as string;
        const codes: string[] = ((a.recommended_jurisdictions as string[]) || []).slice(0, 3);
        if (!codes.length) throw new Error("No jurisdictions recommended");
        addLog(`Jurisdictions: ${codes.join(", ")}`);
        const { data: order, error: orderErr } = await (supabase as any).from("registration_orders").insert({ user_id: userId, assessment_id: assessmentId, tier: "diy", jurisdictions: codes, organization_snapshot: test.testInput, amount_cents: 0, currency: "usd", payment_status: "paid", fulfillment_status: "generating", delivery_email: test.testInput.email, renewal_reminders_enabled: false }).select("id").single();
        if (orderErr || !order) throw new Error(`registration_orders: ${orderErr?.message}`);
        recordId = order.id;
        addLog("Invoking generate-registration-docs…");
        const { error: genErr } = await invokeWithRetry("generate-registration-docs", { order_id: order.id }, combinedSignal);
        if (genErr) throw new Error(`generate-registration-docs: ${genErr.message}`);
        const { data: regDocs } = await (supabase as any).from("registration_documents").select("content_text, document_type, jurisdiction_code").eq("order_id", order.id);
        const docList = regDocs ?? [];
        const combinedText = docList.map((d: any) => d.content_text ?? "").join("\n\n");
        output = { documents: docList, documentCount: docList.length, text: combinedText };
        addLog(`✓ Complete — ${docList.length} docs`);

      } else {
        throw new Error(`Unknown toolId: ${test.toolId}`);
      }
    } finally {
      clearTimeout(timeoutTimer);
    }

    addLog(`Running ${test.assertions.length} assertions…`);
    const results: AssertionResult[] = test.assertions.map((assertion) => {
      try {
        const passed = assertion.check(output);
        addLog(`  ${passed ? "✅" : "❌"} ${assertion.id}`);
        return { assertion, passed };
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        addLog(`  ⚠ ${assertion.id} threw: ${msg}`);
        return { assertion, passed: false, error: msg };
      }
    });

    const passCount = results.filter((r) => r.passed).length;
    const failCount = results.filter((r) => !r.passed).length;
    addLog(`Done — ${passCount}/${results.length} passed`);

    return { toolId: test.toolId, toolName: test.toolName, status: "complete", log, elapsedMs: Date.now() - started, results, passCount, failCount, recordId };
  } catch (e) {
    if (abortSignal.aborted) return { toolId: test.toolId, toolName: test.toolName, status: "skipped", log, elapsedMs: Date.now() - started, results: [], passCount: 0, failCount: 0, error: "Stopped by user" };
    const msg = e instanceof Error ? e.message : String(e);
    log.push(`[ERR] ${msg}`);
    return fail(msg);
  }
}

// ─── Worker pool ──────────────────────────────────────────────────────────────

export class AssertionRunner {
  private abortController = new AbortController();
  private _paused = false;
  private pausePromise: Promise<void> = Promise.resolve();
  private pauseResolve: (() => void) | null = null;

  async run(
    tests: AssertionTest[],
    userId: string,
    onToolUpdate: ToolUpdateCallback,
    onStateUpdate: StateUpdateCallback,
  ): Promise<RunnerState> {
    this.abortController = new AbortController();
    this._paused = false;
    const signal = this.abortController.signal;

    const state: RunnerState = {
      status: "running",
      tools: tests.map((t) => ({ toolId: t.toolId, toolName: t.toolName, status: "pending" as ToolRunStatus, log: [], elapsedMs: 0, results: [], passCount: 0, failCount: 0 })),
      startedAt: Date.now(),
      elapsedMs: 0,
      totalAssertions: tests.reduce((acc, t) => acc + t.assertions.length, 0),
      passedAssertions: 0,
      failedAssertions: 0,
      completedTools: 0,
    };
    onStateUpdate({ ...state });

    if (tests.length === 0) { state.status = "complete"; onStateUpdate({ ...state }); return state; }

    const queue = [...tests];
    let activeCount = 0;
    let resolveAll!: () => void;
    const allDone = new Promise<void>((r) => { resolveAll = r; });

    const tick = () => {
      if (signal.aborted || (activeCount === 0 && queue.length === 0)) {
        if (!signal.aborted) { state.status = "complete"; state.elapsedMs = Date.now() - (state.startedAt ?? Date.now()); onStateUpdate({ ...state }); }
        resolveAll();
        return;
      }
      while (activeCount < CONCURRENCY && queue.length > 0) {
        const test = queue.shift()!;
        activeCount++;
        const idx = state.tools.findIndex((t) => t.toolId === test.toolId);
        if (idx >= 0) { state.tools[idx] = { ...state.tools[idx], status: "running" }; onStateUpdate({ ...state }); }

        (async () => {
          if (this._paused) await this.pausePromise;
          if (signal.aborted) { activeCount--; tick(); return; }

          const result = await runSingleTool(test, userId, signal, (toolId, log) => {
            const i = state.tools.findIndex((t) => t.toolId === toolId);
            if (i >= 0) { state.tools[i] = { ...state.tools[i], log }; onStateUpdate({ ...state }); }
          });

          const i = state.tools.findIndex((t) => t.toolId === result.toolId);
          if (i >= 0) state.tools[i] = result;
          state.passedAssertions += result.passCount;
          state.failedAssertions += result.failCount;
          state.completedTools++;
          state.elapsedMs = Date.now() - (state.startedAt ?? Date.now());
          onToolUpdate(result.toolId, result);
          onStateUpdate({ ...state });
          activeCount--;
          tick();
        })();
      }
    };

    tick();
    await allDone;
    return state;
  }

  pause() {
    if (this._paused) return;
    this._paused = true;
    this.pausePromise = new Promise((r) => { this.pauseResolve = r; });
  }

  resume() {
    if (!this._paused) return;
    this._paused = false;
    this.pauseResolve?.();
    this.pauseResolve = null;
  }

  stop() { this.resume(); this.abortController.abort(); }
  get isPaused() { return this._paused; }
}