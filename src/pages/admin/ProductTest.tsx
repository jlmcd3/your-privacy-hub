// /admin/product-test — doc 272 (2026-09-18).
//
// One admin page that generates real documents through the deployed product
// functions from chosen panel fixtures (golden or messy), grades every
// document with code (product-test-grade, no model call anywhere in this
// page or that function), shows the run as it happens, stores every check
// result, and hands failures to the fix process. Replaces /all-ptest,
// /admin/all-products-test, the quality-batch consoles and the quality
// loops (doc 272 §0) — none of those are touched here; this is a new page.
//
// A run survives a page reload: everything shown here is read back from
// product_test_runs / product_test_documents / product_test_checks.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

import {
  fetchRecentRuns, fetchRun, fetchRunChecks, fetchRunDocuments, startRun, updateCheck,
  type RunHandle,
} from "@/lib/productTest/run";
import {
  DEFAULT_TOOLS, MAX_COPIES, MIN_COPIES, TOOL_GROUPS, VARIANT_KIND_ORDER,
  clampCopies, evaluateLaunchBars, toolSummary, wantsMessyVariants,
} from "@/lib/productTest/plan";
import { buildRunMarkdown, downloadMarkdown, runExportFilename } from "@/lib/productTest/exportMarkdown";
import type {
  CheckRow, CheckClass, CheckStatus, DocumentRow, PanelTool, RunRow, VariantKind,
} from "@/lib/productTest/types";

const TOOL_LABELS: Record<PanelTool, string> = {
  "cppa-risk": "CPPA Risk Assessment",
  "cppa-cyber": "CPPA Cybersecurity",
  "cppa-admt": "CPPA ADMT",
  "dpia": "DPIA Framework",
  "lia": "LI Assessment",
  "governance": "Governance Assessment",
  "ir-playbook": "IR Playbook",
  "biometric": "Biometric Compliance",
  "dpa": "Custom DPA",
  "ropa": "RoPA",
  "us-notice": "US Privacy Notice",
  "eu-notice": "EU/Global Privacy Notice",
  "registration": "Registration Filings Manager",
};

const VARIANT_LABELS: Record<VariantKind, string> = {
  golden: "Golden",
  "thin-all": "Thin all",
  "thin-one": "Thin one",
  "blank-required": "Blank required",
  contradict: "Contradict",
  authored: "Authored",
  "wrong-regime": "Wrong regime",
};

const STATUS_OPTIONS: CheckStatus[] = ["open", "fixed-pending-deploy", "cleared", "accepted-by-design", "ceo"];
const CLASS_OPTIONS: CheckClass[] = ["product", "fixture", "check", "ceo-decision"];

const LOG_LIMIT = 500;
const POLL_MS = 4_000;

function pct(n: number): string {
  return `${(n * 100).toFixed(1)}%`;
}

