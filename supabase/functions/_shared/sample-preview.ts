// Truncated sample previews (approved scope 2026-09-04).
//
// Public sample pages show only the opening portion of a published document
// plus a table of contents of the withheld section titles. The cut is made
// HERE, at publish time, and only the cut result is exposed to anon — the
// withheld text never reaches the browser.
//
// DOC 183 (2026-09-04) — aligned with the fleet's report changes of the
// preceding days:
//   • Syllabus & Record products (docs 170–178) carry their Determination
//     Syllabus as PAGE ONE — a projection that already lists the record's
//     determinations, conditions and the Supporting Assessment Record map.
//     A preview of such a document keeps the syllabus (it IS the contents
//     page) and one page of sections after it, and adds NO second table of
//     contents; the boundary line still reports how many sections follow.
//   • The DPA (doc 182) and the formal-instrument Notices (docs 180/181)
//     use numbered ALL-CAPS headings ("1. PARTIES AND RECITALS"), annexes
//     and attached addenda. The prose splitter recognises numbered headings,
//     and a document outline (the DPA's structured contract, or the outline
//     captured from a notice's HTML) supplies the table of contents for the
//     PDF-page previews.

/** ~2 printed pages of body text. */
export const PREVIEW_CHAR_BUDGET = 4500;
export const PREVIEW_MIN_SECTIONS = 1;
export const PREVIEW_MAX_SECTIONS = 3;
/** After a Syllabus page one: ~1 printed page of sections, never more than two. */
export const PREVIEW_CHAR_BUDGET_AFTER_SYLLABUS = 2250;
export const PREVIEW_MAX_SECTIONS_AFTER_SYLLABUS = 2;

/** The Syllabus & Record page-one projection's type tag (_shared/prose/syllabus.ts). */
export const SYLLABUS_TYPED = "syllabus@sr-2026-09-04";

export type TocEntry = { title: string; index: number };

export type PreviewResult = {
  preview_document_text: string | null;
  preview_report_data: Record<string, unknown> | null;
  preview_toc: TocEntry[];
  withheld_section_count: number;
  /** True when page one of the kept document already carries the contents (a Syllabus). */
  page_one_has_contents: boolean;
};

type SkeletonParagraph = { kind?: string; text?: string; table?: unknown };
type SkeletonSection = { id?: string; title?: string; paragraphs?: SkeletonParagraph[] };
type SkeletonDocument = { title?: string; sections?: SkeletonSection[]; syllabus?: unknown; [k: string]: unknown };

function isSkeleton(v: unknown): v is SkeletonDocument {
  const d = v as SkeletonDocument | null;
  return !!d && typeof d === "object" && Array.isArray(d.sections) && d.sections.length > 0 &&
    typeof d.title === "string";
}

/** True when the skeleton carries the persisted Syllabus & Record page one. */
export function hasSyllabus(doc: unknown): boolean {
  const s = (doc as { syllabus?: { _typed?: unknown } } | null)?.syllabus;
  return !!s && typeof s === "object" && (s as { _typed?: unknown })._typed === SYLLABUS_TYPED;
}

function sectionLength(sec: SkeletonSection): number {
  let n = (sec.title ?? "").length;
  for (const p of sec.paragraphs ?? []) {
    n += (p.text ?? "").length;
    if (p.table) n += JSON.stringify(p.table).length / 4;
  }
  return Math.round(n);
}

export type KeepOpts = { budget?: number; max?: number; min?: number };

/**
 * How many leading sections to keep: whole sections only, stop once the
 * budget is exceeded, always at least MIN and never more than MAX.
 */
export function keepCount(lengths: number[], opts: KeepOpts = {}): number {
  const budget = opts.budget ?? PREVIEW_CHAR_BUDGET;
  const max = opts.max ?? PREVIEW_MAX_SECTIONS;
  const min = opts.min ?? PREVIEW_MIN_SECTIONS;
  let used = 0;
  let kept = 0;
  for (const len of lengths) {
    if (kept >= max) break;
    if (kept >= min && used + len > budget) break;
    used += len;
    kept += 1;
  }
  return Math.max(min, Math.min(kept, lengths.length));
}

/**
 * Cut a skeleton document, preserving every non-section key (syllabus,
 * title…). With a Syllabus page one the section budget is one page and the
 * returned TOC is empty — the syllabus already lists the record.
 */
