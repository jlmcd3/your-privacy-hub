import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import Navbar from "@/components/Navbar";

/**
 * P2-5 verification harness.
 *
 * Runs LIA / DPIA / DPA generators against a fixed healthcare scenario and
 * asserts that the GDPR grounding wired in P2-5 actually fired:
 *   - report_data.gdpr_meta is persisted
 *   - matched_articles contains the canonical Art. for each generator
 *     (LIA → 6, DPIA → 35, DPA → 28)
 *   - jurisdiction is "eu" | "uk"
 *   - generator output text/citations reference the matched articles
 *   - enforcement_precedents array is present
 */

/* ---------------------------------------------------------------- */
/* LIA payload                                                       */
/* ---------------------------------------------------------------- */

const LIA_INSERT = {
  stage: "final" as const,
  status: "pending" as const,
  processing_description:
    "Meridian Health Analytics processes patient health records to provide predictive analytics to NHS and private clinic clients. Patient data is ingested from clinic EHR systems, processed using ML models to generate risk scores, and output reports are shared with treating clinicians.",
  relationship_type: "Existing patient (indirect — collected from clinic, not directly from patient)",
  data_categories: ["Health or medical data", "Contact details", "Device/technical data"],
  jurisdictions: ["EU (GDPR)", "United Kingdom (UK GDPR)"],
  sector: "Healthcare/Life Sciences",
  stated_purpose:
    "To identify patients at elevated risk of deterioration or readmission so that clinical teams can intervene earlier.",
  alternatives_considered:
    "Manual clinical review insufficient at scale; aggregate anonymised analytics lose individual prediction value; explicit consent operationally impractical at NHS scale.",
  purpose_details: {
    interest_holder: "Controller (Meridian Health Analytics) and treating clinicians",
    interest_type: "Clinical / public-interest health benefit",
    purpose_text:
      "To identify patients at elevated risk of deterioration or readmission.",
  },
  necessity_details: {
    alternatives: "See alternatives_considered.",
    why_consent_not_used: "Operationally impractical at NHS scale.",
    data_minimised: "Only fields required for risk scoring are ingested.",
    pseudonymisation_options: "Pseudonymisation applied during model inference.",
  },
  balancing_details: {
    reasonable_expectation:
      "Patients reasonably expect their records to be used for direct care.",
    vulnerable_subjects: ["Patients"],
    potential_harm: "Inappropriate disclosure of health data.",
    safeguards: ["Pseudonymisation", "Access restricted to treating clinicians", "Audit logging"],
    opt_out_mechanism: "Patients can opt out via the clinic.",
    special_category_data: true,
    employment_safeguards: "n/a",
    statutory_restrictions: "UK Common Law Duty of Confidentiality.",
    balancing_text:
      "Vulnerable group; clinical benefit; opt-out exists; access restricted; no marketing use.",
  },
  preview_signal: { test_run: true },
};

/* ---------------------------------------------------------------- */
/* DPIA payload                                                      */
/* ---------------------------------------------------------------- */

const DPIA_INTAKE = {
  processing_activity_name: "AI-Powered Patient Risk Stratification",
  description:
    "Automated processing of patient health records using ML models to generate individual readmission risk scores. Approximately 50,000 patients across 12 NHS clinic clients.",
  purpose:
    "Enable clinical teams to prioritise interventions for high-risk patients.",
  data_categories: ["Health or medical data", "Contact details", "Device/technical data"],
  data_subjects: "NHS and private clinic patients (vulnerable). ~50,000 individuals.",
  volume_frequency: "~50,000 patients, continuous ingestion.",
  retention: "Risk scores retained for 24 months; raw patient data not retained.",
  third_party_processors: ["Microsoft Azure (EU), Snowflake (EU)"],
  automated_decisions:
    "Yes — automated risk scores generated without human review; clinical decision remains with treating clinician.",
  existing_safeguards: [],
  jurisdictions: ["EU (GDPR)", "United Kingdom (UK GDPR)"],
  legal_basis_proposed:
    "Article 6(1)(f) + Article 9(2)(a) for special category data.",
  sector: "Healthcare/Life Sciences",
  source_assessment_id: null,
};

