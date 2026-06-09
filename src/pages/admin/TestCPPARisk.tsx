import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import Navbar from "@/components/Navbar";
import { useTestRunnerBridge } from "@/hooks/useTestRunnerBridge";

const MOCK_INTAKE = {
  // Legacy step 1-5
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
  q19_admt_description:
    "ML model generates individual patient risk scores used by clinicians. Scores influence clinical prioritisation decisions.",
  q20_admt_opt_out: "No",
  // v3 additions (I-1 through I-9)
  i1_processing_purpose:
    "To generate per-patient clinical-risk scores from 24 months of encounter, lab, and medication data, surfaced to attending clinicians at the point of care to prioritise outreach for patients at elevated risk of 30-day readmission.",
  i2_retention_period: "60 months from encounter close",
  i2_retention_criteria: "Statutory or regulatory retention requirement",
  i2_retention_detail: "California medical-record retention rules apply; rolling deletion after 60 months.",
  i3_ca_consumer_band: "More than 1,000,000",
  i4_disclosure_mechanisms: ["Notice at Collection", "Privacy policy", "Just-in-time notice"],
  i5_admt_logic: "Gradient-boosted ensemble; outputs a risk score 0–100 plus a categorical bucket Low/Med/High.",
  i5_admt_training_source: "De-identified historical encounter data 2018–2024 across 14 affiliated facilities.",
  i5_admt_fairness_testing: "Quarterly subgroup AUC + calibration audit across race, ethnicity, language, payer.",
  i5_admt_human_review: "Score is advisory; treatment decisions require attending physician review and documentation.",
  i6_vendors: "Azure (cloud hosting); Snowflake (data warehouse); Epic (EHR integration); Acme Analytics (model monitoring)",
  i7_internal_contributors: "CISO; Chief Privacy Officer; VP Clinical Informatics; General Counsel; Product Owner",
  i7_external_consultees: "External healthcare-privacy counsel; independent bias auditor (annual)",
  i8_certifying_exec_name: "Dr. Alex Morgan",
  i8_certifying_exec_title: "Chief Privacy Officer",
  i9_has_existing_dpia: "No",
  i9_existing_dpia_summary: "",
};

const ASSERTIONS: { label: string; fn: (r: any) => boolean }[] = [
  {
    label: "schema_version is v3-part-a-part-b",
    fn: (r) => r.schema_version === "v3-part-a-part-b",
  },
  {
    label: "part_a present with all 11 sections (cover + 1–10)",
    fn: (r) =>
      !!r.part_a?.cover &&
      !!r.part_a?.sec_1_trigger &&
      !!r.part_a?.sec_2_purpose &&
      !!r.part_a?.sec_3_pi_inventory &&
      !!r.part_a?.sec_4_operations &&
      !!r.part_a?.sec_5_benefits &&
      !!r.part_a?.sec_6_harms &&
      !!r.part_a?.sec_7_safeguards &&
      !!r.part_a?.sec_8_decision &&
      !!r.part_a?.sec_9_stakeholders &&
      !!r.part_a?.sec_10_governance,
  },
  {
    label: "part_b present with § 7157 fields",
    fn: (r) =>
      !!r.part_b &&
      typeof r.part_b.perjury_attestation_block === "string" &&
      r.part_b.perjury_attestation_block.toLowerCase().includes("penalty of perjury"),
  },
  {
    label: "§ 6 covers all 8 statutory harm categories",
    fn: (r) => {
      const harms = r.part_a?.sec_6_harms?.harms ?? [];
      const required = [
        "security", "discrimination", "control", "coercion",
        "economic", "physical", "reputational", "psychological",
      ];
      const lc = harms.map((h: any) => String(h.category ?? "").toLowerCase());
      return required.every((req) => lc.some((c: string) => c.includes(req)));
    },
  },
  {
    label: "§ 7 safeguards have all four groupings",
    fn: (r) =>
      Array.isArray(r.part_a?.sec_7_safeguards?.technical) &&
      Array.isArray(r.part_a?.sec_7_safeguards?.organizational) &&
      Array.isArray(r.part_a?.sec_7_safeguards?.consumer_facing) &&
      Array.isArray(r.part_a?.sec_7_safeguards?.contractual),
  },
  {
    label: "§ 8 decision NOT auto-selected (user_decision is null)",
    fn: (r) => r.part_a?.sec_8_decision?.user_decision === null || r.part_a?.sec_8_decision?.user_decision === undefined,
  },
  {
    label: "§ 8 AI recommendation provided",
    fn: (r) => typeof r.part_a?.sec_8_decision?.ai_recommended_outcome === "string" && r.part_a.sec_8_decision.ai_recommended_outcome.length > 0,
  },
  {
    label: "Gating block surfaces blockers (sign-off not yet ready)",
    fn: (r) => r.gating?.ready_for_signoff === false && Array.isArray(r.gating?.blockers) && r.gating.blockers.length > 0,
  },
  {
    label: "Output contains NO 'corpus' reference",
    fn: (r) => !JSON.stringify({ part_a: r.part_a, part_b: r.part_b, gating: r.gating }).toLowerCase().includes("corpus"),
  },
  {
    label: "ADMT branch generated Appendix C or § 4G",
    fn: (r) => !!r.part_a?.sec_4_operations?.g_admt || !!r.part_a?.appendices?.c_admt_note,
  },
];


