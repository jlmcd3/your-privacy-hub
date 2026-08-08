// ITEM 339 (PROSE PROGRAM 3 of 4) — DOCUMENT PLAN: TYPES + LINT.
//
// A DOCUMENT PLAN is the reviewed, pinned shape of one product's report:
// which sections run, in what order, what arc they trace, and — for each —
// whether the section leads with its determination or with record facts.
//
// Plans are derived from the July `sample_reports` corpus by
// `scripts/plans/extract-plans.mjs`. That corpus is a STYLE DONOR ONLY: a plan
// records ORDERING, ARC, and LEAD TYPE. It never carries a sentence, a fact, a
// citation, or a legal standard.
//
// CONCLUSION-FIRST LAW: every section that states an outcome (arc stages
// scope / analysis / duty / remedy / close) MUST lead with its determination.
// Record facts follow, grouped by the theme the engine's own reasoning
// assigned them — never in intake-field order.

import { lintRegisterText } from "./register-lint.ts";

export const DOCUMENT_PLAN_VERSION = "prose-plans-2026-08-04-item372";

export type ArcStage =
  /** Document-level determination, stated before anything else. */
  | "headline"
  | "act"
  | "scope"
  | "record"
  | "analysis"
  | "duty"
  | "ask"
  | "remedy"
  | "communicate"
  | "close";

export const ARC_ORDER: readonly ArcStage[] = [
  "headline",
  "act",
  "scope",
  "record",
  "analysis",
  "duty",
  "ask",
  "remedy",
  "communicate",
  "close",
];

/** Sections whose whole job is to state an outcome. */
export const OUTCOME_STAGES: ReadonlySet<ArcStage> = new Set<ArcStage>([
  "headline",
  "scope",
  "analysis",
  "duty",
  "remedy",
  "close",
]);

export type LeadType = "determination" | "record" | "action";

export interface PlannedSection {
  readonly id: string;
  /** Reader-facing heading. Shape only — carries no legal content. */
  readonly title: string;
  readonly arc_stage: ArcStage;
  readonly lead: LeadType;
  /** Report key this section renders from. */
  readonly source_key: string;
  /**
   * Theme ids, in the order the engine's reasoning produced them. Facts are
   * grouped under these; the ordering is the engine's, not the model's.
   */
  readonly themes: readonly string[];
  /** A section the product must always emit, even when it degrades. */
  readonly required: boolean;
  readonly status: "pending_review" | "approved" | "rejected";
}

export interface PlanProvenance {
  readonly method: "extracted" | "report_keys" | "draft";
  readonly donors_total: number;
  readonly donors_with_text: number;
  readonly extracted_at: string;
  /** For drafts: products whose plans were used as exemplars. */
  readonly exemplars?: readonly string[];
}

/**
 * ITEM 364 — REGISTER PROPAGATION.
 * An EXEMPLAR PAIR pins one BEFORE passage taken from the product's own live
 * output beside the AFTER passage the register asks for. Pairs are review
 * material and prose shape only: the AFTER text may not introduce a fact, a
 * citation, or a legal standard that the BEFORE text did not already carry.
 */
export interface ExemplarPair {
  readonly id: string;
  /** Section id (or report path) the passage was taken from. */
  readonly section_id: string;
  readonly before: string;
  readonly after: string;
  /** Why the AFTER reads better — the register rule the pair demonstrates. */
  readonly note: string;
}

/**
 * ITEM 372 (DPIA QUALITY PILOT, METHOD 3a) — SINGLE-HOME RULE.
 *
 * A cross-cutting finding belongs to exactly one section. Every other section
 * may REFERENCE it and may not argue it again. `anchors` are the factual
 * markers the register lint keys on (a citation, a defined term) — never a
 * legal standard the plan is asserting, only the string that identifies where
 * the point is being argued.
 */
export interface HomeAssignment {
  readonly id: string;
  /** Reader-facing name of the point. Shape only. */
  readonly label: string;
  /** Section id that owns the argument. Must exist in `sections`. */
  readonly home_section_id: string;
  /** Strings that mark the point being argued, e.g. "Art. 4(16)(a)". */
  readonly anchors: readonly string[];
  /** What a non-home section is allowed to say instead of restating. */
  readonly reference_note: string;
}

export type ExtendedExemplarKind = "reference_render";

/**
 * ITEM 372 (METHOD 3b) — REFERENCE RENDER.
 *
 * A whole-document exemplar pinned as FORM guidance: architecture, ordering,
 * and register. `fact_exempt` must be true — the engine may imitate the shape
 * of this document and may never carry a fact, a party, a figure, or a finding
 * out of it into a customer's report.
 */
export interface ExtendedExemplar {
  readonly id: string;
  readonly kind: ExtendedExemplarKind;
  /** Where the text came from, and on whose authority it is pinned. */
  readonly provenance: string;
  readonly fact_exempt: true;
  readonly text: string;
  readonly note?: string;
}

