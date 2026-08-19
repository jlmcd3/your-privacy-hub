// RK3-C — factor engine pins (Spine 4.3 Phase C, Classes A + B).
//
// Pins the ratified determination tables (materiality matrix, residual rule,
// benefit-weight table, balancing table, recommended-outcome mapping), the
// engine's rendering behaviour over both CPPA_RISK_PERFECT fixtures, the
// Class C honest-absence law, the impact_intake.benefitsOutweigh firewall
// (contract §7), provenance coverage, and determinism.
//
// Engine invocation matches the RK0.5 harness: deterministic Pass-1,
// EMPTY_RISK_CORPUS, no refinementDeps — zero model calls, zero DB access.

import {
  assert,
  assertEquals,
  assertExists,
} from "https://deno.land/std@0.224.0/assert/mod.ts";
import { generateCppaRiskReport } from "../../../supabase/functions/run-cppa-risk-assessment-v2/_local/ltp/generate-cppa-risk.ts";
import { EMPTY_RISK_CORPUS } from "../../../supabase/functions/run-cppa-risk-assessment-v2/_local/ltp/risk-corpus.ts";
import { CPPA_RISK_PERFECT } from "../../../supabase/functions/_shared/golden/cppa-risk.ts";
import { assembleRiskSkeletonDocument } from "../../../supabase/functions/_shared/ltp/risk-skeleton-assemble.ts";
import { skeletonDocumentToText } from "../../../supabase/functions/_shared/prose/skeleton-render.ts";
import { RISK_V3_BANNED_REGISTER } from "../../../supabase/functions/_shared/prose/plans/cppa-risk.spine.ts";
import {
  resolveBenefitWeight,
  resolveMateriality,
  resolveRecommendedOutcome,
  resolveResidual,
  RISK_BALANCING_TABLE,
  RISK_FACTOR_CLASS_C_IDS,
  RISK_FACTOR_ENGINE_STAMP,
  RISK_MATERIALITY_MATRIX,
  runRiskFactorEngine,
} from "../../../supabase/functions/_shared/ltp/risk-factor-engine.ts";

type Bag = Record<string, unknown>;

const BUILD_STAMP = "rk3-c-factor-pins";

// ── Ratified-table pins ───────────────────────────────────────────────────────

Deno.test("RK3-C — materiality matrix (severity-weighted, conservative)", () => {
  assertEquals(resolveMateriality("Unlikely", "Minimal"), "Low");
  assertEquals(resolveMateriality("Unlikely", "Moderate"), "Low");
  assertEquals(resolveMateriality("Possible", "Moderate"), "Moderate");
  assertEquals(resolveMateriality("Possible", "Significant"), "High");
  assertEquals(resolveMateriality("Likely", "Severe"), "Critical");
  assertEquals(resolveMateriality("Highly likely", "Significant"), "Critical");
  assertEquals(resolveMateriality("Unlikely", "Severe"), "High");
  // Unknown operands resolve to null, never to a default tier.
  assertEquals(resolveMateriality("Sometimes", "Severe"), null);
  assertEquals(resolveMateriality("Likely", "Catastrophic"), null);
  // The matrix is total over the two enums.
  assertEquals(Object.keys(RISK_MATERIALITY_MATRIX).length, 4);
  for (const row of Object.values(RISK_MATERIALITY_MATRIX)) {
    assertEquals(Object.keys(row).length, 4);
  }
});

Deno.test("RK3-C — residual rule credits only tested safeguards", () => {
  assertEquals(resolveResidual("High", "Implemented and tested"), "Moderate");
  assertEquals(resolveResidual("Critical", "Implemented and tested"), "High");
  assertEquals(resolveResidual("Low", "Implemented and tested"), "Low");
  assertEquals(resolveResidual("High", "Implemented, not tested"), "High");
  assertEquals(resolveResidual("High", "Planned, not yet implemented"), "High");
  assertEquals(resolveResidual("High", null), "High");
});

Deno.test("RK3-C — benefit-weight table (identified × fact-supplied)", () => {
  assertEquals(resolveBenefitWeight("No", "a benefit", "a fact"), "no affirmative weight");
  assertEquals(resolveBenefitWeight("Yes", "", "a fact"), "no affirmative weight");
  assertEquals(resolveBenefitWeight("Yes", "a benefit", ""), "limited weight");
  assertEquals(resolveBenefitWeight("Yes", "a benefit", "a fact"), "material weight");
  assertEquals(resolveBenefitWeight(true, "a benefit", "a fact"), "material weight");
});

Deno.test("RK3-C — balancing table spot pins (the PN-RK8 artifact)", () => {
  assertEquals(RISK_BALANCING_TABLE.material.Low.kind, "proceed");
  assertEquals(RISK_BALANCING_TABLE.material.Moderate.kind, "proceed");
  assertEquals(RISK_BALANCING_TABLE.material.High.kind, "stop");
  assertEquals(RISK_BALANCING_TABLE.material.Critical.kind, "stop");
  assertEquals(RISK_BALANCING_TABLE.limited.Low.kind, "proceed");
  assertEquals(RISK_BALANCING_TABLE.limited.Moderate.kind, "proceed");
  assertEquals(RISK_BALANCING_TABLE.limited.High.kind, "stop");
  // No benefit established → no residual tier can be outweighed.
  for (const tier of ["Low", "Moderate", "High", "Critical"] as const) {
    assertEquals(RISK_BALANCING_TABLE.none[tier].kind, "stop");
  }
  assert(
    RISK_BALANCING_TABLE.material.Low.conclusion.startsWith("The benefits of the processing outweigh"),
  );
});

