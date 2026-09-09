// DOC 231A (2026-09-08) — pins the CORRECTED `FACTOR_SECTION` table
// (hook-join.ts), closing doc 231 build-log NEED #9. Every value below was
// checked this session against the OAL-approved regulation text
// (`provision_texts`, project 75bce9a1-c7dc-4628-aea5-12baa2e26bf2,
// read-only) — the doc 231A follow-up log carries the full verification
// table (verified / corrected, with the regulation-text reasoning for each
// of the nine corrected rows). This test exists so a future edit to
// FACTOR_SECTION cannot silently regress a citation without a battery
// failure naming exactly which row moved.

import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { FACTOR_SECTION } from "../../../supabase/functions/run-cppa-risk-assessment-v2/_local/ltp/hook-join.ts";

Deno.test("FACTOR_SECTION: the corrected 17-row table, pinned", () => {
  assertEquals(FACTOR_SECTION, {
    "Regulatory trigger and applicability": "§ 7150",
    "Material privacy risks": "§ 7152(a)(5)",
    "Processing purpose specificity": "§ 7152(a)(1)",
    "Safeguards": "§ 7152(a)(6)",
    "Approval and authority": "§ 7152(a)(9)",
    "Stakeholder involvement and information providers": "§ 7151",
    "Processing methods and coherence": "§ 7152(a)(3)(A)",
    "Retention": "§ 7152(a)(3)(B)",
    "Consumer interaction and scale": "§ 7152(a)(3)(C), (D)",
    "Transparency and disclosures": "§ 7152(a)(3)(E)",
    "Consumer benefit": "§ 7152(a)(4)",
    "ADMT made available to another business": "§ 7153",
    "Benefits-risks balancing": "§ 7154",
    "Assessment timing and material changes": "§ 7155(a)",
    "Assessment retention": "§ 7155(c)",
    "Prior DPIA or other assessment": "§ 7156",
    "CPPA submission and certifying executive": "§ 7157",
  });
});

// Row-by-row evidence for the nine corrections (regression tripwires — each
// asserts the CORRECT provision AND that the WRONG one from the prior
// build's best-effort table is no longer cited for that factor).

Deno.test("FACTOR_SECTION: Approval and authority is (a)(9) (review/approval + authority-to-decide), never (a)(8) (information providers)", () => {
  assertEquals(FACTOR_SECTION["Approval and authority"], "§ 7152(a)(9)");
});

Deno.test("FACTOR_SECTION: Retention is (a)(3)(B) (the retention-period operational element), never bare (a)(2) (PI categories)", () => {
  assertEquals(FACTOR_SECTION["Retention"], "§ 7152(a)(3)(B)");
});

Deno.test("FACTOR_SECTION: Consumer interaction and scale is (a)(3)(C),(D), never bare (a)(2)", () => {
  assertEquals(FACTOR_SECTION["Consumer interaction and scale"], "§ 7152(a)(3)(C), (D)");
});

Deno.test("FACTOR_SECTION: ADMT made available to another business is § 7153 (the section titled exactly that), never (a)(3)(G) (a different ADMT duty)", () => {
  assertEquals(FACTOR_SECTION["ADMT made available to another business"], "§ 7153");
});

Deno.test("FACTOR_SECTION: CPPA submission and certifying executive is § 7157 (\"Submission of Risk Assessments to the Agency\"), never § 7153", () => {
  assertEquals(FACTOR_SECTION["CPPA submission and certifying executive"], "§ 7157");
});

Deno.test("FACTOR_SECTION: Prior DPIA or other assessment is § 7156 (comparable-set / other-law reuse), never (a)(9) (Approval, a different factor)", () => {
  assertEquals(FACTOR_SECTION["Prior DPIA or other assessment"], "§ 7156");
});

Deno.test("FACTOR_SECTION: Assessment retention is § 7155(c) (the five-year/duration-of-processing retention duty), never § 7156", () => {
  assertEquals(FACTOR_SECTION["Assessment retention"], "§ 7155(c)");
});

Deno.test("FACTOR_SECTION: no two factors resolve to the same section string (each of the 17 has its own distinct pinpoint)", () => {
  const values = Object.values(FACTOR_SECTION);
  assertEquals(values.length, new Set(values).size);
});
