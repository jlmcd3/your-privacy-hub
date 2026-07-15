// QualityBatch — admin console for run-quality-batch.
//
// Multi-product mode: admin selects any subset of the nine tools; the frontend
// fires run-quality-batch sequentially (one tool at a time), polling the
// resulting quality_runs row until it reaches a terminal status before
// dequeuing the next tool. This mirrors ql2-orchestrator's server-side
// one-product-at-a-time discipline, implemented client-side because
// run-quality-batch itself takes one tool per invocation.
//
// Terminal statuses for quality_runs (verified in codebase, see TERMINAL_STATUSES
// below — complete/completed/done/error/failed/cancelled/canceled).

import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

// Matches run-quality-batch CONTRACT_MAP keys verbatim.
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
  completed_at: string | null;
  progress_log: LogEntry[] | null;
};

const TERMINAL_STATUSES = new Set([
  "complete", "completed", "done", "error", "failed", "cancelled", "canceled",
]);
const isTerminal = (s: string) => TERMINAL_STATUSES.has(s?.toLowerCase?.() ?? "");

const SELECT_COLS =
  "id, tool, status, batch_size, run_number, checks_passed, checks_failed, checks_total, score_overall, gpt_score_overall, cross_review_complete, error, started_at, completed_at, progress_log";

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

// Poll a single quality_runs row by id until it hits a terminal status
// or the caller signals cancel. Returns the last row observed.
async function pollUntilTerminal(
  runId: string,
  cancelRef: { cancelled: boolean },
  intervalMs = 8000,
): Promise<QRun | null> {
  // eslint-disable-next-line no-constant-condition
  while (true) {
    if (cancelRef.cancelled) return null;
    const { data } = await supabase
      .from("quality_runs")
      .select(SELECT_COLS)
      .eq("id", runId)
      .maybeSingle();
    const row = data as any as QRun | null;
    if (row && isTerminal(row.status)) return row;
    await new Promise((r) => setTimeout(r, intervalMs));
  }
}

type QueueItem = {
  tool: string;
  state: "pending" | "running" | "done" | "error" | "skipped";
  run_id?: string;
  run_number?: number | null;
  final_status?: string;
  error?: string;
};

