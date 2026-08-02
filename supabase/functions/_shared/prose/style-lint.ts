// ITEM 363 — STYLE LINT BATTERY.
//
// One check per CEO style rule, plus the structural checks the acceptance bar
// names. Every rule here is mechanical: it reads the RENDERED document (clean
// text + record-span offsets from ./span-tracking.ts) and returns findings.
// Nothing here rewrites prose.
//
// REGISTER TARGET (the fleet style template): a detailed report as written by
// senior legal counsel with assistance from professional writers.

import { BANNED_ANALOGY_PATTERNS, NO_ANALOGY_SENTENCE } from "./analogies.ts";
import type { RecordSpan } from "./span-tracking.ts";

export const STYLE_LINT_VERSION = "prose-style-lint-2026-08-01-item363";

export type StyleRule =
  | "quoted_intake_value"
  | "banned_record_phrase"
  | "attribution_missing"
  | "attribution_vocabulary_thin"
  | "mechanical_verb_rotation"
  | "pluralisation_artifact"
  | "punctuation_collision"
  | "section_order"
  | "sentence_duplication"
  | "paragraph_segmentation"
  | "analogy_missing_why"
  | "analogy_missing_impact"
  | "analogy_outcome_predictive"
  | "analogy_empty_sentence";

export interface StyleFinding {
  readonly rule: StyleRule;
  readonly section_id: string;
  readonly detail: string;
}

export interface LintableSection {
  readonly section_id: string;
  readonly title: string;
  readonly text: string;
  readonly spans: readonly RecordSpan[];
}

// ---------------------------------------------------------------------------
// ATTRIBUTION VOCABULARY (binding, lawyers' rule)
// ---------------------------------------------------------------------------

/**
 * A company claim never appears as the tool's own assertion. Every
 * span-tracked value is governed by one of these verbs, inside a clause whose
 * subject is the company (or, after first mention, "it").
 */
export const ATTRIBUTION_VERBS: readonly string[] = [
  "states",
  "state",
  "stated",
  "reports",
  "report",
  "describes",
  "describe",
  "described",
  "identifies",
  "identified",
  "has identified",
  "gives",
  "give",
  "names",
  "name",
  "lists",
  "list",
  "sets out",
  "set out",
  "records",
  "record",
  "puts it",
  "puts",
  "traces",
  "attributes to",
  "provides",
  "provide",
  "confirms",
  "answers",
  "treats",
  "characterises",
  "accounts for",
  "attributes",
];

const VERB_ALT = ATTRIBUTION_VERBS.slice()
  .sort((a, b) => b.length - a.length)
  .map((v) => v.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
  .join("|");

function attributionRe(entity?: string): RegExp {
  const subjects = [
    "the company",
    "the business",
    "the organisation",
    "the organization",
    "it",
    "its record",
    "the company's record",
  ];
  if (entity && entity.trim()) subjects.unshift(escapeRe(entity.trim()));
  return new RegExp(
    `\\b(?:${subjects.join("|")})\\b(?:'s)?[^.]{0,400}?\\b(?:${VERB_ALT})\\b`,
    "i",
  );
}

/** Which attribution verb governs, for the rotation check. */
function governingVerb(clause: string): string | null {
  const m = new RegExp(`\\b(${VERB_ALT})\\b`, "i").exec(clause);
  return m ? m[1].toLowerCase() : null;
}

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// ---------------------------------------------------------------------------
// BANNED PHRASING
// ---------------------------------------------------------------------------

/**
 * Zero occurrences of the "on the record" / "the record states" register.
 *
 * CARVE-OUT, recorded in the ledger: the CEO's own EXECUTIVE-LEAD exemplar is
 * "On the record the company provided, the assessment finds …". That phrase is
 * attributed on its face and is the specified wording, so it is the single
 * permitted realisation; the bare register remains banned everywhere.
 */
export const BANNED_RECORD_PHRASES: readonly RegExp[] = [
  /\bon the record\b(?!\s+the company provided\b)/gi,
  /\bthe record states\b/gi,
  /\bon this record\b/gi,
  /\bthe record shows\b/gi,
  /\bthe record identifies\b/gi,
  /\bthe record describes\b/gi,
  /\bthe record gives\b/gi,
  /\bthe record needs\b/gi,
  /\bthe record answers\b/gi,
  /\bthe record lists\b/gi,
  /\bnot stated on the record\b/gi,
];

// ---------------------------------------------------------------------------
// TEXT UTILITIES
// ---------------------------------------------------------------------------

export function splitSentences(text: string): Array<{ text: string; start: number }> {
  const out: Array<{ text: string; start: number }> = [];
  const src = String(text ?? "");
  let start = 0;
  const re = /[.!?](?=\s|$)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(src))) {
    const end = m.index + 1;
    const chunk = src.slice(start, end);
    // Do not break inside a pinpoint such as "§ 7152(a)(2)." when the clause
    // plainly continues in lower case; a following capital IS a new sentence.
    const nextCh = (src.slice(end).match(/\S/) ?? [""])[0];
    if (/§\s*\d[\d().a-z]*$/i.test(chunk.trim()) && /[a-z]/.test(nextCh)) continue;
    out.push({ text: chunk.trim(), start });
    start = end;
    while (start < src.length && /\s/.test(src[start])) start++;
    re.lastIndex = start;
  }
  if (start < src.length && src.slice(start).trim()) {
    out.push({ text: src.slice(start).trim(), start });
  }
  return out;
}

