import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import Navbar from "@/components/Navbar";

const MOCK_INPUT = {
  frameworks: [
    { code: "EU_GDPR", name: "EU GDPR", region: "EU" },
    { code: "UK_GDPR", name: "UK GDPR", region: "UK" },
    { code: "CH_FADP", name: "Swiss FADP", region: "CH" },
  ],
  company_name: "Meridian Health Analytics Ltd",
  company_address:
    "1 Innovation Square, London EC2A 4BX, United Kingdom (Company No. 12345678, registered in England and Wales)",
  dpo_name: "Dr. Sarah Chen, Privacy Officer",
  dpo_email: "privacy@meridianhealth.io",
  contact_email: "privacy@meridianhealth.io",
  retention:
    "Risk scores: 24 months from generation. Employment records: duration of employment plus 6 years. Marketing contacts: 2 years post-last engagement.",
  supervisory_authorities:
    "EU: Irish Data Protection Commission (DPC). UK: Information Commissioner's Office (ICO). Switzerland: Federal Data Protection and Information Commissioner (FDPIC).",
};

type FwText = { code: string; text: string };

const ASSERTIONS: { label: string; fn: (texts: FwText[]) => boolean }[] = [
  {
    label: "Output contains controller identity (Article 13 disclosure)",
    fn: (s) =>
      s.some(
        (t) =>
          /Meridian Health Analytics/i.test(t.text) &&
          /(controller|who we are)/i.test(t.text)
      ),
  },
  {
    label: "Output contains lawful basis section",
    fn: (s) =>
      s.every((t) => /(lawful basis|Art\.?\s*6)/i.test(t.text)),
  },
  {
    label: "Output mentions Article 9 / special category conditions",
    fn: (s) =>
      s.some((t) =>
        /(article\s*9|special category|health data|Art\.?\s*9)/i.test(t.text)
      ),
  },
  {
    label:
      "Output contains data subject rights section listing core rights",
    fn: (s) =>
      s.some(
        (t) =>
          /access/i.test(t.text) &&
          /rectif/i.test(t.text) &&
          /eras/i.test(t.text) &&
          /restrict/i.test(t.text) &&
          /portab/i.test(t.text) &&
          /object/i.test(t.text)
      ),
  },
  {
    label:
      "Output contains international transfer section with SCC mechanism",
    fn: (s) =>
      s.some(
        (t) =>
          /international transfer/i.test(t.text) &&
          /(SCC|Standard Contractual Clauses)/i.test(t.text)
      ),
  },
  {
    label:
      "Output contains supervisory authority complaint right (ICO and/or DPC)",
    fn: (s) =>
      s.some(
        (t) =>
          /supervisory authority|complaint/i.test(t.text) &&
          /(ICO|DPC|Information Commissioner|Data Protection Commission)/i.test(
            t.text
          )
      ),
  },
  {
    label: "Output contains automated decision-making section",
    fn: (s) =>
      s.some((t) =>
        /automated decision/i.test(t.text)
      ),
  },
  {
    label: "Output has separate sections for EU GDPR vs UK GDPR",
    fn: (s) => {
      const intl = s.find((t) => t.code === "_INTERNATIONAL");
      const target = intl?.text ?? s.map((t) => t.text).join("\n");
      return /EU GDPR/i.test(target) && /UK GDPR/i.test(target);
    },
  },
  {
    label: "Output contains Swiss FADP-specific section or note",
    fn: (s) =>
      s.some(
        (t) => /(swiss|FADP)/i.test(t.text)
      ),
  },
  {
    label: "Output length exceeds 2000 characters",
    fn: (s) => s.reduce((n, t) => n + t.text.length, 0) > 2000,
  },
];