export function cutSkeleton(doc: SkeletonDocument): { doc: SkeletonDocument; toc: TocEntry[]; withheld: number; pageOneHasContents: boolean } {
  const sections = (doc.sections ?? []) as SkeletonSection[];
  const syllabus = hasSyllabus(doc);
  const kept = keepCount(
    sections.map(sectionLength),
    syllabus ? { budget: PREVIEW_CHAR_BUDGET_AFTER_SYLLABUS, max: PREVIEW_MAX_SECTIONS_AFTER_SYLLABUS } : {},
  );
  const withheld = sections.slice(kept);
  const toc: TocEntry[] = syllabus ? [] : withheld.map((s, i) => ({
    title: (s.title ?? "").trim() || `Section ${kept + i + 1}`,
    index: kept + i + 1,
  }));
  return { doc: { ...doc, sections: sections.slice(0, kept) }, toc, withheld: withheld.length, pageOneHasContents: syllabus };
}

type ProseSection = { heading: string | null; body: string };

// A heading line: optional markdown hashes, an optional "N." or "N.N" clause
// number, then an ALL-CAPS title (annex/schedule/addendum titles included),
// optionally followed by " — subtitle".
const PROSE_HEADING_RE = /^(?:#{1,3}\s+)?((?:\d{1,2}\.\s+)?[A-Z][A-Z\s\(\)\/0-9,\.—–-]*[A-Z\)](?:\s+[—–-]\s+.+)?)$/;

function isHeadingLine(line: string): string | null {
  const trimmed = line.trim();
  if (!trimmed || trimmed.length > 140) return null;
  const m = PROSE_HEADING_RE.exec(trimmed);
  if (!m) return null;
  const head = m[1].trim();
  // "1.1 This Data Processing…" (a clause) is mixed case and never matches;
  // a bare number line or a line of only punctuation is not a heading.
  if (!/[A-Z]{2,}/.test(head.replace(/^\d{1,2}\.\s+/, ""))) return null;
  return head;
}

/**
 * Prose splitter — the Deno twin of AssessmentReport.splitSections, so a
 * prose preview cuts on exactly the headings the reader sees. Numbered
 * headings (the DPA's "1. PARTIES AND RECITALS") are headings too.
 */
export function splitProseSections(text: string): ProseSection[] {
  const lines = text.replace(/\r\n/g, "\n").split("\n");
  const out: ProseSection[] = [];
  let current: ProseSection = { heading: null, body: "" };
  for (const line of lines) {
    const head = isHeadingLine(line);
    if (head) {
      if (current.heading || current.body.trim()) out.push(current);
      current = { heading: head, body: "" };
    } else {
      current.body += (current.body ? "\n" : "") + line;
    }
  }
  if (current.heading || current.body.trim()) out.push(current);
  return out;
}

function renderProse(sections: ProseSection[]): string {
  return sections
    .map((s) => (s.heading ? `${s.heading}\n${s.body}` : s.body))
    .join("\n")
    .trim();
}

export function cutProse(text: string): { text: string; toc: TocEntry[] } {
  const sections = splitProseSections(text);
  if (sections.length <= 1) {
    // No headings to cut on — keep the budget's worth of leading paragraphs.
    const blocks = text.split(/\n{2,}/);
    const keptBlocks: string[] = [];
    let used = 0;
    for (const b of blocks) {
      if (keptBlocks.length > 0 && used + b.length > PREVIEW_CHAR_BUDGET) break;
      keptBlocks.push(b);
      used += b.length;
    }
    return { text: keptBlocks.join("\n\n").trim(), toc: [] };
  }
  const kept = keepCount(sections.map((s) => (s.heading ?? "").length + s.body.length));
  const toc: TocEntry[] = sections
    .slice(kept)
    .map((s, i) => ({ title: (s.heading ?? "").trim(), index: kept + i + 1 }))
    .filter((e) => e.title.length > 0);
  return { text: renderProse(sections.slice(0, kept)), toc };
}

// ── Document outlines (the TOC for PDF-page previews) ─────────────────────

/**
 * The heading outline of a rendered HTML document (the formal-instrument
 * Notices number their sections as <h2>). Captured by save-sample-report at
 * generation time into `report_data.document_outline`; the preview's table
 * of contents for a PDF-page preview.
 */
export function extractHtmlOutline(html: string): string[] {
  const out: string[] = [];
  const re = /<h2\b[^>]*>([\s\S]*?)<\/h2>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(String(html ?? ""))) !== null) {
    const text = m[1]
      .replace(/<[^>]+>/g, "")
      .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, " ")
      .replace(/&middot;/g, "·").replace(/&sect;/g, "§").replace(/&mdash;/g, "—")
      .replace(/\s+/g, " ")
      .trim();
    if (text) out.push(text);
  }
  return out;
}