export interface DocumentPlan {
  readonly product: string;
  readonly version: string;
  /** Only true once a CEO sign-off on the before/after pair is in the ledger. */
  readonly approved: boolean;
  readonly approved_in_ledger_item?: string;
  readonly provenance: PlanProvenance;
  readonly sections: readonly PlannedSection[];
  /** The document's controlling sentence — what the whole report argues. */
  readonly thesis?: string;
  readonly exemplar_pairs?: readonly ExemplarPair[];
  /** ITEM 372 — cross-cutting points and the one section that owns each. */
  readonly home_assignments?: readonly HomeAssignment[];
  /** ITEM 372 — whole-document form exemplars (fact-exempt). */
  readonly extended_exemplars?: readonly ExtendedExemplar[];
}


// ---------------------------------------------------------------------------
// LINT
// ---------------------------------------------------------------------------

export type PlanLintRule =
  | "duplicate_section_id"
  | "arc_regression"
  | "conclusion_first_violation"
  | "empty_plan"
  | "missing_themes"
  | "unknown_arc_stage"
  | "legal_content_in_title"
  | "legal_content_in_thesis"
  | "register_defect_in_thesis"
  | "thesis_too_long"
  | "register_defect_in_exemplar"
  | "exemplar_pair_incomplete"
  | "home_assignment_unknown_section"
  | "home_assignment_incomplete"
  | "duplicate_home_assignment"
  | "extended_exemplar_incomplete"
  | "extended_exemplar_not_fact_exempt";

export interface PlanLintFinding {
  readonly rule: PlanLintRule;
  readonly section_id?: string;
  readonly detail: string;
}

/** Titles are shape. Anything that looks like law in a title fails the gate. */
const LEGAL_IN_TITLE: readonly RegExp[] = [
  /§+\s*\d/,
  /\bArt(?:icle|\.)\s*\d/i,
  /\b\d{2}\s*CCR\b/i,
  /\bGDPR\b|\bCCPA\b|\bCPRA\b/i,
];

export function lintPlan(plan: DocumentPlan): PlanLintFinding[] {
  const out: PlanLintFinding[] = [];
  if (!plan.sections.length) {
    out.push({ rule: "empty_plan", detail: `plan for ${plan.product} has no sections` });
    return out;
  }

  const seen = new Set<string>();
  let highWater = -1;

  for (const s of plan.sections) {
    if (seen.has(s.id)) {
      out.push({ rule: "duplicate_section_id", section_id: s.id, detail: `duplicate id ${s.id}` });
    }
    seen.add(s.id);

    const idx = ARC_ORDER.indexOf(s.arc_stage);
    if (idx === -1) {
      out.push({
        rule: "unknown_arc_stage",
        section_id: s.id,
        detail: `unknown arc stage ${s.arc_stage}`,
      });
    } else if (idx < highWater) {
      out.push({
        rule: "arc_regression",
        section_id: s.id,
        detail: `${s.arc_stage} follows ${ARC_ORDER[highWater]}; the arc may not run backwards`,
      });
    } else {
      highWater = idx;
    }

    if (OUTCOME_STAGES.has(s.arc_stage) && s.lead !== "determination") {
      out.push({
        rule: "conclusion_first_violation",
        section_id: s.id,
        detail: `${s.arc_stage} section leads with "${s.lead}"; outcome sections must lead with the determination`,
      });
    }

    if (!s.themes.length) {
      out.push({
        rule: "missing_themes",
        section_id: s.id,
        detail: `${s.id} declares no themes; facts would fall back to intake order`,
      });
    }

    if (LEGAL_IN_TITLE.some((re) => re.test(s.title))) {
      out.push({
        rule: "legal_content_in_title",
        section_id: s.id,
        detail: `title carries legal content: ${s.title}`,
      });
    }
  }

  // ITEM 364 — the thesis is shape, not law: it says what the document argues,
  // never what the law requires.
  if (plan.thesis && LEGAL_IN_TITLE.some((re) => re.test(plan.thesis!))) {
    out.push({
      rule: "legal_content_in_thesis",
      detail: `thesis carries legal content: ${plan.thesis}`,
    });
  }

  // ITEM 364 (DISPATCH 2 CORRECTION) — PLAN METADATA IS PROSE TOO.
  // The thesis and every exemplar AFTER passage are read by the model and by
  // the reviewer as the register's own specimen text. Until this ran, a plan
  // could carry banned diction in its thesis and still lint clean — and since
  // every section opener must advance the thesis, that phrasing would bleed
  // straight into rendered prose. Both surfaces now go through the register
  // battery itself, so there is one definition of the register, not two.
  // WAVE 1 PANEL CORRECTION — register A1 (CEO-amended) allows a one- or
  // two-sentence thesis. A third sentence is a finding, not a style note.
  if (plan.thesis) {
    const sentences = plan.thesis.split(/(?<=[.!?])\s+/).filter((s) => s.trim().length > 0);
    if (sentences.length > 2) {
      out.push({
        rule: "thesis_too_long",
        detail: `thesis runs ${sentences.length} sentences; the register allows one or two`,
      });
    }
  }

  for (const f of lintRegisterText("thesis", plan.thesis ?? "")) {
    out.push({
      rule: "register_defect_in_thesis",
      detail: `thesis fails the register (${f.rule}: ${f.detail})`,
    });
  }

  for (const pair of plan.exemplar_pairs ?? []) {
    if (!pair.before.trim() || !pair.after.trim() || !pair.note.trim()) {
      out.push({
        rule: "exemplar_pair_incomplete",
        section_id: pair.section_id,
        detail: `exemplar pair ${pair.id} must carry a before, an after, and a note`,
      });
    }
    // The BEFORE passage is quoted live output and is expected to be dirty;
    // only the AFTER passage is held to the register.
    for (const f of lintRegisterText(pair.id, pair.after)) {
      out.push({
        rule: "register_defect_in_exemplar",
        section_id: pair.section_id,
        detail: `${pair.id} AFTER fails the register (${f.rule}: ${f.detail})`,
      });
    }
  }

  // ITEM 372 (METHOD 3a) — home assignments must point at real sections, must
  // be unique, and must carry the anchors the register lint keys on.
  const sectionIds = new Set(plan.sections.map((s) => s.id));
  const seenHome = new Set<string>();
  for (const h of plan.home_assignments ?? []) {
    if (seenHome.has(h.id)) {
      out.push({
        rule: "duplicate_home_assignment",
        detail: `home assignment ${h.id} is declared more than once`,
      });
    }
    seenHome.add(h.id);
    if (!sectionIds.has(h.home_section_id)) {
      out.push({
        rule: "home_assignment_unknown_section",
        section_id: h.home_section_id,
        detail: `home assignment ${h.id} names section ${h.home_section_id}, which the plan does not declare`,
      });
    }
    if (!h.label.trim() || !h.reference_note.trim() || h.anchors.length === 0) {
      out.push({
        rule: "home_assignment_incomplete",
        detail: `home assignment ${h.id} needs a label, at least one anchor, and a reference note`,
      });
    }
  }

  // ITEM 372 (METHOD 3b) — a reference render is form guidance, and the plan
  // has to say so in the row itself. Its prose is NOT register-linted: it is a
  // finished document quoted verbatim, not a specimen sentence.
  for (const x of plan.extended_exemplars ?? []) {
    if (!x.text.trim() || !x.provenance.trim()) {
      out.push({
        rule: "extended_exemplar_incomplete",
        detail: `extended exemplar ${x.id} needs text and provenance`,
      });
    }
    if (x.fact_exempt !== true) {
      out.push({
        rule: "extended_exemplar_not_fact_exempt",
        detail: `extended exemplar ${x.id} must be marked fact_exempt: its facts may never reach a customer document`,
      });
    }
  }

  return out;
}

