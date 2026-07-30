/**
 * LTP Section Composers — cppa-risk (ITEM 240 CP4 — LABELS + PER-INSTANCE CITATIONS).
 *
 * CP4 fixes (2026-07-28):
 *   (a) DISPLAY-LABEL LAYER: every customer-facing label resolves via the
 *       registry's display_label (ConclusionSpec.display_label / FactorRow.label),
 *       never via humanize(id). Registry-id shapes are structurally
 *       unshippable — enforced downstream by value-screen's REGISTRY_ID_PATTERNS.
 *   (b) PER-PROPOSITION CITATION BINDING: every template instance carries
 *       ctx.__cite pinpoints from ITS OWN anchor (proposition/factor/gate).
 *       Scope & Triggers renders one instance PER § 7150(b) prong with the
 *       correct engaged/not-engaged from gate outcomes and each with its
 *       own pinpoint. Ends the global-first-binding fallback class.
 *   (c) EXEC/BALANCE COHERENCE: composeExecutive consumes the same
 *       aggregateBalance(plan) mode that balanceInstance uses.
 */
import type { RenderPlan, FactorTableEntry, Proposition, StatutoryAnchor, GateRuleOutcome } from "../../render-plan/schema.ts";
import type { SlotContext } from "../slot-resolver.ts";
import { FIRM_VARIANT_CLOSENESS_MAX, RECORD_STATUS_CLAUSES, SUMMARY_ACTIVITY_SINGPLURAL_CLAUSES, SUMMARY_EACH_OR_THIS_CLAUSES, BALANCE_DIRECTION_CLAUSES } from "../content/pass2-templates.ts";
import { computeCloseness, chooseVariant } from "../closeness.ts";
import { CPPA_RISK_CONCLUSIONS, CPPA_RISK_CONCLUSION_INDEX, type ConclusionSpec } from "../../legal-test/cppa-risk-conclusions.ts";
import { selectDeadlineOrFallback } from "../../legal-test/cppa-risk-deadlines.ts";
import { CPPA_RISK_GATE_INDEX } from "../../gates/cppa-risk-gates.ts";
import {
  CCPA_7150_B_1, CCPA_7150_B_2, CCPA_7150_B_3, CCPA_7150_B_4, CCPA_7150_B_5, CCPA_7150_B_6,
  CCPA_7150_B_LABELS,
} from "../../openings/ccpa-7150-pin.ts";

export const SECTION_COMPOSERS_VERSION = "ltp-section-composers-cppa-risk-2026-07-30-item276-primary-subject";

/**
 * BATCH 55b9f3a2 ADDENDUM (e) — ADMT-INAPPLICABILITY EXPLANATION.
 * Verbatim clause emitted in record_sufficiency when q18_admt_use is
 * negative AND q5b_profiling is affirmative, distinguishing ADMT-use
 * from systematic-observation profiling.
 */
export const ADMT_INAPPLICABILITY_EXPLANATION =
  "ADMT-specific governance is inapplicable because the record states no ADMT is in use; the profiling activity is assessed under the § 7150(b)(4) trigger and its own safeguards.";

/**
 * ITEM 242 CP-B FINAL — CEO-ratified per-KIND opener stems.
 * Consumed as `element_short_label` PREFIX in T.risk.priority_action.golden
 * per courier §2.1. Bold header becomes `${STEM} ${label}`. Rest of the
 * golden template (customer_recorded_fact_clause, gap_or_consequence,
 * compliance_guidance, deadline_sentence, owner) continues to render.
 */
export type ActionKind =
  | "benefit_absent"
  | "harm_absent"
  | "safeguard_absent"
  | "gate_unresolved"
  | "type_j_reserved"
  | "conditional";

export const KIND_OPENERS: Readonly<Record<ActionKind, string>> = {
  benefit_absent: "Additional information would be needed to substantiate the stated benefit of",
  harm_absent: "Additional information would be needed to address the potential negative impact category",
  safeguard_absent: "Additional information would be needed to document the safeguard",
  gate_unresolved: "Additional information would be needed for",
  type_j_reserved: "Qualified counsel should be consulted for further consideration of",
  conditional: "Additional information would be necessary to substantiate",
};

export const FAMILY_THRESHOLDS: Readonly<Record<"harm" | "safeguard" | "benefit", number>> = {
  harm: 2,
  safeguard: 2,
  benefit: 3,
};

export { aggregateBalance, DOCUMENTATION_FACTUAL_GATE_IDS, DOCUMENTATION_JUDGMENT_GATE_IDS };
// ITEM 242 batch-3 A — expose the two composers under test for the
// deterministic-fix asserts (defects 3, 4, 6, 7).
export { composePriorityActions as composePriorityActionsForTest };
export { composeRecordSufficiency as composeRecordSufficiencyForTest };
export type { BalanceMode };

/**
 * ITEM 241.3 CONDITION 5 (Type-J engineering rider) — DOCUMENTATION GATE
 * PARTITION. Factual gates count against record sufficiency; judgment
 * gates are reserved decisions (never record gaps). `insufficientRecord`
 * and `aggregateBalance` restrict to the factual subset only, per the
 * courier's Engineering Rider and the CEO's binding CONDITION 5.
 *
 * The judgment subset is enumerated for future protection: today
 * cppa-risk-gates.ts declares only factual documentation gates, but any
 * future j.* documentation gate MUST land in the judgment set so the
 * predicate cannot regress.
 */
const DOCUMENTATION_FACTUAL_GATE_IDS: ReadonlySet<string> = new Set([
  "G.documentation.purpose_present",
  "G.documentation.categories_present",
  "G.documentation.operational_elements_present",
  "G.documentation.approver_present",
]);

const DOCUMENTATION_JUDGMENT_GATE_IDS: ReadonlySet<string> = new Set([
  "G.documentation.initiation_decision",
  "G.documentation.purpose_specificity",
  "G.documentation.safeguard_sufficiency",
]);


export interface TemplateInstance {
  readonly template_id: string;
  readonly ctx: SlotContext;
  /**
   * ITEM 264 — ONE-ITEM AGGREGATION. Ordered ratified template instances
   * whose rendered texts the assembler JOINS (single space) into ONE
   * shipped list item. Mechanical join only — no prose is authored here.
   * `template_id` on the carrier is the calibration-bearing part id.
   */
  readonly parts?: readonly TemplateInstance[];
}

// ── Registry-backed label + anchor lookups ───────────────────────────────

const BALANCE_ANCHOR: StatutoryAnchor =
  CPPA_RISK_CONCLUSION_INDEX["w.balance.risks_vs_benefits"]?.anchor
  ?? { corpus_key: "cppa-7152", pinpoint: "11 CCR § 7152(a)" };

const DOC_APPROVER_ANCHOR: StatutoryAnchor =
  CPPA_RISK_CONCLUSION_INDEX["r.documentation.approver_present"]?.anchor
  ?? { corpus_key: "cppa-7152", pinpoint: "11 CCR § 7152(a)(9)" };

function conclusionAnchor(conclusionId: string): StatutoryAnchor | undefined {
  return CPPA_RISK_CONCLUSION_INDEX[conclusionId]?.anchor;
}

function conclusionLabel(conclusionId: string): string {
  return CPPA_RISK_CONCLUSION_INDEX[conclusionId]?.display_label ?? "";
}

function propLabel(p: Proposition): string {
  return p.display_label ?? conclusionLabel(p.conclusion_id) ?? "";
}

function factorLabel(f: FactorTableEntry): string {
  return f.display_label ?? "";
}

const joinList = (labels: readonly string[]): string => {
  const clean = labels.filter((s) => typeof s === "string" && s.trim().length > 0);
  if (clean.length === 0) return "";
  if (clean.length === 1) return clean[0];
  if (clean.length === 2) return `${clean[0]} and ${clean[1]}`;
  return `${clean.slice(0, -1).join(", ")}, and ${clean[clean.length - 1]}`;
};

const pluralActivityPhrase = (n: number): string =>
  n <= 0
    ? "no activities identified as requiring assessment"
    : n === 1
      ? "one activity requiring assessment"
      : `${n} activities requiring assessment`;

