// ADMT v2 — CITATION GATHERING for the authority exhibit.
//
// DOC 261 (2026-09-14): relocated verbatim from run-admt-checker-v2/index.ts
// so the /all-ptest determinism harness (tests/edge/ptest/determinism.test.ts)
// can assemble the document through EXACTLY the production call chain
// (computeAdmtV2 → gatherCitations → buildAuthorityExhibit →
// assembleAdmtV2Document) without importing the HTTP shell. No behaviour
// change: same two framing citations, same dedupe, same order.

/** Gathers every citation string a computed result actually emits (finding
 * authorities + the two header/statutory-framing citations), deduplicated.
 * This is the SAME "only what the document actually cites" discipline every
 * other product's authority exhibit already follows. */
export function gatherCitations(findingAuthorities: string[]): string[] {
  const extra = ["11 CCR § 7200", "11 CCR § 7150(b)(3)"];
  return [...new Set([...findingAuthorities, ...extra].filter((c) => c && c.trim()))];
}
