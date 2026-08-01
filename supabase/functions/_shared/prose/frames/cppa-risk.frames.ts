// ITEM 346 (FRAME LIBRARY REVISION) — cppa-risk REVISED FRAME SET.
//
// Supersedes the Item 338 set the CEO rejected. Ruling applied:
//   * `record_echo` is APPROVED AS-IS and carries forward byte-identical.
//   * Every other frame is rebuilt to the CEO-authored structure: the legal
//     test and the record's facts INTERWOVEN into flowing analysis, not a slot
//     walk over a database.
//
// THREE SLOT TYPES, three guarantees (see the target pattern in the ledger):
//   1. RECORD-VERBATIM  — `text` / `list` / `count` / `enum`, filled from the
//      customer's own values, free text visibly quoted.
//   2. REGISTRY-LEGAL   — `legal`, addressed by proposition key into
//      `../legal-phrasings.ts`. What a provision REQUIRES, authored once,
//      reviewed, pinned. A frame carries no legal prose of its own; the Item 338
//      lint plus the Item 346 `unknown_legal_key` rule enforce that.
//   3. ENGINE-CONCLUSION — `conclusion`, addressed by a determination key the
//      ENGINE computed, into `../engine-conclusions.ts`. The engine decides
//      WHICH; the library supplies HOW IT READS.
// Pinpoints come from `cite` slots, which resolve against the verified-authority
// registry (fixed this turn — review renders no longer print a literal stub).
//
// NO FLATTENING. The analytic frames carry every determination, contradiction
// flag and gap the composer produced; `../frame-coverage.ts` is the mechanical
// check and it runs in the tests and in the review render.
//
// STATUS: the set is `approved: false` pending CEO sign-off. `record_echo` is
// marked `approved` per the ruling; the SET gate still blocks all rendering.

import type { FrameSet } from "../frames.ts";

export const CPPA_RISK_FRAME_SET_VERSION = "prose-frames-2026-08-01-item346";