const engagedApplicability = (plan: RenderPlan): Proposition[] =>
  plan.propositions.filter(
    (p) => p.epistemic_type === "R" && (p as { polarity?: string }).polarity === "positive"
      && /appl(icab|y)/i.test(p.conclusion_id),
  );

const activityCount = (plan: RenderPlan): number => engagedApplicability(plan).length;

/**
 * ITEM 241.3 CONDITION 5 — insufficiency derives from the FACTUAL
 * documentation-gate subset only. Judgment-subset gates are reserved
 * decisions and cannot cause an insufficient exec on a docs-complete
 * record. See DOCUMENTATION_FACTUAL_GATE_IDS / DOCUMENTATION_JUDGMENT_GATE_IDS.
 */
const insufficientRecord = (plan: RenderPlan): boolean =>
  plan.gate_outcomes.some(
    (g) => DOCUMENTATION_FACTUAL_GATE_IDS.has(g.gate_id) && g.outcome !== "pass",
  );

const anyImpactsOutweigh = (plan: RenderPlan): boolean => {
  const benefits = plan.factor_table.filter((f) => f.kind === "benefit" && f.present_in_intake).length;
  const negatives = plan.factor_table.filter((f) => f.kind === "negative_impact" && f.present_in_intake).length;
  return negatives > 0 && negatives > benefits;
};

/**
 * BATCH 55b9f3a2 ADDENDUM (c) — BALANCE-SUBSTANCE RULE.
 * A firm benefits-outweigh conclusion REQUIRES ≥1 present benefit on
 * the record. Zero present benefits → balance renders reserved/
 * insufficient; the exec-summary never asserts an outweigh over an
 * empty benefit column. Evidence: doc 2e697bf1's state.
 */
const anyPresentBenefit = (plan: RenderPlan): boolean =>
  plan.factor_table.some((f) => f.kind === "benefit" && f.present_in_intake);

type BalanceMode = "insufficient" | "negative" | "hedged" | "firm";
function aggregateBalance(plan: RenderPlan): BalanceMode {
  if (insufficientRecord(plan)) return "insufficient";
  if (anyImpactsOutweigh(plan)) return "negative";
  if (!anyPresentBenefit(plan)) return "insufficient";
  const closeness = computeCloseness(plan, plan.weighing_frame);
  return chooseVariant(closeness) === "hedged" ? "hedged" : "firm";
}



// ── ITEM 276 — PRIMARY-ACTIVITY SUBJECT HELPERS ──────────────────────────
//
// REDESIGN STEP 2: the subject of the assessment is the customer-named
// PRIMARY ACTIVITY (Item-275 intake fields), not the list of engaged
// § 7150(b) prongs. MANDATORY DEGRADATION LAW: when `primary_activity_name`
// is absent from the ledger (every pre-Item-275 document), every composer
// below falls through to its prior prong-derived behaviour byte-for-byte.

/** § 7156(a) comparable-set dimensions, keyed as the Item-275 intake emits them. */
const DIVERGENCE_DIMENSION_LABELS: Readonly<Record<string, string>> = {
  data: "the personal information used",
  purpose: "the purpose of the processing",
  systems: "the systems, technology, and service providers used",
  people: "the consumers whose information is processed",
  risks: "the risks to consumers' privacy and the safeguards applied",
};

const SECONDARY_ANCHOR_7156A = "11 CCR § 7156(a)";

interface SecondaryActivityRow {
  readonly name: string;
  readonly purpose: string;
  readonly divergence: Readonly<Record<string, string>>;
}

function primaryActivityName(plan: RenderPlan): string {
  return pickIntakeValue(plan, "primary_activity_name");
}

function primaryActivityPurpose(plan: RenderPlan): string {
  return pickIntakeValue(plan, "primary_activity_purpose");
}

/**
 * `secondary_activities` reaches the ledger as a JSON string (pickLedger
 * stringifies non-scalars). Parse defensively; any malformed payload
 * degrades to an empty set rather than throwing.
 */
function secondaryActivityRows(plan: RenderPlan): SecondaryActivityRow[] {
  const raw = pickIntakeValue(plan, "secondary_activities");
  if (!raw) return [];
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return [];
  }
  if (!Array.isArray(parsed)) return [];
  const out: SecondaryActivityRow[] = [];
  for (const r of parsed) {
    if (!r || typeof r !== "object") continue;
    const rec = r as Record<string, unknown>;
    const name = typeof rec.name === "string" ? rec.name.trim() : "";
    if (!name) continue;
    const purpose = typeof rec.purpose === "string" ? rec.purpose.trim() : "";
    const divergence: Record<string, string> = {};
    const d = rec.divergence;
    if (d && typeof d === "object") {
      for (const [k, v] of Object.entries(d as Record<string, unknown>)) {
        if (typeof v === "string" && v.trim()) divergence[k] = v.trim();
      }
    }
    out.push({ name, purpose, divergence });
  }
  return out;
}

/** Dimensions answered "Not sure" across all secondary rows (deduplicated, registry order). */
function unresolvedDivergenceDimensions(rows: readonly SecondaryActivityRow[]): string[] {
  const keys = Object.keys(DIVERGENCE_DIMENSION_LABELS);
  return keys.filter((k) => rows.some((r) => r.divergence[k] === "Not sure"));
}


// ── Composers ────────────────────────────────────────────────────────────

function composeExecutive(plan: RenderPlan): TemplateInstance[] {
  // ITEM 276 — when the customer named the assessed activity, the subject
  // of the executive summary is THAT activity (exactly one), and a lead
  // instance names it before any weighing language. Legacy records with no
  // `primary_activity_name` keep the prong-count subject verbatim.
  const primaryName = primaryActivityName(plan);
  const lead: TemplateInstance[] = primaryName
    ? [{
        template_id: "T.risk.exec.primary_subject_lead",
        ctx: {
          primary_activity_name: primaryName,
          primary_activity_purpose_clause:
            primaryActivityPurpose(plan) || "a purpose not stated on the record",
        },
      }]
    : [];
  const n = primaryName ? 1 : activityCount(plan);
  const each = n === 1 ? SUMMARY_EACH_OR_THIS_CLAUSES[0] : SUMMARY_EACH_OR_THIS_CLAUSES[1];
  const singplural = n === 1 ? SUMMARY_ACTIVITY_SINGPLURAL_CLAUSES[0] : SUMMARY_ACTIVITY_SINGPLURAL_CLAUSES[1];
  const acp = pluralActivityPhrase(n);
  const engagedLabels = engagedApplicability(plan).map(propLabel);
  const mode = aggregateBalance(plan);
  if (mode === "insufficient" || engagedLabels.length === 0) {
    return [
      ...lead,
      { template_id: "T.risk.exec.insufficient", ctx: { activity_singplural_clause: singplural } },
    ];
  }
  const engagedList = primaryName || joinList(engagedLabels);
  if (mode === "negative") {
    return [...lead, {
      template_id: "T.risk.exec.negative",
      ctx: {
        activity_count_phrase: acp,
        negative_list: engagedList,
        remaining_outcomes_clause: "",
      },
    }];
  }
  if (mode === "hedged") {
    const tipping = plan.weighing_frame
      .slice()
      .sort((a, b) => (b.closeness_contribution ?? 0) - (a.closeness_contribution ?? 0))
      .slice(0, 3)
      .map((f) => f.anchor_hint || f.pinpoint);
    return [...lead, {
      template_id: "T.risk.exec.hedged",
      ctx: {
        activity_count_phrase: acp,
        close_list: engagedList,
        what_would_tip_it: joinList(tipping) || "the balance of benefits, negative impacts, and safeguards on the record",
        remaining_outcomes_clause: "",
      },
    }];
  }
  return [...lead, {
    template_id: "T.risk.exec.firm",
    ctx: { activity_count_phrase: acp, each_or_this_clause: each },
  }];
}

