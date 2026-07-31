// LEAK-PREV-P2 — IR Playbook (generate-ir-playbook) customer-report schema.
// Version: rs-ir-w1-2026-07-25
//
// Top-level allow-list derived from generate-ir-playbook/index.ts
// `report_data` construction (~L1771). `_meta.internal` is preserved
// verbatim by the serializer so stamp-echo keys (`_meta.internal.ir_w1`,
// `_meta.internal.emit_gate`, `_meta.internal.serializer`) survive P2
// whitelist serialization — the wave-21 telemetry-gap doctrine
// (items 47/49/62/65) applied at IR wiring time. `build_stamp` is
// additionally declared top-level so digests can confirm build-of-record
// without depending on `_meta`.
//
// Nested pruning: intentionally NOT declared — top-level whitelist alone
// enforces "unknown-key-cannot-ship" at the section granularity that has
// ever been reviewed (DPIA/DPA precedent).

import type { ReportSchema } from "../report-serialize.ts";

export const IR_PLAYBOOK_REPORT_SCHEMA: ReportSchema = {
  version: "rs-ir-w1-2026-07-25",
  tool: "ir_playbook",
  topLevel: [
    // Core IR payload
    "portals",
    "enforcement_precedents",
    "enforcement_meta",
    "annotations",
    "lint_warnings",
    "information_needed",
    "deterministic_checks",
    "generated_at",
    // ITEM 312 — Chapter 8 analytic deliverables (single-writer keys).
    "sa_notification_determination",
    "data_subject_communication_determination",
    "art34_exemption_analysis",
    "content_owner_mapping",

    // Ids & timestamps
    "build_stamp",
    // Meta bucket (serializer reduces to `_meta.internal` only)
    "_meta",
    // Revision-mode bookkeeping (data-only, non-prose)
    "_revision",
  ],
};
