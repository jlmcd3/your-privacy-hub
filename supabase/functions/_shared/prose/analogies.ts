// ITEM 363 — CORPUS ANALOGIES SECTION (cppa-risk).
//
// Wires the existing `eu_persuasive_authority` content into the document as a
// named section, under the CEO's rules:
//
//   * cppa-risk carries a MAXIMUM OF 3 analogies, most-similar first, ordered
//     by the deterministic tag/provision matching that already engages the
//     topic. (FLEET RULE, recorded for the propagation item: other products
//     apply no fixed numeric cap; inclusion is governed by the materiality
//     threshold below and analogies group under the factor they inform.)
//   * every analogy carries BOTH (i) a one-sentence statement of why it is
//     analogous AND (ii) a statement of how it bears on this assessment's
//     reasoning, tied to a NAMED factor/section of this report.
//   * the impact statement is ASSEMBLED FROM AUTHORED FACTOR-CLASS FRAMES via
//     the deterministic analogy→factor linkage. It is never free-generated,
//     never outcome-predictive, and never restates the engine's verdict.
//   * pattern-level, non-binding, different-regime framing per standing rules.
//     The CPPA-INCLUSION-GATE is unchanged: this section reads the EU/EEA
//     corpus the Item 341 builder already filtered.
//
// MATERIALITY THRESHOLD (deterministic, no model):
//   1. the topic is ENGAGED by a named intake key holding a named value;
//   2. the topic carries at least one ADMISSIBLE element (a byte-exact
//      guidance pin, an Art. 60 pattern count, or a VERIFIED precedent);
//   3. the topic's factor class is LIVE in this assessment — i.e. the report
//      actually contains the factor the impact statement would attach to.
// A topic that fails any limb is not rendered. When none qualifies the section
// renders the canonical no-analogy sentence, verbatim.

import type {
  EuAuthoritySection,
  EuAuthorityTopic,
  EuTopicId,
} from "../ltp/eu-authority/types.ts";
import { rec } from "./span-tracking.ts";

export const CORPUS_ANALOGIES_VERSION = "prose-analogies-2026-08-01-item363";

export const CPPA_RISK_ANALOGY_CAP = 3;

/** The canonical empty-section sentence. Rendered VERBATIM or not at all. */
export const NO_ANALOGY_SENTENCE =
  "We did not discern any directly analogous regulator decisions in the verified corpus this assessment draws on that would be materially relevant to the analysis.";

/** Named factors of THIS report an analogy may attach to. */
export type FactorClass =
  | "minimisation"
  | "impacts"
  | "impairment"
  | "safeguards"
  | "weighing"
  | "initiation";

/** Authored labels naming the factor/section of this report. Pinned data. */
export const FACTOR_LABELS: Readonly<Record<FactorClass, string>> = Object.freeze({
  minimisation: "§ 7152(a)(2) minimum-necessary analysis above",
  impacts: "§ 7152(a)(5) negative-impact analysis above",
  impairment: "§ 7152(a)(5)(C) impairment analysis above",
  safeguards: "§ 7152(a)(6) safeguard-and-residual analysis above",
  weighing: "§ 7152(a)(4) benefits-and-weighing analysis above",
  initiation: "§ 7152(a)(7) initiation determination above",
});

/**
 * AUTHORED FACTOR-CLASS FRAMES. One per factor. The impact statement is
 * assembled from these and the factor label — never generated at render time.
 * Each frame is descriptive of the CONSIDERATION, never of the OUTCOME.
 */
export const FACTOR_IMPACT_FRAMES: Readonly<Record<FactorClass, string>> = Object.freeze({
  minimisation:
    "It bears on the {FACTOR}, where the question is which elements of the collection set the stated purpose actually needs; the material describes how another regulator has framed that same question.",
  impacts:
    "It bears on the {FACTOR}, where the question is which impacts the processing causes and by what route; the material describes how another regulator has framed the identification of that same class of impact.",
  impairment:
    "It bears on the {FACTOR}, where the question is whether the processing impairs a consumer's ability to exercise a choice; the material describes how another regulator has framed that same impairment question.",
  safeguards:
    "It bears on the {FACTOR}, where the question is what remains after the described safeguards are applied; the material describes how another regulator has framed the measurement of that residual.",
  weighing:
    "It bears on the {FACTOR}, where the question is what weight a stated benefit can carry against an identified impact; the material describes how another regulator has framed that same comparison.",
  initiation:
    "It bears on the {FACTOR}, where the question is what a record must contain before processing begins; the material describes the record another regulator has looked for.",
});

/** DETERMINISTIC analogy→factor linkage. Topic ids are the Item 341 set. */
export const TOPIC_FACTOR_LINKAGE: Readonly<Record<EuTopicId, FactorClass>> = Object.freeze({
  risk_methodology: "impacts",
  automated_decision_making: "impairment",
  sensitive_data: "impacts",
  vulnerable_or_minor_subjects: "impairment",
  legitimate_interest_balancing: "weighing",
  access_and_transparency: "safeguards",
  retention: "minimisation",
});

