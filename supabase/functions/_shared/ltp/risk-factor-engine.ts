// RK3-C — CPPA RISK FACTOR ENGINE (Spine 4.3 Phase C, Classes A + B).
//
// AUTHORED ON FABLE 5 (claude-fable-5) PER CEO DIRECTIVE 2026-08-18. This
// module is DETERMINISTIC AT RUNTIME: it makes zero model calls. Every
// {{FACTOR.*}} output composed here is either
//
//   Class A — a deterministic projection over typed facts (rules, no prose
//             judgment), or
//   Class B — a CEO-ratified conditional template / determination table over
//             enum-rich operands (the fleet's Governance-conversion pattern).
//
// The determination tables and template strings exported below are the
// RATIFICATION ARTIFACTS: they were authored under the CEO's advance
// ratification grant of 2026-08-18 and are itemized on the RK3-C ratification
// ledger (doc 32). Changing any exported table cell or template is a
// ratification event.
//
// Class C ids (operands are free-text narratives that must be comprehended)
// are NOT composed here — per the NO-PADDING LAW they stay honestly absent
// until RK3-D converts them per PN-RK8. The absent set is exported for
// telemetry (`RISK_FACTOR_CLASS_C_IDS`).
//
// REGISTER: the v3 banned register applies ("the record shows" family, "on
// this record", "as the record makes clear"). Company facts are attributed
// ("the Company describes…", "the Company identifies…"). Factor prose carries
// NO statutory citations: the printed Table of Authorities continues to render
// from the report's citation ledger, and factor-authority provenance is
// persisted as records (`provenance[].authorities`) for the RK3-D App G feed.
//
// FIXED LEADS: the sub-heads, leads, and notes in RISK_FACTOR_FIXED are
// transcribed from the Spine 4.3 generated-block descriptors (the spine file
// remains the custody point for skeleton/conditional prose; the factor-block
// leads are carried by this Phase C composer per the spine's own comments).

import { HARM_PATHWAY_OPTS } from "../intake-contracts/cppa-risk-assessment.ts";

export const RISK_FACTOR_ENGINE_STAMP =
  "risk-factor-engine@rk3-c-2026-08-18-fable5";

type Bag = Record<string, unknown>;

const s = (v: unknown): string => (typeof v === "string" ? v.trim() : "");
const arr = (v: unknown): string[] =>
  Array.isArray(v) ? v.map((x) => s(x)).filter(Boolean) : s(v) ? [s(v)] : [];
const rows = (v: unknown): Bag[] =>
  Array.isArray(v) ? v.filter((x) => x && typeof x === "object") as Bag[] : [];

function isYes(v: unknown): boolean {
  return v === true || /^yes\b/i.test(s(v));
}
function isNo(v: unknown): boolean {
  return v === false || /^no\b/i.test(s(v));
}

function clause(v: unknown): string {
  return s(v).replace(/\.\s*$/, "");
}

function firstSentence(text: string): string {
  const t = text.trim();
  const m = t.match(/^[\s\S]*?[.!?](?=\s|$)/);
  return (m ? m[0] : t).trim();
}

/** "a, b and c" */
function asProse(items: readonly string[]): string {
  const xs = items.filter(Boolean);
  if (xs.length === 0) return "";
  if (xs.length === 1) return xs[0];
  return `${xs.slice(0, -1).join(", ")} and ${xs[xs.length - 1]}`;
}

function plural(n: number, one: string, many: string): string {
  return n === 1 ? one : many;
}

// ── Fixed leads, sub-heads and notes (Spine 4.3 generated-block descriptors) ──

export const RISK_FACTOR_FIXED = {
  normalized_purpose_lead: "For purposes of the analysis, that purpose is understood as:",
  purpose_clarify_note:
    "The formulation above clarifies the purpose for assessment purposes. It does not replace the factual description supplied by the Company; it identifies the purpose with enough precision to evaluate the information, benefits, and risks associated with the activity.",

  exec_benefits_lead: "The benefits carrying the greatest weight are:",
  exec_risks_lead: "The most important risks to consumers are:",
  exec_safeguards_lead: "The safeguards that most materially reduce those risks are:",
  exec_residual_lead:
    "After giving appropriate credit to safeguards supported by the record, the principal risks that remain are:",
  exec_determination_head: "Overall Determination.",
  exec_outcome_lead: "The assessment reaches the following recommended processing outcome:",
  exec_conditions_lead:
    "Conditions to Proceed. The assessment recommendation depends on completion or continued operation of the following:",
  exec_conditions_note: "These are conditions of the determination, not optional recommendations.",
  exec_follow_up_lead:
    "Assessment Follow-Up Required. The following factual or analytical matters remain unresolved:",
  exec_follow_up_note:
    "These matters must be completed for the assessment record to be complete. They do not necessarily require the Company to alter the processing unless the additional information changes the analysis.",

  uncertain_trigger_lead:
    "The applicability of the following potential trigger cannot be resolved from the current record:",

  necessity_b_head: "B. Analysis. Information Supported as Necessary.",
  unnecessary_lead: "Information Not Shown to Be Necessary.",
  unnecessary_note:
    "Processing information that does not materially advance the stated purpose creates privacy exposure without a corresponding contribution to the benefit being assessed.",
  uncertain_lead: "Necessity Not Yet Established.",
  uncertain_note:
    "Current use is not treated as proof of necessity. Where the Company cannot yet establish why an element is required, that uncertainty remains part of the assessment.",
  necessity_c_head: "C. Conclusion.",
  minimization_condition_lead: "D. Consequence. Condition to Proceed.",
  minimization_follow_up_lead: "Required Assessment Follow-Up.",
  minimization_recommendation_lead: "Recommendation.",

  controls_lead: "Relevant consumer rights and controls include:",

  admt_h_head: "H. Overall ADMT Conclusion.",

  weight_lead: "Weight in the balancing analysis:",
  vi_f_head: "F. Overall Benefits Conclusion.",
  material_benefits_lead: "The benefits carrying the greatest weight are:",
  discounted_lead: "The following claimed benefits receive reduced or no weight:",

  vii_b_head: "B. Material Risk Pathways.",
  vii_e_head: "E. Inherent Risk Conclusion.",
  inherent_lead: "Before safeguards are given effect, the risks carrying the greatest weight are:",
  inherent_close: "The next question is how materially the Company’s safeguards change that risk.",

  viii_b_head: "B. Material Existing Safeguards.",
  material_safeguards_lead: "The safeguards most important to the analysis are:",
  tested_lead: "The following controls are supported by evidence of implementation or testing:",
  tested_note:
    "These controls receive greater weight because the assessment has evidence that they operate in practice.",
  untested_lead:
    "The following controls are implemented but are not supported by sufficient testing or other evidence of effectiveness:",
  untested_note:
    "They are credited as existing safeguards, but the absence of supporting evidence reduces the degree to which the assessment can rely on them.",
  planned_lead: "C. Planned Safeguards. The Company plans to implement:",
  planned_note:
    "A planned safeguard does not eliminate present risk. Where the favorable determination depends materially on a safeguard that is not yet operational, implementation is treated as a Condition to Proceed rather than as an existing mitigation.",
  gaps_lead:
    "D. Safeguard Gaps. The following material risk is not sufficiently addressed by safeguards established on the current record:",
  residual_lead: "The principal residual risks are:",

  ix_b_head: "B. Factors Supporting the Processing.",
  pro_lead: "The considerations carrying the greatest weight in favor of the activity are:",
  ix_c_head: "C. Factors Weighing Against the Processing.",
  con_lead: "The considerations carrying the greatest weight against the activity are:",
  ix_d_head: "D. Overall Balancing Conclusion.",
  balancing_lead: "Balancing conclusion:",
  materiality_lead: "Materiality of the determination:",
  decision_effect_lead: "Decision effect:",
  ix_e_head: "E. Assessment Recommendation, Company Decision, and Consequences.",
  recommendation_lead: "Assessment recommendation:",
  conditions_lead: "Conditions to Proceed.",
  follow_up_lead: "Required Assessment Follow-Up.",
  recommendations_lead: "Recommendations.",

  vendor_dependency_lead: "The processing materially depends on:",
  vendor_dependency_note:
    "The effectiveness of the related contractual, technical, or oversight controls is considered in Section VIII.",

  appendix_b_intro:
    "This appendix provides the element-level analysis underlying Section III. For each material personal-information element, it records the function of the information, whether it is necessary to achieve the stated purpose, the basis for that conclusion, and any identified limitation or change.",
  appendix_c_intro:
    "This appendix provides the detailed analytical record underlying Sections VII and VIII. For each identified risk pathway, the register records the negative impact, personal information involved, relevant actor or event, source and cause, likelihood, severity, materiality, relevant safeguards, safeguard status, residual risk, and effect on the processing decision. The mapping of risks to safeguards is an EUP analytical method designed to make the reasoning transparent and reviewable. It is not presented as a regulator-prescribed report format.",
} as const;

// ── Ratified determination tables ─────────────────────────────────────────────

export type RiskLikelihood = "Unlikely" | "Possible" | "Likely" | "Highly likely";
export type RiskSeverity = "Minimal" | "Moderate" | "Significant" | "Severe";
export type RiskMateriality = "Low" | "Moderate" | "High" | "Critical";

/**
 * RATIFIED — inherent-materiality matrix (severity-weighted, conservative).
 * Operands are the Company's own likelihood and severity assessments
 * (a5_harm_pathways enums); the matrix combines them mechanically.
 */
export const RISK_MATERIALITY_MATRIX: Record<
  RiskSeverity,
  Record<RiskLikelihood, RiskMateriality>
> = {
  "Minimal": { "Unlikely": "Low", "Possible": "Low", "Likely": "Low", "Highly likely": "Moderate" },
  "Moderate": { "Unlikely": "Low", "Possible": "Moderate", "Likely": "Moderate", "Highly likely": "High" },
  "Significant": { "Unlikely": "Moderate", "Possible": "High", "Likely": "High", "Highly likely": "Critical" },
  "Severe": { "Unlikely": "High", "Possible": "High", "Likely": "Critical", "Highly likely": "Critical" },
};

const MATERIALITY_RANK: Record<RiskMateriality, number> = {
  Low: 0,
  Moderate: 1,
  High: 2,
  Critical: 3,
};
const MATERIALITY_BY_RANK: RiskMateriality[] = ["Low", "Moderate", "High", "Critical"];

