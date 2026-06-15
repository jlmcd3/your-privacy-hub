import { useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import BackLink from "@/components/dashboard/BackLink";
import { supabase } from "@/integrations/supabase/client";

type Row = {
  id: string;
  user_id: string | null;
  module: string;
  status: string;
  created_at: string;
  report_data: any;
};

/**
 * Sprint 7 — Admin CPPA runs dashboard. Mirrors /admin/trial-users styling.
 * Counts by module + tier, plus a recent list. Read-only.
 */
export default function AdminCPPARuns() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("cppa_assessments")
        .select("id,user_id,module,status,created_at,report_data")
        .order("created_at", { ascending: false })
        .limit(500);
      if (cancelled) return;
      setRows((data ?? []) as Row[]);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const byModule = rows.reduce<Record<string, number>>((acc, r) => {
    acc[r.module] = (acc[r.module] ?? 0) + 1;
    return acc;
  }, {});

  const tierOf = (r: Row): string => {
    const rd = r.report_data || {};
    if (r.module === "admt") return rd.overall_status || "—";
    if (r.module === "cybersecurity") return rd.readiness_level || "—";
    if (r.module === "risk_assessment") return rd.risk_level || rd.overall_risk || rd.risk_tier || "—";
    return "—";
  };
  const byTier = rows.reduce<Record<string, number>>((acc, r) => {
    const t = String(tierOf(r) || "—");
    acc[t] = (acc[t] ?? 0) + 1;
    return acc;
  }, {});

  const complete = rows.filter((r) => r.status === "complete").length;
  const errors = rows.filter((r) => r.status === "error").length;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Helmet><title>Admin · CPPA Runs | End User Privacy</title></Helmet>
      <Navbar />
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-6">
        <BackLink to="/admin/sample-reports" label="Back to admin" />
        <h1 className="font-serif text-3xl">CPPA Runs</h1>

        {loading ? <p>Loading…</p> : (
          <>
            <section className="grid sm:grid-cols-4 gap-4">
              <StatCard label="Total runs" value={rows.length} />
              <StatCard label="Complete" value={complete} />
              <StatCard label="Errored" value={errors} />
              <StatCard label="Distinct users" value={new Set(rows.map((r) => r.user_id).filter(Boolean)).size} />
            </section>

            <section className="grid md:grid-cols-2 gap-6">
              <BreakdownTable title="By module" data={byModule} />
              <BreakdownTable title="By tier (latest)" data={byTier} />
            </section>

            <section className="bg-card border rounded-lg p-6">
              <h2 className="font-serif text-xl mb-4">Recent 50</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="text-left bg-muted/40">
                    <tr>
                      <th className="p-2">Created</th>
                      <th className="p-2">Module</th>
                      <th className="p-2">Status</th>
                      <th className="p-2">Tier</th>
                      <th className="p-2">User</th>
                      <th className="p-2">ID</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.slice(0, 50).map((r) => (
                      <tr key={r.id} className="border-t">
                        <td className="p-2 whitespace-nowrap">{new Date(r.created_at).toLocaleString()}</td>
                        <td className="p-2">{r.module}</td>
                        <td className="p-2">{r.status}</td>
                        <td className="p-2">{tierOf(r)}</td>
                        <td className="p-2 font-mono text-[10px]">{r.user_id?.slice(0, 8) ?? "—"}</td>
                        <td className="p-2 font-mono text-[10px]">
                          <Link to={r.module === "admt" ? `/cppa-admt-checker/result/${r.id}` : r.module === "cybersecurity" ? `/cppa-cybersecurity/result/${r.id}` : `/cppa-risk-assessment/result/${r.id}`} className="text-brand-teal hover:underline">
                            {r.id.slice(0, 8)}
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        )}
      </main>
      <Footer />
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-card border rounded-lg p-4">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="font-serif text-3xl mt-1">{value}</p>
    </div>
  );
}

function BreakdownTable({ title, data }: { title: string; data: Record<string, number> }) {
  const entries = Object.entries(data).sort((a, b) => b[1] - a[1]);
  return (
    <div className="bg-card border rounded-lg p-6">
      <h2 className="font-serif text-xl mb-3">{title}</h2>
      <table className="w-full text-sm">
        <tbody>
          {entries.map(([k, v]) => (
            <tr key={k} className="border-t first:border-t-0">
              <td className="py-1.5">{k}</td>
              <td className="py-1.5 text-right font-mono">{v}</td>
            </tr>
          ))}
          {entries.length === 0 && <tr><td className="py-1.5 text-muted-foreground">No data</td></tr>}
        </tbody>
      </table>
    </div>
  );
}
