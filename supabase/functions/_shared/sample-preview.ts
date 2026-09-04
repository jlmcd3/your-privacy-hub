// Truncated sample previews (approved scope 2026-09-04).
//
// Public sample pages show only the opening portion of a published document
// plus a table of contents of the withheld section titles. The cut is made
// HERE, at publish time, and only the cut result is exposed to anon — the
// withheld text never reaches the browser.

/** ~2 printed pages of body text. */
export const PREVIEW_CHAR_BUDGET = 4500;
export const PREVIEW_MIN_SECTIONS = 1;
export const PREVIEW_MAX_SECTIONS = 3;

export type TocEntry = { title: string; index: number };

export type PreviewResult = {
  preview_document_text: string | null;
  preview_report_data: Record<string, unknown> | null;
  preview_toc: TocEntry[];
  withheld_section_count: number;
};

type SkeletonParagraph = { kind?: string; text?: string; table?: unknown };
type SkeletonSection = { id?: string; title?: string; paragraphs?: SkeletonParagraph[] };
type SkeletonDocument = { title?: string; sections?: SkeletonSection[]; [k: string]: unknown };

function isSkeleton(v: unknown): v is SkeletonDocument {
  const d = v as SkeletonDocument | null;
  return !!d && typeof d === "object" && Array.isArray(d.sections) && d.sections.length > 0 &&
    typeof d.title === "string";
}

function sectionLength(sec: SkeletonSection): number {
  let n = (sec.title ?? "").length;
  for (const p of sec.paragraphs ?? []) {
    n += (p.text ?? "").length;
    if (p.table) n += JSON.stringify(p.table).length / 4;
  }
  return Math.round(n);
}

/**
 * How many leading sections to keep: whole sections only, stop once the
 * budget is exceeded, always at least MIN and never more than MAX.
 */
export function keepCount(lengths: number[]): number {
  let used = 0;
  let kept = 0;
  for (const len of lengths) {
    if (kept >= PREVIEW_MAX_SECTIONS) break;
    if (kept >= PREVIEW_MIN_SECTIONS && used + len > PREVIEW_CHAR_BUDGET) break;
    used += len;
    kept += 1;
  }
  return Math.max(PREVIEW_MIN_SECTIONS, Math.min(kept, lengths.length));
}

/** Cut a skeleton document, preserving every non-section key (syllabus, title…). */
export function cutSkeleton(doc: SkeletonDocument): { doc: SkeletonDocument; toc: TocEntry[] } {
  const sections = (doc.sections ?? []) as SkeletonSection[];
  const kept = keepCount(sections.map(sectionLength));
  const toc: TocEntry[] = sections.slice(kept).map((s, i) => ({
    title: (s.title ?? "").trim() || `Section ${kept + i + 1}`,
    index: kept + i + 1,
  }));
  return { doc: { ...doc, sections: sections.slice(0, kept) }, toc };
}

type ProseSection = { heading: string | null; body: string };

/**
 * Prose splitter — the Deno twin of AssessmentReport.splitSections, so a
 * prose preview cuts on exactly the headings the reader sees.
 */
export function splitProseSections(text: string): ProseSection[] {
  const lines = text.replace(/\r\n/g, "\n").split("\n");
  const out: ProseSection[] = [];
  let current: ProseSection = { heading: null, body: "" };
  for (const line of lines) {
    const m = /^(?:#{1,3}\s+)?([A-Z][A-Z\s\(\)\/0-9,\.]+(?:\s+[—–-]\s+.+)?)$/.exec(line);
    if (m) {
      if (current.heading || current.body.trim()) out.push(current);
      current = { heading: m[1].trim(), body: "" };
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
    const { doc, toc } = cutSkeleton(sk);
    return {
      preview_document_text: null,
      preview_report_data: { skeleton_document: doc },
      preview_toc: toc,
      withheld_section_count: toc.length,
    };
  }

  if (typeof sk === "string" && sk.trim().length > 0) {
    const { text, toc } = cutProse(sk);
    return {
      preview_document_text: null,
      preview_report_data: { skeleton_document: text },
      preview_toc: toc,
      withheld_section_count: toc.length,
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
    };
  }

  // File-driven samples (RoPA, notices): nothing to cut here; the preview
  // PDF carries the truncated deliverable.
  return {
    preview_document_text: null,
    preview_report_data: null,
    preview_toc: [],
    withheld_section_count: 0,
  };
}