export function resolveMateriality(likelihood: string, severity: string): RiskMateriality | null {
  const row = RISK_MATERIALITY_MATRIX[severity as RiskSeverity];
  const cell = row?.[likelihood as RiskLikelihood];
  return cell ?? null;
}

/**
 * RATIFIED — residual rule. A safeguard reduces a pathway's materiality by
 * ONE tier only where the status is "Implemented and tested" (evidence that
 * it operates in practice). "Implemented, not tested" is credited as existing
 * but does not change the tier; "Planned, not yet implemented" and "None"
 * leave the inherent tier in place. This encodes the Spine 4.3 VIII notes.
 */
export function resolveResidual(
  inherent: RiskMateriality,
  bestSafeguardStatus: string | null,
): RiskMateriality {
  if (bestSafeguardStatus === "Implemented and tested") {
    return MATERIALITY_BY_RANK[Math.max(0, MATERIALITY_RANK[inherent] - 1)];
  }
  return inherent;
}

export type BenefitWeight = "no affirmative weight" | "limited weight" | "material weight";

/**
 * RATIFIED — benefit-weight table. Operands are the typed gate boolean and
 * the presence of the supporting-fact narrative. (Doc 31 sketched a third
 * "specificity band" operand; no typed operand for specificity exists in the
 * v2.0 contract, so the band is deferred to RK3-D rather than judged from
 * free text — ledger item.)
 */
export function resolveBenefitWeight(
  identified: unknown,
  narrative: unknown,
  fact: unknown,
): BenefitWeight {
  const has = isYes(identified) || (identified === undefined && s(narrative) !== "");
  if (!has || !s(narrative)) return "no affirmative weight";
  return s(fact) ? "material weight" : "limited weight";
}

export type BenefitTier = "material" | "limited" | "none";
export type ProcessingConsequence = "proceed" | "proceed with conditions" | "do not proceed";

export interface BalancingCell {
  readonly conclusion: string;
  readonly materiality: string;
  readonly effect: string;
  readonly kind: "proceed" | "stop";
  readonly explanation: string;
}

/**
 * RATIFIED — the § 7154 balancing determination table (PN-RK8). Operands:
 * the best benefit tier (from the benefit-weight table) × the highest
 * residual-risk tier (from the residual rule). The customer's
 * impact_intake.benefitsOutweigh answer is perspective only and NEVER feeds
 * this table (contract §7 rule; pinned by test).
 */
export const RISK_BALANCING_TABLE: Record<BenefitTier, Record<RiskMateriality, BalancingCell>> = {
  material: {
    Low: {
      conclusion:
        "The benefits of the processing outweigh the privacy risks that remain after credited safeguards are taken into account.",
      materiality:
        "The determination is not close: at least one benefit of material weight is established, and no residual risk remains above the low tier.",
      effect: "The processing may proceed as described in the assessment record.",
      kind: "proceed",
      explanation:
        "A benefit of material weight, a necessity analysis that supports the information processed, and a low residual-risk profile together support the favorable disposition.",
    },
    Moderate: {
      conclusion:
        "The benefits of the processing outweigh the residual privacy risks that remain, although the margin is narrower than a low-residual profile would produce.",
      materiality:
        "The determination is material: the moderate residual pathway or pathways identified in Section VIII could change the balance if the risk grows or a credited safeguard weakens.",
      effect:
        "The processing may proceed, subject to any conditions identified below and to the review cadence in Section X.",
      kind: "proceed",
      explanation:
        "The benefit record carries the moderate residual profile; the conditions, recommendations, and review cadence preserve the margin the determination rests on.",
    },
    High: {
      conclusion:
        "The residual privacy risks remaining after credited safeguards are substantial, and the benefits established do not outweigh them on the present record.",
      materiality: "The determination is material and adverse: a high-tier residual pathway remains.",
      effect:
        "The processing should not proceed in its present form; completion of the identified conditions and an updated assessment could change the determination.",
      kind: "stop",
      explanation:
        "The determination rests on the residual-risk conclusion in Section VIII: the benefit record, although material, cannot carry a high-tier residual pathway.",
    },
    Critical: {
      conclusion: "A critical residual privacy risk remains, and the benefits established cannot outweigh it.",
      materiality: "The determination is decisive on the present record.",
      effect: "The processing should not proceed while the critical residual pathway remains.",
      kind: "stop",
      explanation:
        "A critical residual pathway precludes a favorable balance regardless of the weight of the benefit record.",
    },
  },
  limited: {
    Low: {
      conclusion:
        "The benefits established, although of limited weight, outweigh the low residual privacy risks that remain.",
      materiality:
        "The determination is closer than a materially-benefited profile would produce, but the low residual profile supports it.",
      effect: "The processing may proceed as described in the assessment record.",
      kind: "proceed",
      explanation:
        "The low residual-risk profile carries the determination; strengthening the supporting information behind the claimed benefits would widen the margin.",
    },
    Moderate: {
      conclusion:
        "The benefits established carry limited weight and a moderate residual risk remains; the balance favors the processing only narrowly.",
      materiality:
        "The determination is close. Growth in the residual pathway or pathways, or weakening of a credited safeguard, should prompt reassessment.",
      effect:
        "The processing may proceed, subject to any conditions identified below; the review cadence in Section X takes on added importance.",
      kind: "proceed",
      explanation:
        "The narrow margin rests on the credited safeguards; the conditions and recommendations preserve it.",
    },
    High: {
      conclusion:
        "The benefits established carry limited weight and do not outweigh the high-tier residual privacy risk that remains.",
      materiality: "The determination is adverse and is not close.",
      effect: "The processing should not proceed in its present form on the present record.",
      kind: "stop",
      explanation:
        "A high-tier residual pathway cannot be carried by a benefit record of limited weight.",
    },
    Critical: {
      conclusion: "A critical residual privacy risk remains, and the limited benefits established cannot outweigh it.",
      materiality: "The determination is decisive on the present record.",
      effect: "The processing should not proceed while the critical residual pathway remains.",
      kind: "stop",
      explanation:
        "A critical residual pathway precludes a favorable balance regardless of the weight of the benefit record.",
    },
  },
  none: {
    Low: noneBenefitCell("low"),
    Moderate: noneBenefitCell("moderate"),
    High: noneBenefitCell("high"),
    Critical: noneBenefitCell("critical"),
  },
};

function noneBenefitCell(tier: string): BalancingCell {
  return {
    conclusion:
      `No benefit has been established for any stakeholder category, so the ${tier}-tier privacy risk that remains is not outweighed.`,
    materiality: "The determination follows directly from the benefit record.",
    effect:
      "The processing should not proceed on the present record; establishing the benefit record and updating the assessment could change the determination.",
    kind: "stop",
    explanation:
      "The balancing question compares benefits against remaining risks; where no benefit is established, no remaining risk can be outweighed.",
  };
}

/** RATIFIED — recommended-outcome wording, keyed to consequence × processing status. */
export function resolveRecommendedOutcome(
  kind: "proceed" | "stop",
  hasConditions: boolean,
  processingStatus: string,
): { outcome: string; consequence: ProcessingConsequence } {
  if (/^discontinued/i.test(processingStatus)) {
    return {
      outcome:
        "No processing decision is required: the Company records the processing as discontinued, and this assessment documents the activity as conducted.",
      consequence: kind === "stop" ? "do not proceed" : "proceed",
    };
  }
  const planned = /^planned/i.test(processingStatus);
  if (kind === "stop") {
    return {
      outcome: planned
        ? "Do not initiate the processing on the present record."
        : "Suspend or discontinue the processing on the present record.",
      consequence: "do not proceed",
    };
  }
  if (hasConditions) {
    return {
      outcome: planned
        ? "Initiate the processing subject to the Conditions to Proceed identified below."
        : "Continue the processing subject to the Conditions to Proceed identified below.",
      consequence: "proceed with conditions",
    };
  }
  return {
    outcome: planned
      ? "Initiate the processing as described in the assessment record."
      : "Continue the processing as described in the assessment record.",
    consequence: "proceed",
  };
}

// ── Class C ids (honestly absent until RK3-D per PN-RK8) ─────────────────────

export const RISK_FACTOR_CLASS_C_IDS: readonly string[] = [
  "purpose_specificity_analysis",
  "secondary_use_analysis",
  "out_of_scope_processing_description",
  "comparable_processing_analysis",
  "prior_assessment_analysis",
  "record_sufficiency_analysis",
  "processing_coherence_analysis",
  "consumer_context_analysis",
  "source_risk_analysis",
  "recipient_risk_analysis",
  "material_vendor_dependency",
  "transparency_analysis",
  "consumer_expectations_analysis",
  "unexpected_processing",
  "consumer_expectations_conclusion",
  "consumer_control_analysis",
  "coercion_analysis",
  "admt_role_analysis",
  "admt_logic_analysis",
  "admt_logic_conclusion",
  "admt_decision_effect_analysis",
  "human_review_effectiveness_analysis",
  "admt_testing_analysis",
  "training_data_analysis",
  "admt_overall_reasoning",
  "risk_interdependency_analysis",
  "safeguard_effectiveness_analysis",
  "planned_safeguard_analysis",
  "safeguard_gap_analysis",
  "residual_risk_analysis_narrative",
  "pro_processing_analysis",
  "con_processing_analysis",
  "admt_technical_analysis",
];

// ── Provenance ────────────────────────────────────────────────────────────────

export type FactorClass = "A" | "B";

export interface FactorProvenance {
  readonly factor_id: string;
  readonly factor_class: FactorClass;
  /** "INTAKE:key" | "DERIVED:name" | "SYSTEM:name" | "FACTOR:id" | "DOCUMENT:ref" */
  readonly sources: readonly string[];
  /** Authority references for the RK3-D App G feed (not printed in RK3-C). */
  readonly authorities: readonly string[];
}

export interface RiskFactorEngineResult {
  readonly stamp: string;
  /** ComposedBlocks additions, keyed "sectionId:index". */
  readonly blocks: Record<string, string>;
  /** factor_id → composed text, for exec projections and pins. */
  readonly factors: Record<string, string>;
  readonly provenance: readonly FactorProvenance[];
  readonly composed_factor_ids: readonly string[];
  readonly absent_class_c_ids: readonly string[];
}

// ── Typed operand extraction ─────────────────────────────────────────────────