function balanceInstance(plan: RenderPlan): TemplateInstance {
  const mode = aggregateBalance(plan);
  const benefits = plan.factor_table.filter((f) => f.kind === "benefit" && f.present_in_intake);
  const negatives = plan.factor_table.filter((f) => f.kind === "negative_impact" && f.present_in_intake);
  const safeguards = plan.factor_table.filter((f) => f.kind === "safeguard" && f.present_in_intake);
  const benefit_summary_tokens = joinList(benefits.map(factorLabel)) || "the benefits documented on the record";
  const negative_summary_tokens = joinList(negatives.map(factorLabel)) || "the potential negative impacts documented on the record";
  const safeguard_summary_tokens = joinList(safeguards.map(factorLabel)) || "the safeguards documented on the record";
  const tipping = plan.weighing_frame
    .slice()
    .sort((a, b) => (b.closeness_contribution ?? 0) - (a.closeness_contribution ?? 0))
    .slice(0, 3)
    .map((f) => f.anchor_hint || f.pinpoint);
  const tipping_factors = joinList(tipping) || "the balance of benefits, negative impacts, and safeguards on the record";
  const baseCite = { PINPOINT_7152A5: BALANCE_ANCHOR.pinpoint, PINPOINT_7152A: BALANCE_ANCHOR.pinpoint, PINPOINT_7152: BALANCE_ANCHOR.pinpoint };
  // CP5 (b) — coherence: `insufficient` mode routes to the docs template so
  // aggregateBalance("insufficient") NEVER produces firm/hedged balance prose.
  if (mode === "insufficient") {
    return {
      template_id: "T.risk.summary.docs",
      ctx: {
        docs_completion_clause: "has outstanding documentation items — see Items for your review; the record does not yet complete",
        __cite: { PINPOINT_7152A: BALANCE_ANCHOR.pinpoint },
      },
    };
  }
  if (mode === "hedged") {
    return {
      template_id: "T.risk.balance.hedged",
      ctx: {
        benefit_summary_tokens,
        negative_summary_tokens,
        tipping_factors,
        what_would_tip_it: tipping_factors,
        __cite: baseCite,
      },
    };
  }
  // ITEM 273 FIX 3 — BALANCE-VERDICT GUARD (interim, Issue 10).
  // CEO-read finding 2: the "negative" mode derives from CATEGORY COUNTING
  // (anyImpactsOutweigh) but was rendered as a FIRM affirmative weighing
  // verdict — a § 7154 exposure. Until the §2R weighted-weighing design
  // lands, a count-driven negative may NOT assert that the negative
  // impacts outweigh the benefits. It routes to the reserved
  // does-not-support framing instead, so BALANCE_DIRECTION_CLAUSES[1] is
  // UNREACHABLE from this composer.
  if (mode === "negative") {
    return {
      template_id: "T.risk.summary.docs",
      ctx: {
        docs_completion_clause:
          "records negative impacts that the documented benefits and safeguards do not, on this record, support a benefits-outweigh conclusion against; the weighing is reserved to the customer and qualified legal counsel and the record does not yet complete",
        __cite: { PINPOINT_7152A: BALANCE_ANCHOR.pinpoint },
      },
    };
  }
  return {
    template_id: "T.risk.balance.firm",
    ctx: {
      benefit_summary_tokens,
      negative_summary_tokens,
      safeguard_summary_tokens,
      balance_direction_clause: BALANCE_DIRECTION_CLAUSES[0],
      __cite: baseCite,
    },
  };
}


function composeAssessmentSummary(plan: RenderPlan): TemplateInstance[] {
  if (insufficientRecord(plan)) {
    return [{
      template_id: "T.risk.summary.docs",
      ctx: {
        docs_completion_clause: "has outstanding documentation items — see Items for your review; the record does not yet complete",
        __cite: { PINPOINT_7152A: BALANCE_ANCHOR.pinpoint },
      },
    }];
  }
  return [
    balanceInstance(plan),
    {
      template_id: "T.risk.summary.docs",
      ctx: {
        docs_completion_clause: "is complete against",
        __cite: { PINPOINT_7152A: BALANCE_ANCHOR.pinpoint },
      },
    },
  ];
}

/**
 * ITEM 264 — ENRICHED BALANCE RATIONALE (wiring of CEO-ratified content).
 *
 * Ratified composition order (CONTENT COURIER 2026-07-27,
 * pass2-templates.ts "ENRICHED BALANCE RATIONALE"):
 *   benefit factor_lines → negative factor_lines → safeguard factor_lines
 *   → existing firm/hedged conclusion sentence.
 * Prefixed by the record-status sentence (T.risk.summary.docs) already
 * driven by the same `insufficientRecord` boolean.
 *
 * factor_basis = the factor row's `weight_note` VERBATIM (facts only).
 * guidance_clause renders ONLY from the row's guidance_refs, in the
 * ratified canonical phrasing; rows with no guidance_refs (or no
 * weight_note) render basis-only / are not emitted — no invented reasoning.
 */
const GUIDANCE_CLAUSE_STEM =
  "The Agency's Final Statement of Reasons addresses this consideration:";

function guidanceClause(f: FactorTableEntry): { clause: string; pinpoint: string } {
  const ref = f.guidance_refs?.find((g) => typeof g?.regulation_citation === "string" && g.regulation_citation.trim().length > 0);
  if (!ref) return { clause: "", pinpoint: f.anchor?.pinpoint ?? BALANCE_ANCHOR.pinpoint };
  const pin = ref.regulation_citation.trim();
  return { clause: `${GUIDANCE_CLAUSE_STEM} ${pin}.`, pinpoint: pin };
}

function factorLine(f: FactorTableEntry): TemplateInstance | null {
  const label = factorLabel(f);
  const basis = (f.weight_note ?? "").trim();
  if (!label || !basis) return null; // basis-less rows are never emitted
  const g = guidanceClause(f);
  return {
    template_id: "T.risk.balance.factor_line",
    ctx: {
      factor_label: label,
      factor_basis: basis.replace(/\s*\.\s*$/, ""),
      guidance_clause: g.clause,
      __cite: { GUIDANCE_PIN: g.pinpoint },
    },
  };
}

function recordStatusInstance(plan: RenderPlan): TemplateInstance {
  return {
    template_id: "T.risk.summary.docs",
    ctx: {
      docs_completion_clause: insufficientRecord(plan)
        ? "has outstanding documentation items — see Items for your review; the record does not yet complete"
        : "is complete against",
      __cite: { PINPOINT_7152A: BALANCE_ANCHOR.pinpoint },
    },
  };
}

function presentFactorLines(plan: RenderPlan, kind: FactorTableEntry["kind"]): TemplateInstance[] {
  return plan.factor_table
    .filter((f) => f.kind === kind && f.present_in_intake)
    .map(factorLine)
    .filter((i): i is TemplateInstance => i !== null);
}

