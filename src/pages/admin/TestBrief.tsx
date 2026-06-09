import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import Navbar from "@/components/Navbar";
import { useTestRunnerBridge } from "@/hooks/useTestRunnerBridge";

// Mapped to the codes expected by generate-custom-brief. Industries /
// jurisdictions / topics flow through `user_watchlist` (the single source of
// truth); `role` is written to `profiles.brief_role` and drives ROLE_LENS in
// the system prompt; `format` is written to user_brief_preferences.
const PREFS = {
  industries: ["healthcare"],
  jurisdictions: ["eu-uk"],
  topics: [
    "GDPR Enforcement & DPA Activity",
    "Health & Medical Data Privacy",
    "AI & Privacy",
    "Biometric Data Privacy",
    "Data Breach & Incident Response",
  ],
  role: "cpo_dpo",
  format: "full",
};

const PROHIBITED_PHRASES = [
  "organisations may wish to consider",
  "it should be noted that",
  "it is important to note",
  "given the regulatory landscape",
];

type CustomSections = Record<string, unknown>;

function flatten(sections: CustomSections | null | undefined): string {
  if (!sections) return "";
  const parts: string[] = [];
  for (const [k, v] of Object.entries(sections)) {
    if (typeof v === "string") {
      parts.push(`## ${k}\n${v}`);
    } else if (Array.isArray(v)) {
      parts.push(`## ${k}\n${v.map((x) => JSON.stringify(x)).join("\n")}`);
    } else if (v && typeof v === "object") {
      parts.push(`## ${k}\n${JSON.stringify(v)}`);
    }
  }
  return parts.join("\n\n");
}

const ASSERTIONS: { label: string; fn: (s: CustomSections, t: string) => boolean }[] = [
  {
    label: "Output contains an Executive Summary section (your_week / opening_headline / your_critical_alert)",
    fn: (s) =>
      typeof s.your_week === "string" ||
      typeof s.opening_headline === "string" ||
      typeof s.your_critical_alert === "string",
  },
  {
    label: 'Executive opener does NOT begin with "The <Regulator>" (attorney tone)',
    fn: (s) => {
      const opener =
        ((s.your_week as string) || "").trim() ||
        ((s.opening_headline as string) || "").trim();
      return !/^The\s+(EDPB|ICO|CNIL|EDPS|FTC|CPPA|DPC|Garante|BfDI)\b/i.test(
        opener
      );
    },
  },
  {
    label: "Output contains at least one fine amount (€ / £ / $ + number)",
    fn: (_s, t) =>
      /(€|£|\$|EUR|USD|GBP)\s?[\d.,]+\s*(million|m|k|thousand)?/i.test(t),
  },
  {
    label: 'Output contains a verdict or bottom-line sentence',
    fn: (s, t) => {
      const alert = (s.your_critical_alert as string) ?? "";
      const week = (s.your_week as string) ?? "";
      if (alert.length > 20 || week.length > 20) return true;
      return (
        /bottom[\s_\-*]*line/i.test(t) ||
        /verdict[:\s—*]/i.test(t) ||
        /the\s+(upshot|takeaway|key\s+point|net\s+result)[:\s—]/i.test(t) ||
        /what\s+(this\s+means|you\s+need\s+to\s+do|to\s+do\s+now)[:\s—]/i.test(t) ||
        /\*{0,2}(your\s+action|action\s+required|what\s+you\s+need)[:\s—*]/i.test(t) ||
        /in\s+(short|summary|brief)[:\s,—]/i.test(t)
      );
    },
  },
  {
    label: "Output contains a WHAT TO IGNORE section",
    fn: (s, t) =>
      typeof s.what_to_ignore === "string" ||
      /what to ignore/i.test(t),
  },
  {
    label: "Output contains tiered action items (Immediate / This Quarter / Monitor)",
    fn: (s) => {
      const items = (s.your_action_items as Array<{ priority?: string }>) || [];
      const priorities = new Set(
        items.map((i) => (i.priority || "").toLowerCase())
      );
      return (
        items.length > 0 &&
        (priorities.has("immediate") ||
          priorities.has("this quarter") ||
          priorities.has("monitor"))
      );
    },
  },
  {
    label: "At least one item cites a specific regulator by name",
    fn: (_s, t) =>
      /\b(EDPB|ICO|CNIL|EDPS|FTC|CPPA|DPC|Garante|BfDI|AEPD|HHS\s*OCR|MHRA)\b/.test(
        t
      ),
  },
  {
    label: "At least one inline citation [ref:N] present",
    fn: (_s, t) => /\[ref:\d+\]/i.test(t),
  },
  {
    label: "Output contains healthcare / health-data specific content",
    fn: (_s, t) =>
      /(health(care)?|patient|clinical|HIPAA|HHS|medical data|life sciences)/i.test(
        t
      ),
  },
  {
    label: "Output length exceeds 2000 characters",
    fn: (_s, t) => t.length > 2000,
  },
  {
    label: "Output does NOT contain any prohibited boilerplate phrases",
    fn: (_s, t) => !PROHIBITED_PHRASES.some((p) => t.toLowerCase().includes(p)),
  },
];

