/**
 * ITEM 369 — PROSE-9 NATIVE CPPA-RISK PDF RENDERER.
 *
 * Extracted from generate-report-pdf/index.ts so the Phase-2 proof harness can
 * exercise the EXACT exporter code path without booting the function server.
 * Consumes `report.prose_document` (the Item-369 envelope) and renders the nine
 * Item-363 sections in plan order. `record_card` sections render as a labelled
 * definition table, never as pseudo-sentences (Item 347 rule 2).
 *
 * Reached ONLY when the envelope is present; the live path never sets it, so
 * live PDF output is byte-for-byte unaffected.
 */

function escHtml(s: unknown): string {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// deno-lint-ignore no-explicit-any
export function buildCPPARiskProse9HTML(report: any, record: any): string {
  const doc = report.prose_document;
  const summary = (report.assessment_summary && typeof report.assessment_summary === "object")
    ? report.assessment_summary
    : {};
  const orgName = summary.company_name || record?.intake_data?.org_context?.company_name || "";
  const paras = (t: string) =>
    String(t)
      .split(/\n{2,}/)
      .map((p) => p.trim())
      .filter(Boolean)
      .map((p) => `<p>${escHtml(p).replace(/\n/g, "<br/>")}</p>`)
      .join("");

  // deno-lint-ignore no-explicit-any
  const sections = (doc.sections as any[]).map((s) => {
    const cardRows = Array.isArray(s.record_card) ? s.record_card : [];
    const bodyHtml = cardRows.length
      ? `<table class="record-card">${
        cardRows
          // deno-lint-ignore no-explicit-any
          .map((r: any) => `<tr><th>${escHtml(r.label)}</th><td>${escHtml(r.value)}</td></tr>`)
          .join("")
      }</table>${s.text ? paras(s.text) : ""}`
      : paras(s.text ?? "");
    if (!bodyHtml) return "";
    return `<section class="prose9-section" data-section-id="${escHtml(s.section_id)}">
      <h2>${escHtml(s.title)}${s.degraded ? " (record incomplete)" : ""}</h2>
      ${bodyHtml}
    </section>`;
  }).filter(Boolean).join("\n");

  return `
    <header class="report-header">
      <h1>CPPA Privacy Risk Assessment</h1>
      ${orgName ? `<p class="org">${escHtml(orgName)}</p>` : ""}
      ${report.risk_level ? `<p class="band">Risk determination: <strong>${escHtml(report.risk_level)}</strong></p>` : ""}
    </header>
    ${sections}
  `;
}
