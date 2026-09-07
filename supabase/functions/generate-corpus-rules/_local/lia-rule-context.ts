// DOC 207C — the LIA_RULE_CONTEXT block, held as a STRING.
//
// An edge function cannot read the repo, so the block the generator copies
// into the emitted `lia-rules.ts` lives here as bytes. It is byte-identical
// to the block in
// `supabase/functions/run-li-assessment/_local/corpus/maps/lia-rules.ts`,
// which is the file the rule pass imports — the pin test in
// tests/edge/corpus/doc207c-rules-generator.test.ts holds the two together
// so the context can never drift.
//
// It is a `RuleContext` (scales + adverse/favorable outcomes), NOT a
// vocabulary. The typed state vocabulary the generator validates trigger
// atoms against lives in ./product-registry.ts and is never emitted.

export const LIA_RULE_CONTEXT_BLOCK = `export const LIA_RULE_CONTEXT: RuleContext = {
  scales: [
    { element: "purpose", order: ["passes", "uncertain", "fails"] },
    { element: "necessity", order: ["passes", "uncertain"] },
    { element: "balancing", order: ["likely_passes", "uncertain", "likely_fails"] },
  ],
  adverse_outcomes: ["legitimate_interests_not_available"],
  // \`recognised_legitimate_interest_applies\` (W11) enters here only after
  // ruling B2-18 — the new LiaOutcome value does not exist in the product
  // yet, so no \`route_to_basis\` rule can be eligible until it does.
  favorable_outcomes: [],
};
`;
