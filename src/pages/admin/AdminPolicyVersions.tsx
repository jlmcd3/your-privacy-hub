// /admin/PP-ToS — published versions of the Privacy Policy, Privacy Notice and Terms.
import { useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import AdminOnly from "@/components/AdminOnly";
import NotFound from "@/pages/NotFound";
import { supabase } from "@/integrations/supabase/client";
import { formatDateTime } from "@/hooks/useAdminPeople";
import { useAuth } from "@/hooks/useAuth";

const KINDS = [
  { value: "privacy_policy", label: "Privacy Policy" },
  { value: "privacy_notice", label: "Privacy Notice" },
  { value: "terms_of_service", label: "Terms of Service" },
] as const;

interface Doc {
  id: string;
  kind: string;
  version: string;
  published_at: string;
  body: string;
  summary: string | null;
}

function kindLabel(kind: string) {
  return KINDS.find((k) => k.value === kind)?.label ?? kind;
}

function PolicyInner() {
  const { user } = useAuth();
  const [docs, setDocs] = useState<Doc[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [form, setForm] = useState({
    kind: "privacy_policy",
    version: "",
    published_at: new Date().toISOString().slice(0, 10),
    summary: "",
    body: "",
  });

  const load = async () => {
    const { data } = await (supabase as any)
      .from("policy_documents")
      .select("id, kind, version, published_at, body, summary")
      .order("published_at", { ascending: false });
    setDocs((data as Doc[]) ?? []);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const publish = async () => {
    setSaving(true);
    setMessage(null);
    const { error } = await (supabase as any).from("policy_documents").insert({
      kind: form.kind,
      version: form.version.trim(),
      published_at: new Date(form.published_at).toISOString(),
      summary: form.summary || null,
      body: form.body,
      published_by: user?.id ?? null,
    });
    setSaving(false);
    if (error) setMessage(error.message);
    else {
      setMessage("Version recorded.");
      setForm({ ...form, version: "", summary: "", body: "" });
      load();
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Policy Versions — Admin</title>
      </Helmet>
      <Navbar />
      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="font-serif text-3xl">Policy versions</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Every published version of the Privacy Policy, Privacy Notice and Terms of
              Service, with its publication date and full text. New accounts are stamped
              with whichever versions were live when they registered.
            </p>
          </div>
          <Link to="/admin" className="text-sm text-primary hover:underline">
            ← Master Console
          </Link>
        </div>

        <section className="rounded-lg border bg-card p-4 mb-6">
          <h2 className="font-medium mb-3">Record a new published version</h2>
          <div className="grid gap-3 md:grid-cols-3">
            <select
              value={form.kind}
              onChange={(e) => setForm({ ...form, kind: e.target.value })}
              className="text-sm border rounded-lg px-2 py-2 bg-background"
            >
              {KINDS.map((k) => (
                <option key={k.value} value={k.value}>
                  {k.label}
                </option>
              ))}
            </select>
            <input
              value={form.version}
              onChange={(e) => setForm({ ...form, version: e.target.value })}
              placeholder="Version label, e.g. 2026-09-09"
              className="text-sm border rounded-lg px-2 py-2 bg-background"
            />
            <input
              type="date"
              value={form.published_at}
              onChange={(e) => setForm({ ...form, published_at: e.target.value })}
              className="text-sm border rounded-lg px-2 py-2 bg-background"
            />
          </div>
          <input
            value={form.summary}
            onChange={(e) => setForm({ ...form, summary: e.target.value })}
            placeholder="What changed in this version (optional)"
            className="mt-3 w-full text-sm border rounded-lg px-2 py-2 bg-background"
          />
          <textarea
            value={form.body}
            onChange={(e) => setForm({ ...form, body: e.target.value })}
            placeholder="Full text of this version"
            rows={8}
            className="mt-3 w-full text-sm border rounded-lg px-2 py-2 bg-background font-mono"
          />
          <div className="mt-3 flex items-center gap-3">
            <button
              onClick={publish}
              disabled={saving || !form.version.trim()}
              className="text-sm px-4 py-2 rounded-lg bg-primary text-primary-foreground font-medium disabled:opacity-50"
            >
              {saving ? "Saving…" : "Record version"}
            </button>
            {message && <span className="text-sm text-muted-foreground">{message}</span>}
          </div>
        </section>

        <div className="rounded-lg border bg-card overflow-hidden">
          {loading ? (
            <p className="p-8 text-center text-sm text-muted-foreground">Loading…</p>
          ) : docs.length === 0 ? (
            <p className="p-8 text-center text-sm text-muted-foreground">
              No versions recorded yet.
            </p>
          ) : (
            <ul className="divide-y">
              {docs.map((d) => (
                <li key={d.id} className="p-4">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <div className="font-medium">
                        {kindLabel(d.kind)} · {d.version}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Published {formatDateTime(d.published_at)}
                        {d.summary ? ` · ${d.summary}` : ""}
                      </div>
                    </div>
                    <button
                      onClick={() => setOpen(open === d.id ? null : d.id)}
                      className="text-sm text-primary hover:underline shrink-0"
                    >
                      {open === d.id ? "Hide text" : "View text"}
                    </button>
                  </div>
                  {open === d.id && (
                    <pre className="mt-3 max-h-96 overflow-auto whitespace-pre-wrap rounded bg-muted p-3 text-xs">
                      {d.body || "No text stored for this version."}
                    </pre>
                  )}
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

export default function AdminPolicyVersions() {
  return (
    <AdminOnly fallback={<NotFound />}>
      <PolicyInner />
    </AdminOnly>
  );
}
