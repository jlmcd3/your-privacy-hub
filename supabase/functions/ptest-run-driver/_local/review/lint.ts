// /all-ptest v2 (DOC 261, 2026-09-14) — STAGE 1 DETERMINISTIC LINT.
//
// Ten presentation checks a program finds better than a model, run over the
// RENDERED skeleton document (sections → paragraphs → tables), never over the
// typed surfaces. Every rule has an id; every hit carries the section, a
// block key and the offending quote, so it can be fixed as a class-(d)
// presentation defect without a model review and deducted from the score
// directly (doc 261 §2, Stage 1).
//
// PURE. No model, no database, no clock: the same document and profile
// always produce the same hits, so lint can run at generation time (inside
// the product function), in the harness, and in the driver with one
// definition. Product specifics (registry coverage, by-design repeats,
// label pairs, the promise section) live in a LintProfile —
// see ./lint-profiles.ts — so this module stays product-agnostic and
// deployable from `_shared` without importing any function's `_local` tree.
//
// Rule set (doc 261 Rev 2, Stage 1 table):
//   L-XREF    every "Section N", "§ N.X", "Appendix X", "Step N" resolves to a
//             rendered heading; Arabic scheme only (Roman numerals are a hit)
//   L-QUOTE   every paragraph and table cell has balanced “ ” and an even
//             number of straight "
//   L-CITE    every 11 CCR / Cal. Civ. Code cite is well-formed and carries no
//             nested en-dash range; registry membership is checked for
//             11 CCR cites only, against the profile's registry sections
//             plus its allowlist (a miss is `review`, never `defect`)
//   L-PROMISE body → list direction only: a sentence that points the reader
//             to the Follow-Ups / Conditions / Recommendations must find a
//             non-empty list of that kind in the promise section
//   L-LABEL   the same status for the same area is identical across the
//             executive table, the body table and the appendix (profile pairs)
//   L-LEADIN  a paragraph ending in ":" is immediately followed by a table or
//             a list-shaped paragraph
//   L-ENUM    no raw enum tokens, intake keys, undefined/null/NaN, UUIDs or
//             unfilled template slots in customer text
//   L-DUP     no sentence rendered twice in one section, except the profile's
//             by-design repeat list
//   L-CELL    no table cell that is a colon lead-in; no empty cell outside the
//             profile's exempt tables (review)
//   L-DATE    approval / review / prior-assessment dates only: an approval
//             date earlier than the assessment date must carry the qualifier
//             sentence; "prior version" language needs a recorded prior date
//             (intake-gated; skipped when no intake is supplied)

import type { RenderedSkeletonDocument, RenderedTable } from "../../../_shared/prose/skeleton-render.ts";

export const LINT_VERSION = "ptest-lint@doc261-2026-09-14";

export type LintRuleId =
  | "L-XREF" | "L-QUOTE" | "L-CITE" | "L-PROMISE" | "L-LABEL"
  | "L-LEADIN" | "L-ENUM" | "L-DUP" | "L-CELL" | "L-DATE";

export const LINT_RULE_IDS: readonly LintRuleId[] = [
  "L-XREF", "L-QUOTE", "L-CITE", "L-PROMISE", "L-LABEL",
  "L-LEADIN", "L-ENUM", "L-DUP", "L-CELL", "L-DATE",
];

/** `defect` is a class-(d) presentation defect; `review` is a signal to look at (registry gap, empty cell). */
export type LintSeverity = "defect" | "review";

export interface LintHit {
  readonly rule: LintRuleId;
  readonly check: string;
  readonly severity: LintSeverity;
  readonly section_id: string;
  /** `${section_id}#p${i}` for a paragraph, the table's own key for a table cell. */
  readonly block_key: string;
  readonly quote: string;
  readonly detail: string;
}

export interface LintResult {
  readonly version: string;
  readonly product: string;
  readonly hits: readonly LintHit[];
  readonly by_rule: Readonly<Record<LintRuleId, number>>;
  readonly defects: number;
  readonly reviews: number;
}

export interface LabelPair {
  /** Human name for the hit detail. */
  readonly name: string;
  readonly a: { readonly table: string; readonly joinCol: number; readonly valueCol: number };
  readonly b: { readonly table: string; readonly joinCol: number; readonly valueCol: number };
  /** Optional join normaliser (e.g. prefix match for "Access" vs "Access and explanation"). */
  readonly joinMode?: "exact" | "prefix";
}