export default function TestBrief() {
  const { user } = useAuth();
  const [status, setStatus] = useState<
    "idle" | "running" | "complete" | "failed"
  >("idle");
  const [sections, setSections] = useState<CustomSections | null>(null);
  const [briefId, setBriefId] = useState<string | null>(null);
  const [model, setModel] = useState<string | null>(null);
  const [articlesUsed, setArticlesUsed] = useState<number | null>(null);
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
    addLog("▶ Starting Intelligence Brief test (Healthcare DPO · EU & UK)…");
    addLog(`▶ Logged in as: ${user.email}`);

    const tick = setInterval(
      () => setElapsed(Math.round((Date.now() - startTime) / 1000)),
      1000
    );

    try {
      addLog("▶ Invoking admin-test-custom-brief (this can take 60–120s)…");
      const { data, error } = await supabase.functions.invoke(
        "admin-test-custom-brief",
        { body: { prefs: PREFS } }
      );
      clearInterval(tick);

      if (error) throw new Error(`invoke: ${error.message}`);
      if (!data?.ok) {
        throw new Error(
          data?.invokeError || data?.error || "generate-custom-brief failed"
        );
      }
      addLog(`✓ generate-custom-brief processed=${data.processed}`);

      const cb = data.custom_brief;
      if (!cb?.custom_sections) {
        throw new Error("No new custom_brief row was produced");
      }
      setBriefId(cb.id);
      setModel(cb.generation_model || null);
      setArticlesUsed(cb.articles_used ?? null);
      setSections(cb.custom_sections as CustomSections);
      addLog(
        `✓ Brief ${cb.id} · ${cb.generation_model} · ${cb.articles_used} articles`
      );
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

  const flat = flatten(sections);
  const assertions = ASSERTIONS.map((a) => ({
    ...a,
    passed: sections
      ? (() => {
          try {
            return a.fn(sections, flat);
          } catch {
            return false;
          }
        })()
      : null,
  }));
  const passCount = assertions.filter((a) => a.passed === true).length;
  const failCount = assertions.filter((a) => a.passed === false).length;

  useTestRunnerBridge({
    testId: "brief",
    status,
    result: sections as unknown,
    assertions: assertions.map((a) => ({ label: a.label, passed: a.passed })),
    log,
    elapsedMs: elapsed * 1000,
    resultUrl: null,
  });

  const foundProhibited = PROHIBITED_PHRASES.filter((p) =>
    flat.toLowerCase().includes(p)
  );

  return (
    <div className="min-h-screen bg-brand-cloud">
      <Navbar />
      <div className="max-w-5xl mx-auto px-6 py-8 space-y-6">
        <div>
          <h1 className="font-serif mb-2">
            🧪 TEST: Intelligence Brief (Custom Generation)
          </h1>
          <p className="text-sm text-muted-foreground">
            Healthcare DPO · EU &amp; UK · 5 topics · validates attorney tone
            and prohibited-phrase guardrails
          </p>
        </div>

        <div className="border rounded-lg p-4 bg-card">
          <div className="font-mono text-sm">
            Status: <strong>{status.toUpperCase()}</strong>
            {status === "running" && ` — ${elapsed}s elapsed`}
            {status === "complete" &&
              ` — ${passCount}/${assertions.length} assertions passed`}
          </div>
          {briefId && (
            <div className="font-mono text-xs text-muted-foreground mt-1">
              brief_id: {briefId}
            </div>
          )}
          {model && (
            <div className="font-mono text-xs text-muted-foreground">
              model: {model} · articles: {articlesUsed}
            </div>
          )}
        </div>

        <div className="border rounded-lg p-4 bg-black text-green-400 font-mono text-xs max-h-80 overflow-auto">
          {log.map((l, i) => (
            <div key={i}>{l}</div>
          ))}
          {status === "idle" && <div>Waiting for auth…</div>}
        </div>

        {foundProhibited.length > 0 && (
          <div className="border-2 border-red-500 rounded-lg p-4 bg-red-50">
            <h2 className="font-serif text-red-900 mb-2">
              ⚠️ PROHIBITED PHRASES DETECTED
            </h2>
            <p className="text-sm text-red-900 mb-2">
              The attorney-tone system prompt revision did not take effect.
              Found:
            </p>
            <ul className="text-sm font-mono">
              {foundProhibited.map((p, i) => (
                <li key={i}>• "{p}"</li>
              ))}
            </ul>
          </div>
        )}

        {sections && (
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

            <details className="border rounded-lg p-4 bg-card">
              <summary className="cursor-pointer font-medium">
                Brief sections ({Object.keys(sections).length})
              </summary>
              <div className="mt-3 space-y-4 max-h-[700px] overflow-auto">
                {Object.entries(sections).map(([key, value]) => (
                  <div key={key} className="border-t pt-3">
                    <div className="font-mono text-xs text-muted-foreground mb-1">
                      {key}
                    </div>
                    <pre className="text-xs whitespace-pre-wrap">
                      {typeof value === "string"
                        ? value
                        : JSON.stringify(value, null, 2)}
                    </pre>
                  </div>
                ))}
              </div>
            </details>
          </>
        )}

        {status === "failed" && !sections && (
          <div className="border border-red-300 rounded-lg p-4 bg-red-50">
            <p className="font-medium text-red-900">
              Test failed. See log above for details.
            </p>
            <p className="text-xs font-mono mt-2">
              Check edge logs for admin-test-custom-brief and
              generate-custom-brief.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
