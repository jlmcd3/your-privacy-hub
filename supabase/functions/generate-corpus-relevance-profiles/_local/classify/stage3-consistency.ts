// DOC 191 §6.2 STAGE 3 — SELF-CONSISTENCY.
//
// Run stage 2 twice with different framings — once "find a rule if one
// exists", once "argue this is only a pattern" — and require AGREEMENT before
// promotion. Disagreement doesn't get adjudicated by picking one: it falls
// back to `pattern` and queues for the next refinement round with more
// context.
//
// AGREEMENT here means both passes independently answered `states_rule` with
// a MECHANICALLY VERIFIED quote. Two passes that agree there is no rule also
// "agree" — but they agree on `pattern`, which needs no promotion and no
// ratification, so `self_consistency_agreement` records the fact and the
// classification stays where it was.

import type { ClassificationCandidate, LlmCall, Stage2Result } from "./types.ts";
import { stage2Extract } from "./stage2-extraction.ts";

export interface Stage3Result {
  readonly find_rule: Stage2Result;
  readonly argue_pattern: Stage2Result;
  /** Did the two framings reach the same answer on `states_rule`? */
  readonly agreement: boolean;
  /** The only path to a `rule` candidate: both agree, both quotes verified. */
  readonly promote_to_rule: boolean;
  readonly extracted_quote: string | null;
  readonly rule_statement: string | null;
  readonly basis: string;
}

export async function stage3SelfConsistency(
  c: ClassificationCandidate,
  llm: LlmCall,
): Promise<Stage3Result> {
  const find_rule = await stage2Extract(c, "find_rule", llm);
  const argue_pattern = await stage2Extract(c, "argue_pattern", llm);

  const agreement = find_rule.states_rule === argue_pattern.states_rule;
  const promote_to_rule = agreement && find_rule.states_rule &&
    find_rule.quote_verified && argue_pattern.quote_verified;

  const basis = promote_to_rule
    ? "both framings independently identified a categorical legal proposition and both quotes verified as real substrings — rule candidate"
    : !agreement
    ? `the two framings disagreed (find_rule=${find_rule.states_rule}, argue_pattern=${argue_pattern.states_rule}) — falls back to pattern and queues for the next refinement round, per doc 191 §6.2 stage 3`
    : find_rule.states_rule
    ? "both framings claimed a rule but at least one quote failed mechanical verification — falls back to pattern"
    : "both framings agree the excerpt records an outcome on particular facts — stays pattern";

  return {
    find_rule,
    argue_pattern,
    agreement,
    promote_to_rule,
    // The affirmative pass's quote is the one recorded: the adversarial pass's
    // is its concession, quoted from the same excerpt, and is only used to
    // confirm that the concession was forced by real text.
    extracted_quote: promote_to_rule ? find_rule.quote : null,
    rule_statement: promote_to_rule ? find_rule.rule_statement : null,
    basis,
  };
}
