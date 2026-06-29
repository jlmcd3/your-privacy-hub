// QualityLoop.tsx — Prompt Improvement (golden A/B) + Improvement Cycles (v2 framework).
// Route: /admin/quality-loop
//
// TWO surfaces, one per row:
// 1. "Improve prompt" — biometric-only golden-set A/B path (existing).
// 2. "Run improvement cycle" — Quality Loop "Back to Framework v2": reads
//    real sample_reports from the latest static_stress batch, dual-model
//    review (gpt-4o + claude-sonnet), consensus top-10, Team-3-decisive
//    deliberation, re-runs through start-stress-batch, iterates to ≥98%.

import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { ExternalLink, Play, RefreshCw, Sparkles, Zap } from "lucide-react";
import { Link } from "react-router-dom";

const SMOKE_INDUSTRIES = [
  { id: "web", label: "Online & Web Services" },
  { id: "ai",  label: "AI & Machine Learning" },
];
const SMOKE_TOOL_IDS = [
  "biometric-checker","cppa-admt","cppa-risk","cppa-cyber","lia","dpia",
  "governance","dpa-generator","ir-playbook","registration",
];

type SmokeBatch = {
  id: string;
  status: string;
  total_jobs: number;
  completed_jobs: number;
  failed_jobs: number;
  setup_total: number;
  setup_done: number;
} | null;

function SmokeBatchPanel() {
  const [busy, setBusy] = useState(false);
  const [batch, setBatch] = useState<SmokeBatch>(null);
  const pollRef = useRef<number | null>(null);

  const refresh = useCallback(async (id: string) => {
    const { data } = await supabase
      .from("static_stress_batches")
      .select("id, status, total_jobs, completed_jobs, failed_jobs, setup_total, setup_done")
      .eq("id", id)
      .maybeSingle();
    if (data) setBatch(data as SmokeBatch);
  }, []);

  useEffect(() => {
    if (!batch) return;
    const done = batch.status === "complete" || batch.status === "cancelled" || batch.status === "failed";
    if (done) {
      if (pollRef.current) { window.clearInterval(pollRef.current); pollRef.current = null; }
      return;
    }
    if (pollRef.current) return;
    pollRef.current = window.setInterval(() => { refresh(batch.id); }, 15_000);
    return () => {
      if (pollRef.current) { window.clearInterval(pollRef.current); pollRef.current = null; }
    };
  }, [batch, refresh]);

  const start = async () => {
    setBusy(true);
    try {
      const { data: u } = await supabase.auth.getUser();
      const uid = u?.user?.id;
      if (!uid) { toast.error("Sign in first"); return; }
      const { data, error } = await supabase.functions.invoke("start-stress-batch", {
        body: {
          run_by: uid,
          industries: SMOKE_INDUSTRIES,
          geo_filter: "us",
          selected_tools: SMOKE_TOOL_IDS,
        },
      });
      if (error || !data?.batch_id) throw new Error(error?.message ?? "no batch_id");
      toast.success("Smoke batch started.");
      await refresh(data.batch_id);
    } catch (e: any) {
      toast.error(`Start failed: ${e?.message ?? e}`);
    } finally {
      setBusy(false);
    }
  };

  const finished = batch ? (batch.completed_jobs + batch.failed_jobs) : 0;
  const total = batch?.total_jobs ?? 0;
  const cleanRate = total > 0 ? Math.round((batch!.completed_jobs / total) * 100) : null;
  const setupPct = batch && batch.setup_total > 0
    ? Math.round((batch.setup_done / batch.setup_total) * 100) : 0;

  return (
    <div className="border border-sky-200 rounded-xl bg-sky-50/50 px-5 py-4 mb-4">
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex-1 min-w-[220px]">
          <div className="text-sm font-semibold text-[#0c2a44] flex items-center gap-1.5">
            <Zap className="w-4 h-4 text-sky-700" />
            Smoke batch (2 industries × US × all tools)
          </div>
          <div className="text-xs text-gray-600 mt-0.5">
            Quickly validates clean-rate against the static-stress pipeline before kicking a full improvement cycle.
          </div>
        </div>
        <Button onClick={start} disabled={busy} variant="outline" className="h-9 border-sky-300">
          {busy ? <><RefreshCw className="w-3.5 h-3.5 mr-1.5 animate-spin" />Starting…</> : "Run static-stress smoke batch"}
        </Button>
      </div>
      {batch && (
        <div className="mt-3 text-sm text-gray-700 flex flex-wrap items-center gap-x-4 gap-y-1">
          <span>Batch <code className="font-mono text-xs">{batch.id.slice(0, 8)}</code></span>
          <span>Status: <strong>{batch.status}</strong></span>
          {batch.setup_total > 0 && batch.setup_done < batch.setup_total && (
            <span>Setup: {batch.setup_done}/{batch.setup_total} ({setupPct}%)</span>
          )}
          {total > 0 && (
            <>
              <span>Jobs: {finished}/{total}</span>
              <span>Failed: <strong className={batch.failed_jobs ? "text-red-700" : ""}>{batch.failed_jobs}</strong></span>
              <span>Clean rate: <strong className={cleanRate != null && cleanRate >= 95 ? "text-emerald-700" : "text-amber-700"}>{cleanRate}%</strong></span>
            </>
          )}
          <Link to="/admin/static-stress" className="text-sky-700 underline inline-flex items-center gap-1">
            Open static-stress <ExternalLink className="w-3 h-3" />
          </Link>
        </div>
      )}
    </div>
  );
}

