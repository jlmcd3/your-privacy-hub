// product-test-grade — gradeDocument: composes the six check families
// (doc 272 §6). No model import anywhere in this module or anything it
// imports — see tests/edge/product-test/no-model-import.test.ts.

import type { Check, GradeInput, GradeResult, GradeSummary } from "../types.ts";
import { CONTRACT_BY_TOOL } from "../variants/contracts-registry.ts";
import { checkStructure } from "./structure.ts";
import { checkFidelity } from "./fidelity.ts";
import { checkCrossBlock } from "./cross-block.ts";
import { checkLegal } from "./legal.ts";
import { checkSnapshot } from "./snapshot.ts";
import { checkStability } from "./stability.ts";

function summarize(checks: Check[], documentHash: string, textLength: number): GradeSummary {
  let critical = 0, high = 0, editorial = 0, passed = 0;
  for (const c of checks) {
    if (c.passed) passed++;
    else if (c.severity === "critical") critical++;
    else if (c.severity === "high") high++;
    else editorial++;
  }
  return {
    total: checks.length,
    passed,
    failed: checks.length - passed,
    critical,
    high,
    editorial,
    document_pass: critical === 0 && high === 0,
    document_hash: documentHash,
    text_length: textLength,
  };
}

export async function gradeDocument(input: GradeInput): Promise<GradeResult> {
  const { tool, intake, output, expectations, panel_companies } = input;
  const contract = CONTRACT_BY_TOOL[tool] ?? null;

  // The grade request (doc 272 §6) carries `variant_id`, not a variant kind.
  // The golden variant's id is "golden" on both paths (variants/index.ts and
  // the page's own synthetic golden variant); the "__golden" suffix is
  // accepted for any caller that still uses the older form. That is the
  // signal fidelity.ts's golden-only false-absence sweep (§6.2 item 5) uses.
  const isGolden = input.variant_id === "golden" || input.variant_id.endsWith("__golden");

  const checks: Check[] = [];
  checks.push(...checkStructure(tool, intake, output));
  checks.push(...checkFidelity(tool, contract, intake, output, isGolden ? "golden" : "authored", expectations, panel_companies));
  checks.push(...checkCrossBlock(tool, output));
  checks.push(...checkLegal(tool, intake, output));
  checks.push(...checkStability());

  const snap = await checkSnapshot(tool, input.fixture_id, input.variant_id, output);
  checks.push(...snap.checks);

  return { checks, summary: summarize(checks, snap.hash, snap.textLength) };
}
