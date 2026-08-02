// ITEM 339 (PROSE PROGRAM 3 of 4) — PLAN RENDERER,
// REWORKED UNDER ITEM 347 (DOCUMENT-PLAN REWORK).
//
// KEPT from Item 339 (the CEO ruled these were not the problem):
//   1. CONCLUSION FIRST — the section opens with its determination.
//   2. THEMATIC GROUPING — supporting facts follow in the theme order the
//      ENGINE produced, never in intake order.
//   4. REFERRING EXPRESSIONS — the primary entity shortens after first mention
//      and resets each major section, with the ambiguity guard on.
//   5. AGGREGATION — adjacent single-fact sentences on one topic merge through
//      an approved frame variant, or stay separate.
//
// REWORKED under Item 347:
//   3. CONNECTIVE-EDGE RULE (hard) — a connective is emitted ONLY when the
//      engine's reasoning graph carries an explicit computed edge between the
//      two joined statements. No graph, no edge, no connective: the statements
//      are juxtaposed as plain sentences. Every connective the renderer emits
//      is recorded in `connectives`, with the edge that licensed it.
//   6. NO FIELD-NAME SUBJECTS — a prose statement may not be a pseudo-sentence
//      built on a field name ("triggers on the record is Admt Involved: false").
//      Structured field groups render through the Item 346 frame slots or as
//      labeled RECORD-CARD lines.
//   7. NO ELLIPSIS TRUNCATION — analytic content flows through in full. A mid-
//      content "…" is a defect, not formatting, and is refused.
//   8. DEGRADATION BANNER LOGIC — a section is degraded, and may carry the
//      banner, only when its engine determination is actually
//      `record_insufficient`. A section holding substantive determinations is
//      never banner-degraded.
//
// Nothing here generates prose. Every sentence arrives already realized from
// the engine or from an approved frame.

import type { FrameSet } from "./frames.ts";
import { type AtomicFact, aggregateFacts } from "./aggregate.ts";
import { type Relation, connectiveFor, joinWithConnective } from "./connectives.ts";
import { applyMentionRule, type MentionOptions } from "./mentions.ts";
import { DOCUMENT_PLAN_VERSION, type DocumentPlan, type PlannedSection } from "./plan.ts";
import { extractSpans, type RecordSpan } from "./span-tracking.ts";
import {
  auditConnectives,
  type ConnectiveAudit,
  type ConnectiveUse,
  LEAD_NODE,
  ReasoningGraph,
} from "./reasoning-graph.ts";

export const PLAN_RENDER_VERSION = DOCUMENT_PLAN_VERSION;
export const PLAN_RENDER_REWORK = "prose-plan-render-2026-08-01-item347";

/** One supporting statement, tagged by the engine that produced it. */
export interface SupportingStatement {
  /**
   * Engine-assigned node id. Required for a connective: an edge is looked up
   * by id, so an unnamed statement can never be joined causally.
   */
  readonly id?: string;
  /** Theme id; must appear in the section's declared themes to be placed. */
  readonly theme: string;
  /** Topic within the theme — the aggregation key. */
  readonly topic?: string;
  readonly sentence: string;
  /**
   * Relation to the statement that precedes it, PROPOSED by the engine. It is
   * spoken only if the reasoning graph carries the matching edge.
   */
  readonly relation: Relation;
  readonly values?: Readonly<Record<string, unknown>>;
  /**
   * `record_card` statements are structured record values. They render as
   * labeled lines, never as sentences, and never take a connective.
   */
  readonly kind?: "prose" | "record_card";
  readonly label?: string;
  readonly value?: string;
  /**
   * ITEM 363 — PARAGRAPH SEGMENTATION. A statement flagged `paragraph` opens a
   * NEW paragraph rather than continuing the current one. A paragraph break is
   * never a causal claim, so it takes no connective and needs no edge; the
   * statement's proposed relation is not spoken across a break.
   */
  readonly paragraph?: boolean;
}

/** Whether the engine reached a determination for this section. */
export type DeterminationStatus =
  /** The engine determined something and it is stated. */
  | "stated"
  /** The engine could not determine on this record. THE ONLY BANNER CASE. */
  | "record_insufficient"
  /** The section owes no determination (a record or ask section). */
  | "not_owed";

