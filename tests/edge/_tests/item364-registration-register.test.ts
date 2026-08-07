// ITEM 364 (WAVE 1, DISPATCH 3) — REGISTRATION REGISTER PROPAGATION TESTS.
//
// Covers: the registration plan (statute-as-template spine + register fields),
// the registration gap-atom frame set (threshold limbs, representative and DPO
// branches, filing readiness, schedule surface, corpus-pending, attestation),
// the 39 curated registration labels, and — the point of the dispatch — that
// the deliverables this product actually renders are register-clean.

import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { lintRegisterDocument, registerClean, BANNED_PHRASES } from "../../../supabase/functions/_shared/prose/register-lint.ts";
import { lintPlan, planRenderable } from "../../../supabase/functions/_shared/prose/plan.ts";
import { lintFrameSet, frameSetRenderable } from "../../../supabase/functions/_shared/prose/frames.ts";
import { REGISTRATION_PLAN, REGISTRATION_FRAMES } from "../../../library/prose/load.ts";
import { FIELD_LABELS } from "../../../supabase/functions/_shared/customer-messages.ts";
import { registrationContract } from "../../../archive/unwired/_shared/intake-contracts/registration-assessment.ts";
import { buildRegistrationDeliverables } from "../../../supabase/functions/run-registration-assessment/_local/ltp/registration-deliverables/build.ts";
import { REGISTRATION_GOLDEN } from "../../../supabase/functions/_shared/golden/registration.ts";
import { MESSY_BY_TOOL } from "../../../supabase/functions/_shared/golden/messy-registry.ts";

/** Golden PERFECT + MESSY registration records, as the A9 audit runs them. */
const REGISTRATION_CASES: Array<{ id: string; intake: unknown }> = [
  ...REGISTRATION_GOLDEN.map((c) => ({ id: `perfect:${c.id}`, intake: c.intake })),
  ...((MESSY_BY_TOOL["registration"] ?? []) as Array<{ id: string; intake: unknown }>).map((c) => ({ id: `messy:${c.id}`, intake: c.intake })),
];

Deno.test("registration plan: lint-clean, register fields present, not yet approved", () => {
  assertEquals(lintPlan(REGISTRATION_PLAN), []);
  assertEquals(REGISTRATION_PLAN.approved, false);
  assertEquals(planRenderable(REGISTRATION_PLAN), false, "plan must stay unrenderable until CEO sign-off");
  assert(REGISTRATION_PLAN.thesis && REGISTRATION_PLAN.thesis.length > 40);
  assertEquals((REGISTRATION_PLAN.exemplar_pairs ?? []).length, 2);
});

Deno.test("registration plan: statute-as-template spine, ask before remedy, attestation last", () => {
  const ids = REGISTRATION_PLAN.sections.map((s) => s.id);
  for (
    const id of [
      "registration_determination",
      "overview",
      "threshold_analysis",
      "jurisdiction_determinations",
      "schedules",
      "filing_readiness",
      "representative_determinations",
      "dpo_determination",
      "corpus_pending",
      "information_needed",
      "filing_steps",
      "attestation_block",
    ]
  ) {
    assert(ids.includes(id), `plan has no section for ${id}`);
  }
  assertEquals(ids[0], "registration_determination");
  assert(ids.indexOf("threshold_analysis") < ids.indexOf("jurisdiction_determinations"));
  assert(ids.indexOf("dpo_determination") < ids.indexOf("schedules"), "analysis precedes duty");
  assert(ids.indexOf("corpus_pending") < ids.indexOf("filing_steps"));
  assertEquals(ids[ids.length - 1], "attestation_block");
});

Deno.test("registration plan: thesis and every AFTER exemplar pass the register lint", () => {
  const findings = lintRegisterDocument([
    { section_id: "thesis", text: REGISTRATION_PLAN.thesis ?? "" },
    ...(REGISTRATION_PLAN.exemplar_pairs ?? []).map((p) => ({ section_id: p.id, text: p.after })),
  ]);
  assertEquals(findings, [], JSON.stringify(findings));
  assert(registerClean(findings));
});

Deno.test("registration frames: gap atoms cover the structural-program additions", () => {
  assertEquals(lintFrameSet(REGISTRATION_FRAMES), []);
  assertEquals(REGISTRATION_FRAMES.approved, false);
  assertEquals(frameSetRenderable(REGISTRATION_FRAMES), false);
  assert(REGISTRATION_FRAMES.frames.every((f) => f.status === "pending_review"));
  const sections = new Set(REGISTRATION_FRAMES.frames.map((f) => f.section));
  for (
    const s of [
      "threshold_analysis",
      "overview",
      "representative_determinations",
      "dpo_determination",
      "filing_readiness",
      "schedules",
      "corpus_pending",
      "attestation_block",
    ]
  ) {
    assert(sections.has(s), `no gap atom for ${s}`);
  }
  // Every frame section is a real plan section.
  const planIds = new Set(REGISTRATION_PLAN.sections.map((s) => s.id));
  for (const f of REGISTRATION_FRAMES.frames) {
    assert(planIds.has(f.section), `frame ${f.id} targets unplanned section ${f.section}`);
  }
});

Deno.test("registration frames: bodies are register-clean and none states a deadline", () => {
  const findings = lintRegisterDocument(
    REGISTRATION_FRAMES.frames.map((f) => ({ section_id: f.id, text: f.body })),
  );
  assertEquals(findings, [], JSON.stringify(findings));
  for (const f of REGISTRATION_FRAMES.frames) {
    assert(!/\b\d{1,3}\s*(calendar\s*)?days?\b/i.test(f.body), `frame ${f.id} states a period`);
    assert(!/\b(20\d{2}-\d{2}-\d{2}|January|February|March|April|May|June|July|August|September|October|November|December)\b/.test(f.body), `frame ${f.id} states a date`);
  }
});

Deno.test("registration labels: every contract field has a curated label", () => {
  const missing = registrationContract.fields.map((f) => f.key).filter((k) => !(k in FIELD_LABELS));
  assertEquals(missing, [], `unlabelled registration fields: ${missing.join(", ")}`);
});

Deno.test("registration deliverables: golden renders are register-clean", () => {
  for (const c of REGISTRATION_CASES) {
    const d = buildRegistrationDeliverables(c.intake as never);
    const findings = lintRegisterDocument([
      { section_id: `${c.id}:overview`, text: d.narrative.overview },
      { section_id: `${c.id}:determination`, text: d.narrative.determination },
      { section_id: `${c.id}:attestation`, text: d.attestation.statement },
    ]);
    assertEquals(findings, [], `${c.id}: ${JSON.stringify(findings)}`);
  }
});

Deno.test("registration: the A6 banned phrases appear nowhere in a golden render", () => {
  for (const c of REGISTRATION_CASES) {
    const dump = JSON.stringify(buildRegistrationDeliverables(c.intake as never)).toLowerCase();
    for (const p of BANNED_PHRASES) {
      assert(!dump.includes(p), `${c.id} carries banned phrase "${p}"`);
    }
  }
});
