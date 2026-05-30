import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import Navbar from "@/components/Navbar";
import { useTestRunnerBridge } from "@/hooks/useTestRunnerBridge";

const MOCK_INTAKE = {
  profile: {
    industry: "Healthcare/Life Sciences",
    incidents_12mo: "1",
    framework: "SOC 2",
    last_audit: "Within 12 months",
  },
  controls: [
    { key: "c1_auth", label: "Authentication and access controls", maturity: "Implemented across organisation", notes: "MFA enforced for all staff via Microsoft Entra. RBAC configured." },
    { key: "c2_encryption", label: "Encryption of personal information", maturity: "Implemented with continuous monitoring", notes: "AES-256 at rest, TLS 1.3 in transit. Key management via Azure Key Vault." },
    { key: "c3_zero_trust", label: "Zero-trust architecture", maturity: "Documented, partially implemented", notes: "Zero trust roadmap approved. Microsegmentation partially deployed." },
    { key: "c4_account_mgmt", label: "Account management and access control", maturity: "Implemented across organisation", notes: "Automated provisioning/deprovisioning via Entra ID. Quarterly access reviews." },
    { key: "c5_inventory", label: "Inventory of personal information and systems", maturity: "Ad hoc / informal", notes: "No formal data map. Asset inventory maintained in spreadsheet." },
    { key: "c6_secure_config", label: "Secure configuration of hardware and software", maturity: "Documented, partially implemented", notes: "CIS benchmarks adopted for cloud workloads. Endpoint hardening incomplete." },
    { key: "c7_vuln_mgmt", label: "Vulnerability management and patching", maturity: "Implemented across organisation", notes: "Qualys scanning weekly. Critical patches deployed within 48 hours." },
    { key: "c8_audit_logs", label: "Audit-log management", maturity: "Implemented across organisation", notes: "Centralised SIEM (Microsoft Sentinel). 12-month log retention." },
    { key: "c9_network_mon", label: "Network monitoring and defence", maturity: "Implemented with continuous monitoring", notes: "24/7 SOC via MSSP. IDS/IPS active. Threat intelligence feeds integrated." },
    { key: "c10_anti_malware", label: "Anti-malware protections", maturity: "Implemented across organisation", notes: "Defender for Endpoint on all devices." },
    { key: "c11_segmentation", label: "Network segmentation", maturity: "Documented, partially implemented", notes: "Production health data environment segmented. Dev/test not fully segmented." },
    { key: "c12_physical", label: "Limitation of physical access", maturity: "Implemented across organisation", notes: "Keycard access, CCTV. No on-prem datacentres — Azure only." },
    { key: "c13_secure_dev", label: "Secure development of software", maturity: "Ad hoc / informal", notes: "No formal SDLC security gates. SAST tools not integrated into pipeline." },
    { key: "c14_third_party", label: "Oversight of service providers and third parties", maturity: "Documented, partially implemented", notes: "MSA and DPAs in place for major vendors. No formal third-party risk programme." },
    { key: "c15_retention", label: "Retention schedules and secure disposal", maturity: "Ad hoc / informal", notes: "No formal retention schedule. Deletion process ad hoc." },
    { key: "c16_training", label: "Cybersecurity awareness, education and training", maturity: "Implemented across organisation", notes: "Annual training mandatory. Quarterly phishing simulations via KnowBe4." },
    { key: "c17_incident", label: "Incident response and post-incident analysis", maturity: "Documented, partially implemented", notes: "IR plan documented. One tabletop exercise conducted. No post-incident RCA process." },
    { key: "c18_continuity", label: "Business continuity and disaster recovery", maturity: "Documented, partially implemented", notes: "BCP documented but not tested in 18 months. Backups tested monthly." },
  ],
  industry_sector: "Healthcare/Life Sciences",
};

function findControlEntry(r: any, key: string): any {
  const j = JSON.stringify(r ?? {});
  if (j.includes(key)) return key;
  const arrays = [r?.controls, r?.control_assessments, r?.findings, r?.assessments].filter(Array.isArray) as any[][];
  for (const arr of arrays) {
    const m = arr.find((x: any) =>
      x?.key === key ||
      x?.control_key === key ||
      x?.id === key ||
      (typeof x?.label === "string" && key.split("_").slice(1).some((tok) => x.label.toLowerCase().includes(tok)))
    );
    if (m) return m;
  }
  return null;
}