function normSentence(s: string): string {
  return s
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2010-\u2015]/g, "-")
    .replace(/\s+/g, " ")
    .replace(/[.;:,]+$/, "")
    .trim()
    .toLowerCase();
}

/** Lines that are labeled record-card data rather than prose. */
const CARD_LINE = /^\s*[-•]\s+[^:]{1,60}:\s/;

function lineAt(text: string, index: number): string {
  const from = text.lastIndexOf("\n", Math.max(0, index - 1)) + 1;
  const toRaw = text.indexOf("\n", index);
  const to = toRaw === -1 ? text.length : toRaw;
  return text.slice(from, to);
}

// ---------------------------------------------------------------------------
// THE BATTERY
// ---------------------------------------------------------------------------

export interface StyleLintOptions {
  /** Primary entity, admitted as an attribution subject. */
  readonly entity?: string;
  /** Section ids in the order the plan requires them. */
  readonly expected_order?: readonly string[];
  /** section_id → minimum paragraph count. */
  readonly min_paragraphs?: Readonly<Record<string, number>>;
  /** Section id carrying the corpus analogies. */
  readonly analogy_section_id?: string;
  /** Number of analogies the builder admitted (0 → canonical sentence). */
  readonly analogy_count?: number;
}

export function lintDocumentStyle(
  sections: readonly LintableSection[],
  opts: StyleLintOptions = {},
): StyleFinding[] {
  const out: StyleFinding[] = [];
  const attribution = attributionRe(opts.entity);

  // ── RULE: section order ───────────────────────────────────────────────
  if (opts.expected_order?.length) {
    const actual = sections.map((s) => s.section_id);
    const expected = opts.expected_order.filter((id) => actual.includes(id));
    const trimmed = actual.filter((id) => expected.includes(id));
    if (trimmed.join(">") !== expected.join(">")) {
      out.push({
        rule: "section_order",
        section_id: "(document)",
        detail: `section order is ${trimmed.join(" > ")}; the plan requires ${expected.join(" > ")}`,
      });
    }
  }

  const verbSequence: string[] = [];
  const seenSentences = new Map<string, string>();

  for (const s of sections) {
    const text = s.text ?? "";

    // ── RULE: no quotation marks around intake-derived values ───────────
    for (const q of quotedRegions(text)) {
      const overlaps = (s.spans ?? []).some((sp) => sp.start < q.end && sp.end > q.start);
      if (overlaps) {
        out.push({
          rule: "quoted_intake_value",
          section_id: s.section_id,
          detail: `record-derived value is wrapped in quotation marks: ${text.slice(q.start, q.end)}`,
        });
      }
    }

    // ── RULE: banned record register ────────────────────────────────────
    for (const re of BANNED_RECORD_PHRASES) {
      const rx = new RegExp(re.source, re.flags.includes("g") ? re.flags : `${re.flags}g`);
      let m: RegExpExecArray | null;
      while ((m = rx.exec(text))) {
        out.push({
          rule: "banned_record_phrase",
          section_id: s.section_id,
          detail: `banned phrasing "${m[0]}" at ${m.index}`,
        });
      }
    }

    // ── RULE: "1 element(s)" pluralisation artifacts ────────────────────
    for (const m of text.matchAll(/\b\w+\(s\)/g)) {
      out.push({
        rule: "pluralisation_artifact",
        section_id: s.section_id,
        detail: `pluralisation artifact "${m[0]}"`,
      });
    }
    for (const m of text.matchAll(/\b1\s+(?:[a-z]+s)\b/g)) {
      if (/\b1\s+(?:is|was|has|s)\b/.test(m[0])) continue;
      out.push({
        rule: "pluralisation_artifact",
        section_id: s.section_id,
        detail: `singular count with a plural noun: "${m[0]}"`,
      });
    }

    // ── RULE: value-final punctuation collisions ────────────────────────
    for (const m of text.matchAll(/[.,;:]\s*[.,;:]/g)) {
      out.push({
        rule: "punctuation_collision",
        section_id: s.section_id,
        detail: `punctuation collision "${m[0]}" at ${m.index}`,
      });
    }
    for (const m of text.matchAll(/\s+[.,;:](?:\s|$)/g)) {
      out.push({
        rule: "punctuation_collision",
        section_id: s.section_id,
        detail: `space before punctuation at ${m.index}`,
      });
    }

    // ── RULE: attribution integrity ─────────────────────────────────────
    const sentences = splitSentences(text);
    const sentenceHasCard = (idx: number) => CARD_LINE.test(lineAt(text, idx));
    for (const span of s.spans ?? []) {
      if (sentenceHasCard(span.start)) continue; // labeled record-card data
      const host = sentences.find((x) => span.start >= x.start && span.start < x.start + x.text.length + 1);
      if (!host) continue;
      const before = text.slice(host.start, span.start);
      if (!attribution.test(before)) {
        out.push({
          rule: "attribution_missing",
          section_id: s.section_id,
          detail: `record value "${span.value}" (${span.source}) is not governed by an attribution verb — "${host.text}"`,
        });
        continue;
      }
      const v = governingVerb(before);
      if (v) verbSequence.push(v);
    }

    // ── RULE: no sentence-level duplication across sections ─────────────
    for (const sent of sentences) {
      const key = normSentence(sent.text);
      if (key.length < 40) continue;
      if (CARD_LINE.test(sent.text)) continue;
      const prior = seenSentences.get(key);
      if (prior && prior !== s.section_id) {
        out.push({
          rule: "sentence_duplication",
          section_id: s.section_id,
          detail: `sentence duplicated from ${prior}: "${sent.text}"`,
        });
      } else if (!prior) {
        seenSentences.set(key, s.section_id);
      }
    }

    // ── RULE: paragraph segmentation ────────────────────────────────────
    const min = opts.min_paragraphs?.[s.section_id];
    if (min) {
      const paras = text.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
      if (paras.length < min) {
        out.push({
          rule: "paragraph_segmentation",
          section_id: s.section_id,
          detail: `${paras.length} paragraph(s) rendered; the plan requires at least ${min}`
            .replace("paragraph(s)", paras.length === 1 ? "paragraph" : "paragraphs"),
        });
      }
    }

    // ── RULES: the analogy section ──────────────────────────────────────
    if (opts.analogy_section_id && s.section_id === opts.analogy_section_id) {
      out.push(...lintAnalogySection(s, opts.analogy_count ?? 0));
    }
  }

  // ── RULE: varied attribution, not a mechanical rotation ───────────────
  const distinct = new Set(verbSequence);
  if (verbSequence.length >= 4 && distinct.size < 3) {
    out.push({
      rule: "attribution_vocabulary_thin",
      section_id: "(document)",
      detail: `${verbSequence.length} attributed clauses draw on only ${distinct.size} verb(s): ${[...distinct].join(", ")}`
        .replace("verb(s)", distinct.size === 1 ? "verb" : "verbs"),
    });
  }
  const cycle = detectCycle(verbSequence);
  if (cycle) {
    out.push({
      rule: "mechanical_verb_rotation",
      section_id: "(document)",
      detail: `attribution verbs cycle mechanically with period ${cycle.period}: ${cycle.pattern.join(" → ")}`,
    });
  }

  return out;
}

