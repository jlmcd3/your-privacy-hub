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

export const DOCUMENT_PLAN_VERSION = "prose-plans-2026-08-01-item339";

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
  | "register_defect_in_exemplar"
  | "exemplar_pair_incomplete";

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

  return out;
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
