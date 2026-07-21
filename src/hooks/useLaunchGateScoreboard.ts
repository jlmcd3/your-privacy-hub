// ADMIN-GATE-UI — Option-A findings-based launch-gate scoreboard.
// Read-only client-side derivation from quality_runs + quality_check_results.
// The batch-review layer (program log / ruled false positives) can supersede
// raw verdicts — see footer caption on the scoreboard.
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export const GATE_BASIS_START = "2026-07-20T20:59:38+00:00"; // RUN 4 forward
export const GATE_ZERO_BASELINE = "2026-07-20T07:20:00+00:00"; // cost cap
export const GATE_TARGET_STREAK = 3;
export const GATE_RUNS_CAP = 10;

export type GateVerdict = "PASS" | "FAIL" | "ERROR";

export type FailingClass = {
  check_id: string;
  kind: "det" | "high";
  gpt_only?: boolean;
};

export type ToolRunHistory = {
  run_id: string;
  run_number: number | null;
  started_at: string;
  verdict: GateVerdict;
  in_basis: boolean;
};

export type ToolGateRow = {
  tool: string;
  latest?: ToolRunHistory;
  latestCompleted?: ToolRunHistory;
  failingClasses: FailingClass[];
  mediumsCount: number;
  streak: number; // consecutive PASS from most recent (errors skipped) within basis window
  gateMet: boolean;
  runsInCap: number; // count since ZERO_BASELINE (includes errors + in-flight)
  history: ToolRunHistory[];
  score_overall: number | null;
  gpt_score_overall: number | null;
};

type QRunLite = {
  id: string;
  tool: string;
  status: string;
  run_number: number | null;
  started_at: string;
  score_overall: number | null;
  gpt_score_overall: number | null;
};

type QCheckLite = {
  run_id: string;
  check_id: string;
  check_type: string;
  severity: string;
  fail_count: number;
  gpt_fail_count: number | null;
  cross_review_category: string | null;
};

const RUNNING_STATUSES = new Set(["pending", "running", "in_progress", "queued"]);

function computeVerdict(run: QRunLite, checks: QCheckLite[]): GateVerdict {
  if ((run.status ?? "").toLowerCase() === "error") return "ERROR";
  for (const c of checks) {
    if (c.check_type === "deterministic" && (c.fail_count ?? 0) > 0) return "FAIL";
    if (
      (c.severity ?? "").toLowerCase() === "high" &&
      ((c.fail_count ?? 0) > 0 || (c.gpt_fail_count ?? 0) > 0)
    )
      return "FAIL";
  }
  return "PASS";
}

