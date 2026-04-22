import { useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import { Link, Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

interface RunRow {
  id: string;
  job_name: string | null;
  run_at: string;
  started_at: string | null;
  finished_at: string | null;
  status: string | null;
  duration_ms: number | null;
  fetched: number | null;
  inserted: number | null;
  skipped: number | null;
  enriched: number | null;
  summaries_generated: number | null;
  enrichment_failed_429: number | null;
  enrichment_failed_other: number | null;
  error_message: string | null;
  metadata: Record<string, unknown> | null;
}

const STATUS_STYLES: Record<string, string> = {
  success: "bg-emerald-500/10 text-emerald-700 border-emerald-500/30 dark:text-emerald-400",
  partial: "bg-amber-500/10 text-amber-700 border-amber-500/30 dark:text-amber-400",
  error: "bg-destructive/10 text-destructive border-destructive/30",
  running: "bg-primary/10 text-primary border-primary/30",
};

function formatDuration(ms: number | null): string {
  if (!ms) return "—";
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60_000) return `${(ms / 1000).toFixed(1)}s`;
  return `${Math.floor(ms / 60_000)}m ${Math.round((ms % 60_000) / 1000)}s`;
}

function formatTime(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    month: "short", day: "numeric",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
  });
}

export default function AdminIngestionDashboard() {
  const { user, loading: authLoading } = useAuth();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [runs, setRuns] = useState<RunRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Check admin role
  useEffect(() => {
    if (!user) { setIsAdmin(false); return; }
    supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle()
      .then(({ data }) => setIsAdmin(!!data));
  }, [user]);

  // Load runs
  useEffect(() => {
    if (!isAdmin) return;
    setLoading(true);
    supabase
      .from("ingestion_runs")
      .select("*")
      .order("run_at", { ascending: false })
      .limit(200)
      .then(({ data, error }) => {
        if (!error && data) setRuns(data as unknown as RunRow[]);
        setLoading(false);
      });
  }, [isAdmin]);

  if (authLoading || isAdmin === null) {
    return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Loading…</div>;
  }
  if (!user) return <Navigate to="/login?redirect=/admin/ingestion" replace />;
  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="max-w-2xl mx-auto px-6 py-20 text-center">
          <h1 className="font-display text-2xl text-foreground mb-3">Admin access required</h1>
          <p className="text-muted-foreground text-sm mb-6">
            This page is restricted to administrators. If you should have access,
            ask another admin to add the <code className="bg-muted px-1 rounded">admin</code> role to your account.
          </p>
          <Link to="/" className="text-primary text-sm font-semibold">← Back to home</Link>
        </div>
        <Footer />
      </div>
    );
  }

  // Aggregate by job_name
  const jobNames = Array.from(new Set(runs.map(r => r.job_name).filter(Boolean))) as string[];
  const filtered = filter === "all" ? runs : runs.filter(r => r.job_name === filter);

  const summary = jobNames.map(name => {
    const jobRuns = runs.filter(r => r.job_name === name);
    const last = jobRuns[0];
    const successRate = jobRuns.length
      ? Math.round((jobRuns.filter(r => r.status === "success").length / jobRuns.length) * 100)
      : 0;
    const totalInserted = jobRuns.reduce((s, r) => s + (r.inserted ?? 0), 0);
    return { name, last, successRate, totalInserted, runs: jobRuns.length };
  });

  return (
    <div className="min-h-screen bg-background">
      <Helmet><title>Ingestion Dashboard — Admin</title></Helmet>
      <Navbar />
      <main className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <p className="text-[11px] font-bold uppercase tracking-widest text-primary mb-2">Admin</p>
          <h1 className="font-display text-[28px] text-foreground">Ingestion Run Dashboard</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Telemetry for cron-driven news ingestion and enrichment jobs. Showing last 200 runs.
          </p>
        </div>

        {/* Per-job summary cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-8">
          {summary.map(s => (
            <button
              key={s.name}
              onClick={() => setFilter(s.name)}
              className={`text-left rounded-xl border p-4 transition-all ${
                filter === s.name ? "border-primary bg-primary/5" : "border-border bg-card hover:border-primary/40"
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="font-mono text-[12px] font-semibold text-foreground">{s.name}</span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border ${STATUS_STYLES[s.last?.status ?? "success"] ?? ""}`}>
                  {s.last?.status ?? "—"}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-[11px]">
                <div>
                  <div className="text-muted-foreground">Success</div>
                  <div className="font-semibold text-foreground">{s.successRate}%</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Inserted</div>
                  <div className="font-semibold text-foreground">{s.totalInserted}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Runs</div>
                  <div className="font-semibold text-foreground">{s.runs}</div>
                </div>
              </div>
              <div className="text-[10px] text-muted-foreground mt-2">
                Last: {formatTime(s.last?.run_at ?? null)}
              </div>
            </button>
          ))}
        </div>

        {/* Filter tabs */}
        <div className="flex flex-wrap gap-2 mb-4">
          <button
            onClick={() => setFilter("all")}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
              filter === "all" ? "bg-foreground text-background border-foreground" : "bg-card text-muted-foreground border-border hover:border-foreground/30"
            }`}
          >
            All ({runs.length})
          </button>
          {jobNames.map(name => (
            <button
              key={name}
              onClick={() => setFilter(name)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all font-mono ${
                filter === name ? "bg-foreground text-background border-foreground" : "bg-card text-muted-foreground border-border hover:border-foreground/30"
              }`}
            >
              {name}
            </button>
          ))}
        </div>

        {/* Run table */}
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/40">
                <tr className="text-left text-[11px] uppercase tracking-wider text-muted-foreground">
                  <th className="px-4 py-3 font-semibold">Job</th>
                  <th className="px-4 py-3 font-semibold">Started</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold text-right">Duration</th>
                  <th className="px-4 py-3 font-semibold text-right">Fetched</th>
                  <th className="px-4 py-3 font-semibold text-right">Inserted</th>
                  <th className="px-4 py-3 font-semibold text-right">Enriched</th>
                  <th className="px-4 py-3 font-semibold text-right">Failed</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {loading && (
                  <tr><td colSpan={9} className="text-center py-12 text-muted-foreground text-sm">Loading runs…</td></tr>
                )}
                {!loading && filtered.length === 0 && (
                  <tr><td colSpan={9} className="text-center py-12 text-muted-foreground text-sm">No runs recorded yet for this job.</td></tr>
                )}
                {filtered.map(r => {
                  const failed = (r.enrichment_failed_429 ?? 0) + (r.enrichment_failed_other ?? 0);
                  const isOpen = expandedId === r.id;
                  return (
                    <>
                      <tr key={r.id} className="hover:bg-muted/30">
                        <td className="px-4 py-3 font-mono text-[12px] text-foreground">{r.job_name ?? "(legacy)"}</td>
                        <td className="px-4 py-3 text-[12px] text-muted-foreground whitespace-nowrap">{formatTime(r.started_at ?? r.run_at)}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border ${STATUS_STYLES[r.status ?? "success"] ?? ""}`}>
                            {r.status ?? "success"}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right text-[12px] text-foreground">{formatDuration(r.duration_ms)}</td>
                        <td className="px-4 py-3 text-right text-[12px] text-foreground">{r.fetched ?? "—"}</td>
                        <td className="px-4 py-3 text-right text-[12px] text-foreground font-semibold">{r.inserted ?? 0}</td>
                        <td className="px-4 py-3 text-right text-[12px] text-foreground">{r.enriched ?? r.summaries_generated ?? 0}</td>
                        <td className={`px-4 py-3 text-right text-[12px] font-semibold ${failed > 0 ? "text-destructive" : "text-muted-foreground"}`}>{failed || "—"}</td>
                        <td className="px-4 py-3 text-right">
                          <button
                            onClick={() => setExpandedId(isOpen ? null : r.id)}
                            className="text-[11px] text-primary font-semibold hover:underline"
                          >
                            {isOpen ? "Hide" : "Details"}
                          </button>
                        </td>
                      </tr>
                      {isOpen && (
                        <tr key={`${r.id}-detail`} className="bg-muted/20">
                          <td colSpan={9} className="px-4 py-3 text-[12px]">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div>
                                <div className="text-muted-foreground text-[10px] uppercase tracking-wider mb-1">Timing</div>
                                <div>Started: <span className="font-mono">{formatTime(r.started_at)}</span></div>
                                <div>Finished: <span className="font-mono">{formatTime(r.finished_at)}</span></div>
                              </div>
                              <div>
                                <div className="text-muted-foreground text-[10px] uppercase tracking-wider mb-1">Counts</div>
                                <div>Skipped: {r.skipped ?? 0}</div>
                                <div>Enrichment 429s: {r.enrichment_failed_429 ?? 0}</div>
                                <div>Enrichment other failures: {r.enrichment_failed_other ?? 0}</div>
                              </div>
                              {r.error_message && (
                                <div className="md:col-span-2">
                                  <div className="text-muted-foreground text-[10px] uppercase tracking-wider mb-1">Error</div>
                                  <pre className="bg-destructive/10 border border-destructive/30 rounded p-2 text-[11px] text-destructive whitespace-pre-wrap break-all">{r.error_message}</pre>
                                </div>
                              )}
                              {r.metadata && Object.keys(r.metadata).length > 0 && (
                                <div className="md:col-span-2">
                                  <div className="text-muted-foreground text-[10px] uppercase tracking-wider mb-1">Metadata</div>
                                  <pre className="bg-muted rounded p-2 text-[11px] text-foreground overflow-x-auto">{JSON.stringify(r.metadata, null, 2)}</pre>
                                </div>
                              )}
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
        </div>

        <p className="text-[11px] text-muted-foreground mt-4">
          Instrumented jobs: <code className="font-mono">fetch-updates</code>, <code className="font-mono">fetch-newsapi</code>,
          <code className="font-mono"> fetch-federal-register</code>, <code className="font-mono">fetch-congress-bills</code>,
          <code className="font-mono"> ingest-gdprhub</code>, <code className="font-mono">enrich-enforcement</code>.
          Other ingestion functions can be retrofitted using <code className="font-mono">supabase/functions/_shared/run-logger.ts</code>.
        </p>
      </main>
      <Footer />
    </div>
  );
}
