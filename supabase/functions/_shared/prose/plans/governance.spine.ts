// ITEM 400 — GOVERNANCE GOLD-STANDARD PROSE ENCODE (LEG A).
//
// SOURCE OF TRUTH: `prose_document_plans` row for product `governance`
// (approved = true, version 2, provenance recording the walked render and,
// verbatim, `panel-delegated approval per CEO delegation 2026-08-06`).
// The row supersedes the unapproved stub 7f168ddb-d419-4f06-8cdc-1cf1fa03be7f
// (`approved=false`, `prose-plans-2026-08-01-item339`); the stub is retained,
// not orphaned, and is named in the new row's provenance.
//
// This module is a FAITHFUL ENCODE of the row: section ids, titles, arc
// stages, leads, source keys and themes are transcribed verbatim.
// `tests/edge/item400/plan-fidelity.test.ts` asserts this encode against the
// row's JSON, so drift in either direction breaks the build.
//
// ─────────────────────────────────────────────────────────────────────────────
// REFERENCE RENDER IS FACT-EXEMPT — HARD RULE.
//
// The walked reference render (quality_run_documents
// cba3724c-ca12-43de-85e4-dd005e5bcf4e — the "Meridian SaaS Inc." governance
// report, top-scored 90.95) is an ARCHITECTURE AND REGISTER reference ONLY.
// No fact, name, figure, entity or scenario from it may ever reach a customer
// document, and none of it may be seeded into a fixture as record truth.
// `REFERENCE_RENDER_TOKENS` below exists so the battery test can prove that no
// governance builder literal carries a token from the reference render.
// ─────────────────────────────────────────────────────────────────────────────

export const GOVERNANCE_PLAN_PRODUCT = "governance";
/** The single governance plan row (public.prose_document_plans). Re-seeded in
 *  place from library/prose/plans/governance.plan.json — the item339 stub
 *  content is superseded, the row itself retained, never orphaned. */
export const GOVERNANCE_PLAN_ROW_ID = "7f168ddb-d419-4f06-8cdc-1cf1fa03be7f";
export const GOVERNANCE_PLAN_ROW_VERSION = 1;
export const GOVERNANCE_PLAN_VERSION_LABEL = "prose-plans-2026-08-07-item400";
export const GOVERNANCE_SUPERSEDED_PLAN_VERSION_LABEL = "prose-plans-2026-08-01-item339";

/** The finalize-point stamp written into `_meta.internal.governance_pipeline_stamp`. */
export const GOVERNANCE_PIPELINE_STAMP = "governance-pipeline@item402-2026-08-07";

/** Transcribed verbatim from the approved plan row. */
export const GOVERNANCE_THESIS =
  "This assessment states, once, whether the organisation can demonstrate compliance under Articles 5(2) and 24(1) from the record it supplied, and then shows the record that produced that answer domain by domain. Where a duty is unevidenced the assessment names the duty, says what artifact would evidence it, and never lets a second verdict speak beside the first.";

export type GovernanceArcStage =
  | "headline"
  | "record"
  | "analysis"
    | "duty"
  | "remedy"
  | "close";

export type GovernanceLead = "determination" | "record";

export interface GovernanceSectionSpec {
  readonly id: string;
  readonly title: string;
  readonly arc_stage: GovernanceArcStage;
  readonly lead: GovernanceLead;
  readonly source_key: string;
  readonly themes: readonly string[];
}

/**
 * The plan arc, in order:
 *   readiness determination → the record as the organisation described it →
 *   per-domain analyses in the document's own order → cross-domain findings →
 *   obligations and gaps → what to do next → close.
 *
 * DETERMINATION-LEAD DISCIPLINE: sections with `lead: "determination"` open
 * with the finding; sections with `lead: "record"` open with the record.
 */
export const GOVERNANCE_SECTION_SPECS: readonly GovernanceSectionSpec[] = [
  {
    id: "readiness_determination",
    title: "Whether the organisation can demonstrate compliance",
    arc_stage: "headline",
    lead: "determination",
    source_key: "accountability_determination",
    themes: ["art_5_2", "art_24_1", "one_verdict", "unevidenced_duties"],
  },
  {
    id: "executive_summary",
    title: "The assessment in short",
    arc_stage: "headline",
    lead: "determination",
    source_key: "executive_summary",
    themes: ["verdict_first", "residual_risks", "ownership"],
  },
  {
    id: "organisation_record",
    title: "The organisation as it described itself",
    arc_stage: "record",
    lead: "record",
    source_key: "organisation_profile",
    themes: ["sector", "jurisdictions", "tools", "data_categories", "size"],
  },
  {
    id: "domain_findings",
    title: "The domains, in the order the record addresses them",
    arc_stage: "analysis",
    lead: "determination",
    source_key: "domain_findings",
    themes: ["regulatory_basis", "control_state", "recommended_action", "severity"],
  },
  {
    id: "domain_element_findings",
    title: "The elements each domain has to carry",
    arc_stage: "analysis",
    lead: "determination",
    source_key: "domain_element_findings",
    themes: ["element_conclusion", "evidence", "ico_audit_framework"],
  },
  {
    id: "cross_domain_findings",
    title: "What the domains say when read together",
    arc_stage: "analysis",
    lead: "determination",
    source_key: "interaction_effects",
    themes: ["interaction", "transfers", "dpo", "risk_calibration", "review_cycle"],
  },
  {
    id: "obligations_and_gaps",
    title: "The obligations and where the record falls short",
    arc_stage: "duty",
    lead: "determination",
    source_key: "open_items",
    themes: ["single_ledger", "unevidenced_duty", "what_would_close_it"],
  },
  {
    id: "remediation_plan",
    title: "What to do next",
    arc_stage: "remedy",
    lead: "determination",
    source_key: "remediation_plan",
    themes: ["act", "owner", "date", "citation"],
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
export function governanceSectionTitle(id: string, fallback = ""): string {
  return GOVERNANCE_SECTION_SPECS.find((s) => s.id === id)?.title ?? fallback;
}

export function governanceSectionSpec(id: string): GovernanceSectionSpec | undefined {
  return GOVERNANCE_SECTION_SPECS.find((s) => s.id === id);
}

/** The document's centre of gravity — every other section ascends to it. */
export const GOVERNANCE_CENTRE_OF_GRAVITY = "readiness_determination";

/**
 * Tokens from the fact-exempt reference render. None of these may appear in a
 * builder literal, and none may be seeded into a fixture as record truth.
 */
export const REFERENCE_RENDER_TOKENS: readonly string[] = [
  "Meridian SaaS Inc.",
  "Meridian SaaS",
  "Meridian",
  "Microsoft 365 / Copilot",
  "Copilot",
];

/**
 * Banned register idiom classes for the governance battery test. The plan's
 * register states the same truths plainly: name the duty and say what
 * evidences it.
 */
export const GOVERNANCE_BANNED_REGISTER: readonly { readonly id: string; readonly re: RegExp }[] = [
  { id: "on_the_record", re: /\bon the (?:present )?record\b/i },
  { id: "upon_the_record", re: /\bupon the record\b/i },
  { id: "please", re: /\bplease\b/i },
  { id: "courtroom_herein", re: /\bherein\b|\baforementioned\b|\bthe undersigned\b|\bhereby\b/i },
  {
    id: "internal_vocabulary",
    re: /\bemit[- ]gate\b|\bdegraded leaf\b|\bboilerplate cap\b|\bintake key\b|\brecord_insufficient\b|\bpartially_satisfied\b|\bnot_satisfied\b|\bnormalized intake\b/i,
  },
];
