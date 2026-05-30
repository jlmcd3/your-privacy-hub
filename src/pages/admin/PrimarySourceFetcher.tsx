// Admin tool: dispatches the batch-fetch-primary-sources edge function via
// the SECURITY DEFINER RPC admin_fire_batch_fetch_primary_sources. The RPC
// creates a row in primary_source_fetch_runs and returns its id; this page
// polls that row every 2s and renders the live event log + counters so you
// don't have to leave the page to read edge-function logs.

import { useCallback, useEffect, useRef, useState } from "react";
import { Helmet } from "react-helmet-async";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";

type SourceRow = { source_database: string | null; pending: number };

type Event = { ts: string; level: "info" | "ok" | "warn" | "error"; msg: string };

type Run = {
  id: string;
  status: string;
  dry_run: boolean;
  queried: number;
  processed: number;
  extracted_verbatim: number;
  extracted_unverified: number;
  fetched_partial: number;
  fetch_failed: number;
  events: Event[] | null;
  error: string | null;
  started_at: string;
  completed_at: string | null;
};

const LEVEL_COLOR: Record<Event["level"], string> = {
  info: "text-muted-foreground",
  ok: "text-emerald-600 dark:text-emerald-400",
  warn: "text-amber-600 dark:text-amber-400",
  error: "text-destructive",
};

