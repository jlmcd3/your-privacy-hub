import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import Navbar from "@/components/Navbar";
import { useTestRunnerBridge } from "@/hooks/useTestRunnerBridge";

const MOCK_INPUT = {
  states: [
    { name: "California", code: "CA", framework: "ccpa" as const },
    { name: "Virginia", code: "VA", framework: "virginia_model" as const },
    { name: "Texas", code: "TX", framework: "virginia_model" as const },
  ],
  company_name: "Meridian Health Analytics Ltd",
  website: "https://meridianhealth.io",
  contact_email: "privacy@meridianhealth.io",
  data_categories_collected: [
    "Identifiers (name, email, IP address)",
    "Health or medical information",
    "Employment and professional information",
    "Internet or network activity",
    "Inferences drawn from other categories",
  ],
  data_sources: [
    "Directly from individuals",
    "Clinic EHR systems (B2B)",
    "Third-party analytics vendors",
  ],
  purposes: [
    "Providing our analytics services to clinic clients",
    "Internal research and development",
    "Marketing and business development",
    "Fraud prevention and security",
    "Legal compliance",
  ],
  sells_data: false,
  shares_for_advertising: false,
  sensitive_data: true,
  sensitive_data_types: ["Health information", "Precise geolocation"],
  processes_children: false,
  dpo_email: "privacy@meridianhealth.io",
  retention:
    "Personal information is retained as long as needed to provide our services and to comply with legal obligations. Health-derived risk scores: 24 months. Marketing contacts: 2 years post-last engagement.",
  business_description:
    "Meridian Health Analytics provides AI-powered patient risk-stratification analytics to NHS and private clinics in the UK and US.",
  third_party_categories:
    "Cloud infrastructure providers; payroll processor (US); marketing email platform (US); statutory recipients (HMRC, regulators).",
};

type StateText = { state: string; text: string };

const ASSERTIONS: { label: string; fn: (texts: StateText[]) => boolean }[] = [
  {
    label: "Output contains a California / CCPA section",
    fn: (s) =>
      s.some(
        (t) =>
          /california/i.test(t.text) &&
          /(CCPA|California Consumer Privacy Act)/i.test(t.text)
      ),
  },
  {
    label: "Output contains a Virginia / CDPA section",
    fn: (s) =>
      s.some(
        (t) =>
          /virginia/i.test(t.text) &&
          /(CDPA|Virginia|virginia-model)/i.test(t.text)
      ),
  },
  {
    label: "Output contains a Texas / TDPSA section",
    fn: (s) => s.some((t) => /texas/i.test(t.text)),
  },
  {
    label: 'California section includes "right to delete" / erasure',
    fn: (s) => {
      const ca = s.find((t) => t.state === "CA" || t.state === "_suite");
      return !!ca && /(delet|erasure)/i.test(ca.text);
    },
  },
  {
    label: 'California section includes "right to opt out of sale"',
    fn: (s) => {
      const ca = s.find((t) => t.state === "CA" || t.state === "_suite");
      return !!ca && /opt[- ]out[\s\S]{0,40}(sale|sell|sharing)/i.test(ca.text);
    },
  },
  {
    label: 'Virginia section includes "right to correct"',
    fn: (s) => {
      const va = s.find((t) => t.state === "VA" || t.state === "_suite");
      return !!va && /(right to correct|correction)/i.test(va.text);
    },
  },
  {
    label: "Output contains contact information for privacy requests",
    fn: (s) =>
      s.some((t) => /privacy@meridianhealth\.io/i.test(t.text)),
  },
  {
    label: "Output is structured HTML with clear section headers",
    fn: (s) => s.every((t) => /<h[12][^>]*>/i.test(t.text)),
  },
  {
    label: "Output length exceeds 1500 characters per state section",
    fn: (s) =>
      s
        .filter((t) => t.state !== "_suite")
        .every((t) => t.text.length > 1500),
  },
];

