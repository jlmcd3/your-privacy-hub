// QualityConsole — the shared admin run-and-review console behind BOTH
// /admin/quality-batch and /admin/final-test (ITEM 325).
//
// Lifted verbatim from src/pages/admin/QualityBatch.tsx (QB-P1/P2 lineage,
// comments preserved) so the two consoles can never drift: any future change
// to the console UI is made once, here. The ONLY additions are the
// `showVariants` prop and the Perfect/Messy per-tool toggle it gates.
//
// DEFAULT-PATH LAW: with showVariants=false (what /admin/quality-batch
// renders) no `variant` / `tool_variants` field is sent to the orchestrator,
// so that page's request bodies and behaviour are byte-identical to
// pre-ITEM-325.

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import JSZip from "jszip";
import { RefreshCw } from "lucide-react";
import { LaunchGateScoreboard } from "@/components/admin/LaunchGateScoreboard";
import { QualityFindingBacklogPanel } from "@/components/admin/QualityFindingBacklogPanel";
import { CertificationStatusPanel } from "@/components/admin/CertificationStatusPanel";

// QB-P3 cleanup: SLUG_TO_TOOL_TYPE lives in src/lib/qualityBatchTools.ts so
// QualityBatch and QualityBatch2 share one source of truth. Verified against
// supabase/functions/generate-report-pdf/index.ts tableMap (L1853–1868).
import { SLUG_TO_TOOL_TYPE, generationModelSlug, DEFAULT_GENERATION_MODEL, AB_ALT_GENERATION_MODEL } from "@/lib/qualityBatchTools";
import { ModelPairTable } from "@/components/admin/quality-console/ModelPairTable";
import { PINS_MODE_OPTIONS, type PinsMode } from "@/lib/pinsMode";
import { useAllProductsLog, clearAllProductsLog } from "@/lib/allProductsLog";
import { useLocalBatches, localToolResult, type LocalBatch, type LocalToolResult } from "@/lib/allProductsRunHistory";
import { invokeWithTimeout } from "@/lib/sampleGenerators";

// ITEM 325 — fixture variant. "perfect" is the ratified golden set; "messy"
// is the (not-yet-authored) realistic-input set. See
// supabase/functions/_shared/quality/fixture-variant.ts.
export type FixtureVariant = "perfect" | "messy";

export interface QualityConsoleProps {
  /** Page heading. */
  title?: string;
  /** Small monospace caption to the right of the heading. */
  caption?: string;
  /** Render the per-tool Perfect/Messy toggle and send variant fields. */
  showVariants?: boolean;
  /**
   * SO-FINAL-TEST — additive grader path selector.
   * Omitted/"legacy": no `grader_mode` field is sent to the orchestrator and
   * every batch/run query filters to `grader_mode IS NULL`, so
   * /admin/quality-batch and /admin/final-test see exactly the rows and
   * behaviour they saw before this prop existed.
   * "skeleton": batches carry grader_mode="skeleton" and this console only
   * ever reads its own rows.
   */
  graderMode?: "legacy" | "skeleton";
  /** SO-FINAL-TEST — restrict the tool checkbox list (defaults to all TOOLS). */
  toolsOverride?: string[];
  /**
   * ALL-PRODUCTS-TEST — render the "Tools & batch scores" and "Live log" cards
   * at the top of the console (immediately after the All Products selector),
   * so they read as the 2nd and 3rd items on the page. Default false keeps the
   * legacy bottom order (Live log then Tools & batch scores) for
   * /admin/quality-batch and /admin/so-final-test.
   */
  scoresAndLogFirst?: boolean;
  /**
   * ALL-PRODUCTS-TEST — extra products that have no quality_batch dispatch.
   * Their test history is imported from the static-stress harness
   * (/admin/static-stress → static_stress_jobs). Slugs use stress-harness
   * naming, e.g. "ropa" | "us-notice" | "eu-notice".
   */
  extraHistoryTools?: string[];
  /**
   * ALL-PRODUCTS-TEST — also show the in-page run log published by
   * AllProductsPanel (src/lib/allProductsLog.ts) inside the Live log card.
   */
  showLocalRunLog?: boolean;
  /**
   * ALL-PRODUCTS-TEST — per-batch action links ("zip" / "md") rendered under
   * each LOCAL (in-page) batch column header, mirroring the server columns.
   */
  renderLocalBatchActions?: (batchId: string) => ReactNode;
  /**
   * ALL-PRODUCTS-TEST — add server-side stress batches (static_stress_batches)
   * as matrix columns, so batches run from this page appear in every browser.
   */
  showStressBatches?: boolean;

}

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
  "registration",
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
  // MODEL A/B HARNESS (dispatch 1) — present only on A/B batches.
  generation_model?: string | null;
  ab_pair_id?: string | null;
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

/** Batch column pinned as the baseline (browser-local marker). */
const BASELINE_COL_KEY = "eup.qualityConsole.baselineColumn.v1";

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

