// DOC 217 §3 — code pre-checks. These run BEFORE any model call; a field that
// trips one is decided here and costs no tokens.

import type { GateReasonCode } from "./codes.ts";

export interface GateField {
  field_id: string;
  question_text: string;
  answer: string;
  closed_answers?: Record<string, unknown>;
}

export interface PrecheckVerdict {
  verdict: "non_conforming";
  reason_codes: GateReasonCode[];
  other_limb_field: string | null;
  evidence_span: null;
  precheck: string;
}

export const MIN_ANSWER_CHARS = 12;

export const PLACEHOLDER_LEXICON = [
  "n/a",
  "na",
  "tbd",
  "see above",
  "as above",
  "none",
  "-",
  ".",
];

/** Repeated punctuation only, e.g. "...", "--", "??". */
const REPEATED_PUNCT = /^[\s\p{P}\p{S}]+$/u;

export function isPlaceholder(answer: string): boolean {
  const t = answer.trim().toLowerCase().replace(/\s+/g, " ");
  if (t.length === 0) return true;
  if (PLACEHOLDER_LEXICON.includes(t)) return true;
  if (PLACEHOLDER_LEXICON.includes(t.replace(/[.\s]+$/g, ""))) return true;
  return REPEATED_PUNCT.test(t);
}

/** Share of letter characters that are outside the Latin script. */
export function nonLatinRatio(answer: string): number {
  const letters = [...answer].filter((c) => /\p{L}/u.test(c));
  if (letters.length === 0) return 0;
  const nonLatin = letters.filter((c) => !/\p{Script=Latin}/u.test(c)).length;
  return nonLatin / letters.length;
}

export const NON_LATIN_THRESHOLD = 0.5;

/**
 * Returns the pre-check verdict for each field that fails one, keyed by
 * field_id. Fields absent from the map go to the model.
 */
export function precheckFields(fields: GateField[]): Map<string, PrecheckVerdict> {
  const out = new Map<string, PrecheckVerdict>();
  const seen = new Map<string, string>(); // normalised answer -> first field_id

  for (const f of fields) {
    const answer = String(f.answer ?? "");
    const norm = answer.trim().toLowerCase().replace(/\s+/g, " ");
    const decide = (code: GateReasonCode, precheck: string) =>
      out.set(f.field_id, {
        verdict: "non_conforming",
        reason_codes: [code],
        other_limb_field: null,
        evidence_span: null,
        precheck,
      });

    if (isPlaceholder(answer)) {
      decide("placeholder", "placeholder_lexicon");
    } else if (answer.trim().length < MIN_ANSWER_CHARS) {
      decide("non_responsive", "under_min_chars");
    } else if (nonLatinRatio(answer) > NON_LATIN_THRESHOLD) {
      decide("unintelligible", "non_latin_script");
    } else if (seen.has(norm)) {
      // The same text cannot be responsive to two different questions.
      decide("non_responsive", `duplicate_of:${seen.get(norm)}`);
    }

    if (!seen.has(norm)) seen.set(norm, f.field_id);
  }
  return out;
}
