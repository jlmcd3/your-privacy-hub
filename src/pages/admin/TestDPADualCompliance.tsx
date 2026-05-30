// Admin test: DPA Generator — Dual Compliance (UK + California)
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import Navbar from "@/components/Navbar";
import { useTestRunnerBridge } from "@/hooks/useTestRunnerBridge";

const MOCK_INTAKE = {
  controllerName: "GlobalTech plc",
  controllerJurisdiction: "United Kingdom",
  processorName: "DataVault Inc",
  processorJurisdiction: "California",
  services: "Cloud storage and processing of employee HR records and EU customer personal data including names, contact details, employment contracts, and performance data.",
  dataCategories: ["General personal data", "Employee / HR data"],
  dataSubjectCount: "approximately 12,000",
  retention: "Duration of employment + 7 years",
  hasSubProcessors: false,
  subProcessorList: "",
  legalFramework: "UK GDPR and CCPA/CPRA",
  auditRights: "annual audit",
  includeTransferClause: true,
  transferMechanism: "UK International Data Transfer Agreement (IDTA)",
  documentType: "dual-eu-us",
};

const ASSERTIONS = [
  { label: 'References both GDPR/UK GDPR and CCPA/US law', fn: (t: string) => /UK GDPR|GDPR/i.test(t) && /CCPA|California/i.test(t) },
  { label: 'Contains Article 28 reference (GDPR requirement)', fn: (t: string) => /article\s*28|art\.?\s*28/i.test(t) },
  { label: 'Contains business purpose limitation (US requirement)', fn: (t: string) => /business purpose/i.test(t) },
  { label: 'Contains prohibited processing / no selling clause', fn: (t: string) => /shall not sell|no.*sale|not.*share.*personal/i.test(t) },
  { label: 'Contains international transfer clause (IDTA/SCCs)', fn: (t: string) => /IDTA|standard contractual|international transfer/i.test(t) },
  { label: 'Contains data subject / consumer rights section', fn: (t: string) => /data subject rights|consumer rights/i.test(t) },
  { label: '"delete or return" clause present', fn: (t: string) => /delete or return/i.test(t) },
  { label: 'Document length > 3000 characters (dual doc is longer)', fn: (t: string) => t.length > 3000 },
];

export default function TestDPADualCompliance() {
  const { user } = useAuth();
  const [status, setStatus] = useState<"idle" | "running" | "complete" | "failed">("idle");
  const [dpaText, setDpaText] = useState<string>("");
  const [, setResultMeta] = useState<any>(null);
  const [log, setLog] = useState<string[]>([]);
  const [recordId, setRecordId] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [startTime] = useState(Date.now());

  const addLog = useCallback((msg: string) => {
    const secs = ((Date.now() - startTime) / 1000).toFixed(1);
    setLog((prev) => [...prev, `[${secs}s] ${msg}`]);
  }, [startTime]);

  const runTest = useCallback(async () => {
    if (!user) return;
    setStatus("running");
    addLog("▶ Starting DPA Generator — Dual Compliance test...");
    addLog("▶ Controller: GlobalTech plc (UK) → Processor: DataVault Inc (California)");
    addLog("▶ Expected: Dual-Compliance DPA (UK GDPR + CCPA/CPRA)");
    addLog(`▶ Logged in as: ${user.email}`);
    addLog("▶ Invoking generate-dpa (expect 40–100s)...");

    const tick = setInterval(() => setElapsed(Math.round((Date.now() - startTime) / 1000)), 1000);
    const { data, error } = await supabase.functions.invoke("generate-dpa", {
      body: { ...MOCK_INTAKE, user_id: user.id },
    });
    clearInterval(tick);

    if (error || !data?.dpa_text) {
      addLog(`❌ Edge function error: ${error?.message || data?.error || "no dpa_text returned"}`);
      setStatus("failed");
      return;
    }

    addLog(`✅ Complete after ${Math.round((Date.now() - startTime) / 1000)}s`);
    addLog(`✓ Document length: ${data.dpa_text.length} chars`);
    if (data.id) {
      setRecordId(data.id);
      addLog(`✓ Stored as dpa_documents.id = ${data.id}`);
    }
    setDpaText(data.dpa_text);
    setResultMeta({ enforcement_precedents: data.enforcement_precedents, generated_at: data.generated_at });
    setStatus("complete");
  }, [user, addLog, startTime]);

  useEffect(() => {
    if (user && status === "idle") runTest();
  }, [user, runTest, status]);

  const assertions = ASSERTIONS.map((a) => ({
    ...a,
    passed: dpaText ? (() => { try { return a.fn(dpaText); } catch { return false; } })() : null,
  }));
  const passCount = assertions.filter((a) => a.passed === true).length;
  const failCount = assertions.filter((a) => a.passed === false).length;

  useTestRunnerBridge({
    testId: "dpa-dual",
    status,
    result: dpaText as unknown,
    assertions: assertions.map((a) => ({ label: a.label, passed: a.passed })),
    log,
    elapsedMs: elapsed * 1000,
    resultUrl: recordId ? `/dpa/result/${recordId}` : null,
  });

  return (
    <div className="min-h-screen bg-brand-cloud">
      <Navbar />
      <div className="max-w-5xl mx-auto px-6 py-8 space-y-6">
        <div>
          <h1 className="font-serif mb-2">🧪 TEST: DPA Generator — Dual Compliance (UK + California)</h1>
          <p className="text-sm text-muted-foreground">
            GlobalTech plc (UK) → DataVault Inc (California) · HR + customer data · UK GDPR + CCPA/CPRA
          </p>
        </div>
        <div className="border rounded-lg p-4 bg-card font-mono text-sm">
          Status: <strong>{status.toUpperCase()}</strong>
          {status === "running" && ` — ${elapsed}s elapsed`}
          {status === "complete" && ` — ${passCount}/${assertions.length} assertions passed`}
        </div>
        <div className="border rounded-lg p-4 bg-black text-green-400 font-mono text-xs max-h-80 overflow-auto">
          {log.map((l, i) => <div key={i}>{l}</div>)}
          {status === "idle" && <div>Waiting for auth...</div>}
        </div>
        {dpaText && (
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
            {recordId && (
              <div className="border rounded-lg p-4 bg-card">
                <h2 className="font-serif mb-2">Result Page</h2>
                <a className="text-brand-teal underline" href={`/dpa-generator/result/${recordId}`} target="_blank" rel="noreferrer">
                  Open full result → /dpa-generator/result/{recordId}
                </a>
              </div>
            )}
            <details className="border rounded-lg p-4 bg-card" open>
              <summary className="cursor-pointer font-medium">DPA document text ({dpaText.length} chars)</summary>
              <pre className="text-xs whitespace-pre-wrap mt-3 max-h-[600px] overflow-auto">{dpaText}</pre>
            </details>
          </>
        )}
        {status === "failed" && !dpaText && (
          <div className="border border-red-300 rounded-lg p-4 bg-red-50">
            <p className="font-medium text-red-900">Test failed. See log above for details.</p>
          </div>
        )}
      </div>
    </div>
  );
}
