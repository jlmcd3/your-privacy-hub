// ITEM 271 — CEO review surface for the replay campaigns.
// ITEM 293 — the page no longer pins the Item-269-era Acceptance-40 batches:
// it lists ALL replay_harness_jobs newest-first and defaults to the most
// recent batch label, with a one-click dropdown for any earlier batch.
//
// ADMIN-ONLY. Read-only. Renders harness `assembled_report` bodies through
// the SAME shipped viewer (CPPARiskReportBody) and the SAME shipped PDF
// exporter (generate-report-pdf → buildCPPARiskReportHTML) that customers
// receive, so the CEO reads exactly what customers get.
//
// Authorization precedent: routed under <ProtectedRoute><AdminOnly>… in
// src/App.tsx (same as /admin/quality-loop2), with data read via authenticated
// admin RLS policies (has_role(auth.uid(),'admin')). Gate unchanged.

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import CPPARiskReportBody from "@/components/report-bodies/CPPARiskReportBody";

/**
 * ITEM 274 — page-boundary adapter. Unwraps a `{ report_data: … }` record if
 * one is handed in, so the viewer always receives the bare report body it
 * contracts for. Never fork the component to accommodate a page's shape.
 */
export function toViewerReport(value: any): any {
  if (!value || typeof value !== "object") return {};
  if (!Array.isArray(value) && value.report_data && typeof value.report_data === "object") {
    return value.report_data;
  }
  return value;
}

export type HarnessJob = {
  id: string;
  notes: string | null;
  status: string | null;
  created_at: string;
  doc_ids: string[] | null;
};

/** ITEM 293 — newest-first ordering, applied client-side as a belt-and-braces
 * pin on top of the `created_at DESC` query order. */
export function sortJobsNewestFirst(jobs: HarnessJob[]): HarnessJob[] {
  return [...jobs].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );
}

/** Distinct batch labels (job `notes`), in newest-first order of first appearance. */
export function batchLabels(jobs: HarnessJob[]): string[] {
  const out: string[] = [];
  for (const j of sortJobsNewestFirst(jobs)) {
    const label = jobLabel(j);
    if (!out.includes(label)) out.push(label);
  }
  return out;
}

/** Default selection = the label of the most recent job. */
export function defaultBatchLabel(jobs: HarnessJob[]): string | null {
  return batchLabels(jobs)[0] ?? null;
}

/** ITEM 294 — harness bookkeeping suffix hygiene. Job notes may carry a
 * trailing "[bg:waitUntil]" style marker; it is noise for the CEO read and
 * must never split a batch, so it is stripped for BOTH display and grouping. */
export function stripBgMarker(label: string): string {
  return String(label ?? "").replace(/\s*\[bg:[^\]]*\]\s*$/i, "").trim();
}

export function jobLabel(job: HarnessJob): string {
  return stripBgMarker(String(job.notes ?? "").trim()) || "(no label)";
}

type Row = {
  id: string;
  doc_id: string;
  created_at: string;
  job_notes: string;
  verdict: string;
  logged_defects: string[];
  material_defects: string[];
  unclassified: string[];
  presence_rate: number | null;
  assembled_report: any;
};

type LegacyDoc = {
  id: string;
  entity_name: string | null;
  sector: string | null;
  report_data: any;
};

const verdictClass = (v: string) =>
  v === "release"
    ? "bg-emerald-100 text-emerald-800"
    : v === "block"
      ? "bg-red-100 text-red-800"
      : "bg-amber-100 text-amber-800";

const fmt = (iso: string) => {
  try {
    return new Date(iso).toISOString().replace("T", " ").slice(0, 16) + "Z";
  } catch {
    return iso;
  }
};

