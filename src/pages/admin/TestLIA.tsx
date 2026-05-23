import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import Navbar from "@/components/Navbar";

const MOCK_INTAKE = {
  processing_description:
    "Meridian Health Analytics processes patient health records to provide predictive analytics to NHS and private clinic clients. Patient data is ingested from clinic EHR systems, processed using ML models to generate risk scores, and output reports are shared with treating clinicians. Patients have an existing treatment relationship with the clinic but did not specifically consent to secondary analytics processing by a third-party platform.",
  data_subject_relationship:
    "Existing patient (indirect — collected from clinic, not directly from patient)",
  data_categories: ["Health or medical data", "Contact details", "Device/technical data"],
  jurisdictions: ["EU (GDPR)", "United Kingdom (UK GDPR)"],
  purpose:
    "To identify patients at elevated risk of deterioration or readmission so that clinical teams can intervene earlier, improving health outcomes and reducing unplanned admissions.",
  necessity_alternatives:
    "Alternatives considered: (1) Manual clinical review — insufficient scale; (2) Aggregate anonymised analytics — loses individual prediction value; (3) Explicit consent model — operationally impractical at NHS scale. Analytics processing is necessary to provide the predictive function the clinic has contracted for.",
  balancing_factors:
    "Data subjects are patients — a vulnerable group with limited awareness that their records are processed by third-party analytics platforms. Processing is for their direct clinical benefit. Risk of harm from secondary use is low as output is restricted to treating clinicians only. No marketing or commercial secondary use. Opt-out mechanism exists via clinic.",
  sector: "Healthcare/Life Sciences",
};

const norm = (v: any) => (typeof v === "string" ? v.toLowerCase() : "");

const ASSERTIONS = [
  { label: "report_data.three_part_test exists", fn: (r: any) => !!r.three_part_test },
  { label: "purpose_test.verdict is present", fn: (r: any) => !!r.three_part_test?.purpose_test?.verdict },
  { label: "necessity_test.verdict is present", fn: (r: any) => !!r.three_part_test?.necessity_test?.verdict },
  { label: "balancing_test.verdict is present", fn: (r: any) => !!r.three_part_test?.balancing_test?.verdict },
  {
    label: "overall_assessment.argument_strength is present and valid",
    fn: (r: any) =>
      ["strong", "moderate", "weak", "insufficient", "uncertain"].includes(
        norm(r.three_part_test?.overall_assessment?.argument_strength)
      ),
  },
  {
    label: "overall_assessment.closest_accepted_precedent is a non-empty string",
    fn: (r: any) => {
      const v = r.three_part_test?.overall_assessment?.closest_accepted_precedent;
      return typeof v === "string" && v.trim().length > 0;
    },
  },
  {
    label: "documentation_recommendations.recommended_documentation has ≥1 item",
    fn: (r: any) =>
      Array.isArray(r.documentation_recommendations?.recommended_documentation) &&
      r.documentation_recommendations.recommended_documentation.length >= 1,
  },
  { label: "enforcement_precedents is an array", fn: (r: any) => Array.isArray(r.enforcement_precedents) },
  { label: "report_data.disclaimer is present", fn: (r: any) => typeof r.disclaimer === "string" && r.disclaimer.length > 10 },
];

