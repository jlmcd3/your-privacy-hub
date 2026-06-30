import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from "sonner";
import { runSuite } from "@/lib/coverage/runner";
import { ropaCoverageSuite } from "@/lib/coverage/ropaSuite";
import { euNoticeCoverageSuite } from "@/lib/coverage/euNoticeSuite";
import { usNoticeCoverageSuite } from "@/lib/coverage/usNoticeSuite";
import type { SuiteRun, RuleStatus } from "@/lib/coverage/types";

const SUITES = [ropaCoverageSuite, euNoticeCoverageSuite, usNoticeCoverageSuite] as const;

function statusClass(s: RuleStatus): string {
  switch (s) {
    case "pass": return "bg-emerald-500/20 text-emerald-700 border-emerald-500/40";
    case "fail": return "bg-red-500/20 text-red-700 border-red-500/40";
    case "warn": return "bg-amber-500/20 text-amber-700 border-amber-500/40";
    case "skip": return "bg-muted text-muted-foreground border-border";
  }
}

function symbol(s: RuleStatus): string {
  return s === "pass" ? "✓" : s === "fail" ? "✗" : s === "warn" ? "!" : "–";
}

function downloadJson(runs: SuiteRun[]) {
  const blob = new Blob([JSON.stringify(runs, null, 2)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `coverage-matrix-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(a.href);
}

function downloadMd(runs: SuiteRun[]) {
  const lines: string[] = [`# Coverage Matrix Report`, "", `_Exported ${new Date().toISOString()}_`, ""];
  for (const r of runs) {
    lines.push(`## ${r.toolLabel}`);
    lines.push("");
    lines.push(`Pass ${r.summary.pass} · Fail ${r.summary.fail} · Warn ${r.summary.warn} · Skip ${r.summary.skip} · Total ${r.summary.total}`);
    lines.push("");
    const fails = r.cells.filter((c) => c.status === "fail" || c.status === "warn");
    if (!fails.length) { lines.push("_All green._"); lines.push(""); continue; }
    for (const f of fails) {
      lines.push(`- **${f.status.toUpperCase()}** — ${f.personaId} / ${f.ruleId}: ${f.message ?? ""}`);
    }
    lines.push("");
  }
  const blob = new Blob([lines.join("\n")], { type: "text/markdown" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `coverage-matrix-${new Date().toISOString().slice(0, 10)}.md`;
  a.click();
  URL.revokeObjectURL(a.href);
}

export default function CoverageMatrix() {
  const [runs, setRuns] = useState<SuiteRun[] | null>(null);
  const [running, setRunning] = useState(false);

  function onRun() {
    setRunning(true);
    try {
      const out = SUITES.map((s) => runSuite(s as any));
      setRuns(out);
      const fails = out.reduce((n, r) => n + r.summary.fail, 0);
      toast[fails ? "warning" : "success"](
        fails ? `${fails} failing assertions` : `All ${out.reduce((n, r) => n + r.summary.total, 0)} assertions passed`,
      );
    } catch (e: any) {
      toast.error(`Run failed: ${e?.message ?? e}`);
    } finally {
      setRunning(false);
    }
  }

  const totals = useMemo(() => {
    if (!runs) return null;
    return runs.reduce(
      (acc, r) => ({
        pass: acc.pass + r.summary.pass,
        fail: acc.fail + r.summary.fail,
        warn: acc.warn + r.summary.warn,
        skip: acc.skip + r.summary.skip,
        total: acc.total + r.summary.total,
      }),
      { pass: 0, fail: 0, warn: 0, skip: 0, total: 0 },
    );
  }, [runs]);

  return (
    <TooltipProvider>
      <div className="container mx-auto py-8 space-y-6">
        <div>
          <h1 className="text-3xl font-serif">Coverage Matrix</h1>
          <p className="text-muted-foreground mt-1 max-w-3xl">
            Deterministic, rule-based assertions for questionnaire-driven tools (RoPA, EU Notice, US Notice).
            No LLMs, no network — runs entirely in the browser against the source-of-truth question registries.
          </p>
        </div>

        {/* Instructions */}
        <Card>
          <CardHeader><CardTitle className="text-base">How to use this page</CardTitle></CardHeader>
          <CardContent className="text-sm space-y-2 text-muted-foreground">
            <p><strong className="text-foreground">What it does.</strong> For each tool, the page defines a set of <em>personas</em>
              (concrete input scenarios) and a set of <em>rules</em> (required-section / jurisdiction / hygiene assertions).
              Pressing <em>Run all suites</em> walks every persona through every rule and shows the result as a grid.</p>
            <p><strong className="text-foreground">What the grid shows.</strong> Rows are personas, columns are rules. A cell is
              <Badge variant="outline" className={`mx-1 ${statusClass("pass")}`}>✓ pass</Badge> the rule held,
              <Badge variant="outline" className={`mx-1 ${statusClass("fail")}`}>✗ fail</Badge> the rule was violated,
              <Badge variant="outline" className={`mx-1 ${statusClass("warn")}`}>! warn</Badge> a non-blocking concern,
              <Badge variant="outline" className={`mx-1 ${statusClass("skip")}`}>– skip</Badge> the rule didn't apply
              to that persona (e.g. UK-only assertion on an EU-only persona). Hover a cell for the failure message; hover a
              column header for what the rule asserts.</p>
            <p><strong className="text-foreground">When to run it.</strong> Run after any change to
              <code className="mx-1">src/data/ropa-questions/*</code>, <code>src/data/eu-notice-questions/*</code>, or
              <code className="mx-1">src/data/us-notice-questions/*</code>. Run before merging any PR that touches notice frameworks
              or US state packs. Investigate every fail before shipping.</p>
            <p><strong className="text-foreground">What it does <em>not</em> do.</strong> It does not score prose quality — that's
              what Quality Loop 2 is for. It does not exercise edge-function generation or the live UI flow — those need
              Playwright. It tests the deterministic data layer that drives them.</p>
            <p><strong className="text-foreground">Extending it.</strong> Add personas in
              <code className="mx-1">src/lib/coverage/&lt;tool&gt;Suite.ts</code> to widen coverage, or add rules to enforce a new
              must-have disclosure. Add a fresh suite for any new questionnaire-driven tool.</p>
          </CardContent>
        </Card>

        {/* Run controls */}
        <div className="flex items-center gap-3">
          <Button onClick={onRun} disabled={running}>{running ? "Running…" : "Run all suites"}</Button>
          {runs && (
            <>
              <Button variant="outline" onClick={() => downloadMd(runs)}>Export failures (.md)</Button>
              <Button variant="outline" onClick={() => downloadJson(runs)}>Export full report (.json)</Button>
              {totals && (
                <div className="text-sm text-muted-foreground ml-2">
                  <Badge variant="outline" className={`mr-1 ${statusClass("pass")}`}>{totals.pass} pass</Badge>
                  <Badge variant="outline" className={`mr-1 ${statusClass("fail")}`}>{totals.fail} fail</Badge>
                  <Badge variant="outline" className={`mr-1 ${statusClass("warn")}`}>{totals.warn} warn</Badge>
                  <Badge variant="outline" className={`mr-1 ${statusClass("skip")}`}>{totals.skip} skip</Badge>
                  <span>of {totals.total}</span>
                </div>
              )}
            </>
          )}
        </div>

        {/* Grids */}
        {runs?.map((run) => {
          const cellMap = new Map(run.cells.map((c) => [`${c.personaId}|${c.ruleId}`, c]));
          return (
            <Card key={run.toolId}>
              <CardHeader>
                <CardTitle className="flex items-center gap-3">
                  <span>{run.toolLabel}</span>
                  <Badge variant="outline" className={statusClass(run.summary.fail ? "fail" : "pass")}>
                    {run.summary.fail ? `${run.summary.fail} failing` : "all passing"}
                  </Badge>
                  <span className="text-xs text-muted-foreground font-normal">
                    {run.personas.length} personas × {run.rules.length} rules = {run.summary.total} assertions
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="text-xs border-collapse">
                    <thead>
                      <tr>
                        <th className="sticky left-0 bg-background border-b border-r p-2 text-left font-medium min-w-[200px]">Persona ↓ / Rule →</th>
                        {run.rules.map((r) => (
                          <th key={r.id} className="border-b border-r p-2 text-left font-medium align-bottom">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div className="writing-mode-vertical text-left max-w-[140px] cursor-help">
                                  <div className="font-medium">{r.label}</div>
                                  <div className="text-muted-foreground font-mono text-[10px]">{r.id}</div>
                                </div>
                              </TooltipTrigger>
                              <TooltipContent side="bottom" className="max-w-xs">{r.rationale}</TooltipContent>
                            </Tooltip>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {run.personas.map((p: any) => (
                        <tr key={p.id}>
                          <td className="sticky left-0 bg-background border-b border-r p-2 align-top">
                            <div className="font-medium">{p.label}</div>
                            <div className="text-muted-foreground font-mono text-[10px]">{p.id}</div>
                          </td>
                          {run.rules.map((rule) => {
                            const c = cellMap.get(`${p.id}|${rule.id}`)!;
                            return (
                              <td key={rule.id} className="border-b border-r p-1 text-center">
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <div className={`inline-block min-w-[28px] px-2 py-1 rounded border ${statusClass(c.status)} cursor-help`}>
                                      {symbol(c.status)}
                                    </div>
                                  </TooltipTrigger>
                                  <TooltipContent side="top" className="max-w-sm">
                                    <div className="font-medium">{rule.label} — {c.status}</div>
                                    {c.message && <div className="text-xs mt-1">{c.message}</div>}
                                  </TooltipContent>
                                </Tooltip>
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Failure list under the grid */}
                {run.summary.fail > 0 && (
                  <div className="mt-4 border-t pt-3">
                    <div className="font-medium text-sm mb-2 text-red-700">Failures</div>
                    <ul className="text-xs space-y-1">
                      {run.cells.filter((c) => c.status === "fail").map((c, i) => (
                        <li key={i}>
                          <code className="text-foreground">{c.personaId}</code> · <code>{c.ruleId}</code> — {c.message}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}

        {!runs && (
          <Card>
            <CardContent className="py-10 text-center text-muted-foreground text-sm">
              Press <em>Run all suites</em> to generate the matrix.
            </CardContent>
          </Card>
        )}
      </div>
    </TooltipProvider>
  );
}
