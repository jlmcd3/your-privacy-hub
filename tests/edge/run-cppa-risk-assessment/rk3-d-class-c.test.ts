// RK3-D — Class C→B conversion pins (Spine 4.3 Phase D, doc 33).
//
// Pins the PN-RK8 option-1 conversion: (a) enum parity between the form's
// option sets and the intake contract's verbatim copies, (b) the ratified
// RK3-D determination templates over the new typed operands, (c) honest
// absence — a record without the RK3-D operands composes exactly what RK3-C
// composed, (d) the reserved-id law (only ids with no Spine 4.3 placeholder
// remain on RISK_FACTOR_CLASS_C_IDS), and (e) Phase D rendering over both
// perfect fixtures, including the App G relied-on-authorities group.

import {
  assert,
  assertEquals,
} from "https://deno.land/std@0.224.0/assert/mod.ts";
import { generateCppaRiskReport } from "../../../supabase/functions/_shared/ltp/generate-cppa-risk.ts";
import { EMPTY_RISK_CORPUS } from "../../../supabase/functions/_shared/ltp/risk-corpus.ts";
import { CPPA_RISK_PERFECT } from "../../../supabase/functions/_shared/golden/cppa-risk.ts";
import { assembleRiskSkeletonDocument } from "../../../supabase/functions/_shared/ltp/risk-skeleton-assemble.ts";
import { skeletonDocumentToText } from "../../../supabase/functions/_shared/prose/skeleton-render.ts";
import { RISK_V3_BANNED_REGISTER } from "../../../supabase/functions/_shared/prose/plans/cppa-risk.spine.ts";
import {
  RISK_FACTOR_CLASS_C_IDS,
  runRiskFactorEngine,
} from "../../../supabase/functions/_shared/ltp/risk-factor-engine.ts";
import { CA_PI_TAXONOMY, CA_SPI_CATEGORY_KEYS } from "../../../supabase/functions/_shared/ltp/ca-pi-taxonomy.ts";
import * as contract from "../../../supabase/functions/_shared/intake-contracts/cppa-risk-assessment.ts";
import * as formEnums from "../../../src/pages/CPPARiskAssessment.enums.ts";

type Bag = Record<string, unknown>;

const BUILD_STAMP = "rk3-d-class-c-pins";
const REPORT_STUB = {
  scope_and_triggers: { narrative: ["Engaged — Section 7150(b)(1): sale or sharing."] },
};

// ── (a) form ↔ contract option parity ────────────────────────────────────────

Deno.test("RK3-D — form and contract option sets are byte-identical", () => {
  const SETS = [
    "PURPOSE_SPECIFICITY_FACTS_OPTS",
    "OUT_OF_SCOPE_CONFIRMATION_OPTS",
    "COMPARABLE_PROCESSING_STATUS_OPTS",
    "CONSUMER_RELATIONSHIP_CONTEXT_OPTS",
    "SOURCE_CATEGORY_OPTS",
    "VENDOR_DEPENDENCY_OPTS",
    "EXPECTATION_CHECK_OPTS",
    "CHOICE_ARCHITECTURE_CHECK_OPTS",
    "ADMT_ROLE_TYPE_OPTS",
    "ADMT_LOGIC_DOCUMENTED_OPTS",
    "HUMAN_REVIEW_FACTS_OPTS",
    "ADMT_TESTING_FACTS_OPTS",
    "RISK_INTERDEPENDENCY_OPTS",
    "BENEFIT_MAGNITUDE_BASIS_OPTS",
    "SECONDARY_RELATION_OPTS",
    "SECONDARY_DISCLOSED_OPTS",
    "RECIPIENT_CONTRACT_OPTS",
    "SAFEGUARD_EFFECTIVENESS_BASIS_OPTS",
    "PLANNED_TIMELINE_OPTS",
  ] as const;
  for (const name of SETS) {
    assertEquals(
      [...(contract as Bag)[name] as string[]],
      [...(formEnums as Bag)[name] as string[]],
      `option drift on ${name}`,
    );
  }
});

// ── (d) reserved-id law ───────────────────────────────────────────────────────