function lintAnalogySection(s: LintableSection, count: number): StyleFinding[] {
  const out: StyleFinding[] = [];
  const text = s.text ?? "";

  if (count === 0) {
    if (!text.includes(NO_ANALOGY_SENTENCE)) {
      out.push({
        rule: "analogy_empty_sentence",
        section_id: s.section_id,
        detail: "no analogy qualified, but the canonical no-analogy sentence was not rendered verbatim",
      });
    }
    return out;
  }

  const paras = text.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
  const analogyParas = paras.filter((p) => /analogous because|analogous, because/i.test(p) || /It bears on the §/.test(p));
  if (analogyParas.length < count) {
    out.push({
      rule: "analogy_missing_why",
      section_id: s.section_id,
      detail: `${count} analogies admitted but only ${analogyParas.length} carry an analogy paragraph`,
    });
  }
  for (const p of analogyParas) {
    if (!/analogous because|analogous, because/i.test(p)) {
      out.push({
        rule: "analogy_missing_why",
        section_id: s.section_id,
        detail: `analogy without a why-analogous sentence: "${p.slice(0, 120)}"`,
      });
    }
    if (!/It bears on the §\s*\d/.test(p)) {
      out.push({
        rule: "analogy_missing_impact",
        section_id: s.section_id,
        detail: `analogy without a factor-tied impact statement: "${p.slice(0, 120)}"`,
      });
    }
  }
  for (const re of BANNED_ANALOGY_PATTERNS) {
    const m = re.exec(text);
    if (m) {
      out.push({
        rule: "analogy_outcome_predictive",
        section_id: s.section_id,
        detail: `outcome-predictive or verdict-restating pattern in the analogy section: "${m[0]}"`,
      });
    }
  }
  return out;
}

/** Quoted regions, straight or curly. */
function quotedRegions(text: string): Array<{ start: number; end: number }> {
  const out: Array<{ start: number; end: number }> = [];
  const re = /[“"]([^“”"]{1,400})[”"]/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) out.push({ start: m.index, end: m.index + m[0].length });
  return out;
}

/** A strictly repeating verb cycle of period 1-3 over 6+ occurrences. */
function detectCycle(seq: readonly string[]): { period: number; pattern: string[] } | null {
  if (seq.length < 6) return null;
  for (let p = 1; p <= 3; p++) {
    if (seq.length < p * 3) continue;
    let ok = true;
    for (let i = p; i < seq.length; i++) {
      if (seq[i] !== seq[i % p]) {
        ok = false;
        break;
      }
    }
    if (ok) return { period: p, pattern: seq.slice(0, p) };
  }
  return null;
}
