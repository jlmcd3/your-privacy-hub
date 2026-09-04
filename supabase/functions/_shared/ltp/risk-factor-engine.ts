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
import {
  type AdmtDecisionClass,
  claimsSignificantDecisionUnnegated,
  classifyAdmtSignificantDecision,
  hasUnnegatedMatch,
  resolveAdmtSignificantDecision,
} from "./admt-significant-decision.ts";
// DOC 167 — the § 7155 timing resolver the assembler renders; read here so
// the completing Follow-Up is drawn from the same fact (one resolver).
import { initialAssessmentDeadlinePending } from "./risk-timing.ts";
import type { RenderedTable } from "../prose/skeleton-render.ts";
import { boundedPassage, firstSentence } from "./clause-bound.ts";
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

// DOC 148 (2026-09-02, A-Team Batch-8 P0 temporal validation) — the latest
// EXPLICIT period named in a free-text field, as an ISO end-of-period date.
// Deliberately narrow (per-instance rule): only unambiguous quarter-year
// ("Q2 2024") and month-year ("June 2024") tokens count — a bare year is
// never treated as a date, since free text routinely names years as labels
// ("the 2023 Advertiser Performance Report", "24 months of logs"). Returns
// null when no such token appears. An actual dated fact CONTROLS over a
// generic recency selection wherever the two conflict.
const MONTH_NAMES = [
  "january", "february", "march", "april", "may", "june",
  "july", "august", "september", "october", "november", "december",
] as const;
export function latestExplicitPeriodEnd(text: string): string | null {
  const t = s(text);
  if (!t) return null;
  const ends: string[] = [];
  const qre = /\bQ([1-4])\s*(20\d{2})\b/gi;
  let m: RegExpExecArray | null;
  while ((m = qre.exec(t)) !== null) {
    const q = Number(m[1]);
    const y = Number(m[2]);
    const endMonth = q * 3; // 3, 6, 9, 12
    const lastDay = new Date(Date.UTC(y, endMonth, 0)).getUTCDate();
    ends.push(`${y}-${String(endMonth).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`);
  }
  const mre = new RegExp(`\\b(${MONTH_NAMES.join("|")})\\s+(20\\d{2})\\b`, "gi");
  while ((m = mre.exec(t)) !== null) {
    const mi = MONTH_NAMES.indexOf(m[1].toLowerCase() as typeof MONTH_NAMES[number]) + 1;
    const y = Number(m[2]);
    const lastDay = new Date(Date.UTC(y, mi, 0)).getUTCDate();
    ends.push(`${y}-${String(mi).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`);
  }
  if (!ends.length) return null;
  return ends.sort().at(-1) ?? null;
}

/** DOC 148 — ISO date exactly `days` before an ISO date (UTC arithmetic). */
function isoDaysBefore(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString().slice(0, 10);
}

/** DOC 152 (Batch-9 P0) — the SINGLE approval-date currency rule: a
 * review/approval date earlier than this floor (365 days before the
 * assessment date) is a PRIOR review record, not the approval of the
 * current assessment. Exported so the § 5.A narrative composer, the
 * Review-and-Approval table, and the engine's sufficiency branch all
 * consume one derivation (the one-state rule). */
export function riskApprovalCurrencyFloor(assessmentDateIso: string): string {
  return isoDaysBefore(assessmentDateIso, 365);
}

// DOC 144 (2026-09-02) — quote discipline for customer free text spliced into
// engine prose (doc 143 §C sweep). Every intake-derived narrative or name
// renders inside typographic quotes with attribution at the call site, so the
// Company's casing is visibly the Company's and its punctuation cannot break
// the surrounding sentence.
//
// `qPassage` — a multi-sentence narrative value, sentence-bounded through
// `boundedPassage` (abbreviation-aware, never cut mid-clause, terminal stop
// stripped) and quoted. `qName` — a short name-like value (an element, a
// safeguard's first sentence, a recipient), bounded to its first sentence
// and quoted.
const qPassage = (t: unknown): string => `“${boundedPassage(s(t))}”`;
const qName = (t: unknown): string =>
  `“${firstSentence(s(t)).replace(/[.!?]\s*$/, "")}”`;

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

/**
 * DOC 127 PART I (CEO-ratified 2026-08-31) — the normalized disposition.
 * The former flat "do not proceed" band splits on a derivable line: a stop is
 * REMEDIABLE unless a pathway's INHERENT level is Critical (the ratified
 * one-tier residual rule means no safeguard can bring such a risk below the
 * high-risk level, and High/Critical residuals are stop under every benefit
 * tier — so only redesigning the Activity itself can change the inputs).
 * "additional information required" fires when a NAMED risk lacks the
 * likelihood/severity the balance requires and the assessed record alone
 * would otherwise proceed (conservative-only precedence: an information gap
 * can never rescue a failed balance). "no processing decision required" is
 * the discontinued-processing projection, so the cover badge can no longer
 * contradict the body's own outcome sentence.
 */
export type ProcessingConsequence =
  | "proceed"
  | "proceed with conditions"
  | "do not proceed - remediable"
  | "do not proceed - redesign required"
  | "additional information required"
  | "no processing decision required";

/**
 * DOC 127 PART I + §21 ruling — the controlled customer-facing labels (title
 * case on badge surfaces; running prose stays sentence case). Both stop
 * bands share the "Do Not Proceed" label; the path line beneath the badge
 * carries the difference.
 */
export const DISPOSITION_LABEL: Record<ProcessingConsequence, string> = {
  "proceed": "Proceed",
  "proceed with conditions": "Proceed with Conditions",
  "do not proceed - remediable": "Do Not Proceed",
  "do not proceed - redesign required": "Do Not Proceed",
  "additional information required": "Additional Information Required",
  "no processing decision required": "No Processing Decision Required",
};

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

/** RATIFIED LOGIC, RE-REGISTERED STRINGS (v5.2; DOC 127 PART I re-registration
 * 2026-08-31) — recommended-outcome wording, keyed to consequence ×
 * processing status. A stop now always states its path: the remediable
 * branch names the Conditions for Reassessment; the redesign branch states
 * the critical-risk reason and the Activity-level change a different
 * disposition would require; the information-gap branch states what is
 * missing. Precedence: discontinued > stop > information gap > conditions.
 *
 * DOC 142 (2026-09-02) — CEO-ruled state change: a WHOLLY-ABSENT
 * a5_harm_pathways (zero risk rows recorded — distinct from doc 127's
 * named-but-unassessed case) yields "additional information required", not a
 * balancing outcome at all. CEO ruling verbatim: "Yes, a wholly-absent
 * a5_harm_pathways yield 'Additional Information Required' instead of 'Do
 * Not Proceed'." With no risk identified, the substantive balance is not
 * determined in either direction, so this branch precedes the stop branch
 * (the ratified benefits-none stop cell continues to govern every record
 * that DOES carry risk rows — assessed or named-but-unassessed).
 * Precedence: discontinued > wholly-absent gap > stop > named-risk
 * information gap > conditions. */
