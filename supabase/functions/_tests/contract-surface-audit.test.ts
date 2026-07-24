// FULL-LINE CONTRACT-SURFACE AUDIT — durable guard.
//
// Extends the golden-contract check to cover EVERY fixture surface a
// contract could be authored against, so drift like the wave-10 risk
// TURN 1b miss (added to page/fixtures/golden but not to the shared
// contract) can never again be invisible to CI. Surfaces covered:
//
//   • Golden fixtures                 (_shared/golden/registry.ts)
//   • Pinned contract-scenario fixtures (_shared/*-contract-fixtures.ts)
//   • Sample-report fixtures          (src/lib/sampleFixtures.ts)
//
// Non-contract tools (registration, ropa, us_notice, eu_notice) are
// exempt and printed as skipped.

import { assert } from "https://deno.land/std@0.224.0/assert/mod.ts";

import { validateIntake } from "../_shared/intake-contracts/validate.ts";
import type { IntakeContract } from "../_shared/intake-contracts/types.ts";

import { GOLDEN_BY_TOOL } from "../_shared/golden/registry.ts";

import { cppaAdmtContract }         from "../_shared/intake-contracts/cppa-admt.ts";
import { cppaRiskContract }         from "../_shared/intake-contracts/cppa-risk-assessment.ts";
import { cppaCybersecurityContract } from "../_shared/intake-contracts/cppa-cybersecurity.ts";
import { governanceContract }       from "../_shared/intake-contracts/governance-assessment.ts";
import { dpiaFrameworkContract }    from "../_shared/intake-contracts/dpia-framework.ts";
import { liAssessmentStageBContract } from "../_shared/intake-contracts/li-assessment.ts";
import { dpaGeneratorContract }     from "../_shared/intake-contracts/dpa-generator.ts";
import { irPlaybookContract }       from "../_shared/intake-contracts/ir-playbook.ts";
import { biometricCheckerContract } from "../_shared/intake-contracts/biometric-checker.ts";

import { CPPA_RISK_CONTRACT_FIXTURES } from "../_shared/cppa-risk-contract-fixtures.ts";
import { ADMT_CONTRACT_FIXTURES }      from "../_shared/admt-contract-fixtures.ts";
import { CYBER_CONTRACT_FIXTURES }     from "../_shared/cyber-contract-fixtures.ts";
import { GOVERNANCE_CONTRACT_FIXTURES } from "../_shared/governance-contract-fixtures.ts";

// Sample fixtures — src/lib is outside the functions tree; import via
// relative path. Deno can load .ts modules directly.
import { SAMPLE_FIXTURES } from "../../../src/lib/sampleFixtures.ts";

const CONTRACT_BY_TOOL: Record<string, IntakeContract> = {
  "cppa-admt":         cppaAdmtContract,
  "cppa-risk":         cppaRiskContract,
  "cppa-cyber":        cppaCybersecurityContract,
  "governance":        governanceContract,
  "dpia":              dpiaFrameworkContract,
  "lia":               liAssessmentStageBContract,
  "dpa-generator":     dpaGeneratorContract,
  "ir-playbook":       irPlaybookContract,
  "biometric-checker": biometricCheckerContract,
};

// Sample-slug → (tool key, intake path). Path is dotted with support for
// alt paths ("|"-separated) — first non-nullish wins.
const SAMPLE_MAP: Record<string, { tool: string; path: string }> = {
  li_assessment: { tool: "lia",               path: "insert" },
  dpia:          { tool: "dpia",              path: "insert.intake_data" },
  dpa:           { tool: "dpa-generator",     path: "invoke_body_extras" },
  governance:    { tool: "governance",        path: "insert.intake_data" },
  ir_playbook:   { tool: "ir-playbook",       path: "invoke_body_extras|invoke_body" },
  biometric:     { tool: "biometric-checker", path: "invoke_body_extras" },
  cppa_risk:     { tool: "cppa-risk",         path: "insert.intake_data" },
  cppa_cyber:    { tool: "cppa-cyber",        path: "insert.intake_data" },
  cppa_admt:     { tool: "cppa-admt",         path: "insert.intake_data" },
  // Non-contract:
  // ropa, us_notice, eu_notice → skipped
};

function readPath(obj: any, path: string): any {
  for (const alt of path.split("|")) {
    let cur = obj;
    let ok = true;
    for (const seg of alt.split(".")) {
      if (cur == null || typeof cur !== "object") { ok = false; break; }
      cur = cur[seg];
    }
    if (ok && cur != null) return cur;
  }
  return null;
}

function fmt(tool: string, id: string, violations: { key: string; reason: string }[]): string {
  const head = violations.slice(0, 6).map((v) => `${v.key}: ${v.reason}`).join("; ");
  const more = violations.length > 6 ? ` (+${violations.length - 6} more)` : "";
  return `  - ${tool} / ${id}: ${head}${more}`;
}

