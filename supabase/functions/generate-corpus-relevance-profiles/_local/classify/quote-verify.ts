// DOC 191 §6.2 stage 2 — MECHANICAL QUOTE VERIFICATION.
//
// "The returned quote is checked as a real substring of the excerpt before
// anything else happens — a hallucinated or paraphrased 'quote' fails this
// check automatically and the row falls back to `pattern`."
//
// Same discipline cam-pins.test.ts already applies to CamRow.pinned_excerpt:
// a claim that text came from a source is worth nothing until the text is
// found in the source. Normalisation is deliberately narrow — whitespace and
// case only. Punctuation is NOT normalised away: a "quote" that matches only
// after its punctuation is rewritten is a paraphrase, and §6.3's own worked
// example of a stage-2 failure is exactly "the verbatim-quote check let a
// paraphrase through".

/** Whitespace-collapsed, case-folded. Nothing else. */
export function normaliseForQuoteCheck(s: string): string {
  return s
    .replace(/[   ]/g, " ")
    // Typographic quotes/dashes are rendering variants of the same character,
    // not a rewrite of the author's words.
    .replace(/[‘’‛]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

export interface QuoteVerification {
  readonly verified: boolean;
  /** Which source field the quote was found in, when it was. */
  readonly found_in: string | null;
  readonly reason: string;
}

/** Minimum length for a quote to count. A three-word "quote" matches almost
 *  any excerpt by accident and proves nothing. */
export const MIN_QUOTE_CHARS = 25;

/**
 * Verify `quote` is a real substring of at least one of `sources`.
 * `sources` is an ordered list of [label, text] pairs — the excerpt first,
 * so the label reports the strongest provenance available.
 */
export function verifyQuote(
  quote: string | null | undefined,
  sources: readonly (readonly [string, string | null | undefined])[],
): QuoteVerification {
  if (!quote || quote.trim() === "") {
    return { verified: false, found_in: null, reason: "no quote returned" };
  }
  const trimmed = quote.trim();
  if (trimmed.length < MIN_QUOTE_CHARS) {
    return {
      verified: false,
      found_in: null,
      reason: `quote is shorter than the ${MIN_QUOTE_CHARS}-character minimum (${trimmed.length}) — too short to establish anything`,
    };
  }
  const needle = normaliseForQuoteCheck(trimmed);
  if (needle === "") {
    return { verified: false, found_in: null, reason: "quote normalises to empty" };
  }
  for (const [label, text] of sources) {
    if (!text) continue;
    if (normaliseForQuoteCheck(text).includes(needle)) {
      return { verified: true, found_in: label, reason: `verbatim substring of ${label}` };
    }
  }
  return {
    verified: false,
    found_in: null,
    reason: "quote is not a verbatim substring of any source field — treated as a paraphrase or hallucination",
  };
}
