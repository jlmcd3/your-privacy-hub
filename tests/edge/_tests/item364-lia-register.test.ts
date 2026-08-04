// ITEM 364 (WAVE 1, DISPATCH 2) — LIA REGISTER PROPAGATION TESTS.
//
// Covers: the LIA plan (ICO three-part arc + register fields), the LIA gap-atom
// frame set (arc-stage variation, all eight structural-program additions), the
// LIA prompt module's register block, the 22 curated LIA labels, and the
// plan-metadata lint hole closed alongside this dispatch.

import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { lintRegisterDocument, registerClean } from "../../../supabase/functions/_shared/prose/register-lint.ts";
import { lintPlan, planRenderable } from "../../../supabase/functions/_shared/prose/plan.ts";
import { lintFrameSet, frameSetRenderable } from "../../../supabase/functions/_shared/prose/frames.ts";
import { LIA_PLAN, LIA_FRAMES } from "../../../library/prose/load.ts";
import { LIA_ANALYSIS_TOOL_MODULE } from "../../../supabase/functions/run-li-assessment/index.ts";
import { FIELD_LABELS } from "../../../supabase/functions/_shared/customer-messages.ts";

Deno.test("LIA plan: lint-clean, register fields present, not yet approved", () => {
  assertEquals(lintPlan(LIA_PLAN), []);
  assertEquals(LIA_PLAN.approved, false);
  assertEquals(planRenderable(LIA_PLAN), false, "plan must stay unrenderable until CEO sign-off");
  assert(LIA_PLAN.thesis && LIA_PLAN.thesis.length > 40);
  assertEquals((LIA_PLAN.exemplar_pairs ?? []).length, 2);
});

Deno.test("LIA plan: the ICO three-part arc is the spine, and the balance follows the sub-tests", () => {
  const ids = LIA_PLAN.sections.map((s) => s.id);
  for (
    const id of [
      "interest_legitimacy",
      "benefit_and_beneficiary",
      "alternatives_considered",
      "relationship_with_individual",
      "scale_frequency_duration",
      "potential_harms",
      "opt_out_feasibility",
      "attestation_block",
    ]
  ) {
    assert(ids.includes(id), `plan has no section for ${id}`);
  }
  // purpose → necessity → balancing, and the weighing lands after the inputs.
  assert(ids.indexOf("interest_legitimacy") < ids.indexOf("alternatives_considered"));
  assert(ids.indexOf("alternatives_considered") < ids.indexOf("relationship_with_individual"));
  assert(ids.indexOf("potential_harms") < ids.indexOf("balancing"));
  assertEquals(ids[ids.length - 1], "attestation_block");
});

Deno.test("LIA plan: thesis and every AFTER exemplar pass the register lint", () => {
  const findings = lintRegisterDocument([
    { section_id: "thesis", text: LIA_PLAN.thesis ?? "" },
    ...(LIA_PLAN.exemplar_pairs ?? []).map((p) => ({ section_id: p.id, text: p.after })),
  ]);
  assertEquals(findings, [], JSON.stringify(findings));
  assert(registerClean(findings));
});

Deno.test("LIA frames: gap atoms cover all eight structural-program additions", () => {
  assertEquals(lintFrameSet(LIA_FRAMES), []);
  assertEquals(LIA_FRAMES.approved, false);
  assertEquals(frameSetRenderable(LIA_FRAMES), false);
  assert(LIA_FRAMES.frames.every((f) => f.status === "pending_review"));
  for (
    const section of [
      "interest_legitimacy",
      "benefit_and_beneficiary",
      "alternatives_considered",
      "relationship_with_individual",
      "scale_frequency_duration",
      "potential_harms",
      "opt_out_feasibility",
      "attestation_block",
    ]
  ) {
    assert(LIA_FRAMES.frames.some((f) => f.section.startsWith(section)), `no gap atom for ${section}`);
  }
});

Deno.test("LIA frames: absence reads differently at each arc stage (the cap seam)", () => {
  const body = (id: string) => LIA_FRAMES.frames.find((f) => f.id === id)!.body;
  const purpose = body("lia-gap-interest-legitimacy");
  const necessity = body("lia-gap-alternatives-considered");
  const balancing = body("lia-gap-potential-harms");
  const attest = body("lia-gap-attestation-block");
  const bodies = [purpose, necessity, balancing, attest];
  // No two stages open the same way — plan-authored variation is what keeps the
  // boilerplate cap from having to rewrite anything downstream.
  const openers = bodies.map((b) => b.split(/\s+/).slice(0, 5).join(" ").toLowerCase());
  assertEquals(new Set(openers).size, openers.length, openers.join(" | "));
  assert(/weigh/i.test(purpose) || /scale/i.test(purpose) || /interest/i.test(purpose));
  assert(/compar/i.test(necessity), "necessity-stage absence must read as a missing comparison");
  assert(/scale|side/i.test(balancing), "balancing-stage absence must read as an empty side of the scale");
  assert(/draft|adopt/i.test(attest), "attestation absence must read as an unadopted document");
});

Deno.test("LIA frames: every atom is register-clean", () => {
  const findings = lintRegisterDocument(
    LIA_FRAMES.frames.map((f) => ({ section_id: f.id, text: f.body })),
  );
  assertEquals(findings, [], JSON.stringify(findings));
});

Deno.test("LIA prompt carries the register block", () => {
  const rulesText = LIA_ANALYSIS_TOOL_MODULE.extraRules ?? "";
  for (
    const marker of [
      "REGISTER — SENTENCE ORDER",
      "REGISTER — DICTION",
      "REGISTER — CADENCE",
      "REGISTER — NO REPEATED SCAFFOLD",
      "REGISTER — DEGRADED RECORD",
      "REGISTER — THE ARC AND THE BALANCE",
    ]
  ) {
    assert(rulesText.includes(marker), `missing ${marker}`);
  }
});

Deno.test("LIA structural-program intake fields carry curated labels", () => {
  const keys = [
    "purpose_details.controller_is_public_authority",
    "purpose_details.public_task_processing",
    "purpose_details.specific_benefit",
    "purpose_details.beneficiary",
    "necessity_details.alternatives_rationale",
    "balancing_details.collection_context",
    "balancing_details.children_data_subjects",
    "balancing_details.additional_mitigations",
    "balancing_details.relationship_category",
    "balancing_details.scale_approx",
    "balancing_details.frequency",
    "balancing_details.duration",
    "balancing_details.potential_harms",
    "balancing_details.opt_out_available",
    "attestation",
    "attestation.dpo_reviewed",
    "attestation.dpo_reviewer",
    "attestation.dpo_review_date",
    "attestation.approver_name",
    "attestation.approver_position",
    "attestation.approval_date",
    "attestation.review_triggers",
  ];
  assertEquals(keys.length, 22);
  for (const key of keys) assert(key in FIELD_LABELS, `missing label for ${key}`);
  // Labels are customer-facing prose, never a de-underscored key.
  for (const key of keys) assert(!FIELD_LABELS[key].includes("_"), `raw key leaked in label for ${key}`);
});
