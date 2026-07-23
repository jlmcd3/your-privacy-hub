// W3-T2 acceptance tests — LIA per-factor balancing objects.
import { assert, assertStringIncludes } from "https://deno.land/std@0.224.0/assert/mod.ts";

const src = Deno.readTextFileSync(new URL("../run-li-assessment/index.ts", import.meta.url));

Deno.test("W3-T2: balancing_test schema declares factors[] with the four enum values and intake_evidence", () => {
  assertStringIncludes(src, "\"factors\":");
  assertStringIncludes(src, "reasonable_expectations | relationship | impact_severity | safeguards");
  assertStringIncludes(src, "intake_evidence");
  assertStringIncludes(src, "for_controller | for_subjects | neutral");
  assertStringIncludes(src, "\"synthesis\":");
});

Deno.test("W3-T2: analysis string is retained on balancing_test", () => {
  // The lint rules and legacy PDF path key off `analysis`; it must remain.
  assertStringIncludes(src, "\"analysis\": \"4-5 sentences applying the EDPB four-factor balancing");
});

Deno.test("W3-T2: lint pass covers synthesis + factor reasoning", () => {
  assertStringIncludes(src, "[\"analysis\", \"synthesis\"]");
  assertStringIncludes(src, "factors[");
  assertStringIncludes(src, "entry.reasoning");
});

Deno.test("W3-T2: CROSS-READ + CANONICAL RECORD conventions still present alongside factors", () => {
  assertStringIncludes(src, "CROSS-READ THE FULL RECORD BEFORE FLAGGING ABSENCE");
  assertStringIncludes(src, "CANONICAL RECORD REFERENCE");
});

Deno.test("W3-T2: BODY_FIELDS.lia now points at three_part_test (grader sees factors)", () => {
  const payload = Deno.readTextFileSync(new URL("../_shared/grader/payload.ts", import.meta.url));
  assertStringIncludes(payload, "\"three_part_test\"");
  // Legacy placeholder keys removed
  assert(!/"lia":\s*\[\s*"purpose",\s*"necessity",\s*"balancing"/.test(payload),
    "legacy placeholder BODY_FIELDS.lia must be gone");
});

Deno.test("W3-T2: rubric context declares factor objects as designed output", () => {
  const ctx = Deno.readTextFileSync(new URL("../_shared/grader/context.ts", import.meta.url));
  assertStringIncludes(ctx, "LIA PER-FACTOR BALANCING OBJECTS (W3-T2");
  assertStringIncludes(ctx, "never deduct for the presence, shape, or enum values of the factors array");
});

Deno.test("W3-T2: goldens require factor names + intake_evidence anchors", () => {
  const golden = Deno.readTextFileSync(new URL("../_shared/golden/lia.ts", import.meta.url));
  assertStringIncludes(golden, "reasonable_expectations");
  assertStringIncludes(golden, "impact_severity");
  assertStringIncludes(golden, "intake_evidence");
});

Deno.test("W3-T2: BUILD_STAMP bumped", () => {
  assertStringIncludes(src, "r-turn-3-eu-product-fixes@2026-07-23T11:20:00Z-a");
});
