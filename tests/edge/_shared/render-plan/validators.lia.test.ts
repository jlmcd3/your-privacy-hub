// LIA validator fixtures + tests (Phase-1 authoring, GDPR domain).
// Verifies the shared render-plan validators enforce v2.3 discipline
// on gdpr-eu plans: no U.S./CA material admissible in any tier, EDPB
// binding-tier guidance passes, three-part-test factor completeness.
//
// Run: deno test supabase/functions/_shared/render-plan/validators.lia.test.ts

import {
  assert,
  assertEquals,
} from "https://deno.land/std@0.208.0/assert/mod.ts";
import type { RenderPlan } from "../../../../supabase/functions/_shared/render-plan/schema.ts";
import {
  validateAuthorityDomain,
  validateAuthorityWeight,
  validateGuidanceClosure,
  validatePassGCandidateClosure,
  validateRenderPlan,
  validateTypeRPolarity,
  validateTypeWFactorCompleteness,
} from "../../../../supabase/functions/_shared/render-plan/validators.ts";
import { LIA_WEIGHING_TESTS } from "../../../../supabase/functions/_shared/factors/lia-factors.ts";
import { LIA_CONCLUSIONS } from "../../../../supabase/functions/_shared/legal-test/lia-conclusions.ts";
import { LIA_PASSG_INDEX_BY_TEST } from "../../../../supabase/functions/_shared/pass-g/lia-candidate-index.ts";

function liaBasePlan(overrides: Partial<RenderPlan> = {}): RenderPlan {
  const plan: RenderPlan = {
    plan_version: "v1",
    // Product tag is a string in schema (union widens to include future
    // products in Phase-2). Cast to satisfy the current cppa-only literal.
    product: "cppa-risk-assessment" as RenderPlan["product"],
    build_stamp: "lia-p1-test",
    jurisdiction_tag: "gdpr-eu",
    intake_ledger: [
      {
        ledger_id: "L.purpose",
        intake_field: "purpose_description",
        value: "Fraud prevention for online payments",
        display: "Fraud prevention for online payments",
      },
    ],
    citation_bindings: [
      {
        pinpoint_ref: "C.art-6-1-f",
        corpus_key: "gdpr-art-6-1-f",
        pinpoint: "GDPR Art. 6(1)(f)",
        jurisdiction_tag: "gdpr-eu",
        authority_weight: "binding",
      },
      {
        pinpoint_ref: "C.recital-47",
        corpus_key: "gdpr-recital-47",
        pinpoint: "GDPR Recital 47",
        jurisdiction_tag: "gdpr-eu",
        authority_weight: "binding",
      },
    ],
    propositions: [
      {
        id: "P.rule.li_available",
        conclusion_id: "r.lawfulness.li_available",
        epistemic_type: "R",
        jurisdiction_tag: "gdpr-eu",
        polarity: "positive",
        anchor: { corpus_key: "gdpr-art-6-1-f", pinpoint: "GDPR Art. 6(1)(f)" },
        intake_ledger_refs: ["L.purpose"],
        citation_binding_refs: ["C.art-6-1-f"],
      },
      {
        id: "P.weigh.balance",
        conclusion_id: "w.balance.rights_not_overridden",
        epistemic_type: "W",
        jurisdiction_tag: "gdpr-eu",
        anchor: { corpus_key: "gdpr-art-6-1-f", pinpoint: "GDPR Art. 6(1)(f)" },
        intake_ledger_refs: ["L.purpose"],
        citation_binding_refs: ["C.art-6-1-f", "C.recital-47"],
        weighing_frame_ref: "F.balance.reasonable_expectations",
      },
    ],
    factor_table: [
      {
        factor_id: "purpose.lawful",
        kind: "benefit",
        jurisdiction_tag: "gdpr-eu",
        present_in_intake: true,
        intake_ledger_refs: ["L.purpose"],
        guidance_refs: [],
        anchor: { corpus_key: "gdpr-art-6-1-f", pinpoint: "GDPR Art. 6(1)(f)" },
      },
      {
        id: undefined as never,
        factor_id: "impact.severity",
        kind: "negative_impact",
        jurisdiction_tag: "gdpr-eu",
        present_in_intake: true,
        intake_ledger_refs: [],
        guidance_refs: [],
        anchor: { corpus_key: "gdpr-art-6-1-f", pinpoint: "GDPR Art. 6(1)(f)" },
      } as never,
      {
        factor_id: "safeguards.opt_out_and_object",
        kind: "safeguard",
        jurisdiction_tag: "gdpr-eu",
        present_in_intake: true,
        intake_ledger_refs: [],
        guidance_refs: [],
        anchor: { corpus_key: "gdpr-art-6-1-f", pinpoint: "GDPR Art. 6(1)(f)" },
      },
    ],
    weighing_frame: [
      {
        frame_id: "F.balance.reasonable_expectations",
        test_id: "test.gdpr-6-1-f.balance",
        jurisdiction_tag: "gdpr-eu",
        source: "fsor_commentary", // shared schema type reused; source string is descriptive only in Phase-1
        corpus_ref: "edpb_guidelines#1-2024.reasonable-expectations",
        anchor_hint:
          "the reasonable expectations of data subjects should be considered in the balancing test",
        pinpoint: "EDPB Guidelines 1/2024",
        closeness_contribution: 0.6,
        tier_label: "primary",
        authority_weight: "binding",
      },
    ],
    gate_outcomes: [
      { gate_id: "G.lawfulness.li_available", outcome: "pass" },
      { gate_id: "G.necessity.precedes_balancing", outcome: "pass" },
      { gate_id: "G.public_authority.exclusion", outcome: "not_applicable" },
    ],
    conservative_write_around: { triggered: false, disclosure: "silent+telemetry" },
  };
  return { ...plan, ...overrides };
}

