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
  const [deletingAll, setDeletingAll] = useState(false);
  const [zipping, setZipping] = useState(false);
  const [zippingTool, setZippingTool] = useState<string | null>(null);
  const [deletingTool, setDeletingTool] = useState<string | null>(null);

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

  async function onDeleteAll() {
    const list = rows ?? [];
    if (list.length === 0) {
      toast.error("No documents to delete");
      return;
    }
    if (!confirm(`Delete all ${list.length} sample reports? This removes every PDF and record permanently.`)) return;
    setDeletingAll(true);
    const t = toast.loading(`Deleting ${list.length} reports…`);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        toast.error("Sign in as admin to delete", { id: t });
        return;
      }
      let ok = 0;
      let fail = 0;
      for (const r of list) {
        try {
          const res = await fetch(`${SUPABASE_URL}/functions/v1/save-sample-report`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${session.access_token}`,
            },
            body: JSON.stringify({ action: "delete", id: r.id }),
          });
          if (res.ok) {
            ok++;
            setRows((cur) => (cur ?? []).filter((x) => x.id !== r.id));
          } else {
            fail++;
          }
        } catch {
          fail++;
        }
      }
      if (ok > 0) toast.success(`Deleted ${ok} report${ok === 1 ? "" : "s"}${fail ? ` (${fail} failed)` : ""}`, { id: t });
      else toast.error(`Delete failed for all ${list.length} reports`, { id: t });
    } catch (e) {
      toast.error(`Delete all failed: ${(e as Error).message}`, { id: t });
    } finally {
      setDeletingAll(false);
  }

  async function onDeleteTool(toolSlug: string) {
    const list = grouped[toolSlug] ?? [];
    if (list.length === 0) {
      toast.error("No documents to delete in this section");
      return;
    }
    const label = TOOL_DISPLAY[toolSlug] ?? toolSlug;
    if (!confirm(`Delete all ${list.length} "${label}" sample report${list.length === 1 ? "" : "s"}? This removes every PDF and record permanently.`)) return;
    setDeletingTool(toolSlug);
    const t = toast.loading(`Deleting ${list.length} ${label} report${list.length === 1 ? "" : "s"}…`);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        toast.error("Sign in as admin to delete", { id: t });
        return;
      }
      let ok = 0;
      let fail = 0;
      for (const r of list) {
        try {
          const res = await fetch(`${SUPABASE_URL}/functions/v1/save-sample-report`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${session.access_token}`,
            },
            body: JSON.stringify({ action: "delete", id: r.id }),
          });
          if (res.ok) {
            ok++;
            setRows((cur) => (cur ?? []).filter((x) => x.id !== r.id));
          } else {
            fail++;
          }
        } catch {
          fail++;
        }
      }
      if (ok > 0) toast.success(`Deleted ${ok} ${label} report${ok === 1 ? "" : "s"}${fail ? ` (${fail} failed)` : ""}`, { id: t });
      else toast.error(`Delete failed for all ${list.length} ${label} reports`, { id: t });
    } catch (e) {
      toast.error(`Delete failed: ${(e as Error).message}`, { id: t });
    } finally {
      setDeletingTool(null);
    }
  }


  async function onDownloadAll() {
    const list = (rows ?? []).filter((r) => urls[r.id]);
    if (list.length === 0) {
      toast.error("No PDFs available to download");
      return;
    }
    setZipping(true);
    const t = toast.loading(`Zipping ${list.length} PDFs…`);
    try {
      const zip = new JSZip();
      const used = new Set<string>();
      const results = await Promise.all(
        list.map(async (r) => {
          try {
            const res = await fetch(urls[r.id]);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const blob = await res.blob();
            const safe = `${r.tool_slug}__${r.variant}__${r.title}`
              .replace(/[^a-z0-9_\-]+/gi, "_")
              .replace(/^_+|_+$/g, "")
              .slice(0, 120) || r.id;
            let name = `${safe}.pdf`;
            let i = 2;
            while (used.has(name)) name = `${safe}_${i++}.pdf`;
            used.add(name);
            zip.file(`${r.tool_slug}/${name}`, blob);
            return true;
          } catch (e) {
            console.error("Failed to fetch", r.id, e);
            return false;
          }
        }),
      );
      const ok = results.filter(Boolean).length;
      const fail = results.length - ok;
      const content = await zip.generateAsync({ type: "blob" });
      const stamp = new Date().toISOString().slice(0, 10);
      const a = document.createElement("a");
      a.href = URL.createObjectURL(content);
      a.download = `sample-reports-${stamp}.zip`;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 0);
      toast.success(`Downloaded ${ok} PDF${ok === 1 ? "" : "s"}${fail ? ` (${fail} failed)` : ""}`, { id: t });
    } catch (e) {
      toast.error(`Zip failed: ${(e as Error).message}`, { id: t });
    } finally {
      setZipping(false);
    }
  }

  async function onDownloadTool(toolSlug: string) {
    const list = (grouped[toolSlug] ?? []).filter((r) => urls[r.id]);
    if (list.length === 0) {
      toast.error("No PDFs available for this tool yet — try refreshing.");
      return;
    }
    setZippingTool(toolSlug);
    const label = TOOL_DISPLAY[toolSlug] ?? toolSlug;
    const t = toast.loading(`Zipping ${list.length} ${label} PDF${list.length === 1 ? "" : "s"}…`);
    try {
      const zip = new JSZip();
      const used = new Set<string>();
      const results = await Promise.all(
        list.map(async (r) => {
          try {
            const res = await fetch(urls[r.id]);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const blob = await res.blob();
            const safe = `${r.variant}__${r.title}`
              .replace(/[^a-z0-9_\-]+/gi, "_")
              .replace(/^_+|_+$/g, "")
              .slice(0, 120) || r.id;
            let name = `${safe}.pdf`;
            let i = 2;
            while (used.has(name)) name = `${safe}_${i++}.pdf`;
            used.add(name);
            zip.file(name, blob);
            return true;
          } catch (e) {
            console.error("Failed to fetch", r.id, e);
            return false;
          }
        }),
      );
      const ok = results.filter(Boolean).length;
      const fail = results.length - ok;
      const content = await zip.generateAsync({ type: "blob" });
      const stamp = new Date().toISOString().slice(0, 10);
      const slugSafe = toolSlug.replace(/[^a-z0-9_-]/gi, "-");
      const a = document.createElement("a");
      a.href = URL.createObjectURL(content);
      a.download = `${slugSafe}-reports-${stamp}.zip`;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 0);
      toast.success(
        `Downloaded ${ok} ${label} PDF${ok === 1 ? "" : "s"}${fail ? ` (${fail} failed)` : ""}`,
        { id: t },
      );
    } catch (e) {
      toast.error(`Zip failed: ${(e as Error).message}`, { id: t });
    } finally {
      setZippingTool(null);
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

        <header className="mb-8 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <h1 className="font-display text-3xl md:text-4xl text-brand-navy mb-2">
              Sample report output
            </h1>
            <p className="text-muted-foreground">
              Every sample PDF generated from <code>/admin/sample-reports</code>,
              grouped by tool. Drafts and published samples both appear here as
              soon as a PDF has been attached.
            </p>
          </div>
          <button
            type="button"
            onClick={onDownloadAll}
            disabled={zipping || !rows || rows.length === 0}
            className="inline-flex items-center gap-2 rounded-md bg-brand-navy text-white px-4 py-2 text-sm font-medium hover:bg-brand-navy/90 disabled:opacity-50 shrink-0"
          >
            <Download className="h-4 w-4" aria-hidden />
            {zipping ? "Zipping…" : "Download All"}
          </button>
          <button
            type="button"
            onClick={onDeleteAll}
            disabled={deletingAll || !rows || rows.length === 0}
            className="inline-flex items-center gap-2 rounded-md border border-destructive/40 text-destructive px-4 py-2 text-sm font-medium hover:bg-destructive/10 disabled:opacity-50 shrink-0"
            title="Delete all sample reports (admin only)"
          >
            <Trash2 className="h-4 w-4" aria-hidden />
            {deletingAll ? "Deleting…" : "Delete All"}
          </button>
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
                <div className="flex items-center justify-between gap-4 mb-3">
                  <h2 className="font-display text-xl text-brand-navy">
                    {TOOL_DISPLAY[tool] ?? tool}
                    <span className="ml-2 text-xs font-mono text-muted-foreground">
                      ({grouped[tool].length})
                    </span>
                  </h2>
                  <button
                    type="button"
                    onClick={() => onDownloadTool(tool)}
                    disabled={zippingTool === tool || zipping || grouped[tool].every((r) => !urls[r.id])}
                    className="inline-flex items-center gap-2 rounded-md border border-brand-navy/30 text-brand-navy px-3 py-1.5 text-xs font-medium hover:bg-brand-navy/5 disabled:opacity-40 shrink-0"
                  >
                    <Download className="h-3.5 w-3.5" aria-hidden />
                    {zippingTool === tool
                      ? "Zipping…"
                      : `Download ${TOOL_DISPLAY[tool] ?? tool} PDFs`}
                  </button>
                </div>
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
