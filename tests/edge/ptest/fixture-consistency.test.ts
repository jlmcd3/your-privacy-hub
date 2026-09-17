// FIXTURE CONSISTENCY — the deterministic gate for /all-ptest panel fixtures.
//
// Paid model reviewers have been finding internal contradictions inside
// fixtures (a band answer that contradicts a stated number, two answers to
// the same question that disagree, dates out of order, a vendor named in
// one field but missing from the recipients table). This suite runs the
// GENERIC_RULES plus each product's own rules over its fifteen fixtures and
// fails with the full list of contradictions found, so those defects are
// caught for free before any paid batch runs.
//
// Run one product while authoring:
//   deno test --no-check --allow-read --allow-env tests/edge/ptest/fixture-consistency.test.ts --filter "cppa-risk"

import { assert } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { PANEL_BY_TOOL, type PanelFixture, type PanelTool } from "../../../src/lib/ptestPanels/index.ts";
import { contractForStressTool } from "../../../supabase/functions/run-stress-job/_local/intake-gate.ts";
import { GENERIC_RULES, runRules, type FixtureRule, type RuleContext, type Violation } from "./fixture-consistency/framework.ts";
import { CPPA_RISK_RULES } from "./fixture-consistency/cppa-risk.rules.ts";
import { CPPA_CYBER_RULES } from "./fixture-consistency/cppa-cyber.rules.ts";
import { CPPA_ADMT_RULES } from "./fixture-consistency/cppa-admt.rules.ts";
import { DPIA_RULES } from "./fixture-consistency/dpia.rules.ts";
import { LIA_RULES } from "./fixture-consistency/lia.rules.ts";
import { GOVERNANCE_RULES } from "./fixture-consistency/governance.rules.ts";

const REPORT_DATE = "2026-09-17";

/** The six products this suite covers, keyed by their PanelTool id. */
const PRODUCTS: ReadonlyArray<{ product: string; tool: PanelTool; rules: readonly FixtureRule[]; prefix: string }> = [
  { product: "cppa-risk", tool: "cppa-risk", rules: CPPA_RISK_RULES, prefix: "risk." },
  { product: "cppa-cyber", tool: "cppa-cyber", rules: CPPA_CYBER_RULES, prefix: "cyber." },
  { product: "cppa-admt", tool: "cppa-admt", rules: CPPA_ADMT_RULES, prefix: "admt." },
  { product: "dpia", tool: "dpia", rules: DPIA_RULES, prefix: "dpia." },
  { product: "lia", tool: "lia", rules: LIA_RULES, prefix: "lia." },
  { product: "governance", tool: "governance", rules: GOVERNANCE_RULES, prefix: "gov." },
];

/** Every fixture across the six covered panels — the source of "every other fixture's company". */
const ALL_FIXTURES: readonly PanelFixture[] = PRODUCTS.flatMap(({ tool }) => [...PANEL_BY_TOOL[tool]]);

/** Every other fixture's company, excluding this exact fixture (by id, not by product). */
function otherCompaniesFor(fixture: PanelFixture): readonly string[] {
  return ALL_FIXTURES.filter((f) => f.id !== fixture.id).map((f) => f.company);
}

function formatViolations(violations: readonly Violation[]): string {
  return violations.map((v) => `${v.fixtureId} [${v.ruleId}] ${v.message}`).join("\n");
}

for (const { product, tool, rules } of PRODUCTS) {
  Deno.test(`fixture consistency — ${product}`, () => {
    const panel = PANEL_BY_TOOL[tool];
    const contract = contractForStressTool(tool);
    const violations: Violation[] = [];
    for (const fixture of panel) {
      const ctx: RuleContext = {
        fixture,
        reportDate: REPORT_DATE,
        otherCompanies: otherCompaniesFor(fixture),
        contract,
      };
      violations.push(...runRules(GENERIC_RULES, fixture.intake, ctx));
      violations.push(...runRules(rules, fixture.intake, ctx));
    }
    assert(violations.length === 0, `${violations.length} fixture-consistency violation(s):\n${formatViolations(violations)}`);
  });
}

Deno.test("fixture consistency — every rules file carries rules", () => {
  for (const { product, rules, prefix } of PRODUCTS) {
    assert(rules.length >= 5, `${product}: only ${rules.length} rule(s) — expected at least 5`);
    for (const rule of rules) {
      assert(rule.id.startsWith(prefix), `${product}: rule id "${rule.id}" does not start with "${prefix}"`);
    }
  }
});
