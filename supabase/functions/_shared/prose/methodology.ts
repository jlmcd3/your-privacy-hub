/**
 * ITEM 337 (PROSE PROGRAM 1 of 4, Part C) — METHODOLOGY NARRATION OUT OF BODY.
 *
 * Methodology sentences ("Each element above is drawn from the assessment
 * record. Where the record is silent…") belong in ONE closing note per report,
 * not inside customer narrative paragraphs. This module strips them from
 * narrative fields and returns the canonical note for single-point rendering.
 *
 * Pure. Never throws.
 */

import { splitSentencesSafe, rejoinSentences } from "./segment.ts";

export const METHODOLOGY_VERSION = "prose-methodology-2026-08-01-item337";

export const METHODOLOGY_NOTE =
  "Methodology: each element in this report is drawn from the assessment record supplied by the business. " +
  "Where the record is silent, the report says so and names the missing input rather than inferring an answer. " +
  "Statutory text is quoted verbatim from the pinned regulatory corpus.";

/** Sentence-level signatures of methodology narration. */
const METHODOLOGY_PATTERNS: readonly RegExp[] = [
  /each element (above|in this (report|section)) is drawn from the assessment record/i,
  /where the record is silent/i,
  /this (section|report) (is|was) (assembled|composed) from the assessment record/i,
  /no element (here|above) is inferred beyond the record/i,
  /elements? (are|is) drawn from the (assessment )?record(\s|,|\.)/i,
];

export function isMethodologySentence(s: string): boolean {
  const t = String(s ?? "").trim();
  if (!t) return false;
  return METHODOLOGY_PATTERNS.some((re) => re.test(t));
}

/** Remove methodology sentences from one narrative string. */
export function stripMethodologySentences(text: unknown): { text: string; removed: number } {
  const raw = typeof text === "string" ? text : "";
  if (!raw.trim()) return { text: raw, removed: 0 };
  const parts = splitSentencesSafe(raw);
  const kept = parts.filter((p) => !isMethodologySentence(p));
  return { text: rejoinSentences(kept), removed: parts.length - kept.length };
}

/**
 * Walk a report object, strip methodology narration from every string leaf,
 * and — when anything was removed OR `always` is set — attach the single
 * closing note at `methodology_note`.
 */
export function applyMethodologyNote(
  report: Record<string, unknown> | null | undefined,
  opts: { always?: boolean; noteKey?: string; writeNote?: boolean } = {},
): { removed: number; note_attached: boolean } {
  if (!report || typeof report !== "object") return { removed: 0, note_attached: false };
  const noteKey = opts.noteKey ?? "methodology_note";
  let removed = 0;

  const walk = (node: unknown): void => {
    if (Array.isArray(node)) {
      for (let i = 0; i < node.length; i++) {
        const v = node[i];
        if (typeof v === "string") {
          const r = stripMethodologySentences(v);
          if (r.removed > 0) {
            removed += r.removed;
            node[i] = r.text;
          }
        } else walk(v);
      }
      return;
    }
    if (node && typeof node === "object") {
      const o = node as Record<string, unknown>;
      for (const k of Object.keys(o)) {
        if (k === noteKey) continue;
        const v = o[k];
        if (typeof v === "string") {
          const r = stripMethodologySentences(v);
          if (r.removed > 0) {
            removed += r.removed;
            o[k] = r.text;
          }
        } else walk(v);
      }
    }
  };

  try {
    walk(report);
  } catch {
    return { removed, note_attached: false };
  }

  const attach = opts.always === true || removed > 0;
  // ITEM 390 (FIX 2-ii) — LAW 3 SINGLE WRITER. Callers that own the note
  // through the section-shard registry pass `writeNote: false`: the strip
  // still runs, but the note itself is written by the assembler's single
  // registry-driven write site. `note_attached` still reports the decision so
  // exit telemetry is byte-unchanged.
  if (attach && opts.writeNote !== false) {
    (report as Record<string, unknown>)[noteKey] = METHODOLOGY_NOTE;
  }
  return { removed, note_attached: attach };
}