Deno.test("contract-surface-audit / golden fixtures validate", () => {
  const failures: string[] = [];
  for (const [tool, fixtures] of Object.entries(GOLDEN_BY_TOOL)) {
    const contract = CONTRACT_BY_TOOL[tool];
    if (!contract) continue;
    for (const fx of fixtures) {
      const res = validateIntake(contract, (fx.intake ?? {}) as Record<string, unknown>);
      if (!res.ok) failures.push(fmt(tool, fx.id, res.violations));
    }
  }
  assert(failures.length === 0, `Golden fixtures violate contracts:\n${failures.join("\n")}`);
});

Deno.test("contract-surface-audit / pinned contract-scenario fixtures validate", () => {
  const failures: string[] = [];
  const groups: Array<[string, IntakeContract, Array<{ fixture_id: string; intake: Record<string, unknown> }>]> = [
    ["cppa-risk",  cppaRiskContract,          CPPA_RISK_CONTRACT_FIXTURES as any],
    ["cppa-admt",  cppaAdmtContract,          ADMT_CONTRACT_FIXTURES as any],
    ["cppa-cyber", cppaCybersecurityContract, CYBER_CONTRACT_FIXTURES as any],
    ["governance", governanceContract,        GOVERNANCE_CONTRACT_FIXTURES as any],
  ];
  for (const [tool, contract, fixtures] of groups) {
    for (const fx of fixtures) {
      const res = validateIntake(contract, fx.intake ?? {});
      if (!res.ok) failures.push(fmt(tool, fx.fixture_id, res.violations));
    }
  }
  assert(failures.length === 0, `Pinned contract-scenario fixtures violate contracts:\n${failures.join("\n")}`);
});

// Sample-report fixtures are authored for a DIFFERENT runtime surface
// than the harness validator: some are DB row shapes (LIA persists full
// Stage-A+B at `insert` root), some are richer invoke-body payloads
// consumed by generate-* functions. They do NOT flow through
// validateIntake at runtime (see rg SAMPLE_FIXTURES: only
// AdminSampleReports.tsx + this test consume them). Auditing them
// therefore surfaces authoring drift but cannot recur the wave-10
// harness-validator failure class.
//
// Deviation D2 (see fix report): this subtest reports drift as findings
// (non-fatal) until per-tool sample-fixture reconciliation lands. Once
// each SAMPLES-CONTRACT-<tool> courier lands, flip its slug out of
// SAMPLE_ADVISORY_TOOLS to convert to fatal.
// SAMPLES-CONTRACT reconciled tools flip out of this set (FATAL tier).
// Reconciled so far: cppa_risk (1/8), cppa_admt (2/8), cppa_cyber (3/8), dpia (4/8), li_assessment (5/8).
const SAMPLE_ADVISORY_TOOLS = new Set<string>([
  "dpa", "governance", "ir_playbook", "biometric",
]);

Deno.test("contract-surface-audit / sample-report fixtures validate", () => {
  const failures: string[] = [];
  const advisory: string[] = [];
  const skipped: string[] = [];
  for (const sf of SAMPLE_FIXTURES) {
    const map = SAMPLE_MAP[sf.tool_slug];
    if (!map) { skipped.push(`${sf.tool_slug}/${sf.variant} (no contract)`); continue; }
    const contract = CONTRACT_BY_TOOL[map.tool];
    if (!contract) { skipped.push(`${sf.tool_slug}/${sf.variant} (no contract)`); continue; }
    const intake = readPath(sf.fixture, map.path);
    if (intake == null || typeof intake !== "object") {
      const line = `  - ${map.tool} / ${sf.tool_slug}:${sf.variant}: intake path "${map.path}" not found in fixture`;
      (SAMPLE_ADVISORY_TOOLS.has(sf.tool_slug) ? advisory : failures).push(line);
      continue;
    }
    const res = validateIntake(contract, intake as Record<string, unknown>);
    if (!res.ok) {
      const line = fmt(map.tool, `${sf.tool_slug}:${sf.variant}`, res.violations);
      (SAMPLE_ADVISORY_TOOLS.has(sf.tool_slug) ? advisory : failures).push(line);
    }
  }
  if (skipped.length) console.log(`[contract-surface-audit] sample-report skipped: ${skipped.join(", ")}`);
  if (advisory.length) {
    console.log(`[contract-surface-audit] sample-report ADVISORY drift (${advisory.length}):\n${advisory.join("\n")}`);
  }
  assert(failures.length === 0, `Sample-report fixtures violate contracts:\n${failures.join("\n")}`);
});

