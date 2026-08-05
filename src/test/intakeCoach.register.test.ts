// ITEM 381 — REGISTER + BEHAVIOUR BATTERY for the intake completeness coach.
//
// Layer 1 is database-only: these tests also assert the modules contain no
// model/API call of any kind.

import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { buildCoach, COACH_COPY, COACH_MAX_CARDS, isThin, UNANSWERED_CONSEQUENCE } from "@/lib/intakeCoach/buildCoach";
import { THIN_SPOTS } from "@/lib/intakeCoach/thinSpots";
import { COACH_CONTRACTS } from "@/lib/intakeCoach/contracts";
import { INTAKE_COACH_ENABLED } from "@/config/intakeCoach";
import { DPIA_PERFECT } from "../../supabase/functions/_shared/golden/dpia";
import { CPPA_RISK_PERFECT } from "../../supabase/functions/_shared/golden/cppa-risk";

type Fx = { id: string; intake: Record<string, unknown> };
const perfectDpia = (DPIA_PERFECT as unknown as Fx[])[0];
const perfectRisk = (CPPA_RISK_PERFECT as unknown as Fx[])[0];

const ALL_COPY = [
  ...Object.values(COACH_COPY),
  UNANSWERED_CONSEQUENCE,
  ...[...THIN_SPOTS.dpia, ...THIN_SPOTS.cppa_risk].flatMap((s) => [s.title, s.consequence, s.advice]),
];

describe("coach register", () => {
  it("never demands, scolds, or scores", () => {
    const banned = /\b(must|should|required|mandatory|incomplete|insufficient|failed?|penalt|fine[sd]?|score|grade|weak|poor|bad)\b/i;
    for (const line of ALL_COPY) expect(line, line).not.toMatch(banned);
  });

  it("never says AI-generated", () => {
    for (const line of ALL_COPY) expect(line.toLowerCase()).not.toContain("ai-generated");
  });

  it("every thin spot carries a consequence source and a jump selector", () => {
    for (const product of ["dpia", "cppa_risk"] as const) {
      for (const s of THIN_SPOTS[product]) {
        expect(s.consequenceSource.length, s.key).toBeGreaterThan(0);
        expect(s.jumpSelector).toMatch(/^\[data-coach-field="[a-z0-9_]+"\]$/);
      }
    }
  });

  it("every jump selector resolves to an anchor in the live intake page", () => {
    const pages = {
      dpia: readFileSync("src/pages/DPIAFramework.tsx", "utf8"),
      cppa_risk: readFileSync("src/pages/CPPARiskAssessment.tsx", "utf8"),
    };
    for (const product of ["dpia", "cppa_risk"] as const) {
      for (const s of THIN_SPOTS[product]) {
        const attr = s.jumpSelector.slice(1, -1); // data-coach-field="x"
        expect(pages[product].includes(attr), `${product}/${s.key}`).toBe(true);
      }
    }
  });

  it("is DATABASE-ONLY — no model or network call in any coach module", () => {
    const files = [
      "src/lib/intakeCoach/askedKeys.ts",
      "src/lib/intakeCoach/thinSpots.ts",
      "src/lib/intakeCoach/buildCoach.ts",
      "src/lib/intakeCoach/contracts.ts",
      "src/components/intake/IntakeCoachStep.tsx",
      "src/config/intakeCoach.ts",
    ];
    for (const f of files) {
      const src = readFileSync(f, "utf8");
      expect(src, f).not.toMatch(/\bfetch\(|functions\.invoke|lovable-ai|openai|anthropic|gateway/i);
    }
  });

  it("both product flags default OFF", () => {
    expect(INTAKE_COACH_ENABLED).toEqual({ dpia: false, cppa_risk: false });
  });
});

describe("coach behaviour", () => {
  it("a perfect DPIA record raises no unanswered card", () => {
    const r = buildCoach("dpia", COACH_CONTRACTS.dpia, perfectDpia.intake);
    expect(r.stats.answered).toBe(r.stats.asked);
    expect(r.cards.filter((c) => c.reason === "unanswered")).toEqual([]);
  });

  it("a perfect Risk record raises no unanswered card", () => {
    const r = buildCoach("cppa_risk", COACH_CONTRACTS.cppa_risk, perfectRisk.intake);
    expect(r.stats.answered).toBe(r.stats.asked);
    expect(r.cards.filter((c) => c.reason === "unanswered")).toEqual([]);
  });

  it("an empty record flags unanswered first and caps the list at six", () => {
    const r = buildCoach("dpia", COACH_CONTRACTS.dpia, {});
    expect(r.cards.length).toBeLessThanOrEqual(COACH_MAX_CARDS);
    expect(r.flagged).toBeGreaterThanOrEqual(r.cards.length);
    const firstThin = r.cards.findIndex((c) => c.reason === "thin");
    const lastUnanswered = r.cards.map((c) => c.reason).lastIndexOf("unanswered");
    if (firstThin >= 0) expect(lastUnanswered).toBeLessThan(firstThin);
  });

  it("thin detection is conservative — a full answer is never thin", () => {
    const spot = THIN_SPOTS.dpia.find((s) => s.key === "necessity_proportionality")!;
    expect(isThin("Monitoring reduces incidents, a clear benefit to staff safety, and outweighs the intrusion.", spot)).toBe(false);
    expect(isThin("We track staff locations continuously across every shift and store the results.", spot)).toBe(true);
  });

  it("stats never claim more answers than the intake asked", () => {
    for (const product of ["dpia", "cppa_risk"] as const) {
      const r = buildCoach(product, COACH_CONTRACTS[product], {});
      expect(r.stats.answered).toBeLessThanOrEqual(r.stats.asked);
      expect(r.stats.answered).toBeGreaterThanOrEqual(0);
    }
  });
});
