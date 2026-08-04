// ITEM 364 (WAVE 1, DISPATCH 1) — REGISTER LINT.
//
// The Item 363 register is a way of WRITING, not a way of structuring. These
// rules police the writing only: diction, cadence, appositive load, and the
// machine-speak scaffolding that survives from prompt boilerplate into a
// customer document.
//
// This file is deliberately SEPARATE from `style-lint.ts`. `style-lint.ts` is
// the fleet-wide battery every product already passes; polluting it with the
// register rules would silently re-gate nine other products. Register lint is
// opt-in per product and is run by the dispatch's own tests and review scripts.

export type RegisterLintRule =
  | "banned_word"
  | "banned_phrase"
  | "intensifier_density"
  | "machine_scaffold"
  | "orphan_bracket"
  | "cadence_monotony"
  | "cadence_overlong"
  | "appositive_stack"
  | "cross_section_restatement";

export interface RegisterLintFinding {
  readonly rule: RegisterLintRule;
  readonly section_id: string;
  readonly detail: string;
  /** The offending excerpt, trimmed for review output. */
  readonly excerpt: string;
}

/**
 * Diction the register refuses. Consultant filler, vendor adjectives, and the
 * connectives that announce a machine wrote the sentence.
 */
export const BANNED_WORDS: readonly string[] = [
  "leverage",
  "leveraging",
  "utilize",
  "utilise",
  "utilization",
  "robust",
  "comprehensive",
  "holistic",
  "best-in-class",
  "seamless",
  "cutting-edge",
  "state-of-the-art",
  "in order to",
  "it should be noted",
  "it is important to note",
  "as such",
  "going forward",
  "at this juncture",
  "moving forward",
  "in today's landscape",
  "delve into",
];

/**
 * ITEM 364 (DISPATCH 2 CORRECTION) — phrases the register refuses, as opposed
 * to single words. `on the record` is the A6 case that started this list: it
 * reads as courtroom idiom rather than counsel's own voice, and it multiplies
 * once one section uses it. Say what the record does or does not say instead.
 *
 * These are scanned in prose AND in plan metadata (thesis, exemplar AFTER
 * text) — see `lintPlan`. A banned phrase carried in a plan's thesis would
 * otherwise seed itself into every section opener the plan governs.
 */
export const BANNED_PHRASES: readonly string[] = [
  "on the record",
  "on this record",
  "on the present record",
  "at the end of the day",
  "it is worth noting",
  "in this regard",
  "as previously mentioned",
  "as noted above",
  "needless to say",
];

export const INTENSIFIERS: readonly string[] = [
  "very",
  "extremely",
  "highly",
  "critically",
  "substantially",
  "significantly",
  "considerably",
  "particularly",
  "notably",
];

/**
 * Stock hedges emitted by prompt scaffolding. One occurrence is a hedge; two
 * or more in the same document is boilerplate the reader learns to skip.
 */
export const SCAFFOLD_PHRASES: readonly string[] = [
  "the organisation should confirm whether the described position applies here",
  "the organization should confirm whether the described position applies here",
  "this completes the analysis",
  "recording this completes",
  "see above",
];

const MAX_INTENSIFIERS_PER_100_WORDS = 1.5;
const MAX_MEAN_SENTENCE_WORDS = 34;
const MIN_SHORT_SENTENCE_WORDS = 14;
const MONOTONY_RUN = 4;
const MONOTONY_TOLERANCE = 3;
const MAX_APPOSITIVES_PER_SENTENCE = 2;

