// CPPA Scope Checker — deterministic evaluator tests.
// Anchors:
//   • Cal. Civ. Code § 1798.140(d)(1)(A) — CPI-adjusted revenue threshold
//     $26,625,000 (effective 2025-01-01); CPPA CPI adjustment table.
//   • 11 CCR § 7120(b) — cybersecurity audit scope prongs.
//   • 11 CCR § 7121 — phased deadlines by revenue band.
//   • 11 CCR § 7150(b)(1)–(3) — risk-assessment triggers.

import { describe, it, expect } from "vitest";
import {
  CCPA_REVENUE_THRESHOLD_USD,
  evaluateRevenueProng,
  evaluateSection7120Scope,
  evaluateSection7150Triggers,
  cyberDeadline,
} from "@/pages/CPPAScopeChecker";

describe("§ 1798.140(d)(1)(A) — revenue threshold", () => {
  it("threshold constant equals CPI-adjusted $26,625,000", () => {
    expect(CCPA_REVENUE_THRESHOLD_USD).toBe(26_625_000);
    // Sanity: prior threshold $25M is strictly below the CPI-adjusted line.
    expect(26_624_999 < CCPA_REVENUE_THRESHOLD_USD).toBe(true);
    expect(26_625_000 >= CCPA_REVENUE_THRESHOLD_USD).toBe(true);
  });

  it("Under $26.625 million → prong not met", () => {
    const r = evaluateRevenueProng("Under $26.625 million", "");
    expect(r.met).toBe(false);
    expect(r.needsConfirmation).toBe(false);
  });

  it("$26.625M–$50M → prong met", () => {
    const r = evaluateRevenueProng("$26.625M–$50M", "");
    expect(r.met).toBe(true);
  });

  it("$100M–$500M → prong met", () => {
    expect(evaluateRevenueProng("$100M–$500M", "").met).toBe(true);
  });

  it("Unsure → not decided", () => {
    const r = evaluateRevenueProng("Unsure", "");
    expect(r.met).toBe(false);
    expect(r.unsure).toBe(true);
  });

  it("legacy $25M–$100M straddles threshold → confirmation required, NOT silent reclassification", () => {
    const r = evaluateRevenueProng("$25M–$100M", "");
    expect(r.met).toBe(false);
    expect(r.needsConfirmation).toBe(true);
  });

  it("legacy $25M–$100M with AboveThreshold confirm → met", () => {
    const r = evaluateRevenueProng("$25M–$100M", "AboveThreshold");
    expect(r.met).toBe(true);
    expect(r.needsConfirmation).toBe(false);
  });

  it("legacy $25M–$100M with BelowThreshold confirm → not met", () => {
    const r = evaluateRevenueProng("$25M–$100M", "BelowThreshold");
    expect(r.met).toBe(false);
    expect(r.needsConfirmation).toBe(false);
  });

  it("legacy 'Under $25 million' maps cleanly to below-threshold (25M < 26.625M)", () => {
    const r = evaluateRevenueProng("Under $25 million", "");
    expect(r.met).toBe(false);
    expect(r.needsConfirmation).toBe(false);
  });
});

describe("§ 7120(b) — cybersecurity audit scope", () => {
  const base = { q1: "Yes" as const, revenueMet: true, revenueUnsure: false, q3: "Fewer than 100,000" as const, q5: "No" as const, q9_250k: "No" as const, q10_spi_50k: "No" as const };

  it("business + ≥250k processing → in scope with § 7120(b)(1)", () => {
    const r = evaluateSection7120Scope({ ...base, q9_250k: "Yes" });
    expect(r.scope).toBe("required");
    expect(r.triggeringFacts.some((f) => f.pinpoint.includes("7120(b)(1)"))).toBe(true);
  });

  it("business + ≥50k SPI processing → in scope with § 7120(b)(2)", () => {
    const r = evaluateSection7120Scope({ ...base, q10_spi_50k: "Yes" });
    expect(r.scope).toBe("required");
    expect(r.triggeringFacts.some((f) => f.pinpoint.includes("7120(b)(2)"))).toBe(true);
  });

  it("business + 50%+ sale/share revenue → in scope (sale/share prong)", () => {
    const r = evaluateSection7120Scope({ ...base, q5: "Yes" });
    expect(r.scope).toBe("required");
  });

  it(">$100M business meeting NEITHER processing prong NOR sale/share → NOT auto in scope", () => {
    const r = evaluateSection7120Scope({ ...base });
    expect(r.scope).toBe("not_triggered_on_answers");
  });

  it("any Unsure in the path never becomes definitive in-scope", () => {
    const r = evaluateSection7120Scope({ ...base, q9_250k: "Unsure" });
    expect(r.scope).toBe("needs_counsel_review");
  });

  it("q1 Unsure alone → needs_counsel_review", () => {
    const r = evaluateSection7120Scope({ ...base, q1: "Unsure" });
    expect(r.scope).toBe("needs_counsel_review");
  });
});

