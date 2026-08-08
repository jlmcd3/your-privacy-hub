// ITEM 404 — CPPA CYBER GOLD-STANDARD PROSE ENCODE (LEG A).
//
// SOURCE OF TRUTH: `prose_document_plans` row for product `cppa-cyber`
// (id 4dca3e72-3827-4b30-9c15-3b66fb53d0fa, version 1, approved = true,
// provenance recording BOTH walked renders and, verbatim, `panel-delegated
// approval per CEO delegation 2026-08-06`). No prior cppa-cyber plan row
// existed, so this row is an INSERT — nothing was superseded or orphaned.
//
// This module is a FAITHFUL ENCODE of the row: section ids, titles, arc
// stages, leads, source keys and themes are transcribed verbatim.
// `tests/edge/item404/cyber-prose-gold.test.ts` asserts the encode against
// library/prose/plans/cyber.plan.json, so drift in either direction breaks
// the build.
//
// ─────────────────────────────────────────────────────────────────────────────
// REFERENCE RENDERS ARE FACT-EXEMPT — HARD RULE.
//
// The walked renders (quality_run_documents 3dd35bf8-5be5-47ce-b6dc-f3f135c4afef,
// 88.45, and 52a79112-0916-4530-ac4d-a61cb1dc6985, 92.25) are an ARCHITECTURE
// AND REGISTER reference ONLY. No fact, name, figure, entity or scenario from
// them may ever reach a customer document, and none of it may be seeded into a
// fixture as record truth. `REFERENCE_RENDER_TOKENS` exists so the battery test
// can prove that no cyber builder literal carries a token from either render.
// ─────────────────────────────────────────────────────────────────────────────

export const CYBER_PLAN_PRODUCT = "cppa-cyber";
export const CYBER_PLAN_ROW_ID = "4dca3e72-3827-4b30-9c15-3b66fb53d0fa";
export const CYBER_PLAN_ROW_VERSION = 1;
export const CYBER_PLAN_VERSION_LABEL = "prose-plans-2026-08-07-item404";

/**
 * The finalize-point stamp written into `_meta.internal.cyber_pipeline_stamp`.
 * NEW constant — run-cppa-cybersecurity carried only BUILD_STAMP before item404.
 */
export const CYBER_PIPELINE_STAMP = "cyber-pipeline@item404-2026-08-07";

/** The two walked renders, for provenance assertions. */
export const CYBER_REFERENCE_RENDER_IDS: readonly string[] = [
  "3dd35bf8-5be5-47ce-b6dc-f3f135c4afef",
  "52a79112-0916-4530-ac4d-a61cb1dc6985",
];

/** Transcribed verbatim from the approved plan row. */
export const CYBER_THESIS =
  "This assessment states, once, whether the business's cybersecurity programme is audit-ready under 11 CCR §§ 7121-7124 on the record it supplied, and then shows the record that produced that answer component by component. Arithmetic about the eighteen § 7123(c) components belongs in the typed control tally the renderer prints, never in a sentence; comparative frameworks are named as comparative and never as the operative requirement.";

export type CyberArcStage = "headline" | "record" | "analysis" | "duty" | "remedy" | "close";
export type CyberLead = "determination" | "record";

export interface CyberSectionSpec {
  readonly id: string;
  readonly title: string;
  readonly arc_stage: CyberArcStage;
  readonly lead: CyberLead;
  readonly source_key: string;
  readonly themes: readonly string[];
}

/**
 * The plan arc, in order:
 *   readiness determination → the assessment in short → the programme as the
 *   business described it → the eighteen components → how they tally →
 *   audit-schedule obligations → gaps and remediation → what to do next → close.
 *
 * DETERMINATION-LEAD DISCIPLINE: sections with `lead: "determination"` open
 * with the finding; sections with `lead: "record"` open with the record.
 */
export const CYBER_SECTION_SPECS: readonly CyberSectionSpec[] = [
  {
    id: "readiness_determination",
    title: "Whether the programme is audit-ready",
    arc_stage: "headline",
    lead: "determination",
    source_key: "readiness_determination",
    themes: ["audit_readiness", "one_verdict", "s7121_7124", "reserved_to_counsel"],
  },
  {
    id: "executive_summary",
    title: "The assessment in short",
    arc_stage: "headline",
    lead: "determination",
    source_key: "executive_summary",
    themes: ["verdict_first", "no_arithmetic_in_prose", "ownership"],
  },
  {
    id: "programme_record",
    title: "The programme as the business described it",
    arc_stage: "record",
    lead: "record",
    source_key: "programme_record",
    themes: ["frameworks_in_scope", "evidence_on_file", "maturity_reported", "auditor_engagement"],
  },
  {
    id: "control_findings",
    title: "The eighteen components, one at a time",
    arc_stage: "analysis",
    lead: "determination",
    source_key: "controls",
    themes: ["component_status", "evidence", "operative_citation", "comparative_framework"],
  },
  {
    id: "control_status_counts",
    title: "How the components tally",
    arc_stage: "analysis",
    lead: "record",
    source_key: "control_status_counts",
    themes: ["typed_aggregate", "denominator", "methodology_note", "renderer_formats"],
  },
  {
    id: "audit_schedule",
    title: "When the first audit is due",
    arc_stage: "duty",
    lead: "record",
    source_key: "audit_schedule",
    themes: ["s7121_phase_in", "cohort_reserved_to_customer", "s7122_independence", "byte_pinned"],
  },
  {
    id: "gaps_and_remediation",
    title: "What the record does not yet carry, and what closes it",
    arc_stage: "remedy",
    lead: "determination",
    source_key: "top_risks",
    themes: ["named_element", "artifact_that_evidences_it", "priority", "credit_first"],
  },
  {
    id: "next_steps",
    title: "What to do next",
    arc_stage: "remedy",
    lead: "determination",
    source_key: "next_steps",
    themes: ["actions_only", "verdict_blocking_or_record_completeness", "owner", "no_enhancements"],
  },
  {
    id: "close",
    title: "Scope and reliance",
    arc_stage: "close",
    lead: "record",
    source_key: "disclaimer",
    themes: ["not_legal_advice", "counsel_review", "record_bound"],
  },
];

/**
 * BANNED REGISTER — tokens that may never appear on a cyber reader surface.
 * Machine enums, internal test-state vocabulary, and the arithmetic phrasings
 * that defect (a) proved can splice themselves into a sentence.
 */
export const CYBER_BANNED_REGISTER: readonly string[] = [
  "record_insufficient",
  "insufficient_basis",
  "resolved_met",
  "resolved_not_met",
  "INDETERMINATE",
  "CANDIDATE",
  "TEST-STATES",
  "Mean of",
  "aggregate score of",
  "cannot be determined",
  "no basis to assess",
];

/**
 * FACT-EXEMPT PROOF SET. Tokens drawn from the two walked renders. No cyber
 * builder literal, fixture or template may contain any of them.
 */
export const REFERENCE_RENDER_TOKENS: readonly string[] = [
  "Meridian SaaS Inc.",
  "Meridian SaaS",
  "Meridian",
];

export const CYBER_FACT_EXEMPT_RULE =
  "The walked renders are an ARCHITECTURE AND REGISTER reference only. No fact, name, figure, entity or scenario from them may reach a customer document, and none of them may be seeded into a fixture as record truth.";
