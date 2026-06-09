import { useEffect, useState, useCallback } from "react";
import { Helmet } from "react-helmet-async";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import NavReportButton from "@/components/admin/NavReportButton";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { PRICING } from "@/config/pricing";

// v9 Prompt 4.4: Live reconciliation — compares `get-tool-price` server-side
// amounts against `PRICING.tools` client constants in real time. Replaces the
// stale `pricing-reconciliation.json` snapshot.

// Map UI tool key (PRICING.tools) → get-tool-price `tool_slug`.
// Subscriber-only / bundled tools without standalone Stripe products are
// excluded; tools that route through get-tool-price live here.
const TOOL_SLUG_MAP: Record<string, string> = {
  governance: "governance_assessment",
  lia: "li_assessment",
  dpia: "dpia_framework",
  dpa: "dpa_generator",
  ir_playbook: "ir_playbook",
  biometric: "biometric_checker",
  cppa_risk: "cppa_risk_assessment",
  cppa_cyber: "cppa_cybersecurity",
  cppa_suite: "cppa_suite",
};

interface LiveRow {
  product: string;
  ui_key: string;
  ui_standalone: string;
  server_standalone_cents: number | null;
  server_subscriber_cents: number | null;
  match: boolean;
  error?: string;
}

export default function AdminPricingReconciliation() {
  const [rows, setRows] = useState<LiveRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetchedAt, setFetchedAt] = useState<Date | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<string | null>(null);
  const [backfillRunning, setBackfillRunning] = useState(false);
  const [backfillResult, setBackfillResult] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const entries = Object.entries(TOOL_SLUG_MAP);
      const next: LiveRow[] = await Promise.all(
        entries.map(async ([uiKey, slug]) => {
          const uiTool = (PRICING.tools as any)[uiKey];
          const uiName = uiTool?.name ?? uiKey;
          const uiStandaloneCents = (uiTool?.dollars ?? 0) * 100;
          try {
            const res = await fetch(
              `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/get-tool-price?tool_slug=${encodeURIComponent(slug)}`,
              {
                headers: {
                  apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
                  Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
                },
              }
            );
            const json = await res.json();
            const serverStd = typeof json.standalone_amount_cents === "number"
              ? json.standalone_amount_cents
              : null;
            const serverSub = typeof json.subscriber_amount_cents === "number"
              ? json.subscriber_amount_cents
              : null;
            const match = serverStd !== null && serverStd === uiStandaloneCents;
            return {
              product: uiName,
              ui_key: uiKey,
              ui_standalone: uiTool?.display ?? `$${uiTool?.dollars ?? "?"}`,
              server_standalone_cents: serverStd,
              server_subscriber_cents: serverSub,
              match,
            };
          } catch (e: any) {
            return {
              product: uiName,
              ui_key: uiKey,
              ui_standalone: uiTool?.display ?? "—",
              server_standalone_cents: null,
              server_subscriber_cents: null,
              match: false,
              error: e?.message ?? String(e),
            };
          }
        })
      );
      setRows(next);
      setFetchedAt(new Date());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const findings = rows.filter((r) => !r.match);
  const allOk = !loading && rows.length > 0 && findings.length === 0;

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

  const fmt = (cents: number | null) =>
    cents === null ? "—" : `$${(cents / 100).toFixed(2)}`;

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
            <h1 className="text-brand-navy">Pricing Reconciliation</h1>
            <p className="text-sm text-slate mt-1">
              Compares live <code className="bg-brand-cloud px-1.5 py-0.5 rounded text-[12px]">get-tool-price</code> amounts
              against <code className="bg-brand-cloud px-1.5 py-0.5 rounded text-[12px]">PRICING.tools</code> in real time.
            </p>
            <p className="text-[12px] text-slate mt-2">
              {fetchedAt
                ? <>Fetched {fetchedAt.toLocaleString()} · {rows.length} products checked</>
                : "Fetching…"}
            </p>
          </div>
          <div className="flex flex-col gap-2 items-end">
            <NavReportButton />
            <Button onClick={refresh} disabled={loading} variant="outline" size="sm">
              {loading ? "Refreshing…" : "Refresh"}
            </Button>
          </div>
        </header>

        <div className="rounded-xl border border-brand-cloud bg-card p-4 mb-6 flex items-start justify-between gap-4">
          <div>
            <h3 className="text-brand-navy">Sync All Stripe Prices</h3>
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
          <pre className="rounded-xl border border-brand-cloud bg-brand-cloud/30 p-3 mb-6 text-[11px] overflow-x-auto whitespace-pre-wrap">
            {syncResult}
          </pre>
        )}

        <div className="rounded-xl border border-brand-cloud bg-card p-4 mb-6 flex items-start justify-between gap-4">
          <div>
            <h3 className="text-brand-navy">Run Enrichment Backfill</h3>
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
            loading
              ? "border-slate-200 bg-slate-50"
              : allOk
                ? "border-emerald-200 bg-emerald-50"
                : "border-red-200 bg-red-50"
          }`}
        >
          <div className="text-2xl font-bold">
            {loading
              ? "Checking live prices…"
              : allOk
                ? "✅ All prices match"
                : `❌ ${findings.length} mismatch(es)`}
          </div>
          <p className="text-sm mt-1 text-slate-700">
            {allOk
              ? "Every server-charged amount lines up with the UI constant."
              : "Some prices charged by the server differ from PRICING.tools."}
          </p>
        </div>

        <section className="mb-8">
          <h2 className="text-brand-navy mb-3">Live comparison</h2>
          <div className="overflow-x-auto rounded-xl border border-brand-cloud">
            <table className="w-full text-sm">
              <thead className="bg-brand-cloud text-brand-navy">
                <tr>
                  <th className="text-left px-3 py-2">Product</th>
                  <th className="text-left px-3 py-2">UI (PRICING.tools)</th>
                  <th className="text-left px-3 py-2">Server standalone</th>
                  <th className="text-left px-3 py-2">Server subscriber</th>
                  <th className="text-center px-3 py-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr
                    key={r.ui_key}
                    className={`border-t border-brand-cloud ${
                      !r.match ? "bg-red-50" : ""
                    }`}
                  >
                    <td className="px-3 py-2 font-medium text-brand-navy">
                      {r.product}
                      <div className="text-[11px] text-slate font-mono">{r.ui_key}</div>
                    </td>
                    <td className="px-3 py-2 font-mono">{r.ui_standalone}</td>
                    <td className="px-3 py-2 font-mono">{fmt(r.server_standalone_cents)}</td>
                    <td className="px-3 py-2 font-mono">{fmt(r.server_subscriber_cents)}</td>
                    <td className="px-3 py-2 text-center">
                      {r.error ? "⚠️" : r.match ? "✅" : "❌"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {findings.length > 0 && (
          <section className="mb-8">
            <h2 className="text-brand-navy mb-3">Mismatches ({findings.length})</h2>
            <div className="space-y-3">
              {findings.map((r) => (
                <article
                  key={r.ui_key}
                  className="rounded-xl border border-red-200 bg-red-50 p-4"
                >
                  <div className="font-semibold text-brand-navy mb-1">{r.product}</div>
                  <p className="text-[14px] text-red-800">
                    {r.error
                      ? `Could not fetch live price: ${r.error}`
                      : `UI is ${r.ui_standalone} but server charges ${fmt(r.server_standalone_cents)} standalone.`}
                  </p>
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
