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
        <Button onClick={load} variant="outline" size="sm" className="h-8 text-xs">
          <RefreshCw className={`w-3 h-3 mr-1 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
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
                  <div className="text-xs text-gray-600">
                    started {fmtRelative(c.started_at)} · {fmtDuration(c.started_at)} elapsed
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
        <Button onClick={load} variant="outline" size="sm" className="h-8 text-xs">
          <RefreshCw className={`w-3 h-3 mr-1 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
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
    try {
      const { data, error } = await supabase.functions.invoke("improve-prompt", { body: { tool: toolId } });
      if (error) throw error;
      if (data?.job_id) toast.success(`${label} — prompt writing started`);
      else if (data?.status === "no_golden_set") toast.message("No golden set for this tool.");
      else toast.success("Done.");
    } catch (e: any) {
      toast.error(`Improve failed: ${e?.message ?? e}`);
    } finally {
      setBusyGolden(null);
    }
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
  const [busy, setBusy] = useState(false);

  const runSmoke = async () => {
    setBusy(true);
    try {
      const { data: u } = await supabase.auth.getUser();
      const uid = u?.user?.id;
      if (!uid) { toast.error("Sign in first"); return; }
      const { data, error } = await supabase.functions.invoke("start-stress-batch", {
        body: {
          run_by: uid,
          industries: [
            { id: "web", label: "Online & Web Services" },
            { id: "ai",  label: "AI & Machine Learning" },
          ],
          geo_filter: "us",
          selected_tools: TOOLS.map(t => t.id),
        },
      });
      if (error || !data?.batch_id) throw new Error(error?.message ?? "no batch_id");
      toast.success("Smoke batch started.");
    } catch (e: any) {
      toast.error(`Start failed: ${e?.message ?? e}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <details className="border border-gray-200 rounded-xl bg-white p-5">
      <summary className="cursor-pointer text-sm font-semibold text-[#0c2a44]">Advanced</summary>
      <div className="mt-4 space-y-3 text-sm">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <div className="font-medium text-[#0c2a44]">Smoke batch (2 industries × US × all tools)</div>
            <div className="text-xs text-gray-500">Validates clean-rate against the static-stress pipeline.</div>
          </div>
          <Button onClick={runSmoke} disabled={busy} variant="outline" size="sm" className="h-8 text-xs">
            {busy ? <><RefreshCw className="w-3 h-3 mr-1 animate-spin" />Starting…</> : "Run smoke batch"}
          </Button>
        </div>
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
  );
}

// ──────────────────────────────────────────────────────────────────

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
        <NowRunning />
        <ActivityFeed />
        <RunPanel />
        <Advanced />
      </div>
    </div>
  );
}