export interface PromiseSpec {
  /** The section the promises point to (e.g. iv_determination for § 4.D). */
  readonly section_id: string;
  /** Sentence patterns that constitute a promise, with the list kind they name in group 1. */
  readonly patterns: readonly RegExp[];
  /** List kinds and the heading each list opens with in the promise section. */
  readonly lists: Readonly<Record<string, RegExp>>;
}

export interface LintProfile {
  readonly product: string;
  /** 11 CCR section numbers the product's verified-authority registry covers. */
  readonly registrySections: readonly number[];
  /** 11 CCR sections legitimately cited without a registry row (definitions etc.). */
  readonly citeAllowlist: readonly number[];
  /** Sentences that repeat by design (rendered in more than one place on purpose). */
  readonly byDesignDuplicates: readonly RegExp[];
  readonly labelPairs: readonly LabelPair[];
  readonly promise?: PromiseSpec;
  /** Table keys where empty cells are the form (signature, cover, review). */
  readonly emptyCellExemptTables: readonly RegExp[];
  /** Product-specific consistency checks that need more than a table pair. */
  readonly customChecks?: readonly ((doc: RenderedSkeletonDocument, intake?: Bag) => LintHit[])[];
  /** Whether L-DATE applies (risk only today). */
  readonly dateRule?: {
    readonly approvalSection: string;
    readonly qualifier: RegExp;
    readonly priorLanguage: RegExp;
    readonly priorIntakeKey: string;
  };
}

type Bag = Record<string, unknown>;

// ── Text units ──────────────────────────────────────────────────────────────

interface Unit {
  readonly section_id: string;
  readonly block_key: string;
  readonly text: string;
  readonly kind: "paragraph" | "cell" | "table_title" | "table_note";
  readonly table?: RenderedTable;
  readonly row?: number;
  readonly col?: number;
}

function* units(doc: RenderedSkeletonDocument): Generator<Unit> {
  for (const s of doc.sections) {
    for (let i = 0; i < s.paragraphs.length; i++) {
      const p = s.paragraphs[i];
      if (p.table) {
        const t = p.table;
        if (t.title) yield { section_id: s.id, block_key: t.key, text: t.title, kind: "table_title", table: t };
        for (let r = 0; r < t.rows.length; r++) {
          const row = t.rows[r];
          for (let c = 0; c < row.length; c++) {
            yield { section_id: s.id, block_key: t.key, text: String(row[c] ?? ""), kind: "cell", table: t, row: r, col: c };
          }
        }
        if (t.note) yield { section_id: s.id, block_key: t.key, text: t.note, kind: "table_note", table: t };
      } else if (typeof p.text === "string" && p.text.trim()) {
        yield { section_id: s.id, block_key: `${s.id}#p${i}`, text: p.text, kind: "paragraph" };
      }
    }
  }
}

const clip = (s: string, n = 180): string => {
  const t = s.replace(/\s+/g, " ").trim();
  return t.length <= n ? t : `${t.slice(0, n - 1)}…`;
};

function hit(
  rule: LintRuleId, check: string, severity: LintSeverity, u: { section_id: string; block_key: string }, quote: string, detail: string,
): LintHit {
  return { rule, check, severity, section_id: u.section_id, block_key: u.block_key, quote: clip(quote), detail };
}

// ── L-XREF ──────────────────────────────────────────────────────────────────

interface Headings {
  sections: Set<number>;
  subsections: Set<string>; // "4.D"
  appendices: Set<string>;  // "B"
  steps: Set<number>;
  /** Roman-numbered section headings ("II. The Purpose Test") — the LIA
   *  scheme. When non-empty the document's own scheme is Roman and a
   *  "Section II" cross-reference is resolved against this set instead of
   *  being reported as a scheme mismatch (2026-09-18). */
  romanSections: Set<string>;
}

// Three heading schemes are rendered across the products (2026-09-18):
//   "4. Title"          — risk, admt, cyber (Arabic, dotted)
//   "Section 2 — Title" — dpia (Arabic, worded)
//   "II. Title"         — lia (Roman, dotted)
const SECTION_TITLE_RE = /^(\d{1,2})\.\s+\S/;
const SECTION_WORD_TITLE_RE = /^Section\s+(\d{1,2})\b/;
const ROMAN_TITLE_RE = /^([IVX]{1,5})\.\s+\S/;
const APPENDIX_TITLE_RE = /^Appendix\s+([A-Z])\b/;
const SUBSECTION_LEAD_RE = /^([A-Z])\.\s+[A-Z]/;
const STEP_LEAD_RE = /^Step\s+(\d{1,2})\b/;

