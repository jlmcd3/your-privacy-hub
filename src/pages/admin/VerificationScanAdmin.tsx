import { useCallback, useEffect, useRef, useState } from "react";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

type ScanResult = {
  mode: string;
  processed: number;
  verified: number;
  failed: number;
  requires_review: number;
  memo_eligible_after_batch: number;
  last_id: string | null;
  estimated_remaining: number;
  batch_cost_usd: number;
  estimated_cost_remaining_usd: number;
  next_batch_available: boolean;
  tokens_used: {
    haiku_input: number;
    haiku_output: number;
    sonnet_input: number;
    sonnet_output: number;
  };
  error?: string;
};

type Health = {
  total: number;
  verified: number;
  unverified: number;
  failed: number;
  requires_review: number;
  // Item 334: the requires_review bucket split by cause.
  review_corpus_defect: number;
  review_genuine: number;
  memo_eligible: number;
  paraphrase_high: number;
  paraphrase_medium: number;
  paraphrase_low: number;
  paraphrase_failed: number;
};

type QueueStat = {
  depth: number;
  in_flight: number;
  stuck: number;
};

type DriftRow = {
  id: string;
  enforcement_action_id: string | null;
  trigger_source: string;
  previous_verdict: string | null;
  new_verdict: string | null;
  detected_at: string;
};

type StuckRow = {
  enforcement_action_id: string;
  attempts: number;
  last_error: string | null;
  last_attempt_at: string | null;
};

type FailedRow = {
  id: string;
  subject: string | null;
  regulator: string | null;
  source_url: string | null;
  verification_last_run_at: string | null;
  verification_paraphrase_confidence: string | null;
};

type CoverageRow = { field: string; populated: number; verified: number };

const STORAGE_PAUSE_KEY = "verification-scan-pause";

