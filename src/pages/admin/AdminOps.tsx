// MC-S1a — /admin/ops
// READ-ONLY operator console. Composes function_runs + generation-telemetry +
// crons + enrichment/backfill panels. No action buttons fire; backfill buttons
// render disabled with a "wired in S1b" tooltip. Frontend-only, no schema or
// edge-function changes.
import { useEffect, useMemo, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import PageContainer from "@/components/PageContainer";
import AdminOnly from "@/components/AdminOnly";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

// ---------- shared helpers ----------
const MS_HOUR = 60 * 60 * 1000;
const ORPHAN_STUCK_MS = 15 * 60 * 1000; // status non-terminal > 15m => orphan
const TERMINAL = new Set(["success", "error", "partial"]);

function fmtMs(ms: number | null | undefined) {
  if (ms == null || !Number.isFinite(ms)) return "—";
  if (ms < 1000) return `${Math.round(ms)}ms`;
  if (ms < 60_000) return `${(ms / 1000).toFixed(1)}s`;
  return `${Math.floor(ms / 60_000)}m ${Math.round((ms % 60_000) / 1000)}s`;
}
function fmtInt(n: number | null | undefined) {
  return n == null ? "—" : n.toLocaleString();
}
function pct(num: number, den: number) {
  if (!den) return "—";
  return `${((num / den) * 100).toFixed(1)}%`;
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
function quantile(sorted: number[], q: number): number | null {
  if (!sorted.length) return null;
  const pos = (sorted.length - 1) * q;
  const base = Math.floor(pos);
  const rest = pos - base;
  if (sorted[base + 1] != null) return sorted[base] + rest * (sorted[base + 1] - sorted[base]);
  return sorted[base];
}
function statusColor(s: string) {
  switch (s) {
    case "success": return "bg-green-500/15 text-green-400 border border-green-500/30";
    case "error":   return "bg-red-500/15 text-red-400 border border-red-500/30";
    case "running": return "bg-amber-500/15 text-amber-400 border border-amber-500/30";
    case "partial": return "bg-gray-500/15 text-gray-400 border border-gray-500/30";
    default:        return "bg-gray-500/15 text-gray-400 border border-gray-500/30";
  }
}

// ---------- Panel A: Functions rollup ----------
interface FuncRun {
  function_name: string; status: string;
  started_at: string; finished_at: string | null; duration_ms: number | null;
}
interface FuncRollup {
  name: string; latest_status: string; latest_started: string;
  runs_24h: number; err_24h: number;
  runs_7d: number;  err_7d: number;
  orphans: number; mean_ms: number | null;
}

function FunctionsPanel() {
  const [rows, setRows] = useState<FuncRun[]>([]);
  const [dataSince, setDataSince] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true); setErr(null);
    const since = new Date(Date.now() - 7 * 24 * MS_HOUR).toISOString();
    const { data, error } = await supabase
      .from("function_runs")
      .select("function_name,status,started_at,finished_at,duration_ms")
      .gte("started_at", since)
      .order("started_at", { ascending: false })
      .limit(5000);
    if (error) setErr(error.message);
    setRows((data ?? []) as FuncRun[]);
    setDataSince(since);
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  const rollup = useMemo<FuncRollup[]>(() => {
    const now = Date.now();
    const t24 = now - 24 * MS_HOUR;
    const byFn = new Map<string, FuncRun[]>();
    for (const r of rows) {
      if (!byFn.has(r.function_name)) byFn.set(r.function_name, []);
      byFn.get(r.function_name)!.push(r);
    }
    const out: FuncRollup[] = [];
    for (const [name, list] of byFn.entries()) {
      const latest = list[0];
      let runs24 = 0, err24 = 0, runs7 = 0, err7 = 0, orphans = 0;
      let durSum = 0, durN = 0;
      for (const r of list) {
        const t = Date.parse(r.started_at);
        runs7 += 1;
        if (r.status === "error") err7 += 1;
        if (t >= t24) { runs24 += 1; if (r.status === "error") err24 += 1; }
        if (!TERMINAL.has(r.status) && now - t > ORPHAN_STUCK_MS) orphans += 1;
        if (r.duration_ms != null) { durSum += r.duration_ms; durN += 1; }
      }
      out.push({
        name, latest_status: latest.status, latest_started: latest.started_at,
        runs_24h: runs24, err_24h: err24, runs_7d: runs7, err_7d: err7,
        orphans, mean_ms: durN ? Math.round(durSum / durN) : null,
      });
    }
    out.sort((a, b) => a.name.localeCompare(b.name));
    return out;
  }, [rows]);

  return (
    <section className="mb-10">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h2 className="text-lg font-semibold text-white">Functions</h2>
          <p className="text-xs text-gray-500">
            Rollup of <code>function_runs</code>. Data since {fmtTime(dataSince)}.{" "}
            <Link to="/admin/function-health" className="underline">Open Function Health →</Link>
          </p>
        </div>
        <Button onClick={load} disabled={loading} variant="outline" size="sm">
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>
      {err && <div className="mb-3 rounded bg-red-500/10 border border-red-500/30 p-2 text-sm text-red-300">{err}</div>}
      <div className="overflow-x-auto rounded border border-gray-800">
        <table className="w-full text-sm text-black">
          <thead className="bg-gray-100">
            <tr>
              <th className="text-left px-3 py-2 font-medium">Function</th>
              <th className="text-left px-3 py-2 font-medium">Latest</th>
              <th className="text-left px-3 py-2 font-medium">Last started</th>
              <th className="text-right px-3 py-2 font-medium">Runs 24h</th>
              <th className="text-right px-3 py-2 font-medium">Err 24h</th>
              <th className="text-right px-3 py-2 font-medium">Runs 7d</th>
              <th className="text-right px-3 py-2 font-medium">Err 7d</th>
              <th className="text-right px-3 py-2 font-medium">Orphans</th>
              <th className="text-right px-3 py-2 font-medium">Mean duration</th>
            </tr>
          </thead>
          <tbody>
            {rollup.map((r) => (
              <tr key={r.name} className="border-t border-gray-800">
                <td className="px-3 py-2 font-mono text-xs">{r.name}</td>
                <td className="px-3 py-2">
                  <span className={`px-2 py-0.5 rounded text-xs ${statusColor(r.latest_status)}`}>{r.latest_status}</span>
                </td>
                <td className="px-3 py-2">{fmtTime(r.latest_started)}</td>
                <td className="px-3 py-2 text-right">{fmtInt(r.runs_24h)}</td>
                <td className="px-3 py-2 text-right">{r.err_24h > 0 ? <span className="text-red-600">{r.err_24h}</span> : "0"} <span className="text-gray-500 text-xs">({pct(r.err_24h, r.runs_24h)})</span></td>
                <td className="px-3 py-2 text-right">{fmtInt(r.runs_7d)}</td>
                <td className="px-3 py-2 text-right">{r.err_7d > 0 ? <span className="text-red-600">{r.err_7d}</span> : "0"} <span className="text-gray-500 text-xs">({pct(r.err_7d, r.runs_7d)})</span></td>
                <td className="px-3 py-2 text-right">{r.orphans > 0 ? <span className="text-amber-600">{r.orphans}</span> : "0"}</td>
                <td className="px-3 py-2 text-right">{fmtMs(r.mean_ms)}</td>
              </tr>
            ))}
            {rollup.length === 0 && !loading && (
              <tr><td colSpan={9} className="px-3 py-6 text-center text-gray-500">No runs recorded in window.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

// ---------- Panel B: Generation telemetry ----------
interface DpiaRow {
  id: string; status: string; updated_at: string;
  report_data: { _staging?: { units?: Record<string, {
    status?: string; elapsed_ms?: number; output_tokens?: number;
    continuation_fired?: boolean; cont_retried?: boolean;
    error?: string;
  }> } } | null;
  last_error: string | null;
}
interface ApiUsageAgg {
  product: string; runs: number; avg_ms: number; p50_ms: number; p95_ms: number;
  tokens_avg_out: number;
}

function classifyDpiaFailure(err: string | null | undefined): string {
  if (!err) return "other";
  if (/timeout|330\s*s|deadline/i.test(err)) return "generation_timeout_330s";
  if (/missing[_\s-]keys?|unit[_\s-]missing/i.test(err)) return "unit_missing_keys";
  return "other";
}

function GenerationPanel() {
  const [dpia, setDpia] = useState<DpiaRow[]>([]);
  const [usage, setUsage] = useState<ApiUsageAgg[]>([]);
  const [dataSince, setDataSince] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true); setErr(null);
    const since = new Date(Date.now() - 7 * 24 * MS_HOUR).toISOString();
    setDataSince(since);

    const [dpiaRes, usageRes] = await Promise.all([
      supabase.from("dpia_frameworks")
        .select("id,status,updated_at,report_data,last_error")
        .gte("updated_at", since).order("updated_at", { ascending: false }).limit(500),
      supabase.from("api_usage")
        .select("product,duration_ms,output_tokens")
        .gte("created_at", since).limit(5000),
    ]);
    if (dpiaRes.error) setErr(dpiaRes.error.message);
    if (usageRes.error) setErr((prev) => prev ?? usageRes.error!.message);
    setDpia((dpiaRes.data ?? []) as DpiaRow[]);

    const byProd = new Map<string, { d: number[]; t: number[] }>();
    for (const r of (usageRes.data ?? []) as { product: string | null; duration_ms: number | null; output_tokens: number | null }[]) {
      const p = r.product ?? "(none)";
      if (!byProd.has(p)) byProd.set(p, { d: [], t: [] });
      if (r.duration_ms != null) byProd.get(p)!.d.push(r.duration_ms);
      if (r.output_tokens != null) byProd.get(p)!.t.push(r.output_tokens);
    }
    const aggs: ApiUsageAgg[] = [];
    for (const [product, { d, t }] of byProd.entries()) {
      const sortedD = [...d].sort((a, b) => a - b);
      const sortedT = [...t].sort((a, b) => a - b);
      aggs.push({
        product, runs: d.length,
        avg_ms: d.length ? Math.round(d.reduce((s, x) => s + x, 0) / d.length) : 0,
        p50_ms: Math.round(quantile(sortedD, 0.5) ?? 0),
        p95_ms: Math.round(quantile(sortedD, 0.95) ?? 0),
        tokens_avg_out: sortedT.length ? Math.round(sortedT.reduce((s, x) => s + x, 0) / sortedT.length) : 0,
      });
    }
    aggs.sort((a, b) => a.product.localeCompare(b.product));
    setUsage(aggs);
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  const dpiaAgg = useMemo(() => {
    // per-unit elapsed distribution + status counts + continuation rates + failure classes
    const units = new Map<string, {
      elapsed: number[]; okN: number; errN: number;
      contFired: number; contRetried: number;
      failClass: Record<string, number>;
    }>();
    let totalUnits = 0;
    for (const row of dpia) {
      const map = row.report_data?._staging?.units ?? {};
      for (const [key, u] of Object.entries(map)) {
        totalUnits += 1;
        if (!units.has(key)) units.set(key, { elapsed: [], okN: 0, errN: 0, contFired: 0, contRetried: 0, failClass: {} });
        const bucket = units.get(key)!;
        if (typeof u.elapsed_ms === "number") bucket.elapsed.push(u.elapsed_ms);
        if (u.status === "success" || u.status === "done") bucket.okN += 1;
        else if (u.status === "error" || u.status === "blocked") bucket.errN += 1;
        if (u.continuation_fired) bucket.contFired += 1;
        if (u.cont_retried) bucket.contRetried += 1;
        if (u.status === "error") {
          const cls = classifyDpiaFailure(u.error);
          bucket.failClass[cls] = (bucket.failClass[cls] ?? 0) + 1;
        }
      }
      if (row.status === "error" && row.last_error) {
        const cls = classifyDpiaFailure(row.last_error);
        if (!units.has("(row-level)")) units.set("(row-level)", { elapsed: [], okN: 0, errN: 0, contFired: 0, contRetried: 0, failClass: {} });
        const b = units.get("(row-level)")!;
        b.errN += 1;
        b.failClass[cls] = (b.failClass[cls] ?? 0) + 1;
      }
    }
    const rows = Array.from(units.entries()).map(([unit, b]) => {
      const s = [...b.elapsed].sort((a, x) => a - x);
      return {
        unit,
        n: b.okN + b.errN,
        okN: b.okN, errN: b.errN,
        p50: quantile(s, 0.5), p95: quantile(s, 0.95),
        contFiredRate: (b.okN + b.errN) ? b.contFired / (b.okN + b.errN) : 0,
        contRetriedRate: (b.okN + b.errN) ? b.contRetried / (b.okN + b.errN) : 0,
        failClass: b.failClass,
      };
    }).sort((a, b) => a.unit.localeCompare(b.unit));
    return { rows, totalRows: dpia.length, totalUnits };
  }, [dpia]);

  return (
    <section className="mb-10">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h2 className="text-lg font-semibold text-white">Generation telemetry</h2>
          <p className="text-xs text-gray-500">
            Per-product health from DB only. Data since {fmtTime(dataSince)}.
          </p>
        </div>
        <Button onClick={load} disabled={loading} variant="outline" size="sm">
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>
      {err && <div className="mb-3 rounded bg-red-500/10 border border-red-500/30 p-2 text-sm text-red-300">{err}</div>}

      <h3 className="mb-1 text-sm font-semibold text-white">DPIA per-unit (from <code>dpia_frameworks.report_data._staging.units</code>)</h3>
      <div className="mb-2 text-xs text-gray-500">
        {dpiaAgg.totalRows} rows, {dpiaAgg.totalUnits} unit records observed.
      </div>
      <div className="overflow-x-auto rounded border border-gray-800 mb-6">
        <table className="w-full text-sm text-black">
          <thead className="bg-gray-100">
            <tr>
              <th className="text-left px-3 py-2 font-medium">Unit</th>
              <th className="text-right px-3 py-2 font-medium">N</th>
              <th className="text-right px-3 py-2 font-medium">Success</th>
              <th className="text-right px-3 py-2 font-medium">Error</th>
              <th className="text-right px-3 py-2 font-medium">Elapsed p50 / p95</th>
              <th className="text-right px-3 py-2 font-medium">Cont fired</th>
              <th className="text-right px-3 py-2 font-medium">Cont retried</th>
              <th className="text-left px-3 py-2 font-medium">Failure classes</th>
            </tr>
          </thead>
          <tbody>
            {dpiaAgg.rows.map((r) => (
              <tr key={r.unit} className="border-t border-gray-800">
                <td className="px-3 py-2 font-mono text-xs">{r.unit}</td>
                <td className="px-3 py-2 text-right">{r.n}</td>
                <td className="px-3 py-2 text-right text-green-700">{r.okN}</td>
                <td className="px-3 py-2 text-right text-red-700">{r.errN}</td>
                <td className="px-3 py-2 text-right">{fmtMs(r.p50)} / {fmtMs(r.p95)}</td>
                <td className="px-3 py-2 text-right">{(r.contFiredRate * 100).toFixed(0)}%</td>
                <td className="px-3 py-2 text-right">{(r.contRetriedRate * 100).toFixed(0)}%</td>
                <td className="px-3 py-2 text-xs">
                  {Object.entries(r.failClass).map(([k, v]) => `${k}:${v}`).join(", ") || "—"}
                </td>
              </tr>
            ))}
            {dpiaAgg.rows.length === 0 && (
              <tr><td colSpan={8} className="px-3 py-6 text-center text-gray-500">No DPIA unit telemetry in window.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <h3 className="mb-1 text-sm font-semibold text-white">Other products (from <code>api_usage</code>, 7d)</h3>
      <div className="overflow-x-auto rounded border border-gray-800">
        <table className="w-full text-sm text-black">
          <thead className="bg-gray-100">
            <tr>
              <th className="text-left px-3 py-2 font-medium">Product</th>
              <th className="text-right px-3 py-2 font-medium">Runs</th>
              <th className="text-right px-3 py-2 font-medium">Avg duration</th>
              <th className="text-right px-3 py-2 font-medium">p50 / p95</th>
              <th className="text-right px-3 py-2 font-medium">Avg output tokens</th>
            </tr>
          </thead>
          <tbody>
            {usage.map((r) => (
              <tr key={r.product} className="border-t border-gray-800">
                <td className="px-3 py-2 font-mono text-xs">{r.product}</td>
                <td className="px-3 py-2 text-right">{fmtInt(r.runs)}</td>
                <td className="px-3 py-2 text-right">{fmtMs(r.avg_ms)}</td>
                <td className="px-3 py-2 text-right">{fmtMs(r.p50_ms)} / {fmtMs(r.p95_ms)}</td>
                <td className="px-3 py-2 text-right">{fmtInt(r.tokens_avg_out)}</td>
              </tr>
            ))}
            {usage.length === 0 && (
              <tr><td colSpan={5} className="px-3 py-6 text-center text-gray-500">No api_usage rows in window.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

// ---------- Panel C: Crons + ingestion alerts ----------
interface CronRow {
  jobid: number; jobname: string; schedule: string; active: boolean;
  last_run_at: string | null; last_status: string | null;
  last_duration_ms: number | null; failures_7d: number; last_error: string | null;
}
interface AlertRow { alert_key: string; last_alerted_at: string; last_payload: unknown }

function CronsPanel() {
  const [crons, setCrons] = useState<CronRow[]>([]);
  const [alerts, setAlerts] = useState<AlertRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true); setErr(null);
    const [cronsRes, alertsRes] = await Promise.all([
      supabase.rpc("get_cron_jobs_with_last_run"),
      supabase.from("ingestion_alert_state")
        .select("alert_key,last_alerted_at,last_payload")
        .order("last_alerted_at", { ascending: false }).limit(50),
    ]);
    if (cronsRes.error) setErr(cronsRes.error.message);
    if (alertsRes.error) setErr((p) => p ?? alertsRes.error!.message);
    setCrons((cronsRes.data ?? []) as CronRow[]);
    setAlerts((alertsRes.data ?? []) as AlertRow[]);
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  return (
    <section className="mb-10">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h2 className="text-lg font-semibold text-white">Crons &amp; pipelines</h2>
          <p className="text-xs text-gray-500">
            From <code>get_cron_jobs_with_last_run</code> + <code>ingestion_alert_state</code>.{" "}
            <Link to="/admin/cron-status" className="underline">Open Cron Status →</Link>
          </p>
        </div>
        <Button onClick={load} disabled={loading} variant="outline" size="sm">
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>
      {err && <div className="mb-3 rounded bg-red-500/10 border border-red-500/30 p-2 text-sm text-red-300">{err}</div>}
      <div className="overflow-x-auto rounded border border-gray-800 mb-6">
        <table className="w-full text-sm text-black">
          <thead className="bg-gray-100">
            <tr>
              <th className="text-left px-3 py-2 font-medium">Job</th>
              <th className="text-left px-3 py-2 font-medium">Schedule</th>
              <th className="text-left px-3 py-2 font-medium">Last run</th>
              <th className="text-left px-3 py-2 font-medium">Status</th>
              <th className="text-right px-3 py-2 font-medium">Duration</th>
              <th className="text-right px-3 py-2 font-medium">Failures 7d</th>
            </tr>
          </thead>
          <tbody>
            {crons.map((c) => (
              <tr key={c.jobid} className="border-t border-gray-800">
                <td className="px-3 py-2 font-mono text-xs">{c.jobname}</td>
                <td className="px-3 py-2 text-xs">{c.schedule}</td>
                <td className="px-3 py-2">{fmtTime(c.last_run_at)}</td>
                <td className="px-3 py-2">
                  <span className={`px-2 py-0.5 rounded text-xs ${statusColor(c.last_status ?? "")}`}>
                    {c.last_status ?? "—"}
                  </span>
                </td>
                <td className="px-3 py-2 text-right">{fmtMs(c.last_duration_ms)}</td>
                <td className="px-3 py-2 text-right">{c.failures_7d > 0 ? <span className="text-red-600">{c.failures_7d}</span> : "0"}</td>
              </tr>
            ))}
            {crons.length === 0 && (
              <tr><td colSpan={6} className="px-3 py-6 text-center text-gray-500">No cron jobs returned.</td></tr>
            )}
          </tbody>
        </table>
      </div>
      <h3 className="mb-1 text-sm font-semibold text-white">Ingestion alerts</h3>
      {alerts.length === 0 ? (
        <div className="text-xs text-gray-500">No active alert state entries.</div>
      ) : (
        <ul className="rounded border border-gray-800 divide-y divide-gray-800">
          {alerts.map((a) => (
            <li key={a.alert_key} className="px-3 py-2 text-sm text-black bg-white">
              <div className="flex justify-between">
                <span className="font-mono text-xs">{a.alert_key}</span>
                <span className="text-xs text-gray-500">{fmtTime(a.last_alerted_at)}</span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

// ---------- Panel D: Enrichment / backfill ----------
const CORPUS_TABLES: Array<{ table: string; label: string; enrichFn?: string }> = [
  { table: "articles",                       label: "Articles",                    enrichFn: "enrich-articles" },
  { table: "enforcement_actions",            label: "Enforcement actions" },
  { table: "corpus_versions",                label: "Corpus versions" },
  { table: "corpus_extraction_errors",       label: "Corpus extraction errors" },
  { table: "state_law_update_candidates",    label: "State-law update candidates" },
  { table: "us_state_privacy_laws",          label: "US state privacy laws" },
];

function EnrichmentPanel() {
  const [counts, setCounts] = useState<Record<string, number | null>>({});
  const [lastRuns, setLastRuns] = useState<Record<string, { started_at: string; status: string } | null>>({});
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const nextCounts: Record<string, number | null> = {};
    await Promise.all(CORPUS_TABLES.map(async ({ table }) => {
      const { count, error } = await supabase.from(table as never).select("*", { count: "exact", head: true });
      nextCounts[table] = error ? null : (count ?? 0);
    }));
    setCounts(nextCounts);

    const fns = CORPUS_TABLES.map((c) => c.enrichFn).filter(Boolean) as string[];
    const nextRuns: Record<string, { started_at: string; status: string } | null> = {};
    if (fns.length) {
      const { data } = await supabase
        .from("function_runs")
        .select("function_name,started_at,status")
        .in("function_name", fns)
        .order("started_at", { ascending: false })
        .limit(200);
      for (const fn of fns) {
        const hit = (data ?? []).find((r) => r.function_name === fn);
        nextRuns[fn] = hit ? { started_at: hit.started_at, status: hit.status } : null;
      }
    }
    setLastRuns(nextRuns);
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  return (
    <section className="mb-10">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h2 className="text-lg font-semibold text-white">Enrichment &amp; backfill</h2>
          <p className="text-xs text-gray-500">
            Row counts + last run for each corpus table. Backfill actions render disabled in this slice — wired in S1b.
            Embedded % not surfaced: no embedding-status column present on these tables (see deviations).
          </p>
        </div>
        <Button onClick={load} disabled={loading} variant="outline" size="sm">
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>
      <div className="overflow-x-auto rounded border border-gray-800">
        <table className="w-full text-sm text-black">
          <thead className="bg-gray-100">
            <tr>
              <th className="text-left px-3 py-2 font-medium">Corpus table</th>
              <th className="text-right px-3 py-2 font-medium">Rows</th>
              <th className="text-left px-3 py-2 font-medium">Last enrichment run</th>
              <th className="text-left px-3 py-2 font-medium">Status</th>
              <th className="text-right px-3 py-2 font-medium">Action</th>
            </tr>
          </thead>
          <tbody>
            {CORPUS_TABLES.map((c) => {
              const run = c.enrichFn ? lastRuns[c.enrichFn] : null;
              return (
                <tr key={c.table} className="border-t border-gray-800">
                  <td className="px-3 py-2 font-mono text-xs">{c.table}</td>
                  <td className="px-3 py-2 text-right">{fmtInt(counts[c.table] ?? null)}</td>
                  <td className="px-3 py-2">{run ? fmtTime(run.started_at) : "—"}</td>
                  <td className="px-3 py-2">
                    {run ? (
                      <span className={`px-2 py-0.5 rounded text-xs ${statusColor(run.status)}`}>{run.status}</span>
                    ) : "—"}
                  </td>
                  <td className="px-3 py-2 text-right">
                    {c.enrichFn ? (
                      <BackfillButton fn={c.enrichFn} onDone={load} />
                    ) : <span className="text-xs text-gray-500">no fn</span>}
                  </td>

                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

// ---------- MC-S1b Task 3 — Backfill button wired through admin-toolbox-action ----------
function BackfillButton({ fn, onDone }: { fn: string; onDone?: () => void }) {
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [lastClickAt, setLastClickAt] = useState(0);
  async function run() {
    // Double-click guard (30s).
    if (Date.now() - lastClickAt < 30_000) {
      setNotice("Slow down — 30s guard active");
      return;
    }
    setLastClickAt(Date.now());
    setBusy(true); setNotice(null);
    const invoke = async () =>
      await supabase.functions.invoke("admin-toolbox-action", {
        body: { action: "invoke_backfill", params: { fn, batch_size: 25 } },
      });
    let { data, error } = await invoke();
    // Single silent-401 retry (Task 3 requirement).
    if (error && /401|unauthor/i.test(error.message)) {
      await supabase.auth.refreshSession();
      ({ data, error } = await invoke());
    }
    setBusy(false);
    if (error) setNotice(error.message);
    else setNotice(`ok · status ${(data as any)?.result?.status ?? "?"} · batch`);
    onDone?.();
  }
  return (
    <div className="inline-flex flex-col items-end">
      <Button size="sm" variant="outline" onClick={run} disabled={busy}>
        {busy ? "Running…" : "Backfill"}
      </Button>
      {notice && <span className="text-xs text-gray-500 mt-1 max-w-[220px] truncate" title={notice}>{notice}</span>}
    </div>
  );
}

// ---------- MC-S1b Task 3 — Ops actions (redeploy_request + resnap_baseline) ----------
function OpsActionsPanel() {
  const [fnName, setFnName] = useState("");
  const [reason, setReason] = useState("");
  const [override, setOverride] = useState("");
  const [showOverride, setShowOverride] = useState(false);
  const [queue, setQueue] = useState<Array<{ id: string; function_name: string; status: string; requested_at: string; reason: string; override_used: boolean }>>([]);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [resnapNote, setResnapNote] = useState("");
  const [resnapBusy, setResnapBusy] = useState(false);

  const loadQueue = useCallback(async () => {
    const { data } = await supabase.from("redeploy_queue")
      .select("id,function_name,status,requested_at,reason,override_used")
      .order("requested_at", { ascending: false }).limit(20);
    setQueue((data ?? []) as any);
  }, []);
  useEffect(() => { loadQueue(); }, [loadQueue]);

  async function submitRedeploy() {
    if (!fnName.trim() || !reason.trim()) { setNotice("function_name and reason required"); return; }
    setBusy(true); setNotice(null);
    const { data, error } = await supabase.functions.invoke("admin-toolbox-action", {
      body: { action: "redeploy_request", params: { function_name: fnName.trim(), reason: reason.trim(), override: override.trim() || undefined } },
    });
    setBusy(false);
    if (error) { setNotice(error.message); return; }
    const inner = (data as any)?.result;
    if (inner?.status === 409) {
      setShowOverride(true);
      setNotice(`Conflicts detected. Type OVERRIDE-REDEPLOY to force. ${inner.body?.slice(0, 200) ?? ""}`);
    } else {
      setNotice(`queued · ${inner?.body?.slice(0, 200) ?? ""}`);
      setFnName(""); setReason(""); setOverride(""); setShowOverride(false);
    }
    loadQueue();
  }

  async function submitResnap() {
    if (!confirm("Type RESNAP-BASELINE on the next line to confirm epoch resnap.")) return;
    const typed = window.prompt("Type RESNAP-BASELINE to confirm:") ?? "";
    if (typed !== "RESNAP-BASELINE") { setNotice("resnap: confirmation not typed"); return; }
    setResnapBusy(true);
    const { data, error } = await supabase.functions.invoke("admin-toolbox-action", {
      body: { action: "resnap_baseline", params: { confirm: "RESNAP-BASELINE", note: resnapNote || undefined } },
    });
    setResnapBusy(false);
    if (error) setNotice(error.message);
    else setNotice(`resnap · ${JSON.stringify((data as any)?.result).slice(0, 200)}`);
  }

  return (
    <section className="mb-10">
      <h2 className="text-lg font-semibold text-white mb-3">Ops actions</h2>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded border border-gray-800 p-4">
          <h3 className="text-sm font-semibold text-white mb-2">Request redeploy (queued marker)</h3>
          <p className="text-xs text-gray-500 mb-3">
            Runs the two-source conflict gate; if clear (or override typed), writes a queued row to
            <code className="mx-1">redeploy_queue</code> for courier execution. Management-API auto-execute is intentionally not wired.
          </p>
          <input value={fnName} onChange={(e) => setFnName(e.target.value)} placeholder="function_name (e.g. run-dpia-framework)" className="w-full mb-2 rounded border border-gray-700 bg-transparent px-2 py-1 text-sm text-white" />
          <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="reason (required)" className="w-full mb-2 rounded border border-gray-700 bg-transparent px-2 py-1 text-sm text-white" />
          {showOverride && (
            <input value={override} onChange={(e) => setOverride(e.target.value)} placeholder="OVERRIDE-REDEPLOY" className="w-full mb-2 rounded border border-amber-600 bg-transparent px-2 py-1 text-sm text-amber-300" />
          )}
          <Button size="sm" onClick={submitRedeploy} disabled={busy}>{busy ? "…" : "Request redeploy"}</Button>
          {notice && <div className="mt-2 text-xs text-gray-400 whitespace-pre-wrap">{notice}</div>}
        </div>
        <div className="rounded border border-gray-800 p-4">
          <h3 className="text-sm font-semibold text-white mb-2">Re-snapshot baseline (epoch marker)</h3>
          <p className="text-xs text-gray-500 mb-3">
            Writes an epoch marker into <code>quality_batch_baselines</code> stamped with the current
            GRADER_CONTEXT_VERSION. Requires typed confirmation.
          </p>
          <input value={resnapNote} onChange={(e) => setResnapNote(e.target.value)} placeholder="note (optional)" className="w-full mb-2 rounded border border-gray-700 bg-transparent px-2 py-1 text-sm text-white" />
          <Button size="sm" variant="outline" onClick={submitResnap} disabled={resnapBusy}>{resnapBusy ? "…" : "Resnap baseline"}</Button>
        </div>
      </div>

      <h3 className="text-sm font-semibold text-white mt-6 mb-2">Redeploy queue (recent 20)</h3>
      <div className="overflow-x-auto rounded border border-gray-800">
        <table className="w-full text-sm text-black">
          <thead className="bg-gray-100"><tr>
            <th className="text-left px-3 py-2 font-medium">Requested</th>
            <th className="text-left px-3 py-2 font-medium">Function</th>
            <th className="text-left px-3 py-2 font-medium">Status</th>
            <th className="text-left px-3 py-2 font-medium">Override</th>
            <th className="text-left px-3 py-2 font-medium">Reason</th>
          </tr></thead>
          <tbody>
            {queue.map((q) => (
              <tr key={q.id} className="border-t border-gray-800">
                <td className="px-3 py-2">{fmtTime(q.requested_at)}</td>
                <td className="px-3 py-2 font-mono text-xs">{q.function_name}</td>
                <td className="px-3 py-2"><span className={`px-2 py-0.5 rounded text-xs ${statusColor(q.status === "executed" ? "success" : q.status === "cancelled" ? "partial" : "running")}`}>{q.status}</span></td>
                <td className="px-3 py-2 text-xs">{q.override_used ? "yes" : "—"}</td>
                <td className="px-3 py-2 text-xs">{q.reason}</td>
              </tr>
            ))}
            {queue.length === 0 && <tr><td colSpan={5} className="px-3 py-6 text-center text-gray-500">No requests.</td></tr>}
          </tbody>
        </table>
      </div>
    </section>
  );
}

// ---------- MC-G3 — Paid-Run Health ----------
function PaidRunHealthPanel() {
  const [tiles, setTiles] = useState<{ paidPending15m: number; rescue7d: number; silent24h: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const load = useCallback(async () => {
    setLoading(true);
    const now = Date.now();
    const t15 = new Date(now - 15 * 60_000).toISOString();
    const t7d = new Date(now - 7 * 24 * MS_HOUR).toISOString();
    const t24 = new Date(now - 24 * MS_HOUR).toISOString();
    const [pending, rescue, silent] = await Promise.all([
      supabase.from("function_runs").select("id", { count: "exact", head: true })
        .eq("status", "running").lt("started_at", t15),
      supabase.from("function_runs").select("id", { count: "exact", head: true })
        .in("function_name", ["reap-stuck-generations", "batch-kickoff-pickup", "retry-failed-generations"])
        .gte("started_at", t7d),
      supabase.from("function_runs").select("id", { count: "exact", head: true })
        .eq("status", "error").gte("started_at", t24),
    ]);
    setTiles({
      paidPending15m: pending.count ?? 0,
      rescue7d: rescue.count ?? 0,
      silent24h: silent.count ?? 0,
    });
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  return (
    <section className="mb-10">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-semibold text-white">Paid-run health</h2>
        <Button onClick={load} disabled={loading} variant="outline" size="sm">
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />Refresh
        </Button>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <Tile label="Runs pending >15m" value={tiles?.paidPending15m} tone={tiles && tiles.paidPending15m > 0 ? "warn" : "ok"} />
        <Tile label="Rescue-cron activity (7d)" value={tiles?.rescue7d} tone="info" />
        <Tile label="Errored runs (24h)" value={tiles?.silent24h} tone={tiles && tiles.silent24h > 0 ? "warn" : "ok"} />
      </div>
    </section>
  );
}
function Tile({ label, value, tone }: { label: string; value: number | null | undefined; tone: "ok" | "warn" | "info" }) {
  const cls = tone === "warn" ? "border-amber-500/40 text-amber-300"
    : tone === "info" ? "border-blue-500/40 text-blue-300"
    : "border-green-500/40 text-green-300";
  return (
    <div className={`rounded border ${cls} p-4`}>
      <div className="text-xs text-gray-500">{label}</div>
      <div className="text-3xl font-serif mt-1">{value == null ? "…" : value.toLocaleString()}</div>
    </div>
  );
}

// ---------- MC-G4 — Manual Entitlements Panel ----------
function ManualEntitlementsPanel() {
  const [rows, setRows] = useState<Array<{ user_id: string; subscription_type: string | null; updated_at: string }>>([]);
  const [loading, setLoading] = useState(true);
  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from("user_entitlements")
      .select("user_id, subscription_type, updated_at")
      .is("stripe_subscription_id", null)
      .order("updated_at", { ascending: false })
      .limit(100);
    setRows((data ?? []) as any);
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  return (
    <section className="mb-10">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h2 className="text-lg font-semibold text-white">Manual entitlements</h2>
          <p className="text-xs text-gray-500">
            Rows in <code>user_entitlements</code> with no Stripe subscription id.
          </p>
        </div>
        <Button onClick={load} disabled={loading} variant="outline" size="sm">
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />Refresh
        </Button>
      </div>
      <div className="overflow-x-auto rounded border border-gray-800">
        <table className="w-full text-sm text-black">
          <thead className="bg-gray-100"><tr>
            <th className="text-left px-3 py-2 font-medium">User</th>
            <th className="text-left px-3 py-2 font-medium">Type</th>
            <th className="text-left px-3 py-2 font-medium">Updated</th>
            <th className="text-left px-3 py-2 font-medium">Flag</th>
          </tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.user_id} className="border-t border-gray-800">
                <td className="px-3 py-2 font-mono text-xs">{r.user_id.slice(0, 12)}…</td>
                <td className="px-3 py-2 text-xs">{r.subscription_type ?? "—"}</td>
                <td className="px-3 py-2 text-xs">{fmtTime(r.updated_at)}</td>
                <td className="px-3 py-2">
                  <span className="rounded bg-red-500/15 text-red-400 border border-red-500/30 px-2 py-0.5 text-xs">
                    manual grant — delete before real checkout testing
                  </span>
                </td>
              </tr>
            ))}
            {rows.length === 0 && !loading && (
              <tr><td colSpan={4} className="px-3 py-6 text-center text-gray-500">No manual entitlements.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

// ---------- MC-G2 + MC-G5 — Recent batches with epoch dividers + stale-run cancel ----------
interface BatchRow {
  id: string; status: string; phase: string | null; started_at: string;
  last_heartbeat_at: string | null; instrument_version: string | null;
  tools: string[] | null; batch_size: number | null;
}
function RecentBatchesPanel() {
  const [rows, setRows] = useState<BatchRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from("quality_batch_runs")
      .select("id,status,phase,started_at,last_heartbeat_at,instrument_version,tools,batch_size")
      .order("started_at", { ascending: false }).limit(20);
    setRows((data ?? []) as any);
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  async function cancelStale(id: string) {
    const typed = window.prompt("Type CANCEL-STALE to confirm cancel of stale run:") ?? "";
    if (typed !== "CANCEL-STALE") return;
    setCancellingId(id);
    const { data, error } = await supabase.functions.invoke("admin-toolbox-action", {
      body: { action: "cancel_stale_run", params: { run_id: id, confirm: "CANCEL-STALE" } },
    });
    setCancellingId(null);
    if (error) alert(error.message);
    else alert(`result: ${JSON.stringify((data as any)?.result).slice(0, 200)}`);
    load();
  }

  const now = Date.now();
  return (
    <section className="mb-10">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h2 className="text-lg font-semibold text-white">Recent batches — epoch ledger (MC-G2 / MC-G5)</h2>
          <p className="text-xs text-gray-500">
            Newest 20 <code>quality_batch_runs</code>. Rows are grouped by <code>instrument_version</code>; a
            ◈ EPOCH CHANGE divider marks version transitions. Running rows whose heartbeat is &gt;30 min stale
            expose a Cancel button (typed confirmation).
          </p>
        </div>
        <Button onClick={load} disabled={loading} variant="outline" size="sm">
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />Refresh
        </Button>
      </div>
      <div className="overflow-x-auto rounded border border-gray-800">
        <table className="w-full text-sm text-black">
          <thead className="bg-gray-100"><tr>
            <th className="text-left px-3 py-2 font-medium">Started</th>
            <th className="text-left px-3 py-2 font-medium">Batch</th>
            <th className="text-left px-3 py-2 font-medium">Status</th>
            <th className="text-left px-3 py-2 font-medium">Phase</th>
            <th className="text-left px-3 py-2 font-medium">Heartbeat</th>
            <th className="text-left px-3 py-2 font-medium">Epoch</th>
            <th className="text-right px-3 py-2 font-medium">Action</th>
          </tr></thead>
          <tbody>
            {rows.map((r, i) => {
              const prev = rows[i - 1];
              const epochChanged = prev && prev.instrument_version !== r.instrument_version;
              const hb = r.last_heartbeat_at ? new Date(r.last_heartbeat_at).getTime() : new Date(r.started_at).getTime();
              const staleMs = now - hb;
              const isStale = r.status === "running" && staleMs > 30 * 60_000;
              return (
                <>
                  {epochChanged && (
                    <tr key={`${r.id}-div`}>
                      <td colSpan={7} className="px-3 py-1 text-center text-xs tracking-widest text-amber-400 bg-amber-500/5 border-t border-amber-500/40">
                        ◈ EPOCH CHANGE — {prev!.instrument_version ?? "(pre-epoch)"} → {r.instrument_version ?? "(pre-epoch)"}
                      </td>
                    </tr>
                  )}
                  <tr key={r.id} className="border-t border-gray-800">
                    <td className="px-3 py-2 text-xs">{fmtTime(r.started_at)}</td>
                    <td className="px-3 py-2 font-mono text-xs">{r.id.slice(0, 8)}… ({r.tools?.length ?? 0}×{r.batch_size ?? "?"})</td>
                    <td className="px-3 py-2"><span className={`px-2 py-0.5 rounded text-xs ${statusColor(r.status)}`}>{r.status}</span></td>
                    <td className="px-3 py-2 text-xs">{r.phase ?? "—"}</td>
                    <td className="px-3 py-2 text-xs">{isStale ? <span className="text-red-400">stale {fmtMs(staleMs)}</span> : fmtTime(r.last_heartbeat_at)}</td>
                    <td className="px-3 py-2 font-mono text-xs">{r.instrument_version ?? "(pre-epoch)"}</td>
                    <td className="px-3 py-2 text-right">
                      {isStale ? (
                        <Button size="sm" variant="outline" onClick={() => cancelStale(r.id)} disabled={cancellingId === r.id}>
                          {cancellingId === r.id ? "…" : "Cancel stale"}
                        </Button>
                      ) : "—"}
                    </td>
                  </tr>
                </>
              );
            })}
            {rows.length === 0 && !loading && (
              <tr><td colSpan={7} className="px-3 py-6 text-center text-gray-500">No batches.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

// ---------- MC-G1 — Post-generation lint telemetry surfacing ----------
interface LintRow {
  id: string; function_name: string; started_at: string; source_row_id: string | null;
  metadata: {
    event?: string; fallback_applied?: boolean; retry_within_budget?: boolean | null;
    residual_leaks?: number; residual_resolved_asks?: number;
    notes?: Array<{ code: string; detail?: string }>;
  } | null;
}
function LintTelemetryPanel() {
  const [rows, setRows] = useState<LintRow[]>([]);
  const [loading, setLoading] = useState(true);
  const load = useCallback(async () => {
    setLoading(true);
    const since = new Date(Date.now() - 7 * 24 * MS_HOUR).toISOString();
    const { data } = await supabase.from("function_runs")
      .select("id,function_name,started_at,source_row_id,metadata")
      .gte("started_at", since)
      .order("started_at", { ascending: false })
      .limit(500);
    const filtered = (data ?? []).filter((r: any) => r?.metadata?.event === "post_gen_lint");
    setRows(filtered as any);
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  return (
    <section className="mb-10">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h2 className="text-lg font-semibold text-white">Post-gen lint telemetry (MC-G1)</h2>
          <p className="text-xs text-gray-500">
            <code>function_runs</code> where <code>metadata.event = 'post_gen_lint'</code>, last 7 days.
            Source-row ids join to <code>quality_run_documents</code> when a batch context is needed.
          </p>
        </div>
        <Button onClick={load} disabled={loading} variant="outline" size="sm">
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />Refresh
        </Button>
      </div>
      <div className="overflow-x-auto rounded border border-gray-800">
        <table className="w-full text-sm text-black">
          <thead className="bg-gray-100"><tr>
            <th className="text-left px-3 py-2 font-medium">When</th>
            <th className="text-left px-3 py-2 font-medium">Function</th>
            <th className="text-left px-3 py-2 font-medium">Doc</th>
            <th className="text-right px-3 py-2 font-medium">Fallback</th>
            <th className="text-right px-3 py-2 font-medium">Leaks</th>
            <th className="text-right px-3 py-2 font-medium">Resolved-asks</th>
            <th className="text-left px-3 py-2 font-medium">Notes</th>
          </tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-t border-gray-800">
                <td className="px-3 py-2 text-xs">{fmtTime(r.started_at)}</td>
                <td className="px-3 py-2 font-mono text-xs">{r.function_name}</td>
                <td className="px-3 py-2 font-mono text-xs">{r.source_row_id ? r.source_row_id.slice(0, 8) + "…" : "—"}</td>
                <td className="px-3 py-2 text-right text-xs">{r.metadata?.fallback_applied ? "yes" : "no"}</td>
                <td className="px-3 py-2 text-right text-xs">{r.metadata?.residual_leaks ?? 0}</td>
                <td className="px-3 py-2 text-right text-xs">{r.metadata?.residual_resolved_asks ?? 0}</td>
                <td className="px-3 py-2 text-xs">
                  {(r.metadata?.notes ?? []).slice(0, 8).map((n, i) => (
                    <span key={i} className="mr-2 rounded bg-gray-800/70 border border-gray-700 px-1.5 py-0.5">
                      {n.code}
                    </span>
                  ))}
                </td>
              </tr>
            ))}
            {rows.length === 0 && !loading && (
              <tr><td colSpan={7} className="px-3 py-6 text-center text-gray-500">No lint telemetry in window.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

// ---------- Page shell ----------
function AdminOpsInner() {
  return (
    <PageContainer>
      <div className="max-w-7xl mx-auto py-8 px-4">
        <header className="mb-6">
          <h1 className="text-2xl font-serif text-white">Operations</h1>
          <p className="text-sm text-gray-500 mt-1">
            Launch-week operator console. MC-S1a read panels + MC-S1b action wiring + MC-G1–G5 gaps.
          </p>
        </header>
        <PaidRunHealthPanel />
        <OpsActionsPanel />
        <RecentBatchesPanel />
        <LintTelemetryPanel />
        <ManualEntitlementsPanel />
        <FunctionsPanel />
        <GenerationPanel />
        <CronsPanel />
        <EnrichmentPanel />
      </div>
    </PageContainer>
  );
}

export default function AdminOps() {
  return (
    <AdminOnly fallback={<div className="p-10 text-sm text-muted-foreground">Not found.</div>}>
      <AdminOpsInner />
    </AdminOnly>
  );
}

