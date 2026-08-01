/**
 * ITEM 240 CP5 — SCOPE ENGAGED-FLAG + BALANCE COHERENCE + T7 SPACING.
 *
 * (a) Scope: engaged prongs render the ENGAGED template with a per-prong
 *     subject (registry display_label), not-engaged prongs render the
 *     NOT-ENGAGED template. Both carry their OWN pinpoint.
 * (b) Coherence: aggregateBalance("insufficient") NEVER produces firm/hedged
 *     balance prose. balanceInstance routes insufficient → T.risk.summary.docs.
 * (c) T7 opening: no unhyphenated "systematicobservation" residue.
 */
import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { composeSection } from "../../../../supabase/functions/_shared/ltp/section-composers/cppa-risk.ts";
import { derivePlan } from "../../../../supabase/functions/_shared/ltp/derive.ts";
import { PASS2_TEMPLATES } from "../../../../supabase/functions/_shared/ltp/content/pass2-templates.ts";
import { buildRiskOpening } from "../../../../supabase/functions/_shared/openings/risk-opening.ts";

function fixturePlan() {
  return derivePlan({
    intake: {
      q1_revenue: "Over $100M",
      q2_consumers: "1,000,000 or more",
      q18_admt_use: "no",
    },
    report_data: {},
    buildStamp: "cp5@test",
  });
}

Deno.test("CP5 (a) scope: each prong instance carries prong_subject + own PINPOINT and neither template references LEDGER_ID", () => {
  // Templates no longer name LEDGER_ID (the source of the CP5 blocker).
  const engaged = PASS2_TEMPLATES["T.risk.applicability.engaged"];
  const notEngaged = PASS2_TEMPLATES["T.risk.applicability.not_engaged"];
  assert(!engaged.intake_slots.includes("LEDGER_ID"));
  assert(!notEngaged.intake_slots.includes("LEDGER_ID"));
  assert(engaged.plan_slots.includes("prong_subject"));
  assert(notEngaged.plan_slots.includes("prong_subject"));

  const plan = fixturePlan();
  const scope = composeSection("scope_and_triggers", plan)!
    .filter((i) => !i.template_id.startsWith("T.risk.section_opener."));
  assertEquals(scope.length, 6, "must emit one instance per § 7150(b) prong"); // ITEM 272: six prongs

  const pinpoints = new Set<string>();
  for (const inst of scope) {
    const cite = (inst.ctx as { __cite?: Record<string, string> }).__cite ?? {};
    assert(typeof cite.PINPOINT === "string" && cite.PINPOINT.length > 0);
    pinpoints.add(cite.PINPOINT);
    const subj = (inst.ctx as { prong_subject?: string }).prong_subject ?? "";
    assert(subj.length > 0, "prong_subject must be populated from registry label");
  }
  assertEquals(pinpoints.size, 6, "every prong must render its OWN pinpoint"); // ITEM 272: six prongs
});

Deno.test("CP5 (b) coherence: balanceInstance on insufficient plan → T.risk.summary.docs (never firm/hedged)", () => {
  const plan = fixturePlan(); // shadow-derived fixture is insufficient
  const summary = composeSection("assessment_summary", plan)!;
  for (const inst of summary) {
    assert(
      inst.template_id !== "T.risk.balance.firm" && inst.template_id !== "T.risk.balance.hedged",
      `insufficient plan must not emit ${inst.template_id}`,
    );
  }
  const byActivity = composeSection("risk_assessment_by_activity", plan) ?? [];
  for (const inst of byActivity) {
    assert(
      inst.template_id !== "T.risk.balance.firm" && inst.template_id !== "T.risk.balance.hedged",
      `insufficient plan must not emit ${inst.template_id} in by-activity`,
    );
  }
});

Deno.test("CP5 (c) T7 opening: no unhyphenated 'systematicobservation' can appear from source", () => {
  const out = buildRiskOpening({
    entity_name: "Acme, Inc.",
    q3_pi_categories: "identifiers, geolocation",
    q4_purpose: "onboarding and fraud prevention",
    q5b_profiling_observation: "Yes",
    q18_admt_use: "No",
  } as unknown as Parameters<typeof buildRiskOpening>[0]);
  const text = out?.text ?? "";
  assert(!/systematicobservation/i.test(text), `must not contain 'systematicobservation': ${text}`);
  assert(/systematic observation/i.test(text), `must contain 'systematic observation': ${text}`);
});
