// Validation door into the canonical rule grammar for the doc 206 §6.2
// generator. `_shared/corpus/rule-types.ts` may only be imported by
// rule-pass.ts, rule-states.ts, corpus/maps/*-rules.ts, *-gate.ts /
// *-gates.ts, or tests (doc 206/207 boundary) — this is the generator's
// *-gate.ts. The generator validates candidate rows against the CANONICAL
// grammar here rather than pattern-matching atom strings itself
// (rule-types.ts: "parseAtom is the only parser").
export {
  ADVERSE_KINDS,
  FAVORABLE_KINDS,
  parseAtom,
} from "../../_shared/corpus/rule-types.ts";
export type { AuthorityRule, RuleEffect } from "../../_shared/corpus/rule-types.ts";
