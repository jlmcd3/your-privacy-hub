// supabase/functions/generate-report-pdf/_local/dpa-formal-instrument.ts
//
// DOC 182 (2026-09-04) — the DPA contract-mode renderer as a FORMAL
// INSTRUMENT (CEO design principle 7, 2026-09-03): Georgia, numbered
// sections with bold+underlined headings, underlined-not-bold subsections,
// no navy header, no logo, minimal colour — the same presentation the EU and
// US Notices adopted in docs 180/181, via the shared
// _shared/prose/formal-instrument.ts primitives.
//
// The assembler's `[TO BE COMPLETED: …]` placeholders (the ratified library
// grammar, read by graders and lint from `document_text`) render here as the
// fleet's italic bracketed customer-completion prompts and are counted in the
// completion banner — the CEO's "[TO BE COMPLETED] ↔ prompt convention"
// reconciliation lives at this seam, so no ratified clause byte changes.
//
// Pure: no I/O, no Deno.serve, importable by tests and preview scripts.
// index.ts's buildDpaContractHTML is a thin wrapper that supplies the
// clause-coverage Schedule (RULING 9.5 keeps that table in index.ts).

import { completionBannerHtml, countFills, escHtml, FI_CSS, FI_FILL_CLASS } from "../../_shared/prose/formal-instrument.ts";

// Structural "Like" types: readonly so the assembler's frozen structure and
// a JSON round-trip from report_data both satisfy them.
type Rows = readonly (readonly string[])[];
export interface DpaContractSectionLike { readonly heading?: string; readonly clauses?: readonly string[] }
export interface DpaContractPartyLike { readonly label?: string; readonly name?: string }
export interface DpaContractExecutionLike { readonly statement?: string; readonly parties?: readonly DpaContractPartyLike[] }
export interface DpaContractAnnexLike { readonly title?: string; readonly rows?: Rows; readonly note?: string }
export interface DpaAddendumScheduleLike { readonly title?: string; readonly columns?: readonly string[]; readonly rows?: Rows; readonly note?: string }
export interface DpaAddendumLike {
  readonly id?: string;
  readonly title?: string;
  readonly subtitle?: string;
  readonly reference?: string;
  readonly preamble?: readonly string[];
  readonly sections?: readonly DpaContractSectionLike[];
  readonly schedules?: readonly DpaAddendumScheduleLike[];
  readonly executionLabels?: readonly string[];
}
export interface DpaContractLike {
  readonly sections?: readonly DpaContractSectionLike[];
  readonly execution?: DpaContractExecutionLike;
  readonly annexA?: DpaContractAnnexLike;
  readonly annexB?: DpaContractAnnexLike;
  readonly annexC?: DpaContractAnnexLike;
  readonly annexD?: DpaContractAnnexLike;
  readonly addenda?: readonly DpaAddendumLike[];
}

export interface DpaFormalInstrumentOpts {
  readonly title: string;
  readonly metaLine?: string;
  /** The Article 28(3) clause-coverage Schedule, rendered by the caller. */
  readonly scheduleHtml?: string;
}

// ── Prompts ────────────────────────────────────────────────────────────────

const TBC_RE = /\[TO BE COMPLETED:\s*([^\]]*)\]/g;
const NEGOTIABLE_RE = /\[(\d+)\]/g;

/** Escape, then turn each `[TO BE COMPLETED: x]` into the italic prompt and each `[N]` negotiable into a marked span. */
export function promptify(raw: unknown): string {
  return escHtml(raw)
    .replace(TBC_RE, (_m, what: string) => `<em class="${FI_FILL_CLASS}">[${what.trim()}]</em>`)
    .replace(NEGOTIABLE_RE, (_m, n: string) => `<span class="fi-neg">[${n}]</span>`);
}

// ── Headings and clauses ───────────────────────────────────────────────────

const HEADING_ACRONYMS = new Set(["CCPA", "CPRA", "GDPR", "EEA", "EU", "UK", "US", "SCC", "SCCS", "DPA", "ICO", "TOMS", "IDTA"]);
const SMALL_WORDS = new Set(["and", "or", "of", "the", "in", "for", "to", "a", "an", "on", "as", "by", "with"]);

