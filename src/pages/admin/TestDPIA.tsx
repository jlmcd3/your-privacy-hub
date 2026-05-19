import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import Navbar from "@/components/Navbar";

const MOCK_INTAKE = {
  activity_name: "AI-Powered Patient Risk Stratification",
  activity_description:
    "Automated processing of patient health records using machine learning models to generate individual risk scores predicting hospital readmission within 30 days. Processing involves ingesting EHR data from clinic systems, applying trained models, and returning structured risk reports to treating clinicians. Processing is systematic and large-scale, covering approximately 50,000 patients across 12 NHS clinic clients.",
  purpose:
    "To enable clinical teams to prioritise interventions for high-risk patients, reducing unplanned admissions and improving patient outcomes. The analytics service is provided under contract to NHS and private clinic clients.",
  legal_basis:
    "Legitimate interests (Article 6(1)(f)) for the analytics processing; explicit consent (Article 9(2)(a)) for special category health data processing — obtained by the clinic at point of care.",
  data_categories: ["Health or medical data", "Contact details", "Device/technical data"],
  data_subjects:
    "NHS and private clinic patients — a vulnerable population. Estimated 50,000 individuals across 12 clinic clients.",
  data_volume:
    "Approximately 50,000 patients. Data is processed continuously as new records are ingested from clinic EHR systems.",
  retention:
    "Risk scores retained for 24 months. Raw patient data is not retained — only derived risk scores and model inputs are stored. Retention aligned with clinical governance requirements.",
  third_parties:
    "Microsoft Azure (cloud infrastructure, EU data centres), Snowflake (data warehouse, EU region), clinic EHR vendors via API.",
  automated_decisions:
    "Yes — automated risk scores are generated without human review. Clinicians receive the score and supporting factors; final clinical decision remains with the treating clinician. Not a fully automated decision within Article 22 scope.",
  jurisdictions: ["EU (GDPR)", "United Kingdom (UK GDPR)"],
  sector: "Healthcare/Life Sciences",
};

// Map MOCK_INTAKE to the shape the edge function expects (mirrors DPIAFramework.tsx buildIntake)
const intakePayload = {
  processing_activity_name: MOCK_INTAKE.activity_name,
  description: MOCK_INTAKE.activity_description,
  purpose: MOCK_INTAKE.purpose,
  data_categories: MOCK_INTAKE.data_categories,
  data_subjects: MOCK_INTAKE.data_subjects,
  volume_frequency: MOCK_INTAKE.data_volume,
  retention: MOCK_INTAKE.retention,
  third_party_processors: [MOCK_INTAKE.third_parties],
  automated_decisions: MOCK_INTAKE.automated_decisions,
  existing_safeguards: [],
  jurisdictions: MOCK_INTAKE.jurisdictions,
  legal_basis_proposed: MOCK_INTAKE.legal_basis,
  sector: MOCK_INTAKE.sector,
  source_assessment_id: null,
};

const ASSERTIONS: { label: string; fn: (r: any) => boolean }[] = [
  {
    label: "section_1_description present and non-empty",
    fn: (r) =>
      typeof r.section_1_description === "object" &&
      r.section_1_description !== null &&
      (typeof r.section_1_description.processing_nature === "string" ||
       typeof r.section_1_description.processing_purposes === "string"),
  },
  {
    label: "section_2_necessity exists",
    fn: (r) =>
      typeof r.section_2_necessity === "object" && r.section_2_necessity !== null,
  },
  {
    label: "section_3_risks.risk_assessment is array with ≥1 risk",
    fn: (r) =>
      typeof r.section_3_risks === "object" &&
      Array.isArray(r.section_3_risks?.risk_assessment) &&
      r.section_3_risks.risk_assessment.length >= 1,
  },
  {
    label: "section_4_mitigation.proposed_measures is array with ≥1 measure",
    fn: (r) =>
      typeof r.section_4_mitigation === "object" &&
      Array.isArray(r.section_4_mitigation?.proposed_measures) &&
      r.section_4_mitigation.proposed_measures.length >= 1,
  },
  {
    label: "section_5_consultation exists",
    fn: (r) =>
      typeof r.section_5_consultation === "object" && r.section_5_consultation !== null,
  },
  {
    label: "section_6_conclusion exists",
    fn: (r) =>
      typeof r.section_6_conclusion === "object" && r.section_6_conclusion !== null,
  },
  {
    label: "Every risk in section_3 has a risk_level or severity field",
    fn: (r) =>
      Array.isArray(r.section_3_risks?.risk_assessment) &&
      r.section_3_risks.risk_assessment.every(
        (risk: any) =>
          typeof risk.likelihood === "string" ||
          typeof risk.severity === "string" ||
          typeof risk.risk_level === "string"
      ),
  },
  {
    label: "section_6_conclusion or dpia_metadata contains supervisory_authority_consultation flag",
    fn: (r) =>
      r.section_6_conclusion?.supervisory_authority_consultation_required !== undefined ||
      r.dpia_metadata?.supervisory_authority_consultation_trigger !== undefined ||
      r.section_6_conclusion?.overall_dpia_outcome !== undefined,
  },
  {
    label: "enforcement_precedents array is present",
    fn: (r) => Array.isArray(r.enforcement_precedents),
  },
];

