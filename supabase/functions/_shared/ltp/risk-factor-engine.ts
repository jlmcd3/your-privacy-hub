// CPPA RISK FACTOR ENGINE — SPINE v5.2 (the Memorandum Redesign).
//
// AUTHORED PER CEO RATIFICATION 2026-08-26 (chat record). This module is
// DETERMINISTIC AT RUNTIME: it makes zero model calls. Every generated block
// composes exclusively from the ratified branch frames below (Annex T1–T6 of
// the v5.2 spine and the per-block frames), filled from typed engine
// operands that already exist — no new intake fields, no new judgments, no
// model prose.
//
// CARRIED RATIFICATIONS (bytes unchanged from the RK3-C/RK3-D line):
//   * RISK_MATERIALITY_MATRIX — the severity-weighted inherent matrix;
//   * resolveResidual — the one-tier-on-tested-evidence residual rule;
//   * resolveBenefitWeight — the benefit-weight table;
//   * the § 7154 balancing LOGIC (benefit tier × highest remaining level).
//
// RE-REGISTERED THIS ENCODE (a ratification event, per the v5.2 spine's
// implementation note and the CEO's redline ¶72 target wording): the
// determination STRING table (RISK_BALANCING_TABLE — every conclusion /
// materiality / effect / explanation cell) and the recommended-outcome
// sentences (resolveRecommendedOutcome) now carry the "Based on the
// information provided by the Company" register, "the Activity" defined
// term, v5.2 section numbers, and "level" (not "tier") in customer-facing
// text. The cell-to-outcome mapping is byte-for-byte the same logic.
//
// REGISTER (v5.2): "on the information provided" family; the "record shows /
// structured record" family is retired from customer-facing prose;
// "risk", never "risk pathway"; results, never mechanics (the confidential-
// method rule — no matrix or crediting principle is stated in the abstract);
// directional T6 house forms close every application paragraph.

import { HARM_PATHWAY_OPTS } from "../intake-contracts/cppa-risk-assessment.ts";
import { CA_SPI_CATEGORY_KEYS } from "./ca-pi-taxonomy.ts";
import type { RenderedTable } from "../prose/skeleton-render.ts";
import { firstSentence } from "./clause-bound.ts";
import { RISK52_FIXED } from "../prose/plans/cppa-risk.spine.ts";

export const RISK_FACTOR_ENGINE_STAMP =
  "risk-factor-engine@spine-v5.2-2026-08-26";

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

// A-TEAM S3 RULING VI.21 (doc 115) — counts under ten as words in narrative.
const COUNT_WORDS = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine"] as const;
function countWord(n: number): string {
  return n >= 0 && n < COUNT_WORDS.length ? COUNT_WORDS[n] : String(n);
}

/**
 * CEO report review 2026-08-24 (carried) — § 7152(a)(8) "information
 * providers" free text in the "Name (Role) — materials." shape gets the
 * renderer's "— item" list markers at each person boundary so it renders as
 * real bullets. Non-matching text passes through unchanged.
 */
export function markInformationProviderItems(text: string): string {
  const t = s(text);
  if (!t) return t;
  const NAME_LEAD = /^[A-ZÀ-ÿ][\wÀ-ÿ'.-]*(?:\s[A-ZÀ-ÿ][\wÀ-ÿ'.-]*)*\s+\([^)]+\)\s+—\s+/;
  if (!NAME_LEAD.test(t)) return t;
  const NAME_BOUNDARY = /\.\s+(?=[A-ZÀ-ÿ][\wÀ-ÿ'.-]*(?:\s[A-ZÀ-ÿ][\wÀ-ÿ'.-]*)*\s+\([^)]+\)\s+—\s+)/g;
  // BATCH 20b (doc 113 S6.2) — one roster item per LINE, so the renderer's
  // Rule-4 list machinery fires instead of fusing the items into a run.
  const marked = t.replace(NAME_BOUNDARY, ".\n— ");
  return `— ${marked}`;
}

/**
 * v5.2 register sweep for text carried from upstream classifier surfaces
 * (the trigger narrative above all): the retired families are mapped onto
 * the v5.2 attribution register. Deterministic string mapping only — it
 * never rewords the Company's own quoted facts beyond the register terms.
 */
export function sweepRegister52(text: string): string {
  return s(text)
    .replace(/\bthe record supports\b/g, "the information provided supports")
    .replace(/\bThe record supports\b/g, "The information provided supports")
    .replace(/\bthis activity\b/g, "the Activity")
    .replace(/\bThis activity\b/g, "The Activity")
    .replace(/\bon the present record\b/g, "on the information provided")
    .replace(/\bthe present record\b/g, "the information provided")
    .replace(/\brisk pathways\b/g, "risks")
    .replace(/\brisk pathway\b/g, "risk")
    .replace(/\bthe Company’s structured record\b/g, "the information the Company provided")
    .replace(/\bthe Company's structured record\b/g, "the information the Company provided");
}

// ── Ratified determination tables ─────────────────────────────────────────────

export type RiskLikelihood = "Unlikely" | "Possible" | "Likely" | "Highly likely";
export type RiskSeverity = "Minimal" | "Moderate" | "Significant" | "Severe";
export type RiskMateriality = "Low" | "Moderate" | "High" | "Critical";

/**
 * RATIFIED (carried byte-identical) — inherent-level matrix
 * (severity-weighted, conservative). Operands are the Company's own
 * likelihood and severity assessments; the matrix combines them
 * mechanically. CONFIDENTIAL METHOD: this table is never depicted or
 * described in customer-facing prose.
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
 * RATIFIED (carried byte-identical) — residual rule. A safeguard reduces a
 * risk's level by ONE tier only where the status is "Implemented and tested"
 * (evidence that it operates in practice). "Implemented, not tested" is
 * credited as existing but does not change the level; "Planned, not yet
 * implemented" and "None" leave the inherent level in place.
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

/** RATIFIED (carried byte-identical) — benefit-weight table. */
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
 * RATIFIED LOGIC, RE-REGISTERED STRINGS (v5.2 encode, 2026-08-26) — the
 * § 7154 balancing determination table. Operands: the best benefit tier ×
 * the highest remaining level. The mapping of operands to outcomes is
 * byte-for-byte the RK3-C/PN-RK8 ratification; every STRING cell is
 * re-registered to the CEO's redline-¶72 target wording ("Based on the
 * information provided by the Company, …", "the Activity", v5.2 section
 * numbers, "level" not "tier"). The customer's impact_intake.benefitsOutweigh
 * answer is perspective only and NEVER feeds this table (pinned by test).
 */
export const RISK_BALANCING_TABLE: Record<BenefitTier, Record<RiskMateriality, BalancingCell>> = {
  material: {
    Low: {
      conclusion:
        "Based on the information provided by the Company, the benefits of the Activity outweigh the privacy risks that remain after credited safeguards are taken into account.",
      materiality:
        "The determination is not close: at least one benefit of material weight is established, and no remaining risk sits above the low level.",
      effect: "The processing may proceed as described in the information provided.",
      kind: "proceed",
      explanation:
        "A benefit of material weight, a necessity analysis that supports the information processed, and a low remaining-risk profile together support the favorable disposition.",
    },
    Moderate: {
      conclusion:
        "Based on the information provided by the Company, the benefits of the Activity outweigh the privacy risks that remain, although the margin is narrower than a low-risk profile would produce.",
      materiality:
        "The determination is material: the moderate remaining risk or risks identified in § 4.A could change the balance if a risk grows or a credited safeguard weakens.",
      effect:
        "The processing may proceed, subject to any conditions identified in § 4.D and to the review cadence in Section 5.",
      kind: "proceed",
      explanation:
        "This is a favorable determination, but a close one: the benefit record is material, while the remaining risk sits at the moderate level rather than low. It depends on the credited safeguards continuing to operate as described, on the conditions and recommendations in § 4.D being carried out, and on the review required in Section 5 taking place on schedule.",
    },
    High: {
      conclusion:
        "Based on the information provided by the Company, the residual privacy risks remaining after credited safeguards are substantial, and the benefits established by the Activity do not outweigh those risks.",
      materiality: "The determination is material and adverse: a high-level risk remains after credited safeguards.",
      effect:
        "The processing should not proceed in its present form; completion of the identified conditions and an updated assessment could change the determination.",
      kind: "stop",
      explanation:
        "The determination rests on the remaining-risk conclusion in § 4.A: the benefit record, although material, cannot carry a high-level remaining risk.",
    },
    Critical: {
      conclusion:
        "Based on the information provided by the Company, a critical privacy risk remains after credited safeguards, and the benefits established by the Activity cannot outweigh it.",
      materiality: "The determination is decisive on the information provided.",
      effect: "The processing should not proceed while the critical risk remains.",
      kind: "stop",
      explanation:
        "A critical remaining risk precludes a favorable balance regardless of the weight of the benefit record.",
    },
  },
  limited: {
    Low: {
      conclusion:
        "Based on the information provided by the Company, the benefits established, although of limited weight, outweigh the low privacy risks that remain.",
      materiality:
        "The determination is closer than a materially-benefited profile would produce, but the low remaining-risk profile supports it.",
      effect: "The processing may proceed as described in the information provided.",
      kind: "proceed",
      explanation:
        "The low remaining-risk profile carries the determination; strengthening the supporting information behind the claimed benefits would widen the margin.",
    },
    Moderate: {
      conclusion:
        "Based on the information provided by the Company, the benefits established carry limited weight and a moderate risk remains; the balance favors the Activity only narrowly.",
      materiality:
        "The determination is close. Growth in the remaining risk or risks, or weakening of a credited safeguard, should prompt reassessment.",
      effect:
        "The processing may proceed, subject to any conditions identified in § 4.D; the review cadence in Section 5 takes on added importance.",
      kind: "proceed",
      explanation:
        "This is a favorable determination, but a close one: the benefit record carries only limited weight, and the remaining risk sits at the moderate level. It depends on the credited safeguards continuing to operate as described and on the conditions and recommendations in § 4.D being carried out.",
    },
    High: {
      conclusion:
        "Based on the information provided by the Company, the benefits established carry limited weight and do not outweigh the high-level privacy risk that remains.",
      materiality: "The determination is adverse and is not close.",
      effect: "The processing should not proceed in its present form on the information provided.",
      kind: "stop",
      explanation:
        "A high-level remaining risk cannot be carried by a benefit record of limited weight.",
    },
    Critical: {
      conclusion:
        "Based on the information provided by the Company, a critical privacy risk remains, and the limited benefits established cannot outweigh it.",
      materiality: "The determination is decisive on the information provided.",
      effect: "The processing should not proceed while the critical risk remains.",
      kind: "stop",
      explanation:
        "A critical remaining risk precludes a favorable balance regardless of the weight of the benefit record.",
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
      `Based on the information provided by the Company, no benefit is established for any stakeholder category, so the ${tier}-level privacy risk that remains is not outweighed.`,
    materiality: "The determination follows directly from the benefit record.",
    effect:
      "The processing should not proceed on the information provided; establishing the benefit record and updating the assessment could change the determination.",
    kind: "stop",
    explanation:
      "The balancing question compares benefits against remaining risks; where no benefit is established, no remaining risk can be outweighed.",
  };
}

/** RATIFIED LOGIC, RE-REGISTERED STRINGS (v5.2) — recommended-outcome wording,
 * keyed to consequence × processing status. */
export function resolveRecommendedOutcome(
  kind: "proceed" | "stop",
  hasConditions: boolean,
  processingStatus: string,
): { outcome: string; consequence: ProcessingConsequence } {
  if (/^discontinued/i.test(processingStatus)) {
    return {
      outcome:
        "No processing decision is required: the Company records the processing as discontinued, and this assessment documents the Activity as conducted.",
      consequence: kind === "stop" ? "do not proceed" : "proceed",
    };
  }
  const planned = /^planned/i.test(processingStatus);
  if (kind === "stop") {
    return {
      outcome: planned
        ? "Do not initiate the processing on the information provided."
        : "Suspend or discontinue the processing on the information provided.",
      consequence: "do not proceed",
    };
  }
  if (hasConditions) {
    return {
      outcome: planned
        ? "Initiate the processing subject to the Conditions to Proceed identified in § 4.D."
        : "Continue the processing subject to the Conditions to Proceed identified in § 4.D.",
      consequence: "proceed with conditions",
    };
  }
  return {
    outcome: planned
      ? "Initiate the processing as described in the information provided."
      : "Continue the processing as described in the information provided.",
    consequence: "proceed",
  };
}

/** Retained for tests/telemetry: nothing on this list ever composes. */
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
  /** Authority references for the Appendix A feed. */
  readonly authorities: readonly string[];
}

