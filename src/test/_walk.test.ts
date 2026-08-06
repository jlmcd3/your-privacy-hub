import { describe, it } from "vitest";
import { buildCoach } from "@/lib/intakeCoach/buildCoach";
import { COACH_CONTRACTS } from "@/lib/intakeCoach/contracts";
import { DPIA_GOLDEN, DPIA_PERFECT } from "../../supabase/functions/_shared/golden/dpia";
import { CPPA_RISK_GOLDEN, CPPA_RISK_PERFECT } from "../../supabase/functions/_shared/golden/cppa-risk";
type Fx = { id: string; intake: Record<string, unknown> };
describe("walk", () => { it("dump", () => {
  const sets: any[] = [
    ["dpia", DPIA_PERFECT], ["dpia", DPIA_GOLDEN], ["cppa_risk", CPPA_RISK_PERFECT], ["cppa_risk", CPPA_RISK_GOLDEN]];
  for (const [p, fxs] of sets) for (const fx of fxs as Fx[]) {
    const r = buildCoach(p, COACH_CONTRACTS[p], fx.intake ?? {});
    console.log("=== ", p, fx.id, JSON.stringify(r.stats), "cards:", r.cards.map(c=>`${c.key}:${c.reason}`).join(","), "| strong:", r.alreadyStrong.length);
  }
}); });
