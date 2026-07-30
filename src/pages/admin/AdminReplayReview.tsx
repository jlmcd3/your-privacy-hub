// ITEM 271 — CEO review surface for the Acceptance-40 replay campaign.
// ADMIN-ONLY. Read-only. Renders harness `assembled_report` bodies through
// the SAME shipped viewer (CPPARiskReportBody) and the SAME shipped PDF
// exporter (generate-report-pdf → buildCPPARiskReportHTML) that customers
// receive, so the CEO reads exactly what customers get.
//
// Authorization precedent: routed under <ProtectedRoute><AdminOnly>… in
// src/App.tsx (same as /admin/quality-loop2, src/App.tsx:627-638), with data
// read via authenticated admin RLS policies (precedent: quality_loop2_runs
// policy "Admin quality_loop2_runs", has_role(auth.uid(),'admin')).

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import CPPARiskReportBody from "@/components/report-bodies/CPPARiskReportBody";

const ACCEPTANCE_NOTE_PREFIXES = ["Acceptance-40", "Ramp step 1, attempt 9"];

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

export default function AdminReplayReview() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [sectors, setSectors] = useState<Record<string, { entity: string | null; sector: string | null; hasLegacy: boolean }>>({});
  const [open, setOpen] = useState<Row | null>(null);
  const [legacy, setLegacy] = useState<LegacyDoc | null>(null);
  const [showLegacy, setShowLegacy] = useState(false);
  const [pdfBusy, setPdfBusy] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data: jobs, error: jErr } = await supabase
        .from("replay_harness_jobs" as any)
        .select("id, notes, created_at");
      if (jErr) {
        toast.error(`Could not load harness jobs: ${jErr.message}`);
        setLoading(false);
        return;
      }
      const wanted = (jobs ?? []).filter((j: any) =>
        ACCEPTANCE_NOTE_PREFIXES.some((p) => String(j.notes ?? "").startsWith(p)),
      );
      const noteById = new Map(wanted.map((j: any) => [j.id, String(j.notes ?? "")]));
      if (wanted.length === 0) {
        setRows([]);
        setLoading(false);
        return;
      }
      const { data: res, error: rErr } = await supabase
        .from("replay_harness_results" as any)
        .select("id, job_id, doc_id, created_at, per_doc_result, assembled_report")
        .in("job_id", wanted.map((j: any) => j.id))
        .order("created_at", { ascending: false });
      if (rErr) {
        toast.error(`Could not load harness results: ${rErr.message}`);
        setLoading(false);
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
      setLoading(false);

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
      setSectors(meta);
    })();
  }, []);

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
      <h1 className="font-serif text-2xl mb-1">Replay Review — Acceptance-40</h1>
      <p className="text-sm text-muted-foreground mb-6">
        Item 271 CEO review surface. Reports render through the shipped viewer and the shipped PDF
        exporter, so what you read here is what customers receive.
      </p>

      {loading ? (
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin" /> Loading results…
        </div>
      ) : (
        <>
          <div className="mb-4 text-sm">
            <strong>{rows.length}</strong> documents ·{" "}
            {Object.entries(counts).map(([k, v]) => (
              <span key={k} className={`inline-block mr-2 px-2 py-0.5 rounded ${verdictClass(k)}`}>
                {k}: {v}
              </span>
            ))}
          </div>

          <div className="overflow-x-auto border rounded-lg">
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
              Showing: {showLegacy ? "archived legacy report_data" : "harness assembled_report (build item-269)"}
            </div>
            <CPPARiskReportBody
              report={showLegacy ? legacy?.report_data ?? {} : open.assembled_report ?? {}}
              createdAt={open.created_at}
            />
          </div>
        </div>
      )}
    </div>
  );
}