export default function VerificationScanAdmin() {
  const [running, setRunning] = useState(false);
  const [batches, setBatches] = useState<ScanResult[]>([]);
  const [statusLine, setStatusLine] = useState("");
  const [costAccum, setCostAccum] = useState(0);
  const [processedTotal, setProcessedTotal] = useState(0);
  const [verifiedTotal, setVerifiedTotal] = useState(0);
  const [failedTotal, setFailedTotal] = useState(0);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [health, setHealth] = useState<Health | null>(null);
  const [queueStat, setQueueStat] = useState<QueueStat | null>(null);
  const [drift, setDrift] = useState<DriftRow[]>([]);
  const [stuck, setStuck] = useState<StuckRow[]>([]);
  const [failedRows, setFailedRows] = useState<FailedRow[]>([]);
  const [coverage, setCoverage] = useState<CoverageRow[]>([]);
  const [refreshedAt, setRefreshedAt] = useState<Date | null>(null);
  const [refreshErr, setRefreshErr] = useState("");
  const [loading, setLoading] = useState(false);
  const pauseRef = useRef(false);

  const loadHealth = useCallback(async () => {
    setLoading(true);
    setRefreshErr("");
    try {
      const ea = () => supabase.from("enforcement_actions");
      const head = (q: any) => q.select("id", { count: "exact", head: true });
      const [
        total, verified, unverified, failed, req,
        reqDefect, memo, ph, pm, pl, pf,
      ] = await Promise.all([
        head(ea()),
        head(ea()).eq("verification_status", "verified"),
        head(ea()).eq("verification_status", "unverified"),
        head(ea()).eq("verification_status", "failed"),
        head(ea()).eq("verification_status", "requires_review"),
        // Item 334: mechanical corpus-quality rejects, separated from the
        // genuine human-review queue.
        head(ea())
          .eq("verification_status", "requires_review")
          .eq("review_reason", "corpus_defect_subject"),
        head(ea()).eq("memo_eligible", true),
        head(ea()).eq("verification_paraphrase_confidence", "high"),
        head(ea()).eq("verification_paraphrase_confidence", "medium"),
        head(ea()).eq("verification_paraphrase_confidence", "low"),
        head(ea()).eq("verification_paraphrase_confidence", "failed"),
      ]);
      const reqTotal = req.count ?? 0;
      const reqDefectCount = reqDefect.count ?? 0;
      setHealth({
        total: total.count ?? 0,
        verified: verified.count ?? 0,
        unverified: unverified.count ?? 0,
        failed: failed.count ?? 0,
        requires_review: reqTotal,
        review_corpus_defect: reqDefectCount,
        review_genuine: Math.max(0, reqTotal - reqDefectCount),
        memo_eligible: memo.count ?? 0,
        paraphrase_high: ph.count ?? 0,
        paraphrase_medium: pm.count ?? 0,
        paraphrase_low: pl.count ?? 0,
        paraphrase_failed: pf.count ?? 0,
      });

      const nowIso = new Date().toISOString();
      const vq = () => supabase.from("verification_queue" as any);
      const [depth, inflight, stuckCount, stuckRows] = await Promise.all([
        head(vq()).or(`in_flight_until.is.null,in_flight_until.lt.${nowIso}`),
        head(vq()).gte("in_flight_until", nowIso),
        head(vq()).gte("attempts", 3),
        vq()
          .select("enforcement_action_id, attempts, last_error, last_attempt_at")
          .gte("attempts", 3)
          .order("last_attempt_at", { ascending: false })
          .limit(50),
      ]);
      setQueueStat({
        depth: depth.count ?? 0,
        in_flight: inflight.count ?? 0,
        stuck: stuckCount.count ?? 0,
      });
      setStuck(((stuckRows as any).data ?? []) as StuckRow[]);

      const { data: driftData } = await supabase
        .from("corpus_drift_log" as any)
        .select("id, enforcement_action_id, trigger_source, previous_verdict, new_verdict, detected_at")
        .order("detected_at", { ascending: false })
        .limit(50);
      setDrift(((driftData as any) ?? []) as DriftRow[]);

      const { data: failedData } = await supabase
        .from("enforcement_actions")
        .select("id, subject, regulator, source_url, verification_last_run_at, verification_paraphrase_confidence")
        .eq("verification_status", "failed")
        .order("verification_last_run_at", { ascending: false })
        .limit(50);
      setFailedRows((failedData ?? []) as FailedRow[]);

      // Coverage per Tier A/B field
      const fields: { key: string; col: string; isArr?: boolean }[] = [
        { key: "statutory_provisions", col: "statutory_provisions", isArr: true },
        { key: "disposition_type", col: "disposition_type" },
        { key: "appeal_status", col: "appeal_status" },
        { key: "case_reference", col: "case_reference" },
        { key: "sector", col: "sector" },
        { key: "original_currency", col: "original_currency" },
        { key: "original_amount", col: "original_amount" },
      ];
      const cov = await Promise.all(
        fields.map(async (f) => {
          const populatedQ = head(ea()).not(f.col, "is", null);
          const verifiedQ = head(ea()).not(f.col, "is", null).eq("verification_status", "verified");
          const [p, v] = await Promise.all([populatedQ, verifiedQ]);
          return { field: f.key, populated: p.count ?? 0, verified: v.count ?? 0 };
        }),
      );
      setCoverage(cov);

      setRefreshedAt(new Date());
    } catch (e) {
      setRefreshErr((e as Error).message ?? String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadHealth(); }, [loadHealth]);

  const runScan = useCallback(async () => {
    setRunning(true);
    setBatches([]);
    setCostAccum(0);
    setProcessedTotal(0);
    setVerifiedTotal(0);
    setFailedTotal(0);
    setStartTime(Date.now());
    pauseRef.current = false;
    localStorage.removeItem(STORAGE_PAUSE_KEY);
    setStatusLine("Starting initial scan…");
    let cursor: string | null = null;
    let totalCost = 0;
    let totalProcessed = 0;
    let totalVerified = 0;
    let totalFailed = 0;
    try {
      for (let i = 0; i < 1000; i++) {
        if (pauseRef.current || localStorage.getItem(STORAGE_PAUSE_KEY) === "1") {
          setStatusLine(`Paused after ${i} batch(es). Click Run to resume.`);
          break;
        }
        const { data, error } = await supabase.functions.invoke("verification-scan", {
          body: { mode: "initial", batch_size: 10, start_after_id: cursor },
        });
        if (error) throw error;
        const r = data as ScanResult;
        if (r.error) throw new Error(r.error);
        setBatches((prev) => [...prev, r]);
        totalCost += r.batch_cost_usd ?? 0;
        totalProcessed += r.processed;
        totalVerified += r.verified;
        totalFailed += r.failed + r.requires_review;
        setCostAccum(totalCost);
        setProcessedTotal(totalProcessed);
        setVerifiedTotal(totalVerified);
        setFailedTotal(totalFailed);
        setStatusLine(
          `Batch ${i + 1}: processed ${r.processed} (running total ${totalProcessed}). ` +
          `Est. remaining ${r.estimated_remaining.toLocaleString()} rows ` +
          `· $${(r.estimated_cost_remaining_usd ?? 0).toFixed(2)} est. cost remaining.`,
        );
        if (!r.next_batch_available || r.processed === 0) {
          setStatusLine(`Complete. Processed ${totalProcessed} rows. Total cost $${totalCost.toFixed(2)}.`);
          break;
        }
        cursor = r.last_id;
      }
    } catch (e) {
      setStatusLine(`Stopped on error: ${(e as Error).message ?? e}`);
    } finally {
      setRunning(false);
      await loadHealth();
    }
  }, [loadHealth]);

  const pauseScan = useCallback(() => {
    pauseRef.current = true;
    localStorage.setItem(STORAGE_PAUSE_KEY, "1");
    setStatusLine("Pause requested — will stop at end of current batch.");
  }, []);

  const drainQueueNow = useCallback(async () => {
    const { data, error } = await supabase.functions.invoke("verification-queue-drain", {});
    if (error) alert(`Drain failed: ${error.message}`);
    else alert(`Drain result: ${JSON.stringify(data)}`);
    await loadHealth();
  }, [loadHealth]);

  const clearStuck = useCallback(async () => {
    if (!confirm("Reset attempts to 0 for all stuck queue entries?")) return;
    await supabase.from("verification_queue" as any).update({ attempts: 0, last_error: null }).gte("attempts", 3);
    await loadHealth();
  }, [loadHealth]);

  const retryRow = useCallback(async (id: string) => {
    await supabase.from("verification_queue" as any).update({ attempts: 0, last_error: null, in_flight_until: null }).eq("enforcement_action_id", id);
    await loadHealth();
  }, [loadHealth]);

  const elapsed = startTime ? (Date.now() - startTime) / 1000 : 0;
  const ratePerSec = elapsed > 0 ? processedTotal / elapsed : 0;
  const remaining = (batches[batches.length - 1]?.estimated_remaining ?? 0);
  const etaSec = ratePerSec > 0 ? remaining / ratePerSec : 0;
  const pct = health && health.total > 0 ? Math.round((health.verified / health.total) * 100) : 0;

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <Helmet>
        <title>Verification Scan — Admin</title>
        <meta name="robots" content="noindex" />
      </Helmet>
      <Navbar />
      <main className="flex-1 max-w-6xl mx-auto px-4 py-8 w-full">
        <h1 className="text-3xl font-serif mb-2">Verification scan (Package 7)</h1>
        <p className="text-sm text-muted-foreground mb-6">
          Fetches each enforcement action's primary source, extracts Tier A/B fields via Claude Haiku 4.5,
          verifies the corpus paraphrase via Sonnet 4.6, and gates <code>memo_eligible</code> on the result.
        </p>

        {/* Health */}
        <section className="mb-6 border rounded p-4">
          <div className="flex items-center justify-between mb-3 gap-2 flex-wrap">
            <h2 className="text-lg font-semibold">Overall corpus health</h2>
            <div className="flex items-center gap-2 text-xs">
              {refreshedAt && (
                <span className="text-muted-foreground">Updated {refreshedAt.toLocaleTimeString()}</span>
              )}
              <button onClick={loadHealth} disabled={loading} className="underline disabled:opacity-50">
                {loading ? "Refreshing…" : "Refresh"}
              </button>
            </div>
          </div>
          {refreshErr && <p className="text-xs text-destructive mb-2">Error: {refreshErr}</p>}
          {health && (
            <>
              <div className="grid grid-cols-2 md:grid-cols-6 gap-3 text-sm">
                <Stat label="Total" value={health.total} />
                <Stat label="Verified" value={health.verified} sub={`${pct}%`} />
                <Stat label="Memo-eligible" value={health.memo_eligible} sub={health.total ? `${Math.round((health.memo_eligible / health.total) * 100)}%` : "0%"} />
                <Stat label="Pending" value={health.unverified} />
                <Stat label="Failed" value={health.failed} />
                {/* Item 334: default to genuine review items; corpus defects
                    are mechanical rejects and shown only on request. */}
                <Stat
                  label={showCorpusDefects ? "Requires review (all)" : "Requires review"}
                  value={showCorpusDefects ? health.requires_review : health.review_genuine}
                  sub={showCorpusDefects
                    ? `${health.review_genuine} genuine + ${health.review_corpus_defect} corpus defects`
                    : `${health.review_corpus_defect} corpus defects hidden`}
                />
              </div>
              <label className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
                <input
                  type="checkbox"
                  checked={showCorpusDefects}
                  onChange={(e) => setShowCorpusDefects(e.target.checked)}
                />
                Include mechanical corpus defects (bad subject fields) in the review queue
              </label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs mt-4">
                <Stat label="Paraphrase: high" value={health.paraphrase_high} />
                <Stat label="Paraphrase: medium" value={health.paraphrase_medium} />
                <Stat label="Paraphrase: low" value={health.paraphrase_low} />
                <Stat label="Paraphrase: failed" value={health.paraphrase_failed} />
              </div>
            </>
          )}
        </section>

        {/* Initial scan */}
        <section className="mb-6 border rounded p-4">
          <h2 className="text-lg font-semibold mb-3">Initial scan</h2>
          <div className="flex gap-3 flex-wrap mb-3">
            <button
              onClick={runScan}
              disabled={running}
              className="px-4 py-2 rounded bg-brand-teal-deep text-white disabled:opacity-50"
            >
              {running ? "Running…" : "Run initial scan"}
            </button>
            <button
              onClick={pauseScan}
              disabled={!running}
              className="px-4 py-2 rounded border border-brand-navy text-brand-navy disabled:opacity-50"
            >
              Pause
            </button>
          </div>
          {statusLine && <p className="text-sm mb-3">{statusLine}</p>}
          {(running || batches.length > 0) && (
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-sm">
              <Stat label="Processed" value={processedTotal} />
              <Stat label="Verified" value={verifiedTotal} />
              <Stat label="Failed / review" value={failedTotal} />
              <Stat label="Running cost (USD)" value={Number(costAccum.toFixed(2))} />
              <Stat label="ETA (min)" value={Math.round(etaSec / 60)} />
            </div>
          )}
        </section>

        {/* Queue */}
        <section className="mb-6 border rounded p-4">
          <div className="flex items-center justify-between mb-3 gap-2 flex-wrap">
            <h2 className="text-lg font-semibold">New-row queue</h2>
            <div className="flex gap-2">
              <button onClick={drainQueueNow} className="text-xs underline">Drain now</button>
              {queueStat && queueStat.stuck > 0 && (
                <button onClick={clearStuck} className="text-xs underline text-destructive">Clear stuck</button>
              )}
            </div>
          </div>
          {queueStat && (
            <div className="grid grid-cols-3 gap-3 text-sm mb-3">
              <Stat label="Queue depth" value={queueStat.depth} />
              <Stat label="In-flight" value={queueStat.in_flight} />
              <Stat label="Stuck (≥3 attempts)" value={queueStat.stuck} />
            </div>
          )}
          {stuck.length > 0 && (
            <table className="text-xs w-full">
              <thead><tr className="text-left">
                <th className="p-1">Action ID</th><th className="p-1">Attempts</th>
                <th className="p-1">Last attempt</th><th className="p-1">Last error</th><th className="p-1"></th>
              </tr></thead>
              <tbody>
                {stuck.map((s) => (
                  <tr key={s.enforcement_action_id} className="border-t align-top">
                    <td className="p-1 font-mono">{s.enforcement_action_id.slice(0, 8)}</td>
                    <td className="p-1">{s.attempts}</td>
                    <td className="p-1 whitespace-nowrap">{s.last_attempt_at ? new Date(s.last_attempt_at).toLocaleString() : "—"}</td>
                    <td className="p-1">{s.last_error}</td>
                    <td className="p-1"><button onClick={() => retryRow(s.enforcement_action_id)} className="underline">retry</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

        {/* Field coverage */}
        <section className="mb-6 border rounded p-4">
          <h2 className="text-lg font-semibold mb-3">Tier A/B field coverage</h2>
          <table className="text-xs w-full">
            <thead><tr className="text-left">
              <th className="p-1">Field</th><th className="p-1">Populated</th><th className="p-1">Populated &amp; verified</th>
            </tr></thead>
            <tbody>
              {coverage.map((c) => (
                <tr key={c.field} className="border-t">
                  <td className="p-1 font-mono">{c.field}</td>
                  <td className="p-1">{c.populated.toLocaleString()}</td>
                  <td className="p-1">{c.verified.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        {/* Drift log */}
        <section className="mb-6 border rounded p-4 overflow-x-auto">
          <h2 className="text-lg font-semibold mb-3">Drift log (most recent 50)</h2>
          {drift.length === 0 ? (
            <p className="text-sm text-muted-foreground">No drift events recorded.</p>
          ) : (
            <table className="text-xs w-full min-w-[640px]">
              <thead><tr className="text-left">
                <th className="p-1">Detected</th><th className="p-1">Action</th>
                <th className="p-1">Trigger</th><th className="p-1">Previous</th><th className="p-1">New</th>
              </tr></thead>
              <tbody>
                {drift.map((d) => (
                  <tr key={d.id} className="border-t">
                    <td className="p-1 whitespace-nowrap">{new Date(d.detected_at).toLocaleString()}</td>
                    <td className="p-1 font-mono">{d.enforcement_action_id?.slice(0, 8) ?? "—"}</td>
                    <td className="p-1">{d.trigger_source}</td>
                    <td className="p-1">{d.previous_verdict ?? "—"}</td>
                    <td className="p-1">{d.new_verdict ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

        {/* Failed verifications */}
        <section className="mb-6 border rounded p-4 overflow-x-auto">
          <h2 className="text-lg font-semibold mb-3">Failed verifications (most recent 50)</h2>
          {failedRows.length === 0 ? (
            <p className="text-sm text-muted-foreground">No failed rows.</p>
          ) : (
            <table className="text-xs w-full min-w-[720px]">
              <thead><tr className="text-left">
                <th className="p-1">Last run</th><th className="p-1">Action</th>
                <th className="p-1">Regulator</th><th className="p-1">Subject</th>
                <th className="p-1">Paraphrase</th><th className="p-1">Source</th>
              </tr></thead>
              <tbody>
                {failedRows.map((r) => (
                  <tr key={r.id} className="border-t align-top">
                    <td className="p-1 whitespace-nowrap">{r.verification_last_run_at ? new Date(r.verification_last_run_at).toLocaleString() : "—"}</td>
                    <td className="p-1 font-mono">{r.id.slice(0, 8)}</td>
                    <td className="p-1">{r.regulator}</td>
                    <td className="p-1">{r.subject}</td>
                    <td className="p-1">{r.verification_paraphrase_confidence ?? "—"}</td>
                    <td className="p-1 break-all">
                      {r.source_url ? (
                        <a href={r.source_url} target="_blank" rel="noreferrer" className="underline">link</a>
                      ) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

        {/* Per-batch */}
        {batches.length > 0 && (
          <section className="mb-8 border rounded p-4 overflow-x-auto">
            <h2 className="text-lg font-semibold mb-3">Per-batch summary</h2>
            <table className="text-xs w-full min-w-[720px]">
              <thead><tr className="text-left">
                <th className="p-1">#</th><th className="p-1">Processed</th>
                <th className="p-1">Verified</th><th className="p-1">Failed</th>
                <th className="p-1">Review</th><th className="p-1">Cost USD</th>
                <th className="p-1">Tokens (H in/out, S in/out)</th>
              </tr></thead>
              <tbody>
                {batches.map((b, i) => (
                  <tr key={i} className="border-t">
                    <td className="p-1">{i + 1}</td>
                    <td className="p-1">{b.processed}</td>
                    <td className="p-1">{b.verified}</td>
                    <td className="p-1">{b.failed}</td>
                    <td className="p-1">{b.requires_review}</td>
                    <td className="p-1">${(b.batch_cost_usd ?? 0).toFixed(4)}</td>
                    <td className="p-1 font-mono">
                      {b.tokens_used.haiku_input}/{b.tokens_used.haiku_output} ·{" "}
                      {b.tokens_used.sonnet_input}/{b.tokens_used.sonnet_output}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )}
      </main>
      <Footer />
    </div>
  );
}

function Stat({ label, value, sub }: { label: string; value: number; sub?: string }) {
  return (
    <div className="rounded border p-3">
      <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="text-xl font-semibold">{value.toLocaleString()}</div>
      {sub && <div className="text-[11px] text-muted-foreground">{sub}</div>}
    </div>
  );
}
