// product-test-grade — stability family (doc 272 §6.6).
//
// "Two copies of one fixture hash identical (deterministic) or produce the
// same check results (model-assisted)." That comparison happens ACROSS two
// separately-generated documents/grade calls, which this single-document
// `gradeDocument` entry point never sees — the frontend (or the offline
// twin in tests/edge/product-test/) holds both copies and diffs their
// `document_hash` / `checks` itself. This module exists only to name the
// family so `grade/index.ts` and the summary counts stay honest about which
// families this function actually computes.

export const STABILITY_FAMILY = "stability" as const;

/** No per-document stability check exists; always []. */
export function checkStability(): [] {
  return [];
}
