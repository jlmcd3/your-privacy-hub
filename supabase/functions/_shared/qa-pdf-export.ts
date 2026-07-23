// qa-pdf-export.ts — PDF auto-export helper for quality-batch-orchestrator.
//
// PDFEXPORT-1 Task 2: when a batch transitions to phase='done'/status='complete',
// for every quality_run_documents row of the batch:
//   1. invoke generate-report-pdf (via invoke-gated raw-fetch — SDK drops SR bearer)
//      to ensure the PDF is rendered and cached in storage
//   2. download the signed URL bytes
//   3. insert a qa_pdf_exports row (base64 content, file_name follows the
//      pattern <tool>-doc<doc_number>-<source_row_id first 8>.pdf)
// Per-doc failures are logged into function_runs (event='pdf_export') and NEVER
// block completion — fire-and-forget discipline.

import { invokeGated } from "./invoke-gated.ts";

// Map from run-quality-batch tool slug → generate-report-pdf tool_type.
// Every one of the 9 run-quality-batch slugs has a PDF renderer in
// generate-report-pdf's tableMap (see generate-report-pdf/index.ts L1915-1930):
//   cppa-admt → cppa_admt, cppa-risk → cppa_risk, cppa-cyber → cppa_cybersecurity,
//   governance → governance_assessment, dpia → dpia_framework, lia → li_assessment,
//   dpa-generator → dpa_generator, ir-playbook → ir_playbook, biometric-checker → biometric_checker.
// No tool slug lacks a PDF renderer.
export const TOOL_SLUG_TO_PDF_TYPE: Record<string, string> = {
  "cppa-admt": "cppa_admt",
  "cppa-risk": "cppa_risk",
  "cppa-cyber": "cppa_cybersecurity",
  "governance": "governance_assessment",
  "dpia": "dpia_framework",
  "lia": "li_assessment",
  "dpa-generator": "dpa_generator",
  "ir-playbook": "ir_playbook",
  "biometric-checker": "biometric_checker",
  // QB-P24 Addendum Item 6 — registration was missing; PDF export logged
  // no_pdf_renderer_for_tool for every registration doc in batch ad3dc390.
  // generate-report-pdf already handles "registration_assessment" (see
  // PDFDownloadButton.tsx toolType matrix), so this is a wiring-only fix.
  "registration": "registration_assessment",
};

export type QaDocRow = {
  tool: string;
  doc_number: number;
  source_row_id: string;
  source_table: string | null;
};

/**
 * Pure builder — extracted so tests can assert the file_name shape without a DB.
 * Pattern: <tool>-doc<doc_number>-<first 8 chars of source_row_id>.pdf
 */
export function buildQaFileName(tool: string, docNumber: number, sourceRowId: string): string {
  const short = (sourceRowId || "").replace(/-/g, "").slice(0, 8) || "unknown";
  return `${tool}-doc${docNumber}-${short}.pdf`;
}

async function logPdfExportRun(
  metadata: Record<string, unknown>,
  status: "success" | "error" = "success",
) {
  try {
    const url = Deno.env.get("SUPABASE_URL")!;
    const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const now = new Date().toISOString();
    await fetch(`${url}/rest/v1/function_runs`, {
      method: "POST",
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
        Prefer: "return=minimal",
      },
      body: JSON.stringify({
        function_name: "quality-batch-orchestrator",
        status,
        started_at: now,
        finished_at: now,
        duration_ms: 0,
        metadata: { event: "pdf_export", ...metadata },
      }),
    });
  } catch (e) {
    console.error("[qa-pdf-export] function_runs insert failed", (e as Error).message);
  }
}

/**
 * Injection-friendly: exported so tests can supply fakes for supabase, fetch, and
 * invokeGated without a live network.
 */
export type ExportDeps = {
  fetchDocs: (batchId: string) => Promise<QaDocRow[]>;
  invokePdf: (body: { tool_type: string; assessment_id: string }) =>
    Promise<{ ok: boolean; status: number; body: string }>;
  downloadPdf: (signedUrl: string) => Promise<Uint8Array>;
  insertExport: (row: {
    batch_id: string;
    tool: string;
    doc_number: number;
    file_name: string;
    content_base64: string;
  }) => Promise<{ ok: boolean; error?: string }>;
  logRun?: typeof logPdfExportRun;
};

export function bytesToBase64(bytes: Uint8Array): string {
  let bin = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    bin += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(bin);
}

/**
 * Export every document for one batch. Never throws — per-doc failures are
 * swallowed after being logged. Returns {attempted, inserted, failed} counts.
 */