Deno.test("RK3-D — only placeholder-less ids remain reserved, and none composes", () => {
  assertEquals([...RISK_FACTOR_CLASS_C_IDS], ["prior_assessment_analysis"]);
  for (const c of CPPA_RISK_PERFECT) {
    const out = runRiskFactorEngine(c.intake as Bag, REPORT_STUB, "2026-08-19");
    for (const id of out.composed_factor_ids) {
      assert(!RISK_FACTOR_CLASS_C_IDS.includes(id), `reserved id composed: ${id}`);
    }
  }
});

// ── (b) ratified-template pins over the typed operands ──────────────────────

Deno.test("RK3-D — purpose-specificity band follows the facet count", () => {
  const base = CPPA_RISK_PERFECT[0].intake as Bag;
  const withFacets = (facets: string[]): Bag => ({ ...base, purpose_specificity_facts: facets });

  const full = runRiskFactorEngine(withFacets([
    "The specific product, service, or operation the processing supports",
    "The categories of personal information involved",
    "The categories of consumers affected",
  ]), REPORT_STUB, "2026-08-19");
  assert(
    full.factors.purpose_specificity_analysis.includes("stated with the specificity"),
    "3 facets must land the specified band",
  );
  assert(full.factors.purpose_conclusion.includes("defined with specificity"), "conclusion band");

  const partial = runRiskFactorEngine(
    withFacets(["The categories of consumers affected"]),
    REPORT_STUB,
    "2026-08-19",
  );
  assert(partial.factors.purpose_specificity_analysis.includes("partially specified"), "1 facet band");

  const none = runRiskFactorEngine(withFacets(["None of the above"]), REPORT_STUB, "2026-08-19");
  assert(
    none.factors.purpose_specificity_analysis.includes("not stated with the precision"),
    "None band",
  );
  assert(
    none.factors.conditions_to_proceed.includes("Restate the processing purpose"),
    "None band must route a condition",
  );
});

Deno.test("RK3-D — expectations table: markers × notice coverage", () => {
  const base = CPPA_RISK_PERFECT[0].intake as Bag;
  const marked = runRiskFactorEngine({
    ...base,
    expectation_check: ["Information is combined with information from other sources"],
  }, REPORT_STUB, "2026-08-19");
  assert(
    marked.factors.consumer_expectations_conclusion.includes("each is disclosed"),
    "marker + full notice → divergent-but-disclosed",
  );
  assert(marked.factors.unexpected_processing.includes("may fall outside the expectations"));

  const noNotice = runRiskFactorEngine({
    ...base,
    expectation_check: ["Information is combined with information from other sources"],
    q12_notice_at_collection: "No",
  }, REPORT_STUB, "2026-08-19");
  assert(
    noNotice.factors.consumer_expectations_conclusion.includes("weighs against the processing"),
    "marker without notice → adverse routing",
  );

  const clean = runRiskFactorEngine({
    ...base,
    expectation_check: ["None of the above apply"],
  }, REPORT_STUB, "2026-08-19");
  assert(
    clean.factors.consumer_expectations_conclusion.includes("reasonably consistent with the context"),
    "no markers → consistent",
  );
});

Deno.test("RK3-D — human-review table: the three-element test", () => {
  const base = CPPA_RISK_PERFECT[0].intake as Bag;
  const all3 = runRiskFactorEngine(base, REPORT_STUB, "2026-08-19");
  assert(all3.factors.human_review_effectiveness_analysis.includes("the human review is effective"));

  const partial = runRiskFactorEngine({
    ...base,
    human_review_facts: ["Reviewers have authority to change or overrule the decision"],
  }, REPORT_STUB, "2026-08-19");
  assert(partial.factors.human_review_effectiveness_analysis.includes("does not confirm"));

  const noneRun = runRiskFactorEngine({
    ...base,
    human_review_facts: ["There is no human review"],
  }, REPORT_STUB, "2026-08-19");
  assert(
    noneRun.factors.human_review_effectiveness_analysis.includes("without meaningful human involvement"),
  );
});

Deno.test("RK3-D — ADMT logic table routes a condition when undocumented", () => {
  const base = CPPA_RISK_PERFECT[0].intake as Bag;
  const bad = runRiskFactorEngine({
    ...base,
    admt_logic_documented: "The logic is not fully documented or understood",
  }, REPORT_STUB, "2026-08-19");
  assert(bad.factors.admt_logic_conclusion.includes("not adequate"));
  assert(bad.factors.conditions_to_proceed.includes("Document the logic"));
});

