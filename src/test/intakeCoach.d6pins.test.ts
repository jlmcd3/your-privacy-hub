// ITEM 398 — CEO RULING D6 PINS (all four ruled 2026-08-06).
//
// ▣1 ADVISORY-ONLY, ▣3 PRE-PAYMENT PLACEMENT, ▣5 UNIVERSAL ACCESS are the live
// behaviours, pinned here so they cannot drift silently. ▣4 (transcript
// storage) is pinned on its fail-open and no-new-PII contract.

import { describe, it, expect, vi, beforeEach } from "vitest";
import { readFileSync } from "node:fs";
import { transcriptCards } from "@/lib/intakeCoach/transcript";
import { buildCoach } from "@/lib/intakeCoach/buildCoach";
import { COACH_CONTRACTS } from "@/lib/intakeCoach/contracts";
import type { CoachContract } from "@/lib/intakeCoach/askedKeys";
import { isIntakeCoachEnabled } from "@/config/intakeCoach";

const step = readFileSync("src/components/intake/IntakeCoachStep.tsx", "utf8");
const dpia = readFileSync("src/pages/DPIAFramework.tsx", "utf8");
const cppa = readFileSync("src/pages/CPPARiskAssessment.tsx", "utf8");

describe("D6 ▣1 — coach is ADVISORY ONLY (CEO ruling 2026-08-06)", () => {
  it("the continue action is never disabled and has no blocking guard", () => {
    expect(step).toContain("<Button onClick={handleContinue}>");
    expect(step).not.toMatch(/<Button[^>]*disabled/);
  });

  it("the step never mutates the intake and never calls a model or edge function", () => {
    expect(step).not.toMatch(/functions\.invoke|fetch\(|setIntake|onChange=/);
  });

  it("continue on both products calls the purchase path unchanged", () => {
    expect(dpia).toContain("onContinue={() => { setCoachOpen(false); void handlePurchase(); }}");
    expect(cppa).toContain("onContinue={() => { setCoachOpen(false); handlePurchase(); }}");
  });
});

describe("D6 ▣3 — PRE-PAYMENT placement (CEO ruling 2026-08-06)", () => {
  it("DPIA opens the coach before any checkout/insert call", () => {
    const i = dpia.indexOf('isIntakeCoachEnabled("dpia")');
    expect(i).toBeGreaterThan(-1);
    expect(dpia.indexOf("setCheckoutOpen(true)")).toBeGreaterThan(i);
    expect(dpia.indexOf('.from("dpia_frameworks")')).toBeGreaterThan(i);
  });

  it("CPPA risk opens the coach before setCheckoutOpen", () => {
    const i = cppa.indexOf('isIntakeCoachEnabled("cppa_risk")');
    expect(i).toBeGreaterThan(-1);
    expect(cppa.indexOf("setCheckoutOpen(true)")).toBeGreaterThan(i);
  });

  it("the coach branch returns before the checkout call", () => {
    for (const src of [dpia, cppa]) {
      const seg = src.slice(src.indexOf("isIntakeCoachEnabled"), src.indexOf("isIntakeCoachEnabled") + 260);
      expect(seg).toContain("setCoachOpen(true)");
      expect(seg).toContain("return;");
    }
  });
});

describe("D6 ▣5 — UNIVERSAL access (CEO ruling 2026-08-06)", () => {
  it("no subscriber/entitlement gating on the coach path", () => {
    expect(step).not.toMatch(/subscriber|entitlement|isPremium|has_role|plan/i);
  });

  it("the flag gate is per-product only and both products are ON", () => {
    expect(isIntakeCoachEnabled("dpia")).toBe(true);
    expect(isIntakeCoachEnabled("cppa_risk")).toBe(true);
    for (const src of [dpia, cppa]) {
      const seg = src.slice(src.indexOf("isIntakeCoachEnabled"), src.indexOf("isIntakeCoachEnabled") + 120);
      expect(seg).not.toMatch(/subscriber|isPremium|entitlement/i);
    }
  });
});

describe("D6 ▣4 — transcript storage (CEO ruling 2026-08-06)", () => {
  beforeEach(() => vi.resetModules());

  it("every transcript call is fire-and-forget with a catch", () => {
    const t = readFileSync("src/lib/intakeCoach/transcript.ts", "utf8");
    expect((t.match(/catch/g) ?? []).length).toBeGreaterThanOrEqual(4);
    expect(step).toContain("void writeCoachTranscript");
    expect(step).toContain("void markCardEdited");
    expect(step).toContain('void markTranscriptOutcome(id, "skipped")');
    expect(step).toContain('void markTranscriptOutcome(id, "continued")');
  });

  it("a write failure never blocks the flow", async () => {
    vi.doMock("@/integrations/supabase/client", () => ({
      supabase: {
        from: () => { throw new Error("boom"); },
      },
    }));
    const mod = await import("@/lib/intakeCoach/transcript");
    await expect(
      mod.writeCoachTranscript({ userId: "u", product: "dpia" }, buildCoach("dpia", COACH_CONTRACTS.dpia as CoachContract, {})),
    ).resolves.toBeNull();
    await expect(mod.markTranscriptOutcome("t", "continued")).resolves.toBeUndefined();
    await expect(mod.markCardEdited("t", "k")).resolves.toBeUndefined();
  });

  it("the cards payload carries no field beyond the coach's own text", () => {
    const r = buildCoach("dpia", COACH_CONTRACTS.dpia as CoachContract, {});
    for (const c of transcriptCards(r)) {
      expect(Object.keys(c).sort()).toEqual(
        ["advice", "consequence", "excerpt", "key", "reason", "title"],
      );
      expect(c.excerpt.length).toBeLessThanOrEqual(180);
    }
  });

  it("zero model calls remain in the Layer 1 path", () => {
    const t = readFileSync("src/lib/intakeCoach/transcript.ts", "utf8");
    expect(t).not.toMatch(/functions\.invoke|openai|gateway|lovable-ai/i);
  });
});
