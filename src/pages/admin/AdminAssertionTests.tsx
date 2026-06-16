/**
 * Round 3 — Assertion Test Harness
 * Route: /admin/test-assertions
 */

import { useState, useRef, useCallback } from "react";
import Navbar from "@/components/Navbar";
import { useAuth } from "@/hooks/useAuth";
import { ALL_ASSERTION_TESTS, type AssertionTest } from "@/lib/tests/assertionTests";
import {
  AssertionRunner,
  type RunnerState,
  type ToolRunResult,
  CONCURRENCY,
} from "@/lib/tests/assertionRunner";

function elapsed(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  const s = Math.round(ms / 1000);
  if (s < 60) return `${s}s`;
  return `${Math.floor(s / 60)}m ${s % 60}s`;
}

function pct(pass: number, total: number): string {
  if (total === 0) return "—";
  return `${Math.round((pass / total) * 100)}%`;
}

const STATUS_BADGES: Record<string, string> = {
  pending: "bg-slate-100 text-slate-500",
  running: "bg-blue-50 text-blue-700 animate-pulse",
  complete: "bg-green-50 text-green-700",
  failed: "bg-red-50 text-red-700",
  skipped: "bg-slate-50 text-slate-500",
};

function generateLovablePrompt(toolResult: ToolRunResult, test: AssertionTest): string {
  const failures = toolResult.results.filter((r) => !r.passed);
  if (!failures.length) return "All assertions passed — no fix prompt needed.";

  const lines: string[] = [
    `## Lovable Fix Prompt — ${toolResult.toolName}`,
    ``,
    `**Round 3 assertion failures detected in the ${toolResult.toolName} tool.**`,
    ``,
    `The following assertions failed. Apply the fixes described below to the relevant edge function and/or frontend code.`,
    ``,
    `### Failing Assertions`,
    ``,
  ];

  for (const r of failures) {
    lines.push(`**${r.assertion.id}** (${r.assertion.category})`);
    lines.push(`> ${r.assertion.description}`);
    lines.push(``);
    lines.push(`**Problem:** ${r.assertion.errorMessage}`);
    lines.push(``);
    if (r.error) { lines.push(`**Runtime error:** \`${r.error}\``); lines.push(``); }
    lines.push(`---`);
    lines.push(``);
  }

  lines.push(`### Test input used`);
  lines.push(``);
  lines.push("```json");
  lines.push(JSON.stringify(test.testInput, null, 2).slice(0, 2000));
  lines.push("```");
  lines.push(``);
  lines.push(`After applying fixes, re-run /admin/test-assertions to confirm passing before committing.`);

  return lines.join("\n");
}

