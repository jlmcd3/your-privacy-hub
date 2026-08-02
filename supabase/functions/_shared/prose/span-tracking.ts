// ITEM 363 (cppa-risk PROSE REVISION) — SPAN TRACKING.
//
// STYLE RULE (CEO): no quotation marks around intake-derived values.
//
// The quotation marks were never decoration: they were the DELIMITERS the
// leak-prevention checks and the Pass-2R validators used to tell what the
// company wrote from what the tool wrote. This module replaces the delimiter
// while keeping the guarantee.
//
// A record-derived span is wrapped, during composition and frame realization,
// in three private-use sentinels that carry the source path with them:
//
//     U+E000  <source-path>  U+E002  <verbatim value>  U+E001
//
// The sentinels are invisible to every downstream text operation that the
// prose pipeline performs (they are not whitespace and not punctuation), and
// they are stripped exactly once, at the very end, by `extractSpans` — which
// hands back the clean prose plus machine-readable offsets for every
// record-derived span in it.
//
// VERBATIM FIDELITY IS UNCHANGED: the value between the sentinels is the
// company's own text, byte-for-byte. Only the visible delimiter is gone.

export const SPAN_TRACKING_VERSION = "prose-span-tracking-2026-08-01-item363";

export const SPAN_START = "\uE000";
export const SPAN_SEP = "\uE002";
export const SPAN_END = "\uE001";

const SENTINELS = /[\uE000\uE001\uE002]/g;

export interface RecordSpan {
  /** Record path the value came from (intake key or engine value path). */
  readonly source: string;
  /** The company's own text, byte-for-byte. */
  readonly value: string;
  /** Offsets into the CLEAN text. */
  readonly start: number;
  readonly end: number;
}

/**
 * Mark `value` as record-derived. Returns the value with tracking sentinels
 * around it; the sentinels never reach a reader.
 */
export function rec(value: unknown, source: string): string {
  const v = value === null || value === undefined ? "" : String(value);
  if (!v.trim()) return "";
  return `${SPAN_START}${source}${SPAN_SEP}${v}${SPAN_END}`;
}

/** True when the text still carries tracking sentinels. */
export function isMarked(text: string): boolean {
  return /[\uE000\uE001\uE002]/.test(String(text ?? ""));
}

/** Remove every sentinel without collecting offsets. */
export function stripSpanMarks(text: string): string {
  return String(text ?? "").replace(SENTINELS, "");
}

/**
 * Strip the sentinels and return the clean prose plus the offsets of every
 * record-derived span within it. Unbalanced sentinels are dropped rather than
 * thrown on: a defective mark must never destroy a customer document.
 */
export function extractSpans(text: string): { text: string; spans: RecordSpan[] } {
  const src = String(text ?? "");
  let out = "";
  const spans: RecordSpan[] = [];
  let i = 0;
  while (i < src.length) {
    const ch = src[i];
    if (ch !== SPAN_START) {
      if (ch !== SPAN_END && ch !== SPAN_SEP) out += ch;
      i += 1;
      continue;
    }
    const sep = src.indexOf(SPAN_SEP, i + 1);
    const end = src.indexOf(SPAN_END, sep + 1);
    if (sep === -1 || end === -1) {
      i += 1;
      continue;
    }
    const source = src.slice(i + 1, sep);
    const inner = src.slice(sep + 1, end);
    const cleanedInner = inner.replace(SENTINELS, "");
    const start = out.length;
    out += cleanedInner;
    if (cleanedInner) {
      spans.push({ source, value: cleanedInner, start, end: out.length });
    }
    i = end + 1;
  }
  return { text: out, spans };
}

/** Convenience: every distinct record path referenced by a set of spans. */
export function spanSources(spans: readonly RecordSpan[]): string[] {
  return Array.from(new Set(spans.map((s) => s.source))).sort();
}
