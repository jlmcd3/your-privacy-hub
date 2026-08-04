// Admin page for generating sample reports with automatic PDF output.
// Flow per card: Generate Report + PDF → live generator runs (with polling to
// a true terminal status, including the 202/background DPA + IR generators) →
// save-sample-report:generate_pdf renders the canonical PDF via PDFShift →
// PDF is saved to the sample-reports bucket and listed at /samples/report-output,
// where it can be downloaded and deleted.
// Auth: the signed-in admin's JWT (user_roles.admin) — no shared token needed.

import { useEffect, useMemo, useRef, useState } from "react";
import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { SAMPLE_FIXTURES, type SampleFixture } from "@/lib/sampleFixtures";
import StressRunsSection from "@/components/admin/StressRunsSection";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;

type SampleRow = {
  id: string;
  tool_slug: string;
  variant: string;
  title: string;
  status: string;
  source_row_id: string | null;
  source_table: string | null;
  verification: Record<string, unknown> | null;
  pdf_path: string | null;
  updated_at: string;
};

type RunState = {
  status: "idle" | "running" | "complete" | "failed";
  phase: "" | "report" | "pdf";
  log: string[];
  sourceRowId: string | null;
  resultUrl: string | null;
  pdfSaved: boolean;
};

const EMPTY_RUN: RunState = { status: "idle", phase: "", log: [], sourceRowId: null, resultUrl: null, pdfSaved: false };

async function getOrCreatePersonalClient(userId: string): Promise<string> {
  const { data, error } = await supabase
    .from("clients")
    .select("id")
    .eq("owner_id", userId)
    .eq("is_active", true)
    .limit(1);
  if (error) throw error;
  if (!data?.length) throw new Error("No personal workspace client found for admin user");
  return data[0].id;
}

// Poll a table row until it reaches a terminal status. Returns the terminal status.
async function pollRowStatus(
  table: string,
  id: string,
  opts: { max: number; intervalMs: number; complete: string[]; failed: string[]; errorCol?: string },
  log: (msg: string) => void,
): Promise<void> {
  for (let i = 0; i < opts.max; i++) {
    await new Promise((r) => setTimeout(r, opts.intervalMs));
    const cols = opts.errorCol ? `status, ${opts.errorCol}` : "status";
    const { data } = await (supabase as any).from(table).select(cols).eq("id", id).maybeSingle();
    const status = data?.status as string | undefined;
    if (status && opts.complete.includes(status)) {
      log(`✅ status=${status} after ${i + 1} polls`);
      return;
    }
    if (status && opts.failed.includes(status)) {
      const detail = opts.errorCol ? data?.[opts.errorCol] : null;
      throw new Error(`generator status=${status}${detail ? `: ${detail}` : ""}`);
    }
    if (i % 5 === 0) log(`… poll ${i + 1}/${opts.max} (status=${status ?? "?"})`);
  }
  throw new Error("polling timed out");
}

