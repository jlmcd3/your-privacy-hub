/**
 * ITEM 240 CP4 — joint test for the label + citation binding fixes.
 *
 * Asserts:
 *   1. Every conclusion registry row carries a non-empty display_label.
 *   2. Scope-composer emits one instance PER § 7150(b) prong with the
 *      correct pinpoint (no more 5× § 7150(b)(1)).
 *   3. Balance / record-sufficiency / information-needed composers emit
 *      per-instance __cite pinpoints from their own anchors.
 *   4. Exec-summary variant selection agrees with balance mode.
 *   5. value-screen REGISTRY_ID_PATTERNS class rejects raw registry-id
 *      shapes and passes clean display_label prose.
 */
import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { CPPA_RISK_CONCLUSIONS } from "../../../../supabase/functions/_shared/legal-test/cppa-risk-conclusions.ts";
import { composeSection } from "../../../../supabase/functions/_shared/ltp/section-composers/cppa-risk.ts";
import { runValueScreen, ValueScreenError } from "../../../../supabase/functions/_shared/ltp/value-screen.ts";
import type { RenderPlan } from "../../../../supabase/functions/_shared/render-plan/schema.ts";

Deno.test("CP4 (a) — every conclusion has a display_label", () => {
  for (const c of CPPA_RISK_CONCLUSIONS) {
    assert(
      typeof c.display_label === "string" && c.display_label.trim().length > 0,
      `missing display_label on ${c.id}`,
    );
    // Registry-id shape must not itself be the label.
    assert(!/^[jrw]\./i.test(c.display_label), `label looks like id on ${c.id}: ${c.display_label}`);
  }
});

const bindings = CPPA_RISK_CONCLUSIONS.map((c) => ({
  pinpoint_ref: `cb.${c.id}`,
  corpus_key: c.anchor.corpus_key,
  pinpoint: c.anchor.pinpoint,
  jurisdiction_tag: c.jurisdiction_tag,
  authority_weight: "binding" as const,
}));

const propositions = CPPA_RISK_CONCLUSIONS.map((c) => ({
  id: `p.${c.id}`,
  conclusion_id: c.id,
  epistemic_type: c.epistemic_type,
  jurisdiction_tag: c.jurisdiction_tag,
  anchor: c.anchor,
  display_label: c.display_label,
  intake_ledger_refs: [],
  citation_binding_refs: [`cb.${c.id}`],
  ...(c.epistemic_type === "R" ? { polarity: "not_applicable" as const } : {}),
} as const));

const basePlan: RenderPlan = {
  plan_version: "v1",
  product: "cppa-risk-assessment",
  build_stamp: "test",
  jurisdiction_tag: "cppa-ca",
  intake_ledger: [],
  citation_bindings: bindings,
  propositions: propositions as any,
  factor_table: [],
  weighing_frame: [],
  gate_outcomes: [
    { gate_id: "G.applicability.selling_sharing", outcome: "not_applicable" },
    { gate_id: "G.applicability.sensitive_pi", outcome: "not_applicable" },
    { gate_id: "G.applicability.admt_significant_decision", outcome: "not_applicable" },
    // ITEM 272 — six-prong realignment: (b)(4) is systematic observation,
    // (b)(5) sensitive location (new), (b)(6) training.
    { gate_id: "G.applicability.systematic_observation", outcome: "pass" },
    { gate_id: "G.applicability.sensitive_location", outcome: "not_applicable" },
    { gate_id: "G.applicability.train_admt", outcome: "not_applicable" },
  ],
  conservative_write_around: { triggered: false, disclosure: "silent+telemetry" },
};

Deno.test("CP4 (b) — scope composer emits one instance per prong with distinct pinpoints", () => {
  // ITEM 241.3 — composer now prepends a CP5 §3.2 section opener; strip
  // it for prong-shape assertions (opener is asserted separately in the
  // 241.3 wiring test).
  const all = composeSection("scope_and_triggers", basePlan)!;
  const instances = all.filter((i) => !i.template_id.startsWith("T.risk.section_opener."));
  assertEquals(instances.length, 6, "expected 6 § 7150(b) prong instances");
  const pinpoints = instances.map((i) => (i.ctx as any).__cite?.PINPOINT);
  const uniq = new Set(pinpoints);
  assertEquals(uniq.size, 6, `expected 6 distinct pinpoints, got ${JSON.stringify(pinpoints)}`);
  const engagedIds = instances.filter((i) => i.template_id === "T.risk.applicability.engaged");
  assertEquals(engagedIds.length, 1, "only (b)(4) should be engaged");
  assert(
    (engagedIds[0].ctx as any).__cite?.PINPOINT?.includes("(b)(4)"),
    "engaged instance must carry the (b)(4) pinpoint",
  );
});


Deno.test("CP4 (b) — record_sufficiency and information_needed cite own anchors", () => {
  const plan: RenderPlan = {
    ...basePlan,
    factor_table: [
      {
        factor_id: "benefit.business",
        kind: "benefit",
        jurisdiction_tag: "cppa-ca",
        present_in_intake: true,
        intake_ledger_refs: [],
        guidance_refs: [],
        anchor: { corpus_key: "cppa-7152", pinpoint: "11 CCR § 7152(a)(4)" },
        display_label: "Benefits to the business",
      },
    ],
  };
  const rs = composeSection("record_sufficiency", plan)!
    .filter((i) => i.template_id === "T.risk.record_sufficiency.item");
  assertEquals((rs[0].ctx as any).__cite.PINPOINT, "11 CCR § 7152(a)(4)");
  assertEquals((rs[0].ctx as any).element_label, "Benefits to the business");


  const inf = composeSection("information_needed", plan)!;
  // At least one Type-J item; each cites its OWN anchor pinpoint.
  const jPinpoints = inf.map((i) => (i.ctx as any).__cite.PINPOINT);
  assert(jPinpoints.includes("11 CCR § 7152(a)(7)"), "must cite j.initiation_decision anchor");
  assert(jPinpoints.includes("11 CCR § 7152(a)(1)"), "must cite j.purpose_specificity_adequacy anchor");
  assert(jPinpoints.includes("11 CCR § 7152(a)(6)"), "must cite j.safeguard_sufficiency anchor");
  // All labels are display_label prose, not registry ids.
  for (const i of inf) {
    const label = String((i.ctx as any).doc_element_label);
    assert(!/^j\./i.test(label), `label looks like id: ${label}`);
  }
});

Deno.test("CP4 (c) — exec and balance agree (insufficient record ⇒ insufficient exec)", () => {
  const inst = composeSection("executive_summary", basePlan)!;
  assertEquals(inst[0].template_id, "T.risk.exec.insufficient");
});

Deno.test("CP4 — value-screen registry-id class rejects raw ids and passes display_label prose", () => {
  // Raw registry-id shape MUST throw.
  let threw = false;
  try {
    runValueScreen({ reportData: { executive_summary: "For j.initiation_decision, review pending." } });
  } catch (e) {
    if (e instanceof ValueScreenError) {
      threw = true;
      assert(e.hits.some((h) => h.kind === "registry-id"), "expected registry-id hit");
    }
  }
  assert(threw, "value-screen must reject raw j.* shape");

  // Clean display_label prose MUST pass.
  runValueScreen({
    reportData: {
      executive_summary:
        "The decision whether to initiate the processing rests with the Company and its counsel.",
    },
  });
});
