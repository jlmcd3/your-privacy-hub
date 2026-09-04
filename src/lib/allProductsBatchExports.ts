/**
 * ALL-PRODUCTS-TEST — per-batch exports ("zip" and "md" links on each batch
 * column of the Tools & batch scores matrix).
 *
 *  zip → renders (or reuses) the PDF for every run recorded against the batch
 *        through the SAME generate-report-pdf path the customer result pages
 *        use, and packages them into one archive.
 *  md  → writes every ERROR of the batch (run failures and grading failures)
 *        into a markdown report and downloads it.
 *
 * Both operate purely on the local RunOutcome store — no server batch row is
 * required, so in-page (local) batches are covered exactly like server ones.
 */
import JSZip from "jszip";
import { toast } from "sonner";
import { invokeWithTimeout } from "@/lib/sampleGenerators";
import { supabase } from "@/integrations/supabase/client";
import { updateOutcome, type RunOutcome } from "@/lib/allProductsOutcomes";
import type { ToolSlug } from "@/lib/sampleFixtures";
import { STRESS_TOOL_TO_SLUG } from "@/lib/claudeIntake";


/**
 * Panel slug → generate-report-pdf tool_type. Session-shaped products (the two
 * Notice builders, which are HTML-only) have no generate-report-pdf branch and
 * are skipped by the zip with a note in the toast. RoPA is session-shaped too,
 * but it renders a real PDF through its own `generate-ropa-document` function,
 * so the zip pulls it directly (see `renderRopaPdf`).
 */
export const SLUG_TO_PDF_TOOL_TYPE: Partial<Record<ToolSlug, string>> = {
  li_assessment: "li_assessment",
  governance: "governance_assessment",
  dpia: "dpia_framework",
  biometric: "biometric_checker",
  cppa_risk: "cppa_risk",
  cppa_cyber: "cppa_cybersecurity",
  cppa_admt: "cppa_admt",
  dpa: "dpa_generator",
  ir_playbook: "ir_playbook",
  registration: "registration_assessment",
};

/** Products the zip can render even though generate-report-pdf has no branch. */
const DIRECT_PDF_SLUGS: ReadonlySet<ToolSlug> = new Set<ToolSlug>(["ropa" as ToolSlug]);

/**
 * NOTICE-PDF LAW (2026-09-04): the two Notice builders store their output as
 * HTML files in storage, exactly like the customer download buttons do. The
 * zip fetches that stored HTML and renders it through `render-html-to-pdf`
 * (PDFShift) with the same stable `cache_key` the customer page uses, so a
 * document already downloaded once is reused rather than re-rendered.
 */
const NOTICE_PDF_CONFIG: Partial<
  Record<ToolSlug, { table: "us_notice_documents" | "eu_notice_documents"; bucket: string; prefix: string }>
> = {
  ["us_notice" as ToolSlug]: { table: "us_notice_documents", bucket: "us-notices", prefix: "us-notice" },
  ["eu_notice" as ToolSlug]: { table: "eu_notice_documents", bucket: "eu-notices", prefix: "eu-notice" },
};

const isRenderable = (o: RunOutcome) =>
  Boolean(SLUG_TO_PDF_TOOL_TYPE[o.tool_slug]) ||
  DIRECT_PDF_SLUGS.has(o.tool_slug) ||
  Boolean(NOTICE_PDF_CONFIG[o.tool_slug]);

/**
 * Render every CURRENT document of a notice session to PDF via PDFShift and
 * return one entry per document (a session can hold several state notices).
 */