function collectHeadings(doc: RenderedSkeletonDocument): Headings {
  const h: Headings = { sections: new Set(), subsections: new Set(), appendices: new Set(), steps: new Set(), romanSections: new Set() };
  for (const s of doc.sections) {
    const m = SECTION_TITLE_RE.exec(s.title) ?? SECTION_WORD_TITLE_RE.exec(s.title);
    const a = APPENDIX_TITLE_RE.exec(s.title);
    if (a) h.appendices.add(a[1]);
    const rm = ROMAN_TITLE_RE.exec(s.title);
    if (rm) h.romanSections.add(rm[1]);
    const n = m ? Number(m[1]) : null;
    if (n !== null) h.sections.add(n);
    for (const p of s.paragraphs) {
      if (p.table || typeof p.text !== "string") continue;
      const sub = SUBSECTION_LEAD_RE.exec(p.text);
      if (sub && n !== null) h.subsections.add(`${n}.${sub[1]}`);
      const st = STEP_LEAD_RE.exec(p.text);
      if (st) h.steps.add(Number(st[1]));
    }
  }
  return h;
}

// Internal cross-reference forms. Statutory sections are four digits and are
// never matched here (the 1–2 digit bound), so "Section 7152" is untouched.
const XREF_SUB_RE = /§§?\s?(\d{1,2})\.([A-Z])\b((?:\s?(?:,|and|through|to|–|-)\s?(?:§\s?)?\d{1,2}\.[A-Z]\b)*)/g;
const XREF_SUB_TAIL_RE = /(\d{1,2})\.([A-Z])\b/g;
const XREF_SECTION_RE = /\bSections?\s+(\d{1,2})\b(?![\d.]\d)((?:\s?(?:,|and|through|to|–|-)\s?\d{1,2}\b(?![\d.]\d))*)/g;
const XREF_SECTION_TAIL_RE = /\b(\d{1,2})\b/g;
const XREF_BARE_SECTION_RE = /§\s?(\d{1,2})\b(?![\d.]\d)(?!\.[A-Z])/g;
const XREF_APPENDIX_RE = /\bAppendi(?:x|ces)\s+([A-Z])\b((?:\s?(?:,|and|through|to|–|-)\s?[A-Z]\b)*)/g;
const XREF_APPENDIX_TAIL_RE = /\b([A-Z])\b/g;
const XREF_STEP_RE = /\bSteps?\s+(\d{1,2})\b((?:\s?(?:,|and|through|to|–|-)\s?\d{1,2}\b)*)/g;
// A Roman numeral followed by a TWO-level dotted pinpoint ("§ III.D.d" in a
// WP248 citation) is an external authority, never an internal
// cross-reference, so the negative lookahead leaves it alone; a one-level
// form ("§ IV.A") is still an internal reference and still fires (2026-09-18).
const XREF_ROMAN_RE = /\b(?:Section|Appendix|Part)\s+(?=[IVX]{2,}\b)([IVX]+)\b(?!\.[A-Za-z0-9]+\.[A-Za-z0-9])|§\s?(?=[IVX]{2,}\b)([IVX]+)\b(?!\.[A-Za-z0-9]+\.[A-Za-z0-9])/g;

function lintXref(doc: RenderedSkeletonDocument): LintHit[] {
  const h = collectHeadings(doc);
  const out: LintHit[] = [];
  for (const u of units(doc)) {
    const t = u.text;
    for (const m of t.matchAll(XREF_SUB_RE)) {
      const refs = [`${m[1]}.${m[2]}`, ...Array.from((m[3] ?? "").matchAll(XREF_SUB_TAIL_RE)).map((x) => `${x[1]}.${x[2]}`)];
      for (const r of refs) {
        if (!h.subsections.has(r)) out.push(hit("L-XREF", "unresolved_subsection", "defect", u, m[0], `§ ${r} names no rendered lettered heading`));
      }
    }
    for (const m of t.matchAll(XREF_SECTION_RE)) {
      const refs = [Number(m[1]), ...Array.from((m[2] ?? "").matchAll(XREF_SECTION_TAIL_RE)).map((x) => Number(x[1]))];
      for (const r of refs) {
        if (!h.sections.has(r)) out.push(hit("L-XREF", "unresolved_section", "defect", u, m[0], `Section ${r} names no rendered numbered section`));
      }
    }
    for (const m of t.matchAll(XREF_BARE_SECTION_RE)) {
      const r = Number(m[1]);
      if (!h.sections.has(r)) out.push(hit("L-XREF", "unresolved_section", "defect", u, m[0], `§ ${r} names no rendered numbered section`));
    }
    for (const m of t.matchAll(XREF_APPENDIX_RE)) {
      const refs = [m[1], ...Array.from((m[2] ?? "").matchAll(XREF_APPENDIX_TAIL_RE)).map((x) => x[1])];
      for (const r of refs) {
        if (!h.appendices.has(r)) out.push(hit("L-XREF", "unresolved_appendix", "defect", u, m[0], `Appendix ${r} names no rendered appendix`));
      }
    }
    if (h.steps.size) {
      for (const m of t.matchAll(XREF_STEP_RE)) {
        const r = Number(m[1]);
        if (!h.steps.has(r)) out.push(hit("L-XREF", "unresolved_step", "defect", u, m[0], `Step ${r} names no rendered step`));
      }
    }
    for (const m of t.matchAll(XREF_ROMAN_RE)) {
      const r = m[1] ?? m[2];
      if (h.romanSections.size) {
        // The document's own scheme is Roman: resolve, do not report a mismatch.
        if (!h.romanSections.has(r)) out.push(hit("L-XREF", "unresolved_section", "defect", u, m[0], `Section ${r} names no rendered Roman-numbered section`));
        continue;
      }
      out.push(hit("L-XREF", "roman_numeral_scheme", "defect", u, m[0], "Roman-numeral cross-reference; the rendered scheme is Arabic"));
    }
  }
  return out;
}

