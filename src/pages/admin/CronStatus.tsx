import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import PageContainer from "@/components/PageContainer";

interface CronRow {
  jobid: number;
  jobname: string;
  schedule: string;
  active: boolean;
  command_preview: string;
  last_run_at: string | null;
  last_status: string | null;
  last_duration_ms: number | null;
  last_fetched: number | null;
  last_inserted: number | null;
  last_skipped: number | null;
  last_error: string | null;
  failures_7d: number;
}

type SortKey = "jobname" | "schedule" | "last_run_at" | "failures_7d";

function fmtDuration(ms: number | null) {
  if (ms == null) return "—";
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60_000) return `${(ms / 1000).toFixed(1)}s`;
  return `${Math.floor(ms / 60_000)}m ${Math.round((ms % 60_000) / 1000)}s`;
}

function fmtTime(iso: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function ageBadge(iso: string | null) {
  if (!iso) return { label: "never", tone: "muted" as const };
  const ageMin = (Date.now() - new Date(iso).getTime()) / 60_000;
  if (ageMin < 60) return { label: `${Math.round(ageMin)}m ago`, tone: "ok" as const };
  if (ageMin < 60 * 24) return { label: `${Math.round(ageMin / 60)}h ago`, tone: "ok" as const };
  if (ageMin < 60 * 24 * 8) return { label: `${Math.round(ageMin / 60 / 24)}d ago`, tone: "warn" as const };
  return { label: `${Math.round(ageMin / 60 / 24)}d ago`, tone: "bad" as const };
}

function statusTone(s: string | null) {
  if (!s) return "muted";
  const v = s.toLowerCase();
  if (v === "success" || v === "ok") return "ok";
  if (v === "partial") return "warn";
  if (v === "running") return "info";
  return "bad";
}

const TONE_CLASSES: Record<string, string> = {
  ok: "bg-severity-positive/15 text-severity-positive border-severity-positive/30",
  warn: "bg-severity-warning/15 text-severity-warning border-severity-warning/30",
  bad: "bg-severity-negative/15 text-severity-negative border-severity-negative/30",
  info: "bg-brand-teal/15 text-brand-teal-text border-brand-teal/30",
  muted: "bg-muted text-muted-foreground border-border",
};

export default function CronStatus() {
  const [rows, setRows] = useState<CronRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>("schedule");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [filter, setFilter] = useState("");
  const [expanded, setExpanded] = useState<number | null>(null);

  useEffect(() => {
    void (async () => {
      const { data, error: err } = await supabase.rpc("get_cron_jobs_with_last_run");
      if (err) {
        setError(err.message);
        return;
      }
      setRows((data ?? []) as CronRow[]);
    })();
  }, []);

  const sorted = useMemo(() => {
    if (!rows) return [];
    const f = filter.trim().toLowerCase();
    const filtered = f
      ? rows.filter(
          (r) =>
            r.jobname.toLowerCase().includes(f) ||
            r.schedule.toLowerCase().includes(f) ||
            (r.last_status ?? "").toLowerCase().includes(f),
        )
      : rows;
    const dir = sortDir === "asc" ? 1 : -1;
    return [...filtered].sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      if (av == null && bv == null) return 0;
      if (av == null) return 1;
      if (bv == null) return -1;
      if (typeof av === "number" && typeof bv === "number") return (av - bv) * dir;
      return String(av).localeCompare(String(bv)) * dir;
    });
  }, [rows, sortKey, sortDir, filter]);

  const summary = useMemo(() => {
    if (!rows) return null;
    const total = rows.length;
    const active = rows.filter((r) => r.active).length;
    const failingRecently = rows.filter((r) => r.failures_7d > 0).length;
    const neverRan = rows.filter((r) => !r.last_run_at).length;
    const staleOver8d = rows.filter((r) => {
      if (!r.last_run_at) return false;
      return Date.now() - new Date(r.last_run_at).getTime() > 8 * 24 * 60 * 60 * 1000;
    }).length;
    return { total, active, failingRecently, neverRan, staleOver8d };
  }, [rows]);

  function toggleSort(k: SortKey) {
    if (sortKey === k) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(k);
      setSortDir("asc");
    }
  }

  return (
    <PageContainer width="wide" className="py-8">
      <div className="flex items-baseline justify-between mb-1">
        <h1 className="font-serif text-3xl">Cron Health</h1>
        <span className="text-sm text-muted-foreground">All times UTC</span>
      </div>
      <p className="text-sm text-muted-foreground mb-6">
        Master cron schedule joined to the latest <code>ingestion_runs</code> row per job.
      </p>

      {error && (
        <div className="mb-4 p-3 border border-severity-negative/30 bg-severity-negative/10 text-severity-negative text-sm rounded">
          Error loading schedule: {error}
        </div>
      )}

      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
          <SummaryTile label="Jobs scheduled" value={summary.total} />
          <SummaryTile label="Active" value={summary.active} />
          <SummaryTile
            label="Failed in last 7d"
            value={summary.failingRecently}
            tone={summary.failingRecently > 0 ? "warn" : "ok"}
          />
          <SummaryTile
            label="Never observed"
            value={summary.neverRan}
            tone={summary.neverRan > 0 ? "warn" : "ok"}
            hint="Job is scheduled but no matching ingestion_runs row found (some jobs don't write to that table)"
          />
          <SummaryTile
            label="Stale > 8 days"
            value={summary.staleOver8d}
            tone={summary.staleOver8d > 0 ? "bad" : "ok"}
          />
        </div>
      )}

      <div className="mb-4">
        <input
          type="search"
          placeholder="Filter by job name, schedule, or status…"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="w-full md:w-96 px-3 py-2 border border-border rounded bg-background text-sm"
        />
      </div>

      {!rows && !error && <div className="text-muted-foreground">Loading…</div>}

      {rows && (
        <div className="overflow-x-auto border border-border rounded">
          <table className="w-full text-sm border-collapse">
            <thead className="bg-muted/40 text-left">
              <tr>
                <Th onClick={() => toggleSort("jobname")} active={sortKey === "jobname"} dir={sortDir}>
                  Job
                </Th>
                <Th onClick={() => toggleSort("schedule")} active={sortKey === "schedule"} dir={sortDir}>
                  Schedule
                </Th>
                <th className="py-2 px-3">Active</th>
                <Th onClick={() => toggleSort("last_run_at")} active={sortKey === "last_run_at"} dir={sortDir}>
                  Last run
                </Th>
                <th className="py-2 px-3">Status</th>
                <th className="py-2 px-3">Duration</th>
                <th className="py-2 px-3 text-right">Fetched</th>
                <th className="py-2 px-3 text-right">Inserted</th>
                <Th
                  onClick={() => toggleSort("failures_7d")}
                  active={sortKey === "failures_7d"}
                  dir={sortDir}
                  className="text-right"
                >
                  Fails 7d
                </Th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((r) => {
                const age = ageBadge(r.last_run_at);
                const st = statusTone(r.last_status);
                const isOpen = expanded === r.jobid;
                return (
                  <>
                    <tr
                      key={r.jobid}
                      className="border-t border-border align-top cursor-pointer hover:bg-muted/30"
                      onClick={() => setExpanded(isOpen ? null : r.jobid)}
                    >
                      <td className="py-2 px-3 font-mono text-xs">{r.jobname}</td>
                      <td className="py-2 px-3 font-mono text-xs whitespace-nowrap">{r.schedule}</td>
                      <td className="py-2 px-3">
                        {r.active ? (
                          <span className={`px-2 py-0.5 text-xs rounded border ${TONE_CLASSES.ok}`}>yes</span>
                        ) : (
                          <span className={`px-2 py-0.5 text-xs rounded border ${TONE_CLASSES.bad}`}>no</span>
                        )}
                      </td>
                      <td className="py-2 px-3 whitespace-nowrap">
                        <span className={`px-2 py-0.5 text-xs rounded border ${TONE_CLASSES[age.tone]}`}>
                          {age.label}
                        </span>
                        <div className="text-[11px] text-muted-foreground mt-0.5">{fmtTime(r.last_run_at)}</div>
                      </td>
                      <td className="py-2 px-3">
                        {r.last_status ? (
                          <span className={`px-2 py-0.5 text-xs rounded border ${TONE_CLASSES[st]}`}>
                            {r.last_status}
                          </span>
                        ) : (
                          <span className="text-muted-foreground text-xs">—</span>
                        )}
                      </td>
                      <td className="py-2 px-3 whitespace-nowrap">{fmtDuration(r.last_duration_ms)}</td>
                      <td className="py-2 px-3 text-right tabular-nums">{r.last_fetched ?? "—"}</td>
                      <td className="py-2 px-3 text-right tabular-nums">{r.last_inserted ?? "—"}</td>
                      <td className="py-2 px-3 text-right tabular-nums">
                        {r.failures_7d > 0 ? (
                          <span className={`px-2 py-0.5 text-xs rounded border ${TONE_CLASSES.warn}`}>
                            {r.failures_7d}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">0</span>
                        )}
                      </td>
                    </tr>
                    {isOpen && (
                      <tr className="bg-muted/20 border-t border-border">
                        <td colSpan={9} className="py-3 px-3">
                          <div className="grid md:grid-cols-2 gap-4 text-xs">
                            <div>
                              <div className="font-semibold mb-1 text-muted-foreground">Command (first 200 chars)</div>
                              <pre className="font-mono text-[11px] whitespace-pre-wrap break-all bg-background border border-border rounded p-2">
                                {r.command_preview}
                              </pre>
                            </div>
                            <div>
                              <div className="font-semibold mb-1 text-muted-foreground">Last error</div>
                              <pre className="font-mono text-[11px] whitespace-pre-wrap break-words bg-background border border-border rounded p-2 min-h-[3rem]">
                                {r.last_error ?? "—"}
                              </pre>
                              <div className="mt-2 text-muted-foreground">
                                Skipped: <span className="tabular-nums">{r.last_skipped ?? "—"}</span>
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </PageContainer>
  );
}

function Th({
  children,
  onClick,
  active,
  dir,
  className,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  active?: boolean;
  dir?: "asc" | "desc";
  className?: string;
}) {
  return (
    <th
      className={`py-2 px-3 cursor-pointer select-none ${className ?? ""}`}
      onClick={onClick}
    >
      {children}
      {active && <span className="ml-1 text-muted-foreground">{dir === "asc" ? "▲" : "▼"}</span>}
    </th>
  );
}

function SummaryTile({
  label,
  value,
  tone = "muted",
  hint,
}: {
  label: string;
  value: number | string;
  tone?: "ok" | "warn" | "bad" | "muted";
  hint?: string;
}) {
  return (
    <div className={`border rounded p-3 ${TONE_CLASSES[tone]}`} title={hint}>
      <div className="text-2xl font-semibold tabular-nums">{value}</div>
      <div className="text-xs opacity-80">{label}</div>
    </div>
  );
}
