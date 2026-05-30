// Admin test: IR Playbook — US + Canada Jurisdictions
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import Navbar from "@/components/Navbar";
import { useTestRunnerBridge } from "@/hooks/useTestRunnerBridge";

const MOCK_INTAKE = {
  discoveryDateTime: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
  cause: "Ransomware attack — attacker accessed HR database containing employee records and customer payment data. 8,400 individuals affected across California, Texas, and Canada.",
  dataTypes: ["General personal data", "Financial / payment data", "Health / medical data"],
  affectedCount: "8,400",
  jurisdictions: ["California", "Texas", "Canada (PIPEDA)", "Quebec (Law 25)"],
  processorInvolved: true,
  processorName: "ADP Canada Inc (payroll processor)",
  contained: "Network isolated. Ransomware removed. Backup restoration in progress.",
  organisationType: "Mid-size employer (retail sector, 400 employees, operations in CA, TX, and Canada)",
};

const ASSERTIONS = [
  { label: 'Contains California breach notification requirement', fn: (t: string) => /california/i.test(t) && /30 day|thirty day|oag\.ca\.gov/i.test(t) },
  { label: 'Contains Texas AG notification requirement', fn: (t: string) => /texas/i.test(t) && /(attorney general|250.*texan|texan.*250)/i.test(t) },
  { label: 'Contains PIPEDA / OPC notification requirement', fn: (t: string) => /PIPEDA|OPC|Privacy Commissioner/i.test(t) },
  { label: 'Contains Quebec Law 25 / CAI notification', fn: (t: string) => /Law 25|Loi 25|CAI|Commission.*accès/i.test(t) },
  { label: 'Contains processor notification step (ADP)', fn: (t: string) => /processor|service provider|vendor/i.test(t) && /notif/i.test(t) },
  { label: 'Contains individual notification section', fn: (t: string) => /individual notification|notify.*individual|notification.*individual/i.test(t) },
  { label: 'Contains documentation checklist', fn: (t: string) => /documentation.*checklist|checklist.*documentation/i.test(t) },
  { label: 'Contains 7 numbered sections', fn: (t: string) => /section\s*[67]/i.test(t) },
  { label: 'Document length > 3000 characters', fn: (t: string) => t.length > 3000 },
];

export default function TestIRPlaybookUS() {
  const { user } = useAuth();
  const [status, setStatus] = useState<"idle" | "running" | "complete" | "failed">("idle");
  const [playbook, setPlaybook] = useState<string>("");
  const [meta, setMeta] = useState<any>(null);
  const [recordId, setRecordId] = useState<string | null>(null);
  const [log, setLog] = useState<string[]>([]);
  const [elapsed, setElapsed] = useState(0);
  const [startTime] = useState(Date.now());

  const addLog = useCallback((msg: string) => {
    const secs = ((Date.now() - startTime) / 1000).toFixed(1);
    setLog((prev) => [...prev, `[${secs}s] ${msg}`]);
  }, [startTime]);

  const runTest = useCallback(async () => {
    if (!user) return;
    setStatus("running");
    addLog("▶ Starting IR Playbook — US/Canada test...");
    addLog("▶ Scenario: Ransomware · 8,400 affected · CA + TX + PIPEDA + Quebec Law 25");
    addLog(`▶ Logged in as: ${user.email}`);
    addLog("▶ Invoking generate-ir-playbook (expect 30–80s)...");

    const tick = setInterval(() => setElapsed(Math.round((Date.now() - startTime) / 1000)), 1000);
    const { data, error } = await supabase.functions.invoke("generate-ir-playbook", {
      body: { ...MOCK_INTAKE, user_id: user.id },
    });
    clearInterval(tick);

    if (error || !data?.playbook_text) {
      addLog(`❌ Edge function error: ${error?.message || data?.error || "no playbook_text returned"}`);
      setStatus("failed");
      return;
    }

    addLog(`✅ Complete after ${Math.round((Date.now() - startTime) / 1000)}s`);
    addLog(`✓ Playbook length: ${data.playbook_text.length} chars`);
    if (data.id) {
      setRecordId(data.id);
      addLog(`✓ Stored as ir_playbooks.id = ${data.id}`);
    }
    setPlaybook(data.playbook_text);
    setMeta({ portals: data.portals, enforcement_precedents: data.enforcement_precedents, generated_at: data.generated_at });
    setStatus("complete");
  }, [user, addLog, startTime]);

  useEffect(() => {
    if (user && status === "idle") runTest();
  }, [user, runTest, status]);

  const assertions = ASSERTIONS.map((a) => ({
    ...a,
    passed: playbook ? (() => { try { return a.fn(playbook); } catch { return false; } })() : null,
  }));
  const passCount = assertions.filter((a) => a.passed === true).length;
  const failCount = assertions.filter((a) => a.passed === false).length;

  useTestRunnerBridge({
    testId: "ir-playbook-us",
    status,
    result: playbook as unknown,
    assertions: assertions.map((a) => ({ label: a.label, passed: a.passed })),
    log,
    elapsedMs: elapsed * 1000,
    resultUrl: recordId ? `/ir-playbook/result/${recordId}` : null,
  });

  return (
    <div className="min-h-screen bg-brand-cloud">
      <Navbar />
      <div className="max-w-5xl mx-auto px-6 py-8 space-y-6">
        <div>
          <h1 className="font-serif mb-2">🧪 TEST: IR Playbook — US + Canada Jurisdictions</h1>
          <p className="text-sm text-muted-foreground">
            Ransomware · 8,400 affected · California + Texas + PIPEDA + Quebec Law 25
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
        {playbook && (
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
                <a className="text-brand-teal underline" href={`/ir-playbook/result/${recordId}`} target="_blank" rel="noreferrer">
                  Open full result → /ir-playbook/result/{recordId}
                </a>
              </div>
            )}
            <details className="border rounded-lg p-4 bg-card" open>
              <summary className="cursor-pointer font-medium">Playbook text ({playbook.length} chars)</summary>
              <pre className="text-xs whitespace-pre-wrap mt-3 max-h-[600px] overflow-auto">{playbook}</pre>
            </details>
            {meta && (
              <details className="border rounded-lg p-4 bg-card">
                <summary className="cursor-pointer font-medium">Portals & enforcement precedents</summary>
                <pre className="text-xs overflow-auto mt-3">{JSON.stringify(meta, null, 2)}</pre>
              </details>
            )}
          </>
        )}
        {status === "failed" && !playbook && (
          <div className="border border-red-300 rounded-lg p-4 bg-red-50">
            <p className="font-medium text-red-900">Test failed. See log above for details.</p>
          </div>
        )}
      </div>
    </div>
  );
}