Deno.test("RK3-D — interdependency: compounding is a note and a con-factor, never tier arithmetic", () => {
  const base = CPPA_RISK_PERFECT[0].intake as Bag;
  const withOut = runRiskFactorEngine({ ...base, risk_interdependency_check: "The identified risk pathways operate independently", compounding_pathways: [] }, REPORT_STUB, "2026-08-19");
  const withComp = runRiskFactorEngine(base, REPORT_STUB, "2026-08-19"); // fixture answers compounding
  assert(withComp.factors.risk_interdependency_analysis.includes("could compound each other"));
  assert(withComp.factors.con_processing_factors.includes("compound each other"));
  assert(withOut.factors.risk_interdependency_analysis.includes("operate independently"));
  // Materiality/residual language is identical either way (no tier arithmetic).
  assertEquals(
    withComp.factors.overall_residual_risk_conclusion,
    withOut.factors.overall_residual_risk_conclusion,
  );
  assertEquals(withComp.factors.balancing_conclusion, withOut.factors.balancing_conclusion);
});

// ── (c) honest absence — the RK3-C output is a fixed point ──────────────────

Deno.test("RK3-D — a record without the RK3-D operands composes exactly the RK3-C set", () => {
  const RK3D_KEYS = [
    "purpose_specificity_facts",
    "out_of_scope_confirmation",
    "out_of_scope_activities",
    "comparable_processing_status",
    "comparable_processing_basis",
    "consumer_relationship_context",
    "source_categories",
    "vendor_dependency",
    "essential_vendors",
    "expectation_check",
    "choice_architecture_check",
    "admt_role_type",
    "admt_logic_documented",
    "human_review_facts",
    "admt_testing_facts",
    "risk_interdependency_check",
    "compounding_pathways",
    "benefit_business_magnitude_basis",
    "benefit_consumer_magnitude_basis",
    "benefit_other_stakeholders_magnitude_basis",
    "benefit_public_magnitude_basis",
  ];
  const NEW_FACTOR_IDS = new Set([
    "purpose_specificity_analysis",
    "out_of_scope_processing_description",
    "secondary_use_analysis",
    "comparable_processing_analysis",
    "consumer_context_analysis",
    "source_risk_analysis",
    "recipient_risk_analysis",
    "material_vendor_dependency",
    "consumer_expectations_analysis",
    "unexpected_processing",
    "consumer_expectations_conclusion",
    "coercion_analysis",
    "admt_role_analysis",
    "admt_logic_analysis",
    "admt_logic_conclusion",
    "human_review_effectiveness_analysis",
    "admt_testing_analysis",
    "risk_interdependency_analysis",
  ]);
  for (const c of CPPA_RISK_PERFECT) {
    const stripped: Bag = { ...(c.intake as Bag) };
    for (const k of RK3D_KEYS) delete stripped[k];
    // Row children too.
    stripped.a6_safeguards = (stripped.a6_safeguards as Bag[] ?? []).map((r) => {
      const { effectiveness_basis: _e, planned_timeline: _p, ...rest } = r;
      return rest;
    });
    stripped.recipients = (stripped.recipients as Bag[] ?? []).map((r) => {
      const { contractual_protections: _c, ...rest } = r;
      return rest;
    });
    const out = runRiskFactorEngine(stripped, REPORT_STUB, "2026-08-19");
    for (const id of out.composed_factor_ids) {
      assert(!NEW_FACTOR_IDS.has(id), `operand-gated factor composed without its operand: ${id}`);
    }
  }
});

// ── taxonomy single custody ──────────────────────────────────────────────────

Deno.test("RK3-D — SPI membership has single custody in ca-pi-taxonomy.ts", () => {
  const expected = Object.entries(CA_PI_TAXONOMY).filter(([, r]) => r.spi).map(([k]) => k);
  assertEquals([...CA_SPI_CATEGORY_KEYS].sort(), expected.sort());
  assertEquals(CA_SPI_CATEGORY_KEYS.length, 9);
  assert(CA_SPI_CATEGORY_KEYS.includes("Precise geolocation (GPS-level / specific address)"));
});

