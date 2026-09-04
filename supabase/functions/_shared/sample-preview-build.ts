// Shared build of the public preview for a sample report.
//
// Approved scope 2026-09-04 ("Automatic preview build for sample reports"):
// there is exactly ONE definition of "first sections / first two pages + TOC".
// Both build-sample-preview (manual/admin) and save-sample-report (every
// content write) call into this module, so a generated sample always carries
// its preview without anybody remembering to press a button.

import { PDFDocument } from "https://esm.sh/pdf-lib@1.17.1";
import { buildPreview } from "./sample-preview.ts";

/** Pages of a file-driven deliverable shown publicly. */
export const PREVIEW_PDF_PAGES = 2;
export const SAMPLE_BUCKET = "sample-reports";

// deno-lint-ignore no-explicit-any
type Admin = any;

export function previewPathFor(pdfPath: string): string {
  return pdfPath.replace(/\.pdf$/i, "") + "--preview.pdf";
}

/** Copy the first N pages of the stored PDF into a sibling preview object. */
export async function buildPreviewPdf(
  admin: Admin,
  pdfPath: string,
): Promise<{ path: string; withheld_pages: number } | null> {
  const { data: blob, error } = await admin.storage.from(SAMPLE_BUCKET).download(pdfPath);
  if (error || !blob) return null;
  const bytes = new Uint8Array(await blob.arrayBuffer());
  const src = await PDFDocument.load(bytes, { ignoreEncryption: true });
  const total = src.getPageCount();
  const keep = Math.min(PREVIEW_PDF_PAGES, total);
  const out = await PDFDocument.create();
  const pages = await out.copyPages(src, Array.from({ length: keep }, (_, i) => i));
  for (const p of pages) out.addPage(p);
  const outBytes = await out.save();
  const path = previewPathFor(pdfPath);
  const { error: upErr } = await admin.storage
    .from(SAMPLE_BUCKET)
    .upload(path, outBytes, { contentType: "application/pdf", upsert: true });
  if (upErr) throw new Error(`preview pdf upload: ${upErr.message}`);
  return { path, withheld_pages: Math.max(0, total - keep) };
}

export type PreviewBuildResult = {
  id: string;
  tool_slug: string;
  variant: string;
  kept: "content" | "pdf" | "none";
  toc_entries: number;
  withheld: number;
};

/** Recompute and store the public preview for one sample row. */
export async function buildPreviewForRow(admin: Admin, id: string): Promise<PreviewBuildResult> {
  const { data: row, error } = await admin
    .from("sample_reports")
    .select("id, tool_slug, variant, document_text, report_data, pdf_path")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!row) throw new Error(`sample ${id} not found`);

  const r = row as {
    id: string;
    tool_slug: string;
    variant: string;
    document_text: string | null;
    report_data: Record<string, unknown> | null;
    pdf_path: string | null;
  };

  const preview = buildPreview(r);
  let previewPdfPath: string | null = null;
  let withheld = preview.withheld_section_count;

  const hasRowContent = Boolean(preview.preview_document_text || preview.preview_report_data);
  if (!hasRowContent && r.pdf_path) {
    const built = await buildPreviewPdf(admin, r.pdf_path);
    if (built) {
      previewPdfPath = built.path;
      withheld = built.withheld_pages;
    }
  }

  const patch = {
    preview_document_text: preview.preview_document_text,
    preview_report_data: preview.preview_report_data,
    preview_toc: preview.preview_toc,
    preview_pdf_path: previewPdfPath,
    withheld_section_count: withheld,
    preview_built_at: new Date().toISOString(),
  };
  const { error: upErr } = await admin.from("sample_reports").update(patch).eq("id", id);
  if (upErr) throw new Error(upErr.message);

  return {
    id,
    tool_slug: r.tool_slug,
    variant: r.variant,
    kept: hasRowContent ? "content" : previewPdfPath ? "pdf" : "none",
    toc_entries: preview.preview_toc.length,
    withheld,
  };
}

/**
 * Non-fatal wrapper for call sites whose primary job is saving content: the
 * save must not fail because a preview could not be computed. The row simply
 * carries no preview, which the public pages treat as "not shown".
 */
export async function tryBuildPreviewForRow(
  admin: Admin,
  id: string,
): Promise<{ ok: true; preview: PreviewBuildResult } | { ok: false; error: string }> {
  try {
    return { ok: true, preview: await buildPreviewForRow(admin, id) };
  } catch (e) {
    console.warn("[sample-preview] build failed for", id, (e as Error).message);
    return { ok: false, error: (e as Error).message };
  }
}

/** Remove the sibling preview object when a sample's PDF is deleted. */
export async function removePreviewObjects(admin: Admin, pdfPaths: string[]): Promise<void> {
  const previews = pdfPaths.filter(Boolean).map(previewPathFor);
  if (previews.length === 0) return;
  const { error } = await admin.storage.from(SAMPLE_BUCKET).remove(previews);
  if (error) console.warn("[sample-preview] preview cleanup failed:", error.message);
}
