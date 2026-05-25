import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import Navbar from "@/components/Navbar";

const MOCK_INTAKE = {
  biometric_type: "Facial geometry / facial recognition",
  org_type: "Employer (employee biometrics)",
  purpose: "Time and attendance — employee clock-in/clock-out for a manufacturing facility",
  jurisdictions: ["United Kingdom", "Illinois, USA (BIPA)"],
  enrolled_count: "2500",
  sector: "Manufacturing",
  third_party_vendor:
    "Yes — biometric time clock provided by a US-based vendor with cloud processing",
  existing_consent: "Embedded in employment contract, not standalone",
  retention_policy: "Not formally documented",
};

// Map → check-biometric-compliance body shape (see supabase/functions/check-biometric-compliance/index.ts).
const buildBody = (userId?: string) => ({
  biometricTypes: [MOCK_INTAKE.biometric_type],
  orgType: MOCK_INTAKE.org_type,
  purpose:
    `${MOCK_INTAKE.purpose}. Sector: ${MOCK_INTAKE.sector}. ` +
    `Vendor: ${MOCK_INTAKE.third_party_vendor}. ` +
    `Existing consent: ${MOCK_INTAKE.existing_consent}. ` +
    `Retention policy: ${MOCK_INTAKE.retention_policy}.`,
  jurisdictions: MOCK_INTAKE.jurisdictions,
  enrolledCount: "500-5,000",
  user_id: userId ?? null,
  is_free_tier: false,
});

