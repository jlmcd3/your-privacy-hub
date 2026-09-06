// QA round two (Scope-A-01 and Scope-A-02, both High, 2026-09-06) — two
// CPPA Scope screening findings that overstated what the customer's answers
// establish.
//
// Scope-A-01: Q3 asks how many California consumers' PI the business "buys,
// sells, shares, OR RECEIVES for commercial purposes", and its band alone
// decided the § 1798.140(d)(1)(B) limb. Customer A — 360,000 ordinary retail
// customers, explicit "No" to Q4 on selling or sharing — was reported as
// meeting a threshold that concerns buying, selling and sharing. Customer B
// reproduced it. The volume PROCESSED and the volume BOUGHT/SOLD/SHARED are
// now separate quantities.
//
// Scope-A-02: the § 1798.121 Right to Limit was declared "Required" from the
// mere presence of a sensitive category, with no question about use. The right
// turns on use, so a new Q6a supplies that fact and the finding follows it.
//
// NOTE FOR LEGAL REVIEW: no citation text is asserted or altered by these
// tests. The pinpoints on both findings are unverified here and are flagged for
// the CEO or counsel.
import { describe, expect, it } from "vitest";
import {
  consumerVolumeProng,
  evaluateSection7120Scope,
  evaluateSensitiveLimitRight,
} from "@/pages/CPPAScopeChecker";

describe("Scope-A-01 — receipt-only volume does not meet the buy/sell/share limb", () => {
  it("customer A's exact answers: 250k–1m consumers, no sale or sharing", () => {
    expect(consumerVolumeProng("250,000–1 million", "No")).toBe("not_met");
  });

  it("the same volume DOES meet the limb once the business sells or shares", () => {
    expect(consumerVolumeProng("250,000–1 million", "Yes — we sell PI")).toBe("met");
    expect(consumerVolumeProng("250,000–1 million", "Yes — we share for targeted/behavioural advertising")).toBe("met");
    expect(consumerVolumeProng("250,000–1 million", "Both")).toBe("met");
  });

  it("a band below the threshold is not met however the business behaves", () => {
    expect(consumerVolumeProng("Fewer than 100,000", "Both")).toBe("not_met");
    expect(consumerVolumeProng("Fewer than 100,000", "No")).toBe("not_met");
  });

  it("an unsure answer on either half leaves the limb unresolved, never met", () => {
    expect(consumerVolumeProng("Unsure", "Both")).toBe("unsure");
    expect(consumerVolumeProng("Over 1 million", "Unsure")).toBe("unsure");
    // A caller that supplies no activity answer gets the conservative reading.
    expect(consumerVolumeProng("Over 1 million", undefined)).toBe("unsure");
    expect(consumerVolumeProng("Over 1 million", "")).toBe("unsure");
  });

  it("a receipt-only business is not made a 'business' by volume alone", () => {
    // Under-threshold revenue, no 50%-sale-share, 360k consumers received only.
    const r = evaluateSection7120Scope({
      q1: "Yes",
      revenueMet: false,
      revenueUnsure: false,
      q3: "250,000–1 million",
      q4: "No",
      q5: "No",
      q9_250k: "No",
      q10_spi_50k: "No",
    });
    expect(r.scope).toBe("not_triggered_on_answers");
  });

  it("the § 7120(b) processing triggers are untouched by this change", () => {
    // Volume-processed still drives § 7120(b)(1) on its own — that limb is
    // about processing, and separating the two counts must not weaken it.
    const r = evaluateSection7120Scope({
      q1: "Yes",
      revenueMet: true,
      revenueUnsure: false,
      q3: "250,000–1 million",
      q4: "No",
      q5: "No",
      q9_250k: "Yes",
      q10_spi_50k: "No",
    });
    expect(r.scope).toBe("required");
    expect(r.triggeringFacts.map((f) => f.pinpoint)).toContain("11 CCR § 7120(b)(1)");
  });
});

describe("Scope-A-02 — the Right to Limit follows how sensitive data is used", () => {
  it("no sensitive information at all: not triggered", () => {
    expect(evaluateSensitiveLimitRight("No", "")).toBe("not_triggered_on_answers");
  });

  it("sensitive information used only for the permitted purposes: not triggered", () => {
    // The reported overstatement: this used to read "Required".
    expect(
      evaluateSensitiveLimitRight("Yes", "No — used only for the permitted operational purposes"),
    ).toBe("not_triggered_on_answers");
  });

  it("sensitive information used beyond those purposes, or to infer: required", () => {
    expect(
      evaluateSensitiveLimitRight("Yes", "Yes — used beyond the permitted purposes, or to infer characteristics"),
    ).toBe("required");
  });

  it("unsure on either question is never converted into Required or Not required", () => {
    expect(evaluateSensitiveLimitRight("Unsure", "")).toBe("needs_counsel_review");
    expect(evaluateSensitiveLimitRight("Yes", "Unsure")).toBe("needs_counsel_review");
    // Sensitive data present but the use question unanswered.
    expect(evaluateSensitiveLimitRight("Yes", "")).toBe("needs_counsel_review");
  });
});
