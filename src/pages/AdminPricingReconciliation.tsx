import { Helmet } from "react-helmet-async";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import report from "@/data/pricing-reconciliation.json";

interface Row {
  product: string;
  server_standalone: string;
  server_subscriber: string;
  ui_prices_seen: string[];
  standalone_match: boolean;
  subscriber_match: boolean;
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

  return (
    <>
      <Helmet>
        <title>Pricing Reconciliation — Admin</title>
        <meta name="robots" content="noindex,nofollow" />
      </Helmet>
      <Navbar />
      <main className="max-w-5xl mx-auto px-4 py-8">
        <header className="mb-6">
          <h1 className="text-2xl font-bold text-navy">Pricing Reconciliation</h1>
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
        </header>

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
          <p className="text-[13px] mt-1 text-slate-700">
            {allOk
              ? "Every charged amount lines up with at least one marketed price on the site."
              : "Some prices charged by the server do not appear anywhere in the marketed UI."}
          </p>
        </div>

        <section className="mb-8">
          <h2 className="text-lg font-semibold text-navy mb-3">
            Reconciliation table
          </h2>
          <div className="overflow-x-auto rounded-xl border border-fog">
            <table className="w-full text-[13px]">
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
                  return (
                    <tr
                      key={i}
                      className={`border-t border-fog ${
                        ok ? "" : "bg-red-50"
                      }`}
                    >
                      <td className="px-3 py-2 font-medium text-navy">
                        {r.product}
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
                        {ok ? "✅" : "❌"}
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
            <h2 className="text-lg font-semibold text-navy mb-3">
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
