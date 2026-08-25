// RK3-C/RK3-D — CPPA RISK FACTOR ENGINE (Spine 4.3 Phases C + D).
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
// RATIFICATION ARTIFACTS: the RK3-C set was authored under the CEO's advance
// ratification grant of 2026-08-18 (ledger doc 32); the RK3-D set was decided
// by the senior-privacy-lawyer panel under the CEO's RK3-D grant of 2026-08-19
// (ledger doc 33). Changing any exported table cell or template is a
// ratification event.
//
// RK3-D (PN-RK8 ruled: convert C→B) — the former Class C set now composes
// from the doc 33 D-L3 structured intake sub-questions: each judgment is a
// typed fact the Company attested, and the ratified templates below carry its
// legal significance. `RISK_FACTOR_CLASS_C_IDS` now holds only ids with no
// Spine 4.3 placeholder (subsumed by fixed blocks); nothing on it ever
// composes. A record without the RK3-D operands composes exactly what RK3-C
// composed (NO-PADDING LAW; honest absence, never a default answer).
//
// REGISTER: the v3 banned register applies ("the record shows" family, "on
// this record", "as the record makes clear"). Company facts are attributed
// ("the Company describes…", "the Company identifies…"). Factor prose carries
// NO statutory citations: the printed Table of Authorities renders from the
// report's citation ledger plus the factor-authority provenance records
// (`provenance[].authorities`) in their own labelled App G group (doc 33 D-L8).
//
// FIXED LEADS: the sub-heads, leads, and notes in RISK_FACTOR_FIXED are
// transcribed from the Spine 4.3 generated-block descriptors (the spine file
// remains the custody point for skeleton/conditional prose; the factor-block
// leads are carried by this composer per the spine's own comments).

import { HARM_PATHWAY_OPTS } from "../intake-contracts/cppa-risk-assessment.ts";
import { CA_SPI_CATEGORY_KEYS } from "./ca-pi-taxonomy.ts";
import type { RenderedTable } from "../prose/skeleton-render.ts";
// SO-3 DEFECT CLASS 2 fix (2026-08-21, quality-batch 2fc40a52) — the shared,
// abbreviation-aware sentence bound. This module's own copy of firstSentence()
// used a naive regex that treated "Corp.", "Inc.", etc. as sentence endings,
// truncating any customer text that opens with (or contains) a company-name
// abbreviation before the sentence actually ends -- e.g. "Thornfield Analytics
// Corp. ingests applicant-supplied financial data..." rendered as just
// "Thornfield Analytics Corp." in the purpose-clarification sentence, and a
// planned-safeguard description cut off entirely at "...Nexogen Financial AI
// Inc." mid-clause. clause-bound.ts already solved this for DPIA; reusing it
// here instead of maintaining a second, buggier copy.
import { firstSentence } from "./clause-bound.ts";

export const RISK_FACTOR_ENGINE_STAMP =
  "risk-factor-engine@rk3-d-2026-08-19-fable5";

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

/**
 * CEO report review 2026-08-24 — § 7152(a)(8) "information providers" is a
 * free-text field (no per-person data model behind it), and the customer
 * commonly types it as "Name (Role) — materials, materials. Name (Role) —
 * materials." — a real list that used to render as one long run-on
 * sentence. This detects that shape and inserts the renderer's own
 * "— item" list marker (see generate-report-pdf/index.ts's
 * splitDashList) at each person boundary, so it renders as real bullets.
 * Text that doesn't match the pattern is returned unchanged — never a
 * partial or garbled split.
 */
