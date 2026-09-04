// Shared build of the public preview for a sample report.
//
// Approved scope 2026-09-04 ("Automatic preview build for sample reports"):
// there is exactly ONE definition of "first sections / first two pages + TOC".
// Both build-sample-preview (manual/admin) and save-sample-report (every
// content write) call into this module, so a generated sample always carries
// its preview without anybody remembering to press a button.
//
// DOC 183 (2026-09-04) — the DPA is a formal instrument (doc 182): its
// deliverable is the contract-mode PDF, so its public preview is the first
// two PDF pages (like the Notices and the RoPA) with the table of contents
// drawn from the structured contract, not a prose cut of `document_text`.

import { PDFDocument } from "https://esm.sh/pdf-lib@1.17.1";
import { buildPreview, documentOutline, type TocEntry } from "./sample-preview.ts";

/** Pages of a file-driven deliverable shown publicly. */
export const PREVIEW_PDF_PAGES = 2;
export const SAMPLE_BUCKET = "sample-reports";

/** Tools whose public preview is the PDF even though the row carries text. */
export const PDF_FIRST_TOOLS: ReadonlySet<string> = new Set(["dpa"]);

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

export type SampleRowLike = {
  id: string;
  tool_slug: string;
  variant: string;
  document_text: string | null;
  report_data: Record<string, unknown> | null;
  pdf_path: string | null;
};

export type PreviewPlan = {
  /** "pdf": the first pages of the stored PDF; "content": a cut of the row's text/skeleton; "none": nothing to show. */
  mode: "pdf" | "content" | "none";
  preview_document_text: string | null;
  preview_report_data: Record<string, unknown> | null;
  /** The TOC to store; for "pdf" it is the finished document's outline when the row carries one. */
  preview_toc: TocEntry[];
  /** Withheld count for "content" mode (sections); "pdf" mode fills pages in at build time. */
  withheld_section_count: number;
  page_one_has_contents: boolean;
};

/** Pure decision: what the public preview of this row consists of. */
export function previewPlan(row: Pick<SampleRowLike, "tool_slug" | "document_text" | "report_data" | "pdf_path">): PreviewPlan {
  const content = buildPreview(row);
  const hasRowContent = Boolean(content.preview_document_text || content.preview_report_data);
  const pdfFirst = PDF_FIRST_TOOLS.has(row.tool_slug) && Boolean(row.pdf_path);
  if (pdfFirst || (!hasRowContent && row.pdf_path)) {
    const outline = documentOutline(row.report_data);
    return {
      mode: "pdf",
      preview_document_text: null,
      preview_report_data: null,
      preview_toc: outline.length ? outline : content.preview_toc,
      withheld_section_count: 0,
      page_one_has_contents: false,
    };
  }
  if (hasRowContent) {
    return {
      mode: "content",
      preview_document_text: content.preview_document_text,
      preview_report_data: content.preview_report_data,
      preview_toc: content.preview_toc,
      withheld_section_count: content.withheld_section_count,
      page_one_has_contents: content.page_one_has_contents,
    };
  }
  return { mode: "none", preview_document_text: null, preview_report_data: null, preview_toc: [], withheld_section_count: 0, page_one_has_contents: false };
}

export type PreviewBuildResult = {
  id: string;
  tool_slug: string;
  variant: string;
  kept: "content" | "pdf" | "none";
  toc_entries: number;
  withheld: number;
  /** The kept page one already carries the document's contents (Syllabus & Record). */
  page_one_has_contents: boolean;
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

  const r = row as SampleRowLike;
  const plan = previewPlan(r);
  let previewPdfPath: string | null = null;
  let withheld = plan.withheld_section_count;
  let kept: PreviewBuildResult["kept"] = plan.mode === "content" ? "content" : "none";

  if (plan.mode === "pdf" && r.pdf_path) {
    const built = await buildPreviewPdf(admin, r.pdf_path);
    if (built) {
      previewPdfPath = built.path;
      withheld = built.withheld_pages;
      kept = "pdf";
    }
  }

  const patch = {
    preview_document_text: plan.preview_document_text,
    preview_report_data: plan.preview_report_data,
    preview_toc: kept === "none" ? [] : plan.preview_toc,
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
    kept,
    toc_entries: patch.preview_toc.length,
    withheld,
    page_one_has_contents: plan.page_one_has_contents,
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