function composeRiskByActivity(plan: RenderPlan): TemplateInstance[] {
  // ITEM 244 (L3) — Less-intrusive-alternatives line. Correction 3:
  // pinpoint verified as § 7152(a)(2) (minimum PI necessary); no
  // verbatim "less-intrusive alternatives" leaf exists in cppa-7152.
  const LIA_PINPOINT = "11 CCR § 7152(a)(2)";
  const liaText = pickIntakeValue(plan, "i1b_min_pi");
  const liaLine: TemplateInstance = liaText
    ? {
        template_id: "T.risk.less_intrusive_alternatives.present",
        ctx: {
          entity_name: entityName(plan),
          i1b_min_pi_clause: liaText,
          __cite: { PINPOINT: LIA_PINPOINT },
        },
      }
    : {
        template_id: "T.risk.less_intrusive_alternatives.silent",
        ctx: {
          entity_name: entityName(plan),
          __cite: { PINPOINT: LIA_PINPOINT },
        },
      };

  const rationaleParts = (activityLabel?: string): TemplateInstance[] => {
    const conclusion = balanceInstance(plan);
    const conclusionPart: TemplateInstance = activityLabel
      ? { template_id: conclusion.template_id, ctx: { ...conclusion.ctx, activity_label: activityLabel } }
      : conclusion;
    return [
      recordStatusInstance(plan),
      ...presentFactorLines(plan, "benefit"),
      ...presentFactorLines(plan, "negative_impact"),
      ...presentFactorLines(plan, "safeguard"),
      conclusionPart,
    ];
  };

  // ITEM 266 — HONEST CONSOLIDATION.
  //
  // The Item-264 rationale is composed entirely from plan-GLOBAL artifacts
  // (documentation gates, factor_table, closeness). Nothing in the current
  // RenderPlan scopes factors or weight notes to individual activities, so
  // per-activity emission necessarily produced byte-identical clones
  // (ramp-1 attempt 8, job 54a21294: four items, each 5,506 chars, items 0
  // and 1 verified byte-identical). Presenting one record-level analysis
  // N times fabricates differentiation the plan does not contain.
  //
  // Therefore: ONE combined rationale item. The engaged activities are
  // ENUMERATED into the existing ratified conclusion carrier's
  // activity_label slot via the existing joinList mechanics — no new
  // sentence frame. Single-activity behaviour is unchanged from Item 264.
  // ITEM 276 — the rationale carrier's subject is the named primary
  // activity when the record supplies one; otherwise the engaged-prong
  // enumeration retained from Item 266.
  const primaryName = primaryActivityName(plan);
  const engaged = engagedApplicability(plan);
  if (engaged.length === 0) {
    if (!insufficientRecord(plan)) {
      const parts = rationaleParts(primaryName || undefined);
      return [
        { template_id: parts[parts.length - 1].template_id, ctx: parts[parts.length - 1].ctx, parts },
        liaLine,
      ];
    }
    return [];
  }
  const parts = rationaleParts(primaryName || joinList(engaged.map(propLabel)));
  const carrier = parts[parts.length - 1];
  return [
    { template_id: carrier.template_id, ctx: carrier.ctx, parts },
    liaLine,
  ];
}

// ── ITEM 241.3 — Gap-driven four-move action composer ────────────────────
//
// Sources, in order (Golden Shape §2):
//   (1) absent mandatory factors, (2) safeguard gaps, (3) Type-J
//   reserved judgments, (4) unresolved factual documentation gates,
//   (5) conditional obligations, (6) present-but-thin factors as
//   "strengthen" actions. Each emission uses the four-move template
//   T.risk.priority_action.golden and consumes exactly one deadline row
//   via selectDeadlineOrFallback (ONE-DEADLINE-PER-ACTION LAW).

/**
 * ITEM 262 — VALUE/DISPLAY SEAM.
 *
 * Item 243 defect 1(d) redefined `IntakeLedgerEntry.display` to carry the
 * human FIELD LABEL (grounded-note vocabulary fix). Every composer call
 * site below consumes the intake VALUE — entity names, yes/no predicates,
 * cohort markers, role titles, narrative clauses — so they read `.value`.
 * The residue "On entity name's record..." (ramp-1 attempt 6, job 1f04fff5)
 * was the observable symptom of the dual-authorship break.
 *
 * The former label-reading picker is REMOVED: no composer site genuinely
 * wants the field label (see courier ITEM262 call-site table).
 */
function pickIntakeValue(plan: RenderPlan, field: string): string {
  const row = plan.intake_ledger.find((r) => r.intake_field === field);
  const v = row?.value;
  if (v === null || v === undefined) return "";
  if (typeof v === "string") return v.trim();
  return String(v).trim();
}

function entityName(plan: RenderPlan): string {
  return pickIntakeValue(plan, "entity_name")
    || pickIntakeValue(plan, "company_name")
    || "the business";
}

/**
 * ITEM 243 defect 6 — PER-KIND OWNER RESOLUTION from i7/i8.
 *
 * Reads role-title fields ONLY (PII law holds — never names, phones, emails).
 * Per-KIND defaults when the intake yields no matching role title:
 *   • Type-J reserved judgment → "qualified legal counsel"
 *   • Unresolved documentation gate → certifying executive role title
 *     (i8_certifying_exec_title), else "the certifying executive"
 *   • Factor gaps (benefit/harm/safeguard/family/conditional) →
 *     best-matching internal contributor role title (i7_internal_contributors),
 *     else the certifying executive title, else the accountable-owner clause
 *
 * The prior implementation returned the raw i7_internal_contributors
 * string for every kind, which (a) leaked personnel names captured in
 * that narrative field into every action row and (b) attached the
 * wrong owner to Type-J and to certifying-executive gates.
 */
function certifyingExecTitle(plan: RenderPlan): string {
  return pickIntakeValue(plan, "i8_certifying_exec_title") || "the certifying executive";
}

/**
 * ITEM 273 FIX 1 — OWNER-SLOT PII HARDENING (role-titles-only law).
 *
 * CEO-read finding 3: personnel NAMES leaked into Owner slots through
 * parentheticals ("Chief Compliance Officer (Marcus Trent)"), narrative
 * clauses ("The CPO role has been vacant since February 2024."), and
 * unbalanced parentheses. The prior filter only required a role-word to
 * appear anywhere in a segment, so any of those survived intact.
 *
 * Hardening, applied in order per segment:
 *   (a) strip ALL parenthetical content, including an unterminated
 *       trailing "(..." tail;
 *   (b) reject narrative segments — closed-list verb-like token,
 *       length > 60, or sentence punctuation;
 *   (c) drop capitalized-bigram personal names not made of role words;
 *   (d) dedupe, titles only, no trailing periods.
 */
const OWNER_ROLE_WORD_RE =
  /officer|counsel|manager|director|lead|analyst|engineer|admin|privacy|security|compliance|dpo|cpo|ciso|cfo|cto|ceo|coo|specialist|architect|owner|head|chief|general|data|customer|success|junior|senior|deputy|associate|vice|president|executive/i;

/** (b) closed narrative-verb list — a title never contains these. */
export const OWNER_NARRATIVE_TOKENS: readonly string[] = [
  "is", "are", "has", "have", "been", "was", "remains", "vacant",
  "following", "assigned", "departure", "since",
];

const OWNER_NARRATIVE_RE = new RegExp(
  `\\b(?:${OWNER_NARRATIVE_TOKENS.join("|")})\\b`,
  "i",
);

/** (a) strip parentheticals, including an unterminated trailing tail. */
export function stripParentheticals(segment: string): string {
  let out = segment.replace(/\([^)]*\)/g, " ");
  out = out.replace(/\([^)]*$/, " ");
  out = out.replace(/^[^()]*\)/, " ");
  return out.replace(/\s{2,}/g, " ").trim();
}

/** (c) two adjacent Capitalized tokens that are not role words → a name. */
export function hasNameBigram(segment: string): boolean {
  const re = /\b([A-Z][a-z]{1,})\s+([A-Z][a-z]{1,})\b/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(segment)) !== null) {
    if (!OWNER_ROLE_WORD_RE.test(m[1]) && !OWNER_ROLE_WORD_RE.test(m[2])) {
      return true;
    }
  }
  return false;
}

export function sanitizeRoleTitleSegments(raw: string): string[] {
  const segments = raw.split(/[,;\n]+/).map((s) => s.trim()).filter(Boolean);
  const out: string[] = [];
  for (const seg of segments) {
    let s = stripParentheticals(seg);
    // (d) drop terminal punctuation before evaluation.
    s = s.replace(/[.!?]+\s*$/g, "").trim();
    if (!s) continue;
    if (/@|\+?\d{7,}/.test(s)) continue;                 // contact handles
    if (s.length > 60) continue;                          // (b) length
    if (/[.!?;:]/.test(s)) continue;                      // (b) sentence punctuation
    if (OWNER_NARRATIVE_RE.test(s)) continue;             // (b) narrative verbs
    if (!OWNER_ROLE_WORD_RE.test(s)) continue;            // must read as a title
    if (hasNameBigram(s)) continue;                       // (c) personal name
    if (!out.includes(s)) out.push(s);                    // (d) dedupe
  }
  return out;
}

function contributorRoleTitles(plan: RenderPlan): string {
  const raw = pickIntakeValue(plan, "i7_internal_contributors");
  if (!raw) return "";
  return sanitizeRoleTitleSegments(raw).join(", ");
}


