// R1a drift guard — every enumerated value in CPPA_RISK_VARIANTS must be a
// verbatim member of the live option set exported from CPPARiskAssessment.
// If an option array changes and a fixture isn't updated in lockstep, this
// test fails loudly with the offending value.
//
// Scope note: this guard is intentionally scoped to CPPA Risk (the intake
// under R1a). Other tools' fixture arrays (GOV_VARIANTS, DPIA_VARIANTS, …)
// carry parallel pre-existing drift that is out of scope for R1a and must
// be handled in dedicated stages once each tool's option arrays are exported.

import { describe, expect, it } from "vitest";
import { CPPA_RISK_VARIANTS } from "@/lib/stress/fixtures";
import {
  REVENUE_OPTS,
  CONSUMER_OPTS,
  SPI_VOLUME_OPTS,
  SHARE_REVENUE_50PCT_OPTS,
  Q5_SELL_SHARE_OPTS,
  Q15_SENSITIVE_PI_OPTS,
} from "@/pages/CPPARiskAssessment";

// Fields whose values must appear verbatim in the referenced option list.
// Legacy accepted values (kept in stored intakes but no longer offered in the
// live radio) are enumerated per-field.
const CHECKS: {
  field: keyof (typeof CPPA_RISK_VARIANTS)[number];
  options: readonly string[];
  legacyAccepted?: readonly string[];
}[] = [
  // BAND-REALIGNMENT-T2B (2026-07-26): legacyAccepted re-narrowed to the
  // minimal set still present in stress fixtures after V2 retargeting. Stress
  // fixtures now emit V2 labels exclusively; no V1/legacy strings remain in
  // CPPA_RISK_VARIANTS, so legacyAccepted is empty. Coverage assertions below
  // retargeted to V2 vocabulary. See docs/courier/BAND-REALIGNMENT-2026-07-26.md
  // §T2B-LANDED for the hygiene note.
  { field: "q1_revenue", options: REVENUE_OPTS, legacyAccepted: [] },
  { field: "q2_consumers", options: CONSUMER_OPTS, legacyAccepted: [] },
  { field: "q5_sell_share", options: Q5_SELL_SHARE_OPTS },
  { field: "q15_sensitive_pi", options: Q15_SENSITIVE_PI_OPTS },
  { field: "q15c_spi_volume", options: SPI_VOLUME_OPTS },
  { field: "q5c_share_revenue_50pct", options: SHARE_REVENUE_50PCT_OPTS },
];

describe("CPPA Risk fixture drift guard (R1a)", () => {
  for (const check of CHECKS) {
    it(`every ${String(check.field)} in CPPA_RISK_VARIANTS is a live option or legacy-accepted`, () => {
      const allowed = new Set<string>([...check.options, ...(check.legacyAccepted ?? [])]);
      const bad: { entity: string; value: unknown }[] = [];
      for (const v of CPPA_RISK_VARIANTS) {
        const val = (v as Record<string, unknown>)[check.field as string];
        if (val === undefined) continue; // optional field
        if (typeof val !== "string" || !allowed.has(val)) {
          bad.push({ entity: (v as { entity_name?: string }).entity_name ?? "?", value: val });
        }
      }
      expect(
        bad,
        `Field ${String(check.field)} — invalid values: ${JSON.stringify(bad)}`,
      ).toEqual([]);
    });
  }

  it("coverage: q1 exercises multiple V2 bands", () => {
    const vals = new Set(CPPA_RISK_VARIANTS.map((v) => v.q1_revenue));
    for (const req of ["$25M to under $50M", "$50M to $100M", "Over $100M"]) {
      expect(vals.has(req), `q1 missing ${req}`).toBe(true);
    }
  });

  it("coverage: q2 exercises multiple V2 bands including Under 100,000", () => {
    const vals = new Set(CPPA_RISK_VARIANTS.map((v) => v.q2_consumers));
    for (const req of ["Under 100,000", "100,000 to under 250,000", "250,000 to under 1,000,000", "1,000,000 or more"]) {
      expect(vals.has(req), `q2 missing ${req}`).toBe(true);
    }
  });

  it("coverage: q15c present-and-absent (both bands + Unsure represented)", () => {
    const present = CPPA_RISK_VARIANTS.filter((v) => "q15c_spi_volume" in v);
    const absent = CPPA_RISK_VARIANTS.filter((v) => !("q15c_spi_volume" in v));
    expect(present.length).toBeGreaterThan(0);
    expect(absent.length).toBeGreaterThan(0);
    const vals = new Set(present.map((v) => (v as { q15c_spi_volume?: string }).q15c_spi_volume));
    for (const req of ["Fewer than 50,000", "50,000 or more", "Unsure"]) {
      expect(vals.has(req), `q15c missing ${req}`).toBe(true);
    }
  });

  it("coverage: q5c Yes / No / absent all present", () => {
    const present = CPPA_RISK_VARIANTS.filter((v) => "q5c_share_revenue_50pct" in v);
    const absent = CPPA_RISK_VARIANTS.filter((v) => !("q5c_share_revenue_50pct" in v));
    expect(absent.length).toBeGreaterThan(0);
    const vals = new Set(present.map((v) => (v as { q5c_share_revenue_50pct?: string }).q5c_share_revenue_50pct));
    expect(vals.has("Yes")).toBe(true);
    expect(vals.has("No")).toBe(true);
  });

  it("coverage: exceptions with and without the two R1a per-exception fields", () => {
    let withNewFields = 0;
    let withoutNewFields = 0;
    for (const v of CPPA_RISK_VARIANTS) {
      const ex = (v as { exceptions_intake?: Record<string, Record<string, unknown>> }).exceptions_intake ?? {};
      for (const claim of Object.values(ex)) {
        if (!claim || typeof claim !== "object") continue;
        if (!claim.claimed) continue;
        const hasNew = "authority_basis" in claim || "retention_period" in claim;
        if (hasNew) withNewFields++;
        else withoutNewFields++;
      }
    }
    expect(withNewFields).toBeGreaterThan(0);
    expect(withoutNewFields).toBeGreaterThan(0);
  });
});
