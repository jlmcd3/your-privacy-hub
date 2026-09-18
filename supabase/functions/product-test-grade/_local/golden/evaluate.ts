// Closed-Loop Quality System — E1
// Deterministic evaluator. Given an output string and a GoldenCase, returns
// how many assertions passed. No LLM, no scoring rubric — pure code.

import type { GoldenCase, GoldenEvalResult } from "./types.ts";

// Phrases that indicate the generator failed to resolve to a specific
// jurisdictional regime and fell back to generic boilerplate ("please
// identify the applicable statute..."). Extend as we observe new fallback
// patterns in production outputs.
const GENERIC_FALLBACK_PHRASES: RegExp[] = [
  /identify\s+the\s+applicable\s+(?:statute|law|regulation)/i,
  /confirm\s+which\s+biometric\s+privacy/i,
  /please\s+consult\s+local\s+counsel\s+to\s+determine/i,
  /unable\s+to\s+determine\s+applicable\s+jurisdiction/i,
];

export function evaluateGolden(output: string, c: GoldenCase): GoldenEvalResult {
  const failed: string[] = [];
  const text = String(output ?? "");

  for (const a of c.assertions) {
    let ok = false;
    try {
      if (a.kind === "must_include") {
        ok = new RegExp(a.pattern, a.flags ?? "").test(text);
      } else if (a.kind === "must_not_include") {
        ok = !new RegExp(a.pattern, a.flags ?? "").test(text);
      } else if (a.kind === "must_cite") {
        ok = text.includes(a.citation);
      } else if (a.kind === "jurisdiction_resolved") {
        ok = !GENERIC_FALLBACK_PHRASES.some((re) => re.test(text));
      }
    } catch {
      ok = false;
    }
    if (!ok) failed.push(a.label);
  }

  return { passed: c.assertions.length - failed.length, total: c.assertions.length, failed };
}
