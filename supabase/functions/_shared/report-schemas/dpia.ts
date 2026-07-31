// LEAK-PREV-P2 — DPIA customer-report schema.
// Version: rs-dpia-w1-2026-07-25
//
// Top-level allow-list derived from run-dpia-framework/index.ts assembler
// (`reportData.<key> = ...`) and DPIAFrameworkResult.tsx / src/components/dpia
// reads. `_meta.internal` is preserved verbatim by the serializer so build-
// stamp echo keys (`_meta.internal.dpia_w1_wire`, `_meta.internal.emit_gate`)
// survive P2 whitelist serialization — this is the wave-21 admt telemetry-gap
// lesson (item 47/49) applied at DPIA authoring time.
//
// Nested pruning: intentionally NOT declared (`entries`/`objects` omitted).
// DPIA section objects have wide and evolving key sets; per-entry pruning
// would risk dropping a legitimate model-emitted field. Top-level whitelist
// alone is sufficient to enforce "unknown-key-cannot-ship" at the section
// granularity that has ever been reviewed.

import type { ReportSchema } from "../report-serialize.ts";

export const DPIA_REPORT_SCHEMA: ReportSchema = {
  version: "rs-dpia-w1-2026-07-25",
  tool: "dpia_framework",
  topLevel: [
    // Section objects (canonical EDPB structure)
    "section_0_overview",
    "section_1_description",
    "section_2_analysis",
    "section_3_necessity_proportionality",
    "section_4_risk_management",
    "section_5_interested_parties",
    "section_6_conclusion",
    // Framework metadata & disclaimer
    "executive_summary",
    "dpia_metadata",
    "framework_disclaimer",
    "disclaimer",
    "supervisory_authority_consultation",
    "jurisdiction_validation",
    "gdpr_meta",
    // ITEM 310 — dpia analytic deliverables (single-writer, deterministic)
    "necessity_findings",
    "proportionality",
    "risk_register",
    "art36_consultation",

    // Cross-cutting arrays / bookkeeping
    "annotations",
    "information_needed",
    "open_items",
    "completion_guidance",
    "has_unresolved_placeholders",
    "lint_warnings",
    "deterministic_checks",
    "citation_ledger",
    "fsor_commentary",
    // Enforcement injection
    "enforcement_context",
    "enforcement_precedents",
    "enforcement_meta",
    // Engagement Map v1 (C1-d)
    "engagement_map",
    // Ids & timestamps
    "dpia_id",
    "generated_at",
    "prompt_version",
    "build_stamp",
    // Meta bucket (serializer reduces to `_meta.internal` only)
    "_meta",
    // Revision-mode bookkeeping (data-only, non-prose)
    "_revision",
  ],
};
