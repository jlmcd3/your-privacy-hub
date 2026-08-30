// Typed-operand pins — Spine v5.2 (carried from the RK3-D Class C→B
// conversion, doc 33).
//
// Pins: (a) enum parity between the form's option sets and the intake
// contract's verbatim copies, (b) the v5.2 branch frames over the typed
// operands, (c) honest absence — a record without the typed operands never
// composes an operand-gated factor, (d) the reserved-id law, and (e) full
// rendering over both perfect fixtures, including the Appendix A matrix.

import {
  assert,
  assertEquals,
} from "https://deno.land/std@0.224.0/assert/mod.ts";
import { generateCppaRiskReport } from "../../../supabase/functions/run-cppa-risk-assessment-v2/_local/ltp/generate-cppa-risk.ts";
import { EMPTY_RISK_CORPUS } from "../../../supabase/functions/run-cppa-risk-assessment-v2/_local/ltp/risk-corpus.ts";
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

const BUILD_STAMP = "v52-typed-operand-pins";
const REPORT_STUB = {
  scope_and_triggers: { narrative: ["Engaged — Section 7150(b)(1): sale or sharing."] },
};

// ── (a) form ↔ contract option parity ────────────────────────────────────────

Deno.test("v5.2 — form and contract option sets are byte-identical", () => {
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

Deno.test("v5.2 — only placeholder-less ids remain reserved, and none composes", () => {
  assertEquals([...RISK_FACTOR_CLASS_C_IDS], ["prior_assessment_analysis"]);
  for (const c of CPPA_RISK_PERFECT) {
    const out = runRiskFactorEngine(c.intake as Bag, REPORT_STUB, "2026-08-19");
    for (const id of out.composed_factor_ids) {
      assert(!RISK_FACTOR_CLASS_C_IDS.includes(id), `reserved id composed: ${id}`);
    }
  }
});

// ── (b) branch-frame pins over the typed operands ────────────────────────────

Deno.test("v5.2 — purpose-specificity branches follow the facet count", () => {
  const base = CPPA_RISK_PERFECT[0].intake as Bag;
  const withFacets = (facets: string[]): Bag => ({ ...base, purpose_specificity_facts: facets });

  const full = runRiskFactorEngine(withFacets([
    "The specific product, service, or operation the processing supports",
    "The categories of personal information involved",
    "The categories of consumers affected",
  ]), REPORT_STUB, "2026-08-19");
  assert(
    full.factors.purpose_specificity_analysis.includes("the assessment proceeds on the Company’s formulation"),
    "3 facets must land the confirmed branch",
  );

  const partial = runRiskFactorEngine(
    withFacets(["The categories of consumers affected"]),
    REPORT_STUB,
    "2026-08-19",
  );
  assert(
    partial.factors.purpose_specificity_analysis.includes("it does not confirm the remaining facets"),
    "1 facet lands the qualified branch",
  );
  assert(
    partial.factors.purpose_specificity_analysis.includes("sharpening the Purpose appears among the Follow-ups"),
    "1 facet routes a follow-up",
  );

  const none = runRiskFactorEngine(withFacets(["None of the above"]), REPORT_STUB, "2026-08-19");
  assert(
    none.factors.purpose_specificity_analysis.includes("restating the Purpose appears among the Conditions to Proceed"),
    "None branch routes a condition",
  );
  assert(
    none.factors.conditions_to_proceed.includes("Restate the processing purpose"),
    "None branch must route a condition into § 4.D",
  );
});

Deno.test("v5.2 — expectation markers × notice coverage", () => {
  const base = CPPA_RISK_PERFECT[0].intake as Bag;
  const marked = runRiskFactorEngine({
    ...base,
    expectation_check: ["Information is combined with information from other sources"],
  }, REPORT_STUB, "2026-08-19");
  assert(
    marked.factors.expectation_application.includes("each is disclosed through the notice posture"),
    "marker + full notice → divergent-but-disclosed",
  );

  const noNotice = runRiskFactorEngine({
    ...base,
    expectation_check: ["Information is combined with information from other sources"],
    q12_notice_at_collection: "No",
  }, REPORT_STUB, "2026-08-19");
  assert(
    noNotice.factors.expectation_application.includes("weighs against the processing"),
    "marker without notice → adverse routing",
  );

  const clean = runRiskFactorEngine({
    ...base,
    expectation_check: ["None of the above apply"],
  }, REPORT_STUB, "2026-08-19");
  assert(
    clean.factors.expectation_application.includes("no divergence marker the assessment checks applies"),
    "no markers → consistent, favorable",
  );
});

Deno.test("v5.2 — human review: the three-element credit pattern", () => {
  const base = CPPA_RISK_PERFECT[0].intake as Bag;
  const all3 = runRiskFactorEngine(base, REPORT_STUB, "2026-08-19");
  assert(
    all3.factors.admt_human_review.includes("credited at full weight"),
    "all three elements → full credit",
  );

  const partial = runRiskFactorEngine({
    ...base,
    human_review_facts: ["Reviewers have authority to change or overrule the decision"],
  }, REPORT_STUB, "2026-08-19");
  assert(
    partial.factors.admt_human_review.includes("it does not confirm that reviewers"),
    "partial confirmation names the missing elements",
  );
  assert(
    partial.factors.admt_human_review.includes("only to the confirmed extent"),
    "partial confirmation is credited only to the confirmed extent",
  );

  const noneRun = runRiskFactorEngine({
    ...base,
    human_review_facts: ["There is no human review"],
  }, REPORT_STUB, "2026-08-19");
  assert(
    noneRun.factors.admt_human_review.includes("there is no human review"),
    "no-review branch states the absence",
  );
});

Deno.test("v5.2 — undocumented ADMT logic routes a condition", () => {
  const base = CPPA_RISK_PERFECT[0].intake as Bag;
  const bad = runRiskFactorEngine({
    ...base,
    admt_logic_documented: "The logic is not fully documented or understood",
  }, REPORT_STUB, "2026-08-19");
  assert(bad.factors.admt_logic_note.includes("not fully documented or understood"));
  assert(bad.factors.conditions_to_proceed.includes("Document the logic"));
});

Deno.test("v5.2 — compounding is a closer and a con-factor, never level arithmetic", () => {
  const base = CPPA_RISK_PERFECT[0].intake as Bag;
  const withOut = runRiskFactorEngine({ ...base, risk_interdependency_check: "The identified risk pathways operate independently", compounding_pathways: [] }, REPORT_STUB, "2026-08-19");
  const withComp = runRiskFactorEngine(base, REPORT_STUB, "2026-08-19"); // fixture answers compounding
  assert(withComp.factors.risk_paragraphs.includes("could compound each other"));
  assert(withComp.factors.factors_against.includes("Identified risks could compound"));
  assert(!withOut.factors.risk_paragraphs.includes("could compound each other"));
  // Levels and the determination are identical either way (no arithmetic).
  assertEquals(withComp.factors.risk_rollup, withOut.factors.risk_rollup);
  assertEquals(withComp.factors.determination_text, withOut.factors.determination_text);
});

// ── (c) honest absence — operand-gated factors never compose bare ────────────

Deno.test("v5.2 — a record without the typed operands never composes an operand-gated factor", () => {
  const TYPED_KEYS = [
    "purpose_specificity_facts",
    "out_of_scope_confirmation",
    "out_of_scope_activities",
    "expectation_check",
    "choice_architecture_check",
    "admt_logic_documented",
    "vendor_dependency",
    "essential_vendors",
  ];
  const OPERAND_GATED = new Set([
    "purpose_specificity",
    "out_of_scope",
    "expectation_application",
    "choice_architecture",
    "admt_logic_note",
  ]);
  for (const c of CPPA_RISK_PERFECT) {
    const stripped: Bag = { ...(c.intake as Bag) };
    for (const k of TYPED_KEYS) delete stripped[k];
    // Row children too.
    stripped.recipients = (stripped.recipients as Bag[] ?? []).map((r) => {
      const { contractual_protections: _c, ...rest } = r;
      return rest;
    });
    const out = runRiskFactorEngine(stripped, REPORT_STUB, "2026-08-19");
    for (const id of out.composed_factor_ids) {
      assert(!OPERAND_GATED.has(id), `operand-gated factor composed without its operand: ${id}`);
    }
  }
});

// ── taxonomy single custody ──────────────────────────────────────────────────

Deno.test("v5.2 — SPI membership has single custody in ca-pi-taxonomy.ts", () => {
  const expected = Object.entries(CA_PI_TAXONOMY).filter(([, r]) => r.spi).map(([k]) => k);
  assertEquals([...CA_SPI_CATEGORY_KEYS].sort(), expected.sort());
  assertEquals(CA_SPI_CATEGORY_KEYS.length, 9);
  assert(CA_SPI_CATEGORY_KEYS.includes("Precise geolocation (GPS-level / specific address)"));
});

// ── (e) full rendering over the perfect fixtures ─────────────────────────────

for (const c of CPPA_RISK_PERFECT) {
  Deno.test(`v5.2 — typed-operand rendering — ${c.id}`, async (t) => {
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

    await t.step("conformance and register stay clean", () => {
      assertEquals(sk.conformance.length, 0, JSON.stringify(sk.conformance));
      assertEquals(sk.register_findings.length, 0, JSON.stringify(sk.register_findings));
    });

    await t.step("§ 2.A specificity and scope render", () => {
      assert(body.includes("The Company confirms the stated Purpose identifies"), "specificity branch absent");
    });

    await t.step("§ 2 operational sequence and context render", () => {
      assert(body.includes("As the Company describes it, the processing runs as one sequence:"), "operational sequence absent");
      assert(body.includes("Entry."), "Entry label absent");
      assert(body.includes("Output."), "Output label absent");
      assert(body.includes("C. Consumers and the Interaction."), "consumer context absent");
      assert(body.includes("E. Sources."), "sources analysis absent");
    });

    await t.step("§ 2.F recipients table and § 2.G retention render", () => {
      assert(
        body.includes("Recipient | Role | Information made available | Purpose of the disclosure | Contract status"),
        "recipients table columns absent",
      );
      assert(
        body.includes("Information category | Retention period or criterion"),
        "retention table columns absent",
      );
    });

    await t.step("§ 3.C notice, expectations, and choice architecture render", () => {
      assert(body.includes("notice posture"), "notice application absent");
      assert(body.includes("The Company confirms") && body.includes("declining"), "choice-architecture analysis absent");
    });

    await t.step("§ 3.E typed analyses render iff ADMT", () => {
      assertEquals(body.includes("It classifies the system as"), isAdmt, "role analysis gating");
      assertEquals(body.includes("confirms that reviewers"), isAdmt, "human-review analysis gating");
    });

    await t.step("§ 4.A compounding closer renders from the typed answer", () => {
      if (isSierra) {
        assert(body.includes("could compound each other"), "compounding closer absent on Sierra");
      } else {
        assert(!body.includes("could compound each other"), "compounding closer leaked on Locus");
      }
    });

    await t.step("§ 4.A T1 safeguard branches render", () => {
      assert(
        body.includes("implemented and tested") ||
          body.includes("recognizes the control") ||
          body.includes("recognizes the controls") ||
          body.includes("planned but not yet operating") ||
          body.includes("No safeguard in the information provided"),
        "no T1 safeguard branch rendered",
      );
    });

    await t.step("§ 4.B reference lists render", () => {
      assert(body.includes("Weighing in favor of the Activity:"), "factors-for list absent");
      assert(body.includes("Weighing against the Activity:"), "factors-against list absent");
    });

    await t.step("Appendix A carries the factor/determination/authority matrix", () => {
      assert(
        body.includes("Appendix A — Factor, Determination, and Authority Matrix"),
        "Appendix A title absent",
      );
      assert(body.includes("Necessity and minimization"), "Appendix A necessity row absent");
      assert(body.includes("11 CCR § 7152(a)(2)"), "Appendix A authority citation absent");
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