// ── L-QUOTE ─────────────────────────────────────────────────────────────────

const count = (s: string, ch: string): number => s.split(ch).length - 1;

function lintQuotes(doc: RenderedSkeletonDocument): LintHit[] {
  const out: LintHit[] = [];
  for (const u of units(doc)) {
    const open = count(u.text, "“");
    const close = count(u.text, "”");
    if (open !== close) out.push(hit("L-QUOTE", "unbalanced_curly", "defect", u, u.text, `${open} opening vs ${close} closing curly quotes`));
    const straight = count(u.text, '"');
    if (straight % 2 === 1) out.push(hit("L-QUOTE", "odd_straight", "defect", u, u.text, `${straight} straight double quotes (odd)`));
  }
  return out;
}

// ── L-CITE ──────────────────────────────────────────────────────────────────

// A pinpoint chain: (a)(1)(A)(iv) — lower-alpha up to 3 chars (7001 uses
// (ddd)), digits, upper-alpha, roman.
const PIN = String.raw`(?:\((?:[a-z]{1,3}|\d{1,2}|[A-Z]|[ivx]+)\))`;
// A CCR cite: "11 CCR § 7152(a)(5)" or a bare "§ 7152(a)(5)". A bare section
// followed by ".digit" is a Civil Code decimal section (§ 1798.140, § 3426.1)
// and is never a CCR cite; the CPPA regulations live in §§ 7000–7999.
const CCR_CITE_RE = new RegExp(
  String.raw`(?:11\s?CCR\s?)?§(§?)\s?(\d{4})(?!\.\d)(${PIN}*)((?:\s?[–-]\s?(?:§\s?)?(?:\d{4})?${PIN}*)?)`,
  "g",
);
const CIV_CODE_RE = /(?:Cal\.\s?Civ\.\s?Code|Civil Code|Civ\.\s?Code)\s?§§?\s?(\d{4}(?:\.\d+)?)((?:\([a-z0-9A-Z]{1,3}\))*)/g;
const BAD_CCR_FORMS: readonly [RegExp, string][] = [
  [/§\s?\d{4}\s?\(\s/g, "space inside a pinpoint parenthetical"],
  [/§\s?\d{4}(?:\([^)]*\))*\(\)/g, "empty pinpoint parenthetical"],
  [/11\s?CCR\s?§§?\s?\d{4}\.\d/g, "decimal section number in a CCR cite"],
  [/§\s?\d{3}\b(?!\d)(?!\.\d)/g, "three-digit CCR section"],
];
const CPPA_SECTION_MIN = 7000;
const CPPA_SECTION_MAX = 7999;

