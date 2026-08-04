// LEAK-PREV-P2 — DPA (generate-dpa) customer-report schema.
// Version: rs-dpa-w1-2026-07-25
//
// Top-level allow-list derived from generate-dpa/index.ts `buildReportData`
// (~L1558–L1573). `_meta.internal` is preserved verbatim by the serializer
// so stamp echo keys (`_meta.internal.dpa_w1`, `_meta.internal.emit_gate`,
// `_meta.internal.serializer`) survive P2 whitelist serialization — the
// wave-21 telemetry-gap doctrine (items 47/49/62) applied at DPA wiring
// time. `build_stamp` is additionally declared top-level so digests can
// confirm build-of-record without depending on `_meta`.
//
// Nested pruning: intentionally NOT declared — the DPA carries a large
// `document_text` and metadata surfaces whose key sets evolve.
// Top-level whitelist alone enforces "unknown-key-cannot-ship" at the
// section granularity that has ever been reviewed (DPIA/governance
// precedent).

import type { ReportSchema } from "../report-serialize.ts";

export const DPA_REPORT_SCHEMA: ReportSchema = {
  version: "rs-dpa-w2-2026-08-04",
  tool: "dpa",
  topLevel: [
    // Core DPA payload
    "document_text",
    "generated_at",
    "gdpr_meta",
    "annotations",
    "information_needed",
    "deterministic_checks",
    // DPA-ANNEX (Master Spec §4.11) — deterministic Art. 28(3)
    // clause-coverage checklist metadata backing the rendered annex.
    "clause_coverage",
    "lint_warnings",
    // Enforcement injection
    "enforcement_precedents",
    "enforcement_meta",
    // Ids & timestamps
    "dpa_id",
    "prompt_version",
    "build_stamp",

    // Meta bucket (serializer reduces to `_meta.internal` only)
    "_meta",
    // Revision-mode bookkeeping (data-only, non-prose)
    "_revision",
  ],
};