/** Display-only ALL-CAPS → Title Case for part heads; the source heading is never touched. */
export function titleCaseHeading(h: string): string {
  return String(h ?? "").replace(/\S+/g, (word: string, offset: number) => {
    if (/^\d+\.$/.test(word)) return word;
    const bare = word.replace(/[^A-Za-z]/g, "");
    if (bare && HEADING_ACRONYMS.has(bare.toUpperCase()) && bare === bare.toUpperCase()) return word;
    if (/^[A-Z]+\/[A-Z]+$/.test(word)) return word;
    const lower = word.toLowerCase();
    if (offset !== 0 && SMALL_WORDS.has(lower.replace(/[^a-z]/g, ""))) return lower;
    return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
  });
}

// A clause number, optionally followed by a caption parenthetical ending
// `.)`, then the operative text (doc 109's shape-driven caption rule).
const CLAUSE_RE = /^(\d+(?:\.\d+)*)\s+(\([\s\S]{1,150}?\.\))?\s*([\s\S]*)$/;

export function clauseHtml(clause: string): string {
  const trimmed = String(clause ?? "").trim();
  if (!trimmed) return "";
  const m = CLAUSE_RE.exec(trimmed);
  if (!m) return `<p class="fi-clause">${promptify(trimmed)}</p>`;
  const [, num, captionRaw, rest] = m;
  const caption = captionRaw ? `<strong>${escHtml(captionRaw)}</strong> ` : "";
  return `<p class="fi-clause"><span class="fi-run">${escHtml(num)}</span> ${caption}${promptify(rest)}</p>`;
}

function sectionsHtml(sections: readonly DpaContractSectionLike[] | undefined, headingTag: "h2" | "h3" = "h2"): string {
  return (sections ?? []).map((sec) => {
    const clauses = Array.isArray(sec.clauses) ? sec.clauses : [];
    if (!clauses.length) return "";
    return `<section class="fi-section"><${headingTag}>${escHtml(titleCaseHeading(sec.heading ?? ""))}</${headingTag}>\n${clauses.map(clauseHtml).join("\n")}</section>`;
  }).join("\n");
}

// ── Tables ─────────────────────────────────────────────────────────────────

const SIGNATURE_RULE = `<span class="fi-sig">&nbsp;</span>`;

function cellHtml(v: unknown): string {
  const str = String(v ?? "");
  if (/^_{6,}$/.test(str.trim())) return SIGNATURE_RULE;
  return promptify(str);
}

export function tableHtml(t: { readonly title?: string; readonly columns?: readonly string[]; readonly rows?: Rows; readonly note?: string; readonly hideHeader?: boolean }, titleTag: "h2" | "h3" = "h3"): string {
  const cols = Array.isArray(t.columns) ? t.columns : [];
  const rows = Array.isArray(t.rows) ? t.rows.filter((r) => Array.isArray(r)) : [];
  if (!rows.length || !cols.length) return "";
  const head = t.hideHeader ? "" : `<thead><tr>${cols.map((c) => `<th>${escHtml(c)}</th>`).join("")}</tr></thead>`;
  const body = rows.map((r) => `<tr>${cols.map((_c, i) => `<td>${cellHtml(r[i])}</td>`).join("")}</tr>`).join("");
  return `<div class="fi-tablewrap">${t.title ? `<${titleTag}>${escHtml(t.title)}</${titleTag}>` : ""}<table class="fi-table">${head}<tbody>${body}</tbody></table>${t.note ? `<p class="fi-note">${promptify(t.note)}</p>` : ""}</div>`;
}

function executionHtml(statement: string, parties: { label: string; name: string }[], instrument: string): string {
  if (!parties.length) return "";
  return `<section class="fi-section fi-execution"><h2>Execution</h2><p>${escHtml(statement)}</p>${
    parties.map((p) => `<div class="fi-sigblock"><p><span class="fi-run">SIGNED for and on behalf of ${escHtml(p.name)} (${escHtml(p.label)})</span>${instrument ? ` — ${escHtml(instrument)}` : ""}</p>${
      tableHtml({ columns: ["Field", "Value"], hideHeader: true, rows: [["By", "______"], ["Name", "______"], ["Title", "______"], ["Date", "______"]] })
    }</div>`).join("")
  }</section>`;
}

// ── Addenda ────────────────────────────────────────────────────────────────

