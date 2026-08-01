// ITEM 338 (PROSE PROGRAM 2 of 4) — cppa-risk REVIEWED FRAME SET.
//
// Sequenced first per dispatch (worst readers first: processing / record-echo).
// Frames are harvested from the July `sample_reports` style-donor corpus and
// de-facted, then hand-finished for the thin cppa_risk donor set (8 rows) using
// the rich products' frames as style exemplars.
//
// STATUS: every frame is `pending_review` and the set is `approved: false`.
// `frameSetRenderable()` therefore returns false and NOTHING renders to a
// customer until a CEO sign-off is recorded in the ledger. The renderer flip is
// a separate turn.

import type { FrameSet } from "../frames.ts";

export const CPPA_RISK_FRAMES: FrameSet = {
  product: "cppa-risk",
  version: "prose-frames-2026-08-01-item338",
  approved: false,
  frames: [
    {
      id: "cppa-risk.processing_narrative.001",
      product: "cppa-risk",
      section: "processing_narrative",
      body:
        "{{ENTITY}} processes personal information for the activity recorded as {{ACTIVITY}}. " +
        "The record describes the categories in scope as {{DATA_CATEGORIES:list}}, collected {{SOURCE_CLAUSE}}. " +
        "The stated retention position for this activity is {{RETENTION_PERIOD}}. " +
        "{{CITE_1:cite}}",
      placeholders: [
        { token: "ENTITY", kind: "text", source: "entity_name", required: true },
        { token: "ACTIVITY", kind: "text", source: "subject_anchor", required: true },
        { token: "DATA_CATEGORIES", kind: "list", source: "i1_categories", required: true },
        { token: "SOURCE_CLAUSE", kind: "text", source: "i4b_sources", required: true },
        { token: "RETENTION_PERIOD", kind: "text", source: "i2_retention_period", required: true },
        { token: "CITE_1", kind: "cite", source: "processing_purpose_documentation", required: false },
      ],
      provenance: {
        sample_report_id: "a7689621-63e6-42ad-90cc-7760e892eb6d",
        tool_slug: "cppa_risk",
        report_path: "risk_assessment_by_activity[0].purpose",
        harvested_at: "2026-08-01",
        origin: "draft",
        exemplars: ["li_assessment.purpose.001", "dpia.description.001"],
      },
      status: "pending_review",
    },
    {
      id: "cppa-risk.record_echo.001",
      product: "cppa-risk",
      section: "record_echo",
      body:
        "The record for {{ENTITY}} states the following on its own terms. Consumers affected: {{COUNT}}. " +
        "Recipients named by the record: {{VENDORS:list}}. Safeguards described by the record: {{SAFEGUARDS:list}}. " +
        "These are the company's statements, reproduced without alteration for the reader's review.",
      placeholders: [
        { token: "ENTITY", kind: "text", source: "entity_name", required: true },
        { token: "COUNT", kind: "count", source: "q2_consumers", required: true },
        { token: "VENDORS", kind: "list", source: "i6_vendors", required: true },
        { token: "SAFEGUARDS", kind: "list", source: "impact_intake.safeguards", required: true },
      ],
      provenance: {
        sample_report_id: "a7689621-63e6-42ad-90cc-7760e892eb6d",
        tool_slug: "cppa_risk",
        report_path: "risk_assessment_by_activity[0].current_safeguards",
        harvested_at: "2026-08-01",
        origin: "harvest",
      },
      status: "pending_review",
    },
    {
      id: "cppa-risk.scope_notes.001",
      product: "cppa-risk",
      section: "scope_notes",
      body:
        "The assessment subject is {{ACTIVITY}}, as fixed by the record. " +
        "The recipients identified for that activity are {{VENDORS:list}}. {{CITE_1:cite}}",
      placeholders: [
        { token: "ACTIVITY", kind: "text", source: "subject_anchor", required: true },
        { token: "VENDORS", kind: "list", source: "i6_vendors", required: true },
        { token: "CITE_1", kind: "cite", source: "scope_of_assessment", required: false },
      ],
      provenance: {
        sample_report_id: "2990f12a-0749-412a-b8b1-3f63c1a21f1e",
        tool_slug: "cppa_risk",
        report_path: "scope_and_triggers.scope_notes",
        harvested_at: "2026-08-01",
        origin: "harvest",
      },
      status: "pending_review",
    },
    {
      id: "cppa-risk.benefits_rationale.001",
      product: "cppa-risk",
      section: "benefits_rationale",
      body:
        "The record asserts that the benefits of this activity outweigh its risks. " +
        "The benefits it names are {{BENEFITS}}. Residual risk is recorded at {{LIKELIHOOD}} likelihood and " +
        "{{SEVERITY}} severity, after the safeguards the record describes. {{CITE_1:cite}} " +
        "The weight to be given to that assertion is reserved to the Company and its counsel.",
      placeholders: [
        { token: "BENEFITS", kind: "text", source: "impact_intake.businessBenefits", required: true },
        { token: "LIKELIHOOD", kind: "enum", source: "impact_intake.likelihood", required: true },
        { token: "SEVERITY", kind: "enum", source: "impact_intake.severity", required: true },
        { token: "CITE_1", kind: "cite", source: "benefit_impact_balancing", required: false },
      ],
      provenance: {
        sample_report_id: "36220b11-2dca-48b9-92f1-368e8ede1ecb",
        tool_slug: "cppa_risk",
        report_path: "risk_assessment_by_activity[0].benefits_outweigh_risks_rationale",
        harvested_at: "2026-08-01",
        origin: "harvest",
      },
      status: "pending_review",
    },
  ],
};

export default CPPA_RISK_FRAMES;