async function runGenerator(
  fix: SampleFixture,
  userId: string,
  log: (msg: string) => void,
): Promise<{ sourceRowId: string; resultUrl: string }> {
  const f = fix.fixture as Record<string, unknown>;

  // -- LIA / DPIA / Governance / CPPA risk / CPPA cyber -------------------
  if (fix.tool_slug === "li_assessment" || fix.tool_slug === "dpia" ||
      fix.tool_slug === "governance" || fix.tool_slug === "cppa_risk" ||
      fix.tool_slug === "cppa_cyber" || fix.tool_slug === "cppa_admt") {
    const insert = { ...(f.insert as Record<string, unknown>), user_id: userId };
    const invoke = f.invoke as { fn: string; id_key: string };
    const poll = f.poll as { table: string; terminal: string[]; max: number; interval_ms: number };

    log(`▶ Insert into ${fix.source_table}...`);
    const { data: rec, error: insErr } = await (supabase as any).from(fix.source_table).insert(insert).select("id").single();
    if (insErr || !rec) throw new Error(`insert failed: ${insErr?.message}`);
    log(`✓ id=${rec.id}`);
    log(`▶ Invoking ${invoke.fn}...`);
    const { error: fnErr } = await supabase.functions.invoke(invoke.fn, { body: { [invoke.id_key]: rec.id } });
    if (fnErr) log(`⚠ fn error (polling anyway): ${fnErr.message}`);
    log(`▶ Polling ${poll.table} for completion...`);
    await pollRowStatus(
      poll.table,
      rec.id,
      {
        max: poll.max,
        intervalMs: poll.interval_ms,
        complete: ["complete"],
        failed: poll.terminal.filter((t) => t !== "complete"),
      },
      log,
    );
    return { sourceRowId: rec.id, resultUrl: fix.result_url_pattern.replace("{id}", rec.id) };
  }

  // -- DPA / IR (202 background dispatch) ----------------------------------
  // These functions return { id, status: "processing" } immediately and write
  // status complete|failed to the row in the background. We MUST poll to a
  // terminal status before the PDF step, or generate-report-pdf will 409.
  if (fix.tool_slug === "dpa" || fix.tool_slug === "ir_playbook") {
    const invoke = f.invoke as { fn: string };
    const body =
      fix.tool_slug === "ir_playbook" && f.invoke_body
        ? { ...(f.invoke_body as Record<string, unknown>), user_id: userId }
        : { ...((f.invoke_body_extras as Record<string, unknown>) ?? {}), user_id: userId };
    log(`▶ Invoking ${invoke.fn} (background dispatch)...`);
    const { data, error } = await supabase.functions.invoke(invoke.fn, { body });
    if (error || !data?.id) throw new Error(`generator: ${error?.message || data?.error || "no id"}`);
    log(`✓ accepted id=${data.id} — polling for completion`);
    const table = fix.tool_slug === "dpa" ? "dpa_documents" : "ir_playbooks";
    await pollRowStatus(
      table,
      data.id,
      { max: 90, intervalMs: 3000, complete: ["complete"], failed: ["failed", "error"] },
      log,
    );
    return { sourceRowId: data.id, resultUrl: fix.result_url_pattern.replace("{id}", data.id) };
  }

  // -- Biometric (synchronous single call) ---------------------------------
  if (fix.tool_slug === "biometric") {
    const invoke = f.invoke as { fn: string };
    const body = { ...((f.invoke_body_extras as Record<string, unknown>) ?? {}), user_id: userId };
    log(`▶ Invoking ${invoke.fn}...`);
    const { data, error } = await supabase.functions.invoke(invoke.fn, { body });
    if (error || !data?.id) throw new Error(`generator: ${error?.message || data?.error || "no id"}`);
    log(`✅ id=${data.id}`);
    return { sourceRowId: data.id, resultUrl: fix.result_url_pattern.replace("{id}", data.id) };
  }

  // -- Registration (synchronous single call) ------------------------------
  // run-registration-assessment persists to `registration_assessments` and
  // returns { assessment_id, shareable_token, ... }. The result route is
  // token-addressed (/registration-manager/result/:token), so the row id
  // drives source_row_id while the token drives the result URL.
  if (fix.tool_slug === "registration") {
    const body = { ...((f.invoke_body as Record<string, unknown>) ?? {}), user_id: userId };
    log("▶ Invoking run-registration-assessment...");
    const { data, error } = await supabase.functions.invoke("run-registration-assessment", { body });
    if (error || !data?.assessment_id) {
      throw new Error(`generator: ${error?.message || data?.error || "no assessment_id"}`);
    }
    log(`✅ id=${data.assessment_id} token=${data.shareable_token ?? "—"}`);
    return {
      sourceRowId: data.assessment_id,
      resultUrl: fix.result_url_pattern.replace("{id}", data.shareable_token ?? data.assessment_id),
    };
  }


  // -- RoPA --------------------------------------------------------------
  if (fix.tool_slug === "ropa") {
    const clientId = await getOrCreatePersonalClient(userId);
    log(`✓ client ${clientId}`);

    log("▶ Upsert ropa_client_profiles...");
    const { error: pErr } = await supabase.from("ropa_client_profiles").upsert(
      { client_id: clientId, ...(f.profile as Record<string, unknown>) },
      { onConflict: "client_id" },
    );
    if (pErr) throw new Error(`profile: ${pErr.message}`);

    log("▶ Create ropa_session...");
    const activities = f.activities as Array<Record<string, unknown>>;
    const { data: session, error: sErr } = await supabase
      .from("ropa_sessions")
      .insert({
        client_id: clientId,
        status: "review",
        version_number: 1,
        total_activities: activities.length,
        completed_activities: activities.length,
        payment_confirmed: true,
        paid_at: new Date().toISOString(),
        org_name: f.org_name as string,
      })
      .select("id")
      .single();
    if (sErr || !session) throw new Error(`session: ${sErr?.message}`);
    log(`✓ session ${session.id}`);

    log("▶ Upsert ropa_jurisdiction_selections...");
    const jurs = (f.jurisdictions as Array<{ code: string; name: string; region: string }>).map((j) => ({
      client_id: clientId,
      jurisdiction_code: j.code,
      jurisdiction_name: j.name,
      jurisdiction_region: j.region,
    }));
    const { error: jErr } = await (supabase as any)
      .from("ropa_jurisdiction_selections")
      .upsert(jurs, { onConflict: "client_id,jurisdiction_code" });
    if (jErr) throw new Error(`jurisdictions: ${jErr.message}`);

    log(`▶ Insert ${activities.length} activities + answers...`);
    const activityRows = activities.map((a, i) => ({
      session_id: session.id,
      client_id: clientId,
      display_name: a.activity_name as string,
      category: a.category as string,
      status: "complete" as const,
      completion_pct: 100,
      display_order: i,
    }));
    const { data: insertedActs, error: aErr } = await (supabase as any)
      .from("ropa_processing_activities")
      .insert(activityRows)
      .select("id, display_order");
    if (aErr || !insertedActs) throw new Error(`activities: ${aErr?.message}`);

    const answerRows: Array<{ activity_id: string; session_id: string; question_key: string; answer_value: unknown }> = [];
    for (const inserted of insertedActs) {
      const src = activities[inserted.display_order as number];
      const map: Record<string, unknown> = {
        purpose: src.purpose,
        lawful_basis: src.lawful_basis,
        special_category_basis: src.special_category_basis,
        data_subjects: src.data_subjects,
        data_categories: src.data_categories,
        recipients: src.recipients,
        processor_platform: src.recipients,
        transfer_destination: src.transfer_destination,
        transfer_mechanism: src.transfer_mechanism,
        retention_period: src.retention_period,
        retention_varies_by_category: src.retention_varies_by_category,
        retention_by_category: src.retention_by_category,
        security_measures: src.security_measures,
        access_controls: "Role-based access; quarterly access reviews; least-privilege enforced",
        activity_owner: src.activity_owner,
        collection_sources: src.collection_sources,
        processing_operations: src.processing_operations,
        related_assessments: src.related_assessments,
        rights_handling_override: src.rights_handling_override,
      };
      for (const [k, v] of Object.entries(map)) {
        if (v === undefined) continue;
        answerRows.push({ activity_id: inserted.id, session_id: session.id, question_key: k, answer_value: v });
      }
    }
    const { error: ansErr } = await (supabase as any).from("ropa_answers").insert(answerRows);
    if (ansErr) throw new Error(`answers: ${ansErr.message}`);

    log("▶ Invoking generate-ropa-document...");
    const { error: genErr } = await supabase.functions.invoke("generate-ropa-document", {
      body: {
        session_id: session.id,
        format: "pdf",
        document_date: new Date().toISOString().slice(0, 10),
        author_name: f.author_name as string,
        approved_by_name: (f.approved_by_name as string) ?? null,
        approved_by_title: (f.approved_by_title as string) ?? null,
        approval_date: (f.approval_date as string) ?? null,
        next_review_due: (f.next_review_due as string) ?? null,
      },
    });

    if (genErr) throw new Error(`gen: ${genErr.message}`);

    log("… polling ropa_sessions for generation to complete");
    await pollRowStatus(
      "ropa_sessions",
      session.id,
      { max: 60, intervalMs: 3000, complete: ["generated"], failed: ["failed"], errorCol: "generation_error" },
      log,
    );
    log("✅ pdf generated");

    const { data: ver } = await supabase
      .from("ropa_document_versions")
      .select("id")
      .eq("session_id", session.id)
      .eq("document_format", "pdf")
      .maybeSingle();
    return {
      sourceRowId: ver?.id ?? session.id,
      resultUrl: "/ropa/documents",
    };
  }

  // -- US / EU Notice (template generators) -------------------------------
  if (fix.tool_slug === "us_notice" || fix.tool_slug === "eu_notice") {
    const clientId = await getOrCreatePersonalClient(userId);
    log(`✓ client ${clientId}`);

    const sessionTable = fix.tool_slug === "us_notice" ? "us_notice_sessions" : "eu_notice_sessions";
    const selectionsTable = fix.tool_slug === "us_notice"
      ? "us_notice_state_selections" : "eu_notice_framework_selections";
    const answersTable = fix.tool_slug === "us_notice" ? "us_notice_answers" : "eu_notice_answers";
    const genFn = fix.tool_slug === "us_notice" ? "generate-us-notice" : "generate-eu-notice";

    log(`▶ Create ${sessionTable}...`);
    const session_init = {
      client_id: clientId,
      status: "review",
      payment_confirmed: true,
      paid_at: new Date().toISOString(),
      ...(f.session as Record<string, unknown>),
    };
    const { data: session, error: sErr } = await (supabase as any).from(sessionTable).insert(session_init).select("id").single();
    if (sErr || !session) throw new Error(`session: ${sErr?.message}`);
    log(`✓ session ${session.id}`);

    log("▶ Insert selections...");
    let selections: Array<Record<string, unknown>>;
    if (fix.tool_slug === "us_notice") {
      selections = (f.states as Array<{ name: string; code: string; framework: string }>).map((s) => ({
        session_id: session.id, state_code: s.code, state_name: s.name, framework_type: s.framework,
      }));
    } else {
      selections = (f.frameworks as Array<{ code: string; name: string; region: string }>).map((fw) => ({
        session_id: session.id, framework_code: fw.code, framework_name: fw.name, region: fw.region,
      }));
    }
    const { error: selErr } = await (supabase as any).from(selectionsTable).insert(selections);
    if (selErr) throw new Error(`selections: ${selErr.message}`);

    log("▶ Insert universal answers...");
    const universal = f.universal as Record<string, unknown>;
    const answerRows = Object.entries(universal).map(([k, v]) => ({
      session_id: session.id, question_key: k, answer_value: v,
    }));
    const { error: aErr } = await (supabase as any).from(answersTable).insert(answerRows);
    if (aErr) throw new Error(`answers: ${aErr.message}`);

    log(`▶ Invoking ${genFn}...`);
    const { data: gen, error: gErr } = await supabase.functions.invoke(genFn, { body: { session_id: session.id } });
    if (gErr) throw new Error(`gen: ${gErr.message}`);
    if (gen?.error) throw new Error(`gen: ${gen.error}`);

    // EU notice is 202/background; US notice is still synchronous.
    let docCount = 0;
    if (fix.tool_slug === "eu_notice") {
      log("▶ Polling eu_notice_sessions for terminal status...");
      await pollRowStatus(
        "eu_notice_sessions",
        session.id,
        { max: 60, intervalMs: 3000, complete: ["generated"], failed: ["failed"], errorCol: "generation_error" },
        log,
      );
      const { data: sessRow } = await (supabase as any)
        .from("eu_notice_sessions").select("version_number").eq("id", session.id).maybeSingle();
      const { data: docRows, error: docsErr } = await (supabase as any)
        .from("eu_notice_documents").select("id")
        .eq("session_id", session.id)
        .eq("version_number", sessRow?.version_number ?? 1);
      if (docsErr) throw new Error(`docs query: ${docsErr.message}`);
      docCount = docRows?.length ?? 0;
    } else {
      if (!gen?.documents?.length) throw new Error("gen: no documents");
      docCount = gen.documents.length;
    }
    log(`✅ ${docCount} document(s) generated`);

    return { sourceRowId: session.id, resultUrl: fix.result_url_pattern.replace("{id}", session.id) };
  }

  throw new Error(`unknown tool_slug ${fix.tool_slug}`);
}

