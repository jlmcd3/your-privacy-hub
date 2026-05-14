import { useEffect, useMemo, useState } from "react";
import { Helmet } from "react-helmet-async";
import { Link, Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

interface SignupRow {
  id: string;
  email: string;
  source: string | null;
  confirmed: boolean | null;
  subscribed_at: string | null;
  unsubscribed_at: string | null;
  created_at: string;
}

function formatTime(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    year: "numeric", month: "short", day: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

function csvEscape(value: unknown): string {
  if (value === null || value === undefined) return "";
  const s = String(value);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export default function AdminEmailSignups() {
  const { user, loading: authLoading } = useAuth();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [rows, setRows] = useState<SignupRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // filters
  const [sourceFilter, setSourceFilter] = useState<string>("all");
  const [fromDate, setFromDate] = useState<string>("");
  const [toDate, setToDate] = useState<string>("");
  const [search, setSearch] = useState<string>("");

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

  useEffect(() => {
    if (!isAdmin) return;
    setLoading(true);
    setError(null);
    supabase
      .from("email_signups")
      .select("id,email,source,confirmed,subscribed_at,unsubscribed_at,created_at")
      .order("created_at", { ascending: false })
      .limit(1000)
      .then(({ data, error }) => {
        if (error) setError(error.message);
        else setRows((data as SignupRow[]) ?? []);
        setLoading(false);
      });
  }, [isAdmin]);

  const sources = useMemo(() => {
    const set = new Set<string>();
    for (const r of rows) if (r.source) set.add(r.source);
    return Array.from(set).sort();
  }, [rows]);

  const filtered = useMemo(() => {
    const fromTs = fromDate ? new Date(fromDate + "T00:00:00").getTime() : null;
    const toTs = toDate ? new Date(toDate + "T23:59:59.999").getTime() : null;
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (sourceFilter !== "all") {
        if (sourceFilter === "__none__" ? r.source : r.source !== sourceFilter) return false;
      }
      const ts = new Date(r.created_at).getTime();
      if (fromTs !== null && ts < fromTs) return false;
      if (toTs !== null && ts > toTs) return false;
      if (q && !r.email.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [rows, sourceFilter, fromDate, toDate, search]);

  const exportCsv = () => {
    const header = ["email", "source", "confirmed", "subscribed_at", "unsubscribed_at", "created_at"];
    const lines = [header.join(",")];
    for (const r of filtered) {
      lines.push([
        csvEscape(r.email),
        csvEscape(r.source ?? ""),
        csvEscape(r.confirmed ? "true" : "false"),
        csvEscape(r.subscribed_at ?? ""),
        csvEscape(r.unsubscribed_at ?? ""),
        csvEscape(r.created_at),
      ].join(","));
    }
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const stamp = new Date().toISOString().slice(0, 10);
    a.href = url;
    a.download = `email-signups-${stamp}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const resetFilters = () => {
    setSourceFilter("all");
    setFromDate("");
    setToDate("");
    setSearch("");
  };

  if (authLoading || isAdmin === null) {
    return (
      <div className="min-h-screen bg-paper">
        <Navbar />
        <div className="max-w-6xl mx-auto px-4 py-16 text-center text-sm text-slate">Loading…</div>
        <Footer />
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  if (!isAdmin) return <Navigate to="/" replace />;

  return (
    <div className="min-h-screen bg-paper">
      <Helmet><title>Email Signups — Admin</title></Helmet>
      <Navbar />
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="font-display text-2xl text-navy">Email signups</h1>
            <p className="text-sm text-slate mt-1">
              Showing {filtered.length} of {rows.length} {rows.length === 1000 ? "(capped at 1000)" : ""}
            </p>
          </div>
          <Link to="/admin/ingestion" className="text-sm text-sky-700 hover:underline">← Admin home</Link>
        </div>

        {/* Filters */}
        <div className="bg-card border border-fog rounded-xl p-4 mb-4 grid grid-cols-1 md:grid-cols-5 gap-3">
          <div>
            <label className="block text-[11px] font-semibold text-slate mb-1 uppercase tracking-wide">Source</label>
            <select
              value={sourceFilter}
              onChange={(e) => setSourceFilter(e.target.value)}
              className="w-full text-sm border border-fog rounded-lg px-2 py-2 bg-background"
            >
              <option value="all">All sources</option>
              <option value="__none__">(no source)</option>
              {sources.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-slate mb-1 uppercase tracking-wide">From</label>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="w-full text-sm border border-fog rounded-lg px-2 py-2 bg-background"
            />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-slate mb-1 uppercase tracking-wide">To</label>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="w-full text-sm border border-fog rounded-lg px-2 py-2 bg-background"
            />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-slate mb-1 uppercase tracking-wide">Search email</label>
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="contains…"
              className="w-full text-sm border border-fog rounded-lg px-2 py-2 bg-background"
            />
          </div>
          <div className="flex items-end gap-2">
            <button
              onClick={resetFilters}
              className="text-sm px-3 py-2 rounded-lg border border-fog bg-background hover:bg-slate-50"
            >
              Reset
            </button>
            <button
              onClick={exportCsv}
              disabled={filtered.length === 0}
              className="flex-1 text-sm px-3 py-2 rounded-lg bg-navy text-white font-medium hover:bg-navy-mid disabled:opacity-50"
            >
              Export CSV
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="bg-card border border-fog rounded-xl overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-sm text-slate">Loading signups…</div>
          ) : error ? (
            <div className="p-8 text-center text-sm text-destructive">{error}</div>
          ) : filtered.length === 0 ? (
            <div className="p-8 text-center text-sm text-slate">No signups match these filters.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-fog">
                  <tr className="text-left text-[11px] uppercase tracking-wide text-slate">
                    <th className="px-4 py-2 font-semibold">Email</th>
                    <th className="px-4 py-2 font-semibold">Source</th>
                    <th className="px-4 py-2 font-semibold">Confirmed</th>
                    <th className="px-4 py-2 font-semibold">Created</th>
                    <th className="px-4 py-2 font-semibold">Unsubscribed</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-fog">
                  {filtered.map((r) => (
                    <tr key={r.id} className="hover:bg-slate-50/50">
                      <td className="px-4 py-2 text-navy font-mono text-[12px]">{r.email}</td>
                      <td className="px-4 py-2 text-slate">{r.source ?? "—"}</td>
                      <td className="px-4 py-2">
                        {r.confirmed ? (
                          <span className="text-[11px] px-2 py-0.5 rounded bg-emerald-100 text-emerald-700">Yes</span>
                        ) : (
                          <span className="text-[11px] px-2 py-0.5 rounded bg-amber-100 text-amber-700">Pending</span>
                        )}
                      </td>
                      <td className="px-4 py-2 text-slate text-[12px]">{formatTime(r.created_at)}</td>
                      <td className="px-4 py-2 text-slate text-[12px]">{formatTime(r.unsubscribed_at)}</td>
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