/* ---------------------------------------------------------------- */
/* DPA payload                                                       */
/* ---------------------------------------------------------------- */

const DPA_BODY = (userId: string) => ({
  controllerName: "Meridian Health Analytics Ltd",
  controllerJurisdiction: "United Kingdom",
  processorName: "CloudMed Processing GmbH",
  processorJurisdiction: "Germany",
  services:
    "Processing of patient health records on behalf of the Controller to provide AI-powered risk stratification analytics.",
  dataCategories: ["Health / medical data", "Employee / HR data"],
  dataSubjectCount: "approximately 50,000",
  retention: "Risk scores retained for 24 months; raw patient data not retained by Processor.",
  hasSubProcessors: true,
  subProcessorList: "Microsoft Azure (EU region); Snowflake Inc (EU region).",
  legalFramework: "GDPR (EU) and UK GDPR",
  auditRights: "annual third-party audit",
  includeTransferClause: true,
  transferMechanism: "EU Standard Contractual Clauses (2021/914)",
  user_id: userId,
});

/* ---------------------------------------------------------------- */
/* Assertions                                                        */
/* ---------------------------------------------------------------- */

type Assertion = { label: string; passed: boolean | null; detail?: string };

function liaAssertions(report: any): Assertion[] {
  const meta = report?.gdpr_meta;
  const precedents = report?.enforcement_precedents;
  const matched: string[] = meta?.matched_articles ?? [];
  return [
    { label: "report_data.gdpr_meta exists", passed: !!meta },
    { label: "gdpr_meta.attempted === true", passed: meta?.attempted === true },
    { label: "jurisdiction is 'eu' or 'uk'", passed: meta?.jurisdiction === "eu" || meta?.jurisdiction === "uk", detail: String(meta?.jurisdiction) },
    { label: "matched_articles includes '6'", passed: matched.includes("6"), detail: matched.join(",") },
    { label: "recitals_matched includes 47", passed: Array.isArray(meta?.recitals_matched) && meta.recitals_matched.includes(47), detail: (meta?.recitals_matched ?? []).join(",") },
    { label: "enforcement_precedents is an array", passed: Array.isArray(precedents) },
    { label: "three_part_test.overall_assessment present", passed: !!report?.three_part_test?.overall_assessment },
  ];
}

function dpiaAssertions(report: any): Assertion[] {
  const meta = report?.gdpr_meta;
  const matched: string[] = meta?.matched_articles ?? [];
  return [
    { label: "report_data.gdpr_meta exists", passed: !!meta },
    { label: "gdpr_meta.attempted === true", passed: meta?.attempted === true },
    { label: "jurisdiction is 'eu' or 'uk'", passed: meta?.jurisdiction === "eu" || meta?.jurisdiction === "uk", detail: String(meta?.jurisdiction) },
    { label: "matched_articles includes '35'", passed: matched.includes("35"), detail: matched.join(",") },
    { label: "matched_articles includes '36'", passed: matched.includes("36") },
    { label: "section_3_risks.risk_assessment ≥ 1", passed: Array.isArray(report?.section_3_risks?.risk_assessment) && report.section_3_risks.risk_assessment.length >= 1 },
    { label: "enforcement_precedents is an array", passed: Array.isArray(report?.enforcement_precedents) },
  ];
}

function dpaAssertions(dpaText: string, meta: any): Assertion[] {
  const matched: string[] = meta?.matched_articles ?? [];
  return [
    { label: "report_data.gdpr_meta exists", passed: !!meta },
    { label: "gdpr_meta.attempted === true", passed: meta?.attempted === true },
    { label: "matched_articles includes '28'", passed: matched.includes("28"), detail: matched.join(",") },
    { label: "matched_articles includes '32'", passed: matched.includes("32") },
    { label: "matched_articles includes '33'", passed: matched.includes("33") },
    { label: "Document cites Article 28", passed: /article\s*28|art\.?\s*28/i.test(dpaText) },
    { label: "Document cites Article 32", passed: /article\s*32|art\.?\s*32/i.test(dpaText) },
    { label: "Document length > 2000 chars", passed: dpaText.length > 2000 },
  ];
}