export default function QualityBatch() {
  const [selected, setSelected] = useState<Set<string>>(new Set(TOOLS));
  const [batchSize, setBatchSize] = useState<number>(5);
  const [resumeId, setResumeId] = useState("");
  const [resumeTool, setResumeTool] = useState<string>("governance");
  const [resuming, setResuming] = useState(false);

  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [running, setRunning] = useState(false);
  const cancelRef = useRef<{ cancelled: boolean }>({ cancelled: false });

  const [runs, setRuns] = useState<QRun[]>([]);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  async function refresh() {
    setLoading(true);
    const { data, error } = await supabase
      .from("quality_runs")
      .select(SELECT_COLS)
      .order("started_at", { ascending: false })
      .limit(30);
    setLoading(false);
    if (error) {
      toast.error(`Load failed: ${error.message}`);
      return;
    }
    setRuns((data as any) ?? []);
  }

  const anyActive = useMemo(() => runs.some((r) => !isTerminal(r.status)), [runs]);
  useEffect(() => { refresh(); }, []);
  useEffect(() => {
    if (!anyActive && expanded.size === 0 && !running) return;
    const t = setInterval(refresh, 8000);
    return () => clearInterval(t);
  }, [anyActive, expanded.size, running]);

  function toggleTool(t: string, checked: boolean) {
    setSelected((prev) => {
      const n = new Set(prev);
      if (checked) n.add(t); else n.delete(t);
      return n;
    });
  }

  function updateQueueItem(idx: number, patch: Partial<QueueItem>) {
    setQueue((prev) => prev.map((q, i) => (i === idx ? { ...q, ...patch } : q)));
  }

  async function startQueue() {
    const tools = TOOLS.filter((t) => selected.has(t));
    if (tools.length === 0) { toast.error("Select at least one tool"); return; }
    const initial: QueueItem[] = tools.map((t) => ({ tool: t, state: "pending" }));
    setQueue(initial);
    setRunning(true);
    cancelRef.current = { cancelled: false };

    for (let i = 0; i < tools.length; i++) {
      if (cancelRef.current.cancelled) {
        // Mark remaining as skipped.
        setQueue((prev) => prev.map((q, idx) => (idx >= i && q.state === "pending" ? { ...q, state: "skipped" } : q)));
        break;
      }
      const tool = tools[i];
      updateQueueItem(i, { state: "running" });
      try {
        const { data, error } = await supabase.functions.invoke("run-quality-batch", {
          body: { tool, batch_size: batchSize },
        });
        if (error) throw error;
        const d = (data as any) ?? {};
        const runId: string | undefined = d.run_id;
        if (!runId) throw new Error("run-quality-batch returned no run_id");
        updateQueueItem(i, { run_id: runId, run_number: d.run_number ?? null });
        refresh();
        const row = await pollUntilTerminal(runId, cancelRef.current);
        if (!row) {
          updateQueueItem(i, { state: "skipped" });
        } else {
          const terminalIsError = ["error", "failed"].includes((row.status ?? "").toLowerCase());
          updateQueueItem(i, {
            state: terminalIsError ? "error" : "done",
            final_status: row.status,
            error: row.error ?? undefined,
          });
        }
        refresh();
      } catch (e: any) {
        const msg = e?.context?.body ?? e?.message ?? String(e);
        updateQueueItem(i, { state: "error", error: typeof msg === "string" ? msg : JSON.stringify(msg) });
        toast.error(`${tool}: ${typeof msg === "string" ? msg : "invocation failed"}`);
        // Continue with next tool — one crash shouldn't abort the queue.
      }
    }
    setRunning(false);
    refresh();
  }

  function cancelQueue() {
    cancelRef.current.cancelled = true;
    toast.message("Cancel requested — will stop after the current tool finishes.");
  }

  async function resumeRun() {
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
      refresh();
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
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const doneCount = queue.filter((q) => q.state === "done" || q.state === "error" || q.state === "skipped").length;
  const currentTool = queue.find((q) => q.state === "running")?.tool ?? null;

  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      <div className="flex items-baseline justify-between">
        <h1 className="text-3xl font-serif text-foreground">Quality Batch</h1>
        <span className="text-xs text-muted-foreground font-mono">run-quality-batch</span>
      </div>

      <Card>
        <CardHeader><CardTitle>Start a new batch</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Tools (queued sequentially)</Label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-2">
              {TOOLS.map((t) => (
                <label key={t} className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={selected.has(t)}
                    onCheckedChange={(v) => toggleTool(t, v === true)}
                    disabled={running}
                  />
                  <span className="font-mono text-xs">{t}</span>
                </label>
              ))}
            </div>
            <div className="flex gap-2 mt-2 text-xs">
              <button
                type="button"
                className="text-brand-teal-text underline hover:no-underline disabled:opacity-40"
                disabled={running}
                onClick={() => setSelected(new Set(TOOLS))}
              >Select all</button>
              <button
                type="button"
                className="text-brand-teal-text underline hover:no-underline disabled:opacity-40"
                disabled={running}
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
              disabled={running}
              onChange={(e) => setBatchSize(Math.max(1, Number(e.target.value) || 1))}
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <Button onClick={startQueue} disabled={running || selected.size === 0}>
              {running ? `Running ${currentTool ?? "…"}` : `Start (${selected.size})`}
            </Button>
            {running && (
              <Button variant="outline" onClick={cancelQueue} disabled={cancelRef.current.cancelled}>
                {cancelRef.current.cancelled ? "Stopping…" : "Cancel remaining"}
              </Button>
            )}
          </div>

          {queue.length > 0 && (
            <div className="border rounded p-3 space-y-1 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-medium">Queue: {doneCount}/{queue.length} finished</span>
                {currentTool && <span className="text-muted-foreground">currently: <span className="font-mono">{currentTool}</span></span>}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-1 mt-2">
                {queue.map((q) => (
                  <div key={q.tool} className="flex items-center gap-2">
                    <Badge variant={
                      q.state === "done" ? "default"
                        : q.state === "error" ? "destructive"
                        : q.state === "running" ? "secondary"
                        : "outline"
                    } className="h-4 text-[10px]">{q.state}</Badge>
                    <span className="font-mono">{q.tool}</span>
                    {q.run_number != null && <span className="text-muted-foreground">#{q.run_number}</span>}
                    {q.final_status && <span className="text-muted-foreground">· {q.final_status}</span>}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="pt-2 border-t space-y-2">
            <Label>Resume existing run</Label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
              <div className="md:col-span-2">
                <Input
                  value={resumeId}
                  onChange={(e) => setResumeId(e.target.value)}
                  placeholder="quality_runs.id (UUID)"
                  disabled={running}
                />
              </div>
              <select
                value={resumeTool}
                onChange={(e) => setResumeTool(e.target.value)}
                disabled={running}
                className="h-10 rounded border bg-background px-2 text-sm"
              >
                {TOOLS.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <Button variant="secondary" onClick={resumeRun} disabled={resuming || running}>
              {resuming ? "…" : "Resume"}
            </Button>
            <p className="text-xs text-muted-foreground">
              Sends {"{ tool, resume_run_id }"} to run-quality-batch. Tool must match the row.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Recent runs</CardTitle>
          <Button variant="ghost" size="sm" onClick={refresh} disabled={loading}>
            {loading ? "…" : "Refresh"}
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
                      <>
                        {" · "}completed {new Date(r.completed_at).toLocaleString()}
                      </>
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
