// PROMPT 8K (2026-08-12) — CLOSED-LOOP PERFECT FIXTURES.
//
// Perfect is defined by the product itself: a perfect intake is one the
// deliverables builder finds nothing missing in. These tests pin the four
// acceptance conditions, the CEO-parked 6(1)(f)+special-category carve-out,
// the retry-guidance feedback loop, and the two pinned DPIA perfect fixtures.

import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  CARVE_OUT_REASON,
  checkPerfectDpiaIntake,
  deficiencyLines,
  perfectRetryGuidance,
  PERFECT_CLOSED_LOOP_VERSION,
} from "../../../supabase/functions/run-quality-batch/_local/quality/perfect-closed-loop.ts";
import { lintFixtureForVariant } from "../../../supabase/functions/run-quality-batch/_local/quality/fixture-lint.ts";
import { DPIA_PERFECT } from "../../../supabase/functions/_shared/golden/dpia.ts";

const EU = DPIA_PERFECT[0].intake as Record<string, unknown>;
const GB = DPIA_PERFECT[1].intake as Record<string, unknown>;

Deno.test("8K — both pinned dpia perfect fixtures pass the closed-loop check", () => {
  for (const c of DPIA_PERFECT) {
    const res = checkPerfectDpiaIntake(c.intake);
    assertEquals(
      res.ok,
      true,
      `${c.id} deficiencies: ${deficiencyLines(res.deficiencies).join(" | ")}`,
    );
  }
});

Deno.test("8K — the version stamp is pinned", () => {
  assertEquals(PERFECT_CLOSED_LOOP_VERSION, "perfect-closed-loop@prompt8k-2026-08-12");
});

Deno.test("8K — carve-out: 6(1)(f) with special-category data is rejected", () => {
  const bad = {
    ...GB,
    legal_basis_proposed: "Legitimate interest (Art. 6(1)(f))",
    data_categories: ["Employee records", "Health or medical data"],
  };
  const res = checkPerfectDpiaIntake(bad);
  assertEquals(res.ok, false);
  assertEquals(res.deficiencies[0].kind, "carve_out");
  assertEquals(res.deficiencies[0].detail, CARVE_OUT_REASON);
});

Deno.test("8K — carve-out does not fire for 6(1)(f) without special-category data", () => {
  const li = {
    ...EU,
    legal_basis_proposed: "Legitimate interest (Art. 6(1)(f))",
    data_categories: ["Contact details", "Usage data"],
  };
  const res = checkPerfectDpiaIntake(li);
  assert(!res.deficiencies.some((d) => d.kind === "carve_out"));
});

Deno.test("8K — an incomplete sign-off block is a deficiency", () => {
  const res = checkPerfectDpiaIntake({
    ...GB,
    dpia_approved_by_name: "",
    dpia_approval_date: "",
  });
  assertEquals(res.ok, false);
  assert(res.deficiencies.some((d) => d.kind === "signoff"));
});

Deno.test("8K — a stripped record produces gap / insufficiency deficiencies", () => {
  const res = checkPerfectDpiaIntake({
    organization_name: "Thin Ltd",
    processing_activity_name: "Something",
  });
  assertEquals(res.ok, false);
  assert(res.deficiencies.length > 0);
  assert(res.deficiencies.some((d) => d.kind === "gap" || d.kind === "insufficient"));
});

Deno.test("8K — retry guidance names the specific deficiencies", () => {
  const res = checkPerfectDpiaIntake({
    ...GB,
    dpia_approved_by_title: "",
  });
  const guidance = perfectRetryGuidance(res.deficiencies);
  assert(guidance.length > 0);
  assert(guidance.toLowerCase().includes("title") || guidance.includes("dpia_approved_by_title"));
});

Deno.test("8K — variant lint applies the closed loop for perfect only", () => {
  const bad = {
    ...GB,
    legal_basis_proposed: "Legitimate interest (Art. 6(1)(f))",
  };
  const hit = lintFixtureForVariant("dpia", "perfect", bad);
  assert(hit, "perfect variant must reject the carve-out combination");
  assert(hit!.reason.startsWith("closed-loop perfect:"));

  // Legacy paths untouched: null variant and non-dpia tools are unaffected.
  assertEquals(lintFixtureForVariant("dpia", null, bad), null);
  assertEquals(lintFixtureForVariant("governance", "perfect", bad), null);
});

Deno.test("8K — variant lint passes the pinned perfect fixtures", () => {
  assertEquals(lintFixtureForVariant("dpia", "perfect", EU), null);
  assertEquals(lintFixtureForVariant("dpia", "perfect", GB), null);
});
