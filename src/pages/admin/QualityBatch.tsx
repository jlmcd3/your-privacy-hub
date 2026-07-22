// QualityBatch — admin console for run-quality-batch, driven by the
// server-side quality-batch-orchestrator (QB-P1/P1.1). Rebuilt in QB-P2 on
// QualityLoop2's three-panel pattern.
//
// The prior client-side queue (pollUntilTerminal / startQueue / cancelQueue /
// QueueItem / TERMINAL_STATUSES / cancelRef) is gone — the orchestrator now
// owns sequential dispatch, stall detection, and cancellation.

import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import JSZip from "jszip";
import { LaunchGateScoreboard } from "@/components/admin/LaunchGateScoreboard";

// QB-P3 cleanup: SLUG_TO_TOOL_TYPE lives in src/lib/qualityBatchTools.ts so
// QualityBatch and QualityBatch2 share one source of truth. Verified against
// supabase/functions/generate-report-pdf/index.ts tableMap (L1853–1868).
import { SLUG_TO_TOOL_TYPE } from "@/lib/qualityBatchTools";

// Must stay identical to RUN_QUALITY_BATCH_SLUGS in the orchestrator.
const TOOLS = [
  "cppa-admt",
  "cppa-risk",
  "cppa-cyber",
  "governance",
  "dpia",
  "lia",
  "dpa-generator",
  "ir-playbook",
  "biometric-checker",
];

type LogEntry = { t?: string; level?: string; msg?: string; [k: string]: unknown };

type QRun = {
  id: string;
  tool: string | null;
  status: string;
  batch_size: number | null;
  run_number: number | null;
  checks_passed: number | null;
  checks_failed: number | null;
  checks_total: number | null;
  score_overall: number | null;
  gpt_score_overall: number | null;
  cross_review_complete: boolean | null;
  error: string | null;
  started_at: string;
  last_heartbeat_at: string | null;
  completed_at: string | null;
  progress_log: LogEntry[] | null;
};

type ToolResult = {
  tool: string;
  quality_run_id: string | null;
  run_number: number | null;
  final_status: string;
  score_overall: number | null;
  gpt_score_overall: number | null;
  error: string | null;
  dispatched_at?: string | null;
};

type BatchRow = {
  id: string;
  tools: string[];
  batch_size: number;
  status: string;
  phase: string;
  current_tool_index: number;
  current_quality_run_id: string | null;
  tool_results: ToolResult[];
  cancel_requested: boolean;
  last_error: string | null;
  started_at: string;
  last_heartbeat_at: string | null;
  completed_at: string | null;
};

type BatchLogRow = {
  id: string;
  ts: string;
  level: string;
  tool: string | null;
  message: string;
};

type Baseline = {
  tool: string;
  claude_score: number | null;
  gpt_score: number | null;
  avg_score: number | null;
  captured_at: string;
};

const SELECT_COLS =
  "id, tool, status, batch_size, run_number, checks_passed, checks_failed, checks_total, score_overall, gpt_score_overall, cross_review_complete, error, started_at, last_heartbeat_at, completed_at, progress_log";

const CHILD_TERMINAL = new Set([
  "complete", "completed", "done", "error", "failed", "cancelled", "canceled",
]);
const isChildTerminal = (s: string) => CHILD_TERMINAL.has(s?.toLowerCase?.() ?? "");
const BATCH_TERMINAL = new Set(["complete", "failed", "cancelled"]);
const isBatchTerminal = (s: string) => BATCH_TERMINAL.has(s?.toLowerCase?.() ?? "");

function levelVariant(level?: string): "default" | "secondary" | "destructive" | "outline" {
  switch ((level ?? "").toLowerCase()) {
    case "error":
    case "fatal":
      return "destructive";
    case "warn":
    case "warning":
      return "outline";
    case "info":
      return "secondary";
    default:
      return "secondary";
  }
}

function finalStatusVariant(s: string): "default" | "secondary" | "destructive" | "outline" {
  const v = s.toLowerCase();
  if (v === "complete" || v === "completed") return "default";
  if (v === "error" || v === "failed" || v === "dispatch_failed") return "destructive";
  if (v === "stalled") return "outline";
  if (v === "cancelled" || v === "canceled") return "outline";
  return "secondary";
}

// Legacy child-run drill-down log panel (kept for Recent runs card).
function LogPanel({ entries }: { entries: LogEntry[] | null }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (ref.current) ref.current.scrollTop = ref.current.scrollHeight;
  }, [entries?.length]);
  if (!entries || entries.length === 0) {
    return <div className="text-xs text-muted-foreground italic">No log entries yet.</div>;
  }
  return (
    <div
      ref={ref}
      className="max-h-64 overflow-y-auto rounded border bg-muted/30 p-2 space-y-1 font-mono text-[11px]"
    >
      {entries.map((e, i) => (
        <div key={i} className="flex items-start gap-2">
          <span className="text-muted-foreground shrink-0">
            {e.t ? new Date(e.t).toLocaleTimeString() : "—"}
          </span>
          <Badge variant={levelVariant(e.level)} className="shrink-0 h-4 px-1 text-[9px]">
            {(e.level ?? "log").toUpperCase()}
          </Badge>
          <span className="break-all whitespace-pre-wrap">{e.msg ?? JSON.stringify(e)}</span>
        </div>
      ))}
    </div>
  );
}

