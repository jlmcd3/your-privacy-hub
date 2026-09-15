// /all-ptest fixture panel — record-complete diagnostic.
//
// Prints, per panel, the empty ASKED intake keys of every fixture under the
// product's own record-complete semantics (`_shared/ltp/record-complete.ts`,
// item380-r5: optional-but-presented fields count; untriggered conditionals do
// not), next to the shipped *_PERFECT goldens as a baseline. The panel gate
// (tests/edge/ptest/panels.test.ts) enforces zero for the products whose
// golden reaches zero; this script is the diagnostic for the rest.
//
//   deno run --no-check --allow-read --allow-env scripts/ptest/panel-asked-keys.ts [tool]

import { PANEL_BY_TOOL, PANEL_TOOLS } from "../../supabase/functions/_shared/review/panels/index.ts";
import { contractForStressTool, dropBlankMultiValues } from "../../supabase/functions/run-stress-job/_local/intake-gate.ts";
import { emptyAskedKeys } from "../../supabase/functions/_shared/ltp/record-complete.ts";
import { PERFECT_BY_TOOL } from "../../supabase/functions/quality-batch-orchestrator/_local/golden/registry.ts";

const only = Deno.args[0];
const ALIAS: Record<string, string[]> = { biometric: ["biometric", "biometric-checker"] };
for (const tool of PANEL_TOOLS) {
  if (only && tool !== only) continue;
  const contract = contractForStressTool(tool);
  if (!contract) { console.log(`[${tool}] no contract — skipped`); continue; }
  const golden = (ALIAS[tool] ?? [tool]).map((k) => PERFECT_BY_TOOL[k]).find(Boolean) ?? [];
  // deno-lint-ignore no-explicit-any
  const gl = golden.map((g: any) => emptyAskedKeys(contract, dropBlankMultiValues(contract, g.intake ?? {})).length);
  console.log(`[${tool}] PERFECT golden empties per case: ${JSON.stringify(gl)}`);
  for (const f of PANEL_BY_TOOL[tool]) {
    const e = emptyAskedKeys(contract, dropBlankMultiValues(contract, f.intake));
    if (e.length) console.log(`  ${f.id}: ${e.length} -> ${e.join(", ")}`);
  }
}
