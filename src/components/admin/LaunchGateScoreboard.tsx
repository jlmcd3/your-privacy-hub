// ADMIN-GATE-UI — Option-A findings-based launch gate scoreboard.
// QB-P9 — adds median-of-last-3 Claude score per tool and a "certified"
// badge for tools that campaign mode has retired with reason='certified'.
// Metric and label only — zero styling / color changes (design tokens frozen).
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import {
  useLaunchGateScoreboard,
  GATE_TARGET_STREAK,
  GATE_RUNS_CAP,
  type GateVerdict,
  type ToolGateRow,
} from "@/hooks/useLaunchGateScoreboard";

// QB-P9 — compute median of numeric samples (returns null for empty).
function median(xs: number[]): number | null {
  if (xs.length === 0) return null;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

function verdictClass(v: GateVerdict): string {
  switch (v) {
    case "PASS":
      return "bg-emerald-100 text-emerald-800 border border-emerald-300";
    case "FAIL":
      return "bg-red-100 text-red-800 border border-red-300";
    case "ERROR":
      return "bg-gray-200 text-gray-700 border border-gray-300";
  }
}

function VerdictBadge({ v, title }: { v: GateVerdict; title?: string }) {
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono uppercase tracking-wider ${verdictClass(
        v
      )}`}
      title={title}
    >
      {v}
    </span>
  );
}

function GateRow({ row, medianLast3, certified }: { row: ToolGateRow; medianLast3: number | null; certified: boolean }) {
  const latestV = row.latest?.verdict;
  const atCap = row.runsInCap >= GATE_RUNS_CAP;
  return (
    <div className="border rounded p-3 space-y-2 bg-card">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-mono text-sm font-semibold">{row.tool}</span>
        {latestV && (
          <VerdictBadge
            v={latestV}
            title={
              latestV === "ERROR"
                ? "consumes cap; does not pass or break streak"
                : undefined
            }
          />
        )}
        {row.gateMet && (
          <Badge className="h-5 text-[10px] bg-emerald-600 hover:bg-emerald-600">
            GATE MET
          </Badge>
        )}
        {certified && (
          <Badge variant="outline" className="h-5 text-[10px]" title="Retired by campaign — reason=certified">
            CERTIFIED
          </Badge>
        )}
        <div className="ml-auto flex items-center gap-3 text-xs">
          <span className="font-mono" title="Option-A basis (RUN 4 forward)">
            streak {row.streak}/{GATE_TARGET_STREAK}
          </span>
          <span
            className={`font-mono ${atCap ? "text-red-700 font-semibold" : ""}`}
            title="Cost cap since zero-baseline; includes error & in-flight runs"
          >
            runs {row.runsInCap}/{GATE_RUNS_CAP}
            {atCap ? " · CAP" : ""}
          </span>
        </div>
      </div>

      {/* History strip — most recent left */}
      {row.history.length > 0 && (
        <div className="flex flex-wrap items-center gap-1">
          {row.history.map((h) => (
            <span
              key={h.run_id}
              title={`${h.verdict} · run #${h.run_number ?? "?"} · ${new Date(
                h.started_at
              ).toLocaleString()}${h.in_basis ? "" : " · pre-basis"}`}
              className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-mono ${
                h.verdict === "ERROR"
                  ? "bg-gray-100 text-gray-500 border border-gray-200"
                  : h.verdict === "PASS"
                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                  : "bg-red-50 text-red-700 border border-red-200"
              } ${h.in_basis ? "" : "opacity-50"}`}
            >
              {h.verdict}
            </span>
          ))}
        </div>
      )}

      {/* Failing classes */}
      {row.failingClasses.length > 0 ? (
        <div className="text-xs">
          <span className="text-muted-foreground">failing classes:</span>{" "}
          <span className="font-mono break-all">
            {row.failingClasses
              .slice()
              .sort((a, b) => (a.kind === b.kind ? a.check_id.localeCompare(b.check_id) : a.kind === "det" ? -1 : 1))
              .map((f, i) => (
                <span key={`${f.kind}-${f.check_id}`}>
                  {i > 0 ? ", " : ""}
                  <span
                    className={
                      f.kind === "det"
                        ? "text-red-700"
                        : "text-orange-700"
                    }
                  >
                    {f.kind}:{f.check_id}
                    {f.gpt_only ? " (cross-review: GPT-originated)" : ""}
                  </span>
                </span>
              ))}
          </span>
        </div>
      ) : (
        latestV === "PASS" && (
          <div className="text-xs text-muted-foreground">no gating findings</div>
        )
      )}

      <div className="flex flex-wrap gap-4 text-[11px] text-muted-foreground">
        <span>mediums tracked: {row.mediumsCount}</span>
        <span title="Median Claude overall of the last 3 completed runs (or fewer when fewer exist)">
          median(last 3): {medianLast3 == null ? "—" : medianLast3.toFixed(1)}
        </span>
        <span>
          <span className="uppercase tracking-wider text-[9px]">telemetry — non-gating</span>{" "}
          claude {row.score_overall?.toFixed?.(1) ?? "—"} · gpt{" "}
          {row.gpt_score_overall?.toFixed?.(1) ?? "—"}
        </span>
      </div>
    </div>
  );
}