Deno.test("RK3-C — recommended outcome keyed to consequence × processing status", () => {
  assertEquals(
    resolveRecommendedOutcome("proceed", false, "Planned").outcome,
    "Initiate the processing as described in the assessment record.",
  );
  assertEquals(resolveRecommendedOutcome("proceed", false, "Planned").consequence, "proceed");
  assertEquals(
    resolveRecommendedOutcome("proceed", true, "Ongoing").outcome,
    "Continue the processing subject to the Conditions to Proceed identified below.",
  );
  assertEquals(resolveRecommendedOutcome("proceed", true, "Ongoing").consequence, "proceed with conditions");
  assertEquals(
    resolveRecommendedOutcome("stop", false, "Planned").outcome,
    "Do not initiate the processing on the present record.",
  );
  assertEquals(resolveRecommendedOutcome("stop", true, "Ongoing").consequence, "do not proceed");
  assert(resolveRecommendedOutcome("proceed", false, "Discontinued").outcome.includes("discontinued"));
});

// ── Engine unit behaviour over the perfect fixtures ──────────────────────────

Deno.test("RK3-C — engine is deterministic and never composes a Class C id", () => {
  for (const c of CPPA_RISK_PERFECT) {
    const intake = c.intake as Bag;
    const report = { scope_and_triggers: { narrative: ["Engaged — Section 7150(b)(1): sale or sharing."] } };
    const a = runRiskFactorEngine(intake, report, "2026-08-18");
    const b = runRiskFactorEngine(intake, report, "2026-08-18");
    assertEquals(a.blocks, b.blocks, "engine must be deterministic");
    assertEquals(a.stamp, RISK_FACTOR_ENGINE_STAMP);
    for (const id of a.composed_factor_ids) {
      assert(!RISK_FACTOR_CLASS_C_IDS.includes(id), `Class C id composed: ${id}`);
    }
    // Every composed factor carries provenance with at least one source.
    for (const id of a.composed_factor_ids) {
      const p = a.provenance.find((x) => x.factor_id === id);
      assertExists(p, `no provenance for ${id}`);
      assert(p.sources.length > 0, `empty sources for ${id}`);
      assert(p.factor_class === "A" || p.factor_class === "B");
    }
  }
});

Deno.test("RK3-C — impact_intake.benefitsOutweigh never feeds the balancing conclusion", () => {
  const base = CPPA_RISK_PERFECT[0].intake as Bag;
  const report = { scope_and_triggers: { narrative: ["Engaged — Section 7150(b)(3): significant-decision ADMT."] } };
  const flip = (v: string): Bag => ({
    ...base,
    impact_intake: { ...(base.impact_intake as Bag ?? {}), benefitsOutweigh: v },
  });
  const yes = runRiskFactorEngine(flip("Yes"), report, "2026-08-18");
  const no = runRiskFactorEngine(flip("No"), report, "2026-08-18");
  assertEquals(
    yes.factors.balancing_conclusion,
    no.factors.balancing_conclusion,
    "balancing conclusion must be identical whatever the customer's perspective answer",
  );
  assertEquals(yes.factors.recommended_processing_outcome, no.factors.recommended_processing_outcome);
});

Deno.test("RK3-C — banned register never appears in factor text", () => {
  for (const c of CPPA_RISK_PERFECT) {
    const report = { scope_and_triggers: { narrative: ["Engaged — Section 7150(b)(1): sale or sharing."] } };
    const out = runRiskFactorEngine(c.intake as Bag, report, "2026-08-18");
    for (const [id, text] of Object.entries(out.factors)) {
      const lower = text.toLowerCase();
      for (const b of RISK_V3_BANNED_REGISTER) {
        assert(!lower.includes(b), `banned register "${b}" in factor ${id}`);
      }
      assert(!text.includes("{{"), `placeholder notation leaked in ${id}`);
    }
  }
});

// ── Full Phase C rendering over the perfect fixtures ─────────────────────────

