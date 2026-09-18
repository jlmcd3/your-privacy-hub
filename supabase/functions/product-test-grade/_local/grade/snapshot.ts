// product-test-grade — snapshot family (doc 272 §6.5).
//
// Deterministic tools only. Uses the mirrored `determinism.ts`
// (`_local/review/determinism.ts`, byte-identical copy of
// `ptest-run-driver/_local/review/determinism.ts` — see
// tests/edge/product-test/mirror.test.ts) for `documentHash`/`reviewTextOf`,
// so the hash this function computes is defined identically to the one the
// offline twin and the driver already use.

import { documentHash, reviewTextOf } from "../review/determinism.ts";
import type { Check, ProductTestTool } from "../types.ts";
import { DETERMINISTIC_TOOLS } from "../variants/contracts-registry.ts";
import pins from "../snapshots/pins.json" with { type: "json" };

const PINS = pins as Record<string, string>;

export async function checkSnapshot(
  tool: ProductTestTool,
  fixtureId: string,
  variantId: string,
  output: Record<string, unknown>,
): Promise<{ checks: Check[]; hash: string; textLength: number }> {
  const { text } = reviewTextOf(output);
  const hash = await documentHash(output);

  if (!DETERMINISTIC_TOOLS.has(tool)) {
    return { checks: [], hash: hash.hash, textLength: text.length };
  }

  const key = `${tool}/${fixtureId}/${variantId}`;
  const pinned = PINS[key];
  if (!pinned) {
    return {
      checks: [{
        check_id: "snapshot.hash",
        family: "snapshot",
        severity: "editorial",
        passed: true,
        actual: hash.hash,
        rule_ref: "unpinned",
      }],
      hash: hash.hash,
      textLength: text.length,
    };
  }

  const passed = pinned === hash.hash;
  return {
    checks: [{
      check_id: "snapshot.hash",
      family: "snapshot",
      severity: "high",
      passed,
      expected: pinned,
      actual: hash.hash,
      rule_ref: key,
    }],
    hash: hash.hash,
    textLength: text.length,
  };
}
