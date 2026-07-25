// LEAK-PREV-P2 — LIA customer-report schema.
// Version: rs-lia-w1-2026-07-25
//
// Top-level allow-list derived from run-li-assessment/index.ts assembler
// (`reportData.<key> = ...` at the terminal_complete assembly, ~L1549) and
// src/components/LIAssessmentResult surfaces.
//
// `_meta.internal` is preserved verbatim by the serializer so build-stamp
// echo keys (`_meta.internal.lia_w1`, `_meta.internal.emit_gate`,
// `_meta.internal.serializer`) survive P2 whitelist serialization — this is
// the wave-21 admt telemetry-gap lesson (items 47/49) applied at LIA wiring
// time. `build_stamp` is additionally declared top-level so digests can
// confirm build-of-record from a doc without depending on `_meta`.
//
// Nested pruning: intentionally NOT declared. LIA section objects
// (three_part_test, documentation_recommendations) have wide and evolving
// key sets; per-entry pruning would risk dropping a legitimate model-emitted
// field. Top-level whitelist alone is sufficient to enforce "unknown-key-
// cannot-ship" at the section granularity that has ever been reviewed.

import type { ReportSchema } from "../report-serialize.ts";

export const LIA_REPORT_SCHEMA: ReportSchema = {
  version: "rs-lia-w1-2026-07-25",
  tool: "li_assessment",
  topLevel: [
    // Core assembly
    "assessment_id",
    "generated_at",
    "classification",
    "precedents_reviewed",
    "precedent_database_size",
    "enforcement_precedents",
    "enforcement_meta",
    "enforcement_precedents_note",
    "gdpr_meta",
    "three_part_test",
    "documentation_recommendations",
    "disclaimer",
    "data_currency_note",
    // Cross-cutting arrays / bookkeeping
    "annotations",
    "information_needed",
    "lint_warnings",
    "deterministic_checks",
    "citation_ledger",
    // Engagement Map v1 (C1-d)
    "engagement_map",
    // Build-stamp echo (STAMP-ECHO WHITELIST KEY — dispatch §3)
    "build_stamp",
    "prompt_version",
    // Meta bucket (serializer reduces to `_meta.internal` only)
    "_meta",
    // Revision-mode bookkeeping (data-only, non-prose)
    "_revision",
  ],
};