// ── (e) Phase D rendering over the perfect fixtures ──────────────────────────

for (const c of CPPA_RISK_PERFECT) {
  Deno.test(`RK3-D — Phase D rendering — ${c.id}`, async (t) => {
    const result = await generateCppaRiskReport(c.intake, {
      pass1: "deterministic",
      riskCorpus: EMPTY_RISK_CORPUS,
      buildStamp: BUILD_STAMP,
      mode: "enforce",
    });
    const report = result.report as Bag;
    const sk = assembleRiskSkeletonDocument(report, c.intake as Bag);
    const body = skeletonDocumentToText(sk.document);
    const isAdmt = /^yes\b/i.test(String((c.intake as Bag).q18_admt_use ?? ""));
    const isSierra = c.id === "risk-perfect-complete";

    await t.step("conformance and register stay clean with Phase D composed", () => {
      assertEquals(sk.conformance.length, 0, JSON.stringify(sk.conformance));
      assertEquals(sk.register_findings.length, 0, JSON.stringify(sk.register_findings));
    });

    await t.step("Section I scope and specificity render", () => {
      assert(body.includes("The Company confirms that the stated purpose identifies"), "specificity analysis absent");
      assert(body.includes("Out of scope."), "out-of-scope description absent");
    });

    await t.step("Section II analyses render", () => {
      assert(body.includes("Read as an operational sequence"), "coherence analysis absent");
      assert(body.includes("The Company identifies the affected consumers as:"), "context analysis absent");
      assert(body.includes("source ") && body.includes("Analysis."), "source analysis absent");
      assert(body.includes("on the Company’s typed record, this control is") || body.includes("under a written contract"), "recipient risk analysis absent");
      assert(body.includes("The processing materially depends on:"), "vendor dependency absent");
    });

    await t.step("Section IV analyses render", () => {
      assert(body.includes("typed notice record"), "transparency analysis absent");
      assert(body.includes("expectation"), "expectations analysis absent");
      assert(body.includes("The Company confirms") && body.includes("declining"), "choice-architecture analysis absent");
    });

    await t.step("Section V typed analyses render iff ADMT", () => {
      assertEquals(body.includes("The Company classifies the system as"), isAdmt, "role analysis gating");
      assertEquals(body.includes("elements of effective human involvement"), isAdmt, "human-review analysis gating");
    });

    await t.step("Section VII interacting-risks block renders from the typed answer", () => {
      assert(body.includes("D. Interacting Risks."), "interacting-risks block absent");
      if (isSierra) {
        assert(body.includes("could compound each other"), "compounding text absent on Sierra");
      } else {
        assert(body.includes("operate independently"), "independent text absent on Locus");
      }
    });

    await t.step("Section VIII effectiveness and residual walk render", () => {
      assert(body.includes("Effectiveness analysis."), "effectiveness analysis absent");
      assert(body.includes("residual tier follows the residual rule"), "residual walk absent");
    });

    await t.step("Section IX analyses render", () => {
      assert(body.includes("No consideration is credited in favor of the processing"), "pro analysis absent");
      assert(body.includes("No adverse consideration is assumed"), "con analysis absent");
    });

    await t.step("App G carries the relied-on-authorities group", () => {
      assert(
        body.includes("Authorities Relied On in the Analysis"),
        "factor-authority group absent from the Table of Authorities",
      );
    });

    await t.step("banned register and markers stay clean over the new text", () => {
      const lower = body.toLowerCase();
      for (const b of RISK_V3_BANNED_REGISTER) {
        assert(!lower.includes(b), `banned register "${b}" leaked`);
      }
      assert(!body.includes("{{"), "placeholder notation leaked");
      assert(!body.includes("[GENERATED"), "generated marker leaked");
    });

    await t.step("determinism across two engine invocations", () => {
      const a = runRiskFactorEngine(c.intake as Bag, report, "2026-08-19");
      const b = runRiskFactorEngine(c.intake as Bag, report, "2026-08-19");
      assertEquals(a.blocks, b.blocks);
    });
  });
}
