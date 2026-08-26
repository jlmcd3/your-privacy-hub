// LIA L0.5 — Local pipeline harness: the pure, zero-model-call, zero-DB
// deliverable builders over both LIA_PERFECT_PINNED fixtures.
//
// Companion to l0.5-perfect-closed-loop.test.ts (which checks only the
// acceptance-predicate gate via checkPerfectLiaIntake). This file asserts
// STRUCTURAL INVARIANTS directly on buildLiaDeliverables / buildLiaUpgrade4
// / buildPrecedentClassPosture output — the ANALYSIS SHAPE law and the
// DEGRADATION law (types.ts header) — independent of the gate predicate.
//
// SCOPE NOTE (doc 74, 2026-08-26 handoff): a full-pipeline harness through
// assembleLiaSkeletonDocument (the CPPA-Risk rk0.5-harness.test.ts pattern)
// is NOT possible yet — that assembler's readTypedVerdicts(report) argument
// requires a `report.three_part_test` bag that is still model-authored
// (LIA is pre-conversion; the render-readiness note in lia-corpus-map.ts
// applies here too). This harness covers everything that IS pure today:
// the three ITEM-311/UPGRADE-4/precedent-class builder modules, which take
// intake alone and never touch a model or the DB. The skeleton-assembly
// harness is an L1 task, once L1 supplies a deterministic report bag.
//
// One top-level Deno.test per fixture. Subtests (t.step) separate the
// assertion categories so failures are locatable without re-running.

import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { buildLiaDeliverables } from "../../../supabase/functions/run-li-assessment/_local/ltp/lia-deliverables/build.ts";
import { buildLiaUpgrade4 } from "../../../supabase/functions/run-li-assessment/_local/ltp/lia-deliverables/build-upgrade4.ts";
import { buildPrecedentClassPosture } from "../../../supabase/functions/run-li-assessment/_local/ltp/lia-deliverables/precedent-class.ts";
import { LIA_PERFECT_PINNED } from "../../../supabase/functions/_shared/golden/lia-perfect-pinned.ts";
import type { AnalysisShape, DeliverableStatus } from "../../../supabase/functions/run-li-assessment/_local/ltp/lia-deliverables/types.ts";

const VALID_STATUS: readonly DeliverableStatus[] = ["analysed", "record_insufficient"];

/** DEGRADATION LAW (types.ts header): a finding is either fully analysed
 * (non-empty AnalysisShape fields) or honestly degraded (record_insufficient
 * WITH information_needed) — never a silent gap and never invention. */
function assertDegradationLaw(
  label: string,
  finding: AnalysisShape & { status: DeliverableStatus; information_needed?: string },
) {
  assert(
    VALID_STATUS.includes(finding.status),
    `${label}: status "${finding.status}" is not a recognised DeliverableStatus`,
  );
  if (finding.status === "record_insufficient") {
    assert(
      typeof finding.information_needed === "string" && finding.information_needed.trim().length > 0,
      `${label}: record_insufficient without a non-empty information_needed`,
    );
  } else {
    assert(finding.standard.trim().length > 0, `${label}: analysed finding has empty standard`);
    assert(finding.standard_citation.trim().length > 0, `${label}: analysed finding has empty standard_citation`);
    assert(finding.record_fact.trim().length > 0, `${label}: analysed finding has empty record_fact`);
    assert(finding.application.trim().length > 0, `${label}: analysed finding has empty application`);
  }
}

Deno.test("L0.5 harness — LIA_PERFECT_PINNED has at least 2 fixtures", () => {
  assert(LIA_PERFECT_PINNED.length >= 2, `Expected at least 2 perfect fixtures; got ${LIA_PERFECT_PINNED.length}`);
});