export const CPPA_RISK_FRAMES: FrameSet = {
  product: "cppa-risk",
  version: CPPA_RISK_FRAME_SET_VERSION,
  approved: false,
  frames: [
    // ── 1. OPENING ANALYSIS — the CEO-authored target structure ──────────
    {
      id: "cppa-risk.opening_analysis.002",
      product: "cppa-risk",
      section: "opening_analysis",
      body:
        "This risk assessment is prepared for {{ENTITY}} to assess {{ACTIVITY}}. " +
        "The company states that the activity involves {{TRIGGER_FACT}}, which is what brings it within {{CITE_TRIGGER:cite}}: that provision calls for {{REQ_TRIGGER:legal}}. " +
        "Against that requirement the record identifies {{MINIMISATION_COUNT}} element(s) it collects without treating them as necessary to the stated purpose, namely {{MINIMISATION_LIST:list}}. " +
        "The company has given a basis for the collection as a whole — it describes the purpose as {{PURPOSE_VERBATIM}} — but {{CITE_CATEGORIES:cite}} calls for {{REQ_CATEGORIES:legal}}, " +
        "so on the elements above this assessment {{CONSEQ_NECESSITY:conclusion}}: it can describe the exposure those elements create, but it cannot {{BLOCKED_NECESSITY:conclusion}}.",
      placeholders: [
        { token: "ENTITY", kind: "text", source: "entity_name", required: true },
        { token: "ACTIVITY", kind: "text", source: "activity_name", required: true },
        { token: "TRIGGER_FACT", kind: "text", source: "trigger_fact_verbatim", required: true },
        { token: "CITE_TRIGGER", kind: "cite", source: "ra_when_required", required: true },
        { token: "REQ_TRIGGER", kind: "legal", source: "ra_when_required", required: true },
        { token: "MINIMISATION_COUNT", kind: "count", source: "minimisation_count", required: true },
        { token: "MINIMISATION_LIST", kind: "list", source: "minimisation_elements", required: true },
        { token: "PURPOSE_VERBATIM", kind: "text", source: "activity_purpose", required: true },
        { token: "CITE_CATEGORIES", kind: "cite", source: "ra_content_categories", required: true },
        { token: "REQ_CATEGORIES", kind: "legal", source: "ra_content_categories", required: true },
        { token: "CONSEQ_NECESSITY", kind: "conclusion", source: "necessity_determination", required: true },
        { token: "BLOCKED_NECESSITY", kind: "conclusion", source: "necessity_determination_blocked", required: true },
      ],
      provenance: {
        sample_report_id: null,
        tool_slug: "cppa_risk",
        report_path: "executive_summary",
        harvested_at: "2026-08-01",
        origin: "draft",
        exemplars: ["cppa-risk.processing_narrative.002"],
      },
      status: "pending_review",
    },

    // ── 2. PROCESSING NARRATIVE — record facts read against the test ─────
    {
      id: "cppa-risk.processing_narrative.002",
      product: "cppa-risk",
      section: "processing_narrative",
      body:
        "For {{ACTIVITY}}, {{ENTITY}} records that it processes {{DATA_CATEGORIES:list}}, collected {{SOURCE_CLAUSE}} and retained for {{RETENTION_PERIOD}}, with {{VENDORS:list}} named as recipients. " +
        "{{CITE_OPERATIONAL:cite}} calls for {{REQ_OPERATIONAL:legal}}, and the record answers each of those points on its own terms as set out above. " +
        "The purpose those operations serve is recorded as {{PURPOSE_VERBATIM}}; {{CITE_PURPOSE:cite}} calls for {{REQ_PURPOSE:legal}}, which is the standard the stated purpose is read against in the analysis that follows.",
      placeholders: [
        { token: "ACTIVITY", kind: "text", source: "activity_name", required: true },
        { token: "ENTITY", kind: "text", source: "entity_name", required: true },
        { token: "DATA_CATEGORIES", kind: "list", source: "data_categories", required: true },
        { token: "SOURCE_CLAUSE", kind: "text", source: "sources", required: true },
        { token: "RETENTION_PERIOD", kind: "text", source: "retention_period", required: true },
        { token: "VENDORS", kind: "list", source: "vendors", required: true },
        { token: "CITE_OPERATIONAL", kind: "cite", source: "ra_content_operational", required: true },
        { token: "REQ_OPERATIONAL", kind: "legal", source: "ra_content_operational", required: true },
        { token: "PURPOSE_VERBATIM", kind: "text", source: "activity_purpose", required: true },
        { token: "CITE_PURPOSE", kind: "cite", source: "ra_content_purpose", required: true },
        { token: "REQ_PURPOSE", kind: "legal", source: "ra_content_purpose", required: true },
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

    // ── 3. RECORD ECHO — CEO-APPROVED CLASS, CARRIED FORWARD AS-IS ───────
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
        { token: "VENDORS", kind: "list", source: "vendors", required: true },
        { token: "SAFEGUARDS", kind: "list", source: "safeguards", required: true },
      ],
      provenance: {
        sample_report_id: "a7689621-63e6-42ad-90cc-7760e892eb6d",
        tool_slug: "cppa_risk",
        report_path: "risk_assessment_by_activity[0].current_safeguards",
        harvested_at: "2026-08-01",
        origin: "harvest",
      },
      status: "approved",
      approved_in_ledger_item: "Item 346 (CEO: record_echo approved as-is)",
    },

    // ── 4. SCOPE NOTES — subject fixed, triggers read against the record ─
    {
      id: "cppa-risk.scope_notes.002",
      product: "cppa-risk",
      section: "scope_notes",
      body:
        "The subject of this assessment is {{ACTIVITY}}, fixed by the record and not widened here. " +
        "{{CITE_TRIGGER:cite}} calls for {{REQ_TRIGGER:legal}}, and the record basis relied on for that is {{TRIGGER_FACT}}. " +
        "The recipients the record names for the activity are {{VENDORS:list}}. " +
        "Where the record reports a second use of the same information, {{CITE_COMPARABLE:cite}} calls for {{REQ_COMPARABLE:legal}}, which is why {{SECONDARY_STATUS}} is recorded as the position on secondary use.",
      placeholders: [
        { token: "ACTIVITY", kind: "text", source: "activity_name", required: true },
        { token: "CITE_TRIGGER", kind: "cite", source: "ra_when_required", required: true },
        { token: "REQ_TRIGGER", kind: "legal", source: "ra_when_required", required: true },
        { token: "TRIGGER_FACT", kind: "text", source: "trigger_fact_verbatim", required: true },
        { token: "VENDORS", kind: "list", source: "vendors", required: true },
        { token: "CITE_COMPARABLE", kind: "cite", source: "ra_comparable_set", required: true },
        { token: "REQ_COMPARABLE", kind: "legal", source: "ra_comparable_set", required: true },
        { token: "SECONDARY_STATUS", kind: "text", source: "secondary_use_status", required: true },
      ],
      provenance: {
        sample_report_id: "2990f12a-0749-412a-b8b1-3f63c1a21f1e",
        tool_slug: "cppa_risk",
        report_path: "scope_and_triggers.scope_notes",
        harvested_at: "2026-08-01",
        origin: "draft",
      },
      status: "pending_review",
    },

    // ── 5. HARM AND SAFEGUARD ANALYSIS — no flattening ───────────────────
    {
      id: "cppa-risk.harm_analysis.002",
      product: "cppa-risk",
      section: "harm_analysis",
      body:
        "{{CITE_IMPACTS:cite}} calls for {{REQ_IMPACTS:legal}}. On this record the impacts identified for {{ACTIVITY}} are, each with the source the record gives and the way the processing causes it: {{HARM_LINES:list}}. " +
        "{{CITE_SAFEGUARDS:cite}} then calls for {{REQ_SAFEGUARDS:legal}}; the safeguards the record describes, and what remains after each of them, are: {{SAFEGUARD_LINES:list}}. " +
        "{{FLAG_LINES:list}}{{GAP_LINES:list}}",
      placeholders: [
        { token: "CITE_IMPACTS", kind: "cite", source: "ra_content_negative_impacts", required: true },
        { token: "REQ_IMPACTS", kind: "legal", source: "ra_content_negative_impacts", required: true },
        { token: "ACTIVITY", kind: "text", source: "activity_name", required: true },
        { token: "HARM_LINES", kind: "list", source: "harm_lines", required: true },
        { token: "CITE_SAFEGUARDS", kind: "cite", source: "ra_content_safeguards", required: true },
        { token: "REQ_SAFEGUARDS", kind: "legal", source: "ra_content_safeguards", required: true },
        { token: "SAFEGUARD_LINES", kind: "list", source: "safeguard_lines", required: true },
        { token: "FLAG_LINES", kind: "list", source: "flag_lines", required: false },
        { token: "GAP_LINES", kind: "list", source: "gap_lines", required: false },
      ],
      provenance: {
        sample_report_id: "36220b11-2dca-48b9-92f1-368e8ede1ecb",
        tool_slug: "cppa_risk",
        report_path: "risk_assessment_by_activity[0].negative_impacts",
        harvested_at: "2026-08-01",
        origin: "draft",
      },
      status: "pending_review",
    },

    // ── 6. BENEFITS / WEIGHING — determination carried, not summarised ───
    {
      id: "cppa-risk.benefits_rationale.002",
      product: "cppa-risk",
      section: "benefits_rationale",
      body:
        "{{CITE_BENEFITS:cite}} calls for {{REQ_BENEFITS:legal}}, and {{CITE_GOAL:cite}} sets the exercise those benefits feed: {{REQ_GOAL:legal}}. " +
        "The benefits the record states, read one beneficiary class at a time, are: {{BENEFIT_LINES:list}}. " +
        "Weighed against the impacts remaining after the recorded safeguards, this assessment {{CONSEQ_WEIGHING:conclusion}}. " +
        "{{CITE_INITIATE:cite}} calls for {{REQ_INITIATE:legal}}, and on this record the assessment {{CONSEQ_DECISION:conclusion}} — it can set out the exposure in full, but it cannot {{BLOCKED_DECISION:conclusion}}. " +
        "That determination, and any judgment reserved to counsel, remains with the company.",
      placeholders: [
        { token: "CITE_BENEFITS", kind: "cite", source: "ra_content_benefits", required: true },
        { token: "REQ_BENEFITS", kind: "legal", source: "ra_content_benefits", required: true },
        { token: "CITE_GOAL", kind: "cite", source: "ra_goal", required: true },
        { token: "REQ_GOAL", kind: "legal", source: "ra_goal", required: true },
        { token: "BENEFIT_LINES", kind: "list", source: "benefit_lines", required: true },
        { token: "CONSEQ_WEIGHING", kind: "conclusion", source: "weighing_determination", required: true },
        { token: "CITE_INITIATE", kind: "cite", source: "ra_content_initiate", required: true },
        { token: "REQ_INITIATE", kind: "legal", source: "ra_content_initiate", required: true },
        { token: "CONSEQ_DECISION", kind: "conclusion", source: "consequence_determination", required: true },
        { token: "BLOCKED_DECISION", kind: "conclusion", source: "consequence_determination_blocked", required: true },
      ],
      provenance: {
        sample_report_id: "36220b11-2dca-48b9-92f1-368e8ede1ecb",
        tool_slug: "cppa_risk",
        report_path: "risk_assessment_by_activity[0].benefits_outweigh_risks_rationale",
        harvested_at: "2026-08-01",
        origin: "draft",
      },
      status: "pending_review",
    },
  ],
};

export default CPPA_RISK_FRAMES;
