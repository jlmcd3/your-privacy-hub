// DOC 139 (2026-09-02) — investigation of an external legal review's P0
// claim against resolveIcoFeeTier (ICO Data-Protection Fee tier resolver,
// supabase/functions/run-registration-assessment/_local/ico-fee-tier.ts,
// extracted from index.ts this batch so it is directly testable).
//
// The review argued the resolver should never output an exact fee/tier
// (e.g. "Tier 3, £3,763.00") when turnover is FX-estimated rather than
// directly stated, and proposed splitting fee-obligation from fee-tier
// into two independent states. It cited a specific fixture: 320 staff,
// ~$78M USD annual revenue.
//
// Actually running that fixture's numbers refutes the review's premise for
// THIS fixture: at the DOC 130 REG-1 plausible-rate band (0.72-0.88
// GBP/USD), $78M USD converts to £56.16M-£68.64M — entirely above the £36m
// Tier-2/Tier-3 threshold. The tier is robust to the full FX-uncertainty
// range, so the existing boundary check correctly does NOT flag it, and the
// firm "Tier 3, £3,763.00" output IS deterministically supported even
// accounting for FX uncertainty. No re-architecture, and no downgrade to a
// "Determination Pending" state, is warranted for this fixture.
//
// This file (a) re-verifies that exact math computationally rather than by
// inspection, (b) confirms the boundary flag DOES fire for a constructed
// fixture where the FX band genuinely straddles a threshold (proving the
// non-firing above isn't just a check that never fires), and (c) confirms
// the DOC 139 narrative addition (an explicit "stable across the range"
// sentence when boundary does not fire) renders correctly without
// disturbing the DOC 130 conversion-disclosure sentence it sits beside.
import { assert, assertEquals, assertStringIncludes } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { resolveIcoFeeTier } from "../../../supabase/functions/run-registration-assessment/_local/ico-fee-tier.ts";

Deno.test("DOC 139 — cited review fixture (320 staff, $78M USD revenue): Tier 3 is robust across the full FX band, boundary does not fire", () => {
  const result = resolveIcoFeeTier({ employee_count: 320, annual_revenue_usd: 78_000_000 });
  // Sanity-check the math independently of the resolver's own arithmetic.
  const loGbp = 78_000_000 * 0.72;
  const hiGbp = 78_000_000 * 0.88;
  assertEquals(loGbp, 56_160_000);
  assertEquals(hiGbp, 68_640_000);
  assert(loGbp > 36_000_000, "even the LOW end of the plausible FX band must clear the £36m Tier-2/3 threshold for this fixture");

  assertEquals(result.tier, 3);
  assertEquals(result.fee_cents, 376_300, "Tier 3 fee (£3,763.00) must be returned firm, not downgraded");
  assertEquals(result.boundary, false, "the FX band does not straddle any tier threshold for this fixture — boundary must not fire");
  assertStringIncludes(result.narrative, "Tier 3 (£3763.00)");
  assertStringIncludes(
    result.narrative,
    "This tier is stable across the full 0.72-0.88 GBP/USD plausible-rate range",
    "DOC 139: a non-boundary revenue-based determination must say explicitly that it was checked against the FX range and held",
  );
  assertEquals(
    result.narrative.includes("sits near a tier boundary"),
    false,
    "a robust, non-boundary determination must not also carry boundary-uncertainty language",
  );
});

Deno.test("DOC 139 — a genuinely FX-fragile fixture near the £36m Tier-2/3 threshold DOES flag boundary", () => {
  // staff=300 clears T2_STAFF(250) on its own; revenueUsd chosen so the 0.80
  // planning-rate estimate (£37.6m) clears £36m, but the LOW end of the
  // 0.72-0.88 band (£33.84m) does not — a genuine straddle.
  const revenueUsd = 47_000_000;
  const loGbp = revenueUsd * 0.72;
  const hiGbp = revenueUsd * 0.88;
  assert(loGbp <= 36_000_000 && hiGbp > 36_000_000, "fixture setup must actually straddle the £36m threshold");

  const result = resolveIcoFeeTier({ employee_count: 300, annual_revenue_usd: revenueUsd });
  assertEquals(result.tier, 3, "the 0.80 planning-rate point estimate still resolves to Tier 3");
  assertEquals(result.boundary, true, "the FX band straddles the Tier-2/3 threshold — boundary must fire");
  assertEquals(
    result.narrative.includes("This tier is stable across the full"),
    false,
    "the robustness sentence must not appear when the tier is NOT actually robust to the FX range",
  );
});

Deno.test("DOC 139 — a Tier-1 straddle (small turnover near £632k) also flags boundary via the FX-band check", () => {
  // 0.80 planning-rate estimate (£600k) sits at/under the £632k Tier-1
  // ceiling, but the FX band's high end (£660k) crosses it.
  const revenueUsd = 750_000;
  const loGbp = revenueUsd * 0.72;
  const hiGbp = revenueUsd * 0.88;
  assertEquals(loGbp, 540_000);
  assertEquals(hiGbp, 660_000);
  assert(loGbp <= 632_000 && hiGbp > 632_000, "fixture setup must actually straddle the £632k Tier-1 threshold");

  const result = resolveIcoFeeTier({ annual_revenue_usd: revenueUsd });
  assertEquals(result.tier, 1, "the 0.80 planning-rate point estimate resolves to Tier 1");
  assertEquals(result.boundary, true, "the FX band straddles the £632k Tier-1 threshold — boundary must fire even with no staff count recorded");
});

Deno.test("DOC 139 — no revenue recorded (staff-only record): no FX-band check applies, no robustness sentence, prior behavior unaffected", () => {
  const result = resolveIcoFeeTier({ employee_count: 5 });
  assertEquals(result.tier, 1);
  assertEquals(result.boundary, false);
  assertEquals(result.narrative.includes("planning rate"), false, "no revenue was recorded, so no FX-conversion disclosure should appear");
});