export default function ProductTest() {
  const { user } = useAuth();

  // ── Settings (sections a-c) ─────────────────────────────────────────────
  const [tools, setTools] = useState<PanelTool[]>(DEFAULT_TOOLS);
  const [copies, setCopies] = useState(1);
  const [repeatSameFixture, setRepeatSameFixture] = useState(false);
  const [variantKinds, setVariantKinds] = useState<VariantKind[]>(["golden"]);

  const toggleTool = (t: PanelTool) =>
    setTools((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]));
  const toggleVariant = (k: VariantKind) => {
    if (k === "golden") return; // always on, cannot uncheck
    setVariantKinds((prev) => (prev.includes(k) ? prev.filter((x) => x !== k) : [...prev, k]));
  };

  // ── Run state (section d) ───────────────────────────────────────────────
  const [runHandle, setRunHandle] = useState<RunHandle | null>(null);
  const [activeRunId, setActiveRunId] = useState<string | null>(null);
  const [activeRun, setActiveRun] = useState<RunRow | null>(null);
  const [documents, setDocuments] = useState<DocumentRow[]>([]);
  const [checks, setChecks] = useState<CheckRow[]>([]);
  const [logLines, setLogLines] = useState<string[]>([]);
  const [paused, setPaused] = useState(false);
  const logRef = useRef<HTMLDivElement | null>(null);
  const documentsRef = useRef<Map<string, DocumentRow>>(new Map());

  useEffect(() => {
    const el = logRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [logLines]);

  const busy = !!runHandle && (activeRun?.status ?? "running") === "running";

  const mergeDocument = useCallback((doc: DocumentRow) => {
    documentsRef.current.set(doc.id, doc);
    setDocuments(Array.from(documentsRef.current.values()));
  }, []);

  const runNow = useCallback(async () => {
    if (!user?.id || !tools.length) return;
    documentsRef.current = new Map();
    setDocuments([]);
    setChecks([]);
    setLogLines([]);
    setActiveRun(null);
    setPaused(false);
    try {
      const handle = await startRun(
        { tools, copies: clampCopies(copies), repeatSameFixture, variantKinds, concurrency: 3 },
        {
          userId: user.id,
          onLog: (line) => setLogLines((prev) => [...prev, line].slice(-LOG_LIMIT)),
          onDocumentUpdate: mergeDocument,
          onRunUpdate: (r) => setActiveRun((prev) => (prev ? { ...prev, ...r } as RunRow : (r as RunRow))),
        },
      );
      setRunHandle(handle);
      setActiveRunId(handle.runId);
      handle.done.then(async (finalRun) => {
        setActiveRun(finalRun);
        setRunHandle(null);
        try { setChecks(await fetchRunChecks(finalRun.id)); } catch { /* checks table read is best-effort here */ }
        void refreshRecent();
      });
    } catch (e) {
      setLogLines((prev) => [...prev, `Run failed to start — ${(e as Error).message}`].slice(-LOG_LIMIT));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, tools, copies, repeatSameFixture, variantKinds, mergeDocument]);

  const pauseResume = useCallback(() => {
    if (!runHandle) return;
    if (runHandle.isPaused()) { runHandle.resume(); setPaused(false); }
    else { runHandle.pause(); setPaused(true); }
  }, [runHandle]);

  const stopRun = useCallback(() => { runHandle?.stop(); }, [runHandle]);

  // ── Recent runs (section g) ─────────────────────────────────────────────
  const [recentRuns, setRecentRuns] = useState<RunRow[]>([]);
  const refreshRecent = useCallback(async () => {
    try { setRecentRuns(await fetchRecentRuns(20)); } catch { /* reporting only */ }
  }, []);
  useEffect(() => { void refreshRecent(); }, [refreshRecent]);

  const loadRun = useCallback(async (runId: string) => {
    try {
      const [run, docs, checkRows] = await Promise.all([fetchRun(runId), fetchRunDocuments(runId), fetchRunChecks(runId)]);
      if (!run) return;
      setActiveRun(run);
      setActiveRunId(run.id);
      documentsRef.current = new Map(docs.map((d) => [d.id, d]));
      setDocuments(docs);
      setChecks(checkRows);
      setLogLines((run.log ?? []).slice(-LOG_LIMIT));
      setRunHandle(null);
    } catch (e) {
      setLogLines((prev) => [...prev, `Run load failed — ${(e as Error).message}`].slice(-LOG_LIMIT));
    }
  }, []);

  // On first mount, recover an in-progress run (page reload recovery, doc 272 §5).
  useEffect(() => {
    if (!recentRuns.length || activeRunId) return;
    const running = recentRuns.find((r) => r.status === "running");
    if (running) void loadRun(running.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recentRuns]);

  // Poll DB state for the active run (keeps documents/checks in sync with
  // what generation/grading actually persisted, and recovers a run this tab
  // did not start).
  useEffect(() => {
    if (!activeRunId) return;
    const isLive = activeRun?.status === "running" || !activeRun;
    if (!isLive) return;
    const id = setInterval(() => { void loadRun(activeRunId); }, POLL_MS);
    return () => clearInterval(id);
  }, [activeRunId, activeRun?.status, loadRun]);

  // ── Results (section e) ─────────────────────────────────────────────────
  const messy = useMemo(() => wantsMessyVariants(variantKinds), [variantKinds]);

  const perToolRows = useMemo(() => {
    const byToolFromSummary = activeRun?.summary?.byTool;
    return tools.map((tool) => {
      const fromSummary = byToolFromSummary?.[tool];
      const ts = fromSummary
        ?? toolSummary(
          documents.filter((d) => d.tool === tool),
          checks.filter((c) => c.tool === tool).map((c) => ({ passed: c.passed, severity: c.severity })),
        );
      const bars = evaluateLaunchBars(ts, messy);
      return { tool, ts, bars };
    });
  }, [tools, documents, checks, activeRun, messy]);

  // ── Failures (section f) ────────────────────────────────────────────────
  const [filterTool, setFilterTool] = useState<string>("all");
  const [filterFamily, setFilterFamily] = useState<string>("all");
  const [filterSeverity, setFilterSeverity] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");

  const failedChecks = useMemo(() => {
    return checks.filter((c) => !c.passed)
      .filter((c) => filterTool === "all" || c.tool === filterTool)
      .filter((c) => filterFamily === "all" || c.family === filterFamily)
      .filter((c) => filterSeverity === "all" || c.severity === filterSeverity)
      .filter((c) => filterStatus === "all" || c.status === filterStatus);
  }, [checks, filterTool, filterFamily, filterSeverity, filterStatus]);

  type EditState = { status: CheckStatus; class: CheckClass | ""; note: string };
  const [editing, setEditing] = useState<Record<number, EditState>>({});
  const editRow = (c: CheckRow): EditState => editing[c.id] ?? { status: c.status, class: c.class ?? "", note: c.note ?? "" };
  const setEditField = (c: CheckRow, patch: Partial<EditState>) =>
    setEditing((prev) => ({ ...prev, [c.id]: { ...editRow(c), ...patch } }));

  const saveCheck = useCallback(async (c: CheckRow) => {
    const e = editRow(c);
    try {
      await updateCheck(c.id, { status: e.status, class: e.class || null, note: e.note || null });
      setChecks((prev) => prev.map((x) => (x.id === c.id ? { ...x, status: e.status, class: (e.class || null) as CheckClass | null, note: e.note || null } : x)));
    } catch (err) {
      setLogLines((prev) => [...prev, `Check ${c.check_id} save failed — ${(err as Error).message}`].slice(-LOG_LIMIT));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editing]);

  // ── Export (section h) ──────────────────────────────────────────────────
  const exportRun = useCallback(() => {
    if (!activeRun) return;
    const md = buildRunMarkdown(activeRun, documents, checks);
    downloadMarkdown(runExportFilename(activeRun), md);
  }, [activeRun, documents, checks]);

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
      <header className="space-y-1">
        <h1 className="font-serif text-2xl text-foreground">Product test</h1>
        <p className="text-sm text-muted-foreground">
          Generates real documents through the deployed product functions from panel fixtures (golden or messy),
          grades every one with code, and stores every check result. No model call anywhere in this page or in
          the grading function (doc 272).
        </p>
      </header>

      {/* (a) Products, (b) copies, (c) variant kinds */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Run settings</CardTitle>
          <CardDescription>Default selection is the six Auto products.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 md:grid-cols-3">
            {TOOL_GROUPS.map((g) => (
              <div key={g.label} className="space-y-2">
                <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{g.label}</div>
                <div className="space-y-1.5">
                  {g.tools.map((t) => (
                    <label key={t} className="flex items-center gap-2 text-sm">
                      <Checkbox checked={tools.includes(t)} disabled={busy} onCheckedChange={() => toggleTool(t)} />
                      {TOOL_LABELS[t]}
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label className="block text-sm">
                <span className="mb-1 block text-muted-foreground">Copies per product (1-15)</span>
                <Input
                  type="number" min={MIN_COPIES} max={MAX_COPIES} value={copies} disabled={busy}
                  onChange={(e) => setCopies(clampCopies(Number(e.target.value) || 1))}
                  className="w-32"
                />
              </label>
              <label className="flex items-center gap-2 text-sm">
                <Checkbox checked={repeatSameFixture} disabled={busy} onCheckedChange={(v) => setRepeatSameFixture(!!v)} />
                Repeat same fixture (determinism/stability check across copies)
              </label>
            </div>

            <div className="space-y-2">
              <span className="mb-1 block text-sm text-muted-foreground">Variant kinds</span>
              <div className="grid grid-cols-2 gap-1.5">
                {VARIANT_KIND_ORDER.map((k) => (
                  <label key={k} className={`flex items-center gap-2 text-sm ${k === "golden" ? "opacity-80" : ""}`}>
                    <Checkbox
                      checked={variantKinds.includes(k) || k === "golden"}
                      disabled={busy || k === "golden"}
                      onCheckedChange={() => toggleVariant(k)}
                    />
                    {VARIANT_LABELS[k]}
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* (d) Run / Pause / Stop */}
          <div className="flex flex-wrap items-center gap-2">
            <Button disabled={busy || !tools.length || !user?.id} onClick={() => void runNow()}>
              {busy ? "Running…" : "Run"}
            </Button>
            {busy && (
              <Button variant="outline" onClick={pauseResume}>
                {paused ? "Resume" : "Pause"}
              </Button>
            )}
            {busy && (
              <Button variant="destructive" onClick={stopRun}>Stop</Button>
            )}
            {!!activeRun && (
              <Button variant="outline" onClick={exportRun}>Export markdown</Button>
            )}
            <span className="text-xs text-muted-foreground">
              {activeRun ? `Run ${activeRun.id.slice(0, 8)} · ${activeRun.status}` : "No run yet"}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* (d) Log panel */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Run log ({logLines.length} line{logLines.length === 1 ? "" : "s"})</CardTitle>
        </CardHeader>
        <CardContent>
          <div ref={logRef} className="max-h-96 overflow-auto rounded border border-border bg-muted/30 p-3 font-mono text-[11px] leading-5 text-muted-foreground">
            {logLines.length ? logLines.map((l, i) => <div key={i}>{l}</div>) : "No run yet. Starting a run clears this log and streams progress here."}
          </div>
        </CardContent>
      </Card>

      {/* (e) Results */}
      {!!documents.length && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Results by product</CardTitle>
            <CardDescription>
              Launch bars (doc 272 §6): document pass rate {messy ? "98%" : "100%"} · check pass rate 98%.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead>Documents</TableHead>
                  <TableHead>Doc pass rate</TableHead>
                  <TableHead>Checks</TableHead>
                  <TableHead>Check pass rate</TableHead>
                  <TableHead>Critical</TableHead>
                  <TableHead>High</TableHead>
                  <TableHead>Editorial</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {perToolRows.map(({ tool, ts, bars }) => (
                  <TableRow key={tool}>
                    <TableCell className="font-medium">{TOOL_LABELS[tool]}</TableCell>
                    <TableCell>{ts.documents}</TableCell>
                    <TableCell className={bars.documentBarMet ? "text-emerald-600" : "text-destructive"}>
                      {pct(ts.document_pass_rate)}
                    </TableCell>
                    <TableCell>{ts.checks_passed}/{ts.checks_total}</TableCell>
                    <TableCell className={bars.checkBarMet ? "text-emerald-600" : "text-destructive"}>
                      {pct(ts.check_pass_rate)}
                    </TableCell>
                    <TableCell>{ts.critical}</TableCell>
                    <TableCell>{ts.high}</TableCell>
                    <TableCell>{ts.editorial}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* (f) Failures */}
      {!!checks.length && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Failed checks ({failedChecks.length})</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-wrap gap-2">
              <Select value={filterTool} onValueChange={setFilterTool}>
                <SelectTrigger className="w-40"><SelectValue placeholder="Tool" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All tools</SelectItem>
                  {tools.map((t) => <SelectItem key={t} value={t}>{TOOL_LABELS[t]}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={filterFamily} onValueChange={setFilterFamily}>
                <SelectTrigger className="w-40"><SelectValue placeholder="Family" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All families</SelectItem>
                  {["structure", "fidelity", "cross-block", "legal", "snapshot", "stability"].map((f) => (
                    <SelectItem key={f} value={f}>{f}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={filterSeverity} onValueChange={setFilterSeverity}>
                <SelectTrigger className="w-36"><SelectValue placeholder="Severity" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All severities</SelectItem>
                  {["critical", "high", "editorial"].map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-44"><SelectValue placeholder="Status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  {STATUS_OPTIONS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-3">
              {failedChecks.map((c) => {
                const e = editRow(c);
                return (
                  <div key={c.id} className="rounded border border-border p-3 text-xs">
                    <div className="mb-1 flex flex-wrap items-center gap-2">
                      <Badge variant={c.severity === "critical" ? "destructive" : c.severity === "high" ? "secondary" : "outline"}>
                        {c.severity}
                      </Badge>
                      <span className="font-mono">{c.check_id}</span>
                      <span className="text-muted-foreground">
                        {c.tool} · {c.fixture_id} · {c.variant_id}{c.block_key ? ` · ${c.block_key}` : ""}
                      </span>
                    </div>
                    {c.quote && <div className="mb-1"><span className="text-muted-foreground">Quote: </span>“{c.quote}”</div>}
                    {c.expected && <div className="mb-1"><span className="text-muted-foreground">Expected: </span>{c.expected}</div>}
                    {c.actual && <div className="mb-1"><span className="text-muted-foreground">Actual: </span>{c.actual}</div>}
                    {c.rule_ref && <div className="mb-2"><span className="text-muted-foreground">Rule: </span>{c.rule_ref}</div>}

                    <div className="flex flex-wrap items-end gap-2">
                      <label className="space-y-1">
                        <span className="block text-muted-foreground">Status</span>
                        <Select value={e.status} onValueChange={(v) => setEditField(c, { status: v as CheckStatus })}>
                          <SelectTrigger className="h-8 w-44"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {STATUS_OPTIONS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </label>
                      <label className="space-y-1">
                        <span className="block text-muted-foreground">Class</span>
                        <Select value={e.class || "none"} onValueChange={(v) => setEditField(c, { class: v === "none" ? "" : (v as CheckClass) })}>
                          <SelectTrigger className="h-8 w-40"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">—</SelectItem>
                            {CLASS_OPTIONS.map((cl) => <SelectItem key={cl} value={cl}>{cl}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </label>
                      <label className="flex-1 space-y-1">
                        <span className="block text-muted-foreground">Note</span>
                        <Textarea
                          className="h-8 min-h-8 py-1"
                          value={e.note}
                          onChange={(ev) => setEditField(c, { note: ev.target.value })}
                        />
                      </label>
                      <Button size="sm" onClick={() => void saveCheck(c)}>Save</Button>
                    </div>
                  </div>
                );
              })}
              {!failedChecks.length && <p className="text-muted-foreground">No failures match the current filters.</p>}
            </div>
          </CardContent>
        </Card>
      )}

      {/* (g) Recent runs */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent runs</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-1 text-sm">
            {recentRuns.map((r) => (
              <li key={r.id}>
                <button
                  type="button"
                  onClick={() => void loadRun(r.id)}
                  className={`w-full rounded border px-3 py-1.5 text-left hover:bg-accent ${activeRun?.id === r.id ? "border-brand-teal" : "border-border"}`}
                >
                  <span className="font-mono">{r.id.slice(0, 8)}</span>{" "}
                  <span className="text-muted-foreground">{new Date(r.created_at).toLocaleString()} · {r.status}</span>
                  {r.summary && (
                    <span className="text-muted-foreground">
                      {" "}· {r.summary.overall.documents} docs · doc pass {pct(r.summary.overall.document_pass_rate)} · check pass {pct(r.summary.overall.check_pass_rate)}
                    </span>
                  )}
                </button>
              </li>
            ))}
            {!recentRuns.length && <li className="text-muted-foreground">No runs yet.</li>}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
