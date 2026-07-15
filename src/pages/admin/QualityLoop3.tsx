// QualityLoop3 — QL3-P2 rebuild. Server-side batch driver
// (ql3-batch-orchestrator). Mirrors QualityBatch.tsx (QB-P2/P3) chrome.
//
// The former client-side queue (pollQl3Terminal, startFullBatch loop,
// QueueItem, cancelRef, batchRunning) is gone — the orchestrator owns
// sequential dispatch, stall detection, and cancellation.

import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import JSZip from "jszip";

const TOOLS = [
  "governance", "cppa-risk", "cppa-cyber", "cppa-admt",
  "dpia", "lia", "ir-playbook", "biometric", "dpa",
];

// quality_run_documents.tool label for each QL3 slug.
const DOC_TOOL_MAP: Record<string, string> = {
  governance: "governance",
  "cppa-risk": "cppa-risk",
  "cppa-cyber": "cppa-cyber",
  "cppa-admt": "cppa-admt",
  dpia: "dpia",
  lia: "lia",
  "ir-playbook": "ir-playbook",
  biometric: "biometric-checker",
  dpa: "dpa-generator",
};

// QL3 slug → generate-report-pdf tool_type. Verified against
// supabase/functions/generate-report-pdf/index.ts tableMap (L1853–1868):
//   li_assessment, governance_assessment, dpia_framework, biometric_checker,
//   ir_playbook, dpa_generator, cppa_cybersecurity, cppa_risk, cppa_admt.
const SLUG_TO_TOOL_TYPE: Record<string, string> = {
  biometric: "biometric_checker",
  dpa: "dpa_generator",
  lia: "li_assessment",
  "cppa-risk": "cppa_risk",
  "cppa-cyber": "cppa_cybersecurity",
  "cppa-admt": "cppa_admt",
  governance: "governance_assessment",
  dpia: "dpia_framework",
  "ir-playbook": "ir_playbook",
};

