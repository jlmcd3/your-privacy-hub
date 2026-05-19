import { useState } from "react";
import { Helmet } from "react-helmet-async";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import NavReportButton from "@/components/admin/NavReportButton";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import report from "@/data/pricing-reconciliation.json";

interface Row {
  product: string;
  server_standalone: string;
  server_subscriber: string;
  ui_prices_seen: string[];
  standalone_match: boolean;
  subscriber_match: boolean;
  unmigrated?: boolean;
}

interface Finding {
  severity: string;
  product: string;
  issue: string;
  ui_prices_seen: string[];
}

export default function AdminPricingReconciliation() {
  const rows = report.rows as Row[];
  const findings = report.findings as Finding[];
  const allOk = findings.length === 0;
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<string | null>(null);
  const [backfillRunning, setBackfillRunning] = useState(false);
  const [backfillResult, setBackfillResult] = useState<string | null>(null);

  const handleSync = async (environment: "sandbox" | "live") => {
    setSyncing(true);
    setSyncResult(null);
    try {
      const { data, error } = await supabase.functions.invoke("sync-pricing", {
        body: { environment },
      });
      if (error) throw error;
      setSyncResult(JSON.stringify(data, null, 2));
    } catch (e: any) {
      setSyncResult(`Error: ${e.message ?? String(e)}`);
    } finally {
      setSyncing(false);
    }
  };

  const handleBackfill = async () => {
    setBackfillRunning(true);
    setBackfillResult(null);
    try {
      const { data, error } = await supabase.functions.invoke("backfill-enrichment");
      if (error) throw error;
      setBackfillResult(
        `Backfill complete: ${data.succeeded} enriched, ${data.skipped} already done, ${data.failed} failed.`
      );
    } catch (e: any) {
      setBackfillResult(`Error: ${e.message ?? String(e)}`);
    } finally {
      setBackfillRunning(false);
    }
  };

  return (
    <>
      <Helmet>
        <title>Pricing Reconciliation — Admin</title>
        <meta name="robots" content="noindex,nofollow" />
      </Helmet>
      <Navbar />
      <main className="max-w-5xl mx-auto px-4 py-8">
        <header className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-navy">Pricing Reconciliation</h1>
            <p className="text-sm text-slate mt-1">
              Cross-references marketed prices in UI files against the amounts
              actually charged by Stripe edge functions. Re-run with{" "}
              <code className="bg-fog px-1.5 py-0.5 rounded text-[12px]">
                node scripts/scan-pricing.mjs
              </code>
              .
            </p>
            <p className="text-[12px] text-slate mt-2">
              Last run: {new Date(report.generatedAt).toLocaleString()} ·{" "}
              {report.summary.products_checked} products checked
            </p>
          </div>
          <NavReportButton />
        </header>

        <div className="rounded-xl border border-fog bg-card p-4 mb-6 flex items-start justify-between gap-4">
          <div>
            <h3 className="text-navy">Sync All Stripe Prices</h3>
            <p className="text-[12px] text-slate mt-1">
              Push every active entry in <code>PRICING_REGISTRY</code> to Stripe. Existing
              prices with the same lookup key are replaced; old prices are archived.
            </p>
          </div>
          <div className="shrink-0 flex gap-2">
            <Button onClick={() => handleSync("sandbox")} disabled={syncing} variant="outline">
              {syncing ? "Syncing…" : "Sync Sandbox"}
            </Button>
            <Button onClick={() => handleSync("live")} disabled={syncing}>
              {syncing ? "Syncing…" : "Sync Live"}
            </Button>
          </div>
        </div>

        {syncResult && (
          <pre className="rounded-xl border border-fog bg-fog/30 p-3 mb-6 text-[11px] overflow-x-auto whitespace-pre-wrap">
            {syncResult}
          </pre>
        )}

        <div className="rounded-xl border border-fog bg-card p-4 mb-6 flex items-start justify-between gap-4">
          <div>
            <h3 className="text-navy">Run Enrichment Backfill</h3>
            <p className="text-[12px] text-slate mt-1">
              Processes up to 20 Tier 1 articles missing contextual intelligence. Run multiple times to catch up.
            </p>
          </div>
          <div className="shrink-0">
            <Button onClick={handleBackfill} disabled={backfillRunning}>
              {backfillRunning ? "Running…" : "Run Enrichment Backfill"}
            </Button>
          </div>
        </div>

        {backfillResult && (
          <div
            className={`rounded-xl border p-3 mb-6 text-sm ${
              backfillResult.startsWith("Error:")
                ? "border-red-200 bg-red-50 text-red-900"
                : "border-emerald-200 bg-emerald-50 text-emerald-900"
            }`}
          >
            {backfillResult}
          </div>
        )}

        <div
          className={`rounded-xl border p-4 mb-6 ${
            allOk
              ? "border-emerald-200 bg-emerald-50"
              : "border-red-200 bg-red-50"
          }`}
        >
          <div className="text-2xl font-bold">
            {allOk ? "✅ All prices match" : `❌ ${findings.length} mismatch(es)`}
          </div>
          <p className="text-sm mt-1 text-slate-700">
            {allOk
              ? "Every charged amount lines up with at least one marketed price on the site."
              : "Some prices charged by the server do not appear anywhere in the marketed UI."}
          </p>
        </div>

        <section className="mb-8">
          <h2 className="text-navy mb-3">
            Reconciliation table
          </h2>
          <div className="overflow-x-auto rounded-xl border border-fog">
            <table className="w-full text-sm">
              <thead className="bg-fog text-navy">
                <tr>
                  <th className="text-left px-3 py-2">Product</th>
                  <th className="text-left px-3 py-2">Server (standalone)</th>
                  <th className="text-left px-3 py-2">Server (subscriber)</th>
                  <th className="text-left px-3 py-2">UI prices seen</th>
                  <th className="text-center px-3 py-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => {
                  const ok = r.standalone_match && r.subscriber_match;
                  const status = r.unmigrated ? "info" : ok ? "ok" : "fail";
                  return (
                    <tr
                      key={i}
                      className={`border-t border-fog ${
                        status === "fail" ? "bg-red-50" : ""
                      }`}
                    >
                      <td className="px-3 py-2 font-medium text-navy">
                        {r.product}
                        {r.unmigrated && (
                          <span className="ml-2 text-[11px] uppercase tracking-wider text-slate bg-fog px-1.5 py-0.5 rounded">
                            not in registry
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2 font-mono">
                        {r.server_standalone}
                      </td>
                      <td className="px-3 py-2 font-mono">
                        {r.server_subscriber}
                      </td>
                      <td className="px-3 py-2 text-slate">
                        {r.ui_prices_seen.join(", ") || "—"}
                      </td>
                      <td className="px-3 py-2 text-center">
                        {status === "ok" ? "✅" : status === "fail" ? "❌" : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        {findings.length > 0 && (
          <section className="mb-8">
            <h2 className="text-navy mb-3">
              Mismatches ({findings.length})
            </h2>
            <div className="space-y-3">
              {findings.map((f, i) => (
                <article
                  key={i}
                  className="rounded-xl border border-red-200 bg-red-50 p-4"
                >
                  <div className="text-[12px] font-mono uppercase tracking-wider text-red-700 mb-1">
                    {f.severity}
                  </div>
                  <div className="font-semibold text-navy mb-1">{f.product}</div>
                  <p className="text-[14px] text-red-800">{f.issue}</p>
                  {f.ui_prices_seen.length > 0 && (
                    <p className="text-[12px] text-slate mt-1">
                      UI prices seen: {f.ui_prices_seen.join(", ")}
                    </p>
                  )}
                </article>
              ))}
            </div>
          </section>
        )}
      </main>
      <Footer />
    </>
  );
}