/**
 * Patterns that must NEVER appear in this section. An analogy is pattern-level
 * and non-binding: it may not predict an outcome or restate the verdict.
 */
export const BANNED_ANALOGY_PATTERNS: readonly RegExp[] = [
  /\btherefore your risk\b/i,
  /\byour (?:case|assessment|processing) (?:will|would|is likely to)\b/i,
  /\bthis means (?:you|your)\b/i,
  /\bpredicts?\b/i,
  /\byou (?:will|would) (?:be )?(?:fined|penalis|penaliz|found)/i,
  /\b(?:initiate_with_conditions|do_not_initiate_absent_change|reserved_insufficient_record)\b/i,
  /\bthe assessment (?:therefore )?(?:finds|concludes|determines)\b/i,
];

export interface AnalogyItem {
  readonly topic_id: EuTopicId;
  readonly topic_label: string;
  readonly factor: FactorClass;
  /** (i) why this material is analogous. One sentence. */
  readonly why_analogous: string;
  /** The corpus material itself, already admissible under Item 341. */
  readonly material: string;
  /** (ii) how it bears on this assessment, tied to a named factor. */
  readonly impact_statement: string;
  readonly rank_score: number;
}

export interface CorpusAnalogiesResult {
  readonly version: string;
  readonly framing: readonly string[];
  readonly items: readonly AnalogyItem[];
  readonly empty: boolean;
  /** Rendered paragraphs, in order, ready to be placed as statements. */
  readonly paragraphs: readonly string[];
}

function admissibleCount(t: EuAuthorityTopic): number {
  return t.guidance.length * 3 + t.verified_precedents.length * 2 +
    t.pattern_observations.length;
}

function materialFor(t: EuAuthorityTopic): string | null {
  const g = t.guidance[0];
  if (g) {
    return `The European Data Protection Board states, at ${g.citation}: “${g.verbatim_quote}”`;
  }
  const p = t.pattern_observations[0];
  if (p) {
    return `Across the Article 60 register, ${p.observation}`;
  }
  const e = t.verified_precedents[0];
  if (e) {
    const provisions = e.provisions.join(", ");
    return `A verified decision of the ${e.regulator} (${e.jurisdiction}, ${e.decision_date}) turned on ${
      provisions || "the same subject matter"
    }`;
  }
  return null;
}

function whyAnalogous(t: EuAuthorityTopic): string {
  const trig = t.triggers[0];
  const label = t.topic_label.replace(/\.$/, "");
  if (trig && trig.intake_key !== "(section)") {
    return `This material is analogous because the company has itself put the same subject matter in issue: it reports ${
      rec(trig.intake_value, trig.intake_key)
    }, which is the ${label.toLowerCase()} question the material addresses.`;
  }
  return `This material is analogous because the assessment performs the same operation the material addresses, namely ${label.toLowerCase()}.`;
}

function impactStatement(factor: FactorClass): string {
  return FACTOR_IMPACT_FRAMES[factor].replace("{FACTOR}", FACTOR_LABELS[factor]);
}

export interface BuildAnalogiesInput {
  readonly section?: EuAuthoritySection | null;
  /** Factor classes this report actually contains. */
  readonly live_factors: readonly FactorClass[];
  readonly cap?: number;
}

export function buildCorpusAnalogies(input: BuildAnalogiesInput): CorpusAnalogiesResult {
  const cap = input.cap ?? CPPA_RISK_ANALOGY_CAP;
  const live = new Set(input.live_factors);
  const section = input.section ?? null;

  const framing = section
    ? [
      `${section.framing.regime_label} ${section.framing.persuasive_note}`,
      `${section.framing.weight_reservation} ${section.framing.carve_out_note}`,
    ]
    : [];

  const candidates = (section?.topics ?? [])
    .filter((t) => t.status === "authority_available")
    .map((t) => {
      const factor = TOPIC_FACTOR_LINKAGE[t.topic_id];
      return { t, factor, score: admissibleCount(t) };
    })
    .filter((c) => Boolean(c.factor) && live.has(c.factor))
    .filter((c) => materialFor(c.t) !== null)
    .sort((a, b) => (b.score - a.score) || a.t.topic_id.localeCompare(b.t.topic_id))
    .slice(0, cap);

  const items: AnalogyItem[] = candidates.map((c) => ({
    topic_id: c.t.topic_id,
    topic_label: c.t.topic_label,
    factor: c.factor,
    why_analogous: whyAnalogous(c.t),
    material: materialFor(c.t) as string,
    impact_statement: impactStatement(c.factor),
    rank_score: c.score,
  }));

  const paragraphs = items.length
    ? [...framing, ...items.map((i) => `${i.material}. ${i.why_analogous} ${i.impact_statement}`)]
    : [NO_ANALOGY_SENTENCE];

  return {
    version: CORPUS_ANALOGIES_VERSION,
    framing,
    items,
    empty: items.length === 0,
    paragraphs: paragraphs.map((p) => p.replace(/\.\s*\./g, ".")),
  };
}
