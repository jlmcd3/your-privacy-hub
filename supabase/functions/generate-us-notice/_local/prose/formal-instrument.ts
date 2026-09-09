// supabase/functions/_shared/prose/formal-instrument.ts
//
// DOC 180 (2026-09-04) — FORMAL INSTRUMENT presentation primitives, shared
// by the products the CEO carved OUT of the Syllabus & Record system (design
// principles 2026-09-03, point 7): the EU/Global Notice, the US Notice and
// the Custom DPA "stay formal instrument format: numbered sections,
// bold+underlined Section headings, underlined-not-bold subsections". One
// typeface (Georgia, per the CEO's 2026-09-04 ruling — Garamond/Palatino are
// not guaranteed in headless-Chromium PDF rendering), Normal-size text
// throughout, no navy bar, no tone chips, minimal colour.
//
// It also carries the CUSTOMER-COMPLETION convention (CEO 2026-09-04): this
// rebuild adds NO intake fields. Every fact a spine document needs that the
// intake does not collect renders as an italic, bracketed prompt that NAMES
// WHAT TO SUPPLY and never suggests a value (the DPA clause library's
// placeholder-neutrality law, applied fleet-wide), and a completion banner
// sits at the top of the document while any prompt remains. The banner never
// calls the document a draft (de-draft directive, 2026-08-26, 396739b4d).

export function escHtml(s: unknown): string {
  if (s === null || s === undefined) return "";
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** The class every completion prompt carries; countFills() keys on it. */
export const FI_FILL_CLASS = "fi-fill";

/**
 * A customer-completion prompt: `[insert …]` in italics. `what` is the
 * plain-English description of the information to supply, written with its
 * own leading verb ("insert …", "state …", "describe …", "confirm …").
 */
export function fill(what: string): string {
  return `<em class="${FI_FILL_CLASS}">[${escHtml(what)}]</em>`;
}

const FILL_RE = new RegExp(`<em class="${FI_FILL_CLASS}">`, "g");

/** Number of completion prompts in a rendered document. */
export function countFills(html: string): number {
  return (String(html ?? "").match(FILL_RE) ?? []).length;
}

/**
 * The completion banner: rendered above the document while any prompt
 * remains; "" when the document carries none. Never uses the word "draft".
 */
export function completionBannerHtml(count: number): string {
  if (!Number.isFinite(count) || count <= 0) return "";
  const items = count === 1 ? "one bracketed item" : `${count} bracketed items`;
  return `<div class="fi-banner" role="note"><strong>CUSTOMER COMPLETION REQUIRED.</strong> This document contains ${items} shown in italics inside square brackets. Each names information that must be supplied before the document is published or relied on.</div>`;
}

/** A run-in labelled line: "Label: value" inside one paragraph. */
export function runIn(label: string, valueHtml: string): string {
  return `<p><span class="fi-run">${escHtml(label)}:</span> ${valueHtml}</p>`;
}

/**
 * The formal-instrument stylesheet. Scoped to element selectors and `fi-`
 * classes so a host document's own classes cannot collide with it.
 */
export const FI_CSS = `
  body { font-family: Georgia, "Times New Roman", serif; font-size: 11pt; line-height: 1.5; color: #1a1916; background: #fff; max-width: 7.25in; margin: 0 auto; padding: 0 0.25in; }
  h1 { font-size: 14pt; font-weight: bold; text-align: center; margin: 0 0 4pt; letter-spacing: 0.02em; }
  h2 { font-size: 11pt; font-weight: bold; text-decoration: underline; margin: 18pt 0 6pt; page-break-after: avoid; }
  h3 { font-size: 11pt; font-weight: normal; text-decoration: underline; margin: 12pt 0 4pt; page-break-after: avoid; }
  p { margin: 0 0 8pt; text-align: justify; }
  ul, ol { margin: 0 0 8pt 1.25em; padding: 0; }
  li { margin: 0 0 3pt; }
  a { color: inherit; }
  .fi-fill { font-style: italic; }
  .fi-run { font-weight: bold; }
  .fi-meta { text-align: center; font-size: 10pt; margin: 0 0 14pt; }
  .fi-banner { border: 1pt solid #1a1916; padding: 8pt 10pt; margin: 0 0 14pt; font-size: 10pt; page-break-inside: avoid; }
  .fi-glance { border-top: 1pt solid #1a1916; border-bottom: 1pt solid #1a1916; padding: 8pt 0 4pt; margin: 12pt 0 16pt; page-break-inside: avoid; }
  .fi-glance p { margin: 0 0 5pt; text-align: left; }
  .fi-block { margin: 0 0 12pt; padding-left: 12pt; border-left: 0.5pt solid #9a9a9a; page-break-inside: avoid; }
  .fi-block p { text-align: left; }
  .fi-callout { border: 1pt solid #1a1916; padding: 8pt 10pt; margin: 8pt 0 12pt; page-break-inside: avoid; }
  .fi-callout p { text-align: left; }
  .fi-toc { margin: 0 0 14pt; }
  .fi-footer { margin-top: 24pt; padding-top: 8pt; border-top: 0.5pt solid #9a9a9a; font-size: 8.5pt; color: #444; }
  table.fi-table { width: 100%; border-collapse: collapse; margin: 0 0 10pt; font-size: 10.5pt; }
  table.fi-table td, table.fi-table th { border: 0.5pt solid #9a9a9a; padding: 4pt 6pt; vertical-align: top; text-align: left; }
  table.fi-table th { font-weight: bold; }
  @media print { body { max-width: none; padding: 0; } }
`;