async function renderNoticePdfs(o: RunOutcome): Promise<Array<{ name: string; url: string }>> {
  const cfg = NOTICE_PDF_CONFIG[o.tool_slug]!;
  const { data, error } = await supabase
    .from(cfg.table)
    .select("id, file_path, document_format, version_number, is_combined")
    .eq("session_id", o.sourceRowId as string)
    .eq("is_current", true)
    .order("is_combined", { ascending: false });
  if (error) throw new Error(`notice documents: ${error.message}`);
  const docs = (data ?? []) as Array<{
    id: string; file_path: string; document_format: string | null;
    version_number: number | null; is_combined: boolean | null;
  }>;
  if (!docs.length) throw new Error("no current notice documents for this session");

  const out: Array<{ name: string; url: string }> = [];
  for (const d of docs) {
    const file = await supabase.storage.from(cfg.bucket).download(d.file_path);
    if (file.error || !file.data) throw file.error ?? new Error("couldn't fetch notice file");
    const raw = await file.data.text();
    const fmt = (d.document_format || "").toLowerCase();
    const isHtml = fmt === "html" || /<\/?[a-z][\s\S]*>/i.test(raw);
    const html = isHtml
      ? raw
      : `<!doctype html><html><head><meta charset="utf-8"><style>body{font-family:Georgia,'Times New Roman',serif;font-size:11pt;line-height:1.5;color:#1a1a1a;white-space:pre-wrap;}</style></head><body>${raw
          .replace(/&/g, "&amp;")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;")}</body></html>`;
    const title = `${cfg.prefix}${d.is_combined ? "-combined" : ""}-v${d.version_number ?? 1}`;
    const { data: pdf, error: pdfErr } = await invokeWithTimeout<{ pdf_url?: string; error?: string }>(
      "render-html-to-pdf",
      { html, title, cache_key: `${cfg.prefix}-${d.id}` },
      240_000,
    );
    if (pdfErr || !pdf?.pdf_url) {
      throw new Error(pdfErr?.message || pdf?.error || "notice PDF render failed");
    }
    out.push({ name: `${title}-${d.id.slice(0, 8)}`, url: pdf.pdf_url });
  }
  return out;
}


/**
 * RoPA: the run's sourceRowId is a ropa_document_versions id (or, for legacy
 * rows, the session id). Resolve the session, ask generate-ropa-document for a
 * fresh signed PDF URL, and re-generate once if no current PDF version exists.
 */
async function renderRopaPdf(o: RunOutcome): Promise<string> {
  const rowId = o.sourceRowId as string;
  const { data: ver } = await supabase
    .from("ropa_document_versions")
    .select("session_id")
    .eq("id", rowId)
    .maybeSingle();
  const sessionId = (ver as { session_id?: string } | null)?.session_id ?? rowId;

  const download = async () =>
    invokeWithTimeout<{ download_url?: string; error?: string }>(
      "generate-ropa-document",
      { session_id: sessionId, download_only: true, format: "pdf" },
      120_000,
    );

  let res = await download();
  if (!res.data?.download_url) {
    // No current PDF version — generate one, then poll for it.
    await invokeWithTimeout(
      "generate-ropa-document",
      { session_id: sessionId, format: "pdf" },
      120_000,
    );
    for (let i = 0; i < 40 && !res.data?.download_url; i++) {
      await new Promise((r) => setTimeout(r, 3000));
      res = await download();
    }
  }
  const url = res.data?.download_url;
  if (!url) {
    throw new Error(res.error?.message || res.data?.error || "no RoPA PDF available");
  }
  updateOutcome(o.id, { pdfUrl: url, pdfUrlAt: Date.now() });
  return url;
}


export function outcomesForBatch(outcomes: RunOutcome[], batchId: string): RunOutcome[] {
  return outcomes.filter((o) => o.batchId === batchId);
}