function addendumHtml(a: DpaAddendumLike, parties: { label: string; name: string }[]): string {
  const labels: readonly string[] = Array.isArray(a.executionLabels) && a.executionLabels.length === 2 ? a.executionLabels : ["Controller", "Processor"];
  const addendumParties = parties.length === 2
    ? [{ label: labels[0], name: parties[0].name }, { label: labels[1], name: parties[1].name }]
    : parties;
  const instrument = a.id === "eu-scc" || a.id === "uk-addendum" ? "Exhibit" : "Addendum";
  return `<section class="fi-addendum">
  <h1>${escHtml(a.title ?? "")}</h1>
  <div class="fi-meta">${escHtml(a.subtitle ?? "")}${a.reference ? `<br>${escHtml(a.reference)}` : ""}</div>
  ${(a.preamble ?? []).map((p) => `<p class="fi-preamble">${promptify(p)}</p>`).join("\n")}
  ${sectionsHtml(a.sections, "h2")}
  ${(a.schedules ?? []).map((sch) => tableHtml(sch, "h2")).join("\n")}
  ${executionHtml(`IN WITNESS WHEREOF, the Parties have executed this ${instrument} by their duly authorised representatives.`, addendumParties, "")}
</section>`;
}

// ── The document ───────────────────────────────────────────────────────────

const DPA_CSS = `
  .fi-clause { padding-left: 30pt; text-indent: -30pt; text-align: left; }
  .fi-section { margin: 0 0 6pt; }
  .fi-neg { font-weight: bold; }
  .fi-note { font-size: 9.5pt; margin: -4pt 0 10pt; text-align: left; }
  .fi-tablewrap { margin: 0 0 12pt; }
  .fi-sig { display: inline-block; width: 100%; max-width: 220px; border-bottom: 0.75pt solid #1a1916; }
  table.fi-table td, table.fi-table th { overflow-wrap: anywhere; }
  .fi-clause, .fi-preamble, .fi-meta { overflow-wrap: anywhere; }
  .fi-sigblock { margin: 0 0 14pt; }
  .fi-execution, .fi-annexes, .fi-addendum, .fi-schedule { page-break-before: always; break-before: page; }
  .fi-addendum h1 { margin-top: 0; }
  .fi-preamble { font-size: 10pt; text-align: left; }
  .fi-cover { text-align: center; padding: 36pt 0 48pt; page-break-after: always; break-after: page; }
  .fi-cover p { text-align: center; margin: 0 0 6pt; }
`;

export function buildDpaFormalInstrumentHTML(contract: DpaContractLike, opts: DpaFormalInstrumentOpts): string {
  const sections = Array.isArray(contract.sections) ? contract.sections : [];
  const parties = (Array.isArray(contract.execution?.parties) ? contract.execution!.parties! : [])
    .map((p) => ({ label: String(p.label ?? ""), name: String(p.name ?? "") }));
  const addenda = Array.isArray(contract.addenda) ? contract.addenda : [];

  const cover = `<div class="fi-cover"><h1>Data Processing Agreement</h1>${
    parties.map((p) => `<p><span class="fi-run">${escHtml(p.label)}:</span> ${promptify(p.name)}</p>`).join("")
  }${opts.metaLine ? `<p class="fi-meta">${escHtml(opts.metaLine)}</p>` : ""}${
    addenda.length ? `<p class="fi-meta">Incorporating: ${addenda.map((a) => escHtml(a.title ?? "")).join("; ")}</p>` : ""
  }</div>`;

  const annexes = [
    tableHtml({ ...(contract.annexA ?? {}), columns: ["Field", "Value"], hideHeader: true }, "h2"),
    tableHtml({ ...(contract.annexB ?? {}), columns: ["Field", "Value"], hideHeader: true }, "h2"),
    tableHtml({ ...(contract.annexC ?? {}), columns: ["Measure", "Status"] }, "h2"),
    tableHtml({ ...(contract.annexD ?? {}), columns: ["Name", "Service", "Location", "Date Authorised"] }, "h2"),
  ].filter(Boolean);

  const body = [
    sectionsHtml(sections, "h2"),
    executionHtml(String(contract.execution?.statement ?? "IN WITNESS WHEREOF, the Parties have executed this DPA by their duly authorised representatives."), parties, ""),
    annexes.length ? `<section class="fi-annexes">${annexes.join("\n")}</section>` : "",
    ...addenda.map((a) => addendumHtml(a, parties)),
    opts.scheduleHtml ? `<section class="fi-schedule">${opts.scheduleHtml}</section>` : "",
  ].filter(Boolean).join("\n");

  const fills = countFills(body);
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>${escHtml(opts.title)}</title>
<style>${FI_CSS}${DPA_CSS}</style></head><body>
${cover}
${completionBannerHtml(fills)}
${body}
</body></html>`;
}
