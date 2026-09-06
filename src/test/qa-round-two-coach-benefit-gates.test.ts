// QA round two (R2 RA A 01 / RA-B-01, Medium, 2026-09-06) — "Advisory review
// misclassifies No benefit branches".
//
// Customer A answered "No" to both the other-stakeholder and public benefit
// gates, with a summary explicitly saying no such benefit is evidenced. The
// coach nonetheless raised a card listing "the benefit to other stakeholders",
// "the fact that shows the other-stakeholder benefit", "the benefit to the
// public" and "the fact that shows the public benefit" as unanswered, and
// advised naming who gains and supplying supporting facts — i.e. it asked the
// customer to invent a benefit they had correctly declined to claim. Customer B
// reproduced it on the public gate.
//
// The § 7152(a)(4) narratives and their supporting facts were `required:
// "optional"` in the intake contract, which both askedKeys and the
// record-complete gate it mirrors read as ASKED. The form does not present
// those boxes at all when the gate reads "No". They are now conditional on
// their own gate.
import { describe, expect, it } from "vitest";
import { buildCoach } from "@/lib/intakeCoach/buildCoach";
import { COACH_CONTRACTS } from "@/lib/intakeCoach/contracts";
import { coachEmptyAskedKeys, fieldWasAsked } from "@/lib/intakeCoach/askedKeys";

const contract = COACH_CONTRACTS.cppa_risk;

/**
 * Customer A's stage 6, reduced to the benefit block: business and consumer
 * benefits evidenced, other-stakeholder and public benefits expressly absent.
 */
const A_STAGE_SIX = {
  benefit_business_identified: "Yes",
  benefit_consumer_identified: "Yes",
  benefit_other_stakeholders_identified: "No",
  benefit_public_identified: "No",
  a4_benefit_business:
    "Failed doorstep handoffs at multi-entrance properties fall, which removes the redelivery cost and the support call that follows each one.",
  a4_benefit_business_fact:
    "The August pilot over 1,000 deliveries recorded failed handoffs falling from 40 to 25 per 1,000.",
  a4_benefit_consumer:
    "Customers at multi-entrance addresses receive the delivery at the correct door without waiting for a call.",
  a4_benefit_consumer_fact:
    "Median support handling time in the same pilot fell from eight minutes to six minutes.",
  a4_benefit_other_stakeholders: "",
  a4_benefit_other_stakeholders_fact: "",
  a4_benefit_public: "",
  a4_benefit_public_fact: "",
};

describe("R2 RA A 01 — an explicit No on a benefit gate is a complete answer", () => {
  it("does not treat an ungated benefit narrative as a question that was asked", () => {
    expect(fieldWasAsked(contract, "a4_benefit_other_stakeholders", A_STAGE_SIX)).toBe(false);
    expect(fieldWasAsked(contract, "a4_benefit_other_stakeholders_fact", A_STAGE_SIX)).toBe(false);
    expect(fieldWasAsked(contract, "a4_benefit_public", A_STAGE_SIX)).toBe(false);
    expect(fieldWasAsked(contract, "a4_benefit_public_fact", A_STAGE_SIX)).toBe(false);
  });

  it("still asks for the narrative and the fact behind a Yes gate", () => {
    expect(fieldWasAsked(contract, "a4_benefit_business", A_STAGE_SIX)).toBe(true);
    expect(fieldWasAsked(contract, "a4_benefit_business_fact", A_STAGE_SIX)).toBe(true);
    expect(fieldWasAsked(contract, "a4_benefit_consumer", A_STAGE_SIX)).toBe(true);
  });

  it("counts no empty asked key for a declined benefit", () => {
    const empty = coachEmptyAskedKeys(contract, A_STAGE_SIX);
    for (const k of [
      "a4_benefit_other_stakeholders",
      "a4_benefit_other_stakeholders_fact",
      "a4_benefit_public",
      "a4_benefit_public_fact",
    ]) {
      expect(empty, `${k} is still counted as an asked question left empty`).not.toContain(k);
    }
  });

  it("raises no benefit card at all on customer A's stage 6", () => {
    const result = buildCoach("cppa_risk", contract, A_STAGE_SIX);
    const benefitCard = result.cards.find((c) => c.key === "a4_benefit_business");
    expect(
      benefitCard,
      `the benefits card still fires on a record with two evidenced benefits and two declined ones: ${JSON.stringify(benefitCard?.details)}`,
    ).toBeUndefined();
  });

  it("does not name a declined benefit among the boxes to look at", () => {
    const result = buildCoach("cppa_risk", contract, A_STAGE_SIX);
    const named = result.cards.flatMap((c) => c.details ?? []).join(" | ");
    expect(named).not.toContain("other stakeholders");
    expect(named).not.toContain("the benefit to the public");
  });
});

describe("R2 RA A 01 — a Yes gate with nothing behind it is still coached", () => {
  const claimedButUnsupported = {
    ...A_STAGE_SIX,
    benefit_public_identified: "Yes",
    a4_benefit_public: "",
    a4_benefit_public_fact: "",
  };

  it("asks for the public benefit once the customer claims one", () => {
    expect(fieldWasAsked(contract, "a4_benefit_public", claimedButUnsupported)).toBe(true);
    expect(coachEmptyAskedKeys(contract, claimedButUnsupported)).toContain("a4_benefit_public");
  });

  it("raises the benefits card naming the claimed-but-empty boxes", () => {
    const result = buildCoach("cppa_risk", contract, claimedButUnsupported);
    const benefitCard = result.cards.find((c) => c.key === "a4_benefit_business");
    expect(benefitCard, "a claimed benefit with no narrative must still be coached").toBeDefined();
    expect(benefitCard!.reason).toBe("unanswered");
    expect((benefitCard!.details ?? []).join(" | ")).toContain("the benefit to the public");
  });
});