const ASSERTIONS = [
  { label: "Contains UK jurisdiction assessment", fn: (t: string) => /united kingdom|UK GDPR|\bUK\b/i.test(t) },
  { label: "Contains Illinois (BIPA) jurisdiction assessment", fn: (t: string) => /illinois/i.test(t) },
  { label: 'UK section references "Serco" or "ICO"', fn: (t: string) => /serco|\bICO\b/i.test(t) },
  { label: 'UK section references "Article 35" (DPIA)', fn: (t: string) => /article\s*35|art\.?\s*35/i.test(t) },
  { label: 'Illinois section references "BIPA" and §15', fn: (t: string) => /BIPA/i.test(t) && /(§|section)\s*15/i.test(t) },
  {
    label: "Illinois section mentions BIPA statutory damages or aggregate exposure",
    fn: (t: string) => {
      const ilMatch = t.match(/###\s*ILLINOIS[\s\S]*?(?=###\s*UNITED KINGDOM|###\s*UK\b|$)/i);
      const segment = ilMatch?.[0] ?? t;
      return /\$\s*1[,.]?000|\$\s*5[,.]?000|1,000 per|5,000 per|liquidated damages|statutory damages|aggregate.*exposure|exposure.*million|\$[\d,.]+\s*[Mm]/i.test(segment);
    },
  },
  {
    label: "Illinois BIPA risk rating is HIGH, CRITICAL, or Significant",
    fn: (t: string) => {
      const ilMatch = t.match(/###\s*ILLINOIS[\s\S]*?(?=###\s*UNITED KINGDOM|###\s*UK\b|$)/i);
      const segment = ilMatch?.[0] ?? t;
      return /(HIGH|CRITICAL|Significant|severe|substantial|CRITICAL\s*$)/i.test(segment);
    },
  },
  {
    label: "UK risk rating is HIGH or CRITICAL",
    fn: (t: string) => {
      const ukMatch = t.match(/###\s*UNITED KINGDOM[\s\S]*?(?=###\s*ILLINOIS|###\s*BIPA|$)/i);
      const segment = ukMatch?.[0] ?? t;
      return /(HIGH|CRITICAL|Significant|severe)/i.test(segment);
    },
  },
  {
    label: "Each jurisdiction section contains ≥3 action items or recommendations",
    fn: (t: string) => {
      const ilMatch = t.match(/###\s*ILLINOIS[\s\S]*?(?=###\s*UNITED KINGDOM|###\s*UK\b|$)/i);
      const ukMatch = t.match(/###\s*UNITED KINGDOM[\s\S]*?(?=###\s*ILLINOIS|$)/i);
      if (!ilMatch || !ukMatch) {
        return (t.match(/^\s*\d+[\.\)]/gm) || []).length >= 6;
      }
      const countItems = (s: string) =>
        (s.match(/^\s*\d+[\.\)]/gm) || []).length +
        (s.match(/^\s*[-*•]\s/gm) || []).length;
      return countItems(ilMatch[0]) >= 3 && countItems(ukMatch[0]) >= 3;
    },
  },
  { label: 'Contains "Article 9" (special category biometric data)', fn: (t: string) => /article\s*9|art\.?\s*9/i.test(t) },
];

export default function TestBiometric() {
  const { user } = useAuth();
  const [status, setStatus] = useState<"idle" | "running" | "complete" | "failed">("idle");
  const [text, setText] = useState<string>("");
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
    addLog("▶ Starting Biometric Compliance test...");
    addLog("▶ Scenario: UK + Illinois facial-recognition time clock · 2,500 employees");
    addLog(`▶ Logged in as: ${user.email}`);
    addLog("▶ Invoking check-biometric-compliance (expect 30–80s, Sonnet)...");

    const tick = setInterval(() => setElapsed(Math.round((Date.now() - startTime) / 1000)), 1000);

    const { data, error } = await supabase.functions.invoke("check-biometric-compliance", {
      body: buildBody(user.id),
    });
    clearInterval(tick);

    if (error || !data?.assessment_text) {
      addLog(`❌ Edge function error: ${error?.message || data?.error || "no assessment_text returned"}`);
      setStatus("failed");
      return;
    }

    addLog(`✅ Complete after ${Math.round((Date.now() - startTime) / 1000)}s`);
    addLog(`✓ Assessment length: ${data.assessment_text.length} chars`);
    if (data.id) {
      setRecordId(data.id);
      addLog(`✓ Stored as biometric_assessments.id = ${data.id}`);
    }
    if (data.bipa_risk) {
      addLog(
        `✓ BIPA range: $${data.bipa_risk.lowEnd?.toLocaleString?.() ?? "?"} – $${
          data.bipa_risk.highEnd?.toLocaleString?.() ?? "?"
        }`
      );
    }
    setText(data.assessment_text);
    setMeta({
      bipa_risk: data.bipa_risk,
      jurisdictions_analysed: data.jurisdictions_analysed,
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
    passed: text
      ? (() => {
          try {
            return a.fn(text);
          } catch {
            return false;
          }
        })()
      : null,
  }));
  const passCount = assertions.filter((a) => a.passed === true).length;
  const failCount = assertions.filter((a) => a.passed === false).length;

  return (
    <div className="min-h-screen bg-brand-cloud">
      <Navbar />
      <div className="max-w-5xl mx-auto px-6 py-8 space-y-6">
        <div>
          <h1 className="font-serif mb-2">🧪 TEST: Biometric Compliance Assessment</h1>
          <p className="text-sm text-muted-foreground">
            Manufacturer · facial-recognition time clock · UK + Illinois (BIPA) · 2,500 employees
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

        {text && (
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
                  href={`/biometric-checker/result/${recordId}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  Open full result → /biometric-checker/result/{recordId}
                </a>
              </div>
            )}

            <details className="border rounded-lg p-4 bg-card" open>
              <summary className="cursor-pointer font-medium">Assessment text ({text.length} chars)</summary>
              <pre className="text-xs whitespace-pre-wrap mt-3 max-h-[600px] overflow-auto">{text}</pre>
            </details>

            {meta && (
              <details className="border rounded-lg p-4 bg-card">
                <summary className="cursor-pointer font-medium">BIPA risk & enforcement precedents</summary>
                <pre className="text-xs overflow-auto mt-3">{JSON.stringify(meta, null, 2)}</pre>
              </details>
            )}
          </>
        )}

        {status === "failed" && !text && (
          <div className="border border-red-300 rounded-lg p-4 bg-red-50">
            <p className="font-medium text-red-900">Test failed. See log above for details.</p>
            <p className="text-xs font-mono mt-2">Check edge logs for check-biometric-compliance.</p>
          </div>
        )}
      </div>
    </div>
  );
}
