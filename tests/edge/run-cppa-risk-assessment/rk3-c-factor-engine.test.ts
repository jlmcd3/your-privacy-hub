// Factor engine pins — Spine v5.2 (the Memorandum Redesign).
//
// Pins the ratified determination LOGIC (materiality matrix, residual rule,
// benefit-weight table, balancing-table kinds, recommended-outcome mapping —
// all carried byte-identical from the RK3-C/PN-RK8 ratifications), the
// re-registered v5.2 determination STRINGS, the engine's rendering behaviour
// over both CPPA_RISK_PERFECT fixtures, the Class C honest-absence law, the
// impact_intake.benefitsOutweigh firewall (contract §7), provenance
// coverage, and determinism.
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

const BUILD_STAMP = "v52-factor-pins";

// ── Ratified-table pins (logic carried byte-identical) ───────────────────────

Deno.test("v5.2 — materiality matrix (severity-weighted, conservative; carried)", () => {
  assertEquals(resolveMateriality("Unlikely", "Minimal"), "Low");
  assertEquals(resolveMateriality("Unlikely", "Moderate"), "Low");
  assertEquals(resolveMateriality("Possible", "Moderate"), "Moderate");
  assertEquals(resolveMateriality("Possible", "Significant"), "High");
  assertEquals(resolveMateriality("Likely", "Severe"), "Critical");
  assertEquals(resolveMateriality("Highly likely", "Significant"), "Critical");
  assertEquals(resolveMateriality("Unlikely", "Severe"), "High");
  // Unknown operands resolve to null, never to a default level.
  assertEquals(resolveMateriality("Sometimes", "Severe"), null);
  assertEquals(resolveMateriality("Likely", "Catastrophic"), null);
  // The matrix is total over the two enums.
  assertEquals(Object.keys(RISK_MATERIALITY_MATRIX).length, 4);
  for (const row of Object.values(RISK_MATERIALITY_MATRIX)) {
    assertEquals(Object.keys(row).length, 4);
  }
});

Deno.test("v5.2 — residual rule credits only tested safeguards (carried)", () => {
  assertEquals(resolveResidual("High", "Implemented and tested"), "Moderate");
  assertEquals(resolveResidual("Critical", "Implemented and tested"), "High");
  assertEquals(resolveResidual("Low", "Implemented and tested"), "Low");
  assertEquals(resolveResidual("High", "Implemented, not tested"), "High");
  assertEquals(resolveResidual("High", "Planned, not yet implemented"), "High");
  assertEquals(resolveResidual("High", null), "High");
});

Deno.test("v5.2 — benefit-weight table (identified × fact-supplied; carried)", () => {
  assertEquals(resolveBenefitWeight("No", "a benefit", "a fact"), "no affirmative weight");
  assertEquals(resolveBenefitWeight("Yes", "", "a fact"), "no affirmative weight");
  assertEquals(resolveBenefitWeight("Yes", "a benefit", ""), "limited weight");
  assertEquals(resolveBenefitWeight("Yes", "a benefit", "a fact"), "material weight");
  assertEquals(resolveBenefitWeight(true, "a benefit", "a fact"), "material weight");
});

Deno.test("v5.2 — balancing table: kinds carried, strings re-registered (redline ¶72)", () => {
  assertEquals(RISK_BALANCING_TABLE.material.Low.kind, "proceed");
  assertEquals(RISK_BALANCING_TABLE.material.Moderate.kind, "proceed");
  assertEquals(RISK_BALANCING_TABLE.material.High.kind, "stop");
  assertEquals(RISK_BALANCING_TABLE.material.Critical.kind, "stop");
  assertEquals(RISK_BALANCING_TABLE.limited.Low.kind, "proceed");
  assertEquals(RISK_BALANCING_TABLE.limited.Moderate.kind, "proceed");
  assertEquals(RISK_BALANCING_TABLE.limited.High.kind, "stop");
  // No benefit established → no remaining level can be outweighed.
  for (const tier of ["Low", "Moderate", "High", "Critical"] as const) {
    assertEquals(RISK_BALANCING_TABLE.none[tier].kind, "stop");
  }
  // Every conclusion cell opens in the CEO's target register.
  for (const tier of ["material", "limited", "none"] as const) {
    for (const level of ["Low", "Moderate", "High", "Critical"] as const) {
      assert(
        RISK_BALANCING_TABLE[tier][level].conclusion.startsWith(
          "Based on the information provided by the Company",
        ),
        `${tier}×${level} conclusion not re-registered`,
      );
    }
  }
  // The material×High cell carries the redline-¶72 target wording verbatim.
  assertEquals(
    RISK_BALANCING_TABLE.material.High.conclusion,
    "Based on the information provided by the Company, the residual privacy risks remaining after credited safeguards are substantial, and the benefits established by the Activity do not outweigh those risks.",
  );
  // The retired register never appears in any cell.
  for (const tier of ["material", "limited", "none"] as const) {
    for (const level of ["Low", "Moderate", "High", "Critical"] as const) {
      const cell = RISK_BALANCING_TABLE[tier][level];
      for (const text of [cell.conclusion, cell.materiality, cell.effect, cell.explanation]) {
        assert(!text.toLowerCase().includes("on the present record"), `${tier}×${level} carries the retired register`);
        assert(!text.toLowerCase().includes("tier"), `${tier}×${level} says "tier" — v5.2 says "level"`);
      }
    }
  }
});