// ---------------------------------------------------------------------------
// v2.3 authority-domain: GDPR plan must reject any U.S./CA anchor or binding
// ---------------------------------------------------------------------------

Deno.test("LIA V3: gdpr-eu plan rejects a cppa-ca citation binding", () => {
  const plan = liaBasePlan();
  const bad: RenderPlan = {
    ...plan,
    citation_bindings: [
      ...plan.citation_bindings,
      {
        pinpoint_ref: "C.cppa-7152",
        corpus_key: "cppa-7152",
        pinpoint: "11 CCR § 7152(a)",
        jurisdiction_tag: "cppa-ca",
        authority_weight: "binding",
      },
    ],
  };
  const issues = validateAuthorityDomain(bad);
  assert(issues.some((i) => i.code.startsWith("V3")), "V3 must flag out-of-domain binding");
});

Deno.test("LIA V3: gdpr-eu plan rejects us-federal anchor (no U.S. bridge for GDPR)", () => {
  const plan = liaBasePlan();
  const bad: RenderPlan = {
    ...plan,
    propositions: [
      ...plan.propositions,
      {
        id: "P.bad.usfed",
        conclusion_id: "r.lawfulness.li_available",
        epistemic_type: "R",
        jurisdiction_tag: "us-federal",
        polarity: "positive",
        anchor: { corpus_key: "ftc-example", pinpoint: "FTC ruling (example)" },
        intake_ledger_refs: ["L.purpose"],
        citation_binding_refs: ["C.art-6-1-f"],
      },
    ],
  };
  const issues = validateAuthorityDomain(bad);
  assert(
    issues.some((i) => i.code.startsWith("V3")),
    "V3 must flag us-federal on a GDPR plan (no U.S. bridge into GDPR products)",
  );
});

Deno.test("LIA V8: authority-weight — persuasive tier is unavailable on GDPR plans (no bridge)", () => {
  const plan = liaBasePlan();
  const bad: RenderPlan = {
    ...plan,
    weighing_frame: [
      ...plan.weighing_frame,
      {
        frame_id: "F.bad.persuasive",
        test_id: "test.gdpr-6-1-f.balance",
        jurisdiction_tag: "gdpr-eu",
        source: "enforcement_action_fsor_analogy",
        corpus_ref: "some-us-analogy",
        anchor_hint: "US FTC comparable action",
        pinpoint: "FTC 2024-XXXX",
        closeness_contribution: 0.2,
        tier_label: "analogy_fsor_internal",
        authority_weight: "persuasive",
        fsor_mediation_ref: "cppa_fsor_commentary#irrelevant",
      },
    ],
  };
  const issues = validateAuthorityWeight(bad);
  assert(
    issues.length > 0,
    "V8 must flag any persuasive-tier entry on a GDPR plan (persuasive path is CPPA-only)",
  );
});

