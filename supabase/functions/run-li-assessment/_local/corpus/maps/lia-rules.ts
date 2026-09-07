// GENERATED TARGET — the doc 206 §6.2 generator overwrites this file; hand
// edits are discarded.
//
// DOC 207 §2.2 — ships empty. `LIA_RULES` stays `[]` until the CEO stamps a
// rule (doc 206B worksheets W1-W7 et al.) and the generator (doc 206 §6.2,
// `generate-corpus-rules` → this file) is run. Until then, `rule-pass.ts`'s
// `applyLiaRules` always sees zero rules, so the deterministic path's
// output is byte-identical to before this file existed (proven by the
// zero-rules identity test in doc207-rule-pass.test.ts). W1-W7's triggers
// and effects are exercised only as fixture `AuthorityRule`s injected
// directly into tests via the `rules` parameter — never through this file.

import type { AuthorityRule, RuleContext } from "../../../../_shared/corpus/rule-types.ts";

export const LIA_RULES_VERSION = "lia-rules-v0-empty-2026-09-07";

export const LIA_RULES: readonly AuthorityRule[] = [];

export const LIA_RULE_CONTEXT: RuleContext = {
  scales: [
    { element: "purpose", order: ["passes", "uncertain", "fails"] },
    { element: "necessity", order: ["passes", "uncertain"] },
    { element: "balancing", order: ["likely_passes", "uncertain", "likely_fails"] },
  ],
  adverse_outcomes: ["legitimate_interests_not_available"],
  // `recognised_legitimate_interest_applies` (W11) enters here only after
  // ruling B2-18 — the new LiaOutcome value does not exist in the product
  // yet, so no `route_to_basis` rule can be eligible until it does.
  favorable_outcomes: [],
};