export default function PrimarySourceFetcher() {
  const [limit, setLimit] = useState(10);
  const [source, setSource] = useState("FTC");
  const [regulator, setRegulator] = useState("");
  const [busy, setBusy] = useState<null | "dry" | "real">(null);
  const [pending, setPending] = useState<SourceRow[]>([]);
  const [pendingLoading, setPendingLoading] = useState(false);
  const [pendingRefreshedAt, setPendingRefreshedAt] = useState<Date | null>(null);
  const [runId, setRunId] = useState<string | null>(null);
  const [run, setRun] = useState<Run | null>(null);
  const [error, setError] = useState<string>("");
  const logEndRef = useRef<HTMLDivElement | null>(null);

  const loadPending = useCallback(async () => {
    setPendingLoading(true);
    const { data, error } = await supabase
      .from("enforcement_actions")
      .select("source_database")
      .eq("primary_source_status", "pending_fetch")
      .not("primary_source_url", "is", null)
      .limit(5000);
    setPendingLoading(false);
    if (error) { setError(`Error loading pending counts: ${error.message}`); return; }
    const tally = new Map<string, number>();
    for (const r of data ?? []) {
      const k = (r as any).source_database ?? "(unlabeled)";
      tally.set(k, (tally.get(k) ?? 0) + 1);
    }
    setPending(
      Array.from(tally.entries())
        .map(([source_database, pending]) => ({ source_database, pending }))
        .sort((a, b) => b.pending - a.pending),
    );
    setPendingRefreshedAt(new Date());
  }, []);

  useEffect(() => { loadPending(); }, [loadPending]);

  // Poll the active run row.
  useEffect(() => {
    if (!runId) return;
    let cancelled = false;
    const tick = async () => {
      const { data, error } = await supabase
        .from("primary_source_fetch_runs" as any)
        .select("*")
        .eq("id", runId)
        .maybeSingle();
      if (cancelled) return;
      if (error) { setError(`Polling error: ${error.message}`); return; }
      setRun(data as unknown as Run);
    };
    tick();
    const handle = setInterval(tick, 2000);
    return () => { cancelled = true; clearInterval(handle); };
  }, [runId]);

  // Auto-scroll log when new events arrive.
  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [run?.events?.length]);

  // When a run completes, refresh pending counts.
  useEffect(() => {
    if (run?.status === "complete" || run?.status === "error") {
      loadPending();
      setBusy(null);
    }
  }, [run?.status, loadPending]);

  const run_ = useCallback(async (dryRun: boolean) => {
    setBusy(dryRun ? "dry" : "real");
    setError("");
    setRun(null);
    setRunId(null);
    const { data, error } = await supabase.rpc(
      "admin_fire_batch_fetch_primary_sources" as any,
      {
        p_limit: limit,
        p_dry_run: dryRun,
        p_source: source || null,
        p_regulator: regulator || null,
      },
    );
    if (error) {
      setError(`Error: ${error.message}`);
      setBusy(null);
      return;
    }
    setRunId(data as string);
  }, [limit, source, regulator]);

  const events = run?.events ?? [];
  const isDone = run?.status === "complete" || run?.status === "error";

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <Helmet>
        <title>Primary Source Fetcher — Admin</title>
        <meta name="robots" content="noindex" />
      </Helmet>
      <Navbar />
      <main className="flex-1 max-w-3xl mx-auto px-4 py-8 w-full">
        <h1 className="text-3xl font-serif mb-2">Primary source fetcher</h1>
        <p className="text-sm text-muted-foreground mb-6">
          Dispatches <code>batch-fetch-primary-sources</code> for enforcement actions
          marked <code>pending_fetch</code>. Successful fetches reset
          <code> enrichment_version</code> to 0 so they re-enrich with full text.
          Use <em>dry-run</em> first.
        </p>

        <section className="border rounded p-4 mb-6">
          <h2 className="text-lg font-semibold mb-3">Pending fetch by source</h2>
          {pending.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nothing pending.</p>
          ) : (
            <table className="text-sm w-full">
              <thead>
                <tr className="text-left border-b">
                  <th className="py-1">source_database</th>
                  <th className="py-1">Pending</th>
                </tr>
              </thead>
              <tbody>
                {pending.map((r) => (
                  <tr key={r.source_database ?? "null"} className="border-t">
                    <td className="py-1 font-mono">{r.source_database ?? "(unlabeled)"}</td>
                    <td className="py-1 font-mono">{r.pending.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <button onClick={loadPending} className="text-xs underline mt-2">Refresh</button>
        </section>

        <section className="border rounded p-4 mb-6 space-y-3">
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label htmlFor="limit">Limit (max 50)</Label>
              <Input
                id="limit" type="number" min={1} max={50}
                value={limit}
                onChange={(e) => setLimit(Math.max(1, Math.min(50, Number(e.target.value) || 1)))}
              />
            </div>
            <div>
              <Label htmlFor="source">source_database</Label>
              <Input
                id="source" placeholder="e.g. FTC"
                value={source}
                onChange={(e) => setSource(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="regulator">regulator filter</Label>
              <Input
                id="regulator" placeholder="ilike, optional"
                value={regulator}
                onChange={(e) => setRegulator(e.target.value)}
              />
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <Button
              variant="outline"
              disabled={busy !== null}
              onClick={() => run_(true)}
            >
              {busy === "dry" ? "Dispatching…" : "Dry-run"}
            </Button>
            <Button
              disabled={busy !== null}
              onClick={() => run_(false)}
              className="bg-brand-teal text-white"
            >
              {busy === "real" ? "Dispatching…" : "Run (fetch & extract)"}
            </Button>
          </div>

          {error && <p className="text-sm text-destructive pt-2">{error}</p>}
        </section>

        {run && (
          <section className="border rounded p-4 mb-6">
            <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
              <div>
                <h2 className="text-lg font-semibold">
                  Live log{" "}
                  <span className="text-xs font-mono text-muted-foreground">
                    {run.id.slice(0, 8)} • {run.status}
                    {run.dry_run && " • dry-run"}
                  </span>
                </h2>
                <p className="text-xs text-muted-foreground">
                  Started {new Date(run.started_at).toLocaleTimeString()}
                  {run.completed_at && ` • finished ${new Date(run.completed_at).toLocaleTimeString()}`}
                </p>
              </div>
              {!isDone && (
                <span className="text-xs px-2 py-1 rounded bg-brand-teal/10 text-brand-teal">
                  polling every 2s…
                </span>
              )}
            </div>

            <div className="grid grid-cols-3 md:grid-cols-6 gap-2 text-xs mb-3">
              <Stat label="queried" value={run.queried} />
              <Stat label="processed" value={run.processed} />
              <Stat label="verbatim" value={run.extracted_verbatim} />
              <Stat label="unverified" value={run.extracted_unverified} />
              <Stat label="partial" value={run.fetched_partial} />
              <Stat label="failed" value={run.fetch_failed} />
            </div>

            <div className="bg-muted/40 border rounded p-3 font-mono text-xs max-h-[420px] overflow-auto">
              {events.length === 0 ? (
                <p className="text-muted-foreground">Waiting for events…</p>
              ) : (
                events.map((ev, i) => (
                  <div key={i} className="whitespace-pre-wrap">
                    <span className="text-muted-foreground">
                      {new Date(ev.ts).toLocaleTimeString()}{" "}
                    </span>
                    <span className={LEVEL_COLOR[ev.level]}>
                      [{ev.level}]
                    </span>{" "}
                    {ev.msg}
                  </div>
                ))
              )}
              <div ref={logEndRef} />
            </div>

            {run.error && (
              <p className="text-sm text-destructive mt-3">Run error: {run.error}</p>
            )}
          </section>
        )}
      </main>
      <Footer />
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="border rounded p-2 text-center">
      <div className="text-muted-foreground">{label}</div>
      <div className="font-mono text-sm">{value.toLocaleString()}</div>
    </div>
  );
}