function ownerForKind(kind: ActionKind, plan: RenderPlan): string {
  if (kind === "type_j_reserved") return "qualified legal counsel";
  if (kind === "gate_unresolved") return certifyingExecTitle(plan);
  // benefit_absent / harm_absent / safeguard_absent / conditional →
  // contributors first, then certifying exec, then accountable-owner fallback.
  return contributorRoleTitles(plan)
    || certifyingExecTitle(plan)
    || "the accountable business owner named on the assessment record";
}


/**
 * ITEM 242 (defect 4) — GAP-APPLICABILITY LAW. An action for an
 * absent factor / gate is emitted ONLY when the governing applicability
 * gate is `pass` or `not_applicable` (i.e., not `block`). ADMT-scoped
 * items with q18_admt_use negative resolve to `block` on
 * G.q18.admt_consequence — those actions are suppressed here and
 * instead surface in record_sufficiency as "not applicable".
 */
function isAdmtScoped(id: string | undefined): boolean {
  return !!id && /admt|automated_decision|profiling/i.test(id);
}

function admtGateBlocked(plan: RenderPlan): boolean {
  const g = plan.gate_outcomes.find((o) => o.gate_id === "G.q18.admt_consequence");
  return g?.outcome === "block";
}

function factorAdmtApplicable(f: FactorTableEntry, plan: RenderPlan): boolean {
  if (!isAdmtScoped(f.factor_id)) return true;
  return !admtGateBlocked(plan);
}

function propAdmtApplicable(p: Proposition, plan: RenderPlan): boolean {
  if (!isAdmtScoped(p.conclusion_id)) return true;
  return !admtGateBlocked(plan);
}

/**
 * ITEM 242 (defect 7b) — cohort-aware deadline resolver. Documentation
 * gates and factor gaps read the § 7155 cohort marker off the intake
 * (processing_start_date / cohort_effective_date proxies) instead of
 * defaulting every non-ADMT action to `d.ongoing_processing`.
 */
function cohortIsProspective(plan: RenderPlan): boolean {
  const start = pickIntakeValue(plan, "processing_start_date");
  const cohort = pickIntakeValue(plan, "cohort_effective_date");
  // If the record explicitly names a prospective start date after the
  // operative period, prospective wins; otherwise the record is treated
  // as pre-existing processing (§ 7155(b) applies).
  return /^prospective\b/i.test(start) || /^prospective\b/i.test(cohort);
}

function deadlineForAction(conclusionId: string | undefined, isDocumentationGate: boolean, plan: RenderPlan): string {
  const prospective = cohortIsProspective(plan);
  if (conclusionId && /admt/i.test(conclusionId)) {
    return prospective ? "d.admt_pre_use_notice.prospective" : "d.admt_pre_use_notice.existing";
  }
  if (isDocumentationGate) {
    return prospective ? "d.assessment_record.prospective" : "d.assessment_record.pre_existing";
  }
  // Factor-table gaps (safeguard / negative-impact documentation) are
  // assessment-record items under § 7155 — NOT ongoing-processing.
  return prospective ? "d.assessment_record.prospective" : "d.assessment_record.pre_existing";
}

interface ActionSource {
  readonly kind: ActionKind;
  readonly conclusion_id?: string;
  readonly factor_id?: string;
  readonly element_short_label: string;
  readonly pinpoint: string;
  readonly customer_recorded_fact_clause: string;
  readonly gap_or_consequence_clause: string;
  readonly compliance_guidance_sentence: string;
  readonly is_documentation_gate: boolean;
}

/** Lowercase the first character (used to fold CEO opener into label prefix). */
function lcFirst(s: string): string {
  return s.length === 0 ? s : s[0].toLowerCase() + s.slice(1);
}

/**
 * Family grouping (CEO courier §2.2). Consolidate ≥2 absent harms,
 * ≥2 absent safeguards, ≥3 absent benefits into single family actions
 * with a bulleted sub-list, reducing 14-clone action sets to ~11 diverse.
 */
function groupFamilies(sources: ActionSource[]): ActionSource[] {
  const groups: Record<"harm" | "safeguard" | "benefit", ActionSource[]> = {
    harm: [], safeguard: [], benefit: [],
  };
  const other: ActionSource[] = [];
  for (const s of sources) {
    if (s.kind === "harm_absent" && s.factor_id?.startsWith("neg.")) groups.harm.push(s);
    else if (s.kind === "safeguard_absent" && s.factor_id?.startsWith("safe.")) groups.safeguard.push(s);
    else if (s.kind === "benefit_absent" && s.factor_id?.startsWith("benefit.")) groups.benefit.push(s);
    else other.push(s);
  }
  const out: ActionSource[] = [...other];
  const FAMILY_META: Record<"harm" | "safeguard" | "benefit", { pinpoint: string; opener_family: string; guidance: string }> = {
    harm: {
      pinpoint: "11 CCR § 7152(a)(5)",
      opener_family: "the following potential negative impact categories",
      guidance: "Document each of the listed § 7152(a)(5) negative-impact categories on the assessment record with the specificity the subsection requires.",
    },
    safeguard: {
      pinpoint: "11 CCR § 7152(a)(6)",
      opener_family: "the following safeguards",
      guidance: "Document each of the listed § 7152(a)(6) safeguards on the assessment record with the specificity the subsection requires.",
    },
    benefit: {
      pinpoint: "11 CCR § 7152(a)(4)",
      opener_family: "the following stated benefits",
      guidance: "Document each of the listed § 7152(a)(4) benefits on the assessment record with the specificity the subsection requires.",
    },
  };
  (["harm", "safeguard", "benefit"] as const).forEach((fam) => {
    const rows = groups[fam];
    if (rows.length >= FAMILY_THRESHOLDS[fam]) {
      const meta = FAMILY_META[fam];
      const bullets = rows.map((r) => `• ${r.element_short_label.replace(/^[A-Z]/, (c) => c)}`).join("\n");
      out.push({
        kind: rows[0].kind,
        factor_id: `family.${fam}`,
        element_short_label: `${meta.opener_family}:\n${bullets}`,
        pinpoint: meta.pinpoint,
        customer_recorded_fact_clause: `none of the listed items above are on ${entityPlaceholder()}'s record`,
        gap_or_consequence_clause: `${meta.pinpoint} requires each of these elements to be documented for the assessment record to be complete`,
        compliance_guidance_sentence: meta.guidance,
        is_documentation_gate: false,
      });
    } else {
      out.push(...rows);
    }
  });
  return out;
}

// Sentinel used only inside groupFamilies (composer substitutes entityName at emit).
function entityPlaceholder(): string { return "the business"; }

