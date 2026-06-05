import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import Navbar from "@/components/Navbar";
import { useTestRunnerBridge } from "@/hooks/useTestRunnerBridge";

const MOCK_INTAKE = {
  profile: {
    revenue: "Over $500M",
    california_consumers: "1–10 million",
    sector: "Healthcare/Life Sciences",
    sell_share_pi: "Both",
  },
  data_categories: [
    "Health or medical information",
    "Contact identifiers (name, email, phone)",
    "Device identifiers (IP, cookies, device IDs)",
    "Internet or network activity",
    "Employment information",
  ],
  processing_activities: [
    {
      name: "Patient risk stratification analytics",
      purpose: "Predictive analytics for clinical risk",
      automated: true,
      profiling: true,
      sensitive: true,
    },
    {
      name: "Employee HR processing",
      purpose: "Payroll, benefits, performance management",
      automated: false,
      profiling: false,
      sensitive: false,
    },
    {
      name: "Marketing analytics",
      purpose: "Clinic client acquisition and retention",
      automated: true,
      profiling: true,
      sensitive: false,
    },
  ],
  data_sources: [
    "Direct collection from clinic EHR systems",
    "Third-party data brokers (clinic demographic data)",
    "Web tracking (clinic client portal)",
  ],
  third_party_sharing: [
    "Cloud processors (Azure, Snowflake)",
    "Analytics vendors",
    "Healthcare data consortiums",
  ],
  consumer_rights_implemented: ["Right to know", "Right to delete (partial)"],
  consumer_rights_missing: [
    "Right to correct",
    "Right to limit use of sensitive PI",
    "Right to opt-out of sale/share",
  ],
  security_measures:
    "SOC 2 Type II certified. Annual penetration testing. MFA enforced. Data encrypted at rest and in transit.",
  admt_used: true,
  admt_description:
    "ML model generates individual patient risk scores used by clinicians. Scores influence clinical prioritisation decisions.",
  children_data: false,
  sensitive_pi: true,
  industry_sector: "Healthcare/Life Sciences",
};

const ASSERTIONS: { label: string; fn: (r: any) => boolean }[] = [
  {
    label: "report_data.executive_summary present",
    fn: (r) => typeof r.executive_summary === "string" && r.executive_summary.length > 50,
  },
  {
    label: "domains array has ≥5 items",
    fn: (r) => Array.isArray(r.domains) && r.domains.length >= 5,
  },
  {
    label: "≥1 domain rated Critical or High",
    fn: (r) =>
      Array.isArray(r.domains) &&
      r.domains.some((d: any) =>
        /(Critical Gap|High)/i.test(d.status ?? "")
      ),
  },
  {
    label: "top_risks array present with ≥1 item",
    fn: (r) => Array.isArray(r.top_risks) && r.top_risks.length >= 1,
  },
  {
    label: "enforcement_context present",
    fn: (r) => typeof r.enforcement_context === "string" && r.enforcement_context.length > 20,
  },
  {
    label: "ADMT domain flagged in findings",
    fn: (r) =>
      Array.isArray(r.domains) &&
      r.domains.some((d: any) =>
        /automat|ADMT|decision.making/i.test(d.domain ?? "") ||
        /automat|ADMT/i.test(d.finding ?? "")
      ),
  },
  {
    label: "Mentions 2027 CPPA audit deadline or upcoming enforcement timeline",
    fn: (r) => {
      const txt = JSON.stringify(r);
      return /2027|December.*2027|Dec.*2027|audit.*deadline|upcoming.*audit|enforcement.*timeline|high.risk.*deadline/i.test(txt);
    },
  },
  {
    label: "Consumer rights gaps reflected in findings",
    fn: (r) =>
      Array.isArray(r.domains) &&
      r.domains.some((d: any) =>
        /consumer|rights|opt.out|deletion/i.test(d.domain ?? "") ||
        /consumer|rights/i.test(d.finding ?? "")
      ),
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
      } else if (polls++ < 45) {
        addLog(`... poll ${polls}/45 (status: ${data?.status})`);
        setTimeout(poll, 4000);
      } else {
        clearInterval(tick);
        addLog("❌ Timed out (180s).");
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