export function resolveRecommendedOutcome(
  kind: "proceed" | "stop",
  hasConditions: boolean,
  processingStatus: string,
  opts?: {
    readonly criticalInherent?: boolean;
    readonly unassessedCount?: number;
    readonly whollyAbsentRisks?: boolean;
  },
): { outcome: string; consequence: ProcessingConsequence } {
  if (/^discontinued/i.test(processingStatus)) {
    return {
      outcome:
        "No processing decision is required: the Company records the processing as discontinued, and this assessment documents the Activity as conducted.",
      consequence: "no processing decision required",
    };
  }
  if (opts?.whollyAbsentRisks) {
    return {
      outcome:
        "The information provided does not yet support a processing decision: no risk to consumers’ privacy is identified in the intake, so the substantive balance of benefits against risks is not determined. The processing should not begin or continue in reliance on this assessment until the identified information is completed. Provide the missing information identified among the Follow-Ups in § 4.D and update the assessment.",
      consequence: "additional information required",
    };
  }
  const planned = /^planned/i.test(processingStatus);
  if (kind === "stop") {
    const stopSentence = planned
      ? "Do not initiate the processing on the information provided."
      : "Suspend or discontinue the processing on the information provided.";
    if (opts?.criticalInherent) {
      return {
        outcome:
          `${stopSentence} A critical-level privacy risk remains that no safeguard can reduce below the high-risk level; a different disposition would require modifying the Activity itself — reducing the likelihood or severity of the critical risk identified in § 4.A at its source — and reassessing.`,
        consequence: "do not proceed - redesign required",
      };
    }
    return {
      outcome:
        `${stopSentence} To continue with the processing, the Company should satisfy the Conditions for Reassessment stated in § 4.D.`,
      consequence: "do not proceed - remediable",
    };
  }
  if ((opts?.unassessedCount ?? 0) > 0) {
    return {
      outcome:
        "The information provided does not yet support a processing decision: at least one identified risk lacks the recorded likelihood or severity the balance requires. Provide the missing information identified among the Follow-Ups in § 4.D and update the assessment.",
      consequence: "additional information required",
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
    /** The normalized ProcessingConsequence state (machine form). */
    readonly disposition: string;
    /** DOC 127 PART I — the controlled badge label (DISPOSITION_LABEL). */
    readonly disposition_label: string;
    /** DOC 127 PART I — the path/reason line rendered beneath an adverse or
     * information-gated disposition; null for favorable dispositions. */
    readonly path_forward: string | null;
    /** True when a named risk lacks the likelihood/severity the balance
     * requires (drives the honest tier text when no risk was assessable). */
    readonly has_unassessed: boolean;
    /** DOC 135 FOLLOW-UP (deferred item, 2026-09-01) — the count of §4.D
     * Conditions to Proceed / Conditions for Reassessment, so the cover
     * panel can state "Number of Conditions" without re-deriving it. */
    readonly conditions_count: number;
    /** DOC 148 — the RECONCILED engaged-trigger count (§ 7150(b)(3)
     * reconciliation applied), so no consumer re-derives the count from
     * raw scope lines and disagrees with the trigger table. */
    readonly triggers_engaged_count: number;
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

/** DOC 154 (code review, item 25) — every harm a safeguard row is directed
 * at: its primary `harm` plus the `risk_pathway_ids` multi-link the intake
 * collects (RK3-A3 g1). The engine used to link by `harm` alone, so a
 * safeguard the Company linked to two risks was credited against one. */
export function safeguardHarms(g: Bag): string[] {
  const out: string[] = [];
  for (const h of [s(g.harm), ...arr(g.risk_pathway_ids)]) {
    if (h && !out.includes(h)) out.push(h);
  }
  return out;
}
export function safeguardLinksTo(g: Bag, harm: string): boolean {
  return safeguardHarms(g).includes(harm);
}

/** DOC 154 (item 21) — the ONE recorded approval-date resolver every surface
 * consumes (engine sufficiency, § 4.D follow-up, § 5.A narrative, and the
 * Review-and-Approval table). Three surfaces used to read different fields. */
export function resolveRecordedApprovalDate(intake: Bag): string {
  return s(intake.a9_approval_date) || s(intake.assessment_approval_date) ||
    rows(intake.assessment_reviewers_approvers)
      .map((r) => s(r.date) || s(r.review_date) || s(r.approval_date))
      .find(Boolean) || "";
}

/** DOC 154 (item 22) — the ONE "evaluation-stage technology with facts on the
 * record" predicate (the engine's § 3.E gate and the assembler's Appendix E
 * gate used two different fact sets and could disagree). */
export function admtEvaluationFactsPresent(intake: Bag): boolean {
  return [
    intake.q19_admt_description,
    intake.i5_admt_logic,
    intake.admt_operational_role,
    intake.admt_role_type,
    intake.admt_output,
    intake.admt_output_use,
    intake.i5_admt_human_review,
    intake.i5_admt_fairness_testing,
    intake.i5_admt_training_source,
  ].some((v) => clause(v) !== "") ||
    arr(intake.human_review_facts).length > 0 ||
    arr(intake.admt_testing_facts).length > 0;
}
export function admtEvaluationActiveFor(intake: Bag): boolean {
  return s(intake.q18_admt_use) === "In evaluation" && admtEvaluationFactsPresent(intake);
}

/** Capitalize the first character (module-level; used by the § 4.B bullets
 * and the executive compact line). */
function capFirst(t: string): string {
  return t.charAt(0).toUpperCase() + t.slice(1);
}

export function extractPathways(intake: Bag): Pathway[] {
  const safeguardRows = rows(intake.a6_safeguards);
  return rows(intake.a5_harm_pathways).flatMap((p) => {
    const materiality = resolveMateriality(s(p.likelihood), s(p.severity));
    if (!materiality || !s(p.harm)) return [];
    const linked = safeguardRows.filter((g) => safeguardLinksTo(g, s(p.harm)) && s(g.safeguard));
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

/**
 * DOC 127 PART I (CEO-ratified 2026-08-31) — a NAMED harm whose likelihood or
 * severity cannot be resolved to the ratified matrix. `extractPathways` used
 * to drop such a row silently, so a report could print a clean favorable
 * determination while a risk the Company itself named sat outside the
 * analysis entirely. These rows now carry through: they render in the
 * ledgers as "Not assessed", generate a Follow-Up naming the missing
 * field(s), and gate the disposition (conservative-only — see the
 * ProcessingConsequence note).
 */
export interface UnassessedPathway {
  readonly harm: string;
  /** The unresolvable field name(s): "likelihood" and/or "severity". */
  readonly missing: readonly string[];
  /** DOC 144 (2026-09-02) — the raw recorded rating strings (possibly empty),
   * so the widened § 4.A ledger can show what the Company DID record on a
   * row that cannot be assessed, instead of a blanket "Not recorded". */
  readonly likelihood?: string;
  readonly severity?: string;
}

export function extractUnassessedPathways(intake: Bag): UnassessedPathway[] {
  return rows(intake.a5_harm_pathways).flatMap((p) => {
    if (!s(p.harm)) return [];
    if (resolveMateriality(s(p.likelihood), s(p.severity))) return [];
    const missing: string[] = [];
    if (!RISK_MATERIALITY_MATRIX.Minimal[s(p.likelihood) as RiskLikelihood]) missing.push("likelihood");
    if (!RISK_MATERIALITY_MATRIX[s(p.severity) as RiskSeverity]) missing.push("severity");
    return [{
      harm: s(p.harm),
      missing: missing.length ? missing : ["likelihood", "severity"],
      likelihood: s(p.likelihood),
      severity: s(p.severity),
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

/** The element-level necessity determinations table.
 *
 * DOC 144 (2026-09-02, CEO-ratified redesign) — this table now renders INSIDE
 * § 3.B (`iii_analysis:4`), not in an appendix slot: the per-element
 * determinations are analysis, not a register (doc 143 §B row D). The surface
 * name `necessity_matrix` is KEPT so RISK_TABLE_SPECS keying is unchanged.
 * The Basis cell carries the Company's own justification QUOTED ("their
 * casing is theirs"). Zero recorded elements ⇒ `null` — the § 3.B body states
 * the one-line honest posture inline and no empty-table deliverable is
 * emitted (doc 143 §B empty-register suppression).
 */
export function buildNecessityMatrixTable(intake: Bag): RenderedTable | null {
  const rowsData = rows(intake.a2_necessity_set).filter((r) => s(r.element));
  if (rowsData.length === 0) return null;
  return {
    key: "",
    surface: "necessity_matrix",
    title: "",
    columns: ["Element", "Determination", "Basis"],
    rows: rowsData.map((r) => [
      s(r.element),
      s(r.necessity),
      clause(r.justification)
        ? `${qPassage(r.justification)}.`
        : "Recorded without further explanation.",
    ]),
  };
}

/** Appendix D (old E, DOC 144 re-lettering) — the risk × safeguard register
 * (structured fields only;
 * § 4.A carries all analysis prose). Ranked by pre-safeguard level.
 *
 * DOC 144 (2026-09-02) — empty-register suppression: zero named risk rows
 * (assessed or unassessed) ⇒ `null`, so no empty-table deliverable is
 * emitted and the appendix page is suppressed; § 4.A states the zero-a5
 * posture inline (doc 143 §B). */
/** DOC 154 (item 26) — the register cell carries the Company's recorded
 * effectiveness basis beside the status (collected, form-required, and
 * previously printed nowhere). */
function registerSafeguardCell(g: Bag): string {
  const basis = s(g.effectiveness_basis);
  return `${firstSentence(s(g.safeguard))} [${s(g.safeguard_status)}${basis ? `; basis: ${basis}` : ""}]${
    s(g.residual) ? ` — Company residual description: ${clause(g.residual)}` : ""
  }`;
}

export function buildRiskAndSafeguardRegisterTable(intake: Bag): RenderedTable | null {
  const pathways = rankPathways(extractPathways(intake));
  // DOC 127 PART I — named-but-unassessed risks appear in the register too,
  // with their recorded facts and an honest "Not assessed" level.
  const allSafeguardRows = rows(intake.a6_safeguards);
  const unassessedRows = extractUnassessedPathways(intake).map((u) => {
    const raw = rows(intake.a5_harm_pathways).find((r) => s(r.harm) === u.harm) ?? ({} as Bag);
    const linked = allSafeguardRows.filter((g) => safeguardLinksTo(g, u.harm) && s(g.safeguard));
    const safeguardCells = linked.length
      ? linked.map((g) => registerSafeguardCell(g)).join(" | ")
      : "None established.";
    return [
      u.harm,
      `Information: ${clause(raw.data_involved) || "not stated"}. Actor or event: ${clause(raw.actor) || "not stated"}. Source: ${clause(raw.source) || "not stated"}. Cause: ${clause(raw.cause) || "not stated"}.`,
      `Not recorded — the ${asProse(u.missing)} ${plural(u.missing.length, "is", "are")} missing.`,
      "Not assessed",
      safeguardCells,
      "Not assessed",
    ];
  });
  if (pathways.length === 0 && unassessedRows.length === 0) return null;
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
    rows: [
      ...pathways.map((p) => {
        const safeguardCells = p.safeguards.length
          ? p.safeguards.map((g) => registerSafeguardCell(g)).join(" | ")
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
      ...unassessedRows,
    ],
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
export function buildRiskLedgerTable(
  pathways: Pathway[],
  surface: string,
  // DOC 127 PART I — named-but-unassessed risks render as honest "Not
  // assessed" rows after the ranked assessed rows; they are never dropped.
  unassessed: readonly UnassessedPathway[] = [],
): RenderedTable | null {
  const ranked = rankPathways(pathways);
  if (!ranked.length && !unassessed.length) return null;
  const unassessedNote = unassessed.length
    ? "A risk marked “Not assessed” lacks the recorded likelihood or severity the assessment requires; recording it appears among the Follow-Ups in § 4.D."
    : undefined;
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
      // DOC 127 §11 (Phase B, 2026-09-01) — label re-registration (supersedes
      // doc 119 S2.16's LABELS; its substance — the status word visible in
      // the exec row — is kept): "Safeguard credited" implied credit even
      // when the cell said "None established".
      columns: ["Risk", "Safeguard Status", "Residual Risk"],
      rows: [
        ...ranked.map((p) => [
          p.harm,
          p.safeguards.length ? (p.bestStatus ?? "Recorded") : "None established",
          `${p.residual} ${movementMark(p)}`,
        ]),
        ...unassessed.map((u) => [u.harm, "Not evaluated", "Not assessed"]),
      ],
      ...(unassessedNote ? { note: unassessedNote } : {}),
    };
  }
  // DOC 144 (2026-09-02, CEO-ratified redesign; amends the doc-72 ledger
  // shape per doc 143 §B row E) — the § 4.A ledger carries the Company's own
  // recorded Likelihood and Severity ratings (enum words; the renderer
  // badges them) so the ratings no longer exist only in the appendix
  // register. "Remaining risk" is the SAME per-risk residual the ledger has
  // always shown (`p.residual`, the ratified one-tier rule) — no new rating
  // is derived. Two added columns is the doc-143 column-width ceiling.
  return {
    key: "",
    surface,
    title: "",
    columns: [
      "Privacy risk",
      "Likelihood",
      "Severity",
      "Before safeguards",
      "Safeguard credited (status)",
      "Remaining risk",
    ],
    rows: [
      ...ranked.map((p) => [
        p.harm,
        p.likelihood,
        p.severity,
        p.materiality,
        safeguardCreditedCell(p),
        `${p.residual} ${movementMark(p)}`,
      ]),
      ...unassessed.map((u) => [
        u.harm,
        s(u.likelihood) || "Not recorded",
        s(u.severity) || "Not recorded",
        "Not assessed",
        "Not evaluated",
        "Not assessed",
      ]),
    ],
    ...(unassessedNote ? { note: unassessedNote } : {}),
  };
}

// DOC 127 PART I — running-prose band sentences (sentence case per the §21
// casing ruling; the badge surfaces use DISPOSITION_LABEL instead).
const CONSEQUENCE_BAND: Record<ProcessingConsequence, string> = {
  "proceed": "Proceed on the information provided.",
  "proceed with conditions": "Proceed with conditions on the information provided.",
  "do not proceed - remediable": "Do not proceed on the information provided.",
  "do not proceed - redesign required": "Do not proceed on the information provided.",
  "additional information required":
    "No determination is certified on the information provided: additional information is required.",
  "no processing decision required": "No processing decision is required on the information provided.",
};

/** DOC 154 (item 29) — the distinctive stem each q4 category label is matched
 * on inside an out-of-scope exclusion sentence. "Other" has no stem. */
const SCOPE_CONFLICT_STEMS: Readonly<Record<string, RegExp>> = {
  "Contact identifiers (name, email, phone)": /\bcontact (identifiers?|information|details?)\b/i,
  "Device identifiers (IP, cookies, device IDs)": /\bdevice (identifiers?|ids?|data)\b/i,
  "Internet or network activity": /\b(internet|network) activity\b/i,
  "Precise geolocation (GPS-level / specific address)": /\b(precise )?geolocation\b/i,
  "General location (city, region, ZIP, IP-derived)": /\bgeneral location\b|\blocation (data|information)\b/i,
  "Financial information": /\bfinancial (information|data|records?)\b|\bpayment\b/i,
  "Health or medical information": /\b(health|medical) (information|data|records?)\b/i,
  "Biometric information": /\bbiometric/i,
  "Genetic data": /\bgenetic/i,
  "Racial or ethnic origin": /\b(racial|ethnic)/i,
  "Religious or philosophical beliefs": /\b(religious|philosophical)/i,
  "Union membership": /\bunion membership\b/i,
  "Sexual orientation or gender identity": /\b(sexual orientation|gender identity)\b/i,
  "Citizenship or immigration status": /\b(citizenship|immigration)/i,
  "Employment information": /\bemployment (information|data|records?)\b/i,
  "Education information": /\beducation(al)? (information|data|records?)\b/i,
  "Children's data (under 16)": /\b(children|minors?|under[- ]16)\b/i,
};

// ── The engine ────────────────────────────────────────────────────────────────

// ── DOC 167 (2026-09-04, CPPA Risk Batch 13 triage) — shared predicates ──────

// Batch 13 A-Team §8 (NestGrid) — a safeguard the Company records as
// "Implemented, not tested" whose own description reports a testing activity
// ("tabletop exercises are conducted semi-annually"). "Not tested" collapses
// three states the record keeps apart: the control is implemented; testing
// is REPORTED to occur; testing RESULTS or effectiveness evidence were
// supplied. The § 4.A sentence and the § 4.D condition both read this one
// predicate, so the ask names what is actually missing (results/evidence)
// instead of denying testing the Company described. Credit is unchanged:
// a reported exercise is not evidence it was effective.
// Team ratification (doc 167 §C.2): the cue vocabulary is testing-specific —
// no bare "exercise" (privacy text says "exercise their opt-out"), "audit"
// (audit logs are a control, not a test of one) or "validat-" — and the
// match is negation-aware through the fleet's one sentence-scoped negation
// test, so "has not been tested" never reads as describing testing.
const TESTING_REPORTED_RE =
  /\b(tabletop|table-top|(?:incident[- ]response|response|recovery|breach|security|disaster[- ]recovery)[- ](?:exercise|drill)s?|penetration[- ]test\w*|pen[- ]?test\w*|red[- ]team\w*|tested|testing|phishing[- ]simulation\w*)\b/i;

export function safeguardReportsTesting(g: Bag): boolean {
  return s(g.safeguard_status) === "Implemented, not tested" && hasUnnegatedMatch(s(g.safeguard), TESTING_REPORTED_RE);
}

// Batch 13 A-Team §10 (NestWave, Luminary) — the Company answers that the
// technology is NOT trained using personal information while describing the
// training data as pseudonymized / anonymized / aggregated. Under Cal. Civ.
// Code § 1798.140(aa) pseudonymization is a way of processing personal
// information; only deidentified (§ 1798.140(m)) or aggregate consumer
// information (§ 1798.140(b)) falls outside personal information
// (§ 1798.140(v)(3)). The answer is the Company's and is never overridden;
// the tension is stated and completed among the Follow-Ups. Read by the
// § 3.E sentence, the Follow-Up, and the Appendix E cell (assembler).
const TRAINING_PSEUDONYMIZED_RE = /\b(pseudonymi[sz]\w*|anonymi[sz]\w*|aggregat\w*)\b/i;
const TRAINING_DEIDENTIFIED_RE = /\bde-?identif\w*\b/i;

export function admtTrainingPiReconcileNeeded(intake: Bag): boolean {
  if (s(intake.admt_provider_trained_using_pi) !== "No") return false;
  const text = `${s(intake.i5_admt_training_source)} ${s(intake.i5_admt_logic)}`;
  return TRAINING_PSEUDONYMIZED_RE.test(text) && !TRAINING_DEIDENTIFIED_RE.test(text);
}

/** Team ratification (doc 167 §C.2): the Company's OWN cue word(s), as
 * written (lower-cased, deduped, source first), so the § 3.E sentence quotes
 * what the record actually says instead of a fixed "pseudonymized or
 * aggregated" that may name a term the record never used. */
export function admtTrainingPiCueTerms(intake: Bag): string[] {
  const text = `${s(intake.i5_admt_training_source)} ${s(intake.i5_admt_logic)}`;
  const re = new RegExp(TRAINING_PSEUDONYMIZED_RE.source, "gi");
  const out: string[] = [];
  for (const m of text.matchAll(re)) {
    const w = m[0].toLowerCase();
    if (!out.includes(w)) out.push(w);
  }
  return out;
}

// Batch 13 A-Team §5 (NestGrid, Luminary; NestWave is the deliberate
// partial-overlap case) — the same disclosure work was rendered both as
// part of a planned-safeguard Condition and as a planned-disclosure
// Recommendation. Overlap is measured on content stems (stopwords and short
// tokens dropped, crude suffix stemming): the disclosure is "carried" by a
// planned safeguard when at least five of its stems appear in that
// safeguard's text and they are at least half of the disclosure's stems.
// The two clear duplicates share ≥ 8 stems at ≥ 0.67; NestWave's
// vendor-naming disclosure shares 5 at 0.33 and keeps its distinct
// Recommendation, which is the A-Team's own reading of that fixture.
const STEM_STOPWORDS = new Set([
  "the", "and", "for", "with", "will", "that", "this", "from", "into", "onto", "are", "was",
  "were", "been", "being", "its", "their", "they", "them", "all", "any", "each", "who", "which",
  "what", "when", "where", "before", "after", "than", "then", "also", "not", "but", "per", "via",
  "has", "have", "had", "does", "did", "can", "may", "must", "should", "would", "could", "our",
  "your", "about", "under", "over", "within", "between", "new", "added", "add", "page", "screen",
  "section", "company", "consumer", "consumers", "user", "users", "data", "information",
  "personal", "update", "updated",
]);
function contentStems(text: string): Set<string> {
  const out = new Set<string>();
  for (const raw of s(text).toLowerCase().split(/[^a-z0-9]+/)) {
    if (raw.length < 3 || STEM_STOPWORDS.has(raw)) continue;
    const stem = raw.length > 4 ? raw.replace(/(ing|ies|ed|es|ly|s)$/, "") : raw;
    if (stem.length >= 3) out.add(stem);
  }
  return out;
}
export function disclosureCarriedBySafeguard(disclosure: string, safeguard: string): boolean {
  const d = contentStems(disclosure);
  if (d.size === 0) return false;
  const g = contentStems(safeguard);
  let shared = 0;
  for (const stem of d) if (g.has(stem)) shared += 1;
  return shared >= 5 && shared / d.size >= 0.5;
}

// Batch 13 A-Team §7 (NestGrid; Batch 12 §11, 88B4FA24) — payment/billing
// facts inside an Activity whose Purpose does not describe payment
// processing. Cues are read from the Activity-level facts only (sources,
// retention, recipient rows, necessity elements) — NOT from the general
// vendor list (i6_vendors names Stripe on nearly every record) and NOT from
// the q4 "Account log-in or financial-account credentials" label, which also
// covers ordinary log-in credentials. Purpose vocabulary is deliberately
// broad so a Purpose that names payments, billing, subscriptions, purchases,
// invoicing, checkout or transactions is never second-guessed.
const PAYMENT_CUE_RE =
  /\b(payments?|payment processor\w*|billing|chargebacks?|invoic\w*|checkout|subscription (?:fees?|payments?|billing)|stripe|credit card|debit card|card (?:number|data))\b/i;
const PAYMENT_PURPOSE_RE =
  /\b(payments?|billing|subscriptions?|purchas\w*|invoic\w*|checkout|transactions?|orders? fulfil\w*|e-?commerce)\b/i;
function firstSentenceMatching(text: string, re: RegExp): string {
  return s(text).split(/(?<=[.!?])\s+/).find((x) => re.test(x)) ?? s(text);
}
export function paymentScopeFor(intake: Bag): { cue: string; sourceCue: boolean } | null {
  const purposeText = `${clause(intake.primary_activity_purpose)} ${clause(intake.i1_processing_purpose)}`;
  if (PAYMENT_PURPOSE_RE.test(purposeText)) return null;
  const cues: string[] = [];
  const src = s(intake.i4b_sources);
  const sourceCue = PAYMENT_CUE_RE.test(src);
  if (sourceCue) cues.push(firstSentenceMatching(src, PAYMENT_CUE_RE));
  for (const f of [s(intake.i2_retention_detail), s(intake.i2_retention_period)]) {
    if (PAYMENT_CUE_RE.test(f)) cues.push(firstSentenceMatching(f, PAYMENT_CUE_RE));
  }
  const recipientRows = Array.isArray(intake.recipients) ? (intake.recipients as Bag[]) : [];
  for (const r of recipientRows) {
    const t = `${s(r.recipient_name_or_category)} ${clause(r.disclosure_purpose)}`.trim();
    if (PAYMENT_CUE_RE.test(t)) cues.push(t);
  }
  const elements = Array.isArray(intake.a2_necessity_set) ? (intake.a2_necessity_set as Bag[]) : [];
  for (const e of elements) {
    const t = s(e.element);
    if (PAYMENT_CUE_RE.test(t)) cues.push(t);
  }
  if (!cues.length) return null;
  return { cue: cues[0], sourceCue };
}

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
  // DOC 127 PART I — named risks whose likelihood/severity cannot resolve;
  // carried honestly instead of silently dropped.
  const unassessed = extractUnassessedPathways(intake);
  // DOC 142 (2026-09-02) — CEO ruling: a5_harm_pathways wholly absent (zero
  // named risk rows; every named row lands in either `pathways` or
  // `unassessed`, so this is exactly "no named row at all"). The disposition
  // becomes "additional information required" — the assessment-incomplete
  // state — instead of a balancing outcome; see resolveRecommendedOutcome.
  const whollyAbsentRisks = pathways.length === 0 && unassessed.length === 0;
  // DOC 129 RISK (2026-09-01) — the Company's GENERAL safeguard description
  // (impact_intake.safeguards, free text). Never credited (crediting is the
  // ratified per-risk a6_safeguards model); read solely so the report can
  // explain WHY nothing is credited when no per-risk row exists.
  const generalSafeguardsText = clause((intake.impact_intake as Bag | undefined)?.safeguards);
  // DOC 154 (code review, item 4) — "material" means High or Critical. The
  // former materialPathways fallback ("if none reach High, the top level
  // present") promoted LOW risks to material on an all-Low record, so an
  // Unlikely/Minimal risk with no safeguard row drew a Condition to Proceed,
  // a § 4.A condition pointer, and a "material risk lacks a safeguard" § 4.B
  // bullet, and flipped the disposition to Proceed with Conditions. A
  // Moderate uncredited risk now draws a Recommendation; a Low one draws
  // nothing (the ledger states its level).
  const material = pathways.filter((p) => MATERIALITY_RANK[p.materiality] >= 2);
  const benefits = extractBenefits(intake);
  const benefitTier = bestBenefitTier(benefits);
  const necessity = extractNecessity(intake);
  const isAdmt = isYes(intake.q18_admt_use);
  // DOC 157 (2026-09-03, model-vs-law build; doc 156) — two states hoisted so
  // every surface below reads ONE derivation: the § 7001(ddd) decision
  // resolution (categorical q19a/q19b answer first, free-text classifier
  // fallback — the same resolver gate-eval, the opening, the slots, and the
  // assembler consume) and the § 7001(bbb)(4) under-16 elevation (actual
  // knowledge of under-16 processing IS sensitive-PI processing, whatever
  // the general q15 answer).
  const admtDecision = resolveAdmtSignificantDecision(intake);
  const b3Categorical = admtDecision.source === "categorical";
  const b2Under16Elevated = /^yes/i.test(s(intake.q15b_under16_knowledge)) &&
    s(intake.q15_sensitive_pi) !== "Yes";
  const scopeLines = arr((report.scope_and_triggers as Bag)?.narrative ?? report.scope_and_triggers);
  const rawEngagedLines = scopeLines.filter((x) => x.startsWith("Engaged — "));
  const uncertainLines = scopeLines.filter((x) => /^uncertain/i.test(x));
  // DOC 157 — a stored narrative composed before the (bbb)(4) rule carries no
  // b(2) line for an elevated record; the engaged line is synthesized from
  // the intake (defense-in-depth for replayed records; the gate now passes it
  // for new ones), in the composer's own template form.
  if (b2Under16Elevated && !rawEngagedLines.some((x) => /§\s*7150\(b\)\(2\)/.test(x))) {
    rawEngagedLines.push(
      "Engaged — 11 CCR § 7150(b)(2) (processing sensitive personal information): the record supports this trigger and this activity falls within the risk-assessment obligation.",
    );
  }
  // DOC 148 (2026-09-02, A-Team Batch-8 P0) — § 7150(b)(3) reconciliation at
  // the render chokepoint. Doc 137 built the § 7001(ddd) category gate + FSOR
  // advertising exclusion, but wired it only into risk-opening.ts (S1) and
  // _w9_risk_slots.ts — the "Engaged" narrative line that feeds the exec
  // trigger table and § 3.A came from a gate the classifier never reached.
  // The gate itself is fixed too (gate-eval.ts, this batch); this filter is
  // the defense-in-depth guarantee for replayed/stored records whose
  // narrative still carries the line. An affirmative q18 answer never
  // overrides a materially contradictory q19 description: advertising-only
  // is a DETERMINED non-engagement (§ 7001(ddd)(6)); an unresolved
  // description degrades to Additional Information Required. Never the
  // reverse — a "significant" classification leaves the line untouched.
  // DOC 148 — the doc-139 SPI-unresolved state, hoisted so the § 7150(b)(2)
  // trigger row can carry its qualifier from the SAME predicate the § 4.D
  // follow-up fires on (cross-surface parity; never two derivations).
  const spiCategoryUnresolved = isYes(intake.q15_sensitive_pi) &&
    arr(intake.q4_pi_categories).filter((c) => CA_SPI_CATEGORY_KEYS.includes(c)).length === 0;
  // DOC 150 (2026-09-03, Batch-8 A-Team round 2) — trigger-record
  // transparency states, same construction as the b(2) qualifier: the
  // trigger STAYS engaged on the Company's categorical answer (the doc-148
  // §C.2/§C.3 ruling stands — never inferred wrong), and the row says what
  // the record does not yet describe, completable through existing
  // free-text fields.
  // b(4): the q5b question asks the worker/student/applicant element
  // directly; where NO recorded scenario text shows an employment or
  // educational relationship, the row notes that the observed population's
  // capacity is not separately described.
  const b4CapacityUndescribed = (() => {
    const v = s(intake.q5b_profiling_observation);
    const affirmed = /^yes$/i.test(v) ||
      v === "Yes — systematic observation of workers/students/applicants" ||
      /^both$/i.test(v);
    if (!affirmed) return false;
    // DOC 154 (item 24) — the structured relationship answer establishes the
    // capacity directly; it was previously ignored in favor of keyword
    // scanning of the free text alone.
    const ctx = s(intake.consumer_relationship_context);
    // DOC 157 — the two capacities the list lacked (independent contractors;
    // educational-program applicants) establish it directly.
    if (
      ctx === "Employees or job applicants" || ctx === "Students" ||
      ctx === "Independent contractors" || ctx === "Educational-program applicants"
    ) return false;
    const scenarioText = [
      intake.subject_anchor,
      intake.primary_activity_name,
      intake.primary_activity_purpose,
      intake.i1_processing_purpose,
      intake.q19_admt_description,
      intake.i5_admt_logic,
      intake.q3_sector,
    ].map(s).join("\n");
    return !/\b(employees?|employment|workers?|workforce|contractors?|staff|personnel|HR\b|recruit(ing|ment)?|hiring|job applicants?|students?|educational[- ]program|keystroke|productivity (scor|monitor)|telematics)\b/i
      .test(scenarioText);
  })();
  // b(6): the training answer names significant-decision use, but the
  // recorded system description does not identify a § 7001(ddd) decision.
  // DOC 157 — the categorical answer (also asked for the trained model when
  // q18 is not "Yes") resolves the trained decision; text is the fallback.
  // "Unidentified" = no categorical answer and the description names no
  // category; "contradicted" = the Company's own categorical answer names
  // no significant-decision category while q18b says the training is for
  // significant decisions (a reconcile Follow-Up, never "not identified").
  const b6Training = /^Yes — training ADMT for significant decisions/.test(s(intake.q18b_admt_training));
  const b6TrainedDecisionUnidentified = b6Training && !b3Categorical && admtDecision.cls !== "significant";
  const b6TrainedDecisionContradicted = b6Training && b3Categorical && admtDecision.cls !== "significant";
  // DOC 152 (2026-09-03, Batch-9) — the ADMT operand group, hoisted ABOVE
  // the follow-up/condition generators so the § 4.D actions and the § 3.E
  // narrative read ONE state (batch 962f9090: § 3.E promised a Condition
  // the isAdmt-gated generator never created for an "In evaluation"
  // record — the promise-parity defect).
  const admtRoleType = s(intake.admt_role_type);
  const admtLogicDocumented = s(intake.admt_logic_documented);
  const humanReviewFacts = arr(intake.human_review_facts);
  const admtTestingFacts = arr(intake.admt_testing_facts);
  const noHumanReview = humanReviewFacts.includes("There is no human review");
  const humanReviewConfirmed = humanReviewFacts.filter((x) =>
    x !== "None of the above can be confirmed" && x !== "There is no human review"
  );
  // DOC 154 (item 22) — the module-level predicate is the one state shared
  // with the assembler's Appendix E gate.
  const admtEvaluationActive = admtEvaluationActiveFor(intake);
  // DOC 154 (item 9) — "adequately described" is hoisted so the § 3.E lead's
  // "completing the description appears among the Follow-ups" promise and
  // the Follow-Up itself share one predicate.
  const admtDescribed = clause(intake.q19_admt_description) !== "" &&
    (clause(intake.admt_output) !== "" || clause(intake.admt_output_use) !== "" || clause(intake.i5_admt_logic) !== "");
  const admtDescriptionGaps: string[] = [];
  if (!clause(intake.q19_admt_description)) admtDescriptionGaps.push("the system description");
  if (!clause(intake.i5_admt_logic)) admtDescriptionGaps.push("its logic");
  if (!clause(intake.admt_output) && !clause(intake.admt_output_use)) admtDescriptionGaps.push("its output and how the output is used");
  // One predicate drives the § 3.E logic sentence AND its § 4.D object —
  // by construction they can never diverge again.
  const admtLogicUndocumented = admtLogicDocumented === "The logic is not fully documented or understood" ||
    admtLogicDocumented === "Unsure";
  // Training-provenance gap is MATERIAL exactly when the Company's own
  // § 7150(b)(6) answer puts the training record in scope.
  const admtTrainingProvenanceGap =
    (!clause(intake.i5_admt_training_source) || /^not applicable/i.test(clause(intake.i5_admt_training_source))) &&
    /^Yes/.test(s(intake.q18b_admt_training));
  // DOC 153 (2026-09-03, batch 736df0ad) — the testing sentence in § 3.E and
  // its § 4.D Recommendation share ONE derivation (the doc-152 promise-parity
  // rule extended to testing): an "In evaluation" record with testing facts,
  // or a deployed system whose only gap is recency, used to promise a
  // Recommendation the isAdmt-gated generator never made.
  const admtTestAccuracy = admtTestingFacts.includes("Tested for accuracy or validity");
  const admtTestBias = admtTestingFacts.includes("Tested for discriminatory impact or bias");
  const admtTestRecentClaimed = admtTestingFacts.includes("Testing performed or reviewed within the last 12 months");
  const admtTestingDatedEnd = latestExplicitPeriodEnd(s(intake.i5_admt_fairness_testing));
  const admtTestRecencyConflict = admtTestRecentClaimed && admtTestingDatedEnd !== null &&
    admtTestingDatedEnd < isoDaysBefore(assessmentDate, 365);
  const admtTestRecent = admtTestRecentClaimed && !admtTestRecencyConflict;
  const admtTestNoneTyped = admtTestingFacts.includes("No testing has been performed or confirmed");
  const admtTestGapKinds: string[] = [];
  if (!admtTestAccuracy) admtTestGapKinds.push("accuracy or validity testing");
  if (!admtTestBias) admtTestGapKinds.push("discriminatory-impact testing");
  if (!admtTestRecent) admtTestGapKinds.push("testing within the last 12 months");
  const admtTestingRecommended = (isAdmt || admtEvaluationActive) && admtTestingFacts.length > 0 &&
    !admtTestNoneTyped && admtTestGapKinds.length > 0;
  // DOC 153 — the Company's "significant decision" characterization is tested
  // against the FULL description (the doc-152 check read the clipped sentence
  // and missed a claim in a second sentence); the classifier's three classes
  // each get their own answer in § 3.E and Appendix E.
  // DOC 167 (Batch 13 review) — the bare regex this used to be
  // (`/significant\s+decision/i.test(...)`) matched the phrase inside an
  // express disclaimer ("No significant decisions ... are made") just as
  // readily as an affirmative claim, so a Company that explicitly denied a
  // significant decision was rendered as having "characterized" one.
  // `claimsSignificantDecisionUnnegated` applies the same sentence-scoped
  // negation test the category classifier already uses.
  const admtClaimsSignificant = claimsSignificantDecisionUnnegated(s(intake.q19_admt_description));
  const admtClaimClass = classifyAdmtSignificantDecision(s(intake.q19_admt_description));
  const admtClaimUnplaced = admtClaimsSignificant && admtClaimClass === "unresolved";
  // DOC 167 — one predicate for the § 3.E sentence, the Follow-Up and the
  // Appendix E cell (see admtTrainingPiReconcileNeeded above).
  const admtTrainingPiUnreconciled = admtTrainingPiReconcileNeeded(intake);
  // Activity-scope reconciliation: a q4 category whose leading word appears
  // inside an exclusion-cue sentence of the out-of-scope description is a
  // cross-surface contradiction the record must resolve (sentence-scoped,
  // per the doc-138 negation-scoping pattern; short generic heads skipped).
  const scopeConflictCategories = (() => {
    const oosText = clause(intake.out_of_scope_activities);
    if (!oosText) return [] as string[];
    const exclusionSentences = oosText.split(/(?<=[.!?])\s+/).filter((x) =>
      /\b(not included|excluded|not part of|outside (of )?this|handled under a separate)\b/i.test(x)
    );
    if (!exclusionSentences.length) return [] as string[];
    return arr(intake.q4_pi_categories).filter((c) => {
      // DOC 154 (item 29) — the former first-word match turned the q4 label
      // "Other" into \bOther\b (matching almost every exclusion sentence)
      // and "General" into a bare adjective; each label now carries its own
      // distinctive stem, and a label with none is never matched.
      const re = SCOPE_CONFLICT_STEMS[c];
      if (!re) return false;
      return exclusionSentences.some((x) => re.test(x));
    });
  })();
  const b3Class: AdmtDecisionClass | null = s(intake.q18_admt_use) === "Yes" ? admtDecision.cls : null;
  const b3EngagedLine = rawEngagedLines.find((x) => /§\s*7150\(b\)\(3\)/.test(x));
  // DOC 157 — a categorical non-engagement (advertising only / outside every
  // category / § 7001(ddd)(2) housing exclusion) is intake-derived and renders
  // whether or not a stored narrative carries an engaged line (the doc-154
  // construction); the text-derived reconciliation keeps the doc-148 gating.
  const b3Reconciled: Exclude<AdmtDecisionClass, "significant"> | null = b3Categorical
    ? (b3Class !== null && b3Class !== "significant" ? b3Class : null)
    : (b3EngagedLine !== undefined && (b3Class === "advertising_only" || b3Class === "unresolved")
      ? b3Class
      : null);
  // DOC 157 — the cross-check on a categorical record: the description names
  // a § 7001(ddd) category the Company did not select. The categorical answer
  // governs the trigger row; the contradiction draws a Follow-Up and keeps the
  // assessment requirement (the doc-148 conservative rule for contradicted
  // records, applied here in place of a silent downgrade).
  const b3TextContradiction = b3Categorical && b3Reconciled !== null && admtDecision.textClass === "significant";
  const admtDecisionRecorded = arr(intake.q19a_decision_categories).join("; ");
  // DOC 154 (2026-09-03, code review) — the other non-Yes trigger answers are
  // reconciled at this same chokepoint (the doc-148 pattern). The gate
  // evaluator treated ANY non-negative answer as engaged, so:
  //  * q15_sensitive_pi = "Unsure" rendered § 7150(b)(2) as Engaged with no
  //    qualifying fact — it is an UNRESOLVED state (Additional Information
  //    Required + a Follow-Up), never an engagement;
  //  * q18_admt_use = "In evaluation" with a category-matching description
  //    rendered § 7150(b)(3) as Engaged while § 3.E said the trigger applies
  //    only to deployed use — evaluation is a determined NON-engagement on
  //    that answer, stated with the update-before-deployment condition.
  // The gate (gate-eval.ts) now blocks both with distinct reasons; this
  // filter is the defense-in-depth guarantee for stored narratives.
  const b2EngagedLine = rawEngagedLines.find((x) => /§\s*7150\(b\)\(2\)/.test(x));
  // DOC 157 — an under-16 elevated record is engaged, never unresolved.
  const b2Unresolved = s(intake.q15_sensitive_pi) === "Unsure" && !b2Under16Elevated;
  const b3Evaluation = s(intake.q18_admt_use) === "In evaluation" && b3EngagedLine !== undefined;
  const reconciledLines = new Set<string>();
  if (b3Reconciled && b3EngagedLine) reconciledLines.add(b3EngagedLine);
  if (b3Evaluation && b3EngagedLine) reconciledLines.add(b3EngagedLine);
  if (b2Unresolved && b2EngagedLine) reconciledLines.add(b2EngagedLine);
  const engagedLines = rawEngagedLines.filter((x) => !reconciledLines.has(x));
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
      safeguardLinksTo(g, p.harm) && (SAFEGUARD_STATUS_RANK[s(g.safeguard_status)] ?? 0) >= 2
    )
  );
  // DOC 154 (item 4) — a Moderate risk with no safeguard row at all (not
  // even a planned one) draws a Recommendation, never a Condition.
  const moderateGaps = pathways.filter((p) =>
    p.materiality === "Moderate" && !safeguardRows.some((g) => safeguardLinksTo(g, p.harm))
  );
  // DOC 154 (item 5) — every named risk lacks the likelihood/severity the
  // balance requires: no assessed risk side exists, so no cell conclusion
  // or "no remaining risk above the low level" line may render.
  const unassessedOnly = pathways.length === 0 && unassessed.length > 0;

  // DOC 127 PART I — the balancing cell's stop/proceed kind is resolved here
  // (same ratified table lookup as § 4.C uses below) because the condition
  // generators need it: a remediable stop must always state its path. A stop
  // requires Activity redesign exactly when a pathway's INHERENT level is
  // Critical — the one-tier residual rule means no safeguard can bring it
  // below High, and High/Critical residuals are stop under every benefit
  // tier, so safeguards and benefits alone can never change that outcome.
  const cellKind = RISK_BALANCING_TABLE[benefitTier][maxResidual].kind;
  const redesignRequired = cellKind === "stop" &&
    pathways.some((p) => p.materiality === "Critical");
  // A stop driven by a High/Critical remaining risk whose credited safeguard
  // is implemented but untested is remediable by testing evidence; that
  // action escalates from recommendation to condition so the stop's path is
  // stated (it was previously only a recommendation, which could leave a
  // remediable stop with zero conditions).
  const untestedStopDrivers = cellKind === "stop"
    ? pathways.filter((p) =>
      MATERIALITY_RANK[p.residual] >= 2 && p.bestStatus === "Implemented, not tested")
    : [];
  const untestedEscalatedHarms = new Set(untestedStopDrivers.map((p) => p.harm));

  // Conditions / follow-ups / recommendations (typed derivations, carried).
  const conditions: string[] = [];
  // DOC 144 (2026-09-02, doc 143 §C sweep) — intake-derived names in § 4.D
  // items (safeguard first-sentences, element names, recipient names) render
  // quoted; the imperative frame around them is unchanged.
  for (const g of planned) {
    const addresses = safeguardHarms(g);
    conditions.push(
      `Complete implementation of the planned safeguard: ${qName(g.safeguard)}${
        addresses.length ? ` (addresses: ${asProse(addresses)})` : ""
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
      `Cease processing, or establish the necessity of, ${asProse(necessity.unnecessary.map((r) => `“${s(r.element)}”`))}`,
    );
  }
  // DOC 148 (2026-09-02, A-Team Batch-8 P1) — condition deduplication. A
  // material risk whose only safeguard is PLANNED sits in `gaps` (rank 1 <
  // 2), so it used to draw BOTH the planned-completion condition above and
  // this establish-a-safeguard condition — two conditions describing one
  // closure requirement. The gap condition now fires only where no
  // safeguard row at all is directed at the risk; `gaps` itself is
  // unchanged (the § 4.B weighs-against bullet and the § 4.A no-safeguard
  // branch still read the full set, and both remain true for a
  // planned-only risk).
  for (const p of gaps) {
    const plannedCovers = safeguardRows.some((g) =>
      safeguardLinksTo(g, p.harm) && s(g.safeguard_status) === "Planned, not yet implemented"
    );
    if (plannedCovers) continue;
    conditions.push(
      `Establish and implement a safeguard addressing the material risk: ${p.harm}`,
    );
  }
  // DOC 127 PART I (CEO-ratified 2026-08-31) — a stop always states its path.
  // (1) A no-benefit stop is remediable by establishing the benefit record;
  //     it previously generated no condition at all, so the report said
  //     "Do not proceed" beside "No conditions attach to the determination."
  if (cellKind === "stop" && benefitTier === "none") {
    conditions.push(
      "Identify at least one benefit of the Activity — to the consumer, the business, other stakeholders, or the public — and support it with specific information (§ 3.F)",
    );
  }
  // (2) The untested-safeguard stop drivers (see untestedStopDrivers above).
  for (const p of untestedStopDrivers) {
    // DOC 167 (Batch 13 A-Team §8) — where the untested safeguard's own text
    // reports a testing activity, the ask names the missing results or
    // effectiveness evidence rather than testing itself (same predicate as
    // the § 4.A sentence).
    conditions.push(
      p.safeguards.some(safeguardReportsTesting)
        ? `Obtain and record the results or effectiveness evidence of the testing the Company describes for the safeguard credited against the risk: ${p.harm}`
        : `Obtain implementation and testing evidence for the safeguard credited against the risk: ${p.harm}`,
    );
  }

  const followUps: string[] = [];
  // DOC 139 (2026-09-02) — external legal review on doc 137/138 (row
  // us-ds2-mtjlerdl-tti856): q15_sensitive_pi (Yes/No) and the q4 category
  // inventory (filtered against CA_SPI_CATEGORY_KEYS, the statutory taxonomy)
  // are independent intake fields never designed to cross-validate each
  // other. When q15 answers Yes but none of the reported q4 categories maps
  // to a true statutory SPI category, the qualifying category is genuinely
  // unresolved on the record — this mirrors deriveActivitySpiInventory's
  // fallback sentence (risk-skeleton-assemble.ts) and keeps that gap out of
  // a report that otherwise shows zero conditions/follow-ups.
  if (spiCategoryUnresolved) {
    followUps.push(
      "Identify the qualifying statutory sensitive-personal-information category the Company’s Yes answer relies on; none of the reported personal-information categories maps to a Cal. Civ. Code § 1798.140(ae) sensitive-PI category on the information provided",
    );
  }
  // DOC 154 (item 1) — the unresolved § 7150(b)(2) state completes here; the
  // exec digest row and the § 3.A paragraph point at this Follow-Up.
  if (b2Unresolved) {
    followUps.push(
      "Determine whether the Activity processes sensitive personal information; the Company answers “Unsure”, and § 7150(b)(2) turns on that fact",
    );
  }
  // DOC 154 (item 27) — the under-16 answer is a recorded fact the record
  // never carried anywhere; "Unsure" completes here, "Yes" is stated in § 2.D
  // and weighs in § 4.B.
  if (s(intake.q15b_under16_knowledge) === "Unsure") {
    followUps.push(
      "Determine whether the Activity knowingly processes the personal information of consumers under 16; the Company answers “Unsure”",
    );
  }
  // DOC 148 (A-Team Batch-8 P0) — the § 7150(b)(3) unresolved-category state
  // completes among the Follow-Ups (the advertising-only state is a
  // determined non-engagement and needs no follow-up).
  // DOC 157 — § 7001(bbb)(4) elevation: the sensitive-PI sub-questions
  // (volume, Limit-the-Use mechanism, basis) are asked only on a q15 "Yes",
  // so an elevated record completes them here; the § 3.A row points here.
  if (b2Under16Elevated) {
    followUps.push(
      `Complete the sensitive-personal-information record for the under-16 information — its volume, the mechanism for consumers to limit its use, and the basis for processing it; the Company ${
        s(intake.q15_sensitive_pi) ? `answers “${s(intake.q15_sensitive_pi)}” to` : "records no answer to"
      } processing sensitive personal information, and § 7001(bbb)(4) makes the personal information of consumers it knows are under 16 sensitive personal information`,
    );
  }
  // DOC 157 — the categorical § 7001(ddd) answer contradicted by the
  // description (same predicate as the § 3.A sentence; cross-surface parity).
  if (b3TextContradiction) {
    followUps.push(
      `Reconcile the decision category recorded for the automated decisionmaking technology (“${admtDecisionRecorded}”) with the system description, which describes a decision within a § 7001(ddd) significant-decision category; § 7150(b)(3) turns on the decision actually made, and the assessment treats the trigger as asserted until the two agree`,
    );
  }
  if (b3Reconciled === "unresolved" || admtClaimUnplaced) {
    followUps.push(
      "Identify the significant decision the automated decisionmaking technology makes or facilitates; § 7150(b)(3) turns on a decision within the categories enumerated in § 7001(ddd), and the information provided does not identify one",
    );
  }
  // DOC 167 (Batch 13 A-Team §9) — § 5.B and the Key Dates strip state the
  // initial-assessment deadline as "determination pending — record when the
  // covered processing began"; no Follow-Up ever completed that instruction
  // on any record (promise parity). Drawn from the assembler's own resolver.
  if (initialAssessmentDeadlinePending(intake)) {
    followUps.push(
      "Record when the covered processing began, or will begin; § 7155(a)(1) requires the assessment before the Company initiates processing within § 7150(b), and the December 31, 2027 transition deadline in § 7155(b) applies only to covered processing already underway before January 1, 2026 — the applicable deadline turns on that date",
    );
  }
  // DOC 167 (Batch 13 A-Team §10) — the training-data classification
  // tension; the Company's "No" is preserved, never overridden.
  if (admtTrainingPiUnreconciled) {
    followUps.push(
      // Team ratification (doc 167 §C.2): the § 1798.140(aa) clause is stated
      // only where the record's own cue is pseudonymization.
      `Reconcile the answer that the technology is not trained using personal information with the recorded training-data source ${
        qPassage(s(intake.i5_admt_training_source) || s(intake.i5_admt_logic))
      }: ${
        admtTrainingPiCueTerms(intake).some((t) => /^pseudonym/.test(t))
          ? "pseudonymization is defined in Cal. Civ. Code § 1798.140(aa) as a manner of processing personal information, and § 1798.140(v)(3)"
          : "Cal. Civ. Code § 1798.140(v)(3)"
      } provides that personal information does not include consumer information that is deidentified (§ 1798.140(m)) or aggregate consumer information (§ 1798.140(b)); confirm which of those standards the training data met before training, and update the Appendix E record`,
    );
  }
  // DOC 153 (batch 736df0ad, A-Team §5/§7) — a safeguard recorded as PLANNED
  // but described in operating terms ("is conducted quarterly", "is active")
  // is a status/wording conflict. The quoted text is never rewritten and the
  // conservative planned credit stands; the Company is asked to confirm.
  const IMPLEMENTED_STATE_RE =
    /\b(is|are)\s+(conducted|implemented|in place|active|enforced|applied|performed|maintained|operating|operational|deployed)\b|\b(has|have)\s+been\s+(updated|implemented|deployed|conducted)\b|\bwas\s+(updated|implemented|deployed)\b|\b(updated|implemented|deployed)\s+within\b/i;
  const PLANNED_CUE_RE =
    /\b(will|planned|plans?\s+to|is\s+being|are\s+being|being\s+drafted|to\s+be|scheduled|has\s+been\s+tasked|intends?\s+to|under\s+development|in\s+progress|next\s+release|roll-?out)\b/i;
  const plannedWordingConflicts = planned.filter((g) =>
    IMPLEMENTED_STATE_RE.test(s(g.safeguard)) && !PLANNED_CUE_RE.test(s(g.safeguard))
  );
  // DOC 154 (item 30) — a planned row that ALSO names a past target period
  // draws the doc-148 dated Follow-Up below; the wording Follow-Up yields to
  // it so one row never draws two status questions.
  for (const g of plannedWordingConflicts) {
    const datedEnd = latestExplicitPeriodEnd(s(g.safeguard));
    if (datedEnd && datedEnd < assessmentDate) continue;
    followUps.push(
      `Confirm the status of the safeguard recorded as planned but described in operating terms — ${qName(g.safeguard)}${
        s(g.harm) ? ` (addresses: ${s(g.harm)})` : ""
      }; the assessment credits it as planned only, and if a component is already operating, record that component separately with its testing status`,
    );
  }
  // DOC 154 (item 26) — the effectiveness-basis answer is cross-checked
  // against the implementation status (it is never credited: the ratified
  // residual rule keys on status alone). Two contradictions are stated:
  // "Implemented and tested" resting on no evidence or design review only,
  // and "Implemented, not tested" claiming validation by testing.
  for (const g of safeguardRows) {
    const status = s(g.safeguard_status);
    const basis = s(g.effectiveness_basis);
    if (
      status === "Implemented and tested" &&
      (basis === "No effectiveness evidence" || basis === "Based on internal design review only")
    ) {
      followUps.push(
        `Reconcile the status and evidence recorded for the safeguard ${qName(g.safeguard)}: it is recorded as implemented and tested, but its effectiveness basis is recorded as “${basis}”; the testing evidence should be identified or the status corrected`,
      );
    } else if (status === "Implemented, not tested" && basis === "Validated by testing against the linked risk") {
      followUps.push(
        `Reconcile the status and evidence recorded for the safeguard ${qName(g.safeguard)}: it is recorded as implemented but not tested, while its effectiveness basis is recorded as validated by testing; the status or the basis should be corrected`,
      );
    }
  }
  // DOC 150 — trigger-record transparency follow-ups (the triggers stay
  // engaged; these complete the record through existing free-text fields).
  if (b4CapacityUndescribed) {
    followUps.push(
      "Describe the population systematically observed for the § 7150(b)(4) trigger and its capacity — employee, independent contractor, student, or job or educational-program applicant of the business — so the record states the facts supporting the Company’s answer",
    );
  }
  if (b6TrainedDecisionContradicted) {
    followUps.push(
      `Reconcile the § 7150(b)(6) answer that personal information trains ADMT for significant decisions with the decision category recorded (“${admtDecisionRecorded}”), which names no significant-decision category; § 7150(b)(6) turns on the decision the trained technology is intended to make or support`,
    );
  }
  if (b6TrainedDecisionUnidentified) {
    followUps.push(
      "Identify the significant decision the technology being trained is intended to make or support; the Company’s § 7150(b)(6) answer names significant-decision training, and the recorded system description does not identify a decision within the § 7001(ddd) categories",
    );
  }
  // DOC 152 (Batch-9 promise parity) — training-data provenance is material
  // exactly when the Company's own § 7150(b)(6) answer puts the training
  // record in scope; the § 3.E sentence renders the same predicate.
  if (admtTrainingProvenanceGap && (isAdmt || admtEvaluationActive)) {
    followUps.push(
      "Identify the provenance of the personal information used to train the technology; the Company’s § 7150(b)(6) answer makes the training record material, and the information provided does not identify it",
    );
  }
  if (scopeConflictCategories.length) {
    followUps.push(
      `Reconcile the Activity’s information scope: the out-of-scope description assigns ${
        asProse(scopeConflictCategories.map((c) => `“${c}”`))
      }-related processing to a separate activity, while this Activity’s personal-information inventory lists ${
        plural(scopeConflictCategories.length, "that category", "those categories")
      }; state what portion is processed for the assessed Purpose, or remove ${
        plural(scopeConflictCategories.length, "it", "them")
      } from this Activity’s inventory`,
    );
  }
  // DOC 150 — § 7152(a)(9) approval date (primary-source verified: the
  // report must document the date of review and approval).
  {
    const revRows = rows(intake.assessment_reviewers_approvers);
    const recordedApprovalDate = resolveRecordedApprovalDate(intake);
    // DOC 152 — same 365-day currency rule as v_governance:1 (one state):
    // a stale date is a PRIOR record and the current assessment's date
    // remains open.
    const currentDateOnRecord = recordedApprovalDate !== "" &&
      /^\d{4}-\d{2}-\d{2}/.test(recordedApprovalDate) &&
      recordedApprovalDate >= riskApprovalCurrencyFloor(assessmentDate);
    if ((revRows.length || s(intake.a9_approver_name) || intake.approver_authority_confirmed !== undefined) && !currentDateOnRecord) {
      followUps.push(
        recordedApprovalDate
          ? `Record the review and approval of this current assessment, including its date; the recorded approval date (${recordedApprovalDate}) is a prior review record, and § 7152(a)(9) requires the report to document the date this assessment was reviewed and approved`
          : "Record the date the assessment was reviewed and approved; § 7152(a)(9) requires the report to document it alongside the reviewers’ and approvers’ names and positions",
      );
    }
  }
  // DOC 148 (A-Team Batch-8 P0 temporal validation) — a safeguard row whose
  // own text names a target period that has already passed cannot rest on
  // an ordinary "planned" or "untested" state: the recorded date controls,
  // and the status requires confirmation. Detection is deliberately narrow
  // (explicit quarter-year / month-year tokens only — latestExplicitPeriodEnd).
  for (const g of planned) {
    const end = latestExplicitPeriodEnd(s(g.safeguard));
    if (end && end < assessmentDate) {
      followUps.push(
        `Confirm the implementation status of the planned safeguard ${qName(g.safeguard)} — the target period recorded for it (through ${end}) has passed`,
      );
    }
  }
  for (const g of untested) {
    const end = latestExplicitPeriodEnd(s(g.safeguard));
    if (end && end < assessmentDate) {
      followUps.push(
        `Confirm the status of the planned component described within the safeguard ${qName(g.safeguard)} — the target period recorded for it (through ${end}) has passed`,
      );
    }
  }
  if (necessity.unsure.length) {
    followUps.push(
      `Establish whether the following ${
        plural(necessity.unsure.length, "element is", "elements are")
      } necessary to the stated purpose: ${asProse(necessity.unsure.map((r) => `“${s(r.element)}”`))}`,
    );
  }
  if (rc && rc.value === false) {
    // DOC 154 (item 32) — the unanswered contract KEYS are form plumbing and
    // no longer print in the customer-facing sentence; the count is enough
    // to direct the Company back to the record (the doc-148 Q-ref rule).
    const emptyCount = arr(rc.empty_required_keys).length;
    followUps.push(
      `Complete the submitted record: ${
        emptyCount
          ? `${countWord(emptyCount)} asked ${plural(emptyCount, "question remains", "questions remain")} unanswered`
          : "the completion check reports the record as incomplete"
      }, and the assessment should be updated once the record is complete`,
    );
  }
  for (const line of uncertainLines) {
    followUps.push(`Resolve the trigger question: ${sweepRegister52(line)}`);
  }
  // DOC 127 PART I — every named-but-unassessed risk generates a Follow-Up
  // naming the missing field(s); the ledgers carry the matching "Not
  // assessed" row.
  for (const u of unassessed) {
    followUps.push(
      `Record the ${asProse(u.missing)} for the identified risk so it can be assessed: ${u.harm}`,
    );
  }
  // DOC 142 (2026-09-02) — the wholly-absent-a5 gap generates the Follow-Up
  // the "Additional Information Required" outcome sentence points to.
  if (whollyAbsentRisks) {
    followUps.push(
      "Identify and record the risk or risks to consumers’ privacy the Activity creates, with the likelihood and severity of each, so the substantive balance can be determined; the intake identifies none",
    );
  }

  // Consumer-control weak markers (typed on the q6–q10 / q16 / q20 enums).
  // DOC 154 (item 14) — a control that is "In progress", "Planned for
  // implementation", or "No formal process in place" is not exercisable
  // today; each is a weak control and its § 3.D row says so.
  const knowMulti = arr(intake.q6_right_know_multi);
  const knowNoFormal = knowMulti.includes("No formal process in place") &&
    knowMulti.every((x) => x === "No formal process in place");
  const optOutPending = s(intake.q9_opt_out) === "In progress";
  const admtOptOutPending = s(intake.q20_admt_opt_out) === "Planned for implementation";
  const weakControls: string[] = [];
  if (knowNoFormal) weakControls.push("the right-to-know process");
  if (s(intake.q7_right_delete) === "No formal process") weakControls.push("the deletion process");
  if (s(intake.q8_right_correct) === "No formal process") weakControls.push("the correction process");
  if (isNo(intake.q9_opt_out) || optOutPending) weakControls.push("the opt-out mechanism");
  if (s(intake.q10_id_verification) === "No verification process") weakControls.push("identity verification");
  if (
    isYes(intake.q15_sensitive_pi) &&
    (s(intake.q16_sensitive_limit) === "No" || s(intake.q16_sensitive_limit) === "Not yet implemented")
  ) weakControls.push("the sensitive-information limit");
  if (isAdmt && (isNo(intake.q20_admt_opt_out) || admtOptOutPending)) weakControls.push("the ADMT opt-out");

  const recommendations: string[] = [];
  // DOC 127 PART I — untested safeguards already escalated to a Condition
  // (stop-driving rows) are not repeated as a recommendation.
  const untestedForRec = untested.filter((g) => !untestedEscalatedHarms.has(s(g.harm)));
  if (untestedForRec.length) {
    // DOC 144 (2026-09-02, doc 143 §C sweep) — the controls are named,
    // quoted, so the recommendation is actionable without the ledger.
    recommendations.push(
      `Obtain implementation or testing evidence for the ${
        plural(untestedForRec.length, "control", "controls")
      } credited without it — ${
        asProse(untestedForRec.map((g) => qName(g.safeguard)))
      } — so the assessment can rely on ${plural(untestedForRec.length, "it", "them")} at full weight`,
    );
  }
  // DOC 154 (item 31) — the former "Track each planned safeguard to
  // completion" recommendation duplicated the Condition every planned row
  // already draws; removed.
  // DOC 154 (item 4) — Moderate risks with no safeguard row at all.
  for (const p of moderateGaps) {
    recommendations.push(
      `Establish a safeguard directed at the moderate risk: ${p.harm}, and record its implementation status`,
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

  // (ADMT operand group hoisted above the § 4.D action-generator region —
  // DOC 152 promise-parity hoist; see the b6TrainedDecisionUnidentified
  // block.)

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
  // DOC 154 (item 16) — the ratified RK3-D threshold (three facets confirm
  // the Purpose) is unchanged; the § 2.A sentence for three facets now names
  // them instead of asserting all four. One or two facets draw the Follow-Up.
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
  // DOC 152 (Batch-9 promise parity) — one predicate, two postures: a
  // DEPLOYED system's undocumented logic conditions the determination; an
  // EVALUATION-stage system's is a non-blocking recommendation (it cannot
  // condition a determination the technology is not yet part of). The § 3.E
  // sentence renders the SAME branch, so narrative and § 4.D never diverge.
  if (admtLogicUndocumented && isAdmt) {
    conditions.push(
      "Document the logic of the automated decisionmaking technology, including its assumptions and limitations, so the assessment can evaluate it",
    );
  } else if (admtLogicUndocumented && admtEvaluationActive) {
    recommendations.push(
      "Document the logic of the technology under evaluation, including its assumptions and limitations, before any deployment for decisions",
    );
  }
  if (admtTestingRecommended) {
    recommendations.push(
      `Complete the identified testing of the automated system — ${asProse(admtTestGapKinds)} — and record the results in the assessment record`,
    );
  }
  if (weakRecipients.length) {
    // DOC 144 (2026-09-02, doc 143 §C sweep) — the recipients are named,
    // quoted ("their casing is theirs"); the imperative frame is kept.
    recommendations.push(
      `Put a written contract with the required restrictions in place for ${
        asProse(weakRecipients.map((r) => `“${s(r.recipient_name_or_category)}”`))
      }, and record ${
        plural(weakRecipients.length, "its terms", "the terms of each")
      } in the assessment record`,
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
    // DOC 127 PART I — the two derivations that split the stop band and gate
    // the information-required band (conservative-only precedence: a stop
    // stands even when a named risk is unassessed; the gap joins Follow-Ups).
    // DOC 142 (2026-09-02) — the wholly-absent-a5 gap outranks the stop band
    // (CEO ruling; see resolveRecommendedOutcome's header).
    {
      criticalInherent: redesignRequired,
      unassessedCount: unassessed.length,
      whollyAbsentRisks,
    },
  );
  // DOC 157 (2026-09-03, doc 156 items 11 and 13) — the Company's OWN answer
  // to the § 7152(a) weighing (impact_intake.benefitsOutweigh, collected and
  // never read) and its § 7152(a)(7) decision (final_processing_decision,
  // emitted by the finalization stage and never read). Both render in § 4.C
  // beside the determination; a conflict draws a Follow-Up. Neither feeds the
  // ratified table (pinned by test).
  const companyOutweigh = s((intake.impact_intake as Bag | undefined)?.benefitsOutweigh);
  const companyOutweighConflict = (cell.kind === "proceed" && companyOutweigh === "No") ||
    (cell.kind === "stop" && companyOutweigh === "Yes");
  const finalDecision = s(intake.final_processing_decision);
  const finalDecisionAffirmative = /^(initiate|continue)\b/i.test(finalDecision);
  const finalDecisionNegative = /^(do not initiate|discontinue)\b/i.test(finalDecision);
  const finalDecisionConflict = (finalDecisionAffirmative && /^do not proceed/.test(consequence)) ||
    (finalDecisionNegative && (consequence === "proceed" || consequence === "proceed with conditions"));
  if (companyOutweighConflict) {
    followUps.push(
      `Reconcile the Company’s recorded answer that the benefits ${
        companyOutweigh === "Yes" ? "outweigh" : "do not outweigh"
      } the risks with the determination in § 4.C, which reaches the opposite conclusion; § 7152(a) makes the weighing the business’s own, and the two must agree before the assessment is finalized`,
    );
  }
  if (finalDecisionConflict) {
    followUps.push(
      `Reconcile the Company’s recorded § 7152(a)(7) decision (“${finalDecision}”) with the recommended outcome in § 4.C; the two point in opposite directions, and the decision the business documents must rest on the determination it adopts`,
    );
  }
  const companyRecordSuffix = [
    companyOutweigh
      ? ` The Company’s own recorded answer to whether the benefits outweigh the risks is “${companyOutweigh}”.${
        companyOutweighConflict
          ? " That answer differs from the determination above; reconciling the two appears among the Follow-Ups in § 4.D."
          : ""
      }`
      : "",
    finalDecision
      ? ` The Company records its decision under § 7152(a)(7) as “${finalDecision}”${
        clause(intake.final_processing_decision_notes)
          ? ` (“${firstSentence(clause(intake.final_processing_decision_notes)).replace(/[.!?]\s*$/, "")}”)`
          : ""
      }.${
        finalDecisionConflict
          ? " That decision differs from the recommended outcome; reconciling the two appears among the Follow-Ups in § 4.D."
          : ""
      }`
      : " The Company’s own decision whether it will initiate or continue the processing (§ 7152(a)(7)) is recorded at finalization; none is recorded in the information provided.",
  ].join("");
  // DOC 127 PART I — shared derived flags for the composition sites below.
  const adverse = consequence === "do not proceed - remediable" ||
    consequence === "do not proceed - redesign required";
  const band4 = consequence === "additional information required";
  const conditionsHeadName = adverse ? "Conditions for Reassessment" : "Conditions to Proceed";
  const hasBalanceRecord = pathways.length > 0 ||
    benefits.some((b) => b.weight !== "no affirmative weight");
  // Branch-truth (doc 127 I.2(e)): where the disposition requires Activity
  // redesign, the ratified cell's effect sentence must not promise that
  // completing conditions alone could change the determination. The cell
  // STRINGS themselves are untouched; only the composed effect swaps.
  const cellEffect = redesignRequired
    ? "The processing should not proceed in its present form."
    : cell.effect;

  // Parsed trigger operands.
  interface TriggerParsed {
    readonly cite: string;
    readonly label: string;
    readonly basis: string;
  }
  // DOC 142 (2026-09-02) — trigger traceability (external-review invariant:
  // every trigger rendered as Engaged carries a traceable normalized fact).
  // The upstream narrative's basis is a fixed template sentence ("the
  // information provided supports this trigger…"), so the engine derives the
  // qualifying intake answer per § 7150(b) prong — mirroring the affirmation
  // predicates in run-cppa-risk-assessment/_local/openings/risk-opening.ts
  // and _local/ltp/gate-eval.ts, the surfaces that FIRE these triggers — and
  // substitutes it ONLY where the basis is that generic sentence (or empty).
  // A basis already stating a fact is carried verbatim (doc 127 §10 pin);
  // a prong the stored intake does not affirm keeps the generic sentence
  // (never fabricate — replayed records can carry narrative lines the
  // stored intake no longer supports).
  const q5SellShareAffirmed = (v: string): boolean =>
    v === "Yes — sell only" || v === "Yes — share for advertising only" || v === "Both";
  const q5bObservationAffirmed = (v: string): boolean =>
    /^yes$/i.test(v) ||
    v === "Yes — systematic observation of workers/students/applicants" ||
    /^both$/i.test(v);
  // DOC 148 (A-Team Batch-8 P2) — intake question numbers ("(Q5)", "(Q18b)")
  // are form plumbing, not record facts: they are removed from the
  // customer-facing basis sentences. The qualifying fact itself — the
  // Company's quoted answer and the question's subject — is unchanged, so
  // the doc-142 traceability invariant still holds; question-id
  // traceability lives in the structured intake record.
  const triggerQualifyingFact = (prong: number): string | null => {
    switch (prong) {
      case 1: {
        const v = s(intake.q5_sell_share);
        return q5SellShareAffirmed(v)
          ? `the Company answers “${v}” on selling or sharing personal information`
          : null;
      }
      case 2:
        return s(intake.q15_sensitive_pi) === "Yes"
          ? "the Company answers “Yes” to processing sensitive personal information"
          // DOC 157 — § 7001(bbb)(4) elevation.
          : b2Under16Elevated
          ? "the Company records actual knowledge that it processes the personal information of consumers under 16, which § 7001(bbb)(4) defines as sensitive personal information"
          : null;
      case 3:
        return s(intake.q18_admt_use) === "Yes"
          // DOC 157 — the categorical answer names the decision category.
          ? (b3Categorical && admtDecision.categories.length
            ? `the Company answers “Yes” to using automated decisionmaking technology and records the decision it makes as ${asProse([...admtDecision.categories])}`
            : "the Company answers “Yes” to using automated decisionmaking technology for a significant decision")
          : null;
      case 4: {
        const v = s(intake.q5b_profiling_observation);
        return v && q5bObservationAffirmed(v)
          ? `the Company answers “${v}” on inference from systematic observation of workers, students, or applicants`
          : null;
      }
      case 5:
        return /^yes$/i.test(s(intake.sensitive_location_basis))
          ? "the Company answers “Yes” to inferring characteristics from a consumer’s presence at a sensitive location"
          : null;
      case 6: {
        const v = s(intake.q18b_admt_training);
        return /^Yes/.test(v)
          ? `the Company answers “${v}” on processing personal information to train an ADMT or identification technology`
          : null;
      }
      default:
        return null;
    }
  };
  const withQualifyingFact = (t: TriggerParsed): TriggerParsed => {
    if (t.basis && !/^the information provided supports this trigger/.test(t.basis)) return t;
    const prong = /§\s*7150\(b\)\((\d)\)/.exec(t.cite)?.[1];
    if (!prong) return t;
    const fact = triggerQualifyingFact(Number(prong));
    if (!fact) return t;
    return {
      ...t,
      basis: `${fact}, and the Activity falls within the risk-assessment obligation`,
    };
  };
  const parsedTriggers: TriggerParsed[] = engagedLines.map((l) => {
    const stripped = l.replace(/^Engaged — /, "");
    const m = /^(.*?§\s*7150\(b\)\(\d\))\s*\(([^)]+)\)\s*:\s*(.*)$/.exec(stripped);
    if (m) return { cite: m[1].trim(), label: m[2].trim(), basis: sweepRegister52(m[3].trim()) };
    const idx = stripped.indexOf(":");
    return idx >= 0
      ? { cite: stripped.slice(0, idx).trim(), label: "", basis: sweepRegister52(stripped.slice(idx + 1).trim()) }
      : { cite: stripped.trim(), label: "", basis: "" };
  }).map(withQualifyingFact).map((t): TriggerParsed => {
    // DOC 148 (A-Team Batch-8 P1) — the § 7150(b)(2) row carries its own
    // qualifier when the doc-139 SPI-unresolved state holds: the trigger is
    // engaged on the Company's reported answer, and the row says so rather
    // than implying the assessment independently established the category.
    // Same predicate as the § 4.D follow-up (spiCategoryUnresolved).
    // DOC 150 — the same construction extends to b(4) and b(6): engaged on
    // the Company's categorical answer, with the row stating what the
    // record does not yet describe (same predicates as the § 4.D
    // follow-ups; cross-surface parity).
    const qualify = (basis: string, note: string): string =>
      `${basis.replace(/[.!?]\s*$/, "")}; ${note}`;
    // DOC 157 — § 7001(bbb)(4) elevation: the row states its own basis.
    if (b2Under16Elevated && /§\s*7150\(b\)\(2\)/.test(t.cite)) {
      return {
        ...t,
        // The qualifying fact (triggerQualifyingFact, prong 2) already states
        // the (bbb)(4) basis; the qualifier adds only what is new.
        basis: qualify(
          t.basis,
          `the Company ${
            s(intake.q15_sensitive_pi) ? `answers “${s(intake.q15_sensitive_pi)}” to` : "records no answer to"
          } the general sensitive-personal-information question, and completing that record appears among the Follow-Ups in § 4.D`,
        ),
      };
    }
    if (spiCategoryUnresolved && /§\s*7150\(b\)\(2\)/.test(t.cite)) {
      return {
        ...t,
        basis: qualify(t.basis, "the trigger is engaged on the Company’s reported answer, and the qualifying statutory sensitive-PI category remains to be identified (Follow-Ups, § 4.D)"),
      };
    }
    if (b4CapacityUndescribed && /§\s*7150\(b\)\(4\)/.test(t.cite)) {
      return {
        ...t,
        basis: qualify(t.basis, "the trigger is engaged on the Company’s direct affirmation of the statutory element, and the observed population’s worker, student, or applicant capacity is not separately described in the information provided (Follow-Ups, § 4.D)"),
      };
    }
    if (b6TrainedDecisionContradicted && /§\s*7150\(b\)\(6\)/.test(t.cite)) {
      return {
        ...t,
        basis: qualify(t.basis, "the trigger is engaged on the Company’s reported answer, while the decision category the Company records names no significant-decision category; reconciling the two appears among the Follow-Ups in § 4.D"),
      };
    }
    if (b6TrainedDecisionUnidentified && /§\s*7150\(b\)\(6\)/.test(t.cite)) {
      return {
        ...t,
        basis: qualify(t.basis, "the trigger is engaged on the Company’s reported answer, and the significant decision the trained technology is intended to make or support is not identified in the information provided (Follow-Ups, § 4.D)"),
      };
    }
    return t;
  });
  const uncertainSwept = uncertainLines.map((l) => sweepRegister52(l.replace(/^Uncertain\s*—\s*/i, "")));

  // ══ EXECUTIVE SUMMARY ══════════════════════════════════════════════════════

  // Exec B — BATCH 20b (doc 113 S6.1): the lead sentence stays composed;
  // the per-trigger lines move into the digest table (Trigger | Engaged |
  // Basis). SS III.A keeps the full analysis paragraphs.
  // DOC 154 (items 1, 2, 6) — the reconciled rows (§ 7150(b)(2) unresolved,
  // § 7150(b)(3) evaluation-stage) render beside the doc-148 b(3) rows, and
  // the lead sentence asserts engagement ONLY when a trigger is engaged; with
  // reconciled rows alone it states the asserted-but-not-engaged posture.
  const reconciledRows: string[][] = [];
  if (b2Unresolved) {
    reconciledRows.push([
      "11 CCR § 7150(b)(2) — processing sensitive personal information",
      "Additional Information Required — the Company answers “Unsure” to processing sensitive personal information; whether the Activity processes sensitive personal information remains to be determined, and resolving it appears among the Follow-ups in § 4.D.",
    ]);
  }
  // DOC 157 — the two categorical § 7150(b)(3) non-engagements.
  if (b3Reconciled === "not_significant") {
    reconciledRows.push([
      "11 CCR § 7150(b)(3) — using ADMT for a significant decision concerning a consumer",
      "Not engaged — the Company answers “Yes” to using automated decisionmaking technology and records that the decision it makes is not within any category § 7001(ddd) defines as a significant decision (financial or lending services, housing, education enrollment or opportunities, employment or independent contracting opportunities or compensation, or healthcare services); on that categorical answer the trigger does not apply.",
    ]);
  }
  if (b3Reconciled === "housing_excluded") {
    reconciledRows.push([
      "11 CCR § 7150(b)(3) — using ADMT for a significant decision concerning a consumer",
      "Not engaged — the Company records that the technology provides or denies housing based solely on the availability or vacancy of the housing or the successful receipt of payment; § 7001(ddd)(2) provides that such a use is not making a significant decision.",
    ]);
  }
  if (b3Evaluation) {
    reconciledRows.push([
      "11 CCR § 7150(b)(3) — using ADMT for a significant decision concerning a consumer",
      "Not engaged — the Company records the automated decisionmaking technology as under evaluation rather than deployed; § 7150(b)(3) applies when the technology is used to make a significant decision concerning a consumer, and this assessment must be updated before any such deployment.",
    ]);
  }
  if (parsedTriggers.length || uncertainSwept.length || b3Reconciled || reconciledRows.length) {
    // DOC 127 §10 (Phase B, 2026-09-01) — two-column digest: the old narrow
    // "Engaged" column repeated one word down the page; the status word now
    // leads the Determination cell, with the same basis BYTES carried
    // verbatim after it.
    const triggerRows: string[][] = parsedTriggers.map((t) => [
      `${t.cite}${t.label ? ` — ${t.label}` : ""}`,
      `Engaged — ${t.basis || "the information provided supports this trigger."}${/[.!?]$/.test(t.basis) ? "" : "."}`,
    ]);
    for (const u of uncertainSwept) {
      triggerRows.push([
        u.replace(/[.!?]\s*$/, ""),
        "Unresolved — the information provided leaves this trigger unresolved; resolving it appears among the Follow-ups in § 4.D.",
      ]);
    }
    // DOC 148 (A-Team Batch-8 P0) — the reconciled § 7150(b)(3) state renders
    // in the trigger digest instead of silently disappearing: a determined
    // FSOR non-engagement, or the Additional-Information-Required open state.
    if (b3Reconciled === "advertising_only" || b3Reconciled === "unresolved") {
      triggerRows.push([
        "11 CCR § 7150(b)(3) — using ADMT for a significant decision concerning a consumer",
        b3Reconciled === "advertising_only"
          ? "Not engaged — the Company answers “Yes” to using automated decisionmaking technology for a significant decision, but the decision use identified in the information provided is advertising to consumers, which § 7001(ddd)(6) excludes from the significant-decision categories; any separate covered significant decision made with this technology should be identified and the assessment updated."
          : "Additional Information Required — the Company answers “Yes” to using automated decisionmaking technology for a significant decision, but the information provided does not identify a decision within the categories enumerated in § 7001(ddd); identifying that decision appears among the Follow-ups in § 4.D.",
      ]);
    }
    triggerRows.push(...reconciledRows);
    tables["executive_summary:3"] = {
      key: "",
      surface: "exec_triggers",
      title: "Triggers under § 7150(b)",
      columns: ["Trigger", "Determination"],
      rows: triggerRows,
    };
    put(
      "executive_summary:2",
      "exec_trigger_lines",
      "A",
      parsedTriggers.length ? RISK52_FIXED.exec_triggers_lead : RISK52_FIXED.exec_triggers_asserted_lead,
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

  // Exec C — ledger intro + compact ledger. DOC 127 PART I: unassessed named
  // risks render in the ledger too, so the intro composes whenever any named
  // risk (assessed or not) is on the record.
  if (pathways.length || unassessed.length) {
    put(
      "executive_summary:5",
      "exec_ledger_intro",
      "A",
      RISK52_FIXED.exec_ledger_intro,
      ["INTAKE:a5_harm_pathways"],
      ["11 CCR § 7152", "11 CCR § 7154"],
    );
  }
  {
    const execLedger = buildRiskLedgerTable(pathways, "exec_ledger", unassessed);
    // DOC 129 RISK (2026-09-01) — the all-None ledger explains itself when a
    // general safeguard description IS on the record: crediting requires the
    // per-risk record, and rights mechanisms (§ 3.D controls) are a distinct
    // concept from risk-directed safeguards.
    const allUncredited = pathways.length > 0 && pathways.every((p) => p.safeguards.length === 0);
    tables["executive_summary:6"] = execLedger && allUncredited && generalSafeguardsText
      ? {
        ...execLedger,
        note: [
          execLedger.note,
          "The Company's general safeguard description is on the record; this ledger credits only safeguards recorded against a specific risk with an implementation status, and none is, which is why no credit appears. Consumer-rights mechanisms (§ 3.D) are recorded separately and are not risk-directed safeguards.",
        ].filter(Boolean).join(" "),
      }
      : execLedger;
  }

  // Exec C — benefit strip.
  {
    const supported = benefits.filter((b) => b.weight === "material weight");
    const strongest = benefits.find((b) => b.weight === "material weight") ??
      benefits.find((b) => b.weight === "limited weight");
    const strip = strongest
      ? `The strongest benefit established is of ${
        strongest.weight === "material weight" ? "material" : "limited"
      } weight (the ${strongest.label} benefit — § 3.F); ${countWord(supported.length)} of the four benefit categories ${
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

  // Exec C — the determination lead + pointer. DOC 127 PART I: the gate
  // widens to unassessed-only records (so the outcome and path still print),
  // while the ratified cell conclusion composes only when there is a balance
  // record for it to describe (doc 124's rule, carried); a band-4 conclusion
  // carries the provisional qualifier so the exec text can never contradict
  // the cover's "Additional Information Required".
  if (hasBalanceRecord || unassessed.length) {
    if (hasBalanceRecord) {
      // DOC 142 (2026-09-02) — with a5 wholly absent, the ratified cell
      // conclusion would assert a balance the report has no risk side for;
      // the incomplete-state sentence composes instead.
      put(
        "executive_summary:8",
        "exec_determination",
        "B",
        whollyAbsentRisks
          ? `${RISK52_FIXED.band4_provisional_no_risks} ${RISK52_FIXED.exec_determination_pointer}`
          // DOC 154 (item 5) — no assessed risk side: the cell conclusion
          // would assert a balance the report never performed.
          : unassessedOnly
          ? `${RISK52_FIXED.band4_provisional_unassessed_only} ${RISK52_FIXED.exec_determination_pointer}`
          : `${cell.conclusion}${band4 ? ` ${RISK52_FIXED.band4_provisional}` : ""} ${RISK52_FIXED.exec_determination_pointer}`,
        ["FACTOR:balancing_table"],
        ["11 CCR § 7154"],
      );
    }
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
    // under ten render as words in narrative prose. DOC 127 PART I: adverse
    // dispositions compress under the Conditions-for-Reassessment frame, and
    // the redesign branch never implies the conditions alone could change
    // the determination.
    // DOC 149 (2026-09-03, batch 2c946597) — the compact list truncates each
    // condition at its colon, so two planned-safeguard conditions (distinct,
    // fully quoted in § 4.D) collapsed to the same head and read as a
    // duplicated condition ("…: Complete implementation of the planned
    // safeguard; Complete implementation of the planned safeguard; …").
    // Identical heads now merge into one counted item; the stated total
    // still matches conditions.length.
    // DOC 153 (batch 736df0ad) — the compact head names the harm the
    // condition addresses ("…planned safeguard addressing (E) Economic
    // harms"); a bare merged head told the executive reader nothing.
    const headCounts = new Map<string, { n: number; harms: string[] }>();
    for (const c of conditions) {
      const h = c.split(":")[0].trim().replace(/\.$/, "");
      // DOC 169 (batch 50b8bcd4, Velospan) — a condition of the form "…for
      // the safeguard credited against the risk: (G) Reputational harms"
      // names its harm AFTER the colon, not in an "(addresses: …)" suffix;
      // the compact head kept "the risk" and dropped the label, so the
      // executive reader could not tell which risk the condition meant.
      const tail = c.includes(":") ? c.slice(c.indexOf(":") + 1).trim().replace(/\.$/, "") : "";
      const harm = c.match(/\(addresses: (.+)\)\s*$/)?.[1]?.trim() ?? (/^\([A-H]\) /.test(tail) ? tail : "");
      const entry = headCounts.get(h) ?? { n: 0, harms: [] };
      entry.n += 1;
      // DOC 167 (Batch 13 A-Team §11, NestWave) — the captured "addresses"
      // text is a PROSE LIST of harm labels ("(G) … and (C) …"); deduping the
      // whole string let two conditions whose lists overlapped re-list the
      // shared harm ("(C) … and (G) … and (C) …"). Split on the "(letter) "
      // markers every HARM_PATHWAY_OPTS label carries (harm (A) contains
      // commas of its own, so the marker — not the comma — is the delimiter),
      // then dedupe label by label.
      for (const raw of harm.split(/(?=\([A-H]\) )/)) {
        const label = raw.replace(/[\s,]*(\band\b)?[\s,]*$/, "").trim();
        if (label && !entry.harms.includes(label)) entry.harms.push(label);
      }
      headCounts.set(h, entry);
    }
    // DOC 169 — a "credited against the risk" head takes its harm in place of
    // "the risk" ("…credited against (G) Reputational harms"), never
    // "…against the risk addressing (G) …".
    const labelFor = (head: string, harms: string[]): string =>
      /credited against the risk$/.test(head)
        ? `${head.replace(/ the risk$/, "")} ${asProse(harms)}`
        : `${head} addressing ${asProse(harms)}`;
    const compactLabels = [...headCounts.entries()]
      .map(([h, { n, harms }]) =>
        n === 1
          ? (harms.length ? labelFor(h, harms) : h)
          : `${h} (${countWord(n)} conditions${harms.length ? `, addressing ${asProse(harms)}` : ""})`
      )
      .join("; ");
    let compact: string;
    if (!conditions.length) {
      compact = RISK52_FIXED.conditions_compact_none;
    } else if (consequence === "do not proceed - remediable") {
      compact = `A different disposition depends on ${countWord(conditions.length)} ${
        plural(conditions.length, "Condition", "Conditions")
      } for Reassessment: ${compactLabels}. The full conditions, follow-ups, and recommendations appear in § 4.D.`;
    } else if (consequence === "do not proceed - redesign required") {
      compact = `${capFirst(countWord(conditions.length))} ${
        plural(conditions.length, "Condition for Reassessment is", "Conditions for Reassessment are")
      } stated in § 4.D; because a critical-level risk remains, a different disposition also requires modifying the Activity itself.`;
    } else {
      compact = `The determination depends on ${countWord(conditions.length)} ${
        plural(conditions.length, "Condition", "Conditions")
      } to Proceed: ${compactLabels}. The full conditions, follow-ups, and recommendations appear in § 4.D.`;
    }
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
    // DOC 154 (item 16) — the ratified RK3-D threshold stands (three facets
    // confirm the Purpose), but the sentence names the facets actually
    // confirmed instead of asserting all four when three were selected.
    const text = specificityFacets.length >= 4
      ? "The Company confirms the stated Purpose identifies the specific operation supported, the information involved, the consumers affected, and the intended outcome; the assessment proceeds on the Company’s formulation."
      : specificityFacets.length === 3
      ? `The Company confirms the stated Purpose identifies ${
        asProse(specificityFacets.map((x) => x.toLowerCase()))
      } — three of the four facets the assessment checks — and the assessment proceeds on the Company’s formulation.`
      : specificityFacets.length >= 1
      ? `The Company confirms the stated Purpose identifies ${
        asProse(specificityFacets.map((x) => x.toLowerCase()))
      }; it does not confirm the remaining facets the assessment checks. The assessment proceeds on the Company’s formulation, and sharpening the Purpose appears among the Follow-ups in § 4.D.`
      : `The information provided does not confirm that the stated Purpose identifies the operation supported, the information involved, the consumers affected, or the intended outcome; restating the Purpose appears among the ${conditionsHeadName} in § 4.D.`;
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
    // DOC 150 — the scope contradiction is stated where the reader meets
    // it, not only in § 4.D (same categories as the follow-up).
    const scopeNote = scopeConflictCategories.length
      ? ` This description assigns ${
        asProse(scopeConflictCategories.map((c) => `“${c}”`))
      }-related processing to a separate activity while the inventory in Part D lists ${
        plural(scopeConflictCategories.length, "that category", "those categories")
      } for this Activity; reconciling that scope appears among the Follow-Ups in § 4.D.`
      : "";
    put(
      "ii_information:3",
      "out_of_scope",
      "B",
      `${RISK52_FIXED.out_of_scope_lead} ${
        oos ? `“${oos}”.` : "the Company records the additional activities without describing them."
      } ${RISK52_FIXED.out_of_scope_note}${scopeNote}`,
      ["INTAKE:out_of_scope_confirmation", "INTAKE:out_of_scope_activities"],
      ["11 CCR § 7156"],
    );
  }

  // II.B — operational sequence.
  {
    const entry = clause(intake.processing_entry_point);
    const m = (intake.processing_methods ?? {}) as Bag;
    // DOC 154 (item 20) — the intake records "N/A" for a stage that does not
    // occur; such a value is not a stage description and no longer prints as
    // `Collection — “N/A”.`
    const isNotApplicable = (v: string): boolean => /^(n\/?a|not applicable|none)\.?$/i.test(v);
    const stagePairs: Array<[string, string]> = [
      ["collection", clause(m.collection_method)],
      ["use", clause(m.use_method)],
      ["disclosure", clause(m.disclosure_method)],
      ["retention", clause(m.retention_method)],
      ["other processing", clause(m.other_processing_method)],
    ];
    const stages = stagePairs.filter(([, v]) => v && !isNotApplicable(v));
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
  //
  // DOC 133 (all-products batch review, 2026-09-01) — consumer_interaction_
  // method/purpose and approximate_ca_consumers are data-layer-optional
  // (RK3-A1 g2, the "canonical going forward" fields); i3_ca_consumer_band
  // and i4b_sources are the always-required predecessors and are the ones
  // actually populated on most records today. Falling back to them here
  // (rather than only to the g2 fields) fixes a false "does not describe
  // the consumer interaction" negative on records that answer i3/i4b but
  // haven't yet been asked the newer g2 questions.
  {
    const sourcesFallback = clause(intake.i4b_sources);
    const method = clause(intake.consumer_interaction_method) || sourcesFallback;
    const usingSourcesFallback = !clause(intake.consumer_interaction_method) && !!sourcesFallback;
    const ipurpose = clause(intake.consumer_interaction_purpose);
    const n = clause(intake.approximate_ca_consumers) || clause(intake.i3_ca_consumer_band);
    const dependency = relationshipContext === "Employees or job applicants" ||
      relationshipContext === "Students" ||
      relationshipContext === "Patients or health-service recipients";
    if (method || ipurpose || n || relationshipContext) {
      const bits: string[] = ["C. Consumers and the Interaction."];
      if (method || ipurpose) {
        // The Company's own words in quotation marks (v5.2 register) — the
        // intake values are full phrases whose casing is the Company's.
        const clauses: string[] = [];
        if (method) {
          clauses.push(
            usingSourcesFallback
              ? `The record identifies these consumer-facing collection sources: “${method}”`
              : `The Company interacts with the affected consumers through “${method}”`,
          );
        }
        if (ipurpose) clauses.push(`for the stated purpose of “${ipurpose}”`);
        bits.push(`${clauses.join(", ")}.`);
      }
      if (n) {
        bits.push(`The approximate California scale, as the Company states it, is: “${n}”.`);
      }
      if (relationshipContext) {
        // DOC 148 (A-Team Batch-8 P2) — the bare enum echo "The affected
        // consumers are mixed" read as a finding about the people; the
        // "Mixed" option means more than one relationship category, and the
        // sentence now says that. Every other enum value keeps the
        // ratified echo form.
        bits.push(
          relationshipContext === "Mixed"
            ? `The Company records the affected consumers as spanning more than one relationship category (“Mixed”)${
              dependency
                ? "; because the relationship involves a dependency the consumer cannot easily exit, the choice-architecture analysis in § 3.C carries correspondingly greater weight"
                : ""
            }.`
            : `The affected consumers are ${relationshipContext.toLowerCase()}${
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
        ["INTAKE:consumer_interaction_method", "INTAKE:consumer_interaction_purpose", "INTAKE:approximate_ca_consumers", "INTAKE:consumer_relationship_context", "INTAKE:i3_ca_consumer_band", "INTAKE:i4b_sources"],
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
        ? `Of those, ${countWord(spiList.length)} ${plural(spiList.length, "is", "are")} sensitive personal information — ${
          asProse(spiList)
        } — and ${plural(spiList.length, "its", "their")} presence raises what the information provided must show on necessity, access, disclosure, retention, and the consequences of misuse (§§ 3.B, 4.A).`
        : isYes(intake.q15_sensitive_pi)
        ? "The Company additionally identifies sensitive personal information in its submission, and that identification raises what the information provided must show on necessity, access, disclosure, retention, and the consequences of misuse (§§ 3.B, 4.A)."
        // DOC 157 — § 7001(bbb)(4): under-16 actual knowledge is sensitive PI.
        : b2Under16Elevated
        ? "The Company records actual knowledge that it processes the personal information of consumers under 16; under 11 CCR § 7001(bbb)(4) that information is sensitive personal information, and § 7150(b)(2) is engaged on that basis (§ 3.A)."
        // DOC 154 (item 12) — "Unsure" is an answer, not an absence.
        : b2Unresolved
        ? "The Company is unsure whether the Activity processes sensitive personal information; that question is carried as unresolved in § 3.A, and resolving it appears among the Follow-Ups in § 4.D."
        : "No sensitive personal information is identified for the Activity.";
      // DOC 154 (item 28) — the sensitive-PI basis, volume, and employment
      // facts the record collects are stated where the reader meets the
      // sensitivity finding; they printed nowhere before.
      const spiFacts: string[] = [];
      if (isYes(intake.q15_sensitive_pi)) {
        if (s(intake.q17_sensitive_basis)) {
          spiFacts.push(`The Company records the basis for processing sensitive personal information as “${s(intake.q17_sensitive_basis)}”`);
          if (s(intake.q17_sensitive_basis) === "Employment contract" && clause(intake.spi_employment_exception_facts)) {
            spiFacts[spiFacts.length - 1] += ` and records these facts supporting the employment relationship: “${clause(intake.spi_employment_exception_facts)}”`;
          }
          spiFacts[spiFacts.length - 1] += ".";
        }
        if (s(intake.q15c_spi_volume)) {
          spiFacts.push(`The Company records the volume of sensitive personal information as “${s(intake.q15c_spi_volume)}”.`);
        }
      }
      // DOC 154 (item 27) — the under-16 answer is stated (a "Yes" weighs in
      // § 4.B; "Unsure" completes among the Follow-Ups).
      const under16 = s(intake.q15b_under16_knowledge);
      if (/^yes/i.test(under16)) {
        spiFacts.push("The Company records that it knowingly processes the personal information of consumers under 16; that fact raises what the information provided must show on necessity, notice, and safeguards (§§ 3.B, 3.C, 4.A) and weighs against the processing in § 4.B.");
      } else if (under16 === "Unsure") {
        spiFacts.push("The Company is unsure whether it knowingly processes the personal information of consumers under 16; resolving that appears among the Follow-Ups in § 4.D.");
      }
      // DOC 154 (item 38) — the Appendix C pointer promises per-category
      // retention only when a per-category retention record exists.
      const hasRetentionRows = rows(intake.retention_by_pi_category).some((r) =>
        s(r.pi_category) && (s(r.retention_period) || s(r.retention_criteria))
      );
      put(
        "ii_information:7",
        "information_profile",
        "A",
        `D. Personal Information and Sensitivity. The Activity processes ${countWord(cats.length)} ${
          plural(cats.length, "category", "categories")
        } of personal information: ${cats.join("; ")}. ${spiBranch}${
          spiFacts.length ? ` ${spiFacts.join(" ")}` : ""
        } Category-level detail${hasRetentionRows ? ", including per-category retention," : ""} appears in Appendix C.`,
        ["INTAKE:q4_pi_categories", "INTAKE:q15_sensitive_pi", "INTAKE:q15b_under16_knowledge", "INTAKE:q17_sensitive_basis", "INTAKE:q15c_spi_volume"],
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
      // DOC 144 (2026-09-02, doc 143 §C sweep) — the same intake value is
      // quoted in § 2.C's fallback; this splice now matches that treatment.
      // DOC 167 — where the quoted sources themselves carry the payment cue,
      // the sentence points at the scope Follow-Up (same resolver).
      const paymentInSources = paymentScopeFor(intake)?.sourceCue === true;
      put(
        "ii_information:8",
        "sources_analysis",
        "A",
        `E. Sources. The Company identifies the following source or sources: “${i4b}”.${
          paymentInSources
            ? " The stated purpose does not describe the payment processing those sources include; confirming its scope appears among the Follow-Ups in § 4.D."
            : ""
        }`,
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
    // DOC 153 (batch 736df0ad, A-Team §6/§9) — sell/share scope reconciliation.
    // A § 7150(b)(1) answer is the Company's categorical affirmation (the
    // trigger stands); what the record must then carry is the recipient of
    // that selling or sharing (§ 7152(a)(3)(F)) and a stated purpose that
    // describes it. Where neither does, the gap is stated in § 2.F and
    // completed among the Follow-Ups — the quoted purpose is never rewritten.
    const sharingScope: { gapSentence: string | null; followUps: string[] } = (() => {
      const q5 = s(intake.q5_sell_share);
      if (!q5SellShareAffirmed(q5)) return { gapSentence: null, followUps: [] };
      const noun = q5 === "Yes — sell only" ? "selling" : q5 === "Both" ? "selling or sharing" : "sharing";
      // DOC 167 (Batch 13 A-Team §6, NestGrid) — ANY "Third party" row used
      // to count as the recipient of the sharing, so a utility partner
      // receiving "aggregated, anonymized energy telemetry" covered a "share
      // for advertising only" answer; a third-party disclosure the Company
      // itself describes as aggregated / anonymized / de-identified is not a
      // recipient of personal-information sharing.
      // CEO RULING (doc 167 §C.2.7, 2026-09-04) — whether the Purpose text
      // mentions the sharing is NOT relevant once the Company has identified
      // in q5 that it shares for advertising: the categorical answer IS the
      // identification. The doc-153 purpose-vocabulary test and its
      // "confirm that the sharing forms part of this Activity" Follow-Up are
      // retired; what the record must still carry is the § 7152(a)(3)(F)
      // recipient of that sharing, completed below where none is recorded.
      const ADVERTISING_RE =
        /\b(advertis\w*|ad[- ]?network|ad[- ]?tech\w*|marketing|data broker|DSPs?|SSPs?|retarget\w*|cross-context|behavio(u)?ral advertising)\b/i;
      const NON_PI_DISCLOSURE_RE = /\b(aggregat\w*|anonymi[sz]\w*|de-?identif\w*)\b/i;
      const advertisingRecipient = recipientRows.some((r) => {
        const text = `${s(r.recipient_name_or_category)} ${clause(r.disclosure_purpose)}`;
        if (ADVERTISING_RE.test(text)) return true;
        return s(r.recipient_type) === "Third party" && !NON_PI_DISCLOSURE_RE.test(text);
      });
      if (!advertisingRecipient) {
        return {
          gapSentence:
            // Team ratification (doc 167 §C.2): the dash clause states the
            // test the predicate actually applies, so a third-party row the
            // Company describes as aggregated / anonymized / de-identified is
            // not contradicted by a sentence saying no third party appears.
            `The Company reports ${noun} of personal information (“${q5}”; § 7150(b)(1), § 3.A), but no recipient of that ${noun} — a third party receiving personal information rather than information the Company describes as aggregated, anonymized, or de-identified, or a recipient whose stated purpose is advertising — appears among the recipients recorded for the Activity; completing the recipient record appears among the Follow-Ups in § 4.D. If that ${noun} belongs to a separate processing activity, it should be scoped and assessed separately.`,
          followUps: [
            `Identify the recipient or recipient category, the personal information made available, and the purpose for the ${noun} the Company reports (“${q5}”); § 7152(a)(3)(F) requires the disclosures to third parties to be identified for the Activity`,
          ],
        };
      }
      return { gapSentence: null, followUps: [] };
    })();
    if (recipientRows.length) {
      put("ii_information:10", "recipients_summary", "A", RISK52_FIXED.recipients_lead, ["INTAKE:recipients"], ["11 CCR § 7152(a)(3)(F)"]);
      // DOC 153 (batch 736df0ad) — three distinct states, each honest: an
      // ABSENT optional answer is "Not recorded" and completes among the
      // Follow-Ups; "Unsure" is not confirmed BY THE COMPANY; a value outside
      // the enum (import/API paths) renders as the Company's own words rather
      // than a negative finding the Company never made.
      const CONTRACT_ENUM = new Set([
        "Written contract with the CCPA-required restrictions in place",
        "Written contract without confirmed CCPA restriction terms",
        "No written contract",
        "Unsure",
      ]);
      const contractStatus = (r: Bag): string => {
        const c = s(r.contractual_protections);
        if (c === "Written contract with the CCPA-required restrictions in place") return "Restrictions confirmed";
        if (c === "Written contract without confirmed CCPA restriction terms") return "Restriction terms not confirmed";
        if (c === "No written contract") return "No written contract reported";
        if (c === "Unsure") return "Not confirmed by the Company";
        if (c) return `As recorded: “${c}”`;
        return "Not recorded — see the Follow-Ups in § 4.D";
      };
      const contractUnrecorded = recipientRows.filter((r) => !s(r.contractual_protections));
      if (contractUnrecorded.length) {
        followUps.push(
          `Record the contractual status of the disclosure to ${
            asProse(contractUnrecorded.map((r) => `“${s(r.recipient_name_or_category)}”`))
          } — whether a written contract with the CCPA-required restrictions is in place — so the assessment can weigh the contractual control (Cal. Civ. Code § 1798.100(d); 11 CCR § 7051)`,
        );
      }
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
        } else if (c && !CONTRACT_ENUM.has(c)) {
          consequences.push(
            `For ${name}, the recorded contract status does not confirm the CCPA-required restriction terms, and the reliance the assessment can place on the contractual control is reduced accordingly in § 4.A.`,
          );
        } else if (c === "No written contract") {
          consequences.push(
            `For ${name}, no written contract is reported; the disclosure operates outside a contractual control, and remediation appears among the Recommendations in § 4.D.`,
          );
        }
      }
      if (vendorDependency === "One or more vendors are essential — the processing could not continue without them") {
        const essential = clause(intake.essential_vendors);
        // DOC 144 (2026-09-02, doc 143 §C sweep) — the Company's own vendor
        // naming is quoted with attribution, never woven bare.
        consequences.push(
          essential
            ? `The processing materially depends on the following vendors the Company records as essential: “${essential}”.`
            : `The processing materially depends on one or more vendors the Company records as essential.`,
        );
      }
      if (sharingScope.gapSentence) consequences.push(sharingScope.gapSentence);
      if (consequences.length) {
        put(
          "ii_information:12",
          "recipient_consequences",
          "B",
          consequences.join(" "),
          ["INTAKE:recipients", "INTAKE:vendor_dependency", "INTAKE:essential_vendors", "INTAKE:q5_sell_share"],
          ["11 CCR § 7152(a)(3)(F)"],
        );
      }
    } else if (intake.recipients_none_declared === true) {
      // DOC 154 (item 17) — the fixed "no recipient" sentence is the Company's
      // DECLARED answer (the form's explicit toggle emits the flag beside the
      // empty array). An empty array without the declaration is an absent
      // record, stated as such and completed by Follow-Up — never a negative
      // the Company did not make.
      put("ii_information:10", "recipients_summary", "A", RISK52_FIXED.recipients_none, ["INTAKE:recipients", "INTAKE:recipients_none_declared"], ["11 CCR § 7152(a)(3)(F)"]);
      tables["ii_information:11"] = null;
      if (sharingScope.gapSentence) {
        put(
          "ii_information:12",
          "recipient_consequences",
          "B",
          sharingScope.gapSentence,
          ["INTAKE:recipients", "INTAKE:q5_sell_share"],
          ["11 CCR § 7152(a)(3)(F)"],
        );
      }
    } else if (Array.isArray(intake.recipients)) {
      put(
        "ii_information:10",
        "recipients_summary",
        "A",
        "The information provided does not identify the service providers, contractors, or third parties that receive or can access the information for this Activity, and does not record that there are none; completing the recipient record appears among the Follow-Ups in § 4.D.",
        ["INTAKE:recipients"],
        ["11 CCR § 7152(a)(3)(F)"],
      );
      tables["ii_information:11"] = null;
      if (sharingScope.gapSentence) {
        put(
          "ii_information:12",
          "recipient_consequences",
          "B",
          sharingScope.gapSentence,
          ["INTAKE:recipients", "INTAKE:q5_sell_share"],
          ["11 CCR § 7152(a)(3)(F)"],
        );
      }
      followUps.push(
        "Identify the service providers, contractors, and third parties that receive or can access the personal information for the Activity, with the purpose of each disclosure, or record that there are none; § 7152(a)(3)(F) requires the recipient record",
      );
      // The generic recipient Follow-Up above covers the sharing gap too.
      sharingScope.followUps = [];
    }
    for (const f of sharingScope.followUps) followUps.push(f);
    // DOC 167 (Batch 13 A-Team §7; the Batch 12 §11 finding recurring) —
    // payment/billing facts carried in the Activity's sources, retention, or
    // recipients while the stated Purpose describes no payment processing.
    // The facts are never removed and the Purpose is never rewritten; the
    // scope question completes among the Follow-Ups (same architecture as
    // the sell/share reconciliation above). One resolver, read here and by
    // the § 2.E sources sentence.
    const paymentScope = paymentScopeFor(intake);
    if (paymentScope) {
      followUps.push(
        // Team ratification (doc 167 §C.2): states the model's actual posture —
        // the facts stay in the record and are treated as part of the Activity
        // on the information provided (the sell/share pattern) — never a
        // conditional removal the generator does not perform.
        `Confirm whether the payment or billing processing recorded in the information provided (${
          qPassage(paymentScope.cue)
        }) forms part of this Activity, or scope it as a separate processing activity; the stated purpose does not describe it, and the assessment treats the payment facts it records as part of the Activity on the information provided`,
      );
    }
  }

  // II.G — retention (table + basis).
  {
    // DOC 154 (item 11) — a retention row with neither a period nor a
    // criterion is an EMPTY row: it no longer counts as covering its
    // category (it used to print "Not stated" with no Follow-Up).
    const retRows = rows(intake.retention_by_pi_category).filter((r) =>
      s(r.pi_category) && (s(r.retention_period) || s(r.retention_criteria))
    );
    const overallPeriod = clause(intake.i2_retention_period);
    // DOC 154 (item 19) — "Other criteria (described below)" is a pointer to
    // the detail field, not a basis statement; the detail is the basis.
    const overallCriteriaRaw = clause(intake.i2_retention_criteria);
    const overallCriteria = overallCriteriaRaw === "Other criteria (described below)"
      ? clause(intake.i2_retention_detail)
      : overallCriteriaRaw;
    // DOC 148 (A-Team Batch-8 P1) — category completeness: § 7152(a)(3)(B)
    // requires retention (or the determining criteria) for EACH category of
    // personal information. A q4 category with no retention row used to
    // vanish from the table silently; it now renders an honest open-state
    // row and completes among the Follow-Ups. Matching is by the exact
    // category label (the retention rows are keyed to the q4 labels).
    const retCovered = new Set(retRows.map((r) => s(r.pi_category)));
    const retMissing = arr(intake.q4_pi_categories).filter((c) => !retCovered.has(c));
    if (retRows.length) {
      tables["ii_information:14"] = {
        key: "",
        surface: "retention",
        title: "",
        columns: ["Information category", "Retention period or criterion"],
        rows: [
          ...retRows.map((r) => [
            s(r.pi_category),
            s(r.retention_period) || s(r.retention_criteria),
          ]),
          // DOC 153 (batch 736df0ad) — where the Company states an overall
          // retention period or criterion, an uncovered category is NOT
          // "not stated": the overall statement is the only period covering
          // it, and the gap is the category-specific one § 7152(a)(3)(B) asks for.
          ...retMissing.map((c) => [
            c,
            (overallPeriod || overallCriteria)
              ? "No category-specific period recorded — the Company’s overall retention statement applies; see the Follow-Ups in § 4.D"
              : "Not stated — see the Follow-Ups in § 4.D",
          ]),
        ],
      };
      if (retMissing.length) {
        followUps.push(
          (overallPeriod || overallCriteria)
            ? `Identify the retention period, or the criteria used to determine it, specifically for ${
              asProse(retMissing.map((c) => `“${c}”`))
            }; only the Company’s overall retention statement in § 2.G currently covers ${
              plural(retMissing.length, "it", "them")
            }, and § 7152(a)(3)(B) requires this for each category of personal information`
            : `Identify the retention period, or the criteria used to determine it, for ${
              asProse(retMissing.map((c) => `“${c}”`))
            }; § 7152(a)(3)(B) requires this for each category of personal information`,
        );
      }
    } else if (overallPeriod || overallCriteria) {
      tables["ii_information:14"] = {
        key: "",
        surface: "retention",
        title: "",
        columns: ["Information category", "Retention period or criterion"],
        rows: [["All categories (as recorded for the Activity)", overallPeriod || overallCriteria]],
      };
      // DOC 154 (item 10) — the overall-only state promised a category-by-
      // category completion with no Follow-Up behind it.
      if (arr(intake.q4_pi_categories).length) {
        followUps.push(
          "Identify the retention period, or the criteria used to determine it, for each category of personal information the Activity processes; the Company states retention for the Activity as a whole only, and § 7152(a)(3)(B) requires it for each category",
        );
      }
    }
    const basis = overallCriteria || clause(intake.i2_retention_detail);
    if (retRows.length || overallPeriod || basis) {
      const basisSentence = basis
        ? `The Company states the basis for these periods as: “${basis}”. `
        : "";
      const perCategoryGap = !retRows.length
        ? ` Retention is stated for the Activity as a whole and remains to be established category by category${
          arr(intake.q4_pi_categories).length ? "; identifying it appears among the Follow-Ups in § 4.D" : ""
        }.`
        : retMissing.length && (overallPeriod || overallCriteria)
        ? ` A category-specific retention period is not recorded for ${
          asProse(retMissing.map((c) => `“${c}”`))
        }; the Company’s overall retention statement is the only period covering ${
          plural(retMissing.length, "it", "them")
        } on the information provided, and category-level identification appears among the Follow-Ups in § 4.D.`
        : retMissing.length
        ? ` Retention is not stated for ${
          asProse(retMissing.map((c) => `“${c}”`))
        }; identifying it appears among the Follow-Ups in § 4.D.`
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
    // DOC 144 (2026-09-02, doc 143 §C sweep) — the two narrative values on a
    // participant row (role and processing responsibility) are the Company's
    // own words and render quoted; the name leads the item unquoted.
    const participants = rows(intake.section_7151_operational_participants)
      .map((p) => {
        const name = s(p.name);
        const role = s(p.role);
        const resp = clause(p.processing_responsibility);
        if (!name && !role && !resp) return "";
        const head = [name, role ? `“${role}”` : ""].filter(Boolean).join(", ");
        return `— ${head}${resp ? ` — “${resp}”` : ""}.`;
      })
      .filter(Boolean);
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
      // DOC 148 (A-Team Batch-8 P1) — where the consulted externals include
      // legal counsel, the § 7152(a)(8) exception is stated expressly so the
      // roster cannot read as treating counsel's legal advice as an
      // information-provider entry.
      if (external && /\b(counsel|attorney|law firm|llp)\b/i.test(external)) {
        parts.push(
          "Legal counsel providing legal advice is excepted from the § 7152(a)(8) information-provider record; counsel is noted here to complete the consultation record only.",
        );
      }
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
  // DOC 148 — the guard includes the reconciled § 7150(b)(3) state so the
  // analysis composes even when that was the only asserted trigger.
  // DOC 154 — and the b(2)-unresolved / b(3)-evaluation states.
  if (parsedTriggers.length || b3Reconciled || b2Unresolved || b3Evaluation) {
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
    // DOC 148 (A-Team Batch-8 P0) — the reconciled § 7150(b)(3) state is
    // analyzed in place, not silently dropped: the Company's affirmative
    // answer and the contradicting activity record are both stated.
    if (b3Reconciled === "advertising_only" || b3Reconciled === "unresolved") {
      paras.push(
        b3Reconciled === "advertising_only"
          ? "§ 7150(b)(3) — using ADMT for a significant decision concerning a consumer — is not engaged on the information provided: the Company answers “Yes” to using automated decisionmaking technology for a significant decision, but the decision use the activity record identifies is advertising to consumers, and § 7001(ddd)(6) excludes advertising to a consumer from the significant-decision categories. Any separate covered significant decision made with this technology should be identified and the assessment updated."
          : "§ 7150(b)(3) — using ADMT for a significant decision concerning a consumer — requires additional information: the Company answers “Yes” to using automated decisionmaking technology for a significant decision, but the information provided does not identify a decision within the categories enumerated in § 7001(ddd). Identifying that decision appears among the Follow-ups in § 4.D.",
      );
    }
    // DOC 154 (items 1–2) — the two further reconciled states, analyzed in
    // place with the same fact / law / determination construction.
    if (b2Unresolved) {
      paras.push(
        "§ 7150(b)(2) — processing sensitive personal information — requires additional information: the Company answers “Unsure” to processing sensitive personal information, so whether the Activity falls within this category is not determined on the information provided. Resolving that question appears among the Follow-ups in § 4.D.",
      );
    }
    // DOC 157 — the categorical non-engagements, analyzed in place, and the
    // description cross-check.
    if (b3Reconciled === "not_significant") {
      paras.push(
        "§ 7150(b)(3) — using ADMT for a significant decision concerning a consumer — is not engaged on the information provided: the Company answers “Yes” to using automated decisionmaking technology and records that the decision it makes is not within any category § 7001(ddd) defines as a significant decision; on that categorical answer the trigger does not apply.",
      );
    }
    if (b3Reconciled === "housing_excluded") {
      paras.push(
        "§ 7150(b)(3) — using ADMT for a significant decision concerning a consumer — is not engaged on the information provided: the Company records that the technology provides or denies housing based solely on the availability or vacancy of the housing or the successful receipt of payment, and § 7001(ddd)(2) provides that such a use is not making a significant decision.",
      );
    }
    if (b3TextContradiction) {
      paras.push(
        "The Company’s description of the system, however, describes a decision within a § 7001(ddd) category that its categorical answer does not select; reconciling the two appears among the Follow-Ups in § 4.D, and the assessment requirement is carried until they agree.",
      );
    }
    if (b3Evaluation) {
      paras.push(
        "§ 7150(b)(3) — using ADMT for a significant decision concerning a consumer — is not engaged on the information provided: the Company records the technology as under evaluation rather than deployed, and the trigger applies when automated decisionmaking technology is used to make a significant decision concerning a consumer. The evaluation record is assessed in § 3.E, and this assessment must be updated before any deployment for such a decision.",
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
  //
  // DOC 144 (2026-09-02, CEO-ratified redesign) — Appendix D is folded into
  // the § 3.B body (doc 143 §B row D): the sub-part now opens with a landing
  // question and one reader-first sentence, states the governing requirement
  // as its own run-in paragraph (the law sentence VERBATIM from the retired
  // § 3.B spine block), renders the per-element determinations table inline
  // (`iii_analysis:4`, surface `necessity_matrix`), and only then carries the
  // per-element reasoning (now at `iii_analysis:5`) and the grouped
  // conclusion (`iii_analysis:6`, unchanged). Zero recorded elements ⇒ the
  // one-line honest posture composes inline and no table is emitted.
  {
    const parts: string[] = ["B. Necessity and Minimization."];
    if (necessity.total) {
      parts.push("[Q] Does every data element the Company collects earn its place?");
      parts.push(
        "A processing activity is only as defensible as its least necessary data element, so the assessment weighs each element the Company collects against the Purpose it is said to serve, one element at a time.",
      );
    }
    parts.push(
      "Governing requirement. Section 7152(a)(2) requires the assessment to identify the minimum personal information necessary to achieve the Purpose.",
    );
    if (!necessity.total) {
      parts.push(
        "The information provided contains no element-level necessity record for the Activity; no element-by-element determination is made on the information provided.",
      );
    }
    put(
      "iii_analysis:3",
      "necessity_landing",
      "A",
      parts.join("\n\n"),
      ["INTAKE:a2_necessity_set"],
      ["11 CCR § 7152(a)(2)"],
    );
    tables["iii_analysis:4"] = buildNecessityMatrixTable(intake);
  }
  if (necessity.necessary.length) {
    // DOC 144 (doc 143 §C sweep) — element and justification both quoted,
    // matching the unsupported sibling's treatment of the same fields.
    const sentences = necessity.necessary.map((r) => {
      const basis = clause(r.justification);
      return basis
        ? `The information provided supports the necessity of “${s(r.element)}”: the Company records “${basis}”.`
        : `The information provided supports the necessity of “${s(r.element)}”: the element is recorded as necessary without further explanation.`;
    });
    put(
      "iii_analysis:5",
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
    // DOC 144 (2026-09-02) — element names quoted (doc 143 §C sweep); the
    // "appears in Appendix D" pointer is retired with the fold-in — the
    // determinations table now sits directly above this paragraph.
    const paras: string[] = necessity.unnecessary.map((r) => {
      const basis = clause(r.justification);
      const consequence =
        `Processing the element creates privacy exposure without a corresponding contribution to the benefits weighed in Section 4, and ceasing or justifying it appears in the ${conditionsHeadName}.`;
      return basis
        ? `The necessity of “${s(r.element)}” is not established for the Purpose under assessment: the Company itself records the element as collected but not necessary to the stated purpose, and the basis it records (“${basis}”) does not establish a contribution to that Purpose. ${consequence}`
        : `The necessity of “${s(r.element)}” is not established: the Company records the element as collected but not necessary to the stated purpose, and the information provided identifies no contribution it makes to the Purpose. ${consequence}`;
    });
    if (necessity.unsure.length) {
      paras.push(
        necessity.unsure.map((r) =>
          `The necessity of “${s(r.element)}” is unresolved on the information provided; resolving it appears among the Follow-ups.`
        ).join(" "),
      );
    }
    put(
      "iii_analysis:5",
      "necessity_unsupported",
      "A",
      // A leading paragraph break: this block shares `iii_analysis:5` with
      // the supported group when both compose.
      `\n\n${paras.join("\n\n")}`,
      ["INTAKE:a2_necessity_set"],
      ["11 CCR § 7152(a)(2)"],
    );
  }
  if (necessity.total) {
    const lead = !necessity.unnecessary.length && !necessity.unsure.length
      ? "The necessity analysis supports the information processed, and that conclusion weighs in the Company’s favor in Section 4."
      : necessity.unnecessary.length
      ? `The necessity analysis is qualified: ${countWord(necessity.unnecessary.length)} ${
        plural(necessity.unnecessary.length, "element is", "elements are")
      } not shown to be necessary, and that conclusion weighs against the processing in Section 4.`
      : `The necessity analysis is qualified: necessity is not yet established for ${countWord(necessity.unsure.length)} ${
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
    // DOC 154 (item 15) — a policy last reviewed 12 to 24 months ago is
    // outside the 12-month review cycle this assessment treats as current;
    // it no longer reads as "the privacy policy is current".
    if (s(intake.q11_policy_review) === "12–24 months ago") {
      noticeGaps.push("the privacy policy was last reviewed 12 to 24 months ago, outside the 12-month review cycle this assessment treats as current");
    }
    if (s(intake.q11_policy_review) === "Over 24 months ago") {
      noticeGaps.push("the privacy policy was last reviewed more than 24 months ago");
    }
    if (s(intake.q11_policy_review) === "No privacy policy") noticeGaps.push("no privacy policy is published");
    // DOC 154 (item 28) — the employee-notice answer is read where the
    // affected consumers are the Company's own workers.
    if (
      s(intake.q14_employee_notice) === "No — we use our general privacy policy" &&
      (relationshipContext === "Employees or job applicants" || b4CapacityUndescribed === false && q5bObservationAffirmed(s(intake.q5b_profiling_observation)))
    ) {
      noticeGaps.push("no employee-specific notice is in place for the workers whose information the Activity processes");
    }
    const plannedD = dRows.filter((d) => /^planned/i.test(s(d.status)));
    // DOC 167 (Batch 13 A-Team §5) — a planned disclosure already carried
    // inside a PLANNED safeguard (whose completion is a Condition in § 4.D)
    // is not also an optional Recommendation: one customer action, one
    // class. The § 3.C sentence below points at whichever class carries it.
    const carriedD = plannedD.filter((d) =>
      planned.some((g) => disclosureCarriedBySafeguard(s(d.disclosure_content), s(g.safeguard)))
    );
    const openD = plannedD.filter((d) => !carriedD.includes(d));
    // DOC 154 (item 8) — each planned disclosure draws the Recommendation the
    // sentence below promises (no generator existed).
    for (const d of openD) {
      recommendations.push(
        `Complete the planned disclosure ${qName(d.disclosure_content)} and update the assessment when it is made`,
      );
    }
    if (s(intake.q12_notice_at_collection) || s(intake.q13_notice_content) || s(intake.q11_policy_review)) {
      const core = noticeGaps.length === 0
        ? "The Company’s notice posture covers the processing: the privacy policy is current, the notice at collection covers the collection points, and the notice content covers the required elements — which weighs in the Company’s favor."
        : `The Company’s notice posture leaves gaps: ${
          asProse(noticeGaps)
        }. A consumer reading the Company’s notices would not learn the full scope of the processing before it occurs — which weighs against the processing until the notice covers it.`;
      // DOC 167 — the pointer names the class that actually carries each
      // planned disclosure (Condition where a planned safeguard carries it,
      // Recommendation otherwise), so the sentence never promises an object
      // § 4.D does not render.
      const plannedBranch = !plannedD.length
        ? ""
        : !carriedD.length
        ? ` ${plannedD.length === 1 ? "A planned disclosure is" : "Planned disclosures are"} treated as part of the transparency posture only on completion, and completion appears among the Recommendations in § 4.D.`
        : !openD.length
        ? ` ${plannedD.length === 1 ? "A planned disclosure is" : "Planned disclosures are"} treated as part of the transparency posture only on completion; ${
          plannedD.length === 1 ? "it is" : "each is"
        } carried within a planned safeguard whose completion is a Condition in § 4.D.`
        : ` Planned disclosures are treated as part of the transparency posture only on completion; ${
          countWord(carriedD.length)
        } ${plural(carriedD.length, "is", "are")} carried within ${
          plural(carriedD.length, "a planned safeguard", "planned safeguards")
        } whose completion is a Condition in § 4.D, and completion of the ${
          plural(openD.length, "other", "others")
        } appears among the Recommendations in § 4.D.`;
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
    // DOC 154 (item 7) — the none-confirmed sentence promised a Follow-Up no
    // generator created.
    if (choiceNoneConfirmed) {
      followUps.push(
        "Confirm the choice-architecture facts the assessment checks — symmetric presentation of the permission choice, that declining does not degrade the core service, and the absence of steering design elements; none can be confirmed on the information provided",
      );
    }
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
    if (know) controlRows.push(["Right to know", know, knowNoFormal ? "Reduced — no formal process" : "Credited"]);
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
        isNo(intake.q9_opt_out) ? "Not credited — absent" : optOutPending ? "Not credited — in progress" : "Credited",
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
        isNo(intake.q20_admt_opt_out) ? "Not credited — absent" : admtOptOutPending ? "Not credited — planned" : "Credited",
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
        ? `Of the ${countWord(controlRows.length)} controls reported, ${asProse(weakControls)} ${
          plural(weakControls.length, "operates", "operate")
        } without a formal or completed process. A right that cannot be exercised carries no weight: the reduction is carried into Section 4, and strengthening ${
          plural(weakControls.length, "it", "them")
        } appears among the Recommendations in § 4.D.`
        : `The ${countWord(controlRows.length)} ${
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
  //
  // DOC 149 (2026-09-03, batch 2c946597) — q18_admt_use = "In evaluation"
  // used to fall to the not-applicable branch while the intake carried a
  // full technical description and § 4.A's own risk text referenced the
  // evaluation pipeline — an internal contradiction ("the information
  // provided does not identify automated decisionmaking technology" against
  // a record that identifies one). An evaluation-stage system with ANY
  // technical fact on the record now renders this sub-part with an
  // evaluation-posture frame; the § 7150(b)(3) trigger analysis is
  // unaffected (evaluation is not deployed use for a significant decision).
  // (admtEvaluationActive and its operands are hoisted to the shared-operand
  // region — DOC 152 promise-parity hoist.)
  if (isAdmt || admtEvaluationActive) {
    // DOC 144 (2026-09-02, task-5 landing restructure) — the sub-part no
    // longer opens on a bare statutory recitation: one reader-first sentence
    // leads (carrying the carried what-it-does-not-the-label principle and
    // the ADMT-appendix pointer), and the law sentence follows VERBATIM as
    // its own "Governing requirement." run-in paragraph.
    // DOC 144 reconciliation (same day) — re-lettered: the ADMT technical
    // record is now Appendix E (old F).
    // DOC 152 (Batch-9 P1, corpus-confirmed: FSOR commentary on
    // § 7152(a)(3)(G) — the requirement asks how ADMT output is used "to
    // make a significant decision") — the governing-requirement sentence is
    // SCOPED: the full mandate is stated only where a § 7150(b)(3)
    // significant-decision use is established on the record; otherwise the
    // sub-part is expressly carried as a supplemental record so the report
    // never overstates the provision's reach.
    put(
      "iii_analysis:14",
      "admt_intro",
      "A",
      "E. Automated Decisionmaking Technology.\n\nAn automated system that decides, or helps decide, something significant for a consumer stands or falls on what it actually does — not the label applied to it — so this sub-part evaluates the system's role, the human review around it, and the testing behind it; the full technical record appears in Appendix E.\n\n" +
        (b3Class === "significant"
          ? "Governing requirement. Section 7152(a)(3)(G) requires the report to describe the technology’s role, logic, and output, and §§ 7001(e), 7150(b)(3), 7152(a)(5)(B) and 7152(a)(6)(A)(iv) make human review and accuracy-fairness-bias testing relevant to both the risk analysis and the safeguards."
          : "Governing requirement. Section 7152(a)(3)(G) requires that description where automated decisionmaking technology is used to make a significant decision concerning a consumer (§ 7150(b)(3)); that use is not established on the information provided, and this sub-part is carried as a supplemental record — §§ 7001(e), 7152(a)(5)(B) and 7152(a)(6)(A)(iv) still make human review and accuracy-fairness-bias testing relevant to the risk analysis and the safeguards it weighs.") +
        (admtEvaluationActive
          ? "\n\nThe Company records the technology as under evaluation rather than deployed for decisions. The description is assessed on that posture: the § 7150(b)(3) trigger applies only when the technology is used to make a significant decision concerning a consumer, and the record preserved here supports that analysis if the evaluation proceeds to deployment."
          : ""),
      ["INTAKE:q18_admt_use"],
      ["11 CCR § 7152(a)(3)(G)"],
    );

    // Role.
    {
      const desc = clause(intake.q19_admt_description);
      const role = clause(intake.admt_operational_role);
      if (desc || role || admtRoleType) {
        // DOC 157 (2026-09-03) — the adopted § 7001(e)(1) labels (doc 156
        // item 8); the retired draft-era literals still render as recorded
        // for stored rows.
        const ROLE_CLAUSES: Record<string, string> = {
          "The ADMT's output is used to make the decision without human involvement": "making the decision without human involvement",
          "A human reviewer who meets all three § 7001(e)(1) requirements makes or can change the decision": "informing a decision that a human reviewer meeting all three § 7001(e)(1) requirements makes or can change",
          "A human is involved, but not all three § 7001(e)(1) requirements are met": "involving a human reviewer who does not meet all three § 7001(e)(1) requirements",
          "The ADMT makes the decision without human involvement": "making the decision without human involvement",
          "The ADMT is a substantial factor in a human decision": "a substantial factor in a human decision",
          "The ADMT supports a human decision without being a substantial factor": "supporting a human decision without being a substantial factor in it",
        };
        const roleClause = ROLE_CLAUSES[admtRoleType] ?? "";
        // Company clauses quoted (v5.2 register), each closed with a stop so
        // an intake value without terminal punctuation never runs on.
        const quoted = (t: string): string => `“${firstSentence(t).replace(/[.!?]\s*$/, "")}”.`;
        const bits: string[] = [];
        if (desc) bits.push(`The Company identifies the system as: ${quoted(desc)}`);
        // DOC 152 (Batch-9 P0) — fact / law / determination separation: where
        // the Company's own description calls an advertising use a
        // "significant decision" while the doc-137 classifier resolves the
        // described use as advertising-only, the quote is preserved as the
        // Company's characterization and EUP's determination states the
        // § 7001(ddd)(6) exclusion in place — the narrative can never carry
        // the Company's label as a legal conclusion the trigger analysis
        // rejected.
        // DOC 153 — the quote above is the description's FIRST sentence; the
        // claim may sit in a later one, so the claim is named before it is
        // answered (the doc-152 determination sentence itself is unchanged).
        if (desc && admtClaimsSignificant && admtClaimClass === "advertising_only") {
          bits.push(
            "The Company’s description also characterizes the system as making a significant decision. That characterization is preserved as the Company’s own description. Under § 7001(ddd)(6), advertising to a consumer is excluded from the significant-decision categories; no separate covered significant decision is identified on the information provided, and the § 7150(b) determinations in § 3.A carry that state.",
          );
        } else if (desc && admtClaimUnplaced) {
          // DOC 153 (batch 736df0ad, A-Team §4) — the third classifier class:
          // the Company claims a significant decision but names no § 7001(ddd)
          // category. The claim is preserved as the Company's; the determination
          // and the completing Follow-Up (pushed above by construction) answer it.
          bits.push(
            "The Company’s description also characterizes the system as making a significant decision. That characterization is preserved as the Company’s own description. The description does not identify a decision within the categories enumerated in § 7001(ddd) — financial or lending services, housing, education, employment, healthcare, and the other enumerated categories — on the information provided; no covered significant decision is established, the § 7150(b) determinations in § 3.A carry that state, and identifying the decision appears among the Follow-Ups in § 4.D.",
          );
        }
        if (roleClause) {
          // DOC 148 (A-Team Batch-8 P1) — the role sentence is the Company's
          // OWN classification, expressly attributed, and the closer states
          // the FINAL § 7001(e) test (replaces or substantially replaces
          // human decisionmaking) instead of leaving the draft-era
          // "substantial factor" wording to read as the operative standard.
          bits.push(`The Company classifies the system as ${roleClause}${role ? `: ${quoted(role)}` : "."}`);
          bits.push(
            (admtRoleType === "The ADMT makes the decision without human involvement" ||
              admtRoleType === "The ADMT's output is used to make the decision without human involvement")
              ? "Under § 7001(e), technology that makes the decision without human involvement replaces human decisionmaking, and the testing behind its output is therefore the operative question."
              : "Under § 7001(e), the operative question is whether the technology replaces or substantially replaces human decisionmaking — whether the reviewer knows how to interpret and use the output, considers it together with other relevant information, and has authority to make or change the decision; the human-review record below is read against that test.",
          );
        } else if (role) {
          bits.push(`The system participates in the processing as follows: ${quoted(role)}`);
          bits.push("The reliability of the output and the reviewer’s ability to depart from it are therefore the operative questions.");
        } else {
          bits.push("The reliability of the output and the reviewer’s ability to depart from it are therefore the operative questions.");
        }
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
          // DOC 144 (2026-09-02) — doc 143 §C's live seam defect: the splice
          // now carries the same quotes + guaranteed closing stop as the
          // `quoted()` discipline at the § 3.E role site, so an unpunctuated
          // intake fragment can no longer fuse into the following sentence.
          `The Company describes human review as follows: “${firstSentence(review).replace(/[.!?]\s*$/, "")}”. The assessment relies on it to the extent the description supports reviewer understanding, adequate information and time, and authority to reach a different result — and only to that extent in § 4.A.`,
          ["INTAKE:i5_admt_human_review"],
          ["11 CCR § 7001(e)"],
        );
      }
    }

    // Testing + logic + training (each with the ADMT-appendix pointer).
    {
      // DOC 148 (A-Team Batch-8 P0 temporal validation) — an ACTUAL dated
      // testing fact controls over the generic recency selection. Where the
      // Company's own testing description names an explicit period
      // (quarter-year / month-year — latestExplicitPeriodEnd) that ended
      // more than 12 months before the assessment date, the recency claim
      // is contradicted: the recent credit is withheld, the conflict is
      // stated, and resolving it completes among the Follow-Ups.
      // DOC 153 — the operands are the hoisted ones the § 4.D generator reads.
      const accuracy = admtTestAccuracy;
      const bias = admtTestBias;
      const testingDatedEnd = admtTestingDatedEnd;
      const recencyConflict = admtTestRecencyConflict;
      const recent = admtTestRecent;
      const providerOnly = admtTestingFacts.includes("Testing performed by the provider rather than the Company");
      const noneTyped = admtTestNoneTyped;
      if (admtTestingFacts.length) {
        if (recencyConflict) {
          followUps.push(
            `Resolve the testing-recency conflict: the Company selects testing performed or reviewed within the last 12 months, but its testing description records a most recent explicit testing period ending ${testingDatedEnd}`,
          );
        }
        const testGaps: string[] = [];
        if (!accuracy) testGaps.push("accuracy or validity testing");
        if (!bias) testGaps.push("discriminatory-impact testing");
        if (!recent) {
          testGaps.push(
            recencyConflict
              ? "testing within the last 12 months (the recorded testing period ends earlier than the reported recency status; the recorded date controls, and resolving the conflict appears among the Follow-Ups in § 4.D)"
              : "testing within the last 12 months",
          );
        }
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
          }. The credit the related safeguard receives in § 4.A is limited accordingly${
            admtTestingRecommended ? ", and completing the identified testing appears among the Recommendations in § 4.D." : "."
          }`;
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
      // DOC 144 reconciliation (2026-09-02) — re-lettered: the ADMT technical
      // record is now Appendix E (old F) across the logic, training, and
      // § 7153 sentences below.
      if (admtLogicDocumented) {
        // DOC 152 (Batch-9 promise parity) — the sentence renders the SAME
        // branch that generated (or did not generate) the § 4.D object:
        // deployed → Condition; evaluation-stage → Recommendation; any
        // other state promises nothing.
        const logicText = admtLogicDocumented === "The logic is documented and reviewed internally"
          ? "The system’s logic is documented and reviewed internally; the full logic record, including its assumptions and limitations, is preserved in Appendix E."
          : admtLogicDocumented === "The logic is documented by the provider and the Company relies on that documentation"
          ? "The system’s logic is documented by the provider, on whose documentation the Company relies; the record is preserved in Appendix E, with the provider dependency noted in § 2.F."
          : admtLogicUndocumented && isAdmt
          ? `The system’s logic is not fully documented or understood on the information provided; documenting it appears among the ${conditionsHeadName} in § 4.D, and the record to date is preserved in Appendix E.`
          : admtLogicUndocumented && admtEvaluationActive
          ? "The system’s logic is not fully documented or understood on the information provided; documenting it before any deployment for decisions appears among the Recommendations in § 4.D, and the record to date is preserved in Appendix E."
          : "The system’s logic is not fully documented or understood on the information provided; the record to date is preserved in Appendix E.";
        put("iii_analysis:17", "admt_logic_note", "B", logicText, ["INTAKE:admt_logic_documented"], ["11 CCR § 7152(a)(3)(G)(i)"]);
      }
      {
        const source = clause(intake.i5_admt_training_source);
        const noneSrc = !source || /^not applicable/i.test(source);
        if (!noneSrc || s(intake.admt_provider_trained_using_pi) || s(intake.q18b_admt_training)) {
          // DOC 152 (Batch-9 promise parity) — the Follow-Up pointer renders
          // only when the admtTrainingProvenanceGap follow-up actually
          // generated (the Company's § 7150(b)(6) answer makes the record
          // material); otherwise the gap is stated without a § 4.D promise.
          put(
            "iii_analysis:17",
            "admt_training_note",
            "B",
            noneSrc
              ? (admtTrainingProvenanceGap
                ? "Training-data provenance is not identified in the information provided; identifying it appears among the Follow-Ups in § 4.D, and the technical record appears in Appendix E."
                : "Training-data provenance is not identified in the information provided; the technical record appears in Appendix E.")
              // DOC 167 (Batch 13 A-Team §10) — same predicate as the
              // Follow-Up and the Appendix E cell.
              : admtTrainingPiUnreconciled
              ? `Training-data provenance is identified in the information provided and is preserved in Appendix E; the Company describes that source as ${
                asProse(admtTrainingPiCueTerms(intake).map((t) => `“${t}”`))
              } while answering that the technology is not trained using personal information, and reconciling the two appears among the Follow-Ups in § 4.D.`
              : "Training-data provenance is identified in the information provided and is preserved in Appendix E.",
            ["INTAKE:i5_admt_training_source"],
            ["11 CCR § 7150(b)(6)", "11 CCR § 7153"],
          );
        }
      }
      // § 7153 — provided to another business (the Appendix A row's factor;
      // the underlying facts also sit in the ADMT technical record,
      // Appendix E after the DOC 144 re-lettering).
      if (isYes(intake.admt_made_available_to_other_business)) {
        const trained = isYes(intake.admt_provider_trained_using_pi);
        const significant = isYes(intake.recipient_business_uses_admt_for_significant_decision);
        put(
          "iii_analysis:17",
          "admt_made_available",
          "B",
          trained && significant
            ? "The provided-to-another-business facts are established: the technology is made available to another business, is trained using personal information, and is used by the recipient for a significant decision. The recipient business remains responsible for its own risk assessment; Appendix E preserves the facts that assessment requires."
            : "The Company reports that the technology is made available to another business; the training and significant-decision facts preserved in Appendix E frame the scope of the recipient’s own assessment obligation.",
          ["INTAKE:admt_made_available_to_other_business", "INTAKE:admt_provider_trained_using_pi", "INTAKE:recipient_business_uses_admt_for_significant_decision"],
          ["11 CCR § 7153"],
        );
      }
    }

    // The ADMT lead.
    {
      // DOC 154 (item 9) — the promise and the Follow-Up share one predicate.
      const described = admtDescribed;
      if (!described) {
        followUps.push(
          `Complete the description of the automated decisionmaking technology — ${
            asProse(admtDescriptionGaps.length ? admtDescriptionGaps : ["its output and how the output is used"])
          } — so the system can be assessed on what it does`,
        );
      }
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
    // DOC 149 — an "In evaluation" answer with NO technical facts gets its
    // own honest sentence; the generic not-applicable text would deny a
    // technology the answer itself asserts exists.
    put(
      "iii_analysis:14",
      "admt_intro",
      "A",
      s(intake.q18_admt_use) === "In evaluation"
        ? "E. Automated Decisionmaking Technology. The Company records automated decisionmaking technology as under evaluation but provides no description of it. No analysis is carried here on that record; if the evaluation proceeds toward deployment for a significant decision, the technology's role, logic, output, human review, and testing should be recorded and this assessment updated."
        : "E. Automated Decisionmaking Technology. Not applicable. The information provided does not identify automated decisionmaking technology in this Activity, so the analyses this sub-part would carry are not required. The sub-part lettering is retained so the report reads consistently across assessments.",
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
        // DOC 144 (2026-09-02) — multi-sentence narratives are hardened
        // through `boundedPassage` (doc 143 §C item 3): the Company's own
        // periods stay inside the quotes and can no longer break the frame.
        return `The ${b.label} benefit carries material weight: the Company identifies ${qPassage(b.narrative)}, and supports it with ${qPassage(b.fact)}${basisClause}.`;
      }
      if (b.weight === "limited weight") {
        return `The ${b.label} benefit carries limited weight: the Company identifies ${qPassage(b.narrative)} but supplies no supporting information, so the claim is credited as stated rather than as established.`;
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

  // IV.A — landing + governing requirement, the ledger, T1 paragraphs, rollup.
  //
  // DOC 144 (2026-09-02, CEO-ratified redesign) — § 4.A opens with the
  // landing question and one reader-first sentence, then the governing
  // requirement VERBATIM (the law sentence from the retired § 4.A spine
  // block) as its own run-in paragraph. On a wholly-absent risk record the
  // sub-part states the honest zero-a5 posture inline instead (the doc-142
  // AIR machinery below is untouched), and the register pointer prints
  // only when the register actually renders.
  //
  // DOC 144 reconciliation (same day) — the sibling's re-lettering: the risk
  // register is now Appendix D (old E); and the landing line is the
  // CEO-approved mockup's wording verbatim (declarative period).
  {
    const parts: string[] = ["A. The Risk Ledger."];
    if (pathways.length || unassessed.length) {
      parts.push("[Q] What could go wrong, how badly, and what stands in the way.");
      parts.push(
        "The ledger below answers that question risk by risk, on the Company’s own ratings: each identified risk, its recorded likelihood and severity, its level before safeguards, the safeguard credited against it, and the risk that remains. The paragraphs that follow show the reasoning.",
      );
    }
    parts.push(
      "Governing requirement. Section 7152(a)(5) requires the assessment to identify the negative impacts the processing may create and their sources and causes; §§ 7152(a)(5)–(6) require those impacts to be considered together with the safeguards directed at them.",
    );
    if (pathways.length || unassessed.length) {
      parts.push("For further convenience, the full risk record appears in Appendix D.");
    } else {
      parts.push(
        "No risk to consumers’ privacy is identified in the information provided, so the ledger this sub-part would carry is omitted; identifying and recording the Activity’s risks appears among the Follow-Ups in § 4.D.",
      );
    }
    put(
      "iv_determination:0",
      "risk_ledger_landing",
      "A",
      parts.join("\n\n"),
      ["INTAKE:a5_harm_pathways"],
      ["11 CCR § 7152(a)(5)", "11 CCR § 7152(a)(6)"],
    );
  }
  tables["iv_determination:1"] = buildRiskLedgerTable(pathways, "risk_ledger", unassessed);
  if (pathways.length) {
    const ranked = rankPathways(pathways);
    const paras = ranked.map((p) => {
      // Annex T1 opening — the Company's own clauses in quotation marks
      // (v5.2 register: their casing is theirs, not the sentence's).
      // DOC 144 (2026-09-02) — the quoted narratives are hardened through
      // `boundedPassage` (doc 143 §C item 3), and the recorded SOURCE now
      // rides in the paragraph beside the cause (doc 143 §B row E: § 7152
      // (a)(5) promises "sources and causes", which previously existed only
      // in the appendix register).
      const opening = [
        `${p.harm}. `,
        p.data ? `The Company identifies ${qPassage(p.data)}` : `The Company identifies this risk`,
        p.actor ? `, at risk from ${qPassage(p.actor)}` : "",
        p.cause ? `: ${qPassage(p.cause)}` : "",
        ". ",
        p.source ? `The source the Company records is ${qPassage(p.source)}. ` : "",
        `The Company assesses the likelihood as ${p.likelihood.toLowerCase()} and the severity as ${p.severity.toLowerCase()}, and the risk is rated ${p.materiality} before safeguards.`,
      ].join("").replace(/\s+,/g, ",").replace(/\s+:/g, ":").replace(/\s{2,}/g, " ");
      // DOC 144 (doc 143 §C sweep) — safeguard noun phrases quoted.
      const byStatus = (status: string) =>
        p.safeguards.filter((g) => s(g.safeguard_status) === status)
          .map((g) => qName(g.safeguard));
      const testedList = byStatus("Implemented and tested");
      const untestedList = byStatus("Implemented, not tested");
      const plannedList = byStatus("Planned, not yet implemented");
      let branch: string;
      if (testedList.length) {
        branch =
          `Against it the Company has implemented and tested ${asProse(testedList)}. Safeguards supported by evidence that they operate earn the assessment’s full credit: they materially reduce this risk, and the remaining risk is ${p.residual} — which weighs in the Company’s favor.`;
      } else if (untestedList.length) {
        // DOC 167 (Batch 13 A-Team §8) — reported testing is acknowledged as
        // reported; the missing element is its results/effectiveness evidence.
        const reportsTesting = p.safeguards.some(safeguardReportsTesting);
        branch = `The Company’s ${asProse(untestedList)} ${
          plural(untestedList.length, "is", "are")
        } directed at it${
          // "describes testing" is exactly what an un-negated testing cue in
          // the Company's own text establishes — not that it took place.
          reportsTesting
            ? "; the Company describes testing, but the information provided includes no testing results or effectiveness evidence"
            : ", but the information provided includes no testing or effectiveness evidence"
        }, so the assessment recognizes the ${
          plural(untestedList.length, "control", "controls")
        } without relying on ${
          plural(untestedList.length, "it", "them")
        } at full weight, and the remaining risk stays ${p.residual}; obtaining that evidence is the identified path to reducing it.`;
      } else if (plannedList.length) {
        branch = `The only ${
          plural(plannedList.length, "safeguard", "safeguards")
        } directed at it — ${asProse(plannedList)} — ${
          plural(plannedList.length, "is", "are")
        } planned but not yet operating. A planned safeguard enters this assessment as a ${
          adverse ? "Condition for Reassessment" : "Condition to Proceed"
        }, not as present protection, and the remaining risk stays ${p.residual}.`;
      } else {
        // DOC 127 PART I — the condition pointer prints only when the gap
        // condition actually generated for THIS risk (the gaps cut is the
        // material pathways; a below-material no-safeguard risk previously
        // promised a condition § 4.D never carried), and it names the
        // branch-correct § 4.D head.
        // DOC 129 RISK (Batch 3 A-Team ruling, 2026-09-01) — where the
        // Company's GENERAL safeguard description is on the record but no
        // safeguard is recorded against this specific risk, the sentence
        // says WHY nothing is credited instead of a bare absence: crediting
        // requires the per-risk record with an implementation status.
        const whyNone = generalSafeguardsText
          ? "The Company's general safeguard description is on the record, but crediting requires a safeguard recorded against this specific risk with its implementation status, and none is; the risk therefore enters the balance at its full level"
          : "No safeguard in the information provided is directed at this risk, so it enters the balance at its full level";
        // DOC 154 (item 4) — the pointer names the § 4.D object that actually
        // generated: a Condition for a High/Critical gap, a Recommendation
        // for a Moderate one, nothing for a Low risk.
        branch = gaps.some((g) => g.harm === p.harm)
          ? `${whyNone}; establishing one appears in the ${conditionsHeadName}.`
          : moderateGaps.some((g) => g.harm === p.harm)
          ? `${whyNone}; establishing one appears among the Recommendations in § 4.D.`
          : `${whyNone}.`;
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
    // DOC 127 PART I — a named-but-unassessed harm is NOT swept into the
    // "no credible path" sentence: the Company named it, so the honest
    // statement is the ledger's "Not assessed" row and the § 4.D Follow-Up,
    // never a claim that no path to that harm exists.
    const addressed = [
      ...new Set([...pathways.map((p) => p.harm), ...unassessed.map((u) => u.harm)]),
    ];
    const remaining = HARM_PATHWAY_OPTS.filter((o) => !addressed.includes(o));
    if (remaining.length) {
      // DOC 154 (item 18) — the closer states the Company's record, not an
      // affirmative EUP finding from silence: the intake never asks whether a
      // category was considered and found inapplicable, so "identifies no
      // credible path" was a determination the record could not support.
      closers.push(
        `For ${remaining.join("; ")}, the Company identifies no risk in the information provided; no risk in ${
          plural(remaining.length, "that category", "those categories")
        } is assessed here, and none is treated as material.`,
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
      if (tested.length) bits.push(`${countWord(tested.length)} ${plural(tested.length, "is", "are")} implemented and tested`);
      if (untested.length) bits.push(`${countWord(untested.length)} ${plural(untested.length, "is", "are")} implemented without testing evidence`);
      if (planned.length) bits.push(`${countWord(planned.length)} ${plural(planned.length, "is", "are")} planned`);
      // Safeguards directed at a material risk at implemented status — the
      // CAM's logic-disposition anchor (branch_ref: materialSafeguards).
      const materialSafeguards = safeguardRows.filter((g) =>
        material.some((p) => safeguardLinksTo(g, p.harm)) &&
        (SAFEGUARD_STATUS_RANK[s(g.safeguard_status)] ?? 0) >= 2
      );
      putFactorOnly(
        "safeguard_posture_summary",
        "A",
        `Of the ${countWord(safeguardRows.length)} ${plural(safeguardRows.length, "safeguard", "safeguards")} the Company identifies, ${asProse(bits)}${
          materialSafeguards.length
            ? `; ${countWord(materialSafeguards.length)} ${plural(materialSafeguards.length, "is", "are")} implemented against the material risks`
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
        `— ${capFirst(countWord(necessity.unnecessary.length))} ${
          plural(necessity.unnecessary.length, "element", "elements")
        } not shown necessary (§ 3.B).`,
      );
    }
    if (gaps.length) {
      con.push(`— ${plural(gaps.length, "A material risk lacks", "Material risks lack")} an implemented safeguard (§ 4.A).`);
    }
    // DOC 154 (item 27) — a recorded under-16 answer weighs against.
    if (/^yes/i.test(s(intake.q15b_under16_knowledge))) {
      con.push("— The Company knowingly processes the personal information of consumers under 16 (§ 2.D).");
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
  //
  // A-TEAM DELTA (ChatGPT Dropbox Batch 1 review, 2026-08-31, Risk P0) —
  // `determination_text` and `recommended_outcome` used to be `put()` only
  // inside this same `if`, gated on the SAME condition that decides whether
  // the balance_summary TABLE has any row to show. When neither a benefit
  // nor a pathway is on the record, that condition is false, so the fixed
  // skeleton lead-in ("C. The Determination. The determination weighs...:")
  // rendered with nothing after the colon — no determination sentence at
  // all — while the cover still showed a disposition. `cell`, `cellExplanation`,
  // `outcome`, and `consequence` are all computed unconditionally above this
  // block (lines 918-925), so the determination sentence can always be
  // composed from them; only the TABLE (which has nothing to tabulate with
  // zero rows on either side) stays gated under the NO PADDING law.
  // (hasBalanceRecord is derived with the disposition flags above.)
  if (hasBalanceRecord) {
    // DOC 127 §15 (Phase B, 2026-09-01) — cells compress to "Category —
    // weight": the supporting fact already prints verbatim in § 3.F, so the
    // table no longer repeats 4–6-line evidence sentences.
    const left = benefits
      .filter((b) => b.weight !== "no affirmative weight")
      .map((b) =>
        `${b.label.charAt(0).toUpperCase()}${b.label.slice(1)} benefit — ${
          b.weight === "material weight" ? "material" : "limited"
        }`
      );
    if (!left.length) left.push("No benefit established");
    const rightRisks = rankPathways(pathways)
      .filter((p) => MATERIALITY_RANK[p.residual] >= 1)
      .sort((a, b) => MATERIALITY_RANK[b.residual] - MATERIALITY_RANK[a.residual])
      .map((p) => `${p.harm} — ${p.residual}`);
    // DOC 142 (2026-09-02) — with a5 wholly absent, "No remaining risk above
    // the low level" would imply an assessment that never happened.
    const right = rightRisks.length
      ? rightRisks
      : [
        whollyAbsentRisks
          ? "No risk identified in the intake"
          // DOC 154 (item 5) — named risks without ratings are not "low".
          : unassessedOnly
          ? "No risk assessed — likelihood or severity not recorded"
          : "No remaining risk above the low level",
      ];
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
        // DOC 148 (A-Team Batch-8 P1) — the methodology is expressly EUP's:
        // § 7154 requires the risk-benefit determination; the qualitative
        // matrix that renders it is product methodology, not a
        // regulator-prescribed scoring formula, and the subline says so.
        `${CONSEQUENCE_BAND[consequence]} Benefit weight and risk level are separate qualitative dimensions; the determination applies EUP’s conservative qualitative methodology described in Section 1 — not a regulator-prescribed scoring formula, and not a numerical equation.`,
    };
  }
  // A-TEAM S4 RULING S3.2 (doc 119, ChatGPT panel A3) — one cross-labeling
  // sentence maps the § 7154 consequence text onto the executive result's
  // disposition wording; composed from the SAME typed disposition, so no
  // determination changes.
  put(
    "iv_determination:9",
    "determination_text",
    "B",
    // DOC 127 PART I — the effect sentence is the branch-true cellEffect (a
    // redesign-required stop never promises that conditions alone could
    // change the determination); a band-4 determination carries the
    // provisional qualifier; and the cross-label sentence quotes the
    // controlled executive label. The no-record fallback additionally drops
    // the retired-register phrasing doc 124's version carried ("The record
    // establishes…", "risk pathway") and states the unassessed gap honestly.
    // DOC 142 (2026-09-02) — wholly-absent a5 with a benefit on the record:
    // the ratified cell would assert a favorable balance the report has no
    // risk side for, so the incomplete-state sentence composes instead.
    // DOC 157 — the Company's own § 7152(a) answer and § 7152(a)(7) decision
    // close the paragraph (companyRecordSuffix).
    (whollyAbsentRisks && hasBalanceRecord
      ? `The information provided establishes a benefit under § 3.F but identifies no risk under § 4.A, so the balance this report performs has nothing to weigh on the risk side. ${outcome} In this report's executive result, that determination is stated as "${DISPOSITION_LABEL[consequence]}."`
      // DOC 154 (item 5) — a benefit on the record and only unassessable
      // risks: no cell conclusion may render.
      : unassessedOnly && hasBalanceRecord
      ? `The information provided establishes a benefit under § 3.F and identifies one or more risks under § 4.A without the recorded likelihood or severity the balance requires, so the balance this report performs cannot yet be determined. ${outcome} In this report's executive result, that determination is stated as "${DISPOSITION_LABEL[consequence]}."`
      : hasBalanceRecord
      ? `${cell.conclusion} ${cell.materiality} ${cellEffect} ${cellExplanation}${band4 ? ` ${RISK52_FIXED.band4_provisional}` : ""} ${outcome} In this report's executive result, that determination is stated as "${DISPOSITION_LABEL[consequence]}."`
      : `The information provided establishes no benefit under § 3.F and ${
        unassessed.length
          ? "identifies no risk under § 4.A with a recorded likelihood and severity"
          : "identifies no risk under § 4.A"
      }, so the balance this report performs has nothing to weigh on either side. ${outcome} In this report's executive result, that determination is stated as "${DISPOSITION_LABEL[consequence]}."`) +
      companyRecordSuffix,
    ["FACTOR:balancing_table", "FACTOR:benefit_weight_table", "FACTOR:residual_rule", "INTAKE:impact_intake.benefitsOutweigh", "INTAKE:final_processing_decision"],
    ["11 CCR § 7154", "11 CCR § 7152(a)(7)"],
  );
  putFactorOnly(
    "recommended_outcome",
    "B",
    outcome,
    ["FACTOR:balancing_table", "INTAKE:processing_status"],
    ["11 CCR § 7152(a)(7)", "11 CCR § 7154"],
  );

  // IV.D — conditions / follow-ups / recommendations, numbered.
  // DOC 127 PART I + §13 ruling — an adverse disposition heads its conditions
  // "Conditions for Reassessment." (its own chunk, so it renders as a
  // sub-heading) with the ratified intro sentence; the redesign branch uses
  // the intro and close that never promise the conditions alone could
  // change the determination. Bands 1–2 keep the byte-identical
  // "Conditions to Proceed." composition.
  if (conditions.length) {
    const condItems = conditions.map((c, i) => `${i + 1}. ${c}.`).join("\n");
    const conditionsText = adverse
      ? `${RISK52_FIXED.conditions_reassessment_lead}\n\n${
        redesignRequired
          ? RISK52_FIXED.conditions_reassessment_intro_redesign
          : RISK52_FIXED.conditions_reassessment_intro
      }\n${condItems}\n${
        redesignRequired ? RISK52_FIXED.conditions_close_redesign : RISK52_FIXED.conditions_close
      }`
      : `${RISK52_FIXED.conditions_lead}\n${condItems}\n${RISK52_FIXED.conditions_close}`;
    put(
      "iv_determination:11",
      "conditions_to_proceed",
      "B",
      conditionsText,
      ["FACTOR:planned_safeguards", "FACTOR:necessity_conclusion", "FACTOR:safeguard_gaps", "FACTOR:balancing_table"],
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
    // DOC 150 (2026-09-03, Batch-8 A-Team round 2) — § 7152(a)(9) requires
    // the report to document "the date the assessment was reviewed and
    // approved" (primary-source verified verbatim: registry row
    // ra_content_approval, risk-verified-authorities.ts). The old
    // sufficiency sentence claimed a complete § 7152(a)(9) record on
    // names + authority alone; doc 148's contrary reading is RETRACTED.
    // The date is read from the reviewer rows or a top-level field so the
    // branch completes the day the intake collects it; until then the
    // record states the open element instead of asserting sufficiency.
    const approvalDate = resolveRecordedApprovalDate(intake);
    // DOC 152 (2026-09-03, Batch-9 P0) — the recorded date must plausibly
    // approve THIS assessment: a date more than 365 days before the
    // assessment date is a PRIOR review/approval record (batch 962f9090:
    // 2024 approval dates rendered as sufficiency for 2026 assessments).
    // A stale date is preserved as the prior record and the current
    // assessment's approval degrades to additional-information-required —
    // never silently satisfied by history.
    const approvalDateCurrent = approvalDate !== "" &&
      /^\d{4}-\d{2}-\d{2}/.test(approvalDate) &&
      approvalDate >= riskApprovalCurrencyFloor(assessmentDate);
    if (reviewers.length || migrated || authority !== undefined) {
      if (isYes(authority) && (reviewers.length || migrated) && approvalDateCurrent) {
        put(
          "v_governance:1",
          "approval_sufficiency_conclusion",
          "A",
          `The approval record is sufficient for assessment purposes: the reviewers and approvers are identified, at least one approver is confirmed to have authority over whether the processing proceeds, and the assessment is recorded as reviewed and approved on ${approvalDate}.`,
          ["FINAL:assessment_reviewers_approvers", "FINAL:approver_authority_confirmed"],
          ["11 CCR § 7152(a)(9)"],
        );
      } else if (isYes(authority) && (reviewers.length || migrated) && approvalDate) {
        put(
          "v_governance:1",
          "approval_follow_up",
          "B",
          `Approval record — additional information required. Prior internal review or approval is recorded as of ${approvalDate}; § 7152(a)(9) requires the report to document the date THIS assessment was reviewed and approved. Record the current assessment’s review and approval, including its date, to complete the finalization record.`,
          ["FINAL:assessment_reviewers_approvers", "FINAL:approver_authority_confirmed"],
          ["11 CCR § 7152(a)(9)"],
        );
      } else if (isYes(authority) && (reviewers.length || migrated)) {
        put(
          "v_governance:1",
          "approval_follow_up",
          "B",
          "Approval record — additional information required. The reviewers and approvers are identified, and at least one approver is confirmed to have authority over whether the processing proceeds; § 7152(a)(9) additionally requires the report to document the date the assessment was reviewed and approved. Record that date to complete the finalization record.",
          ["FINAL:assessment_reviewers_approvers", "FINAL:approver_authority_confirmed"],
          ["11 CCR § 7152(a)(9)"],
        );
      } else {
        const identifiedNames = [
          ...reviewers.map((r) => s(r.name)).filter(Boolean),
          ...(!reviewers.length && migrated ? [migrated] : []),
        ];
        // DOC 154 (item 13) — an answered "No" is the Company's statement
        // that no listed approver holds the authority; it is not an
        // unanswered question.
        const authorityDenied = isNo(authority);
        put(
          "v_governance:1",
          "approval_follow_up",
          "B",
          authorityDenied
            ? `Approval record — additional information required. ${
              identifiedNames.length
                ? `${asProse(identifiedNames)} ${plural(identifiedNames.length, "is", "are")} identified as ${
                  plural(identifiedNames.length, "a reviewer or approver", "reviewers and approvers")
                }, and the Company records that none is confirmed to have authority over whether the processing proceeds`
                : "The Company records that no approver is confirmed to have authority over whether the processing proceeds"
            }; § 7152(a)(9) requires review and approval by an individual with that authority. Record such an approver to complete the finalization record.`
            : identifiedNames.length > 0
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
    const nextReviewDate = (() => {
      const d = new Date(`${assessmentDate}T00:00:00Z`);
      d.setUTCFullYear(d.getUTCFullYear() + 3);
      return d.toISOString().slice(0, 10);
    })();
    // DOC 154 (item 34) — the cadence conclusion renders on every record: a
    // first assessment (no prior assessment recorded) states the three-year
    // cadence without implying a prior assessment exists; an unanswered
    // material-change question on a record WITH a prior assessment states
    // the open question.
    if (!mc) {
      put(
        "v_governance:6",
        "review_cadence",
        "A",
        isYes(intake.i9_has_existing_dpia)
          ? `The Company has not recorded whether a material change has occurred since the prior assessment; that question should be answered so the 45-day update rule can be applied. The three-year review cadence governs, and the next scheduled review is ${nextReviewDate}.`
          : `This is the first assessment of the Activity on the information provided. The three-year review cadence governs, and the next scheduled review is ${nextReviewDate}.`,
        ["INTAKE:material_change_since_prior", "INTAKE:i9_has_existing_dpia", "SYSTEM:assessment_date"],
        ["11 CCR § 7155"],
      );
    }
    if (mc) {
      const nextReview = nextReviewDate;
      // DOC 148 (A-Team Batch-8 P0) — update-required, update-completed, and
      // update-TIMELY are three separate facts. This assessment establishes
      // the first two; timeliness is verifiable only against the recorded
      // change date. Without that date the report no longer asserts the
      // cadence is satisfied — it states the open verification and directs
      // the record to be completed. With the date, the 45-day arithmetic is
      // applied and stated honestly either way.
      const mcDate = s(intake.material_change_date);
      const mcParsed = /^\d{4}-\d{2}-\d{2}$/.test(mcDate) ? mcDate : null;
      const mcDeadline = mcParsed
        ? (() => {
          const d = new Date(`${mcParsed}T00:00:00Z`);
          d.setUTCDate(d.getUTCDate() + 45);
          return d.toISOString().slice(0, 10);
        })()
        : null;
      const text = isYes(mc)
        ? (mcDate
          ? `The Company records a material change since the prior assessment, dated ${mcDate}. The 45-day update rule governs that change, and this assessment serves as the update on the information provided.${
            mcDeadline
              ? (assessmentDate <= mcDeadline
                ? " The update falls within 45 calendar days of the recorded change, and the governance cadence is satisfied by this assessment."
                : ` On the recorded dates, this update falls outside the 45-calendar-day window (which ended ${mcDeadline}); the update itself is completed by this assessment, and the timing should be addressed in the governance record.`)
              : " The governance cadence is satisfied by this assessment."
          } The next scheduled review is ${nextReview}.`
          : `The Company records a material change since the prior assessment. The 45-day update rule governs that change, and this assessment serves as the update on the information provided. Whether the update was completed within 45 calendar days of the change cannot be verified until the date of the material change is recorded; record that date to complete the governance record. The next scheduled review is ${nextReview}.`)
        : isYes(intake.i9_has_existing_dpia)
        ? `No material change since the prior assessment is recorded. The three-year review cadence governs, and the next scheduled review is ${nextReview}.`
        : `The Company records no material change, and no prior assessment of the Activity is identified in the information provided; this assessment is the first. The three-year review cadence governs, and the next scheduled review is ${nextReview}.`;
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
      // DOC 148 — the reconciled § 7150(b)(3) state never flips a report
      // that asserted a trigger to "assessment not required": with other
      // engaged triggers the answer is unchanged; where the reconciled b3
      // was the ONLY asserted trigger, the conservative answer stays Yes
      // while the trigger table and § 3.A carry the open/excluded state
      // (never a silent downgrade of the requirement on a contradicted
      // record — the doc-142 AIR precedent).
      // DOC 154 — the b(2)-unresolved state keeps the conservative Yes (an
      // asserted-but-open trigger, the same AIR precedent); the b(3)
      // evaluation-stage state is a determined non-engagement on the
      // Company's OWN answer and does not require an assessment by itself.
      // DOC 157 — a categorical b(3) non-engagement is the Company's own
      // determined answer and does not require an assessment by itself (the
      // evaluation-state rule); a categorical answer contradicted by the
      // description keeps the conservative Yes.
      assessment_required: engagedLines.length > 0 || b2Unresolved ||
        (b3Reconciled !== null && (!b3Categorical || b3TextContradiction)),
      inherent: pathways.length ? maxInherent : null,
      residual: pathways.length ? maxResidual : null,
      disposition: consequence,
      // DOC 127 PART I — the controlled badge label and the path/reason line
      // the cover renders beneath an adverse or information-gated
      // disposition. Projections of the determinations above, never new.
      disposition_label: DISPOSITION_LABEL[consequence],
      path_forward: consequence === "do not proceed - remediable"
        ? "To continue with the processing, the Company should satisfy the Conditions for Reassessment in § 4.D."
        : consequence === "do not proceed - redesign required"
        ? "No safeguard can reduce a critical-level risk below the high-risk level; a different disposition requires modifying the Activity itself — reducing the likelihood or severity of the critical risk at its source — and reassessing."
        : consequence === "additional information required"
        // DOC 142 (2026-09-02) — the wholly-absent-a5 path line names ITS
        // gap (no risk recorded at all) and carries the reliance sentence;
        // the doc-127 line stays for the named-but-unassessed case.
        ? (whollyAbsentRisks
          ? "Identify and record the risk or risks to consumers’ privacy the Activity creates, as stated among the Follow-Ups in § 4.D, and update the assessment; the processing should not begin or continue in reliance on this assessment until the identified information is completed."
          : "Provide the likelihood and severity for the risk or risks identified among the Follow-Ups in § 4.D, and update the assessment.")
        : null,
      has_unassessed: unassessed.length > 0,
      conditions_count: conditions.length,
      triggers_engaged_count: engagedLines.length,
    },
  };
}
