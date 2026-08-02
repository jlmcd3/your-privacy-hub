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

export const SPAN_TRACKING_VERSION = "prose-span-tracking-2026-08-02-item368";

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
  // Sentinels are stripped from the value and the source path FIRST: a record
  // value that itself contained a sentinel would otherwise nest and, under the
  // Item 368(1) hard fail, blow up a render over data we can safely clean.
  const v = (value === null || value === undefined ? "" : String(value)).replace(SENTINELS, "");
  source = String(source ?? "").replace(SENTINELS, "");
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
 * ITEM 368(1) — SENTINEL-BALANCE HARD FAIL.
 *
 * A malformed mark means the composer lost track of what the company wrote.
 * Silently dropping it produces prose that LOOKS clean while the verbatim
 * guarantee is gone — the worst possible failure for a legal deliverable.
 * Extraction therefore throws; callers treat it as build-blocking.
 */
export class UnbalancedSentinelError extends Error {
  readonly kind: SentinelDefect["kind"];
  readonly index: number;
  constructor(defect: SentinelDefect) {
    super(`unbalanced span sentinel: ${defect.kind} at index ${defect.index}`);
    this.name = "UnbalancedSentinelError";
    this.kind = defect.kind;
    this.index = defect.index;
  }
}

export interface SentinelDefect {
  readonly kind:
    | "start_without_separator"
    | "start_without_end"
    | "separator_outside_span"
    | "end_without_start"
    | "nested_start";
  readonly index: number;
}

/**
 * Every structural sentinel defect in `text`, in order. Empty = well formed.
 * Shared by `extractSpans` (which throws on the first) and the style lint
 * (which reports them all on any text that reaches it pre-extraction).
 */
export function auditSentinels(text: string): SentinelDefect[] {
  const src = String(text ?? "");
  const defects: SentinelDefect[] = [];
  let i = 0;
  while (i < src.length) {
    const ch = src[i];
    if (ch === SPAN_SEP) {
      defects.push({ kind: "separator_outside_span", index: i });
      i += 1;
      continue;
    }
    if (ch === SPAN_END) {
      defects.push({ kind: "end_without_start", index: i });
      i += 1;
      continue;
    }
    if (ch !== SPAN_START) {
      i += 1;
      continue;
    }
    const sep = src.indexOf(SPAN_SEP, i + 1);
    const end = src.indexOf(SPAN_END, i + 1);
    if (sep === -1 || (end !== -1 && end < sep)) {
      defects.push({ kind: "start_without_separator", index: i });
      i += 1;
      continue;
    }
    if (end === -1) {
      defects.push({ kind: "start_without_end", index: i });
      i += 1;
      continue;
    }
    const nested = src.indexOf(SPAN_START, i + 1);
    if (nested !== -1 && nested < end) {
      defects.push({ kind: "nested_start", index: nested });
      i += 1;
      continue;
    }
    i = end + 1;
  }
  return defects;
}

/**
 * Strip the sentinels and return the clean prose plus the offsets of every
 * record-derived span within it.
 *
 * THROWS `UnbalancedSentinelError` on any malformed mark (Item 368(1)).
 */
export function extractSpans(text: string): { text: string; spans: RecordSpan[] } {
  const src = String(text ?? "");
  const defects = auditSentinels(src);
  if (defects.length) throw new UnbalancedSentinelError(defects[0]);

  let out = "";
  const spans: RecordSpan[] = [];
  let i = 0;
  while (i < src.length) {
    const ch = src[i];
    if (ch !== SPAN_START) {
      out += ch;
      i += 1;
      continue;
    }
    const sep = src.indexOf(SPAN_SEP, i + 1);
    const end = src.indexOf(SPAN_END, sep + 1);
    const source = src.slice(i + 1, sep);
    const inner = src.slice(sep + 1, end);
    const start = out.length;
    out += inner;
    if (inner) spans.push({ source, value: inner, start, end: out.length });
    i = end + 1;
  }
  return { text: out, spans };
}


/** Convenience: every distinct record path referenced by a set of spans. */
export function spanSources(spans: readonly RecordSpan[]): string[] {
  return Array.from(new Set(spans.map((s) => s.source))).sort();
}
