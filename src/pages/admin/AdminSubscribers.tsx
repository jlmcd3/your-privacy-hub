import { useEffect, useMemo, useState } from "react";
import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { X } from "lucide-react";

interface SubscriberRow {
  id: string;
  email: string | null;
  subscription_tier: string | null;
  subscription_type: string | null;
  subscription_interval: string | null;
  subscription_plan: string | null;
  subscription_end_date: string | null;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  founding_subscriber: boolean | null;
  founding_subscriber_set_at: string | null;
  is_premium: boolean | null;
  is_pro: boolean | null;
  professional_annual: boolean | null;
  created_at: string;
  auth_created_at: string | null;
}

function formatTime(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function csvEscape(value: unknown): string {
  if (value === null || value === undefined) return "";
  const s = String(value);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export default function AdminSubscribers() {
  const [rows, setRows] = useState<SubscriberRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tierFilter, setTierFilter] = useState<string>("all");
  const [search, setSearch] = useState<string>("");

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError(null);
      const { data, error } = await supabase.functions.invoke(
        "admin-list-subscribers",
        { body: {} },
      );
      if (error) setError(error.message);
      else if (data?.error) setError(data.error);
      else setRows((data?.rows as SubscriberRow[]) ?? []);
      setLoading(false);
    })();
  }, []);

  const tiers = useMemo(() => {
    const set = new Set<string>();
    for (const r of rows) if (r.subscription_tier) set.add(r.subscription_tier);
    return Array.from(set).sort();
  }, [rows]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (tierFilter !== "all" && r.subscription_tier !== tierFilter) return false;
      if (q && !(r.email ?? "").toLowerCase().includes(q)) return false;
      return true;
    });
  }, [rows, tierFilter, search]);

  const tierCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const r of rows) {
      const t = r.subscription_tier ?? "unknown";
      counts[t] = (counts[t] ?? 0) + 1;
    }
    return counts;
  }, [rows]);

  const exportCsv = () => {
    const header = [
      "email",
      "subscription_tier",
      "subscription_type",
      "subscription_interval",
      "subscription_plan",
      "founding_subscriber",
      "subscription_end_date",
      "stripe_customer_id",
      "stripe_subscription_id",
      "created_at",
    ];
    const lines = [header.join(",")];
    for (const r of filtered) {
      lines.push(
        [
          csvEscape(r.email ?? ""),
          csvEscape(r.subscription_tier ?? ""),
          csvEscape(r.subscription_type ?? ""),
          csvEscape(r.subscription_interval ?? ""),
          csvEscape(r.subscription_plan ?? ""),
          csvEscape(r.founding_subscriber ? "true" : "false"),
          csvEscape(r.subscription_end_date ?? ""),
          csvEscape(r.stripe_customer_id ?? ""),
          csvEscape(r.stripe_subscription_id ?? ""),
          csvEscape(r.created_at),
        ].join(","),
      );
    }
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const stamp = new Date().toISOString().slice(0, 10);
    a.href = url;
    a.download = `subscribers-${stamp}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-brand-cloud">
      <Helmet>
        <title>Subscribers — Admin</title>
      </Helmet>
      <Navbar />
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="font-display text-brand-navy">Subscribers</h1>
            <p className="text-sm text-slate mt-1">
              {loading
                ? "Loading…"
                : `Showing ${filtered.length} of ${rows.length} paid subscribers`}
            </p>
          </div>
          <Link to="/admin/sample-reports" className="text-sm text-brand-teal-text hover:underline">
            ← Admin home
          </Link>
        </div>

        {/* Totals */}
        {!loading && rows.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
            <div className="bg-card border border-brand-cloud rounded-xl p-4">
              <div className="text-[11px] uppercase tracking-wide text-slate">
                Total paid
              </div>
              <div className="text-2xl font-display text-brand-navy mt-1">
                {rows.length}
              </div>
            </div>
            {Object.entries(tierCounts).map(([tier, n]) => (
              <div
                key={tier}
                className="bg-card border border-brand-cloud rounded-xl p-4"
              >
                <div className="text-[11px] uppercase tracking-wide text-slate">
                  {tier}
                </div>
                <div className="text-2xl font-display text-brand-navy mt-1">
                  {n}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Filters */}
        <div className="bg-card border border-brand-cloud rounded-xl p-4 mb-4 grid grid-cols-1 md:grid-cols-4 gap-3">
          <div>
            <label className="block text-[11px] font-semibold text-slate mb-1 uppercase tracking-wide">
              Tier
            </label>
            <select
              value={tierFilter}
              onChange={(e) => setTierFilter(e.target.value)}
              className="w-full text-sm border border-brand-cloud rounded-lg px-2 py-2 bg-background"
            >
              <option value="all">All tiers</option>
              {tiers.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
          <div className="md:col-span-2">
            <label className="block text-[11px] font-semibold text-slate mb-1 uppercase tracking-wide">
              Search email
            </label>
            <div className="relative">
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="contains…"
                className="w-full text-sm border border-brand-cloud rounded-lg px-2 pr-8 py-2 bg-background"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  aria-label="Clear search"
                  className="absolute right-1 top-1/2 -translate-y-1/2 p-1 rounded text-slate hover:text-brand-navy hover:bg-brand-cloud transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
          <div className="flex items-end">
            <button
              onClick={exportCsv}
              disabled={filtered.length === 0}
              className="w-full text-sm px-3 py-2 rounded-lg bg-brand-navy text-white font-medium hover:bg-brand-teal-deep disabled:opacity-50"
            >
              Export CSV
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="bg-card border border-brand-cloud rounded-xl overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-sm text-slate">Loading subscribers…</div>
          ) : error ? (
            <div className="p-8 text-center text-sm text-destructive">{error}</div>
          ) : filtered.length === 0 ? (
            <div className="p-8 text-center text-sm text-slate">
              No subscribers match these filters.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-brand-cloud">
                  <tr className="text-left text-[11px] uppercase tracking-wide text-slate">
                    <th className="px-4 py-2 font-semibold">Email</th>
                    <th className="px-4 py-2 font-semibold">Tier</th>
                    <th className="px-4 py-2 font-semibold">Type</th>
                    <th className="px-4 py-2 font-semibold">Interval</th>
                    <th className="px-4 py-2 font-semibold">Founding</th>
                    <th className="px-4 py-2 font-semibold">Renews / Ends</th>
                    <th className="px-4 py-2 font-semibold">Started</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-brand-cloud">
                  {filtered.map((r) => (
                    <tr key={r.id} className="hover:bg-slate-50/50">
                      <td className="px-4 py-2 text-brand-navy font-mono text-[12px]">
                        {r.email ?? "—"}
                      </td>
                      <td className="px-4 py-2">
                        <span className="text-[11px] px-2 py-0.5 rounded bg-brand-teal/10 text-brand-teal-text font-medium">
                          {r.subscription_tier ?? "—"}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-slate">
                        {r.subscription_type ?? "—"}
                      </td>
                      <td className="px-4 py-2 text-slate">
                        {r.subscription_interval ?? "—"}
                      </td>
                      <td className="px-4 py-2">
                        {r.founding_subscriber ? (
                          <span className="text-[11px] px-2 py-0.5 rounded bg-amber-100 text-amber-700">
                            Founding
                          </span>
                        ) : (
                          <span className="text-slate">—</span>
                        )}
                      </td>
                      <td className="px-4 py-2 text-slate text-[12px]">
                        {formatTime(r.subscription_end_date)}
                      </td>
                      <td className="px-4 py-2 text-slate text-[12px]">
                        {formatTime(r.auth_created_at ?? r.created_at)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
