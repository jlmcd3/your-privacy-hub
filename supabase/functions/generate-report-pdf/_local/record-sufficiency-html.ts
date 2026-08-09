/**
 * ITEM 425 — the customer PDF's Record Sufficiency section, extracted so the
 * legacy byte-identity proof can render THE REAL PATH (index.ts imports this
 * and calls nothing else for that section).
 *
 * LEGACY SHAPES (string[] / string / { complete, statement }) render
 * byte-identically to the pre-ITEM-425 inline expression
 * `listSection("record_sufficiency", "Record Sufficiency", coerceNarrativeList(...))`.
 * `coerceNarrativeList` itself is untouched — the typed record gets this
 * companion path exactly as `priority_actions` did in ITEM 420.
 *
 * TYPED RECORDS render as a statement paragraph plus an ELEMENTS TABLE, which
 * is what ends the R6 litany by construction: the repeated
 * "<element>: present in the record as documented (11 CCR § 7152(a)(x))."
 * paragraphs become rows.
 */

import {
  coerceSufficiencyView,
  isRiskSufficiencyRecord,
} from "../../_shared/report-contracts/risk-sufficiency.ts";
import {
  coerceNarrativeList,
  headerForSection,
} from "../../_shared/report-contracts/cppa-risk-shape.ts";

/** Byte-for-byte copy of generate-report-pdf's escHtml. */
function escHtml(s: unknown): string {
  if (s === null || s === undefined) return "";
  const str = typeof s === "string" ? s : (
    typeof s === "number" || typeof s === "boolean" ? String(s) :
    (() => { try { return JSON.stringify(s); } catch { return String(s); } })()
  );
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

const para = (v: string) => `<p>${escHtml(v).replace(/\n+/g, "</p><p>")}</p>`;

export const RECORD_SUFFICIENCY_TABLE_CSS = `
  .rs-table { width:100%; border-collapse:collapse; font-size:10.5pt; margin-top:6px; }
  .rs-table th { text-align:left; background:#eef4f7; color:#0c2a44; font-weight:700; padding:6px 8px; border:1px solid #dde5ea; }
  .rs-table td { padding:6px 8px; border:1px solid #dde5ea; vertical-align:top; }
`;

/**
 * The LTP PDF Record Sufficiency section. Returns "" when there is nothing.
 * Legacy shapes take the historical card layout; typed records take the table.
 */
export function renderRecordSufficiencySectionHtml(report: unknown): string {
  const raw = (report as { record_sufficiency?: unknown })?.record_sufficiency;
  const title = escHtml(headerForSection("record_sufficiency", "Record Sufficiency"));

  if (isRiskSufficiencyRecord(raw)) {
    const view = coerceSufficiencyView(raw);
    const statementHtml = view.statement ? `<div class="card">${para(view.statement)}</div>` : "";
    const rows = view.elements
      .map((el) =>
        `<tr><td>${escHtml(el.element)}</td><td>${escHtml(el.status)}</td><td>${escHtml(el.pinpoint)}</td></tr>`
      )
      .join("");
    const table = rows
      ? `<table class="rs-table"><thead><tr><th>Element</th><th>Status on the record</th><th>Authority</th></tr></thead><tbody>${rows}</tbody></table>`
      : "";
    if (!statementHtml && !table) return "";
    return `<section><h2>${title}</h2>${statementHtml}${table}</section>`;
  }

  // LEGACY PATH — byte-identical to the pre-ITEM-425 expression.
  const items = coerceNarrativeList(raw);
  if (!items || !items.length) return "";
  const cards = items.map((s) => `<div class="card">${para(s)}</div>`).join("");
  return `<section><h2>${title}</h2>${cards}</section>`;
}
