// ITEM 392 — ADMT GOLD-STANDARD PROSE ENCODE (LEG A).
//
// SOURCE OF TRUTH: `prose_document_plans` row f59eb3b8-d747-4110-a3ab-0452e9cf92fd
// (product = admt, approved = true, version `prose-plans-2026-08-06-item392`).
// Approval on that row was recorded as: "panel-delegated approval per CEO
// delegation 2026-08-06". This module is a FAITHFUL ENCODE of the row: section
// ids, titles, arc stages, leads, source keys and themes are transcribed
// verbatim so the runtime renders the arc the panel approved.
// `tests/edge/item392/plan-fidelity.test.ts` asserts this encode against the
// row's JSON with the version string hard-coded, so drift in either direction
// breaks the build.
//
// ─────────────────────────────────────────────────────────────────────────────
// REFERENCE RENDER IS FACT-EXEMPT — HARD RULE.
//
// The ratified reference render (quality_run_documents
// 562f1770-990e-4b4b-8f13-e7354dc6aa9b — the "TalentRank" ADMT report) is an
// ARCHITECTURE AND REGISTER reference ONLY. No fact, name, figure, entity or
// scenario from it may ever reach a customer document, and none of it may be
// re-used as though it were a record — including in future fixtures, where the
// TalentRank facts are FACT-EXEMPT and must not be treated as intake truth.
// Every fact in a customer document comes from the record being assessed and
// from nowhere else. `REFERENCE_RENDER_TOKENS` below exists so the battery test
// in `tests/edge/item392/register-battery.test.ts` can prove that no ADMT
// builder literal carries a token from the reference render.
// ─────────────────────────────────────────────────────────────────────────────

export const ADMT_PLAN_ROW_ID = "f59eb3b8-d747-4110-a3ab-0452e9cf92fd";
export const ADMT_PLAN_VERSION = "prose-plans-2026-08-06-item392";

/** The finalize-point stamp written into `_meta.internal.admt_pipeline_stamp`. */
export const ADMT_PIPELINE_STAMP = "admt-pipeline@item395-2026-08-06";

/** Transcribed verbatim from the approved plan row. */
export const ADMT_THESIS =
  "This assessment decides whether the technology the business described is automated decisionmaking technology used to make a significant decision, and, where it is, states for each of the three consumer rights what the business owes and what its own record shows it has. Where the record does not carry an element the assessment says so once, names the element, and says what would close it.";

export type AdmtArcStage =
  | "headline"
  | "record"
  | "analysis"
  | "duty"
  | "ask"
  | "remedy"
  | "close";

export type AdmtLead = "determination" | "record";

export interface AdmtSectionSpec {
  readonly id: string;
  readonly title: string;
  readonly arc_stage: AdmtArcStage;
  readonly lead: AdmtLead;
  readonly source_key: string;
  readonly themes: readonly string[];
}

/**
 * The 12-section arc, in plan order:
 *   scope/applicability → the three rights (notice, opt-out, access) →
 *   adequacy per element → the consolidated analyses → obligations and
 *   deadlines → what the record does not yet state → actions and records →
 *   the close.
 *
 * DETERMINATION-LEAD DISCIPLINE: sections with `lead: "determination"` open
 * with the finding; sections with `lead: "record"` open with the record.
 */