/* ---------------------------------------------------------------- */
/* Per-test runner                                                   */
/* ---------------------------------------------------------------- */

type RunState = {
  status: "idle" | "running" | "complete" | "failed";
  log: string[];
  elapsed: number;
  recordId: string | null;
  result: any;
  dpaText?: string;
  assertions: Assertion[];
};

const emptyRun: RunState = {
  status: "idle",
  log: [],
  elapsed: 0,
  recordId: null,
  result: null,
  assertions: [],
};

function Card({
  title,
  resultPath,
  state,
  onRun,
}: {
  title: string;
  resultPath: string | null;
  state: RunState;
  onRun: () => void;
}) {
  const pass = state.assertions.filter((a) => a.passed === true).length;
  const fail = state.assertions.filter((a) => a.passed === false).length;

  return (
    <div className="border rounded-lg bg-card p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="font-serif text-lg">{title}</h2>
        <button
          onClick={onRun}
          disabled={state.status === "running"}
          className="text-xs px-3 py-1.5 rounded bg-brand-teal text-white disabled:opacity-50"
        >
          {state.status === "running" ? "Running…" : state.status === "complete" ? "Re-run" : "Run"}
        </button>
      </div>

      <div className="font-mono text-xs">
        Status: <strong>{state.status.toUpperCase()}</strong>
        {state.status === "running" && ` — ${state.elapsed}s elapsed`}
        {state.status === "complete" && ` — ${pass}/${state.assertions.length} assertions passed`}
        {fail > 0 && state.status === "complete" && (
          <span className="text-red-600"> ({fail} failed)</span>
        )}
      </div>

      <div className="bg-black text-green-400 font-mono text-[11px] rounded p-2 max-h-40 overflow-auto">
        {state.log.length === 0 ? <div>Idle.</div> : state.log.map((l, i) => <div key={i}>{l}</div>)}
      </div>

      {state.assertions.length > 0 && (
        <ul className="text-xs space-y-0.5">
          {state.assertions.map((a, i) => (
            <li key={i} className="flex gap-1.5">
              <span>{a.passed === true ? "✅" : a.passed === false ? "❌" : "⏳"}</span>
              <span className="flex-1">
                {a.label}
                {a.detail && <span className="text-muted-foreground"> [{a.detail}]</span>}
              </span>
            </li>
          ))}
        </ul>
      )}

      {state.recordId && resultPath && (
        <a
          className="text-brand-teal underline text-xs"
          href={resultPath}
          target="_blank"
          rel="noreferrer"
        >
          Open result → {resultPath}
        </a>
      )}

      {(state.result || state.dpaText) && (
        <details className="text-xs">
          <summary className="cursor-pointer">gdpr_meta JSON</summary>
          <pre className="mt-2 overflow-auto bg-muted p-2 rounded text-[11px]">
{JSON.stringify(state.result?.gdpr_meta ?? null, null, 2)}
          </pre>
        </details>
      )}
    </div>
  );
}

/* ---------------------------------------------------------------- */
/* Page                                                              */
/* ---------------------------------------------------------------- */