export default function TestCPPARisk() {
  const { user } = useAuth();
  const [status, setStatus] = useState<"idle" | "running" | "complete" | "failed">("idle");
  const [reportData, setReportData] = useState<any>(null);
  const [recordId, setRecordId] = useState<string | null>(null);
  const [log, setLog] = useState<string[]>([]);
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
    addLog("▶ Starting CPPA Risk Assessment (Module 1) test...");
    addLog("▶ Scenario: Meridian Health Analytics · Healthcare · CA · ADMT + sensitive PI");
    addLog(`▶ Logged in as: ${user.email}`);
    addLog("▶ Inserting cppa_assessments row (module=risk_assessment)...");

    const { data: row, error: insErr } = await supabase
      .from("cppa_assessments")
      .insert({
        user_id: user.id,
        module: "risk_assessment",
        status: "pending",
        intake_data: MOCK_INTAKE,
      })
      .select("id")
      .single();

    if (insErr || !row) {
      addLog(`❌ Insert failed: ${insErr?.message || "no row"}`);
      setStatus("failed");
      return;
    }
    setRecordId(row.id);
    addLog(`✓ assessment_id = ${row.id}`);
    addLog("▶ Invoking run-cppa-risk-assessment (expect 60–120s, Sonnet)...");

    const tick = setInterval(() => setElapsed(Math.round((Date.now() - startTime) / 1000)), 1000);

    const { error: fnErr } = await supabase.functions.invoke("run-cppa-risk-assessment", {
      body: { assessment_id: row.id },
    });

    if (fnErr) {
      clearInterval(tick);
      addLog(`❌ Edge function error: ${fnErr.message}`);
      setStatus("failed");
      return;
    }

    addLog("✓ Function returned. Polling cppa_assessments for completion...");
    let polls = 0;
    const poll = async () => {
      const { data } = await supabase
        .from("cppa_assessments")
        .select("status,report_data")
        .eq("id", row.id)
        .single();
      if (data?.status === "complete") {
        clearInterval(tick);
        addLog(`✅ Complete after ${Math.round((Date.now() - startTime) / 1000)}s`);
        setReportData(data.report_data);
        setStatus("complete");
      } else if (data?.status === "error" || data?.status === "failed") {
        clearInterval(tick);
        addLog(`❌ status = ${data.status}`);
        setStatus("failed");
      } else if (polls++ < 120) {
        addLog(`... poll ${polls}/120 (status: ${data?.status})`);
        setTimeout(poll, 4000);
      } else {
        clearInterval(tick);
        addLog("❌ Timed out (480s).");
        setStatus("failed");
      }
    };
    setTimeout(poll, 4000);
  }, [user, addLog, startTime]);

  useEffect(() => {
    if (user && status === "idle") runTest();
  }, [user, runTest, status]);

  const assertions = ASSERTIONS.map((a) => ({
    ...a,
    passed: reportData
      ? (() => {
          try {
            return a.fn(reportData);
          } catch {
            return false;
          }
        })()
      : null,
  }));
  const passCount = assertions.filter((a) => a.passed === true).length;
  const failCount = assertions.filter((a) => a.passed === false).length;

  useTestRunnerBridge({
    testId: "cppa-risk",
    status,
    result: reportData as unknown,
    assertions: assertions.map((a) => ({ label: a.label, passed: a.passed })),
    log,
    elapsedMs: elapsed * 1000,
    resultUrl: recordId ? `/cppa-risk-assessment/result/${recordId}` : null,
  });

  return (
    <div className="min-h-screen bg-brand-cloud">
      <Navbar />
      <div className="max-w-5xl mx-auto px-6 py-8 space-y-6">
        <div>
          <h1 className="font-serif mb-2">🧪 TEST: CPPA Risk Assessment (Module 1)</h1>
          <p className="text-sm text-muted-foreground">
            Meridian Health Analytics · Healthcare · CA · ADMT · sensitive PI · partial rights
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

        {reportData && (
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

            {recordId && (
              <div className="border rounded-lg p-4 bg-card">
                <h2 className="font-serif mb-2">Result Page</h2>
                <a
                  className="text-brand-teal underline"
                  href={`/cppa-risk-assessment/result/${recordId}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  Open full result → /cppa-risk-assessment/result/{recordId}
                </a>
              </div>
            )}

            <details className="border rounded-lg p-4 bg-card">
              <summary className="cursor-pointer font-medium">Full report_data JSON</summary>
              <pre className="text-xs overflow-auto mt-3 max-h-[600px]">
                {JSON.stringify(reportData, null, 2)}
              </pre>
            </details>
          </>
        )}

        {status === "failed" && !reportData && (
          <div className="border border-red-300 rounded-lg p-4 bg-red-50">
            <p className="font-medium text-red-900">Test failed. See log above for details.</p>
            {recordId && (
              <p className="text-xs font-mono mt-2">
                Record ID: {recordId} — check edge logs for run-cppa-risk-assessment.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
