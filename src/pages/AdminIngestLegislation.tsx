import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

type Status = "idle" | "running" | "complete" | "error";

const FUNCTIONS = [
  { name: "ingest-legislation-us-states", label: "U.S. State Bills (LegiScan)", source: "us-states-legiscan" },
  { name: "ingest-legislation-us", label: "U.S. Federal Bills (Congress.gov)", source: "us-congress" },
  { name: "ingest-legislation-all", label: "All Sources (Orchestrator)", source: null },
];

type Run = {
  id: string;
  source: string;
  status: string;
  started_at: string;
  finished_at: string | null;
  duration_ms: number | null;
  fetched: number | null;
  inserted: number | null;
  updated: number | null;
  unchanged: number | null;
  rejected: number | null;
  rejected_samples: any;
  error_message: string | null;
};

const AdminIngestLegislation = () => {
  const { user, loading } = useAuth();
  const [selected, setSelected] = useState(FUNCTIONS[0].name);
  const [status, setStatus] = useState<Status>("idle");
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string>("");
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [elapsed, setElapsed] = useState<number>(0);
  const [runs, setRuns] = useState<Run[]>([]);
  const [runsLoading, setRunsLoading] = useState(false);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const selectedFn = FUNCTIONS.find((f) => f.name === selected)!;

  const loadRuns = useCallback(async () => {
    setRunsLoading(true);
    let q = supabase
      .from("legislation_ingestion_runs")
      .select("*")
      .order("started_at", { ascending: false })
      .limit(20);
    if (selectedFn.source) q = q.eq("source", selectedFn.source);
    const { data, error } = await q;
    if (!error && data) setRuns(data as Run[]);
    setRunsLoading(false);
  }, [selectedFn.source]);

  useEffect(() => {
    if (user) loadRuns();
  }, [user, loadRuns]);

  // Poll while a run is in flight
  useEffect(() => {
    if (status !== "running") return;
    const t = setInterval(loadRuns, 4000);
    return () => clearInterval(t);
  }, [status, loadRuns]);

  const run = async () => {
    setStatus("running");
    setResult(null);
    setError("");
    const start = Date.now();
    setStartedAt(start);
    const timer = setInterval(() => setElapsed(Date.now() - start), 500);
    try {
      const res = await supabase.functions.invoke(selected, { body: {} });
      if (res.error) throw res.error;
      setResult(res.data);
      setStatus("complete");
    } catch (e: any) {
      setError(e?.message || String(e));
      setStatus("error");
    } finally {
      clearInterval(timer);
      setElapsed(Date.now() - start);
      loadRuns();
    }
  };

  if (loading) return <div className="p-8">Loading…</div>;
  if (!user) return <div className="p-8">Unauthorized</div>;

  const statusPill = (s: string) => {
    const cls =
      s === "success"
        ? "bg-green-100 text-green-800"
        : s === "running"
        ? "bg-amber-100 text-amber-800"
        : s === "partial"
        ? "bg-blue-100 text-blue-800"
        : s === "failed"
        ? "bg-red-100 text-red-800"
        : "bg-muted text-muted-foreground";
    return <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase tracking-wide ${cls}`}>{s}</span>;
  };

  const fmtDate = (s: string | null) => (s ? new Date(s).toLocaleString() : "—");
  const fmtDur = (ms: number | null) => (ms == null ? "—" : `${(ms / 1000).toFixed(1)}s`);

  return (
    <div className="min-h-screen bg-brand-cloud">
      <Navbar />
      <div className="max-w-[1000px] mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <h1 className="font-display text-foreground mb-2">Admin: Manual Legislation Ingest</h1>
        <p className="text-sm text-muted-foreground mb-6">
          Trigger an ingest edge function on demand and inspect recent run history pulled from
          <code className="bg-muted px-1.5 py-0.5 rounded mx-1">legislation_ingestion_runs</code>.
        </p>

        <div className="bg-card border border-border rounded-xl p-5 space-y-4">
          <div>
            <label className="block text-[12px] font-semibold text-foreground mb-2">Function</label>
            <select
              value={selected}
              onChange={(e) => setSelected(e.target.value)}
              disabled={status === "running"}
              className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm"
            >
              {FUNCTIONS.map((f) => (
                <option key={f.name} value={f.name}>
                  {f.label} — {f.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={run}
              disabled={status === "running"}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-lg font-semibold text-[13px] disabled:opacity-50"
            >
              {status === "running" ? "Running…" : "Run now"}
            </button>
            {startedAt && (
              <span className="text-[12px] text-muted-foreground">Elapsed: {(elapsed / 1000).toFixed(1)}s</span>
            )}
            <span
              className={`text-[11px] font-semibold px-2.5 py-1 rounded-full ml-auto ${
                status === "complete"
                  ? "bg-green-100 text-green-800"
                  : status === "running"
                  ? "bg-amber-100 text-amber-800"
                  : status === "error"
                  ? "bg-red-100 text-red-800"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {status === "complete" ? "✓ Complete" : status === "running" ? "Running…" : status === "error" ? "Error" : "Idle"}
            </span>
          </div>
        </div>

        {error && (
          <div className="mt-6 bg-red-50 border border-red-200 rounded-xl p-4">
            <h3 className="text-[13px] font-semibold text-red-800 mb-1">Error</h3>
            <pre className="text-[12px] text-red-900 whitespace-pre-wrap break-words">{error}</pre>
          </div>
        )}

        {result && (
          <div className="mt-6 bg-card border border-border rounded-xl p-5">
            <h3 className="text-[13px] font-semibold text-foreground mb-2">Response</h3>
            <pre className="text-[12px] text-slate bg-muted/50 rounded-lg p-3 overflow-auto max-h-[400px]">
              {JSON.stringify(result, null, 2)}
            </pre>
          </div>
        )}

        <div className="mt-8 bg-card border border-border rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-foreground text-lg">
              Recent runs {selectedFn.source && <span className="text-[12px] text-muted-foreground font-sans">· source = {selectedFn.source}</span>}
            </h2>
            <button
              onClick={loadRuns}
              disabled={runsLoading}
              className="text-[12px] px-3 py-1.5 border border-border rounded-lg hover:bg-muted disabled:opacity-50"
            >
              {runsLoading ? "Refreshing…" : "Refresh"}
            </button>
          </div>

          {runs.length === 0 ? (
            <p className="text-[12px] text-muted-foreground italic">No runs recorded yet for this source.</p>
          ) : (
            <div className="space-y-2">
              {runs.map((r) => {
                const isOpen = !!expanded[r.id];
                return (
                  <div key={r.id} className="border border-border rounded-lg overflow-hidden">
                    <button
                      onClick={() => setExpanded((e) => ({ ...e, [r.id]: !e[r.id] }))}
                      className="w-full px-4 py-3 flex items-center gap-3 text-left hover:bg-muted/40"
                    >
                      {statusPill(r.status)}
                      <span className="text-[12px] font-mono text-foreground">{r.source}</span>
                      <span className="text-[12px] text-muted-foreground">{fmtDate(r.started_at)}</span>
                      <span className="text-[12px] text-muted-foreground">{fmtDur(r.duration_ms)}</span>
                      <span className="ml-auto text-[12px] text-muted-foreground">
                        fetched {r.fetched ?? 0} · ins {r.inserted ?? 0} · upd {r.updated ?? 0} · rej {r.rejected ?? 0}
                      </span>
                      <span className="text-[11px] text-muted-foreground">{isOpen ? "▾" : "▸"}</span>
                    </button>
                    {isOpen && (
                      <div className="px-4 py-3 bg-muted/30 border-t border-border space-y-2 text-[12px]">
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                          <div><span className="text-muted-foreground">Started:</span> {fmtDate(r.started_at)}</div>
                          <div><span className="text-muted-foreground">Finished:</span> {fmtDate(r.finished_at)}</div>
                          <div><span className="text-muted-foreground">Duration:</span> {fmtDur(r.duration_ms)}</div>
                          <div><span className="text-muted-foreground">Unchanged:</span> {r.unchanged ?? 0}</div>
                        </div>
                        {r.error_message && (
                          <div>
                            <div className="text-muted-foreground mb-1">Error message:</div>
                            <pre className="bg-red-50 text-red-900 rounded p-2 whitespace-pre-wrap break-words">{r.error_message}</pre>
                          </div>
                        )}
                        {r.rejected_samples && (Array.isArray(r.rejected_samples) ? r.rejected_samples.length > 0 : true) && (
                          <div>
                            <div className="text-muted-foreground mb-1">Rejected samples:</div>
                            <pre className="bg-background border border-border rounded p-2 overflow-auto max-h-[240px]">
                              {JSON.stringify(r.rejected_samples, null, 2)}
                            </pre>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          <p className="text-[11px] text-muted-foreground italic mt-3">
            This panel reads from the runs table. For raw stdout/stderr from inside the edge function, use the Lovable Cloud edge function log viewer.
          </p>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default AdminIngestLegislation;