const pinDepth = (chain: string): number => (chain.match(/\(/g) ?? []).length;

function lintCites(doc: RenderedSkeletonDocument, profile: LintProfile): LintHit[] {
  const out: LintHit[] = [];
  const known = new Set<number>([...profile.registrySections, ...profile.citeAllowlist]);
  const seenMissing = new Set<string>();
  for (const u of units(doc)) {
    const t = u.text;
    for (const [re, why] of BAD_CCR_FORMS) {
      for (const m of t.matchAll(re)) out.push(hit("L-CITE", "malformed", "defect", u, m[0], why));
    }
    for (const m of t.matchAll(CCR_CITE_RE)) {
      const [, plural, section, chain, range] = m;
      const sec = Number(section);
      const isCppaReg = m[0].startsWith("11") || (sec >= CPPA_SECTION_MIN && sec <= CPPA_SECTION_MAX);
      if (!isCppaReg) continue; // a bare "§ 3426" etc. is not a CCR cite
      // Registry membership — 11 CCR only, review severity.
      if (!known.has(sec)) {
        const key = `${u.section_id}|${sec}`;
        if (!seenMissing.has(key)) {
          seenMissing.add(key);
          out.push(hit("L-CITE", "cite_not_in_registry", "review", u, m[0], `11 CCR § ${sec} has no row in the ${profile.product} registry (and is not allowlisted)`));
        }
      }
      if (range && range.trim()) {
        // "§ 7220(b)(2)–(3)" and "§§ 7150–7157" are fine; a right-hand side
        // that restates a full nested pinpoint ("(b)(3)–(b)(3)(A)") is the
        // malformed range class the ADMT output-role cite carried.
        const rhsChain = range.replace(/^\s?[–-]\s?(?:§\s?)?(?:\d{4})?/, "");
        const rhsSection = /\d{4}/.test(range);
        if (!rhsSection && pinDepth(rhsChain) > 1) {
          out.push(hit("L-CITE", "nested_range", "defect", u, m[0], "en-dash range whose right endpoint is a nested pinpoint; render as a list"));
        }
        if (rhsSection && chain) {
          out.push(hit("L-CITE", "range_with_pinpoint", "defect", u, m[0], "section range whose left endpoint carries a pinpoint"));
        }
      }
      if (plural) {
        // "§§" must introduce more than one cite: a range (of sections or of
        // pinpoints), a following ", 7xxx" / "and § 7xxx", or a pinpoint list.
        const after = t.slice((m.index ?? 0) + m[0].length, (m.index ?? 0) + m[0].length + 40);
        const isRange = (range ?? "").trim().length > 0;
        const hasList = /^\s?(?:,|and|&|;)\s?(?:§\s?)?\d{4}/.test(after) || /^\s?(?:,|and)\s?\(/.test(after);
        if (!isRange && !hasList) out.push(hit("L-CITE", "plural_single", "defect", u, m[0], "§§ introduces a single cite"));
      }
    }
    for (const m of t.matchAll(CIV_CODE_RE)) {
      if (!/^\d{4}\.\d+$/.test(m[1]) && !/^\d{4}$/.test(m[1])) out.push(hit("L-CITE", "malformed_civ_code", "defect", u, m[0], "Civil Code section form"));
    }
  }
  return out;
}

// ── L-PROMISE ───────────────────────────────────────────────────────────────

function lintPromises(doc: RenderedSkeletonDocument, profile: LintProfile): LintHit[] {
  const spec = profile.promise;
  if (!spec) return [];
  const sec = doc.sections.find((s) => s.id === spec.section_id);
  const secText = sec ? sec.paragraphs.filter((p) => !p.table).map((p) => p.text).join("\n") : "";
  const present: Record<string, boolean> = {};
  for (const [kind, re] of Object.entries(spec.lists)) present[kind] = re.test(secText);
  const out: LintHit[] = [];
  for (const u of units(doc)) {
    if (u.section_id === spec.section_id) continue; // body → list direction only
    for (const re of spec.patterns) {
      for (const m of u.text.matchAll(re)) {
        const kind = normaliseListKind(m[1] ?? "");
        if (!kind || !(kind in present)) continue;
        if (!present[kind]) {
          out.push(hit("L-PROMISE", "unkept_promise", "defect", u, m[0], `points the reader to the ${kind} but the ${spec.section_id} section renders no ${kind} list`));
        }
      }
    }
  }
  return out;
}

function normaliseListKind(s: string): string {
  const t = s.toLowerCase();
  if (t.startsWith("follow")) return "follow_ups";
  if (t.startsWith("condition")) return "conditions";
  if (t.startsWith("recommendation")) return "recommendations";
  return "";
}

// ── L-LABEL ─────────────────────────────────────────────────────────────────

function tableByKey(doc: RenderedSkeletonDocument, key: string): { table: RenderedTable; section_id: string } | null {
  for (const s of doc.sections) {
    for (const p of s.paragraphs) if (p.table && p.table.key === key) return { table: p.table, section_id: s.id };
  }
  return null;
}

const normLabel = (s: string): string =>
  s.replace(/\s*\([^)]*\)\s*$/, "").replace(/\s+/g, " ").trim().toLowerCase();
const normJoin = (s: string): string => s.replace(/\s+/g, " ").trim().toLowerCase();

function lintLabels(doc: RenderedSkeletonDocument, profile: LintProfile): LintHit[] {
  const out: LintHit[] = [];
  for (const pair of profile.labelPairs) {
    const A = tableByKey(doc, pair.a.table);
    const B = tableByKey(doc, pair.b.table);
    if (!A || !B) continue; // one side absent is a structure matter, not a label mismatch
    const bRows = B.table.rows.map((r) => ({ join: normJoin(String(r[pair.b.joinCol] ?? "")), value: String(r[pair.b.valueCol] ?? "") }));
    for (const r of A.table.rows) {
      const join = normJoin(String(r[pair.a.joinCol] ?? ""));
      const value = String(r[pair.a.valueCol] ?? "");
      const match = bRows.find((b) => pair.joinMode === "prefix" ? (join.startsWith(b.join) || b.join.startsWith(join)) : b.join === join);
      if (!match) continue;
      if (normLabel(value) !== normLabel(match.value)) {
        out.push(hit("L-LABEL", "status_mismatch", "defect", { section_id: A.section_id, block_key: pair.a.table }, `${r[pair.a.joinCol]} | ${value}`,
          `${pair.name}: "${value}" in ${pair.a.table} vs "${match.value}" in ${pair.b.table}`));
      }
    }
  }
  for (const check of profile.customChecks ?? []) out.push(...check(doc));
  return out;
}

// ── L-LEADIN ────────────────────────────────────────────────────────────────

const LIST_SHAPED_RE = /^\s*(?:\d{1,2}[.)]\s|[•\-–—]\s|\([a-z0-9]{1,3}\)\s|[A-Z][a-z]+\.\s|(?:Conditions|Follow-Ups|Recommendations)\.)/;
// A short numbered sub-heading line: "8.2 Required Assessment Follow-Up".
const HEADING_SHAPED_RE = /^\s*\d{1,2}\.\d{1,2}\s+[A-Z][^.:]{2,80}$/;
// A lettered sub-part opener: "G. Material privacy risks. …" (Risk) or "8.3 …".
const LETTERED_HEADING_RE = /^\s*(?:[A-Z]\.\s+[A-Z]|\d{1,2}\.\d{1,2}\s+[A-Z])/;

