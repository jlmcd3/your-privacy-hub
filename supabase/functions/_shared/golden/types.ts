// Closed-Loop Quality System — G1
// Objective, code-checkable assertions for held-out evaluation of generator
// outputs. No LLM. A "golden case" is an intake that the tool must resolve
// correctly + a set of objectively verifiable expectations about its output.

export type GoldenAssertion =
  | { kind: "must_include"; pattern: string; flags?: string; label: string }
  | { kind: "must_not_include"; pattern: string; flags?: string; label: string }
  | { kind: "must_cite"; citation: string; label: string }            // exact substring present
  | { kind: "jurisdiction_resolved"; label: string };                  // output is not the generic-fallback shape

export type GoldenCase = {
  id: string;
  tool: string;
  intake: Record<string, any>;
  assertions: GoldenAssertion[];
  set: "tuning" | "holdout";
};

export type GoldenEvalResult = {
  passed: number;
  total: number;
  failed: string[];   // labels of failed assertions
};
