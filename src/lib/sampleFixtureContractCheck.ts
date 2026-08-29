// ALL-PRODUCTS-TEST — CONTRACT-LEVEL fixture validation (2026-08-29).
//
// The original preflight (sampleFixturePreflight.ts) checks fixtures against
// hand-maintained required-key lists in sampleFixtureShapes.ts. That catches
// missing/blank keys but NOT the defect class that actually degrades output
// quality: a value that is present but not the VERBATIM enum label the form
// emits (e.g. "Legitimate interests (…)" vs the contract's "Legitimate
// interest (…)"). The deterministic builders branch on exact labels, so a
// drifted label silently routes the record down record_insufficient/generic
// paths — and the resulting low test scores read as product defects when they
// are fixture defects.
//
// This module closes that gap by validating every fixture's intake payload
// against the REAL canonical intake contracts
// (supabase/functions/_shared/intake-contracts/*) using the SAME
// validateIntake the server-side harnesses use: verbatim enum membership,
// required-always presence, array shapes, dotted-path/[] structured keys.
// The contracts are plain data modules (no Deno imports), so importing them
// into the client is safe — the vitest suite already imports far heavier
// supabase/functions modules.
//
// Session-shaped products (RoPA, US/EU Notice) have no intake contract —
// their intake is spread across session + child tables — so they keep the
// shape-level preflight only and report ok here with a note.

import { validateIntake } from "../../supabase/functions/_shared/intake-contracts/validate.ts";
import type { IntakeContract } from "../../supabase/functions/_shared/intake-contracts/types.ts";
import { liAssessmentStageBContract } from "../../supabase/functions/_shared/intake-contracts/li-assessment.ts";
import { dpiaFrameworkContract } from "../../supabase/functions/_shared/intake-contracts/dpia-framework.ts";
import { governanceContract } from "../../supabase/functions/_shared/intake-contracts/governance-assessment.ts";
import { cppaRiskContract } from "../../supabase/functions/_shared/intake-contracts/cppa-risk-assessment.ts";
import { cppaCybersecurityContract } from "../../supabase/functions/_shared/intake-contracts/cppa-cybersecurity.ts";
import { cppaAdmtContract } from "../../supabase/functions/_shared/intake-contracts/cppa-admt.ts";
import { biometricContract } from "../../supabase/functions/_shared/intake-contracts/biometric.ts";
import { irPlaybookContract } from "../../supabase/functions/_shared/intake-contracts/ir-playbook.ts";
import { dpaGeneratorContract } from "../../supabase/functions/_shared/intake-contracts/dpa-generator.ts";
import { registrationContract } from "../../supabase/functions/_shared/intake-contracts/registration-assessment.ts";
import { SAMPLE_FIXTURES, type SampleFixture, type ToolSlug } from "@/lib/sampleFixtures";

export interface ContractViolation {
  key: string;
  reason: string;
  options?: readonly string[];
}

export interface ContractCheckResult {
  tool_slug: ToolSlug;
  variant: string;
  ok: boolean;
  /** True when the product has no intake contract (session-shaped). */
  no_contract: boolean;
  violations: ContractViolation[];
}

interface SlugSpec {
  contract: IntakeContract;
  /** Pull the intake payload out of the fixture. */
  extract: (fix: Record<string, any>) => Record<string, unknown> | null;
  /**
   * Row-control / harness keys that legitimately ride alongside the intake at
   * the same level (insert-shape fixtures) and must not count as unknown
   * top-level keys.
   */
  ignoreUnknown?: readonly string[];
}

const SPECS: Partial<Record<ToolSlug, SlugSpec>> = {
  li_assessment: {
    contract: liAssessmentStageBContract,
    extract: (f) => f.insert ?? null,
    ignoreUnknown: ["status", "is_subscriber_credit", "preview_signal"],
  },
  dpia: {
    contract: dpiaFrameworkContract,
    extract: (f) => f.insert?.intake_data ?? null,
  },
  governance: {
    contract: governanceContract,
    extract: (f) => f.insert?.intake_data ?? null,
  },
  cppa_risk: {
    contract: cppaRiskContract,
    extract: (f) => f.insert?.intake_data ?? null,
  },
  cppa_cyber: {
    contract: cppaCybersecurityContract,
    extract: (f) => f.insert?.intake_data ?? null,
  },
  cppa_admt: {
    contract: cppaAdmtContract,
    extract: (f) => f.insert?.intake_data ?? null,
  },
  biometric: {
    contract: biometricContract,
    extract: (f) => f.invoke_body_extras ?? null,
  },
  ir_playbook: {
    contract: irPlaybookContract,
    extract: (f) => f.invoke_body_extras ?? f.invoke_body ?? null,
  },
  dpa: {
    contract: dpaGeneratorContract,
    extract: (f) => f.invoke_body_extras ?? null,
  },
  registration: {
    contract: registrationContract,
    extract: (f) => f.invoke_body?.intake_data ?? null,
  },
};

/** Validate one fixture against its canonical intake contract. */
export function contractCheckFixture(f: SampleFixture): ContractCheckResult {
  const spec = SPECS[f.tool_slug];
  if (!spec) {
    return { tool_slug: f.tool_slug, variant: f.variant, ok: true, no_contract: true, violations: [] };
  }
  const intake = spec.extract(f.fixture as Record<string, any>);
  if (!intake) {
    return {
      tool_slug: f.tool_slug,
      variant: f.variant,
      ok: false,
      no_contract: false,
      violations: [{ key: "(intake)", reason: "intake payload not found at its locator" }],
    };
  }
  const res = validateIntake(spec.contract, intake);
  const ignore = new Set(spec.ignoreUnknown ?? []);
  const violations = res.violations.filter(
    (v) => !(v.reason === "unknown top-level key" && ignore.has(v.key)),
  );
  return {
    tool_slug: f.tool_slug,
    variant: f.variant,
    ok: violations.length === 0,
    no_contract: false,
    violations,
  };
}

/** Validate every fixture (optionally scoped to given slugs). */
export function contractCheckAll(slugs?: ToolSlug[]): ContractCheckResult[] {
  const wanted = slugs?.length ? new Set<string>(slugs) : null;
  return SAMPLE_FIXTURES.filter((f) => !wanted || wanted.has(f.tool_slug)).map(contractCheckFixture);
}