// Enumerated prose: a lead-in ("has identified the following:") answered by
// parallel paragraphs, one per item ("The consumer benefit …", "The business
// benefit …"). Two consecutive non-table paragraphs opening with the same
// first word are read as such a list.
function parallelItems(a?: { table?: unknown; text?: string }, b?: { table?: unknown; text?: string }): boolean {
  if (!a || !b || a.table || b.table) return false;
  const fa = /^\s*(\S+)/.exec(a.text ?? "")?.[1];
  const fb = /^\s*(\S+)/.exec(b.text ?? "")?.[1];
  return !!fa && fa === fb;
}

function lintLeadins(doc: RenderedSkeletonDocument): LintHit[] {
  const out: LintHit[] = [];
  for (const s of doc.sections) {
    s.paragraphs.forEach((p, i) => {
      if (p.table || typeof p.text !== "string") return;
      const text = p.text.trimEnd();
      if (!text.endsWith(":")) return;
      const next = s.paragraphs[i + 1];
      // A numbered sub-heading ("8.2 Required Assessment Follow-Up") that
      // itself introduces the table or list satisfies the lead-in
      // (2026-09-18, Product Test run 72e9a63c: ADMT § 8 renders "The
      // following tables list …:" → "8.2 …" → table, which is a table
      // announced by a heading, not a dangling lead-in).
      const after = s.paragraphs[i + 2];
      const headingThenList = !!next && !next.table && HEADING_SHAPED_RE.test(next.text ?? "") &&
        !!after && (!!after.table || LIST_SHAPED_RE.test(after.text ?? ""));
      // A one-item enumeration (2026-09-18, Product Test run 8e0f2e5c, Risk
      // thin-one variants): "Here, the Company has identified the following
      // benefits:" followed by ONE benefit paragraph when the record names
      // one benefit, then the next lettered sub-heading. parallelItems needs
      // two items; one item closed by the next heading (or the section end)
      // is still the list the lead-in announced.
      // Generalised 2026-09-19 (Product Test run 6001444d, Risk thin-one
      // a4-benefit variants): the T2 benefit paragraphs open "The consumer
      // benefit …" beside "No business benefit is identified …" when one
      // narrative is removed, so the first words no longer match and
      // parallelItems cannot see the list. A run of one to eight prose
      // paragraphs after the lead-in, closed by the next lettered sub-heading
      // or the section end, is the enumeration the lead-in announced.
      let runEnd = i + 1;
      while (runEnd < s.paragraphs.length) {
        const q = s.paragraphs[runEnd];
        if (q.table || typeof q.text !== "string") break;
        if (HEADING_SHAPED_RE.test(q.text) || LETTERED_HEADING_RE.test(q.text)) break;
        // Another lead-in ends the run and is not a closer: the items it
        // announces belong to it.
        if (q.text.trimEnd().endsWith(":")) break;
        runEnd += 1;
      }
      const runLength = runEnd - (i + 1);
      const closer = s.paragraphs[runEnd];
      const itemsThenHeading = runLength >= 1 && runLength <= 8 &&
        (!closer || (!closer.table && typeof closer.text === "string" && LETTERED_HEADING_RE.test(closer.text)));
      const ok = !!next && (!!next.table || LIST_SHAPED_RE.test(next.text ?? "") || parallelItems(next, s.paragraphs[i + 2]) || headingThenList || itemsThenHeading);
      if (!ok) {
        out.push(hit("L-LEADIN", "dangling_lead_in", "defect", { section_id: s.id, block_key: `${s.id}#p${i}` }, text.slice(-160),
          next ? "lead-in is followed by prose, not a table or list" : "lead-in is the last paragraph of its section"));
      }
    });
  }
  return out;
}

