// /admin/support — support contacts and their messages.
import { useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import AdminOnly from "@/components/AdminOnly";
import NotFound from "@/pages/NotFound";
import { supabase } from "@/integrations/supabase/client";
import { formatDateTime, downloadCsv } from "@/hooks/useAdminPeople";
import { useAuth } from "@/hooks/useAuth";

interface SupportRow {
  id: string;
  email: string;
  subject: string | null;
  body: string;
  channel: string;
  created_at: string;
  resolved_at: string | null;
}

function SupportInner() {
  const { user } = useAuth();
  const [rows, setRows] = useState<SupportRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState({ email: "", subject: "", body: "", channel: "email" });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const load = async () => {
    const { data } = await (supabase as any)
      .from("support_messages")
      .select("id, email, subject, body, channel, created_at, resolved_at")
      .order("created_at", { ascending: false });
    setRows((data as SupportRow[]) ?? []);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const add = async () => {
    setSaving(true);
    setMessage(null);
    const { error } = await (supabase as any).from("support_messages").insert({
      email: form.email.trim(),
      subject: form.subject || null,
      body: form.body,
      channel: form.channel,
    });
    setSaving(false);
    if (error) setMessage(error.message);
    else {
      setForm({ email: "", subject: "", body: "", channel: "email" });
      load();
    }
  };

  const toggleResolved = async (row: SupportRow) => {
    await (supabase as any)
      .from("support_messages")
      .update({
        resolved_at: row.resolved_at ? null : new Date().toISOString(),
        resolved_by: row.resolved_at ? null : user?.id ?? null,
      })
      .eq("id", row.id);
    load();
  };

  const filtered = rows.filter(
    (r) => !search.trim() || r.email.toLowerCase().includes(search.trim().toLowerCase()),
  );

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Support Log — Admin</title>
      </Helmet>
      <Navbar />
      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="font-serif text-3xl">Support log</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Everyone who has contacted support, with the questions they sent.
            </p>
          </div>
          <Link to="/admin" className="text-sm text-primary hover:underline">
            ← Master Console
          </Link>
        </div>

        <section className="rounded-lg border bg-card p-4 mb-6">
          <h2 className="font-medium mb-3">Log a support contact</h2>
          <div className="grid gap-3 md:grid-cols-3">
            <input
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="Email address"
              className="text-sm border rounded-lg px-2 py-2 bg-background"
            />
            <input
              value={form.subject}
              onChange={(e) => setForm({ ...form, subject: e.target.value })}
              placeholder="Subject"
              className="text-sm border rounded-lg px-2 py-2 bg-background"
            />
            <select
              value={form.channel}
              onChange={(e) => setForm({ ...form, channel: e.target.value })}
              className="text-sm border rounded-lg px-2 py-2 bg-background"
            >
              <option value="email">Email</option>
              <option value="form">Website form</option>
              <option value="phone">Phone</option>
              <option value="other">Other</option>
            </select>
          </div>
          <textarea
            value={form.body}
            onChange={(e) => setForm({ ...form, body: e.target.value })}
            rows={4}
            placeholder="What they asked"
            className="mt-3 w-full text-sm border rounded-lg px-2 py-2 bg-background"
          />
          <div className="mt-3 flex items-center gap-3">
            <button
              onClick={add}
              disabled={saving || !form.email.trim()}
              className="text-sm px-4 py-2 rounded-lg bg-primary text-primary-foreground font-medium disabled:opacity-50"
            >
              {saving ? "Saving…" : "Add entry"}
            </button>
            {message && <span className="text-sm text-destructive">{message}</span>}
          </div>
        </section>

        <div className="flex gap-3 mb-4">
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search email…"
            className="flex-1 text-sm border rounded-lg px-3 py-2 bg-background"
          />
          <button
            onClick={() =>
              downloadCsv(
                `support-${new Date().toISOString().slice(0, 10)}.csv`,
                ["email", "subject", "channel", "created_at", "resolved_at"],
                filtered.map((r) => [r.email, r.subject ?? "", r.channel, r.created_at, r.resolved_at ?? ""]),
              )
            }
            disabled={!filtered.length}
            className="text-sm px-3 py-2 rounded-lg border font-medium disabled:opacity-50"
          >
            Export CSV
          </button>
        </div>

        <div className="rounded-lg border bg-card overflow-hidden">
          {loading ? (
            <p className="p-8 text-center text-sm text-muted-foreground">Loading…</p>
          ) : filtered.length === 0 ? (
            <p className="p-8 text-center text-sm text-muted-foreground">
              No support contacts recorded yet.
            </p>
          ) : (
            <ul className="divide-y">
              {filtered.map((r) => (
                <li key={r.id} className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="font-mono text-[12px]">{r.email}</div>
                      <div className="font-medium">{r.subject ?? "(no subject)"}</div>
                      <div className="text-xs text-muted-foreground">
                        {formatDateTime(r.created_at)} · {r.channel}
                      </div>
                      {r.body && <p className="mt-2 text-sm whitespace-pre-wrap">{r.body}</p>}
                    </div>
                    <button
                      onClick={() => toggleResolved(r)}
                      className="text-sm text-primary hover:underline shrink-0"
                    >
                      {r.resolved_at ? "Reopen" : "Mark resolved"}
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}

export default function AdminSupportLog() {
  return (
    <AdminOnly fallback={<NotFound />}>
      <SupportInner />
    </AdminOnly>
  );
}