interface Pathway {
  readonly harm: string;
  readonly data: string;
  readonly actor: string;
  readonly source: string;
  readonly cause: string;
  readonly likelihood: string;
  readonly severity: string;
  readonly materiality: RiskMateriality;
  readonly bestStatus: string | null;
  readonly residual: RiskMateriality;
  readonly safeguards: Bag[];
}

const SAFEGUARD_STATUS_RANK: Record<string, number> = {
  "Implemented and tested": 3,
  "Implemented, not tested": 2,
  "Planned, not yet implemented": 1,
  "None": 0,
};

function extractPathways(intake: Bag): Pathway[] {
  const safeguardRows = rows(intake.a6_safeguards);
  return rows(intake.a5_harm_pathways).flatMap((p) => {
    const materiality = resolveMateriality(s(p.likelihood), s(p.severity));
    if (!materiality || !s(p.harm)) return [];
    const linked = safeguardRows.filter((g) => s(g.harm) === s(p.harm) && s(g.safeguard));
    const implemented = linked.filter((g) =>
      (SAFEGUARD_STATUS_RANK[s(g.safeguard_status)] ?? 0) >= 2
    );
    const bestStatus = linked.length
      ? linked.reduce((a, b) =>
        (SAFEGUARD_STATUS_RANK[s(b.safeguard_status)] ?? 0) >
            (SAFEGUARD_STATUS_RANK[s(a.safeguard_status)] ?? 0)
          ? b
          : a
      )
      : null;
    return [{
      harm: s(p.harm),
      data: clause(p.data_involved),
      actor: clause(p.actor),
      source: clause(p.source),
      cause: clause(p.cause),
      likelihood: s(p.likelihood),
      severity: s(p.severity),
      materiality,
      bestStatus: bestStatus ? s(bestStatus.safeguard_status) : null,
      residual: resolveResidual(
        materiality,
        implemented.length
          ? (implemented.some((g) => s(g.safeguard_status) === "Implemented and tested")
            ? "Implemented and tested"
            : "Implemented, not tested")
          : null,
      ),
      safeguards: linked,
    }];
  });
}

function rankPathways(ps: Pathway[]): Pathway[] {
  return [...ps].sort((a, b) => MATERIALITY_RANK[b.materiality] - MATERIALITY_RANK[a.materiality]);
}

/** Material cut: High/Critical; if none reach High, the top tier present. */
function materialPathways(ps: Pathway[]): Pathway[] {
  const ranked = rankPathways(ps);
  if (ranked.length === 0) return [];
  const high = ranked.filter((p) => MATERIALITY_RANK[p.materiality] >= 2);
  if (high.length) return high;
  const top = ranked[0].materiality;
  return ranked.filter((p) => p.materiality === top);
}

interface BenefitRecord {
  readonly label: string;
  readonly narrative: string;
  readonly fact: string;
  readonly weight: BenefitWeight;
}

function extractBenefits(intake: Bag): BenefitRecord[] {
  const defs: Array<[string, unknown, unknown, unknown]> = [
    ["Consumer", intake.benefit_consumer_identified, intake.a4_benefit_consumer, intake.a4_benefit_consumer_fact],
    ["Business", intake.benefit_business_identified, intake.a4_benefit_business, intake.a4_benefit_business_fact],
    [
      "Other-stakeholder",
      intake.benefit_other_stakeholders_identified,
      intake.a4_benefit_other_stakeholders,
      intake.a4_benefit_other_stakeholders_fact,
    ],
    ["Public", intake.benefit_public_identified, intake.a4_benefit_public, intake.a4_benefit_public_fact],
  ];
  return defs.map(([label, identified, narrative, fact]) => ({
    label,
    narrative: clause(narrative),
    fact: clause(fact),
    weight: resolveBenefitWeight(identified, narrative, fact),
  }));
}

function bestBenefitTier(benefits: BenefitRecord[]): BenefitTier {
  if (benefits.some((b) => b.weight === "material weight")) return "material";
  if (benefits.some((b) => b.weight === "limited weight")) return "limited";
  return "none";
}

interface NecessityBuckets {
  readonly necessary: Bag[];
  readonly unnecessary: Bag[];
  readonly unsure: Bag[];
  readonly total: number;
}

function extractNecessity(intake: Bag): NecessityBuckets {
  const all = rows(intake.a2_necessity_set).filter((r) => s(r.element));
  return {
    necessary: all.filter((r) => s(r.necessity) === "Necessary to the stated purpose"),
    unnecessary: all.filter((r) => s(r.necessity) === "Collected but not necessary to the stated purpose"),
    unsure: all.filter((r) => s(r.necessity) === "Unsure"),
    total: all.length,
  };
}

// ── The engine ────────────────────────────────────────────────────────────────