// ── L-ENUM ──────────────────────────────────────────────────────────────────

const ENUM_CHECKS: readonly [RegExp, string, string][] = [
  [/(?<![{$\w])[a-z][a-z0-9]*(?:_[a-z0-9]+){1,}\b/g, "snake_case_token", "raw enum / intake key in customer text"],
  [/\b[A-Z][A-Z0-9]*(?:_[A-Z0-9]+){1,}\b/g, "upper_snake_token", "raw UPPER_SNAKE token in customer text"],
  [/\b(?:undefined|NaN)\b|\bnull\b(?![a-z-])|\[object Object\]/g, "runtime_value_leak", "runtime value leaked into customer text"],
  [/\{\{[^}]*\}\}|\$\{[^}]*\}|\{[a-z_]+\}/g, "unfilled_slot", "unfilled template slot"],
  [/\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi, "uuid", "UUID in customer text"],
];
// Tokens that look snake_case but are legitimate customer text (URLs, emails, file names).
const ENUM_CONTEXT_EXEMPT_RE = /(?:https?:\/\/\S+|[\w.-]+@[\w.-]+\.\w+|\b[\w-]+\.(?:pdf|docx?|xlsx?|csv|json|txt|md)\b)/gi;

function lintEnums(doc: RenderedSkeletonDocument): LintHit[] {
  const out: LintHit[] = [];
  for (const u of units(doc)) {
    const scrubbed = u.text.replace(ENUM_CONTEXT_EXEMPT_RE, " ");
    for (const [re, check, why] of ENUM_CHECKS) {
      for (const m of scrubbed.matchAll(re)) {
        out.push(hit("L-ENUM", check, "defect", u, m[0], why));
      }
    }
  }
  return out;
}

// ── L-DUP ───────────────────────────────────────────────────────────────────

