// product-test-grade — `variants` action: determinism and cap counts.
//
// One fixture per Auto product (doc 272 §1 default set: cppa-risk,
// cppa-cyber, cppa-admt, dpia, lia, governance). Imports fixtures straight
// from src/lib/ptestPanels/<tool>.ts, per the brief.
//
// NOT RUN by this agent (hard rule: no `deno test`). Run with:
//   deno test -A tests/edge/product-test/variants.test.ts

import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { buildVariants } from "../../../supabase/functions/product-test-grade/_local/variants/index.ts";
import { PANEL_CPPA_RISK } from "../../../src/lib/ptestPanels/cppa-risk.ts";
import { PANEL_CPPA_CYBER } from "../../../src/lib/ptestPanels/cppa-cyber.ts";
import { PANEL_CPPA_ADMT } from "../../../src/lib/ptestPanels/cppa-admt.ts";
import { PANEL_DPIA } from "../../../src/lib/ptestPanels/dpia.ts";
import { PANEL_LIA } from "../../../src/lib/ptestPanels/lia.ts";
import { PANEL_GOVERNANCE } from "../../../src/lib/ptestPanels/governance.ts";
import type { PanelFixture } from "../../../src/lib/ptestPanels/types.ts";
import type { ProductTestTool } from "../../../supabase/functions/product-test-grade/_local/types.ts";

const AUTO_FIXTURES: ReadonlyArray<readonly [ProductTestTool, PanelFixture]> = [
  ["cppa-risk", PANEL_CPPA_RISK[0]],
  ["cppa-cyber", PANEL_CPPA_CYBER[0]],
  ["cppa-admt", PANEL_CPPA_ADMT[0]],
  ["dpia", PANEL_DPIA[0]],
  ["lia", PANEL_LIA[0]],
  ["governance", PANEL_GOVERNANCE[0]],
];

for (const [tool, fixture] of AUTO_FIXTURES) {
  Deno.test(`${tool}: buildVariants is deterministic (same list, same order, twice)`, () => {
    const a = buildVariants(tool, fixture.id, fixture.intake as Record<string, unknown>);
    const b = buildVariants(tool, fixture.id, fixture.intake as Record<string, unknown>);
    assertEquals(a.map((v) => v.variant_id), b.map((v) => v.variant_id));
    assertEquals(JSON.stringify(a), JSON.stringify(b));
  });

  Deno.test(`${tool}: buildVariants includes exactly one golden variant, first in the list`, () => {
    const variants = buildVariants(tool, fixture.id, fixture.intake as Record<string, unknown>);
    assert(variants.length > 0);
    assertEquals(variants[0].kind, "golden");
    assertEquals(variants.filter((v) => v.kind === "golden").length, 1);
  });

  Deno.test(`${tool}: thin-one is capped at 25 and blank-required at 10`, () => {
    const variants = buildVariants(tool, fixture.id, fixture.intake as Record<string, unknown>);
    const thinOne = variants.filter((v) => v.kind === "thin-one");
    const blankRequired = variants.filter((v) => v.kind === "blank-required");
    assert(thinOne.length <= 25, `${tool}: ${thinOne.length} thin-one variants (cap 25)`);
    assert(blankRequired.length <= 10, `${tool}: ${blankRequired.length} blank-required variants (cap 10)`);
  });

  Deno.test(`${tool}: every variant_id is unique`, () => {
    const variants = buildVariants(tool, fixture.id, fixture.intake as Record<string, unknown>);
    const ids = variants.map((v) => v.variant_id);
    assertEquals(new Set(ids).size, ids.length, "duplicate variant_id found");
  });
}

Deno.test("cppa-risk: at least 3 contradict variants (doc 272 §4)", () => {
  const fixture = PANEL_CPPA_RISK[0];
  const variants = buildVariants("cppa-risk", fixture.id, fixture.intake as Record<string, unknown>);
  const contradictions = variants.filter((v) => v.kind === "contradict");
  assert(contradictions.length >= 3, `expected >=3 contradict variants, got ${contradictions.length}`);
});

Deno.test("ropa: only golden and thin-all are emitted (no contract)", () => {
  const variants = buildVariants("ropa", "ropa-p01-smoke", { org_name: "Test Org", dpo_email: "dpo@example.com", rights_handling_process: "x" });
  const kinds = new Set(variants.map((v) => v.kind));
  for (const k of kinds) assert(k === "golden" || k === "thin-all", `unexpected ropa variant kind: ${k}`);
});