export default function TestLIA() {
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
    addLog("▶ Starting Legitimate Interest Assessment test...");
    addLog("▶ Test company: Meridian Health Analytics Ltd");
    addLog(`▶ Logged in as: ${user.email}`);

    // Map user-friendly MOCK_INTAKE shape to the li_assessments table columns.
    const insertRow = {
      user_id: user.id,
      stage: "final",
      status: "pending",
      processing_description: MOCK_INTAKE.processing_description,
      relationship_type: MOCK_INTAKE.data_subject_relationship,
      data_categories: MOCK_INTAKE.data_categories,
      jurisdictions: MOCK_INTAKE.jurisdictions,
      sector: MOCK_INTAKE.sector,
      stated_purpose: MOCK_INTAKE.purpose,
      alternatives_considered: MOCK_INTAKE.necessity_alternatives,
      purpose_details: {
        interest_holder: "Controller (Meridian Health Analytics) and treating clinicians",
        interest_type: "Clinical / public-interest health benefit",
        purpose_text: MOCK_INTAKE.purpose,
      },
      necessity_details: {
        alternatives: MOCK_INTAKE.necessity_alternatives,
        why_consent_not_used:
          "Operationally impractical at NHS scale; risk of selection bias if only consenting patients included.",
        data_minimised: "Only fields required for risk scoring are ingested; identifiers tokenised in ML pipeline.",
        pseudonymisation_options: "Pseudonymisation applied during model inference; outputs re-linked only for treating clinicians.",
      },
      balancing_details: {
        reasonable_expectation:
          "Patients reasonably expect their records to be used for direct care; secondary processing by a third-party platform is less expected.",
        vulnerable_subjects: ["Patients"],
        potential_harm:
          "Inappropriate disclosure of health data; loss of trust if secondary use surfaces without notice.",
        safeguards: ["Pseudonymisation", "Access restricted to treating clinicians", "Contractual controls with clinics", "Audit logging"],
        opt_out_mechanism: "Patients can opt out via the clinic; opt-out flag suppresses ingestion.",
        special_category_data: true,
        employment_safeguards: "n/a",
        statutory_restrictions: "UK Common Law Duty of Confidentiality; NHS data-sharing requirements.",
        balancing_text: MOCK_INTAKE.balancing_factors,
      },
      preview_signal: { test_run: true },
    };

    const { data: rec, error: insErr } = await supabase
      .from("li_assessments")
      .insert(insertRow)
      .select()
      .single();

    if (insErr || !rec) {
      addLog(`❌ DB insert failed: ${insErr?.message}`);
      setStatus("failed");
      return;
    }
    setAssessmentId(rec.id);
    addLog(`✓ Record created: ${rec.id}`);
    addLog("▶ Invoking run-li-assessment (Haiku + 2× Sonnet — expect 30–70s)...");

    const { error: fnErr } = await supabase.functions.invoke("run-li-assessment", {
      body: { assessment_id: rec.id },
    });
    if (fnErr) {
      addLog(`❌ Edge function error: ${fnErr.message}`);
      setStatus("failed");
      return;
    }
    addLog("✓ Edge function returned. Polling for DB update...");

    let polls = 0;
    const poll = async () => {
      setElapsed(Math.round((Date.now() - startTime) / 1000));
      const { data } = await supabase.from("li_assessments").select("*").eq("id", rec.id).single();
      if (data?.status === "complete") {
        addLog(`✅ Complete after ${Math.round((Date.now() - startTime) / 1000)}s`);
        setResult(data.report_data);
        setStatus("complete");
      } else if (data?.status === "failed") {
        addLog("❌ Edge function set status to failed");
        setStatus("failed");
      } else if (polls++ < 30) {
        addLog(`... poll ${polls}/30 (status: ${data?.status})`);
        setTimeout(poll, 4000);
      } else {
        addLog("❌ Timed out (120s).");
        setStatus("failed");
      }
    };
    setTimeout(poll, 6000);
  }, [user, addLog, startTime]);

  useEffect(() => {
    if (user && status === "idle") runTest();
  }, [user, runTest, status]);

  const assertions = ASSERTIONS.map((a) => ({
    ...a,
    passed: result !== null ? a.fn(result) : null,
  }));
  const passCount = assertions.filter((a) => a.passed === true).length;
  const failCount = assertions.filter((a) => a.passed === false).length;

  const argStrength = result?.three_part_test?.overall_assessment?.argument_strength;

  return (
    <div className="min-h-screen bg-paper">
      <Navbar />
      <div className="max-w-5xl mx-auto px-6 py-8 space-y-6">
        <div>
          <h1 className="font-serif mb-2">🧪 TEST: Legitimate Interest Assessment</h1>
          <p className="text-sm text-muted-foreground">
            Meridian Health Analytics Ltd · Healthcare predictive analytics · EU+UK · Health data
          </p>
        </div>

        <div className="border rounded-lg p-4 bg-card">
          <div className="font-mono text-sm">
            Status: <strong>{status.toUpperCase()}</strong>
            {status === "running" && ` — ${elapsed}s elapsed`}
            {status === "complete" && ` — ${passCount}/${assertions.length} assertions passed`}
          </div>
        </div>

        {argStrength && (
          <div className="border rounded-lg p-6 bg-card">
            <div className="text-xs uppercase tracking-wide text-muted-foreground">Argument strength</div>
            <div className="font-serif text-4xl mt-1 capitalize">{argStrength}</div>
            {result?.three_part_test?.overall_assessment?.strength_basis && (
              <p className="text-sm text-muted-foreground mt-2">
                {result.three_part_test.overall_assessment.strength_basis}
              </p>
            )}
          </div>
        )}

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
                  href={`/li-assessment/result/${assessmentId}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  Open full result → /li-assessment/result/{assessmentId}
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
                Assessment ID: {assessmentId} — check Supabase logs for this ID.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