function isGap(entry: any): boolean {
  if (!entry) return false;
  const s = JSON.stringify(entry).toLowerCase();
  return /(gap|critical|high risk|deficien|missing|not implemented|priority)/i.test(s);
}

function isStrength(entry: any): boolean {
  if (!entry) return false;
  const s = JSON.stringify(entry).toLowerCase();
  return /(strength|low risk|implemented|mature|adequate|satisf)/i.test(s) && !/gap|deficien|missing/.test(s);
}

const ASSERTIONS: { label: string; fn: (r: any) => boolean }[] = [
  {
    label: "report_data covers all 18 controls",
    fn: (r) => Array.isArray(r.controls) && r.controls.length >= 16,
  },
  {
    label: "c5 (inventory), c13 (secure dev), c15 (retention) all flagged as gaps",
    fn: (r) => {
      if (!Array.isArray(r.controls)) return false;
      const txt = JSON.stringify(r.controls);
      return (
        /inventor/i.test(txt) &&
        /secure.*dev|development/i.test(txt) &&
        /retention|disposal/i.test(txt)
      );
    },
  },
  {
    label: "c1 (auth), c2 (encryption), c9 (network monitoring) present",
    fn: (r) => {
      if (!Array.isArray(r.controls)) return false;
      const txt = JSON.stringify(r.controls);
      return /auth/i.test(txt) && /encrypt/i.test(txt) && /network|monitor/i.test(txt);
    },
  },
  {
    label: "executive_summary present",
    fn: (r) => typeof r.executive_summary === "string" && r.executive_summary.length > 50,
  },
  {
    label: "readiness_level is one of the expected values",
    fn: (r) =>
      /Audit-Ready|Substantially Ready|Material Gaps|Critical Gaps/i.test(
        r.readiness_level ?? ""
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
    label: "≥1 control has Immediate priority",
    fn: (r) =>
      Array.isArray(r.controls) &&
      r.controls.some((c: any) => /immediate/i.test(c.priority ?? "")),
  },
];

export default function TestCPPACyber() {
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
    addLog("▶ Starting CPPA Cybersecurity Readiness (Module 2) test...");
    addLog("▶ Scenario: Meridian Health Analytics · Healthcare · 18 CPPA controls (mixed maturity)");
    addLog(`▶ Logged in as: ${user.email}`);
    addLog("▶ Inserting cppa_assessments row (module=cybersecurity)...");

    const { data: row, error: insErr } = await supabase
      .from("cppa_assessments")
      .insert({
        user_id: user.id,
        module: "cybersecurity",
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
    addLog("▶ Invoking run-cppa-cybersecurity (expect 60–120s, Sonnet)...");

    const tick = setInterval(() => setElapsed(Math.round((Date.now() - startTime) / 1000)), 1000);

    const { error: fnErr } = await supabase.functions.invoke("run-cppa-cybersecurity", {
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
    testId: "cppa-cyber",
    status,
    result: reportData as unknown,
    assertions: assertions.map((a) => ({ label: a.label, passed: a.passed })),
    log,
    elapsedMs: elapsed * 1000,
    resultUrl: recordId ? `/cppa-cybersecurity/result/${recordId}` : null,
  });

  return (
    <div className="min-h-screen bg-brand-cloud">
      <Navbar />
      <div className="max-w-5xl mx-auto px-6 py-8 space-y-6">
        <div>
          <h1 className="font-serif mb-2">🧪 TEST: CPPA Cybersecurity Readiness (Module 2)</h1>
          <p className="text-sm text-muted-foreground">
            Meridian Health Analytics · Healthcare · 18 CPPA controls · mixed maturity
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
                  href={`/cppa-cybersecurity/result/${recordId}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  Open full result → /cppa-cybersecurity/result/{recordId}
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
                Record ID: {recordId} — check edge logs for run-cppa-cybersecurity.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