const SENTENCE_SPLIT_RE = /(?<=[.!?])\s+(?=[A-Z“"(])/;
const normSentence = (s: string): string => s.replace(/\s+/g, " ").trim().toLowerCase();

function lintDuplicates(doc: RenderedSkeletonDocument, profile: LintProfile): LintHit[] {
  const out: LintHit[] = [];
  for (const s of doc.sections) {
    const seen = new Map<string, string>(); // normalised → first block key
    s.paragraphs.forEach((p, i) => {
      const texts: { text: string; key: string }[] = [];
      if (p.table) {
        for (const row of p.table.rows) for (const cell of row) texts.push({ text: String(cell ?? ""), key: p.table.key });
      } else if (typeof p.text === "string") {
        texts.push({ text: p.text, key: `${s.id}#p${i}` });
      }
      for (const { text, key } of texts) {
        for (const raw of text.split(SENTENCE_SPLIT_RE)) {
          const sentence = raw.trim();
          if (sentence.length < 60) continue;
          if (profile.byDesignDuplicates.some((re) => re.test(sentence))) continue;
          const n = normSentence(sentence);
          const first = seen.get(n);
          if (first === undefined) { seen.set(n, key); continue; }
          if (first === key) continue; // same block repeating itself is caught by the reviewer, not here
          out.push(hit("L-DUP", "sentence_repeated", "defect", { section_id: s.id, block_key: key }, sentence, `also rendered at ${first} in the same section`));
        }
      }
    });
  }
  return out;
}

// ── L-CELL ──────────────────────────────────────────────────────────────────

function lintCells(doc: RenderedSkeletonDocument, profile: LintProfile): LintHit[] {
  const out: LintHit[] = [];
  for (const u of units(doc)) {
    if (u.kind !== "cell" || !u.table) continue;
    const t = u.text.trim();
    if (t.endsWith(":")) {
      out.push(hit("L-CELL", "colon_lead_in_cell", "defect", u, t, `row ${u.row! + 1}, column "${u.table.columns[u.col!] ?? u.col}" is a lead-in, not a value`));
      continue;
    }
    if (t === "" && (u.col ?? 0) > 0 && !profile.emptyCellExemptTables.some((re) => re.test(u.table!.key))) {
      out.push(hit("L-CELL", "empty_cell", "review", u, `${u.table.rows[u.row!]?.[0] ?? ""} | <empty>`, `row ${u.row! + 1}, column "${u.table.columns[u.col!] ?? u.col}" is empty`));
    }
  }
  return out;
}

// ── L-DATE ──────────────────────────────────────────────────────────────────

const ISO_RE = /\b(\d{4}-\d{2}-\d{2})\b/g;

function lintDates(doc: RenderedSkeletonDocument, profile: LintProfile, intake?: Bag): LintHit[] {
  const spec = profile.dateRule;
  if (!spec) return [];
  const out: LintHit[] = [];
  // Assessment date: first ISO date on the cover.
  const cover = doc.sections.find((s) => s.id === "cover");
  const coverText = cover ? cover.paragraphs.map((p) => p.table ? p.table.rows.map((r) => r.join(" ")).join("\n") : p.text).join("\n") : "";
  const assessmentDate = Array.from(coverText.matchAll(ISO_RE)).map((m) => m[1])[0];
  const sec = doc.sections.find((s) => s.id === spec.approvalSection);
  if (assessmentDate && sec) {
    sec.paragraphs.forEach((p, i) => {
      if (p.table || typeof p.text !== "string") return;
      if (!/\bapprov/i.test(p.text)) return;
      const dates = Array.from(p.text.matchAll(ISO_RE)).map((m) => m[1]);
      const earlier = dates.filter((d) => d < assessmentDate);
      if (earlier.length && !spec.qualifier.test(p.text)) {
        out.push(hit("L-DATE", "approval_before_assessment_unqualified", "defect", { section_id: sec.id, block_key: `${sec.id}#p${i}` }, p.text,
          `approval date ${earlier[0]} precedes the assessment date ${assessmentDate} without the qualifier sentence`));
      }
    });
  }
  if (intake) {
    const prior = String(intake[spec.priorIntakeKey] ?? "").trim();
    if (!prior) {
      for (const u of units(doc)) {
        for (const m of u.text.matchAll(spec.priorLanguage)) {
          out.push(hit("L-DATE", "prior_language_without_prior_date", "defect", u, m[0], `"${m[0]}" with no ${spec.priorIntakeKey} on the record`));
        }
      }
    }
  }
  return out;
}

// ── Entry point ─────────────────────────────────────────────────────────────

export function lintDocument(doc: RenderedSkeletonDocument, profile: LintProfile, intake?: Bag): LintResult {
  const hits: LintHit[] = [
    ...lintXref(doc),
    ...lintQuotes(doc),
    ...lintCites(doc, profile),
    ...lintPromises(doc, profile),
    ...lintLabels(doc, profile),
    ...lintLeadins(doc),
    ...lintEnums(doc),
    ...lintDuplicates(doc, profile),
    ...lintCells(doc, profile),
    ...lintDates(doc, profile, intake),
  ];
  const by_rule = Object.fromEntries(LINT_RULE_IDS.map((r) => [r, 0])) as Record<LintRuleId, number>;
  let defects = 0;
  let reviews = 0;
  for (const h of hits) {
    by_rule[h.rule] += 1;
    if (h.severity === "defect") defects += 1; else reviews += 1;
  }
  return { version: LINT_VERSION, product: profile.product, hits, by_rule, defects, reviews };
}

/** Severity weight for the composite score (doc 261 Stage 7): defects 2, reviews 0. */
export function lintScoreDeduction(r: LintResult): number {
  return r.defects * 2;
}
