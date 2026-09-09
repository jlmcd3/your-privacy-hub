// /admin/people — master list of every account, sortable and exportable.
import { useMemo, useState } from "react";
import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import AdminOnly from "@/components/AdminOnly";
import NotFound from "@/pages/NotFound";
import {
  useAdminPeople,
  useBannedUsers,
  closeAccount,
  reopenAccount,
  formatDate,
  downloadCsv,
  STATUS_LABEL,
  type PersonRow,
  type PersonStatus,
} from "@/hooks/useAdminPeople";
import { toast } from "@/hooks/use-toast";

type SortKey =
  | "email"
  | "status"
  | "registered_at"
  | "first_subscribed_at"
  | "cancelled_at"
  | "terminated_at";

const COLUMNS: Array<{ key: SortKey; label: string }> = [
  { key: "email", label: "Email" },
  { key: "status", label: "Type" },
  { key: "registered_at", label: "Registered" },
  { key: "first_subscribed_at", label: "Subscribed" },
  { key: "cancelled_at", label: "Cancelled" },
  { key: "terminated_at", label: "Terminated" },
];

function value(row: PersonRow, key: SortKey): string {
  return (row[key] as string | null) ?? "";
}

function PeopleInner() {
  const { rows, loading, error } = useAdminPeople();
  const [statusFilter, setStatusFilter] = useState<"all" | PersonStatus>("all");
  const [search, setSearch] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("registered_at");
  const [asc, setAsc] = useState(false);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const out = rows.filter((r) => {
      if (statusFilter !== "all" && r.status !== statusFilter) return false;
      if (q && !(r.email ?? "").toLowerCase().includes(q)) return false;
      if (from && (!r.registered_at || r.registered_at < from)) return false;
      if (to && (!r.registered_at || r.registered_at > `${to}T23:59:59Z`)) return false;
      return true;
    });
    out.sort((a, b) => {
      const av = value(a, sortKey).toLowerCase();
      const bv = value(b, sortKey).toLowerCase();
      if (av === bv) return 0;
      if (!av) return 1;
      if (!bv) return -1;
      return asc ? (av < bv ? -1 : 1) : av < bv ? 1 : -1;
    });
    return out;
  }, [rows, statusFilter, search, from, to, sortKey, asc]);

  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const r of rows) c[r.status] = (c[r.status] ?? 0) + 1;
    return c;
  }, [rows]);

  const toggleSort = (key: SortKey) => {
    if (key === sortKey) setAsc((v) => !v);
    else {
      setSortKey(key);
      setAsc(key === "email");
    }
  };

  const exportAll = () =>
    downloadCsv(
      `people-${new Date().toISOString().slice(0, 10)}.csv`,
      ["email", "type", "registered_at", "subscribed_at", "cancelled_at", "terminated_at", "plan"],
      filtered.map((r) => [
        r.email ?? "",
        STATUS_LABEL[r.status],
        r.registered_at ?? "",
        r.first_subscribed_at ?? "",
        r.cancelled_at ?? "",
        r.terminated_at ?? "",
        r.subscription_type ?? "",
      ]),
    );

  const exportCampaign = () => {
    const targets = filtered.filter(
      (r) => r.email && !r.marketing_opt_out && !r.terminated_at,
    );
    downloadCsv(
      `campaign-emails-${new Date().toISOString().slice(0, 10)}.csv`,
      ["email", "type"],
      targets.map((r) => [r.email, STATUS_LABEL[r.status]]),
    );
  };

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>All People — Admin</title>
      </Helmet>
      <Navbar />
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="font-serif text-3xl">All people</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {loading ? "Loading…" : `Showing ${filtered.length} of ${rows.length} accounts`}
            </p>
          </div>
          <Link to="/admin" className="text-sm text-primary hover:underline">
            ← Master Console
          </Link>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3 mb-4">
          {(Object.keys(STATUS_LABEL) as PersonStatus[]).map((s) => (
            <div key={s} className="rounded-lg border bg-card p-3">
              <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
                {STATUS_LABEL[s]}
              </div>
              <div className="text-xl font-semibold">{loading ? "…" : counts[s] ?? 0}</div>
            </div>
          ))}
        </div>

        <div className="rounded-lg border bg-card p-4 mb-4 grid gap-3 md:grid-cols-5">
          <div>
            <label className="block text-[11px] uppercase tracking-wide text-muted-foreground mb-1">
              Type
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as "all" | PersonStatus)}
              className="w-full text-sm border rounded-lg px-2 py-2 bg-background"
            >
              <option value="all">All types</option>
              {(Object.keys(STATUS_LABEL) as PersonStatus[]).map((s) => (
                <option key={s} value={s}>
                  {STATUS_LABEL[s]}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-[11px] uppercase tracking-wide text-muted-foreground mb-1">
              Email contains
            </label>
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full text-sm border rounded-lg px-2 py-2 bg-background"
            />
          </div>
          <div>
            <label className="block text-[11px] uppercase tracking-wide text-muted-foreground mb-1">
              Registered from
            </label>
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="w-full text-sm border rounded-lg px-2 py-2 bg-background"
            />
          </div>
          <div>
            <label className="block text-[11px] uppercase tracking-wide text-muted-foreground mb-1">
              Registered to
            </label>
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="w-full text-sm border rounded-lg px-2 py-2 bg-background"
            />
          </div>
          <div className="flex items-end gap-2">
            <button
              onClick={exportAll}
              disabled={!filtered.length}
              className="flex-1 text-sm px-3 py-2 rounded-lg border font-medium disabled:opacity-50"
            >
              Export CSV
            </button>
            <button
              onClick={exportCampaign}
              disabled={!filtered.length}
              className="flex-1 text-sm px-3 py-2 rounded-lg bg-primary text-primary-foreground font-medium disabled:opacity-50"
            >
              Campaign list
            </button>
          </div>
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
                    {COLUMNS.map((c) => (
                      <th key={c.key} className="px-3 py-2 text-left font-medium">
                        <button onClick={() => toggleSort(c.key)} className="hover:underline">
                          {c.label}
                          {sortKey === c.key ? (asc ? " ▲" : " ▼") : ""}
                        </button>
                      </th>
                    ))}
                    <th className="px-3 py-2 text-left font-medium">Plan</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((r) => (
                    <tr key={r.user_id} className="border-t">
                      <td className="px-3 py-2 font-mono text-[12px]">{r.email ?? "—"}</td>
                      <td className="px-3 py-2">{STATUS_LABEL[r.status]}</td>
                      <td className="px-3 py-2 text-muted-foreground">{formatDate(r.registered_at)}</td>
                      <td className="px-3 py-2 text-muted-foreground">{formatDate(r.first_subscribed_at)}</td>
                      <td className="px-3 py-2 text-muted-foreground">{formatDate(r.cancelled_at)}</td>
                      <td className="px-3 py-2 text-muted-foreground">{formatDate(r.terminated_at)}</td>
                      <td className="px-3 py-2 text-muted-foreground">{r.subscription_type ?? "—"}</td>
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

export default function AdminPeople() {
  return (
    <AdminOnly fallback={<NotFound />}>
      <PeopleInner />
    </AdminOnly>
  );
}
