/**
 * ITEM 426 — the customer PDF's Exception Analysis section, extracted so the
 * legacy byte-identity proof renders THE REAL PATH (index.ts imports this and
 * calls nothing else for that section on the LTP path).
 *
 * LEGACY SHAPES render byte-identically to the pre-ITEM-426 inline expression
 *   listSection("exception_analysis", "Exception Analysis",
 *               coerceNarrativeList(report.exception_analysis))
 * for the string[] / bare-string / empty / absent states. Legacy OBJECT rows
 * — which `coerceNarrativeList` silently DROPPED — now render as cards; the
 * empty array still renders nothing (padding is ended at the writer, not here).
 */

import {
  coerceExceptionView,
  type ExceptionView,
} from "../../_shared/report-contracts/risk-exceptions.ts";
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

function cards(title: string, items: readonly string[]): string {
  return items.length
    ? `<section><h2>${title}</h2>${items.map((s) => `<div class="card">${para(s)}</div>`).join("")}</section>`
    : "";
}

function rowCard(r: Record<string, unknown>): string {
  const s = (v: unknown) => (typeof v === "string" ? v.trim() : "");
  const name = s(r.exception_name) || "Exception";
  const claimed = r.claimed === true ? "Yes" : r.claimed === false ? "No" : "";
  const lines: string[] = [];
  if (claimed) lines.push(`<p><span class="label">Claimed:</span> ${escHtml(claimed)}</p>`);
  if (s(r.statutory_basis)) {
    lines.push(`<p><span class="label">Statutory basis:</span> ${escHtml(s(r.statutory_basis))}</p>`);
  }
  if (s(r.scope_described)) {
    lines.push(`<p><span class="label">Scope:</span> ${escHtml(s(r.scope_described))}</p>`);
  }
  if (s(r.safeguards_described)) {
    lines.push(`<p><span class="label">Safeguards:</span> ${escHtml(s(r.safeguards_described))}</p>`);
  }
  if (s(r.documentation_status)) {
    lines.push(`<p><span class="label">Documentation:</span> ${escHtml(s(r.documentation_status))}</p>`);
  }
  if (s(r.facts_supporting)) {
    lines.push(`<p><span class="label">Facts supporting the exception:</span> ${escHtml(s(r.facts_supporting))}</p>`);
  }
  if (Array.isArray(r.missing_elements) && r.missing_elements.length) {
    lines.push(
      `<p class="label">What the record still needs</p><ul>${
        (r.missing_elements as unknown[]).map((m) => `<li>${escHtml(s(m))}</li>`).join("")
      }</ul>`,
    );
  }
  if (s(r.validity_assessment)) {
    lines.push(`<p>${escHtml(s(r.validity_assessment))}</p>`);
  }
  if (s(r.argument_strength_rationale)) {
    lines.push(`<p>${escHtml(s(r.argument_strength_rationale))}</p>`);
  }
  if (Array.isArray(r.flags) && r.flags.length) {
    lines.push(`<ul>${(r.flags as unknown[]).map((f) => `<li>${escHtml(s(f))}</li>`).join("")}</ul>`);
  }
  return `<div class="card"><h3>${escHtml(name)}</h3>${lines.join("")}</div>`;
}

/** LTP PDF Exception Analysis section. Returns "" when there is nothing. */
export function renderExceptionAnalysisSectionHtml(report: unknown): string {
  const raw = (report as { exception_analysis?: unknown })?.exception_analysis;
  const title = escHtml(headerForSection("exception_analysis", "Exception Analysis"));
  const view: ExceptionView = coerceExceptionView(raw);

  if (!view.present) return "";
  // LEGACY-IDENTICAL PATH — every pre-ITEM-426 shape (strings, bare string,
  // legacy object rows, empty, absent) renders exactly as the pre-change
  // listSection() expression did, hole defects preserved verbatim. Only the
  // CANONICAL nine-leaf record takes the new card layout.
  if (view.shape !== "typed") {
    return cards(title, coerceNarrativeList(raw) ?? []);
  }
  const textCards = (coerceNarrativeList(view.texts) ?? []).map((s) => `<div class="card">${para(s)}</div>`);
  return `<section><h2>${title}</h2>${textCards.join("")}${view.rows.map(rowCard).join("")}</section>`;
}

