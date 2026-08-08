// ─────────────────────────────────────────────────────────────────────────────
// ITEM 409 — BIOMETRIC REFERENCE-PASSAGE DISCIPLINE.
//
// THE HARD RULE OF THIS PRODUCT: every statutory passage rendered as template
// MUST byte-match the corpus row its citation names, and the citation must name
// the row the bytes actually come from.
//
// This module does not COPY any passage. Copying is how ITEM 388 happened — a
// registry entry drifted to curly quotes while citing a straight-quoted row,
// because the bytes lived in two places. Here the bytes live in exactly one
// place inside the codebase (the duty registry, which is itself script-extracted
// from `provision_texts`) and this module is the ASSERTION layer over them:
//
//   • `toReferencePassages`      — adapts duty rows into passages.
//   • `checkPassageShape`        — boot-time self-consistency (no corpus needed).
//   • `checkPassagesAgainstCorpus` — the byte-match against the cited rows.
//   • `checkPassagesSurviveAssembly` — the same bytes, asserted through a
//                                      fully assembled document string.
//
// If a passage and its cited row disagree, callers STOP and report. Nothing in
// this file ever edits a corpus row, and nothing here ever "normalises" a
// passage into agreement — that would hide the drift it exists to find.
// ─────────────────────────────────────────────────────────────────────────────

export const BIOMETRIC_REFERENCE_PASSAGE_VERSION =
  "biometric-reference-passages-2026-08-08-item409";

export interface ReferencePassage {
  /** Stable duty id, e.g. `us_il_bipa.s15a_policy`. */
  readonly id: string;
  /** The `provision_texts.key` the bytes are claimed to come from. */
  readonly corpus_key: string;
  /** The citation printed next to the passage on a reader surface. */
  readonly citation: string;
  /** The pinpoint printed next to the passage on a reader surface. */
  readonly pinpoint: string;
  /** The rendered bytes. Must be an exact substring of the cited corpus row. */
  readonly bytes: string;
}

export type PassageDriftReason =
  | "empty_bytes"
  | "empty_corpus_key"
  | "empty_citation"
  | "missing_corpus_row"
  | "not_substring_of_cited_row"
  | "smart_quote_drift"
  | "whitespace_drift"
  | "assembled_bytes_altered";

export interface PassageDrift {
  readonly id: string;
  readonly corpus_key: string;
  readonly reason: PassageDriftReason;
  readonly detail: string;
}

/** The minimal duty-row shape this layer needs. Structural, not nominal. */
export interface DutyRowLike {
  readonly id: string;
  readonly citation: string;
  readonly pinpoint: string;
  readonly verbatim_quote: string;
  readonly corpus_key: string;
}

export function toReferencePassages(
  rows: readonly DutyRowLike[],
): readonly ReferencePassage[] {
  return rows.map((r) => ({
    id: r.id,
    corpus_key: r.corpus_key,
    citation: r.citation,
    pinpoint: r.pinpoint,
    bytes: r.verbatim_quote,
  }));
}

// ── (a) BOOT-TIME SELF-CONSISTENCY ──────────────────────────────────────────
// Runs without the corpus, so the finalize seam can assert it on every boot.

const SMART_QUOTES = /[\u2018\u2019\u201C\u201D]/;

export function checkPassageShape(
  passages: readonly ReferencePassage[],
): readonly PassageDrift[] {
  const out: PassageDrift[] = [];
  for (const p of passages) {
    if (!p.bytes || !p.bytes.trim()) {
      out.push({ id: p.id, corpus_key: p.corpus_key, reason: "empty_bytes", detail: "passage has no bytes" });
      continue;
    }
    if (!p.corpus_key || !p.corpus_key.trim()) {
      out.push({ id: p.id, corpus_key: p.corpus_key, reason: "empty_corpus_key", detail: "passage cites no corpus row" });
    }
    if (!p.citation || !p.citation.trim()) {
      out.push({ id: p.id, corpus_key: p.corpus_key, reason: "empty_citation", detail: "passage carries no citation" });
    }
    if (/\s{2,}|^\s|\s$/.test(p.bytes)) {
      out.push({
        id: p.id,
        corpus_key: p.corpus_key,
        reason: "whitespace_drift",
        detail: "passage has leading, trailing or collapsed-double whitespace; corpus rows carry neither",
      });
    }
  }
  return out;
}

