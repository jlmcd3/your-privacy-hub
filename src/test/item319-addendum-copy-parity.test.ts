import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { CPPA_RISK_RAIL } from "@/components/cppa/CPPARiskRailEntries";
import {
  secondaryRecommendation,
  secondaryRecommendationSentence,
} from "../../supabase/functions/_shared/ltp/secondary-recommendation";

/**
 * ITEM 319 ADDENDUM — COPY PARITY PIN.
 *
 * The § 7156(a) comparable-set posture is encoded in FOUR places that a
 * customer can see side by side. If any one of them drifts back to the old
 * reserved-to-counsel framing, the report says "we recommend" while the intake
 * screen next to it says the call is reserved to counsel. These pins fail
 * loudly on that drift.
 *
 * SCOPE: the carve-out is the secondary-activity bundling call ONLY. The last
 * test in this file pins that the doctrine itself is still the default rule.
 */

const RESERVED_PHRASES = [
  "reserved to you and your counsel",
  "for you and your counsel to judge",
  "reserved to you and counsel",
];

const read = (p: string) => readFileSync(join(process.cwd(), p), "utf8");

describe("Item 319 addendum — directive posture is consistent across all four surfaces", () => {
  const rail = CPPA_RISK_RAIL.comparable_set;

  it("rail 'The law' column no longer reserves the call to counsel and states the recommendation", () => {
    for (const phrase of RESERVED_PHRASES) {
      expect(rail.plainSummary.toLowerCase()).not.toContain(phrase);
    }
    expect(rail.plainSummary).toContain("recommends a separate risk assessment");
    expect(rail.plainSummary).toContain("any one of them differs");
    // Must not restate the recommendation as law.
    expect(rail.plainSummary).toContain("not a statement of what the law requires");
  });

  it("rail 'How to answer well' column describes the any-divergence threshold", () => {
    for (const phrase of RESERVED_PHRASES) {
      expect(rail.coachLead.toLowerCase()).not.toContain(phrase);
    }
    expect(rail.coachLead).toContain("if any single dimension differs");
    expect(rail.coachLead).toContain("recommend a separate risk assessment");
  });

  it("intake helper text under has_secondary_uses matches the same threshold", () => {
    const src = read("src/pages/CPPARiskAssessment.tsx");
    const start = src.indexOf("comparable set");
    expect(start).toBeGreaterThan(-1);
    const region = src.slice(start - 400, start + 1200);
    for (const phrase of RESERVED_PHRASES) {
      expect(region.toLowerCase()).not.toContain(phrase);
    }
    expect(region).toContain("if any one of them differs");
    expect(region).toContain("this tool recommends a separate risk assessment");
    expect(region).toContain("not a statement of what the law requires");
  });

  it("the copy describes the behaviour the engine actually implements", () => {
    // One differing dimension ⇒ separate. Pinned in both prose and engine.
    expect(
      secondaryRecommendation({
        data: "Same",
        purpose: "Different",
        systems: "Same",
        people: "Same",
        risks: "Same",
      }).verdict,
    ).toBe("separate");
    // Nothing differing, one unresolved ⇒ NOT a bundle green-light.
    expect(
      secondaryRecommendation({
        data: "Same",
        purpose: "Same",
        systems: "Not sure",
        people: "Same",
        risks: "Same",
      }).verdict,
    ).toBe("unresolved");
    // All same ⇒ single, exactly as the intake copy promises.
    expect(
      secondaryRecommendation({
        data: "Same",
        purpose: "Same",
        systems: "Same",
        people: "Same",
        risks: "Same",
      }).verdict,
    ).toBe("single");
  });

  it("recommendation prose says 'recommend', never 'the law requires'", () => {
    const sentence = secondaryRecommendationSentence({
      name: "resale of shopper contact details",
      purpose: "monetization",
      divergence: { data: "Same", purpose: "Different", systems: "Same", people: "Same", risks: "Same" },
    });
    expect(sentence).toContain("Recommended:");
    expect(sentence.toLowerCase()).not.toContain("the law requires");
    expect(sentence.toLowerCase()).not.toContain("you must");
  });
});

describe("Item 319 addendum — the carve-out did NOT repeal the reserved-framing doctrine", () => {
  const spec = read("docs/CPPA-RISK-IMPLEMENTATION-SPEC-v1.md");

  it("§ 2R.5 still states reserved-framing as the default rule", () => {
    expect(spec).toContain("Reserved-framing law (UNCHANGED AS THE DEFAULT)");
    expect(spec).toContain("reserved to the Company and its counsel");
    expect(spec).toContain("it never green-lights");
  });

  it("the exception is named, dated, and scoped to the secondary bundling call only", () => {
    expect(spec).toContain("ONE NAMED EXCEPTION");
    expect(spec).toContain("cppa-risk only");
    expect(spec).toContain("2026-08-01");
    expect(spec).toContain("Scope of the exception is exhaustive");
    expect(spec).toContain("does **not** reach the primary activity's five § 7152 analytic deliverables");
  });
});

describe("Item 319 addendum — the fifth encoding (live statutory-trigger line)", () => {
  const src = read("src/pages/CPPARiskAssessment.tsx");

  it("the reactive § 7156(a) trigger line is directive, not reserved-framed", () => {
    expect(src).not.toContain("determination reserved to you and counsel");
    // ITEM 336 (d): the trigger also fires on Not-sure-only records, so the
    // label must cover unresolved dimensions as well as differing ones.
    expect(src).toContain(
      "a separate risk assessment is recommended for each use that differs or has unresolved comparison dimensions",
    );
    expect(src).toContain(
      "this tool's recommendation on your record, not a statement of what the law requires",
    );
  });
});