export default function QualityBatch() {
  // Panel A state
  const [selected, setSelected] = useState<Set<string>>(new Set(TOOLS));
  const [batchSize, setBatchSize] = useState<number>(5);
  const [starting, setStarting] = useState(false);
  const [stopping, setStopping] = useState(false);

  // Active batch state
  const [activeBatch, setActiveBatch] = useState<BatchRow | null>(null);
  const [batchLogs, setBatchLogs] = useState<BatchLogRow[]>([]);

  // Panel C state
  const [recentBatches, setRecentBatches] = useState<BatchRow[]>([]);
  const [baselines, setBaselines] = useState<Map<string, Baseline>>(new Map());
  const [snapshotting, setSnapshotting] = useState(false);

  // Resume + Recent quality_runs card state (unchanged)
  const [resumeId, setResumeId] = useState("");
  const [resumeTool, setResumeTool] = useState<string>("governance");
  const [resuming, setResuming] = useState(false);
  const [runs, setRuns] = useState<QRun[]>([]);
  const [loadingRuns, setLoadingRuns] = useState(false);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  // ─── Reattach on mount: adopt latest running batch if any ────────────────
  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("quality_batch_runs")
        .select("*")
        .order("started_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (data) setActiveBatch(data as unknown as BatchRow);
    })();
  }, []);

  // ─── Poll active batch + its logs every 10s ──────────────────────────────
  const [logRefreshTick, setLogRefreshTick] = useState(0);
  const [logRefreshing, setLogRefreshing] = useState(false);
  const [logLastRefreshedAt, setLogLastRefreshedAt] = useState<string | null>(null);

  async function loadBatchLogs(batchRow: BatchRow) {
    const [{ data: batch }, { data: log }] = await Promise.all([
      supabase.from("quality_batch_runs").select("*").eq("id", batchRow.id).maybeSingle(),
      supabase.from("quality_batch_log")
        .select("*").eq("run_id", batchRow.id).order("ts", { ascending: true }).limit(500),
    ]);
    const currentBatch = (batch as unknown as BatchRow | null) ?? batchRow;
    if (batch) setActiveBatch(currentBatch);

    const parentLogs = ((log as unknown as BatchLogRow[] | null) ?? []);
    const childIds = Array.from(new Set(
      (Array.isArray(currentBatch.tool_results) ? currentBatch.tool_results : [])
        .map((r) => r?.quality_run_id)
        .filter((id): id is string => typeof id === "string" && id.length > 0),
    ));

    let childLogs: BatchLogRow[] = [];
    if (childIds.length > 0) {
      const { data: children } = await supabase
        .from("quality_runs")
        .select("id, tool, status, run_number, started_at, last_heartbeat_at, completed_at, score_overall, gpt_score_overall, error, progress_log")
        .in("id", childIds);

      childLogs = ((children as any[]) ?? []).flatMap((child) => {
        const entries = Array.isArray(child.progress_log) ? child.progress_log : [];
        const progressEntries: BatchLogRow[] = entries.map((entry: LogEntry, index: number) => ({
          id: `child-${child.id}-${index}`,
          ts: String(entry.t ?? child.started_at ?? new Date().toISOString()),
          level: String(entry.level ?? "info"),
          tool: child.tool ?? null,
          message: String(entry.msg ?? JSON.stringify(entry)),
        }));

        const terminal = child.completed_at ? [{
          id: `child-${child.id}-terminal`,
          ts: child.completed_at,
          level: child.status === "complete" ? "info" : "warn",
          tool: child.tool ?? null,
          message: `Child run #${child.run_number ?? "?"} ${child.status}${child.score_overall != null ? ` · score=${child.score_overall}` : ""}${child.gpt_score_overall != null ? ` · gpt=${child.gpt_score_overall}` : ""}${child.error ? ` · ${child.error}` : ""}`,
        } as BatchLogRow] : [];

        return [...progressEntries, ...terminal];
      });
    }

    const merged = [...parentLogs, ...childLogs]
      .sort((a, b) => new Date(a.ts).getTime() - new Date(b.ts).getTime())
      .slice(-500);
    setBatchLogs(merged);
    return currentBatch;
  }

  async function loadLatestBatchLogs() {
    const { data } = await supabase
      .from("quality_batch_runs")
      .select("*")
      .order("started_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!data) {
      setBatchLogs([]);
      return null;
    }
    return await loadBatchLogs(data as unknown as BatchRow);
  }

  useEffect(() => {
    if (!activeBatch) return;
    let cancelled = false;
    const load = async () => {
      await loadBatchLogs(activeBatch);
      if (cancelled) return;
      setLogLastRefreshedAt(new Date().toISOString());
    };
    load();
    const t = setInterval(() => {
      // Stop polling once terminal; still allow one final refresh.
      if (activeBatch && isBatchTerminal(activeBatch.status)) return;
      load();
    }, 10_000);
    return () => { cancelled = true; clearInterval(t); };
  }, [activeBatch?.id, activeBatch?.status, logRefreshTick]);

  const refreshLog = async () => {
    setLogRefreshing(true);
    try {
      const latest = await loadLatestBatchLogs();
      if (latest && !isBatchTerminal(latest.status)) {
        await supabase.functions.invoke("quality-batch-orchestrator", {
          body: { action: "kick", run_id: latest.id },
        });
        await new Promise((resolve) => window.setTimeout(resolve, 1000));
        await loadBatchLogs(latest);
      }
      await refreshRuns();
      setLogRefreshTick((n) => n + 1);
      setLogLastRefreshedAt(new Date().toISOString());
    } catch (e: any) {
      toast.error(`Log refresh failed: ${e?.message ?? String(e)}`);
    } finally {
      setLogRefreshing(false);
    }
  };

  // ─── Recent batches + baselines for the score matrix ─────────────────────
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const [{ data: rows }, { data: base }] = await Promise.all([
        supabase.from("quality_batch_runs")
          .select("*").order("started_at", { ascending: false }).limit(10),
        supabase.from("quality_batch_baselines").select("*"),
      ]);
      if (cancelled) return;
      if (rows) setRecentBatches(rows as unknown as BatchRow[]);
      if (base) {
        const m = new Map<string, Baseline>();
        for (const b of (base as unknown as Baseline[])) m.set(b.tool, b);
        setBaselines(m);
      }
    };
    load();
    const t = setInterval(load, 15_000);
    return () => { cancelled = true; clearInterval(t); };
  }, []);

  // ─── Recent child quality_runs (bottom drill-down card) ──────────────────
  async function refreshRuns() {
    setLoadingRuns(true);
    const { data, error } = await supabase
      .from("quality_runs")
      .select(SELECT_COLS)
      .order("started_at", { ascending: false })
      .limit(30);
    setLoadingRuns(false);
    if (error) { toast.error(`Load failed: ${error.message}`); return; }
    setRuns((data as any) ?? []);
  }
  const anyChildActive = useMemo(
    () => runs.some((r) => !isChildTerminal(r.status)),
    [runs],
  );
  useEffect(() => { refreshRuns(); }, []);
  useEffect(() => {
    if (!anyChildActive && expanded.size === 0) return;
    const t = setInterval(refreshRuns, 10_000);
    return () => clearInterval(t);
  }, [anyChildActive, expanded.size]);

  const isBatchRunning = !!activeBatch && !isBatchTerminal(activeBatch.status);

  function toggleTool(t: string, checked: boolean) {
    setSelected((prev) => {
      const n = new Set(prev);
      if (checked) n.add(t); else n.delete(t);
      return n;
    });
  }

  async function onStart() {
    const tools = TOOLS.filter((t) => selected.has(t));
    if (tools.length === 0) { toast.error("Select at least one tool"); return; }
    setStarting(true);
    try {
      const { data, error } = await supabase.functions.invoke("quality-batch-orchestrator", {
        body: { action: "start", tools, batch_size: batchSize },
      });
      if (error) throw error;
      const runId = (data as any)?.run_id;
      if (!runId) throw new Error("orchestrator returned no run_id");
      const { data: row } = await supabase.from("quality_batch_runs")
        .select("*").eq("id", runId).maybeSingle();
      setActiveBatch(row as unknown as BatchRow);
      setBatchLogs([]);
      toast.success("Batch started");
    } catch (e: any) {
      const msg = e?.context?.body ?? e?.message ?? String(e);
      toast.error(`Start failed: ${typeof msg === "string" ? msg : JSON.stringify(msg)}`);
    } finally {
      setStarting(false);
    }
  }

  async function onStop() {
    if (!activeBatch) return;
    setStopping(true);
    try {
      const { error } = await supabase.functions.invoke("quality-batch-orchestrator", {
        body: { action: "cancel", run_id: activeBatch.id },
      });
      if (error) throw error;
      toast.success("Stop requested — batch and in-flight tool will terminate");
    } catch (e: any) {
      toast.error(`Stop failed: ${e?.message ?? e}`);
    } finally {
      setStopping(false);
    }
  }

  async function onResumeChildRun() {
    if (!resumeId.trim()) { toast.error("resume_run_id required"); return; }
    setResuming(true);
    try {
      const { data, error } = await supabase.functions.invoke("run-quality-batch", {
        body: { tool: resumeTool, resume_run_id: resumeId.trim() },
      });
      if (error) throw error;
      const d = (data as any) ?? {};
      toast.success(`Resumed: run ${d.run_number ?? "?"} · ${d.run_id ?? "ok"}`);
      setResumeId("");
      refreshRuns();
    } catch (e: any) {
      const msg = e?.context?.body ?? e?.message ?? String(e);
      toast.error(`Resume failed: ${typeof msg === "string" ? msg : JSON.stringify(msg)}`);
    } finally {
      setResuming(false);
    }
  }

  function toggleExpand(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  // ─── Derived: current tool + per-tool chips for active batch ─────────────
  const activeToolResults: ToolResult[] = Array.isArray(activeBatch?.tool_results)
    ? (activeBatch!.tool_results as ToolResult[])
    : [];
  const currentTool = activeBatch && isBatchRunning
    ? (activeBatch.tools[activeBatch.current_tool_index] ?? null)
    : null;
  const doneCount = activeToolResults.length;
  const totalCount = activeBatch?.tools.length ?? 0;

  // ─── Score matrix data ───────────────────────────────────────────────────
  const matrixColumns = useMemo(() => {
    // Oldest → newest
    return [...recentBatches].sort((a, b) => (a.started_at < b.started_at ? -1 : 1));
  }, [recentBatches]);

  const testsCount = useMemo(() => {
    const m = new Map<string, number>();
    for (const t of TOOLS) m.set(t, 0);
    for (const b of recentBatches) {
      const results: ToolResult[] = Array.isArray(b.tool_results) ? (b.tool_results as unknown as ToolResult[]) : [];
      for (const r of results) m.set(r.tool, (m.get(r.tool) ?? 0) + 1);
    }
    return m;
  }, [recentBatches]);

  async function onResnapshotBaseline() {
    if (!window.confirm("Replace baseline with the average of ALL stored batch results (unbounded)?")) return;
    setSnapshotting(true);
    try {
      // QB-P3 correction: aggregate over ALL quality_batch_runs.tool_results,
      // not just the last-10 the score matrix keeps in state.
      const { data: allBatches, error: fetchErr } = await supabase
        .from("quality_batch_runs")
        .select("tool_results");
      if (fetchErr) throw fetchErr;
      const perTool = new Map<string, { claudeSum: number; claudeN: number; gptSum: number; gptN: number }>();
      for (const b of (allBatches ?? [])) {
        const results: ToolResult[] = Array.isArray(b.tool_results) ? (b.tool_results as unknown as ToolResult[]) : [];
        for (const r of results) {
          if (r.final_status !== "complete") continue;
          const e = perTool.get(r.tool) ?? { claudeSum: 0, claudeN: 0, gptSum: 0, gptN: 0 };
          if (typeof r.score_overall === "number") { e.claudeSum += r.score_overall; e.claudeN += 1; }
          if (typeof r.gpt_score_overall === "number") { e.gptSum += r.gpt_score_overall; e.gptN += 1; }
          perTool.set(r.tool, e);
        }
      }
      const rows = Array.from(perTool.entries()).map(([tool, v]) => {
        const claude = v.claudeN ? v.claudeSum / v.claudeN : null;
        const gpt = v.gptN ? v.gptSum / v.gptN : null;
        const parts: number[] = [];
        if (claude != null) parts.push(claude);
        if (gpt != null) parts.push(gpt);
        const avg = parts.length ? parts.reduce((a, b) => a + b, 0) / parts.length : null;
        return { tool, claude_score: claude, gpt_score: gpt, avg_score: avg, captured_at: new Date().toISOString() };
      });
      if (rows.length === 0) { toast.message("No complete results to snapshot."); return; }
      const { error } = await supabase.from("quality_batch_baselines")
        .upsert(rows, { onConflict: "tool" });
      if (error) throw error;
      const m = new Map<string, Baseline>();
      for (const r of rows) m.set(r.tool, r as Baseline);
      setBaselines(m);
      toast.success(`Baseline re-snapshotted across ${allBatches?.length ?? 0} batches.`);
    } catch (e: any) {
      toast.error(`Snapshot failed: ${e?.message ?? e}`);
    } finally {
      setSnapshotting(false);
    }
  }

  // ─── QB-P3: PDF zip export (per batch) ───────────────────────────────────
  async function onDownloadBatchZip(batch: BatchRow) {
    const toolResults: ToolResult[] = Array.isArray(batch.tool_results)
      ? (batch.tool_results as unknown as ToolResult[]) : [];
    const completed = toolResults.filter((r) => r.final_status === "complete" && r.quality_run_id);
    if (completed.length === 0) { toast.error("No complete tools in this batch."); return; }

    const tid = toast.loading(`Preparing PDFs for batch ${batch.id.slice(0, 8)}…`);
    try {
      const zip = new JSZip();
      let ok = 0, failed = 0, docTotal = 0;
      for (const tr of completed) {
        const toolType = SLUG_TO_TOOL_TYPE[tr.tool];
        if (!toolType) { failed += 1; continue; }
        const { data: docs, error: docErr } = await supabase
          .from("quality_run_documents")
          .select("id, doc_number, source_row_id, status")
          .eq("run_id", tr.quality_run_id!)
          .eq("status", "complete")
          .not("source_row_id", "is", null)
          .order("doc_number", { ascending: true });
        if (docErr || !docs) { failed += 1; continue; }
        for (const d of docs) {
          docTotal += 1;
          toast.loading(`Rendering ${tr.tool} #${d.doc_number} (${ok + failed + 1}/${completed.length}+)…`, { id: tid });
          try {
            const { data: pdfResp, error: pdfErr } = await supabase.functions.invoke("generate-report-pdf", {
              body: { tool_type: toolType, assessment_id: d.source_row_id },
            });
            if (pdfErr) throw pdfErr;
            const url = (pdfResp as any)?.pdf_url as string | undefined;
            if (!url) throw new Error("no pdf_url");
            const res = await fetch(url);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const blob = await res.blob();
            const shortRow = (d.source_row_id ?? "row").slice(0, 8);
            zip.file(`${tr.tool}/${String(d.doc_number).padStart(2, "0")}-${shortRow}.pdf`, blob);
            ok += 1;
          } catch (e) {
            console.error("pdf fetch failed", tr.tool, d.source_row_id, e);
            failed += 1;
          }
        }
      }
      if (ok === 0) {
        toast.error(`Zip aborted — 0 of ${docTotal} PDFs rendered.`, { id: tid });
        return;
      }
      const blob = await zip.generateAsync({ type: "blob" });
      const stamp = new Date().toISOString().slice(0, 10);
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `quality-batch-${batch.id.slice(0, 8)}-${stamp}.zip`;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 0);
      toast.success(`Zipped ${ok} PDF${ok === 1 ? "" : "s"}${failed ? ` · ${failed} failed` : ""}.`, { id: tid });
    } catch (e: any) {
      toast.error(`Zip failed: ${e?.message ?? e}`, { id: tid });
    }
  }

  // ─── QB-P3: markdown analysis export (per batch) ─────────────────────────
  async function onExportBatchMarkdown(batch: BatchRow) {
    const tid = toast.loading(`Building analysis for batch ${batch.id.slice(0, 8)}…`);
    try {
      const toolResults: ToolResult[] = Array.isArray(batch.tool_results)
        ? (batch.tool_results as unknown as ToolResult[]) : [];
      const lines: string[] = [];
      lines.push(`# Quality Batch Analysis — ${batch.id}`);
      lines.push("");
      lines.push(`- Started: ${batch.started_at}`);
      lines.push(`- Completed: ${batch.completed_at ?? "—"}`);
      lines.push(`- Status: ${batch.status}  ·  Phase: ${batch.phase}`);
      lines.push(`- Batch size: ${batch.batch_size}`);
      lines.push(`- Tools (${batch.tools.length}): ${batch.tools.join(", ")}`);
      lines.push("");
      lines.push("## Per-tool summary");
      lines.push("");
      lines.push("| Tool | final_status | score_overall | gpt_score_overall | error |");
      lines.push("| --- | --- | --- | --- | --- |");
      for (const tr of toolResults) {
        lines.push(
          `| ${tr.tool} | ${tr.final_status} | ${tr.score_overall ?? "—"} | ${tr.gpt_score_overall ?? "—"} | ${tr.error ? tr.error.replace(/\|/g, "\\|").slice(0, 200) : ""} |`,
        );
      }
      lines.push("");

      for (const tr of toolResults) {
        if (!tr.quality_run_id) continue;
        lines.push(`## ${tr.tool}  ·  run \`${tr.quality_run_id}\``);
        lines.push("");
        const { data: docs } = await supabase
          .from("quality_run_documents")
          .select("doc_number, overall_score, gpt_overall_score, cross_review_status, source_row_id, status")
          .eq("run_id", tr.quality_run_id)
          .order("doc_number", { ascending: true });
        lines.push("### Documents");
        lines.push("");
        lines.push("| # | status | overall_score | gpt_overall_score | cross_review_status | source_row_id |");
        lines.push("| --- | --- | --- | --- | --- | --- |");
        const disagreements: string[] = [];
        for (const d of (docs ?? [])) {
          lines.push(`| ${d.doc_number} | ${d.status} | ${d.overall_score ?? "—"} | ${d.gpt_overall_score ?? "—"} | ${d.cross_review_status ?? "—"} | ${d.source_row_id ?? "—"} |`);
          const c = d.overall_score, g = d.gpt_overall_score;
          if (typeof c === "number" && typeof g === "number" && Math.abs(c - g) > 10) {
            disagreements.push(`- doc #${d.doc_number}: claude=${c}, gpt=${g}, |Δ|=${Math.abs(c - g).toFixed(1)}`);
          }
          if (d.cross_review_status && /disagree|conflict|divergent/i.test(d.cross_review_status)) {
            disagreements.push(`- doc #${d.doc_number}: cross_review_status="${d.cross_review_status}"`);
          }
        }
        lines.push("");
        if (disagreements.length) {
          lines.push("### Cross-model disagreements (>10 pt or status)");
          lines.push("");
          for (const s of disagreements) lines.push(s);
          lines.push("");
        }

        const { data: findings } = await supabase
          .from("quality_findings")
          .select("check_id, check_type, dimension, severity, evidence, doc_id, passed")
          .eq("run_id", tr.quality_run_id)
          .eq("passed", false)
          .order("dimension", { ascending: true });
        lines.push("### Failed findings (grouped by dimension)");
        lines.push("");
        const byDim = new Map<string, typeof findings>();
        for (const f of (findings ?? [])) {
          const arr = byDim.get(f.dimension) ?? ([] as any);
          (arr as any[]).push(f);
          byDim.set(f.dimension, arr as any);
        }
        if (byDim.size === 0) {
          lines.push("_No failed findings._");
          lines.push("");
        } else {
          for (const [dim, arr] of byDim.entries()) {
            lines.push(`#### ${dim}  (${(arr as any[]).length})`);
            lines.push("");
            for (const f of arr as any[]) {
              const ev = (f.evidence ?? "").toString().replace(/\s+/g, " ").slice(0, 400);
              lines.push(`- **[${f.severity}] ${f.check_id}** _(${f.check_type})_ — ${ev}`);
            }
            lines.push("");
          }
        }
      }

      lines.push("---");
      lines.push("");
      lines.push("_Generated for prompt-improvement analysis — paste to Claude._");
      const md = lines.join("\n");
      const blob = new Blob([md], { type: "text/markdown;charset=utf-8" });
      const stamp = new Date().toISOString().slice(0, 10);
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `quality-batch-${batch.id.slice(0, 8)}-${stamp}.md`;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 0);
      toast.success("Analysis .md ready.", { id: tid });
    } catch (e: any) {
      toast.error(`Export failed: ${e?.message ?? e}`, { id: tid });
    }
  }


  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      <div className="flex items-baseline justify-between">
        <h1 className="text-3xl font-serif text-foreground">Quality Batch</h1>
        <span className="text-xs text-muted-foreground font-mono">quality-batch-orchestrator</span>
      </div>

      {/* Panel A — Run */}
      <Card>
        <CardHeader><CardTitle>Run</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Tools (dispatched sequentially by the orchestrator)</Label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-2">
              {TOOLS.map((t) => (
                <label key={t} className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={selected.has(t)}
                    onCheckedChange={(v) => toggleTool(t, v === true)}
                    disabled={isBatchRunning}
                  />
                  <span className="font-mono text-xs">{t}</span>
                </label>
              ))}
            </div>
            <div className="flex gap-2 mt-2 text-xs">
              <button
                type="button"
                className="text-brand-teal-text underline hover:no-underline disabled:opacity-40"
                disabled={isBatchRunning}
                onClick={() => setSelected(new Set(TOOLS))}
              >Select all</button>
              <button
                type="button"
                className="text-brand-teal-text underline hover:no-underline disabled:opacity-40"
                disabled={isBatchRunning}
                onClick={() => setSelected(new Set())}
              >Clear</button>
              <span className="text-muted-foreground ml-auto">{selected.size} selected</span>
            </div>
          </div>

          <div>
            <Label>Batch size (applied to every selected tool)</Label>
            <Input
              type="number"
              min={1}
              max={50}
              value={batchSize}
              disabled={isBatchRunning}
              onChange={(e) => setBatchSize(Math.max(1, Math.min(50, Number(e.target.value) || 1)))}
            />
          </div>

          <div className="flex flex-wrap gap-2 items-center">
            <Button onClick={onStart} disabled={starting || isBatchRunning || selected.size === 0}>
              {starting ? "Starting…" : `Start (${selected.size})`}
            </Button>
            {isBatchRunning && (
              <Button variant="destructive" onClick={onStop} disabled={stopping}>
                {stopping ? "Stopping…" : "Stop batch"}
              </Button>
            )}
            {activeBatch && (
              <>
                <div className="text-sm text-muted-foreground">
                  Run <code>{activeBatch.id.slice(0, 8)}</code> · <Badge variant="outline">{activeBatch.status}</Badge>
                  {" · "}phase <code>{activeBatch.phase}</code>
                  {" · "}<span className="font-mono">{currentTool ?? "—"}</span>
                  {" · "}{doneCount}/{totalCount} tools
                  {activeBatch.last_heartbeat_at && (
                    <> {" · "}heartbeat {new Date(activeBatch.last_heartbeat_at).toLocaleTimeString()}</>
                  )}
                </div>
                <Button size="sm" variant="outline"
                  disabled={isBatchRunning}
                  onClick={() => onDownloadBatchZip(activeBatch)}
                  title={isBatchRunning ? "Finish batch first" : "Zip all completed-tool PDFs"}
                >Download PDFs (zip)</Button>
                <Button size="sm" variant="outline" onClick={() => onExportBatchMarkdown(activeBatch)}>
                  Export analysis (.md)
                </Button>
              </>
            )}
          </div>
          {activeBatch?.last_error && (
            <div className="text-xs text-destructive break-all">{activeBatch.last_error}</div>
          )}

          {activeBatch && activeBatch.tools.length > 0 && (
            <div className="border rounded p-3 text-xs">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                {activeBatch.tools.map((t, i) => {
                  const done = activeToolResults[i];
                  const isCurrent = i === activeBatch.current_tool_index && isBatchRunning && !done;
                  return (
                    <div key={t} className="flex items-center gap-2 flex-wrap">
                      {done ? (
                        <Badge variant={finalStatusVariant(done.final_status)} className="h-4 text-[10px]">
                          {done.final_status}
                        </Badge>
                      ) : isCurrent ? (
                        <Badge variant="secondary" className="h-4 text-[10px]">running</Badge>
                      ) : (
                        <Badge variant="outline" className="h-4 text-[10px]">pending</Badge>
                      )}
                      <span className="font-mono">{t}</span>
                      {done?.run_number != null && (
                        <span className="text-muted-foreground">#{done.run_number}</span>
                      )}
                      {done && done.final_status === "complete" && (
                        <span className="text-muted-foreground font-mono">
                          {done.score_overall?.toFixed?.(1) ?? "—"} / {done.gpt_score_overall?.toFixed?.(1) ?? "—"}
                        </span>
                      )}
                      {done?.error && (
                        <span className="text-destructive break-all">{done.error}</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Resume existing child run — unchanged from prior page */}
          <div className="pt-2 border-t space-y-2">
            <Label>Resume existing run (single child quality_runs row)</Label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
              <div className="md:col-span-2">
                <Input
                  value={resumeId}
                  onChange={(e) => setResumeId(e.target.value)}
                  placeholder="quality_runs.id (UUID)"
                />
              </div>
              <select
                value={resumeTool}
                onChange={(e) => setResumeTool(e.target.value)}
                className="h-10 rounded border bg-background px-2 text-sm"
              >
                {TOOLS.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <Button variant="secondary" onClick={onResumeChildRun} disabled={resuming}>
              {resuming ? "…" : "Resume"}
            </Button>
            <p className="text-xs text-muted-foreground">
              Sends {"{ tool, resume_run_id }"} to run-quality-batch. Tool must match the row.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* QB-P9 — Campaign controls (minimal). Pause/Resume/Kill only. */}
      <CampaignControls />

      {/* Launch-gate scoreboard (Option-A findings-based) */}
      <LaunchGateScoreboard tools={TOOLS} />

      {/* Panel B — Live log */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>
            Live log
            {activeBatch && (
              <span className="text-xs text-muted-foreground ml-2 font-mono">
                batch {activeBatch.id.slice(0, 8)}
              </span>
            )}
          </CardTitle>
          <div className="flex items-center gap-2">
            {logLastRefreshedAt && (
              <span className="text-xs text-muted-foreground font-mono">
                {new Date(logLastRefreshedAt).toLocaleTimeString()}
              </span>
            )}
            <Button variant="ghost" size="sm" onClick={refreshLog} disabled={logRefreshing}>
              {logRefreshing ? "…" : "Refresh"}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <BatchLogView entries={batchLogs} />
        </CardContent>
      </Card>

      {/* Panel C — Tools × Batches score matrix */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Tools & batch scores</CardTitle>
          <Button size="sm" variant="outline" disabled={snapshotting} onClick={onResnapshotBaseline}>
            {snapshotting ? "Snapshotting…" : "Re-snapshot baseline"}
          </Button>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left">
                  <th className="py-2 pr-3">Tool</th>
                  <th className="py-2 pr-3">Tests (last 10)</th>
                  <th className="py-2 pr-3 bg-muted/40">Baseline</th>
                  {matrixColumns.map((b, i) => (
                    <th
                      key={b.id}
                      className="py-2 pr-3 whitespace-nowrap"
                      title={`${b.id} · ${new Date(b.started_at).toLocaleString()}`}
                    >
                      Batch {i + 1}
                      <div className="text-[10px] font-normal text-muted-foreground">
                        {new Date(b.started_at).toLocaleDateString()}
                      </div>
                      <div className="flex gap-1 mt-1">
                        <button
                          type="button"
                          className="text-[10px] underline text-brand-teal-text hover:no-underline"
                          onClick={() => onDownloadBatchZip(b)}
                          title="Download PDFs (zip)"
                        >zip</button>
                        <button
                          type="button"
                          className="text-[10px] underline text-brand-teal-text hover:no-underline"
                          onClick={() => onExportBatchMarkdown(b)}
                          title="Export analysis (.md)"
                        >md</button>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {TOOLS.map((tool) => {
                  const baseline = baselines.get(tool);
                  const baseAvg = baseline?.avg_score != null ? Number(baseline.avg_score) : null;
                  return (
                    <tr key={tool} className="border-b align-top">
                      <td className="py-2 pr-3 font-mono">{tool}</td>
                      <td className="py-2 pr-3">{testsCount.get(tool) ?? 0}</td>
                      <td
                        className="py-2 pr-3 bg-muted/40 font-mono"
                        title={baseline
                          ? `claude ${baseline.claude_score ?? "—"} · gpt ${baseline.gpt_score ?? "—"}`
                          : undefined}
                      >
                        {baseAvg == null ? "—" : baseAvg.toFixed(1)}
                      </td>
                      {matrixColumns.map((b) => {
                        const results: ToolResult[] = Array.isArray(b.tool_results)
                          ? (b.tool_results as unknown as ToolResult[]) : [];
                        const entry = results.find((r) => r.tool === tool);
                        if (!entry) {
                          return <td key={b.id} className="py-2 pr-3 text-muted-foreground">—</td>;
                        }
                        if (entry.final_status !== "complete") {
                          return (
                            <td key={b.id} className="py-2 pr-3">
                              <Badge variant={finalStatusVariant(entry.final_status)} className="h-4 text-[10px]">
                                {entry.final_status}
                              </Badge>
                            </td>
                          );
                        }
                        const c = entry.score_overall;
                        const g = entry.gpt_score_overall;
                        const parts: number[] = [];
                        if (typeof c === "number") parts.push(c);
                        if (typeof g === "number") parts.push(g);
                        const avg = parts.length ? parts.reduce((a, b) => a + b, 0) / parts.length : null;
                        const delta = avg != null && baseAvg != null ? avg - baseAvg : null;
                        const color = delta == null ? "" :
                          delta > 0.05 ? "text-emerald-600" :
                          delta < -0.05 ? "text-destructive" : "text-muted-foreground";
                        return (
                          <td key={b.id} className="py-2 pr-3 font-mono whitespace-nowrap">
                            {c?.toFixed?.(1) ?? "—"} / {g?.toFixed?.(1) ?? "—"}
                            {delta != null && (
                              <span className={`ml-1 text-[10px] ${color}`}>
                                {delta >= 0 ? "+" : ""}{delta.toFixed(1)}
                              </span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Recent child runs (unchanged drill-down) */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Recent runs</CardTitle>
          <Button variant="ghost" size="sm" onClick={refreshRuns} disabled={loadingRuns}>
            {loadingRuns ? "…" : "Refresh"}
          </Button>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            {runs.length === 0 && (
              <p className="text-muted-foreground">No runs yet.</p>
            )}
            {runs.map((r) => {
              const open = expanded.has(r.id);
              return (
                <div key={r.id} className="border rounded p-3 space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="outline">{r.tool ?? "—"}</Badge>
                    <Badge
                      variant={
                        r.status === "complete" || r.status === "completed"
                          ? "default"
                          : r.status === "error" || r.status === "failed"
                          ? "destructive"
                          : "secondary"
                      }
                    >
                      {r.status}
                    </Badge>
                    <span className="font-mono text-xs">run #{r.run_number ?? "?"}</span>
                    <span className="font-mono text-xs text-muted-foreground">
                      batch={r.batch_size ?? "?"}
                    </span>
                    <span className="font-mono text-xs text-muted-foreground">
                      {r.id.slice(0, 8)}
                    </span>
                    <span className="text-xs text-muted-foreground ml-auto">
                      {new Date(r.started_at).toLocaleString()}
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    checks: {r.checks_passed ?? "?"}/{r.checks_total ?? "?"} pass
                    {" · "}failed: {r.checks_failed ?? "?"}
                    {" · "}score: {r.score_overall?.toFixed?.(3) ?? "—"}
                    {" · "}gpt: {r.gpt_score_overall?.toFixed?.(3) ?? "—"}
                    {" · "}cross-review: {r.cross_review_complete ? "yes" : "no"}
                    {r.completed_at && (
                      <> {" · "}completed {new Date(r.completed_at).toLocaleString()}</>
                    )}
                  </div>
                  {r.error && (
                    <div className="text-xs text-destructive break-all">error: {r.error}</div>
                  )}
                  <div>
                    <button
                      type="button"
                      onClick={() => toggleExpand(r.id)}
                      className="text-xs text-brand-teal-text underline hover:no-underline"
                    >
                      {open ? "Hide log" : `Show log (${r.progress_log?.length ?? 0})`}
                    </button>
                  </div>
                  {open && (
                    <div className="pt-2">
                      <LogPanel entries={r.progress_log} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function BatchLogView({ entries }: { entries: BatchLogRow[] }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (ref.current) ref.current.scrollTop = ref.current.scrollHeight;
  }, [entries.length]);
  return (
    <div
      ref={ref}
      className="font-mono text-xs max-h-[28rem] overflow-y-auto border rounded p-3 bg-muted/30"
    >
      {entries.length === 0 && (
        <div className="text-muted-foreground">No log entries.</div>
      )}
      {entries.map((l) => (
        <div
          key={l.id}
          className={
            l.level === "error" ? "text-destructive" :
            l.level === "warn" ? "text-yellow-600" : ""
          }
        >
          {new Date(l.ts).toLocaleTimeString()} · {l.level} · {l.tool ?? "—"} · {l.message}
        </div>
      ))}
    </div>
  );
}

// ─── QB-P9 CampaignControls ───────────────────────────────────────────────
// Minimal pause/resume/kill control for the single active campaign row.
// Reuses existing Button/Card styling; no new tokens.
function CampaignControls() {
  const [row, setRow] = useState<any | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const load = async () => {
    const { data, error } = await supabase
      .from("quality_campaigns")
      .select("id, status, wave_number, wave_interval_minutes, concurrency, spend_cents_estimate, budget_cap_cents, tool_state")
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();
    if (error) setErr(error.message);
    else setRow(data);
  };

  useEffect(() => { load(); const t = setInterval(load, 15_000); return () => clearInterval(t); }, []);

  const call = async (action: "campaign_pause" | "campaign_resume" | "campaign_kill") => {
    if (!row?.id) return;
    setBusy(true); setErr(null);
    try {
      const { error } = await supabase.functions.invoke("quality-batch-orchestrator", {
        body: { action, campaign_id: row.id },
      });
      if (error) throw error;
      await load();
    } catch (e: any) {
      setErr(e?.message ?? String(e));
    } finally {
      setBusy(false);
    }
  };

  if (!row) {
    return (
      <Card>
        <CardHeader><CardTitle>Campaign</CardTitle></CardHeader>
        <CardContent className="text-xs text-muted-foreground">
          {err ? `Error: ${err}` : "No campaign row present."}
        </CardContent>
      </Card>
    );
  }

  const spendUsd = ((row.estimated_spend_cents ?? 0) / 100).toFixed(2);
  const capUsd = ((row.budget_cap_cents ?? 0) / 100).toFixed(2);
  const toolState = (row.tool_state ?? {}) as Record<string, any>;
  const activeTools = Object.entries(toolState).filter(([, s]: any) => s?.active).map(([t]) => t);
  const retired = Object.entries(toolState).filter(([, s]: any) => !s?.active).map(([t, s]: any) => `${t}(${s?.retired_reason ?? "-"})`);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>
          Campaign <span className="text-xs text-muted-foreground font-normal">· status {row.status} · wave {row.wave_number ?? 0}</span>
        </CardTitle>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="secondary" disabled={busy || row.status !== "paused"} onClick={() => call("campaign_resume")}>Resume</Button>
          <Button size="sm" variant="outline" disabled={busy || row.status !== "active"} onClick={() => call("campaign_pause")}>Pause</Button>
          <Button size="sm" variant="destructive" disabled={busy || row.status === "complete" || row.status === "killed"} onClick={() => call("campaign_kill")}>Kill</Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-2 text-xs">
        {err && <div className="text-destructive">{err}</div>}
        <div className="flex flex-wrap gap-4 text-muted-foreground">
          <span>interval {row.wave_interval_minutes}m</span>
          <span>concurrency {row.concurrency}</span>
          <span>spend est ${spendUsd} / cap ${capUsd}</span>
        </div>
        <div className="font-mono break-all">
          <span className="text-muted-foreground">active: </span>{activeTools.join(", ") || "—"}
        </div>
        {retired.length > 0 && (
          <div className="font-mono break-all">
            <span className="text-muted-foreground">retired: </span>{retired.join(", ")}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
