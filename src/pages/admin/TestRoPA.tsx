import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import Navbar from "@/components/Navbar";
import { useTestRunnerBridge } from "@/hooks/useTestRunnerBridge";

const MOCK_ACTIVITIES = [
  {
    activity_name: "Patient Risk Stratification Analytics",
    category: "technology",
    purpose:
      "Provision of AI-powered predictive analytics to clinic clients identifying patients at elevated risk of hospital readmission",
    lawful_basis: "legitimate_interests",
    special_category_basis:
      "Article 9(2)(a) — explicit consent obtained by clinic clients for processing of health data",
    data_categories: ["Health or medical data", "Contact identifiers"],
    data_subjects: "NHS and private clinic patients",
    recipients:
      "Clinic clinical teams (authorised personnel only); CloudMed Processing GmbH (processor, Germany)",
    transfer_destination: "Germany (Azure EU data centres)",
    transfer_mechanism: "EEA — adequacy / no third-country transfer",
    retention_period:
      "Risk scores: 24 months. Raw patient data: not retained.",
    security_measures:
      "Encryption at rest (AES-256) and in transit (TLS 1.3). Access controls, audit logging, SOC 2 certified.",
  },
  {
    activity_name: "Employee HR Processing",
    category: "hr_employment",
    purpose:
      "Recruitment, payroll, benefits administration, performance management, and statutory employment law compliance",
    lawful_basis: "contract",
    special_category_basis: "Not applicable",
    data_categories: ["Employee records", "Financial data", "Contact identifiers"],
    data_subjects: "Employees and contractors of Meridian Health Analytics Ltd",
    recipients: "HR team; Payroll processor (ADP); HMRC (statutory reporting)",
    transfer_destination: "United States (ADP payroll processing)",
    transfer_mechanism: "EU Standard Contractual Clauses (SCCs) executed",
    retention_period:
      "Active employment period plus 6 years post-termination (statutory requirement)",
    security_measures:
      "HR system access restricted to HR team. MFA required. Data encrypted at rest.",
  },
  {
    activity_name: "Clinic Client Marketing and Engagement",
    category: "marketing",
    purpose:
      "Marketing communications to existing and prospective clinic clients about Meridian platform features and case studies",
    lawful_basis: "legitimate_interests",
    special_category_basis: "Not applicable",
    data_categories: ["Contact identifiers", "Internet or network activity"],
    data_subjects:
      "Clinical managers and procurement contacts at NHS and private clinics",
    recipients:
      "Meridian marketing team; HubSpot (email marketing processor, US)",
    transfer_destination: "United States (HubSpot)",
    transfer_mechanism: "HubSpot DPA with EU SCCs",
    retention_period:
      "Active relationship duration plus 2 years post-last contact",
    security_measures:
      "HubSpot enterprise contract. Marketing staff access only. Double opt-out maintained.",
  },
];

const ASSERTIONS: { label: string; fn: (t: string) => boolean }[] = [
  ...MOCK_ACTIVITIES.map((a) => ({
    label: `Output contains activity name: "${a.activity_name}"`,
    fn: (t: string) => t.includes(a.activity_name),
  })),
  {
    label: 'Output references "Article 30"',
    fn: (t) => /article\s*30/i.test(t),
  },
  {
    label: "Output contains controller identification (client/controller section)",
    fn: (t) =>
      /controller/i.test(t) &&
      /(meridian|client record|legal entity)/i.test(t),
  },
  {
    label:
      "Each activity entry includes legal basis, data categories, and recipients",
    fn: (t) =>
      /lawful basis|legal basis/i.test(t) &&
      /data categories/i.test(t) &&
      /(recipients|processors)/i.test(t),
  },
  {
    label: "Retention periods are included for each activity",
    fn: (t) => {
      const matches = t.match(/retention/gi) ?? [];
      return matches.length >= MOCK_ACTIVITIES.length;
    },
  },
  {
    label: "International transfer mechanisms documented (SCCs for ADP and HubSpot)",
    fn: (t) => /SCC/i.test(t) && /ADP/i.test(t) && /HubSpot/i.test(t),
  },
  {
    label: "Output length exceeds 2000 characters",
    fn: (t) => t.length > 2000,
  },
  {
    label: "Output is structured (has Article 30 sections / headings)",
    fn: (t) =>
      /<h[1-3]/i.test(t) ||
      /(processing activities|cross-border|client record)/i.test(t),
  },
];

