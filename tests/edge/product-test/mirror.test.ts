// product-test-grade — HARD RULE: every module copied from another
// function's `_local` tree must be a byte-identical mirror. Lists every
// pair; reads both files as strings and compares them directly (no hashing
// shortcut, per the brief).
//
// NOT RUN by this agent (hard rule: no `deno test`). Run with:
//   deno test -A tests/edge/product-test/mirror.test.ts

import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";

const ROOT = new URL("../../../", import.meta.url);

// [source (another function's _local), mirror (product-test-grade's _local)]
const PAIRS: ReadonlyArray<readonly [string, string]> = [
  // quality-batch-orchestrator/_local/golden/* — messy-registry.ts and every
  // file it imports (MESSY_BY_TOOL's `perfect()` lookups need the full
  // PERFECT_BY_TOOL set; see variants/index.ts and messy-registry.ts's own
  // header for why the per-tool golden files are imported directly rather
  // than through registry.ts).
  [
    "supabase/functions/quality-batch-orchestrator/_local/golden/types.ts",
    "supabase/functions/product-test-grade/_local/golden/types.ts",
  ],
  [
    "supabase/functions/quality-batch-orchestrator/_local/golden/evaluate.ts",
    "supabase/functions/product-test-grade/_local/golden/evaluate.ts",
  ],
  [
    "supabase/functions/quality-batch-orchestrator/_local/golden/messy-registry.ts",
    "supabase/functions/product-test-grade/_local/golden/messy-registry.ts",
  ],
  [
    "supabase/functions/quality-batch-orchestrator/_local/golden/dpia.ts",
    "supabase/functions/product-test-grade/_local/golden/dpia.ts",
  ],
  [
    "supabase/functions/quality-batch-orchestrator/_local/golden/cppa-cyber.ts",
    "supabase/functions/product-test-grade/_local/golden/cppa-cyber.ts",
  ],
  [
    "supabase/functions/quality-batch-orchestrator/_local/golden/dpa.ts",
    "supabase/functions/product-test-grade/_local/golden/dpa.ts",
  ],
  [
    "supabase/functions/quality-batch-orchestrator/_local/golden/ir-playbook.ts",
    "supabase/functions/product-test-grade/_local/golden/ir-playbook.ts",
  ],
  [
    "supabase/functions/quality-batch-orchestrator/_local/golden/registration.ts",
    "supabase/functions/product-test-grade/_local/golden/registration.ts",
  ],
  [
    "supabase/functions/quality-batch-orchestrator/_local/golden/cppa-admt.ts",
    "supabase/functions/product-test-grade/_local/golden/cppa-admt.ts",
  ],
  [
    "supabase/functions/quality-batch-orchestrator/_local/golden/governance.ts",
    "supabase/functions/product-test-grade/_local/golden/governance.ts",
  ],
  [
    "supabase/functions/quality-batch-orchestrator/_local/golden/lia.ts",
    "supabase/functions/product-test-grade/_local/golden/lia.ts",
  ],
  [
    "supabase/functions/quality-batch-orchestrator/_local/golden/cppa-risk.ts",
    "supabase/functions/product-test-grade/_local/golden/cppa-risk.ts",
  ],
  [
    "supabase/functions/quality-batch-orchestrator/_local/golden/biometric-extra.ts",
    "supabase/functions/product-test-grade/_local/golden/biometric-extra.ts",
  ],

  // ptest-run-driver/_local/review/* — lint.ts, lint-profiles.ts (cross-block.ts)
  // and determinism.ts (snapshot.ts).
  [
    "supabase/functions/ptest-run-driver/_local/review/lint.ts",
    "supabase/functions/product-test-grade/_local/review/lint.ts",
  ],
  [
    "supabase/functions/ptest-run-driver/_local/review/lint-profiles.ts",
    "supabase/functions/product-test-grade/_local/review/lint-profiles.ts",
  ],
  [
    "supabase/functions/ptest-run-driver/_local/review/determinism.ts",
    "supabase/functions/product-test-grade/_local/review/determinism.ts",
  ],

  // run-stress-job/_local/intake-contracts/* — us-notice, eu-notice,
  // registration (the three products without a `_shared/intake-contracts`
  // entry; importing another function's `_local` directly is not permitted,
  // so these are mirrored instead — see variants/contracts-registry.ts).
  [
    "supabase/functions/run-stress-job/_local/intake-contracts/us-notice.ts",
    "supabase/functions/product-test-grade/_local/intake-contracts/us-notice.ts",
  ],
  [
    "supabase/functions/run-stress-job/_local/intake-contracts/eu-notice.ts",
    "supabase/functions/product-test-grade/_local/intake-contracts/eu-notice.ts",
  ],
  [
    "supabase/functions/run-stress-job/_local/intake-contracts/registration-assessment.ts",
    "supabase/functions/product-test-grade/_local/intake-contracts/registration-assessment.ts",
  ],
];

for (const [source, mirror] of PAIRS) {
  Deno.test(`mirror is byte-identical: ${mirror}`, async () => {
    const [a, b] = await Promise.all([
      Deno.readTextFile(new URL(source, ROOT)),
      Deno.readTextFile(new URL(mirror, ROOT)),
    ]);
    assertEquals(b, a, `${mirror} has drifted from its source ${source}`);
  });
}