export function splitSentences(text: string): string[] {
  return String(text ?? "")
    .replace(/\s+/g, " ")
    .split(/(?<=[.!?])\s+(?=[A-Z(“"'\[])/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function words(s: string): number {
  return s.split(/\s+/).filter(Boolean).length;
}

function excerpt(s: string): string {
  const t = s.trim();
  return t.length <= 160 ? t : `${t.slice(0, 157)}…`;
}

/** Lint one section's prose. `text` is plain prose — strip markup first. */
export function lintRegisterText(sectionId: string, text: string): RegisterLintFinding[] {
  const out: RegisterLintFinding[] = [];
  const body = String(text ?? "");
  if (!body.trim()) return out;
  const lower = body.toLowerCase();
  const push = (rule: RegisterLintRule, detail: string, ex: string) =>
    out.push({ rule, section_id: sectionId, detail, excerpt: excerpt(ex) });

  for (const w of BANNED_WORDS) {
    const re = new RegExp(`(?<![\\w-])${w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?![\\w-])`, "i");
    const m = body.match(re);
    if (m) push("banned_word", w, m.input!.slice(Math.max(0, m.index! - 60), m.index! + 80));
  }

  for (const p of BANNED_PHRASES) {
    const re = new RegExp(`(?<![\\w-])${p.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?![\\w-])`, "i");
    const m = body.match(re);
    if (m) push("banned_phrase", p, m.input!.slice(Math.max(0, m.index! - 60), m.index! + 80));
  }

  const total = words(body);
  let intensifiers = 0;
  for (const w of INTENSIFIERS) {
    const hits = lower.match(new RegExp(`(?<![\\w-])${w}(?![\\w-])`, "g"));
    intensifiers += hits ? hits.length : 0;
  }
  if (total >= 60 && (intensifiers * 100) / total > MAX_INTENSIFIERS_PER_100_WORDS) {
    push(
      "intensifier_density",
      `${intensifiers} intensifiers in ${total} words (cap ${MAX_INTENSIFIERS_PER_100_WORDS}/100)`,
      body,
    );
  }

  for (const phrase of SCAFFOLD_PHRASES) {
    let count = 0;
    let from = 0;
    for (;;) {
      const at = lower.indexOf(phrase, from);
      if (at === -1) break;
      count += 1;
      from = at + phrase.length;
    }
    if (count > 1) push("machine_scaffold", `"${phrase}" repeated ${count}×`, phrase);
  }

  const opens = (body.match(/\[/g) ?? []).length;
  const closes = (body.match(/\]/g) ?? []).length;
  if (opens !== closes) {
    push("orphan_bracket", `${opens} "[" vs ${closes} "]" — a merge artifact reached the prose`, body);
  }

  const sentences = splitSentences(body);
  if (sentences.length >= 3) {
    const lengths = sentences.map(words);
    const mean = lengths.reduce((a, b) => a + b, 0) / lengths.length;
    if (mean > MAX_MEAN_SENTENCE_WORDS) {
      push("cadence_overlong", `mean sentence length ${mean.toFixed(1)} words`, sentences[0]);
    }
    if (!lengths.some((l) => l <= MIN_SHORT_SENTENCE_WORDS)) {
      push(
        "cadence_monotony",
        `no sentence at or under ${MIN_SHORT_SENTENCE_WORDS} words; the paragraph never lands`,
        sentences[0],
      );
    }
    let run = 1;
    for (let i = 1; i < lengths.length; i++) {
      if (Math.abs(lengths[i] - lengths[i - 1]) <= MONOTONY_TOLERANCE) {
        run += 1;
        if (run >= MONOTONY_RUN) {
          push(
            "cadence_monotony",
            `${run} consecutive sentences within ${MONOTONY_TOLERANCE} words of each other`,
            sentences[i],
          );
          break;
        }
      } else {
        run = 1;
      }
    }
  }

  for (const s of sentences) {
    const dashes = (s.match(/—/g) ?? []).length;
    const commaClauses = (s.match(/,\s/g) ?? []).length;
    const appositives = Math.floor(dashes / 2) + Math.max(0, commaClauses - 2);
    if (appositives > MAX_APPOSITIVES_PER_SENTENCE) {
      push("appositive_stack", `${appositives} stacked asides in one sentence`, s);
    }
  }

  return out;
}

// ---------------------------------------------------------------------------
// ITEM 372 (METHOD 3a) — CROSS-SECTION RESTATEMENT.
//
// A cross-cutting point is argued once, in the section the plan gives it, and
// referenced everywhere else. This rule is deliberately CONSERVATIVE: a bare
// mention of an anchor outside its home section is a reference and passes. A
// finding is raised only where the anchor is being ARGUED again — the anchor
// carries a long sentence of its own, or it recurs inside the same foreign
// section. Passing references ("as Section 0 explains") never trip it.
// ---------------------------------------------------------------------------

/** Minimum words in an anchor's sentence before it reads as an argument. */
const RESTATEMENT_SENTENCE_WORDS = 25;

export interface HomeAnchorAssignment {
  readonly id: string;
  readonly home_section_id: string;
  readonly anchors: readonly string[];
}

function countOccurrences(haystack: string, needle: string): number {
  if (!needle) return 0;
  const h = haystack.toLowerCase();
  const n = needle.toLowerCase();
  let count = 0;
  let from = 0;
  for (;;) {
    const at = h.indexOf(n, from);
    if (at === -1) break;
    count += 1;
    from = at + n.length;
  }
  return count;
}

export function lintCrossSectionRestatement(
  sections: readonly RegisterSection[],
  assignments: readonly HomeAnchorAssignment[],
): RegisterLintFinding[] {
  const out: RegisterLintFinding[] = [];
  for (const section of sections) {
    const body = String(section.text ?? "");
    if (!body.trim()) continue;
    const sentences = splitSentences(body);
    for (const a of assignments) {
      if (a.home_section_id === section.section_id) continue;
      for (const anchor of a.anchors) {
        const hits = countOccurrences(body, anchor);
        if (hits === 0) continue;
        const argued = sentences.find(
          (s) =>
            s.toLowerCase().includes(anchor.toLowerCase()) &&
            s.split(/\s+/).filter(Boolean).length >= RESTATEMENT_SENTENCE_WORDS,
        );
        if (hits > 1 || argued) {
          out.push({
            rule: "cross_section_restatement",
            section_id: section.section_id,
            detail:
              `"${anchor}" belongs to ${a.home_section_id} (${a.id}); ` +
              (argued
                ? "it is argued again here"
                : `it appears ${hits}× here`) +
              " — reference the home section instead",
            excerpt: excerpt(argued ?? anchor),
          });
        }
      }
    }
  }
  return out;
}

export interface RegisterSection {
  readonly section_id: string;
  readonly text: string;
}

export function lintRegisterDocument(sections: readonly RegisterSection[]): RegisterLintFinding[] {
  return sections.flatMap((s) => lintRegisterText(s.section_id, s.text));
}

/** True when the document is clean enough to render under the register. */
export function registerClean(findings: readonly RegisterLintFinding[]): boolean {
  return findings.length === 0;
}
