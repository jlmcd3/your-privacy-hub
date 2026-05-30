// Tests-output orchestrator. Runs the registered TestXxx pages in hidden
// iframes (one at a time), captures the result via postMessage, sends it to
// the review-test-output edge function for a Claude review, and renders a
// scorecard + per-test critique.
//
// Stage 1: lia, dpia, governance only. Add more entries to REGISTRY as more
// test pages adopt useTestRunnerBridge.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import PageContainer from "@/components/PageContainer";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Loader2, PlayCircle, RotateCw, ExternalLink, Download, Trash2 } from "lucide-react";

const REGISTRY: Array<{ id: string; label: string; path: string }> = [
  { id: "lia", label: "Legitimate Interest Assessment", path: "/admin/test-lia" },
  { id: "dpia", label: "DPIA Framework", path: "/admin/test-dpia" },
  { id: "governance", label: "Governance Assessment", path: "/admin/test-governance" },
  { id: "dpa", label: "DPA Generator (EU/UK)", path: "/admin/test-dpa" },
  { id: "dpa-us", label: "DPA Generator (US State)", path: "/admin/test-dpa-us" },
  { id: "dpa-dual", label: "DPA Generator (Dual Compliance)", path: "/admin/test-dpa-dual" },
  { id: "dpa-canada", label: "DPA Generator (Canada)", path: "/admin/test-dpa-canada" },
  { id: "ir-playbook", label: "IR Playbook (EU/UK)", path: "/admin/test-ir-playbook" },
  { id: "ir-playbook-us", label: "IR Playbook (US)", path: "/admin/test-ir-playbook-us" },
  { id: "biometric", label: "Biometric Checker", path: "/admin/test-biometric" },
  { id: "cppa-scope", label: "CPPA Scope Checker", path: "/admin/test-cppa-scope" },
  { id: "cppa-risk", label: "CPPA Risk Assessment", path: "/admin/test-cppa-risk" },
  { id: "cppa-cyber", label: "CPPA Cybersecurity Audit", path: "/admin/test-cppa-cyber" },
  { id: "ropa", label: "RoPA Builder", path: "/admin/test-ropa" },
  { id: "us-notice", label: "US Privacy Notice Builder", path: "/admin/test-us-notice" },
  { id: "eu-notice", label: "EU Privacy Notice Builder", path: "/admin/test-eu-notice" },
  { id: "registration", label: "Registration Assessment", path: "/admin/test-registration" },
  { id: "brief", label: "Intelligence Brief Generator", path: "/admin/test-brief" },
];

const TEST_TIMEOUT_MS = 180_000;
const STORAGE_KEY = () => `tests-output:${new Date().toISOString().slice(0, 10)}`;

type Dimension = "accuracy" | "usability" | "tone_quality" | "annotations" | "mistakes_to_fix";
const DIMENSIONS: { key: Dimension; label: string }[] = [
  { key: "accuracy", label: "Accuracy" },
  { key: "usability", label: "Usability" },
  { key: "tone_quality", label: "Tone & quality" },
  { key: "annotations", label: "Annotations" },
  { key: "mistakes_to_fix", label: "Mistakes (fewer = higher)" },
];

type Review = {
  scores: Record<Dimension, number>;
  summary: string;
  strengths: string[];
  weaknesses: string[];
  priority_fixes: Array<{ severity: string; issue: string; suggestion: string }>;
};

type TestResult = {
  testId: string;
  label: string;
  status: "pending" | "running" | "complete" | "failed" | "timeout" | "reviewing" | "reviewed";
  result?: unknown;
  assertions?: Array<{ label: string; passed: boolean | null }>;
  log?: string[];
  resultUrl?: string | null;
  error?: string;
  elapsedMs?: number;
  review?: Review;
  reviewError?: string;
};

function loadCache(): Record<string, TestResult> | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY());
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}
function saveCache(map: Record<string, TestResult>) {
  try {
    localStorage.setItem(STORAGE_KEY(), JSON.stringify(map));
  } catch { /* ignore quota */ }
}
function clearAllTestCache() {
  try {
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const key = localStorage.key(i);
      if (key?.startsWith("tests-output:")) localStorage.removeItem(key);
    }
  } catch { /* ignore */ }
}

