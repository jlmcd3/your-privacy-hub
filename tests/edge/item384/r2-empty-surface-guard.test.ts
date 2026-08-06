// ITEM 384 r2 — EMPTY-SURFACE GUARD ON THE OPENER STRIP.
import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  applyRiskProseGold,
  stripDegradedOpenersGuarded,
} from "../../../supabase/functions/_shared/ltp/risk-prose-gold.ts";

const OPENER =
  "We could not verify this item from the information provided; add the missing information needed.";
const SUBSTANCE =
  "The business processes precise geolocation for route optimisation across a fleet of delivery vehicles.";

Deno.test("r2: gate-false + opener-only => text preserved byte-identical", () => {
  const report: Record<string, unknown> = { executive_summary: OPENER };
  const t = applyRiskProseGold(report, {
    recordComplete: false,
    affirmative: "A",
    reservedCount: 0,
  });
  assertEquals(report.executive_summary, OPENER);
  assertEquals(t.exec_degraded_opener_stripped, false);
});

Deno.test("r2: gate-false + opener-plus-substance => opener stripped, substance kept", () => {
  const report: Record<string, unknown> = {
    executive_summary: `${OPENER} ${SUBSTANCE}`,
  };
  const t = applyRiskProseGold(report, {
    recordComplete: false,
    affirmative: "A",
    reservedCount: 0,
  });
  assertEquals(report.executive_summary, SUBSTANCE);
  assertEquals(t.exec_degraded_opener_stripped, true);
});

Deno.test("r2: gate-true => unchanged behaviour (strip is unconditional)", () => {
  assertEquals(stripDegradedOpenersGuarded(OPENER, true), "");
  assertEquals(stripDegradedOpenersGuarded(OPENER, false), OPENER);
  assertEquals(stripDegradedOpenersGuarded(`${OPENER} ${SUBSTANCE}`, true), SUBSTANCE);
});
