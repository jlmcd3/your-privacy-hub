// QualityLoop.tsx — Simplified admin UI.
// Route: /admin/quality-loop
//
// Three sections, in order:
//   1. Now Running   — live status of in-flight cycles + improve-prompt jobs.
//   2. Recent Activity — completions, prompt updates, failures (combined feed).
//   3. Run             — per-tool start buttons + optional batch runner.

import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  CheckCircle2,
  ExternalLink,
  GitCommit,
  Loader2,
  Play,
  RefreshCw,
  XCircle,
} from "lucide-react";
import { Link } from "react-router-dom";

const TOOLS = [
  { id: "biometric-checker", label: "Biometric Checker",         slug: "biometric" },
  { id: "cppa-admt",         label: "CPPA ADMT Assessment",      slug: "cppa_admt" },
  { id: "cppa-risk",         label: "CPPA Risk Assessment",      slug: "cppa_risk" },
  { id: "cppa-cyber",        label: "CPPA Cybersecurity Audit",  slug: "cppa_cyber" },
  { id: "lia",               label: "LIA Tool",                  slug: "li_assessment" },
  { id: "dpia",              label: "Impact Assessment Builder", slug: "dpia" },
  { id: "governance",        label: "Governance Assessment",     slug: "governance" },
  { id: "dpa-generator",     label: "DPA Generator",             slug: "dpa" },
  { id: "ir-playbook",       label: "IR Playbook",               slug: "ir_playbook" },
  { id: "registration",      label: "Registration Manager",      slug: "registration" },
] as const;

const SLUG_TO_LABEL = Object.fromEntries(TOOLS.map(t => [t.slug, t.label])) as Record<string, string>;
const TOOLS_WITH_GOLDEN = new Set(["biometric-checker"]);

const GITHUB_OWNER = "jlmcd3";
const GITHUB_REPO  = "your-privacy-hub";
const DIFF_URL = `https://github.com/${GITHUB_OWNER}/${GITHUB_REPO}/compare/main...quality-auto?expand=1`;

// ──────────────────────────────────────────────────────────────────
// Helpers

