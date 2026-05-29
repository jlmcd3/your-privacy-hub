// Admin test: DPA Generator — US State Processor Agreement
// Mock: TechCo Inc (California) → DataOps LLC (Texas) · Consumer data · CCPA + TDPSA

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import Navbar from "@/components/Navbar";

const MOCK_INTAKE = {
  controllerName: "TechCo Inc",
  controllerJurisdiction: "California",
  processorName: "DataOps LLC",
  processorJurisdiction: "Texas",
  services: "Processing of consumer purchase history and behavioural data to provide personalised product recommendation analytics on behalf of the Controller. Services include data ingestion, model inference, and return of recommendation scores via API.",
  dataCategories: ["General personal data", "Location data", "Financial / payment data"],
  dataSubjectCount: "approximately 500,000",
  retention: "12 months from collection date, then deletion",
  hasSubProcessors: true,
  subProcessorList: "Amazon Web Services (US East), Snowflake Inc (US regions)",
  legalFramework: "CCPA/CPRA and TDPSA",
  auditRights: "annual audit with 30 days notice",
  includeTransferClause: false,
  transferMechanism: "",
  documentType: "us-state",
};

const ASSERTIONS = [
  { label: 'Document type: US State (not GDPR Article 28)', fn: (t: string) => !/article\s*28|art\.?\s*28/i.test(t) },
  { label: 'References CCPA / Cal. Civ. Code § 1798', fn: (t: string) => /CCPA|Cal\.\s*Civ\.\s*Code|1798\./i.test(t) },
  { label: 'Contains business purpose limitation clause', fn: (t: string) => /business purpose/i.test(t) },
  { label: 'Contains prohibited processing clause (no selling/sharing)', fn: (t: string) => /shall not sell|prohibit.*sell|no.*sale|not.*share/i.test(t) },
  { label: 'Contains consumer rights pass-through (access, deletion)', fn: (t: string) => /right to (know|access|delete|correct)/i.test(t) },
  { label: 'Contains sub-processor provisions', fn: (t: string) => /sub-?processor/i.test(t) },
  { label: '"delete or return" clause present', fn: (t: string) => /delete or return/i.test(t) },
  { label: 'Document length > 2000 characters', fn: (t: string) => t.length > 2000 },
];

export default function TestDPAUSState() {
  const { user } = useAuth();
  const [status, setStatus] = useState<"idle" | "running" | "complete" | "failed">("idle");
  const [dpaText, setDpaText] = useState<string>("");
  const [, setResultMeta] = useState<any>(null);
  const [log, setLog] = useState<string[]>([]);
  const [recordId, setRecordId] = useState<string | null>(null);
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
    addLog("▶ Starting DPA Generator — US State test...");
    addLog("▶ Controller: TechCo Inc (California) → Processor: DataOps LLC (Texas)");
    addLog("▶ Expected: US State Processor Agreement (CCPA + TDPSA)");
    addLog(`▶ Logged in as: ${user.email}`);
    addLog("▶ Invoking generate-dpa (expect 30–80s)...");

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

  return (
    <div className="min-h-screen bg-brand-cloud">
      <Navbar />
      <div className="max-w-5xl mx-auto px-6 py-8 space-y-6">
        <div>
          <h1 className="font-serif mb-2">🧪 TEST: DPA Generator — US State</h1>
          <p className="text-sm text-muted-foreground">
            TechCo Inc (California) → DataOps LLC (Texas) · Consumer data · CCPA + TDPSA
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
