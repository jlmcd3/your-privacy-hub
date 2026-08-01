import { describe, expect, it } from "vitest";
import { SAMPLE_FIXTURES, type SampleFixture } from "../sampleFixtures";
import { SAMPLE_FIXTURE_SHAPES } from "../sampleFixtureShapes";

function readIntake(f: SampleFixture): Record<string, unknown> | null {
  const shape = SAMPLE_FIXTURE_SHAPES[f.tool_slug];
  const fix = f.fixture as any;
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

describe("sample fixtures shape drift guard", () => {
  for (const fixture of SAMPLE_FIXTURES) {
    const label = `${fixture.tool_slug}/${fixture.variant}`;
    const shape = SAMPLE_FIXTURE_SHAPES[fixture.tool_slug];

    it(`${label} — carries a readable intake payload`, () => {
      const intake = readIntake(fixture);
      expect(intake, `intake not found at expected locator for ${label}`).toBeTruthy();
    });

    it(`${label} — contains all required top-level intake keys`, () => {
      const intake = readIntake(fixture) ?? {};
      const missing = shape.required.filter((k) => !(k in intake));
      expect(missing, `missing keys for ${label}: ${missing.join(", ")}`).toEqual([]);
    });

    if (shape.requiredControlKeys) {
      it(`${label} — carries all 18 c*_ control keys`, () => {
        const intake = readIntake(fixture) as any;
        const controls: any[] = Array.isArray(intake?.controls) ? intake.controls : [];
        const present = new Set(controls.map((c) => String(c?.key ?? "")));
        const missing = shape.requiredControlKeys!.filter((k) => !present.has(k));
        expect(missing, `missing control keys for ${label}: ${missing.join(", ")}`).toEqual([]);
      });
    }

    if (shape.requiredProfileKeys) {
      // Item 338: replaces the retired flat cyber keys — same coverage, at the
      // nested location the engine actually reads.
      it(`${label} — profile carries all required sub-keys`, () => {
        const intake = readIntake(fixture) as any;
        const profile = intake?.profile ?? {};
        const missing = shape.requiredProfileKeys!.filter((k) => !(k in profile));
        expect(missing, `missing profile keys for ${label}: ${missing.join(", ")}`).toEqual([]);
      });
    }

    if (shape.requiredExceptionsKeys) {
      it(`${label} — exceptions_intake carries all required exception keys`, () => {
        const intake = readIntake(fixture) as any;
        const ex = intake?.exceptions_intake ?? {};
        const missing = shape.requiredExceptionsKeys!.filter((k) => !(k in ex));
        expect(missing, `missing exception keys for ${label}: ${missing.join(", ")}`).toEqual([]);
      });
    }

    if (shape.requiredImpactKeys) {
      it(`${label} — impact_intake carries all required impact keys`, () => {
        const intake = readIntake(fixture) as any;
        const imp = intake?.impact_intake ?? {};
        const missing = shape.requiredImpactKeys!.filter((k) => !(k in imp));
        expect(missing, `missing impact keys for ${label}: ${missing.join(", ")}`).toEqual([]);
      });
    }
  }
});
