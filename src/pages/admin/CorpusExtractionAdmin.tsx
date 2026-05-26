import { useCallback, useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

type Summary = {
  statutory_provisions_high_confidence: number;
  statutory_provisions_no_pattern: number;
  disposition_set: number;
  appeal_status_set: number;
  original_amount_set: number;
  case_reference_set: number;
  sector_set: number;
  errors: number;
};

type BatchResult = {
  processed: number;
  last_id: string | null;
  extraction_summary: Summary;
};

type EligibilityStatus = {
  total: number;
  memoEligibleTrue: number;
  memoEligibleFalse: number;
  memoEligibleNull: number;
  hasSourceUrl: number;
  hasProvisionsMethod: number;
  hasProvisions: number;
  hasKcf: number;
  hasLaw: number;
  methodBreakdown: { method: string; count: number }[];
};

type ErrorRow = {
  id: string;
  enforcement_action_id: string | null;
  stage: string;
  error_message: string;
  ran_at: string;
};

const EMPTY_TOTALS: Summary = {
  statutory_provisions_high_confidence: 0,
  statutory_provisions_no_pattern: 0,
  disposition_set: 0,
  appeal_status_set: 0,
  original_amount_set: 0,
  case_reference_set: 0,
  sector_set: 0,
  errors: 0,
};

export default function CorpusExtractionAdmin() {
  const [running, setRunning] = useState(false);
  const [batches, setBatches] = useState<BatchResult[]>([]);
  const [totals, setTotals] = useState<Summary>({ ...EMPTY_TOTALS });
  const [processedTotal, setProcessedTotal] = useState(0);
  const [statusLine, setStatusLine] = useState<string>("");
  const [errorRows, setErrorRows] = useState<ErrorRow[]>([]);
  const [coverage, setCoverage] = useState<{ total: number; withProvisions: number; noPattern: number } | null>(null);
  const [eligibility, setEligibility] = useState<EligibilityStatus | null>(null);
  const [eligibilityLoading, setEligibilityLoading] = useState(false);
  const [eligibilityError, setEligibilityError] = useState<string>("");
  const [eligibilityRefreshedAt, setEligibilityRefreshedAt] = useState<Date | null>(null);
  const [recomputeResult, setRecomputeResult] = useState<string>("");

  const loadErrors = useCallback(async () => {
    const { data } = await supabase
      .from("corpus_extraction_errors" as any)
      .select("id, enforcement_action_id, stage, error_message, ran_at")
      .order("ran_at", { ascending: false })
      .limit(50);
    setErrorRows((data as any) ?? []);
  }, []);

  const loadCoverage = useCallback(async () => {
    const [{ count: total }, { count: withProvisions }, { count: noPattern }] = await Promise.all([
      supabase.from("enforcement_actions").select("id", { count: "exact", head: true }),
      supabase
        .from("enforcement_actions")
        .select("id", { count: "exact", head: true })
        .eq("statutory_provisions_extraction_method", "regex_high_confidence"),
      supabase
        .from("enforcement_actions")
        .select("id", { count: "exact", head: true })
        .eq("statutory_provisions_extraction_method", "no_pattern_found"),
    ]);
    setCoverage({
      total: total ?? 0,
      withProvisions: withProvisions ?? 0,
      noPattern: noPattern ?? 0,
    });
  }, []);

  const loadEligibility = useCallback(async () => {
    setEligibilityLoading(true);
    setEligibilityError("");
    try {
      const headCount = (q: any) => q.select("id", { count: "exact", head: true });
      const ea = () => supabase.from("enforcement_actions");
      const results = await Promise.all([
        headCount(ea()),
        headCount(ea()).eq("memo_eligible", true),
        headCount(ea()).eq("memo_eligible", false),
        headCount(ea()).is("memo_eligible", null),
        headCount(ea()).not("source_url", "is", null).neq("source_url", ""),
        headCount(ea()).in("statutory_provisions_extraction_method", [
          "regex_high_confidence",
          "pattern_per_regulator",
        ]),
        headCount(ea()).not("key_compliance_failure", "is", null).neq("key_compliance_failure", ""),
        headCount(ea()).not("law", "is", null).neq("law", ""),
        headCount(ea()).eq("statutory_provisions_extraction_method", "none"),
        headCount(ea()).eq("statutory_provisions_extraction_method", "regex_high_confidence"),
        headCount(ea()).eq("statutory_provisions_extraction_method", "pattern_per_regulator"),
        headCount(ea()).eq("statutory_provisions_extraction_method", "no_pattern_found"),
      ]);
      const firstError: any = results.find((r: any) => r.error);
      if (firstError) throw new Error(firstError.error.message);
      const [total, mTrue, mFalse, mNull, srcUrl, provMethod, kcf, law, provNone, provHi, provPattern, provNoPattern] = results;
      const hasProvisions = (provHi.count ?? 0) + (provPattern.count ?? 0);
      setEligibility({
        total: total.count ?? 0,
        memoEligibleTrue: mTrue.count ?? 0,
        memoEligibleFalse: mFalse.count ?? 0,
        memoEligibleNull: mNull.count ?? 0,
        hasSourceUrl: srcUrl.count ?? 0,
        hasProvisionsMethod: provMethod.count ?? 0,
        hasProvisions,
        hasKcf: kcf.count ?? 0,
        hasLaw: law.count ?? 0,
        methodBreakdown: [
          { method: "none (not yet run)", count: provNone.count ?? 0 },
          { method: "regex_high_confidence", count: provHi.count ?? 0 },
          { method: "pattern_per_regulator", count: provPattern.count ?? 0 },
          { method: "no_pattern_found", count: provNoPattern.count ?? 0 },
        ],
      });
      setEligibilityRefreshedAt(new Date());
    } catch (e) {
      setEligibilityError((e as Error).message ?? String(e));
    } finally {
      setEligibilityLoading(false);
    }
  }, []);

  useEffect(() => { loadErrors(); loadCoverage(); loadEligibility(); }, [loadErrors, loadCoverage, loadEligibility]);

  const runExtraction = useCallback(async (force: boolean) => {
    setRunning(true);
    setBatches([]);
    setTotals({ ...EMPTY_TOTALS });
    setProcessedTotal(0);
    setStatusLine("Starting…");

    let cursor: string | null = null;
    const accTotals: Summary = { ...EMPTY_TOTALS };
    let processed = 0;

    try {
      // Safety cap so a runaway loop can't spin forever.
      for (let i = 0; i < 500; i++) {
        const { data, error } = await supabase.functions.invoke("corpus-extract-candidates", {
          body: { batch_size: 100, start_after_id: cursor, force_reextract: force },
        });
        if (error) throw error;
        const batch = data as BatchResult;
        setBatches((prev) => [...prev, batch]);
        for (const k of Object.keys(accTotals) as (keyof Summary)[]) {
          accTotals[k] += batch.extraction_summary[k] ?? 0;
        }
        processed += batch.processed;
        setTotals({ ...accTotals });
        setProcessedTotal(processed);
        setStatusLine(`Batch ${i + 1}: processed ${batch.processed} (running total ${processed})`);
        if (!batch.processed || batch.processed === 0) break;
        cursor = batch.last_id;
      }
      setStatusLine(`Complete. Total processed: ${processed}.`);
    } catch (e) {
      setStatusLine(`Stopped on error: ${(e as Error).message}`);
    } finally {
      setRunning(false);
      await Promise.all([loadErrors(), loadCoverage(), loadEligibility()]);
    }
  }, [loadErrors, loadCoverage, loadEligibility]);

  const recomputeMemo = useCallback(async () => {
    setRecomputeResult("Recomputing…");
    const { data, error } = await supabase.rpc("recompute_memo_eligible_interim" as any);
    if (error) { setRecomputeResult(`Error: ${error.message}`); return; }
    setRecomputeResult(`Recomputed memo_eligible — ${data} row(s) changed value.`);
    await loadEligibility();
  }, [loadEligibility]);

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <Helmet>
        <title>Corpus Extraction — Admin</title>
        <meta name="robots" content="noindex" />
      </Helmet>
      <Navbar />
      <main className="flex-1 max-w-5xl mx-auto px-4 py-8 w-full">
        <h1 className="text-3xl font-serif mb-2">Corpus candidate extraction</h1>
        <p className="text-sm text-muted-foreground mb-6">
          Runs deterministic Tier-A / Tier-B extractors over the <code>enforcement_actions</code> table.
          Idempotent — re-run safely. Use <em>force re-extract</em> only when patterns change.
        </p>

        <div className="flex flex-wrap gap-3 mb-6">
          <button
            disabled={running}
            onClick={() => runExtraction(false)}
            className="px-4 py-2 rounded bg-brand-teal text-white disabled:opacity-50"
          >
            {running ? "Running…" : "Run extraction"}
          </button>
          <button
            disabled={running}
            onClick={() => runExtraction(true)}
            className="px-4 py-2 rounded border border-brand-teal text-brand-teal disabled:opacity-50"
          >
            Run with force re-extract
          </button>
          <button
            disabled={running}
            onClick={recomputeMemo}
            className="px-4 py-2 rounded border border-brand-navy text-brand-navy disabled:opacity-50"
          >
            Recompute memo_eligible (interim)
          </button>
        </div>

        {statusLine && <p className="mb-2 text-sm">{statusLine}</p>}
        {recomputeResult && <p className="mb-4 text-sm">{recomputeResult}</p>}

        {eligibility && (
          <section className="mb-8 border rounded p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold">Memo-eligibility status</h2>
              <button onClick={loadEligibility} className="text-xs underline">Refresh</button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm mb-4">
              <Stat label="Total rows" value={eligibility.total} />
              <Stat label="memo_eligible = true" value={eligibility.memoEligibleTrue} />
              <Stat label="memo_eligible = false" value={eligibility.memoEligibleFalse} />
              <Stat label="memo_eligible = null" value={eligibility.memoEligibleNull} />
            </div>

            <h3 className="text-sm font-semibold mb-2">Eligibility gates (must all be satisfied)</h3>
            <table className="text-xs w-full mb-4">
              <thead>
                <tr className="text-left">
                  <th className="p-1">Gate</th>
                  <th className="p-1">Rows passing</th>
                  <th className="p-1">% of total</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ["Has source_url", eligibility.hasSourceUrl],
                  ["Has extraction method (high-conf or per-regulator)", eligibility.hasProvisionsMethod],
                  ["Has ≥1 statutory provision (proxy)", eligibility.hasProvisions],
                  ["Has key_compliance_failure", eligibility.hasKcf],
                  ["Has law", eligibility.hasLaw],
                ].map(([label, n]) => (
                  <tr key={label as string} className="border-t">
                    <td className="p-1">{label}</td>
                    <td className="p-1 font-mono">{(n as number).toLocaleString()}</td>
                    <td className="p-1 font-mono">
                      {eligibility.total ? Math.round(((n as number) / eligibility.total) * 100) : 0}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <h3 className="text-sm font-semibold mb-2">Extraction method breakdown</h3>
            <table className="text-xs w-full mb-3">
              <thead>
                <tr className="text-left">
                  <th className="p-1">Method</th>
                  <th className="p-1">Rows</th>
                </tr>
              </thead>
              <tbody>
                {eligibility.methodBreakdown.map((m) => (
                  <tr key={m.method} className="border-t">
                    <td className="p-1 font-mono">{m.method}</td>
                    <td className="p-1 font-mono">{m.count.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {eligibility.hasProvisions === 0 ? (
              <p className="text-xs text-muted-foreground">
                <strong>Why memo_eligible is 0:</strong> no rows have extracted statutory provisions yet.
                The recompute is working — it correctly evaluates every row to <code>false</code> because
                the extraction gate fails. Click <em>Run extraction</em> first, then re-run the recompute.
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">
                Recompute is current. <code>{eligibility.memoEligibleTrue.toLocaleString()}</code> row(s)
                currently satisfy all gates.
              </p>
            )}
          </section>
        )}


        <section className="mb-8 border rounded p-4">
          <h2 className="text-lg font-semibold mb-3">Running totals</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
            <Stat label="Processed rows" value={processedTotal} />
            <Stat label="Provisions (high conf.)" value={totals.statutory_provisions_high_confidence} />
            <Stat label="No pattern found" value={totals.statutory_provisions_no_pattern} />
            <Stat label="Disposition set" value={totals.disposition_set} />
            <Stat label="Appeal status set" value={totals.appeal_status_set} />
            <Stat label="Original amount set" value={totals.original_amount_set} />
            <Stat label="Case ref set" value={totals.case_reference_set} />
            <Stat label="Sector set" value={totals.sector_set} />
            <Stat label="Errors" value={totals.errors} />
          </div>
        </section>

        {coverage && (
          <section className="mb-8 border rounded p-4">
            <h2 className="text-lg font-semibold mb-2">Corpus coverage</h2>
            <p className="text-sm">
              {coverage.withProvisions.toLocaleString()} of {coverage.total.toLocaleString()} rows
              ({coverage.total ? Math.round((coverage.withProvisions / coverage.total) * 100) : 0}%)
              have candidate statutory provisions; {coverage.noPattern.toLocaleString()} rows have no
              pattern found.
            </p>
          </section>
        )}

        {batches.length > 0 && (
          <section className="mb-8 border rounded p-4 overflow-x-auto">
            <h2 className="text-lg font-semibold mb-3">Per-batch summary</h2>
            <table className="text-xs w-full min-w-[640px]">
              <thead>
                <tr className="text-left">
                  <th className="p-1">#</th>
                  <th className="p-1">Processed</th>
                  <th className="p-1">Prov. hi-conf</th>
                  <th className="p-1">No pattern</th>
                  <th className="p-1">Dispo</th>
                  <th className="p-1">Appeal</th>
                  <th className="p-1">Amount</th>
                  <th className="p-1">Case ref</th>
                  <th className="p-1">Sector</th>
                  <th className="p-1">Err</th>
                </tr>
              </thead>
              <tbody>
                {batches.map((b, i) => (
                  <tr key={i} className="border-t">
                    <td className="p-1">{i + 1}</td>
                    <td className="p-1">{b.processed}</td>
                    <td className="p-1">{b.extraction_summary.statutory_provisions_high_confidence}</td>
                    <td className="p-1">{b.extraction_summary.statutory_provisions_no_pattern}</td>
                    <td className="p-1">{b.extraction_summary.disposition_set}</td>
                    <td className="p-1">{b.extraction_summary.appeal_status_set}</td>
                    <td className="p-1">{b.extraction_summary.original_amount_set}</td>
                    <td className="p-1">{b.extraction_summary.case_reference_set}</td>
                    <td className="p-1">{b.extraction_summary.sector_set}</td>
                    <td className="p-1">{b.extraction_summary.errors}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )}

        <section className="mb-8 border rounded p-4 overflow-x-auto">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold">Recent extraction errors (last 50)</h2>
            <button onClick={loadErrors} className="text-xs underline">Refresh</button>
          </div>
          {errorRows.length === 0 ? (
            <p className="text-sm text-muted-foreground">No errors recorded.</p>
          ) : (
            <table className="text-xs w-full min-w-[640px]">
              <thead>
                <tr className="text-left">
                  <th className="p-1">When</th>
                  <th className="p-1">Action ID</th>
                  <th className="p-1">Stage</th>
                  <th className="p-1">Message</th>
                </tr>
              </thead>
              <tbody>
                {errorRows.map((r) => (
                  <tr key={r.id} className="border-t align-top">
                    <td className="p-1 whitespace-nowrap">{new Date(r.ran_at).toLocaleString()}</td>
                    <td className="p-1 font-mono">{r.enforcement_action_id?.slice(0, 8) ?? "—"}</td>
                    <td className="p-1">{r.stage}</td>
                    <td className="p-1">{r.error_message}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      </main>
      <Footer />
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded border p-3">
      <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="text-xl font-semibold">{value.toLocaleString()}</div>
    </div>
  );
}