const OUTLINE_SMALL_WORDS = new Set(["and", "or", "of", "the", "in", "for", "to", "a", "an", "on", "as", "by", "with"]);
const OUTLINE_ACRONYMS = new Set(["CCPA", "CPRA", "GDPR", "EEA", "EU", "UK", "US", "SCC", "SCCS", "DPA", "ICO", "IDTA", "TOMS"]);

/** Display form of an ALL-CAPS heading ("4. DATA PROCESSING — OBLIGATIONS" → "4. Data Processing — Obligations"). */
export function outlineTitle(h: string): string {
  const s = String(h ?? "").trim();
  if (s !== s.toUpperCase()) return s;
  return s.replace(/\S+/g, (word, offset) => {
    if (/^\d+\.$/.test(word)) return word;
    const bare = word.replace(/[^A-Za-z]/g, "");
    if (bare && OUTLINE_ACRONYMS.has(bare)) return word;
    if (/^[A-Z]+\/[A-Z]+$/.test(word)) return word;
    const lower = word.toLowerCase();
    if (offset !== 0 && OUTLINE_SMALL_WORDS.has(lower.replace(/[^a-z]/g, ""))) return lower;
    return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
  });
}

type ContractLike = {
  sections?: Array<{ heading?: string }>;
  annexA?: { title?: string }; annexB?: { title?: string }; annexC?: { title?: string }; annexD?: { title?: string };
  addenda?: Array<{ title?: string }>;
};

/**
 * The finished document's outline, when the row carries one: the DPA's
 * structured contract (doc 182 `dpa_contract`) or the heading outline a
 * file-driven sample captured from its HTML at generation time
 * (`report_data.document_outline`). Empty when neither exists.
 */
export function documentOutline(reportData: Record<string, unknown> | null | undefined): TocEntry[] {
  const rd = reportData ?? null;
  const contract = rd?.dpa_contract as ContractLike | undefined;
  if (contract && Array.isArray(contract.sections) && contract.sections.length) {
    const titles: string[] = [];
    for (const s of contract.sections) if (s?.heading) titles.push(outlineTitle(String(s.heading)));
    titles.push("Execution");
    for (const a of [contract.annexA, contract.annexB, contract.annexC, contract.annexD]) if (a?.title) titles.push(String(a.title));
    for (const a of contract.addenda ?? []) if (a?.title) titles.push(String(a.title));
    return titles.map((title, i) => ({ title, index: i + 1 }));
  }
  const outline = rd?.document_outline;
  if (Array.isArray(outline)) {
    return outline
      .map((t) => String(t ?? "").trim())
      .filter((t) => t.length > 0)
      .map((title, i) => ({ title: outlineTitle(title), index: i + 1 }));
  }
  return [];
}

/**
 * Build the preview payload for one sample row. `report_data` keys other
 * than `skeleton_document` are dropped from the public projection — the
 * public renderer only ever reads the skeleton or the prose text.
 */
export function buildPreview(row: {
  document_text?: string | null;
  report_data?: Record<string, unknown> | null;
}): PreviewResult {
  const rd = row.report_data ?? null;
  const sk = rd?.skeleton_document;

  if (isSkeleton(sk)) {
    const { doc, toc, withheld, pageOneHasContents } = cutSkeleton(sk);
    return {
      preview_document_text: null,
      preview_report_data: { skeleton_document: doc },
      preview_toc: toc,
      withheld_section_count: withheld,
      page_one_has_contents: pageOneHasContents,
    };
  }

  if (typeof sk === "string" && sk.trim().length > 0) {
    const { text, toc } = cutProse(sk);
    return {
      preview_document_text: null,
      preview_report_data: { skeleton_document: text },
      preview_toc: toc,
      withheld_section_count: toc.length,
      page_one_has_contents: false,
    };
  }

  const prose = (row.document_text ?? "").trim();
  if (prose.length > 0) {
    const { text, toc } = cutProse(prose);
    return {
      preview_document_text: text,
      preview_report_data: null,
      preview_toc: toc,
      withheld_section_count: toc.length,
      page_one_has_contents: false,
    };
  }

  // File-driven samples (RoPA, notices): nothing to cut here; the preview
  // PDF carries the truncated deliverable and the captured outline (if any)
  // supplies the contents.
  return {
    preview_document_text: null,
    preview_report_data: null,
    preview_toc: documentOutline(rd),
    withheld_section_count: 0,
    page_one_has_contents: false,
  };
}