// Calls save-sample-report with the signed-in admin's JWT only. No shared token.
async function callSaveSampleReport(action: string, payload: Record<string, unknown>) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) throw new Error("Not signed in — sign in as an admin first");
  const r = await fetch(`${SUPABASE_URL}/functions/v1/save-sample-report`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({ action, ...payload }),
  });
  const data = await r.json();
  if (!r.ok) throw new Error(data?.error || `HTTP ${r.status}`);
  return data;
}

export default function AdminSampleReports() {
  const { user } = useAuth();
  const [runs, setRuns] = useState<Record<string, RunState>>({});
  const [samples, setSamples] = useState<SampleRow[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [runningAll, setRunningAll] = useState(false);
  const cancelAll = useRef(false);

  const samplesByKey = useMemo(() => {
    const m: Record<string, SampleRow> = {};
    for (const s of samples) m[`${s.tool_slug}::${s.variant}`] = s;
    return m;
  }, [samples]);

  async function reloadSamples() {
    try {
      const { rows } = await callSaveSampleReport("list", {});
      setSamples(rows as SampleRow[]);
    } catch (e) {
      toast.error(`List failed: ${(e as Error).message}`);
    }
  }

  useEffect(() => { reloadSamples(); /* eslint-disable-next-line */ }, []);

  const setRun = (key: string, patch: Partial<RunState>) =>
    setRuns((r) => ({ ...r, [key]: { ...(r[key] ?? EMPTY_RUN), ...patch } }));
  const appendLog = (key: string, msg: string) =>
    setRuns((r) => {
      const cur = r[key] ?? EMPTY_RUN;
      return { ...r, [key]: { ...cur, log: [...cur.log, msg] } };
    });

  // Full pipeline for one fixture: live generator → auto PDF → saved sample.
  async function runPipeline(fix: SampleFixture): Promise<void> {
    if (!user) throw new Error("Sign in first");
    const key = `${fix.tool_slug}::${fix.variant}`;

    // Phase 1 — live generation (reuse an existing completed run for this card).
    let run = runs[key];
    let sourceRowId = run?.status === "complete" && run.sourceRowId ? run.sourceRowId : null;
    let resultUrl = sourceRowId ? run!.resultUrl : null;
    if (!sourceRowId) {
      setRun(key, { status: "running", phase: "report", log: [], sourceRowId: null, resultUrl: null, pdfSaved: false });
      appendLog(key, `▶ Generating ${fix.title} report…`);
      const out = await runGenerator(fix, user.id, (m) => appendLog(key, m));
      sourceRowId = out.sourceRowId;
      resultUrl = out.resultUrl;
      setRun(key, { sourceRowId, resultUrl });
    } else {
      setRun(key, { status: "running", phase: "pdf" });
      appendLog(key, "✓ Reusing existing completed run");
    }

    // Phase 2 — render + save the PDF (backend retries 409s while the row settles).
    setRun(key, { phase: "pdf" });
    appendLog(key, "▶ Rendering PDF via PDFShift…");
    const res = await callSaveSampleReport("generate_pdf", {
      tool_slug: fix.tool_slug,
      variant: fix.variant,
      title: fix.title,
      scenario_summary: fix.scenario_summary,
      fixture: fix.fixture,
      source_table: fix.source_table,
      source_row_id: sourceRowId,
    });
    appendLog(key, `✅ PDF saved (${res?.bytes ?? "?"} bytes) → /samples/report-output`);
    setRun(key, { status: "complete", phase: "", pdfSaved: true });
  }

  async function onGenerate(fix: SampleFixture) {
    const key = `${fix.tool_slug}::${fix.variant}`;
    setBusy(key);
    try {
      await runPipeline(fix);
      toast.success(`${fix.title} — PDF saved to /samples/report-output`);
      await reloadSamples();
    } catch (e) {
      appendLog(key, `❌ ${(e as Error).message}`);
      setRun(key, { status: "failed", phase: "" });
      toast.error(`${fix.title}: ${(e as Error).message}`);
    } finally { setBusy(null); }
  }

  // Force a fresh generation even if a completed run exists on the card.
  async function onRegenerate(fix: SampleFixture) {
    const key = `${fix.tool_slug}::${fix.variant}`;
    setRun(key, { ...EMPTY_RUN });
    setRuns((r) => ({ ...r, [key]: { ...EMPTY_RUN } }));
    await onGenerate(fix);
  }

  async function onGenerateAll() {
    if (!user) { toast.error("Sign in first"); return; }
    setRunningAll(true);
    cancelAll.current = false;
    let ok = 0, fail = 0;
    for (const fix of SAMPLE_FIXTURES) {
      if (cancelAll.current) break;
      const key = `${fix.tool_slug}::${fix.variant}`;
      setBusy(key);
      try {
        await runPipeline(fix);
        ok++;
      } catch (e) {
        appendLog(key, `❌ ${(e as Error).message}`);
        setRun(key, { status: "failed", phase: "" });
        fail++;
      }
    }
    setBusy(null);
    setRunningAll(false);
    await reloadSamples();
    toast[fail ? "warning" : "success"](`Generate All finished — ${ok} succeeded, ${fail} failed`);
  }

  async function onSaveSnapshot(fix: SampleFixture) {
    const key = `${fix.tool_slug}::${fix.variant}`;
    const run = runs[key];
    if (!run?.sourceRowId) { toast.error("Generate first"); return; }
    setBusy(`save::${key}`);
    try {
      await callSaveSampleReport("snapshot", {
        tool_slug: fix.tool_slug,
        variant: fix.variant,
        title: fix.title,
        scenario_summary: fix.scenario_summary,
        fixture: fix.fixture,
        source_table: fix.source_table,
        source_row_id: run.sourceRowId,
      });
      toast.success("Snapshot saved");
      await reloadSamples();
    } catch (e) {
      toast.error(`Snapshot failed: ${(e as Error).message}`);
    } finally { setBusy(null); }
  }

  async function onSetStatus(sample: SampleRow, status: string) {
    setBusy(`status::${sample.id}`);
    try {
      await callSaveSampleReport("set_status", { id: sample.id, status });
      toast.success(`Status → ${status}`);
      await reloadSamples();
    } catch (e) {
      toast.error(`Status change failed: ${(e as Error).message}`);
    } finally { setBusy(null); }
  }

  return (
    <div className="min-h-screen bg-brand-cloud flex flex-col">
      <Helmet><title>Admin — Sample Reports</title></Helmet>
      <Navbar />
      <main className="flex-1 max-w-6xl mx-auto w-full px-6 py-8 space-y-6">
        <header className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
          <div>
            <h1 className="font-serif text-3xl mb-1">Admin — Sample Reports</h1>
            <p className="text-sm text-muted-foreground max-w-2xl">
              One click per card: the live tool generates the report, the result is
              rendered to PDF via PDFShift, and the PDF is saved automatically.
              View, download, and delete everything at{" "}
              <Link to="/admin/samples/report-output" className="text-brand-teal-text underline underline-offset-2">
                /samples/report-output
              </Link>.
            </p>
          </div>
          <div className="flex gap-2 shrink-0">
            {runningAll ? (
              <Button variant="destructive" onClick={() => { cancelAll.current = true; }}>
                Stop after current
              </Button>
            ) : (
              <Button onClick={onGenerateAll} disabled={busy !== null}>
                Generate All (reports + PDFs)
              </Button>
            )}
            <Button variant="outline" asChild>
              <Link to="/admin/samples/report-output">Open PDF output</Link>
            </Button>
          </div>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {SAMPLE_FIXTURES.map((fix) => {
            const key = `${fix.tool_slug}::${fix.variant}`;
            const run = runs[key] ?? EMPTY_RUN;
            const sample = samplesByKey[key];
            const isBusy = busy === key;
            return (
              <div key={key} className="border rounded-lg bg-card p-4 space-y-3">
                <div>
                  <div className="text-xs font-mono text-muted-foreground">{fix.tool_slug} · {fix.variant}</div>
                  <h2 className="font-serif text-lg leading-tight">{fix.title}</h2>
                  <p className="text-xs text-muted-foreground mt-1">{fix.scenario_summary}</p>
                </div>

                <div className="text-xs font-mono flex flex-wrap gap-3">
                  <span>
                    Run: <strong>{run.status}</strong>
                    {run.status === "running" && run.phase ? ` (${run.phase})` : ""}
                  </span>
                  <span>PDF: <strong>{run.pdfSaved || sample?.pdf_path ? "saved" : "—"}</strong></span>
                  {sample && <span>Sample: <strong>{sample.status}</strong></span>}
                  {run.status === "running" && run.log.length > 0 && (
                    <span className="text-muted-foreground truncate max-w-full">
                      {run.log[run.log.length - 1]}
                    </span>
                  )}
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button size="sm" onClick={() => onGenerate(fix)} disabled={isBusy || runningAll}>
                    {isBusy
                      ? run.phase === "pdf" ? "Rendering PDF…" : "Generating report…"
                      : run.status === "complete" && !run.pdfSaved
                        ? "Render PDF"
                        : "Generate Report + PDF"}
                  </Button>
                  {run.status === "complete" && (
                    <Button size="sm" variant="outline" onClick={() => onRegenerate(fix)} disabled={isBusy || runningAll}>
                      Regenerate
                    </Button>
                  )}
                  {run.resultUrl && (
                    <Button size="sm" variant="outline" asChild>
                      <a href={run.resultUrl} target="_blank" rel="noreferrer">View result</a>
                    </Button>
                  )}
                </div>

                <details className="text-xs">
                  <summary className="cursor-pointer text-muted-foreground">Curation</summary>
                  <div className="flex flex-wrap items-center gap-2 pt-2">
                    <Button size="sm" variant="outline" onClick={() => onSaveSnapshot(fix)}
                      disabled={!run.sourceRowId || busy === `save::${key}`}>
                      {busy === `save::${key}` ? "Saving…" : "Snapshot data (for publishing)"}
                    </Button>
                    {sample && (
                      <select
                        className="text-xs border rounded px-2 py-1 bg-background"
                        value={sample.status}
                        onChange={(e) => onSetStatus(sample, e.target.value)}
                        disabled={busy === `status::${sample.id}`}
                      >
                        <option value="draft">draft</option>
                        <option value="approved">approved</option>
                        <option value="published">published</option>
                      </select>
                    )}
                    {sample?.pdf_path && <span className="font-mono text-muted-foreground">{sample.pdf_path}</span>}
                  </div>
                </details>

                {run.log.length > 0 && (
                  <details className="text-xs" open={run.status === "running"}>
                    <summary className="cursor-pointer">Log ({run.log.length})</summary>
                    <pre className="bg-black text-green-400 font-mono p-2 mt-1 rounded max-h-40 overflow-auto">
{run.log.join("\n")}
                    </pre>
                  </details>
                )}
              </div>
            );
          })}
        </div>
        <StressRunsSection />
      </main>
      <Footer />
    </div>
  );
}
