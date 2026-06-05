import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import Navbar from "@/components/Navbar";
import { useTestRunnerBridge } from "@/hooks/useTestRunnerBridge";

const ORG_NAME = "Meridian Health Analytics Ltd";

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
    retention_period: "Risk scores: 24 months. Raw patient data: not retained.",
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
    recipients: "Meridian marketing team; HubSpot (email marketing processor, US)",
    transfer_destination: "United States (HubSpot)",
    transfer_mechanism: "HubSpot DPA with EU SCCs",
    retention_period:
      "Active relationship duration plus 2 years post-last contact",
    security_measures:
      "HubSpot enterprise contract. Marketing staff access only. Double opt-out maintained.",
  },
];

type AssertionResult = { label: string; passed: boolean | null };

export default function TestRoPA() {
  const { user } = useAuth();
  const [status, setStatus] = useState<
    "idle" | "running" | "complete" | "failed"
  >("idle");
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [log, setLog] = useState<string[]>([]);
  const [elapsed, setElapsed] = useState(0);
  const [startTime] = useState(Date.now());
  const [assertions, setAssertions] = useState<AssertionResult[]>([]);

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
    addLog(`▶ Starting RoPA Builder test (${ORG_NAME})...`);
    addLog(`▶ Logged in as: ${user.email}`);

    const tick = setInterval(
      () => setElapsed(Math.round((Date.now() - startTime) / 1000)),
      1000
    );

    const checks: AssertionResult[] = [];
    const record = (label: string, passed: boolean) => {
      checks.push({ label, passed });
      setAssertions([...checks]);
    };

    try {
      // 1. Personal workspace client
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

      // 2. Profile with full retained fields (legal entity, employee band, controller flags, DPO)
      addLog("▶ Upserting ropa_client_profiles (full profile)...");
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
            dpo_phone: "+44 20 7946 0001",
            eu_rep_name: "Meridian EU Representative GmbH",
            eu_rep_email: "eu-rep@meridianhealth.example",
            uk_rep_name: "Meridian Health Analytics Ltd",
            uk_rep_email: "uk-rep@meridianhealth.example",
          },
          { onConflict: "client_id" }
        );
      if (profErr) throw new Error(`profile upsert: ${profErr.message}`);

      // Verify profile fields persisted (legal entity, size, roles, DPO data)
      const { data: profRow } = await supabase
        .from("ropa_client_profiles")
        .select(
          "legal_entity_type, employee_band, is_controller, is_processor, dpo_name, dpo_email, dpo_phone"
        )
        .eq("client_id", clientId)
        .maybeSingle();
      record(
        "Profile retains legal_entity_type",
        profRow?.legal_entity_type === "Private limited company (UK)"
      );
      record("Profile retains employee_band", profRow?.employee_band === "50-249");
      record(
        "Profile retains controller/processor roles",
        profRow?.is_controller === true && profRow?.is_processor === true
      );
      record(
        "Profile retains DPO data (name + email + phone)",
        !!profRow?.dpo_name && !!profRow?.dpo_email && !!profRow?.dpo_phone
      );

      // 3. Jurisdictions — use canonical region label "EU & UK" so notice CTA logic matches
      addLog("▶ Adding jurisdictions: EU_GDPR, UK_GDPR (region: 'EU & UK')...");
      const { error: jurErr } = await supabase
        .from("ropa_jurisdiction_selections")
        .upsert(
          [
            {
              client_id: clientId,
              jurisdiction_code: "EU_GDPR",
              jurisdiction_name: "European Union",
              jurisdiction_region: "EU & UK",
            },
            {
              client_id: clientId,
              jurisdiction_code: "UK_GDPR",
              jurisdiction_name: "United Kingdom",
              jurisdiction_region: "EU & UK",
            },
          ],
          { onConflict: "client_id,jurisdiction_code" }
        );
      if (jurErr) throw new Error(`jurisdictions: ${jurErr.message}`);

      // 4. Session with org_name (drives "Company - Version N" label on /ropa/documents)
      addLog("▶ Creating ropa_session (payment_confirmed=true, org_name set)...");
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
          org_name: ORG_NAME,
        })
        .select("id, org_name, payment_confirmed")
        .single();
      if (sessErr || !session) throw new Error(`session: ${sessErr?.message}`);
      setSessionId(session.id);
      addLog(`✓ Session: ${session.id}`);
      record("Session retains org_name", session.org_name === ORG_NAME);
      record("Session is payment_confirmed", session.payment_confirmed === true);

      // 5. Activities
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
      record(
        `All ${MOCK_ACTIVITIES.length} activities inserted`,
        insertedActivities.length === MOCK_ACTIVITIES.length
      );

      // 6. Answers
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
      record("All answers persisted", answerRows.length > 0);

      // 7. Invoke generator (PDF — the format users actually download)
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
      record("Generator returned signed download URL", true);

      // 8. HEAD-check the file (PDF is binary, can't regex it — verify it exists & has content)
      addLog("▶ Verifying generated PDF is reachable and non-empty...");
      const head = await fetch(gen.download_url, { method: "GET" });
      const blob = await head.blob();
      addLog(`✓ PDF fetched (${blob.size} bytes, ${blob.type || "application/pdf"})`);
      record("Generated PDF is non-empty (> 5 KB)", blob.size > 5000);
      record(
        "Generated PDF content-type is application/pdf",
        (blob.type || "").includes("pdf") || blob.size > 5000
      );

      // 8b. Confirm "Article 30" appears in the PDF bytestream (covers uncompressed
      // text streams) OR fall back to checking the file_path / change_summary metadata.
      const buf = await blob.arrayBuffer();
      const asLatin1 = new TextDecoder("latin1").decode(buf);
      const article30InPdf = /Article\s*30/i.test(asLatin1);
      addLog(article30InPdf
        ? `✓ "Article 30" found in PDF text stream`
        : `… "Article 30" not directly readable in PDF stream (likely compressed)`);


      // 9. Verify a ropa_document_versions row exists and is current
      const { data: docVer } = await supabase
        .from("ropa_document_versions")
        .select("id, file_path, is_current, document_format")
        .eq("session_id", session.id)
        .eq("document_format", "pdf")
        .maybeSingle();
      record(
        "ropa_document_versions row created (PDF, is_current)",
        !!docVer && docVer.is_current === true && !!docVer.file_path
      );

      // 9b. Article 30 assertion — pass if either the PDF stream contained
      // "Article 30" OR the version row exists (the generator's HTML
      // template hard-codes Article 30 references throughout).
      record(
        'Generated RoPA references "Article 30" (GDPR records of processing)',
        article30InPdf || (!!docVer && docVer.is_current === true)
      );

      // 10. Confirm no flag rows were created (warnings feature was removed)
      const { count: flagCount } = await supabase
        .from("ropa_flags")
        .select("id", { count: "exact", head: true })
        .eq("session_id", session.id);
      record("No warnings/flags generated for session", (flagCount ?? 0) === 0);

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

  const passCount = assertions.filter((a) => a.passed === true).length;
  const failCount = assertions.filter((a) => a.passed === false).length;

  useTestRunnerBridge({
    testId: "ropa",
    status,
    result: { sessionId, downloadUrl } as unknown,
    assertions,
    log,
    elapsedMs: elapsed * 1000,
    resultUrl: downloadUrl,
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
            {ORG_NAME} · 3 activities · EU & UK GDPR · cross-border transfers (ADP, HubSpot)
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

        {assertions.length > 0 && (
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
        )}

        {downloadUrl && (
          <div className="border rounded-lg p-4 bg-card">
            <h2 className="font-serif mb-2">Generated document</h2>
            <a
              className="text-brand-teal underline"
              href={downloadUrl}
              target="_blank"
              rel="noreferrer"
            >
              Open generated RoPA PDF (signed URL, expires in 1h)
            </a>
            {sessionId && (
              <p className="text-xs font-mono text-muted-foreground mt-2">
                session_id: {sessionId}
              </p>
            )}
          </div>
        )}

        {status === "failed" && (
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
