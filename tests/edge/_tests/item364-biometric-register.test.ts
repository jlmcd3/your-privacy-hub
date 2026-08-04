// ITEM 364 (WAVE 1, DISPATCH 4) — BIOMETRIC REGISTER PROPAGATION TESTS.
//
// Covers the biometric plan (statute-as-template arc + register-clean thesis
// and exemplars), the biometric gap-atom frame set (including the attestation
// triggers), and the curated field labels authored for the intake.

import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { lintRegisterDocument, lintRegisterText, registerClean } from "../../../supabase/functions/_shared/prose/register-lint.ts";
import { lintPlan, planRenderable } from "../../../supabase/functions/_shared/prose/plan.ts";
import { lintFrameSet, frameSetRenderable } from "../../../supabase/functions/_shared/prose/frames.ts";
import { BIOMETRIC_PLAN, BIOMETRIC_FRAMES } from "../../../library/prose/load.ts";
import { FIELD_LABELS } from "../../../supabase/functions/_shared/customer-messages.ts";

Deno.test("biometric plan: lint-clean, register-clean thesis, not yet approved", () => {
  assertEquals(lintPlan(BIOMETRIC_PLAN), []);
  assertEquals(BIOMETRIC_PLAN.approved, false);
  assertEquals(planRenderable(BIOMETRIC_PLAN), false, "plan must stay unrenderable until CEO sign-off");
  assert(BIOMETRIC_PLAN.thesis && BIOMETRIC_PLAN.thesis.length > 40);
  assertEquals(lintRegisterText("thesis", BIOMETRIC_PLAN.thesis ?? ""), []);
  assert((BIOMETRIC_PLAN.exemplar_pairs ?? []).length >= 2);
});

Deno.test("biometric plan: every AFTER exemplar passes the register lint", () => {
  const findings = lintRegisterDocument(
    (BIOMETRIC_PLAN.exemplar_pairs ?? []).map((p) => ({ section_id: p.id, text: p.after })),
  );
  assertEquals(findings, [], JSON.stringify(findings));
  assert(registerClean(findings));
});

Deno.test("biometric plan: the exposure / must-change-now distinction is drawn", () => {
  const det = BIOMETRIC_PLAN.sections.find((s) => s.id === "consequence_determination");
  assert(det, "determination section missing");
  assert((det?.themes ?? []).includes("exposure_kept_separate"));
});

Deno.test("biometric frames: gap atoms are lint-clean, register-clean, pending review", () => {
  assertEquals(lintFrameSet(BIOMETRIC_FRAMES), []);
  assertEquals(BIOMETRIC_FRAMES.approved, false);
  assertEquals(frameSetRenderable(BIOMETRIC_FRAMES), false);
  assert(BIOMETRIC_FRAMES.frames.every((f) => f.status === "pending_review"));
  assertEquals(
    lintRegisterDocument(BIOMETRIC_FRAMES.frames.map((f) => ({ section_id: f.id, text: f.body }))),
    [],
  );
});

Deno.test("biometric frames: attestation carries both review triggers", () => {
  for (const id of ["biometric-attestation-amendment-trigger", "biometric-attestation-new-modality-trigger"]) {
    assert(BIOMETRIC_FRAMES.frames.some((f) => f.id === id), `missing frame ${id}`);
  }
});

Deno.test("biometric intake fields carry curated labels", () => {
  for (
    const key of [
      "biometricTypes",
      "notice_before_collection",
      "consent_artifact_type",
      "retention_schedule_text",
      "disclosure_bases",
      "tx_ai_training_use",
      "wa_enrolls_in_database",
      "wa_mhmda_health_inference",
      "wa_mhmda_geofence_health_facility",
    ]
  ) {
    assert(key in FIELD_LABELS, `missing label for ${key}`);
  }
});