function downloadBlob(name: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

const stamp = () => new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
const shortId = (id: string) => id.replace(/^local-(stress-)?/, "").slice(0, 8);

/**
 * SERVER-ROW LAW (2026-09-04): a stress batch column comes from the SERVER, so
 * the browser may hold no local RunOutcome rows for it (different browser,
 * cleared storage, page reloaded mid-batch). When the local store has nothing
 * renderable for a `local-stress-<uuid>` column, rebuild the row list from
 * static_stress_jobs so the zip still renders.
 */
async function serverRowsForStressBatch(
  batchId: string,
  opts: { allStatuses?: boolean } = {},
): Promise<RunOutcome[]> {
  const serverId = batchId.replace(/^local-stress-/, "");
  if (serverId === batchId) return [];
  let q = supabase
    .from("static_stress_jobs")
    .select("id, tool_slug, status, source_row_id, company_name, error_message, created_at, completed_at")
    .eq("batch_id", serverId);
  if (!opts.allStatuses) q = q.eq("status", "complete");
  const { data } = await q;
  const jobs = (data ?? []) as Array<{
    id: string; tool_slug: string; status: string;
    source_row_id: string | null; company_name: string | null;
    error_message: string | null; created_at: string | null; completed_at: string | null;
  }>;
  return jobs
    .filter((j) => (opts.allStatuses ? true : j.source_row_id))
    .map((j) => ({
      id: j.id,
      batchId,
      startedAt: j.created_at ?? new Date().toISOString(),
      finishedAt: j.completed_at ?? null,
      tool_slug: (STRESS_TOOL_TO_SLUG[j.tool_slug] ?? j.tool_slug) as ToolSlug,
      variant: `server/${j.company_name ?? "company"}`,
      source: "claude",
      status: j.status === "complete" ? "complete" : "failed",
      sourceRowId: j.source_row_id,
      error: j.error_message ?? undefined,
      claudeScore: null,
      gptScore: null,
      meanScore: null,
    })) as unknown as RunOutcome[];
}


/** Create + download a zip of the batch's report PDFs. */
export async function downloadBatchPdfZip(batchId: string, outcomes: RunOutcome[]) {
  let rows = outcomesForBatch(outcomes, batchId).filter(
    (o) => o.status === "complete" && o.sourceRowId && isRenderable(o),
  );
  let skipped = outcomesForBatch(outcomes, batchId).length - rows.length;

  if (!rows.length) {
    const serverRows = await serverRowsForStressBatch(batchId);
    rows = serverRows.filter((o) => isRenderable(o));
    skipped = serverRows.length - rows.length;
  }

  if (!rows.length) {
    toast.error("No renderable documents recorded for this batch.");
    return;
  }
  const tid = `zip-${batchId}`;
  toast.loading(`Rendering ${rows.length} PDF${rows.length === 1 ? "" : "s"}…`, { id: tid });


  const zip = new JSZip();
  let ok = 0;
  let failed = 0;
  const failures: string[] = [];

  /** Signed URLs live 600s; only reuse a cached one well inside that window. */
  const SIGNED_URL_TTL_MS = 8 * 60 * 1000;

  /**
   * CACHE-FIRST LAW (2026-09-04, batch 138): a full render can take longer than
   * the client is willing to wait, and every retry burns another PDFShift call.
   * `mode: "sign-only"` returns a fresh signed URL for an ALREADY-rendered PDF
   * without rendering, so the zip asks for that first and only renders when the
   * document has never been produced. It is also the recovery path after a
   * client-side timeout: the server usually finished and stored the file just
   * after the client gave up.
   */
  async function signOnly(o: RunOutcome): Promise<string | null> {
    if (DIRECT_PDF_SLUGS.has(o.tool_slug)) return null;
    const { data } = await invokeWithTimeout<{ pdf_url?: string; error?: string }>(
      "generate-report-pdf",
      {
        tool_type: SLUG_TO_PDF_TOOL_TYPE[o.tool_slug],
        assessment_id: o.sourceRowId,
        mode: "sign-only",
      },
      60_000,
    );
    return data?.pdf_url ?? null;
  }

  async function renderFresh(o: RunOutcome): Promise<string> {
    if (DIRECT_PDF_SLUGS.has(o.tool_slug)) return renderRopaPdf(o);
    const { data, error } = await invokeWithTimeout<{ pdf_url?: string; error?: string }>(

      "generate-report-pdf",
      { tool_type: SLUG_TO_PDF_TOOL_TYPE[o.tool_slug], assessment_id: o.sourceRowId },
      240_000,
    );
    if (error || !data?.pdf_url) {
      // The render may have completed server-side after the client timed out —
      // one cheap sign-only probe recovers it instead of failing the row.
      const recovered = await signOnly(o).catch(() => null);
      if (recovered) {
        updateOutcome(o.id, { pdfUrl: recovered, pdfUrlAt: Date.now() });
        return recovered;
      }
      const raw = error?.message || data?.error || "no pdf_url returned";
      throw new Error(
        /auth_expired|401|Session expired/i.test(raw)
          ? "session expired — sign in again, then re-run the zip export"
          : raw,
      );
    }
    updateOutcome(o.id, { pdfUrl: data.pdf_url, pdfUrlAt: Date.now() });
    return data.pdf_url;
  }

  for (const o of rows) {
    try {
      const fresh = o.pdfUrl && o.pdfUrlAt && Date.now() - o.pdfUrlAt < SIGNED_URL_TTL_MS;
      let pdfUrl =
        (fresh ? (o.pdfUrl as string) : null) ??
        (await signOnly(o).catch(() => null)) ??
        (await renderFresh(o));
      let res = await fetch(pdfUrl);
      if (!res.ok) {
        // Link rejected (expired/rotated) or the cached object is gone —
        // render once, then retry the download.
        pdfUrl = await renderFresh(o);
        res = await fetch(pdfUrl);
      }
      if (!res.ok) throw new Error(`download ${res.status}`);
      const blob = await res.blob();
      zip.file(`${o.tool_slug}/${o.variant.replace(/[^\w.-]+/g, "_")}-${o.id}.pdf`, blob);
      ok += 1;
      toast.loading(`Rendered ${ok}/${rows.length} PDFs…`, { id: tid });
    } catch (e) {
      failed += 1;
      failures.push(`${o.tool_slug}/${o.variant}: ${(e as Error).message}`);
    }
  }


  if (!ok) {
    toast.error(`Zip aborted — 0 of ${rows.length} PDFs rendered.`, { id: tid });
    return;
  }
  if (failures.length) zip.file("_failures.txt", failures.join("\n"));
  const blob = await zip.generateAsync({ type: "blob" });
  downloadBlob(`all-products-batch-${shortId(batchId)}-${stamp()}.zip`, blob);
  toast.success(
    `Zipped ${ok} PDF${ok === 1 ? "" : "s"}${failed ? ` · ${failed} failed` : ""}${skipped ? ` · ${skipped} not renderable` : ""}.`,
    { id: tid },
  );
}

/** Write every error of the batch into a markdown file and download it. */
export async function downloadBatchErrorsMarkdown(batchId: string, outcomes: RunOutcome[]) {
  let rows = outcomesForBatch(outcomes, batchId);
  let serverOnly = false;
  if (!rows.length) {
    // SERVER-ROW LAW (2026-09-04): same fallback as the zip — a server stress
    // batch has no local RunOutcome rows after a reload or in another browser.
    rows = await serverRowsForStressBatch(batchId, { allStatuses: true });
    serverOnly = rows.length > 0;
  }
  if (!rows.length) {
    toast.error("No runs recorded for this batch.");
    return;
  }
  const runFailures = rows.filter((o) => o.status === "failed" || o.error);
  const gradeFailures = rows.filter((o) => o.gradeError);
  const noScore = rows.filter((o) => o.status === "complete" && !o.gradeError && o.meanScore == null);



  const lines: string[] = [];
  lines.push(`# All-products batch errors — ${shortId(batchId)}`);
  lines.push("");
  lines.push(`- Batch id: \`${batchId}\``);
  lines.push(`- Exported: ${new Date().toISOString()}`);
  lines.push(`- Runs recorded: ${rows.length}`);
  lines.push(`- Run failures: ${runFailures.length}`);
  lines.push(`- Grading failures: ${gradeFailures.length}`);
  lines.push(`- Completed but unscored: ${noScore.length}`);
  lines.push(`- Runs with a grade payload: ${rows.filter((o) => o.gradePayload != null).length}`);
  if (serverOnly) {
    lines.push(
      "- Source: rebuilt from server job rows (`static_stress_jobs`) — this browser holds no local run records for this batch, so grader findings/scores are not available here.",
    );
  }
  lines.push("");


  const section = (title: string, items: RunOutcome[], field: (o: RunOutcome) => string) => {
    lines.push(`## ${title}`);
    lines.push("");
    if (!items.length) {
      lines.push("_None._");
      lines.push("");
      return;
    }
    lines.push("| Product | Variant | Source | Started | Detail | Result |");
    lines.push("| --- | --- | --- | --- | --- | --- |");
    for (const o of items) {
      const detail = field(o).replace(/\|/g, "\\|").replace(/\n/g, " ");
      lines.push(
        `| ${o.tool_slug} | ${o.variant} | ${o.source} | ${o.startedAt} | ${detail} | ${o.resultUrl ?? "—"} |`,
      );
    }
    lines.push("");
  };

  section("Run failures", runFailures, (o) => o.error ?? "failed (no message)");
  section("Grading failures", gradeFailures, (o) => o.gradeError ?? "grading failed");
  section("Completed but unscored", noScore, () => "no Claude/GPT score recorded");

  // GRADER FINDINGS (2026-08-31): the .md is the FULL error list, so every
  // failed grader check of every run is written out verbatim (check id,
  // dimension, severity, evidence) per model, followed by critical failures.
  lines.push("## Grader findings");
  lines.push("");
  let findingRows = 0;
  for (const o of rows) {
    const p = (o.gradePayload ?? null) as
      | Record<string, { findings?: Array<Record<string, unknown>>; critical_failures?: string[]; error?: string }>
      | null;
    if (!p) continue;
    const blocks: string[] = [];
    // DOC 129 §2 — deterministic pre-grader findings (proved by the app,
    // not model opinions) render first for the run.
    const det = (p as Record<string, unknown>).deterministic;
    if (Array.isArray(det) && det.length) {
      findingRows += det.length;
      blocks.push(`- **deterministic** — ${det.length} proved defect(s):`);
      for (const f of det as Array<Record<string, unknown>>) {
        const ev = String(f.evidence ?? "").replace(/\n/g, " ").slice(0, 400);
        blocks.push(`  - \`${f.check_id ?? "?"}\` · ${f.severity ?? "—"} · ${f.classification ?? "—"}${ev ? ` — ${ev}` : ""}`);
      }
    }
    for (const model of ["claude", "gpt"] as const) {
      const m = p[model];
      if (!m) continue;
      if (m.error) {
        blocks.push(`- **${model}**: grading error — ${String(m.error).replace(/\n/g, " ")}`);
        continue;
      }
      const failed = (m.findings ?? []).filter((f) => f.passed === false);
      findingRows += failed.length;
      if (failed.length) {
        blocks.push(`- **${model}** — ${failed.length} failed check(s):`);
        for (const f of failed) {
          const ev = String(f.evidence ?? "").replace(/\n/g, " ").slice(0, 400);
          // DOC 129 §1.3 — the finding classification renders beside the
          // dimension/severity so engineering can triage without re-tracing.
          const cls = f.classification ? ` · ${String(f.classification)}` : "";
          blocks.push(
            `  - \`${f.check_id ?? "?"}\` · ${f.dimension ?? "—"} · ${f.severity ?? "—"}${cls}${ev ? ` — ${ev}` : ""}`,
          );
        }
      }
      for (const cf of m.critical_failures ?? []) {
        blocks.push(`  - **critical (${model})**: ${String(cf).replace(/\n/g, " ")}`);
      }
    }
    if (!blocks.length) continue;
    lines.push(`### ${o.tool_slug} · ${o.variant} (${o.sourceRowId ?? "no row"})`);
    lines.push("");
    lines.push(...blocks);
    lines.push("");
  }
  if (!findingRows) {
    lines.push(
      "_No grader findings recorded for this batch. If runs were graded before 2026-08-31, the grader returned counts only — re-run the batch to capture findings._",
    );
    lines.push("");
  }

  lines.push("## All runs");
  lines.push("");
  lines.push("| Product | Variant | Status | Claude | GPT | Mean | Row id |");
  lines.push("| --- | --- | --- | --- | --- | --- | --- |");
  for (const o of rows) {
    lines.push(
      `| ${o.tool_slug} | ${o.variant} | ${o.status} | ${o.claudeScore ?? "—"} | ${o.gptScore ?? "—"} | ${o.meanScore ?? "—"} | ${o.sourceRowId ?? "—"} |`,
    );
  }
  lines.push("");

  downloadBlob(
    `all-products-batch-${shortId(batchId)}-errors-${stamp()}.md`,
    new Blob([lines.join("\n")], { type: "text/markdown;charset=utf-8" }),
  );
  toast.success(`Errors .md ready — ${runFailures.length + gradeFailures.length} error(s).`);
}