export interface SectionInput {
  readonly section_id: string;
  /** The determination. Absent means the section degrades honestly. */
  readonly determination?: string;
  /**
   * The engine's own status for this section. Supplied by the composer; when
   * absent it is derived conservatively from what the section owes.
   */
  readonly determination_status?: DeterminationStatus;
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
  /**
   * The engine's computed reasoning graph. Absent means NO connectives: every
   * statement is juxtaposed plainly.
   */
  readonly graph?: ReasoningGraph;
  /**
   * Strict mode (default) refuses field-name subjects and ellipsis truncation
   * by throwing. Set false only to collect lint findings in a report.
   */
  readonly strict?: boolean;
}

export type PlanRenderLintRule =
  | "field_name_subject"
  | "ellipsis_truncation"
  | "unlicensed_connective"
  | "record_card_without_label";

export interface PlanRenderLintFinding {
  readonly rule: PlanRenderLintRule;
  readonly section_id: string;
  readonly detail: string;
}

export interface RecordCardLine {
  readonly label: string;
  readonly value: string;
}

export interface SectionRenderResult {
  readonly section_id: string;
  readonly title: string;
  readonly text: string;
  /** True ONLY when the engine determination is `record_insufficient`. */
  readonly degraded: boolean;
  readonly determination_status: DeterminationStatus;
  readonly information_needed: readonly string[];
  readonly themes_rendered: readonly string[];
  /** Statements whose theme is not declared in the plan; never silently placed. */
  readonly unplaced: readonly string[];
  readonly variants_used: readonly string[];
  /** Labeled record lines; structured values never become pseudo-sentences. */
  readonly record_card: readonly RecordCardLine[];
  /** Every connective emitted, with the engine edge that licensed it. */
  readonly connectives: readonly ConnectiveUse[];
  /**
   * The JOIN SEAMS only — the section text with each statement's own body
   * removed. The connective audit runs over this, because a connective inside
   * a statement is part of an authored, pinned clause (an engine conclusion
   * whose causal claim IS the determination), whereas a connective at a seam is
   * a claim the RENDERER made about how two statements relate. Only the latter
   * needs an edge.
   */
  readonly join_seams: string;
  /** ITEM 363 — offsets of every record-derived span in `text`. */
  readonly spans: readonly RecordSpan[];
  readonly lint: readonly PlanRenderLintFinding[];
}

const DEFAULT_DEGRADATION =
  "The information provided does not go far enough to support a determination in this section.";

// ---------------------------------------------------------------------------
// RULE 6 / RULE 7 — statement hygiene
// ---------------------------------------------------------------------------

/** "… on the record is X", "Admt Involved: false", "q4_pi_categories …". */
const FIELD_NAME_SUBJECT: readonly RegExp[] = [
  /\bon the record is\b/i,
  /(^|[.;]\s)[A-Za-z][A-Za-z0-9 ]{0,40}:\s/,
  /\b[a-z0-9]+(?:_[a-z0-9]+)+\b/,
];

const ELLIPSIS = /(?:\u2026|\.\.\.)/;

export function hasFieldNameSubject(sentence: string): boolean {
  return FIELD_NAME_SUBJECT.some((re) => re.test(sentence));
}

export function hasEllipsisTruncation(sentence: string): boolean {
  return ELLIPSIS.test(sentence);
}

function lintStatementText(
  section_id: string,
  where: string,
  raw: string,
  out: PlanRenderLintFinding[],
): void {
  // ITEM 363 — lint the CLEAN prose. Span sentinels carry a source path with
  // them, and a source path is a field name; linting the marked string would
  // report a field-name subject for every correctly attributed record value.
  const text = extractSpans(raw).text;
  if (hasFieldNameSubject(text)) {
    out.push({
      rule: "field_name_subject",
      section_id,
      detail: `${where}: field-name pseudo-sentence — "${text}"`,
    });
  }
  if (hasEllipsisTruncation(text)) {
    out.push({
      rule: "ellipsis_truncation",
      section_id,
      detail: `${where}: analytic content truncated with an ellipsis — "${text}"`,
    });
  }
}