export interface RiskFactorEngineResult {
  readonly stamp: string;
  /** ComposedBlocks additions, keyed "sectionId:index" (v5.2 section ids). */
  readonly blocks: Record<string, string>;
  /** factor_id → composed text, for the Appendix A matrix and pins. */
  readonly factors: Record<string, string>;
  /** v5.2 tables owned by the engine, keyed "sectionId:index". */
  readonly tables: Record<string, RenderedTable | null>;
  readonly provenance: readonly FactorProvenance[];
  readonly composed_factor_ids: readonly string[];
  readonly absent_class_c_ids: readonly string[];
  /** Typed operands for the cover Assessment Result panel — a PROJECTION of
   * determinations already made, never a new one. */
  readonly exec_panel: {
    readonly assessment_required: boolean;
    readonly inherent: RiskMateriality | null;
    readonly residual: RiskMateriality | null;
    readonly disposition: string;
  };
}

// ── Typed operand extraction (carried) ───────────────────────────────────────

export interface Pathway {
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

export function extractPathways(intake: Bag): Pathway[] {
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

export function rankPathways(ps: Pathway[]): Pathway[] {
  return [...ps].sort((a, b) => MATERIALITY_RANK[b.materiality] - MATERIALITY_RANK[a.materiality]);
}

/** Material cut: High/Critical; if none reach High, the top level present. */
export function materialPathways(ps: Pathway[]): Pathway[] {
  const ranked = rankPathways(ps);
  if (ranked.length === 0) return [];
  const high = ranked.filter((p) => MATERIALITY_RANK[p.materiality] >= 2);
  if (high.length) return high;
  const top = ranked[0].materiality;
  return ranked.filter((p) => p.materiality === top);
}

export interface BenefitRecord {
  readonly label: string;
  readonly narrative: string;
  readonly fact: string;
  readonly weight: BenefitWeight;
  readonly basis: string;
}

export function extractBenefits(intake: Bag): BenefitRecord[] {
  const defs: Array<[string, unknown, unknown, unknown, unknown]> = [
    ["consumer", intake.benefit_consumer_identified, intake.a4_benefit_consumer, intake.a4_benefit_consumer_fact, intake.benefit_consumer_magnitude_basis],
    ["business", intake.benefit_business_identified, intake.a4_benefit_business, intake.a4_benefit_business_fact, intake.benefit_business_magnitude_basis],
    ["other-stakeholder", intake.benefit_other_stakeholders_identified, intake.a4_benefit_other_stakeholders, intake.a4_benefit_other_stakeholders_fact, intake.benefit_other_stakeholders_magnitude_basis],
    ["public", intake.benefit_public_identified, intake.a4_benefit_public, intake.a4_benefit_public_fact, intake.benefit_public_magnitude_basis],
  ];
  return defs.map(([label, identified, narrative, fact, basis]) => ({
    label,
    narrative: clause(narrative),
    fact: clause(fact),
    weight: resolveBenefitWeight(identified, narrative, fact),
    basis: s(basis),
  }));
}

export function bestBenefitTier(benefits: BenefitRecord[]): BenefitTier {
  if (benefits.some((b) => b.weight === "material weight")) return "material";
  if (benefits.some((b) => b.weight === "limited weight")) return "limited";
  return "none";
}

export interface NecessityBuckets {
  readonly necessary: Bag[];
  readonly unnecessary: Bag[];
  readonly unsure: Bag[];
  readonly total: number;
}

export function extractNecessity(intake: Bag): NecessityBuckets {
  const all = rows(intake.a2_necessity_set).filter((r) => s(r.element));
  return {
    necessary: all.filter((r) => s(r.necessity) === "Necessary to the stated purpose"),
    unnecessary: all.filter((r) => s(r.necessity) === "Collected but not necessary to the stated purpose"),
    unsure: all.filter((r) => s(r.necessity) === "Unsure"),
    total: all.length,
  };
}

// ── Appendix tables (carried, v5.2 column register) ──────────────────────────

/** Appendix D — the element-level necessity matrix. */
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

/** Appendix E — the risk × safeguard register (structured fields only;
 * § 4.A carries all analysis prose). Ranked by pre-safeguard level. */
export function buildRiskAndSafeguardRegisterTable(intake: Bag): RenderedTable {
  const pathways = rankPathways(extractPathways(intake));
  return {
    key: "",
    surface: "risk_and_safeguard_register",
    title: "",
    columns: [
      "Risk",
      "Information, Actor, Source, and Cause",
      "Likelihood and Severity (Company assessment)",
      "Level Before Safeguards",
      "Safeguards (status)",
      "Remaining Level",
    ],
    rows: pathways.map((p) => {
      const safeguardCells = p.safeguards.length
        ? p.safeguards.map((g) =>
          `${firstSentence(s(g.safeguard))} [${s(g.safeguard_status)}]${
            s(g.residual) ? ` — Company residual description: ${clause(g.residual)}` : ""
          }`
        ).join(" | ")
        : "None established.";
      return [
        p.harm,
        `Information: ${p.data || "not stated"}. Actor or event: ${p.actor || "not stated"}. Source: ${p.source || "not stated"}. Cause: ${p.cause || "not stated"}.`,
        `Likelihood: ${p.likelihood}. Severity: ${p.severity}.`,
        p.materiality,
        safeguardCells,
        p.residual,
      ];
    }),
  };
}

// ── v5.2 ledger/table helpers ────────────────────────────────────────────────

/** The movement mark beside a remaining-risk level.
 *
 * A-TEAM S3 RULING VI.3 (doc 115, 2026-08-31): doc 72's glyph marks (▼
 * reduced, = unchanged) printed as apparent rendering defects — with no
 * credited safeguard every ledger row read "High =", which the presentation
 * review flagged P0 as stray output, and ▼ carries font-subsetting risk.
 * Words replace the glyphs: self-explanatory, no legend, no glyph risk. */
function movementMark(p: Pathway): string {
  return MATERIALITY_RANK[p.residual] < MATERIALITY_RANK[p.materiality] ? "(reduced)" : "(unchanged)";
}

/** The safeguard-credited cell: credited safeguard(s) with status, or the
 * honest none line. */
function safeguardCreditedCell(p: Pathway): string {
  const byRank = [...p.safeguards].sort((a, b) =>
    (SAFEGUARD_STATUS_RANK[s(b.safeguard_status)] ?? 0) - (SAFEGUARD_STATUS_RANK[s(a.safeguard_status)] ?? 0)
  );
  const best = byRank.filter((g) => s(g.safeguard_status) === (p.bestStatus ?? ""));
  const picked = best.length ? best : byRank;
  if (!picked.length) return "None established";
  const names = picked.map((g) => firstSentence(s(g.safeguard)).replace(/\.$/, ""));
  const status = p.bestStatus ? p.bestStatus.toLowerCase() : "recorded";
  return `${names.join("; ")} (${status})`;
}

/** The ledger — one row per identified risk, ranked by pre-safeguard level.
 * A findings table: levels and safeguards only; no numerals, no totals, no
 * summary row (doc 72 guardrail). Shared derivation for § 4.A and the
 * exec-summary compression. */
export function buildRiskLedgerTable(pathways: Pathway[], surface: string): RenderedTable | null {
  const ranked = rankPathways(pathways);
  if (!ranked.length) return null;
  // PANEL RISK-P3 (2026-08-30): the exec surface previously emitted the same
  // four-column ledger as § 4.A byte-for-byte — the full table printed
  // twice. The exec summary now carries the compression this function's
  // doc-comment always promised: one line per risk, name and remaining
  // level; § 4.A keeps the full ledger.
  if (surface === "exec_ledger") {
    // A-TEAM S4 RULING S2.16 (doc 119, 2026-08-31) — the compression carries
    // the safeguard STATUS word between risk and remaining level, so the
    // exec reader sees whether anything was credited without the full
    // § 4.A ledger repeating (RISK-P3 no-duplication holds).
    return {
      key: "",
      surface,
      title: "",
      columns: ["Privacy risk", "Safeguard credited", "Remaining risk"],
      rows: ranked.map((p) => [
        p.harm,
        p.safeguards.length ? (p.bestStatus ?? "Recorded") : "None established",
        `${p.residual} ${movementMark(p)}`,
      ]),
    };
  }
  return {
    key: "",
    surface,
    title: "",
    columns: ["Privacy risk", "Before safeguards", "Safeguard credited (status)", "Remaining"],
    rows: ranked.map((p) => [
      p.harm,
      p.materiality,
      safeguardCreditedCell(p),
      `${p.residual} ${movementMark(p)}`,
    ]),
  };
}

const CONSEQUENCE_BAND: Record<ProcessingConsequence, string> = {
  "proceed": "Proceed on the information provided.",
  "proceed with conditions": "Proceed with conditions on the information provided.",
  "do not proceed": "Do not proceed on the information provided.",
};

// ── The engine ────────────────────────────────────────────────────────────────

export function runRiskFactorEngine(
  intake: Bag,
  report: Bag,
  assessmentDate: string,
): RiskFactorEngineResult {
  const blocks: Record<string, string> = {};
  const factors: Record<string, string> = {};
  const provenance: FactorProvenance[] = [];
  const tables: Record<string, RenderedTable | null> = {};

  const put = (
    key: string,
    factorId: string,
    cls: FactorClass,
    text: string,
    sources: string[],
    authorities: string[] = [],
  ): string => {
    // A leading "\n" asks for a line break before this factor when it shares
    // a spine block with earlier content; "\n\n" asks for a fresh paragraph.
    const breakBefore = /^\n/.test(text) ? (/^\n\n/.test(text) ? "\n\n" : "\n") : "";
    const t = text.replace(/[^\S\n]{2,}/g, " ").trim();
    if (!t) return "";
    factors[factorId] = t;
    provenance.push({ factor_id: factorId, factor_class: cls, sources, authorities });
    blocks[key] = blocks[key] ? `${blocks[key]}${breakBefore || " "}${t}` : t;
    return t;
  };

  // A factor stored for the Appendix A matrix WITHOUT its own body block
  // (its text already prints inside another composed block); provenance is
  // still recorded so composed_factor_ids and provenance stay in lockstep.
  const putFactorOnly = (
    factorId: string,
    cls: FactorClass,
    text: string,
    sources: string[],
    authorities: string[] = [],
  ): void => {
    const t = text.replace(/[^\S\n]{2,}/g, " ").trim();
    if (!t) return;
    factors[factorId] = t;
    provenance.push({ factor_id: factorId, factor_class: cls, sources, authorities });
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
  const gaps = material.filter((p) =>
    !safeguardRows.some((g) =>
      s(g.harm) === p.harm && (SAFEGUARD_STATUS_RANK[s(g.safeguard_status)] ?? 0) >= 2
    )
  );

  // Conditions / follow-ups / recommendations (typed derivations, carried).
  const conditions: string[] = [];
  for (const g of planned) {
    conditions.push(
      `Complete implementation of the planned safeguard: ${firstSentence(s(g.safeguard))}${
        s(g.harm) ? ` (addresses: ${s(g.harm)})` : ""
      }`,
    );
  }
  if (necessity.unnecessary.length) {
    // PANEL RISK-P1/D8 (2026-08-30): no colon cataphora here — the exec
    // summary compresses each condition to the text before its first colon,
    // and "the following element:" left "the following element" dangling in
    // the one paragraph most customers read. Naming the elements inline
    // keeps both the full § 4.D entry and the compact form grammatical.
    conditions.push(
      `Cease processing, or establish the necessity of, ${asProse(necessity.unnecessary.map((r) => s(r.element)))}`,
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
    followUps.push(`Resolve the trigger question: ${sweepRegister52(line)}`);
  }

  // Consumer-control weak markers (typed on the q7–q10 / q16 / q20 enums).
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

  // RK3-D typed operands (carried).
  const specificityAll = arr(intake.purpose_specificity_facts);
  const specificityFacets = specificityAll.filter((x) => x !== "None of the above");
  const specificityAnswered = specificityAll.length > 0;

  const outOfScope = s(intake.out_of_scope_confirmation);
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

  // RK3-D routing into the shared lists (carried).
  if (specificityAnswered && specificityFacets.length === 0) {
    conditions.push(
      "Restate the processing purpose so it identifies the product or operation supported, the information involved, the consumers affected, and the intended outcome",
    );
  }
  if (specificityAnswered && specificityFacets.length > 0 && specificityFacets.length <= 2) {
    followUps.push(
      "Sharpen the stated Purpose: the information provided confirms it identifies only " +
        asProse(specificityFacets.map((x) => x.toLowerCase())),
    );
  }
  if (outOfScope === "Unsure") {
    followUps.push(
      "Determine whether the affected information is processed for activities not covered by this assessment",
    );
  }
  if (s(intake.comparable_processing_status) === "Unsure") {
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

  // Balancing operands (the ratified logic, unchanged).
  const cell = RISK_BALANCING_TABLE[benefitTier][maxResidual];
  const necessityQualified = necessity.unnecessary.length > 0 || necessity.unsure.length > 0;
  const cellExplanation =
    necessityQualified && cell.explanation.includes("a necessity analysis that supports the information processed")
      ? "Material benefits and a low remaining-risk profile support the favorable disposition; the necessity issue identified in § 3.B remains a condition to proceeding."
      : cell.explanation;
  const hasConditions = conditions.length > 0;
  const { outcome, consequence } = resolveRecommendedOutcome(
    cell.kind,
    hasConditions,
    s(intake.processing_status),
  );

  // Parsed trigger operands.
  interface TriggerParsed {
    readonly cite: string;
    readonly label: string;
    readonly basis: string;
  }
  const parsedTriggers: TriggerParsed[] = engagedLines.map((l) => {
    const stripped = l.replace(/^Engaged — /, "");
    const m = /^(.*?§\s*7150\(b\)\(\d\))\s*\(([^)]+)\)\s*:\s*(.*)$/.exec(stripped);
    if (m) return { cite: m[1].trim(), label: m[2].trim(), basis: sweepRegister52(m[3].trim()) };
    const idx = stripped.indexOf(":");
    return idx >= 0
      ? { cite: stripped.slice(0, idx).trim(), label: "", basis: sweepRegister52(stripped.slice(idx + 1).trim()) }
      : { cite: stripped.trim(), label: "", basis: "" };
  });
  const uncertainSwept = uncertainLines.map((l) => sweepRegister52(l.replace(/^Uncertain\s*—\s*/i, "")));

  // ══ EXECUTIVE SUMMARY ══════════════════════════════════════════════════════

  // Exec B — BATCH 20b (doc 113 S6.1): the lead sentence stays composed;
  // the per-trigger lines move into the digest table (Trigger | Engaged |
  // Basis). SS III.A keeps the full analysis paragraphs.
  if (parsedTriggers.length || uncertainSwept.length) {
    const triggerRows: string[][] = parsedTriggers.map((t) => [
      `${t.cite}${t.label ? ` — ${t.label}` : ""}`,
      "Engaged",
      `${t.basis || "the information provided supports this trigger."}${/[.!?]$/.test(t.basis) ? "" : "."}`,
    ]);
    for (const u of uncertainSwept) {
      triggerRows.push([
        u.replace(/[.!?]\s*$/, ""),
        "Unresolved",
        "The information provided leaves this trigger unresolved; resolving it appears among the Follow-ups in § 4.D.",
      ]);
    }
    tables["executive_summary:3"] = {
      key: "",
      surface: "exec_triggers",
      title: "Triggers under § 7150(b)",
      columns: ["Trigger", "Engaged", "Basis"],
      rows: triggerRows,
    };
    put(
      "executive_summary:2",
      "exec_trigger_lines",
      "A",
      RISK52_FIXED.exec_triggers_lead,
      ["DERIVED:applicable_7150_triggers"],
      ["11 CCR § 7150(b)"],
    );
  } else if (scopeLines.some((x) => x.startsWith("Not engaged"))) {
    put(
      "executive_summary:2",
      "exec_trigger_lines",
      "A",
      RISK52_FIXED.exec_triggers_none,
      ["DERIVED:applicable_7150_triggers"],
      ["11 CCR § 7150(b)"],
    );
  }

  // Exec C — ledger intro + compact ledger.
  if (pathways.length) {
    put(
      "executive_summary:5",
      "exec_ledger_intro",
      "A",
      RISK52_FIXED.exec_ledger_intro,
      ["INTAKE:a5_harm_pathways"],
      ["11 CCR § 7152", "11 CCR § 7154"],
    );
  }
  tables["executive_summary:6"] = buildRiskLedgerTable(pathways, "exec_ledger");

  // Exec C — benefit strip.
  {
    const supported = benefits.filter((b) => b.weight === "material weight");
    const strongest = benefits.find((b) => b.weight === "material weight") ??
      benefits.find((b) => b.weight === "limited weight");
    const strip = strongest
      ? `The strongest benefit established is of ${
        strongest.weight === "material weight" ? "material" : "limited"
      } weight (the ${strongest.label} benefit — § 3.F); ${supported.length} of the four benefit categories ${
        plural(supported.length, "is", "are")
      } supported by specific information.`
      : "No benefit is established in any of the four benefit categories (§ 3.F).";
    if (benefits.some((b) => b.narrative) || benefits.every((b) => b.weight === "no affirmative weight")) {
      put(
        "executive_summary:7",
        "benefit_strip",
        "A",
        strip,
        ["FACTOR:benefit_weight_table"],
        ["11 CCR § 7152(a)(4)"],
      );
    }
  }

  // Exec C — the determination lead + pointer.
  if (pathways.length || benefits.some((b) => b.weight !== "no affirmative weight")) {
    put(
      "executive_summary:8",
      "exec_determination",
      "B",
      `${cell.conclusion} ${RISK52_FIXED.exec_determination_pointer}`,
      ["FACTOR:balancing_table"],
      ["11 CCR § 7154"],
    );
    // Exec D — outcome.
    put(
      "executive_summary:9",
      "recommended_outcome",
      "B",
      `${RISK52_FIXED.exec_outcome_head} ${outcome}`,
      ["FACTOR:balancing_table", "INTAKE:processing_status"],
      ["11 CCR § 7152(a)(7)", "11 CCR § 7154"],
    );
    // Exec D — compact conditions. A-TEAM S3 RULING VI.21 (doc 115): counts
    // under ten render as words in narrative prose.
    const compact = conditions.length
      ? `The determination depends on ${countWord(conditions.length)} ${
        plural(conditions.length, "Condition", "Conditions")
      } to Proceed: ${
        conditions.map((c) => c.split(":")[0].trim().replace(/\.$/, "")).join("; ")
      }. The full conditions, follow-ups, and recommendations appear in § 4.D.`
      : RISK52_FIXED.conditions_compact_none;
    put(
      "executive_summary:10",
      "conditions_compact",
      "B",
      compact,
      ["FACTOR:conditions_to_proceed"],
      [],
    );
  }

  // ══ II — THE INFORMATION PROVIDED ══════════════════════════════════════════

  // II.A — purpose specificity (two branches).
  if (specificityAnswered) {
    const text = specificityFacets.length >= 3
      ? "The Company confirms the stated Purpose identifies the specific operation supported, the information involved, the consumers affected, and the intended outcome; the assessment proceeds on the Company’s formulation."
      : specificityFacets.length >= 1
      ? `The Company confirms the stated Purpose identifies ${
        asProse(specificityFacets.map((x) => x.toLowerCase()))
      }; it does not confirm the remaining facets the assessment checks. The assessment proceeds on the Company’s formulation, and sharpening the Purpose appears among the Follow-ups in § 4.D.`
      : "The information provided does not confirm that the stated Purpose identifies the operation supported, the information involved, the consumers affected, or the intended outcome; restating the Purpose appears among the Conditions to Proceed in § 4.D.";
    put(
      "ii_information:1",
      "purpose_specificity_analysis",
      "B",
      text,
      ["INTAKE:purpose_specificity_facts"],
      ["11 CCR § 7152(a)(1)"],
    );
  }

  // II.A — out-of-scope branch.
  if (outOfScope === "The affected information is also processed for other activities not covered by this assessment") {
    const oos = clause(intake.out_of_scope_activities);
    put(
      "ii_information:3",
      "out_of_scope",
      "B",
      `${RISK52_FIXED.out_of_scope_lead} ${
        oos ? `“${oos}”.` : "the Company records the additional activities without describing them."
      } ${RISK52_FIXED.out_of_scope_note}`,
      ["INTAKE:out_of_scope_confirmation", "INTAKE:out_of_scope_activities"],
      ["11 CCR § 7156"],
    );
  }

  // II.B — operational sequence.
  {
    const entry = clause(intake.processing_entry_point);
    const m = (intake.processing_methods ?? {}) as Bag;
    const stagePairs: Array<[string, string]> = [
      ["collection", clause(m.collection_method)],
      ["use", clause(m.use_method)],
      ["disclosure", clause(m.disclosure_method)],
      ["retention", clause(m.retention_method)],
      ["other processing", clause(m.other_processing_method)],
    ];
    const stages = stagePairs.filter(([, v]) => v);
    const result = clause(intake.processing_result);
    if (entry || stages.length || result) {
      const parts: string[] = [RISK52_FIXED.operates_lead];
      if (entry) parts.push(`\nEntry. “${entry}”.`);
      if (stages.length) {
        parts.push(`\nStages. ${stages.map(([k, v]) => `${k.charAt(0).toUpperCase()}${k.slice(1)} — “${v}”.`).join(" ")}`);
      }
      if (result) parts.push(`\nOutput. “${result}”.`);
      const missing: string[] = [];
      if (!entry) missing.push("how information enters the process");
      if (!stages.length) missing.push("the processing stages");
      if (!result) missing.push("what the processing produces");
      if (missing.length) {
        parts.push(`\nThe description does not identify ${asProse(missing)}; the limitation is carried into § 2.H.`);
      }
      put(
        "ii_information:5",
        "operational_sequence",
        "A",
        parts.join(""),
        ["INTAKE:processing_entry_point", "INTAKE:processing_methods", "INTAKE:processing_result"],
        ["11 CCR § 7152(a)(3)(A)"],
      );
    }
  }

  // II.C — consumers and the interaction.
  {
    const method = clause(intake.consumer_interaction_method);
    const ipurpose = clause(intake.consumer_interaction_purpose);
    const n = clause(intake.approximate_ca_consumers);
    const dependency = relationshipContext === "Employees or job applicants" ||
      relationshipContext === "Students" ||
      relationshipContext === "Patients or health-service recipients";
    if (method || ipurpose || n || relationshipContext) {
      const bits: string[] = ["C. Consumers and the Interaction."];
      if (method || ipurpose) {
        // The Company's own words in quotation marks (v5.2 register) — the
        // intake values are full phrases whose casing is the Company's.
        const clauses: string[] = [];
        if (method) clauses.push(`The Company interacts with the affected consumers through “${method}”`);
        if (ipurpose) clauses.push(`for the stated purpose of “${ipurpose}”`);
        bits.push(`${clauses.join(", ")}.`);
      }
      if (n) {
        bits.push(`The approximate California scale, as the Company states it, is: “${n}”.`);
      }
      if (relationshipContext) {
        bits.push(
          `The affected consumers are ${relationshipContext.toLowerCase()}${
            dependency
              ? "; because the relationship involves a dependency the consumer cannot easily exit, the choice-architecture analysis in § 3.C carries correspondingly greater weight"
              : ""
          }.`,
        );
      }
      put(
        "ii_information:6",
        "consumer_context",
        "A",
        bits.join(" "),
        ["INTAKE:consumer_interaction_method", "INTAKE:consumer_interaction_purpose", "INTAKE:approximate_ca_consumers", "INTAKE:consumer_relationship_context"],
        ["11 CCR § 7152(a)(3)(C)", "11 CCR § 7152(a)(3)(D)"],
      );
    } else {
      put(
        "ii_information:6",
        "consumer_context",
        "A",
        "C. Consumers and the Interaction. The information provided does not describe the consumer interaction; the limitation is carried into § 2.H.",
        ["INTAKE:consumer_interaction_method"],
        [],
      );
    }
  }

  // II.D — personal information and sensitivity.
  {
    const cats = arr(intake.q4_pi_categories);
    if (cats.length) {
      const spiList = cats.filter((c) => CA_SPI_CATEGORY_KEYS.includes(c));
      const spiBranch = spiList.length
        ? `Of those, ${spiList.length} ${plural(spiList.length, "is", "are")} sensitive personal information — ${
          asProse(spiList)
        } — and ${plural(spiList.length, "its", "their")} presence raises what the information provided must show on necessity, access, disclosure, retention, and the consequences of misuse (§§ 3.B, 4.A).`
        : isYes(intake.q15_sensitive_pi)
        ? "The Company additionally identifies sensitive personal information in its submission, and that identification raises what the information provided must show on necessity, access, disclosure, retention, and the consequences of misuse (§§ 3.B, 4.A)."
        : "No sensitive personal information is identified for the Activity.";
      put(
        "ii_information:7",
        "information_profile",
        "A",
        `D. Personal Information and Sensitivity. The Activity processes ${cats.length} ${
          plural(cats.length, "category", "categories")
        } of personal information: ${cats.join("; ")}. ${spiBranch} Category-level detail, including per-category retention, appears in Appendix C.`,
        ["INTAKE:q4_pi_categories", "INTAKE:q15_sensitive_pi"],
        ["11 CCR § 7152(a)(2)"],
      );
    } else {
      put(
        "ii_information:7",
        "information_profile",
        "A",
        "D. Personal Information and Sensitivity. The information provided does not identify the categories of personal information the Activity processes; the limitation is carried into § 2.H.",
        ["INTAKE:q4_pi_categories"],
        [],
      );
    }
  }

  // II.E — sources.
  {
    const i4b = clause(intake.i4b_sources);
    if (sourceCats.length) {
      const direct = sourceCats.includes("Directly from the consumer");
      const automatic = sourceCats.includes("Automatically from consumer devices or interactions");
      const brokers = sourceCats.includes("From third-party data providers or brokers");
      const providers = sourceCats.includes("From service providers or contractors");
      const publicSrc = sourceCats.includes("From public sources");
      const otherBiz = sourceCats.includes("From another business (merger, partnership, or similar)");
      const consequences: string[] = [];
      if (automatic) {
        consequences.push(
          "information collected automatically from devices or interactions is gathered without a contemporaneous act by the consumer, which raises the weight of the notice and expectation analyses in § 3.C",
        );
      }
      if (brokers) {
        consequences.push(
          "information obtained from third-party data providers carries accuracy and consumer-awareness considerations the Company cannot verify at first hand",
        );
      }
      if (providers || otherBiz) {
        consequences.push(
          "information received through other organizations depends on the collection practices of organizations the Company relies on rather than controls",
        );
      }
      if (publicSrc) {
        consequences.push(
          "information drawn from public sources can be outdated or decontextualized relative to the purpose it is used for",
        );
      }
      const tail = consequences.length === 0 && direct
        ? "Direct collection ties the information to the interaction the consumer participates in, and no source-based consideration is identified on the information provided — which weighs in the Company’s favor."
        : `On the information provided, ${asProse(consequences)}.${
          direct ? " Information supplied directly by the consumer presents no source-based consideration beyond those stated." : ""
        }`;
      put(
        "ii_information:8",
        "sources_analysis",
        "B",
        `E. Sources. The Company identifies the following source ${
          plural(sourceCats.length, "category", "categories")
        }: ${asProse(sourceCats.map((x) => x.toLowerCase()))}. ${tail}`,
        ["INTAKE:source_categories", "INTAKE:i4b_sources"],
        ["11 CCR § 7152(a)(3)(A)"],
      );
    } else if (i4b) {
      put(
        "ii_information:8",
        "sources_analysis",
        "A",
        `E. Sources. The Company identifies the following source or sources: ${i4b}.`,
        ["INTAKE:i4b_sources"],
        ["11 CCR § 7152(a)(3)(A)"],
      );
    } else {
      put(
        "ii_information:8",
        "sources_analysis",
        "A",
        "E. Sources. The information provided does not identify the sources of the personal information; the limitation is carried into § 2.H.",
        ["INTAKE:i4b_sources"],
        [],
      );
    }
  }

  // II.F — recipients (lead/none + table + consequences).
  {
    const recipientRows = rows(intake.recipients).filter((r) => s(r.recipient_name_or_category));
    if (recipientRows.length) {
      put("ii_information:10", "recipients_summary", "A", RISK52_FIXED.recipients_lead, ["INTAKE:recipients"], ["11 CCR § 7152(a)(3)(F)"]);
      const contractStatus = (r: Bag): string => {
        const c = s(r.contractual_protections);
        if (c === "Written contract with the CCPA-required restrictions in place") return "Restrictions confirmed";
        if (c === "Written contract without confirmed CCPA restriction terms") return "Restriction terms not confirmed";
        if (c === "No written contract") return "No written contract reported";
        return "Not confirmed";
      };
      tables["ii_information:11"] = {
        key: "",
        surface: "recipients",
        title: "",
        columns: ["Recipient", "Role", "Information made available", "Purpose of the disclosure", "Contract status"],
        rows: recipientRows.map((r) => [
          s(r.recipient_name_or_category),
          s(r.recipient_type) || "Not classified",
          arr(r.pi_categories_made_available).join("; ") || "Not stated",
          clause(r.disclosure_purpose) || "Not stated",
          contractStatus(r),
        ]),
      };
      const consequences: string[] = [];
      for (const r of recipientRows) {
        const c = s(r.contractual_protections);
        const name = s(r.recipient_name_or_category);
        if (c === "Written contract without confirmed CCPA restriction terms" || c === "Unsure") {
          consequences.push(
            `For ${name}, the required restriction terms are not confirmed, and the reliance the assessment can place on the contractual control is reduced accordingly in § 4.A.`,
          );
        } else if (c === "No written contract") {
          consequences.push(
            `For ${name}, no written contract is reported; the disclosure operates outside a contractual control, and remediation appears among the Recommendations in § 4.D.`,
          );
        }
      }
      if (vendorDependency === "One or more vendors are essential — the processing could not continue without them") {
        const essential = clause(intake.essential_vendors);
        consequences.push(
          `The processing materially depends on ${essential || "one or more vendors the Company records as essential"}.`,
        );
      }
      if (consequences.length) {
        put(
          "ii_information:12",
          "recipient_consequences",
          "B",
          consequences.join(" "),
          ["INTAKE:recipients", "INTAKE:vendor_dependency", "INTAKE:essential_vendors"],
          ["11 CCR § 7152(a)(3)(F)"],
        );
      }
    } else if (Array.isArray(intake.recipients)) {
      put("ii_information:10", "recipients_summary", "A", RISK52_FIXED.recipients_none, ["INTAKE:recipients"], ["11 CCR § 7152(a)(3)(F)"]);
      tables["ii_information:11"] = null;
    }
  }

  // II.G — retention (table + basis).
  {
    const retRows = rows(intake.retention_by_pi_category).filter((r) => s(r.pi_category));
    const overallPeriod = clause(intake.i2_retention_period);
    const overallCriteria = clause(intake.i2_retention_criteria);
    if (retRows.length) {
      tables["ii_information:14"] = {
        key: "",
        surface: "retention",
        title: "",
        columns: ["Information category", "Retention period or criterion"],
        rows: retRows.map((r) => [
          s(r.pi_category),
          s(r.retention_period) || s(r.retention_criteria) || "Not stated",
        ]),
      };
    } else if (overallPeriod || overallCriteria) {
      tables["ii_information:14"] = {
        key: "",
        surface: "retention",
        title: "",
        columns: ["Information category", "Retention period or criterion"],
        rows: [["All categories (as recorded for the Activity)", overallPeriod || overallCriteria]],
      };
    }
    const basis = overallCriteria || clause(intake.i2_retention_detail);
    if (retRows.length || overallPeriod || basis) {
      const basisSentence = basis
        ? `The Company states the basis for these periods as: “${basis}”. `
        : "";
      const perCategoryGap = !retRows.length
        ? " Retention is stated for the Activity as a whole and remains to be established category by category."
        : "";
      put(
        "ii_information:15",
        "retention_basis",
        "B",
        `${basisSentence}Retention remains connected to the Purpose on the information provided.${perCategoryGap}`,
        ["INTAKE:retention_by_pi_category", "INTAKE:i2_retention_period", "INTAKE:i2_retention_criteria"],
        ["11 CCR § 7152(a)(3)(B)"],
      );
    } else {
      put(
        "ii_information:15",
        "retention_basis",
        "B",
        "The Company has not identified how long the personal information involved in the Activity is retained; retention is not established on the information provided.",
        ["INTAKE:retention_by_pi_category", "INTAKE:i2_retention_period"],
        ["11 CCR § 7152(a)(3)(B)"],
      );
    }
  }

  // II.H — prior assessments + record providers.
  {
    const hasPrior = isYes(intake.i9_has_existing_dpia);
    const summary = clause(intake.i9_existing_dpia_summary);
    const priorText = hasPrior
      ? (summary
        ? `${RISK52_FIXED.prior_head} ${RISK52_FIXED.prior_lead} “${summary}”. ${RISK52_FIXED.prior_note}`
        : `${RISK52_FIXED.prior_head} The Company indicates that a prior assessment of this processing was conducted but has not provided a summary of it.`)
      : `${RISK52_FIXED.prior_head} ${RISK52_FIXED.prior_none}`;
    put(
      "ii_information:16",
      "prior_assessments",
      "B",
      priorText,
      ["INTAKE:i9_has_existing_dpia", "INTAKE:i9_existing_dpia_summary"],
      ["11 CCR § 7156(b)"],
    );

    const providers = clause(intake.a8_information_providers);
    const internal = clause(intake.i7_internal_contributors);
    const participants = rows(intake.section_7151_operational_participants)
      .map((p) =>
        `— ${s(p.name)}, ${s(p.role)} — ${clause(p.processing_responsibility)}.`
      )
      .filter((x) => x !== "— , — .");
    const external = clause(intake.i7_external_consultees) || asProse(arr(intake.i7_external_consultees));
    if (providers || internal || participants.length || external) {
      // BATCH 20b (doc 113 S6.2) — the roster is a Rule-4 list, not a
      // fused 108-word paragraph: line seams between the parts, one line
      // per roster item. Sentence bytes unchanged.
      const parts: string[] = [RISK52_FIXED.providers_lead];
      if (providers) parts.push(markInformationProviderItems(providers) + (/[.!?]$/.test(providers) ? "" : "."));
      if (participants.length) parts.push(participants.join("\n"));
      if (internal) parts.push(`Internal participants: ${internal}.`);
      if (external) parts.push(`External participants consulted: ${external}.`);
      parts.push(RISK52_FIXED.providers_close);
      put(
        "ii_information:18",
        "record_providers",
        "A",
        parts.join("\n"),
        ["INTAKE:a8_information_providers", "INTAKE:i7_internal_contributors", "INTAKE:section_7151_operational_participants", "INTAKE:i7_external_consultees"],
        ["11 CCR § 7151", "11 CCR § 7152(a)(8)"],
      );
    }
  }

  // ══ III — ANALYSIS ═════════════════════════════════════════════════════════

  // III.A — triggers applied (Annex T3).
  if (parsedTriggers.length) {
    const paras = parsedTriggers.map((t) => {
      const nMatch = /§\s*7150\(b\)\((\d)\)/.exec(t.cite);
      const shortCite = nMatch ? `§ 7150(b)(${nMatch[1]})` : t.cite;
      return `${shortCite}${t.label ? ` — ${t.label}` : ""} — is engaged: ${
        t.basis || "the information provided supports this trigger."
      }${/[.!?]$/.test(t.basis) ? "" : "."}`;
    });
    for (const u of uncertainSwept) {
      paras.push(
        `${u.replace(/[.!?]\s*$/, "")}: the information provided leaves this trigger unresolved; resolving it appears among the Follow-ups in § 4.D.`,
      );
    }
    put(
      "iii_analysis:2",
      "trigger_application",
      "B",
      paras.join("\n\n"),
      ["DERIVED:applicable_7150_triggers"],
      ["11 CCR § 7150(b)"],
    );
  } else if (uncertainSwept.length) {
    put(
      "iii_analysis:2",
      "trigger_application",
      "B",
      uncertainSwept.map((u) =>
        `${u.replace(/[.!?]\s*$/, "")}: the information provided leaves this trigger unresolved; resolving it appears among the Follow-ups in § 4.D.`
      ).join("\n\n"),
      ["DERIVED:applicable_7150_triggers"],
      ["11 CCR § 7150(b)"],
    );
  } else if (scopeLines.some((x) => x.startsWith("Not engaged"))) {
    put(
      "iii_analysis:2",
      "trigger_application",
      "B",
      "The Company’s answers do not engage any of the significant-risk categories in § 7150(b); a risk assessment is not required for the Activity as described, and this report records that determination.",
      ["DERIVED:applicable_7150_triggers"],
      ["11 CCR § 7150(b)"],
    );
  }

  // III.B — necessity (Annex T4).
  if (necessity.necessary.length) {
    const sentences = necessity.necessary.map((r) =>
      `The information provided supports the necessity of ${s(r.element)}: ${
        clause(r.justification) || "the element is recorded as necessary without further explanation"
      }.`
    );
    put(
      "iii_analysis:4",
      "necessity_supported",
      "A",
      sentences.join(" "),
      ["INTAKE:a2_necessity_set"],
      ["11 CCR § 7152(a)(2)"],
    );
  }
  if (necessity.unnecessary.length || necessity.unsure.length) {
    // PANEL RISK-P1 (2026-08-30). Two defects in the old sentence: (a) the
    // element name is the grammatical subject, so a plural element ("Contact
    // identifiers (name, email, phone) is collected") broke agreement on the
    // report's most consequential finding; (b) where the row carries a
    // recorded basis, Appendix D prints it — asserting "identifies no
    // contribution" in the body contradicted the report's own record
    // (quote-then-deny class). The determination is unchanged: the bucket
    // comes from the Company's own necessity answer, and the sentence now
    // says so, acknowledging the recorded basis where one exists.
    const paras: string[] = necessity.unnecessary.map((r) => {
      const basis = clause(r.justification);
      const consequence =
        "Processing the element creates privacy exposure without a corresponding contribution to the benefits weighed in Section 4, and ceasing or justifying it appears in the Conditions to Proceed.";
      return basis
        ? `The necessity of ${s(r.element)} is not established for the Purpose under assessment: the Company itself records the element as collected but not necessary to the stated purpose, and the basis it records (“${basis}”) does not establish a contribution to that Purpose; the element-level record appears in Appendix D. ${consequence}`
        : `The necessity of ${s(r.element)} is not established: the Company records the element as collected but not necessary to the stated purpose, and the information provided identifies no contribution it makes to the Purpose. ${consequence}`;
    });
    if (necessity.unsure.length) {
      paras.push(
        necessity.unsure.map((r) =>
          `The necessity of ${s(r.element)} is unresolved on the information provided; resolving it appears among the Follow-ups.`
        ).join(" "),
      );
    }
    put(
      "iii_analysis:5",
      "necessity_unsupported",
      "A",
      paras.join("\n\n"),
      ["INTAKE:a2_necessity_set"],
      ["11 CCR § 7152(a)(2)"],
    );
  }
  if (necessity.total) {
    const lead = !necessity.unnecessary.length && !necessity.unsure.length
      ? "The necessity analysis supports the information processed, and that conclusion weighs in the Company’s favor in Section 4."
      : necessity.unnecessary.length
      ? `The necessity analysis is qualified: ${necessity.unnecessary.length} ${
        plural(necessity.unnecessary.length, "element is", "elements are")
      } not shown to be necessary, and that conclusion weighs against the processing in Section 4.`
      : `The necessity analysis is qualified: necessity is not yet established for ${necessity.unsure.length} ${
        plural(necessity.unsure.length, "element", "elements")
      }, and that conclusion weighs against the processing in Section 4 until the Follow-ups in § 4.D are resolved.`;
    put(
      "iii_analysis:6",
      "necessity_conclusion",
      "B",
      lead,
      ["INTAKE:a2_necessity_set"],
      ["11 CCR § 7152(a)(2)"],
    );
  }

  // III.C — notice application.
  {
    const dRows = rows(intake.activity_disclosures).filter((d) => s(d.disclosure_content));
    const noticeGaps: string[] = [];
    if (s(intake.q12_notice_at_collection) === "Yes, partial coverage") {
      noticeGaps.push("the notice at collection covers only part of the collection points");
    }
    if (isNo(intake.q12_notice_at_collection)) noticeGaps.push("no notice at collection is in place");
    if (s(intake.q13_notice_content) === "Some elements") {
      noticeGaps.push("the notice content covers only some of the required elements");
    }
    if (isNo(intake.q13_notice_content)) noticeGaps.push("the notice content is not in place");
    if (s(intake.q11_policy_review) === "Over 24 months ago") {
      noticeGaps.push("the privacy policy was last reviewed more than 24 months ago");
    }
    if (s(intake.q11_policy_review) === "No privacy policy") noticeGaps.push("no privacy policy is published");
    const plannedD = dRows.filter((d) => /^planned/i.test(s(d.status)));
    if (s(intake.q12_notice_at_collection) || s(intake.q13_notice_content) || s(intake.q11_policy_review)) {
      const core = noticeGaps.length === 0
        ? "The Company’s notice posture covers the processing: the privacy policy is current, the notice at collection covers the collection points, and the notice content covers the required elements — which weighs in the Company’s favor."
        : `The Company’s notice posture leaves gaps: ${
          asProse(noticeGaps)
        }. A consumer reading the Company’s notices would not learn the full scope of the processing before it occurs — which weighs against the processing until the notice covers it.`;
      const plannedBranch = plannedD.length
        ? ` ${plannedD.length === 1 ? "A planned disclosure is" : "Planned disclosures are"} treated as part of the transparency posture only on completion, and completion appears among the conditions or recommendations in § 4.D.`
        : "";
      put(
        "iii_analysis:8",
        "notice_application",
        "B",
        `${core}${plannedBranch}`,
        ["INTAKE:q11_policy_review", "INTAKE:q12_notice_at_collection", "INTAKE:q13_notice_content", "INTAKE:activity_disclosures"],
        ["11 CCR § 7152(a)(3)(E)", "11 CCR § 7152(a)(5)(C)"],
      );
    }
  }

  // III.C — expectation application.
  if (expectAll.length) {
    const phrases = divergenceMarkers.map((x) => EXPECTATION_DIVERGENCE[x]);
    const text = divergenceMarkers.length === 0
      ? "On the information provided, the processing occurs during and as part of the interaction the consumer participates in, and no divergence marker the assessment checks applies — which weighs in the Company’s favor."
      : noticeFull
      ? `Because ${asProse(phrases)}, aspects of the processing extend beyond the interaction the consumer participates in; each is disclosed through the notice posture above, and the divergence enters § 4.B at reduced force.`
      : `Because ${
        asProse(phrases)
      }, and the notice does not cover the processing in full, those aspects fall outside the expectations the interaction creates. Unexpected processing is not prohibited, but until the notice covers it, the divergence weighs against the processing in Section 4.`;
    put(
      "iii_analysis:9",
      "expectation_application",
      "B",
      text,
      ["INTAKE:expectation_check", "INTAKE:q12_notice_at_collection", "INTAKE:q13_notice_content"],
      ["11 CCR § 7152(a)(5)(C)"],
    );
  }

  // III.C — choice architecture (branch-complete).
  if (choiceAnswered) {
    const confirmedPhrases = choiceConfirmed.map((x) => CHOICE_CONFIRMATIONS[x]);
    const missingPhrases = choiceMissing.map((x) => CHOICE_CONFIRMATIONS[x]);
    const text = choiceNoneConfirmed
      ? "None of the choice-architecture facts the assessment checks — symmetric presentation of the permission choice, that declining does not degrade the core service, or the absence of steering design elements — can be confirmed on the information provided. Each is treated as a live interference risk and weighs against the processing, and confirming them appears among the Follow-ups in § 4.D."
      : choiceMissing.length === 0
      ? `The Company confirms ${asProse(confirmedPhrases)} — which weighs in the Company’s favor.`
      : `The Company confirms ${asProse(confirmedPhrases)}; it does not confirm ${
        asProse(missingPhrases)
      }. Each unconfirmed fact is treated as a live interference risk — and the assessment relies on the choice architecture only to the confirmed extent.`;
    put(
      "iii_analysis:10",
      "choice_architecture",
      "B",
      text,
      ["INTAKE:choice_architecture_check"],
      ["11 CCR § 7152(a)(5)(D)"],
    );
  }

  // III.D — controls table + application.
  {
    const controlRows: Array<[string, string, string]> = [];
    const know = arr(intake.q6_right_know_multi).join("; ") || s(intake.q6_right_know);
    if (know) controlRows.push(["Right to know", know, "Credited"]);
    if (s(intake.q7_right_delete)) {
      controlRows.push([
        "Right to delete",
        s(intake.q7_right_delete),
        s(intake.q7_right_delete) === "No formal process" ? "Reduced — no formal process" : "Credited",
      ]);
    }
    if (s(intake.q8_right_correct)) {
      controlRows.push([
        "Right to correct",
        s(intake.q8_right_correct),
        s(intake.q8_right_correct) === "No formal process" ? "Reduced — no formal process" : "Credited",
      ]);
    }
    if (s(intake.q9_opt_out)) {
      controlRows.push([
        "Opt-out of sale or sharing",
        s(intake.q9_opt_out),
        isNo(intake.q9_opt_out) ? "Not credited — absent" : "Credited",
      ]);
    }
    if (s(intake.q10_id_verification)) {
      controlRows.push([
        "Identity verification",
        s(intake.q10_id_verification),
        s(intake.q10_id_verification) === "No verification process" ? "Reduced — no formal process" : "Credited",
      ]);
    }
    if (isYes(intake.q15_sensitive_pi) && s(intake.q16_sensitive_limit)) {
      const v = s(intake.q16_sensitive_limit);
      controlRows.push([
        "Limit the use of sensitive personal information",
        v,
        v === "No" || v === "Not yet implemented" ? "Not credited — absent" : "Credited",
      ]);
    }
    if (isAdmt && s(intake.q20_admt_opt_out)) {
      controlRows.push([
        "ADMT opt-out",
        s(intake.q20_admt_opt_out),
        isNo(intake.q20_admt_opt_out) ? "Not credited — absent" : "Credited",
      ]);
    }
    if (controlRows.length) {
      tables["iii_analysis:12"] = {
        key: "",
        surface: "controls",
        title: "",
        columns: ["Control", "Reported status", "Weight credited"],
        rows: controlRows,
      };
      const application = weakControls.length
        ? `Of the ${controlRows.length} controls reported, ${asProse(weakControls)} ${
          plural(weakControls.length, "operates", "operate")
        } without a formal or completed process. A right that cannot be exercised carries no weight: the reduction is carried into Section 4, and strengthening ${
          plural(weakControls.length, "it", "them")
        } appears among the Recommendations in § 4.D.`
        : `The ${controlRows.length} ${
          plural(controlRows.length, "control", "controls")
        } reported ${plural(controlRows.length, "is", "are")} formal and exercisable on the information provided, and each is credited — which weighs in the Company’s favor.`;
      put(
        "iii_analysis:13",
        "controls_application",
        "B",
        application,
        ["INTAKE:q6_right_know", "INTAKE:q7_right_delete", "INTAKE:q8_right_correct", "INTAKE:q9_opt_out", "INTAKE:q10_id_verification", "INTAKE:q16_sensitive_limit", "INTAKE:q20_admt_opt_out"],
        ["11 CCR § 7152(a)(5)(C)"],
      );
    }
  }

  // III.E — ADMT (compressed to one analytical unit).
  if (isAdmt) {
    put(
      "iii_analysis:14",
      "admt_intro",
      "A",
      "E. Automated Decisionmaking Technology. Section 7152(a)(3)(G) requires the report to describe the technology’s role, logic, and output, and §§ 7001(e), 7150(b)(3), 7152(a)(5)(B) and 7152(a)(6)(A)(iv) make human review and accuracy-fairness-bias testing relevant to both the risk analysis and the safeguards. The assessment evaluates what the technology actually does rather than the label applied to it; the full technical record appears in Appendix F.",
      ["INTAKE:q18_admt_use"],
      ["11 CCR § 7152(a)(3)(G)"],
    );

    // Role.
    {
      const desc = clause(intake.q19_admt_description);
      const role = clause(intake.admt_operational_role);
      if (desc || role || admtRoleType) {
        const roleClause = admtRoleType === "The ADMT makes the decision without human involvement"
          ? "making the decision without human involvement"
          : admtRoleType === "The ADMT is a substantial factor in a human decision"
          ? "a substantial factor in a human decision"
          : admtRoleType === "The ADMT supports a human decision without being a substantial factor"
          ? "supporting a human decision without being a substantial factor in it"
          : "";
        // Company clauses quoted (v5.2 register), each closed with a stop so
        // an intake value without terminal punctuation never runs on.
        const quoted = (t: string): string => `“${firstSentence(t).replace(/[.!?]\s*$/, "")}”.`;
        const bits: string[] = [];
        if (desc) bits.push(`The Company identifies the system as: ${quoted(desc)}`);
        if (roleClause) {
          bits.push(`It classifies the system as ${roleClause}${role ? `: ${quoted(role)}` : "."}`);
        } else if (role) {
          bits.push(`The system participates in the processing as follows: ${quoted(role)}`);
        }
        bits.push("The reliability of the output and the reviewer’s ability to depart from it are therefore the operative questions.");
        put(
          "iii_analysis:15",
          "admt_role",
          "B",
          bits.join(" "),
          ["INTAKE:q19_admt_description", "INTAKE:admt_role_type", "INTAKE:admt_operational_role"],
          ["11 CCR § 7152(a)(3)(G)"],
        );
      }
    }

    // Human review — the three-element credit pattern.
    {
      const review = clause(intake.i5_admt_human_review);
      const HRF_PHRASES: Record<string, string> = {
        "Reviewers know how to interpret and use the ADMT's output": "know how to interpret and use the output",
        "Reviewers consider information beyond the ADMT's output": "consider information beyond the output",
        "Reviewers have authority to change or overrule the decision": "have authority to change or overrule the decision",
      };
      const confirmed = humanReviewConfirmed.map((x) => HRF_PHRASES[x]).filter(Boolean);
      const missing = Object.keys(HRF_PHRASES).filter((x) => !humanReviewFacts.includes(x)).map((x) => HRF_PHRASES[x]);
      if (humanReviewFacts.length) {
        const text = noHumanReview
          ? "The Company records that there is no human review of the system’s decisions; the automated component is weighed as deciding, and the related risk in § 4.A carries that weight — which weighs against the processing."
          : confirmed.length === 3
          ? `The Company confirms that reviewers ${asProse(confirmed)} — which weighs in the Company’s favor, and the human review is credited at full weight in § 4.A.`
          : confirmed.length > 0
          ? `The Company confirms that reviewers ${asProse(confirmed)}; it does not confirm that reviewers ${
            asProse(missing)
          }. Human review is credited only to the confirmed extent — and the assessment relies on it only to that extent in § 4.A.`
          : "None of the elements of effective human involvement can be confirmed on the information provided; the review that exists is not shown to change outcomes, and the automated component is weighed as if it decides.";
        put(
          "iii_analysis:16",
          "admt_human_review",
          "B",
          text,
          ["INTAKE:human_review_facts"],
          ["11 CCR § 7001(e)", "11 CCR § 7150(b)(3)"],
        );
      } else if (review) {
        put(
          "iii_analysis:16",
          "admt_human_review",
          "B",
          `The Company describes human review as follows: ${firstSentence(review)} The assessment relies on it to the extent the description supports reviewer understanding, adequate information and time, and authority to reach a different result — and only to that extent in § 4.A.`,
          ["INTAKE:i5_admt_human_review"],
          ["11 CCR § 7001(e)"],
        );
      }
    }

    // Testing + logic + training (each with the Appendix F pointer).
    {
      const accuracy = admtTestingFacts.includes("Tested for accuracy or validity");
      const bias = admtTestingFacts.includes("Tested for discriminatory impact or bias");
      const recent = admtTestingFacts.includes("Testing performed or reviewed within the last 12 months");
      const providerOnly = admtTestingFacts.includes("Testing performed by the provider rather than the Company");
      const noneTyped = admtTestingFacts.includes("No testing has been performed or confirmed");
      if (admtTestingFacts.length) {
        const testGaps: string[] = [];
        if (!accuracy) testGaps.push("accuracy or validity testing");
        if (!bias) testGaps.push("discriminatory-impact testing");
        if (!recent) testGaps.push("testing within the last 12 months");
        const testingText = noneTyped
          ? "No testing has been performed or confirmed for the system, and accuracy and fairness claims carry no evidentiary support — which weighs against the processing until testing is obtained."
          : accuracy && bias && recent
          ? `The Company confirms accuracy and discriminatory-impact testing, performed or reviewed within the last 12 months${
            providerOnly ? ", performed by the provider rather than the Company" : ""
          } — and the related safeguard credit in § 4.A rests on that record${
            providerOnly ? ", with the provider dependency noted" : ""
          }.`
          : `The testing described does not confirm ${asProse(testGaps)}${
            providerOnly ? ", and the testing that exists was performed by the provider rather than the Company" : ""
          }. The credit the related safeguard receives in § 4.A is limited accordingly, and completing the identified testing appears among the Recommendations in § 4.D.`;
        put(
          "iii_analysis:17",
          "admt_testing_analysis",
          "B",
          testingText,
          ["INTAKE:admt_testing_facts"],
          ["11 CCR § 7152(a)(5)(B)", "11 CCR § 7152(a)(6)(A)(iv)"],
        );
      } else if (clause(intake.i5_admt_fairness_testing) && !/^not applicable|^none\b/i.test(clause(intake.i5_admt_fairness_testing))) {
        put(
          "iii_analysis:17",
          "admt_testing_analysis",
          "B",
          "Testing is described in the Company’s submission and provides evidence bearing on accuracy, fairness, and bias; the strength of that evidence is weighed in § 4.A.",
          ["INTAKE:i5_admt_fairness_testing"],
          ["11 CCR § 7152(a)(5)(B)"],
        );
      }
      if (admtLogicDocumented) {
        const logicText = admtLogicDocumented === "The logic is documented and reviewed internally"
          ? "The system’s logic is documented and reviewed internally; the full logic record, including its assumptions and limitations, is preserved in Appendix F."
          : admtLogicDocumented === "The logic is documented by the provider and the Company relies on that documentation"
          ? "The system’s logic is documented by the provider, on whose documentation the Company relies; the record is preserved in Appendix F, with the provider dependency noted in § 2.F."
          : "The system’s logic is not fully documented or understood on the information provided; documenting it appears among the Conditions to Proceed in § 4.D, and the record to date is preserved in Appendix F.";
        put("iii_analysis:17", "admt_logic_note", "B", logicText, ["INTAKE:admt_logic_documented"], ["11 CCR § 7152(a)(3)(G)(i)"]);
      }
      {
        const source = clause(intake.i5_admt_training_source);
        const noneSrc = !source || /^not applicable/i.test(source);
        if (!noneSrc || s(intake.admt_provider_trained_using_pi) || s(intake.q18b_admt_training)) {
          put(
            "iii_analysis:17",
            "admt_training_note",
            "B",
            noneSrc
              ? "Training-data provenance is not identified in the information provided; the gap is carried into the Follow-ups where material, and the technical record appears in Appendix F."
              : "Training-data provenance is identified in the information provided and is preserved in Appendix F.",
            ["INTAKE:i5_admt_training_source"],
            ["11 CCR § 7150(b)(6)", "11 CCR § 7153"],
          );
        }
      }
      // § 7153 — provided to another business (the Appendix A row's factor;
      // the underlying facts also sit in the Appendix F record).
      if (isYes(intake.admt_made_available_to_other_business)) {
        const trained = isYes(intake.admt_provider_trained_using_pi);
        const significant = isYes(intake.recipient_business_uses_admt_for_significant_decision);
        put(
          "iii_analysis:17",
          "admt_made_available",
          "B",
          trained && significant
            ? "The provided-to-another-business facts are established: the technology is made available to another business, is trained using personal information, and is used by the recipient for a significant decision. The recipient business remains responsible for its own risk assessment; Appendix F preserves the facts that assessment requires."
            : "The Company reports that the technology is made available to another business; the training and significant-decision facts preserved in Appendix F frame the scope of the recipient’s own assessment obligation.",
          ["INTAKE:admt_made_available_to_other_business", "INTAKE:admt_provider_trained_using_pi", "INTAKE:recipient_business_uses_admt_for_significant_decision"],
          ["11 CCR § 7153"],
        );
      }
    }

    // The ADMT lead.
    {
      const described = clause(intake.q19_admt_description) &&
        (clause(intake.admt_output) || clause(intake.admt_output_use) || clause(intake.i5_admt_logic));
      const limits = (humanReviewFacts.length > 0 && !noHumanReview && humanReviewConfirmed.length < 3) ||
        (admtTestingFacts.length > 0 &&
          !(admtTestingFacts.includes("Tested for accuracy or validity") &&
            admtTestingFacts.includes("Tested for discriminatory impact or bias")));
      put(
        "iii_analysis:18",
        "admt_conclusion",
        "B",
        described
          ? `The automated component is adequately described for assessment purposes; its risks are carried into Section 4 rather than resolved here${
            limits ? ", with the human-review and testing limits noted weighing on the credit its safeguards receive" : ""
          }.`
          : "The automated component is not yet fully described on the information provided; completing the description appears among the Follow-ups in § 4.D, and the risks it presents are carried into Section 4 on the description to date.",
        ["INTAKE:q19_admt_description", "FACTOR:admt_human_review", "FACTOR:admt_testing_analysis"],
        ["11 CCR § 7152(a)(3)(G)"],
      );
    }
  } else {
    // Not-applicable record: the D→F lettering never shows an unexplained gap.
    put(
      "iii_analysis:14",
      "admt_intro",
      "A",
      "E. Automated Decisionmaking Technology. Not applicable. The information provided does not identify automated decisionmaking technology in this Activity, so the analyses this sub-part would carry are not required. The sub-part lettering is retained so the report reads consistently across assessments.",
      ["INTAKE:q18_admt_use"],
      [],
    );
  }

  // III.F — benefit paragraphs (Annex T2) + lead.
  {
    const paras = benefits.map((b) => {
      if (b.weight === "material weight") {
        const basisClause = b.basis === "Quantified or measurable basis stated"
          ? " — a quantified or measurable basis the balance can credit"
          : b.basis === "Qualitative basis stated"
          ? " — a qualitative basis the balance can credit"
          : "";
        return `The ${b.label} benefit carries material weight: the Company identifies “${b.narrative}”, and supports it with “${b.fact}”${basisClause}.`;
      }
      if (b.weight === "limited weight") {
        return `The ${b.label} benefit carries limited weight: the Company identifies “${b.narrative}” but supplies no supporting information, so the claim is credited as stated rather than as established.`;
      }
      return `No ${b.label} benefit is identified, and none is credited.`;
    });
    put(
      "iii_analysis:20",
      "benefit_paragraphs",
      "B",
      paras.join("\n\n"),
      ["INTAKE:a4_benefit_consumer", "INTAKE:a4_benefit_business", "INTAKE:a4_benefit_other_stakeholders", "INTAKE:a4_benefit_public", "FACTOR:benefit_weight_table"],
      ["11 CCR § 7152(a)(4)"],
    );
    for (const b of benefits) {
      if (b.weight !== "no affirmative weight") {
        const idx = benefits.indexOf(b);
        putFactorOnly(
          `${["consumer", "business", "other_stakeholder", "public"][idx]}_benefit_paragraph`,
          "B",
          paras[idx],
          [`INTAKE:a4_benefit_${["consumer", "business", "other_stakeholders", "public"][idx]}`, "FACTOR:benefit_weight_table"],
          ["11 CCR § 7152(a)(4)"],
        );
      }
    }
    put(
      "iii_analysis:21",
      "benefits_conclusion",
      "B",
      benefitTier === "none"
        ? "No benefit is established in any category; that absence enters the determination in § 4.C."
        : `The strongest benefit established carries ${benefitTier} weight; it enters the determination in § 4.C.`,
      ["FACTOR:benefit_weight_table"],
      ["11 CCR § 7152(a)(4)"],
    );
  }

  // ══ IV — THE BALANCE AND THE DETERMINATION ═════════════════════════════════

  // IV.A — the ledger + T1 paragraphs + rollup.
  tables["iv_determination:1"] = buildRiskLedgerTable(pathways, "risk_ledger");
  if (pathways.length) {
    const ranked = rankPathways(pathways);
    const paras = ranked.map((p) => {
      // Annex T1 opening — the Company's own clauses in quotation marks
      // (v5.2 register: their casing is theirs, not the sentence's).
      const opening = [
        `${p.harm}. `,
        p.data ? `The Company identifies “${p.data}”` : `The Company identifies this risk`,
        p.actor ? `, at risk from “${p.actor}”` : "",
        p.cause ? `: “${p.cause}”` : "",
        ". ",
        `The Company assesses the likelihood as ${p.likelihood.toLowerCase()} and the severity as ${p.severity.toLowerCase()}, and the risk is rated ${p.materiality} before safeguards.`,
      ].join("").replace(/\s+,/g, ",").replace(/\s+:/g, ":").replace(/\s{2,}/g, " ");
      const byStatus = (status: string) =>
        p.safeguards.filter((g) => s(g.safeguard_status) === status)
          .map((g) => firstSentence(s(g.safeguard)).replace(/\.$/, ""));
      const testedList = byStatus("Implemented and tested");
      const untestedList = byStatus("Implemented, not tested");
      const plannedList = byStatus("Planned, not yet implemented");
      let branch: string;
      if (testedList.length) {
        branch =
          `Against it the Company has implemented and tested ${asProse(testedList)}. Safeguards supported by evidence that they operate earn the assessment’s full credit: they materially reduce this risk, and the remaining risk is ${p.residual} — which weighs in the Company’s favor.`;
      } else if (untestedList.length) {
        branch = `The Company’s ${asProse(untestedList)} ${
          plural(untestedList.length, "is", "are")
        } directed at it, but the information provided includes no testing or effectiveness evidence, so the assessment recognizes the ${
          plural(untestedList.length, "control", "controls")
        } without relying on ${
          plural(untestedList.length, "it", "them")
        } at full weight, and the remaining risk stays ${p.residual}; obtaining that evidence is the identified path to reducing it.`;
      } else if (plannedList.length) {
        branch = `The only ${
          plural(plannedList.length, "safeguard", "safeguards")
        } directed at it — ${asProse(plannedList)} — ${
          plural(plannedList.length, "is", "are")
        } planned but not yet operating. A planned safeguard enters this assessment as a Condition to Proceed, not as present protection, and the remaining risk stays ${p.residual}.`;
      } else {
        branch =
          "No safeguard in the information provided is directed at this risk, so it enters the balance at its full level; establishing one appears in the Conditions to Proceed.";
      }
      return `${opening} ${branch}`;
    });
    const closers: string[] = [];
    if (interdependency === "Two or more identified pathways could compound each other") {
      const named = compounding.filter((c) => pathways.some((p) => p.harm === c));
      closers.push(
        `The Company reports that ${
          named.length >= 2 ? asProse(named) : "two or more of the identified risks"
        } could compound each other; the levels above are per-risk, and the interaction weighs as an additional consideration against the processing.`,
      );
    }
    const addressed = [...new Set(pathways.map((p) => p.harm))];
    const remaining = HARM_PATHWAY_OPTS.filter((o) => !addressed.includes(o));
    if (remaining.length) {
      closers.push(
        `For ${remaining.join("; ")}, the information provided identifies no credible path from this Activity to that harm, and ${
          plural(remaining.length, "it is", "they are")
        } not treated as material ${plural(remaining.length, "risk", "risks")}.`,
      );
    }
    put(
      "iv_determination:2",
      "risk_paragraphs",
      "B",
      [...paras, ...closers].join("\n\n"),
      ["INTAKE:a5_harm_pathways", "INTAKE:a6_safeguards", "INTAKE:risk_interdependency_check"],
      ["11 CCR § 7152(a)(5)", "11 CCR § 7152(a)(6)"],
    );
    put(
      "iv_determination:3",
      "risk_rollup",
      "A",
      `Before safeguards, the most serious identified risk stands at ${maxInherent}. After the credits shown, the most serious remaining risk is ${maxResidual}.`,
      ["INTAKE:a5_harm_pathways", "INTAKE:a6_safeguards"],
      ["11 CCR § 7152(a)(5)", "11 CCR § 7152(a)(6)"],
    );
    putFactorOnly(
      "remaining_risk_summary",
      "A",
      `After the credits shown, the most serious remaining risk is ${maxResidual}.`,
      ["INTAKE:a5_harm_pathways", "INTAKE:a6_safeguards", "FACTOR:residual_rule"],
      ["11 CCR § 7152(a)(5)–(6)"],
    );
    if (safeguardRows.length) {
      const bits: string[] = [];
      if (tested.length) bits.push(`${tested.length} ${plural(tested.length, "is", "are")} implemented and tested`);
      if (untested.length) bits.push(`${untested.length} ${plural(untested.length, "is", "are")} implemented without testing evidence`);
      if (planned.length) bits.push(`${planned.length} ${plural(planned.length, "is", "are")} planned`);
      // Safeguards directed at a material risk at implemented status — the
      // CAM's logic-disposition anchor (branch_ref: materialSafeguards).
      const materialSafeguards = safeguardRows.filter((g) =>
        material.some((p) => p.harm === s(g.harm)) &&
        (SAFEGUARD_STATUS_RANK[s(g.safeguard_status)] ?? 0) >= 2
      );
      putFactorOnly(
        "safeguard_posture_summary",
        "A",
        `Of the ${safeguardRows.length} ${plural(safeguardRows.length, "safeguard", "safeguards")} the Company identifies, ${asProse(bits)}${
          materialSafeguards.length
            ? `; ${materialSafeguards.length} ${plural(materialSafeguards.length, "is", "are")} implemented against the material risks`
            : ""
        }. The credit each earns appears risk by risk in § 4.A.`,
        ["INTAKE:a6_safeguards"],
        ["11 CCR § 7152(a)(6)"],
      );
    }
  }

  // IV.B — what weighs for, and what weighs against.
  {
    const pro: string[] = benefits
      .filter((b) => b.weight !== "no affirmative weight")
      .sort((a, b) => (a.weight === "material weight" ? 0 : 1) - (b.weight === "material weight" ? 0 : 1))
      .map((b) => `— The ${b.label} benefit — ${b.weight === "material weight" ? "material" : "limited"} weight (§ 3.F).`);
    for (const p of rankPathways(pathways)) {
      if (MATERIALITY_RANK[p.residual] < MATERIALITY_RANK[p.materiality]) {
        const letter = /^\(([A-H])\)/.exec(p.harm)?.[1];
        pro.push(`— Tested safeguards reduce the ${letter ? `(${letter})` : "identified"} risk (§ 4.A).`);
      }
    }
    if (necessity.total && !necessity.unnecessary.length && !necessity.unsure.length) {
      pro.push("— The necessity analysis supports the information processed (§ 3.B).");
    }
    if (weakControls.length === 0 && (s(intake.q7_right_delete) || s(intake.q9_opt_out))) {
      pro.push("— Consumer controls are formal and exercisable (§ 3.D).");
    }
    if (pro.length) {
      put(
        "iv_determination:5",
        "factors_for",
        "A",
        `Weighing in favor of the Activity: ${pro.join(" ")}`,
        ["FACTOR:benefit_weight_table", "FACTOR:necessity_conclusion"],
        ["11 CCR § 7154"],
      );
    }
    const con: string[] = rankPathways(pathways)
      .filter((p) => MATERIALITY_RANK[p.residual] >= 1)
      .sort((a, b) => MATERIALITY_RANK[b.residual] - MATERIALITY_RANK[a.residual])
      .map((p) => `— Remaining ${p.residual}: ${p.harm} (§ 4.A).`);
    if (necessity.unnecessary.length) {
      con.push(
        `— ${necessity.unnecessary.length} ${
          plural(necessity.unnecessary.length, "element", "elements")
        } not shown necessary (§ 3.B).`,
      );
    }
    if (gaps.length) {
      con.push(`— ${plural(gaps.length, "A material risk lacks", "Material risks lack")} an implemented safeguard (§ 4.A).`);
    }
    if (planned.length) {
      con.push("— The safeguard posture depends in part on planned safeguards (§ 4.A).");
    }
    if (divergenceMarkers.length && !noticeFull) {
      con.push("— Processing falls partly outside consumer expectations and notice coverage (§ 3.C).");
    }
    if (choiceNoneConfirmed || (choiceAnswered && choiceMissing.length > 0)) {
      con.push("— Choice-architecture facts unconfirmed (§ 3.C).");
    }
    if (interdependency === "Two or more identified pathways could compound each other") {
      con.push("— Identified risks could compound (§ 4.A).");
    }
    if (con.length === 0 && pathways.length) {
      con.push("— No remaining risk sits above the low level; the considerations against the Activity are correspondingly limited.");
    }
    if (con.length) {
      put(
        "iv_determination:6",
        "factors_against",
        "A",
        `Weighing against the Activity: ${con.join(" ")}`,
        ["FACTOR:residual_rule", "FACTOR:necessity_conclusion"],
        ["11 CCR § 7154"],
      );
    }
  }

  // IV.C — the balance summary table + the determination text.
  if (pathways.length || benefits.some((b) => b.weight !== "no affirmative weight")) {
    const left = benefits
      .filter((b) => b.weight !== "no affirmative weight")
      .map((b) =>
        `${b.label.charAt(0).toUpperCase()}${b.label.slice(1)} benefit — ${
          b.weight === "material weight" ? "material" : "limited"
        }${b.fact ? ` (${firstSentence(b.fact).replace(/\.$/, "")})` : ""}`
      );
    if (!left.length) left.push("No benefit established");
    const rightRisks = rankPathways(pathways)
      .filter((p) => MATERIALITY_RANK[p.residual] >= 1)
      .sort((a, b) => MATERIALITY_RANK[b.residual] - MATERIALITY_RANK[a.residual])
      .map((p) => `${p.harm} — ${p.residual}`);
    const right = rightRisks.length ? rightRisks : ["No remaining risk above the low level"];
    const rowCount = Math.max(left.length, right.length);
    const summaryRows: string[][] = [];
    for (let i = 0; i < rowCount; i++) {
      summaryRows.push([left[i] ?? "", right[i] ?? ""]);
    }
    tables["iv_determination:8"] = {
      key: "",
      surface: "balance_summary",
      title: "",
      columns: ["Benefits established (weight)", "Risks remaining (level)"],
      rows: summaryRows,
      // A-TEAM S4 RULING S2.15 (doc 119) — the legend states that the two
      // columns are qualitative dimensions, not operands of an equation.
      note:
        `${CONSEQUENCE_BAND[consequence]} Benefit weight and risk level are separate qualitative dimensions; the determination applies the methodology in Section 1 rather than a numerical equation.`,
    };
    // A-TEAM S4 RULING S3.2 (doc 119, ChatGPT panel A3) — one cross-labeling
    // sentence maps the § 7154 consequence text onto the executive result's
    // disposition wording; composed from the SAME typed disposition, so no
    // determination changes.
    put(
      "iv_determination:9",
      "determination_text",
      "B",
      `${cell.conclusion} ${cell.materiality} ${cell.effect} ${cellExplanation} ${outcome} In this report's executive result, that consequence is stated as "${CONSEQUENCE_BAND[consequence].replace(/\.$/, "")}."`,
      ["FACTOR:balancing_table", "FACTOR:benefit_weight_table", "FACTOR:residual_rule"],
      ["11 CCR § 7154", "11 CCR § 7152(a)(7)"],
    );
    putFactorOnly(
      "recommended_outcome",
      "B",
      outcome,
      ["FACTOR:balancing_table", "INTAKE:processing_status"],
      ["11 CCR § 7152(a)(7)", "11 CCR § 7154"],
    );
  }

  // IV.D — conditions / follow-ups / recommendations, numbered.
  if (conditions.length) {
    put(
      "iv_determination:11",
      "conditions_to_proceed",
      "B",
      `${RISK52_FIXED.conditions_lead}\n${
        conditions.map((c, i) => `${i + 1}. ${c}.`).join("\n")
      }\n${RISK52_FIXED.conditions_close}`,
      ["FACTOR:planned_safeguards", "FACTOR:necessity_conclusion", "FACTOR:safeguard_gaps"],
      ["11 CCR § 7154"],
    );
  }
  if (followUps.length) {
    put(
      "iv_determination:12",
      "required_assessment_follow_up",
      "B",
      `${RISK52_FIXED.follow_ups_lead}\n${followUps.map((f, i) => `${i + 1}. ${f}.`).join("\n")}`,
      ["FACTOR:uncertain_elements", "DERIVED:record_complete"],
      [],
    );
  }
  if (recommendations.length) {
    put(
      "iv_determination:13",
      "recommendations",
      "B",
      `${RISK52_FIXED.recommendations_lead}\n${recommendations.map((r, i) => `${i + 1}. ${r}.`).join("\n")}`,
      ["FACTOR:untested_safeguards", "FACTOR:planned_safeguards"],
      [],
    );
  }
  if (!conditions.length && !followUps.length && !recommendations.length &&
      (pathways.length || benefits.some((b) => b.weight !== "no affirmative weight"))) {
    put(
      "iv_determination:14",
      "none_attach",
      "A",
      RISK52_FIXED.none_attach,
      ["FACTOR:balancing_table"],
      [],
    );
  }

  // ══ V — GOVERNANCE (carried compositions) ══════════════════════════════════

  {
    const reviewers = rows(intake.assessment_reviewers_approvers);
    const migrated = s(intake.a9_approver_name);
    const authority = intake.approver_authority_confirmed;
    if (reviewers.length || migrated || authority !== undefined) {
      if (isYes(authority) && (reviewers.length || migrated)) {
        put(
          "v_governance:1",
          "approval_sufficiency_conclusion",
          "A",
          "The approval record is sufficient for assessment purposes: the reviewers and approvers are identified, and at least one approver is confirmed to have authority over whether the processing proceeds.",
          ["FINAL:assessment_reviewers_approvers", "FINAL:approver_authority_confirmed"],
          ["11 CCR § 7152(a)(9)"],
        );
      } else {
        const identifiedNames = [
          ...reviewers.map((r) => s(r.name)).filter(Boolean),
          ...(!reviewers.length && migrated ? [migrated] : []),
        ];
        put(
          "v_governance:1",
          "approval_follow_up",
          "B",
          identifiedNames.length > 0
            ? `${asProse(identifiedNames)} ${plural(identifiedNames.length, "is", "are")} identified as ${
              plural(identifiedNames.length, "a reviewer or approver", "reviewers and approvers")
            }. Confirmation of ${
              plural(identifiedNames.length, "their", "each person's")
            } authority over whether the processing proceeds remains outstanding and must be completed at finalization before the approval record is sufficient.`
            : "Confirmation of approver authority, or identification of the reviewers and approvers, remains outstanding and must be completed at finalization before the approval record is sufficient.",
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
        }. The 45-day update rule governs that change, and this assessment serves as the update on the information provided. The governance cadence is satisfied by this assessment; the next scheduled review is ${nextReview}.${
          s(intake.material_change_date) ? "" : " The date of the material change should be recorded to complete the governance record."
        }`
        : `No material change since a prior assessment is recorded. The three-year review cadence governs, and the next scheduled review is ${nextReview}.`;
      put(
        "v_governance:6",
        "review_cadence",
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
    if (answered.length > 0) {
      const failing = four.filter(([, v]) => !isYes(v)).map(([label]) => label);
      put(
        "v_governance:9",
        "certifying_executive_eligibility",
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

  return {
    stamp: RISK_FACTOR_ENGINE_STAMP,
    blocks,
    factors,
    tables,
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
