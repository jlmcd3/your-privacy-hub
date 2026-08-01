// GRADER-1 unit tests:
//  * Task 4 — qc_r1_1 per-field co-occurrence (batch 4d54f360 pattern:
//    M4 resolved + M7 hedge in a DIFFERENT admt rationale field = PASS;
//    hedge in the SAME field as a resolved-test conclusion = FAIL).
//  * Task 6(a) — T-5 TEST-STATES leak detector catches the space-form
//    RESOLVED tokens, bare test ids in prose, and "M\d+ is RESOLVED"
//    word order.

import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  collectRationaleEntries,
  evaluateResolvedHedgePerField,
} from "../../../supabase/functions/run-quality-batch/_local/grader/qc-r1-per-field.ts";
import { detectTestStatesLeak } from "../../../supabase/functions/_shared/cppa-test-states.ts";

const HEDGE = /(cannot be determined|cannot determine|unable to (?:confirm|verify|resolve)|please (?:confirm|verify|clarify)|to (?:be )?confirm(?:ed)?|pending confirmation|no basis to assess|insufficient (?:basis|information))/i;

Deno.test("qc_r1_1: M4 resolved + M7 hedge in a DIFFERENT admt rationale field PASSES", () => {
  // Reproduces batch 4d54f360 doc 154975b2: M4 is RESOLVED (concluded
  // elsewhere), M7 is INDETERMINATE and hedged only inside the ADMT
  // rationale. Different fields → per-field evaluator must PASS.
  const report = {
    cybersecurity_audit_rationale:
      "the § 7120(b)(2)(B) sensitive-PI threshold is met: sensitive-PI volume exceeds 50,000. The M4 conclusion is stated as concluded.",
    cross_tool_recommendations: {
      admt_assessment_rationale:
        "Whether ADMT is engaged cannot be determined on the current record pending resolution of the contradiction described above.",
    },
  };
  const entries = collectRationaleEntries(report);
  const res = evaluateResolvedHedgePerField(
    entries,
    ["M4"],
    { M4: ["q15_sensitive_pi", "q15c_spi_volume"] },
    HEDGE,
  );
  assertEquals(res.passed, true, `expected PASS but got: ${res.evidence}`);
});

Deno.test("qc_r1_1: hedge in the SAME field as a resolved-test conclusion FAILS", () => {
  const report = {
    cybersecurity_audit_rationale:
      "The M4 sensitive-PI threshold is met; however this cannot be determined on the current record.",
  };
  const entries = collectRationaleEntries(report);
  const res = evaluateResolvedHedgePerField(
    entries,
    ["M4"],
    { M4: ["q15_sensitive_pi", "q15c_spi_volume"] },
    HEDGE,
  );
  assertEquals(res.passed, false);
  assert(String(res.evidence).includes("M4"));
});

Deno.test("qc_r1_1: hedge in field co-occurring with a resolved source_field FAILS", () => {
  const report = {
    scope_analysis: {
      basis:
        "The intake records q15c_spi_volume; the exact figure cannot be determined on the current record.",
    },
  };
  const entries = collectRationaleEntries(report);
  const res = evaluateResolvedHedgePerField(
    entries,
    ["M4"],
    { M4: ["q15_sensitive_pi", "q15c_spi_volume"] },
    HEDGE,
  );
  assertEquals(res.passed, false);
});

// --- Task 6(a) leak detector coverage ---------------------------------------

Deno.test("T-5 leak: 'RESOLVED MET' space form is caught", () => {
  const hits = detectTestStatesLeak("the sensitive-PI prong is RESOLVED MET on the current record");
  assert(hits.length > 0, "expected a leak hit for space-form RESOLVED MET");
});

Deno.test("T-5 leak: 'RESOLVED NOT MET' space form is caught", () => {
  const hits = detectTestStatesLeak("the 50%-from-sale/share prong is RESOLVED NOT MET");
  assert(hits.length > 0);
});

Deno.test("T-5 leak: 'RESOLVED NOT APPLICABLE' space form is caught", () => {
  const hits = detectTestStatesLeak("the sensitive-PI prong is RESOLVED NOT APPLICABLE here");
  assert(hits.length > 0);
});

Deno.test("T-5 leak: bare test id 'M4' in prose is caught", () => {
  const hits = detectTestStatesLeak("As documented above, M4 supports the conclusion.");
  assert(hits.some(h => h.match === "M4"), `expected a bare-M4 hit; got: ${JSON.stringify(hits)}`);
});

Deno.test("T-5 leak: 'M-CA' and 'M-GDPR' bare ids in prose are caught", () => {
  const a = detectTestStatesLeak("The M-CA determination follows.");
  const b = detectTestStatesLeak("The M-GDPR determination follows.");
  assert(a.some(h => h.match === "M-CA"));
  assert(b.some(h => h.match === "M-GDPR"));
});

Deno.test("T-5 leak: 'M4 is RESOLVED' word-order is caught", () => {
  const hits = detectTestStatesLeak("M4 is RESOLVED on the current record.");
  assert(hits.length > 0);
});

Deno.test("T-5 leak: clean human-phrasing prose has no hits", () => {
  const hits = detectTestStatesLeak(
    "The § 7120(b)(2)(B) sensitive-PI threshold is met: the intake records sensitive-PI volume at 50,000 or more.",
  );
  assertEquals(hits.length, 0);
});
