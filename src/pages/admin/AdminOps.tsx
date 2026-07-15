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
                    <span title="wired in S1b">
                      <Button disabled variant="outline" size="sm">Backfill</Button>
                    </span>
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

// ---------- Page shell ----------
function AdminOpsInner() {
  return (
    <PageContainer>
      <div className="max-w-7xl mx-auto py-8 px-4">
        <header className="mb-6">
          <h1 className="text-2xl font-serif text-white">Operations</h1>
          <p className="text-sm text-gray-500 mt-1">
            Read-only launch-week operator console (MC-S1a). Composes function_runs, generation
            telemetry, cron/pipeline health, and enrichment/backfill views.
          </p>
        </header>
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