function composePriorityActions(plan: RenderPlan): TemplateInstance[] {
  const entity = entityName(plan);

  const rawSources: ActionSource[] = [];

  // (1)+(2) factor-table gaps — filtered by gap-applicability law.
  for (const f of plan.factor_table) {
    const isGap = !f.present_in_intake || /gap|absent|missing/i.test(f.factor_id);
    if (!isGap) continue;
    if (!factorAdmtApplicable(f, plan)) continue; // defect 4
    const label = factorLabel(f) || "this factor";
    // Map factor kind → ActionKind.
    const kind: ActionKind =
      f.kind === "benefit" ? "benefit_absent"
      : f.kind === "negative_impact" ? "harm_absent"
      : f.kind === "safeguard" ? "safeguard_absent"
      : "gate_unresolved";
    rawSources.push({
      kind,
      factor_id: f.factor_id,
      element_short_label: label,
      pinpoint: f.anchor.pinpoint,
      customer_recorded_fact_clause: f.present_in_intake
        ? `the record shows ${lcFirst(label)} but the supporting detail is thin`
        : `${lcFirst(label)} is not present on ${entity}'s record`,
      gap_or_consequence_clause: `the § 7152(a) record cannot be relied upon for ${lcFirst(label)} without further documentation`,
      compliance_guidance_sentence: `Document ${lcFirst(label)} in the assessment record with the specificity ${f.anchor.pinpoint} requires.`,
      is_documentation_gate: false,
    });
  }

  // (3) Type-J reserved judgments — filtered by gap-applicability law.
  for (const p of plan.propositions) {
    if (p.epistemic_type !== "J") continue;
    if (!propAdmtApplicable(p, plan)) continue; // defect 4
    const spec: ConclusionSpec | undefined = CPPA_RISK_CONCLUSION_INDEX[p.conclusion_id];
    const label = propLabel(p) || conclusionLabel(p.conclusion_id) || "this reserved judgment";
    const reservedTo = spec?.reserved_to === "legal_counsel"
      ? "qualified legal counsel"
      : spec?.reserved_to === "external_auditor"
        ? "the external auditor"
        : "the accountable business owner";
    rawSources.push({
      kind: "type_j_reserved",
      conclusion_id: p.conclusion_id,
      element_short_label: label,
      pinpoint: p.anchor.pinpoint,
      customer_recorded_fact_clause: `the record reserves ${lcFirst(label)} to ${reservedTo}`,
      gap_or_consequence_clause: `the reserved judgment must be exercised and recorded before the assessment closes`,
      compliance_guidance_sentence: spec?.compliance_guidance
        ?? `Record ${reservedTo}'s decision on ${lcFirst(label)} in the assessment file per ${p.anchor.pinpoint}.`,
      is_documentation_gate: false,
    });
  }

  // (4) Unresolved FACTUAL documentation gates.
  const gateLabel = (id: string): string => {
    const tail = id.replace(/^G\.documentation\./, "").replace(/_/g, " ");
    const noun = tail.replace(/\s+present$/i, "").trim();
    return `assessment record — ${noun}`;
  };
  for (const g of plan.gate_outcomes) {
    if (!DOCUMENTATION_FACTUAL_GATE_IDS.has(g.gate_id)) continue;
    if (g.outcome === "pass") continue;
    const spec = CPPA_RISK_GATE_INDEX[g.gate_id];
    const pin = spec?.anchor_pinpoint ?? "11 CCR § 7152(a)";
    const label = gateLabel(g.gate_id);
    rawSources.push({
      kind: "gate_unresolved",
      element_short_label: label,
      pinpoint: pin,
      customer_recorded_fact_clause: `${lcFirst(label)} is not on ${entity}'s record`,
      gap_or_consequence_clause: `${pin} requires this element for the assessment record to be complete`,
      compliance_guidance_sentence: `Complete the ${pin} record for ${lcFirst(label)} before the assessment closes.`,
      is_documentation_gate: true,
    });
  }

  // Family grouping (CEO §2.2). Non-family kinds pass through untouched.
  const sources = groupFamilies(rawSources);

  return sources.map<TemplateInstance>((s) => {
    const sel = selectDeadlineOrFallback(deadlineForAction(s.conclusion_id, s.is_documentation_gate, plan));
    // KIND opener stem prepended to element_short_label per courier §2.1.
    // For family-grouped rows the label already carries the family opener
    // ("the following …:"); prepend the KIND stem to complete the sentence.
    const stem = KIND_OPENERS[s.kind];
    const prefixedLabel = s.factor_id?.startsWith("family.")
      ? `${stem} ${s.element_short_label}`
      : `${stem} ${lcFirst(s.element_short_label)}`;
    // Family customer_recorded_fact_clause carries the "the business" sentinel — replace here.
    const factClause = s.customer_recorded_fact_clause.replace(/the business's record/g, `${entity}'s record`);
    return {
      template_id: "T.risk.priority_action.golden",
      ctx: {
        element_short_label: prefixedLabel,
        entity_name: entity,
        customer_recorded_fact_clause: factClause,
        gap_or_consequence_clause: s.gap_or_consequence_clause,
        compliance_guidance_sentence: s.compliance_guidance_sentence,
        deadline_sentence: sel.row.deadline_sentence,
        owner_role_titles: ownerForKind(s.kind, plan),
        __cite: { PINPOINT: s.pinpoint },
      },
    };
  });
}


function composeNextSteps(plan: RenderPlan): TemplateInstance[] {
  const rows = plan.factor_table.filter((f) => f.present_in_intake && f.kind === "safeguard");
  return rows.map<TemplateInstance>((f) => ({
    template_id: "T.risk.next_step",
    ctx: {
      step_label: `Confirm ${factorLabel(f)} is documented in the assessment record`,
      step_basis: `Present on the record; retain the supporting documentation with the assessment file.`,
    },
  }));
}

function composeStrengthenItems(plan: RenderPlan): TemplateInstance[] {
  const rows = plan.factor_table.filter((f) => f.present_in_intake && /gap|strengthen/i.test(f.factor_id));
  return rows.map<TemplateInstance>((f) => ({
    template_id: "T.risk.documentation.gap",
    ctx: {
      doc_element_label: factorLabel(f),
      customer_question: `Please provide additional record support for ${factorLabel(f)}.`,
      __cite: { PINPOINT: f.anchor.pinpoint },
    },
  }));
}

function composeRecordSufficiency(plan: RenderPlan): TemplateInstance[] {
  // ITEM 241.3 — GOLDEN prose lead-in FIRST (courier §4.3).
  const entity = entityName(plan);
  // ITEM 243 defect 5 — the "four factual elements" slot reads the FOUR
  // DOCUMENTATION FACTUAL GATES, never factor labels. Each element
  // renders as the gate's compact human tail with its own § 7152(a)
  // pinpoint carried at the item level (below); the summary clause
  // enumerates the four gate topics in registry order.
  const factualGateLabelMap: Readonly<Record<string, string>> = {
    "G.documentation.purpose_present": "the § 7152(a)(1) processing purpose",
    "G.documentation.categories_present": "the § 7152(a)(2) categories of personal information",
    "G.documentation.operational_elements_present": "the § 7152(a)(3) operational elements",
    "G.documentation.approver_present": "the § 7152(a)(9) authorised approver",
  };
  const factualGateLabels = Array.from(DOCUMENTATION_FACTUAL_GATE_IDS)
    .map((id) => factualGateLabelMap[id])
    .filter(Boolean);
  const jProps = plan.propositions.filter((p) => p.epistemic_type === "J");
  const jLabels = jProps.map(propLabel).filter(Boolean);
  const jPinpoints = Array.from(new Set(jProps.map((p) => p.anchor.pinpoint)));
  const sufficient = !insufficientRecord(plan);
  const asOf = pickIntakeValue(plan, "assessment_date") || new Date().toISOString().slice(0, 10);
  // ITEM 244 (L5) — Affirmations block opener. Adequately-documented
  // items lead; gaps trail. Emitted BEFORE the legacy prose so the
  // customer reads the affirmative posture first.
  const admtBlocked = admtGateBlocked(plan);
  const statusForFactor = (f: FactorTableEntry) =>
    admtBlocked && isAdmtScoped(f.factor_id)
      ? RECORD_STATUS_CLAUSES[3]
      : f.present_in_intake
        ? RECORD_STATUS_CLAUSES[0]
        : RECORD_STATUS_CLAUSES[1];
  const affirmedCount = plan.factor_table.filter(
    (f) => statusForFactor(f) === RECORD_STATUS_CLAUSES[0],
  ).length;
  const gapCount = plan.factor_table.filter(
    (f) => statusForFactor(f) === RECORD_STATUS_CLAUSES[1],
  ).length;
  const affirmationsOpener: TemplateInstance = {
    template_id: "T.risk.record_sufficiency.prose.v2",
    ctx: {
      sufficiency_clause: sufficient
        ? "is sufficient for the § 7152(a)(6) balancing frame to weigh"
        : "is not yet sufficient for the § 7152(a)(6) balancing frame",
      entity_name: entity,
      affirmed_count_clause: `${affirmedCount}`,
      gap_count_clause: `${gapCount}`,
    },
  };
  // BATCH 55b9f3a2 ADDENDUM (e) — ADMT-inapplicability explanation is
  // appended when q18=No AND q5b affirmative (record shows profiling
  // without ADMT-use). The clause distinguishes ADMT governance from
  // systematic-observation profiling; sourced from ADMT_INAPPLICABILITY_EXPLANATION.
  const q18No = /^(no|false)$/i.test(String(pickIntakeValue(plan, "q18_admt_use") || ""));
  const q5bAffirmative = /^(yes|true)$/i.test(String(pickIntakeValue(plan, "q5b_profiling") || ""))
    || /^(yes|true)$/i.test(String(pickIntakeValue(plan, "q5b_sensitive_categories") || ""));
  const admtExplanation: TemplateInstance[] = (q18No && q5bAffirmative)
    ? [{
        template_id: "T.risk.record_sufficiency.item",
        ctx: {
          element_label: "ADMT-specific governance",
          element_status_clause: ADMT_INAPPLICABILITY_EXPLANATION,
        },
      }]
    : [];
  const prose: TemplateInstance = {
    template_id: "T.risk.record_sufficiency.prose",
    ctx: {
      sufficiency_clause: sufficient
        ? "sufficient for the § 7152(a)(6) balancing frame to weigh"
        : "not yet sufficient for the § 7152(a)(6) balancing frame — see enumerated deficiencies below",
      sufficiency_closer_clause: sufficient
        ? "is sufficient for the § 7152(a)(6) balancing frame to weigh"
        : "remains not yet sufficient for the § 7152(a)(6) balancing frame — see enumerated deficiencies above",
      entity_name: entity,
      factual_elements_summary_clause: factualGateLabels.length > 0
        ? joinList(factualGateLabels)
        : "the four § 7152(a) factual documentation elements",
      reserved_judgments_list: jLabels.length > 0 ? joinList(jLabels) : "no reserved judgments",
      type_j_pinpoints: jPinpoints.length > 0 ? joinList(jPinpoints) : "the applicable § 7152(a) subdivisions",
      as_of_date: asOf,
    },
  };
  // ITEM 243 defect 4 — ADMT-scoped rows resolve to RECORD_STATUS_CLAUSES[3]
  // when the G.q18.admt_consequence gate blocks; affirmed items lead the
  // enumeration per Item 244 (L5).
  const factorsAffirmedFirst = [...plan.factor_table].sort((a, b) => {
    const sa = statusForFactor(a);
    const sb = statusForFactor(b);
    const rank = (s: string) =>
      s === RECORD_STATUS_CLAUSES[0] ? 0 : s === RECORD_STATUS_CLAUSES[3] ? 1 : 2;
    return rank(sa) - rank(sb);
  });
  const items = factorsAffirmedFirst.map<TemplateInstance>((f) => ({
    template_id: "T.risk.record_sufficiency.item",
    ctx: {
      element_label: factorLabel(f),
      element_status_clause: statusForFactor(f),
      __cite: { PINPOINT: f.anchor.pinpoint },
    },
  }));
  return [affirmationsOpener, ...admtExplanation, prose, ...items];
}



function composeInformationNeeded(plan: RenderPlan): TemplateInstance[] {
  // CP4 (a)+(b) — Type J review items resolve display_label + own anchor.
  // ITEM 250 (Ruling B) — scaffold skip-logic. When a Type-J
  // ConclusionSpec carries a non-empty `resolution_source_fields`, and
  // every listed intake field has a non-empty value on the derived
  // intake_ledger, the reserved judgment is already resolved on the
  // record and MUST NOT surface as a review ask (grader check
  // qc_r1_1_no_asks_on_resolved_tests). SCAFFOLD ONLY: no registry row
  // populates the field today, so this is a no-op until the courier
  // ITEM250-RULING-B-TYPEJ-RESOLUTION-FIELDS is CEO-signed.
  const ledgerByField = new Map(
    plan.intake_ledger.map((r) => [r.intake_field, r.value]),
  );
  const isPopulated = (field: string): boolean => {
    if (!ledgerByField.has(field)) return false;
    const v = ledgerByField.get(field);
    if (v === null || v === undefined) return false;
    if (typeof v === "string") return v.trim().length > 0;
    return true;
  };
  // ITEM 276 — unresolved § 7156(a) comparable-set answers ("Not sure")
  // become an explicit customer ask. No rows / no "Not sure" → no ask.
  const secondaryRows = secondaryActivityRows(plan);
  const unresolvedDims = unresolvedDivergenceDimensions(secondaryRows);
  const comparableSetAsk: TemplateInstance[] = unresolvedDims.length > 0
    ? [{
        template_id: "T.risk.documentation.gap",
        ctx: {
          doc_element_label:
            "a completed comparison between the assessed activity and the additional uses recorded on the record",
          customer_question:
            `Please confirm, for each additional use, whether ${joinList(unresolvedDims.map((k) => DIVERGENCE_DIMENSION_LABELS[k]))} ${unresolvedDims.length === 1 ? "is" : "are"} the same as the assessed activity or different, so the comparable-set question can be resolved.`,
          __cite: { PINPOINT: SECONDARY_ANCHOR_7156A },
        },
      }]
    : [];
  const jProps = plan.propositions.filter((p) => p.epistemic_type === "J");
  return [...comparableSetAsk, ...jProps.flatMap<TemplateInstance>((p) => {
    const spec = CPPA_RISK_CONCLUSIONS.find((c) => c.id === p.conclusion_id);
    const fields = spec?.resolution_source_fields ?? [];
    if (fields.length > 0 && fields.every(isPopulated)) {
      // Resolved on the record — skip per Ruling B.
      return [];
    }
    const label = propLabel(p) || conclusionLabel(p.conclusion_id) || "this reserved judgment";
    const anchor = conclusionAnchor(p.conclusion_id) ?? DOC_APPROVER_ANCHOR;
    return [{
      template_id: "T.risk.documentation.gap",
      ctx: {
        doc_element_label: label,
        customer_question: `Please confirm or provide additional detail regarding ${label}.`,
        __cite: { PINPOINT: anchor.pinpoint },
      },
    }];
  })];
}

function composeExceptionAnalysis(plan: RenderPlan): TemplateInstance[] {
  return plan.propositions
    .filter((p) => p.epistemic_type === "R" && /exception/i.test(p.conclusion_id))
    .map<TemplateInstance>((p) => {
      const label = propLabel(p) || "this exception";
      const templateId = (p as { polarity?: string }).polarity === "positive"
        ? "T.risk.documentation.present"
        : "T.risk.documentation.gap";
      return {
        template_id: templateId,
        ctx: {
          doc_element_label: label,
          customer_question: `Please describe the basis for the exception recorded for ${label}.`,
          __cite: { PINPOINT: p.anchor.pinpoint },
        },
      };
    });
}


/**
 * ITEM 276 — § 7156(a) SECONDARY-USE SEGMENTATION ITEM.
 *
 * Emits ONE scope item when the customer reported additional uses of the
 * same data. Reserved framing only: the tool never green-lights bundling —
 * it states the comparable-set standard, reproduces the customer's own
 * comparison, and reserves the determination to the Company and counsel.
 * Absent secondary rows the function emits nothing (degradation law).
 */
function secondarySegmentationInstances(plan: RenderPlan): TemplateInstance[] {
  const rows = secondaryActivityRows(plan);
  if (rows.length === 0) return [];
  const countPhrase = rows.length === 1
    ? "one additional use of the same personal information"
    : `${rows.length} additional uses of the same personal information`;
  const list = joinList(
    rows.map((r) => (r.purpose ? `${r.name} (${r.purpose})` : r.name)),
  );
  const clauses = rows.map((r) => {
    const parts = Object.keys(DIVERGENCE_DIMENSION_LABELS).map((k) => {
      const label = DIVERGENCE_DIMENSION_LABELS[k];
      const answer = r.divergence[k] || "Not sure";
      const verdict = answer === "Same"
        ? "recorded as the same as the assessed activity"
        : answer === "Different"
          ? "recorded as different from the assessed activity"
          : "not resolved on the record";
      return `${label} — ${verdict}`;
    });
    return `for ${r.name}: ${parts.join("; ")}`;
  });
  return [{
    template_id: "T.risk.scope.secondary_segmentation",
    ctx: {
      entity_name: entityName(plan),
      secondary_activity_count_phrase: countPhrase,
      secondary_activity_list: list,
      secondary_divergence_clause: `${clauses.join(". ")}.`,
      __cite: { PINPOINT_7156A: SECONDARY_ANCHOR_7156A },
    },
  }];
}

/**
 * CP4 (b) — SCOPE & TRIGGERS. One instance PER § 7150(b) prong. Each
 * instance carries its OWN anchor pinpoint and its OWN engaged/not-engaged
 * flag from the plan's gate outcomes (falling back to the proposition
 * polarity). Ends the run-#175 "5× identical § 7150(b)(1)" class.
 */
function composeScope(plan: RenderPlan): TemplateInstance[] {
  const applicabilityConcls = CPPA_RISK_CONCLUSIONS.filter(
    (c) => c.epistemic_type === "R" && /appl(icab|y)/i.test(c.id),
  );
  const gateById = new Map(plan.gate_outcomes.map((g) => [g.gate_id, g]));
  const propById = new Map(
    plan.propositions
      .filter((p) => /appl(icab|y)/i.test(p.conclusion_id))
      .map((p) => [p.conclusion_id, p]),
  );
  const enriched = applicabilityConcls.map((c) => {
    const gate = c.rule_gate ? gateById.get(c.rule_gate) : undefined;
    const prop = propById.get(c.id);
    const engagedFromGate = gate?.outcome === "pass";
    const engagedFromProp = (prop as { polarity?: string } | undefined)?.polarity === "positive";
    const engaged = engagedFromGate || engagedFromProp;
    // Item 244 Correction 4: prong index from the pinpoint substring
    // "7150(b)(N)"; used to look up the verbatim § 7150(b) label.
    const m = /7150\(b\)\((\d+)\)/.exec(c.anchor.pinpoint);
    const prongIdx = m ? Number(m[1]) as 1|2|3|4|5|6 : null;
    return { c, engaged, prongIdx };
  });
  const engaged = enriched.filter((e) => e.engaged);
  const notEngaged = enriched.filter((e) => !e.engaged);

  // ITEM 244 (E1) — new opener sourced from § 7150(b) verbatim labels.
  const prongLabelFor = (idx: 1|2|3|4|5|6 | null) =>
    idx ? CCPA_7150_B_LABELS[idx] : "the applicable § 7150(b) trigger";
  const nonEngagedInline = notEngaged.length > 0
    ? notEngaged
        .map((e) => `${prongLabelFor(e.prongIdx)} (${e.c.anchor.pinpoint})`)
        .join("; ")
    : "none — every listed § 7150(b) prong is engaged on the current record";

  if (engaged.length > 0) {
    // One opener per engaged prong, with per-prong verbatim posture.
    const openers = engaged.map<TemplateInstance>((e) => {
      const verbatim = e.prongIdx
        ? [null, CCPA_7150_B_1, CCPA_7150_B_2, CCPA_7150_B_3, CCPA_7150_B_4, CCPA_7150_B_5, CCPA_7150_B_6][e.prongIdx] as string
        : "";
      return {
        template_id: "T.risk.section_opener.scope.v2",
        ctx: {
          engaged_prong_label: prongLabelFor(e.prongIdx),
          engaged_prong_posture_clause: verbatim
            ? `the record affirms conduct falling within § 7150(b)(${e.prongIdx}), which reads: "${verbatim}"`
            : "the record affirms conduct falling within this trigger",
          non_engaged_prongs_inline: nonEngagedInline,
          __cite: { PINPOINT_ENGAGED: e.c.anchor.pinpoint },
        },
      };
    });
    // ITEM 241.1 (E1) contract, re-asserted under ITEM 272: engaged prongs
    // LEAD. With the six-prong realignment the engaged set can be
    // non-contiguous ((b)(3) + (b)(4)), so order explicitly rather than
    // relying on registry order.
    const items = [...engaged, ...notEngaged].map<TemplateInstance>((e) => ({
      template_id: e.engaged ? "T.risk.applicability.engaged" : "T.risk.applicability.not_engaged",
      ctx: {
        prong_subject: e.c.display_label || prongLabelFor(e.prongIdx),
        __cite: { PINPOINT: e.c.anchor.pinpoint },
      },
    }));
    return [...openers, ...items, ...secondarySegmentationInstances(plan)];
  }

  // No engaged prongs: fall through to previous customer-first opener + items.
  const prongList = enriched
    .map((e) => `${prongLabelFor(e.prongIdx)} (${e.c.anchor.pinpoint}) — not engaged`)
    .join("; ");
  const opener: TemplateInstance = {
    template_id: "T.risk.section_opener.scope",
    ctx: {
      entity_name: entityName(plan),
      q4_pi_categories: pickIntakeValue(plan, "q4_pi_categories") || "personal information",
      i1_processing_purpose: pickIntakeValue(plan, "i1_processing_purpose") || "its stated business purposes",
      prong_list_with_individual_pinpoints: prongList || "the § 7150(b) triggers enumerated below",
    },
  };
  const items = enriched.map<TemplateInstance>((e) => ({
    template_id: "T.risk.applicability.not_engaged",
    ctx: {
      prong_subject: e.c.display_label || prongLabelFor(e.prongIdx),
      __cite: { PINPOINT: e.c.anchor.pinpoint },
    },
  }));
  return [opener, ...items, ...secondarySegmentationInstances(plan)];
}

// ── ITEM 244 (L1) — Processing Narrative composer ───────────────────────
function composeProcessingNarrative(plan: RenderPlan): TemplateInstance[] {
  const entity = entityName(plan);
  // Correction 1: silent sub-elements resolve to "not stated on the record".
  const nsotr = "not stated on the record";
  const pick = (field: string) => pickIntakeValue(plan, field) || nsotr;
  // ITEM 276 — narrative subject is the named primary activity when present.
  const primaryName = primaryActivityName(plan);
  const engaged = engagedApplicability(plan);
  const activityLabel = primaryName ? primaryName : engaged.length > 0
    ? engaged.map(propLabel).filter(Boolean).join(", ")
    : (pickIntakeValue(plan, "i1_processing_purpose") || "the processing activity in scope");
  return [{
    template_id: "T.risk.processing_narrative",
    ctx: {
      entity_name: entity,
      activity_label: activityLabel,
      pi_categories_clause: pick("q4_pi_categories"),
      sources_clause: pick("i3_sources") || nsotr,
      i1_processing_purpose_clause: pick("i1_processing_purpose"),
      i6_vendors_clause: pick("i6_vendors"),
      i4_disclosure_mechanisms_clause: pick("i4_disclosure_mechanisms"),
      i2_retention_period_clause: pick("i2_retention_period"),
      i2_retention_criteria_clause: pick("i2_retention_criteria"),
      i2_deletion_clause: pick("i2_deletion"),
    },
  }];
}

// ── ITEM 244 (E4) — anaphora rule helper ────────────────────────────────
// Full entity name on first mention per section; "the company" thereafter.
// Consumed by the Pass-2 assembler render seam.
export function renderEntity(sectionKey: string, mentionIndex: number, plan: RenderPlan): string {
  void sectionKey;
  return mentionIndex === 0 ? entityName(plan) : "the company";
}


// ── Public dispatch ──────────────────────────────────────────────────────

export function composeSection(sectionKey: string, plan: RenderPlan): TemplateInstance[] | null {
  switch (sectionKey) {
    case "executive_summary":            return composeExecutive(plan);
    case "priority_actions":             return composePriorityActions(plan);
    case "next_steps":                   return composeNextSteps(plan);
    case "strengthen_items":             return composeStrengthenItems(plan);
    case "record_sufficiency":           return composeRecordSufficiency(plan);
    case "information_needed":           return composeInformationNeeded(plan);
    case "exception_analysis":           return composeExceptionAnalysis(plan);
    case "scope_confirmation":           return composeScope(plan);
    case "scope_and_triggers":           return composeScope(plan);
    case "assessment_summary":           return composeAssessmentSummary(plan);
    case "risk_assessment_by_activity":  return composeRiskByActivity(plan);
    case "processing_narrative":         return composeProcessingNarrative(plan);
    default:
      return null;
  }
}
