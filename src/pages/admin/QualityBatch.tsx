// QualityBatch — admin console for run-quality-batch.
//
// Mirrors QualityLoop3.tsx structure (same auth model via AdminOnly wrapper in
// App.tsx, same 8s polling pattern). Additive to /admin/quality-loop2 — that
// page is untouched.

import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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

const TERMINAL_STATUSES = new Set(["complete", "completed", "done", "error", "failed", "cancelled", "canceled"]);
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

export default function QualityBatch() {
  const [tool, setTool] = useState<string>("governance");
  const [batchSize, setBatchSize] = useState<number>(5);
  const [starting, setStarting] = useState(false);
  const [resumeId, setResumeId] = useState("");
  const [resuming, setResuming] = useState(false);
  const [runs, setRuns] = useState<QRun[]>([]);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  async function refresh() {
    setLoading(true);
    const { data, error } = await supabase
      .from("quality_runs")
      .select(SELECT_COLS)
      .order("started_at", { ascending: false })
      .limit(20);
    setLoading(false);
    if (error) {
      toast.error(`Load failed: ${error.message}`);
      return;
    }
    setRuns((data as any) ?? []);
  }

  const anyActive = useMemo(() => runs.some((r) => !isTerminal(r.status)), [runs]);
  useEffect(() => {
    refresh();
  }, []);
  useEffect(() => {
    // Poll while there are non-terminal rows OR any panel is expanded (log updates).
    if (!anyActive && expanded.size === 0) return;
    const t = setInterval(refresh, 8000);
    return () => clearInterval(t);
  }, [anyActive, expanded.size]);

  async function startBatch() {
    setStarting(true);
    try {
      const { data, error } = await supabase.functions.invoke("run-quality-batch", {
        body: { tool, batch_size: batchSize },
      });
      if (error) throw error;
      const d = (data as any) ?? {};
      toast.success(`Batch started: run ${d.run_number ?? "?"} · ${d.run_id ?? "ok"}`);
      refresh();
    } catch (e: any) {
      const msg = e?.context?.body ?? e?.message ?? String(e);
      toast.error(`Kickoff failed: ${typeof msg === "string" ? msg : JSON.stringify(msg)}`);
    } finally {
      setStarting(false);
    }
  }

  async function resumeRun() {
    if (!resumeId.trim()) {
      toast.error("resume_run_id required");
      return;
    }
    setResuming(true);
    try {
      const { data, error } = await supabase.functions.invoke("run-quality-batch", {
        body: { tool, resume_run_id: resumeId.trim() },
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

  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      <div className="flex items-baseline justify-between">
        <h1 className="text-3xl font-serif text-foreground">Quality Batch</h1>
        <span className="text-xs text-muted-foreground font-mono">run-quality-batch</span>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Start a new batch</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Tool</Label>
              <Select value={tool} onValueChange={setTool}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TOOLS.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Batch size</Label>
              <Input
                type="number"
                min={1}
                max={50}
                value={batchSize}
                onChange={(e) => setBatchSize(Math.max(1, Number(e.target.value) || 1))}
              />
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button onClick={startBatch} disabled={starting}>
              {starting ? "Starting…" : "Start batch"}
            </Button>
          </div>

          <div className="pt-2 border-t space-y-2">
            <Label>Resume existing run</Label>
            <div className="flex gap-2">
              <Input
                value={resumeId}
                onChange={(e) => setResumeId(e.target.value)}
                placeholder="quality_runs.id (UUID)"
              />
              <Button variant="secondary" onClick={resumeRun} disabled={resuming}>
                {resuming ? "…" : "Resume"}
              </Button>
            </div>
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