export function runRiskFactorEngine(
  intake: Bag,
  report: Bag,
  assessmentDate: string,
): RiskFactorEngineResult {
  const blocks: Record<string, string> = {};
  const factors: Record<string, string> = {};
  const provenance: FactorProvenance[] = [];

  const put = (
    key: string,
    factorId: string,
    cls: FactorClass,
    text: string,
    sources: string[],
    authorities: string[] = [],
  ): string => {
    const t = text.replace(/\s{2,}/g, " ").trim();
    if (!t) return "";
    factors[factorId] = t;
    provenance.push({ factor_id: factorId, factor_class: cls, sources, authorities });
    blocks[key] = blocks[key] ? `${blocks[key]} ${t}` : t;
    return t;
  };

  // Shared typed operands.
  const pathways = extractPathways(intake);
  const material = materialPathways(pathways);
  const benefits = extractBenefits(intake);
  const benefitTier = bestBenefitTier(benefits);
  const necessity = extractNecessity(intake);
  const isAdmt = isYes(intake.q18_admt_use);
  const scopeLines = arr((report.scope_and_triggers as Bag)?.narrative ?? report.scope_and_triggers);
  const engagedLines = scopeLines.filter((x) => x.startsWith("Engaged — "));
  const uncertainLines = scopeLines.filter((x) => /^uncertain/i.test(x));
  const rc = (report.record_complete ?? null) as
    | { value?: unknown; failed_conditions?: unknown; empty_required_keys?: unknown }
    | null;

  const maxResidual: RiskMateriality = pathways.length
    ? MATERIALITY_BY_RANK[Math.max(...pathways.map((p) => MATERIALITY_RANK[p.residual]))]
    : "Low";
  const maxInherent: RiskMateriality = pathways.length
    ? MATERIALITY_BY_RANK[Math.max(...pathways.map((p) => MATERIALITY_RANK[p.materiality]))]
    : "Low";

  // Safeguard buckets (typed on the SAFEGUARD_STATUS enum).
  const safeguardRows = rows(intake.a6_safeguards).filter((g) => s(g.safeguard));
  const tested = safeguardRows.filter((g) => s(g.safeguard_status) === "Implemented and tested");
  const untested = safeguardRows.filter((g) => s(g.safeguard_status) === "Implemented, not tested");
  const planned = safeguardRows.filter((g) => s(g.safeguard_status) === "Planned, not yet implemented");
  const materialHarms = new Set(material.map((p) => p.harm));
  const gaps = material.filter((p) =>
    !safeguardRows.some((g) =>
      s(g.harm) === p.harm && (SAFEGUARD_STATUS_RANK[s(g.safeguard_status)] ?? 0) >= 2
    )
  );

  // Conditions / follow-ups / recommendations (typed derivations, shared by
  // Sections III, VIII, IX and the executive summary).
  const conditions: string[] = [];
  for (const g of planned) {
    conditions.push(
      `Complete implementation of the planned safeguard: ${firstSentence(s(g.safeguard))}${
        s(g.harm) ? ` (addresses: ${s(g.harm)})` : ""
      }`,
    );
  }
  if (necessity.unnecessary.length) {
    conditions.push(
      `Cease processing, or establish the necessity of, the following ${
        plural(necessity.unnecessary.length, "element", "elements")
      }: ${asProse(necessity.unnecessary.map((r) => s(r.element)))}`,
    );
  }
  for (const p of gaps) {
    conditions.push(
      `Establish and implement a safeguard addressing the material risk pathway: ${p.harm}`,
    );
  }

  const followUps: string[] = [];
  if (necessity.unsure.length) {
    followUps.push(
      `Establish whether the following ${
        plural(necessity.unsure.length, "element is", "elements are")
      } necessary to the stated purpose: ${asProse(necessity.unsure.map((r) => s(r.element)))}`,
    );
  }
  if (rc && rc.value === false) {
    const emptyKeys = arr(rc.empty_required_keys).slice(0, 5);
    followUps.push(
      `Complete the intake record: the completion gate reports ${
        arr(rc.failed_conditions).length || "one or more"
      } unmet ${plural(arr(rc.failed_conditions).length || 2, "condition", "conditions")}${
        emptyKeys.length ? ` (including ${asProse(emptyKeys)})` : ""
      }`,
    );
  }
  for (const line of uncertainLines) {
    followUps.push(`Resolve the trigger question: ${line}`);
  }

  // Consumer-control weak markers (typed on the q7–q10 / q16 / q20 enums;
  // shared by Section IV and the Section IX recommendations, so derived here
  // BEFORE Section IX composes).
  const weakControls: string[] = [];
  if (s(intake.q7_right_delete) === "No formal process") weakControls.push("the deletion process");
  if (s(intake.q8_right_correct) === "No formal process") weakControls.push("the correction process");
  if (isNo(intake.q9_opt_out)) weakControls.push("the opt-out mechanism");
  if (s(intake.q10_id_verification) === "No verification process") weakControls.push("identity verification");
  if (
    isYes(intake.q15_sensitive_pi) &&
    (s(intake.q16_sensitive_limit) === "No" || s(intake.q16_sensitive_limit) === "Not yet implemented")
  ) weakControls.push("the sensitive-information limit");
  if (isAdmt && isNo(intake.q20_admt_opt_out)) weakControls.push("the ADMT opt-out");

  const recommendations: string[] = [];
  if (untested.length) {
    recommendations.push(
      `Obtain implementation or testing evidence for the ${
        plural(untested.length, "control", "controls")
      } credited without it, so the assessment can rely on ${plural(untested.length, "it", "them")} at full weight`,
    );
  }
  if (planned.length) {
    recommendations.push(
      "Track each planned safeguard to completion and update the assessment when it becomes operational",
    );
  }
  if (weakControls.length) {
    recommendations.push(
      `Strengthen ${asProse(weakControls)} so the related ${
        plural(weakControls.length, "right", "rights")
      } can be exercised in practice`,
    );
  }

  // ── Section III — necessity (full conversion; the enum carries the judgment) ──

  if (necessity.necessary.length) {
    const lines = necessity.necessary.map((r) =>
      `— ${s(r.element)}: the Company’s stated basis is: ${clause(r.justification) || "recorded in the intake record without further explanation"}.`
    );
    put(
      "iii_necessity:1",
      "necessary_elements",
      "A",
      `${RISK_FACTOR_FIXED.necessity_b_head} ${lines.join(" ")}`,
      ["INTAKE:a2_necessity_set"],
      ["11 CCR § 7152(a)(2)"],
    );
  }
  if (necessity.unnecessary.length) {
    put(
      "iii_necessity:2",
      "unnecessary_elements",
      "A",
      `${RISK_FACTOR_FIXED.unnecessary_lead} ${
        necessity.unnecessary.map((r) => `— ${s(r.element)}.`).join(" ")
      } ${RISK_FACTOR_FIXED.unnecessary_note}`,
      ["INTAKE:a2_necessity_set"],
      ["11 CCR § 7152(a)(2)"],
    );
  }
  if (necessity.unsure.length) {
    put(
      "iii_necessity:3",
      "uncertain_elements",
      "A",
      `${RISK_FACTOR_FIXED.uncertain_lead} ${
        necessity.unsure.map((r) => `— ${s(r.element)}.`).join(" ")
      } ${RISK_FACTOR_FIXED.uncertain_note}`,
      ["INTAKE:a2_necessity_set"],
      ["11 CCR § 7152(a)(2)"],
    );
  }
  if (necessity.total) {
    let conclusion: string;
    if (!necessity.unnecessary.length && !necessity.unsure.length) {
      conclusion =
        "Each material element of personal information identified for this activity is supported as necessary to the stated purpose on the basis the Company has supplied. The necessity requirement is satisfied for assessment purposes.";
    } else if (necessity.unnecessary.length) {
      conclusion =
        "The necessity analysis is qualified: one or more elements identified above are not shown to be necessary to the stated purpose. The minimization consequence below applies." +
        (necessity.unsure.length
          ? " In addition, necessity has not yet been established for every remaining element; the follow-up below is required."
          : "");
    } else {
      conclusion =
        "The necessity analysis is qualified: necessity has not yet been established for every element. The follow-up identified below is required before the necessity conclusion can be treated as complete.";
    }
    put(
      "iii_necessity:4",
      "necessity_conclusion",
      "B",
      `${RISK_FACTOR_FIXED.necessity_c_head} ${conclusion}`,
      ["INTAKE:a2_necessity_set", "FACTOR:necessary_elements"],
      ["11 CCR § 7152(a)(2)"],
    );
  }
  if (necessity.unnecessary.length) {
    put(
      "iii_necessity:5",
      "minimization_condition",
      "B",
      `${RISK_FACTOR_FIXED.minimization_condition_lead} The Company should cease processing, or establish the necessity of, the ${
        plural(necessity.unnecessary.length, "element", "elements")
      } identified above before the favorable disposition of this assessment can rest on the necessity analysis.`,
      ["FACTOR:unnecessary_elements"],
      ["11 CCR § 7152(a)(2)"],
    );
  }
  if (necessity.unsure.length) {
    put(
      "iii_necessity:6",
      "minimization_follow_up",
      "B",
      `${RISK_FACTOR_FIXED.minimization_follow_up_lead} Establish whether the ${
        plural(necessity.unsure.length, "element", "elements")
      } identified above ${plural(necessity.unsure.length, "is", "are")} necessary to the stated purpose, and record the basis for that determination in the assessment record.`,
      ["FACTOR:uncertain_elements"],
      ["11 CCR § 7152(a)(2)"],
    );
  }
  if (necessity.unnecessary.length || necessity.unsure.length) {
    put(
      "iii_necessity:7",
      "minimization_recommendation",
      "B",
      `${RISK_FACTOR_FIXED.minimization_recommendation_lead} Review the element-level record in Appendix B on the Section X cadence, and remove or justify any element whose necessity remains unestablished.`,
      ["FACTOR:necessity_conclusion"],
      ["11 CCR § 7152(a)(2)"],
    );
  }

  // Appendix B — necessity matrix.
  if (necessity.total) {
    const matrix = rows(intake.a2_necessity_set).filter((r) => s(r.element)).map((r) =>
      `Element — ${s(r.element)}. Necessity determination: ${s(r.necessity)}. Basis: ${
        clause(r.justification) || "recorded in the intake record without further explanation"
      }.`
    );
    put(
      "appendix_b:0",
      "necessity_matrix",
      "A",
      `${RISK_FACTOR_FIXED.appendix_b_intro}\n${matrix.join("\n")}`,
      ["INTAKE:a2_necessity_set"],
      ["11 CCR § 7152(a)(2)"],
    );
  }

  // ── Section VII — risks ──────────────────────────────────────────────────────

  if (material.length) {
    const blocksText = material.map((p) => {
      const effect = p.materiality === "Critical"
        ? "this pathway alone could preclude a favorable balance unless materially reduced by safeguards."
        : p.materiality === "High"
        ? "this pathway weighs substantially against the processing unless materially reduced by safeguards."
        : p.materiality === "Moderate"
        ? "this pathway is material to the balance and requires safeguard credit to be acceptable."
        : "this pathway does not by itself move the balance.";
      return `Risk pathway — ${p.harm}. The Company describes the pathway as follows. Information involved: ${p.data}. Actor or event: ${p.actor}. Source: ${p.source}. Cause: ${p.cause}. Likelihood (Company assessment): ${p.likelihood}. Severity (Company assessment): ${p.severity}. Materiality before safeguards: ${p.materiality}. Decision effect before safeguards: ${effect}`;
    });
    put(
      "vii_risks:1",
      "material_risk_blocks",
      "B",
      `${RISK_FACTOR_FIXED.vii_b_head} ${blocksText.join(" ")}`,
      ["INTAKE:a5_harm_pathways", "FACTOR:materiality_matrix"],
      ["11 CCR § 7152(a)(5)"],
    );
  }

  if (pathways.length) {
    const addressed = [...new Set(pathways.map((p) => p.harm))];
    const remaining = HARM_PATHWAY_OPTS.filter((o) => !addressed.includes(o));
    const reviewRows = rows(intake.harm_category_review_status);
    let text: string;
    if (reviewRows.length) {
      text = `The Company’s category-review record addresses each harm category as follows: ${
        reviewRows.map((r) => `${s(r.category) || s(r.harm)} — ${s(r.status)}`).join("; ")
      }.`;
    } else {
      text = `The Company’s pathway record addresses the following ${
        plural(addressed.length, "category", "categories")
      }: ${addressed.join("; ")}.${
        remaining.length
          ? ` For the remaining ${
            plural(remaining.length, "category", "categories")
          } — ${remaining.join("; ")} — no credible pathway is identified in the assessment record, and ${
            plural(remaining.length, "it is", "they are")
          } not treated as material ${plural(remaining.length, "risk", "risks")}.`
          : ""
      }`;
    }
    put(
      "vii_risks:3",
      "other_risk_categories_summary",
      "B",
      text,
      reviewRows.length ? ["INTAKE:harm_category_review_status"] : ["INTAKE:a5_harm_pathways"],
      ["11 CCR § 7152(a)(5)"],
    );
  }

  if (pathways.length) {
    const ranked = rankPathways(pathways);
    const list = ranked
      .filter((p) => p.materiality === maxInherent || MATERIALITY_RANK[p.materiality] >= 2)
      .map((p) => `— ${p.harm} (materiality before safeguards: ${p.materiality}).`);
    const tierSentence = maxInherent === "Critical"
      ? "Conclusion. The inherent risk of the activity, before safeguards, is critical."
      : maxInherent === "High"
      ? "Conclusion. The inherent risk of the activity, before safeguards, is high."
      : maxInherent === "Moderate"
      ? "Conclusion. The inherent risk of the activity, before safeguards, is moderate."
      : "Conclusion. The inherent risk of the activity, before safeguards, is low.";
    put(
      "vii_risks:5",
      "inherent_material_risks",
      "A",
      `${RISK_FACTOR_FIXED.vii_e_head} ${RISK_FACTOR_FIXED.inherent_lead} ${list.join(" ")}`,
      ["INTAKE:a5_harm_pathways", "FACTOR:materiality_matrix"],
      ["11 CCR § 7152(a)(5)"],
    );
    put(
      "vii_risks:5",
      "overall_inherent_risk_conclusion",
      "B",
      `${tierSentence} Reasoning. The conclusion follows from the likelihood and severity assessments the Company supplied, combined through the assessment’s materiality matrix. ${RISK_FACTOR_FIXED.inherent_close}`,
      ["FACTOR:inherent_material_risks"],
      ["11 CCR § 7152(a)(5)"],
    );
  }

  // ── Section VIII — safeguards and residual risk ──────────────────────────────

  const materialSafeguards = safeguardRows.filter((g) =>
    materialHarms.has(s(g.harm)) && (SAFEGUARD_STATUS_RANK[s(g.safeguard_status)] ?? 0) >= 2
  );
  if (materialSafeguards.length) {
    const lines = materialSafeguards.map((g) =>
      `— ${firstSentence(s(g.safeguard))} (addresses: ${s(g.harm)}; status: ${s(g.safeguard_status)}).`
    );
    put(
      "viii_safeguards:1",
      "material_existing_safeguards",
      "A",
      `${RISK_FACTOR_FIXED.viii_b_head} ${RISK_FACTOR_FIXED.material_safeguards_lead} ${lines.join(" ")}`,
      ["INTAKE:a6_safeguards", "FACTOR:material_risk_blocks"],
      ["11 CCR § 7152(a)(6)"],
    );
  }
  if (tested.length) {
    put(
      "viii_safeguards:2",
      "tested_safeguards",
      "A",
      `${RISK_FACTOR_FIXED.tested_lead} ${
        tested.map((g) => `— ${firstSentence(s(g.safeguard))} (addresses: ${s(g.harm)}).`).join(" ")
      } ${RISK_FACTOR_FIXED.tested_note}`,
      ["INTAKE:a6_safeguards"],
      ["11 CCR § 7152(a)(6)"],
    );
  }
  if (untested.length) {
    put(
      "viii_safeguards:3",
      "untested_safeguards",
      "A",
      `${RISK_FACTOR_FIXED.untested_lead} ${
        untested.map((g) => `— ${firstSentence(s(g.safeguard))} (addresses: ${s(g.harm)}).`).join(" ")
      } ${RISK_FACTOR_FIXED.untested_note}`,
      ["INTAKE:a6_safeguards"],
      ["11 CCR § 7152(a)(6)"],
    );
  }
  if (planned.length) {
    put(
      "viii_safeguards:4",
      "planned_safeguards",
      "A",
      `${RISK_FACTOR_FIXED.planned_lead} ${
        planned.map((g) => `— ${firstSentence(s(g.safeguard))} (addresses: ${s(g.harm)}).`).join(" ")
      } ${RISK_FACTOR_FIXED.planned_note}`,
      ["INTAKE:a6_safeguards"],
      ["11 CCR § 7152(a)(6)"],
    );
  }
  if (gaps.length) {
    put(
      "viii_safeguards:5",
      "safeguard_gaps",
      "B",
      `${RISK_FACTOR_FIXED.gaps_lead} ${
        gaps.map((p) => `— ${p.harm} (materiality before safeguards: ${p.materiality}).`).join(" ")
      } Consequence. Until a safeguard is established for ${
        plural(gaps.length, "this pathway", "these pathways")
      }, the full inherent materiality is carried into the residual-risk conclusion and weighs against the processing in Section IX.`,
      ["FACTOR:material_risk_blocks", "INTAKE:a6_safeguards"],
      ["11 CCR § 7152(a)(6)"],
    );
  }
  if (pathways.length) {
    const residualList = rankPathways(pathways)
      .filter((p) => MATERIALITY_RANK[p.residual] >= 1)
      .sort((a, b) => MATERIALITY_RANK[b.residual] - MATERIALITY_RANK[a.residual])
      .map((p) =>
        `— ${p.harm}: residual ${p.residual} (inherent ${p.materiality}; credited safeguard status: ${
          p.bestStatus ?? "none established"
        }).`
      );
    const listText = residualList.length
      ? residualList.join(" ")
      : "— None above the low tier. Each pathway is reduced to, or already sits at, the low tier once safeguards supported by testing evidence are credited.";
    const conclusionText = maxResidual === "Critical"
      ? "Conclusion. After credited safeguards, the residual privacy risk of the activity is critical. The processing cannot be favorably balanced while this residual risk remains."
      : maxResidual === "High"
      ? "Conclusion. After credited safeguards, the residual privacy risk of the activity is high. The balancing analysis in Section IX treats this residual risk as weighing substantially against the processing."
      : maxResidual === "Moderate"
      ? "Conclusion. After credited safeguards, the residual privacy risk of the activity is moderate. The pathways identified above remain material to the balancing decision."
      : "Conclusion. After credited safeguards, the residual privacy risk of the activity is low. No individual pathway remains above the low tier.";
    put(
      "viii_safeguards:7",
      "material_residual_risks",
      "A",
      `${RISK_FACTOR_FIXED.residual_lead} ${listText}`,
      ["INTAKE:a5_harm_pathways", "INTAKE:a6_safeguards", "FACTOR:residual_rule"],
      ["11 CCR § 7152(a)(6)"],
    );
    put(
      "viii_safeguards:7",
      "overall_residual_risk_conclusion",
      "B",
      `${conclusionText} Reasoning. Safeguard credit follows the assessment’s residual rule: a safeguard reduces a pathway’s materiality by one tier only where implementation and testing evidence supports it; implemented-but-untested and planned safeguards are recorded but do not change the tier. The Company’s own residual descriptions are preserved in Appendix C.`,
      ["FACTOR:material_residual_risks"],
      ["11 CCR § 7152(a)(6)"],
    );
  }

  // Appendix C — risk register.
  if (pathways.length) {
    const register = rankPathways(pathways).map((p) => {
      const safeguardCells = p.safeguards.length
        ? p.safeguards.map((g) =>
          `${firstSentence(s(g.safeguard))} [status: ${s(g.safeguard_status)}]${
            s(g.residual) ? ` [Company residual description: ${clause(g.residual)}]` : ""
          }`
        ).join(" | ")
        : "none established";
      return [
        `Pathway — ${p.harm}.`,
        `Information involved: ${p.data}.`,
        `Actor or event: ${p.actor}.`,
        `Source: ${p.source}.`,
        `Cause: ${p.cause}.`,
        `Likelihood: ${p.likelihood}. Severity: ${p.severity}. Materiality before safeguards: ${p.materiality}.`,
        `Safeguards: ${safeguardCells}.`,
        `Residual tier after credited safeguards: ${p.residual}.`,
        `Effect on the processing decision: ${
          MATERIALITY_RANK[p.residual] >= 2
            ? "weighs substantially against the processing in Section IX."
            : MATERIALITY_RANK[p.residual] === 1
            ? "material to the Section IX balance."
            : "does not by itself move the Section IX balance."
        }`,
      ].join(" ");
    });
    put(
      "appendix_c:0",
      "risk_and_safeguard_register",
      "B",
      `${RISK_FACTOR_FIXED.appendix_c_intro}\n${register.join("\n")}`,
      ["INTAKE:a5_harm_pathways", "INTAKE:a6_safeguards", "FACTOR:materiality_matrix", "FACTOR:residual_rule"],
      ["11 CCR § 7152(a)(5)", "11 CCR § 7152(a)(6)"],
    );
  }

  // ── Section VI — benefits ────────────────────────────────────────────────────

  const benefitKeys: Record<string, string> = {
    Consumer: "vi_benefits:4",
    Business: "vi_benefits:8",
    "Other-stakeholder": "vi_benefits:12",
    Public: "vi_benefits:16",
  };
  const benefitFactorIds: Record<string, string> = {
    Consumer: "consumer_benefit",
    Business: "business_benefit",
    "Other-stakeholder": "other_stakeholder_benefit",
    Public: "public_benefit",
  };
  for (const b of benefits) {
    if (b.weight === "no affirmative weight" || !b.narrative) continue;
    const analysis = b.weight === "material weight"
      ? "The Company identifies a concrete outcome and attributes it to this processing, and supporting information is supplied; the claim is considered in the balance at the weight stated below."
      : "The Company identifies a concrete outcome and attributes it to this processing, but supporting information is not supplied; the absence of support limits the weight the claim can carry.";
    put(
      benefitKeys[b.label],
      `${benefitFactorIds[b.label]}_analysis`,
      "B",
      `${analysis} ${RISK_FACTOR_FIXED.weight_lead} ${b.weight}.`,
      [
        `INTAKE:benefit_${b.label === "Other-stakeholder" ? "other_stakeholders" : b.label.toLowerCase()}_identified`,
        "FACTOR:benefit_weight_table",
      ],
      ["11 CCR § 7152(a)(4)"],
    );
  }
  {
    const materialB = benefits.filter((b) => b.weight === "material weight");
    const limitedB = benefits.filter((b) => b.weight === "limited weight");
    const parts: string[] = [RISK_FACTOR_FIXED.vi_f_head];
    if (materialB.length) {
      parts.push(
        `${RISK_FACTOR_FIXED.material_benefits_lead} ${
          materialB.map((b) =>
            `— ${b.label} benefit (material weight): ${firstSentence(b.narrative).replace(/\.$/, "")}.`
          ).join(" ")
        }`,
      );
    }
    if (limitedB.length) {
      parts.push(
        `${RISK_FACTOR_FIXED.discounted_lead} ${
          limitedB.map((b) => `— ${b.label} benefit (limited weight): identified without supporting information.`).join(" ")
        }`,
      );
    }
    const conclusion = benefitTier === "material"
      ? "Conclusion. The processing is supported by at least one benefit of material weight. The benefits above enter the balancing analysis in Section IX at the weights stated."
      : benefitTier === "limited"
      ? "Conclusion. The benefits established carry limited weight. That limitation is carried into the balancing analysis in Section IX."
      : "Conclusion. No benefit is established for any stakeholder category. The balancing analysis in Section IX cannot favor the processing on the present record.";
    parts.push(conclusion);
    put(
      "vi_benefits:16",
      "overall_benefits_conclusion",
      "B",
      parts.join(" "),
      ["FACTOR:benefit_weight_table", "INTAKE:a4_benefit_consumer", "INTAKE:a4_benefit_business"],
      ["11 CCR § 7152(a)(4)"],
    );
  }

  // ── Section IX — balancing ───────────────────────────────────────────────────

  const cell = RISK_BALANCING_TABLE[benefitTier][maxResidual];
  const hasConditions = conditions.length > 0;
  const { outcome, consequence } = resolveRecommendedOutcome(
    cell.kind,
    hasConditions,
    s(intake.processing_status),
  );

  {
    const pro: string[] = benefits
      .filter((b) => b.weight !== "no affirmative weight")
      .sort((a, b) => (a.weight === "material weight" ? 0 : 1) - (b.weight === "material weight" ? 0 : 1))
      .map((b) => `— ${b.label} benefit (${b.weight}): ${firstSentence(b.narrative).replace(/\.$/, "")}.`);
    if (necessity.total && !necessity.unnecessary.length && !necessity.unsure.length) {
      pro.push(
        "— The information processed is supported as necessary to the stated purpose, with no element identified as unnecessary (Section III).",
      );
    }
    if (tested.length) {
      pro.push("— Safeguards supported by testing evidence reduce the principal risk pathways (Section VIII).");
    }
    if (pro.length) {
      put(
        "ix_balancing:1",
        "pro_processing_factors",
        "A",
        `${RISK_FACTOR_FIXED.ix_b_head} ${RISK_FACTOR_FIXED.pro_lead} ${pro.join(" ")}`,
        ["FACTOR:benefit_weight_table", "FACTOR:necessity_conclusion", "FACTOR:tested_safeguards"],
        ["11 CCR § 7154"],
      );
    }
  }
  {
    const con: string[] = rankPathways(pathways)
      .filter((p) => MATERIALITY_RANK[p.residual] >= 1)
      .map((p) => `— Residual ${p.residual}: ${p.harm}.`);
    if (necessity.unnecessary.length) {
      con.push(
        `— ${plural(necessity.unnecessary.length, "An element", "Elements")} of the information processed ${
          plural(necessity.unnecessary.length, "is", "are")
        } not shown to be necessary to the stated purpose (Section III).`,
      );
    }
    if (gaps.length) {
      con.push(`— ${plural(gaps.length, "A material risk pathway lacks", "Material risk pathways lack")} an implemented safeguard (Section VIII).`);
    }
    if (planned.length) {
      con.push("— The safeguard posture depends in part on safeguards that are planned but not yet operational (Section VIII).");
    }
    if (con.length === 0 && pathways.length) {
      con.push("— No residual pathway remains above the low tier; the considerations against the activity are correspondingly limited.");
    }
    if (con.length) {
      put(
        "ix_balancing:2",
        "con_processing_factors",
        "A",
        `${RISK_FACTOR_FIXED.ix_c_head} ${RISK_FACTOR_FIXED.con_lead} ${con.join(" ")}`,
        ["FACTOR:residual_rule", "FACTOR:necessity_conclusion", "FACTOR:safeguard_gaps"],
        ["11 CCR § 7154"],
      );
    }
  }
  if (pathways.length || benefits.some((b) => b.weight !== "no affirmative weight")) {
    put(
      "ix_balancing:3",
      "balancing_conclusion",
      "B",
      `${RISK_FACTOR_FIXED.ix_d_head} ${RISK_FACTOR_FIXED.balancing_lead} ${cell.conclusion} ${RISK_FACTOR_FIXED.materiality_lead} ${cell.materiality} ${RISK_FACTOR_FIXED.decision_effect_lead} ${cell.effect} Reasoning. ${cell.explanation}`,
      ["FACTOR:overall_benefits_conclusion", "FACTOR:overall_residual_risk_conclusion", "FACTOR:balancing_table"],
      ["11 CCR § 7154"],
    );
    put(
      "ix_balancing:4",
      "recommended_processing_outcome",
      "B",
      `${RISK_FACTOR_FIXED.ix_e_head} ${RISK_FACTOR_FIXED.recommendation_lead} ${outcome} Processing consequence type: ${consequence}. The recommendation is the assessment’s disposition; the Company’s final business decision is recorded separately at finalization and is not inferred from it.`,
      ["FACTOR:balancing_conclusion", "INTAKE:processing_status"],
      ["11 CCR § 7154", "11 CCR § 7152(a)(7)"],
    );
  }
  if (conditions.length) {
    put(
      "ix_balancing:6",
      "conditions_to_proceed",
      "B",
      `${RISK_FACTOR_FIXED.conditions_lead} ${conditions.map((c) => `— ${c}.`).join(" ")}`,
      ["FACTOR:planned_safeguards", "FACTOR:minimization_condition", "FACTOR:safeguard_gaps"],
      ["11 CCR § 7154"],
    );
  }
  if (followUps.length) {
    put(
      "ix_balancing:7",
      "required_assessment_follow_up",
      "B",
      `${RISK_FACTOR_FIXED.follow_up_lead} ${followUps.map((f) => `— ${f}.`).join(" ")}`,
      ["FACTOR:uncertain_elements", "DERIVED:record_complete"],
      [],
    );
  }
  if (recommendations.length) {
    put(
      "ix_balancing:8",
      "recommendations",
      "B",
      `${RISK_FACTOR_FIXED.recommendations_lead} ${recommendations.map((r) => `— ${r}.`).join(" ")}`,
      ["FACTOR:untested_safeguards", "FACTOR:planned_safeguards"],
      [],
    );
  }

  // ── Section I — purpose, scope, triggers, record ─────────────────────────────

  const purpose = clause(intake.primary_activity_purpose);
  {
    const parts: string[] = [];
    const multiSentence = purpose && firstSentence(purpose) !== purpose;
    if (multiSentence) {
      parts.push(
        `${RISK_FACTOR_FIXED.normalized_purpose_lead} ${firstSentence(purpose)} ${RISK_FACTOR_FIXED.purpose_clarify_note}`,
      );
    }
    if (purpose && necessity.total) {
      parts.push(
        "Conclusion. The stated purpose is defined with enough precision to support the necessity, benefit, and balancing analyses that follow, and the assessment proceeds on the Company’s formulation.",
      );
    }
    if (parts.length) {
      if (multiSentence) {
        put(
          "i_purpose_scope:1",
          "normalized_processing_purpose",
          "A",
          parts[0],
          ["INTAKE:primary_activity_purpose"],
          [],
        );
      }
      if (purpose && necessity.total) {
        put(
          "i_purpose_scope:1",
          "purpose_conclusion",
          "B",
          parts[parts.length - 1],
          ["INTAKE:primary_activity_purpose", "INTAKE:a2_necessity_set"],
          ["11 CCR § 7152(a)(1)"],
        );
      }
    }
  }
  {
    const entry = clause(intake.processing_entry_point);
    const result = clause(intake.processing_result);
    if (entry && result) {
      put(
        "i_purpose_scope:3",
        "in_scope_processing_description",
        "A",
        `The assessment treats as in scope the processing the Company has described for this activity: information entering through ${entry}, the stated methods of collection, use, disclosure, and retention, and the output the processing produces — ${result}. Processing undertaken for a different purpose is outside the scope of this assessment and would require its own analysis.`,
        ["INTAKE:processing_entry_point", "INTAKE:processing_result", "INTAKE:processing_methods"],
        [],
      );
    }
  }
  if (engagedLines.length) {
    const analyses = engagedLines.map((l) => l.replace(/^Engaged — /, "Trigger analysis — "));
    let text = analyses.join(" ");
    if (uncertainLines.length) {
      text += ` ${RISK_FACTOR_FIXED.uncertain_trigger_lead} ${uncertainLines.join(" ")}`;
    }
    text +=
      " Conclusion. The activity is subject to the risk-assessment requirement; the trigger determination rests on the Company’s own processing facts as classified by the assessment.";
    put(
      "i_purpose_scope:6",
      "full_trigger_analysis",
      "B",
      text,
      ["DERIVED:applicable_7150_triggers"],
      ["11 CCR § 7150(b)"],
    );
  }
  {
    const providers = clause(intake.a8_information_providers);
    const parts: string[] = [];
    if (providers) {
      parts.push(
        `Record Considered. The assessment record consists of the intake record and the materials indexed in Appendix F — Materials Considered. Information was provided by: ${providers}.`,
      );
    }
    if (rc && rc.value === true) {
      parts.push(
        "Conclusion. The assessment record is complete for assessment purposes: the completion gate over the Intake Contract v2.0 record reports no unmet condition.",
      );
    } else if (rc && rc.value === false) {
      const fc = arr(rc.failed_conditions);
      parts.push(
        `Information Gaps or Inconsistencies. The completion gate reports ${fc.length || "one or more"} unmet ${
          plural(fc.length || 2, "condition", "conditions")
        }${fc.length ? `: ${asProse(fc)}` : ""}.`,
        "Conclusion. The assessment record is qualified. Consequence. The gaps identified above are carried into the Required Assessment Follow-Up in Section IX; a material gap is not resolved by assuming the answer most favorable to the processing.",
      );
    }
    if (parts.length) {
      put(
        "i_purpose_scope:12",
        "record_sources_summary",
        "A",
        parts[0],
        ["INTAKE:a8_information_providers", "DERIVED:materials_considered_index"],
        ["11 CCR § 7152(a)(8)"],
      );
      if (parts.length > 1) {
        put(
          "i_purpose_scope:12",
          "record_sufficiency_conclusion",
          "B",
          parts.slice(1).join(" "),
          ["DERIVED:record_complete"],
          [],
        );
      }
    }
  }

  // ── Section II — processing-context conclusions ──────────────────────────────

  {
    const entry = s(intake.processing_entry_point);
    const result = s(intake.processing_result);
    const m = (intake.processing_methods ?? {}) as Bag;
    const anyMethod = [m.collection_method, m.use_method, m.disclosure_method, m.retention_method, m.other_processing_method]
      .some((v) => s(v));
    if (entry && result && anyMethod) {
      put(
        "ii_processing_context:1",
        "processing_description_conclusion",
        "B",
        "Conclusion. The Company’s description of the processing is operationally complete for assessment purposes: the structured record identifies how information enters the process, the methods applied to it, and what the processing produces. The assessment relies on that description without restating it.",
        ["INTAKE:processing_entry_point", "INTAKE:processing_methods", "INTAKE:processing_result"],
        [],
      );
    } else if (entry || result || anyMethod) {
      const missing: string[] = [];
      if (!entry) missing.push("how information enters the process");
      if (!anyMethod) missing.push("the processing methods");
      if (!result) missing.push("what the processing produces");
      put(
        "ii_processing_context:1",
        "processing_clarification_required",
        "B",
        `Clarification required. The processing description does not yet identify ${asProse(missing)}; the gap is carried into the record-sufficiency analysis in Section I.E.`,
        ["INTAKE:processing_entry_point", "INTAKE:processing_methods", "INTAKE:processing_result"],
        [],
      );
    }
  }
  if (s(intake.consumer_interaction_method) && s(intake.consumer_interaction_purpose) && s(intake.approximate_ca_consumers)) {
    put(
      "ii_processing_context:3",
      "consumer_context_conclusion",
      "B",
      "Conclusion. The consumer-facing context of the activity is established: the Company identifies the method of interaction, its purpose, and the approximate California scale. The assessment uses those facts when weighing transparency, control, and the reach of the risks considered in Section VII.",
      ["INTAKE:consumer_interaction_method", "INTAKE:consumer_interaction_purpose", "INTAKE:approximate_ca_consumers"],
      [],
    );
  }
  {
    const cats = arr(intake.q4_pi_categories);
    if (cats.length) {
      // SPI membership mirrors the assembler's CA_PI_TAXONOMY spi flags
      // (kept inline to avoid an assembler↔engine import cycle; parity is
      // pinned by the RK3-C test).
      const spiCount = cats.filter((c) =>
        [
          "Precise geolocation (GPS-level / specific address)",
          "Health or medical information",
          "Biometric information",
          "Genetic data",
          "Racial or ethnic origin",
          "Religious or philosophical beliefs",
          "Union membership",
          "Sexual orientation or gender identity",
          "Citizenship or immigration status",
        ].includes(c)
      ).length;
      const spiSentence = spiCount > 0
        ? `Of those, ${spiCount} ${plural(spiCount, "is", "are")} sensitive personal information, and the sensitivity finding is carried into the necessity, risk, and safeguard analyses.`
        : isYes(intake.q15_sensitive_pi)
        ? "The Company additionally identifies sensitive personal information in its submission, and that identification is carried into the necessity, risk, and safeguard analyses."
        : "No sensitive personal information is identified for this activity.";
      put(
        "ii_processing_context:6",
        "pi_profile_conclusion",
        "B",
        `Conclusion. The information profile of the activity is established: ${cats.length} personal-information ${
          plural(cats.length, "category", "categories")
        } within the canonical California taxonomy. ${spiSentence}`,
        ["INTAKE:q4_pi_categories", "INTAKE:q15_sensitive_pi", "DERIVED:activity_spi_inventory"],
        [],
      );
    }
  }
  if (s(intake.i4b_sources)) {
    put(
      "ii_processing_context:9",
      "source_conclusion",
      "B",
      "Conclusion. The sources of the information are identified by the Company, and the assessment evaluates accuracy and expectation considerations on the basis of that description. No additional source is assumed.",
      ["INTAKE:i4b_sources"],
      [],
    );
  }
  {
    const recipientRows = rows(intake.recipients);
    if (recipientRows.length) {
      const typeCounts = new Map<string, number>();
      for (const r of recipientRows) {
        const t = s(r.recipient_type) || "unclassified";
        typeCounts.set(t, (typeCounts.get(t) ?? 0) + 1);
      }
      const typeSummary = [...typeCounts.entries()].map(([t, n]) => `${n} ${t.toLowerCase()}`).join("; ");
      put(
        "ii_processing_context:11",
        "recipient_conclusion",
        "B",
        `Conclusion. The disclosure surface of the activity is established: ${recipientRows.length} recipient ${
          plural(recipientRows.length, "record", "records")
        } (${typeSummary}), each tied to a stated purpose in the structured record. The reliance placed on the related contractual, technical, or oversight controls is considered in Section VIII.`,
        ["INTAKE:recipients"],
        [],
      );
    } else if (Array.isArray(intake.recipients)) {
      put(
        "ii_processing_context:11",
        "recipient_conclusion",
        "B",
        "Conclusion. The Company records that no service provider, contractor, or third party receives personal information in connection with the activity; the disclosure surface is accordingly internal to the Company.",
        ["INTAKE:recipients"],
        [],
      );
    }
  }
  {
    const retRows = rows(intake.retention_by_pi_category).filter((r) => s(r.pi_category));
    if (retRows.length) {
      const periodN = retRows.filter((r) => s(r.retention_period)).length;
      const criteriaN = retRows.filter((r) => !s(r.retention_period) && s(r.retention_criteria)).length;
      const parts = [
        `The category-level retention record identifies a fixed period for ${periodN} ${
          plural(periodN, "category", "categories")
        } and determining criteria for ${criteriaN} ${plural(criteriaN, "category", "categories")}.`,
        "Conclusion. Retention is established at the category level and remains connected to the stated purpose on the facts supplied.",
      ];
      if (criteriaN > 0) {
        parts.push(
          "Consequence. Where retention rests on criteria rather than a fixed period, the operative criteria govern deletion in practice; the Company’s application of those criteria forms part of the safeguard posture considered in Section VIII.",
        );
      }
      put(
        "ii_processing_context:13",
        "retention_conclusion",
        "B",
        parts.join(" "),
        ["INTAKE:retention_by_pi_category", "INTAKE:i2_retention_period"],
        [],
      );
    }
  }

  // ── Section IV — transparency, controls, coercion ────────────────────────────

  {
    const dRows = rows(intake.activity_disclosures).filter((d) => s(d.disclosure_content));
    if (dRows.length) {
      const made = dRows.filter((d) => /^made/i.test(s(d.status))).length;
      const plannedD = dRows.filter((d) => /^planned/i.test(s(d.status))).length;
      const parts = [
        `The disclosure record identifies ${dRows.length} ${
          plural(dRows.length, "disclosure", "disclosures")
        }, of which ${made} ${plural(made, "is", "are")} made and ${plannedD} ${plural(plannedD, "is", "are")} planned.`,
      ];
      if (plannedD === 0) {
        parts.push(
          "Conclusion. The transparency posture of the activity is established: the disclosures describe the processing to consumers, and the public-facing materials identified above are in place.",
        );
      } else {
        parts.push(
          "Conclusion. The transparency posture is established in part: one or more disclosures are planned rather than made.",
          "Consequence. Completion of each planned disclosure is treated as part of the transparency record; where the favorable balance depends on it, completion appears among the conditions or recommendations in Section IX.",
        );
      }
      put(
        "iv_consumer_transparency:2",
        "transparency_conclusion",
        "B",
        parts.join(" "),
        ["INTAKE:activity_disclosures", "INTAKE:public_privacy_policy_url"],
        ["11 CCR § 7152(a)(3)(E)"],
      );
    }
  }
  {
    const controlLines: string[] = [];
    const know = arr(intake.q6_right_know_multi).join("; ") || s(intake.q6_right_know);
    if (know) controlLines.push(`— Right to know: ${know}.`);
    if (s(intake.q7_right_delete)) controlLines.push(`— Right to delete: ${s(intake.q7_right_delete)}.`);
    if (s(intake.q8_right_correct)) controlLines.push(`— Right to correct: ${s(intake.q8_right_correct)}.`);
    if (s(intake.q9_opt_out)) controlLines.push(`— Opt-out of sale or sharing: ${s(intake.q9_opt_out)}.`);
    if (s(intake.q10_id_verification)) controlLines.push(`— Identity verification: ${s(intake.q10_id_verification)}.`);
    if (isYes(intake.q15_sensitive_pi) && s(intake.q16_sensitive_limit)) {
      controlLines.push(`— Limit the use of sensitive personal information: ${s(intake.q16_sensitive_limit)}.`);
    }
    if (isAdmt && s(intake.q20_admt_opt_out)) {
      controlLines.push(`— ADMT opt-out: ${s(intake.q20_admt_opt_out)}.`);
    }
    if (controlLines.length) {
      const conclusion = weakControls.length === 0
        ? "Conclusion. The controls above are established with documented or operational processes, and the assessment credits them as usable in practice on the facts the Company has described."
        : `Conclusion. ${
          asProse(weakControls).charAt(0).toUpperCase() + asProse(weakControls).slice(1)
        } ${plural(weakControls.length, "lacks", "lack")} a formal or completed process. A right that cannot be exercised in practice receives reduced weight, and that reduction is carried into the balancing analysis. Consequence. Strengthening the identified ${
          plural(weakControls.length, "control", "controls")
        } appears among the recommendations in Section IX.`;
      put(
        "iv_consumer_transparency:6",
        "relevant_consumer_controls",
        "A",
        `${RISK_FACTOR_FIXED.controls_lead} ${controlLines.join(" ")}`,
        ["INTAKE:q6_right_know", "INTAKE:q7_right_delete", "INTAKE:q8_right_correct", "INTAKE:q9_opt_out", "INTAKE:q10_id_verification"],
        [],
      );
      put(
        "iv_consumer_transparency:6",
        "consumer_control_conclusion",
        "B",
        conclusion,
        ["FACTOR:relevant_consumer_controls"],
        [],
      );
    }
  }
  {
    const reasons: string[] = [];
    if (necessity.unnecessary.length) {
      reasons.push("one or more information elements are not shown to be necessary to the interaction the consumer expects");
    }
    if (
      isYes(intake.q15_sensitive_pi) &&
      (s(intake.q16_sensitive_limit) === "No" || s(intake.q16_sensitive_limit) === "Not yet implemented")
    ) {
      reasons.push("the sensitive-information limit is not yet in place");
    }
    if (isNo(intake.q9_opt_out)) reasons.push("the opt-out mechanism is not in place");
    if (necessity.total || s(intake.q9_opt_out)) {
      const text = reasons.length === 0
        ? "Conclusion. No coercion or compulsion indicator is established in the typed intake record: the information processed is supported as necessary to the interaction the consumer expects, and the choices described above are available."
        : `Conclusion. The choice architecture around the activity requires attention: ${
          asProse(reasons)
        }. Consequence. The matter is reflected in the minimization condition, conditions, or recommendations in Sections III and IX.`;
      put(
        "iv_consumer_transparency:8",
        "coercion_conclusion",
        "B",
        text,
        ["INTAKE:a2_necessity_set", "INTAKE:q9_opt_out", "INTAKE:q16_limit_sensitive"],
        [],
      );
    }
  }

  // ── Section V — ADMT conclusions (gated end-to-end) ──────────────────────────

  if (isAdmt) {
    if (clause(intake.q19_admt_description) && clause(intake.admt_operational_role)) {
      put(
        "v_admt:1",
        "admt_role_conclusion",
        "B",
        "Conclusion. The operational role of the automated system is established by the Company’s description, and the assessment evaluates the system on that footing rather than on the label applied to it.",
        ["INTAKE:q19_admt_description", "INTAKE:admt_operational_role"],
        [],
      );
    }
    if (clause(intake.admt_output) && clause(intake.admt_output_use) && clause(intake.admt_consumer_effect)) {
      const b3 = engagedLines.some((l) => l.includes("(b)(3)"));
      put(
        "v_admt:5",
        "admt_decision_role_conclusion",
        "B",
        b3
          ? "Conclusion. The system’s output is used in a decision with the consumer effect the Company describes, and the significant-decision trigger is engaged; Section V accordingly treats the system as decisionmaking technology rather than an organizing tool."
          : "Conclusion. The system’s output participates in the processing as the Company describes; the decision effect recorded above frames the risk analysis in Section VII.",
        ["INTAKE:admt_output", "INTAKE:admt_output_use", "INTAKE:admt_consumer_effect", "DERIVED:applicable_7150_triggers"],
        [],
      );
    }
    {
      const review = clause(intake.i5_admt_human_review);
      put(
        "v_admt:7",
        "human_review_conclusion",
        "B",
        review
          ? "Conclusion. Human review is described in the Company’s submission. The assessment credits it to the extent the description supports reviewer understanding, adequate information and time, and authority to reach a different result; that reliance is carried into the safeguard analysis in Section VIII."
          : "Conclusion. No human review is described for the system. Consequence. The absence of described human review increases the weight of the automated component in the risk analysis in Section VII.",
        ["INTAKE:i5_admt_human_review"],
        [],
      );
    }
    {
      const testing = clause(intake.i5_admt_fairness_testing);
      const none = !testing || /^not applicable/i.test(testing) || /^none\b/i.test(testing);
      put(
        "v_admt:9",
        "admt_testing_conclusion",
        "B",
        none
          ? "Conclusion. No accuracy, fairness, or bias testing is described for the system. That absence limits the weight the assessment can give to accuracy and fairness claims and is reflected in the risk analysis in Section VII."
          : "Conclusion. Testing is described in the Company’s submission and provides evidence bearing on accuracy, fairness, and bias; the strength of that evidence is weighed in Sections VII and VIII.",
        ["INTAKE:i5_admt_fairness_testing"],
        [],
      );
    }
    {
      const source = clause(intake.i5_admt_training_source);
      const none = !source || /^not applicable/i.test(source);
      put(
        "v_admt:11",
        "training_data_conclusion",
        "B",
        none
          ? "Conclusion. Training-data provenance is not identified for the system; the gap is carried into the assessment follow-up where material."
          : "Conclusion. The provenance of the training data is identified in the Company’s submission and forms part of the technical record in Appendix D.",
        ["INTAKE:i5_admt_training_source"],
        [],
      );
    }
    {
      const parts: string[] = [];
      if (isYes(intake.admt_made_available_to_other_business)) {
        const trained = isYes(intake.admt_provider_trained_using_pi);
        const significant = isYes(intake.recipient_business_uses_admt_for_significant_decision);
        parts.push(
          trained && significant
            ? "The provided-to-another-business facts are established: the technology is made available to another business, is trained using personal information, and is used by the recipient for a significant decision. The recipient business remains responsible for its own risk assessment; the Company’s record preserves the facts that assessment requires."
            : "The Company records that the technology is made available to another business; the training and significant-decision facts recorded above frame the scope of the recipient’s own assessment obligation.",
        );
      }
      parts.push(
        `${RISK_FACTOR_FIXED.admt_h_head} On the facts recorded in this section, the automated component of the processing is adequately described for assessment purposes, and its risks are carried into Sections VII through IX rather than resolved here.`,
      );
      put(
        "v_admt:13",
        "admt_overall_conclusion",
        "B",
        parts.join(" "),
        ["INTAKE:admt_made_available_to_other_business", "INTAKE:admt_provider_trained_using_pi", "INTAKE:recipient_business_uses_admt_for_significant_decision"],
        ["11 CCR § 7153"],
      );
    }
  }

  // ── Section X — governance ───────────────────────────────────────────────────

  {
    const reviewers = rows(intake.assessment_reviewers_approvers);
    const migrated = s(intake.a9_approver_name);
    const authority = intake.approver_authority_confirmed;
    if (reviewers.length || migrated || authority !== undefined) {
      if (isYes(authority) && (reviewers.length || migrated)) {
        put(
          "x_governance:1",
          "approval_sufficiency_conclusion",
          "A",
          "Conclusion. The approval record is sufficient for assessment purposes: the reviewers and approvers are identified, and at least one approver is confirmed to have authority over whether the processing proceeds.",
          ["FINAL:assessment_reviewers_approvers", "FINAL:approver_authority_confirmed"],
          ["11 CCR § 7152(a)(9)"],
        );
      } else {
        put(
          "x_governance:1",
          "approval_follow_up",
          "B",
          "Approval follow-up. Confirmation of approver authority, or identification of the reviewers and approvers, remains outstanding and must be completed at finalization before the approval record is sufficient.",
          ["FINAL:approver_authority_confirmed"],
          ["11 CCR § 7152(a)(9)"],
        );
      }
    }
  }
  {
    const mc = s(intake.material_change_since_prior);
    if (mc) {
      const nextReview = (() => {
        const d = new Date(`${assessmentDate}T00:00:00Z`);
        d.setUTCFullYear(d.getUTCFullYear() + 3);
        return d.toISOString().slice(0, 10);
      })();
      const text = isYes(mc)
        ? `The Company records a material change since the prior assessment${
          s(intake.material_change_date) ? `, dated ${s(intake.material_change_date)}` : ""
        }. The 45-day update rule governs that change, and this assessment serves as the update on the present record. Conclusion. The governance cadence is satisfied by this assessment; the next scheduled review is ${nextReview}.${
          s(intake.material_change_date) ? "" : " Consequence. The date of the material change should be recorded to complete the governance record."
        }`
        : `No material change since a prior assessment is recorded. Conclusion. The three-year review cadence governs, and the next scheduled review is ${nextReview}.`;
      put(
        "x_governance:6",
        "governance_review_conclusion",
        "A",
        text,
        ["INTAKE:material_change_since_prior", "INTAKE:material_change_date", "SYSTEM:assessment_date"],
        ["11 CCR § 7155"],
      );
    }
  }
  {
    const four = [
      ["executive-management status", intake.certifier_is_executive_management],
      ["direct responsibility for risk-assessment compliance", intake.certifier_directly_responsible_for_ra_compliance],
      ["sufficient knowledge", intake.certifier_has_sufficient_knowledge],
      ["authority to submit", intake.certifier_authorized_to_submit],
    ] as const;
    const answered = four.filter(([, v]) => v === true || v === false || s(v) !== "");
    if (answered.length === 4) {
      const failing = four.filter(([, v]) => !isYes(v)).map(([label]) => label);
      put(
        "x_governance:9",
        "certifying_executive_eligibility_analysis",
        "A",
        failing.length === 0
          ? "The certifying executive identified in the submission record satisfies the eligibility criteria recorded in the organization profile: executive-management status, direct responsibility for risk-assessment compliance, sufficient knowledge, and authority to submit are each confirmed."
          : `The certifying-executive record is not yet sufficient: ${asProse(failing)} ${
            plural(failing.length, "is", "are")
          } not confirmed. The gap must be resolved before the business-level submission.`,
        ["ORG:certifier_is_executive_management", "ORG:certifier_directly_responsible_for_ra_compliance", "ORG:certifier_has_sufficient_knowledge", "ORG:certifier_authorized_to_submit"],
        ["11 CCR § 7157(c)"],
      );
    }
  }

  // ── Executive summary projections (composed last, from body factors) ────────

  if (engagedLines.length) {
    put(
      "executive_summary:3",
      "executive_trigger_summary",
      "A",
      engagedLines
        .map((l) => l.replace(/^Engaged — /, ""))
        .map((l) => `${l.replace(/:\s*/, " applies on the facts the Company has supplied: ")}`)
        .join(" "),
      ["DERIVED:applicable_7150_triggers"],
      ["11 CCR § 7150(b)"],
    );
  }
  {
    const purposeText = clause(intake.primary_activity_purpose);
    if (purposeText && firstSentence(purposeText) !== purposeText) {
      put(
        "executive_summary:1",
        "exec_normalized_processing_purpose",
        "A",
        `${RISK_FACTOR_FIXED.normalized_purpose_lead} ${firstSentence(purposeText)}`,
        ["INTAKE:primary_activity_purpose"],
        [],
      );
    }
  }
  {
    const lines: string[] = [];
    const materialB = benefits.filter((b) => b.weight === "material weight");
    if (materialB.length) {
      lines.push(
        `${RISK_FACTOR_FIXED.exec_benefits_lead} ${asProse(materialB.map((b) => `the ${b.label.toLowerCase()} benefit`))}.`,
      );
    }
    if (material.length) {
      lines.push(
        `${RISK_FACTOR_FIXED.exec_risks_lead} ${asProse(material.map((p) => p.harm))}.`,
      );
    }
    if (materialSafeguards.length) {
      lines.push(
        `${RISK_FACTOR_FIXED.exec_safeguards_lead} ${
          asProse(materialSafeguards.map((g) => firstSentence(s(g.safeguard)).replace(/\.$/, "")))
        }.`,
      );
    }
    if (pathways.length) {
      const residuals = rankPathways(pathways).filter((p) => MATERIALITY_RANK[p.residual] >= 1);
      lines.push(
        `${RISK_FACTOR_FIXED.exec_residual_lead} ${
          residuals.length
            ? asProse(residuals.map((p) => `${p.harm} (residual ${p.residual.toLowerCase()})`))
            : "none above the low tier"
        }.`,
      );
    }
    if (lines.length) {
      put(
        "executive_summary:4",
        "executive_material_findings",
        "A",
        `Key Findings. ${lines.join(" ")}`,
        ["FACTOR:overall_benefits_conclusion", "FACTOR:material_risk_blocks", "FACTOR:material_existing_safeguards", "FACTOR:material_residual_risks"],
        [],
      );
    }
  }
  if (factors.balancing_conclusion) {
    put(
      "executive_summary:5",
      "executive_balancing_conclusion",
      "B",
      `${RISK_FACTOR_FIXED.exec_determination_head} ${cell.conclusion} ${cell.explanation}`,
      ["FACTOR:balancing_conclusion"],
      ["11 CCR § 7154"],
    );
    put(
      "executive_summary:6",
      "executive_recommended_processing_outcome",
      "B",
      `${RISK_FACTOR_FIXED.exec_outcome_lead} ${outcome}`,
      ["FACTOR:recommended_processing_outcome"],
      ["11 CCR § 7152(a)(7)"],
    );
  }
  if (conditions.length) {
    put(
      "executive_summary:8",
      "executive_conditions",
      "B",
      `${RISK_FACTOR_FIXED.exec_conditions_lead} ${conditions.map((c) => `— ${c}.`).join(" ")} ${RISK_FACTOR_FIXED.exec_conditions_note}`,
      ["FACTOR:conditions_to_proceed"],
      [],
    );
  }
  if (followUps.length) {
    put(
      "executive_summary:9",
      "executive_required_follow_up",
      "B",
      `${RISK_FACTOR_FIXED.exec_follow_up_lead} ${followUps.map((f) => `— ${f}.`).join(" ")} ${RISK_FACTOR_FIXED.exec_follow_up_note}`,
      ["FACTOR:required_assessment_follow_up"],
      [],
    );
  }

  return {
    stamp: RISK_FACTOR_ENGINE_STAMP,
    blocks,
    factors,
    provenance,
    composed_factor_ids: Object.keys(factors),
    absent_class_c_ids: RISK_FACTOR_CLASS_C_IDS,
  };
}
