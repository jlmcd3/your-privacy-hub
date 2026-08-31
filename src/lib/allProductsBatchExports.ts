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
import { updateOutcome, type RunOutcome } from "@/lib/allProductsOutcomes";
import type { ToolSlug } from "@/lib/sampleFixtures";

/**
 * Panel slug → generate-report-pdf tool_type. Session-shaped products (RoPA,
 * the two Notice builders) have no generate-report-pdf branch and are skipped
 * by the zip with a note in the toast.
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

/** Create + download a zip of the batch's report PDFs. */
export async function downloadBatchPdfZip(batchId: string, outcomes: RunOutcome[]) {
  const rows = outcomesForBatch(outcomes, batchId).filter(
    (o) => o.status === "complete" && o.sourceRowId && SLUG_TO_PDF_TOOL_TYPE[o.tool_slug],
  );
  const skipped = outcomesForBatch(outcomes, batchId).length - rows.length;
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

  for (const o of rows) {
    try {
      let pdfUrl = o.pdfUrl ?? null;
      if (!pdfUrl) {
        const { data, error } = await invokeWithTimeout<{ pdf_url?: string; error?: string }>(
          "generate-report-pdf",
          { tool_type: SLUG_TO_PDF_TOOL_TYPE[o.tool_slug], assessment_id: o.sourceRowId },
          180_000,
        );
        if (error || !data?.pdf_url) {
          const raw = error?.message || data?.error || "no pdf_url returned";
          throw new Error(
            /auth_expired|401|Session expired/i.test(raw)
              ? "session expired — sign in again, then re-run the zip export"
              : raw,
          );
        }
        pdfUrl = data.pdf_url;
        updateOutcome(o.id, { pdfUrl });
      }
      const res = await fetch(pdfUrl);
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
export function downloadBatchErrorsMarkdown(batchId: string, outcomes: RunOutcome[]) {
  const rows = outcomesForBatch(outcomes, batchId);
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
          blocks.push(
            `  - \`${f.check_id ?? "?"}\` · ${f.dimension ?? "—"} · ${f.severity ?? "—"}${ev ? ` — ${ev}` : ""}`,
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
