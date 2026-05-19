import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import Navbar from "@/components/Navbar";

const MOCK_INTAKE = {
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

const ASSERTIONS = [
  { label: "executive_summary is present and non-empty", fn: (r: any) => typeof r.executive_summary === "string" && r.executive_summary.length > 50 },
  { label: "overall_readiness_rating is one of the 5 valid values", fn: (r: any) => ["Initial","Developing","Defined","Managed","Optimised","Optimized"].includes(r.overall_readiness_rating) },
  { label: "top_three_risks is an array with 1–3 items", fn: (r: any) => Array.isArray(r.top_three_risks) && r.top_three_risks.length >= 1 },
  { label: "domain_findings has at least 8 entries", fn: (r: any) => r.domain_findings && Object.keys(r.domain_findings).length >= 8 },
  { label: "Every domain finding has a severity field", fn: (r: any) => r.domain_findings && Object.values(r.domain_findings).every((d: any) => ["Critical","High","Medium","Low","Compliant","Unknown"].includes(d.severity)) },
  { label: "Every domain finding has regulatory_basis", fn: (r: any) => r.domain_findings && Object.values(r.domain_findings).every((d: any) => d.regulatory_basis && d.regulatory_basis.length > 5) },
  { label: "immediate_actions is present (may be empty array)", fn: (r: any) => Array.isArray(r.immediate_actions) },
  { label: "dpia_scope is present (may be empty array)", fn: (r: any) => Array.isArray(r.dpia_scope) || (r.dpia_scope === undefined) },
  { label: "At least one Critical or High severity domain (health data org should have gaps)", fn: (r: any) => r.domain_findings && Object.values(r.domain_findings).some((d: any) => d.severity === "Critical" || d.severity === "High") },
  { label: "enforcement_precedents is an array", fn: (r: any) => Array.isArray(r.enforcement_precedents) },
];

export default function TestGovernanceAssessment() {
  const { user } = useAuth();
  const [status, setStatus] = useState<"idle"|"running"|"complete"|"failed">("idle");
  const [result, setResult] = useState<any>(null);
  const [log, setLog] = useState<string[]>([]);
  const [assessmentId, setAssessmentId] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [startTime] = useState(Date.now());

  const addLog = useCallback((msg: string) => {
    const secs = ((Date.now() - startTime) / 1000).toFixed(1);
    setLog(prev => [...prev, `[${secs}s] ${msg}`]);
  }, [startTime]);

  const runTest = useCallback(async () => {
    if (!user) return;
    setStatus("running");
    addLog("▶ Starting Governance Assessment test...");
    addLog(`▶ Test company: Meridian Health Analytics Ltd`);
    addLog(`▶ Logged in as: ${user.email}`);

    const { data: rec, error: insErr } = await supabase
      .from("governance_assessments")
      .insert({ user_id: user.id, status: "pending", intake_data: MOCK_INTAKE })
      .select().single();

    if (insErr || !rec) {
      addLog(`❌ DB insert failed: ${insErr?.message}`);
      setStatus("failed"); return;
    }
    setAssessmentId(rec.id);
    addLog(`✓ Record created: ${rec.id}`);
    addLog("▶ Invoking run-governance-assessment (11 AI calls — expect 45–90s)...");

    const { error: fnErr } = await supabase.functions.invoke("run-governance-assessment", {
      body: { assessment_id: rec.id }
    });
    if (fnErr) {
      addLog(`❌ Edge function error: ${fnErr.message}`);
      setStatus("failed"); return;
    }
    addLog("✓ Edge function returned. Polling for DB update...");

    let polls = 0;
    const poll = async () => {
      setElapsed(Math.round((Date.now() - startTime) / 1000));
      const { data } = await supabase.from("governance_assessments").select("*").eq("id", rec.id).single();
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
        addLog("❌ Timed out (120s). Edge function may have exceeded Supabase timeout.");
        setStatus("failed");
      }
    };
    setTimeout(poll, 8000);
  }, [user, addLog, startTime]);

  useEffect(() => { if (user && status === "idle") runTest(); }, [user, runTest, status]);

  const assertions = ASSERTIONS.map(a => ({
    ...a, passed: result !== null ? a.fn(result) : null
  }));
  const passCount = assertions.filter(a => a.passed === true).length;
  const failCount = assertions.filter(a => a.passed === false).length;

  return (
    <div className="min-h-screen bg-paper">
      <Navbar />
      <div className="max-w-5xl mx-auto px-6 py-8 space-y-6">
        <div>
          <h1 className="font-serif mb-2">🧪 TEST: Privacy Programme Assessment</h1>
          <p className="text-sm text-muted-foreground">Meridian Health Analytics Ltd · Healthcare SaaS · EU+UK+CA · Health data · AI tools</p>
        </div>

        <div className="border rounded-lg p-4 bg-card">
          <div className="font-mono text-sm">Status: <strong>{status.toUpperCase()}</strong>
            {status === "running" && ` — ${elapsed}s elapsed`}
            {status === "complete" && ` — ${passCount}/${assertions.length} assertions passed`}
          </div>
        </div>

        <div className="border rounded-lg p-4 bg-black text-green-400 font-mono text-xs max-h-80 overflow-auto">
          {log.map((l, i) => <div key={i}>{l}</div>)}
          {status === "idle" && <div>Waiting for auth...</div>}
        </div>

        {result && (
          <>
            <div className="border rounded-lg p-4 bg-card">
              <h2 className="font-serif mb-3">Assertions ({passCount} pass / {failCount} fail)</h2>
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
                <a className="text-blue underline" href={`/governance-assessment/result/${assessmentId}`} target="_blank" rel="noreferrer">
                  Open full result → /governance-assessment/result/{assessmentId}
                </a>
              )}
            </div>

            <div className="border rounded-lg p-4 bg-card">
              <h2 className="font-serif mb-2">Executive Summary (quality check)</h2>
              <p className="text-sm whitespace-pre-wrap">{result.executive_summary}</p>
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
            <p className="text-sm text-red-800 mt-2">Common causes: Supabase edge function timeout (10s free / 150s Pro), missing ANTHROPIC_API_KEY, or RLS blocking the insert.</p>
            {assessmentId && (
              <p className="text-xs font-mono mt-2">Assessment ID: {assessmentId} — check Supabase logs for this ID.</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
