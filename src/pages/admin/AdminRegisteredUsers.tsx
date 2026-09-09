// /admin/registered-users — accounts that registered and are not paying.
import { useEffect, useMemo, useState } from "react";
import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import AdminOnly from "@/components/AdminOnly";
import NotFound from "@/pages/NotFound";
import { supabase } from "@/integrations/supabase/client";
import {
  useAdminPeople,
  formatDate,
  formatDateTime,
  downloadCsv,
  STATUS_LABEL,
} from "@/hooks/useAdminPeople";

interface PolicyDoc {
  id: string;
  kind: string;
  version: string;
}

interface LegacySignup {
  id: string;
  email: string;
  source: string | null;
  created_at: string;
  confirmed: boolean | null;
  unsubscribed_at: string | null;
}

function RegisteredInner() {
  const { rows, loading, error } = useAdminPeople();
  const [docs, setDocs] = useState<Record<string, PolicyDoc>>({});
  const [legacy, setLegacy] = useState<LegacySignup[]>([]);
  const [tab, setTab] = useState<"registered" | "legacy">("registered");
  const [search, setSearch] = useState("");

  useEffect(() => {
    (async () => {
      const [{ data: d }, { data: l }] = await Promise.all([
        (supabase as any).from("policy_documents").select("id, kind, version"),
        supabase
          .from("email_signups")
          .select("id, email, source, created_at, confirmed, unsubscribed_at")
          .order("created_at", { ascending: false }),
      ]);
      const map: Record<string, PolicyDoc> = {};
      for (const doc of (d as PolicyDoc[]) ?? []) map[doc.id] = doc;
      setDocs(map);
      setLegacy((l as LegacySignup[]) ?? []);
    })();
  }, []);

  const registered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows
      .filter((r) => r.status === "registered" || r.status === "cancelled")
      .filter((r) => !q || (r.email ?? "").toLowerCase().includes(q))
      .sort((a, b) => (b.registered_at ?? "").localeCompare(a.registered_at ?? ""));
  }, [rows, search]);

  const label = (id: string | null) => (id && docs[id] ? docs[id].version : "—");

  const exportCsv = () =>
    downloadCsv(
      `registered-users-${new Date().toISOString().slice(0, 10)}.csv`,
      ["email", "registered_at", "privacy_policy", "terms", "status", "subscribed_at", "terminated_at"],
      registered.map((r) => [
        r.email ?? "",
        r.registered_at ?? "",
        label(r.accepted_privacy_policy_id),
        label(r.accepted_terms_id),
        STATUS_LABEL[r.status],
        r.first_subscribed_at ?? "",
        r.terminated_at ?? "",
      ]),
    );

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Registered Users — Admin</title>
      </Helmet>
      <Navbar />
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="font-serif text-3xl">Registered Users</h1>
            <p className="text-sm text-muted-foreground mt-1">
              People with a free account who receive the weekly email. Paying members are on{" "}
              <Link to="/admin/subscribers" className="text-primary hover:underline">
                Trials &amp; Subscribers
              </Link>
              .
            </p>
          </div>
          <Link to="/admin" className="text-sm text-primary hover:underline">
            ← Master Console
          </Link>
        </div>

        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setTab("registered")}
            className={`text-sm px-3 py-1.5 rounded-lg border ${tab === "registered" ? "bg-primary text-primary-foreground" : ""}`}
          >
            Registered accounts ({registered.length})
          </button>
          <button
            onClick={() => setTab("legacy")}
            className={`text-sm px-3 py-1.5 rounded-lg border ${tab === "legacy" ? "bg-primary text-primary-foreground" : ""}`}
          >
            Legacy newsletter list ({legacy.length})
          </button>
        </div>

        {tab === "registered" ? (
          <>
            <div className="flex gap-3 mb-4">
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search email…"
                className="flex-1 text-sm border rounded-lg px-3 py-2 bg-background"
              />
              <button
                onClick={exportCsv}
                disabled={!registered.length}
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
              ) : registered.length === 0 ? (
                <p className="p-8 text-center text-sm text-muted-foreground">No registered users yet.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-muted text-muted-foreground">
                      <tr>
                        <th className="px-3 py-2 text-left font-medium">Email</th>
                        <th className="px-3 py-2 text-left font-medium">Registered</th>
                        <th className="px-3 py-2 text-left font-medium">Privacy Policy</th>
                        <th className="px-3 py-2 text-left font-medium">Terms</th>
                        <th className="px-3 py-2 text-left font-medium">Became subscriber</th>
                        <th className="px-3 py-2 text-left font-medium">Terminated</th>
                      </tr>
                    </thead>
                    <tbody>
                      {registered.map((r) => (
                        <tr key={r.user_id} className="border-t">
                          <td className="px-3 py-2 font-mono text-[12px]">{r.email ?? "—"}</td>
                          <td className="px-3 py-2 text-muted-foreground">
                            {formatDateTime(r.registered_at)}
                          </td>
                          <td className="px-3 py-2 text-muted-foreground">
                            {label(r.accepted_privacy_policy_id)}
                          </td>
                          <td className="px-3 py-2 text-muted-foreground">
                            {label(r.accepted_terms_id)}
                          </td>
                          <td className="px-3 py-2 text-muted-foreground">
                            {formatDate(r.first_subscribed_at)}
                          </td>
                          <td className="px-3 py-2 text-muted-foreground">
                            {formatDate(r.terminated_at)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="rounded-lg border bg-card overflow-hidden">
            {legacy.length === 0 ? (
              <p className="p-8 text-center text-sm text-muted-foreground">
                No historical newsletter sign-ups.
              </p>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-muted text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium">Email</th>
                    <th className="px-3 py-2 text-left font-medium">Source</th>
                    <th className="px-3 py-2 text-left font-medium">Joined</th>
                    <th className="px-3 py-2 text-left font-medium">Unsubscribed</th>
                  </tr>
                </thead>
                <tbody>
                  {legacy.map((s) => (
                    <tr key={s.id} className="border-t">
                      <td className="px-3 py-2 font-mono text-[12px]">{s.email}</td>
                      <td className="px-3 py-2 text-muted-foreground">{s.source ?? "—"}</td>
                      <td className="px-3 py-2 text-muted-foreground">{formatDate(s.created_at)}</td>
                      <td className="px-3 py-2 text-muted-foreground">
                        {formatDate(s.unsubscribed_at)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}

export default function AdminRegisteredUsers() {
  return (
    <AdminOnly fallback={<NotFound />}>
      <RegisteredInner />
    </AdminOnly>
  );
}
