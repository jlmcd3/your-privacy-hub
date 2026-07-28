/**
 * ITEM 240 CP5 COHERENCE-PROSE — three-way joint test.
 *
 * (a) OPENING: customer-first slot order lives at the source of truth.
 *     Assert RISK_OPENING_SLOT_ORDER = [S2,S3,S4,S0,S1,S5,S6] AND that
 *     for a fixture with S0+S2+S6 populated, the rendered text begins
 *     with the S2 clause (customer facts), not the S0 (statute) clause.
 *
 * (b) EXEC/BALANCE COHERENCE, ENFORCED AT ASSEMBLER EXIT: injecting a
 *     mismatched pair (insufficient exec over firm balance) into a
 *     synthetic report yields exec_balance_mode_mismatch violations
 *     from assertShippedCoherence. detectShippedMode fingerprints each
 *     of the four canonical mode phrases correctly.
 *
 * (c) INTRA-DOCUMENT TRIGGER CONSISTENCY: for a fixture that engages
 *     § 7150(b)(1) via q5_sell_share="Yes — sell only", the opening's
 *     provenance.s1_triggers must include 1 AND the assembler's
 *     scope_and_triggers must emit exactly one "engaged" instance
 *     bound to the same prong. Ends the run-#176 opening ↔ scope
 *     disagreement class.
 */
import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  buildRiskOpening,
  RISK_OPENING_SLOT_ORDER,
} from "../openings/risk-opening.ts";
import {
  assertShippedCoherence,
  detectShippedMode,
} from "../report-contracts/cppa-risk-shape.ts";
import { derivePlan } from "../ltp/derive.ts";
import { composeSection } from "../ltp/section-composers/cppa-risk.ts";

Deno.test("CP5-CP: (a) RISK_OPENING_SLOT_ORDER is S2→S3→S4→S0→S1→S5→S6", () => {
  assertEquals(
    RISK_OPENING_SLOT_ORDER as readonly string[],
    ["S2", "S3", "S4", "S0", "S1", "S5", "S6"],
  );
});

Deno.test("CP5-CP: (a) opening text leads with customer facts (S2), not the statute (S0)", () => {
  const out = buildRiskOpening({
    entity_name: "Acme, Inc.",
    q1_revenue: "Over $100M",
    q4_pi_categories: ["identifiers", "geolocation"],
    i1_processing_purpose: "onboarding and fraud prevention",
    q5_sell_share: "Yes — sell only",
    bought_sold_shared_count: "1,000,000 or more",
    q18_admt_use: "No",
  } as unknown as Parameters<typeof buildRiskOpening>[0], { asOfDate: "2026-07-28" });
  const s2Head = "This assessment covers Acme";
  const s0Head = "The record indicates";
  const iS2 = out.text.indexOf(s2Head);
  const iS0 = out.text.indexOf(s0Head);
  assert(iS2 >= 0, `S2 clause missing: ${out.text.slice(0, 200)}`);
  assert(iS0 > iS2, `S0 must follow S2 in customer-first order (S2@${iS2}, S0@${iS0})`);
});

Deno.test("CP5-CP: (b) detectShippedMode fingerprints the four canonical phrases", () => {
  assertEquals(
    detectShippedMode(
      "On the present record, the information provided is not sufficient to complete the required benefit-and-impact analysis.",
    ),
    "insufficient",
  );
  assertEquals(
    detectShippedMode(
      "For each activity, the benefits identified outweigh the negative impacts, subject to the safeguards described.",
    ),
    "firm",
  );
  assertEquals(
    detectShippedMode(
      "For these activities, the balance between benefits and identified negative impacts is close on the present record, and reasonable assessments could differ.",
    ),
    "hedged",
  );
  assertEquals(
    detectShippedMode(
      "For these activities, the record does not support the conclusion that the benefits outweigh the identified negative impacts.",
    ),
    "negative",
  );
});

Deno.test("CP5-CP: (b) assertShippedCoherence catches insufficient exec over firm balance", () => {
  const bad = {
    executive_summary:
      "On the present record, the information provided is not sufficient to complete the required benefit-and-impact analysis.",
    assessment_summary: {
      narrative:
        "For this activity, the benefits identified outweigh the negative impacts, subject to the safeguards described.",
    },
  };
  const v = assertShippedCoherence(bad);
  assertEquals(v.length, 1);
  assertEquals(v[0].kind, "exec_balance_mode_mismatch");
  assertEquals(v[0].executive_summary_mode, "insufficient");
  assertEquals(v[0].assessment_summary_mode, "firm");
});

Deno.test("CP5-CP: (b) assertShippedCoherence passes on agreeing modes", () => {
  const good = {
    executive_summary:
      "On the present record, the information provided is not sufficient to complete the required benefit-and-impact analysis.",
    assessment_summary: {
      narrative: "The specific items needed to complete this assessment are set out under Items for your review.",
    },
  };
  assertEquals(assertShippedCoherence(good).length, 0);
});

Deno.test("CP5-CP: (c) intra-document trigger consistency — opening s1_triggers ↔ scope engaged flags agree", () => {
  const intake = {
    entity_name: "Acme, Inc.",
    q1_revenue: "Over $100M",
    q2_consumers: "1,000,000 or more",
    q4_pi_categories: ["identifiers"],
    i1_processing_purpose: "onboarding",
    q5_sell_share: "Yes — sell only",
    sell_share: true,
    bought_sold_shared_count: "1,000,000 or more",
    q18_admt_use: "no",
  };
  const opening = buildRiskOpening(
    intake as unknown as Parameters<typeof buildRiskOpening>[0],
    { asOfDate: "2026-07-28" },
  );
  // Opening resolves § 7150(b)(1) via affirmative sell/share.
  assert(opening.provenance.s1_triggers.includes(1),
    `opening must mark § 7150(b)(1) engaged: ${JSON.stringify(opening.provenance.s1_triggers)}`);

  const plan = derivePlan({
    intake,
    report_data: {},
    buildStamp: "cp5-cp@test",
  });
  const scope = composeSection("scope_and_triggers", plan) ?? [];
  // Every prong the opening flagged as engaged must render engaged in scope.
  const engagedInScope = new Set<string>();
  for (const inst of scope) {
    const pinpoint = (inst.ctx as { __cite?: Record<string, string> }).__cite?.PINPOINT ?? "";
    if (inst.template_id === "T.risk.applicability.engaged") {
      // Extract the digit inside § 7150(b)(N).
      const m = pinpoint.match(/§\s*7150\(b\)\((\d+)\)/);
      if (m) engagedInScope.add(m[1]);
    }
  }
  for (const n of opening.provenance.s1_triggers) {
    assert(
      engagedInScope.has(String(n)),
      `INTRA-DOCUMENT DISAGREEMENT: opening flags § 7150(b)(${n}) engaged; scope does not. engaged=${[...engagedInScope].join(",")}`,
    );
  }
});
