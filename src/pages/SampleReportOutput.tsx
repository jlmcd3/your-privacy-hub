// Consolidated sample-output page. Lists every sample_reports row that has
// an attached PDF (any status) so admins and reviewers can grab the PDFs
// generated from /admin/sample-reports without having to publish first.
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, FileText, Trash2, Download } from "lucide-react";
import JSZip from "jszip";
import { supabase } from "@/integrations/supabase/client";
import { Helmet } from "react-helmet-async";
import { toast } from "sonner";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;

type Row = {
  id: string;
  tool_slug: string;
  variant: string;
  title: string;
  scenario_summary: string | null;
  status: string;
  pdf_path: string | null;
  updated_at: string | null;
};

const TOOL_DISPLAY: Record<string, string> = {
  li_assessment: "Legitimate Interests Assessment",
  dpia: "DPIA Framework",
  dpa: "Data Processing Agreement",
  governance: "Governance Assessment",
  ir_playbook: "Incident Response Playbook",
  biometric: "Biometric Compliance Check",
  cppa_risk: "CPPA Risk Assessment",
  cppa_cyber: "CPPA Cybersecurity Audit",
  ropa: "Record of Processing Activities (RoPA)",
  us_notice: "US State Privacy Notice",
  eu_notice: "EU / Global Privacy Notice",
};

export default function SampleReportOutput() {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [zipping, setZipping] = useState(false);

  async function load() {
    const { data, error } = await supabase
      .from("sample_reports")
      .select("id, tool_slug, variant, title, scenario_summary, status, pdf_path, updated_at")
      .not("pdf_path", "is", null)
      .order("tool_slug")
      .order("variant");
    if (error) {
      setError(error.message);
      setRows([]);
      return;
    }
    const list = (data ?? []) as Row[];
    setRows(list);
    const map: Record<string, string> = {};
    await Promise.all(
      list.map(async (r) => {
        if (!r.pdf_path) return;
        const { data: signed } = await supabase.storage
          .from("sample-reports")
          .createSignedUrl(r.pdf_path, 60 * 60);
        if (signed?.signedUrl) map[r.id] = signed.signedUrl;
      }),
    );
    setUrls(map);
  }

  useEffect(() => {
    load();
  }, []);

  async function onDelete(r: Row) {
    if (!confirm(`Delete sample report "${r.title}"? This removes the PDF and the record permanently.`)) return;
    setDeleting(r.id);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        toast.error("Sign in as admin to delete");
        return;
      }
      const res = await fetch(`${SUPABASE_URL}/functions/v1/save-sample-report`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ action: "delete", id: r.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);
      toast.success("Deleted");
      setRows((cur) => (cur ?? []).filter((x) => x.id !== r.id));
    } catch (e) {
      toast.error(`Delete failed: ${(e as Error).message}`);
    } finally {
      setDeleting(null);
    }
  }

  const grouped = useMemo(() => {
    const out: Record<string, Row[]> = {};
    (rows ?? []).forEach((r) => {
      (out[r.tool_slug] ??= []).push(r);
    });
    return out;
  }, [rows]);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Helmet>
        <title>Sample report output | EndUserPrivacy</title>
        <meta name="robots" content="noindex" />
      </Helmet>

      <main className="flex-1 max-w-[1000px] w-full mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden /> Home
        </Link>

        <header className="mb-8">
          <h1 className="font-display text-3xl md:text-4xl text-brand-navy mb-2">
            Sample report output
          </h1>
          <p className="text-muted-foreground">
            Every sample PDF generated from <code>/admin/sample-reports</code>,
            grouped by tool. Drafts and published samples both appear here as
            soon as a PDF has been attached.
          </p>
        </header>

        {error && (
          <div className="rounded-md border border-destructive/40 bg-destructive/5 text-sm p-4 mb-6">
            Could not load samples: {error}
          </div>
        )}

        {rows === null && (
          <div className="text-sm text-muted-foreground">Loading…</div>
        )}

        {rows !== null && rows.length === 0 && (
          <div className="rounded-lg border border-brand-cloud bg-muted/30 p-8 text-center">
            <FileText className="h-8 w-8 mx-auto mb-3 text-muted-foreground" aria-hidden />
            <p className="font-medium text-brand-navy mb-1">No PDFs yet</p>
            <p className="text-sm text-muted-foreground">
              Generate one from <code>/admin/sample-reports</code> and it will
              appear here.
            </p>
          </div>
        )}

        <div className="space-y-8">
          {Object.keys(grouped)
            .sort()
            .map((tool) => (
              <section key={tool}>
                <h2 className="font-display text-xl text-brand-navy mb-3">
                  {TOOL_DISPLAY[tool] ?? tool}
                  <span className="ml-2 text-xs font-mono text-muted-foreground">
                    {tool}
                  </span>
                </h2>
                <div className="space-y-3">
                  {grouped[tool].map((r) => {
                    const url = urls[r.id];
                    return (
                      <article
                        key={r.id}
                        className="rounded-lg border border-brand-cloud bg-card p-4 shadow-sm flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2 mb-1">
                            <span className="text-xs uppercase tracking-wide font-mono text-muted-foreground">
                              {r.variant}
                            </span>
                            <span
                              className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${
                                r.status === "published"
                                  ? "bg-emerald-100 text-emerald-900"
                                  : r.status === "approved"
                                  ? "bg-blue-100 text-blue-900"
                                  : "bg-amber-100 text-amber-900"
                              }`}
                            >
                              {r.status}
                            </span>
                            {r.updated_at && (
                              <span className="text-[11px] text-muted-foreground">
                                {new Date(r.updated_at).toLocaleString()}
                              </span>
                            )}
                          </div>
                          <p className="font-medium text-brand-navy truncate">
                            {r.title}
                          </p>
                          {r.scenario_summary && (
                            <p className="text-xs text-muted-foreground line-clamp-2">
                              {r.scenario_summary}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {url ? (
                            <a
                              href={url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-2 rounded-md bg-brand-navy text-white px-4 py-2 text-sm font-medium hover:bg-brand-navy/90"
                            >
                              <FileText className="h-4 w-4" aria-hidden /> Download PDF
                            </a>
                          ) : (
                            <span className="text-xs text-muted-foreground">
                              generating link…
                            </span>
                          )}
                          <button
                            type="button"
                            onClick={() => onDelete(r)}
                            disabled={deleting === r.id}
                            className="inline-flex items-center gap-1.5 rounded-md border border-destructive/40 text-destructive px-3 py-2 text-sm font-medium hover:bg-destructive/10 disabled:opacity-50"
                            title="Delete this sample report (admin only)"
                          >
                            <Trash2 className="h-4 w-4" aria-hidden />
                            {deleting === r.id ? "Deleting…" : "Delete"}
                          </button>
                        </div>
                      </article>
                    );
                  })}
                </div>
              </section>
            ))}
        </div>
      </main>
    </div>
  );
}
