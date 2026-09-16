// Doc 261-review (2026-09-15, LEGAL 06 / EX 06) — MIRROR PARITY.
//
// The regulatory-exposure panel on the intake page resolves the § 7150(b)(3)
// prong through src/lib/admtDecisionMirror.ts, a front-end mirror of the
// categorical branch of the engine's resolver. This test enumerates every
// category subset × housing basis and pins the two verdicts to each other
// whenever at least one recognised category is selected, and pins the mirror
// to "unresolved" when none is (the engine's free-text fallback is
// deliberately not mirrored — see the mirror's header).

import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  HOUSING_DECISION_BASIS_OPTS,
  resolveAdmtSignificantDecision,
  SIGNIFICANT_DECISION_CATEGORY_OPTS,
} from "../../../supabase/functions/run-cppa-risk-assessment-v2/_local/ltp/admt-significant-decision.ts";
import { resolveAdmtDecisionMirror } from "../../../src/lib/admtDecisionMirror.ts";
import {
  HOUSING_DECISION_BASIS_OPTS as FE_HOUSING,
  SIGNIFICANT_DECISION_CATEGORY_OPTS as FE_CATS,
} from "../../../src/pages/CPPARiskAssessment.enums.ts";

Deno.test("admt decision mirror — the literals it keys on are the engine's literals", () => {
  assertEquals([...FE_CATS], [...SIGNIFICANT_DECISION_CATEGORY_OPTS]);
  assertEquals([...FE_HOUSING], [...HOUSING_DECISION_BASIS_OPTS]);
});

Deno.test("admt decision mirror — same class as the engine for every category subset × housing basis", () => {
  const cats = [...SIGNIFICANT_DECISION_CATEGORY_OPTS];
  const bases: (string | undefined)[] = [undefined, ...HOUSING_DECISION_BASIS_OPTS];
  let compared = 0;
  for (let mask = 1; mask < 1 << cats.length; mask++) {
    const selected = cats.filter((_, i) => mask & (1 << i));
    for (const basis of bases) {
      const engine = resolveAdmtSignificantDecision({
        q19a_decision_categories: selected,
        q19b_housing_basis: basis,
        q19_admt_description: "",
      });
      const mirror = resolveAdmtDecisionMirror({ q19a_decision_categories: selected, q19b_housing_basis: basis });
      assertEquals(mirror.cls, engine.cls, `subset ${JSON.stringify(selected)} basis ${basis}`);
      assertEquals([...mirror.categories], [...engine.categories], `categories for ${JSON.stringify(selected)}`);
      compared++;
    }
  }
  assertEquals(compared, ((1 << cats.length) - 1) * bases.length);
});

Deno.test("admt decision mirror — nothing selected is unresolved on the mirror (never a claim beyond the engine)", () => {
  assertEquals(resolveAdmtDecisionMirror({ q19a_decision_categories: [] }).cls, "unresolved");
  assertEquals(resolveAdmtDecisionMirror(undefined).cls, "unresolved");
  assertEquals(resolveAdmtDecisionMirror({ q19a_decision_categories: ["not a real option"] }).cls, "unresolved");
});