export function LaunchGateScoreboard({ tools }: { tools: string[] }) {
  const { rows, loading, error, refreshedAt, reload } = useLaunchGateScoreboard(tools);

  // QB-P9 — median-of-last-3 Claude scores per tool + "certified" set from
  // the single quality_campaigns row. Display-only; no gating impact.
  const [medianByTool, setMedianByTool] = useState<Record<string, number | null>>({});
  const [certifiedTools, setCertifiedTools] = useState<Set<string>>(new Set());

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data: recent } = await supabase
          .from("quality_runs")
          .select("tool, score_overall, status, started_at")
          .in("tool", tools)
          .eq("status", "complete")
          .order("started_at", { ascending: false })
          .limit(tools.length * 3 + 30);
        const byTool: Record<string, number[]> = {};
        for (const r of (recent ?? []) as any[]) {
          if (r.score_overall == null) continue;
          (byTool[r.tool] ??= []);
          if (byTool[r.tool].length < 3) byTool[r.tool].push(Number(r.score_overall));
        }
        const medians: Record<string, number | null> = {};
        for (const t of tools) medians[t] = median(byTool[t] ?? []);
        if (!cancelled) setMedianByTool(medians);

        const { data: campaign } = await supabase
          .from("quality_campaigns")
          .select("tool_state")
          .order("created_at", { ascending: true })
          .limit(1)
          .maybeSingle();
        const state = ((campaign as any)?.tool_state ?? {}) as Record<string, { retired_reason?: string | null }>;
        const cert = new Set<string>();
        for (const [tool, s] of Object.entries(state)) {
          if (s?.retired_reason === "certified") cert.add(tool);
        }
        if (!cancelled) setCertifiedTools(cert);
      } catch (_) { /* metric-only; ignore */ }
    })();
    return () => { cancelled = true; };
  }, [tools.join("|"), refreshedAt]);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>
          Launch-gate scoreboard{" "}
          <span className="text-xs text-muted-foreground font-normal">
            (Option-A · findings-based)
          </span>
        </CardTitle>
        <div className="flex items-center gap-2">
          {refreshedAt && (
            <span className="text-xs text-muted-foreground font-mono">
              {new Date(refreshedAt).toLocaleTimeString()}
            </span>
          )}
          <Button variant="ghost" size="sm" onClick={reload} disabled={loading}>
            {loading ? "…" : "Refresh"}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {error && <div className="text-xs text-destructive">{error}</div>}
        {!rows && loading && (
          <div className="text-xs text-muted-foreground">Loading…</div>
        )}
        {rows && (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
            {rows.map((r) => (
              <GateRow
                key={r.tool}
                row={r}
                medianLast3={medianByTool[r.tool] ?? null}
                certified={certifiedTools.has(r.tool)}
              />
            ))}
          </div>
        )}
        <p className="text-[11px] text-muted-foreground pt-2 border-t">
          Computed live from quality_runs / quality_check_results. Findings-level
          rulings in batch review (program log) may supersede individual raw
          verdicts (e.g. ruled false positives); the review-layer calculation is
          authoritative.
        </p>
      </CardContent>
    </Card>
  );
}

export default LaunchGateScoreboard;
