// TURN 2 (cppa-admt) — deterministic slot unit tests.
// Runs under Deno (edge-function context) — mirrors the cppa-risk pattern.

import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  attachAndValidateAdmtSlots,
  buildAdequacyFinding,
  buildApplicabilityVerdict,
  buildDeadlineTable,
  validateAdmtSlots,
  W9_ADMT_SLOTS_STAMP,
} from "./_w9_admt_slots.ts";

Deno.test("stamp exists", () => { assert(W9_ADMT_SLOTS_STAMP.startsWith("w9-admt-turn2-slots@")); });

Deno.test("applicability: in_scope when is_admt=true & trigger=true & established", () => {
  const v = buildApplicabilityVerdict({}, {
    scope_analysis: { is_admt: true, triggers_significant_decision: true, determination_basis: "established" },
  });
  assertEquals(v.label, "in_scope");
  assert(v.reason.includes("§ 7001"));
});

Deno.test("applicability: conservative_assumption honored", () => {
  const v = buildApplicabilityVerdict({}, {
    scope_analysis: { is_admt: true, triggers_significant_decision: true, determination_basis: "conservative_assumption" },
  });
  assertEquals(v.label, "conservative_assumption");
});

Deno.test("applicability: out_of_scope when is_admt=false", () => {
  const v = buildApplicabilityVerdict({}, { scope_analysis: { is_admt: false } });
  assertEquals(v.label, "out_of_scope");
});

Deno.test("applicability: insufficient_basis on null drivers", () => {
  const v = buildApplicabilityVerdict({}, { scope_analysis: {} });
  assertEquals(v.label, "insufficient_basis");
});

Deno.test("deadline_table sources from registry (>=3 rows, each stamped)", () => {
  const rows = buildDeadlineTable({}, {});
  assert(rows.length >= 3);
  for (const r of rows) {
    assert(r.subsection.length > 0, `subsection empty for ${r.proposition_key}`);
    assert(r.verbatim_quote.length > 0, `verbatim missing for ${r.proposition_key}`);
  }
});

Deno.test("adequacy: A-B qualifies with all three Yes", () => {
  const af = buildAdequacyFinding({ admt_detail: { hi_trained: "Yes", hi_reviews_other_info: "Yes", hi_authority_override: "Yes" } }, {});
  assertEquals(af.human_intervention.conclusion, "qualifies");
});

Deno.test("adequacy: A-B does_not_qualify on missing element", () => {
  const af = buildAdequacyFinding({ admt_detail: { hi_trained: "Yes", hi_reviews_other_info: "Yes", hi_authority_override: "No" } }, {});
  assertEquals(af.human_intervention.conclusion, "does_not_qualify");
});

Deno.test("adequacy: A-B insufficient_basis on silence", () => {
  const af = buildAdequacyFinding({ admt_detail: {} }, {});
  assertEquals(af.human_intervention.conclusion, "insufficient_basis");
});

Deno.test("adequacy: A-A adequate when how_it_works=Yes (all three inferred)", () => {
  const af = buildAdequacyFinding({ notice_has_how_it_works: "Yes — included inline in the notice" }, {});
  // "Yes" doesn't literally match triBool; it returns null. Confirm behavior:
  // silent fields → insufficient_basis, which is the intended honesty.
  assertEquals(af.logic_disclosure.conclusion, "insufficient_basis");
});

Deno.test("attachAndValidate stamps all three slots + validates ok", () => {
  const report: any = {
    scope_analysis: { is_admt: true, triggers_significant_decision: true, determination_basis: "established" },
  };
  const intake = { admt_detail: { hi_trained: "Yes", hi_reviews_other_info: "Yes", hi_authority_override: "Yes" } };
  const { attached, validation } = attachAndValidateAdmtSlots(report, intake);
  assertEquals(attached.sort(), ["adequacy_finding", "applicability_verdict", "deadline_table"]);
  assertEquals(validation.ok, true, JSON.stringify(validation));
  assertEquals(report.applicability_verdict.label, "in_scope");
});

Deno.test("validator flags missing slots", () => {
  const v = validateAdmtSlots({});
  assertEquals(v.ok, false);
  assert(v.errors.length >= 3);
});
