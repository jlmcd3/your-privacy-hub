// ITEM 381 r2 — TRUTH-RULE BATTERY for the thin-card class.
//
// The acceptance invariant: buildCoach over EVERY sufficiency-audited perfect
// fixture produces ZERO cards. Any detector that flags a perfect fixture is by
// definition mis-calibrated, so the detector is weakened — never the fixture.
//
// The second half of the battery keeps the detectors ALIVE: a weak synthetic
// answer per detector must still raise a card.

import { describe, expect, it } from "vitest";
import { buildCoach, isThin, spotText, weakSubFields } from "@/lib/intakeCoach/buildCoach";
import { THIN_SPOTS, type ThinSpot } from "@/lib/intakeCoach/thinSpots";
import { COACH_CONTRACTS } from "@/lib/intakeCoach/contracts";
import { DPIA_GOLDEN, DPIA_PERFECT } from "../../supabase/functions/_shared/golden/dpia";
import { CPPA_RISK_GOLDEN, CPPA_RISK_PERFECT } from "../../supabase/functions/_shared/golden/cppa-risk";

type Fx = { id: string; intake: Record<string, unknown> };
const dpiaPerfect = DPIA_PERFECT as unknown as Fx[];
const riskPerfect = CPPA_RISK_PERFECT as unknown as Fx[];
const dpiaDegraded = (DPIA_GOLDEN as unknown as Fx[]).find((f) => f.id === "dpia-eu-health-tuning")!;
const riskDegraded = (CPPA_RISK_GOLDEN as unknown as Fx[])[0];

const spot = (p: "dpia" | "cppa_risk", key: string): ThinSpot =>
  THIN_SPOTS[p].find((s) => s.key === key)!;

describe("item381 r2 — acceptance invariant: perfect fixtures raise no card", () => {
  for (const fx of dpiaPerfect) {
    it(`dpia/${fx.id}: zero cards, every coached field already strong`, () => {
      const r = buildCoach("dpia", COACH_CONTRACTS.dpia, fx.intake);
      expect(r.cards, JSON.stringify(r.cards.map((c) => [c.key, c.reason, c.consequence]))).toEqual([]);
      expect(r.stats.toStrengthen).toBe(0);
      expect(r.alreadyStrong.length).toBe(THIN_SPOTS.dpia.length);
    });
  }

  for (const fx of riskPerfect) {
    it(`cppa_risk/${fx.id}: zero cards`, () => {
      const r = buildCoach("cppa_risk", COACH_CONTRACTS.cppa_risk, fx.intake);
      expect(r.cards, JSON.stringify(r.cards.map((c) => [c.key, c.reason]))).toEqual([]);
      expect(r.stats.toStrengthen).toBe(0);
    });
  }
});

describe("item381 r2 — companion evaluation", () => {
  it("a retention reason living in the record-type box counts as a reason", () => {
    const s = spot("dpia", "retention_period");
    const intake = {
      retention_period: "18 months from the end of the absence, then deleted.",
      retention_record_type:
        "Retention schedule entry OH-07 in the corporate records-retention register.",
    };
    expect(isThin(spotText(intake, s), s)).toBe(false);
    // …and the same period with no reason anywhere still fires.
    expect(isThin(spotText({ retention_period: "18 months, then deleted." }, s), s)).toBe(true);
  });

  it("necessity: a benefit stated in substance is not one-sided", () => {
    const s = spot("dpia", "necessity_proportionality");
    const eu = spotText(dpiaPerfect[0].intake, s);
    expect(isThin(eu, s)).toBe(false);
  });
});

describe("item381 r2 — A4 consolidation", () => {
  it("the four benefit statements are one card on one anchor", () => {
    const a4 = THIN_SPOTS.cppa_risk.filter((s) => s.jumpSelector.includes("a4_benefits"));
    expect(a4.length).toBe(1);
    expect(a4[0].companions?.length).toBe(7);
  });

  it("a thin benefits block raises ONE card naming the boxes concerned", () => {
    const s = spot("cppa_risk", "a4_benefit_business");
    const intake = { a4_benefit_business: "Good for us." };
    expect(isThin(spotText(intake, s), s)).toBe(true);
    expect(weakSubFields(intake, s)?.length).toBe(8);
  });
});

describe("item381 r2 — degraded records still coach", () => {
  it("dpia-eu-health-tuning keeps its five unanswered cards, capped at six", () => {
    const r = buildCoach("dpia", COACH_CONTRACTS.dpia, dpiaDegraded.intake);
    const unanswered = r.cards.filter((c) => c.reason === "unanswered").map((c) => c.key);
    expect(unanswered).toEqual([
      "data_subjects_views",
      "dpo_advice",
      "functional_description",
      "supporting_assets",
      "dpia_signoff_basis",
    ]);
    expect(r.cards.length).toBeLessThanOrEqual(6);
  });

  it("the risk degraded golden raises at least one card", () => {
    const r = buildCoach("cppa_risk", COACH_CONTRACTS.cppa_risk, riskDegraded.intake);
    expect(r.cards.length).toBeGreaterThanOrEqual(1);
  });
});

describe("item381 r2 — detectors are not dead", () => {
  const weak: Array<[("dpia" | "cppa_risk"), string, Record<string, unknown>]> = [
    ["dpia", "necessity_proportionality", { necessity_proportionality: "We look at the sickness certificates each month." }],
    ["dpia", "data_subjects_views", { data_subjects_views: "Not asked." }],
    ["dpia", "dpo_advice", { dpo_advice: "DPO is content." }],
    ["dpia", "functional_description", { functional_description: "We read the certificates." }],
    ["dpia", "supporting_assets", { supporting_assets: "CRM." }],
    ["dpia", "retention_period", { retention_period: "We keep it for five years." }],
    ["dpia", "dpia_signoff_basis", { dpia_signoff_basis: "Approved." }],
    ["cppa_risk", "a4_benefit_business", { a4_benefit_business: "Good for us." }],
    ["cppa_risk", "a5_harm_pathways", { a5_harm_pathways: "Data could leak." }],
    ["cppa_risk", "i1b_min_pi", { i1b_min_pi: "Everything." }],
    ["cppa_risk", "i5_admt_logic", { i5_admt_logic: "A model scores it." }],
    ["cppa_risk", "a6_safeguards", { a6_safeguards: "Encryption." }],
    ["cppa_risk", "exceptions_intake", { exceptions_intake: "7027(m)." }],
  ];

  for (const [product, key, intake] of weak) {
    it(`${product}/${key}: a weak answer still raises a card`, () => {
      const s = spot(product, key);
      expect(isThin(spotText(intake, s), s), key).toBe(true);
    });
  }
});

describe("item381 r2 — truth-tight consequence copy", () => {
  it("no hedged 'Where the answer…' construction survives", () => {
    for (const product of ["dpia", "cppa_risk"] as const) {
      for (const s of THIN_SPOTS[product]) {
        expect(s.consequence, s.key).not.toMatch(/\bWhere the answer\b/i);
      }
    }
  });
});