export async function exportBatchPdfs(
  batchId: string,
  deps: ExportDeps,
): Promise<{ attempted: number; inserted: number; failed: number }> {
  const log = deps.logRun ?? logPdfExportRun;
  let attempted = 0, inserted = 0, failed = 0;

  let docs: QaDocRow[];
  try {
    docs = await deps.fetchDocs(batchId);
  } catch (e) {
    await log({ batch_id: batchId, error: `fetchDocs: ${(e as Error).message}` }, "error");
    return { attempted, inserted, failed };
  }

  for (const d of docs) {
    attempted++;
    const toolType = TOOL_SLUG_TO_PDF_TYPE[d.tool];
    if (!toolType) {
      failed++;
      await log({ batch_id: batchId, tool: d.tool, doc_number: d.doc_number, error: "no_pdf_renderer_for_tool" }, "error");
      continue;
    }
    try {
      const inv = await deps.invokePdf({ tool_type: toolType, assessment_id: d.source_row_id });
      if (!inv.ok) throw new Error(`generate-report-pdf ${inv.status}: ${inv.body.slice(0, 200)}`);
      let pdfUrl: string | null = null;
      try { pdfUrl = JSON.parse(inv.body)?.pdf_url ?? null; } catch { /* */ }
      if (!pdfUrl) throw new Error("no pdf_url in generate-report-pdf response");
      const bytes = await deps.downloadPdf(pdfUrl);
      if (!bytes || bytes.length === 0) throw new Error("empty pdf bytes");
      const file_name = buildQaFileName(d.tool, d.doc_number, d.source_row_id);
      const ins = await deps.insertExport({
        batch_id: batchId,
        tool: d.tool,
        doc_number: d.doc_number,
        file_name,
        content_base64: bytesToBase64(bytes),
      });
      if (!ins.ok) throw new Error(`insert failed: ${ins.error}`);
      inserted++;
      await log({ batch_id: batchId, tool: d.tool, doc_number: d.doc_number, file_name, bytes: bytes.length }, "success");
    } catch (e) {
      failed++;
      await log({ batch_id: batchId, tool: d.tool, doc_number: d.doc_number, error: (e as Error).message }, "error");
    }
  }

  return { attempted, inserted, failed };
}

/**
 * FF-2 T3 — write a `pdf_export_done` quality_batch_log row so subsequent
 * batch-kickoff-pickup ticks skip the batch even if qa_pdf_exports rows are
 * later deleted by ratified cleanup. Idempotent-ish: caller decides when to
 * call; passes an admin client. Never throws.
 */
export async function writeExportDoneMarker(admin: any, batchId: string, inserted: number): Promise<void> {
  try {
    await admin.from("quality_batch_log").insert({
      run_id: batchId,
      level: "info",
      message: `pdf_export_done: ${batchId} inserted=${inserted}`,
    });
  } catch (e) {
    console.error("[qa-pdf-export] done-marker insert failed", (e as Error).message);
  }
}

/**
 * Wire-up factory that binds the deps to a live Supabase admin client + PDFShift
 * chain. Called by quality-batch-orchestrator.finalizeIfDone (fire-and-forget).
 */
export function makeLiveDeps(admin: any): ExportDeps {
  return {
    fetchDocs: async (batchId: string) => {
      const { data: batch } = await admin
        .from("quality_batch_runs").select("tool_results").eq("id", batchId).maybeSingle();
      const results: any[] = Array.isArray(batch?.tool_results) ? batch.tool_results : [];
      const runIds = results.map((r) => r?.quality_run_id).filter(Boolean);
      if (runIds.length === 0) return [];
      const { data: docs } = await admin
        .from("quality_run_documents")
        .select("tool, doc_number, source_row_id, source_table")
        .in("run_id", runIds);
      return (docs ?? []) as QaDocRow[];
    },
    // FF-1 T1: pass maxBodyChars=0 so the full response (including a signed URL
    // longer than 500 chars) is preserved for JSON.parse.
    invokePdf: (body) => invokeGated("generate-report-pdf", body, { timeoutMs: 90_000, maxBodyChars: 0 }),
    downloadPdf: async (signedUrl: string) => {
      const r = await fetch(signedUrl);
      if (!r.ok) throw new Error(`download ${r.status}`);
      return new Uint8Array(await r.arrayBuffer());
    },
    insertExport: async (row) => {
      const { error } = await admin.from("qa_pdf_exports").insert(row);
      return { ok: !error, error: error?.message };
    },
  };
}
