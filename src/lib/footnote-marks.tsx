// Web-side twin of `supabase/functions/_shared/report-exhibits/footnote-engine.ts`
// and its render-layer consumer in `supabase/functions/generate-report-pdf/
// index.ts` (`substituteFootnoteMarkers`, `toaAnchorId`) — same pattern as
// `toa-lines.ts` being the web twin of the server's `toaLines`.
//
// The server embeds a footnote reference as a plain-text token — the
// footnote number wrapped in U+0001 (SOH) — directly in skeleton_document
// paragraph text, because that text is escaped identically wherever it's
// rendered (PDF via HTML-escaping, here via React's own text-node escaping)
// and the sentinel survives that untouched either way. The PDF renderer
// substitutes it for real `<sup><a>` markup after escaping; this is the same
// substitution for the in-app preview, so the two surfaces show identical
// footnote markers rather than the PDF being the only surface where the ToA
// / endnote feature actually works.
//
// No other product's skeleton_document ever contains this sentinel, so this
// is a no-op (renders unchanged) for every other product's text.
import type { ReactNode } from "react";

const FOOTNOTE_MARK = String.fromCharCode(1);
const FOOTNOTE_MARKER_RE = new RegExp(`${FOOTNOTE_MARK}(\\d+)${FOOTNOTE_MARK}`, "g");

/**
 * Split `text` on embedded footnote-marker tokens, returning the original
 * text with each marker replaced by a superscript link to its Table of
 * Authorities anchor. Returns a plain string unchanged (not an array) when
 * no marker is present, so callers can drop this in without extra branching.
 */
export function renderWithFootnotes(text: string): ReactNode {
  if (!text || !text.includes(FOOTNOTE_MARK)) return text;
  const nodes: ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  FOOTNOTE_MARKER_RE.lastIndex = 0;
  let key = 0;
  while ((match = FOOTNOTE_MARKER_RE.exec(text)) !== null) {
    if (match.index > lastIndex) nodes.push(text.slice(lastIndex, match.index));
    const n = match[1];
    nodes.push(
      <sup key={`fn-${key++}`}>
        <a href={`#toa-fn-${n}`} className="text-[hsl(var(--cobalt))] no-underline hover:underline">
          {n}
        </a>
      </sup>,
    );
    lastIndex = FOOTNOTE_MARKER_RE.lastIndex;
  }
  if (lastIndex < text.length) nodes.push(text.slice(lastIndex));
  return nodes;
}

/**
 * Mirrors `generate-report-pdf/index.ts`'s `toaAnchorId`: a Table of
 * Authorities line the admt-v2 assembler numbered ("3. 11 CCR § 7220(c)(1)
 * …") gets an anchor id matching the body markers above target. Lines with
 * no leading "N. " (every other product) pass through unchanged, id null.
 */
export function toaAnchorId(line: string): { id: string | null; rest: string } {
  const m = /^(\d+)\.\s+(.*)$/.exec(line);
  if (!m) return { id: null, rest: line };
  return { id: `toa-fn-${m[1]}`, rest: `${m[1]}. ${m[2]}` };
}
