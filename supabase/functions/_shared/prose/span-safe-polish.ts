/**
 * ITEM 368(4) — SPAN-SAFE POLISH PASS (cppa-risk only, OFF by default).
 *
 * A narrow readability pass over ALREADY-COMPOSED, ALREADY-SPAN-TRACKED prose
 * (post frame-render / plan-render). It exists to improve connective tissue,
 * sentence rhythm and transitions — nothing else.
 *
 * THE STRUCTURAL GUARANTEE (non-negotiable, and the reason this module exists
 * rather than a prompt rule):
 *
 *   The rewriter is NEVER GIVEN, and has NO CODE PATH THAT CAN WRITE INTO, the
 *   text of a tracked span. The section is split at the extracted span offsets
 *   into EDITABLE SEGMENTS (the plain text between spans). Only segments are
 *   handed to the rewriter, one at a time, and only segment text is replaced.
 *   Span values are re-inserted verbatim from the original `RecordSpan.value`
 *   during reassembly. Even a rewriter that returned the span's own text, or
 *   an adversarial rewriter that returned sentinels, cannot change a single
 *   byte inside a span: spans are not part of its input or its output slot.
 *
 * VALIDATION AFTER THE FACT (Pass-2R pattern, reused conceptually):
 *   every candidate is re-run through the FULL style-lint battery — all
 *   fourteen Item 363 rules plus the Item 368 `unbalanced_sentinel` rule — and
 *   any finding the deterministic text did not already carry rejects the
 *   candidate. There is no exemption and no per-rule waiver.
 *
 * FALLBACK LAW: any rejection, throw, timeout or empty output ships the
 * deterministic text unchanged. Polish never blocks or degrades delivery.
 *
 * ROLLOUT: shipped OFF. `SPAN_SAFE_POLISH_FLAGS` has cppa-risk in `shadow`
 * with `enabled: false`; nothing in the live render path calls this module
 * yet. A before/after sample goes to the CEO before any flag moves.
 */

import type { RecordSpan } from "./span-tracking.ts";
import { stripSpanMarks } from "./span-tracking.ts";
import {
  lintDocumentStyle,
  type LintableSection,
  type StyleFinding,
  type StyleLintOptions,
} from "./style-lint.ts";

export const SPAN_SAFE_POLISH_VERSION = "prose-span-safe-polish-2026-08-02-item368";

// ---------------------------------------------------------------------------
// ROLLOUT FLAGS — all off. Scope for Item 368 is cppa-risk only.
// ---------------------------------------------------------------------------

export interface SpanSafePolishFlag {
  /** Master switch. False = the pass never runs for this product. */
  readonly enabled: boolean;
  /** "shadow" records a candidate and ALWAYS ships deterministic text. */
  readonly mode: "shadow" | "live";
  readonly authority: string;
}

export const SPAN_SAFE_POLISH_FLAGS: Readonly<Record<string, SpanSafePolishFlag>> = {
  "cppa-risk": {
    enabled: false,
    mode: "shadow",
    authority: "Item 368(4) — observe-only pending CEO before/after review",
  },
};

export function spanSafePolishEnabledFor(product: string): boolean {
  return Boolean(SPAN_SAFE_POLISH_FLAGS[product]?.enabled);
}

export function spanSafePolishShipsFor(product: string): boolean {
  const f = SPAN_SAFE_POLISH_FLAGS[product];
  return Boolean(f?.enabled && f.mode === "live");
}

// ---------------------------------------------------------------------------
// SEGMENTATION — the mechanism that makes span mutation impossible
// ---------------------------------------------------------------------------

export interface EditableSegment {
  /** Index of this segment among the editable segments of the section. */
  readonly index: number;
  /** Offsets into the CLEAN section text. */
  readonly start: number;
  readonly end: number;
  readonly text: string;
  /** Source path of the span immediately before / after, when there is one. */
  readonly preceding_span?: string;
  readonly following_span?: string;
}

/** Spans, normalised: in order, clipped to the text, non-overlapping. */
function orderedSpans(text: string, spans: readonly RecordSpan[]): RecordSpan[] {
  const out: RecordSpan[] = [];
  let cursor = 0;
  for (const sp of [...spans].sort((a, b) => a.start - b.start)) {
    const start = Math.max(cursor, Math.min(sp.start, text.length));
    const end = Math.max(start, Math.min(sp.end, text.length));
    if (end <= start) continue;
    out.push({ ...sp, start, end });
    cursor = end;
  }
  return out;
}