export function QualityConsole({
  title = "Quality Batch",
  caption = "quality-batch-orchestrator",
  showVariants = false,
  graderMode = "legacy",
  toolsOverride,
  scoresAndLogFirst = false,
  extraHistoryTools,
  showLocalRunLog = false,
  renderLocalBatchActions,

}: QualityConsoleProps = {}) {
  // SO-FINAL-TEST — this console's tool universe and its row partition.
  const CONSOLE_TOOLS = toolsOverride ?? TOOLS;
  const isSkeletonMode = graderMode === "skeleton";
  /** Restrict any quality_batch_runs / quality_runs query to this console's partition. */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const scope = (q: any): any =>
    isSkeletonMode ? q.eq("grader_mode", "skeleton") : q.is("grader_mode", null);
  // Panel A state
  const [selected, setSelected] = useState<Set<string>>(new Set(CONSOLE_TOOLS));
  const [batchSize, setBatchSize] = useState<number>(5);
  // ITEM 325 — per-tool fixture variant. Only read when showVariants is true.
  const [toolVariant, setToolVariant] = useState<Record<string, FixtureVariant>>({});
  const variantFor = (t: string): FixtureVariant => toolVariant[t] ?? "perfect";
  const setVariantFor = (t: string, v: FixtureVariant) =>
    setToolVariant((prev) => ({ ...prev, [t]: v }));
  // MODEL A/B HARNESS (dispatch 1) — paired generation on two models.
  // DEFAULT-PATH LAW: only offered on the variant-aware console, and the
  // `ab_models` field is omitted entirely unless the toggle is on.
  const [abModels, setAbModels] = useState(false);
  // PROMPT 9G item 3 — ALL-PINNED BATCH MODE. Off by default; the field is
  // omitted entirely unless the toggle is on, so every existing path is
  // byte-unchanged.
  const [pinnedOnly, setPinnedOnly] = useState(false);
  // PROMPT 12G items 1-3 — PINS MODE. "seed" is today's behaviour and is sent
  // on every variant-aware start; the legacy pinned_only boolean is superseded.
  const [pinsMode, setPinsMode] = useState<PinsMode>("seed");
  const [starting, setStarting] = useState(false);
  const [stopping, setStopping] = useState(false);

  // Active batch state
  const [activeBatch, setActiveBatch] = useState<BatchRow | null>(null);
  const [batchLogs, setBatchLogs] = useState<BatchLogRow[]>([]);

  // Panel C state
  // BATCH-NUMBER LAW (2026-09-02): batch numbers are GLOBALLY STABLE — the
  // newest batch is always numbered from the total server batch count, so a
  // new batch takes the next number and old columns never renumber. The
  // matrix window shows the latest 7 server batches; "Load older" pages
  // backwards through every batch ever run here. `recentBatches` is stored
  // newest-first (desc), deduped by id.
  const [recentBatches, setRecentBatches] = useState<BatchRow[]>([]);
  const [batchTotal, setBatchTotal] = useState(0);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const BATCH_PAGE = 7;
  const [baselines, setBaselines] = useState<Map<string, Baseline>>(new Map());
  const [snapshotting, setSnapshotting] = useState(false);
  // Which batch column the current baseline was pinned from (browser-local).
  const [baselineColumnId, setBaselineColumnId] = useState<string | null>(() => {
    try { return localStorage.getItem(BASELINE_COL_KEY); } catch { return null; }
  });
  // ALL-PRODUCTS-TEST — imported history for products with no quality batch.
  type StressHistory = { total: number; complete: number; failed: number; lastAt: string | null };
  const [stressHistory, setStressHistory] = useState<Map<string, StressHistory>>(new Map());
  // SERVER-BATCH LAW (2026-09-02): every batch launched from this page writes a
  // static_stress_batches row. Those batches are read FROM THE SERVER, so the
  // matrix shows them in any browser and after localStorage is cleared —
  // in-page scores, when present, are overlaid on top of the server counts.
  type StressBatchCol = {
    id: string;
    started_at: string;
    tools: Record<string, LocalToolResult>;
  };
  const [stressBatches, setStressBatches] = useState<StressBatchCol[]>([]);
  const [stressTotal, setStressTotal] = useState(0);
  const [stressLoaded, setStressLoaded] = useState(7);

  // ALL-PRODUCTS-TEST — in-page run log published by AllProductsPanel.
  const localLog = useAllProductsLog();
  // ALL-PRODUCTS-TEST — pass/fail tally for pre-set-package runs executed
  // in-page (they write no server-side batch or stress row).
  const localBatches = useLocalBatches();
  const localLogRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (localLogRef.current) localLogRef.current.scrollTop = localLogRef.current.scrollHeight;
  }, [localLog.length]);

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
      const { data } = await scope(supabase
        .from("quality_batch_runs")
        .select("*"))
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

      // STALL WATCHDOG (2026-08-30): child heartbeats are the liveness signal
      // during a long generation (a child can legitimately write no progress
      // line for minutes while a model call runs, but its heartbeat moves).
      // The watchdog effect below folds this into its progress fingerprint.
      childHeartbeatsRef.current = ((children as any[]) ?? [])
        .map((c) => `${c.id}:${c.status}:${c.last_heartbeat_at ?? ""}`)
        .sort()
        .join("|");

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
    const { data } = await scope(supabase
      .from("quality_batch_runs")
      .select("*"))
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

  // ─── STALL WATCHDOG (2026-08-30) — automatic orchestrator kick ───────────
  // The orchestrator advances a batch by self-invoking between waves
  // (EdgeRuntime.waitUntil → fetch). When that self-chain link dies — an edge
  // instance recycled before the fetch landed — the batch sits in "running"
  // forever with completed children and no next wave: exactly the "freezes
  // after completing only some reports" failure. The orchestrator's `kick`
  // action is the idempotent recovery (reload row → record terminals →
  // dispatch next wave → or finalize), but it was only reachable through the
  // manual refresh button. This effect fingerprints batch progress on every
  // poll (status, tool index, per-child final statuses, child heartbeats,
  // newest log line) and, when NOTHING has moved for 2 minutes on a
  // non-terminal batch, fires `kick` automatically — at most once per stall
  // window, with a visible log line so the operator can see the recovery.
  const childHeartbeatsRef = useRef<string>("");
  const stallFpRef = useRef<string>("");
  const stallSinceRef = useRef<number>(0);
  const lastKickAtRef = useRef<number>(0);
  const STALL_KICK_MS = 120_000;
  useEffect(() => {
    if (!activeBatch || isBatchTerminal(activeBatch.status)) {
      stallFpRef.current = "";
      stallSinceRef.current = 0;
      return;
    }
    const newestLogTs = batchLogs.length ? batchLogs[batchLogs.length - 1].ts : "";
    const fp = JSON.stringify([
      activeBatch.id,
      activeBatch.status,
      (activeBatch as any).phase ?? null,
      (activeBatch as any).current_tool_index ?? null,
      (Array.isArray(activeBatch.tool_results) ? activeBatch.tool_results : [])
        .map((r: any) => r?.final_status ?? null),
      childHeartbeatsRef.current,
      newestLogTs,
    ]);
    const now = Date.now();
    if (fp !== stallFpRef.current) {
      stallFpRef.current = fp;
      stallSinceRef.current = now;
      return;
    }
    if (!stallSinceRef.current) { stallSinceRef.current = now; return; }
    const stalledMs = now - stallSinceRef.current;
    if (stalledMs >= STALL_KICK_MS && now - lastKickAtRef.current >= STALL_KICK_MS) {
      lastKickAtRef.current = now;
      const runId = activeBatch.id;
      void supabase.functions
        .invoke("quality-batch-orchestrator", { body: { action: "kick", run_id: runId } })
        .then(() => {
          toast.message(
            `Batch watchdog: no progress for ${Math.round(stalledMs / 1000)}s — kicked the orchestrator to resume`,
          );
        })
        .catch((e) => console.error("[quality-console] watchdog kick failed", e));
    }
  }, [activeBatch, batchLogs]);

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

  // Keyboard shortcut: Ctrl/Cmd+Shift+R refreshes the live log.
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === "r") {
        e.preventDefault();
        refreshLog();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  // ─── Recent batches + baselines for the score matrix ─────────────────────
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const [{ data: rows, count }, { data: base }] = await Promise.all([
        scope(supabase.from("quality_batch_runs")
          .select("*", { count: "exact" })).order("started_at", { ascending: false }).limit(BATCH_PAGE),
        supabase.from("quality_batch_baselines").select("*"),
      ]);
      if (cancelled) return;
      if (typeof count === "number") setBatchTotal(count);
      if (rows) {
        const fresh = rows as unknown as BatchRow[];
        // Merge the newest window into whatever older pages are loaded —
        // replace rows we already have, keep the older tail, stay desc.
        setRecentBatches((prev) => {
          const freshIds = new Set(fresh.map((b) => b.id));
          const merged = [...fresh, ...prev.filter((b) => !freshIds.has(b.id))];
          merged.sort((a, b) => (a.started_at > b.started_at ? -1 : 1));
          return merged;
        });
      }
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

  // ─── ALL-PRODUCTS-TEST: import history for non-batch products ────────────
  // These products (RoPA, US/EU Notice) are exercised by the static-stress
  // harness, so their test history lives in static_stress_jobs, not in
  // quality_batch_runs. Import a rollup so every testable product has a row.
  useEffect(() => {
    if (!extraHistoryTools || extraHistoryTools.length === 0) return;
    let cancelled = false;
    const load = async () => {
      const { data } = await supabase
        .from("static_stress_jobs")
        .select("tool_slug, status, completed_at, created_at")
        .in("tool_slug", extraHistoryTools)
        .order("created_at", { ascending: false })
        .limit(500);
      if (cancelled || !data) return;
      const m = new Map<string, StressHistory>();
      for (const t of extraHistoryTools) m.set(t, { total: 0, complete: 0, failed: 0, lastAt: null });
      for (const j of data as { tool_slug: string; status: string; completed_at: string | null; created_at: string }[]) {
        const e = m.get(j.tool_slug);
        if (!e) continue;
        e.total += 1;
        if (j.status === "complete") e.complete += 1;
        else if (j.status === "failed") e.failed += 1;
        const at = j.completed_at ?? j.created_at;
        if (!e.lastAt || at > e.lastAt) e.lastAt = at;
      }
      setStressHistory(m);
    };
    load();
    const t = setInterval(load, 30_000);
    return () => { cancelled = true; clearInterval(t); };
  }, [extraHistoryTools?.join(",")]);



  // ─── Recent child quality_runs (bottom drill-down card) ──────────────────
  async function refreshRuns() {
    setLoadingRuns(true);
    const { data, error } = await scope(supabase
      .from("quality_runs")
      .select(SELECT_COLS))
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
    const tools = CONSOLE_TOOLS.filter((t) => selected.has(t));
    if (tools.length === 0) { toast.error("Select at least one tool"); return; }
    setStarting(true);
    try {
      const { data, error } = await supabase.functions.invoke("quality-batch-orchestrator", {
        body: {
          action: "start",
          tools,
          batch_size: batchSize,
          // DEFAULT-PATH LAW: omitted entirely unless this console exposes variants.
          ...(showVariants
            ? { tool_variants: Object.fromEntries(tools.map((t) => [t, variantFor(t)])) }
            : {}),
          ...(showVariants && abModels ? { ab_models: true } : {}),
          ...(showVariants && pinnedOnly ? { pinned_only: true } : {}),
          ...(showVariants ? { pins_mode: pinsMode } : {}),
          // SO-FINAL-TEST: omitted entirely on the legacy consoles.
          ...(isSkeletonMode ? { grader_mode: "skeleton" } : {}),
        },
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



  // QB-P24 Item 5 — CEO-requested per-tool "Pinned rerun" trigger. Reuses the
  // orchestrator's pinned_rerun action added in QB-P23; disabled while any
  // batch is running so we do not stomp an in-flight session.
  const [pinning, setPinning] = useState<string | null>(null);
  async function onPinnedRerun(tool: string) {
    if (isBatchRunning) {
      toast.error("A batch is running — wait for it to finish before pinning a rerun.");
      return;
    }
    setPinning(tool);
    try {
      const { data, error } = await supabase.functions.invoke("quality-batch-orchestrator", {
        body: {
          action: "pinned_rerun",
          tool,
          ...(showVariants ? { variant: variantFor(tool) } : {}),
        },
      });
      if (error) throw error;
      const runId = (data as any)?.run_id as string | undefined;
      // QB-P25 Final-B R3 — bind the log/progress panel to the returned batch id
      // so the pinned-rerun batch renders live (like a normal batch), rather
      // than only surfacing via a toast.
      if (runId) {
        const { data: row } = await supabase
          .from("quality_batch_runs").select("*").eq("id", runId).maybeSingle();
        if (row) setActiveBatch(row as unknown as BatchRow);
        setBatchLogs([]);
      }
      toast.success(`Pinned rerun dispatched for ${tool}${runId ? ` (${runId.slice(0, 8)})` : ""}`);
    } catch (e: any) {
      toast.error(`Pinned rerun failed for ${tool}: ${e?.message ?? e}`);
    } finally {
      setPinning(null);
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

  // Page backwards: fetch the next 7 older batches (offset = already loaded).
  async function loadOlderBatches() {
    setLoadingOlder(true);
    try {
      const { data, count, error } = await scope(supabase
        .from("quality_batch_runs")
        .select("*", { count: "exact" }))
        .order("started_at", { ascending: false })
        .range(recentBatches.length, recentBatches.length + BATCH_PAGE - 1);
      if (error) throw error;
      if (typeof count === "number") setBatchTotal(count);
      const older = (data ?? []) as unknown as BatchRow[];
      setRecentBatches((prev) => {
        const known = new Set(prev.map((b) => b.id));
        const merged = [...prev, ...older.filter((b) => !known.has(b.id))];
        merged.sort((a, b) => (a.started_at > b.started_at ? -1 : 1));
        return merged;
      });
    } catch (e: any) {
      toast.error(`Load older failed: ${e?.message ?? e}`);
    } finally {
      setLoadingOlder(false);
    }
  }

  // ─── Score matrix data ───────────────────────────────────────────────────
  // BATCH LAW — server batches first (oldest → newest), then every in-page
  // local batch as its OWN column appended to the right. A local run is never
  // folded into a pre-existing batch column.
  // BATCH-NUMBER LAW — `n` is the batch's global sequence number (oldest
  // server batch = 1). recentBatches is newest-first, so desc index d maps
  // to n = batchTotal - d. Local in-page batches continue the sequence.
  type MatrixColumn =
    | { kind: "server"; id: string; started_at: string; n: number; batch: BatchRow }
    | { kind: "local"; id: string; started_at: string; n: number; batch: LocalBatch };

  const matrixColumns = useMemo<MatrixColumn[]>(() => {
    const server: MatrixColumn[] = [...recentBatches]
      .sort((a, b) => (a.started_at < b.started_at ? -1 : 1))
      .map((b) => ({
        kind: "server" as const,
        id: b.id,
        started_at: b.started_at,
        n: batchTotal - recentBatches.findIndex((r) => r.id === b.id),
        batch: b,
      }));
    const local: MatrixColumn[] = [...localBatches]
      .sort((a, b) => (a.started_at < b.started_at ? -1 : 1))
      .map((b, i) => ({
        kind: "local" as const,
        id: b.id,
        started_at: b.started_at,
        n: batchTotal + i + 1,
        batch: b,
      }));
    return [...server, ...local];
  }, [recentBatches, localBatches, batchTotal]);

  const hasOlderBatches = recentBatches.length < batchTotal;

  function renderLocalCell(key: string, r: LocalToolResult | undefined) {
    if (!r || r.total === 0) {
      return <td key={key} className="py-2 pr-3 text-muted-foreground">—</td>;
    }
    const c = r.scored ? r.claudeSum / r.scored : null;
    const g = r.scored ? r.gptSum / r.scored : null;
    return (
      <td key={key} className="py-2 pr-3 font-mono text-xs whitespace-nowrap">
        {c != null || g != null ? (
          <span>{c?.toFixed(1) ?? "—"} / {g?.toFixed(1) ?? "—"}</span>
        ) : (
          <span className="text-muted-foreground">ungraded</span>
        )}
        <span className="ml-1 font-sans text-[10px] text-muted-foreground">
          {r.complete}✓{r.failed ? ` ${r.failed}✗` : ""}
        </span>
      </td>
    );
  }

  const testsCount = useMemo(() => {
    const m = new Map<string, number>();
    for (const t of CONSOLE_TOOLS) m.set(t, 0);
    for (const b of recentBatches) {
      const results: ToolResult[] = Array.isArray(b.tool_results) ? (b.tool_results as unknown as ToolResult[]) : [];
      for (const r of results) m.set(r.tool, (m.get(r.tool) ?? 0) + 1);
    }
    for (const b of localBatches) {
      for (const [tool, r] of Object.entries(b.tools)) m.set(tool, (m.get(tool) ?? 0) + r.total);
    }
    return m;
  }, [recentBatches, localBatches]);

  async function onResnapshotBaseline() {
    if (!window.confirm("Replace baseline with the average of ALL stored batch results (unbounded)?")) return;
    setSnapshotting(true);
    try {
      // QB-P3 correction: aggregate over ALL quality_batch_runs.tool_results,
      // not just the last-10 the score matrix keeps in state.
      const { data: allBatches, error: fetchErr } = await scope(supabase
        .from("quality_batch_runs")
        .select("tool_results"));
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

  /**
   * BASELINE-COLUMN LAW (2026-08-31): any single batch column — server or
   * in-page — can be pinned as THE baseline. The column's own per-tool scores
   * replace quality_batch_baselines wholesale, so every other column's delta is
   * measured against that one run rather than an unbounded historical average.
   * The pinned column id is remembered locally so the header shows which batch
   * the baseline came from.
   */
  async function onSetBaselineFromColumn(col: MatrixColumn, label: string) {
    if (!window.confirm(`Replace the baseline with ${label}'s scores?`)) return;
    setSnapshotting(true);
    try {
      const capturedAt = new Date().toISOString();
      const rows: Baseline[] = [];
      if (col.kind === "server") {
        const results: ToolResult[] = Array.isArray(col.batch.tool_results)
          ? (col.batch.tool_results as unknown as ToolResult[]) : [];
        for (const r of results) {
          if (r.final_status !== "complete") continue;
          const claude = typeof r.score_overall === "number" ? r.score_overall : null;
          const gpt = typeof r.gpt_score_overall === "number" ? r.gpt_score_overall : null;
          const parts = [claude, gpt].filter((n): n is number => n != null);
          if (parts.length === 0) continue;
          rows.push({
            tool: r.tool,
            claude_score: claude,
            gpt_score: gpt,
            avg_score: parts.reduce((a, b) => a + b, 0) / parts.length,
            captured_at: capturedAt,
          });
        }
      } else {
        for (const [tool, r] of Object.entries(col.batch.tools)) {
          if (!r.scored) continue;
          const claude = r.claudeSum / r.scored;
          const gpt = r.gptSum / r.scored;
          rows.push({
            tool,
            claude_score: claude,
            gpt_score: gpt,
            avg_score: (claude + gpt) / 2,
            captured_at: capturedAt,
          });
        }
      }
      if (rows.length === 0) { toast.message("That batch has no graded results to pin."); return; }
      const { error } = await supabase.from("quality_batch_baselines")
        .upsert(rows, { onConflict: "tool" });
      if (error) throw error;
      const m = new Map<string, Baseline>();
      for (const r of rows) m.set(r.tool, r);
      setBaselines(m);
      setBaselineColumnId(col.id);
      try { localStorage.setItem(BASELINE_COL_KEY, col.id); } catch { /* ignore */ }
      toast.success(`${label} is now the baseline (${rows.length} tool${rows.length === 1 ? "" : "s"}).`);
    } catch (e: any) {
      toast.error(`Set baseline failed: ${e?.message ?? e}`);
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

    // A long PDF loop outlives a stale access token. getSession() only reads
    // localStorage, so a revoked/expired session still looks valid and every
    // invoke 401s with auth_expired. Validate against the auth server (and
    // force a refresh) before starting.
    let { data: { user: liveUser } } = await supabase.auth.getUser();
    if (!liveUser) {
      const { data: refreshed } = await supabase.auth.refreshSession();
      liveUser = refreshed?.user ?? null;
    }
    if (!liveUser) { toast.error("Session expired — sign in again and retry."); return; }


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
            // FREEZE FIX (2026-08-30): per-doc render inside a loop — one
            // stalled connection must fail THIS doc, not wedge the download.
            const { data: pdfResp, error: pdfErr } = await invokeWithTimeout<{ pdf_url?: string }>(
              "generate-report-pdf",
              { tool_type: toolType, assessment_id: d.source_row_id },
              180_000,
            );
            if (pdfErr) throw pdfErr;
            const url = (pdfResp as any)?.pdf_url as string | undefined;
            if (!url) throw new Error("no pdf_url");
            const res = await fetch(url);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const blob = await res.blob();
            const shortRow = (d.source_row_id ?? "row").slice(0, 8);
            // A/B pairs share tool+doc_number, so the model slug is what keeps
            // both PDFs in the zip. Default-model docs keep the legacy name.
            const modelSuffix = tr.generation_model && tr.generation_model !== DEFAULT_GENERATION_MODEL
              ? `-${generationModelSlug(tr.generation_model)}`
              : "";
            zip.file(`${tr.tool}/${String(d.doc_number).padStart(2, "0")}-${shortRow}${modelSuffix}.pdf`, blob);
            ok += 1;
          } catch (e: any) {
            console.error("pdf fetch failed", tr.tool, d.source_row_id, e);
            failed += 1;
            // Mid-loop token death: stop instead of failing every remaining doc.
            if (e?.context?.status === 401) {
              const { data: r } = await supabase.auth.refreshSession();
              if (!r?.session) {
                toast.error("Session expired mid-export — sign in again and retry.", { id: tid });
                return;
              }
            }
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
      const isAb = toolResults.some((r) => r.ab_pair_id);
      lines.push("| Tool | model | final_status | score_overall | gpt_score_overall | error |");
      lines.push("| --- | --- | --- | --- | --- | --- |");
      for (const tr of toolResults) {
        lines.push(
          `| ${tr.tool} | ${tr.generation_model ?? DEFAULT_GENERATION_MODEL} | ${tr.final_status} | ${tr.score_overall ?? "—"} | ${tr.gpt_score_overall ?? "—"} | ${tr.error ? tr.error.replace(/\|/g, "\\|").slice(0, 200) : ""} |`,
        );
      }
      if (isAb) {
        lines.push("");
        lines.push("## Model A/B pairs");
        lines.push("");
        lines.push("| pair | tool | model A | score A (claude/gpt) | model B | score B (claude/gpt) |");
        lines.push("| --- | --- | --- | --- | --- | --- |");
        const byPair = new Map<string, ToolResult[]>();
        for (const tr of toolResults) {
          if (!tr.ab_pair_id) continue;
          byPair.set(tr.ab_pair_id, [...(byPair.get(tr.ab_pair_id) ?? []), tr]);
        }
        for (const [pid, rows] of byPair) {
          const a = rows.find((r) => (r.generation_model ?? DEFAULT_GENERATION_MODEL) === DEFAULT_GENERATION_MODEL);
          const b = rows.find((r) => r.generation_model === AB_ALT_GENERATION_MODEL);
          const fmt = (r?: ToolResult) => r ? `${r.score_overall ?? "—"} / ${r.gpt_score_overall ?? "—"}` : "—";
          lines.push(`| ${pid.slice(0, 8)} | ${rows[0].tool} | ${DEFAULT_GENERATION_MODEL} | ${fmt(a)} | ${AB_ALT_GENERATION_MODEL} | ${fmt(b)} |`);
        }
        lines.push("");
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

        const { data: allFindings } = await supabase
          .from("quality_findings")
          .select("check_id, check_type, dimension, severity, evidence, doc_id, passed, filtered_from_scoring, calibration_rule")
          .eq("run_id", tr.quality_run_id)
          .eq("passed", false)
          .order("dimension", { ascending: true });
        // PROMPT 10A — calibration-filtered findings are reported separately;
        // they are excluded from scoring but never hidden.
        const findings = (allFindings ?? []).filter((f: any) => !f.filtered_from_scoring);
        const calibrationFiltered = (allFindings ?? []).filter((f: any) => f.filtered_from_scoring);
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

        // PROMPT 10A — visibility stays, scoring noise goes.
        lines.push("### Filtered (calibration)");
        lines.push("");
        if (calibrationFiltered.length === 0) {
          lines.push("_No calibration-filtered findings._");
          lines.push("");
        } else {
          lines.push("_Excluded from scoring under the skeleton calibration rules; retained here in full._");
          lines.push("");
          for (const f of calibrationFiltered as any[]) {
            const ev = (f.evidence ?? "").toString().replace(/\s+/g, " ").slice(0, 400);
            lines.push(`- **[${f.calibration_rule}] ${f.check_id}** _(${f.check_type}, ${f.dimension}/${f.severity})_ — ${ev}`);
          }
          lines.push("");
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


  // ALL-PRODUCTS-TEST — the two monitoring cards, lifted into render functions
  // so they can be hoisted above Panel A when scoresAndLogFirst is set.
  const renderLogCard = () => (
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
          <Button variant="outline" size="sm" onClick={refreshLog} disabled={logRefreshing}>
            <RefreshCw className={`h-4 w-4 mr-2 ${logRefreshing ? "animate-spin" : ""}`} />
            {logRefreshing ? "Refreshing…" : "Refresh log"}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* ALL-PRODUCTS-TEST — runs started from the panel above are local
            (insert/invoke/poll) and never write quality_batch_log, so show
            their live lines here too. */}
        {showLocalRunLog && (
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <div className="text-xs font-medium">
                This page — sample data + live generation
              </div>
              {localLog.length > 0 && (
                <Button variant="ghost" size="sm" onClick={clearAllProductsLog}>
                  Clear
                </Button>
              )}
            </div>
            {localLog.length === 0 ? (
              <div className="text-xs text-muted-foreground italic">
                No run started on this page yet.
              </div>
            ) : (
              <div
                ref={localLogRef}
                className="max-h-64 overflow-y-auto rounded border bg-muted/30 p-2 space-y-1 font-mono text-[11px]"
              >
                {localLog.map((l, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <span className="text-muted-foreground shrink-0">
                      {new Date(l.t).toLocaleTimeString()}
                    </span>
                    <Badge
                      variant={l.level === "error" ? "destructive" : "secondary"}
                      className="shrink-0 h-4 px-1 text-[9px]"
                    >
                      {l.source}
                    </Badge>
                    <span className="break-all whitespace-pre-wrap">{l.msg}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
        {showLocalRunLog && (
          <div className="text-xs font-medium">Batch orchestrator log</div>
        )}
        <BatchLogView entries={batchLogs} />
      </CardContent>
    </Card>
  );

  // Scores matrix opens scrolled to the newest batches (right-hand edge).
  // Scrolling BACK (Load older) prepends columns — preserve the viewport's
  // relative position instead of yanking back to the right edge.
  const scoresScrollRef = useRef<HTMLDivElement>(null);
  const prevNewestColId = useRef<string | null>(null);
  const prevScrollWidth = useRef(0);
  const newestColId = matrixColumns.length ? matrixColumns[matrixColumns.length - 1].id : null;
  useEffect(() => {
    const el = scoresScrollRef.current;
    if (!el) return;
    const isNewBatch = newestColId !== prevNewestColId.current;
    const grew = el.scrollWidth - prevScrollWidth.current;
    if (isNewBatch || prevNewestColId.current === null) {
      el.scrollLeft = el.scrollWidth;
    } else if (grew > 0) {
      el.scrollLeft += grew;
    }
    prevNewestColId.current = newestColId;
    prevScrollWidth.current = el.scrollWidth;
  }, [newestColId, matrixColumns.length]);

  const renderScoresCard = () => (

    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Tools & batch scores</CardTitle>
        <Button size="sm" variant="outline" disabled={snapshotting} onClick={onResnapshotBaseline}>
          {snapshotting ? "Snapshotting…" : "Re-snapshot baseline"}
        </Button>
      </CardHeader>
      <CardContent>
        {/* Product names stay pinned on the left; batches scroll horizontally,
            opening on the most recent batches. */}
        {hasOlderBatches && (
          <div className="mb-2">
            <Button size="sm" variant="outline" disabled={loadingOlder} onClick={loadOlderBatches}>
              {loadingOlder ? "Loading…" : `‹ Load older batches (${recentBatches.length} of ${batchTotal} shown)`}
            </Button>
          </div>
        )}
        <div ref={scoresScrollRef} className="overflow-x-auto">
          <table className="w-full min-w-max text-sm">
            <thead>
              <tr className="border-b text-left">
                <th className="sticky left-0 z-20 bg-background py-2 pr-3">Tool</th>
                <th className="py-2 pr-3">Tests (window)</th>
                <th className="py-2 pr-3 bg-muted/40">Baseline</th>
                {matrixColumns.map((col) => (
                  <th
                    key={col.id}
                    className="py-2 pr-3 whitespace-nowrap"
                    title={`${col.id} · ${new Date(col.started_at).toLocaleString()}`}
                  >
                    Batch {col.n}
                    <div className="text-[10px] font-normal text-muted-foreground">
                      {new Date(col.started_at).toLocaleDateString()}
                      {col.kind === "local" ? " · in-page" : ""}
                      {baselineColumnId === col.id ? " · baseline" : ""}
                    </div>
                    <div className="flex gap-1 mt-1">
                      {col.kind === "server" ? (
                        <>
                          <button
                            type="button"
                            className="text-[10px] underline text-brand-teal-text hover:no-underline"
                            onClick={() => onDownloadBatchZip(col.batch)}
                            title="Download PDFs (zip)"
                          >zip</button>
                          <button
                            type="button"
                            className="text-[10px] underline text-brand-teal-text hover:no-underline"
                            onClick={() => onExportBatchMarkdown(col.batch)}
                            title="Export analysis (.md)"
                          >md</button>
                        </>
                      ) : renderLocalBatchActions ? (
                        renderLocalBatchActions(col.id)
                      ) : null}
                      <button
                        type="button"
                        disabled={snapshotting}
                        className={`text-[10px] underline hover:no-underline ${
                          baselineColumnId === col.id
                            ? "font-semibold text-foreground no-underline"
                            : "text-brand-teal-text"
                        }`}
                        onClick={() => void onSetBaselineFromColumn(col, `Batch ${col.n}`)}
                        title="Pin this batch's scores as the baseline"
                      >{baselineColumnId === col.id ? "★ baseline" : "baseline"}</button>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {CONSOLE_TOOLS.map((tool) => {
                const baseline = baselines.get(tool);
                const baseAvg = baseline?.avg_score != null ? Number(baseline.avg_score) : null;
                return (
                  <tr key={tool} className="border-b align-top">
                    <td className="sticky left-0 z-10 bg-background py-2 pr-3 font-mono">{tool}</td>
                    <td className="py-2 pr-3">{testsCount.get(tool) ?? 0}</td>
                    <td
                      className="py-2 pr-3 bg-muted/40 font-mono"
                      title={baseline
                        ? `claude ${baseline.claude_score ?? "—"} · gpt ${baseline.gpt_score ?? "—"}`
                        : undefined}
                    >
                      {baseAvg == null ? "—" : baseAvg.toFixed(1)}
                    </td>
                    {matrixColumns.map((col) => {
                      if (col.kind === "local") {
                        return renderLocalCell(col.id, localToolResult(col.batch.tools, tool));
                      }
                      const b = col.batch;
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
              {(extraHistoryTools ?? []).map((tool) => {
                const st = stressHistory.get(tool);
                const localTotal = localBatches.reduce(
                  (n, b) => n + (localToolResult(b.tools, tool)?.total ?? 0), 0);
                const total = (st?.total ?? 0) + localTotal;
                return (
                  <tr key={tool} className="border-b align-top bg-muted/10">
                    <td className="sticky left-0 z-10 bg-background py-2 pr-3 font-mono">
                      {tool}
                      <div className="text-[10px] font-sans text-muted-foreground">
                        stress harness + in-page · Claude/GPT graded
                      </div>
                    </td>
                    <td
                      className="py-2 pr-3"
                      title={st
                        ? `stress harness: ${st.total} run(s), ${st.complete} complete, ${st.failed} failed${st.lastAt ? ` · last ${new Date(st.lastAt).toLocaleString()}` : ""}`
                        : undefined}
                    >
                      {total}
                    </td>
                    <td className="py-2 pr-3 bg-muted/40 text-muted-foreground">n/a</td>
                    {matrixColumns.map((col) =>
                      col.kind === "local"
                        ? renderLocalCell(col.id, localToolResult(col.batch.tools, tool))
                        : <td key={col.id} className="py-2 pr-3 text-muted-foreground">—</td>,
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      {!scoresAndLogFirst && (
        <div className="flex items-baseline justify-between">
          <h1 className="text-3xl font-serif text-foreground">{title}</h1>
          <span className="text-xs text-muted-foreground font-mono">{caption}</span>
        </div>
      )}

      {/* ALL-PRODUCTS-TEST — hoist the monitoring cards to items 2 & 3. */}
      {scoresAndLogFirst && (
        <>
          {renderScoresCard()}
          {renderLogCard()}
        </>
      )}


      {/* Panel A — Run */}
      <Card>
        <CardHeader><CardTitle>Run</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Tools (dispatched sequentially by the orchestrator)</Label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-2">
              {CONSOLE_TOOLS.map((t) => (
                <div key={t} className="flex items-center gap-2 text-sm">
                  <label className="flex items-center gap-2">
                    <Checkbox
                      checked={selected.has(t)}
                      onCheckedChange={(v) => toggleTool(t, v === true)}
                      disabled={isBatchRunning}
                    />
                    <span className="font-mono text-xs">{t}</span>
                  </label>
                  {/* ITEM 325 — per-tool Perfect/Messy variant toggle. */}
                  {showVariants && (
                    <div className="ml-auto flex rounded border overflow-hidden">
                      {(["perfect", "messy"] as FixtureVariant[]).map((v) => (
                        <button
                          key={v}
                          type="button"
                          disabled={isBatchRunning || !selected.has(t)}
                          onClick={() => setVariantFor(t, v)}
                          className={
                            "px-2 py-0.5 text-[10px] font-mono uppercase tracking-wide transition-colors disabled:opacity-40 " +
                            (variantFor(t) === v
                              ? "bg-brand-teal text-primary-foreground"
                              : "bg-background text-muted-foreground hover:bg-muted")
                          }
                          title={v === "messy"
                            ? "Realistic/incomplete fixtures — none authored yet; the run will be rejected until they exist"
                            : "Ratified golden fixtures"}
                        >{v}</button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
            <div className="flex gap-2 mt-2 text-xs">
              <button
                type="button"
                className="text-brand-teal-text underline hover:no-underline disabled:opacity-40"
                disabled={isBatchRunning}
                onClick={() => setSelected(new Set(CONSOLE_TOOLS))}
              >Select all</button>
              <button
                type="button"
                className="text-brand-teal-text underline hover:no-underline disabled:opacity-40"
                disabled={isBatchRunning}
                onClick={() => setSelected(new Set())}
              >Clear</button>
              <span className="text-muted-foreground ml-auto">{selected.size} selected</span>
            </div>
            {showVariants && (
              <p className="text-xs text-muted-foreground mt-2">
                Variant selects which pinned fixture set each tool is measured against.
                <strong> Messy fixtures are not authored yet</strong> — a messy run is rejected
                with the tool name until they land.
              </p>
            )}
          </div>

          {showVariants && (
            <div className="border rounded p-3 space-y-1">
              <label className="flex items-center gap-2 text-sm font-medium">
                <Checkbox
                  checked={abModels}
                  disabled={isBatchRunning}
                  onCheckedChange={(c) => setAbModels(c === true)}
                />
                A/B models — generate every fixture twice
              </label>
              <p className="text-xs text-muted-foreground">
                Each selected tool+fixture is generated once on{" "}
                <code>{DEFAULT_GENERATION_MODEL}</code> and once on{" "}
                <code>{AB_ALT_GENERATION_MODEL}</code> as a linked pair. Both documents are
                graded normally; grader and rubric models are pinned and never vary.
                Doubles batch runtime and spend.
              </p>
            </div>
          )}

          {showVariants && (
            <div className="border rounded p-3 space-y-2">
              <Label>Pins mode</Label>
              <div className="space-y-2">
                {PINS_MODE_OPTIONS.map((opt) => (
                  <label key={opt.value} className="flex items-start gap-2 text-sm">
                    <input
                      type="radio"
                      name="pins-mode"
                      className="mt-1"
                      value={opt.value}
                      checked={pinsMode === opt.value}
                      disabled={isBatchRunning}
                      onChange={() => {
                        setPinsMode(opt.value);
                        setPinnedOnly(opt.value === "only");
                      }}
                    />
                    <span>
                      <span className="font-medium">{opt.label}</span>
                      <span className="block text-xs text-muted-foreground">{opt.description}</span>
                    </span>
                  </label>
                ))}
              </div>
            </div>
          )}

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

          {/* MODEL A/B HARNESS (dispatch 1) — side-by-side pair results. Renders
              only when the active batch actually produced linked pairs. */}
          {activeBatch && <ModelPairTable batch={activeBatch} toolResults={activeToolResults} />}

          {/* QB-P24 Item 5 — per-tool Pinned rerun. Reuses the QB-P23
              orchestrator action; admin JWT is carried by supabase.functions.invoke.
              Disabled while a batch is running so we do not stomp a session. */}
          <div className="pt-2 border-t space-y-2">
            <Label>Pinned rerun (golden fixtures)</Label>
            <div className="flex flex-wrap gap-2">
              {CONSOLE_TOOLS.map((t) => (
                <Button
                  key={t}
                  size="sm"
                  variant="outline"
                  disabled={isBatchRunning || pinning === t}
                  onClick={() => onPinnedRerun(t)}
                  title={isBatchRunning ? "Finish the running batch first" : `Rerun ${t} against its pinned golden fixtures`}
                >
                  {pinning === t ? "…" : t}
                </Button>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              Dispatches <code>{'{ action: "pinned_rerun", tool }'}</code> to quality-batch-orchestrator.
            </p>
          </div>


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
                {CONSOLE_TOOLS.map((t) => <option key={t} value={t}>{t}</option>)}
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
      <LaunchGateScoreboard tools={CONSOLE_TOOLS} />

      {/* CPPA-PRODUCT-1 L5 — Findings-to-Backlog surface */}
      <QualityFindingBacklogPanel />

      {/* CEO CERTIFICATION STANDARD (2026-07-24) — per-tool 3-consecutive-wave state */}
      <CertificationStatusPanel />

      {/* Panel B — Live log */}
      {!scoresAndLogFirst && renderLogCard()}

      {/* Panel C — Tools × Batches score matrix */}
      {!scoresAndLogFirst && renderScoresCard()}

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
      .select("id, status, wave_number, wave_interval_minutes, concurrency, estimated_spend_cents, budget_cap_cents, tool_state")
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