type ToolDef = { id: string; label: string; sampleSlug: string };

const TOOLS: ToolDef[] = [
  { id: "biometric-checker", label: "Biometric Checker",         sampleSlug: "biometric" },
  { id: "cppa-admt",         label: "CPPA ADMT Assessment",      sampleSlug: "cppa_admt" },
  { id: "cppa-risk",         label: "CPPA Risk Assessment",      sampleSlug: "cppa_risk" },
  { id: "cppa-cyber",        label: "CPPA Cybersecurity Audit",  sampleSlug: "cppa_cyber" },
  { id: "lia",               label: "LIA Tool",                  sampleSlug: "li_assessment" },
  { id: "dpia",              label: "Impact Assessment Builder", sampleSlug: "dpia" },
  { id: "governance",        label: "Governance Assessment",     sampleSlug: "governance" },
  { id: "dpa-generator",     label: "DPA Generator",             sampleSlug: "dpa" },
  { id: "ir-playbook",       label: "IR Playbook",               sampleSlug: "ir_playbook" },
  { id: "registration",      label: "Registration Manager",      sampleSlug: "registration" },
];

const TOOLS_WITH_GOLDEN = new Set(["biometric-checker"]);

const GITHUB_OWNER = "jlmcd3";
const GITHUB_REPO  = "your-privacy-hub";
const DIFF_URL = `https://github.com/${GITHUB_OWNER}/${GITHUB_REPO}/compare/main...quality-auto?expand=1`;

type PassRate = { passed: number; total: number } | null;
type GoldenResult = {
  status: "improved" | "already_passing" | "no_improvement" | "regression" | "error" | "no_golden_set" | "no_proposal" | "gpt_disagrees" | "patch_too_short" | "stage_failed";
  message: string;
  delta?: number;
  commit_url?: string;
  proposed_edit?: string;
  rationale?: string;
} | null;

type Cycle = {
  id: string;
  tool_slug: string;
  status: string;
  phase: string;
  iteration: number;
  max_iterations: number;
  target_score: number;
  baseline_score: number | null;
  current_score: number | null;
  top_changes: any[];
  score_history: any[];
  excluded_rows: any[];
  log: Array<{ ts: string; msg: string }>;
  last_error: string | null;
  started_at: string;
  completed_at: string | null;
};

