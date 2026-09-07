// DOC 213 §2 — the ≤ 6,000-char source excerpt centred on the pinned quote.
//
// A local copy of the windowing helper used by the classification pipeline
// (an edge function may not import from a sibling function directory).

export function windowAround(text: string, needle: string | null, radius: number, fallbackLength: number): string {
  if (needle) {
    const at = text.indexOf(needle);
    if (at >= 0) return text.slice(Math.max(0, at - radius), Math.min(text.length, at + needle.length + radius));
  }
  return text.slice(0, fallbackLength);
}

export const MAX_EXCERPT_CHARS = 6_000;

/** Centre a ≤ 6,000-char window on the quote; fall back to the head of the text. */
export function sourceExcerpt(fullText: string | null, quote: string | null): string {
  const text = fullText ?? "";
  const window = windowAround(text, quote && text.includes(quote) ? quote : null, 2_800, MAX_EXCERPT_CHARS);
  return window.slice(0, MAX_EXCERPT_CHARS);
}