export default function TestUSNotice() {
  const { user } = useAuth();
  const [status, setStatus] = useState<
    "idle" | "running" | "complete" | "failed"
  >("idle");
  const [stateTexts, setStateTexts] = useState<StateText[]>([]);
  const [docPaths, setDocPaths] = useState<
    { state: string; signedUrl: string }[]
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
    addLog("▶ Starting US Privacy Notice Builder test...");
    addLog(`▶ States: ${MOCK_INPUT.states.map((s) => s.name).join(", ")}`);
    addLog(`▶ Logged in as: ${user.email}`);

    const tick = setInterval(
      () => setElapsed(Math.round((Date.now() - startTime) / 1000)),
      1000
    );

    try {
      // 1. Personal client
      addLog("▶ Looking up personal workspace...");
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

      // 2. Create session
      addLog("▶ Creating us_notice_session (scope=all_states)...");
      const { data: session, error: sessErr } = await supabase
        .from("us_notice_sessions")
        .insert({
          client_id: clientId,
          status: "review",
          scope: "all_states",
          mode: "standalone",
          payment_confirmed: true,
          paid_at: new Date().toISOString(),
        })
        .select("id")
        .single();
      if (sessErr || !session) throw new Error(`session: ${sessErr?.message}`);
      setSessionId(session.id);
      addLog(`✓ Session ${session.id}`);

      // 3. State selections
      addLog("▶ Inserting state selections...");
      const { data: insertedStates, error: stateErr } = await supabase
        .from("us_notice_state_selections")
        .insert(
          MOCK_INPUT.states.map((s) => ({
            session_id: session.id,
            state_code: s.code,
            state_name: s.name,
            framework_type: s.framework,
          }))
        )
        .select("id");
      if (stateErr) throw new Error(`states: ${stateErr.message}`);
      if (!insertedStates || insertedStates.length === 0) {
        throw new Error(
          `State selections insert returned 0 rows — RLS may have blocked the insert. ` +
          `Session id: ${session.id}, client_id: ${clientId}. ` +
          `Verify owns_client(${clientId}) returns true for this user.`
        );
      }
      addLog(`✓ ${insertedStates.length} state selection(s) inserted`);

      // 4. Answers (template question keys)
      addLog("▶ Inserting universal answers...");
      const universal: Record<string, unknown> = {
        business_name: MOCK_INPUT.company_name,
        business_description: MOCK_INPUT.business_description,
        contact_email: MOCK_INPUT.contact_email,
        data_categories: MOCK_INPUT.data_categories_collected.join("; "),
        collection_purposes: MOCK_INPUT.purposes.join("; "),
        third_party_sharing: "yes",
        third_party_categories: MOCK_INPUT.third_party_categories,
        sale_or_sharing:
          MOCK_INPUT.sells_data && MOCK_INPUT.shares_for_advertising
            ? "sell_and_share"
            : MOCK_INPUT.sells_data
              ? "sell_only"
              : MOCK_INPUT.shares_for_advertising
                ? "share_only"
                : "neither",
        retention_general: MOCK_INPUT.retention,
        sensitive_data_types: MOCK_INPUT.sensitive_data_types.join("; "),
        data_sources: MOCK_INPUT.data_sources.join("; "),
      };
      const answerRows = Object.entries(universal).map(([k, v]) => ({
        session_id: session.id,
        question_key: k,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        answer_value: v as any,
      }));
      const { error: ansErr } = await supabase
        .from("us_notice_answers")
        .insert(answerRows);
      if (ansErr) throw new Error(`answers: ${ansErr.message}`);
      addLog(`✓ ${answerRows.length} answers inserted`);

      // 5. Invoke generator
      addLog("▶ Invoking generate-us-notice...");
      const { data: gen, error: genErr } = await supabase.functions.invoke(
        "generate-us-notice",
        { body: { session_id: session.id } }
      );
      clearInterval(tick);

      if (genErr || !gen?.documents?.length) {
        throw new Error(
          `generator: ${genErr?.message ?? gen?.error ?? "no documents"}`
        );
      }
      addLog(`✓ Generated ${gen.documents.length} document(s)`);

      // 6. Sign URLs and fetch each
      addLog("▶ Fetching documents...");
      const fetched: StateText[] = [];
      const signedList: { state: string; signedUrl: string }[] = [];
      for (const doc of gen.documents as Array<{
        state: string;
        path: string;
      }>) {
        const { data: signed, error: signErr } = await supabase.storage
          .from("us-notices")
          .createSignedUrl(doc.path, 3600);
        if (signErr || !signed?.signedUrl) {
          addLog(`⚠ sign error for ${doc.state}: ${signErr?.message}`);
          continue;
        }
        signedList.push({ state: doc.state, signedUrl: signed.signedUrl });
        const resp = await fetch(signed.signedUrl);
        const text = await resp.text();
        fetched.push({ state: doc.state, text });
        addLog(`  ✓ ${doc.state} (${text.length} chars)`);
      }
      setDocPaths(signedList);
      setStateTexts(fetched);
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
    passed: stateTexts.length
      ? (() => {
          try {
            return a.fn(stateTexts);
          } catch {
            return false;
          }
        })()
      : null,
  }));
  const passCount = assertions.filter((a) => a.passed === true).length;
  const failCount = assertions.filter((a) => a.passed === false).length;

  useTestRunnerBridge({
    testId: "us-notice",
    status,
    result: stateTexts as unknown,
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
            🧪 TEST: US Privacy Notice Builder
          </h1>
          <p className="text-sm text-muted-foreground">
            Meridian Health Analytics · CA + VA + TX · template assembler (no AI)
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

        {stateTexts.length > 0 && (
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
                {docPaths.map((d) => (
                  <li key={d.state}>
                    <a
                      className="text-brand-teal underline"
                      href={d.signedUrl}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Open {d.state} notice (signed URL, expires 1h)
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

            {stateTexts.map((s) => (
              <details
                key={s.state}
                className="border rounded-lg p-4 bg-card"
              >
                <summary className="cursor-pointer font-medium">
                  {s.state} document source ({s.text.length} chars)
                </summary>
                <pre className="text-xs whitespace-pre-wrap mt-3 max-h-[600px] overflow-auto">
                  {s.text}
                </pre>
              </details>
            ))}
          </>
        )}

        {status === "failed" && stateTexts.length === 0 && (
          <div className="border border-red-300 rounded-lg p-4 bg-red-50">
            <p className="font-medium text-red-900">
              Test failed. See log above for details.
            </p>
            <p className="text-xs font-mono mt-2">
              Check edge logs for generate-us-notice.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
