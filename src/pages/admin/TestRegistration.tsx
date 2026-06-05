import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import Navbar from "@/components/Navbar";
import { useTestRunnerBridge } from "@/hooks/useTestRunnerBridge";

const MOCK_INTAKE = {
  organization_name: "Meridian Health Analytics Ltd",
  organization_country: "GB",
  organization_size: "medium" as const,
  industry: "Healthcare / Life Sciences",
  email: "privacy@meridianhealth.io",
  employee_count: 180,
  annual_revenue_usd: 60_000_000,
  data_subjects_count: 250_000,
  role: "controller" as const,
  processes_personal_data: true,
  processes_special_categories: true,
  processes_children_data: false,
  large_scale_monitoring: true,
  uses_ai_systems: true,
  ai_high_risk: true,
  ai_general_purpose_provider: false,
  cross_border_transfers: true,
  markets_served: ["GB", "DE", "FR", "IE", "NL"],
  has_eu_establishment: false,
  has_uk_establishment: true,
  acts_as_data_broker: false,
  sells_or_shares_personal_info: false,
  processes_biometrics_for_id: false,
};

type Doc = {
  jurisdiction_code: string;
  document_type: string;
  language: string;
  content_text: string | null;
};

const ASSERTIONS: { label: string; fn: (docs: Doc[]) => boolean }[] = [
  {
    label: "DPO Appointment Letter generated",
    fn: (d) => d.some((x) => x.document_type === "dpo_appointment"),
  },
  {
    label: "RoPA template generated",
    fn: (d) => d.some((x) => x.document_type === "ropa"),
  },
  {
    label: "Article 27 Representative Letter generated (non-EU controller)",
    fn: (d) => d.some((x) => x.document_type === "representative_letter"),
  },
  {
    label: "Filing Instructions for at least one EU jurisdiction (DE/FR/IE)",
    fn: (d) =>
      d.some(
        (x) =>
          x.document_type === "filing_instructions" &&
          ["DE", "FR", "IE"].includes(x.jurisdiction_code)
      ),
  },
  {
    label: "DPO Appointment Letter contains English content",
    fn: (d) => {
      const dpo = d.find(
        (x) => x.document_type === "dpo_appointment" && x.language === "en"
      );
      return !!dpo && (dpo.content_text || "").length > 200;
    },
  },
  {
    label: "Filing instructions reference an authority / portal URL",
    fn: (d) =>
      d.some(
        (x) =>
          x.document_type === "filing_instructions" &&
          /(https?:\/\/|portal|authority|supervisory)/i.test(
            x.content_text || ""
          )
      ),
  },
  {
    label: "AI Act high-risk obligations referenced (any document)",
    fn: (d) =>
      d.some((x) => /AI Act|Annex III|high[- ]risk AI system|Article\s*6\(2\)/i.test(x.content_text || "")),
  },
  {
    label: "Disclaimer / legal review note present",
    fn: (d) =>
      d.some((x) =>
        /(legal review|consult|qualified counsel|disclaimer|not legal advice)/i.test(
          x.content_text || ""
        )
      ),
  },
  {
    label: "At least 3 distinct document types generated",
    fn: (d) => new Set(d.map((x) => x.document_type)).size >= 3,
  },
];

