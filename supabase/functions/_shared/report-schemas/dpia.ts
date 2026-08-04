// LEAK-PREV-P2 — DPIA customer-report schema.
// Version: rs-dpia-w2-2026-08-05-item372
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
//
// DPIA UPGRADE (ITEM 6): the two new structural fields ride INSIDE existing
// section objects — `section_0_overview.assessment_team` (EDPB template v1.0
// § 0.5 para 6) and `section_6_conclusion.validation_approval` (§ 0.5 para 10).
// They are therefore covered by the existing `section_0_overview` /
// `section_6_conclusion` top-level allow-list entries, and nested pruning
// stays undeclared for the reason above: declaring `objects` for those two
// sections now would start dropping legitimate model-emitted section keys that
// have never been enumerated. `authority_exhibit` is new at the TOP level and
// is allow-listed explicitly below (house pattern, matching governance).

import type { ReportSchema } from "../report-serialize.ts";

export const DPIA_REPORT_SCHEMA: ReportSchema = {
  version: "rs-dpia-w2-2026-08-05-item372",
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
    // DPIA UPGRADE ITEM 4 — shared authority exhibit (renders at the end of the
    // body, immediately before the universal disclaimer).
    "authority_exhibit",
    // ITEM 372 METHOD 2a — executive determination block (renders first).
    "determination",

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