export const ADMT_SECTION_SPECS: readonly AdmtSectionSpec[] = [
  {
    id: "applicability_verdict",
    title: "Whether these rules apply to this system",
    arc_stage: "headline",
    lead: "determination",
    source_key: "applicability_verdict",
    themes: ["scope", "admt_definition", "significant_decision", "compliance_date"],
  },
  {
    id: "scope_analysis",
    title: "The system as the business described it",
    arc_stage: "record",
    lead: "record",
    source_key: "scope_analysis",
    themes: ["system", "computation", "decision_domain", "human_review", "exception_claimed"],
  },
  {
    id: "notice_analysis",
    title: "The pre-use notice right",
    arc_stage: "analysis",
    lead: "determination",
    source_key: "notice_gaps",
    themes: ["required_elements", "published_text", "purpose_statement", "sufficiency"],
  },
  {
    id: "opt_out_analysis",
    title: "The opt-out right",
    arc_stage: "analysis",
    lead: "determination",
    source_key: "opt_out_gaps",
    themes: ["mechanism", "cessation_timeline", "alternative_process", "exception_dependence"],
  },
  {
    id: "access_analysis",
    title: "The access right",
    arc_stage: "analysis",
    lead: "determination",
    source_key: "access_gaps",
    themes: ["response_elements", "logic_disclosure", "sole_factor", "operational_readiness"],
  },
  {
    id: "adequacy_by_element",
    title: "Whether the record carries each element",
    arc_stage: "analysis",
    lead: "determination",
    source_key: "adequacy_finding",
    themes: ["element_conclusion", "authorities", "open_items_ledger"],
  },
  {
    id: "consolidated_analyses",
    title: "Whether the disclosures may be consolidated",
    arc_stage: "analysis",
    lead: "determination",
    source_key: "consolidated_notice_analysis",
    themes: ["consolidation_scenarios", "aggregate_access", "conditions"],
  },
  {
    id: "obligations_and_deadlines",
    title: "The obligations and when they fall due",
    arc_stage: "duty",
    lead: "determination",
    source_key: "deadline_table",
    themes: ["compliance_dates", "risk_assessment_obligation", "submission"],
  },
  {
    id: "information_needed",
    title: "What the record does not yet state",
    arc_stage: "ask",
    lead: "record",
    source_key: "information_needed",
    themes: ["unresolved_elements", "single_ledger", "what_would_close_it"],
  },
  {
    id: "actions",
    title: "What to do next",
    arc_stage: "remedy",
    lead: "determination",
    source_key: "top_3_actions",
    themes: ["act", "owner", "date", "citation"],
  },
  {
    id: "documentation_to_maintain",
    title: "What to keep on file",
    arc_stage: "remedy",
    lead: "determination",
    source_key: "documentation_to_maintain",
    themes: ["records", "evidence", "retention"],
  },
  {
    id: "close",
    title: "Enforcement context and closing position",
    arc_stage: "close",
    lead: "determination",
    source_key: "enforcement_context",
    themes: ["exposure", "review_trigger", "closing_position"],
  },
] as const;

/** Section id → plan title. Renderers must title sections from here. */
export function admtSectionTitle(id: string, fallback = ""): string {
  return ADMT_SECTION_SPECS.find((s) => s.id === id)?.title ?? fallback;
}

export function admtSectionSpec(id: string): AdmtSectionSpec | undefined {
  return ADMT_SECTION_SPECS.find((s) => s.id === id);
}

/** The document's centre of gravity — the three rights ascend to it. */
export const ADMT_CENTRE_OF_GRAVITY = "adequacy_by_element";

/**
 * Tokens from the fact-exempt reference render. None of these may appear in a
 * builder literal, and none may be seeded into a fixture as record truth.
 * See the HARD RULE at the top of this file.
 */
export const REFERENCE_RENDER_TOKENS: readonly string[] = [
  "TalentRank",
  "LightGBM",
  "résumé scoring",
  "resume scoring",
  "applicant ranking",
  "role profiles",
  "hiring managers receive a ranked list",
];

/**
 * Banned register idiom classes for the ADMT battery test. The plan's register
 * states the same truths plainly: name the element and say what closes it.
 */
export const ADMT_BANNED_REGISTER: readonly { readonly id: string; readonly re: RegExp }[] = [
  { id: "on_the_record", re: /\bon the (?:present )?record\b/i },
  { id: "upon_the_record", re: /\bupon the record\b/i },
  { id: "please", re: /\bplease\b/i },
  { id: "courtroom_herein", re: /\bherein\b|\baforementioned\b|\bthe undersigned\b|\bhereby\b/i },
  {
    id: "internal_vocabulary",
    re: /\bemit[- ]gate\b|\bdegraded leaf\b|\bboilerplate cap\b|\bintake key\b|\binsufficient_basis\b|\bgaps_identified\b|\bnormalized intake\b/i,
  },
];
