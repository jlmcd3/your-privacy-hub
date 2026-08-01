// ITEM 339 (PROSE PROGRAM 3 of 4) — PLAN RENDERER.
//
// Turns the engine's reasoning structure into an organized argument:
//
//   1. CONCLUSION FIRST — the section opens with its determination.
//   2. THEMATIC GROUPING — supporting facts follow in the theme order the
//      ENGINE produced (which facts fed which conclusion), never in intake
//      order and never in an order a model chose.
//   3. DETERMINISTIC CONNECTIVES — adjacent statements are joined with the
//      connective their asserted relation licenses.
//   4. REFERRING EXPRESSIONS — the primary entity shortens after first mention
//      and resets each major section, with the ambiguity guard on.
//   5. AGGREGATION — adjacent single-fact sentences on one topic merge through
//      an approved Item 338 frame variant, or stay separate.
//
// Nothing here generates prose. Every sentence arrives already realized from
// the engine or from an approved frame.

import type { FrameSet } from "./frames.ts";
import { type AtomicFact, aggregateFacts } from "./aggregate.ts";
import { type Relation, joinWithConnective } from "./connectives.ts";
import { applyMentionRule, type MentionOptions } from "./mentions.ts";
import { DOCUMENT_PLAN_VERSION, type DocumentPlan, type PlannedSection } from "./plan.ts";

export const PLAN_RENDER_VERSION = DOCUMENT_PLAN_VERSION;

/** One supporting statement, tagged by the engine that produced it. */
export interface SupportingStatement {
  /** Theme id; must appear in the section's declared themes to be placed. */
  readonly theme: string;
  /** Topic within the theme — the aggregation key. */
  readonly topic?: string;
  readonly sentence: string;
  /** Relation to the statement that precedes it, asserted by the engine. */
  readonly relation: Relation;
  readonly values?: Readonly<Record<string, unknown>>;
}

export interface SectionInput {
  readonly section_id: string;
  /** The determination. Absent means the section degrades honestly. */
  readonly determination?: string;
  readonly statements: readonly SupportingStatement[];
  /** Named items the record is silent on, for the degradation path. */
  readonly information_needed?: readonly string[];
}

export interface PlanRenderOptions {
  readonly mentions: MentionOptions;
  readonly frames?: FrameSet;
  readonly resolveCite?: (key: string) => string | null;
  /** Sentence used when a section has no determination on the record. */
  readonly degradationSentence?: string;
}

export interface SectionRenderResult {
  readonly section_id: string;
  readonly title: string;
  readonly text: string;
  readonly degraded: boolean;
  readonly information_needed: readonly string[];
  readonly themes_rendered: readonly string[];
  /** Statements whose theme is not declared in the plan; never silently placed. */
  readonly unplaced: readonly string[];
  readonly variants_used: readonly string[];
}

const DEFAULT_DEGRADATION =
  "The record does not state enough for a determination in this section.";

export function renderPlannedSection(
  section: PlannedSection,
  input: SectionInput,
  opts: PlanRenderOptions,
): SectionRenderResult {
  const declared = new Set(section.themes);
  const unplaced = input.statements
    .filter((s) => !declared.has(s.theme))
    .map((s) => s.theme);

  // (2) THEMATIC GROUPING in the engine's own theme order.
  const grouped: SupportingStatement[] = [];
  for (const theme of section.themes) {
    for (const s of input.statements) if (s.theme === theme) grouped.push(s);
  }

  // (5) AGGREGATION, within a theme, over adjacent same-topic facts.
  const facts: AtomicFact[] = grouped.map((s) => ({
    topic: `${s.theme}:${s.topic ?? s.theme}`,
    sentence: s.sentence,
    values: s.values,
  }));
  const agg = aggregateFacts(facts, { frames: opts.frames, resolveCite: opts.resolveCite });

  // Aggregation may collapse sentences; relations are carried by the FIRST
  // statement of each surviving run, which is the one the engine related to
  // what precedes it.
  const relations: Relation[] = [];
  {
    let i = 0;
    for (const _ of agg.sentences) {
      relations.push(grouped[i]?.relation ?? "none");
      i += runLengthAt(facts, i);
    }
  }

  // (1) CONCLUSION FIRST.
  const degraded = !input.determination?.trim();
  const lead = degraded
    ? (opts.degradationSentence ?? DEFAULT_DEGRADATION)
    : input.determination!.trim();

  // (3) DETERMINISTIC CONNECTIVES.
  const occurrences = new Map<Relation, number>();
  let text = lead;
  agg.sentences.forEach((s, i) => {
    const rel = relations[i] ?? "none";
    const n = occurrences.get(rel) ?? 0;
    occurrences.set(rel, n + 1);
    text = joinWithConnective(text, s, rel, n);
  });

  // (4) REFERRING EXPRESSIONS — one tracker per major section.
  const [rewritten] = applyMentionRule([text], opts.mentions);

  return {
    section_id: section.id,
    title: section.title,
    text: rewritten,
    degraded,
    information_needed: degraded
      ? [...(input.information_needed ?? [])]
      : (input.information_needed ?? []).slice(),
    themes_rendered: section.themes.filter((t) => grouped.some((s) => s.theme === t)),
    unplaced,
    variants_used: agg.variants_used,
  };
}

/** Length of the aggregated run starting at index i (mirrors aggregateFacts). */
function runLengthAt(facts: readonly AtomicFact[], i: number): number {
  let j = i + 1;
  while (j < facts.length && facts[j].topic === facts[i].topic && j - i < 3) j++;
  return Math.max(1, j - i);
}

export interface DocumentRenderResult {
  readonly product: string;
  readonly version: string;
  readonly sections: readonly SectionRenderResult[];
  readonly arc: readonly string[];
}

/**
 * Renders a whole document through its plan. Sections the engine produced no
 * input for are emitted degraded when required, and dropped otherwise.
 */
export function renderDocumentFromPlan(
  plan: DocumentPlan,
  inputs: Readonly<Record<string, SectionInput>>,
  opts: PlanRenderOptions,
): DocumentRenderResult {
  const out: SectionRenderResult[] = [];
  for (const section of plan.sections) {
    const input = inputs[section.id];
    if (!input) {
      if (!section.required) continue;
      out.push(
        renderPlannedSection(section, { section_id: section.id, statements: [] }, opts),
      );
      continue;
    }
    out.push(renderPlannedSection(section, input, opts));
  }
  return {
    product: plan.product,
    version: plan.version,
    sections: out,
    arc: plan.sections.map((s) => s.arc_stage).filter((s, i, a) => a[i - 1] !== s),
  };
}
