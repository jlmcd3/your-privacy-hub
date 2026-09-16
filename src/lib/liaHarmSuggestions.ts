/**
 * liaHarmSuggestions.ts — LIA harm-category suggestions from the customer's
 * own worst-case narrative.
 *
 * INTAKE-4e: prefill-as-confirmation. Maps the narrative onto the harm option
 * strings VERBATIM; the page adds a suggestion only on the customer's click.
 *
 * LIA master review (2026-09-15, F06): a keyword match is a SUGGESTION to
 * review, shown with the sentence it came from. A keyword that sits after a
 * negation cue in its clause ("we do not anticipate financial loss") is
 * reported as ruled out and never offered as evidence of the harm. Mirrors
 * the clause/negation approach of the shared use-case classifier
 * (supabase/functions/_shared/lia/lia-use-case-classifier.ts).
 *
 * Pure module (no React, no client) so vitest can import it without the page.
 */

export const HARM_KEYWORDS: ReadonlyArray<readonly [string, readonly string[]]> = [
  ["Financial loss", ["financial", "money", "cost", "monetary", "loss of funds"]],
  ["Discrimination or unfair treatment", ["discrimin", "unfair", "bias"]],
  ["Reputational damage", ["reputation", "embarrass", "defam"]],
  ["Loss of autonomy or control over data", ["autonomy", "control over", "loss of control"]],
  ["Distress or intrusion", ["distress", "intrus", "anxiety", "upset"]],
  ["Exclusion from a service", ["exclusion", "excluded", "denied service", "refus"]],
  ["Physical safety risk", ["physical", "safety", "harm to person", "violence"]],
  ["Identity theft or fraud exposure", ["identity theft", "fraud", "impersonat"]],
];

const HARM_CLAUSE_BOUNDARY = /[.;!?\n]|,?\s+(?:but|however|whereas|although|while)\s+/gi;
const HARM_NEGATION_CUE =
  /\b(?:do(?:es)?\s+not|don['’]t|doesn['’]t|did\s+not|didn['’]t|is\s+not|isn['’]t|are\s+not|aren['’]t|will\s+not|won['’]t|cannot|can['’]t|never|no|not|none|nor|without|exclud(?:e|es|ed|ing)|except(?:ing)?|rules?\s+out|ruled\s+out|other\s+than|unlikely|do\s+not\s+anticipate)\b/gi;

export interface HarmSuggestion {
  readonly option: string;
  /** The sentence (clause) the keyword was found in, as written. */
  readonly sentence: string;
  /** True when every occurrence sits after a negation cue — the narrative rules the harm out. */
  readonly negated: boolean;
}

export function harmSuggestions(detail: string): HarmSuggestion[] {
  const raw = detail || "";
  if (raw.trim().length < 20) return [];
  const clauses: string[] = [];
  let last = 0;
  for (const m of raw.matchAll(HARM_CLAUSE_BOUNDARY)) {
    const idx = m.index ?? 0;
    if (idx > last) clauses.push(raw.slice(last, idx));
    last = idx + m[0].length;
  }
  if (last < raw.length) clauses.push(raw.slice(last));
  const out: HarmSuggestion[] = [];
  for (const [option, kws] of HARM_KEYWORDS) {
    let asserted: string | null = null;
    let negated: string | null = null;
    for (const clause of clauses) {
      const lower = clause.toLowerCase();
      const cues = [...lower.matchAll(HARM_NEGATION_CUE)].map((m) => m.index ?? 0);
      for (const kw of kws) {
        let from = 0;
        for (;;) {
          const at = lower.indexOf(kw, from);
          if (at === -1) break;
          if (cues.some((c) => c < at)) negated = negated ?? clause.trim();
          else asserted = asserted ?? clause.trim();
          from = at + kw.length;
        }
      }
    }
    if (asserted) out.push({ option, sentence: asserted, negated: false });
    else if (negated) out.push({ option, sentence: negated, negated: true });
  }
  return out;
}

/** The asserted (non-negated) suggestions, as verbatim option strings. */
export function HARM_PREFILL(detail: string): string[] {
  return harmSuggestions(detail).filter((s) => !s.negated).map((s) => s.option);
}