export function useLaunchGateScoreboard(tools: string[]) {
  const [rows, setRows] = useState<ToolGateRow[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshedAt, setRefreshedAt] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: runsData, error: rErr } = await supabase
        .from("quality_runs")
        .select(
          "id, tool, status, run_number, started_at, score_overall, gpt_score_overall"
        )
        .in("tool", tools)
        .gte("started_at", GATE_ZERO_BASELINE)
        .order("started_at", { ascending: false });
      if (rErr) throw rErr;
      const runs = (runsData ?? []) as QRunLite[];
      const runIds = runs.map((r) => r.id);

      let checks: QCheckLite[] = [];
      if (runIds.length > 0) {
        // Chunk to keep .in() query size reasonable.
        const chunkSize = 100;
        for (let i = 0; i < runIds.length; i += chunkSize) {
          const slice = runIds.slice(i, i + chunkSize);
          const { data, error: cErr } = await supabase
            .from("quality_check_results")
            .select(
              "run_id, check_id, check_type, severity, fail_count, gpt_fail_count, cross_review_category"
            )
            .in("run_id", slice);
          if (cErr) throw cErr;
          checks = checks.concat((data ?? []) as QCheckLite[]);
        }
      }

      const checksByRun = new Map<string, QCheckLite[]>();
      for (const c of checks) {
        const arr = checksByRun.get(c.run_id) ?? [];
        arr.push(c);
        checksByRun.set(c.run_id, arr);
      }

      const byTool = new Map<string, QRunLite[]>();
      for (const r of runs) {
        const arr = byTool.get(r.tool) ?? [];
        arr.push(r);
        byTool.set(r.tool, arr);
      }

      const result: ToolGateRow[] = tools.map((tool) => {
        const toolRuns = (byTool.get(tool) ?? []).slice().sort((a, b) =>
          b.started_at.localeCompare(a.started_at)
        );
        const history: ToolRunHistory[] = toolRuns.map((r) => ({
          run_id: r.id,
          run_number: r.run_number,
          started_at: r.started_at,
          verdict: computeVerdict(r, checksByRun.get(r.id) ?? []),
          in_basis: r.started_at >= GATE_BASIS_START,
        }));

        const latest = history[0];
        const latestCompleted = toolRuns.find(
          (r) => !RUNNING_STATUSES.has((r.status ?? "").toLowerCase())
        );
        const latestCompletedHist = latestCompleted
          ? history.find((h) => h.run_id === latestCompleted.id)
          : undefined;

        // Failing classes on latest completed run
        const failingClasses: FailingClass[] = [];
        let mediumsCount = 0;
        if (latestCompleted) {
          const cs = checksByRun.get(latestCompleted.id) ?? [];
          const detIds = new Set<string>();
          const highIds = new Map<string, boolean>(); // check_id -> gpt_only?
          const medIds = new Set<string>();
          for (const c of cs) {
            const sev = (c.severity ?? "").toLowerCase();
            const failing =
              (c.fail_count ?? 0) > 0 || (c.gpt_fail_count ?? 0) > 0;
            if (c.check_type === "deterministic" && (c.fail_count ?? 0) > 0) {
              detIds.add(c.check_id);
            }
            if (sev === "high" && failing) {
              const isGptOnly =
                (c.cross_review_category ?? "").toLowerCase() === "gpt_only";
              // Preserve gpt_only=true if any row tagged so
              if (!highIds.has(c.check_id) || isGptOnly) {
                highIds.set(c.check_id, isGptOnly);
              }
            }
            if (sev === "medium" && failing) {
              medIds.add(c.check_id);
            }
          }
          for (const id of detIds) failingClasses.push({ check_id: id, kind: "det" });
          for (const [id, gptOnly] of highIds) {
            failingClasses.push({ check_id: id, kind: "high", gpt_only: gptOnly });
          }
          mediumsCount = medIds.size;
        }

        // Streak within basis window: consecutive PASS from most-recent backward,
        // ERROR runs are skipped (neither pass nor break).
        let streak = 0;
        for (const h of history) {
          if (!h.in_basis) break;
          if (h.verdict === "ERROR") continue;
          if (h.verdict === "PASS") streak += 1;
          else break;
        }
        if (streak > GATE_TARGET_STREAK) streak = GATE_TARGET_STREAK;

        const runsInCap = toolRuns.length; // all >= ZERO_BASELINE

        const scoreRun = latestCompleted;
        return {
          tool,
          latest,
          latestCompleted: latestCompletedHist,
          failingClasses,
          mediumsCount,
          streak,
          gateMet: streak >= GATE_TARGET_STREAK,
          runsInCap,
          history,
          score_overall: scoreRun?.score_overall ?? null,
          gpt_score_overall: scoreRun?.gpt_score_overall ?? null,
        };
      });

      setRows(result);
      setRefreshedAt(Date.now());
    } catch (e: any) {
      setError(e?.message ?? String(e));
    } finally {
      setLoading(false);
    }
  }, [tools.join("|")]);

  useEffect(() => {
    load();
    const t = setInterval(load, 30_000);
    return () => clearInterval(t);
  }, [load]);

  return { rows, loading, error, refreshedAt, reload: load };
}
