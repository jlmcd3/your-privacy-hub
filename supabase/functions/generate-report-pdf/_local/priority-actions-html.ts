/**
 * ITEM 420 — the customer PDF's Priority Actions section, extracted so the
 * legacy byte-identity proof can render THE REAL PATH (index.ts imports this
 * and calls nothing else for that section).
 *
 * Legacy string arrays render byte-identically to the pre-ITEM-420 inline
 * `listSection("priority_actions", "Priority Actions", coerceNarrativeList(...))`
 * expression. Typed action records render through `formatActionHeadline`.
 */

import { coerceActionListText } from "../../_shared/report-contracts/action-record.ts";
import { headerForSection } from "../../_shared/report-contracts/cppa-risk-shape.ts";

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

/** The LTP PDF Priority Actions section. Returns "" when there is nothing. */
export function renderPriorityActionsSectionHtml(report: unknown): string {
  const items = coerceActionListText((report as { priority_actions?: unknown })?.priority_actions);
  if (!items || !items.length) return "";
  const title = escHtml(headerForSection("priority_actions", "Priority Actions"));
  const cards = items.map((s) => `<div class="card">${para(s)}</div>`).join("");
  return `<section><h2>${title}</h2>${cards}</section>`;
}

/**
 * ADMT-style ordered-list Priority Actions block (generate-report-pdf's
 * `priorityBlock`). Legacy strings keep the leading-numbering strip.
 */
export function renderPriorityActionsOrderedHtml(report: unknown): string {
  const items = coerceActionListText((report as { priority_actions?: unknown })?.priority_actions);
  if (!items || !items.length) return "";
  const lis = items
    .map((a) => `<li>${escHtml(a.replace(/^(\s*\d+[.)]\s*)+/, ""))}</li>`)
    .join("");
  return `<section class="section"><h2>Priority Actions</h2><ol>${lis}</ol></section>`;
}
