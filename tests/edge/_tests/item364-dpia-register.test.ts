// ITEM 364 (WAVE 1, DISPATCH 1) — DPIA REGISTER PROPAGATION TESTS.
//
// Covers: the register lint battery, the DPIA plan (arc + register fields),
// the DPIA gap-atom frame set, and the DPIA prompt module's register block.

import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  lintRegisterText,
  lintRegisterDocument,
  registerClean,
} from "../../../supabase/functions/_shared/prose/register-lint.ts";
import { lintPlan, planRenderable } from "../../../supabase/functions/_shared/prose/plan.ts";
import { lintFrameSet, frameSetRenderable } from "../../../supabase/functions/_shared/prose/frames.ts";
import { DPIA_PLAN, DPIA_FRAMES } from "../../../library/prose/load.ts";
import { DPIA_TOOL_MODULE } from "../../../supabase/functions/run-dpia-framework/index.ts";
import { FIELD_LABELS } from "../../../supabase/functions/_shared/customer-messages.ts";

const rules = (fs: { rule: string }[]) => fs.map((f) => f.rule);

Deno.test("register lint: banned diction is caught", () => {
  const f = lintRegisterText("s", "The organisation will leverage robust controls in order to reduce exposure.");
  assert(rules(f).filter((r) => r === "banned_word").length >= 3);
});

Deno.test("register lint: repeated scaffold hedge is caught once per phrase", () => {
  const t =
    "The organisation should confirm whether the described position applies here. Retention is 24 months. " +
    "The organisation should confirm whether the described position applies here.";
  const f = lintRegisterText("s", t);
  assertEquals(rules(f).filter((r) => r === "machine_scaffold").length, 1);
});

Deno.test("register lint: orphan bracket (merge artifact) is caught", () => {
  const f = lintRegisterText("s", "No processors are identified on the record. ]");
  assert(rules(f).includes("orphan_bracket"));
});

Deno.test("register lint: monotone cadence is caught and varied cadence passes", () => {
  const monotone = Array.from(
    { length: 4 },
    (_, i) =>
      `The organisation records the ${i} processing activity and keeps that record under a periodic internal review cycle.`,
  ).join(" ");
  assert(rules(lintRegisterText("s", monotone)).includes("cadence_monotony"));

  const varied =
    "The record names no processor. If hosting or analytics work is done by someone outside the organisation, " +
    "that arrangement belongs in the record. The assessment cannot close until it is there.";
  assertEquals(lintRegisterText("s", varied), []);
});

Deno.test("register lint: banned phrases are caught (A6 hole closed)", () => {
  const f = lintRegisterText("s", "On the record this organisation gave, retention runs to 24 months.");
  assert(rules(f).includes("banned_phrase"));
  assertEquals(lintRegisterText("s", "The record this organisation supplied puts retention at 24 months."), []);
});

Deno.test("register lint: stacked asides are caught", () => {
  const f = lintRegisterText(
    "s",
    "The processing, which covers portal events, and which runs daily, at scale, across every cohort, is retained.",
  );
  assert(rules(f).includes("appositive_stack"));
});

// ITEM 372 (METHOD 3c) — the CEO approved this plan's direction explicitly in
// the DPIA quality-pilot dispatch and directed re-seeding as version 2,
// approved. The pin therefore asserts the APPROVED, RENDERABLE state.
Deno.test("DPIA plan: lint-clean, register fields present, approved at v2", () => {
  assertEquals(lintPlan(DPIA_PLAN), []);
  assertEquals(DPIA_PLAN.version, "prose-plans-2026-08-04-item372");
  assertEquals(DPIA_PLAN.approved, true);
  assertEquals(planRenderable(DPIA_PLAN), true, "v2 renders on the CEO sign-off in the item 372 dispatch");
  assert(DPIA_PLAN.thesis && DPIA_PLAN.thesis.length > 40);
  assert((DPIA_PLAN.exemplar_pairs ?? []).length >= 3);
});

Deno.test("DPIA plan: every AFTER exemplar passes the register lint", () => {
  const findings = lintRegisterDocument(
    (DPIA_PLAN.exemplar_pairs ?? []).map((p) => ({ section_id: p.id, text: p.after })),
  );
  assertEquals(findings, [], JSON.stringify(findings));
  assert(registerClean(findings));
});

Deno.test("DPIA frames: gap atoms are lint-clean, register-clean, and pending review", () => {
  assertEquals(lintFrameSet(DPIA_FRAMES), []);
  assertEquals(DPIA_FRAMES.approved, false);
  assertEquals(frameSetRenderable(DPIA_FRAMES), false);
  assert(DPIA_FRAMES.frames.every((f) => f.status === "pending_review"));
  // Every accountability deliverable added by the structural program has a
  // degraded-record atom (closes DPIA's F13 exposure).
  for (const section of ["assessment_team", "validation_approval", "prepared_by", "signoff_basis"]) {
    assert(DPIA_FRAMES.frames.some((f) => f.section === section), `no gap atom for ${section}`);
  }
});

Deno.test("DPIA prompt carries the register block", () => {
  const rulesText = DPIA_TOOL_MODULE.extraRules ?? "";
  for (
    const marker of [
      "REGISTER — SENTENCE ORDER",
      "REGISTER — DICTION",
      "REGISTER — CADENCE",
      "REGISTER — NO REPEATED SCAFFOLD",
      "REGISTER — DEGRADED RECORD",
      "REGISTER — ACCOUNTABILITY FIELDS",
    ]
  ) {
    assert(rulesText.includes(marker), `missing ${marker}`);
  }
});

Deno.test("DPIA accountability intake fields carry curated labels", () => {
  for (
    const key of [
      "dpia_prepared_by",
      "dpia_approved_by_name",
      "dpia_approved_by_title",
      "dpia_approval_date",
      "dpia_signoff_basis",
    ]
  ) {
    assert(key in FIELD_LABELS, `missing label for ${key}`);
  }
});