/** The plain-text regions OUTSIDE every tracked span. */
export function editableSegments(
  text: string,
  spans: readonly RecordSpan[],
): EditableSegment[] {
  const ordered = orderedSpans(text, spans);
  const segments: EditableSegment[] = [];
  let cursor = 0;
  let index = 0;
  for (let i = 0; i < ordered.length; i++) {
    const sp = ordered[i];
    if (sp.start > cursor) {
      segments.push({
        index: index++,
        start: cursor,
        end: sp.start,
        text: text.slice(cursor, sp.start),
        ...(i > 0 ? { preceding_span: ordered[i - 1].source } : {}),
        following_span: sp.source,
      });
    }
    cursor = sp.end;
  }
  if (cursor < text.length) {
    segments.push({
      index: index++,
      start: cursor,
      end: text.length,
      text: text.slice(cursor),
      ...(ordered.length ? { preceding_span: ordered[ordered.length - 1].source } : {}),
    });
  }
  return segments;
}

/**
 * Rebuild the section from rewritten segments plus the ORIGINAL span values,
 * and return the new text with recomputed span offsets.
 *
 * `rewritten[i]` corresponds to `segments[i]`. Anything the rewriter returns
 * is sentinel-stripped before it is used; a null/undefined entry keeps the
 * original segment.
 */
export function reassemble(
  text: string,
  spans: readonly RecordSpan[],
  segments: readonly EditableSegment[],
  rewritten: ReadonlyArray<string | null | undefined>,
): { text: string; spans: RecordSpan[] } {
  const ordered = orderedSpans(text, spans);
  const pieces: Array<{ kind: "segment"; i: number } | { kind: "span"; i: number }> = [];
  let si = 0;
  let gi = 0;
  let cursor = 0;
  while (si < ordered.length || gi < segments.length) {
    const nextSeg = segments[gi];
    const nextSpan = ordered[si];
    if (nextSeg && nextSeg.start === cursor) {
      pieces.push({ kind: "segment", i: gi });
      cursor = nextSeg.end;
      gi++;
      continue;
    }
    if (nextSpan && nextSpan.start === cursor) {
      pieces.push({ kind: "span", i: si });
      cursor = nextSpan.end;
      si++;
      continue;
    }
    // Defensive: offsets disagree with the text; take whatever comes first.
    if (nextSeg && (!nextSpan || nextSeg.start < nextSpan.start)) {
      pieces.push({ kind: "segment", i: gi });
      cursor = nextSeg.end;
      gi++;
    } else if (nextSpan) {
      pieces.push({ kind: "span", i: si });
      cursor = nextSpan.end;
      si++;
    } else break;
  }

  let out = "";
  const newSpans: RecordSpan[] = [];
  for (const p of pieces) {
    if (p.kind === "segment") {
      const proposed = rewritten[p.i];
      const seg = segments[p.i];
      const value = proposed === null || proposed === undefined
        ? seg.text
        : stripSpanMarks(String(proposed));
      out += value;
    } else {
      const sp = ordered[p.i];
      const start = out.length;
      out += sp.value; // VERBATIM — never sourced from the rewriter.
      newSpans.push({ source: sp.source, value: sp.value, start, end: out.length });
    }
  }
  return { text: out, spans: newSpans };
}

// ---------------------------------------------------------------------------
// THE PASS
// ---------------------------------------------------------------------------

export interface PolishSegmentCall {
  readonly section_id: string;
  readonly segment: EditableSegment;
  /** Rejection reason from the previous attempt, if any (retry framing). */
  readonly rejectReason?: string;
}

/** Provider seam. Receives ONLY segment text; can never see span content. */
export type SegmentRewriteFn = (call: PolishSegmentCall) => Promise<string | null>;

export interface SpanSafePolishOptions {
  readonly product: string;
  readonly rewrite: SegmentRewriteFn;
  readonly lint?: StyleLintOptions;
  /** Force the pass to run regardless of the flag (tests / calibration only). */
  readonly force?: boolean;
  readonly maxAttempts?: number;
}

export interface SectionPolishResult {
  readonly section_id: string;
  /** What the caller must ship. */
  readonly text: string;
  readonly spans: readonly RecordSpan[];
  /** The candidate produced, whether or not it shipped (shadow evidence). */
  readonly candidate: string | null;
  readonly shipped_surface: "deterministic" | "polished";
  readonly ran: boolean;
  readonly accepted: boolean;
  readonly reject_findings: readonly StyleFinding[];
  readonly skipped_reason?: "flag_off" | "no_editable_segments" | "empty_input" | "error";
  readonly error?: string;
}

