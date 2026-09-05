// QA batch 2026-09-05 (RA 05) — "Strengthen answers asks how ADMT works and
// fairness testing despite ADMT in use No." The i5_admt_logic spot's primary
// field is `required: "conditional"` with no machine trigger (never asked), but
// its optional companion i5_admt_fairness_testing counted as asked-and-empty in
// the sub-field branch, so an unanswered card fired for a record with no ADMT.
import { describe, expect, it } from "vitest";
import { buildCoach } from "@/lib/intakeCoach/buildCoach";
import { COACH_CONTRACTS } from "@/lib/intakeCoach/contracts";
import { CPPA_RISK_PERFECT } from "../../supabase/functions/quality-batch-orchestrator/_local/golden/cppa-risk";

type Fx = { id: string; intake: Record<string, unknown> };
const base = (CPPA_RISK_PERFECT as unknown as Fx[])[0].intake;

function withoutAdmt(intake: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = { ...intake, q18_admt_use: "No", q18b_admt_training: "No" };
  for (const k of Object.keys(out)) if (k.startsWith("i5_admt_")) delete out[k];
  return out;
}

describe("RA 05 — the ADMT coach card follows the ADMT answer", () => {
  it("ADMT in use = No, nothing typed in the ADMT boxes → no ADMT card of any kind", () => {
    const r = buildCoach("cppa_risk", COACH_CONTRACTS.cppa_risk, withoutAdmt(base));
    const admtCards = r.cards.filter((c) => c.key === "i5_admt_logic");
    expect(admtCards, JSON.stringify(admtCards.map((c) => [c.reason, c.details]))).toEqual([]);
    // Nor is it counted as "already strong" — it was never in play.
    expect(r.alreadyStrong).not.toContain("How the automated decision-making works");
  });

  it("ADMT in use = Yes with a thin logic answer still raises the card (detector stays alive)", () => {
    const intake = {
      ...withoutAdmt(base),
      q18_admt_use: "Yes",
      i5_admt_logic: "It ranks people.",
    };
    const r = buildCoach("cppa_risk", COACH_CONTRACTS.cppa_risk, intake);
    const card = r.cards.find((c) => c.key === "i5_admt_logic");
    // With ADMT engaged the block is coached exactly as before: the empty
    // optional fairness-testing box makes it an "unanswered" block card naming
    // that box (pre-existing r2 behaviour); the thin logic text alone would
    // make it "thin". Either way the detector is alive.
    expect(card).toBeDefined();
    expect(["unanswered", "thin"]).toContain(card!.reason);
  });

  it("ADMT in use = No but the customer wrote about the system anyway → coached on what was written", () => {
    const intake = { ...withoutAdmt(base), i5_admt_logic: "Legacy scoring model, retired." };
    const r = buildCoach("cppa_risk", COACH_CONTRACTS.cppa_risk, intake);
    // Short → thin card; the point is that a typed answer is not silently dropped.
    expect(r.cards.some((c) => c.key === "i5_admt_logic")).toBe(true);
  });
});