export default function TestsGdprDocs() {
  const { user } = useAuth();
  const [lia, setLia] = useState<RunState>(emptyRun);
  const [dpia, setDpia] = useState<RunState>(emptyRun);
  const [dpa, setDpa] = useState<RunState>(emptyRun);

  const tick = (setter: (fn: (s: RunState) => RunState) => void, started: number) =>
    setInterval(
      () => setter((s) => (s.status === "running" ? { ...s, elapsed: Math.round((Date.now() - started) / 1000) } : s)),
      1000,
    );

  const addLog = (setter: (fn: (s: RunState) => RunState) => void, started: number) => (msg: string) => {
    const t = ((Date.now() - started) / 1000).toFixed(1);
    setter((s) => ({ ...s, log: [...s.log, `[${t}s] ${msg}`] }));
  };

  /* ---------------- LIA ---------------- */
  const runLia = useCallback(async () => {
    if (!user) return;
    const started = Date.now();
    setLia({ ...emptyRun, status: "running" });
    const log = addLog(setLia, started);
    const interval = tick(setLia, started);
    log("▶ Inserting li_assessments row…");

    const { data: rec, error: insErr } = await supabase
      .from("li_assessments")
      .insert({ ...LIA_INSERT, user_id: user.id })
      .select()
      .single();

    if (insErr || !rec) {
      log(`❌ insert failed: ${insErr?.message}`);
      clearInterval(interval);
      setLia((s) => ({ ...s, status: "failed" }));
      return;
    }
    setLia((s) => ({ ...s, recordId: rec.id }));
    log(`✓ id=${rec.id}. Invoking run-li-assessment…`);

    const { error: fnErr } = await supabase.functions.invoke("run-li-assessment", {
      body: { assessment_id: rec.id },
    });
    if (fnErr) log(`⚠️ fn error (will poll anyway): ${fnErr.message}`);

    let polls = 0;
    const poll = async () => {
      const { data } = await supabase.from("li_assessments").select("*").eq("id", rec.id).single();
      if (data?.status === "complete") {
        clearInterval(interval);
        log(`✅ complete (${Math.round((Date.now() - started) / 1000)}s)`);
        const report = data.report_data;
        setLia((s) => ({ ...s, status: "complete", result: report, assertions: liaAssertions(report) }));
      } else if (data?.status === "failed") {
        clearInterval(interval);
        log("❌ status=failed");
        setLia((s) => ({ ...s, status: "failed" }));
      } else if (polls++ < 40) {
        log(`… poll ${polls}/40 (${data?.status})`);
        setTimeout(poll, 4000);
      } else {
        clearInterval(interval);
        log("❌ timeout");
        setLia((s) => ({ ...s, status: "failed" }));
      }
    };
    setTimeout(poll, 6000);
  }, [user]);

  /* ---------------- DPIA ---------------- */
  const runDpia = useCallback(async () => {
    if (!user) return;
    const started = Date.now();
    setDpia({ ...emptyRun, status: "running" });
    const log = addLog(setDpia, started);
    const interval = tick(setDpia, started);
    log("▶ Inserting dpia_frameworks row…");

    const { data: rec, error: insErr } = await supabase
      .from("dpia_frameworks")
      .insert({
        user_id: user.id,
        status: "pending",
        intake_data: DPIA_INTAKE,
        is_subscriber_credit: true,
      })
      .select("id")
      .single();

    if (insErr || !rec) {
      log(`❌ insert failed: ${insErr?.message}`);
      clearInterval(interval);
      setDpia((s) => ({ ...s, status: "failed" }));
      return;
    }
    setDpia((s) => ({ ...s, recordId: rec.id }));
    log(`✓ id=${rec.id}. Invoking run-dpia-framework…`);

    const { error: fnErr } = await supabase.functions.invoke("run-dpia-framework", {
      body: { dpia_id: rec.id },
    });
    if (fnErr) log(`⚠️ fn error (will poll anyway): ${fnErr.message}`);

    let polls = 0;
    const poll = async () => {
      const { data } = await supabase.from("dpia_frameworks").select("*").eq("id", rec.id).single();
      if (data?.status === "complete") {
        clearInterval(interval);
        log(`✅ complete (${Math.round((Date.now() - started) / 1000)}s)`);
        const report = data.report_data;
        setDpia((s) => ({ ...s, status: "complete", result: report, assertions: dpiaAssertions(report) }));
      } else if (data?.status === "failed" || data?.status === "error") {
        clearInterval(interval);
        log(`❌ status=${data?.status}`);
        setDpia((s) => ({ ...s, status: "failed" }));
      } else if (polls++ < 90) {
        log(`… poll ${polls}/90 (${data?.status})`);
        setTimeout(poll, 4000);
      } else {
        clearInterval(interval);
        log("❌ timeout");
        setDpia((s) => ({ ...s, status: "failed" }));
      }
    };
    setTimeout(poll, 8000);
  }, [user]);

  /* ---------------- DPA ---------------- */
  const runDpa = useCallback(async () => {
    if (!user) return;
    const started = Date.now();
    setDpa({ ...emptyRun, status: "running" });
    const log = addLog(setDpa, started);
    const interval = tick(setDpa, started);
    log("▶ Invoking generate-dpa…");

    const { data, error } = await supabase.functions.invoke("generate-dpa", {
      body: DPA_BODY(user.id),
    });
    clearInterval(interval);

    if (error || !data?.dpa_text) {
      log(`❌ fn error: ${error?.message || data?.error || "no dpa_text"}`);
      setDpa((s) => ({ ...s, status: "failed" }));
      return;
    }
    log(`✅ complete (${Math.round((Date.now() - started) / 1000)}s) — ${data.dpa_text.length} chars`);
    if (data.id) log(`✓ stored dpa_documents.id=${data.id}`);

    // Re-fetch the row to read gdpr_meta from report_data (the fn response doesn't return it directly).
    let gdprMeta: any = null;
    if (data.id) {
      const { data: row } = await supabase.from("dpa_documents").select("report_data").eq("id", data.id).single();
      gdprMeta = (row?.report_data as any)?.gdpr_meta ?? null;
    }

    setDpa((s) => ({
      ...s,
      status: "complete",
      recordId: data.id ?? null,
      dpaText: data.dpa_text,
      result: { gdpr_meta: gdprMeta, dpa_text_preview: data.dpa_text.slice(0, 400) },
      assertions: dpaAssertions(data.dpa_text, gdprMeta),
    }));
  }, [user]);

  const runAll = () => {
    runLia();
    runDpia();
    runDpa();
  };

  return (
    <div className="min-h-screen bg-brand-cloud">
      <Navbar />
      <div className="max-w-6xl mx-auto px-6 py-8 space-y-6">
        <div>
          <h1 className="font-serif mb-1">🧪 P2-5 Verification — GDPR Grounding (LIA · DPIA · DPA)</h1>
          <p className="text-sm text-muted-foreground">
            Runs all three generators against the Meridian Health Analytics healthcare scenario and asserts
            that the deterministic-first + semantic-fallback GDPR grounding wired in P2-5 actually fired
            (gdpr_meta persisted; matched_articles contains the canonical statutory provisions for each
            generator).
          </p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={runAll}
            disabled={!user}
            className="text-sm px-4 py-2 rounded bg-brand-navy text-white disabled:opacity-50"
          >
            Run all three
          </button>
          {!user && <span className="text-xs text-muted-foreground self-center">Sign in to run tests.</span>}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Card
            title="LIA · run-li-assessment"
            resultPath={lia.recordId ? `/li-assessment/result/${lia.recordId}` : null}
            state={lia}
            onRun={runLia}
          />
          <Card
            title="DPIA · run-dpia-framework"
            resultPath={dpia.recordId ? `/dpia-framework/result/${dpia.recordId}` : null}
            state={dpia}
            onRun={runDpia}
          />
          <Card
            title="DPA · generate-dpa"
            resultPath={dpa.recordId ? `/dpa-generator/result/${dpa.recordId}` : null}
            state={dpa}
            onRun={runDpa}
          />
        </div>

        {dpa.dpaText && (
          <details className="border rounded-lg bg-card p-4">
            <summary className="cursor-pointer font-medium text-sm">DPA document text ({dpa.dpaText.length} chars)</summary>
            <pre className="text-[11px] whitespace-pre-wrap mt-3 max-h-[500px] overflow-auto">{dpa.dpaText}</pre>
          </details>
        )}
      </div>
    </div>
  );
}