// ---------------------------------------------------------------------------
// V4/V5 guidance + candidate closure on the LIA registry + candidate index
// ---------------------------------------------------------------------------

Deno.test("LIA V5: candidate closure — weighing_frame entry must belong to a known LIA test id", () => {
  const plan = liaBasePlan();
  const good = validatePassGCandidateClosure(plan, LIA_WEIGHING_TESTS);
  assertEquals(good.length, 0, "known test id + gdpr-eu domain should pass");

  const bad: RenderPlan = {
    ...plan,
    weighing_frame: [
      {
        ...plan.weighing_frame[0],
        test_id: "test.cppa-7152.balance", // wrong test id for a GDPR plan
      },
    ],
  };
  const issues = validatePassGCandidateClosure(bad, LIA_WEIGHING_TESTS);
  assert(issues.length > 0, "V5 must flag unknown test id");
});

Deno.test("LIA V4: guidance-closure passes with same-domain EDPB guidance", () => {
  const plan = liaBasePlan();
  const withGuidance: RenderPlan = {
    ...plan,
    factor_table: plan.factor_table.map((f, i) =>
      i === 0
        ? {
          ...f,
          guidance_refs: [
            {
              source_table: "cppa_fsor_commentary", // schema literal; runtime treats as descriptive
              regulation_citation: "EDPB Guidelines 1/2024",
              page_ref: null,
              anchor_hint: "three-step process",
            },
          ],
        }
        : f
    ),
  };
  const issues = validateGuidanceClosure(withGuidance);
  assertEquals(issues.length, 0, "same-domain guidance should pass V4");
});

// ---------------------------------------------------------------------------
// Type-R polarity + Type-W factor-completeness sanity on the LIA plan shape
// ---------------------------------------------------------------------------

Deno.test("LIA V6: Type-R propositions carry polarity", () => {
  const plan = liaBasePlan();
  const issues = validateTypeRPolarity(plan);
  assertEquals(issues.length, 0);
});

Deno.test("LIA V7: Type-W factor completeness — three-kind coverage is checked", () => {
  const plan = liaBasePlan();
  // Type-W conclusions per LIA registry — sanity that the registry actually
  // declares 3 weighing conclusions (purpose_legitimacy, necessity, balance).
  const wConclusions = LIA_CONCLUSIONS.filter((c) => c.epistemic_type === "W");
  assertEquals(wConclusions.length, 3);
  const issues = validateTypeWFactorCompleteness(plan);
  // The fixture has one benefit + one negative_impact + one safeguard for the
  // Type-W balance proposition; V7 should PASS.
  assertEquals(issues.length, 0);
});

// ---------------------------------------------------------------------------
// End-to-end validateRenderPlan runs green on the base LIA fixture.
// ---------------------------------------------------------------------------

Deno.test("LIA E2E: validateRenderPlan is clean on well-formed gdpr-eu plan", () => {
  const plan = liaBasePlan();
  const issues = validateRenderPlan(plan, LIA_WEIGHING_TESTS);
  assertEquals(
    issues.filter((i) => i.severity === "error").length,
    0,
    "no errors expected; warnings tolerated",
  );
});

// ---------------------------------------------------------------------------
// LIA_PASSG_INDEX shape: candidate slices exist for all three weighing tests
// ---------------------------------------------------------------------------

Deno.test("LIA index: all three weighing tests have candidate slices", () => {
  for (const t of LIA_WEIGHING_TESTS) {
    const slice = LIA_PASSG_INDEX_BY_TEST[t.test_id];
    assert(slice, `missing candidate slice for ${t.test_id}`);
    assertEquals(slice.jurisdiction_tag, "gdpr-eu");
    for (const c of slice.candidates) {
      assertEquals(
        c.authority_weight,
        "binding",
        "GDPR products carry no persuasive tier; every candidate must be binding",
      );
    }
  }
});
