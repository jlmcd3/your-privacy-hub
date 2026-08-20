// LEAK-PREV-P2 — CPPA ADMT v2 customer-report schema.
// Version: rs-admt-v2-w1-2026-08-20
//
// DERIVATION (read, not guessed): the persisted `report` object is built at
// run-admt-checker-v2/index.ts L103-123 as a single literal with exactly
// four top-level keys (_meta, skeleton_document, authority_exhibit,
// findings) — no conditional branches add or remove keys, unlike v1's
// report-assembly code, so there is nothing to reconstruct from scattered
// mutation sites.
//
// `findings` (the typed AdmtV2Finding[] internal objects — finding_id,
// source_fields, closure_condition, etc.) is relocated into
// `_meta.internal.findings` before serialization (see index.ts) rather than
// declared here: it was never meant to be a customer-facing top-level key
// (see the "kept on the record... for a future on-screen result page, or a
// follow-on battery" comment at its origin), and _meta.internal is exactly
// the channel this serializer preserves for that purpose. Declaring it in
// `topLevel` would ship the internal finding_id/source_fields/
// closure_condition/priority machinery straight to the customer's browser.
//
// No `entries`/`objects` allow-lists are declared: `skeleton_document` and
// `authority_exhibit` are wholly customer-facing, fixed-shape output built
// entirely by this product's own assembler and exhibit builder (never an
// LLM, never free-form) — matching run-registration-assessment's schema,
// which makes the identical call for its own byte-pinned skeleton output.
// Pruning inside them would remove content, not prevent a leak.
//
// MISSING A KEY IS THE FAILURE MODE — a key absent from `topLevel` is
// silently stripped from the customer report. The colocated coverage test
// (tests/edge/run-admt-checker-v2/admt-v2.schema-coverage.test.ts) re-states
// the emitted-key set and asserts lockstep in BOTH directions.

import type { ReportSchema } from "../../../_shared/report-serialize.ts";

export const ADMT_V2_REPORT_SCHEMA: ReportSchema = {
  version: "rs-admt-v2-w1-2026-08-20",
  tool: "cppa_admt_v2",
  topLevel: [
    "skeleton_document",
    "authority_exhibit",
    // internal channel — serializer preserves ONLY _meta.internal, which is
    // where the pipeline stamp, posture/grade summary, and (post-relocation)
    // the raw findings array live.
    "_meta",
  ],
};

/** Emitted top-level keys, restated for the coverage test. */
export const ADMT_V2_EMITTED_TOP_LEVEL: readonly string[] = [
  "skeleton_document",
  "authority_exhibit",
  "_meta",
];
