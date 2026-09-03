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
  violatesPerfectCarveOut,
} from "../../../supabase/functions/run-quality-batch/_local/quality/perfect-closed-loop.ts";
import { lintFixtureForVariant } from "../../../supabase/functions/run-quality-batch/_local/quality/fixture-lint.ts";
import { DPIA_PERFECT } from "../../../supabase/functions/quality-batch-orchestrator/_local/golden/dpia.ts";

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

// FIX 2026-08-25 — found live in a non-pinned so-final-test batch run
// (run #213): two well-constructed generated DPIA scenarios were both
// rejected by this carve-out even though their PRIMARY basis for the
// special-category processing was Art. 9(2)(b) / Art. 6(1)(c) — a
// SEPARATE secondary operation stated its own Art. 6(1)(f) basis, and that
// operation's own text explicitly disclaimed special-category involvement
// (anonymised/de-identified first). The batch exhausted its 2x retry
// budget on this false positive both times. These pin the real text
// shapes (trimmed) against the fixed detector.
Deno.test("8K FIX — secondary-use LI basis with an explicit anonymisation disclaimer is not a violation", () => {
  const anonymisedResearch = {
    ...GB,
    legal_basis_proposed: "Employment, social security & social protection law (Art. 9(2)(b))",
    data_categories: ["Employee records", "Health or medical data", "Biometric data"],
    secondary_uses:
      "An internal Occupational Medicine Research Programme aggregates assessment outcomes into de-identified cohort datasets for trend analysis. Secondary-use legal basis (stated separately from the primary Art. 9(2)(b) basis): the research aggregation is conducted under Legitimate interest (Art. 6(1)(f)) in combination with Archiving, research or statistics — Art. 89(1) (Art. 9(2)(j)), on the basis that the processing is carried out with appropriate technical safeguards including k-anonymity thresholding.",
  };
  assert(!violatesPerfectCarveOut(anonymisedResearch), "should not violate: LI basis applies only to a disclaimed-anonymised secondary operation");
  const res = checkPerfectDpiaIntake(anonymisedResearch);
  assert(!res.deficiencies.some((d) => d.kind === "carve_out"));

  const anonymisedReports = {
    ...GB,
    legal_basis_proposed: "Legal obligation (Art. 6(1)(c))",
    data_categories: ["Employee records", "Health or medical data", "Biometric data"],
    secondary_uses:
      "Anonymised population-level analytics reports are published for trade associations. Secondary operation legal basis (Art. 6(1)(f)): the Company relies on legitimate interests for the production and publication of anonymised aggregate trend reports, where the processing involves no special-category data at the point of processing — no health or biometric attributes are retained in the aggregated dataset.",
  };
  assert(!violatesPerfectCarveOut(anonymisedReports));
});

Deno.test("8K FIX — a secondary-use LI basis WITHOUT an anonymisation disclaimer still violates", () => {
  // Negative control: proves the fix narrows the false positive without
  // opening a false negative — a secondary operation naming its own LI
  // basis over special-category data, with no anonymisation/de-
  // identification language anywhere, must still be caught.
  const noDisclaimer = {
    ...GB,
    legal_basis_proposed: "Employment, social security & social protection law (Art. 9(2)(b))",
    data_categories: ["Employee records", "Health or medical data"],
    secondary_uses:
      "A separate wellness-analytics programme processes the same individual health assessment records under Legitimate interest (Art. 6(1)(f)) to build per-employee risk scores shared with line managers.",
  };
  assert(violatesPerfectCarveOut(noDisclaimer), "should still violate: no disclaimer accompanies the secondary LI basis");
  const res = checkPerfectDpiaIntake(noDisclaimer);
  assertEquals(res.ok, false);
  assertEquals(res.deficiencies[0].kind, "carve_out");
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