// ── (b) THE BYTE-MATCH AGAINST THE CITED CORPUS ROW ─────────────────────────

/** `corpus`: `provision_texts.key` → `verbatim_excerpt`. */
export function checkPassagesAgainstCorpus(
  passages: readonly ReferencePassage[],
  corpus: Readonly<Record<string, string>>,
): readonly PassageDrift[] {
  const out: PassageDrift[] = [];
  for (const p of passages) {
    const row = corpus[p.corpus_key];
    if (typeof row !== "string") {
      out.push({
        id: p.id,
        corpus_key: p.corpus_key,
        reason: "missing_corpus_row",
        detail: `citation names \`${p.corpus_key}\`, which is not in the corpus supplied`,
      });
      continue;
    }
    if (row.includes(p.bytes)) continue;

    // Drift. Classify it so the report can say WHICH side is wrong.
    const quoteFolded = fold(p.bytes);
    if (SMART_QUOTES.test(p.bytes) !== SMART_QUOTES.test(row) && fold(row).includes(quoteFolded)) {
      out.push({
        id: p.id,
        corpus_key: p.corpus_key,
        reason: "smart_quote_drift",
        detail:
          "passage and cited row differ only in quote characters — the ITEM 388 failure. The PASSAGE is wrong; the corpus row is never edited.",
      });
      continue;
    }
    if (fold(row).includes(quoteFolded)) {
      out.push({
        id: p.id,
        corpus_key: p.corpus_key,
        reason: "whitespace_drift",
        detail: "passage matches the cited row only after whitespace/quote folding",
      });
      continue;
    }
    out.push({
      id: p.id,
      corpus_key: p.corpus_key,
      reason: "not_substring_of_cited_row",
      detail: `passage is not a substring of \`${p.corpus_key}\`: ${JSON.stringify(p.bytes.slice(0, 120))}`,
    });
  }
  return out;
}

function fold(s: string): string {
  return s
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/\s+/g, " ")
    .trim();
}

// ── (c) THE SAME BYTES, THROUGH A FULLY ASSEMBLED DOCUMENT ──────────────────

/**
 * For every passage that the assembled document appears to render, require the
 * EXACT bytes. "Appears to render" is decided on the folded form, so a passage
 * that assembly has re-quoted or re-spaced is caught rather than skipped.
 */
export function checkPassagesSurviveAssembly(
  assembled: string,
  passages: readonly ReferencePassage[],
): readonly PassageDrift[] {
  const foldedDoc = fold(assembled);
  const out: PassageDrift[] = [];
  for (const p of passages) {
    if (!p.bytes) continue;
    const present = foldedDoc.includes(fold(p.bytes));
    if (!present) continue; // not rendered in this document — nothing to assert
    if (assembled.includes(p.bytes)) continue;
    out.push({
      id: p.id,
      corpus_key: p.corpus_key,
      reason: "assembled_bytes_altered",
      detail:
        "assembly rendered this passage but altered its bytes (quotes, whitespace or casing). Reference passages pass through assembly untouched.",
    });
  }
  return out;
}

// ── (d) THE STOP CONDITION ──────────────────────────────────────────────────

export function formatDrift(drift: readonly PassageDrift[]): string {
  return drift.map((d) => `  ${d.id} [${d.corpus_key}] ${d.reason}: ${d.detail}`).join("\n");
}

/** Throws on drift. Used at the boot seam and in tests. */
export function assertNoDrift(drift: readonly PassageDrift[], where: string): void {
  if (!drift.length) return;
  throw new Error(
    `REFERENCE-PASSAGE DRIFT (${where}) — ${drift.length} passage(s):\n${formatDrift(drift)}`,
  );
}