export default function TestDPIA() {
  const { user } = useAuth();
  const [status, setStatus] = useState<"idle" | "running" | "complete" | "failed">("idle");
  const [result, setResult] = useState<any>(null);
  const [log, setLog] = useState<string[]>([]);
  const [assessmentId, setAssessmentId] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [startTime] = useState(Date.now());

  const addLog = useCallback(
    (msg: string) => {
      const secs = ((Date.now() - startTime) / 1000).toFixed(1);
      setLog((prev) => [...prev, `[${secs}s] ${msg}`]);
    },
    [startTime]
  );

  const runTest = useCallback(async () => {
    if (!user) return;
    setStatus("running");
    addLog("▶ Starting Impact Assessment Builder test...");
    addLog("▶ Activity: AI-Powered Patient Risk Stratification (Meridian Health Analytics)");
    addLog(`▶ Logged in as: ${user.email}`);

    addLog("▶ Inserting dpia_frameworks record...");
    const { data: rec, error: insErr } = await supabase
      .from("dpia_frameworks")
      .insert({
        user_id: user.id,
        status: "pending",
        intake_data: intakePayload,
        is_subscriber_credit: true,
      })
      .select("id")
      .single();

    if (insErr || !rec) {
      addLog(`❌ DB insert failed: ${insErr?.message}`);
      setStatus("failed");
      return;
    }
    setAssessmentId(rec.id);
    addLog(`✓ Record created: ${rec.id}`);

    addLog("▶ Invoking run-dpia-framework (expect 30–90s)...");
    const { error: fnErr } = await supabase.functions.invoke("run-dpia-framework", {
      body: { dpia_id: rec.id },
    });

    if (fnErr) {
      addLog(`❌ Edge function error: ${fnErr.message}`);
      setStatus("failed");
      return;
    }
    addLog("✓ Edge function returned. Polling dpia_frameworks for completion...");

    let polls = 0;
    const poll = async () => {
      setElapsed(Math.round((Date.now() - startTime) / 1000));
      const { data } = await supabase.from("dpia_frameworks").select("*").eq("id", rec.id).single();
      if (data?.status === "complete") {
        addLog(`✅ Complete after ${Math.round((Date.now() - startTime) / 1000)}s`);
        setResult(data.report_data);
        setStatus("complete");
      } else if (data?.status === "failed" || data?.status === "error") {
        addLog(`❌ Edge function set status to ${data.status}`);
        setStatus("failed");
      } else if (polls++ < 40) {
        addLog(`... poll ${polls}/40 (status: ${data?.status})`);
        setTimeout(poll, 4000);
      } else {
        addLog("❌ Timed out (160s). Edge function may have exceeded Supabase timeout.");
        setStatus("failed");
      }
    };
    setTimeout(poll, 8000);
  }, [user, addLog, startTime]);

  useEffect(() => {
    if (user && status === "idle") runTest();
  }, [user, runTest, status]);

  const assertions = ASSERTIONS.map((a) => ({
    ...a,
    passed: result !== null ? (() => { try { return a.fn(result); } catch { return false; } })() : null,
  }));
  const passCount = assertions.filter((a) => a.passed === true).length;
  const failCount = assertions.filter((a) => a.passed === false).length;

  return (
    <div className="min-h-screen bg-paper">
      <Navbar />
      <div className="max-w-5xl mx-auto px-6 py-8 space-y-6">
        <div>
          <h1 className="font-serif mb-2">🧪 TEST: Impact Assessment Builder (DPIA)</h1>
          <p className="text-sm text-muted-foreground">
            Meridian Health Analytics · AI Patient Risk Stratification · EU+UK · Health data
          </p>
        </div>

        <div className="border rounded-lg p-4 bg-card">
          <div className="font-mono text-sm">
            Status: <strong>{status.toUpperCase()}</strong>
            {status === "running" && ` — ${elapsed}s elapsed`}
            {status === "complete" && ` — ${passCount}/${assertions.length} assertions passed`}
          </div>
        </div>

        <div className="border rounded-lg p-4 bg-black text-green-400 font-mono text-xs max-h-80 overflow-auto">
          {log.map((l, i) => (
            <div key={i}>{l}</div>
          ))}
          {status === "idle" && <div>Waiting for auth...</div>}
        </div>

        {result && (
          <>
            <div className="border rounded-lg p-4 bg-card">
              <h2 className="font-serif mb-3">
                Assertions ({passCount} pass / {failCount} fail)
              </h2>
              <ul className="space-y-1 text-sm">
                {assertions.map((a, i) => (
                  <li key={i} className="flex gap-2">
                    <span>{a.passed ? "✅" : "❌"}</span>
                    <span>{a.label}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="border rounded-lg p-4 bg-card">
              <h2 className="font-serif mb-2">Result Page</h2>
              {assessmentId && (
                <a
                  className="text-blue underline"
                  href={`/dpia-framework/result/${assessmentId}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  Open full result → /dpia-framework/result/{assessmentId}
                </a>
              )}
            </div>

            <details className="border rounded-lg p-4 bg-card">
              <summary className="cursor-pointer font-medium">Full JSON output</summary>
              <pre className="text-xs overflow-auto mt-3">{JSON.stringify(result, null, 2)}</pre>
            </details>
          </>
        )}

        {status === "failed" && !result && (
          <div className="border border-red-300 rounded-lg p-4 bg-red-50">
            <p className="font-medium text-red-900">Test failed. See log above for details.</p>
            {assessmentId && (
              <p className="text-xs font-mono mt-2">
                Record ID: {assessmentId} — check edge logs for run-dpia-framework.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