function fmtRelative(iso: string | null | undefined): string {
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

function fmtDuration(startIso: string, endIso?: string | null): string {
  const ms = (endIso ? new Date(endIso).getTime() : Date.now()) - new Date(startIso).getTime();
  if (ms < 0 || !Number.isFinite(ms)) return "—";
  const s = Math.floor(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ${s % 60}s`;
  return `${Math.floor(m / 60)}h ${m % 60}m`;
}

// ──────────────────────────────────────────────────────────────────
// CycleLogViewer — scrollable log with show-all toggle

function CycleLogViewer({ entries }: { entries: Array<{ ts: string; msg: string }> }) {
  const [expanded, setExpanded] = useState(false);
  if (!entries || entries.length === 0) {
    return <div className="text-[11px] text-gray-400 mt-1 italic">No log entries yet.</div>;
  }
  const visible = expanded ? entries : entries.slice(-8);
  return (
    <div className="mt-2 border border-gray-200 rounded bg-gray-900 text-gray-100 font-mono text-[11px] overflow-hidden">
      <div className="max-h-64 overflow-y-auto p-2 space-y-0.5">
        {visible.map((e, i) => (
          <div key={i} className="whitespace-pre-wrap break-words">
            <span className="text-gray-500">[{new Date(e.ts).toLocaleTimeString()}]</span>{" "}
            <span>{e.msg}</span>
          </div>
        ))}
      </div>
      {entries.length > 8 && (
        <button
          onClick={() => setExpanded(x => !x)}
          className="w-full text-[10px] uppercase tracking-wide text-gray-300 bg-gray-800 hover:bg-gray-700 py-1 border-t border-gray-700"
        >
          {expanded ? `Collapse (showing all ${entries.length})` : `Show all ${entries.length} entries (showing last 8)`}
        </button>
      )}
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────
// Now Running

type LiveCycle = {
  id: string;
  tool_slug: string;
  status: string;
  phase: string | null;
  iteration: number | null;
  max_iterations: number | null;
  current_score: number | null;
  baseline_score: number | null;
  started_at: string;
  updated_at: string | null;
  log: Array<{ ts: string; msg: string }> | null;
};

type LiveJob = {
  id: string;
  kind: string;
  tool: string | null;
  status: string;
  progress: string | null;
  started_at: string;
};

function NowRunning() {
  const [cycles, setCycles] = useState<LiveCycle[]>([]);
  const [jobs, setJobs] = useState<LiveJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [, tick] = useState(0);

  const load = useCallback(async () => {
    const [c, j] = await Promise.all([
      supabase
        .from("tool_improvement_cycles")
        .select("id, tool_slug, status, phase, iteration, max_iterations, current_score, baseline_score, started_at, updated_at, log")
        .in("status", ["pending", "running"])
        .order("started_at", { ascending: false })
        .limit(20),
      supabase
        .from("long_running_jobs")
        .select("id, kind, tool, status, progress, started_at")
        .in("status", ["pending", "running"])
        .order("started_at", { ascending: false })
        .limit(20),
    ]);
    setCycles((c.data as LiveCycle[]) ?? []);
    setJobs((j.data as LiveJob[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
    const r = window.setInterval(load, 10_000);
    const t = window.setInterval(() => tick(x => x + 1), 5_000);
    return () => { window.clearInterval(r); window.clearInterval(t); };
  }, [load]);

  const isEmpty = cycles.length === 0 && jobs.length === 0;

  return (
    <section className="border border-gray-200 rounded-xl bg-white p-5 mb-4">
      <header className="flex items-center justify-between mb-3">
        <div>
          <h2 className="text-base font-semibold text-[#0c2a44] flex items-center gap-2">
            <span className={`inline-block w-2 h-2 rounded-full ${isEmpty ? "bg-gray-300" : "bg-emerald-500 animate-pulse"}`} />
            Now running
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">
            {isEmpty ? "Nothing is running. Everything is idle." : `${cycles.length + jobs.length} active`}
          </p>
        </div>
        {loading && <RefreshCw className="w-3 h-3 text-gray-400 animate-spin" aria-label="loading" />}
      </header>

      {isEmpty ? (
        <div className="text-sm text-gray-500 text-center py-6">
          No assessments or prompt updates in progress.
        </div>
      ) : (
        <ul className="space-y-3">
          {cycles.map(c => {
            const score = c.current_score ?? c.baseline_score;
            const logEntries = Array.isArray(c.log) ? c.log : [];
            const cancel = async () => {
              if (!confirm("Cancel this improvement cycle? It will stop at the next phase boundary.")) return;
              const { error } = await supabase
                .from("tool_improvement_cycles")
                .update({ cancel_requested: true } as any)
                .eq("id", c.id);
              if (error) toast.error("Cancel failed", { description: error.message });
              else { toast.success("Cancellation requested", { description: "Cycle will stop within one phase." }); load(); }
            };
            return (
              <li key={c.id} className="border border-sky-100 bg-sky-50/40 rounded-lg p-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 text-sky-600 animate-spin" />
                    <span className="font-medium text-sm text-[#0c2a44]">
                      {SLUG_TO_LABEL[c.tool_slug] ?? c.tool_slug}
                    </span>
                    <span className="text-[10px] uppercase tracking-wide bg-sky-100 text-sky-800 border border-sky-200 rounded px-1.5 py-0.5">
                      assessment cycle
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-xs text-gray-600">
                      started {fmtRelative(c.started_at)} · {fmtDuration(c.started_at)} elapsed
                    </div>
                    <Button onClick={cancel} variant="outline" size="sm" className="h-7 text-xs text-red-700 border-red-200 hover:bg-red-50">
                      Cancel
                    </Button>
                  </div>
                </div>
                <div className="text-xs text-gray-700 mt-1.5">
                  iter {c.iteration ?? 0}/{c.max_iterations ?? 6} · phase <strong>{c.phase ?? "—"}</strong>
                  {score != null && <> · score <strong>{score}%</strong></>}
                  {logEntries.length > 0 && <> · {logEntries.length} log line(s)</>}
                </div>
                <CycleLogViewer entries={logEntries} />
              </li>
            );
          })}
          {jobs.map(j => (
            <li key={j.id} className="border border-amber-100 bg-amber-50/40 rounded-lg p-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 text-amber-700 animate-spin" />
                  <span className="font-medium text-sm text-[#0c2a44]">
                    {j.tool ? (SLUG_TO_LABEL[j.tool] ?? j.tool) : j.kind}
                  </span>
                  <span className="text-[10px] uppercase tracking-wide bg-amber-100 text-amber-800 border border-amber-200 rounded px-1.5 py-0.5">
                    {j.kind === "improve-prompt" ? "writing prompt" : j.kind}
                  </span>
                </div>
                <div className="text-xs text-gray-600">
                  started {fmtRelative(j.started_at)} · {fmtDuration(j.started_at)} elapsed
                </div>
              </div>
              {j.progress && (
                <div className="text-[11px] text-gray-600 mt-1 font-mono">step: {j.progress}</div>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

// ──────────────────────────────────────────────────────────────────
// Recent Activity

type ActivityItem = {
  ts: string;
  kind: "cycle_complete" | "cycle_failed" | "prompt_updated" | "prompt_done" | "prompt_failed";
  tool: string;
  detail?: string;
  href?: string;
};

function ActivityFeed() {
  const [items, setItems] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const [cyc, patches, jobs] = await Promise.all([
      supabase
        .from("tool_improvement_cycles")
        .select("id, tool_slug, status, current_score, baseline_score, target_score, completed_at, last_error, top_changes")
        .in("status", ["complete", "failed"])
        .order("completed_at", { ascending: false })
        .limit(20),
      supabase
        .from("quality_applied_patches")
        .select("id, tool, file_path, commit_url, patch_description, applied_at")
        .order("applied_at", { ascending: false })
        .limit(20),
      supabase
        .from("long_running_jobs")
        .select("id, kind, tool, status, result, error, completed_at")
        .eq("kind", "improve-prompt")
        .in("status", ["complete", "error"])
        .order("completed_at", { ascending: false })
        .limit(20),
    ]);

    const out: ActivityItem[] = [];

    for (const c of (cyc.data ?? []) as any[]) {
      if (!c.completed_at) continue;
      const score = c.current_score ?? c.baseline_score;
      if (c.status === "complete") {
        const reached = score != null && c.target_score != null && score >= c.target_score;
        out.push({
          ts: c.completed_at,
          kind: "cycle_complete",
          tool: SLUG_TO_LABEL[c.tool_slug] ?? c.tool_slug,
          detail: reached
            ? `Reached ${c.target_score}% — ${c.top_changes?.length ?? 0} change(s) staged`
            : `Stopped at ${score ?? "—"}% (target ${c.target_score}%)`,
          href: DIFF_URL,
        });
      } else {
        out.push({
          ts: c.completed_at,
          kind: "cycle_failed",
          tool: SLUG_TO_LABEL[c.tool_slug] ?? c.tool_slug,
          detail: c.last_error ?? "(no detail)",
        });
      }
    }

    for (const p of (patches.data ?? []) as any[]) {
      out.push({
        ts: p.applied_at,
        kind: "prompt_updated",
        tool: SLUG_TO_LABEL[p.tool] ?? p.tool,
        detail: `${p.file_path}: ${p.patch_description?.slice(0, 120) ?? ""}`,
        href: p.commit_url ?? DIFF_URL,
      });
    }

    for (const j of (jobs.data ?? []) as any[]) {
      if (!j.completed_at) continue;
      const result: any = j.result ?? {};
      if (j.status === "error") {
        out.push({
          ts: j.completed_at,
          kind: "prompt_failed",
          tool: j.tool ? (SLUG_TO_LABEL[j.tool] ?? j.tool) : j.kind,
          detail: j.error ?? "(no detail)",
        });
      } else {
        let detail: string;
        let href: string | undefined;
        if (result.improved) {
          detail = `Improved +${result.delta ?? 0} assertions — staged to quality-auto`;
          href = result.commit_url ?? DIFF_URL;
        } else {
          detail = `No change: ${result.reason ?? "no_improvement"}`;
        }
        out.push({
          ts: j.completed_at,
          kind: "prompt_done",
          tool: j.tool ? (SLUG_TO_LABEL[j.tool] ?? j.tool) : j.kind,
          detail,
          href,
        });
      }
    }

    out.sort((a, b) => new Date(b.ts).getTime() - new Date(a.ts).getTime());
    setItems(out.slice(0, 25));
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
    const r = window.setInterval(load, 20_000);
    return () => window.clearInterval(r);
  }, [load]);

  const iconFor = (k: ActivityItem["kind"]) => {
    switch (k) {
      case "cycle_complete":  return <CheckCircle2 className="w-4 h-4 text-emerald-600" />;
      case "prompt_done":     return <CheckCircle2 className="w-4 h-4 text-emerald-600" />;
      case "prompt_updated":  return <GitCommit className="w-4 h-4 text-violet-600" />;
      case "cycle_failed":
      case "prompt_failed":   return <XCircle className="w-4 h-4 text-red-600" />;
    }
  };

  const labelFor = (k: ActivityItem["kind"]): string => ({
    cycle_complete: "Assessment cycle complete",
    cycle_failed:   "Assessment cycle failed",
    prompt_updated: "Prompt updated",
    prompt_done:    "Prompt writing complete",
    prompt_failed:  "Prompt writing failed",
  }[k]);

  return (
    <section className="border border-gray-200 rounded-xl bg-white p-5 mb-4">
      <header className="flex items-center justify-between mb-3">
        <div>
          <h2 className="text-base font-semibold text-[#0c2a44]">Recent activity</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Completions, prompt updates, and failures — newest first.
          </p>
        </div>
        {loading && <RefreshCw className="w-3 h-3 text-gray-400 animate-spin" aria-label="loading" />}
      </header>

      {items.length === 0 ? (
        <div className="text-sm text-gray-500 text-center py-6">
          No recent activity yet.
        </div>
      ) : (
        <ul className="divide-y divide-gray-100">
          {items.map((it, i) => (
            <li key={i} className="py-2.5 flex items-start gap-3">
              <span className="mt-0.5">{iconFor(it.kind)}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <span className="text-sm font-medium text-[#0c2a44]">
                    {labelFor(it.kind)} <span className="text-gray-400">·</span> <span className="text-gray-700">{it.tool}</span>
                  </span>
                  <span className="text-[11px] text-gray-500" title={it.ts}>{fmtRelative(it.ts)}</span>
                </div>
                {it.detail && (
                  <div className="text-xs text-gray-600 mt-0.5 truncate" title={it.detail}>{it.detail}</div>
                )}
                {it.href && (
                  <a href={it.href} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-700 underline inline-flex items-center gap-1 mt-0.5">
                    {it.kind === "prompt_updated" ? "View commit" : "View diff"} <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

// ──────────────────────────────────────────────────────────────────
// Run panel — start a cycle for a single tool

function RunPanel() {
  const [busySlug, setBusySlug] = useState<string | null>(null);
  const [busyGolden, setBusyGolden] = useState<string | null>(null);

  const startCycle = async (slug: string, label: string) => {
    setBusySlug(slug);
    try {
      const { data, error } = await supabase.functions.invoke("improve-tool-quality", { body: { tool_slug: slug } });
      if (error) throw error;
      if (data?.cycle_id) toast.success(`${label} — cycle started`);
      else toast.error("Cycle did not start.");
    } catch (e: any) {
      toast.error(`Start failed: ${e?.message ?? e}`);
    } finally {
      setBusySlug(null);
    }
  };

  const improveGolden = async (toolId: string, label: string) => {
    setBusyGolden(toolId);
    let jobId: string | null = null;
    try {
      const { data, error } = await supabase.functions.invoke("improve-prompt", { body: { tool: toolId } });
      if (error) throw error;
      if (data?.status === "no_golden_set") {
        toast.message("No golden set for this tool.");
        setBusyGolden(null);
        return;
      }
      jobId = data?.job_id ?? null;
      if (!jobId) {
        toast.success("Done.");
        setBusyGolden(null);
        return;
      }
      toast.success(`${label} — prompt writing started`, { description: "You'll be notified when it finishes." });
    } catch (e: any) {
      toast.error(`Improve failed: ${e?.message ?? e}`);
      setBusyGolden(null);
      return;
    }

    // Poll the long-running job and notify on completion / error.
    const startedAt = Date.now();
    const TIMEOUT_MS = 20 * 60_000; // 20 min
    const poll = window.setInterval(async () => {
      if (Date.now() - startedAt > TIMEOUT_MS) {
        window.clearInterval(poll);
        setBusyGolden(prev => (prev === toolId ? null : prev));
        toast.error(`${label} — still running after 20 min. Check "Now running" / Activity.`);
        return;
      }
      const { data: job, error: jerr } = await supabase
        .from("long_running_jobs")
        .select("status, result, error")
        .eq("id", jobId!)
        .maybeSingle();
      if (jerr || !job) return;
      if (job.status === "complete") {
        window.clearInterval(poll);
        setBusyGolden(prev => (prev === toolId ? null : prev));
        const r: any = job.result ?? {};
        if (r.improved) {
          toast.success(`${label} — prompt updated`, {
            description: `+${r.delta ?? 0} assertions. ${r.commit_url ? "Commit staged." : "Staged to quality-auto."}`,
          });
        } else {
          toast.message(`${label} — no prompt change`, {
            description: `Reason: ${r.reason ?? "no_improvement"}`,
          });
        }
      } else if (job.status === "error") {
        window.clearInterval(poll);
        setBusyGolden(prev => (prev === toolId ? null : prev));
        toast.error(`${label} — prompt writing failed`, { description: job.error ?? "(no detail)" });
      }
    }, 5_000);
  };

  return (
    <section className="border border-gray-200 rounded-xl bg-white p-5 mb-4">
      <header className="mb-3">
        <h2 className="text-base font-semibold text-[#0c2a44]">Run a cycle</h2>
        <p className="text-xs text-gray-500 mt-0.5">
          Pick a tool to start a quality improvement cycle. Progress will appear under <strong>Now running</strong>.
        </p>
      </header>
      <ul className="divide-y divide-gray-100">
        {TOOLS.map(t => (
          <li key={t.id} className="py-2.5 flex items-center justify-between gap-3 flex-wrap">
            <span className="text-sm text-[#0c2a44]">{t.label}</span>
            <div className="flex items-center gap-2">
              {TOOLS_WITH_GOLDEN.has(t.id) && (
                <Button
                  onClick={() => improveGolden(t.id, t.label)}
                  disabled={busyGolden === t.id}
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs"
                >
                  {busyGolden === t.id
                    ? <><RefreshCw className="w-3 h-3 mr-1 animate-spin" />Starting…</>
                    : "Improve prompt (golden)"}
                </Button>
              )}
              <Button
                onClick={() => startCycle(t.slug, t.label)}
                disabled={busySlug === t.slug}
                size="sm"
                className="bg-[#0c2a44] hover:bg-[#1a3a5c] text-white h-8 text-xs"
              >
                {busySlug === t.slug
                  ? <><RefreshCw className="w-3 h-3 mr-1 animate-spin" />Starting…</>
                  : <><Play className="w-3 h-3 mr-1" />Run cycle</>}
              </Button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

// ──────────────────────────────────────────────────────────────────
// Advanced

function Advanced() {

  const [autoBusy, setAutoBusy] = useState(false);
  const [autoJobId, setAutoJobId] = useState<string | null>(null);
  const [autoStatus, setAutoStatus] = useState<any>(null);

  const startAutoIterate = async () => {
    setAutoBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke("auto-iterate-quality", {
        body: { max_iterations: 7, target_score: 98 },
      });
      if (error) throw error;
      setAutoJobId(data?.job_id ?? null);
      toast.success(`Auto-iterate started for ${data?.tools?.length ?? 0} tools.`);
    } catch (e: any) {
      toast.error(`Start failed: ${e?.message ?? e}`);
    } finally {
      setAutoBusy(false);
    }
  };

  useEffect(() => {
    if (!autoJobId) return;
    const tick = async () => {
      const { data } = await supabase.from("long_running_jobs").select("*").eq("id", autoJobId).single();
      setAutoStatus(data);
    };
    tick();
    const id = setInterval(tick, 15_000);
    return () => clearInterval(id);
  }, [autoJobId]);

  return (
    <details className="border border-gray-200 rounded-xl bg-white p-5">
      <summary className="cursor-pointer text-sm font-semibold text-[#0c2a44]">Advanced</summary>
      <div className="mt-4 space-y-3 text-sm">
        <div className="flex items-center justify-between flex-wrap gap-2 border-b border-gray-100 pb-3">
          <div>
            <div className="font-medium text-[#0c2a44]">Auto-iterate all tools sequentially</div>
            <div className="text-xs text-gray-500">Runs each tool until pass rate ≥ 98% or 7 iterations.</div>
          </div>
          <Button onClick={startAutoIterate} disabled={autoBusy} variant="default" size="sm" className="h-8 text-xs">
            {autoBusy ? <><RefreshCw className="w-3 h-3 mr-1 animate-spin" />Starting…</> : "Start auto-iterate"}
          </Button>
        </div>
        {autoStatus && (() => {
          const r = autoStatus.result ?? {};
          const tools: string[] = r.tools ?? [];
          const idx: number = r.idx ?? 0;
          const history: any[] = Array.isArray(r.history) ? r.history : [];
          const current = r.current;
          // Group history by tool (multiple cycles possible)
          const byTool: Record<string, any[]> = {};
          for (const h of history) {
            (byTool[h.tool] ||= []).push(h);
          }
          const rowState = (tool: string, i: number) => {
            if (current?.tool === tool) return { label: "running", cls: "text-blue-700" };
            if (byTool[tool]?.length) {
              const last = byTool[tool][byTool[tool].length - 1];
              const ok = ["passed", "succeeded", "completed"].includes(String(last.status).toLowerCase());
              return { label: last.status, cls: ok ? "text-emerald-700" : "text-red-700" };
            }
            if (i < idx) return { label: "skipped", cls: "text-gray-500" };
            return { label: "queued", cls: "text-gray-400" };
          };
          return (
            <div className="text-xs bg-slate-50 rounded p-3 space-y-2">
              <div className="flex justify-between">
                <div><span className="text-gray-500">Status:</span> <span className="font-medium">{autoStatus.status}</span></div>
                <div className="text-gray-500">{idx}/{tools.length} tools processed</div>
              </div>
              <div className="text-gray-600">{autoStatus.progress ?? "—"}</div>
              <table className="w-full font-mono text-[11px] mt-1">
                <thead>
                  <tr className="text-left text-gray-500 border-b">
                    <th className="py-1 pr-2">#</th>
                    <th className="py-1 pr-2">Tool</th>
                    <th className="py-1 pr-2">Status</th>
                    <th className="py-1 pr-2">Score</th>
                    <th className="py-1 pr-2">Iter</th>
                    <th className="py-1">Cycle</th>
                  </tr>
                </thead>
                <tbody>
                  {tools.map((tool, i) => {
                    const st = rowState(tool, i);
                    const last = byTool[tool]?.[byTool[tool].length - 1];
                    const isCurrent = current?.tool === tool;
                    const score = isCurrent ? (current.current_score ?? "—") : (last?.current_score ?? "—");
                    const iter = isCurrent ? (current.iteration ?? "—") : (last?.iteration ?? "—");
                    const cyc = isCurrent ? current.cycle_id : last?.cycle_id;
                    return (
                      <tr key={tool} className="border-b border-slate-100">
                        <td className="py-1 pr-2 text-gray-400">{i + 1}</td>
                        <td className="py-1 pr-2">{tool}</td>
                        <td className={`py-1 pr-2 font-medium ${st.cls}`}>{st.label}</td>
                        <td className="py-1 pr-2">{score}</td>
                        <td className="py-1 pr-2">{iter}</td>
                        <td className="py-1 text-gray-500">{cyc ? String(cyc).slice(0, 8) : "—"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          );
        })()}
        <details className="border-t border-gray-100 pt-3">
          <summary className="cursor-pointer text-xs font-medium text-gray-600 hover:text-[#0c2a44]">
            Engineering links
          </summary>
          <div className="mt-2 space-y-2 pl-2">
            <div className="text-xs text-gray-600">
              <Link to="/admin/static-stress" className="text-blue-700 underline inline-flex items-center gap-1">
                Open static-stress dashboard <ExternalLink className="w-3 h-3" />
              </Link>
            </div>
            <div className="text-xs text-gray-600">
              <a href={DIFF_URL} target="_blank" rel="noopener noreferrer" className="text-blue-700 underline inline-flex items-center gap-1">
                Open <code>quality-auto → main</code> compare <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        </details>
      </div>
    </details>
  );
}

// ──────────────────────────────────────────────────────────────────

function HowToRun() {
  return (
    <section className="border border-blue-200 bg-blue-50/50 rounded-xl p-5 mb-4">
      <h2 className="text-base font-semibold text-[#0c2a44] mb-2">How to run tests</h2>
      <ol className="list-decimal list-inside text-sm text-gray-800 space-y-1.5">
        <li>
          <strong>Pick a tool</strong> in <em>Run a cycle</em> below and click <em>Run cycle</em>.
          The cycle will <strong>auto-create</strong> the stress batch it needs — you no longer
          have to run a smoke batch first.
        </li>
        <li>
          Watch progress under <em>Now running</em>. Each cycle goes through:
          <span className="font-mono text-xs ml-1">init → awaiting_rerun → reviewing → ranking → deliberating → rerunning</span>,
          looping until the target score is reached or the iteration cap (default 6) is hit.
        </li>
        <li>
          To process every tool sequentially, open <em>Advanced</em> and click <em>Start auto-iterate</em>.
          It runs one cycle per tool with target 98% and max 7 iterations.
        </li>
        <li>
          When a cycle finishes, the entry moves to <em>Recent activity</em>. Successful prompt
          changes show a <em>View commit</em> link to the <code>quality-auto</code> branch.
        </li>
        <li>
          If a cycle stalls or errors, use the per-cycle <em>Cancel</em> button. The
          watchdog also auto-fails cycles whose heartbeat is older than 12 minutes.
        </li>
      </ol>
    </section>
  );
}

export default function QualityLoop() {
  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <header className="mb-6">
          <h1 className="text-2xl font-bold text-[#0c2a44]">Prompt Improvement</h1>
          <p className="text-gray-500 mt-1 text-sm">
            Start a cycle, watch it run, and see what changed.
          </p>
        </header>
        <HowToRun />
        <NowRunning />
        <ActivityFeed />
        <RunPanel />
        <Advanced />
      </div>
    </div>
  );
}

