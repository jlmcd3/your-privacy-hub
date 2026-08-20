// ITEM SO-12 — SHARED FOOTNOTE / ENDNOTE ENGINE (fleet component; piloted on
// cppa-admt-v2, per doc 38's scoping).
//
// Companion to authority-exhibit.ts. That module already builds the Table of
// Authorities (citation + verbatim corpus text where approved). This module
// adds the other half: numbering each distinct authority in first-appearance
// order and giving callers a placeholder-token mechanism to mark, inside
// already-composed prose, where a superscript footnote reference belongs.
//
// WHY A PLACEHOLDER TOKEN, NOT LITERAL HTML: skeleton_document paragraph text
// is plain text — the PDF renderer (generate-report-pdf) HTML-escapes it on
// the way to the page, which would neuter any literal `<sup><a>` markup
// embedded here. The token below survives escaping (it contains no HTML
// metacharacters) and is substituted for real markup by the renderer AFTER
// escaping, in a small product-gated branch — see
// `generate-report-pdf/index.ts`'s `skeletonSectionsHtml`.
//
// This module knows nothing about HTML, PDF, or any particular product's
// render pipeline. It is pure text/data: given the citations a document
// actually emits, assign footnote numbers and expose lookup + substitution
// helpers. The render-layer decision (what the marker looks like on the
// page) lives entirely in the PDF renderer, not here.

import { baseSection, formatCitation, type AuthorityExhibit } from "./authority-exhibit.ts";

/** Guaranteed absent from any real document text; delimits an inline marker. */
const MARK = "";

/** `{N}` — survives HTML-escaping untouched (no `<`, `>`, `&`, `"`). */
export function footnoteToken(n: number): string {
  return `${MARK}${n}${MARK}`;
}

export const FOOTNOTE_TOKEN_RE = /(\d+)/g;

export interface FootnoteIndex {
  version: string;
  /** citation (any pinpoint form) -> footnote number, keyed on its base section. */
  numberOf(citation: string): number | null;
  /** footnote number -> the ToA entry's anchor id, for the render layer to link to. */
  anchorFor(n: number): string | null;
  /** Total distinct footnotes assigned. */
  count: number;
}

export const FOOTNOTE_ENGINE_VERSION = "footnote-engine-so12-2026-08-20";

/** `11 CCR § 7220(c)(1)` -> `toa-11-ccr-7220`. Stable, URL/id-safe, one per base section. */
export function anchorIdFor(baseCitation: string): string {
  const slug = normalizeSection(baseCitation)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return `toa-${slug || "authority"}`;
}

function normalizeSection(citation: string): string {
  return String(citation || "")
    .replace(/§/g, "section")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

/**
 * Build the numbering index from an already-assembled AuthorityExhibit
 * (`buildAuthorityExhibit`'s output). Entries are numbered in the exhibit's
 * own order — which is authority-class order, then alphabetical — NOT
 * first-appearance order in the body. This matches how a citation-manual
 * Table of Authorities is conventionally numbered (grouped and sorted, not
 * scattered in reading order) and means the numbering is stable across a
 * refinement pass that reorders sentences without changing which
 * authorities are cited.
 */
export function buildFootnoteIndex(exhibit: AuthorityExhibit): FootnoteIndex {
  const byBase = new Map<string, number>();
  const anchorByNumber = new Map<number, string>();
  let n = 0;
  for (const entry of exhibit.entries) {
    n += 1;
    const key = normalizeSection(entry.citation);
    byBase.set(key, n);
    anchorByNumber.set(n, anchorIdFor(entry.citation));
  }
  return {
    version: FOOTNOTE_ENGINE_VERSION,
    count: n,
    numberOf(citation: string): number | null {
      // `byBase` is keyed on `entry.citation`, which buildAuthorityExhibit
      // already ran through formatCitation() (e.g. "11 CCR § 7200" ->
      // "Cal. Code Regs. tit. 11, § 7200"). A caller here always passes the
      // raw, unformatted citation shape the deterministic engine emits, so
      // the same transform must be applied before lookup or a CCR citation
      // (virtually all of this product's authorities) never matches.
      const base = baseSection(String(citation || ""));
      const v = byBase.get(normalizeSection(formatCitation(base)));
      return v ?? null;
    },
    anchorFor(num: number): string | null {
      return anchorByNumber.get(num) ?? null;
    },
  };
}

/**
 * Append a footnote-marker token for `citation` to the end of `sentence`
 * (before trailing punctuation is preserved as-is; the marker goes at the
 * very end of the string handed in — callers pass one sentence/clause at a
 * time). No-op (returns `sentence` unchanged) when the citation has no
 * assigned footnote number, so a citation-only reference to something the
 * exhibit never indexed never produces a dangling marker.
 */
export function withFootnoteMarker(sentence: string, citation: string, index: FootnoteIndex): string {
  const n = index.numberOf(citation);
  if (n === null) return sentence;
  return `${sentence}${footnoteToken(n)}`;
}

/**
 * CASE-B HELPER (free-text citation splicing — see doc 38 §3). Scans
 * `text` for citation-shaped substrings using the SAME detection regex
 * `authority-exhibit.ts` callers already use to build their exhibits
 * (centralized here so there is one detector, not one per product), and
 * appends a footnote-marker token immediately after each one found. A
 * citation with no assigned footnote number (e.g. it never made it into
 * the exhibit) is left untouched — never marked, never stripped.
 *
 * This is the ONLY function in the shared module that does text scanning;
 * Case-A products (citations already isolated in their own structured
 * field — see doc 38 §3) should call `withFootnoteMarker` directly at the
 * point they already render that field, not this scanner.
 */
export const CITATION_DETECT_RE =
  /(?:\d+\s*CCR|Cal\.\s*Civ\.\s*Code|GDPR)[^,;.)\]]*?§+\s*[\d.]+(?:\([a-z0-9]+\))*/gi;

export function injectFootnoteMarkers(text: string, index: FootnoteIndex): string {
  if (!text) return text;
  return text.replace(CITATION_DETECT_RE, (m) => {
    const n = index.numberOf(m);
    if (n === null) return m;
    return `${m}${footnoteToken(n)}`;
  });
}