Deno.test("v5.2 — recommended outcome keyed to consequence × processing status (re-registered)", () => {
  assertEquals(
    resolveRecommendedOutcome("proceed", false, "Planned").outcome,
    "Initiate the processing as described in the information provided.",
  );
  assertEquals(resolveRecommendedOutcome("proceed", false, "Planned").consequence, "proceed");
  assertEquals(
    resolveRecommendedOutcome("proceed", true, "Ongoing").outcome,
    "Continue the processing subject to the Conditions to Proceed identified in § 4.D.",
  );
  assertEquals(resolveRecommendedOutcome("proceed", true, "Ongoing").consequence, "proceed with conditions");
  // DOC 127 PART I (CEO-ratified 2026-08-31) — a stop always states its
  // path: the remediable branch appends the Conditions-for-Reassessment
  // sentence; the redesign branch states the critical-risk reason; the
  // consequence carries the split band.
  assertEquals(
    resolveRecommendedOutcome("stop", false, "Planned").outcome,
    "Do not initiate the processing on the information provided. To continue with the processing, the Company should satisfy the Conditions for Reassessment stated in § 4.D.",
  );
  assertEquals(resolveRecommendedOutcome("stop", true, "Ongoing").consequence, "do not proceed - remediable");
  assertEquals(
    resolveRecommendedOutcome("stop", true, "Ongoing", { criticalInherent: true }).consequence,
    "do not proceed - redesign required",
  );
  assert(
    resolveRecommendedOutcome("stop", true, "Ongoing", { criticalInherent: true }).outcome
      .includes("modifying the Activity itself"),
  );
  // Conservative-only precedence: an information gap never rescues a stop…
  assertEquals(
    resolveRecommendedOutcome("stop", true, "Ongoing", { unassessedCount: 2 }).consequence,
    "do not proceed - remediable",
  );
  // …but gates an otherwise-favorable balance.
  assertEquals(
    resolveRecommendedOutcome("proceed", false, "Ongoing", { unassessedCount: 1 }).consequence,
    "additional information required",
  );
  // Discontinued processing projects its own label, so the cover badge can
  // never contradict the body's "no processing decision is required".
  assertEquals(
    resolveRecommendedOutcome("stop", false, "Discontinued").consequence,
    "no processing decision required",
  );
  assert(resolveRecommendedOutcome("proceed", false, "Discontinued").outcome.includes("discontinued"));
});

// ── Engine unit behaviour over the perfect fixtures ──────────────────────────

