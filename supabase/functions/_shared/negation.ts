// Clause-scoped negation — shared, deterministic, no I/O.
//
// DPIA Intake Master Review (2026-09-15, F01): "The activity does not involve
// profiling" must not read as profiling. The rule is the one the LIA
// classifier already applies (supabase/functions/_shared/lia/lia-use-case-classifier.ts):
// a keyword counts only where it is ASSERTED — an occurrence inside a clause
// that carries a negation cue before it is negated. Sentence punctuation,
// line breaks and the contrastive connectors start a new clause, so "we do
// not track people, but we do profile purchases" negates "track" and asserts
// "profile". The browser mirror is src/lib/dpiaIntake.ts (assertedMentions).

const CLAUSE_BOUNDARY = /[.;!?\n]|,?\s+(?:but|however|whereas|although|while)\s+/gi;
const NEGATION_CUE =
  /\b(?:do(?:es)?\s+not|don['’]t|doesn['’]t|did\s+not|didn['’]t|is\s+not|isn['’]t|are\s+not|aren['’]t|was\s+not|wasn['’]t|will\s+not|won['’]t|cannot|can['’]t|never|no|not|none|nor|without|exclud(?:e|es|ed|ing)|except(?:ing)?|rules?\s+out|ruled\s+out|other\s+than|free\s+of|absence\s+of|instead\s+of|rather\s+than|refrain(?:s|ed)?\s+from|prohibit(?:s|ed)?)\b/gi;

function splitClauses(text: string): string[] {
  const out: string[] = [];
  let last = 0;
  for (const m of text.matchAll(CLAUSE_BOUNDARY)) {
    const idx = m.index ?? 0;
    if (idx > last) out.push(text.slice(last, idx));
    last = idx + m[0].length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

/** Asserted and negated occurrences of a literal stem (case-insensitive). */
export function assertedMentions(text: string, stem: string): { asserted: number; negated: number } {
  const hay = (text ?? "").toLowerCase();
  const needle = stem.toLowerCase();
  let asserted = 0;
  let negated = 0;
  for (const clause of splitClauses(hay)) {
    const cues = [...clause.matchAll(NEGATION_CUE)].map((m) => m.index ?? 0);
    let from = 0;
    for (;;) {
      const at = clause.indexOf(needle, from);
      if (at === -1) break;
      if (cues.some((c) => c < at)) negated++; else asserted++;
      from = at + Math.max(1, needle.length);
    }
  }
  return { asserted, negated };
}