function ToolCard({ test, result, onRunSingle, isRunning }: {
  test: AssertionTest;
  result: ToolRunResult;
  onRunSingle: (toolId: string) => void;
  isRunning: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const [showPrompt, setShowPrompt] = useState(false);
  const [copied, setCopied] = useState(false);
  const failures = result.results.filter((r) => !r.passed);
  const prompt = showPrompt ? generateLovablePrompt(result, test) : "";

  const copyPrompt = () => {
    navigator.clipboard.writeText(prompt).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); });
  };

  return (
    <div className={`border rounded-lg bg-white shadow-sm overflow-hidden ${result.status === "failed" ? "border-red-200" : "border-slate-200"}`}>
      <div className="flex items-center gap-3 px-4 py-3">
        <button className="flex-1 flex items-center gap-3 text-left" onClick={() => setExpanded((e) => !e)}>
          <span className={`text-xs font-mono px-2 py-0.5 rounded font-medium ${STATUS_BADGES[result.status] ?? STATUS_BADGES.pending}`}>
            {result.status.toUpperCase()}
          </span>
          <span className="font-medium text-sm">{test.toolName}</span>
          {result.status === "complete" && (
            <span className={`text-xs font-mono ${result.failCount > 0 ? "text-red-600" : "text-green-600"}`}>
              {result.passCount}/{result.results.length} passed{result.failCount > 0 && ` (${result.failCount} failed)`}
            </span>
          )}
          {result.elapsedMs > 0 && <span className="text-xs text-slate-400 ml-auto">{elapsed(result.elapsedMs)}</span>}
        </button>
        <button
          onClick={() => onRunSingle(test.toolId)}
          disabled={isRunning}
          className="text-xs px-2 py-1 rounded border border-slate-300 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {result.status === "running" ? "Running…" : result.status === "complete" || result.status === "failed" ? "Re-run" : "Run"}
        </button>
      </div>

      {expanded && (
        <div className="border-t border-slate-100 px-4 py-3 space-y-3">
          {result.results.length > 0 && (
            <ul className="space-y-1">
              {result.results.map((r) => (
                <li key={r.assertion.id} className="text-xs flex gap-2">
                  <span>{r.passed ? "✅" : "❌"}</span>
                  <span className={`flex-1 ${r.passed ? "text-slate-600" : "text-red-700 font-medium"}`}>
                    {r.assertion.description}
                    {!r.passed && <span className="block text-red-600 font-normal mt-0.5">{r.assertion.errorMessage}</span>}
                  </span>
                  <span className="text-slate-400 shrink-0 capitalize">{r.assertion.category}</span>
                </li>
              ))}
            </ul>
          )}
          {result.error && <div className="text-xs text-red-700 bg-red-50 rounded p-2"><strong>Error:</strong> {result.error}</div>}
          {result.log.length > 0 && (
            <details>
              <summary className="text-xs text-slate-500 cursor-pointer hover:text-slate-700">Execution log ({result.log.length} lines)</summary>
              <div className="mt-2 bg-black text-green-400 font-mono text-[11px] rounded p-2 max-h-48 overflow-auto">
                {result.log.map((l, i) => <div key={i}>{l}</div>)}
              </div>
            </details>
          )}
          {failures.length > 0 && (
            <div className="pt-1">
              <button onClick={() => setShowPrompt((s) => !s)} className="text-xs px-3 py-1.5 rounded bg-amber-600 text-white hover:bg-amber-700">
                {showPrompt ? "Hide" : "Generate"} Lovable Fix Prompt ({failures.length} issue{failures.length !== 1 ? "s" : ""})
              </button>
              {showPrompt && (
                <div className="mt-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-slate-700">Paste into Lovable chat</span>
                    <button onClick={copyPrompt} className="text-xs px-2 py-1 rounded border border-slate-300 hover:bg-slate-50">
                      {copied ? "Copied ✓" : "Copy"}
                    </button>
                  </div>
                  <textarea readOnly value={prompt} rows={12} className="w-full text-[11px] font-mono border border-slate-200 rounded p-2 bg-slate-50 resize-y" />
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function AdminAssertionTests() {
  const { user } = useAuth();
  const runnerRef = useRef<AssertionRunner | null>(null);

  const emptyToolResult = (test: AssertionTest): ToolRunResult => ({
    toolId: test.toolId, toolName: test.toolName, status: "pending", log: [], elapsedMs: 0, results: [], passCount: 0, failCount: 0,
  });

  const [runnerState, setRunnerState] = useState<RunnerState>({
    status: "idle",
    tools: ALL_ASSERTION_TESTS.map(emptyToolResult),
    elapsedMs: 0,
    totalAssertions: ALL_ASSERTION_TESTS.reduce((a, t) => a + t.assertions.length, 0),
    passedAssertions: 0,
    failedAssertions: 0,
    completedTools: 0,
  });

  const [isPaused, setIsPaused] = useState(false);
  const isRunning = runnerState.status === "running" || runnerState.status === "paused";

  const handleRunAll = useCallback(async () => {
    if (!user) return;
    const runner = new AssertionRunner();
    runnerRef.current = runner;
    setIsPaused(false);
    setRunnerState({ status: "running", tools: ALL_ASSERTION_TESTS.map(emptyToolResult), startedAt: Date.now(), elapsedMs: 0, totalAssertions: ALL_ASSERTION_TESTS.reduce((a, t) => a + t.assertions.length, 0), passedAssertions: 0, failedAssertions: 0, completedTools: 0 });
    await runner.run(ALL_ASSERTION_TESTS, user.id, (_toolId, result) => { setRunnerState((s) => ({ ...s, tools: s.tools.map((t) => (t.toolId === result.toolId ? result : t)) })); }, (state) => setRunnerState({ ...state }));
  }, [user]);

  const handleRunSingle = useCallback(async (toolId: string) => {
    if (!user || isRunning) return;
    const test = ALL_ASSERTION_TESTS.find((t) => t.toolId === toolId);
    if (!test) return;
    const runner = new AssertionRunner();
    runnerRef.current = runner;
    setIsPaused(false);
    setRunnerState((s) => ({ ...s, status: "running", tools: s.tools.map((t) => (t.toolId === toolId ? emptyToolResult(test) : t)) }));
    await runner.run([test], user.id, (_toolId, result) => { setRunnerState((s) => ({ ...s, tools: s.tools.map((t) => (t.toolId === result.toolId ? result : t)) })); }, () => {});
    setRunnerState((s) => ({ ...s, status: "idle" }));
  }, [user, isRunning]);

  const handlePauseResume = () => {
    const runner = runnerRef.current;
    if (!runner) return;
    if (isPaused) { runner.resume(); setIsPaused(false); setRunnerState((s) => ({ ...s, status: "running" })); }
    else { runner.pause(); setIsPaused(true); setRunnerState((s) => ({ ...s, status: "paused" })); }
  };

  const handleStop = () => { runnerRef.current?.stop(); setIsPaused(false); setRunnerState((s) => ({ ...s, status: "stopped" })); };

  const handleClear = () => {
    runnerRef.current?.stop();
    setIsPaused(false);
    setRunnerState({ status: "idle", tools: ALL_ASSERTION_TESTS.map(emptyToolResult), elapsedMs: 0, totalAssertions: ALL_ASSERTION_TESTS.reduce((a, t) => a + t.assertions.length, 0), passedAssertions: 0, failedAssertions: 0, completedTools: 0 });
  };

  const completedCount = runnerState.tools.filter((t) => t.status === "complete" || t.status === "failed").length;
  const totalCount = ALL_ASSERTION_TESTS.length;
  const allPassed = runnerState.status === "complete" && runnerState.failedAssertions === 0;

  const statusLabel: Record<string, string> = { idle: "Ready", running: "Running…", paused: "Paused", complete: "Complete", stopped: "Stopped" };

  const handleDownload = () => {
    const exportData = {
      exportedAt: new Date().toISOString(),
      runStatus: runnerState.status,
      elapsedMs: runnerState.elapsedMs,
      totalAssertions: runnerState.totalAssertions,
      passedAssertions: runnerState.passedAssertions,
      failedAssertions: runnerState.failedAssertions,
      tools: runnerState.tools.map((t) => ({
        toolId: t.toolId,
        toolName: t.toolName,
        status: t.status,
        elapsedMs: t.elapsedMs,
        passCount: t.passCount,
        failCount: t.failCount,
        error: t.error,
        log: t.log,
        assertions: t.results.map((r) => ({
          id: r.assertion.id,
          description: r.assertion.description,
          category: r.assertion.category,
          passed: r.passed,
          errorMessage: r.passed ? null : r.assertion.errorMessage,
          runtimeError: r.error ?? null,
        })),
      })),
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `eup-assertion-results-${new Date().toISOString().slice(0, 19).replace(/:/g, "-")}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      <div className="max-w-5xl mx-auto px-6 py-8 space-y-6">
        <div>
          <h1 className="text-2xl font-serif font-semibold text-slate-900 mb-1">Round 3 — Assertion Test Harness</h1>
          <p className="text-sm text-slate-500">
            Runs {totalCount} tools against fixed fixtures and checks {runnerState.totalAssertions} content-accuracy assertions. Concurrency: {CONCURRENCY} workers · Timeout: 3 min/tool.
          </p>
        </div>

        <div className="flex flex-wrap gap-2 items-center">
          <button onClick={handleRunAll} disabled={!user || isRunning} className="px-4 py-2 rounded bg-brand-navy text-white text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90">▶ Run all tests</button>
          {isRunning && <button onClick={handlePauseResume} className="px-4 py-2 rounded border border-slate-300 text-slate-700 text-sm hover:bg-slate-100">{isPaused ? "▶ Resume" : "⏸ Pause"}</button>}
          {isRunning && <button onClick={handleStop} className="px-4 py-2 rounded border border-red-300 text-red-700 text-sm hover:bg-red-50">⏹ Stop</button>}
          {!isRunning && runnerState.status !== "idle" && <button onClick={handleClear} className="px-4 py-2 rounded border border-slate-300 text-slate-600 text-sm hover:bg-slate-100">🗑 Clear results</button>}
          <button
            onClick={handleDownload}
            className="px-4 py-2 rounded border border-slate-300 text-slate-600 text-sm hover:bg-slate-100"
          >
            ⬇ Download results
          </button>
          {!user && <span className="text-xs text-red-600">Sign in as admin to run tests.</span>}
        </div>

        {runnerState.status !== "idle" && (
          <div className={`rounded-lg border px-5 py-4 ${allPassed ? "bg-green-50 border-green-200" : runnerState.status === "complete" ? "bg-red-50 border-red-200" : "bg-white border-slate-200"}`}>
            <div className="flex flex-wrap gap-6 text-sm">
              <div><span className="text-slate-500">Status </span><span className="font-semibold">{statusLabel[runnerState.status] ?? runnerState.status}</span></div>
              <div><span className="text-slate-500">Tools </span><span className="font-semibold">{completedCount}/{totalCount}</span></div>
              <div>
                <span className="text-slate-500">Assertions </span>
                <span className="font-semibold text-green-700">{runnerState.passedAssertions} passed</span>
                {runnerState.failedAssertions > 0 && <><span> / </span><span className="font-semibold text-red-700">{runnerState.failedAssertions} failed</span></>}
                <span className="text-slate-400"> ({pct(runnerState.passedAssertions, runnerState.passedAssertions + runnerState.failedAssertions)})</span>
              </div>
              {runnerState.elapsedMs > 0 && <div><span className="text-slate-500">Elapsed </span><span className="font-semibold">{elapsed(runnerState.elapsedMs)}</span></div>}
            </div>
            {isRunning && (
              <div className="mt-3 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                <div className="h-full bg-brand-teal rounded-full transition-all duration-300" style={{ width: `${totalCount > 0 ? (completedCount / totalCount) * 100 : 0}%` }} />
              </div>
            )}
            {allPassed && <div className="mt-2 text-sm text-green-700 font-medium">✅ All assertions passed — known error catalog is clean.</div>}
          </div>
        )}

        <div className="space-y-3">
          {ALL_ASSERTION_TESTS.map((test) => {
            const result = runnerState.tools.find((t) => t.toolId === test.toolId) ?? emptyToolResult(test);
            return <ToolCard key={test.toolId} test={test} result={result} onRunSingle={handleRunSingle} isRunning={isRunning} />;
          })}
        </div>

        <div className="text-xs text-slate-400 pb-8">
          Round 3 harness — development tool only. Results are not stored in the database. Run after Katherine applies any fix prompts to confirm regressions are clear.
        </div>
      </div>
    </div>
  );
}