// DOC 191 §6.2 STAGE 2 — EXTRACTION.
//
// A NARROW, FALSIFIABLE QUESTION, NEVER "IS THIS A RULE":
//
//   does this excerpt state what the law categorically requires or excludes,
//   independent of this party's facts — if so, quote that sentence verbatim.
//
// The returned quote is checked as a real substring of the excerpt BEFORE
// anything else happens (quote-verify.ts). A hallucinated or paraphrased
// "quote" fails that check automatically and the row falls back to `pattern`.
// That fallback is not an error path; it is the design (§6.1: the pipeline
// only has to be perfect in one direction).
//
// The model is INJECTED (`LlmCall`), so the automated test suite exercises
// every branch here against stubbed responses and never makes a live API
// call. See ../../index.ts for the wired model.

import type {
  ClassificationCandidate,
  LlmCall,
  Stage2Framing,
  Stage2Result,
} from "./types.ts";
import { verifyQuote } from "./quote-verify.ts";

export const STAGE2_SYSTEM_FIND_RULE =
  `You are reading one short, pre-extracted excerpt from a privacy-law enforcement decision, regulator guidance, or statutory provision. You are NOT asked whether it is important, persuasive, or well reasoned.

Answer exactly one question:

  Does this excerpt state what the law categorically requires or excludes, independent of the facts of any particular party — and if so, which sentence says it?

A sentence qualifies ONLY if it would remain true rewritten with no party named: "special-category data cannot be processed under legitimate interests" qualifies; "the company processed special-category data without a legitimate basis" does not, because it is a finding about one party's conduct.

If a qualifying sentence exists, quote it VERBATIM — character for character from the excerpt you were given. Never paraphrase, never tidy the punctuation, never translate. If nothing qualifies, say so; that is the expected answer for most excerpts and is never a failure.

Respond with ONLY a JSON object, no preamble and no markdown fences:
{"states_rule": true|false, "quote": "<verbatim sentence from the excerpt, or null>", "rule_statement": "<the rule in one sentence, or null>"}`;

export const STAGE2_SYSTEM_ARGUE_PATTERN =
  `You are reading one short, pre-extracted excerpt from a privacy-law enforcement decision, regulator guidance, or statutory provision.

Your task is adversarial: argue, as strongly as the text honestly allows, that this excerpt records only an OUTCOME ON PARTICULAR FACTS — what one named party did and what a regulator did about it — and states no general proposition about what the law requires or excludes.

Only if that argument cannot honestly be made should you concede that the excerpt states a categorical legal proposition. If you concede, quote the sentence that forces the concession VERBATIM — character for character from the excerpt you were given. Never paraphrase, never tidy the punctuation, never translate.

Respond with ONLY a JSON object, no preamble and no markdown fences:
{"states_rule": true|false, "quote": "<verbatim sentence that forces the concession, or null>", "rule_statement": "<the conceded rule in one sentence, or null>"}`;

export function systemPromptFor(framing: Stage2Framing): string {
  return framing === "find_rule" ? STAGE2_SYSTEM_FIND_RULE : STAGE2_SYSTEM_ARGUE_PATTERN;
}

export function buildStage2UserPrompt(c: ClassificationCandidate): string {
  // §6.1: the excerpt only. The source document is never given to the model.
  const parts = [`EXCERPT:\n${c.pinned_excerpt || "(none)"}`];
  if (c.curation_note) parts.push(`CURATION NOTE (the curator's own summary of what this row bears on):\n${c.curation_note}`);
  if (c.display_bearing) parts.push(`RATIFIED BEARING:\n${c.display_bearing}`);
  return parts.join("\n\n");
}

/** Tolerant of a model that wraps its JSON in prose or fences. Any parse
 *  failure is a `pattern` answer, never an exception that aborts a batch. */
export function parseStage2Json(raw: string): { states_rule: boolean; quote: string | null; rule_statement: string | null } {
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start < 0 || end <= start) return { states_rule: false, quote: null, rule_statement: null };
  try {
    const o = JSON.parse(raw.slice(start, end + 1)) as Record<string, unknown>;
    return {
      states_rule: o.states_rule === true,
      quote: typeof o.quote === "string" && o.quote.trim() !== "" ? o.quote : null,
      rule_statement: typeof o.rule_statement === "string" && o.rule_statement.trim() !== "" ? o.rule_statement : null,
    };
  } catch {
    return { states_rule: false, quote: null, rule_statement: null };
  }
}

export async function stage2Extract(
  c: ClassificationCandidate,
  framing: Stage2Framing,
  llm: LlmCall,
): Promise<Stage2Result> {
  let raw: string;
  try {
    raw = await llm(systemPromptFor(framing), buildStage2UserPrompt(c));
  } catch (e) {
    // A model or network failure resolves to `pattern`. It must never resolve
    // the other way, and it must never abort the batch.
    return {
      framing,
      states_rule: false,
      quote: null,
      quote_verified: false,
      rule_statement: null,
      raw: `ERROR: ${(e as Error).message}`,
    };
  }

  const parsed = parseStage2Json(raw);
  const verification = verifyQuote(parsed.quote, [
    ["pinned_excerpt", c.pinned_excerpt],
    ["curation_note", c.curation_note],
    ["display.bearing", c.display_bearing ?? null],
  ]);

  // The verification gate: a claimed rule without a verified quote is a
  // pattern. No exceptions, no "near verbatim" tier.
  const states_rule = parsed.states_rule && verification.verified;

  return {
    framing,
    states_rule,
    quote: verification.verified ? parsed.quote : null,
    quote_verified: verification.verified,
    rule_statement: states_rule ? parsed.rule_statement : null,
    raw,
  };
}