describe("§ 7121 — phased deadlines by prior-year revenue", () => {
  it(">$100M → April 1, 2028", () => {
    expect(cyberDeadline("$100M–$500M", "").label).toBe("April 1, 2028");
    expect(cyberDeadline("Over $500M", "").label).toBe("April 1, 2028");
  });
  it("$50M–$100M → April 1, 2029", () => {
    expect(cyberDeadline("$50M–$100M", "").label).toBe("April 1, 2029");
  });
  it("<$50M bands → April 1, 2030", () => {
    expect(cyberDeadline("$26.625M–$50M", "").label).toBe("April 1, 2030");
    expect(cyberDeadline("Under $26.625 million", "").label).toBe("April 1, 2030");
  });
  it("legacy $25M–$100M unresolved → needs band confirmation", () => {
    expect(cyberDeadline("$25M–$100M", "").needsBandConfirmation).toBe(true);
  });
});

describe("§ 7150 — risk-assessment triggers", () => {
  it("in-scope + all triggers No → NOT auto-required", () => {
    const r = evaluateSection7150Triggers({ q4: "No", q6: "No", q7: "No" });
    expect(r.result).toBe("not_triggered_on_answers");
  });

  it("sale/share Yes → required with § 7150(b)(1)", () => {
    const r = evaluateSection7150Triggers({ q4: "Yes — we sell PI", q6: "No", q7: "No" });
    expect(r.result).toBe("required");
    expect(r.triggeringFacts[0].pinpoint).toBe("11 CCR § 7150(b)(1)");
  });

  it("SPI Yes → required with § 7150(b)(2)", () => {
    const r = evaluateSection7150Triggers({ q4: "No", q6: "Yes", q7: "No" });
    expect(r.result).toBe("required");
    expect(r.triggeringFacts[0].pinpoint).toBe("11 CCR § 7150(b)(2)");
  });

  it("ADMT significant-decision Yes → required with § 7150(b)(3)", () => {
    const r = evaluateSection7150Triggers({ q4: "No", q6: "No", q7: "Yes" });
    expect(r.result).toBe("required");
    expect(r.triggeringFacts[0].pinpoint).toBe("11 CCR § 7150(b)(3)");
  });

  it("any relevant Unsure with no positive triggers → needs_counsel_review", () => {
    const r = evaluateSection7150Triggers({ q4: "Unsure", q6: "No", q7: "No" });
    expect(r.result).toBe("needs_counsel_review");
  });

  it("Unsure never becomes 'not required'", () => {
    const r = evaluateSection7150Triggers({ q4: "Unsure", q6: "Unsure", q7: "Unsure" });
    expect(r.result).toBe("needs_counsel_review");
  });
});

describe("independence of the three CCPA prongs (§ 1798.140(d)(1))", () => {
  // 100k-consumer prong and 50%-sale-share prong operate independently of revenue.
  it("consumer prong alone triggers § 7120 sale/share path only if q5=Yes; else awaits processing prongs", () => {
    const r = evaluateSection7120Scope({
      q1: "Yes",
      revenueMet: false,
      revenueUnsure: false,
      q3: "Over 1 million",
      q5: "No",
      q9_250k: "No",
      q10_spi_50k: "No",
    });
    // 100k prong makes the entity a "business" but does NOT itself satisfy § 7120(b).
    expect(r.scope).toBe("not_triggered_on_answers");
  });

  it("50%-sale-share prong satisfies § 7120 independently", () => {
    const r = evaluateSection7120Scope({
      q1: "Yes",
      revenueMet: false,
      revenueUnsure: false,
      q3: "Fewer than 100,000",
      q5: "Yes",
      q9_250k: "No",
      q10_spi_50k: "No",
    });
    expect(r.scope).toBe("required");
  });
});
