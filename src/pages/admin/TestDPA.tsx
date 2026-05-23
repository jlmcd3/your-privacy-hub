import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import Navbar from "@/components/Navbar";

const MOCK_INTAKE = {
  controller_name: "Meridian Health Analytics Ltd",
  controller_jurisdiction: "United Kingdom",
  processor_name: "CloudMed Processing GmbH",
  processor_jurisdiction: "Germany",
  services_description:
    "Processing of patient health records and clinical data on behalf of the Controller to provide AI-powered risk stratification analytics. Services include data ingestion from EHR systems, model inference, risk score generation, and return of structured reports via API.",
  data_categories: ["Health / medical data", "Employee / HR data"],
  data_subjects: "Patients of the Controller's clinic clients; clinical staff of those clinics",
  processing_purpose:
    "Provision of AI-powered patient risk stratification analytics service under the Master Services Agreement dated [DATE]",
  retention_period:
    "Risk scores and model inputs retained for 24 months from generation date. Raw patient data not retained by Processor.",
  sub_processors:
    "Microsoft Azure (EU region, cloud infrastructure), Snowflake Inc (EU region, data warehousing). Controller acknowledges these sub-processors.",
  special_category_data: true,
};

// Map to the body shape generate-dpa expects (see supabase/functions/generate-dpa/index.ts).
const buildBody = (userId?: string) => ({
  controllerName: MOCK_INTAKE.controller_name,
  controllerJurisdiction: MOCK_INTAKE.controller_jurisdiction,
  processorName: MOCK_INTAKE.processor_name,
  processorJurisdiction: MOCK_INTAKE.processor_jurisdiction,
  services: MOCK_INTAKE.services_description,
  dataCategories: MOCK_INTAKE.data_categories,
  dataSubjectCount: "approximately 50,000",
  retention: MOCK_INTAKE.retention_period,
  hasSubProcessors: true,
  subProcessorList: MOCK_INTAKE.sub_processors,
  legalFramework: "GDPR (EU) and UK GDPR",
  auditRights: "annual third-party audit",
  includeTransferClause: true,
  transferMechanism: "EU Standard Contractual Clauses (2021/914)",
  user_id: userId ?? null,
});

const ASSERTIONS = [
  {
    label: 'Contains "Data Processing Agreement" or "DPA"',
    fn: (t: string) => /data processing agreement|\bDPA\b/i.test(t),
  },
  { label: 'Contains "Article 28" or "Art. 28"', fn: (t: string) => /article\s*28|art\.?\s*28/i.test(t) },
  {
    label: 'Defines "Controller" and "Processor"',
    fn: (t: string) => /controller/i.test(t) && /processor/i.test(t),
  },
  {
    label: "Contains a sub-processor notification clause",
    fn: (t: string) => /sub-?processor/i.test(t) && /notif/i.test(t),
  },
  { label: "Document length > 2000 characters", fn: (t: string) => t.length > 2000 },
  {
    label: "Contains a security measures section (Article 32)",
    fn: (t: string) => /article\s*32|security measures/i.test(t),
  },
  {
    label: "Contains deletion / return of data clause",
    fn: (t: string) => /(delet|return)[^.]{0,80}data/i.test(t),
  },
];

export default function TestDPA() {
  const { user } = useAuth();
  const [status, setStatus] = useState<"idle" | "running" | "complete" | "failed">("idle");
  const [dpaText, setDpaText] = useState<string>("");
  const [resultMeta, setResultMeta] = useState<any>(null);
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
    addLog("▶ Starting Custom DPA Generator test...");
    addLog("▶ Controller: Meridian Health Analytics (UK) → Processor: CloudMed (DE)");
    addLog(`▶ Logged in as: ${user.email}`);
    addLog("▶ Invoking generate-dpa (expect 30–80s)...");

    const tick = setInterval(() => setElapsed(Math.round((Date.now() - startTime) / 1000)), 1000);

    const { data, error } = await supabase.functions.invoke("generate-dpa", {
      body: buildBody(user.id),
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
    setResultMeta({
      enforcement_precedents: data.enforcement_precedents,
      generated_at: data.generated_at,
    });
    setStatus("complete");
  }, [user, addLog, startTime]);

  useEffect(() => {
    if (user && status === "idle") runTest();
  }, [user, runTest, status]);

  const assertions = ASSERTIONS.map((a) => ({
    ...a,
    passed: dpaText
      ? (() => {
          try {
            return a.fn(dpaText);
          } catch {
            return false;
          }
        })()
      : null,
  }));
  const passCount = assertions.filter((a) => a.passed === true).length;
  const failCount = assertions.filter((a) => a.passed === false).length;

  return (
    <div className="min-h-screen bg-paper">
      <Navbar />
      <div className="max-w-5xl mx-auto px-6 py-8 space-y-6">
        <div>
          <h1 className="font-serif mb-2">🧪 TEST: Custom DPA Generator</h1>
          <p className="text-sm text-muted-foreground">
            Meridian Health Analytics (UK) → CloudMed Processing GmbH (DE) · Health data · GDPR + UK GDPR
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

        {dpaText && (
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
                  className="text-blue underline"
                  href={`/dpa-generator/result/${recordId}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  Open full result → /dpa-generator/result/{recordId}
                </a>
              </div>
            )}

            <details className="border rounded-lg p-4 bg-card" open>
              <summary className="cursor-pointer font-medium">DPA document text ({dpaText.length} chars)</summary>
              <pre className="text-xs whitespace-pre-wrap mt-3 max-h-[600px] overflow-auto">{dpaText}</pre>
            </details>

            {resultMeta && (
              <details className="border rounded-lg p-4 bg-card">
                <summary className="cursor-pointer font-medium">Enforcement precedents & metadata</summary>
                <pre className="text-xs overflow-auto mt-3">{JSON.stringify(resultMeta, null, 2)}</pre>
              </details>
            )}
          </>
        )}

        {status === "failed" && !dpaText && (
          <div className="border border-red-300 rounded-lg p-4 bg-red-50">
            <p className="font-medium text-red-900">Test failed. See log above for details.</p>
            <p className="text-xs font-mono mt-2">Check edge logs for generate-dpa.</p>
          </div>
        )}
      </div>
    </div>
  );
}