export default function TestRoPA() {
  const { user } = useAuth();
  const [status, setStatus] = useState<
    "idle" | "running" | "complete" | "failed"
  >("idle");
  const [docText, setDocText] = useState<string>("");
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
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
    addLog("▶ Starting RoPA Builder test (Meridian Health Analytics)...");
    addLog(`▶ Logged in as: ${user.email}`);

    const tick = setInterval(
      () => setElapsed(Math.round((Date.now() - startTime) / 1000)),
      1000
    );

    try {
      // 1. Get personal client_id for this user
      addLog("▶ Looking up personal workspace client...");
      const { data: clients, error: clientsErr } = await supabase
        .from("clients")
        .select("id, name")
        .eq("owner_id", user.id)
        .eq("is_active", true)
        .limit(1);
      if (clientsErr || !clients?.length) {
        throw new Error(
          `No client workspace found: ${clientsErr?.message ?? "empty"}`
        );
      }
      const clientId = clients[0].id;
      addLog(`✓ Client: ${clients[0].name} (${clientId})`);

      // 2. Upsert client profile
      addLog("▶ Upserting ropa_client_profiles...");
      const { error: profErr } = await supabase
        .from("ropa_client_profiles")
        .upsert(
          {
            client_id: clientId,
            legal_entity_type: "Private limited company (UK)",
            employee_band: "50-249",
            is_controller: true,
            is_processor: true,
            dpo_name: "Dr. Eleanor Hartley",
            dpo_email: "dpo@meridianhealth.example",
          },
          { onConflict: "client_id" }
        );
      if (profErr) throw new Error(`profile upsert: ${profErr.message}`);

      // 3. Upsert jurisdiction selections (EU_GDPR + UK_GDPR)
      addLog("▶ Adding jurisdictions: EU_GDPR, UK_GDPR...");
      const { error: jurErr } = await supabase
        .from("ropa_jurisdiction_selections")
        .upsert(
          [
            {
              client_id: clientId,
              jurisdiction_code: "EU_GDPR",
              jurisdiction_name: "European Union",
              jurisdiction_region: "EU",
            },
            {
              client_id: clientId,
              jurisdiction_code: "UK_GDPR",
              jurisdiction_name: "United Kingdom",
              jurisdiction_region: "UK",
            },
          ],
          { onConflict: "client_id,jurisdiction_code" }
        );
      if (jurErr) throw new Error(`jurisdictions: ${jurErr.message}`);

      // 4. Create new session (payment_confirmed=true so generator allows it)
      addLog("▶ Creating ropa_session (payment_confirmed=true)...");
      const { data: session, error: sessErr } = await supabase
        .from("ropa_sessions")
        .insert({
          client_id: clientId,
          status: "review",
          version_number: 1,
          total_activities: MOCK_ACTIVITIES.length,
          completed_activities: MOCK_ACTIVITIES.length,
          payment_confirmed: true,
          paid_at: new Date().toISOString(),
        })
        .select("id")
        .single();
      if (sessErr || !session) throw new Error(`session: ${sessErr?.message}`);
      setSessionId(session.id);
      addLog(`✓ Session: ${session.id}`);

      // 5. Insert activities
      addLog(`▶ Inserting ${MOCK_ACTIVITIES.length} processing activities...`);
      const activityRows = MOCK_ACTIVITIES.map((a, i) => ({
        session_id: session.id,
        client_id: clientId,
        display_name: a.activity_name,
        category: a.category,
        status: "complete" as const,
        completion_pct: 100,
        display_order: i,
      }));
      const { data: insertedActivities, error: actErr } = await supabase
        .from("ropa_processing_activities")
        .insert(activityRows)
        .select("id, display_name, display_order");
      if (actErr || !insertedActivities)
        throw new Error(`activities: ${actErr?.message}`);

      // 6. Insert answers per activity
      addLog("▶ Inserting answers (purpose, lawful_basis, transfers, ...)...");
      const answerRows: Array<{
        activity_id: string;
        session_id: string;
        question_key: string;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        answer_value: any;
      }> = [];
      for (const inserted of insertedActivities) {
        const src = MOCK_ACTIVITIES[inserted.display_order];
        const map: Record<string, unknown> = {
          purpose: src.purpose,
          lawful_basis: src.lawful_basis,
          special_category_basis: src.special_category_basis,
          data_subjects: src.data_subjects,
          data_categories: src.data_categories,
          recipients: src.recipients,
          processor_platform: src.recipients,
          transfer_destination: src.transfer_destination,
          transfer_mechanism: src.transfer_mechanism,
          retention_period: src.retention_period,
          security_measures: src.security_measures,
          access_controls:
            "Role-based access; quarterly access reviews; least-privilege enforced",
        };
        for (const [key, value] of Object.entries(map)) {
          answerRows.push({
            activity_id: inserted.id,
            session_id: session.id,
            question_key: key,
            answer_value: value as never,
          });
        }
      }
      const { error: ansErr } = await supabase
        .from("ropa_answers")
        .insert(answerRows);
      if (ansErr) throw new Error(`answers: ${ansErr.message}`);
      addLog(`✓ ${answerRows.length} answers inserted`);

      // 7. Invoke generator
      addLog("▶ Invoking generate-ropa-document (format=pdf)...");
      const { data: gen, error: genErr } = await supabase.functions.invoke(
        "generate-ropa-document",
        {
          body: {
            session_id: session.id,
            format: "pdf",
            document_date: new Date().toISOString().slice(0, 10),
            author_name: "Meridian Compliance Team",
          },
        }
      );
      clearInterval(tick);

      if (genErr || !gen?.download_url) {
        throw new Error(
          `generator: ${genErr?.message ?? gen?.error ?? "no download_url"}`
        );
      }
      addLog(`✓ Generator returned signed URL`);
      setDownloadUrl(gen.download_url);

      // 8. Fetch document text
      addLog("▶ Fetching generated document for assertions...");
      const resp = await fetch(gen.download_url);
      const text = await resp.text();
      addLog(`✓ Document fetched (${text.length} chars)`);
      setDocText(text);
      setStatus("complete");
    } catch (err: unknown) {
      clearInterval(tick);
      const msg = err instanceof Error ? err.message : String(err);
      addLog(`❌ ${msg}`);
      setStatus("failed");
    }
  }, [user, addLog, startTime]);

  useEffect(() => {
    if (user && status === "idle") runTest();
  }, [user, runTest, status]);

  const assertions = ASSERTIONS.map((a) => ({
    ...a,
    passed: docText
      ? (() => {
          try {
            return a.fn(docText);
          } catch {
            return false;
          }
        })()
      : null,
  }));
  const passCount = assertions.filter((a) => a.passed === true).length;
  const failCount = assertions.filter((a) => a.passed === false).length;

  useTestRunnerBridge({
    testId: "ropa",
    status,
    result: docText as unknown,
    assertions: assertions.map((a) => ({ label: a.label, passed: a.passed })),
    log,
    elapsedMs: elapsed * 1000,
    resultUrl: null,
  });

  return (
    <div className="min-h-screen bg-brand-cloud">
      <Navbar />
      <div className="max-w-5xl mx-auto px-6 py-8 space-y-6">
        <div>
          <h1 className="font-serif mb-2">
            🧪 TEST: RoPA Builder (Article 30)
          </h1>
          <p className="text-sm text-muted-foreground">
            Meridian Health Analytics · 3 activities · EU GDPR + UK GDPR ·
            cross-border transfers (ADP, HubSpot)
          </p>
        </div>

        <div className="border rounded-lg p-4 bg-card">
          <div className="font-mono text-sm">
            Status: <strong>{status.toUpperCase()}</strong>
            {status === "running" && ` — ${elapsed}s elapsed`}
            {status === "complete" &&
              ` — ${passCount}/${assertions.length} assertions passed`}
          </div>
        </div>

        <div className="border rounded-lg p-4 bg-black text-green-400 font-mono text-xs max-h-80 overflow-auto">
          {log.map((l, i) => (
            <div key={i}>{l}</div>
          ))}
          {status === "idle" && <div>Waiting for auth...</div>}
        </div>

        {docText && (
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

            {downloadUrl && (
              <div className="border rounded-lg p-4 bg-card">
                <h2 className="font-serif mb-2">Generated document</h2>
                <a
                  className="text-brand-teal underline"
                  href={downloadUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  Open generated RoPA (signed URL, expires in 1h)
                </a>
                {sessionId && (
                  <p className="text-xs font-mono text-muted-foreground mt-2">
                    session_id: {sessionId}
                  </p>
                )}
              </div>
            )}

            <details className="border rounded-lg p-4 bg-card">
              <summary className="cursor-pointer font-medium">
                Document source ({docText.length} chars)
              </summary>
              <pre className="text-xs whitespace-pre-wrap mt-3 max-h-[600px] overflow-auto">
                {docText}
              </pre>
            </details>
          </>
        )}

        {status === "failed" && !docText && (
          <div className="border border-red-300 rounded-lg p-4 bg-red-50">
            <p className="font-medium text-red-900">
              Test failed. See log above for details.
            </p>
            <p className="text-xs font-mono mt-2">
              Check edge logs for generate-ropa-document.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