export default function AdminReplayReview() {
  const [jobs, setJobs] = useState<HarnessJob[]>([]);
  const [label, setLabel] = useState<string | null>(null);
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [rowsLoading, setRowsLoading] = useState(false);
  const [sectors, setSectors] = useState<Record<string, { entity: string | null; sector: string | null; hasLegacy: boolean }>>({});
  const [open, setOpen] = useState<Row | null>(null);
  const [legacy, setLegacy] = useState<LegacyDoc | null>(null);
  const [showLegacy, setShowLegacy] = useState(false);
  const [pdfBusy, setPdfBusy] = useState<string | null>(null);
  // ITEM 294 — fail-visible: results-query errors render inline, not toast-only.
  const [rowsError, setRowsError] = useState<string | null>(null);
  // ITEM 294 — the jobs table is secondary; collapsed by default.
  const [showJobs, setShowJobs] = useState(false);

  // 1) Load ALL jobs, newest first. No note/date/id pin.
  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("replay_harness_jobs" as any)
        .select("id, notes, status, created_at, doc_ids")
        .order("created_at", { ascending: false });
      if (error) {
        toast.error(`Could not load harness jobs: ${error.message}`);
        setLoading(false);
        return;
      }
      const list = sortJobsNewestFirst((data ?? []) as unknown as HarnessJob[]);
      setJobs(list);
      setLabel(defaultBatchLabel(list));
      setLoading(false);
    })();
  }, []);

  const labels = useMemo(() => batchLabels(jobs), [jobs]);
  const selectedJobs = useMemo(
    () => sortJobsNewestFirst(jobs).filter((j) => jobLabel(j) === label),
    [jobs, label],
  );

  // 2) Load results for the selected batch only.
  useEffect(() => {
    if (!label || selectedJobs.length === 0) {
      setRows([]);
      return;
    }
    let cancelled = false;
    (async () => {
      setRowsLoading(true);
      setRowsError(null);
      const noteById = new Map(selectedJobs.map((j) => [j.id, jobLabel(j)]));
      const { data: res, error: rErr } = await supabase
        .from("replay_harness_results" as any)
        .select("id, job_id, doc_id, created_at, per_doc_result, assembled_report")
        .in("job_id", selectedJobs.map((j) => j.id))
        .order("created_at", { ascending: false });
      if (cancelled) return;
      if (rErr) {
        setRowsError(rErr.message || "Unknown error");
        toast.error(`Could not load harness results: ${rErr.message}`);
        setRowsLoading(false);
        return;
      }
      // Dedupe to the latest result per doc_id.
      const latest = new Map<string, Row>();
      for (const r of (res ?? []) as any[]) {
        if (latest.has(r.doc_id)) continue;
        const gtm = r.per_doc_result?.gtm ?? {};
        latest.set(r.doc_id, {
          id: r.id,
          doc_id: r.doc_id,
          created_at: r.created_at,
          job_notes: noteById.get(r.job_id) ?? "",
          verdict: String(gtm.verdict ?? "unknown"),
          logged_defects: Array.isArray(gtm.logged_defects) ? gtm.logged_defects : [],
          material_defects: Array.isArray(gtm.material_defects) ? gtm.material_defects : [],
          unclassified: Array.isArray(gtm.unclassified) ? gtm.unclassified : [],
          presence_rate: r.per_doc_result?.substance?.presence_rate ?? null,
          assembled_report: r.assembled_report,
        });
      }
      const list = Array.from(latest.values());
      setRows(list);
      setRowsLoading(false);

      // Lazy metadata (entity / sector / legacy availability) via the
      // admin-gated archive RPC.
      const meta: Record<string, { entity: string | null; sector: string | null; hasLegacy: boolean }> = {};
      await Promise.all(
        list.map(async (r) => {
          const { data } = await supabase.rpc("admin_replay_fetch_legacy_doc" as any, { p_doc_id: r.doc_id });
          const d = Array.isArray(data) ? (data[0] as any) : null;
          meta[r.doc_id] = {
            entity: d?.entity_name ?? null,
            sector: d?.sector ?? null,
            hasLegacy: !!d?.report_data,
          };
        }),
      );
      if (!cancelled) setSectors(meta);
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [label, jobs]);

  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const r of rows) c[r.verdict] = (c[r.verdict] ?? 0) + 1;
    return c;
  }, [rows]);

  const openReport = async (r: Row) => {
    setOpen(r);
    setShowLegacy(false);
    setLegacy(null);
    const { data } = await supabase.rpc("admin_replay_fetch_legacy_doc" as any, { p_doc_id: r.doc_id });
    const d = Array.isArray(data) ? (data[0] as any) : null;
    if (d) setLegacy(d as LegacyDoc);
  };

  const downloadPdf = async (r: Row) => {
    setPdfBusy(r.id);
    try {
      const { data, error } = await supabase.functions.invoke("generate-report-pdf", {
        body: { mode: "replay_harness", result_id: r.id },
      });
      if (error) throw error;
      if (!data?.pdf_url) throw new Error(data?.error || "PDF generation failed");
      window.open(data.pdf_url, "_blank", "noopener");
    } catch (e: any) {
      toast.error(e?.message || "Could not generate PDF");
    } finally {
      setPdfBusy(null);
    }
  };

  return (
    <div className="p-8 max-w-[1400px] mx-auto">
      <h1 className="font-serif text-2xl mb-1">Replay Review</h1>
      <p className="text-sm text-muted-foreground mb-6">
        CEO review surface. Reports render through the shipped viewer and the shipped PDF
        exporter, so what you read here is what customers receive.
      </p>

      {loading ? (
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin" /> Loading harness jobs…
        </div>
      ) : (
        <>
          <div className="mb-4 flex flex-wrap items-center gap-3 text-sm">
            <label htmlFor="batch-filter" className="font-medium">
              Batch
            </label>
            <select
              id="batch-filter"
              aria-label="Batch"
              className="border rounded px-2 py-1 max-w-[560px]"
              value={label ?? ""}
              onChange={(e) => setLabel(e.target.value)}
            >
              {labels.map((l) => (
                <option key={l} value={l}>
                  {l}
                </option>
              ))}
            </select>
            <span className="text-muted-foreground">
              {selectedJobs.length} job{selectedJobs.length === 1 ? "" : "s"} in this batch
            </span>
          </div>

          {rowsError && (
            <div
              role="alert"
              data-testid="results-error"
              className="mb-4 border border-destructive/40 bg-destructive/10 text-destructive rounded-lg p-3 text-sm"
            >
              <strong>Could not load harness results.</strong> {rowsError}
              <div className="mt-1 text-xs opacity-80">
                If this persists, the backend may be temporarily unavailable (platform incident) — retry shortly.
              </div>
            </div>
          )}



          <div className="mb-4 text-sm">
            <strong>{rows.length}</strong> documents ·{" "}
            {Object.entries(counts).map(([k, v]) => (
              <span key={k} className={`inline-block mr-2 px-2 py-0.5 rounded ${verdictClass(k)}`}>
                {k}: {v}
              </span>
            ))}
            {rowsLoading && (
              <span className="inline-flex items-center gap-1 text-muted-foreground">
                <Loader2 className="w-3 h-3 animate-spin" /> loading…
              </span>
            )}
          </div>

          <div className="overflow-x-auto border rounded-lg" data-testid="documents-table">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left">
                <tr>
                  <th className="p-2">Doc</th>
                  <th className="p-2">Entity</th>
                  <th className="p-2">Sector</th>
                  <th className="p-2">GTM verdict</th>
                  <th className="p-2">Logged defects</th>
                  <th className="p-2">Presence</th>
                  <th className="p-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-t align-top">
                    <td className="p-2 font-mono text-xs">{r.doc_id.slice(0, 8)}</td>
                    <td className="p-2">{sectors[r.doc_id]?.entity ?? "—"}</td>
                    <td className="p-2">{sectors[r.doc_id]?.sector ?? "—"}</td>
                    <td className="p-2">
                      <span className={`px-2 py-0.5 rounded ${verdictClass(r.verdict)}`}>{r.verdict}</span>
                      {r.material_defects.length > 0 && (
                        <div className="text-xs text-red-700 mt-1">
                          material: {r.material_defects.join(", ")}
                        </div>
                      )}
                      {r.unclassified.length > 0 && (
                        <div className="text-xs text-red-700 mt-1">
                          unclassified: {r.unclassified.join(", ")}
                        </div>
                      )}
                    </td>
                    <td className="p-2 text-xs">{r.logged_defects.join(", ") || "—"}</td>
                    <td className="p-2">
                      {r.presence_rate == null ? "—" : `${Math.round(r.presence_rate * 100)}%`}
                    </td>
                    <td className="p-2 whitespace-nowrap">
                      <button
                        className="px-2 py-1 mr-2 border rounded hover:bg-muted"
                        onClick={() => openReport(r)}
                      >
                        View report
                      </button>
                      <button
                        className="px-2 py-1 border rounded hover:bg-muted disabled:opacity-60"
                        disabled={pdfBusy === r.id}
                        onClick={() => downloadPdf(r)}
                      >
                        {pdfBusy === r.id ? "Preparing…" : "Download PDF"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* ITEM 294 — jobs table is secondary bookkeeping: it renders BELOW
              the documents table and is collapsed by default. */}
          <div className="mt-8">
            <button
              type="button"
              className="px-2 py-1 border rounded text-sm hover:bg-muted"
              aria-expanded={showJobs}
              onClick={() => setShowJobs((s) => !s)}
            >
              {showJobs ? "Hide jobs" : `Show jobs (${jobs.length})`}
            </button>
            {showJobs && (
              <div className="mt-3 overflow-x-auto border rounded-lg" data-testid="jobs-table">
                <table className="w-full text-xs">
                  <thead className="bg-muted/50 text-left">
                    <tr>
                      <th className="p-2">Created</th>
                      <th className="p-2">Batch label</th>
                      <th className="p-2">Status</th>
                      <th className="p-2">Docs</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortJobsNewestFirst(jobs).map((j) => (
                      <tr
                        key={j.id}
                        className={`border-t cursor-pointer hover:bg-muted/40 ${jobLabel(j) === label ? "bg-muted/60" : ""}`}
                        onClick={() => setLabel(jobLabel(j))}
                      >
                        <td className="p-2 whitespace-nowrap font-mono">{fmt(j.created_at)}</td>
                        <td className="p-2">{jobLabel(j)}</td>
                        <td className="p-2">{j.status ?? "—"}</td>
                        <td className="p-2">{j.doc_ids?.length ?? 0}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {open && (
        <div className="fixed inset-0 bg-black/50 z-50 overflow-y-auto p-6" onClick={() => setOpen(null)}>
          <div
            className="bg-white max-w-4xl mx-auto rounded-lg p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4 gap-3">
              <div className="font-mono text-xs">{open.doc_id}</div>
              <div className="flex items-center gap-2">
                {legacy?.report_data && (
                  <button
                    className="px-2 py-1 border rounded text-sm hover:bg-muted"
                    onClick={() => setShowLegacy((s) => !s)}
                  >
                    {showLegacy ? "View rebuilt" : "View legacy"}
                  </button>
                )}
                <button className="px-2 py-1 border rounded text-sm" onClick={() => setOpen(null)}>
                  Close
                </button>
              </div>
            </div>
            <div className="text-xs mb-3 text-muted-foreground">
              Showing: {showLegacy ? "archived legacy report_data" : `harness assembled_report — ${open.job_notes || "(no label)"}`}
            </div>
            {/* ITEM 274 — adapt at the page boundary only: the viewer contract
                takes the BARE report body object (never a {report_data:…}
                wrapper record). Harness rows store the bare assembled_report;
                archived legacy rows nest it under report_data. */}
            <CPPARiskReportBody
              report={toViewerReport(showLegacy ? legacy?.report_data : open.assembled_report)}
              createdAt={open.created_at}
            />

          </div>
        </div>
      )}
    </div>
  );
}