export interface SpanSafePolishResult {
  readonly version: string;
  readonly product: string;
  readonly mode: "off" | "shadow" | "live";
  readonly sections: readonly SectionPolishResult[];
}

function keyOf(f: StyleFinding): string {
  return `${f.rule}|${f.section_id}|${f.detail}`;
}

/**
 * Run the pass over a whole document. Returns, per section, the text the
 * caller must ship. In shadow mode the shipped text is ALWAYS the
 * deterministic input; the candidate is returned for review only.
 */
export async function runSpanSafePolish(
  sections: readonly LintableSection[],
  opts: SpanSafePolishOptions,
): Promise<SpanSafePolishResult> {
  const flag = SPAN_SAFE_POLISH_FLAGS[opts.product];
  const enabled = opts.force === true || Boolean(flag?.enabled);
  const ships = opts.force !== true && Boolean(flag?.enabled && flag.mode === "live");
  const mode: "off" | "shadow" | "live" = !enabled ? "off" : (ships ? "live" : "shadow");

  if (!enabled) {
    return {
      version: SPAN_SAFE_POLISH_VERSION,
      product: opts.product,
      mode,
      sections: sections.map((s) => ({
        section_id: s.section_id,
        text: s.text,
        spans: s.spans ?? [],
        candidate: null,
        shipped_surface: "deterministic" as const,
        ran: false,
        accepted: false,
        reject_findings: [],
        skipped_reason: "flag_off" as const,
      })),
    };
  }

  // Baseline findings on the DETERMINISTIC document. A candidate may not add
  // any finding; pre-existing ones are not the polish pass's to fix.
  const baseline = new Set(lintDocumentStyle(sections, opts.lint ?? {}).map(keyOf));
  const maxAttempts = Math.max(1, opts.maxAttempts ?? 2);
  const results: SectionPolishResult[] = [];

  for (const section of sections) {
    const text = section.text ?? "";
    const spans = section.spans ?? [];
    const deterministic: SectionPolishResult = {
      section_id: section.section_id,
      text,
      spans,
      candidate: null,
      shipped_surface: "deterministic",
      ran: false,
      accepted: false,
      reject_findings: [],
    };

    if (!text.trim()) {
      results.push({ ...deterministic, skipped_reason: "empty_input" });
      continue;
    }
    const segments = editableSegments(text, spans);
    if (!segments.length) {
      results.push({ ...deterministic, skipped_reason: "no_editable_segments" });
      continue;
    }

    let rejectReason: string | undefined;
    let last: SectionPolishResult = { ...deterministic, ran: true };

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      let candidate: { text: string; spans: RecordSpan[] };
      try {
        const rewritten: Array<string | null> = [];
        for (const segment of segments) {
          rewritten.push(
            await opts.rewrite({ section_id: section.section_id, segment, rejectReason }),
          );
        }
        candidate = reassemble(text, spans, segments, rewritten);
      } catch (e) {
        last = {
          ...deterministic,
          ran: true,
          skipped_reason: "error",
          error: (e as Error)?.message ?? String(e),
        };
        break;
      }

      // FULL battery on the candidate document, section swapped in place.
      const candidateDoc = sections.map((s) =>
        s.section_id === section.section_id
          ? { ...s, text: candidate.text, spans: candidate.spans }
          : s
      );
      const findings = lintDocumentStyle(candidateDoc, opts.lint ?? {});
      const added = findings.filter((f) => !baseline.has(keyOf(f)));

      // Belt and braces: the verbatim guarantee is structural, but it is also
      // asserted. A candidate that lost a span value can never ship.
      const lostSpan = spans.length !== candidate.spans.length ||
        spans.some((sp, i) =>
          candidate.spans[i]?.value !== sp.value || candidate.spans[i]?.source !== sp.source
        );

      if (!added.length && !lostSpan) {
        last = {
          section_id: section.section_id,
          text: ships ? candidate.text : text,
          spans: ships ? candidate.spans : spans,
          candidate: candidate.text,
          shipped_surface: ships ? "polished" : "deterministic",
          ran: true,
          accepted: true,
          reject_findings: [],
        };
        break;
      }

      rejectReason = lostSpan
        ? "a record-derived value was lost or altered; reproduce every value exactly"
        : added.slice(0, 4).map((f) => `${f.rule}: ${f.detail}`).join(" | ");
      last = {
        ...deterministic,
        ran: true,
        candidate: candidate.text,
        accepted: false,
        reject_findings: added,
      };
    }

    results.push(last);
  }

  return {
    version: SPAN_SAFE_POLISH_VERSION,
    product: opts.product,
    mode,
    sections: results,
  };
}