export default function TestEUNotice() {
  const { user } = useAuth();
  const [status, setStatus] = useState<
    "idle" | "running" | "complete" | "failed"
  >("idle");
  const [fwTexts, setFwTexts] = useState<FwText[]>([]);
  const [docLinks, setDocLinks] = useState<
    { code: string; signedUrl: string }[]
  >([]);
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
    addLog("▶ Starting EU/Global Privacy Notice Builder test...");
    addLog(
      `▶ Frameworks: ${MOCK_INPUT.frameworks.map((f) => f.name).join(", ")}`
    );
    addLog(`▶ Logged in as: ${user.email}`);

    const tick = setInterval(
      () => setElapsed(Math.round((Date.now() - startTime) / 1000)),
      1000
    );

    try {
      // 1. Personal client
      const { data: clients, error: clientsErr } = await supabase
        .from("clients")
        .select("id, name")
        .eq("owner_id", user.id)
        .eq("is_active", true)
        .limit(1);
      if (clientsErr || !clients?.length)
        throw new Error(`No client: ${clientsErr?.message ?? "empty"}`);
      const clientId = clients[0].id;
      addLog(`✓ Client ${clientId}`);

      // 2. Create eu_notice_session (status=review allowed)
      addLog("▶ Creating eu_notice_session (scope=suite)...");
      const { data: session, error: sessErr } = await supabase
        .from("eu_notice_sessions")
        .insert({
          client_id: clientId,
          status: "review",
          scope: "suite",
          mode: "standalone",
          payment_confirmed: true,
          paid_at: new Date().toISOString(),
        })
        .select("id")
        .single();
      if (sessErr || !session)
        throw new Error(`session: ${sessErr?.message}`);
      setSessionId(session.id);
      addLog(`✓ Session ${session.id}`);

      // 3. Framework selections
      addLog("▶ Inserting framework selections...");
      const { error: fwErr } = await supabase
        .from("eu_notice_framework_selections")
        .insert(
          MOCK_INPUT.frameworks.map((f) => ({
            session_id: session.id,
            framework_code: f.code,
            framework_name: f.name,
            region: f.region,
          }))
        );
      if (fwErr) throw new Error(`frameworks: ${fwErr.message}`);

      // 4. Universal answers (matching template question_keys)
      addLog("▶ Inserting universal answers...");
      const universal: Record<string, unknown> = {
        controller_name: MOCK_INPUT.company_name,
        controller_address: MOCK_INPUT.company_address,
        contact_email: MOCK_INPUT.contact_email,
        dpo_details: "yes",
        dpo_name: MOCK_INPUT.dpo_name,
        dpo_email: MOCK_INPUT.dpo_email,
        processing_purposes: [
          "service_delivery",
          "analytics",
          "marketing",
          "security",
          "legal_compliance",
        ],
        data_categories: [
          "identifiers",
          "health_medical",
          "professional",
          "internet_activity",
        ],
        lawful_basis: [
          "legitimate_interests",
          "contract",
          "legal_obligation",
          "consent",
        ],
        third_party_recipients: [
          "service_providers",
          "analytics",
          "regulators",
        ],
        transfer_outside_eea: "yes",
        transfer_safeguards: ["sccs", "uk_addendum"],
        retention_period: MOCK_INPUT.retention,
        automated_decisions: "yes",
        // extra context that may surface in newer template builds
        special_category_basis:
          "Article 9(2)(a) explicit consent for health data; Article 9(2)(b) employment law for HR",
        supervisory_authority_eu: "Irish Data Protection Commission (DPC)",
        supervisory_authority_uk: "Information Commissioner's Office (ICO)",
      };
      const answerRows = Object.entries(universal).map(([k, v]) => ({
        session_id: session.id,
        question_key: k,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        answer_value: v as any,
      }));
      const { error: ansErr } = await supabase
        .from("eu_notice_answers")
        .insert(answerRows);
      if (ansErr) throw new Error(`answers: ${ansErr.message}`);
      addLog(`✓ ${answerRows.length} answers inserted`);

      // 5. Invoke generator
      addLog("▶ Invoking generate-eu-notice...");
      const { data: gen, error: genErr } = await supabase.functions.invoke(
        "generate-eu-notice",
        { body: { session_id: session.id } }
      );
      clearInterval(tick);

      if (genErr || !gen?.documents?.length) {
        throw new Error(
          `generator: ${genErr?.message ?? gen?.error ?? "no documents"}`
        );
      }
      addLog(`✓ Generated ${gen.documents.length} document(s)`);

      // 6. Sign + fetch each
      addLog("▶ Fetching documents...");
      const fetched: FwText[] = [];
      const signedList: { code: string; signedUrl: string }[] = [];
      for (const doc of gen.documents as Array<{
        framework_code: string;
        file_path: string;
      }>) {
        const { data: signed, error: signErr } = await supabase.storage
          .from("eu-notices")
          .createSignedUrl(doc.file_path, 3600);
        if (signErr || !signed?.signedUrl) {
          addLog(
            `⚠ sign error for ${doc.framework_code}: ${signErr?.message}`
          );
          continue;
        }
        signedList.push({
          code: doc.framework_code,
          signedUrl: signed.signedUrl,
        });
        const resp = await fetch(signed.signedUrl);
        const text = await resp.text();
        fetched.push({ code: doc.framework_code, text });
        addLog(`  ✓ ${doc.framework_code} (${text.length} chars)`);
      }
      setDocLinks(signedList);
      setFwTexts(fetched);
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
    passed: fwTexts.length
      ? (() => {
          try {
            return a.fn(fwTexts);
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
          <h1 className="font-serif mb-2">
            🧪 TEST: EU / Global Privacy Notice Builder
          </h1>
          <p className="text-sm text-muted-foreground">
            Meridian Health Analytics · EU GDPR + UK GDPR + Swiss FADP ·
            template assembler (no AI)
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

        {fwTexts.length > 0 && (
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

            <div className="border rounded-lg p-4 bg-card">
              <h2 className="font-serif mb-2">Generated documents</h2>
              <ul className="text-sm space-y-1">
                {docLinks.map((d) => (
                  <li key={d.code}>
                    <a
                      className="text-brand-teal underline"
                      href={d.signedUrl}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Open {d.code} notice (signed URL, expires 1h)
                    </a>
                  </li>
                ))}
              </ul>
              {sessionId && (
                <p className="text-xs font-mono text-muted-foreground mt-2">
                  session_id: {sessionId}
                </p>
              )}
            </div>

            {fwTexts.map((s) => (
              <details
                key={s.code}
                className="border rounded-lg p-4 bg-card"
              >
                <summary className="cursor-pointer font-medium">
                  {s.code} document source ({s.text.length} chars)
                </summary>
                <pre className="text-xs whitespace-pre-wrap mt-3 max-h-[600px] overflow-auto">
                  {s.text}
                </pre>
              </details>
            ))}
          </>
        )}

        {status === "failed" && fwTexts.length === 0 && (
          <div className="border border-red-300 rounded-lg p-4 bg-red-50">
            <p className="font-medium text-red-900">
              Test failed. See log above for details.
            </p>
            <p className="text-xs font-mono mt-2">
              Check edge logs for generate-eu-notice.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