function markInformationProviderItems(text: string): string {
  const t = s(text);
  if (!t) return t;
  const NAME_LEAD = /^[A-ZÀ-ÿ][\wÀ-ÿ'.-]*(?:\s[A-ZÀ-ÿ][\wÀ-ÿ'.-]*)*\s+\([^)]+\)\s+—\s+/;
  if (!NAME_LEAD.test(t)) return t;
  const NAME_BOUNDARY = /\.\s+(?=[A-ZÀ-ÿ][\wÀ-ÿ'.-]*(?:\s[A-ZÀ-ÿ][\wÀ-ÿ'.-]*)*\s+\([^)]+\)\s+—\s+)/g;
  const marked = t.replace(NAME_BOUNDARY, ". — ");
  return `— ${marked}`;
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

  vii_b_head: "B. Material Risks.",
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
} as const;
// appendix_b_intro / appendix_c_intro retired 2026-08-23/24: Appendix B/C
// are now real tables (buildNecessityMatrixTable /
// buildRiskAndSafeguardRegisterTable, below) with their intro sentences
// moved verbatim into cppa-risk.spine.ts as literal skeleton blocks,
// matching how Appendix A/D/E/F's intros already work.

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
        "The determination is material: the moderate residual risk or risks identified in Section VIII could change the balance if the risk grows or a credited safeguard weakens.",
      effect:
        "The processing may proceed, subject to any conditions identified below and to the review cadence in Section X.",
      kind: "proceed",
      explanation:
        "This is a favorable determination, but a close one: the benefit record is material, while the residual risk remains at the moderate tier rather than low. It depends on the credited safeguards continuing to operate as described, on any conditions or recommendations identified below being carried out, and on the review required in Section X taking place on schedule.",
    },
    High: {
      conclusion:
        "The residual privacy risks remaining after credited safeguards are substantial, and the benefits established do not outweigh them on the present record.",
      materiality: "The determination is material and adverse: a high-tier residual risk remains.",
      effect:
        "The processing should not proceed in its present form; completion of the identified conditions and an updated assessment could change the determination.",
      kind: "stop",
      explanation:
        "The determination rests on the residual-risk conclusion in Section VIII: the benefit record, although material, cannot carry a high-tier residual risk.",
    },
    Critical: {
      conclusion: "A critical residual privacy risk remains, and the benefits established cannot outweigh it.",
      materiality: "The determination is decisive on the present record.",
      effect: "The processing should not proceed while the critical residual risk remains.",
      kind: "stop",
      explanation:
        "A critical residual risk precludes a favorable balance regardless of the weight of the benefit record.",
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
        "The determination is close. Growth in the residual risk or risks, or weakening of a credited safeguard, should prompt reassessment.",
      effect:
        "The processing may proceed, subject to any conditions identified below; the review cadence in Section X takes on added importance.",
      kind: "proceed",
      explanation:
        "This is a favorable determination, but a close one: the benefit record carries only limited weight, and the residual risk remains at the moderate tier. It depends on the credited safeguards continuing to operate as described and on any conditions or recommendations identified below being carried out.",
    },
    High: {
      conclusion:
        "The benefits established carry limited weight and do not outweigh the high-tier residual privacy risk that remains.",
      materiality: "The determination is adverse and is not close.",
      effect: "The processing should not proceed in its present form on the present record.",
      kind: "stop",
      explanation:
        "A high-tier residual risk cannot be carried by a benefit record of limited weight.",
    },
    Critical: {
      conclusion: "A critical residual privacy risk remains, and the limited benefits established cannot outweigh it.",
      materiality: "The determination is decisive on the present record.",
      effect: "The processing should not proceed while the critical residual risk remains.",
      kind: "stop",
      explanation:
        "A critical residual risk precludes a favorable balance regardless of the weight of the benefit record.",
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

// ── Reserved ids (never composed) ─────────────────────────────────────────────
//
// RK3-D (doc 33, PN-RK8 ruled option 1) converted the Class C set to Class B:
// structured intake sub-questions carry each judgment as typed facts, and the
// ratified templates below compose the factors. The export keeps its name —
// tests and telemetry pin that nothing on this list ever composes — but after
// RK3-D it holds only ids with NO Spine 4.3 placeholder:
//
// - prior_assessment_analysis: Spine 4.3 block I.C:8 renders the prior-
//   assessment facts and ratified note directly (RISK_FIXED.prior_assessment_*
//   over i9_existing_dpia_summary); the spine reserves no factor slot, so the
//   id is SUBSUMED by the fixed block rather than composed (doc 33 D-L7).
//
// (doc 31's "residual_risk_analysis_narrative" was an alias of the spine's
// residual_risk_analysis placeholder, which RK3-D composes; the alias was
// normalized away — doc 33 D-L7.)

export const RISK_FACTOR_CLASS_C_IDS: readonly string[] = [
  "prior_assessment_analysis",
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
  /**
   * v4.7.2 — typed operands for the cover status panel. A PROJECTION of
   * determinations already made above (trigger engagement, the materiality
   * tiers, the balancing outcome) — never a new determination.
   */
  readonly exec_panel: {
    readonly assessment_required: boolean;
    readonly inherent: RiskMateriality | null;
    readonly residual: RiskMateriality | null;
    /** The processing-consequence type, e.g. "proceed with conditions". */
    readonly disposition: string;
  };
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
  /** RK3-D (doc 32 L3 close-out) — typed magnitude-basis band; refines the
   * analysis prose, never the balancing tier inputs, in release 1. */
  readonly basis: string;
}

function extractBenefits(intake: Bag): BenefitRecord[] {
  const defs: Array<[string, unknown, unknown, unknown, unknown]> = [
    [
      "Consumer",
      intake.benefit_consumer_identified,
      intake.a4_benefit_consumer,
      intake.a4_benefit_consumer_fact,
      intake.benefit_consumer_magnitude_basis,
    ],
    [
      "Business",
      intake.benefit_business_identified,
      intake.a4_benefit_business,
      intake.a4_benefit_business_fact,
      intake.benefit_business_magnitude_basis,
    ],
    [
      "Other-stakeholder",
      intake.benefit_other_stakeholders_identified,
      intake.a4_benefit_other_stakeholders,
      intake.a4_benefit_other_stakeholders_fact,
      intake.benefit_other_stakeholders_magnitude_basis,
    ],
    [
      "Public",
      intake.benefit_public_identified,
      intake.a4_benefit_public,
      intake.a4_benefit_public_fact,
      intake.benefit_public_magnitude_basis,
    ],
  ];
  return defs.map(([label, identified, narrative, fact, basis]) => ({
    label,
    narrative: clause(narrative),
    fact: clause(fact),
    weight: resolveBenefitWeight(identified, narrative, fact),
    basis: s(basis),
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

// ── CEO report review 2026-08-23/24 — Appendix B/C as real tables ───────────
// Both appendices were "rule"-kind joined strings that fell through to the
// plain-paragraph renderer instead of a bordered, columned table (doc 43
// item 3 deliberately excluded them at the time because Risk still called
// a model; the underlying operands were already exactly this structured —
// see extractNecessity/extractPathways above — they were only ever FORMATTED
// as prose). Now that Risk is fully deterministic, converting the format is
// a pure presentation change: the same facts, same wording per cell, no new
// legal content. Called from risk-skeleton-assemble.ts's `tables` bag.

/** Appendix B — the element-level necessity matrix, one row per recorded
 * intake element. Same facts and wording the former `appendix_b:0` "rule"
 * string composed (immediately below, kept for reference/removal), now
 * shaped as table rows instead of joined lines. */
export function buildNecessityMatrixTable(intake: Bag): RenderedTable {
  const rowsData = rows(intake.a2_necessity_set).filter((r) => s(r.element));
  return {
    key: "",
    surface: "necessity_matrix",
    title: "",
    columns: ["Element", "Necessity Determination", "Basis"],
    rows: rowsData.map((r) => [
      s(r.element),
      s(r.necessity),
      clause(r.justification) || "Recorded in the intake record without further explanation.",
    ]),
  };
}

/** Appendix C — the risk pathway × safeguard register, ranked by
 * materiality (highest first), mirroring the ordering the prior "rule"
 * string used via rankPathways(). */
export function buildRiskAndSafeguardRegisterTable(intake: Bag): RenderedTable {
  const pathways = rankPathways(extractPathways(intake));
  return {
    key: "",
    surface: "risk_and_safeguard_register",
    title: "",
    columns: [
      "Risk",
      "Information, Actor, Source, and Cause",
      "Likelihood, Severity, and Materiality (Before Safeguards)",
      "Safeguards",
      "Residual Tier",
      "Effect on the Processing Decision",
    ],
    rows: pathways.map((p) => {
      const safeguardCells = p.safeguards.length
        ? p.safeguards.map((g) =>
          `${firstSentence(s(g.safeguard))} [${s(g.safeguard_status)}]${
            s(g.residual) ? ` — Company residual description: ${clause(g.residual)}` : ""
          }`
        ).join(" | ")
        : "None established.";
      const effect = MATERIALITY_RANK[p.residual] >= 2
        ? "Weighs substantially against the processing in Section IX."
        : MATERIALITY_RANK[p.residual] === 1
        ? "Material to the Section IX balance."
        : "Does not by itself move the Section IX balance.";
      return [
        p.harm,
        `Information: ${p.data}. Actor or event: ${p.actor}. Source: ${p.source}. Cause: ${p.cause}.`,
        `Likelihood: ${p.likelihood}. Severity: ${p.severity}. Materiality: ${p.materiality}.`,
        safeguardCells,
        p.residual,
        effect,
      ];
    }),
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
    // v4.7.2 — a leading "\n" asks for a line break before this factor when
    // it shares a spine block with earlier content (the renderer preserves
    // single newlines per doc 66 Rule 5). Captured before the trim eats it.
    const breakBefore = text.startsWith("\n");
    const t = text.replace(/\s{2,}/g, " ").trim();
    if (!t) return "";
    factors[factorId] = t;
    provenance.push({ factor_id: factorId, factor_class: cls, sources, authorities });
    blocks[key] = blocks[key] ? `${blocks[key]}${breakBefore ? "\n" : " "}${t}` : t;
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
      `Establish and implement a safeguard addressing the material risk: ${p.harm}`,
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

  // ── RK3-D typed operands (doc 33 D-L3; Class C→B conversion per PN-RK8) ──────
  // Each operand is a typed fact the Company attested; the legal significance
  // lives in the ratified templates below, never in the answer itself.

  const specificityAll = arr(intake.purpose_specificity_facts);
  const specificityFacets = specificityAll.filter((x) => x !== "None of the above");
  const specificityAnswered = specificityAll.length > 0;

  const outOfScope = s(intake.out_of_scope_confirmation);
  const comparable = s(intake.comparable_processing_status);
  const relationshipContext = s(intake.consumer_relationship_context);
  const sourceCats = arr(intake.source_categories);
  const vendorDependency = s(intake.vendor_dependency);

  const expectAll = arr(intake.expectation_check);
  const EXPECTATION_DIVERGENCE: Record<string, string> = {
    "The processing continues after the interaction ends":
      "the processing continues after the interaction the consumer participates in has ended",
    "Information is used for a purpose different from the purpose for which it was collected":
      "information is used for a purpose different from the purpose for which it was collected",
    "Information is combined with information from other sources":
      "information is combined with information from other sources",
    "Information is disclosed to parties the consumer does not directly interact with":
      "information is disclosed to parties the consumer does not directly interact with",
  };
  const divergenceMarkers = expectAll.filter((x) => EXPECTATION_DIVERGENCE[x]);
  const noticeFull = s(intake.q12_notice_at_collection) === "Yes, covers all collection points" &&
    s(intake.q13_notice_content) === "Yes, all three";

  const choiceAll = arr(intake.choice_architecture_check);
  const CHOICE_CONFIRMATIONS: Record<string, string> = {
    "Consent or permission requests are presented symmetrically — declining is as easy as accepting":
      "symmetric presentation of the permission choice",
    "Declining the processing does not degrade the core service the consumer seeks":
      "that declining does not degrade the core service",
    "The Company does not use design elements that steer consumers toward permitting the processing":
      "the absence of steering design elements",
  };
  const choiceConfirmed = choiceAll.filter((x) => CHOICE_CONFIRMATIONS[x]);
  const choiceMissing = Object.keys(CHOICE_CONFIRMATIONS).filter((x) => !choiceAll.includes(x));
  const choiceNoneConfirmed = choiceAll.includes("None of the above can be confirmed");
  const choiceAnswered = choiceAll.length > 0;

  const interdependency = s(intake.risk_interdependency_check);
  const compounding = arr(intake.compounding_pathways);

  const admtRoleType = s(intake.admt_role_type);
  const admtLogicDocumented = s(intake.admt_logic_documented);
  const humanReviewFacts = arr(intake.human_review_facts);
  const admtTestingFacts = arr(intake.admt_testing_facts);
  const noHumanReview = humanReviewFacts.includes("There is no human review");
  const humanReviewConfirmed = humanReviewFacts.filter((x) =>
    x !== "None of the above can be confirmed" && x !== "There is no human review"
  );

  const weakRecipients = rows(intake.recipients).filter((r) =>
    s(r.recipient_name_or_category) &&
    (s(r.contractual_protections) === "No written contract" || s(r.contractual_protections) === "Unsure")
  );

  // RK3-D routing into the shared conditions / follow-ups / recommendations
  // arrays (consumed by Sections III, IX, and the executive summary).
  if (specificityAnswered && specificityFacets.length === 0) {
    conditions.push(
      "Restate the processing purpose so it identifies the product or operation supported, the information involved, the consumers affected, and the intended outcome",
    );
  }
  if (specificityAnswered && specificityFacets.length > 0 && specificityFacets.length <= 2) {
    followUps.push(
      "Sharpen the stated processing purpose: the structured record confirms it identifies only " +
        asProse(specificityFacets.map((x) => x.toLowerCase())),
    );
  }
  if (outOfScope === "Unsure") {
    followUps.push(
      "Determine whether the affected information is processed for activities not covered by this assessment",
    );
  }
  if (comparable === "Unsure") {
    followUps.push(
      "Determine whether this assessment covers a single activity or a set of similar activities presenting similar risks",
    );
  }
  if (vendorDependency === "Unsure") {
    followUps.push(
      "Determine whether any recipient or vendor is essential to the continuation of the processing",
    );
  }
  if (interdependency === "Unsure") {
    followUps.push(
      "Determine whether the identified risks could compound each other",
    );
  }
  if (isAdmt && (admtLogicDocumented === "The logic is not fully documented or understood" || admtLogicDocumented === "Unsure")) {
    conditions.push(
      "Document the logic of the automated decisionmaking technology, including its assumptions and limitations, so the assessment can evaluate it",
    );
  }
  if (
    isAdmt && admtTestingFacts.length &&
    !(admtTestingFacts.includes("Tested for accuracy or validity") &&
      admtTestingFacts.includes("Tested for discriminatory impact or bias"))
  ) {
    recommendations.push(
      "Test the automated system for accuracy and for discriminatory impact, and record the results in the assessment record",
    );
  }
  if (weakRecipients.length) {
    recommendations.push(
      `Put a written contract with the required restrictions in place for ${
        plural(weakRecipients.length, "the recipient that lacks one", "each recipient that lacks one")
      }, and record its terms in the assessment record`,
    );
  }
  const plannedNoTimeline = planned.filter((g) => s(g.planned_timeline) === "No committed timeline");
  if (plannedNoTimeline.length) {
    conditions.push(
      `Commit an implementation timeline for the planned ${
        plural(plannedNoTimeline.length, "safeguard", "safeguards")
      } recorded without one`,
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
      `${RISK_FACTOR_FIXED.minimization_recommendation_lead} Review the element-level record in Appendix D on the Section X cadence, and remove or justify any element whose necessity remains unestablished.`,
      ["FACTOR:necessity_conclusion"],
      ["11 CCR § 7152(a)(2)"],
    );
  }

  // Appendix B — necessity matrix. CEO review 2026-08-23/24: Appendix B is
  // now a real table (buildNecessityMatrixTable, above), wired through the
  // `tables` bag in risk-skeleton-assemble.ts instead of a `put()`-composed
  // "rule" string — the spine block flipped from "generated" to "table",
  // so this put() call is dead (never read by the renderer) and removed.

  // ── Section VII — risks ──────────────────────────────────────────────────────

  if (material.length) {
    const blocksText = material.map((p) => {
      const effect = p.materiality === "Critical"
        ? "this risk alone could preclude a favorable balance unless materially reduced by safeguards."
        : p.materiality === "High"
        ? "this risk weighs substantially against the processing unless materially reduced by safeguards."
        : p.materiality === "Moderate"
        ? "this risk is material to the balance and requires safeguard credit to be acceptable."
        : "this risk does not by itself move the balance.";
      return `Risk — ${p.harm}. The Company describes the risk as follows. Information involved: ${p.data}. Actor or event: ${p.actor}. Source: ${p.source}. Cause: ${p.cause}. Likelihood (Company assessment): ${p.likelihood}. Severity (Company assessment): ${p.severity}. Materiality before safeguards: ${p.materiality}. Decision effect before safeguards: ${effect}`;
    });
    put(
      "vii_risks:1",
      "material_risk_blocks",
      "B",
      // CEO report review 2026-08-24 — each pathway starts its own line
      // (not a bullet: the request was specifically "new line", and each
      // item here is a long multi-field block, not a short list clause).
      `${RISK_FACTOR_FIXED.vii_b_head}\n${blocksText.join("\n")}`,
      ["INTAKE:a5_harm_pathways", "FACTOR:materiality_matrix"],
      ["11 CCR § 7152(a)(5)"],
    );
  }

  if (pathways.length) {
    const addressed = [...new Set(pathways.map((p) => p.harm))];
    const remaining = HARM_PATHWAY_OPTS.filter((o) => !addressed.includes(o));
    // 2026-08-21 fix (quality-batch 2fc40a52) — this block used to branch on
    // intake.harm_category_review_status ("reviewRows") and, when present,
    // print a sentence built from it. That field is the RK3-A3 g1 internal QA
    // tracker (CPPARiskAssessment.tsx: "Internal only -- tracks which harm
    // categories have been reviewed. Never printed.") and its rows are shaped
    // {harm_category, review_status}, not the {category|harm, status} this
    // code read -- so the branch always rendered an empty enumeration
    // ("-- ; -- ; ...") whenever a customer happened to populate it, on top of
    // leaking an internal-only field into the customer-facing report at all.
    // The fix is to stop reading that field here entirely, not to correct the
    // key names: this sentence must always compose from the customer-facing
    // harm-pathway record, which is what the retained branch already does.
    const text = `The Company’s risk record addresses the following ${
      plural(addressed.length, "category", "categories")
    }: ${addressed.join("; ")}.${
      remaining.length
        ? ` For the remaining ${
          plural(remaining.length, "category", "categories")
        } — ${remaining.join("; ")} — no credible path is identified in the assessment record, and ${
          plural(remaining.length, "it is", "they are")
        } not treated as material ${plural(remaining.length, "risk", "risks")}.`
        : ""
    }`;
    put(
      "vii_risks:3",
      "other_risk_categories_summary",
      "B",
      text,
      ["INTAKE:a5_harm_pathways"],
      ["11 CCR § 7152(a)(5)"],
    );
  }

  // RK3-D — risk_interdependency_analysis (doc 33 D-L5 interdependency table;
  // the engine owns the VII.D conditional block, opening with the spine's
  // fixed first words; conservative note only — no tier arithmetic).
  if (interdependency && pathways.length) {
    const interactingLead =
      "D. Interacting Risks. Some risks become more significant in combination. For example, an error may become consequential only when used in a decision; sensitive information may become substantially more harmful when linked to location; or an otherwise correct inference may create greater risk where the consumer cannot understand or challenge it. For this activity:";
    if (interdependency === "Two or more identified pathways could compound each other") {
      const named = compounding.filter((c) => pathways.some((p) => p.harm === c));
      put(
        "vii_risks:4",
        "risk_interdependency_analysis",
        "B",
        `${interactingLead} the Company records that ${
          named.length >= 2
            ? `the following risks could compound each other: ${asProse(named)}`
            : "two or more of the identified risks could compound each other"
        }. The materiality tiers above are assigned per risk and are not increased by the interaction; the interaction is instead treated as a consideration against the processing in Section IX, because a compounding risk can make an adverse outcome more likely or more severe than either risk alone.`,
        ["INTAKE:risk_interdependency_check", "INTAKE:compounding_pathways"],
        [],
      );
    } else if (interdependency === "The identified risk pathways operate independently") {
      put(
        "vii_risks:4",
        "risk_interdependency_analysis",
        "B",
        `${interactingLead} the Company records that the identified risk pathways operate independently, and no compounding interaction enters the analysis on the structured record.`,
        ["INTAKE:risk_interdependency_check"],
        [],
      );
    }
    // "Unsure" composes nothing here; the follow-up in Section IX carries it.
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
    // CEO report review 2026-08-24 — no leading "— " marker here: the
    // request for this subsection was specifically "new line" (not
    // bulleted), so each safeguard starts its own line via the "\n" join
    // below without tripping the renderer's "— item" bullet detector.
    const lines = materialSafeguards.map((g) =>
      `${firstSentence(s(g.safeguard))} (addresses: ${s(g.harm)}; status: ${s(g.safeguard_status)}).`
    );
    put(
      "viii_safeguards:1",
      "material_existing_safeguards",
      "A",
      `${RISK_FACTOR_FIXED.viii_b_head} ${RISK_FACTOR_FIXED.material_safeguards_lead}\n${lines.join("\n")}`,
      ["INTAKE:a6_safeguards", "FACTOR:material_risk_blocks"],
      ["11 CCR § 7152(a)(6)"],
    );
    // RK3-D — safeguard_effectiveness_analysis (doc 33 D-L5: effectiveness
    // basis × implementation status, per material safeguard row; joins the
    // residual rule rather than replacing it).
    {
      const typedRows = materialSafeguards.filter((g) => s(g.effectiveness_basis));
      if (typedRows.length) {
        const rowsText = typedRows.map((g) => {
          const basis = s(g.effectiveness_basis);
          const status = s(g.safeguard_status);
          const cellText = basis === "Validated by testing against the linked risk"
            ? status === "Implemented and tested"
              ? "validated by testing against the risk it addresses and is credited at full weight in the residual-risk analysis."
              : "described as validated by testing, but the implementation status recorded above does not yet support that description; the credited weight follows the recorded status, not the description."
            : basis === "Consistent with an industry standard or framework"
            ? "consistent with an industry standard or framework; conformance to a standard is credited as evidence of sound design, not as evidence the control operates against this activity’s specific risks."
            : basis === "Based on internal design review only"
            ? "supported by internal design review only; design review establishes intent, and the absence of testing against the linked risk limits the reliance the assessment places on it."
            : "recorded without effectiveness evidence; the control is credited as existing at the status recorded above, and no effectiveness weight is added.";
          return `— ${firstSentence(s(g.safeguard)).replace(/\.$/, "")}: on the Company’s structured record, this control is ${cellText}`;
        });
        put(
          "viii_safeguards:1",
          "safeguard_effectiveness_analysis",
          "B",
          `Effectiveness analysis. ${rowsText.join(" ")}`,
          ["INTAKE:a6_safeguards", "FACTOR:safeguard_effectiveness_table"],
          ["11 CCR § 7152(a)(6)"],
        );
      }
    }
  } else if (materialHarms.size > 0) {
    // APPENDIX-G DETERMINED-OUTCOME RULE (CEO-ratified 2026-08-22): when a
    // material risk exists, the safeguard factor applies, and having nothing
    // implemented against it is the determined outcome most worth stating —
    // previously the worse the safeguard posture, the quieter this section.
    // Gated on materialHarms so a record with no material pathway (nothing
    // for a safeguard to be material TO) keeps suppressing as genuine N/A.
    // The residual claim is mechanically true: the residual rule credits
    // only implemented safeguards, so with none credited the material risks
    // carry through unmitigated.
    put(
      "viii_safeguards:1",
      "material_existing_safeguards",
      "A",
      `${RISK_FACTOR_FIXED.viii_b_head} ${
        safeguardRows.length
          ? "The Company has recorded safeguards for this processing, but none of them is both implemented and directed at a risk this assessment identifies as material."
          : "The Company has not identified any safeguards for this processing."
      } Conclusion. The material risks identified in Section VII currently stand without an implemented safeguard, and the residual analysis in this section proceeds on that basis.`,
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
    // RK3-D — planned_safeguard_analysis (doc 33 D-L3: committed-timeline
    // enum per planned row; no timeline strengthens the condition).
    {
      const withTimeline = planned.filter((g) =>
        s(g.planned_timeline) && s(g.planned_timeline) !== "No committed timeline"
      );
      const withoutTimeline = planned.filter((g) => s(g.planned_timeline) === "No committed timeline");
      if (withTimeline.length || withoutTimeline.length) {
        const bits: string[] = [];
        if (withTimeline.length) {
          bits.push(
            `${withTimeline.length} planned ${
              plural(withTimeline.length, "safeguard carries", "safeguards carry")
            } a committed implementation timeline (${
              asProse([...new Set(withTimeline.map((g) => s(g.planned_timeline).toLowerCase()))])
            })`,
          );
        }
        if (withoutTimeline.length) {
          bits.push(
            `${withoutTimeline.length} ${
              plural(withoutTimeline.length, "carries", "carry")
            } no committed timeline, and committing one appears among the Conditions to Proceed in Section IX`,
          );
        }
        put(
          "viii_safeguards:4",
          "planned_safeguard_analysis",
          "B",
          `Analysis. On the Company’s structured record, ${bits.join("; ")}. A planned safeguard enters the balance only as a condition, never as present mitigation.`,
          ["INTAKE:a6_safeguards"],
          ["11 CCR § 7152(a)(6)"],
        );
      }
    }
  }
  if (gaps.length) {
    put(
      "viii_safeguards:5",
      "safeguard_gaps",
      "B",
      `${RISK_FACTOR_FIXED.gaps_lead} ${
        gaps.map((p) => `— ${p.harm} (materiality before safeguards: ${p.materiality}).`).join(" ")
      } Consequence. Until a safeguard is established for ${
        plural(gaps.length, "this risk", "these risks")
      }, the full inherent materiality is carried into the residual-risk conclusion and weighs against the processing in Section IX.`,
      ["FACTOR:material_risk_blocks", "INTAKE:a6_safeguards"],
      ["11 CCR § 7152(a)(6)"],
    );
    // RK3-D — safeguard_gap_analysis (doc 33 D-L4: templated over the same
    // typed gap rows; composed after the gap list and its consequence).
    put(
      "viii_safeguards:5",
      "safeguard_gap_analysis",
      "B",
      `Analysis. A gap is recorded where a material risk has no safeguard at implemented status. ${
        gaps.map((p) =>
          `For ${p.harm}, the risk’s own record identifies the information involved and the cause, and no implemented control addresses it.`
        ).join(" ")
      } The gap determination is mechanical over the Company’s own safeguard record; it does not assert that no control exists, only that none is established in the record at implemented status.`,
      ["FACTOR:safeguard_gaps", "INTAKE:a6_safeguards"],
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
      : "— None above the low tier. Each risk is reduced to, or already sits at, the low tier once safeguards supported by testing evidence are credited.";
    const conclusionText = maxResidual === "Critical"
      ? "Conclusion. After credited safeguards, the residual privacy risk of the activity is critical. The processing cannot be favorably balanced while this residual risk remains."
      : maxResidual === "High"
      ? "Conclusion. After credited safeguards, the residual privacy risk of the activity is high. The balancing analysis in Section IX treats this residual risk as weighing substantially against the processing."
      : maxResidual === "Moderate"
      ? "Conclusion. After credited safeguards, the residual privacy risk of the activity is moderate. The risks identified above remain material to the balancing decision."
      : "Conclusion. After credited safeguards, the residual privacy risk of the activity is low. No individual risk remains above the low tier.";
    put(
      "viii_safeguards:7",
      "material_residual_risks",
      "A",
      `${RISK_FACTOR_FIXED.residual_lead} ${listText}`,
      ["INTAKE:a5_harm_pathways", "INTAKE:a6_safeguards", "FACTOR:residual_rule"],
      ["11 CCR § 7152(a)(6)"],
    );
    // RK3-D — residual_risk_analysis (doc 33 D-L4: a per-pathway walk of the
    // residual matrix, so the reader can trace each tier movement).
    {
      const walk = rankPathways(pathways).map((p) => {
        const moved = p.residual !== p.materiality;
        return `— ${p.harm}: inherent ${p.materiality}; ${
          moved
            ? `reduced one tier to ${p.residual} on the strength of a safeguard supported by testing evidence.`
            : p.bestStatus === "Implemented, not tested"
            ? `unchanged at ${p.residual} — the credited safeguard exists but lacks testing evidence, and the tier does not move without that evidence.`
            : p.bestStatus === "Planned, not yet implemented"
            ? `unchanged at ${p.residual} — the only recorded safeguard is planned, and a planned safeguard is a condition, not present mitigation.`
            : p.bestStatus
            ? `unchanged at ${p.residual} on the recorded safeguard status.`
            : `unchanged at ${p.residual} — no safeguard is established for the risk.`
        }`;
      });
      put(
        "viii_safeguards:7",
        "residual_risk_analysis",
        "B",
        `Analysis. Each risk’s residual tier follows from the Company’s own safeguard record: ${
          walk.join(" ")
        }`,
        ["INTAKE:a5_harm_pathways", "INTAKE:a6_safeguards", "FACTOR:residual_rule"],
        ["11 CCR § 7152(a)(6)"],
      );
    }
    put(
      "viii_safeguards:7",
      "overall_residual_risk_conclusion",
      "B",
      `${conclusionText} Reasoning. A safeguard reduces a risk’s materiality by one tier only where implementation and testing evidence supports it; implemented-but-untested and planned safeguards are recorded but do not change the tier. The Company’s own residual descriptions are preserved in Appendix E.`,
      ["FACTOR:material_residual_risks"],
      ["11 CCR § 7152(a)(6)"],
    );
  }

  // Appendix C — risk register. CEO review 2026-08-23/24: Appendix C is
  // now a real table (buildRiskAndSafeguardRegisterTable, above), wired
  // through the `tables` bag in risk-skeleton-assemble.ts instead of a
  // `put()`-composed "rule" string — the spine block flipped from
  // "generated" to "table", so this put() call is dead and removed.

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
    // RK3-D (doc 32 L3 close-out) — the typed magnitude-basis band refines
    // the analysis prose; the weight itself is unchanged.
    const basisSentence = b.basis === "Quantified or measurable basis stated"
      ? " The stated basis for the benefit’s magnitude is quantified or measurable."
      : b.basis === "Qualitative basis stated"
      ? " The stated basis for the benefit’s magnitude is qualitative."
      : b.basis === "No basis stated"
      ? " No basis for the benefit’s magnitude is stated, and the claim is read at the floor of its weight band."
      : "";
    const analysis = (b.weight === "material weight"
      ? "The Company identifies a concrete outcome and attributes it to this processing, and supporting information is supplied; the claim is considered in the balance at the weight stated below."
      : "The Company identifies a concrete outcome and attributes it to this processing, but supporting information is not supplied; the absence of support limits the weight the claim can carry.") +
      basisSentence;
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
      // v4.7.2 — leading "\n": this factor shares spine block vi:16 with the
      // public-benefit analysis, and without a break the "F." sub-head ran
      // into the preceding paragraph (CEO output review, 2026-08-25).
      `\n${parts.join(" ")}`,
      ["FACTOR:benefit_weight_table", "INTAKE:a4_benefit_consumer", "INTAKE:a4_benefit_business"],
      ["11 CCR § 7152(a)(4)"],
    );
  }

  // ── Section IX — balancing ───────────────────────────────────────────────────

  const cell = RISK_BALANCING_TABLE[benefitTier][maxResidual];
  // v4.7.2 (2026-08-25 polish round) — the material×Low cell's ratified
  // explanation asserts "a necessity analysis that supports the information
  // processed"; when Section III's necessity analysis is QUALIFIED that
  // assertion contradicts the record (found in CEO output review). The cell
  // itself stays ratified for the clean case; the qualified case swaps in a
  // formulation that carries the Section III condition instead.
  const necessityQualified = necessity.unnecessary.length > 0 || necessity.unsure.length > 0;
  const cellExplanation =
    necessityQualified && cell.explanation.includes("a necessity analysis that supports the information processed")
      ? "Material benefits and a low residual-risk profile support the favorable disposition; the necessity issue identified in Section III remains a condition to proceeding."
      : cell.explanation;
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
      pro.push("— Safeguards supported by testing evidence reduce the principal risks (Section VIII).");
    }
    // RK3-D — typed expectation and choice-architecture support (doc 33 D-L5).
    if (expectAll.length && divergenceMarkers.length === 0) {
      pro.push(
        "— The processing is consistent with the context of the consumer interaction on the Company’s structured record (Section IV).",
      );
    }
    if (choiceAnswered && choiceMissing.length === 0 && !choiceNoneConfirmed) {
      pro.push(
        "— The choice architecture is confirmed symmetric and non-degrading on the Company’s structured record (Section IV).",
      );
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
      // RK3-D — pro_processing_analysis (doc 33 D-L4: ratified template over
      // the same typed factors; no new weight is created here).
      put(
        "ix_balancing:1",
        "pro_processing_analysis",
        "B",
        "Analysis. Each factor above restates a conclusion reached earlier in the report on the Company’s own structured record: benefit weights follow the ratified weight table, and the necessity, safeguard, and consumer-context entries carry the Section III, IV, and VIII findings. No consideration is credited in favor of the processing that the record does not establish.",
        ["FACTOR:pro_processing_factors"],
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
      con.push(`— ${plural(gaps.length, "A material risk lacks", "Material risks lack")} an implemented safeguard (Section VIII).`);
    }
    if (planned.length) {
      con.push("— The safeguard posture depends in part on safeguards that are planned but not yet operational (Section VIII).");
    }
    // RK3-D — typed expectation, choice-architecture, and interdependency
    // considerations (doc 33 D-L5 routing).
    if (divergenceMarkers.length && !noticeFull) {
      con.push(
        "— Aspects of the processing fall outside the expectations created by the consumer interaction and are not fully covered by notice (Section IV).",
      );
    }
    if (choiceNoneConfirmed) {
      con.push(
        "— None of the choice-architecture facts the assessment checks can be confirmed on the structured record (Section IV).",
      );
    }
    if (interdependency === "Two or more identified pathways could compound each other") {
      con.push(
        "— Two or more identified risks could compound each other, which can make an adverse outcome more likely or more severe than either risk alone (Section VII).",
      );
    }
    if (con.length === 0 && pathways.length) {
      con.push("— No residual risk remains above the low tier; the considerations against the activity are correspondingly limited.");
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
      // RK3-D — con_processing_analysis (doc 33 D-L4).
      put(
        "ix_balancing:2",
        "con_processing_analysis",
        "B",
        "Analysis. Each factor above carries a residual tier assigned in Section VIII or a qualification reached in Sections III, IV, or VII on the Company’s own structured record. No adverse consideration is assumed beyond those the record identifies, and none the record identifies is omitted.",
        ["FACTOR:con_processing_factors"],
        ["11 CCR § 7154"],
      );
    }
  }
  if (pathways.length || benefits.some((b) => b.weight !== "no affirmative weight")) {
    put(
      "ix_balancing:3",
      "balancing_conclusion",
      "B",
      `${RISK_FACTOR_FIXED.ix_d_head} ${RISK_FACTOR_FIXED.balancing_lead} ${cell.conclusion} ${RISK_FACTOR_FIXED.materiality_lead} ${cell.materiality} ${RISK_FACTOR_FIXED.decision_effect_lead} ${cell.effect} Reasoning. ${cellExplanation}`,
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
    const multiSentence = purpose && firstSentence(purpose) !== purpose;
    // RK3-D — purpose_specificity_analysis (doc 33 D-L5 purpose-specificity
    // table): the facet count over the Company's own typed answer sets the
    // band; spine order places the analysis before the normalization.
    if (purpose && specificityAnswered) {
      const missing = [
        "The specific product, service, or operation the processing supports",
        "The categories of personal information involved",
        "The categories of consumers affected",
        "The intended outcome or result of the processing",
      ].filter((x) => !specificityFacets.includes(x));
      const facetSentence = specificityFacets.length
        ? `The Company confirms that the stated purpose identifies ${
          asProse(specificityFacets.map((x) => x.toLowerCase()))
        }.`
        : "The Company confirms that the stated purpose identifies none of the facets the assessment checks: the operation supported, the information involved, the consumers affected, or the intended outcome.";
      const missingSentence = specificityFacets.length && missing.length
        ? ` It does not confirm that the purpose identifies ${asProse(missing.map((x) => x.toLowerCase()))}.`
        : "";
      const band = specificityFacets.length >= 3
        ? "On that record, the purpose is stated with the specificity the analyses that follow require."
        : specificityFacets.length >= 1
        ? "On that record, the purpose is partially specified; the follow-up in Section IX asks the Company to sharpen it."
        : "On that record, the purpose is not stated with the precision the assessment requires, and restating it appears among the Conditions to Proceed in Section IX.";
      put(
        "i_purpose_scope:1",
        "purpose_specificity_analysis",
        "B",
        `${facetSentence}${missingSentence} ${band}`,
        ["INTAKE:purpose_specificity_facts", "FACTOR:purpose_specificity_table"],
        ["11 CCR § 7152(a)(1)"],
      );
    }
    if (multiSentence) {
      put(
        "i_purpose_scope:1",
        "normalized_processing_purpose",
        "A",
        `${RISK_FACTOR_FIXED.normalized_purpose_lead} ${firstSentence(purpose)} ${RISK_FACTOR_FIXED.purpose_clarify_note}`,
        ["INTAKE:primary_activity_purpose"],
        [],
      );
    }
    if (purpose && (specificityAnswered || necessity.total)) {
      // The RK3-C proxy (purpose-present + element record) retires whenever
      // the typed specificity answer exists (doc 32 L13 close-out).
      const conclusion = specificityAnswered
        ? (specificityFacets.length >= 3
          ? "Conclusion. The stated purpose is defined with specificity on the Company’s own structured record, and the assessment proceeds on the Company’s formulation."
          : specificityFacets.length >= 1
          ? "Conclusion. The stated purpose is partially specified on the Company’s own structured record. The assessment proceeds on the Company’s formulation, and the qualification is carried into Section IX."
          : "Conclusion. The stated purpose is not specified with the precision the assessment requires. The necessity, benefit, and balancing analyses that follow are correspondingly qualified, and the consequence appears among the Conditions to Proceed in Section IX.")
        : "Conclusion. The stated purpose is defined with enough precision to support the necessity, benefit, and balancing analyses that follow, and the assessment proceeds on the Company’s formulation.";
      put(
        "i_purpose_scope:1",
        "purpose_conclusion",
        "B",
        conclusion,
        specificityAnswered
          ? ["INTAKE:purpose_specificity_facts", "FACTOR:purpose_specificity_analysis"]
          : ["INTAKE:primary_activity_purpose", "INTAKE:a2_necessity_set"],
        ["11 CCR § 7152(a)(1)"],
      );
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
    // RK3-D — out_of_scope_processing_description (doc 33 D-L3/D-L5).
    if (outOfScope) {
      const oosActivities = clause(intake.out_of_scope_activities);
      const text = outOfScope ===
          "The affected information is processed only for the stated purpose and any listed secondary uses"
        ? "Out of scope. The Company confirms that the affected information is processed only for the stated purpose and any listed secondary uses; no further processing of the affected categories falls outside this assessment."
        : outOfScope ===
            "The affected information is also processed for other activities not covered by this assessment"
        ? `Out of scope. The Company records that the affected information is also processed for other activities not covered by this assessment${
          oosActivities ? `, described as: ${oosActivities}` : ""
        }. Each such activity requires its own analysis where a risk-assessment trigger applies, and no conclusion in this report extends to it.`
        : "Out of scope. The Company is not yet certain whether the affected information is processed for activities outside this assessment; the question is carried into the Required Assessment Follow-Up in Section IX.";
      put(
        "i_purpose_scope:3",
        "out_of_scope_processing_description",
        "B",
        text,
        ["INTAKE:out_of_scope_confirmation", "INTAKE:out_of_scope_activities"],
        [],
      );
    }
  }
  // RK3-D — secondary_use_analysis (doc 33 D-L5 secondary-use table, per row).
  // The assembler owns the i_purpose_scope:4 conditional (lead + rows) and
  // appends this analysis to it.
  {
    const secondaryRows = rows(intake.secondary_activities);
    const typed = secondaryRows.filter((r) => s(r.relation_to_primary) || s(r.disclosed_in_notice));
    if (typed.length) {
      const lines = typed.map((r) => {
        const name = s(r.activity) || s(r.name) || s(r.description) || firstSentence(clause(r.purpose)) ||
          "the recorded secondary use";
        const relation = s(r.relation_to_primary);
        const disclosed = s(r.disclosed_in_notice);
        const cellText = relation === "Compatible — supports or extends the primary purpose"
          ? (disclosed === "Yes — disclosed at or before collection"
            ? "compatible with the primary purpose and disclosed at or before collection; it is assessed within this report’s scope."
            : "compatible with the primary purpose but not confirmed as disclosed at or before collection; completing the disclosure appears among the transparency considerations in Section IV.")
          : relation === "Distinct — a separate purpose"
          ? (disclosed === "Yes — disclosed at or before collection"
            ? "a separate purpose, disclosed at or before collection; a separate purpose can change the necessity analysis and expectations, and the scope note in this section applies."
            : "a separate purpose that is not confirmed as disclosed; the combination weighs against the processing in Section IX until the disclosure and scope questions are resolved.")
          : "not yet classified against the primary purpose; the uncertainty is carried into the Required Assessment Follow-Up in Section IX.";
        return `— ${name}: on the Company’s structured record, this use is ${cellText}`;
      });
      put(
        "i_purpose_scope:4",
        "secondary_use_analysis",
        "B",
        `Analysis. ${lines.join(" ")}`,
        ["INTAKE:secondary_activities", "FACTOR:secondary_use_table"],
        [],
      );
    }
  }
  // RK3-D — comparable_processing_analysis (doc 33 D-L3/D-L5). The engine
  // owns this conditional block; the spine's fixed first words open it.
  if (comparable === "This assessment covers a set of similar activities presenting similar risks") {
    const basis = clause(intake.comparable_processing_basis);
    put(
      "i_purpose_scope:7",
      "comparable_processing_analysis",
      "B",
      `The Company has identified related activities that may be sufficiently similar to be assessed together. Related processing may be addressed in one assessment where the activities are similar and present similar privacy risks. The Company records that this assessment covers a set of similar activities presenting similar risks${
        basis ? `, on the following stated basis: ${basis}` : ", recorded in the intake record without further explanation"
      }. Conclusion. The assessment proceeds on the comparable-set footing the Company has recorded; if a covered activity diverges in the information involved, the consumers affected, or the risks presented, it requires its own assessment.`,
      ["INTAKE:comparable_processing_status", "INTAKE:comparable_processing_basis"],
      ["11 CCR § 7156"],
    );
  } else if (comparable === "Unsure") {
    // APPENDIX-G DETERMINED-OUTCOME RULE (CEO-ratified 2026-08-22): "Unsure"
    // is an unresolved answer to a question that applies, not a non-answer.
    // (A "single activity" answer stays suppressed — that is the genuine
    // nothing-to-say case.) The Section IX carriage claim is mechanically
    // true: the comparable === "Unsure" branch above already pushes the
    // matching follow-up item.
    put(
      "i_purpose_scope:7",
      "comparable_processing_analysis",
      "B",
      "The Company has not yet determined whether this assessment covers a single activity or a set of similar activities presenting similar risks. Conclusion. The assessment proceeds as an assessment of the single activity described until the Company resolves that question; the open point appears in the Required Assessment Follow-Up in Section IX.",
      ["INTAKE:comparable_processing_status"],
      ["11 CCR § 7156"],
    );
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
  } else if (uncertainLines.length) {
    // APPENDIX-G DETERMINED-OUTCOME RULE (CEO-ratified 2026-08-22): a factor
    // that applies but is unresolved states that outcome instead of
    // disappearing. No trigger is engaged, but at least one cannot be
    // resolved from the Company's answers — the requirement question is
    // genuinely open, and this block says so.
    put(
      "i_purpose_scope:6",
      "full_trigger_analysis",
      "B",
      `${RISK_FACTOR_FIXED.uncertain_trigger_lead} ${uncertainLines.join(" ")} Conclusion. Whether this activity is subject to the risk-assessment requirement is not yet settled on the Company’s answers; the determination remains open until the questions above are resolved.`,
      ["DERIVED:applicable_7150_triggers"],
      ["11 CCR § 7150(b)"],
    );
  } else if (scopeLines.some((x) => x.startsWith("Not engaged"))) {
    // Same rule, determined-negative branch: the classifier ran and found no
    // engaged trigger. That is a determination worth stating (and helpful to
    // the reader — the assessment is voluntary), not an absence to suppress.
    // Gated on the classifier's own "Not engaged" lines so a legacy record
    // with no trigger narrative at all still composes nothing.
    put(
      "i_purpose_scope:6",
      "full_trigger_analysis",
      "B",
      "Conclusion. The Company’s answers do not engage any of the risk-assessment triggers in 11 CCR § 7150(b); a risk assessment is not required for the activity as described, and this assessment records that determination.",
      ["DERIVED:applicable_7150_triggers"],
      ["11 CCR § 7150(b)"],
    );
  }
  {
    const providers = clause(intake.a8_information_providers);
    const parts: string[] = [];
    if (providers) {
      // CEO report review 2026-08-24 — bullet-ize a "Name (Role) —
      // materials." list when the customer's free text matches that
      // shape; markInformationProviderItems() is a no-op otherwise.
      parts.push(
        `Record Considered. The assessment record consists of the intake record and the materials indexed in Appendix H — Materials Considered. Information was provided by: ${markInformationProviderItems(providers)}.`,
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
      // RK3-D — record_sufficiency_analysis (doc 33 D-L4: templated over the
      // completion gate; spine order places it before the conclusion).
      if (rc && (rc.value === true || rc.value === false)) {
        put(
          "i_purpose_scope:12",
          "record_sufficiency_analysis",
          "B",
          rc.value === true
            ? "Assessment. Sufficiency is evaluated against the completion gate over the structured intake record: every asked question is answered, the coverage check links each material fact into the analysis, and no consistency flag remains open."
            : "Assessment. Sufficiency is evaluated against the completion gate over the structured intake record; the gate reports the unmet conditions identified below, and the assessment treats each as a gap rather than resolving it by assumption.",
          ["DERIVED:record_complete"],
          [],
        );
      }
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
      // RK3-D — processing_coherence_analysis (doc 33 D-L4: presence-typed
      // over the three stages of the structured processing record).
      const methodCount = [m.collection_method, m.use_method, m.disclosure_method, m.retention_method, m.other_processing_method]
        .filter((v) => s(v) && !/^n\/?a\b/i.test(s(v))).length;
      put(
        "ii_processing_context:1",
        "processing_coherence_analysis",
        "B",
        `Analysis. Read as an operational sequence, the Company’s structured record describes one continuous flow: information enters through the stated entry point, ${methodCount} processing ${
          plural(methodCount, "stage is", "stages are")
        } described for it, and the stated output follows from those stages. No stage in the description depends on information the record does not identify.`,
        ["INTAKE:processing_entry_point", "INTAKE:processing_methods", "INTAKE:processing_result"],
        [],
      );
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
    // RK3-D — consumer_context_analysis (doc 33 D-L3: the relationship enum
    // carries the context judgment; scale and interaction facts frame it).
    if (relationshipContext) {
      const framing = relationshipContext === "General public — no direct relationship"
        ? "Because the affected consumers have no direct relationship with the Company, the notice and expectation analyses in Section IV carry correspondingly greater weight: the consumer’s understanding depends entirely on the disclosures made where the information is collected."
        : relationshipContext === "Employees or job applicants" ||
            relationshipContext === "Students" ||
            relationshipContext === "Patients or health-service recipients"
        ? "Because the relationship involves a dependency the consumer cannot easily exit, the coercion and choice-architecture analysis in Section IV carries correspondingly greater weight."
        : relationshipContext === "Mixed"
        ? "Because the affected consumers stand in more than one relationship to the Company, the expectation analysis in Section IV is evaluated against the least-informed position among them."
        : "The relationship gives the affected consumers a direct channel to the Company, and the rights and controls in Section IV are evaluated in that context.";
      put(
        "ii_processing_context:3",
        "consumer_context_analysis",
        "B",
        `Analysis. The Company identifies the affected consumers as: ${relationshipContext.toLowerCase()}. ${framing}`,
        ["INTAKE:consumer_relationship_context", "INTAKE:consumer_interaction_method"],
        [],
      );
    }
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
      // RK3-D (doc 33 D-L9): SPI membership reads the single-custody
      // taxonomy module; the RK3-C inline mirror (ledger L18) is retired.
      const spiCount = cats.filter((c) => CA_SPI_CATEGORY_KEYS.includes(c)).length;
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
    // RK3-D — source_risk_analysis (doc 33 D-L5 source-risk table over the
    // typed source categories).
    if (sourceCats.length) {
      const direct = sourceCats.includes("Directly from the consumer");
      const automatic = sourceCats.includes("Automatically from consumer devices or interactions");
      const brokers = sourceCats.includes("From third-party data providers or brokers");
      const providers = sourceCats.includes("From service providers or contractors");
      const publicSrc = sourceCats.includes("From public sources");
      const otherBiz = sourceCats.includes("From another business (merger, partnership, or similar)");
      const sourceFactors: string[] = [];
      if (automatic) {
        sourceFactors.push(
          "information collected automatically from devices or interactions is gathered without a contemporaneous act by the consumer, which raises the weight of the notice and expectation analyses in Section IV",
        );
      }
      if (brokers) {
        sourceFactors.push(
          "information obtained from third-party data providers carries accuracy and consumer-awareness considerations the Company cannot verify at first hand",
        );
      }
      if (providers || otherBiz) {
        sourceFactors.push(
          "information received through other organizations depends on the collection practices of those organizations, which the Company relies on rather than controls",
        );
      }
      if (publicSrc) {
        sourceFactors.push(
          "information drawn from public sources can be outdated or decontextualized relative to the purpose it is used for",
        );
      }
      const text = sourceFactors.length === 0 && direct
        ? "Analysis. The Company identifies a single source category: information supplied directly by the consumer. Direct collection ties the information to the interaction the consumer participates in, and no source-based accuracy or awareness consideration is identified on the structured record."
        : `Analysis. The Company identifies the following source ${
          plural(sourceCats.length, "category", "categories")
        }: ${asProse(sourceCats.map((x) => x.toLowerCase()))}. On the structured record, ${asProse(sourceFactors)}.${
          direct ? " Information supplied directly by the consumer presents no source-based consideration beyond those stated." : ""
        }`;
      put(
        "ii_processing_context:9",
        "source_risk_analysis",
        "B",
        text,
        ["INTAKE:source_categories", "INTAKE:i4b_sources"],
        [],
      );
    }
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
      // RK3-D — recipient_risk_analysis (doc 33 D-L5 recipient table:
      // recipient type × contractual protections, per row).
      const typedRows = recipientRows.filter((r) => s(r.contractual_protections));
      if (typedRows.length) {
        const lines = typedRows.map((r) => {
          const name = s(r.recipient_name_or_category) || "the recorded recipient";
          const type = s(r.recipient_type) || "unclassified";
          const contract = s(r.contractual_protections);
          const cellText = contract === "Written contract with the CCPA-required restrictions in place"
            ? type === "Third party"
              ? "a third party under a written contract with the required restrictions; the disclosure is managed on the contractual record, and the sale-or-sharing consequences recorded elsewhere in this report continue to apply."
              : "under a written contract with the required restrictions; the disclosure is managed on the contractual record."
            : contract === "Written contract without confirmed CCPA restriction terms"
            ? "under a written contract whose required restriction terms are not confirmed; the reliance the assessment can place on the contractual control is correspondingly reduced in Section VIII."
            : contract === "No written contract"
            ? "without a written contract; the disclosure operates outside a contractual control, the exposure is elevated, and the remediation appears among the recommendations in Section IX."
            : "with the contractual posture not yet confirmed; the uncertainty is treated conservatively and the confirmation appears among the recommendations in Section IX.";
          return `— ${name} (${type.toLowerCase()}): ${cellText}`;
        });
        put(
          "ii_processing_context:11",
          "recipient_risk_analysis",
          "B",
          `Analysis. ${lines.join(" ")}`,
          ["INTAKE:recipients", "FACTOR:recipient_risk_table"],
          [],
        );
      }
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
      // RK3-D — material_vendor_dependency (doc 33 D-L3; spine fixed lead
      // and note carried by the composer).
      if (vendorDependency === "One or more vendors are essential — the processing could not continue without them") {
        const essential = clause(intake.essential_vendors);
        put(
          "ii_processing_context:11",
          "material_vendor_dependency",
          "B",
          `The processing materially depends on: ${
            essential || "one or more vendors the Company records as essential, recorded in the intake record without further identification"
          }. The effectiveness of the related contractual, technical, or oversight controls is considered in Section VIII.`,
          ["INTAKE:vendor_dependency", "INTAKE:essential_vendors"],
          [],
        );
      } else if (vendorDependency === "No single recipient or vendor is essential to the processing") {
        put(
          "ii_processing_context:11",
          "material_vendor_dependency",
          "B",
          "The Company records that no single recipient or vendor is essential to the processing; no material vendor dependency enters the analysis.",
          ["INTAKE:vendor_dependency"],
          [],
        );
      }
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
    } else {
      // APPENDIX-G DETERMINED-OUTCOME RULE (CEO-ratified 2026-08-22):
      // retention applies to every assessed activity, so an empty
      // category-level record states its outcome instead of vanishing. Two
      // distinct outcomes: the Company answered only the legacy
      // activity-level field (real data the old gate silently ignored), or
      // it recorded nothing at all.
      const legacyPeriod = clause(intake.i2_retention_period);
      put(
        "ii_processing_context:13",
        "retention_conclusion",
        "B",
        legacyPeriod
          ? `The Company describes retention for the activity as ${legacyPeriod}, but has not recorded a retention period or determining criteria for each category of personal information involved. Conclusion. Retention is stated for the activity as a whole and remains to be established category by category.`
          : "The Company has not identified how long the personal information involved in this activity is retained. Conclusion. Retention is not established on the answers provided.",
        ["INTAKE:retention_by_pi_category", "INTAKE:i2_retention_period"],
        [],
      );
    }
  }

  // ── Section IV — transparency, controls, coercion ────────────────────────────

  {
    const dRows = rows(intake.activity_disclosures).filter((d) => s(d.disclosure_content));
    // RK3-D — transparency_analysis (doc 33 D-L4: templated over the
    // q11–q14 notice enums and the disclosure record; composed before the
    // conclusion per the spine's block-4 order).
    // APPENDIX-G DETERMINED-OUTCOME RULE (CEO-ratified 2026-08-22): this
    // block was previously nested under dRows.length, so the notice-gap
    // analysis was unreachable exactly when disclosures were zero — the
    // worst posture produced the least text. It now composes whenever the
    // notice questions were answered, disclosures or not.
    {
      const noticeGaps: string[] = [];
      if (s(intake.q12_notice_at_collection) === "Yes, partial coverage") {
        noticeGaps.push("the notice at collection covers only part of the collection points");
      }
      if (isNo(intake.q12_notice_at_collection)) {
        noticeGaps.push("no notice at collection is in place");
      }
      if (s(intake.q13_notice_content) === "Some elements") {
        noticeGaps.push("the notice content covers only some of the required elements");
      }
      if (isNo(intake.q13_notice_content)) noticeGaps.push("the notice content is not in place");
      if (s(intake.q11_policy_review) === "Over 24 months ago") {
        noticeGaps.push("the privacy policy was last reviewed more than 24 months ago");
      }
      if (s(intake.q11_policy_review) === "No privacy policy") noticeGaps.push("no privacy policy is published");
      const analysisText = noticeGaps.length === 0
        ? (dRows.length
          ? "Analysis. On the Company’s structured notice record, the privacy policy is current, the notice at collection covers the collection points, and the notice content covers the required elements. The disclosure record above is read against that posture."
          : "Analysis. On the Company’s structured notice record, the privacy policy is current, the notice at collection covers the collection points, and the notice content covers the required elements.")
        : `Analysis. The Company’s structured notice record shows ${
          asProse(noticeGaps)
        }. Each gap reduces what a consumer can learn about the processing before it occurs, and the reduction is carried into the expectation and balancing analyses.`;
      if (s(intake.q12_notice_at_collection) || s(intake.q13_notice_content)) {
        put(
          "iv_consumer_transparency:2",
          "transparency_analysis",
          "B",
          analysisText,
          ["INTAKE:q11_policy_review", "INTAKE:q12_notice_at_collection", "INTAKE:q13_notice_content", "INTAKE:activity_disclosures"],
          [],
        );
      }
    }
    if (dRows.length) {
      const made = dRows.filter((d) => /^made/i.test(s(d.status))).length;
      const plannedD = dRows.filter((d) => /^planned/i.test(s(d.status))).length;
      // v4.7.2 — natural-language counts (CEO output review: "2 disclosures,
      // of which 2 are made and 0 are planned" read as machine output).
      const countSentence = plannedD === 0 && made === dRows.length
        ? (dRows.length === 1
          ? "The disclosure record identifies one disclosure, which is made."
          : `The disclosure record identifies ${dRows.length} disclosures, each of which is made.`)
        : made === 0 && plannedD === dRows.length
        ? (dRows.length === 1
          ? "The disclosure record identifies one disclosure, which is planned but not yet made."
          : `The disclosure record identifies ${dRows.length} disclosures, each of which is planned but not yet made.`)
        : `The disclosure record identifies ${dRows.length} ${
          plural(dRows.length, "disclosure", "disclosures")
        }: ${made} ${plural(made, "is", "are")} made and ${plannedD} ${plural(plannedD, "is", "are")} planned.`;
      const parts = [countSentence];
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
    } else if (s(intake.q11_policy_review) || s(intake.q12_notice_at_collection) || s(intake.q13_notice_content)) {
      // Zero disclosures on a record whose notice questions were answered is
      // the determined-adverse outcome, not a non-answer — the gate on the
      // notice enums keeps legacy records (which never carried the
      // disclosure model at all) suppressed as before.
      put(
        "iv_consumer_transparency:2",
        "transparency_conclusion",
        "B",
        "The Company has not identified any disclosures describing this processing to consumers. Conclusion. The transparency posture of the activity is not established on the answers provided.",
        ["INTAKE:activity_disclosures", "INTAKE:public_privacy_policy_url"],
        ["11 CCR § 7152(a)(3)(E)"],
      );
    }
  }
  // RK3-D — consumer expectations (doc 33 D-L5 expectations table over the
  // § 7002(b)-factor typed markers; spine block IV.C:4 with its fixed lead
  // and note for unexpected processing).
  if (expectAll.length) {
    const divergencePhrases = divergenceMarkers.map((x) => EXPECTATION_DIVERGENCE[x]);
    put(
      "iv_consumer_transparency:4",
      "consumer_expectations_analysis",
      "B",
      divergenceMarkers.length === 0
        ? "Analysis. On the Company’s structured record, the processing occurs during and as part of the interaction the consumer participates in, and none of the divergence markers the assessment checks — continued processing after the interaction, repurposing, combination with other sources, or disclosure to parties the consumer does not interact with — applies."
        : `Analysis. On the Company’s structured record, the following expectation ${
          plural(divergenceMarkers.length, "marker applies", "markers apply")
        }: ${asProse(divergencePhrases)}. ${
          noticeFull
            ? "Each marker is disclosed through the notice posture recorded in this section, which frames what a consumer can reasonably anticipate."
            : "The notice posture recorded in this section does not fully cover the processing, so the markers are weighed without the mitigation full disclosure would provide."
        }`,
      ["INTAKE:expectation_check", "INTAKE:q12_notice_at_collection", "INTAKE:q13_notice_content"],
      [],
    );
    if (divergenceMarkers.length) {
      put(
        "iv_consumer_transparency:4",
        "unexpected_processing",
        "B",
        `The following aspect of the processing may fall outside the expectations created by the consumer interaction: ${
          asProse(divergenceMarkers.map((x) => EXPECTATION_DIVERGENCE[x]))
        }. Unexpected processing is not automatically prohibited. It can, however, increase the importance of notice, choice, minimization, or another safeguard.`,
        ["INTAKE:expectation_check"],
        [],
      );
    }
    put(
      "iv_consumer_transparency:4",
      "consumer_expectations_conclusion",
      "B",
      divergenceMarkers.length === 0
        ? "Conclusion. The activity is reasonably consistent with the context in which the information is collected, on the facts the Company has supplied."
        : noticeFull
        ? "Conclusion. Aspects of the activity extend beyond the immediate consumer interaction, and each is disclosed. The divergence is weighed in Section IX at reduced force because the disclosure record covers it."
        : "Conclusion. Aspects of the activity extend beyond the immediate consumer interaction and are not fully covered by the disclosure record. The divergence weighs against the processing in Section IX until the notice posture covers it.",
      ["FACTOR:consumer_expectations_analysis"],
      [],
    );
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
      // RK3-D — consumer_control_analysis (doc 33 D-L4: templated over the
      // same typed control enums the weak-marker scan reads).
      put(
        "iv_consumer_transparency:6",
        "consumer_control_analysis",
        "B",
        weakControls.length === 0
          ? `Analysis. Each control above is evaluated on the process the Company describes for it: ${controlLines.length} ${
            plural(controlLines.length, "control is", "controls are")
          } recorded, each with a stated mechanism a consumer can invoke, and identity verification is addressed so the mechanisms operate for the person entitled to use them.`
          : `Analysis. Of the ${controlLines.length} ${
            plural(controlLines.length, "control", "controls")
          } recorded, ${asProse(weakControls)} ${
            plural(weakControls.length, "operates", "operate")
          } without a formal or completed process on the Company’s structured record. A control is weighed by what a consumer can actually do with it, not by its presence in the record.`,
        ["FACTOR:relevant_consumer_controls", "INTAKE:q10_id_verification"],
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
    // RK3-D — coercion_analysis (doc 33 D-L5 choice-architecture table over
    // the typed confirmations; composed before the conclusion).
    if (choiceAnswered) {
      const confirmedPhrases = choiceConfirmed.map((x) => CHOICE_CONFIRMATIONS[x]);
      const missingPhrases = choiceMissing.map((x) => CHOICE_CONFIRMATIONS[x]);
      const analysisText = choiceNoneConfirmed
        ? "Analysis. The Company cannot confirm any of the choice-architecture facts the assessment checks: symmetric presentation of the permission choice, that declining does not degrade the core service, or the absence of steering design elements. Each unconfirmed fact is treated as a live interference risk and weighs against the processing in Section IX."
        : choiceMissing.length === 0
        ? `Analysis. The Company confirms ${asProse(confirmedPhrases)}. On that structured record, the design of the interaction leaves the consumer’s choice informed and voluntary.`
        : `Analysis. The Company confirms ${asProse(confirmedPhrases)}, and does not confirm ${
          asProse(missingPhrases)
        }. Each unconfirmed fact is treated conservatively: the assessment does not assume the answer most favorable to the processing.`;
      put(
        "iv_consumer_transparency:8",
        "coercion_analysis",
        "B",
        analysisText,
        ["INTAKE:choice_architecture_check", "FACTOR:choice_architecture_table"],
        [],
      );
    }
    if (necessity.total || s(intake.q9_opt_out)) {
      const choiceReasons = choiceAnswered && (choiceNoneConfirmed || choiceMissing.length > 0)
        ? [
          choiceNoneConfirmed
            ? "none of the choice-architecture facts can be confirmed"
            : `the structured record leaves ${asProse(choiceMissing.map((x) => CHOICE_CONFIRMATIONS[x]))} unconfirmed`,
        ]
        : [];
      const allReasons = [...reasons, ...choiceReasons];
      const text = allReasons.length === 0
        ? "Conclusion. No coercion or compulsion indicator is established in the typed intake record: the information processed is supported as necessary to the interaction the consumer expects, and the choices described above are available."
        : `Conclusion. The choice architecture around the activity requires attention: ${
          asProse(allReasons)
        }. Consequence. The matter is reflected in the minimization condition, conditions, or recommendations in Sections III and IX.`;
      put(
        "iv_consumer_transparency:8",
        "coercion_conclusion",
        "B",
        text,
        ["INTAKE:a2_necessity_set", "INTAKE:q9_opt_out", "INTAKE:q16_sensitive_limit", "INTAKE:choice_architecture_check"],
        [],
      );
    }
  }

  // ── Section V — ADMT conclusions (gated end-to-end) ──────────────────────────

  if (isAdmt) {
    if (clause(intake.q19_admt_description) && clause(intake.admt_operational_role)) {
      // RK3-D — admt_role_analysis (doc 33 D-L3: the substantial-factor axis
      // typed by the Company's own classification).
      if (admtRoleType) {
        const roleText = admtRoleType === "The ADMT makes the decision without human involvement"
          ? "Analysis. The Company classifies the system as making the decision without human involvement. The classification places the full weight of the decision on the automated component, and the human-review, testing, and training analyses below are evaluated against that weight."
          : admtRoleType === "The ADMT is a substantial factor in a human decision"
          ? "Analysis. The Company classifies the system as a substantial factor in a human decision. The human decisionmaker acts on the system’s output, so the reliability of that output and the reviewer’s ability to depart from it are the operative questions in the analyses below."
          : admtRoleType === "The ADMT supports a human decision without being a substantial factor"
          ? "Analysis. The Company classifies the system as supporting a human decision without being a substantial factor in it. The classification reduces the decision weight of the automated component; the assessment tests that classification against the output-and-effect record below."
          : "Analysis. The Company has not yet classified the decision role of the system. The assessment treats the classification conservatively — as if the automated component carries decision weight — until the record resolves it.";
        put(
          "v_admt:1",
          "admt_role_analysis",
          "B",
          roleText,
          ["INTAKE:admt_role_type", "INTAKE:admt_operational_role"],
          [],
        );
      }
      put(
        "v_admt:1",
        "admt_role_conclusion",
        "B",
        "Conclusion. The operational role of the automated system is established by the Company’s description, and the assessment evaluates the system on that footing rather than on the label applied to it.",
        ["INTAKE:q19_admt_description", "INTAKE:admt_operational_role"],
        [],
      );
    }
    // RK3-D — admt_logic_analysis + admt_logic_conclusion (doc 33 D-L5 ADMT
    // logic table over the documentation enum).
    if (admtLogicDocumented && clause(intake.i5_admt_logic)) {
      const logicAnalysis = admtLogicDocumented === "The logic is documented and reviewed internally"
        ? "Analysis. The Company records that the system’s logic is documented and reviewed internally, and its description of that logic appears in this section. Internal documentation and review give the assessment a basis for evaluating the assumptions and limitations the Company identifies."
        : admtLogicDocumented === "The logic is documented by the provider and the Company relies on that documentation"
        ? "Analysis. The Company relies on the provider’s documentation of the system’s logic. The reliance is workable for assessment purposes, and it places the Company’s understanding of the system one step from its source; the dependency is noted in the vendor analysis in Section II."
        : "Analysis. The Company records that the system’s logic is not fully documented or understood, or cannot yet be confirmed. A system whose logic the operator cannot describe cannot be fully evaluated for the risks this report assesses.";
      const logicConclusion = admtLogicDocumented === "The logic is documented and reviewed internally"
        ? "Conclusion. The logic record is adequate for assessment purposes on the Company’s typed answer."
        : admtLogicDocumented === "The logic is documented by the provider and the Company relies on that documentation"
        ? "Conclusion. The logic record is adequate for assessment purposes, with the provider dependency noted."
        : "Conclusion. The logic record is not adequate for assessment purposes. Consequence. Documenting the logic appears among the Conditions to Proceed in Section IX.";
      put(
        "v_admt:3",
        "admt_logic_analysis",
        "B",
        logicAnalysis,
        ["INTAKE:admt_logic_documented", "INTAKE:i5_admt_logic"],
        [],
      );
      put(
        "v_admt:3",
        "admt_logic_conclusion",
        "B",
        logicConclusion,
        ["FACTOR:admt_logic_analysis"],
        [],
      );
    }
    if (clause(intake.admt_output) && clause(intake.admt_output_use) && clause(intake.admt_consumer_effect)) {
      const b3 = engagedLines.some((l) => l.includes("(b)(3)"));
      // RK3-D — admt_decision_effect_analysis (doc 33 D-L4: templated over
      // the output/use/effect narratives and the typed role classification).
      put(
        "v_admt:5",
        "admt_decision_effect_analysis",
        "B",
        `Analysis. The Company identifies what the system produces, how the output is used, and the effect on the consumer, and those facts are recorded in this section. ${
          admtRoleType === "The ADMT makes the decision without human involvement"
            ? "Read with the Company’s classification that the system decides without human involvement, the consumer effect recorded above follows directly from the automated output."
            : admtRoleType
            ? "Read with the Company’s decision-role classification, the consumer effect recorded above operates through the human decision the output feeds."
            : "The consumer effect recorded above is evaluated on the Company’s description of how the output is used."
        }`,
        ["INTAKE:admt_output", "INTAKE:admt_output_use", "INTAKE:admt_consumer_effect", "INTAKE:admt_role_type"],
        [],
      );
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
    } else {
      // APPENDIX-G DETERMINED-OUTCOME RULE (CEO-ratified 2026-08-22): inside
      // the isAdmt gate this factor always applies, so a partial answer names
      // what is missing instead of the block vanishing. No conclusion
      // composes in this branch — there is no decision-effect determination
      // to state until the description is complete.
      const missing: string[] = [];
      if (!clause(intake.admt_output)) missing.push("what the system produces");
      if (!clause(intake.admt_output_use)) missing.push("how the system’s output is used");
      if (!clause(intake.admt_consumer_effect)) missing.push("the effect of the decision on the consumer");
      put(
        "v_admt:5",
        "admt_decision_effect_analysis",
        "B",
        `Analysis. The Company has not yet described ${asProse(missing)} for this system, and the decision-effect analysis cannot be completed until it does.`,
        ["INTAKE:admt_output", "INTAKE:admt_output_use", "INTAKE:admt_consumer_effect"],
        [],
      );
    }
    {
      const review = clause(intake.i5_admt_human_review);
      // RK3-D — human_review_effectiveness_analysis (doc 33 D-L5: the typed
      // human-involvement test — interpretation, breadth, authority).
      if (humanReviewFacts.length) {
        const HRF_PHRASES: Record<string, string> = {
          "Reviewers know how to interpret and use the ADMT's output": "reviewers know how to interpret and use the output",
          "Reviewers consider information beyond the ADMT's output": "reviewers consider information beyond the output",
          "Reviewers have authority to change or overrule the decision": "reviewers have authority to change or overrule the decision",
        };
        const confirmed = humanReviewConfirmed.map((x) => HRF_PHRASES[x]).filter(Boolean);
        const missing = Object.keys(HRF_PHRASES).filter((x) => !humanReviewFacts.includes(x))
          .map((x) => HRF_PHRASES[x]);
        const hrText = noHumanReview
          ? "Analysis. The Company records that there is no human review of the system’s decisions. The automated component operates without meaningful human involvement, and the risk analysis in Section VII carries the decision weight accordingly."
          : confirmed.length === 3
          ? `Analysis. The Company confirms each element of effective human involvement: ${
            asProse(confirmed)
          }. On that structured record, the human review is effective — the reviewer is positioned to reach a different result, not merely to restate the automated one.`
          : confirmed.length > 0
          ? `Analysis. The Company confirms that ${asProse(confirmed)}, and does not confirm that ${
            asProse(missing)
          }. Human review is credited only to the extent confirmed; an unconfirmed element is not assumed.`
          : "Analysis. None of the elements of effective human involvement can be confirmed on the structured record. The review that exists is not shown to change outcomes, and the automated component is weighed as if it decides.";
        put(
          "v_admt:7",
          "human_review_effectiveness_analysis",
          "B",
          hrText,
          ["INTAKE:human_review_facts", "FACTOR:human_review_table"],
          [],
        );
      }
      put(
        "v_admt:7",
        "human_review_conclusion",
        "B",
        humanReviewFacts.length
          ? (noHumanReview
            ? "Conclusion. No human review operates for the system on the Company’s structured record. Consequence. The absence increases the weight of the automated component in the risk analysis in Section VII."
            : humanReviewConfirmed.length === 3
            ? "Conclusion. The human review is effective on the Company’s structured record, and the safeguard analysis in Section VIII relies on it at full weight."
            : "Conclusion. The human review is partially established on the Company’s structured record, and the safeguard analysis in Section VIII relies on it only to the extent confirmed.")
          : review
          ? "Conclusion. Human review is described in the Company’s submission. The assessment credits it to the extent the description supports reviewer understanding, adequate information and time, and authority to reach a different result; that reliance is carried into the safeguard analysis in Section VIII."
          : "Conclusion. No human review is described for the system. Consequence. The absence of described human review increases the weight of the automated component in the risk analysis in Section VII.",
        humanReviewFacts.length ? ["INTAKE:human_review_facts"] : ["INTAKE:i5_admt_human_review"],
        [],
      );
    }
    {
      const testing = clause(intake.i5_admt_fairness_testing);
      const none = !testing || /^not applicable/i.test(testing) || /^none\b/i.test(testing);
      // RK3-D — admt_testing_analysis (doc 33 D-L5 testing table over the
      // typed testing facts).
      if (admtTestingFacts.length) {
        const accuracy = admtTestingFacts.includes("Tested for accuracy or validity");
        const bias = admtTestingFacts.includes("Tested for discriminatory impact or bias");
        const recent = admtTestingFacts.includes("Testing performed or reviewed within the last 12 months");
        const providerOnly = admtTestingFacts.includes("Testing performed by the provider rather than the Company");
        const noneTyped = admtTestingFacts.includes("No testing has been performed or confirmed");
        const testGaps: string[] = [];
        if (!accuracy) testGaps.push("accuracy or validity testing");
        if (!bias) testGaps.push("discriminatory-impact testing");
        if (!recent) testGaps.push("testing within the last 12 months");
        const testingText = noneTyped
          ? "Analysis. The Company records that no testing has been performed or confirmed for the system. Accuracy and fairness claims accordingly carry no evidentiary support, and the adverse weight is carried into Section VII."
          : accuracy && bias && recent
          ? `Analysis. The Company confirms accuracy and discriminatory-impact testing, performed or reviewed within the last 12 months${
            providerOnly ? ", performed by the provider rather than the Company" : ""
          }. The testing record supports the reliance the safeguard analysis places on it${
            providerOnly ? ", with the provider dependency noted" : ""
          }.`
          : `Analysis. The Company’s typed testing record does not confirm ${
            asProse(testGaps)
          }${providerOnly ? ", and the testing that exists was performed by the provider rather than the Company" : ""}. Each unconfirmed element limits the reliance the assessment can place on the testing record, and completing it appears among the recommendations in Section IX.`;
        put(
          "v_admt:9",
          "admt_testing_analysis",
          "B",
          testingText,
          ["INTAKE:admt_testing_facts", "FACTOR:admt_testing_table"],
          [],
        );
      }
      put(
        "v_admt:9",
        "admt_testing_conclusion",
        "B",
        none && !admtTestingFacts.length
          ? "Conclusion. No accuracy, fairness, or bias testing is described for the system. That absence limits the weight the assessment can give to accuracy and fairness claims and is reflected in the risk analysis in Section VII."
          : "Conclusion. Testing is described in the Company’s submission and provides evidence bearing on accuracy, fairness, and bias; the strength of that evidence is weighed in Sections VII and VIII.",
        ["INTAKE:i5_admt_fairness_testing", "INTAKE:admt_testing_facts"],
        [],
      );
    }
    {
      const source = clause(intake.i5_admt_training_source);
      const none = !source || /^not applicable/i.test(source);
      // RK3-D — training_data_analysis (doc 33 D-L4: templated over the
      // existing typed training operands; no new field required).
      if (!none || s(intake.q18b_admt_training) || s(intake.admt_provider_trained_using_pi)) {
        const trainsSignificant = s(intake.q18b_admt_training).startsWith("Yes");
        const providerTrained = isYes(intake.admt_provider_trained_using_pi);
        const parts: string[] = [];
        parts.push(
          none
            ? "Analysis. Training-data provenance is not identified in the Company’s submission."
            : "Analysis. The Company identifies the provenance of the training data, and the identification forms part of the technical record in Appendix F.",
        );
        if (trainsSignificant) {
          parts.push(
            "The Company additionally records that personal information is used to train the technology, and the training use is assessed as part of this activity’s scope.",
          );
        }
        if (providerTrained) {
          parts.push(
            "The provider’s own training on personal information is recorded, and the provided-to-another-business facts later in this section carry the consequence.",
          );
        }
        put(
          "v_admt:11",
          "training_data_analysis",
          "B",
          parts.join(" "),
          ["INTAKE:i5_admt_training_source", "INTAKE:q18b_admt_training", "INTAKE:admt_provider_trained_using_pi"],
          [],
        );
      }
      put(
        "v_admt:11",
        "training_data_conclusion",
        "B",
        none
          ? "Conclusion. Training-data provenance is not identified for the system; the gap is carried into the assessment follow-up where material."
          : "Conclusion. The provenance of the training data is identified in the Company’s submission and forms part of the technical record in Appendix F.",
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
      // RK3-D — admt_overall_reasoning (doc 33 D-L4: pure projection of the
      // typed Section V conclusions; spine order places it after the overall
      // conclusion).
      {
        const reasoningBits: string[] = [];
        if (admtRoleType) reasoningBits.push(`the decision role is classified (${admtRoleType.toLowerCase()})`);
        if (admtLogicDocumented) {
          reasoningBits.push(
            admtLogicDocumented === "The logic is not fully documented or understood" || admtLogicDocumented === "Unsure"
              ? "the logic record is not yet adequate"
              : "the logic record is adequate",
          );
        }
        if (humanReviewFacts.length) {
          reasoningBits.push(
            noHumanReview
              ? "no human review operates"
              : humanReviewConfirmed.length === 3
              ? "human review is effective"
              : "human review is partially established",
          );
        }
        if (admtTestingFacts.length) {
          reasoningBits.push(
            admtTestingFacts.includes("No testing has been performed or confirmed")
              ? "the testing record is empty"
              : "the testing record is evaluated at its confirmed extent",
          );
        }
        if (reasoningBits.length) {
          put(
            "v_admt:13",
            "admt_overall_reasoning",
            "B",
            `Reasoning. The conclusion restates the typed findings of this section: ${
              asProse(reasoningBits)
            }. No effectiveness judgment beyond those typed findings is made here; the consequences run through Sections VII through IX.`,
            ["FACTOR:admt_role_analysis", "FACTOR:admt_logic_conclusion", "FACTOR:human_review_effectiveness_analysis", "FACTOR:admt_testing_analysis"],
            [],
          );
        }
      }
    }
    // RK3-D — admt_technical_analysis (Appendix D, doc 33 D-L4: ratified
    // commentary over the presence and shape of the technical record).
    {
      const techPresent = [
        clause(intake.q19_admt_description),
        clause(intake.i5_admt_logic),
        clause(intake.admt_output),
        clause(intake.i5_admt_human_review),
        clause(intake.i5_admt_fairness_testing),
        clause(intake.i5_admt_training_source),
      ].filter(Boolean).length;
      if (techPresent > 0) {
        put(
          "appendix_d:2",
          "admt_technical_analysis",
          "B",
          `Analytical note. The record above preserves the Company’s own technical description across ${techPresent} of the six record areas the appendix tracks (system description, logic, output and use, human review, testing, and training data). The body of the report evaluates those facts in Section V; this appendix preserves them so a reviewer can trace each Section V conclusion to the record it rests on.`,
          ["DERIVED:admt_technical_facts"],
          ["11 CCR § 7152(a)(5)"],
        );
      }
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
        const identifiedNames = [
          ...reviewers.map((r) => s(r.name)).filter(Boolean),
          ...(!reviewers.length && migrated ? [migrated] : []),
        ];
        const followUpText = identifiedNames.length > 0
          ? `Approval follow-up. ${asProse(identifiedNames)} ${plural(identifiedNames.length, "is", "are")} identified as ${plural(identifiedNames.length, "a reviewer or approver", "reviewers and approvers")}. Confirmation of ${plural(identifiedNames.length, "their", "each person's")} authority over whether the processing proceeds remains outstanding and must be completed at finalization before the approval record is sufficient.`
          : "Approval follow-up. Confirmation of approver authority, or identification of the reviewers and approvers, remains outstanding and must be completed at finalization before the approval record is sufficient.";
        put(
          "x_governance:1",
          "approval_follow_up",
          "B",
          followUpText,
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
    // APPENDIX-G DETERMINED-OUTCOME RULE (CEO-ratified 2026-08-22): the
    // adverse sentence below already existed but was unreachable unless all
    // four eligibility questions were answered — one blank answer suppressed
    // the whole block, indistinguishable from the factor not applying. Any
    // answered question means the certifier record was started, so the
    // factor applies; an unanswered criterion is correctly reported by the
    // existing sentence as "not confirmed". Zero answers still suppresses.
    if (answered.length > 0) {
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
    // v4.7.2 — when several triggers share an identical basis clause, state
    // the basis once for all of them instead of repeating the full sentence
    // per trigger (CEO output review: the repetition read as template
    // output, not analysis). Distinct bases keep the per-trigger form.
    const engaged = engagedLines.map((l) => {
      const stripped = l.replace(/^Engaged — /, "");
      const idx = stripped.indexOf(":");
      return idx >= 0
        ? { cite: stripped.slice(0, idx).trim(), basis: stripped.slice(idx + 1).trim() }
        : { cite: stripped.trim(), basis: "" };
    });
    const allSameBasis = engaged.length > 1 && engaged.every((e) => e.basis === engaged[0].basis);
    const triggerText = allSameBasis
      ? `${asProse(engaged.map((e) => e.cite))} each apply on the facts the Company has supplied: ${
        engaged[0].basis
          .replace(/\bthis trigger\b/g, "these triggers")
          .replace(/\bthis activity falls\b/g, "the activity falls")
      }`
      : engaged
        .map((e) => `${e.cite} applies on the facts the Company has supplied: ${e.basis}`)
        .join(" ");
    put(
      "executive_summary:3",
      "executive_trigger_summary",
      "A",
      triggerText,
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
      `${RISK_FACTOR_FIXED.exec_determination_head} ${cell.conclusion} ${cellExplanation}`,
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
    exec_panel: {
      assessment_required: engagedLines.length > 0,
      inherent: pathways.length ? maxInherent : null,
      residual: pathways.length ? maxResidual : null,
      disposition: consequence,
    },
  };
}
