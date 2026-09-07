// DOC 207C — the LIA_RULE_CONTEXT block, held as a STRING.
//
// An edge function cannot read the repo, so the block the generator copies
// into the emitted `lia-rules.ts` lives here as bytes. It is byte-identical
// to the block in
// `supabase/functions/run-li-assessment/_local/corpus/maps/lia-rules.ts`,
// which is the file the rule pass imports — the pin test in
// tests/edge/corpus/doc207c-rules-generator.test.ts holds the two together
// so the context can never drift.

export const LIA_RULE_CONTEXT_BLOCK = `// ── LIA_RULE_CONTEXT ────────────────────────────────────────────────────
// The typed state the LIA rule pass supplies to every trigger. A rule may
// only name a flag, class, relationship, data category, verdict element or
// state root listed here; the build-time generator
// (generate-corpus-rules) rejects anything else, so a shipped rule can
// never reference state the pass does not populate.
export const LIA_RULE_CONTEXT = {
  flags: [
    "special_category",
    "children",
    "eprivacy_terminal_equipment",
    "electronic_marketing",
    "public_authority",
    "large_scale",
    "automated_decision",
  ],
  classes: [
    "direct_marketing",
    "fraud_prevention",
    "employee_monitoring",
    "behavioral_advertising",
    "research_analytics",
    "it_security",
    "contractual_administration",
    "product_improvement",
  ],
  relationships: ["customer", "employee", "prospect", "public"],
  verdict_elements: ["purpose", "necessity", "balancing"],
  state_roots: [
    "intake.",
    "interest_legitimacy.",
    "child_factor.",
    "public_authority_exclusion.",
    "scale_frequency_duration.",
    "eprivacy_short_circuit.",
    "precedent_class_posture.",
    "reasonable_expectations.",
    "potential_harms.",
    "opt_out_feasibility.",
    "relationship_with_individual.",
    "automated_decision_analysis.",
    "alternatives_considered.",
  ],
} as const;
`;