function GoldenResultLine({ r }: { r: GoldenResult }) {
  if (!r) return null;
  if (r.status === "improved") {
    return (
      <div className="text-sm text-emerald-700 flex items-center gap-2 flex-wrap">
        ✓ Improved: <strong>+{r.delta ?? 0}</strong>, staged to <code className="font-mono text-xs bg-emerald-50 border border-emerald-200 rounded px-1.5 py-0.5">quality-auto</code>.
        {r.commit_url && (
          <a href={r.commit_url} target="_blank" rel="noopener noreferrer" className="text-emerald-700 underline inline-flex items-center gap-1">
            View commit <ExternalLink className="w-3 h-3" />
          </a>
        )}
        <a href={DIFF_URL} target="_blank" rel="noopener noreferrer" className="text-emerald-700 underline inline-flex items-center gap-1">
          Promote to main <ExternalLink className="w-3 h-3" />
        </a>
      </div>
    );
  }
  if (r.status === "already_passing") return <div className="text-sm text-gray-600">Already passing.</div>;
  if (r.status === "no_golden_set") return <div className="text-sm text-gray-500">Add golden cases to enable.</div>;
  if (r.status === "error") return <div className="text-sm text-red-700">Error: {r.message}</div>;
  return <div className="text-sm text-amber-700">No improvement ({r.status.replace(/_/g, " ")}).</div>;
}

function CycleLine({ c }: { c: Cycle | null }) {
  if (!c) return <div className="text-sm text-gray-500">No active cycle.</div>;
  const score = c.current_score ?? c.baseline_score;
  const baseline = c.baseline_score;
  if (c.status === "complete") {
    const reached = score != null && score >= c.target_score;
    return (
      <div className={`text-sm ${reached ? "text-emerald-700" : "text-amber-700"} flex flex-wrap items-center gap-2`}>
        {reached
          ? <>✓ {c.target_score}% reached — {c.top_changes?.length ?? 0} change(s) staged</>
          : <>Stopped at {score ?? "—"}% (target {c.target_score}%)</>}
        <a href={DIFF_URL} target="_blank" rel="noopener noreferrer" className="underline inline-flex items-center gap-1">
          View diff <ExternalLink className="w-3 h-3" />
        </a>
        <a href={DIFF_URL} target="_blank" rel="noopener noreferrer" className="underline inline-flex items-center gap-1">
          Promote to main <ExternalLink className="w-3 h-3" />
        </a>
      </div>
    );
  }
  if (c.status === "failed") {
    return <div className="text-sm text-red-700">Failed: {c.last_error ?? "(no detail)"}</div>;
  }
  const arrow = baseline != null && score != null && score !== baseline ? ` · ${baseline}%→${score}%` : "";
  return (
    <div className="text-sm text-sky-700 flex items-center gap-2">
      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
      iteration {c.iteration}/{c.max_iterations}{arrow} · phase: {c.phase}
    </div>
  );
}

