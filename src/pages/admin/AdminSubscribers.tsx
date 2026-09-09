// /admin/subscribers — trials and paying members in one place.
import { useMemo, useState } from "react";
import { Helmet } from "react-helmet-async";
import { Link, useSearchParams } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import {
  useAdminPeople,
  formatDate,
  downloadCsv,
  STATUS_LABEL,
  type PersonStatus,
} from "@/hooks/useAdminPeople";

const PAID_STATUSES: PersonStatus[] = [
  "trialing",
  "subscriber",
  "cancelling",
  "past_due",
  "cancelled",
];

function daysUntil(iso: string | null): number | null {
  if (!iso) return null;
  return Math.ceil((new Date(iso).getTime() - Date.now()) / 86400000);
}

export default function AdminSubscribers() {
  const { rows, loading, error } = useAdminPeople();
  const [params, setParams] = useSearchParams();
  const status = (params.get("status") as PersonStatus | null) ?? "all";
  const [search, setSearch] = useState("");

  const paid = useMemo(
    () => rows.filter((r) => PAID_STATUSES.includes(r.status) || r.first_subscribed_at),
    [rows],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return paid
      .filter((r) => status === "all" || r.status === status)
      .filter((r) => !q || (r.email ?? "").toLowerCase().includes(q))
      .sort((a, b) => (b.first_subscribed_at ?? "").localeCompare(a.first_subscribed_at ?? ""));
  }, [paid, status, search]);

  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const r of paid) c[r.status] = (c[r.status] ?? 0) + 1;
    return c;
  }, [paid]);

  const setStatus = (s: string) => {
    if (s === "all") params.delete("status");
    else params.set("status", s);
    setParams(params, { replace: true });
  };

  const exportCsv = () =>
    downloadCsv(
      `subscribers-${new Date().toISOString().slice(0, 10)}.csv`,
      ["email", "status", "plan", "interval", "trial_end", "subscribed_at", "cancelled_at", "renews_ends"],
      filtered.map((r) => [
        r.email ?? "",
        STATUS_LABEL[r.status],
        r.subscription_type ?? "",
        r.subscription_interval ?? "",
        r.trial_end ?? "",
        r.first_subscribed_at ?? "",
        r.cancelled_at ?? "",
        r.subscription_end_date ?? "",
      ]),
    );

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Trials &amp; Subscribers — Admin</title>
      </Helmet>
      <Navbar />
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="font-serif text-3xl">Trials &amp; subscribers</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {loading
                ? "Loading…"
                : `Showing ${filtered.length} of ${paid.length} accounts that have started a trial or paid`}
            </p>
          </div>
          <Link to="/admin" className="text-sm text-primary hover:underline">
            ← Master Console
          </Link>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4">
          {PAID_STATUSES.map((s) => (
            <div key={s} className="rounded-lg border bg-card p-3">
              <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
                {STATUS_LABEL[s]}
              </div>
              <div className="text-xl font-semibold">{loading ? "…" : counts[s] ?? 0}</div>
            </div>
          ))}
        </div>

        <div className="rounded-lg border bg-card p-4 mb-4 grid gap-3 md:grid-cols-3">
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="text-sm border rounded-lg px-2 py-2 bg-background"
          >
            <option value="all">All statuses</option>
            {PAID_STATUSES.map((s) => (
              <option key={s} value={s}>
                {STATUS_LABEL[s]}
              </option>
            ))}
          </select>
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search email…"
            className="text-sm border rounded-lg px-2 py-2 bg-background"
          />
          <button
            onClick={exportCsv}
            disabled={!filtered.length}
            className="text-sm px-3 py-2 rounded-lg bg-primary text-primary-foreground font-medium disabled:opacity-50"
          >
            Export CSV
          </button>
        </div>

        <div className="rounded-lg border bg-card overflow-hidden">
          {loading ? (
            <p className="p-8 text-center text-sm text-muted-foreground">Loading…</p>
          ) : error ? (
            <p className="p-8 text-center text-sm text-destructive">{error}</p>
          ) : filtered.length === 0 ? (
            <p className="p-8 text-center text-sm text-muted-foreground">
              No accounts match these filters.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium">Email</th>
                    <th className="px-3 py-2 text-left font-medium">Status</th>
                    <th className="px-3 py-2 text-left font-medium">Plan</th>
                    <th className="px-3 py-2 text-left font-medium">Trial ends</th>
                    <th className="px-3 py-2 text-left font-medium">Subscribed</th>
                    <th className="px-3 py-2 text-left font-medium">Cancelled</th>
                    <th className="px-3 py-2 text-left font-medium">Renews / ends</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((r) => {
                    const d = daysUntil(r.trial_end);
                    return (
                      <tr key={r.user_id} className="border-t">
                        <td className="px-3 py-2 font-mono text-[12px]">{r.email ?? "—"}</td>
                        <td className="px-3 py-2">{STATUS_LABEL[r.status]}</td>
                        <td className="px-3 py-2 text-muted-foreground">
                          {r.subscription_type ?? "—"}
                          {r.subscription_interval ? ` · ${r.subscription_interval}` : ""}
                        </td>
                        <td className="px-3 py-2 text-muted-foreground">
                          {formatDate(r.trial_end)}
                          {r.status === "trialing" && d !== null ? ` (${d}d)` : ""}
                        </td>
                        <td className="px-3 py-2 text-muted-foreground">
                          {formatDate(r.first_subscribed_at)}
                        </td>
                        <td className="px-3 py-2 text-muted-foreground">
                          {formatDate(r.cancelled_at)}
                        </td>
                        <td className="px-3 py-2 text-muted-foreground">
                          {formatDate(r.subscription_end_date)}
                        </td>
                      </tr>
                    );
                  })}
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