function fmtRelTime(iso: string): string {
  const d = new Date(iso).getTime();
  const s = Math.round((Date.now() - d) / 1000);
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.round(s / 60)}m ago`;
  if (s < 86400) return `${Math.round(s / 3600)}h ago`;
  return `${Math.round(s / 86400)}d ago`;
}

type Ql3Run = {
  id: string;
  tool_slug: string;
  assessment_id: string | null;
  phase: string;
  pass_number: number;
  pre_score: number | null;
  post_score: number | null;
  pre_claude_score: number | null;
  pre_gpt_score: number | null;
  post_claude_score: number | null;
  post_gpt_score: number | null;
  items_before: number | null;
  items_after: number | null;
  items_resolved: number | null;
  qc_result: any;
  error_message: string | null;
  notes: string | null;
  terminal_at: string | null;
  created_at: string;
};

type BatchRun = { run_id: string; run_number: number | null; completed_at: string | null; doc_count: number };
type DocRow = { id: string; doc_number: number; source_row_id: string };

type Ql3BatchResult = {
  doc_number?: number;
  source_row_id?: string;
  ql3_run_id?: string | null;
  final_phase?: string;
  pre_score?: number | null;
  post_score?: number | null;
  pre_claude_score?: number | null;
  pre_gpt_score?: number | null;
  post_claude_score?: number | null;
  post_gpt_score?: number | null;
  items_before?: number | null;
  items_after?: number | null;
  items_resolved?: number | null;
  incorporation_pass?: boolean | null;
};

type Ql3BatchRow = {
  id: string;
  tool_slug: string;
  source_quality_run_id: string;
  doc_ids: Array<{ doc_number: number; source_row_id: string }>;
  current_index: number;
  current_ql3_run_id: string | null;
  results: Ql3BatchResult[];
  status: string;
  phase: string;
  cancel_requested: boolean;
  last_error: string | null;
  started_at: string | null;
  completed_at: string | null;
};

type Ql3LogRow = {
  id: string;
  ts: string;
  level: string;
  batch_id: string | null;
  ql3_run_id: string | null;
  message: string;
};

const BATCH_TERMINAL = new Set(["complete", "failed", "cancelled"]);
const isBatchTerminal = (s: string) => BATCH_TERMINAL.has(s?.toLowerCase?.() ?? "");

const RUN_COLS = "id, tool_slug, assessment_id, phase, pass_number, pre_score, post_score, pre_claude_score, pre_gpt_score, post_claude_score, post_gpt_score, items_before, items_after, items_resolved, qc_result, error_message, notes, terminal_at, created_at";

function varianceBadge(verdict: string | undefined) {
  switch (verdict) {
    case "improvement":
      return <Badge variant="default" className="h-4 text-[10px] bg-emerald-600 hover:bg-emerald-600">improvement</Badge>;
    case "regression":
      return <Badge variant="destructive" className="h-4 text-[10px]">regression</Badge>;
    case "no_signal":
      return <Badge variant="outline" className="h-4 text-[10px]">no_signal</Badge>;
    case "insufficient_samples":
      return <Badge variant="secondary" className="h-4 text-[10px] opacity-70">insufficient</Badge>;
    default:
      return null;
  }
}

export default function QualityLoop3() {
  const [mode, setMode] = useState<"single" | "full-batch">("single");
  const [tool, setTool] = useState<string>("governance");
  const [assessmentId, setAssessmentId] = useState("");
  const [notes, setNotes] = useState("");
  const [starting, setStarting] = useState(false);
  const [runs, setRuns] = useState<Ql3Run[]>([]);
  const [loading, setLoading] = useState(false);
  const [prefillHint, setPrefillHint] = useState<string | null>(null);

  // Full-batch pickers
  const [batchRuns, setBatchRuns] = useState<BatchRun[]>([]);
  const [selectedBatchRunId, setSelectedBatchRunId] = useState<string>("");
  const [batchDocs, setBatchDocs] = useState<DocRow[]>([]);
  const [batchLoading, setBatchLoading] = useState(false);
  const [docPick, setDocPick] = useState<string>("__all__");

  // Active/last batch
  const [activeBatch, setActiveBatch] = useState<Ql3BatchRow | null>(null);
  const [batchLogs, setBatchLogs] = useState<Ql3LogRow[]>([]);
  const [unattachedLogs, setUnattachedLogs] = useState<Ql3LogRow[]>([]);
  const [stopping, setStopping] = useState(false);

  // Recent runs card
  async function refresh() {
    setLoading(true);
    const { data, error } = await supabase
      .from("quality_loop3_runs")
      .select(RUN_COLS)
      .order("created_at", { ascending: false })
      .limit(30);
    setLoading(false);
    if (error) { toast.error(`Load failed: ${error.message}`); return; }
    setRuns((data as unknown as Ql3Run[]) ?? []);
  }
  useEffect(() => { refresh(); const t = setInterval(refresh, 10_000); return () => clearInterval(t); }, []);

  // Reattach: latest ql3 batch row (adopt if running; else keep for panels).
  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("quality_loop3_batches")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (data) setActiveBatch(data as unknown as Ql3BatchRow);
    })();
  }, []);

  const [logRefreshTick, setLogRefreshTick] = useState(0);
  const [logRefreshing, setLogRefreshing] = useState(false);
  const [logLastRefreshedAt, setLogLastRefreshedAt] = useState<string | null>(null);

  // Poll active batch + logs every 10s.
  useEffect(() => {
    if (!activeBatch) return;
    let cancelled = false;
    const load = async () => {
      const runIds = (activeBatch.results ?? [])
        .map((r) => r.ql3_run_id)
        .filter((x): x is string => !!x);
      if (activeBatch.current_ql3_run_id) runIds.push(activeBatch.current_ql3_run_id);
      const [{ data: batch }, { data: log }] = await Promise.all([
        supabase.from("quality_loop3_batches").select("*").eq("id", activeBatch.id).maybeSingle(),
        runIds.length > 0
          ? supabase.from("quality_loop3_log")
              .select("*")
              .or(`batch_id.eq.${activeBatch.id},ql3_run_id.in.(${runIds.join(",")})`)
              .order("ts", { ascending: true })
              .limit(500)
          : supabase.from("quality_loop3_log")
              .select("*")
              .eq("batch_id", activeBatch.id)
              .order("ts", { ascending: true })
              .limit(500),
      ]);
      if (cancelled) return;
      if (batch) setActiveBatch(batch as unknown as Ql3BatchRow);
      if (log) setBatchLogs(log as unknown as Ql3LogRow[]);
      setLogLastRefreshedAt(new Date().toISOString());
    };
    load();
    const t = setInterval(() => {
      if (activeBatch && isBatchTerminal(activeBatch.status)) return;
      load();
    }, 10_000);
    return () => { cancelled = true; clearInterval(t); };
  }, [activeBatch?.id, activeBatch?.status, logRefreshTick]);

  // Also tail unattached single-mode QL3 log entries (batch_id IS NULL) so
  // operators see one-off runs that were never adopted into a batch.
  // Polls unconditionally on a 10s cadence; window = last 15 minutes.
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const sinceIso = new Date(Date.now() - 15 * 60_000).toISOString();
      const { data } = await supabase
        .from("quality_loop3_log")
        .select("*")
        .is("batch_id", null)
        .gte("ts", sinceIso)
        .order("ts", { ascending: true })
        .limit(300);
      if (cancelled) return;
      if (data) setUnattachedLogs(data as unknown as Ql3LogRow[]);
      setLogLastRefreshedAt(new Date().toISOString());
    };
    load();
    const t = setInterval(load, 10_000);
    return () => { cancelled = true; clearInterval(t); };
  }, [logRefreshTick]);

  const refreshLog = async () => {
    setLogRefreshing(true);
    setLogRefreshTick((n) => n + 1);
    // brief visual feedback; the effects run synchronously on tick change
    setTimeout(() => setLogRefreshing(false), 600);
  };

  // Merged log stream: batch-scoped + recent unattached, deduped by id, sorted by ts.
  const mergedLogs = (() => {
    const seen = new Map<string, Ql3LogRow>();
    for (const r of batchLogs) seen.set(r.id, r);
    for (const r of unattachedLogs) seen.set(r.id, r);
    return Array.from(seen.values()).sort((a, b) => a.ts.localeCompare(b.ts));
  })();

  // Single-mode pre-fill.
  useEffect(() => {
    if (mode !== "single") return;
    let cancelled = false;
    const docTool = DOC_TOOL_MAP[tool];
    setPrefillHint(null);
    setAssessmentId("");
    if (!docTool) return;
    (async () => {
      const { data, error } = await supabase
        .from("quality_run_documents")
        .select("source_row_id, doc_number, created_at, status")
        .eq("tool", docTool)
        .eq("status", "complete")
        .not("source_row_id", "is", null)
        .order("created_at", { ascending: false })
        .limit(1);
      if (cancelled || error) return;
      const row = (data as any)?.[0];
      if (row?.source_row_id) {
        setAssessmentId(row.source_row_id);
        setPrefillHint(`pre-filled from run-quality-batch doc #${row.doc_number} · ${fmtRelTime(row.created_at)}`);
      }
    })();
    return () => { cancelled = true; };
  }, [tool, mode]);

  // Full-batch: recent quality_runs with complete docs for this tool.
  useEffect(() => {
    if (mode !== "full-batch") return;
    let cancelled = false;
    setBatchRuns([]); setSelectedBatchRunId(""); setBatchDocs([]);
    (async () => {
      setBatchLoading(true);
      const docTool = DOC_TOOL_MAP[tool];
      const { data, error } = await supabase
        .from("quality_run_documents")
        .select("run_id, created_at, status")
        .eq("tool", docTool)
        .eq("status", "complete")
        .not("source_row_id", "is", null)
        .order("created_at", { ascending: false })
        .limit(300);
      if (cancelled) { setBatchLoading(false); return; }
      if (error) { setBatchLoading(false); toast.error(`Load batches failed: ${error.message}`); return; }
      const byRun = new Map<string, { count: number; last: string }>();
      for (const row of (data as any[]) ?? []) {
        const cur = byRun.get(row.run_id) ?? { count: 0, last: row.created_at };
        cur.count += 1;
        if (row.created_at > cur.last) cur.last = row.created_at;
        byRun.set(row.run_id, cur);
      }
      if (byRun.size === 0) { setBatchLoading(false); return; }
      const runIds = Array.from(byRun.keys());
      const { data: qr } = await supabase
        .from("quality_runs").select("id, run_number, completed_at").in("id", runIds);
      const list: BatchRun[] = ((qr as any[]) ?? []).map((r) => ({
        run_id: r.id, run_number: r.run_number, completed_at: r.completed_at,
        doc_count: byRun.get(r.id)?.count ?? 0,
      })).sort((a, b) => (b.completed_at ?? "").localeCompare(a.completed_at ?? ""));
      setBatchRuns(list);
      if (list[0]) setSelectedBatchRunId(list[0].run_id);
      setBatchLoading(false);
    })();
    return () => { cancelled = true; };
  }, [tool, mode]);

  useEffect(() => {
    if (mode !== "full-batch" || !selectedBatchRunId) { setBatchDocs([]); return; }
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from("quality_run_documents")
        .select("id, doc_number, source_row_id, status")
        .eq("run_id", selectedBatchRunId)
        .eq("status", "complete")
        .not("source_row_id", "is", null)
        .order("doc_number", { ascending: true });
      if (cancelled) return;
      if (error) { toast.error(`Load docs failed: ${error.message}`); return; }
      setBatchDocs(((data as any[]) ?? []) as DocRow[]);
      setDocPick("__all__");
    })();
    return () => { cancelled = true; };
  }, [selectedBatchRunId, mode]);

  async function startSingle() {
    if (!assessmentId.trim()) { toast.error("assessment_id required"); return; }
    setStarting(true);
    try {
      const { data, error } = await supabase.functions.invoke("ql3-orchestrator", {
        body: { action: "kickoff", tool_slug: tool, assessment_id: assessmentId.trim(), notes: notes || null },
      });
      if (error) throw error;
      toast.success(`QL3 run started: ${(data as any)?.run_id ?? "ok"}`);
      setAssessmentId(""); setNotes("");
      refresh();
    } catch (e: any) {
      toast.error(`Kickoff failed: ${e?.message ?? String(e)}`);
    } finally { setStarting(false); }
  }

  async function startBatch() {
    if (!selectedBatchRunId) { toast.error("Select a source batch"); return; }
    if (batchDocs.length === 0) { toast.error("No complete documents in this batch"); return; }
    setStarting(true);
    try {
      const body: any = {
        action: "batch_start",
        tool_slug: tool,
        source_quality_run_id: selectedBatchRunId,
      };
      if (docPick !== "__all__") {
        body.doc_filter = { doc_number: Number(docPick) };
      }
      const { data, error } = await supabase.functions.invoke("ql3-batch-orchestrator", { body });
      if (error) throw error;
      const batchId = (data as any)?.batch_id;
      if (!batchId) throw new Error("orchestrator returned no batch_id");
      const { data: row } = await supabase.from("quality_loop3_batches")
        .select("*").eq("id", batchId).maybeSingle();
      setActiveBatch(row as unknown as Ql3BatchRow);
      setBatchLogs([]);
      toast.success("QL3 batch started");
    } catch (e: any) {
      const msg = e?.context?.body ?? e?.message ?? String(e);
      toast.error(`Start failed: ${typeof msg === "string" ? msg : JSON.stringify(msg)}`);
    } finally { setStarting(false); }
  }

  async function stopBatch() {
    if (!activeBatch) return;
    setStopping(true);
    try {
      const { error } = await supabase.functions.invoke("ql3-batch-orchestrator", {
        body: { action: "batch_cancel", batch_id: activeBatch.id },
      });
      if (error) throw error;
      toast.success("Stop requested — batch will halt after the current document");
    } catch (e: any) {
      toast.error(`Stop failed: ${e?.message ?? e}`);
    } finally { setStopping(false); }
  }

  const isBatchRunning = !!activeBatch && !isBatchTerminal(activeBatch.status);
  const batchTotal = activeBatch?.doc_ids?.length ?? 0;
  const batchIdx = activeBatch?.current_index ?? 0;

  // Zip export (per batch)
  async function onDownloadBatchZip(batch: Ql3BatchRow) {
    const done = (batch.results ?? []).filter((r) => r.final_phase === "done" && r.source_row_id);
    if (done.length === 0) { toast.error("No completed docs in this batch."); return; }
    const toolType = SLUG_TO_TOOL_TYPE[batch.tool_slug];
    if (!toolType) { toast.error(`Unknown tool_type mapping for ${batch.tool_slug}`); return; }

    const tid = toast.loading(`Preparing PDFs for batch ${batch.id.slice(0, 8)}…`);
    try {
      const zip = new JSZip();
      let ok = 0, failed = 0;
      let n = 0;
      for (const r of done) {
        n += 1;
        toast.loading(`Rendering ${batch.tool_slug} #${r.doc_number} (${n}/${done.length})…`, { id: tid });
        try {
          const { data: pdfResp, error: pdfErr } = await supabase.functions.invoke("generate-report-pdf", {
            body: { tool_type: toolType, assessment_id: r.source_row_id },
          });
          if (pdfErr) throw pdfErr;
          const url = (pdfResp as any)?.pdf_url as string | undefined;
          if (!url) throw new Error("no pdf_url");
          const res = await fetch(url);
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          const blob = await res.blob();
          const shortRow = (r.source_row_id ?? "row").slice(0, 8);
          zip.file(`${batch.tool_slug}/${String(r.doc_number ?? 0).padStart(2, "0")}-${shortRow}.pdf`, blob);
          ok += 1;
        } catch (e) {
          console.error("pdf fetch failed", batch.tool_slug, r.source_row_id, e);
          failed += 1;
        }
      }
      if (ok === 0) { toast.error(`Zip aborted — 0 of ${done.length} PDFs rendered.`, { id: tid }); return; }
      const blob = await zip.generateAsync({ type: "blob" });
      const stamp = new Date().toISOString().slice(0, 10);
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `ql3-batch-${batch.id.slice(0, 8)}-${stamp}.zip`;
      document.body.appendChild(a); a.click();
      setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 0);
      toast.success(`Zipped ${ok} PDF${ok === 1 ? "" : "s"}${failed ? ` · ${failed} failed` : ""}.`, { id: tid });
    } catch (e: any) {
      toast.error(`Zip failed: ${e?.message ?? e}`, { id: tid });
    }
  }

  // Markdown analysis export.
  async function onExportBatchMarkdown(batch: Ql3BatchRow) {
    const tid = toast.loading(`Building analysis for batch ${batch.id.slice(0, 8)}…`);
    try {
      // Columns read from quality_loop3_runs:
      //   pre_claude_score, post_claude_score, pre_gpt_score, post_gpt_score,
      //   pre_score, post_score, items_before, items_after, items_resolved,
      //   phase, error_message, notes, qc_result.
      // qc_result keys used: variance.{verdict,band,delta,pre_median,post_median},
      //   incorporation.{pass,checks[].{path,kind,result}},
      //   upstream.{verdicts,changed_paths}, pre_samples_cached, dispatch_status.
      const runIds = (batch.results ?? []).map((r) => r.ql3_run_id).filter((x): x is string => !!x);
      let runsMap = new Map<string, Ql3Run>();
      if (runIds.length > 0) {
        const { data } = await supabase.from("quality_loop3_runs").select(RUN_COLS).in("id", runIds);
        for (const row of ((data as unknown as Ql3Run[]) ?? [])) runsMap.set(row.id, row);
      }
      const lines: string[] = [];
      lines.push(`# QL3 Batch Analysis — ${batch.id}`);
      lines.push("");
      lines.push(`- Tool: \`${batch.tool_slug}\``);
      lines.push(`- Source quality_runs: \`${batch.source_quality_run_id}\``);
      lines.push(`- Docs: ${batch.doc_ids?.length ?? 0}`);
      lines.push(`- Status: ${batch.status} · Phase: ${batch.phase}`);
      lines.push(`- Started: ${batch.started_at ?? "—"}`);
      lines.push(`- Completed: ${batch.completed_at ?? "—"}`);
      if (batch.last_error) lines.push(`- Last error: ${batch.last_error}`);
      lines.push("");
      lines.push("## Per-doc summary");
      lines.push("");
      lines.push("| Doc | phase | pre→post (blend) | claude | gpt | items b/a/res | variance | incorporation |");
      lines.push("| --- | --- | --- | --- | --- | --- | --- | --- |");
      for (const r of (batch.results ?? [])) {
        const run = r.ql3_run_id ? runsMap.get(r.ql3_run_id) : undefined;
        const v = run?.qc_result?.variance;
        const inc = run?.qc_result?.incorporation;
        const preB = r.pre_score ?? run?.pre_score;
        const postB = r.post_score ?? run?.post_score;
        const preC = r.pre_claude_score ?? run?.pre_claude_score;
        const postC = r.post_claude_score ?? run?.post_claude_score;
        const preG = r.pre_gpt_score ?? run?.pre_gpt_score;
        const postG = r.post_gpt_score ?? run?.post_gpt_score;
        lines.push(
          `| #${r.doc_number ?? "?"} | ${r.final_phase ?? "—"} | ${preB ?? "—"}→${postB ?? "—"} | ${preC ?? "—"}→${postC ?? "—"} | ${preG ?? "—"}→${postG ?? "—"} | ${r.items_before ?? "—"}/${r.items_after ?? "—"}/${r.items_resolved ?? "—"} | ${v?.verdict ?? "—"}${v?.band != null ? ` (band ${Number(v.band).toFixed(2)}, Δ ${Number(v.delta).toFixed(2)})` : ""} | ${inc ? (inc.pass ? "pass" : `fail(${(inc.checks ?? []).filter((c: any) => c.result !== "pass").length})`) : "—"} |`
        );
      }
      lines.push("");

      for (const r of (batch.results ?? [])) {
        const run = r.ql3_run_id ? runsMap.get(r.ql3_run_id) : undefined;
        if (!run) continue;
        lines.push(`## Doc #${r.doc_number} · run \`${run.id}\``);
        lines.push("");
        lines.push(`- assessment_id: \`${run.assessment_id ?? "—"}\``);
        lines.push(`- phase: ${run.phase}`);
        if (run.error_message) lines.push(`- error: ${run.error_message}`);
        if (run.notes) lines.push(`- notes: ${run.notes}`);
        const v = run.qc_result?.variance;
        if (v) {
          lines.push(`- variance.verdict: **${v.verdict}** · band ${v.band ?? "—"} · Δ ${v.delta ?? "—"} · pre_median ${v.pre_median ?? "—"} · post_median ${v.post_median ?? "—"}`);
        }
        const upstream = run.qc_result?.upstream;
        if (upstream) {
          const vc = Array.isArray(upstream.verdicts) ? upstream.verdicts.length : 0;
          const cp = Array.isArray(upstream.changed_paths) ? upstream.changed_paths.length : 0;
          lines.push(`- upstream.verdicts: ${vc} · changed_paths: ${cp}`);
        }
        if (run.qc_result?.pre_samples_cached) lines.push(`- pre_samples_cached: true`);
        if (run.qc_result?.dispatch_status != null) lines.push(`- dispatch HTTP ${run.qc_result.dispatch_status}`);
        const inc = run.qc_result?.incorporation;
        if (inc && Array.isArray(inc.checks)) {
          lines.push("");
          lines.push("### Incorporation checks");
          lines.push("");
          lines.push("| path | kind | result |");
          lines.push("| --- | --- | --- |");
          for (const c of inc.checks) {
            lines.push(`| \`${c.path ?? "—"}\` | ${c.kind ?? "—"} | ${c.result ?? "—"} |`);
          }
        }
        lines.push("");
      }

      lines.push("---");
      lines.push("");
      lines.push("_Generated for prompt-improvement analysis — paste to Claude._");
      const md = lines.join("\n");
      const blob = new Blob([md], { type: "text/markdown;charset=utf-8" });
      const stamp = new Date().toISOString().slice(0, 10);
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `ql3-batch-${batch.id.slice(0, 8)}-${stamp}.md`;
      document.body.appendChild(a); a.click();
      setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 0);
      toast.success("Analysis .md ready.", { id: tid });
    } catch (e: any) {
      toast.error(`Export failed: ${e?.message ?? e}`, { id: tid });
    }
  }

  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      <div className="flex items-baseline justify-between">
        <h1 className="text-3xl font-serif text-foreground">Quality Loop 3</h1>
        <span className="text-xs text-muted-foreground font-mono">ql3-batch-orchestrator</span>
      </div>

      {/* Panel A — Run */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Run</CardTitle>
            <div className="flex gap-1 text-xs">
              <Button size="sm" variant={mode === "single" ? "default" : "outline"} onClick={() => setMode("single")} disabled={isBatchRunning}>Single</Button>
              <Button size="sm" variant={mode === "full-batch" ? "default" : "outline"} onClick={() => setMode("full-batch")} disabled={isBatchRunning}>Full batch</Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Tool</Label>
              <Select value={tool} onValueChange={setTool}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{TOOLS.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            {mode === "single" ? (
              <div>
                <Label>Assessment ID (UUID)</Label>
                <Input
                  value={assessmentId}
                  onChange={(e) => { setAssessmentId(e.target.value); if (prefillHint) setPrefillHint(null); }}
                  placeholder="terminal assessment row id"
                />
                {prefillHint && <p className="text-xs text-muted-foreground mt-1 italic">{prefillHint}</p>}
              </div>
            ) : (
              <div className="space-y-2">
                <div>
                  <Label>Source batch run</Label>
                  <select
                    className="w-full h-10 rounded border bg-background px-2 text-sm"
                    value={selectedBatchRunId}
                    onChange={(e) => setSelectedBatchRunId(e.target.value)}
                    disabled={isBatchRunning || batchLoading}
                  >
                    {batchRuns.length === 0 && <option value="">{batchLoading ? "Loading…" : "No completed batches"}</option>}
                    {batchRuns.map((b) => (
                      <option key={b.run_id} value={b.run_id}>
                        run #{b.run_number ?? "?"} · {b.doc_count} docs · {b.completed_at ? fmtRelTime(b.completed_at) : "in-flight"}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label>Document</Label>
                  <select
                    className="w-full h-10 rounded border bg-background px-2 text-sm"
                    value={docPick}
                    onChange={(e) => setDocPick(e.target.value)}
                    disabled={isBatchRunning || batchDocs.length === 0}
                  >
                    <option value="__all__">All documents ({batchDocs.length})</option>
                    {batchDocs.map((d) => (
                      <option key={d.id} value={String(d.doc_number)}>
                        Doc #{d.doc_number} · {d.source_row_id.slice(0, 8)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}
          </div>
          {mode === "single" && (
            <div>
              <Label>Notes (optional)</Label>
              <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="e.g. RC-D pass 1 for governance forced-ask fixture" />
            </div>
          )}

          <div className="flex flex-wrap gap-2 items-center">
            {mode === "single" ? (
              <Button onClick={startSingle} disabled={starting}>{starting ? "Starting…" : "Kickoff QL3 run"}</Button>
            ) : (
              <>
                <Button onClick={startBatch} disabled={starting || isBatchRunning || !selectedBatchRunId || batchDocs.length === 0}>
                  {starting ? "Starting…" : (docPick === "__all__" ? `Start batch (${batchDocs.length})` : `Start doc #${docPick}`)}
                </Button>
                {isBatchRunning && (
                  <Button variant="destructive" onClick={stopBatch} disabled={stopping}>
                    {stopping ? "Stopping…" : "Stop after current doc"}
                  </Button>
                )}
              </>
            )}
            {activeBatch && (
              <>
                <div className="text-sm text-muted-foreground">
                  Batch <code>{activeBatch.id.slice(0, 8)}</code> · <Badge variant="outline">{activeBatch.status}</Badge>
                  {" · "}doc {Math.min(batchIdx + (isBatchRunning ? 1 : 0), batchTotal)}/{batchTotal}
                  {" · "}<span className="font-mono">{activeBatch.tool_slug}</span>
                </div>
                <Button size="sm" variant="outline"
                  disabled={isBatchRunning}
                  onClick={() => onDownloadBatchZip(activeBatch)}
                  title={isBatchRunning ? "Finish batch first" : "Zip revised PDFs"}
                >Download revised PDFs (zip)</Button>
                <Button size="sm" variant="outline" onClick={() => onExportBatchMarkdown(activeBatch)}>
                  Export analysis (.md)
                </Button>
              </>
            )}
          </div>
          {activeBatch?.last_error && (
            <div className="text-xs text-destructive break-all">{activeBatch.last_error}</div>
          )}

          {activeBatch && (activeBatch.doc_ids?.length ?? 0) > 0 && (
            <div className="border rounded p-3 text-xs">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                {activeBatch.doc_ids.map((d, i) => {
                  const done = activeBatch.results?.find((r) => r.doc_number === d.doc_number);
                  const isCurrent = i === activeBatch.current_index && isBatchRunning && !done;
                  return (
                    <div key={d.source_row_id} className="flex items-center gap-2 flex-wrap">
                      {done ? (
                        <Badge variant={done.final_phase === "done" ? "default" : done.final_phase === "failed" || done.final_phase === "stalled" || done.final_phase === "kickoff_failed" ? "destructive" : "outline"} className="h-4 text-[10px]">
                          {done.final_phase ?? "—"}
                        </Badge>
                      ) : isCurrent ? (
                        <Badge variant="secondary" className="h-4 text-[10px]">running</Badge>
                      ) : (
                        <Badge variant="outline" className="h-4 text-[10px]">pending</Badge>
                      )}
                      <span className="font-mono">doc #{d.doc_number}</span>
                      <span className="text-muted-foreground font-mono">{d.source_row_id.slice(0, 8)}</span>
                      {done && typeof done.post_score === "number" && typeof done.pre_score === "number" && (
                        <span className="text-muted-foreground font-mono">
                          {done.pre_score.toFixed(1)}→{done.post_score.toFixed(1)}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

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
            {unattachedLogs.length > 0 && (
              <span className="text-xs text-muted-foreground ml-2">
                · +{unattachedLogs.length} unattached (last 15m)
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
          <BatchLogView entries={mergedLogs} />

        </CardContent>
      </Card>

      {/* Panel C — Recent runs */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Recent runs</CardTitle>
          <Button variant="ghost" size="sm" onClick={refresh} disabled={loading}>{loading ? "…" : "Refresh"}</Button>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            {runs.length === 0 && <p className="text-muted-foreground">No QL3 runs yet.</p>}
            {runs.map((r) => {
              const v = r.qc_result?.variance;
              const inc = r.qc_result?.incorporation;
              const incFailed = inc && Array.isArray(inc.checks)
                ? inc.checks.filter((c: any) => c.result !== "pass").length
                : 0;
              const cached = !!r.qc_result?.pre_samples_cached;
              return (
                <div key={r.id} className="border rounded p-3 space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="outline">{r.tool_slug}</Badge>
                    <Badge variant={r.phase === "done" ? "default" : r.phase === "failed" ? "destructive" : "secondary"}>{r.phase}</Badge>
                    <span className="font-mono text-xs">pass {r.pass_number}</span>
                    <span className="font-mono text-xs text-muted-foreground">{r.id.slice(0, 8)}</span>
                    {varianceBadge(v?.verdict)}
                    {inc && (
                      <Badge variant={inc.pass ? "default" : "destructive"} className="h-4 text-[10px]">
                        {inc.pass ? "incorp pass" : `incorp fail(${incFailed})`}
                      </Badge>
                    )}
                    {cached && <span className="text-[10px] px-1 rounded bg-muted text-muted-foreground font-mono">cached</span>}
                    <span className="text-xs text-muted-foreground ml-auto">{new Date(r.created_at).toLocaleString()}</span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    assessment: <span className="font-mono">{r.assessment_id?.slice(0, 8) ?? "—"}</span>
                    {" · "}items: {r.items_before ?? "?"} → {r.items_after ?? "?"} (resolved {r.items_resolved ?? 0})
                  </div>
                  <div className="text-xs font-mono">
                    claude {r.pre_claude_score?.toFixed?.(2) ?? "—"}→{r.post_claude_score?.toFixed?.(2) ?? "—"}
                    {" · "}gpt {r.pre_gpt_score?.toFixed?.(2) ?? "—"}→{r.post_gpt_score?.toFixed?.(2) ?? "—"}
                    {" · "}blend {r.pre_score?.toFixed?.(2) ?? "—"}→{r.post_score?.toFixed?.(2) ?? "—"}
                  </div>
                  {r.qc_result?.dispatch_status != null && (
                    <div className="text-xs font-mono text-muted-foreground">dispatch HTTP {r.qc_result.dispatch_status}
                      {Array.isArray(r.qc_result?.upstream?.verdicts) && ` · verdicts=${r.qc_result.upstream.verdicts.length}`}
                      {Array.isArray(r.qc_result?.upstream?.changed_paths) && ` · changed_paths=${r.qc_result.upstream.changed_paths.length}`}
                    </div>
                  )}
                  {r.error_message && <div className="text-xs text-destructive">error: {r.error_message}</div>}
                  {r.notes && <div className="text-xs italic text-muted-foreground">{r.notes}</div>}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function BatchLogView({ entries }: { entries: Ql3LogRow[] }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (ref.current) ref.current.scrollTop = ref.current.scrollHeight;
  }, [entries.length]);
  return (
    <div
      ref={ref}
      className="font-mono text-xs max-h-[28rem] overflow-y-auto border rounded p-3 bg-muted/30"
    >
      {entries.length === 0 && <div className="text-muted-foreground">No log entries.</div>}
      {entries.map((l) => (
        <div
          key={l.id}
          className={
            l.level === "error" ? "text-destructive" :
            l.level === "warn" ? "text-yellow-600" : ""
          }
        >
          {new Date(l.ts).toLocaleTimeString()} · {l.level} · {l.ql3_run_id ? l.ql3_run_id.slice(0, 8) : "—"} · {l.message}
        </div>
      ))}
    </div>
  );
}