function ToolRow({ tool }: { tool: ToolDef }) {
  const hasGolden = TOOLS_WITH_GOLDEN.has(tool.id);
  const [rate, setRate] = useState<PassRate>(null);
  const [busyGolden, setBusyGolden] = useState(false);
  const [goldenResult, setGoldenResult] = useState<GoldenResult>(null);

  const [cycle, setCycle] = useState<Cycle | null>(null);
  const [busyCycle, setBusyCycle] = useState(false);
  const cyclePollRef = useRef<number | null>(null);

  const loadRate = useCallback(async () => {
    if (!hasGolden) return;
    const { data } = await supabase
      .from("golden_results")
      .select("case_id, assertions_total, assertions_passed, created_at")
      .eq("tool", tool.id)
      .eq("variant", "baseline")
      .order("created_at", { ascending: false })
      .limit(200);
    if (!data?.length) { setRate(null); return; }
    const seen = new Set<string>();
    let passed = 0, total = 0;
    for (const row of data) {
      if (seen.has(row.case_id)) continue;
      seen.add(row.case_id);
      passed += row.assertions_passed ?? 0;
      total += row.assertions_total ?? 0;
    }
    setRate({ passed, total });
  }, [tool.id, hasGolden]);

  const loadCycle = useCallback(async () => {
    const { data } = await supabase
      .from("tool_improvement_cycles")
      .select("*")
      .eq("tool_slug", tool.sampleSlug)
      .order("started_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    setCycle((data as unknown as Cycle | null) ?? null);
  }, [tool.sampleSlug]);

  useEffect(() => { loadRate(); loadCycle(); }, [loadRate, loadCycle]);

  // Poll active cycle every 60s
  useEffect(() => {
    if (!cycle || cycle.status === "complete" || cycle.status === "failed" || cycle.status === "cancelled") {
      if (cyclePollRef.current) { window.clearInterval(cyclePollRef.current); cyclePollRef.current = null; }
      return;
    }
    if (cyclePollRef.current) return;
    cyclePollRef.current = window.setInterval(() => { loadCycle(); }, 60_000);
    return () => {
      if (cyclePollRef.current) { window.clearInterval(cyclePollRef.current); cyclePollRef.current = null; }
    };
  }, [cycle, loadCycle]);

  const improveGolden = async () => {
    setBusyGolden(true);
    setGoldenResult(null);
    try {
      const { pollJob } = await import("@/lib/pollJob");
      const { data: kickoff, error: kickErr } = await supabase.functions.invoke("improve-prompt", { body: { tool: tool.id } });
      if (kickErr) throw kickErr;
      // Backwards-compat: if function returned a final result synchronously (e.g. no_golden_set), handle it.
      if (kickoff && !kickoff.job_id && (kickoff.status === "no_golden_set" || kickoff.improved !== undefined || kickoff.reason)) {
        applyImproveResult(kickoff);
      } else if (kickoff?.job_id) {
        setGoldenResult({ status: "queued" as any, message: "running… this can take several minutes" });
        const row = await pollJob("improve-prompt", kickoff.job_id, {
          intervalMs: 5000,
          timeoutMs: 25 * 60_000,
          onProgress: (r) => {
            if (r.progress) setGoldenResult({ status: "queued" as any, message: `step: ${r.progress}` });
          },
        });
        if (row.status === "error") throw new Error(row.error ?? "background_error");
        applyImproveResult(row.result ?? {});
      } else {
        applyImproveResult(kickoff ?? {});
      }
      await loadRate();
    } catch (e: any) {
      setGoldenResult({ status: "error", message: e?.message ?? String(e) });
      toast.error(`Improve failed: ${e?.message ?? e}`);
    } finally {
      setBusyGolden(false);
    }
  };

  const applyImproveResult = (data: any) => {
    if (data?.status === "no_golden_set") {
      setGoldenResult({ status: "no_golden_set", message: "no golden set" });
    } else if (data?.improved) {
      setGoldenResult({ status: "improved", message: "improved", delta: data.delta, commit_url: data.commit_url, proposed_edit: data.proposed_edit, rationale: data.rationale });
      toast.success(`+${data.delta} staged to quality-auto.`);
    } else if (data?.reason === "already_passing") {
      setGoldenResult({ status: "already_passing", message: "already_passing" });
    } else {
      setGoldenResult({ status: (data?.reason as GoldenResult["status"]) ?? "no_improvement", message: data?.reason ?? "no_improvement", proposed_edit: data?.proposed_edit, rationale: data?.rationale });
    }
  };

  const startCycle = async () => {
    setBusyCycle(true);
    try {
      const { data, error } = await supabase.functions.invoke("improve-tool-quality", { body: { tool_slug: tool.sampleSlug } });
      if (error) throw error;
      if (data?.cycle_id) {
        toast.success("Improvement cycle started.");
        await loadCycle();
      } else {
        toast.error("Cycle did not start.");
      }
    } catch (e: any) {
      toast.error(`Start failed: ${e?.message ?? e}`);
    } finally {
      setBusyCycle(false);
    }
  };

  const cycleScore = cycle?.current_score ?? cycle?.baseline_score;
  const cycleRunning = cycle && cycle.status !== "complete" && cycle.status !== "failed" && cycle.status !== "cancelled";

  return (
    <div className="border border-gray-200 rounded-xl bg-white px-5 py-4 space-y-3">
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex-1 min-w-[180px]">
          <div className="text-sm font-semibold text-[#0c2a44]">{tool.label}</div>
          <div className="text-xs text-gray-500 mt-0.5 flex flex-wrap gap-3">
            {hasGolden && (
              <span>Golden: {rate ? <span className="font-semibold">{rate.passed}/{rate.total}</span> : "—"}</span>
            )}
            <span>Cycle score: {cycleScore != null ? <span className="font-semibold">{cycleScore}%</span> : "—"}</span>
          </div>
        </div>
        <Button onClick={improveGolden} disabled={busyGolden || !hasGolden} variant="outline" className="h-9">
          {busyGolden ? <><RefreshCw className="w-3.5 h-3.5 mr-1.5 animate-spin" />Improving…</> : "Improve prompt (golden)"}
        </Button>
        <Button onClick={startCycle} disabled={busyCycle || !!cycleRunning} className="bg-[#0c2a44] hover:bg-[#1a3a5c] text-white h-9">
          {busyCycle
            ? <><RefreshCw className="w-3.5 h-3.5 mr-1.5 animate-spin" />Starting…</>
            : cycleRunning
              ? <>Cycle running…</>
              : <><Sparkles className="w-3.5 h-3.5 mr-1.5" />Run improvement cycle</>}
        </Button>
      </div>

      <div>
        <GoldenResultLine r={goldenResult} />
        <div className="mt-1"><CycleLine c={cycle} /></div>
      </div>

      {cycle && (cycle.top_changes?.length || cycle.excluded_rows?.length || cycle.log?.length) ? (
        <details className="text-xs">
          <summary className="cursor-pointer text-gray-500 hover:text-gray-700">Details</summary>
          {cycle.score_history?.length > 0 && (
            <div className="mt-2">
              <div className="font-semibold text-gray-600">Score by iteration</div>
              <div className="font-mono text-[11px] text-gray-700">
                {cycle.score_history.map((h: any, i: number) => `i${h.iteration}=${h.score}%`).join(" → ")}
              </div>
            </div>
          )}
          {cycle.top_changes?.length > 0 && (
            <div className="mt-2">
              <div className="font-semibold text-gray-600">Top consensus changes (this iteration)</div>
              <ul className="mt-1 space-y-1">
                {cycle.top_changes.slice(0, 10).map((c: any, i: number) => (
                  <li key={i} className="border border-gray-100 rounded p-2 bg-slate-50">
                    <div className="font-mono text-[11px] text-gray-500">{c.location || "—"} · ×{c.frequency}</div>
                    <div className="text-gray-700"><strong>Problem:</strong> {c.problem}</div>
                    <div className="text-gray-700"><strong>Fix:</strong> {c.fix}</div>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {cycle.excluded_rows?.length > 0 && (
            <div className="mt-2">
              <div className="font-semibold text-gray-600">Fixture-drift exclusions ({cycle.excluded_rows.length})</div>
              <ul className="mt-1 font-mono text-[11px] text-gray-600">
                {cycle.excluded_rows.slice(0, 10).map((e: any, i: number) => (
                  <li key={i}>{String(e.report_id ?? "").slice(0, 8)} — {e.reason}</li>
                ))}
              </ul>
            </div>
          )}
          {cycle.log?.length > 0 && (
            <div className="mt-2">
              <div className="font-semibold text-gray-600">Log</div>
              <pre className="bg-slate-50 border border-slate-100 rounded p-2 mt-1 max-h-48 overflow-auto text-[11px]">
{cycle.log.slice(-30).map(l => `[${new Date(l.ts).toLocaleTimeString()}] ${l.msg}`).join("\n")}
              </pre>
            </div>
          )}
        </details>
      ) : null}
    </div>
  );
}

type CycleRow = {
  id: string;
  tool_slug: string;
  status: string;
  phase: string | null;
  iteration: number | null;
  current_score: number | null;
  baseline_score: number | null;
  started_at: string;
  updated_at: string | null;
  completed_at: string | null;
};

function fmtDuration(ms: number): string {
  if (ms < 0 || !Number.isFinite(ms)) return "—";
  const s = Math.floor(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ${s % 60}s`;
  const h = Math.floor(m / 60);
  return `${h}h ${m % 60}m`;
}

function fmtRelative(iso: string | null): string {
  if (!iso) return "—";
  const ms = Date.now() - new Date(iso).getTime();
  if (ms < 0) return "just now";
  const s = Math.floor(ms / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function statusPillClasses(status: string): string {
  switch (status) {
    case "running":   return "bg-blue-50 text-blue-700 border-blue-200";
    case "complete":  return "bg-green-50 text-green-700 border-green-200";
    case "failed":    return "bg-red-50 text-red-700 border-red-200";
    case "cancelled": return "bg-gray-100 text-gray-600 border-gray-200";
    default:          return "bg-slate-50 text-slate-700 border-slate-200";
  }
}

type QueueItem = { id: string; slug: string; label: string; state: "pending" | "running" | "done" | "failed"; cycleId?: string; error?: string };

function BatchRunnerPanel() {
  const ACTIVE_STATUSES = new Set(["running", "queued", "pending"]);
  const [selected, setSelected] = useState<Set<string>>(() => new Set(TOOLS.map(t => t.id)));
  const [concurrency, setConcurrency] = useState<number>(2);
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [running, setRunning] = useState(false);
  const runningRef = useRef(false);
  const queueRef = useRef<QueueItem[]>([]);
  useEffect(() => { queueRef.current = queue; }, [queue]);

  const toggle = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const updateItem = (id: string, patch: Partial<QueueItem>) => {
    setQueue(q => q.map(it => it.id === id ? { ...it, ...patch } : it));
  };

  const fetchActiveSlugs = async (): Promise<Set<string>> => {
    const { data } = await supabase
      .from("tool_improvement_cycles")
      .select("tool_slug, status")
      .in("status", Array.from(ACTIVE_STATUSES))
      .limit(100);
    return new Set((data ?? []).map((r: any) => r.tool_slug as string));
  };

  const isCycleDone = async (cycleId: string): Promise<{ done: boolean; status: string; error?: string }> => {
    const { data } = await supabase
      .from("tool_improvement_cycles")
      .select("status, last_error")
      .eq("id", cycleId)
      .maybeSingle();
    const status = (data as any)?.status ?? "unknown";
    const done = status === "complete" || status === "failed" || status === "cancelled";
    return { done, status, error: (data as any)?.last_error };
  };

  const startNext = async (): Promise<boolean> => {
    const next = queueRef.current.find(it => it.state === "pending");
    if (!next) return false;
    // Per-slug guard: don't start if another cycle for the same slug is already active.
    const active = await fetchActiveSlugs();
    if (active.has(next.slug)) {
      updateItem(next.id, { state: "failed", error: "slug already running" });
      return true; // count this as 'handled' so loop continues
    }
    try {
      const { data, error } = await supabase.functions.invoke("improve-tool-quality", { body: { tool_slug: next.slug } });
      if (error) throw error;
      const cycleId = data?.cycle_id;
      if (!cycleId) throw new Error("no cycle_id returned");
      updateItem(next.id, { state: "running", cycleId });
      return true;
    } catch (e: any) {
      updateItem(next.id, { state: "failed", error: e?.message ?? String(e) });
      return true;
    }
  };

  const runLoop = async () => {
    if (runningRef.current) return;
    runningRef.current = true;
    setRunning(true);
    try {
      // Fill up to concurrency
      while (true) {
        const q = queueRef.current;
        if (!q.some(it => it.state === "pending" || it.state === "running")) break;
        const runningCount = q.filter(it => it.state === "running").length;
        if (runningCount < concurrency) {
          const started = await startNext();
          if (started) continue;
        }
        // Poll currently running for completion
        const running = queueRef.current.filter(it => it.state === "running" && it.cycleId);
        if (running.length === 0) {
          // Nothing running and nothing to start (failed-only remaining) — exit
          if (!queueRef.current.some(it => it.state === "pending")) break;
        }
        await Promise.all(running.map(async (it) => {
          const { done, status, error } = await isCycleDone(it.cycleId!);
          if (done) {
            updateItem(it.id, { state: status === "complete" ? "done" : "failed", error });
          }
        }));
        await new Promise(r => setTimeout(r, 15_000));
      }
      toast.success("Batch finished.");
    } finally {
      runningRef.current = false;
      setRunning(false);
    }
  };

  const startBatch = () => {
    if (running) { toast.message("Batch already running."); return; }
    const items: QueueItem[] = TOOLS
      .filter(t => selected.has(t.id))
      .map(t => ({ id: `${t.id}-${Math.random().toString(36).slice(2, 8)}`, slug: t.sampleSlug, label: t.label, state: "pending" }));
    if (items.length === 0) { toast.error("Select at least one tool."); return; }
    setQueue(items);
    // give state a tick to propagate
    setTimeout(() => { runLoop(); }, 0);
  };

  const cancelPending = () => {
    setQueue(q => q.map(it => it.state === "pending" ? { ...it, state: "failed", error: "cancelled" } : it));
  };

  const counts = {
    pending: queue.filter(it => it.state === "pending").length,
    running: queue.filter(it => it.state === "running").length,
    done: queue.filter(it => it.state === "done").length,
    failed: queue.filter(it => it.state === "failed").length,
  };

  return (
    <div className="border border-amber-200 rounded-xl bg-amber-50/40 px-5 py-4 mb-4">
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex-1 min-w-[220px]">
          <div className="text-sm font-semibold text-[#0c2a44] flex items-center gap-1.5">
            <Play className="w-4 h-4 text-amber-700" />
            Run next batch
          </div>
          <div className="text-xs text-gray-600 mt-0.5">
            Starts improvement cycles across the selected tools, capping the number running at the same time to avoid AI Gateway rate limits.
          </div>
        </div>
        <label className="text-xs text-gray-700 flex items-center gap-2">
          Concurrency
          <select
            value={concurrency}
            onChange={(e) => setConcurrency(parseInt(e.target.value, 10))}
            disabled={running}
            className="border border-amber-300 rounded px-2 py-1 bg-white text-xs"
          >
            {[1, 2, 3, 4, 5].map(n => <option key={n} value={n}>{n}</option>)}
          </select>
        </label>
        <Button onClick={startBatch} disabled={running || selected.size === 0} className="bg-amber-700 hover:bg-amber-800 text-white h-9">
          {running ? <><RefreshCw className="w-3.5 h-3.5 mr-1.5 animate-spin" />Running…</> : <><Play className="w-3.5 h-3.5 mr-1.5" />Start batch ({selected.size})</>}
        </Button>
        {running && counts.pending > 0 && (
          <Button onClick={cancelPending} variant="outline" className="h-9 text-xs">Cancel pending</Button>
        )}
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {TOOLS.map(t => {
          const on = selected.has(t.id);
          return (
            <button
              key={t.id}
              type="button"
              disabled={running}
              onClick={() => toggle(t.id)}
              className={`px-2.5 py-1 rounded-full border text-[11px] transition ${
                on
                  ? "bg-[#0c2a44] text-white border-[#0c2a44]"
                  : "bg-white text-gray-600 border-gray-300 hover:border-gray-400"
              } ${running ? "opacity-60 cursor-not-allowed" : ""}`}
            >
              {t.label}
            </button>
          );
        })}
      </div>

      {queue.length > 0 && (
        <div className="mt-3 text-xs text-gray-700">
          <div className="mb-1">
            Queue: {counts.running} running · {counts.pending} pending · {counts.done} done · {counts.failed} failed
          </div>
          <ul className="space-y-1">
            {queue.map(it => (
              <li key={it.id} className="flex items-center justify-between border border-amber-100 rounded bg-white px-2 py-1">
                <span className="font-mono text-[11px] text-[#0c2a44]">{it.slug}</span>
                <span className="flex items-center gap-2">
                  {it.state === "running" && <RefreshCw className="w-3 h-3 animate-spin text-sky-700" />}
                  <span className={`text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded border ${
                    it.state === "done" ? "bg-green-50 text-green-700 border-green-200"
                    : it.state === "failed" ? "bg-red-50 text-red-700 border-red-200"
                    : it.state === "running" ? "bg-blue-50 text-blue-700 border-blue-200"
                    : "bg-slate-50 text-slate-600 border-slate-200"
                  }`}>{it.state}</span>
                  {it.error && <span className="text-[10px] text-red-600 truncate max-w-[200px]" title={it.error}>{it.error}</span>}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function ActiveCyclesTable() {
  const [rows, setRows] = useState<CycleRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [, force] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await supabase
        .from("tool_improvement_cycles")
        .select("id, tool_slug, status, phase, iteration, current_score, baseline_score, started_at, updated_at, completed_at")
        .order("started_at", { ascending: false })
        .limit(25);
      setRows((data as CycleRow[] | null) ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Refresh data every 30s; tick clock every 15s for relative times.
  useEffect(() => {
    const reload = window.setInterval(load, 30_000);
    const tick = window.setInterval(() => force(x => x + 1), 15_000);
    return () => { window.clearInterval(reload); window.clearInterval(tick); };
  }, [load]);

  const activeCount = rows.filter(r => r.status === "running").length;

  return (
    <div className="border border-gray-200 rounded-xl bg-white px-5 py-4 my-4">
      <div className="flex items-center justify-between mb-3">
        <div>
          <div className="text-sm font-semibold text-[#0c2a44]">Improvement cycles</div>
          <div className="text-xs text-gray-500">
            {activeCount} active · {rows.length} recent
          </div>
        </div>
        <Button onClick={load} disabled={loading} variant="outline" className="h-8 text-xs">
          {loading ? <><RefreshCw className="w-3 h-3 mr-1 animate-spin" />Loading</> : <><RefreshCw className="w-3 h-3 mr-1" />Refresh</>}
        </Button>
      </div>
      {rows.length === 0 ? (
        <div className="text-xs text-gray-500 py-4 text-center">No cycles yet.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-left text-gray-500 border-b border-gray-100">
                <th className="py-2 pr-3 font-medium">Tool</th>
                <th className="py-2 pr-3 font-medium">Status</th>
                <th className="py-2 pr-3 font-medium">Phase</th>
                <th className="py-2 pr-3 font-medium">Iter</th>
                <th className="py-2 pr-3 font-medium">Score</th>
                <th className="py-2 pr-3 font-medium">Started</th>
                <th className="py-2 pr-3 font-medium">Duration</th>
                <th className="py-2 pr-3 font-medium">Last activity</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(r => {
                const start = new Date(r.started_at).getTime();
                const end = r.completed_at ? new Date(r.completed_at).getTime() : Date.now();
                const score = r.current_score ?? r.baseline_score;
                return (
                  <tr key={r.id} className="border-b border-gray-50 last:border-0">
                    <td className="py-2 pr-3 font-mono text-[11px] text-[#0c2a44]">{r.tool_slug}</td>
                    <td className="py-2 pr-3">
                      <span className={`inline-block px-2 py-0.5 rounded border text-[10px] uppercase tracking-wide ${statusPillClasses(r.status)}`}>
                        {r.status}
                      </span>
                    </td>
                    <td className="py-2 pr-3 text-gray-700">{r.phase ?? "—"}</td>
                    <td className="py-2 pr-3 text-gray-700">{r.iteration ?? 0}</td>
                    <td className="py-2 pr-3 text-gray-700">{score != null ? `${score}%` : "—"}</td>
                    <td className="py-2 pr-3 text-gray-600" title={r.started_at}>{fmtRelative(r.started_at)}</td>
                    <td className="py-2 pr-3 text-gray-600">{fmtDuration(end - start)}</td>
                    <td className="py-2 pr-3 text-gray-600" title={r.updated_at ?? ""}>{fmtRelative(r.updated_at)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default function QualityLoop() {
  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-[#0c2a44]">Prompt Improvement</h1>
          <p className="text-gray-500 mt-1 text-sm max-w-2xl">
            Each tool has two paths. <strong>Improve prompt (golden)</strong> A/B-tests a single
            minimal edit against the tool's golden set (biometric only today). <strong>Run improvement cycle</strong>
            reads the latest <code>static-stress</code> batch, runs dual-model review (gpt-4o + claude-sonnet),
            asks Team 3 (Legal) to decide on the top-10 agreed changes, re-runs through the stress orchestrator,
            and iterates to ≥98%. Both stage edits to <code className="font-mono">quality-auto</code> for human merge.
          </p>
        </div>
        <SmokeBatchPanel />
        <ActiveCyclesTable />
        <div className="space-y-3">
          {TOOLS.map(t => <ToolRow key={t.id} tool={t} />)}
        </div>
        <div className="mt-6 text-xs text-gray-500">
          <a href={DIFF_URL} target="_blank" rel="noopener noreferrer" className="text-blue-700 underline inline-flex items-center gap-1">
            Open quality-auto → main compare <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>
    </div>
  );
}
