import { describe, expect, it } from "vitest";
import {
  applyRiskProseGold,
  stripDegradedOpenersGuarded,
} from "../../../supabase/functions/_shared/ltp/risk-prose-gold.ts";

const OPENER =
  "We could not verify this item from the information provided; add the missing information needed.";
const SUBSTANCE =
  "The business processes precise geolocation for route optimisation across a fleet of delivery vehicles.";

describe("item384 r2 — empty-surface guard on the opener strip", () => {
  it("gate-false + opener-only ⇒ text preserved byte-identical", () => {
    const report: Record<string, unknown> = { executive_summary: OPENER };
    const t = applyRiskProseGold(report, {
      recordComplete: false,
      affirmative: "A",
      reservedCount: 0,
    });
    expect(report.executive_summary).toBe(OPENER);
    expect(t.exec_degraded_opener_stripped).toBe(false);
  });

  it("gate-false + opener-plus-substance ⇒ opener stripped, substance kept", () => {
    const report: Record<string, unknown> = {
      executive_summary: `${OPENER} ${SUBSTANCE}`,
    };
    const t = applyRiskProseGold(report, {
      recordComplete: false,
      affirmative: "A",
      reservedCount: 0,
    });
    expect(report.executive_summary).toBe(SUBSTANCE);
    expect(t.exec_degraded_opener_stripped).toBe(true);
  });

  it("gate-true ⇒ unchanged behaviour (strip is unconditional)", () => {
    expect(stripDegradedOpenersGuarded(OPENER, true)).toBe("");
    expect(stripDegradedOpenersGuarded(OPENER, false)).toBe(OPENER);
    expect(stripDegradedOpenersGuarded(`${OPENER} ${SUBSTANCE}`, true)).toBe(SUBSTANCE);
  });
});
