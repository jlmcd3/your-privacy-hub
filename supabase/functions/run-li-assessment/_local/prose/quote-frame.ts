// ITEM 399 (FIX 3 + R11 rule 2) — STATUTE QUOTE FRAMES THAT PARSE.
//
// THE DEFECT (doc 6bf4fc56-a025-4212-abe0-bdc64a88b8cd)
// -----------------------------------------------------
// The LIA determination read:
//
//   Article 6(1)(f) permits processing where it "processing is necessary for
//   the purposes of the legitimate interests pursued by the controller…"
//
// The frame "…where it" supplies a subject and expects a predicate, but the
// VERBATIM Art. 6(1)(f) text carries its own subject ("processing is
// necessary…"). The sentence collapses. The quote is byte-pinned and may never
// be trimmed, so the FRAME has to move.
//
// THE RULE (deterministic, quote never touched)
// ---------------------------------------------
//   (a) A quote that opens with a bare predicate ("is necessary…", "shall be…")
//       takes a frame that supplies the subject:
//           <cite> permits processing that "is necessary…"
//   (b) A quote that opens with its OWN subject ("processing is necessary…",
//       "the controller shall…") takes a complementiser frame:
//           <cite> provides that "processing is necessary…"
//
// Both frames are grammatical against their own class and neither alters a
// single byte of the quotation.

/** A quote whose first token is a finite verb — it has no subject of its own. */
const BARE_PREDICATE_RE = /^(?:is|are|was|were|shall|should|must|may|can|has|have|includes?|requires?)\b/i;

export type QuoteFrameClass = "predicate" | "clause";

export function classifyQuoteOpening(verbatim: string): QuoteFrameClass {
  return BARE_PREDICATE_RE.test(String(verbatim ?? "").trim()) ? "predicate" : "clause";
}

/**
 * Build `<lead> <frame> "<verbatim>"`. `verbatim` is emitted byte-for-byte.
 *
 * @param lead      the citation lead, e.g. "Article 6(1)(f)".
 * @param verbatim  the pinned statutory quotation.
 * @param predicateFrame  frame used when the quote opens with a bare predicate.
 * @param clauseFrame     frame used when the quote carries its own subject.
 */
export function frameStatuteQuote(
  lead: string,
  verbatim: string,
  predicateFrame = "permits processing that",
  clauseFrame = "provides that",
): string {
  const q = String(verbatim ?? "").trim();
  const l = String(lead ?? "").trim();
  if (!q) return l;
  const frame = classifyQuoteOpening(q) === "predicate" ? predicateFrame : clauseFrame;
  return `${l} ${frame} "${q}"`;
}