export default function TestRegistration() {
  const { user } = useAuth();
  const [status, setStatus] = useState<
    "idle" | "running" | "complete" | "failed"
  >("idle");
  const [docs, setDocs] = useState<Doc[]>([]);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [assessmentId, setAssessmentId] = useState<string | null>(null);
  const [recommendedJurisdictions, setRecommendedJurisdictions] = useState<
    string[]
  >([]);
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
    addLog("▶ Starting Registration Manager test (Meridian Health Analytics)…");
    addLog(`▶ Logged in as: ${user.email}`);

    const tick = setInterval(
      () => setElapsed(Math.round((Date.now() - startTime) / 1000)),
      1000
    );

    try {
      // 1. Run free assessment to compute recommended jurisdictions
      addLog("▶ Invoking run-registration-assessment…");
      const { data: assess, error: assessErr } = await supabase.functions.invoke(
        "run-registration-assessment",
        { body: { intake_data: MOCK_INTAKE, user_id: user.id } }
      );
      if (assessErr || !assess?.assessment_id) {
        throw new Error(
          `assessment: ${assessErr?.message ?? assess?.error ?? "no assessment_id"}`
        );
      }
      setAssessmentId(assess.assessment_id);
      const codes: string[] = assess.recommended_jurisdictions || [];
      // Cap at 3 jurisdictions for the test run to stay within edge function time limits
      const cappedCodes = codes.slice(0, 3);
      setRecommendedJurisdictions(cappedCodes);
      addLog(
        `✓ Assessment ${assess.assessment_id} · confidence=${assess.confidence} · ${cappedCodes.length}/${codes.length} jurisdictions: ${cappedCodes.join(", ") || "(none)"}`
      );

      if (!cappedCodes.length) {
        throw new Error("Engine returned no jurisdictions to register in.");
      }

      // 2. Seed registration_orders (admin RLS)
      addLog("▶ Creating registration_orders row (tier=diy, paid)…");
      const { data: order, error: orderErr } = await supabase
        .from("registration_orders")
        .insert({
          user_id: user.id,
          assessment_id: assess.assessment_id,
          tier: "diy",
          jurisdictions: cappedCodes,
          organization_snapshot: MOCK_INTAKE,
          amount_cents: 0,
          currency: "usd",
          payment_status: "paid",
          fulfillment_status: "generating",
          delivery_email: MOCK_INTAKE.email,
          renewal_reminders_enabled: false,
        })
        .select("id")
        .single();
      if (orderErr || !order) {
        throw new Error(`order insert: ${orderErr?.message ?? "no row"}`);
      }
      setOrderId(order.id);
      addLog(`✓ Order ${order.id}`);

      // 3. Invoke generate-registration-docs
      addLog("▶ Invoking generate-registration-docs (AI; this can take 30–90s)…");
      const { data: gen, error: genErr } = await supabase.functions.invoke(
        "generate-registration-docs",
        { body: { order_id: order.id } }
      );
      clearInterval(tick);
      if (genErr) {
        throw new Error(`generator: ${genErr.message}`);
      }
      addLog(
        `✓ Generator returned: ${gen?.generated_count ?? "?"} document rows`
      );

      // 4. Fetch generated documents
      addLog("▶ Fetching registration_documents…");
      const { data: rows, error: docsErr } = await supabase
        .from("registration_documents")
        .select("jurisdiction_code, document_type, language, content_text")
        .eq("order_id", order.id);
      if (docsErr) throw new Error(`docs fetch: ${docsErr.message}`);
      setDocs((rows || []) as Doc[]);
      addLog(`✓ ${rows?.length ?? 0} documents loaded`);
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
    passed: docs.length
      ? (() => {
          try {
            return a.fn(docs);
          } catch {
            return false;
          }
        })()
      : null,
  }));
  const passCount = assertions.filter((a) => a.passed === true).length;
  const failCount = assertions.filter((a) => a.passed === false).length;

  useTestRunnerBridge({
    testId: "registration",
    status,
    result: docs as unknown,
    assertions: assertions.map((a) => ({ label: a.label, passed: a.passed })),
    log,
    elapsedMs: elapsed * 1000,
    resultUrl: null,
  });

  const docTypeCounts = docs.reduce<Record<string, number>>((acc, d) => {
    acc[d.document_type] = (acc[d.document_type] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="min-h-screen bg-brand-cloud">
      <Navbar />
      <div className="max-w-5xl mx-auto px-6 py-8 space-y-6">
        <div>
          <h1 className="font-serif mb-2">
            🧪 TEST: Registration Manager
          </h1>
          <p className="text-sm text-muted-foreground">
            Meridian Health Analytics · UK controller · EU markets · high-risk AI
          </p>
        </div>

        <div className="border rounded-lg p-4 bg-card">
          <div className="font-mono text-sm">
            Status: <strong>{status.toUpperCase()}</strong>
            {status === "running" && ` — ${elapsed}s elapsed`}
            {status === "complete" &&
              ` — ${passCount}/${assertions.length} assertions passed`}
          </div>
          {assessmentId && (
            <div className="font-mono text-xs text-muted-foreground mt-1">
              assessment_id: {assessmentId}
            </div>
          )}
          {orderId && (
            <div className="font-mono text-xs text-muted-foreground">
              order_id: {orderId}
            </div>
          )}
          {recommendedJurisdictions.length > 0 && (
            <div className="font-mono text-xs text-muted-foreground">
              jurisdictions: {recommendedJurisdictions.join(", ")}
            </div>
          )}
        </div>

        <div className="border rounded-lg p-4 bg-black text-green-400 font-mono text-xs max-h-80 overflow-auto">
          {log.map((l, i) => (
            <div key={i}>{l}</div>
          ))}
          {status === "idle" && <div>Waiting for auth…</div>}
        </div>

        {docs.length > 0 && (
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
              <h2 className="font-serif mb-2">
                Document inventory ({docs.length})
              </h2>
              <ul className="text-sm font-mono space-y-1">
                {Object.entries(docTypeCounts).map(([type, n]) => (
                  <li key={type}>
                    • {type}: {n}
                  </li>
                ))}
              </ul>
            </div>

            <details className="border rounded-lg p-4 bg-card">
              <summary className="cursor-pointer font-medium">
                All generated documents
              </summary>
              <div className="mt-3 space-y-4 max-h-[600px] overflow-auto">
                {docs.map((d, i) => (
                  <div key={i} className="border-t pt-3">
                    <div className="font-mono text-xs text-muted-foreground mb-1">
                      {d.jurisdiction_code} · {d.document_type} · {d.language}
                    </div>
                    <pre className="text-xs whitespace-pre-wrap">
                      {(d.content_text || "").slice(0, 2000)}
                      {(d.content_text || "").length > 2000 && "\n…[truncated]"}
                    </pre>
                  </div>
                ))}
              </div>
            </details>
          </>
        )}

        {status === "failed" && !docs.length && (
          <div className="border border-red-300 rounded-lg p-4 bg-red-50">
            <p className="font-medium text-red-900">
              Test failed. See log above for details.
            </p>
            <p className="text-xs font-mono mt-2">
              Check edge logs for run-registration-assessment and
              generate-registration-docs.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
