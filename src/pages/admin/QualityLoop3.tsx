// QualityLoop3 — RC-D admin console for QL3 (dummy-answer revision loop).
//
// Modes:
//   * "single"     — original manual entry: run QL3 against one assessment_id.
//   * "full-batch" — pick a completed quality_runs batch for a tool, then
//                    sequentially kickoff QL3 for every 'complete' document
//                    in that batch. Polls each quality_loop3_runs row until
//                    phase ∈ {"done","failed"} (same terminal check used at
//                    ql3-orchestrator/index.ts L259) before dequeuing the next.

import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

const TOOLS = [
  "governance", "cppa-risk", "cppa-cyber", "cppa-admt",
  "dpia", "lia", "ir-playbook", "biometric", "dpa",
];

// QL3 tool slug → quality_run_documents.tool value.
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
type QueueItem = {
  doc_number: number;
  assessment_id: string;
  state: "pending" | "running" | "done" | "failed" | "skipped" | "error";
  ql3_run_id?: string;
  final_phase?: string;
  error?: string;
};

// Terminal phases per ql3-orchestrator/index.ts L259: run.phase === "done" || run.phase === "failed"
function isQl3Terminal(phase: string): boolean {
  return phase === "done" || phase === "failed";
}

async function pollQl3Terminal(
  runId: string,
  cancelRef: { cancelled: boolean },
  intervalMs = 8000,
): Promise<Ql3Run | null> {
  // eslint-disable-next-line no-constant-condition
  while (true) {
    if (cancelRef.cancelled) return null;
    const { data } = await supabase
      .from("quality_loop3_runs" as any)
      .select("id, tool_slug, assessment_id, phase, pass_number, pre_score, post_score, items_before, items_after, items_resolved, qc_result, error_message, notes, terminal_at, created_at")
      .eq("id", runId)
      .maybeSingle();
    const row = (data as any) as Ql3Run | null;
    if (row && isQl3Terminal(row.phase)) return row;
    await new Promise((r) => setTimeout(r, intervalMs));
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

  // Full-batch state
  const [batchRuns, setBatchRuns] = useState<BatchRun[]>([]);
  const [selectedBatchRunId, setSelectedBatchRunId] = useState<string>("");
  const [batchDocs, setBatchDocs] = useState<DocRow[]>([]);
  const [batchLoading, setBatchLoading] = useState(false);
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [batchRunning, setBatchRunning] = useState(false);
  const [cancelRef] = useState<{ cancelled: boolean }>({ cancelled: false });

  async function refresh() {
    setLoading(true);
    const { data, error } = await supabase
      .from("quality_loop3_runs" as any)
      .select("id, tool_slug, assessment_id, phase, pass_number, pre_score, post_score, items_before, items_after, items_resolved, qc_result, error_message, notes, terminal_at, created_at")
      .order("created_at", { ascending: false })
      .limit(30);
    setLoading(false);
    if (error) { toast.error(`Load failed: ${error.message}`); return; }
    setRuns((data as any) ?? []);
  }
  useEffect(() => { refresh(); const t = setInterval(refresh, 8000); return () => clearInterval(t); }, []);

  // Single-mode pre-fill (unchanged from prior prompt).
  useEffect(() => {
    if (mode !== "single") return;
    let cancelled = false;
    const docTool = DOC_TOOL_MAP[tool];
    setPrefillHint(null);
    setAssessmentId("");
    if (!docTool) return;
    (async () => {
      const { data, error } = await supabase
        .from("quality_run_documents" as any)
        .select("source_row_id, doc_number, created_at, status")
        .eq("tool", docTool)
        .eq("status", "complete")
        .not("source_row_id", "is", null)
        .order("created_at", { ascending: false })
        .limit(1);
      if (cancelled) return;
      if (error) return;
      const row = (data as any)?.[0];
      if (row?.source_row_id) {
        setAssessmentId(row.source_row_id);
        setPrefillHint(`pre-filled from run-quality-batch doc #${row.doc_number} · ${fmtRelTime(row.created_at)}`);
      }
    })();
    return () => { cancelled = true; };
  }, [tool, mode]);

  // Full-batch: list recent quality_runs for this tool with any complete docs.
  useEffect(() => {
    if (mode !== "full-batch") return;
    let cancelled = false;
    setBatchRuns([]);
    setSelectedBatchRunId("");
    setBatchDocs([]);
    (async () => {
      setBatchLoading(true);
      const docTool = DOC_TOOL_MAP[tool];
      // Fetch docs' run_id/created_at for the last N runs; aggregate client-side.
      const { data, error } = await supabase
        .from("quality_run_documents" as any)
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
        .from("quality_runs")
        .select("id, run_number, completed_at")
        .in("id", runIds);
      const list: BatchRun[] = ((qr as any[]) ?? []).map((r) => ({
        run_id: r.id,
        run_number: r.run_number,
        completed_at: r.completed_at,
        doc_count: byRun.get(r.id)?.count ?? 0,
      })).sort((a, b) => (b.completed_at ?? "").localeCompare(a.completed_at ?? ""));
      setBatchRuns(list);
      if (list[0]) setSelectedBatchRunId(list[0].run_id);
      setBatchLoading(false);
    })();
    return () => { cancelled = true; };
  }, [tool, mode]);

  // When batch run selection changes, load its complete documents.
  useEffect(() => {
    if (mode !== "full-batch" || !selectedBatchRunId) { setBatchDocs([]); return; }
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from("quality_run_documents" as any)
        .select("id, doc_number, source_row_id, status")
        .eq("run_id", selectedBatchRunId)
        .eq("status", "complete")
        .not("source_row_id", "is", null)
        .order("doc_number", { ascending: true });
      if (cancelled) return;
      if (error) { toast.error(`Load docs failed: ${error.message}`); return; }
      setBatchDocs(((data as any[]) ?? []) as DocRow[]);
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

  function updateQueueItem(idx: number, patch: Partial<QueueItem>) {
    setQueue((prev) => prev.map((q, i) => (i === idx ? { ...q, ...patch } : q)));
  }

  async function startFullBatch() {
    if (!batchDocs.length) { toast.error("No completed documents in the selected batch"); return; }
    const initial: QueueItem[] = batchDocs.map((d) => ({
      doc_number: d.doc_number,
      assessment_id: d.source_row_id,
      state: "pending",
    }));
    setQueue(initial);
    setBatchRunning(true);
    cancelRef.cancelled = false;

    for (let i = 0; i < initial.length; i++) {
      if (cancelRef.cancelled) {
        setQueue((prev) => prev.map((q, idx) => (idx >= i && q.state === "pending" ? { ...q, state: "skipped" } : q)));
        break;
      }
      const item = initial[i];
      updateQueueItem(i, { state: "running" });
      try {
        const { data, error } = await supabase.functions.invoke("ql3-orchestrator", {
          body: {
            action: "kickoff",
            tool_slug: tool,
            assessment_id: item.assessment_id,
            notes: notes || `full-batch · doc #${item.doc_number}`,
          },
        });
        if (error) throw error;
        const ql3RunId: string | undefined = (data as any)?.run_id;
        if (!ql3RunId) throw new Error("ql3-orchestrator returned no run_id");
        updateQueueItem(i, { ql3_run_id: ql3RunId });
        refresh();
        const row = await pollQl3Terminal(ql3RunId, cancelRef);
        if (!row) {
          updateQueueItem(i, { state: "skipped" });
        } else {
          updateQueueItem(i, {
            state: row.phase === "done" ? "done" : "failed",
            final_phase: row.phase,
            error: row.error_message ?? undefined,
          });
        }
        refresh();
      } catch (e: any) {
        updateQueueItem(i, { state: "error", error: e?.message ?? String(e) });
        toast.error(`Doc #${item.doc_number}: ${e?.message ?? "kickoff failed"}`);
        // Continue with next doc.
      }
    }
    setBatchRunning(false);
    refresh();
  }

  function cancelBatch() {
    cancelRef.cancelled = true;
    toast.message("Cancel requested — will stop after the current document finishes.");
  }

  const queueDone = queue.filter((q) => q.state !== "pending" && q.state !== "running").length;
  const queueCurrent = queue.find((q) => q.state === "running");

  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      <div className="flex items-baseline justify-between">
        <h1 className="text-3xl font-serif text-foreground">Quality Loop 3</h1>
        <span className="text-xs text-muted-foreground font-mono">RC-D — dummy-answer revision</span>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Start a QL3 pass</CardTitle>
            <div className="flex gap-1 text-xs">
              <Button size="sm" variant={mode === "single" ? "default" : "outline"} onClick={() => setMode("single")} disabled={batchRunning}>Single</Button>
              <Button size="sm" variant={mode === "full-batch" ? "default" : "outline"} onClick={() => setMode("full-batch")} disabled={batchRunning}>Full batch</Button>
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
                {prefillHint && (
                  <p className="text-xs text-muted-foreground mt-1 italic">{prefillHint}</p>
                )}
              </div>
            ) : (
              <div>
                <Label>Source batch run</Label>
                <select
                  className="w-full h-10 rounded border bg-background px-2 text-sm"
                  value={selectedBatchRunId}
                  onChange={(e) => setSelectedBatchRunId(e.target.value)}
                  disabled={batchRunning || batchLoading}
                >
                  {batchRuns.length === 0 && <option value="">{batchLoading ? "Loading…" : "No completed batches"}</option>}
                  {batchRuns.map((b) => (
                    <option key={b.run_id} value={b.run_id}>
                      run #{b.run_number ?? "?"} · {b.doc_count} docs · {b.completed_at ? fmtRelTime(b.completed_at) : "in-flight"}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-muted-foreground mt-1">
                  {batchDocs.length > 0
                    ? `${batchDocs.length} completed document${batchDocs.length === 1 ? "" : "s"} will be queued.`
                    : selectedBatchRunId
                      ? "No completed documents in this batch."
                      : ""}
                </p>
              </div>
            )}
          </div>
          <div>
            <Label>Notes (optional)</Label>
            <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="e.g. RC-D pass 1 for governance forced-ask fixture" />
          </div>

          {mode === "single" ? (
            <Button onClick={startSingle} disabled={starting}>{starting ? "Starting…" : "Kickoff QL3 run"}</Button>
          ) : (
            <div className="flex gap-2 flex-wrap">
              <Button onClick={startFullBatch} disabled={batchRunning || batchDocs.length === 0}>
                {batchRunning ? `Running doc #${queueCurrent?.doc_number ?? "…"}` : `Run full batch (${batchDocs.length})`}
              </Button>
              {batchRunning && (
                <Button variant="outline" onClick={cancelBatch} disabled={cancelRef.cancelled}>
                  {cancelRef.cancelled ? "Stopping…" : "Cancel remaining"}
                </Button>
              )}
            </div>
          )}

          {mode === "full-batch" && queue.length > 0 && (
            <div className="border rounded p-3 space-y-1 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-medium">Queue: {queueDone}/{queue.length} finished</span>
                {queueCurrent && <span className="text-muted-foreground">currently: doc #{queueCurrent.doc_number}</span>}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-1 mt-2">
                {queue.map((q) => (
                  <div key={q.doc_number} className="flex items-center gap-2">
                    <Badge variant={
                      q.state === "done" ? "default"
                        : q.state === "failed" || q.state === "error" ? "destructive"
                        : q.state === "running" ? "secondary"
                        : "outline"
                    } className="h-4 text-[10px]">{q.state}</Badge>
                    <span className="font-mono">doc #{q.doc_number}</span>
                    <span className="text-muted-foreground font-mono">{q.assessment_id.slice(0, 8)}</span>
                    {q.final_phase && <span className="text-muted-foreground">· {q.final_phase}</span>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Recent runs</CardTitle>
          <Button variant="ghost" size="sm" onClick={refresh} disabled={loading}>{loading ? "…" : "Refresh"}</Button>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            {runs.length === 0 && <p className="text-muted-foreground">No QL3 runs yet.</p>}
            {runs.map((r) => (
              <div key={r.id} className="border rounded p-3 space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="outline">{r.tool_slug}</Badge>
                  <Badge variant={r.phase === "done" ? "default" : r.phase === "failed" ? "destructive" : "secondary"}>{r.phase}</Badge>
                  <span className="font-mono text-xs">pass {r.pass_number}</span>
                  <span className="font-mono text-xs text-muted-foreground">{r.id.slice(0, 8)}</span>
                  <span className="text-xs text-muted-foreground ml-auto">{new Date(r.created_at).toLocaleString()}</span>
                </div>
                <div className="text-xs text-muted-foreground">
                  assessment: <span className="font-mono">{r.assessment_id?.slice(0, 8) ?? "—"}</span>
                  {" · "}items: {r.items_before ?? "?"} → {r.items_after ?? "?"} (resolved {r.items_resolved ?? 0})
                  {" · "}score: {r.pre_score?.toFixed?.(3) ?? "—"} → {r.post_score?.toFixed?.(3) ?? "—"}
                </div>
                {r.qc_result?.dispatch_status != null && (
                  <div className="text-xs font-mono">dispatch HTTP {r.qc_result.dispatch_status}
                    {Array.isArray(r.qc_result?.upstream?.verdicts) && ` · verdicts=${r.qc_result.upstream.verdicts.length}`}
                    {Array.isArray(r.qc_result?.upstream?.changed_paths) && ` · changed_paths=${r.qc_result.upstream.changed_paths.length}`}
                  </div>
                )}
                {r.error_message && <div className="text-xs text-destructive">error: {r.error_message}</div>}
                {r.notes && <div className="text-xs italic text-muted-foreground">{r.notes}</div>}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