Deno.test("v5.2 — engine is deterministic and never composes a Class C id", () => {
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

Deno.test("v5.2 — impact_intake.benefitsOutweigh never feeds the determination", () => {
  const base = CPPA_RISK_PERFECT[0].intake as Bag;
  const report = { scope_and_triggers: { narrative: ["Engaged — Section 7150(b)(3): significant-decision ADMT."] } };
  const flip = (v: string): Bag => ({
    ...base,
    impact_intake: { ...(base.impact_intake as Bag ?? {}), benefitsOutweigh: v },
  });
  const yes = runRiskFactorEngine(flip("Yes"), report, "2026-08-18");
  const no = runRiskFactorEngine(flip("No"), report, "2026-08-18");
  // DOC 157 (model-vs-law build) — the Company's own answer now renders as a
  // closing sentence in § 4.C (with a reconcile Follow-Up when it conflicts);
  // the DETERMINATION itself must still be identical, so the comparison
  // strips that sentence and also pins the typed disposition.
  const stripCompanyAnswer = (t: string): string =>
    t.replace(
      / The Company’s own recorded answer to whether the benefits outweigh the risks is “[^”]*”\.( That answer differs from the determination above; reconciling the two appears among the Follow-Ups in § 4\.D\.)?/,
      "",
    );
  assertEquals(
    stripCompanyAnswer(yes.factors.determination_text),
    stripCompanyAnswer(no.factors.determination_text),
    "the determination must be identical whatever the customer's perspective answer",
  );
  assertEquals(yes.exec_panel.disposition, no.exec_panel.disposition);
  assertEquals(yes.factors.recommended_outcome, no.factors.recommended_outcome);
});

Deno.test("v5.2 — banned register never appears in factor text", () => {
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

// ── Full rendering over the perfect fixtures ─────────────────────────────────

for (const c of CPPA_RISK_PERFECT) {
  Deno.test(`v5.2 — engine rendering — ${c.id}`, async (t) => {
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

    await t.step("factor appendices render", () => {
      // DOC 144: the necessity matrix folded into § 3.B (no appendix_b
      // section any more); the risk register appendix re-lettered to D.
      assert(!ids.includes("appendix_b"), "retired appendix_b section still renders");
      assert(ids.includes("appendix_c"), "the risk register appendix (id appendix_c, printed as Appendix D) is absent");
    });

    await t.step("necessity renders end-to-end (Annex T4)", () => {
      const rows = ((c.intake as Bag).a2_necessity_set ?? []) as Bag[];
      const unnecessary = rows.filter((r) =>
        r.necessity === "Collected but not necessary to the stated purpose"
      );
      assert(
        body.includes("The information provided supports the necessity of"),
        "T4 supported sentence absent",
      );
      if (unnecessary.length === 0) {
        assert(
          body.includes("The necessity analysis supports the information processed"),
          "all-necessary lead absent on an all-necessary fixture",
        );
      } else {
        // RE-PIN PANEL RISK-P1 (2026-08-30): the old sentence ("X is
        // collected but not shown to be necessary") put the element name in
        // subject position (plural elements broke agreement) and denied any
        // recorded contribution even when Appendix D printed one. Both
        // variants of the new family share this attribution spine.
        assert(
          body.includes("is not established") &&
            body.includes("records the element as collected but not necessary to the stated purpose"),
          "T4 unsupported paragraph absent",
        );
        assert(
          body.includes("The necessity analysis is qualified"),
          "qualified lead absent on a fixture with an unnecessary element",
        );
      }
      // DOC 144: the element-level determinations table renders inside
      // § 3.B itself (surface necessity_matrix), not as an appendix.
      assert(
        sk.document.sections.some((s) =>
          s.id === "iii_analysis" &&
          s.paragraphs.some((p) => p.table?.surface === "necessity_matrix")
        ),
        "in-body § 3.B necessity determinations table absent",
      );
    });

    await t.step("the risk ledger and T1 paragraphs render", () => {
      assert(body.includes("A. The Risk Ledger."), "§ 4.A head absent");
      assert(
        body.includes("before safeguards."),
        "T1 opening (level before safeguards) absent",
      );
      assert(
        body.includes("Before safeguards, the most serious identified risk stands at"),
        "risk rollup absent",
      );
      assert(
        body.includes("After the credits shown, the most serious remaining risk is"),
        "remaining-risk rollup absent",
      );
      assert(
        body.includes("This appendix provides the detailed factual register underlying § 4.A."),
        "risk-register appendix (Appendix D since DOC 144) intro absent",
      );
    });

    await t.step("benefit paragraphs and the benefits lead render (Annex T2)", () => {
      assert(
        body.includes("benefit carries material weight") || body.includes("benefit carries limited weight"),
        "T2 paragraph absent",
      );
      assert(
        body.includes("The strongest benefit established carries"),
        "benefits lead absent",
      );
    });

    await t.step("the determination renders once, with the outcome (Annex T5)", () => {
      assert(body.includes("Based on the information provided by the Company"), "re-registered conclusion absent");
      // At most three renders: the exec-summary lead, § 4.C, and the
      // Appendix A audit-trail row (the appendix is the trace, not a body
      // restatement).
      const occurrences = body.split("Based on the information provided by the Company").length - 1;
      assert(occurrences <= 3, `the determination conclusion renders ${occurrences} times`);
      assert(
        body.includes("The reasoning behind each row, and the determination it produces, appear in Section 4."),
        "exec determination pointer absent",
      );
      assert(body.includes("D. Outcome and Conditions."), "exec outcome head absent");
    });

    await t.step("the controls table and application render (§ 3.D)", () => {
      assert(body.includes("Control | Reported status | Weight credited"), "controls table columns absent");
      assert(
        body.includes("which weighs in the Company’s favor") || body.includes("carries no weight"),
        "controls directional close absent",
      );
    });

    await t.step("ADMT unit conclusions render iff ADMT", () => {
      assertEquals(
        body.includes("The automated component is adequately described for assessment purposes") ||
          body.includes("The automated component is not yet fully described"),
        isAdmt,
        `ADMT lead presence on ${c.id}`,
      );
    });

    await t.step("no factor markers or placeholders leak", () => {
      assert(!body.includes("[GENERATED"), "generated marker leaked");
      assert(!body.includes("{{"), "placeholder notation leaked");
      assert(!body.includes(String.fromCharCode(0)), "sentinel leaked");
    });

    await t.step("factor engine result is exposed with provenance", () => {
      assertEquals(sk.factor_engine.stamp, RISK_FACTOR_ENGINE_STAMP);
      assert(sk.factor_engine.composed_factor_ids.length >= 20, "expected a full v5.2 composition");
      assertEquals(
        sk.factor_engine.provenance.length >= sk.factor_engine.composed_factor_ids.length,
        true,
      );
    });
  });
}
