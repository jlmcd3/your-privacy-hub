// ALL-PRODUCTS-TEST — intake preflight for sample data.
//
// PURPOSE: no run on /admin/all-products-test may fail because of an intake
// problem. Before anything is inserted or any generator is invoked, every
// selected fixture is checked against its canonical shape
// (src/lib/sampleFixtureShapes.ts): the intake payload must be readable at the
// declared locator, every required key must be present, and no required key
// may be blank (empty string, empty array, empty object, null).
//
// This is a READ-ONLY validator. It never mutates a fixture; a failing
// fixture is reported with the exact key paths so the fixture itself can be
// fixed, rather than surfacing later as an opaque generator error.

import { SAMPLE_FIXTURES, type SampleFixture, type ToolSlug } from "@/lib/sampleFixtures";
import { SAMPLE_FIXTURE_SHAPES } from "@/lib/sampleFixtureShapes";

export interface PreflightIssue {
  key: string;
  problem: "missing" | "blank";
}

export interface PreflightResult {
  tool_slug: ToolSlug;
  variant: string;
  label: string;
  ok: boolean;
  issues: PreflightIssue[];
}

/** Locate the intake payload inside a fixture (mirrors the drift-guard test). */
export function readIntake(f: SampleFixture): Record<string, unknown> | null {
  const shape = SAMPLE_FIXTURE_SHAPES[f.tool_slug];
  const fix = f.fixture as Record<string, any>;
  // ir_playbook variants use different top-level keys — try both.
  if (f.tool_slug === "ir_playbook") {
    return (fix.invoke_body_extras ?? fix.invoke_body ?? null) as Record<string, unknown> | null;
  }
  switch (shape.locator.at) {
    case "insert":
      return (fix.insert ?? null) as Record<string, unknown> | null;
    case "insert.intake_data":
      return (fix.insert?.intake_data ?? null) as Record<string, unknown> | null;
    case "invoke_body_extras":
      return (fix.invoke_body_extras ?? null) as Record<string, unknown> | null;
    case "invoke_body":
      return (fix.invoke_body ?? null) as Record<string, unknown> | null;
    case "root":
      return fix as Record<string, unknown>;
  }
}

function isBlank(v: unknown): boolean {
  if (v === null || v === undefined) return true;
  if (typeof v === "string") return v.trim() === "";
  if (Array.isArray(v)) return v.length === 0;
  if (typeof v === "object") return Object.keys(v as object).length === 0;
  return false;
}

function checkKeys(
  bag: Record<string, unknown> | undefined,
  keys: string[] | undefined,
  prefix: string,
  issues: PreflightIssue[],
) {
  if (!keys) return;
  const src = bag ?? {};
  for (const k of keys) {
    if (!(k in src)) issues.push({ key: `${prefix}${k}`, problem: "missing" });
    else if (isBlank(src[k])) issues.push({ key: `${prefix}${k}`, problem: "blank" });
  }
}

/** Validate one fixture. */
export function preflightFixture(f: SampleFixture): PreflightResult {
  const shape = SAMPLE_FIXTURE_SHAPES[f.tool_slug];
  const label = `${f.tool_slug}/${f.variant}`;
  const issues: PreflightIssue[] = [];
  const intake = readIntake(f);

  if (!intake) {
    return {
      tool_slug: f.tool_slug,
      variant: f.variant,
      label,
      ok: false,
      issues: [{ key: `(intake at ${shape.locator.at})`, problem: "missing" }],
    };
  }

  checkKeys(intake, shape.required, "", issues);
  checkKeys(intake.profile as Record<string, unknown> | undefined, shape.requiredProfileKeys, "profile.", issues);
  checkKeys(
    intake.exceptions_intake as Record<string, unknown> | undefined,
    shape.requiredExceptionsKeys,
    "exceptions_intake.",
    issues,
  );
  checkKeys(
    intake.impact_intake as Record<string, unknown> | undefined,
    shape.requiredImpactKeys,
    "impact_intake.",
    issues,
  );

  if (shape.requiredControlKeys) {
    const controls = Array.isArray(intake.controls) ? (intake.controls as Array<Record<string, unknown>>) : [];
    const present = new Set(controls.map((c) => String(c?.key ?? "")));
    for (const k of shape.requiredControlKeys) {
      if (!present.has(k)) issues.push({ key: `controls[${k}]`, problem: "missing" });
    }
  }

  return { tool_slug: f.tool_slug, variant: f.variant, label, ok: issues.length === 0, issues };
}

/** Validate every fixture for the given tool slugs (all slugs when omitted). */
export function preflightFixtures(slugs?: ToolSlug[]): PreflightResult[] {
  const wanted = slugs?.length ? new Set<string>(slugs) : null;
  return SAMPLE_FIXTURES.filter((f) => !wanted || wanted.has(f.tool_slug)).map(preflightFixture);
}

/** First fixture for a slug (the one the console runs by default). */
export function fixtureFor(slug: ToolSlug, variant?: string): SampleFixture | undefined {
  return SAMPLE_FIXTURES.find((f) => f.tool_slug === slug && (!variant || f.variant === variant));
}