for (const c of LIA_PERFECT_PINNED) {
  Deno.test(`L0.5 harness — ${c.id}`, async (t) => {
    // Every builder below is a pure function of intake: zero model calls,
    // zero DB access, no throw on a perfect (complete) record.
    let deliverables: ReturnType<typeof buildLiaDeliverables>;
    let upgrade4: ReturnType<typeof buildLiaUpgrade4>;
    let precedentClass: ReturnType<typeof buildPrecedentClassPosture>;

    await t.step("buildLiaDeliverables does not throw", () => {
      deliverables = buildLiaDeliverables(c.intake);
    });
    await t.step("buildLiaUpgrade4 does not throw", () => {
      upgrade4 = buildLiaUpgrade4(c.intake);
    });
    await t.step("buildPrecedentClassPosture does not throw", () => {
      precedentClass = buildPrecedentClassPosture(c.intake);
    });

    // ── ITEM 311 deliverables: degradation law + verdict presence ──────────
    await t.step("reasonable_expectations obeys the degradation law", () => {
      assertDegradationLaw(`${c.id} reasonable_expectations`, deliverables.reasonable_expectations);
      assert(deliverables.reasonable_expectations.verdict, `${c.id}: reasonable_expectations.verdict missing`);
    });
    await t.step("child_factor obeys the degradation law", () => {
      assertDegradationLaw(`${c.id} child_factor`, deliverables.child_factor);
      assert(deliverables.child_factor.determination, `${c.id}: child_factor.determination missing`);
    });
    await t.step("public_authority_exclusion obeys the degradation law", () => {
      assertDegradationLaw(`${c.id} public_authority_exclusion`, deliverables.public_authority_exclusion);
      assert(
        deliverables.public_authority_exclusion.determination,
        `${c.id}: public_authority_exclusion.determination missing`,
      );
    });
    await t.step("lia_determination obeys its own degradation law", () => {
      // LiaDetermination does NOT extend AnalysisShape (it carries why/
      // citation/authority_verbatim instead of standard/record_fact/
      // application) — checked against its own fields, not the shared helper.
      const d = deliverables.lia_determination;
      assert(VALID_STATUS.includes(d.status), `${c.id}: lia_determination.status "${d.status}" not recognised`);
      if (d.status === "record_insufficient") {
        assert(
          typeof d.information_needed === "string" && d.information_needed.trim().length > 0,
          `${c.id}: lia_determination record_insufficient without information_needed`,
        );
      } else {
        assert(d.why.trim().length > 0, `${c.id}: lia_determination.why empty on an analysed record`);
        assert(d.citation.trim().length > 0, `${c.id}: lia_determination.citation empty on an analysed record`);
      }
      assert(d.outcome, `${c.id}: lia_determination.outcome missing`);
      assert(Array.isArray(d.driving_factors), `${c.id}: lia_determination.driving_factors is not an array`);
      assert(Array.isArray(d.mitigations), `${c.id}: lia_determination.mitigations is not an array`);
    });
    await t.step("automated_decision_analysis obeys the degradation law (EU degradation expected, per D1)", () => {
      // D1 (l0.5-perfect-closed-loop.test.ts) already pins that this
      // finding's mandatory EU degradation must NOT gate the checker;
      // here we only assert the shape itself is well-formed.
      assertDegradationLaw(`${c.id} automated_decision_analysis`, deliverables.automated_decision_analysis);
      assert(deliverables.automated_decision_analysis.regime, `${c.id}: automated_decision_analysis.regime missing`);
      assert(
        deliverables.automated_decision_analysis.regime_label.trim().length > 0,
        `${c.id}: automated_decision_analysis.regime_label empty`,
      );
    });

    // ── UPGRADE-4 (ICO three-part-arc) deliverables: same laws ─────────────
    await t.step("interest_legitimacy obeys the degradation law", () => {
      assertDegradationLaw(`${c.id} interest_legitimacy`, upgrade4.interest_legitimacy);
      assert(
        upgrade4.interest_legitimacy.sub_tests.length === 3,
        `${c.id}: interest_legitimacy must carry all 3 EDPB cumulative sub-tests; got ${upgrade4.interest_legitimacy.sub_tests.length}`,
      );
    });
    await t.step("benefit_and_beneficiary obeys the degradation law", () => {
      assertDegradationLaw(`${c.id} benefit_and_beneficiary`, upgrade4.benefit_and_beneficiary);
    });
    await t.step("alternatives_considered obeys the degradation law", () => {
      assertDegradationLaw(`${c.id} alternatives_considered`, upgrade4.alternatives_considered);
    });
    await t.step("relationship_with_individual obeys the degradation law", () => {
      assertDegradationLaw(`${c.id} relationship_with_individual`, upgrade4.relationship_with_individual);
    });
    await t.step("scale_frequency_duration obeys the degradation law", () => {
      assertDegradationLaw(`${c.id} scale_frequency_duration`, upgrade4.scale_frequency_duration);
      assertEquals(
        upgrade4.scale_frequency_duration.dimensions.length,
        3,
        `${c.id}: scale_frequency_duration must carry all 3 dimensions (scale/frequency/duration)`,
      );
    });
    await t.step("potential_harms obeys the degradation law", () => {
      assertDegradationLaw(`${c.id} potential_harms`, upgrade4.potential_harms);
    });
    await t.step("opt_out_feasibility obeys the degradation law", () => {
      assertDegradationLaw(`${c.id} opt_out_feasibility`, upgrade4.opt_out_feasibility);
    });
    await t.step("attestation_block is present and well-formed", () => {
      const ab = upgrade4.attestation_block;
      assert(
        VALID_STATUS.includes(ab.status),
        `${c.id}: attestation_block.status "${ab.status}" is not a recognised DeliverableStatus`,
      );
      if (ab.status === "record_insufficient") {
        assert(
          typeof ab.information_needed === "string" && ab.information_needed.trim().length > 0,
          `${c.id}: attestation_block record_insufficient without information_needed`,
        );
      } else {
        assert(ab.text.trim().length > 0, `${c.id}: attestation_block.text empty on an analysed record`);
      }
    });

    // ── Precedent-class posture (doc 73 §4 R2) ─────────────────────────────
    await t.step("precedent-class posture is a recognised value, and authorities back any assessed posture", () => {
      const validPostures = ["rejected", "conditional", "accepted", "contested", "not_assessed"];
      assert(
        validPostures.includes(precedentClass.posture),
        `${c.id}: precedent_class_posture "${precedentClass.posture}" is not recognised`,
      );
      if (precedentClass.posture !== "not_assessed") {
        assert(
          precedentClass.authorities.length > 0,
          `${c.id}: posture "${precedentClass.posture}" asserted with zero backing authorities`,
        );
      }
    });
  });
}