function severityClass(sev: number) {
  if (sev >= 4) return "text-emerald-700 bg-emerald-50";
  if (sev === 3) return "text-amber-700 bg-amber-50";
  return "text-rose-700 bg-rose-50";
}

function fixSeverityClass(s: string) {
  switch (s) {
    case "critical": return "bg-rose-100 text-rose-800 border-rose-200";
    case "high": return "bg-orange-100 text-orange-800 border-orange-200";
    case "medium": return "bg-amber-100 text-amber-800 border-amber-200";
    default: return "bg-slate-100 text-slate-700 border-slate-200";
  }
}

export default function TestsOutput() {
  const { user } = useAuth();
  const [results, setResults] = useState<Record<string, TestResult>>(() => {
    const cached = loadCache();
    if (cached) return cached;
    return Object.fromEntries(
      REGISTRY.map((r) => [r.id, { testId: r.id, label: r.label, status: "pending" }]),
    );
  });
  const [runIndex, setRunIndex] = useState<number | null>(null);
  const [iframeSrc, setIframeSrc] = useState<string | null>(null);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const startedAtRef = useRef<number>(0);

  // Persist on every change
  useEffect(() => { saveCache(results); }, [results]);

  const updateResult = useCallback((id: string, patch: Partial<TestResult>) => {
    setResults((prev) => ({ ...prev, [id]: { ...prev[id], ...patch } }));
  }, []);

  // ---- iframe postMessage listener ----
  useEffect(() => {
    function handler(ev: MessageEvent) {
      const data = ev.data;
      if (!data || data.source !== "lovable-test-runner") return;
      const id = data.testId as string;
      if (!REGISTRY.find((r) => r.id === id)) return;
      // Ignore unless this is the test we're currently running
      if (runIndex === null || REGISTRY[runIndex]?.id !== id) return;

      updateResult(id, {
        status: data.status,
        assertions: data.assertions,
        log: data.log,
        result: data.result,
        resultUrl: data.resultUrl ?? null,
        elapsedMs: data.elapsedMs,
      });
    }
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, [runIndex, updateResult]);

  // ---- Drive the run loop ----
  const reviewOne = useCallback(async (entry: TestResult) => {
    updateResult(entry.testId, { status: "reviewing" });
    try {
      const { data, error } = await supabase.functions.invoke("review-test-output", {
        body: {
          testId: entry.testId,
          testLabel: entry.label,
          output: entry.result,
          assertions: entry.assertions,
          log: entry.log,
        },
      });
      if (error) throw error;
      if (data?.review) {
        updateResult(entry.testId, { status: "reviewed", review: data.review });
      } else {
        updateResult(entry.testId, {
          status: "reviewed",
          reviewError: data?.error || "Empty review",
        });
      }
    } catch (e: any) {
      updateResult(entry.testId, {
        status: "reviewed",
        reviewError: e?.message || String(e),
      });
    }
  }, [updateResult]);

  // Watch the current run for completion. Driven only by the currently-running
  // test's status to avoid re-entrancy from unrelated state changes.
  const currentStatus = runIndex !== null ? results[REGISTRY[runIndex].id]?.status : null;
  const advancingRef = useRef(false);

  useEffect(() => {
    if (runIndex === null) return;
    if (advancingRef.current) return;
    if (currentStatus !== "complete" && currentStatus !== "failed" && currentStatus !== "timeout") return;

    advancingRef.current = true;
    const entry = REGISTRY[runIndex];
    const current = results[entry.id];

    if (current?.status === "complete" && current.result && !current.review) {
      void reviewOne(current);
    }
    const next = runIndex + 1;
    if (next < REGISTRY.length) {
      startedAtRef.current = Date.now();
      setIframeSrc(REGISTRY[next].path + "?embed=runner&t=" + Date.now());
      setRunIndex(next);
      updateResult(REGISTRY[next].id, { status: "running" });
    } else {
      setRunIndex(null);
      setIframeSrc(null);
    }
    // Release the latch on next tick so the new run's status changes can fire.
    setTimeout(() => { advancingRef.current = false; }, 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [runIndex, currentStatus]);

  // Independent timeout watchdog — does not depend on `results` to avoid loops.
  useEffect(() => {
    if (runIndex === null) return;
    const id = window.setInterval(() => {
      if (Date.now() - startedAtRef.current > TEST_TIMEOUT_MS) {
        const entry = REGISTRY[runIndex];
        const cur = results[entry.id];
        if (cur && cur.status !== "complete" && cur.status !== "failed" && cur.status !== "timeout") {
          updateResult(entry.id, { status: "timeout", error: "Test exceeded 120s" });
        }
      }
    }, 2000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [runIndex]);

  function startRunAll() {
    const fresh = Object.fromEntries(
      REGISTRY.map((r) => [r.id, { testId: r.id, label: r.label, status: "pending" as const }]),
    );
    setResults(fresh);
    startedAtRef.current = Date.now();
    setIframeSrc(REGISTRY[0].path + "?embed=runner&t=" + Date.now());
    setRunIndex(0);
    // Mark first as running
    updateResult(REGISTRY[0].id, { status: "running" });
  }

  function rerunOne(id: string) {
    const idx = REGISTRY.findIndex((r) => r.id === id);
    if (idx < 0) return;
    updateResult(id, { status: "running", result: undefined, review: undefined, reviewError: undefined, assertions: undefined, log: undefined });
    startedAtRef.current = Date.now();
    setIframeSrc(REGISTRY[idx].path + "?embed=runner&t=" + Date.now());
    setRunIndex(idx);
  }

  function rerunReviewOnly(id: string) {
    const entry = results[id];
    if (!entry?.result) return;
    void reviewOne(entry);
  }

  function exportPdf() {
    const date = new Date().toISOString().slice(0, 10);
    const esc = (s: unknown) =>
      String(s ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");

    const rows = REGISTRY.map((r) => results[r.id]).filter(Boolean);
    const sections = rows
      .map((r) => {
        const a = r.assertions || [];
        const pass = a.filter((x) => x.passed === true).length;
        const fail = a.filter((x) => x.passed === false).length;
        const rev = r.review;
        return `
          <section class="test">
            <h2>${esc(r.label)} <span class="badge ${r.status}">${esc(r.status)}</span></h2>
            <p class="meta">Assertions: ${pass} pass · ${fail} fail · ${a.length} total${
              r.elapsedMs ? ` · ${Math.round(r.elapsedMs / 1000)}s` : ""
            }</p>
            ${
              a.length
                ? `<ul class="assertions">${a
                    .map(
                      (x) =>
                        `<li>${
                          x.passed === true ? "✓" : x.passed === false ? "✗" : "·"
                        } ${esc(x.label)}</li>`,
                    )
                    .join("")}</ul>`
                : ""
            }
            ${
              rev
                ? `<div class="review">
                    <h3>Review</h3>
                    <p class="scores">${DIMENSIONS.map(
                      (d) =>
                        `<span><strong>${d.label}:</strong> ${rev.scores[d.key] ?? "—"}</span>`,
                    ).join(" · ")}</p>
                    <p><strong>Summary:</strong> ${esc(rev.summary)}</p>
                    ${
                      rev.strengths?.length
                        ? `<p><strong>Strengths:</strong></p><ul>${rev.strengths
                            .map((s) => `<li>${esc(s)}</li>`)
                            .join("")}</ul>`
                        : ""
                    }
                    ${
                      rev.weaknesses?.length
                        ? `<p><strong>Weaknesses:</strong></p><ul>${rev.weaknesses
                            .map((s) => `<li>${esc(s)}</li>`)
                            .join("")}</ul>`
                        : ""
                    }
                    ${
                      rev.priority_fixes?.length
                        ? `<p><strong>Priority fixes:</strong></p><ul>${rev.priority_fixes
                            .map(
                              (f) =>
                                `<li><em>[${esc(f.severity)}]</em> ${esc(f.issue)} — ${esc(
                                  f.suggestion,
                                )}</li>`,
                            )
                            .join("")}</ul>`
                        : ""
                    }
                  </div>`
                : r.reviewError
                  ? `<p class="review-err">Review error: ${esc(r.reviewError)}</p>`
                  : ""
            }
            ${
              r.error
                ? `<p class="error">Error: ${esc(r.error)}</p>`
                : ""
            }
          </section>
        `;
      })
      .join("");

    const html = `<!doctype html><html><head><meta charset="utf-8"/>
      <title>Tests Output — ${date}</title>
      <style>
        body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:#0d2a45;max-width:880px;margin:32px auto;padding:0 24px;}
        h1{font-size:24px;margin:0 0 4px;}
        h2{font-size:16px;margin:0 0 6px;display:flex;justify-content:space-between;align-items:center;gap:8px;}
        h3{font-size:13px;margin:12px 0 4px;text-transform:uppercase;letter-spacing:.06em;color:#475569;}
        .meta{color:#64748b;font-size:12px;margin:0 0 8px;}
        .test{border:1px solid #e2e8f0;border-radius:8px;padding:14px 16px;margin-bottom:14px;page-break-inside:avoid;}
        .assertions{margin:6px 0;padding-left:18px;font-size:12px;}
        .assertions li{margin:1px 0;}
        .review{background:#f8fafc;border-radius:6px;padding:10px 12px;margin-top:10px;font-size:12.5px;}
        .review ul{margin:4px 0 8px 18px;}
        .scores{font-size:11.5px;color:#475569;margin:4px 0 8px;}
        .badge{font-size:10px;padding:2px 8px;border-radius:999px;background:#e2e8f0;color:#334155;text-transform:uppercase;letter-spacing:.05em;}
        .badge.reviewed,.badge.complete{background:#d1fae5;color:#065f46;}
        .badge.failed,.badge.timeout{background:#fee2e2;color:#991b1b;}
        .error,.review-err{color:#b91c1c;font-size:12px;margin:6px 0 0;}
        @media print{ .test{break-inside:avoid;} }
      </style></head><body>
      <h1>Tests Output Report</h1>
      <p class="meta">Generated ${date} · ${rows.length} tests</p>
      ${sections}
      <script>window.addEventListener("load",()=>{setTimeout(()=>window.print(),300);});</script>
      </body></html>`;

    const w = window.open("", "_blank");
    if (!w) return;
    w.document.open();
    w.document.write(html);
    w.document.close();
  }

  function handleClearCache() {
    clearAllTestCache();
    const fresh = Object.fromEntries(
      REGISTRY.map((r) => [r.id, { testId: r.id, label: r.label, status: "pending" as const }]),
    );
    setResults(fresh);
    setRunIndex(null);
    setIframeSrc(null);
  }

  const scorecard = useMemo(() => {
    const reviewed = REGISTRY.map((r) => results[r.id]).filter((r) => r?.review);
    if (reviewed.length === 0) return null;
    const avg: Record<Dimension, number> = {
      accuracy: 0, usability: 0, tone_quality: 0, annotations: 0, mistakes_to_fix: 0,
    };
    for (const r of reviewed) {
      for (const d of DIMENSIONS) avg[d.key] += r.review!.scores[d.key] || 0;
    }
    for (const d of DIMENSIONS) avg[d.key] = +(avg[d.key] / reviewed.length).toFixed(2);
    return { count: reviewed.length, avg };
  }, [results]);

  const running = runIndex !== null;

  // Live elapsed ticker for the currently-running test
  const [nowTs, setNowTs] = useState(Date.now());
  useEffect(() => {
    if (!running) return;
    const id = window.setInterval(() => setNowTs(Date.now()), 500);
    return () => clearInterval(id);
  }, [running]);
  const liveElapsedMs = running && startedAtRef.current ? nowTs - startedAtRef.current : 0;
  const liveElapsedSec = Math.floor(liveElapsedMs / 1000);
  const timeoutSec = Math.floor(TEST_TIMEOUT_MS / 1000);
  const pct = Math.min(100, Math.round((liveElapsedMs / TEST_TIMEOUT_MS) * 100));
  const currentEntry = runIndex !== null ? results[REGISTRY[runIndex].id] : null;
  const overallPct = Math.round(
    ((runIndex ?? REGISTRY.length) / REGISTRY.length) * 100,
  );
  const [showIframe, setShowIframe] = useState(false);

  if (!user) {
    return (
      <>
        <Navbar />
        <PageContainer>
          <div className="py-12">
            <p>Please <Link to="/login" className="underline">sign in</Link>.</p>
          </div>
        </PageContainer>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <Helmet><title>Admin · Tests Output | End User Privacy</title></Helmet>
      <PageContainer>
        <div className="py-8 space-y-6">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <h1 className="font-display text-brand-navy">Tests Output Review</h1>
              <p className="text-sm text-slate mt-1">
                Runs every registered tool test sequentially, captures the output, and sends it to Claude
                {/* eslint-disable-next-line */}<code className="text-xs">claude-sonnet-4-6</code> for a
                5-dimension quality review. Results are cached per-day in your browser.
              </p>
              <p className="text-xs text-slate-500 mt-1">
                Stage 1 — wired for {REGISTRY.length} tests: {REGISTRY.map((r) => r.label).join(", ")}.
              </p>
            </div>
            <div className="flex gap-2">
              <Button onClick={startRunAll} disabled={running} className="gap-1.5">
                {running ? <Loader2 className="w-4 h-4 animate-spin" /> : <PlayCircle className="w-4 h-4" />}
                {running ? `Running ${runIndex! + 1}/${REGISTRY.length}` : `Run all ${REGISTRY.length}`}
              </Button>
              <Button variant="outline" onClick={exportJson} className="gap-1.5">
                <Download className="w-4 h-4" />Export
              </Button>
              <Button variant="outline" onClick={handleClearCache} disabled={running} className="gap-1.5">
                <Trash2 className="w-4 h-4" />Clear cache
              </Button>
            </div>
          </div>

          {scorecard && (
            <Card className="p-4 border-brand-cloud">
              <div className="text-xs uppercase tracking-widest text-slate-400 mb-3">
                Scorecard — avg across {scorecard.count} reviewed test{scorecard.count > 1 ? "s" : ""}
              </div>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                {DIMENSIONS.map((d) => {
                  const v = scorecard.avg[d.key];
                  return (
                    <div key={d.key} className={`rounded-md px-3 py-2 ${severityClass(v)}`}>
                      <div className="text-[11px] uppercase tracking-wider opacity-70">{d.label}</div>
                      <div className="font-display text-2xl leading-tight">{v.toFixed(1)}</div>
                    </div>
                  );
                })}
              </div>
            </Card>
          )}

          {/* Live progress panel */}
          {running && currentEntry && (
            <Card className="border-brand-teal/50 bg-brand-teal/5 p-4 space-y-3">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div>
                  <div className="text-[11px] uppercase tracking-widest text-brand-teal font-semibold">
                    Now running — {runIndex! + 1} of {REGISTRY.length}
                  </div>
                  <div className="font-display text-xl text-brand-navy mt-0.5">
                    {currentEntry.label}
                  </div>
                </div>
                <div className="font-mono text-sm text-brand-navy text-right">
                  <div>
                    {liveElapsedSec}s / {timeoutSec}s
                    {currentEntry.status === "reviewing" && " · reviewing"}
                  </div>
                  <div className="text-xs text-slate-500">
                    status: <strong>{currentEntry.status}</strong>
                  </div>
                </div>
              </div>

              {/* Per-test progress bar */}
              <div className="w-full h-2 bg-white rounded overflow-hidden">
                <div
                  className={`h-full transition-all ${
                    pct > 90 ? "bg-rose-500" : pct > 70 ? "bg-amber-500" : "bg-brand-teal"
                  }`}
                  style={{ width: `${pct}%` }}
                />
              </div>

              {/* Overall progress */}
              <div className="text-xs text-slate-500 flex items-center gap-2">
                <span>Overall</span>
                <div className="flex-1 h-1.5 bg-white rounded overflow-hidden">
                  <div className="h-full bg-brand-navy" style={{ width: `${overallPct}%` }} />
                </div>
                <span className="font-mono">{overallPct}%</span>
              </div>

              {/* Tail of test log */}
              {currentEntry.log && currentEntry.log.length > 0 && (
                <div className="bg-black text-green-400 font-mono text-[11px] rounded p-2 max-h-32 overflow-auto">
                  {currentEntry.log.slice(-6).map((l, i) => (
                    <div key={i}>{l}</div>
                  ))}
                </div>
              )}

              <div className="flex items-center justify-between gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => setShowIframe((v) => !v)}
                  className="text-brand-teal hover:underline bg-transparent border-none cursor-pointer p-0"
                >
                  {showIframe ? "Hide" : "Show"} embedded test page
                </button>
                {currentEntry.resultUrl && (
                  <Link
                    to={currentEntry.resultUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-brand-teal hover:underline inline-flex items-center gap-1"
                  >
                    Open result <ExternalLink className="w-3 h-3" />
                  </Link>
                )}
              </div>
            </Card>
          )}

          {/* Iframe driver — hidden offscreen unless user expands it */}
          {iframeSrc && (
            showIframe && running ? (
              <Card className="border-brand-cloud overflow-hidden">
                <iframe
                  ref={iframeRef}
                  src={iframeSrc}
                  title="test-runner"
                  className="w-full h-[600px] bg-white border-0"
                />
              </Card>
            ) : (
              <iframe
                ref={iframeRef}
                src={iframeSrc}
                title="test-runner"
                style={{ position: "fixed", left: -9999, top: -9999, width: 1200, height: 800, opacity: 0, pointerEvents: "none" }}
                aria-hidden="true"
              />
            )
          )}

          <div className="space-y-3">
            {REGISTRY.map((r) => {
              const entry = results[r.id];
              const passCount = entry?.assertions?.filter((a) => a.passed).length ?? 0;
              const totalA = entry?.assertions?.length ?? 0;
              return (
                <Card key={r.id} className="border-brand-cloud">
                  <details className="group">
                    <summary className="cursor-pointer p-4 flex items-center justify-between gap-3 list-none">
                      <div className="flex items-center gap-3 min-w-0">
                        <StatusDot status={entry.status} />
                        <div className="min-w-0">
                          <div className="font-semibold text-brand-navy truncate">{r.label}</div>
                          <div className="text-xs text-slate-500 flex items-center gap-2 flex-wrap">
                            <span>{entry.status}</span>
                            {totalA > 0 && <span>· {passCount}/{totalA} assertions</span>}
                            {entry.elapsedMs && <span>· {(entry.elapsedMs / 1000).toFixed(1)}s</span>}
                            {entry.review && (
                              <span className="font-mono">
                                · acc {entry.review.scores.accuracy} · use {entry.review.scores.usability} · tone {entry.review.scores.tone_quality} · ann {entry.review.scores.annotations} · err {entry.review.scores.mistakes_to_fix}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => { e.preventDefault(); rerunOne(r.id); }}
                          disabled={running}
                          title="Re-run this test"
                          className="h-7 px-2 gap-1"
                        >
                          <RotateCw className="w-3.5 h-3.5" />
                        </Button>
                        {entry.result && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => { e.preventDefault(); rerunReviewOnly(r.id); }}
                            className="h-7 px-2 text-xs"
                            title="Re-run AI review only"
                          >
                            Re-review
                          </Button>
                        )}
                        {entry.resultUrl && (
                          <Link
                            to={entry.resultUrl}
                            target="_blank"
                            rel="noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="inline-flex items-center justify-center h-7 px-2 text-slate hover:text-brand-teal rounded-md hover:bg-brand-cloud/40"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </Link>
                        )}
                      </div>
                    </summary>

                    <div className="px-4 pb-4 pt-0 space-y-3">
                      {entry.error && (
                        <div className="text-sm text-rose-700 bg-rose-50 rounded p-2">{entry.error}</div>
                      )}

                      {entry.review ? (
                        <ReviewBlock review={entry.review} />
                      ) : entry.reviewError ? (
                        <div className="text-sm text-rose-700 bg-rose-50 rounded p-2">
                          Review failed: {entry.reviewError}
                        </div>
                      ) : entry.status === "reviewing" ? (
                        <div className="text-sm text-slate-500 flex items-center gap-2">
                          <Loader2 className="w-3.5 h-3.5 animate-spin" /> Asking Claude…
                        </div>
                      ) : null}

                      {entry.assertions && entry.assertions.length > 0 && (
                        <details className="text-xs">
                          <summary className="cursor-pointer text-slate-500">Assertions ({passCount}/{totalA})</summary>
                          <ul className="mt-2 space-y-0.5 font-mono">
                            {entry.assertions.map((a, i) => (
                              <li key={i}>{a.passed ? "✅" : "❌"} {a.label}</li>
                            ))}
                          </ul>
                        </details>
                      )}

                      {entry.result != null && (
                        <details className="text-xs">
                          <summary className="cursor-pointer text-slate-500">Raw output JSON</summary>
                          <pre className="mt-2 max-h-96 overflow-auto bg-slate-50 p-2 rounded">
                            {JSON.stringify(entry.result, null, 2)}
                          </pre>
                        </details>
                      )}
                    </div>
                  </details>
                </Card>
              );
            })}
          </div>
        </div>
      </PageContainer>
      <Footer />
    </>
  );
}

function StatusDot({ status }: { status: TestResult["status"] }) {
  const cls =
    status === "complete" || status === "reviewed" ? "bg-emerald-500" :
    status === "running" || status === "reviewing" ? "bg-amber-500 animate-pulse" :
    status === "failed" || status === "timeout" ? "bg-rose-500" :
    "bg-slate-300";
  return <span className={`inline-block w-2.5 h-2.5 rounded-full ${cls}`} />;
}

function ReviewBlock({ review }: { review: Review }) {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-5 gap-2">
        {DIMENSIONS.map((d) => {
          const v = review.scores[d.key] ?? 0;
          return (
            <div key={d.key} className={`rounded px-2 py-1 ${severityClass(v)}`}>
              <div className="text-[10px] uppercase tracking-wider opacity-70">{d.label}</div>
              <div className="font-display text-lg leading-tight">{v}</div>
            </div>
          );
        })}
      </div>
      <p className="text-sm text-brand-navy">{review.summary}</p>
      {review.strengths?.length > 0 && (
        <div>
          <div className="text-xs uppercase tracking-widest text-emerald-700 mb-1">Strengths</div>
          <ul className="text-sm list-disc pl-5 space-y-0.5">
            {review.strengths.map((s, i) => <li key={i}>{s}</li>)}
          </ul>
        </div>
      )}
      {review.weaknesses?.length > 0 && (
        <div>
          <div className="text-xs uppercase tracking-widest text-amber-700 mb-1">Weaknesses</div>
          <ul className="text-sm list-disc pl-5 space-y-0.5">
            {review.weaknesses.map((s, i) => <li key={i}>{s}</li>)}
          </ul>
        </div>
      )}
      {review.priority_fixes?.length > 0 && (
        <div>
          <div className="text-xs uppercase tracking-widest text-slate-500 mb-1">Priority fixes</div>
          <ul className="space-y-1.5">
            {review.priority_fixes.map((f, i) => (
              <li key={i} className={`text-sm border rounded p-2 ${fixSeverityClass(f.severity)}`}>
                <span className="text-[10px] uppercase font-semibold tracking-wider mr-2">{f.severity}</span>
                <span className="font-medium">{f.issue}</span>
                <div className="text-xs mt-1 opacity-90">→ {f.suggestion}</div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