/**
 * ITEM 372 (METHOD 3a) — the prompt block one section receives: the points
 * owned elsewhere, and the instruction to reference rather than restate.
 * Returns "" when the plan assigns nothing away from this section.
 */
export function homeAssignmentRulesFor(plan: DocumentPlan, sectionId: string): string {
  const elsewhere = (plan.home_assignments ?? []).filter((h) => h.home_section_id !== sectionId);
  if (!elsewhere.length) return "";
  const titleOf = (id: string) => plan.sections.find((s) => s.id === id)?.title ?? id;
  const lines = elsewhere.map(
    (h) => `- ${h.label} is argued in "${titleOf(h.home_section_id)}". ${h.reference_note}`,
  );
  return [
    "SINGLE-HOME RULE — the following points are owned by another section of this document.",
    "Reference them; do not restate the argument, do not re-cite the anchor in full, and do not repeat the reasoning.",
    ...lines,
  ].join("\n");
}

/** The whole single-home block, for a prompt that builds every section at once. */
export function homeAssignmentPromptBlock(plan: DocumentPlan): string {
  const list = plan.home_assignments ?? [];
  if (!list.length) return "";
  const titleOf = (id: string) => plan.sections.find((s) => s.id === id)?.title ?? id;
  const lines = list.map(
    (h) =>
      `- ${h.label} → argued once, in "${titleOf(h.home_section_id)}". Everywhere else: ${h.reference_note}`,
  );
  return [
    "SINGLE-HOME RULE (one point, one home). Each cross-cutting point below is argued in full in exactly one section.",
    "Every other section that touches it refers to it in a clause and moves on — no second statement of the reasoning, no repeat of the citation in full.",
    ...lines,
  ].join("\n");
}

/**
 * A product renders through its plan only when the plan is approved, every
 * section is approved, and the plan is lint-clean.
 */
export function planRenderable(plan: DocumentPlan): boolean {
  return (
    plan.approved &&
    plan.sections.length > 0 &&
    plan.sections.every((s) => s.status === "approved") &&
    lintPlan(plan).length === 0
  );
}
