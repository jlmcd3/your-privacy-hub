// ADMIN-GATE-UI — Option-A findings-based launch gate scoreboard.
// Renders one row per product with verdict, failing classes, streak, runs cap,
// mediums, and (non-gating) telemetry scores. Read-only.
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  useLaunchGateScoreboard,
  GATE_TARGET_STREAK,
  GATE_RUNS_CAP,
  type GateVerdict,
  type ToolGateRow,
} from "@/hooks/useLaunchGateScoreboard";

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

function GateRow({ row }: { row: ToolGateRow }) {
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
                    {f.gpt_only ? " (gpt-only)" : ""}
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
              <GateRow key={r.tool} row={r} />
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