for (const c of CPPA_RISK_PERFECT) {
  Deno.test(`RK3-C — Phase C rendering — ${c.id}`, async (t) => {
    const result = await generateCppaRiskReport(c.intake, {
      pass1: "deterministic",
      riskCorpus: EMPTY_RISK_CORPUS,
      buildStamp: BUILD_STAMP,
      mode: "enforce",
    });
    const report = result.report as Bag;
    const sk = assembleRiskSkeletonDocument(report, c.intake as Bag);
    const ids = sk.document.sections.map((x) => x.id);
    const body = skeletonDocumentToText(sk.document);
    const isAdmt = /^yes\b/i.test(String((c.intake as Bag).q18_admt_use ?? ""));

    await t.step("zero conformance findings with factors composed", () => {
      assertEquals(sk.conformance.length, 0, JSON.stringify(sk.conformance));
    });

    await t.step("zero register findings with factors composed", () => {
      assertEquals(sk.register_findings.length, 0, JSON.stringify(sk.register_findings));
    });

    await t.step("factor appendices render; methodology appendix stays absent", () => {
      assert(ids.includes("appendix_b"), "Appendix B (necessity matrix) absent");
      assert(ids.includes("appendix_c"), "Appendix C (risk register) absent");
      assert(!ids.includes("appendix_h"), "Appendix H must stay absent");
    });

    await t.step("necessity conversion renders end-to-end", () => {
      assert(body.includes("B. Analysis. Information Supported as Necessary."), "III.B head absent");
      assert(body.includes("C. Conclusion."), "III.C head absent");
      const rows = ((c.intake as Bag).a2_necessity_set ?? []) as Bag[];
      const unnecessary = rows.filter((r) =>
        r.necessity === "Collected but not necessary to the stated purpose"
      );
      if (unnecessary.length === 0) {
        assert(
          body.includes("supported as necessary to the stated purpose on the basis the Company has supplied"),
          "all-necessary conclusion absent on an all-necessary fixture",
        );
      } else {
        // The fixture's own facts demand the qualified branch: the
        // unnecessary-elements block, the qualified conclusion, and the
        // minimization condition all render.
        assert(body.includes("Information Not Shown to Be Necessary."), "unnecessary lead absent");
        assert(
          body.includes("The necessity analysis is qualified"),
          "qualified conclusion absent on a fixture with an unnecessary element",
        );
        assert(body.includes("D. Consequence. Condition to Proceed."), "minimization condition absent");
      }
      assert(
        body.includes("This appendix provides the element-level analysis underlying Section III."),
        "Appendix B intro absent",
      );
    });

    await t.step("risk pathway blocks and the inherent conclusion render", () => {
      assert(body.includes("B. Material Risk Pathways."), "VII.B head absent");
      assert(body.includes("Materiality before safeguards:"), "materiality line absent");
      assert(body.includes("E. Inherent Risk Conclusion."), "VII.E head absent");
      assert(
        body.includes("The next question is how materially the Company’s safeguards change that risk."),
        "VII.E closing absent",
      );
      assert(
        body.includes("This appendix provides the detailed analytical record underlying Sections VII and VIII."),
        "Appendix C intro absent",
      );
    });

    await t.step("safeguards and the residual conclusion render", () => {
      assert(body.includes("The principal residual risks are:"), "residual lead absent");
      assert(
        body.includes("After credited safeguards, the residual privacy risk of the activity is"),
        "residual conclusion absent",
      );
    });

    await t.step("benefit weights and the overall benefits conclusion render", () => {
      assert(body.includes("Weight in the balancing analysis:"), "weight lead absent");
      assert(body.includes("F. Overall Benefits Conclusion."), "VI.F head absent");
    });

    await t.step("the balancing determination renders with its three leads", () => {
      assert(body.includes("D. Overall Balancing Conclusion."), "IX.D head absent");
      assert(body.includes("Balancing conclusion:"), "balancing lead absent");
      assert(body.includes("Materiality of the determination:"), "materiality lead absent");
      assert(body.includes("Decision effect:"), "decision-effect lead absent");
      assert(body.includes("Assessment recommendation:"), "recommendation lead absent");
      assert(body.includes("Processing consequence type:"), "consequence type absent");
    });

    await t.step("executive summary carries the determination and outcome", () => {
      assert(body.includes("Overall Determination."), "exec determination head absent");
      assert(
        body.includes("The assessment reaches the following recommended processing outcome:"),
        "exec outcome lead absent",
      );
      assert(body.includes("Key Findings."), "exec key findings absent");
    });

    await t.step("consumer controls project from the established rights facts", () => {
      assert(body.includes("Relevant consumer rights and controls include:"), "controls lead absent");
      assert(body.includes("— Right to know:"), "right-to-know line absent");
      assert(body.includes("— Opt-out of sale or sharing:"), "opt-out line absent");
    });

    await t.step("ADMT factor conclusions render iff ADMT", () => {
      assertEquals(
        body.includes("H. Overall ADMT Conclusion."),
        isAdmt,
        `ADMT overall conclusion presence on ${c.id}`,
      );
    });

    await t.step("no factor markers or placeholders leak", () => {
      assert(!body.includes("[GENERATED"), "generated marker leaked");
      assert(!body.includes("{{"), "placeholder notation leaked");
      assert(!body.includes("\u0000"), "sentinel leaked");
    });

    await t.step("factor engine result is exposed with provenance", () => {
      assertEquals(sk.factor_engine.stamp, RISK_FACTOR_ENGINE_STAMP);
      assert(sk.factor_engine.composed_factor_ids.length >= 20, "expected a full Phase C composition");
      assertEquals(
        sk.factor_engine.provenance.length >= sk.factor_engine.composed_factor_ids.length,
        true,
      );
    });
  });
}
