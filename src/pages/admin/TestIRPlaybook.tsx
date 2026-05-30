import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import Navbar from "@/components/Navbar";
import { useTestRunnerBridge } from "@/hooks/useTestRunnerBridge";

const MOCK_INTAKE = {
  incident_date: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
  discovery_date: new Date().toISOString(),
  cause: "Unauthorized external access / cyberattack",
  data_types: ["Health / medical records", "Names and contact details", "Financial / payment data"],
  affected_count: "1,000–10,000",
  jurisdictions: ["United Kingdom", "EU/EEA", "Ireland"],
  contained: "No",
  org_type: "Healthcare provider",
  additional_context:
    "Ransomware attack on EHR server. Patient records for approximately 5,000 NHS clinic patients potentially exfiltrated. Systems partially restored. No evidence of data publication yet. Cyber incident response firm engaged.",
};

// Map MOCK_INTAKE → generate-ir-playbook body shape (see supabase/functions/generate-ir-playbook/index.ts).
const buildBody = (userId?: string) => ({
  discoveryDateTime: MOCK_INTAKE.discovery_date,
  cause: `${MOCK_INTAKE.cause}. ${MOCK_INTAKE.additional_context}`,
  dataTypes: MOCK_INTAKE.data_types,
  affectedCount: MOCK_INTAKE.affected_count,
  jurisdictions: MOCK_INTAKE.jurisdictions,
  processorInvolved: false,
  contained: MOCK_INTAKE.contained,
  organisationType: MOCK_INTAKE.org_type,
  user_id: userId ?? null,
});

const ASSERTIONS = [
  { label: "Contains Section 2 (breach assessment)", fn: (t: string) => /##\s*2\.|section\s*2|breach assessment/i.test(t) },
  { label: 'Contains "72 hours" notification deadline', fn: (t: string) => /72\s*hours?/i.test(t) },
  { label: 'Contains "ICO"', fn: (t: string) => /\bICO\b/.test(t) },
  { label: 'Contains "DPC" (Irish DPC)', fn: (t: string) => /\bDPC\b/.test(t) },
  {
    label: "Contains a notification portal URL or instruction",
    fn: (t: string) => /https?:\/\/[^\s)]+/i.test(t) || /portal/i.test(t),
  },
  {
    label: "Contains Section 5 with a notification template",
    fn: (t: string) => /(##\s*5\.|section\s*5|^\s*5\.|notification template)/im.test(t) && /template/i.test(t),
  },
  {
    label: "Contains Section 6 documentation checklist",
    fn: (t: string) => /(##\s*6\.|section\s*6|^\s*6\.|documentation.*checklist|accountability)/im.test(t) && /(documentation|checklist|accountability|records?\s+to\s+(create|maintain))/i.test(t),
  },
  { label: 'Contains "Article 33"', fn: (t: string) => /article\s*33|art\.?\s*33/i.test(t) },
  { label: "Document length > 3000 characters", fn: (t: string) => t.length > 3000 },
];

export default function TestIRPlaybook() {
  const { user } = useAuth();
  const [status, setStatus] = useState<"idle" | "running" | "complete" | "failed">("idle");
  const [playbook, setPlaybook] = useState<string>("");
  const [meta, setMeta] = useState<any>(null);
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
    addLog("▶ Starting Breach IR Playbook test...");
    addLog("▶ Scenario: NHS ransomware breach · ~5,000 patients · UK + Ireland + EU/EEA");
    addLog(`▶ Logged in as: ${user.email}`);
    addLog("▶ Invoking generate-ir-playbook (expect 30–80s, Sonnet)...");

    const tick = setInterval(() => setElapsed(Math.round((Date.now() - startTime) / 1000)), 1000);

    const { data, error } = await supabase.functions.invoke("generate-ir-playbook", {
      body: buildBody(user.id),
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
    passed: playbook
      ? (() => {
          try {
            return a.fn(playbook);
          } catch {
            return false;
          }
        })()
      : null,
  }));
  const passCount = assertions.filter((a) => a.passed === true).length;
  const failCount = assertions.filter((a) => a.passed === false).length;

  useTestRunnerBridge({
    testId: "ir-playbook",
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
          <h1 className="font-serif mb-2">🧪 TEST: Breach Response IR Playbook</h1>
          <p className="text-sm text-muted-foreground">
            NHS ransomware breach · ~5,000 patients · UK + Ireland + EU/EEA · Health + financial data
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

        {playbook && (
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
                  href={`/ir-playbook/result/${recordId}`}
                  target="_blank"
                  rel="noreferrer"
                >
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
            <p className="text-xs font-mono mt-2">Check edge logs for generate-ir-playbook.</p>
          </div>
        )}
      </div>
    </div>
  );
}