export function renderPlannedSection(
  section: PlannedSection,
  input: SectionInput,
  opts: PlanRenderOptions,
): SectionRenderResult {
  const strict = opts.strict !== false;
  const lint: PlanRenderLintFinding[] = [];
  const declared = new Set(section.themes);
  const unplaced = input.statements
    .filter((s) => !declared.has(s.theme))
    .map((s) => s.theme);

  // RECORD CARD — structured values are pulled out before any prose runs.
  const cardStatements = input.statements.filter(
    (s) => s.kind === "record_card" && declared.has(s.theme),
  );
  const record_card: RecordCardLine[] = [];
  for (const c of cardStatements) {
    if (!c.label?.trim()) {
      lint.push({
        rule: "record_card_without_label",
        section_id: section.id,
        detail: `record-card statement with no label: "${c.value ?? c.sentence}"`,
      });
      continue;
    }
    const value = (c.value ?? c.sentence ?? "").trim();
    if (hasEllipsisTruncation(value)) {
      lint.push({
        rule: "ellipsis_truncation",
        section_id: section.id,
        detail: `record card "${c.label}" is truncated with an ellipsis`,
      });
    }
    record_card.push({ label: c.label.trim(), value });
  }

  // (2) THEMATIC GROUPING in the engine's own theme order (prose only).
  const grouped: SupportingStatement[] = [];
  for (const theme of section.themes) {
    for (const s of input.statements) {
      if (s.theme === theme && s.kind !== "record_card") grouped.push(s);
    }
  }

  for (const s of grouped) lintStatementText(section.id, s.id ?? s.theme, s.sentence, lint);
  if (input.determination) {
    lintStatementText(section.id, "determination", input.determination, lint);
  }
  if (strict) {
    const fatal = lint.filter(
      (f) => f.rule === "field_name_subject" || f.rule === "ellipsis_truncation",
    );
    if (fatal.length) {
      throw new Error(
        `plan render refused for section ${section.id}:\n` +
          fatal.map((f) => `  ${f.rule} — ${f.detail}`).join("\n"),
      );
    }
  }

  // (5) AGGREGATION, within a theme, over adjacent same-topic facts.
  const facts: AtomicFact[] = grouped.map((s) => ({
    topic: `${s.theme}:${s.topic ?? s.theme}`,
    sentence: s.sentence,
    values: s.values,
  }));
  const agg = aggregateFacts(facts, { frames: opts.frames, resolveCite: opts.resolveCite });

  // Aggregation may collapse sentences; the relation and the node id are
  // carried by the FIRST statement of each surviving run, which is the one the
  // engine related to what precedes it.
  const relations: Relation[] = [];
  const nodeIds: (string | undefined)[] = [];
  const breaks: boolean[] = [];
  {
    let i = 0;
    for (const _ of agg.sentences) {
      relations.push(grouped[i]?.relation ?? "none");
      nodeIds.push(grouped[i]?.id);
      breaks.push(grouped[i]?.paragraph === true);
      i += runLengthAt(facts, i);
    }
  }

  // (1) CONCLUSION FIRST — an outcome section leads with its determination.
  //     A record/action section has no determination to make: it leads with its
  //     first statement and is NOT degraded for lacking one.
  const hasDetermination = Boolean(input.determination?.trim());
  const owesDetermination = section.lead === "determination";
  const hasBody = agg.sentences.length > 0 || record_card.length > 0;

  // (8) DEGRADATION BANNER LOGIC — the status is the engine's, and the banner
  //     follows the status, not the shape of the section.
  const status: DeterminationStatus = input.determination_status ??
    (hasDetermination ? "stated" : owesDetermination ? "record_insufficient" : hasBody ? "not_owed" : "record_insufficient");
  const degraded = status === "record_insufficient";

  const leadRaw = hasDetermination
    ? input.determination!.trim()
    : owesDetermination
    ? (opts.degradationSentence ?? DEFAULT_DEGRADATION)
    : agg.sentences.length > 0
    ? agg.sentences[0]
    : record_card.length > 0
    ? ""
    : (opts.degradationSentence ?? DEFAULT_DEGRADATION);
  const usedFirstStatement = !hasDetermination && !owesDetermination &&
    agg.sentences.length > 0;
  const rest = usedFirstStatement ? agg.sentences.slice(1) : agg.sentences;
  const restRelations = usedFirstStatement ? relations.slice(1) : relations;
  const restIds = usedFirstStatement ? nodeIds.slice(1) : nodeIds;
  const restBreaks = usedFirstStatement ? breaks.slice(1) : breaks;
  const leadId = usedFirstStatement ? (nodeIds[0] ?? LEAD_NODE) : LEAD_NODE;

  // (4) REFERRING EXPRESSIONS — applied BEFORE joining, one tracker per major
  // section, so the connective layer never case-folds a legal name.
  const mentioned = applyMentionRule(leadRaw ? [leadRaw, ...rest] : rest, opts.mentions);
  const lead = leadRaw ? upperFirst(mentioned[0]) : "";
  const body = leadRaw ? mentioned.slice(1) : mentioned;

  // (3) CONNECTIVE-EDGE RULE.
  const occurrences = new Map<Relation, number>();
  const connectives: ConnectiveUse[] = [];
  let text = lead;
  let prevId = leadId;
  body.forEach((s, i) => {
    const proposed = restRelations[i] ?? "none";
    const thisId = restIds[i];

    // PARAGRAPH SEGMENTATION — a break is a layout decision, never a claim.
    if (restBreaks[i]) {
      const opened = `${upperFirst(s.trim().replace(/[.;]\s*$/, ""))}.`;
      text = text ? `${text}\n\n${opened}` : opened;
      if (thisId) prevId = thisId;
      return;
    }

    const licensingEdge = opts.graph && thisId
      ? opts.graph.get(prevId, thisId, proposed)
      : null;
    const rel: Relation = licensingEdge ? proposed : "none";

    const n = occurrences.get(rel) ?? 0;
    occurrences.set(rel, n + 1);
    if (licensingEdge) {
      connectives.push({
        word: connectiveFor(rel, n).toLowerCase(),
        relation: rel,
        from: licensingEdge.from,
        to: licensingEdge.to,
        basis: licensingEdge.basis,
      });
    }
    text = text ? joinWithConnective(text, s, rel, n) : `${upperFirst(s.trim())}.`;
    if (thisId) prevId = thisId;
  });

  // A rendered sentence always closes; a bare lead must not trail open.
  if (text && !/[.?!”"]\s*$/.test(text)) text = `${text}.`;

  if (record_card.length) {

    const card = record_card.map((l) => `- ${l.label}: ${l.value}`).join("\n");
    text = text ? `${text}\n\n${card}` : card;
  }

  // Self-audit over the SEAMS: any connective the renderer inserted between
  // two statements that no computed edge licensed is a defect.
  const join_seams = seamsOf(
    stripRecordCard(text, record_card.length),
    [lead, ...body].filter(Boolean),
  );
  const audit = auditConnectives(join_seams, connectives);
  for (const f of audit.findings) {
    lint.push({
      rule: "unlicensed_connective",
      section_id: section.id,
      detail: `"${f.word}" at ${f.index} maps to no computed edge`,
    });
  }

  // ITEM 363 — TIGHTER GRAMMAR: an em dash always sits between spaces, even
  // where a pinned clause's own leading space was trimmed at the slot seam.
  const spaced = text.replace(/(\S)\u2014/g, "$1 \u2014").replace(/\u2014(\S)/g, "\u2014 $1");

  // ITEM 363 — strip the tracking sentinels exactly once, at the end, and hand
  // back the offsets the lint battery and the validators read.
  const extracted = extractSpans(spaced);

  return {
    section_id: section.id,
    title: section.title,
    text: extracted.text,
    spans: extracted.spans,
    degraded,
    determination_status: status,
    information_needed: (input.information_needed ?? []).map((x) => extractSpans(String(x)).text),
    themes_rendered: section.themes.filter((t) =>
      grouped.some((s) => s.theme === t) || cardStatements.some((s) => s.theme === t)
    ),
    unplaced,
    variants_used: agg.variants_used,
    record_card: record_card.map((l) => ({
      label: extractSpans(l.label).text,
      value: extractSpans(l.value).text,
    })),
    connectives,
    join_seams,
    lint,
  };
}

/**
 * Removes each statement's own body from the rendered text, leaving the glue
 * the renderer inserted between statements.
 */
function seamsOf(text: string, fragments: readonly string[]): string {
  let out = text;
  for (const f of fragments) {
    const body = f.trim().replace(/^[A-Z]/, (c) => c.toLowerCase()).replace(/[.;]\s*$/, "");
    if (body.length < 8) continue;
    for (const variant of [body, body[0].toUpperCase() + body.slice(1)]) {
      const at = out.indexOf(variant);
      if (at >= 0) {
        out = out.slice(0, at) + " \u2588 " + out.slice(at + variant.length);
        break;
      }
    }
  }
  return out;
}

/** The record card is labeled data, not prose; it is out of scope for the audit. */
function stripRecordCard(text: string, cardLines: number): string {
  if (!cardLines) return text;
  const parts = text.split("\n\n");
  return parts.slice(0, Math.max(1, parts.length - 1)).join("\n\n");
}

/** Convenience for tests and reports: audit a finished section render. */
export function auditSectionConnectives(result: SectionRenderResult): ConnectiveAudit {
  return auditConnectives(result.join_seams, result.connectives);
}

const upperFirst = (s: string) => (s ? s[0].toUpperCase() + s.slice(1) : s);

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
        renderPlannedSection(
          section,
          {
            section_id: section.id,
            statements: [],
            determination_status: "record_insufficient",
          },
          opts,
        ),
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
