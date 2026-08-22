// PN-CORPUS-L-RISK-1 (2026-08-22) — § 7150(b)(2)(A) personnel carve-out.
// Covers the new special-cased G.applicability.sensitive_pi branch in
// gate-eval.ts and the composer's exempt-template routing. The prior
// behavior (sensitive PI answered → trigger engaged, carve-out ignored)
// is the exact defect the FSOR position (cppa_fsor_commentary
// a2ce1f02-…) said the Agency legislated away; these tests pin the
// corrected tree.

import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { evaluateCppaRiskGates } from "../../../supabase/functions/run-cppa-risk-assessment/_local/ltp/gate-eval.ts";
import { PASS2_TEMPLATES } from "../../../supabase/functions/run-cppa-risk-assessment/_local/ltp/content/pass2-templates.ts";

const CARVEOUT_YES = "Yes — solely for those personnel purposes";

function spiOutcome(intake: Record<string, unknown>) {
  const outcomes = evaluateCppaRiskGates(intake);
  const g = outcomes.find((o) => o.gate_id === "G.applicability.sensitive_pi");
  assert(g, "G.applicability.sensitive_pi outcome missing");
  return g!;
}

Deno.test("b2a — sensitive PI without the carve-out still engages (b)(2)", () => {
  assertEquals(spiOutcome({ q15_sensitive_pi: "Yes" }).outcome, "pass");
});

Deno.test("b2a — carve-out answered No keeps (b)(2) engaged", () => {
  assertEquals(
    spiOutcome({
      q15_sensitive_pi: "Yes",
      q15d_hr_carveout: "No — processed for other purposes as well",
    }).outcome,
    "pass",
  );
});

Deno.test("b2a — carve-out answered Not-applicable keeps (b)(2) engaged", () => {
  assertEquals(
    spiOutcome({
      q15_sensitive_pi: "Yes",
      q15d_hr_carveout: "Not applicable — no employee or contractor sensitive PI",
    }).outcome,
    "pass",
  );
});

Deno.test("b2a — solely-personnel carve-out blocks (b)(2) with the (b)(2)(A) reason", () => {
  const g = spiOutcome({ q15_sensitive_pi: "Yes", q15d_hr_carveout: CARVEOUT_YES });
  assertEquals(g.outcome, "block");
  assert(
    (g.reason ?? "").includes("7150(b)(2)(A)"),
    "block reason must carry the (b)(2)(A) marker the composer keys off",
  );
});

Deno.test("b2a — no sensitive PI on the record blocks regardless of the carve-out answer", () => {
  assertEquals(
    spiOutcome({ q15_sensitive_pi: "No", q15d_hr_carveout: CARVEOUT_YES }).outcome,
    "block",
  );
});

Deno.test("b2a — q15 absent entirely stays not_applicable (legacy records unchanged)", () => {
  assertEquals(spiOutcome({}).outcome, "not_applicable");
});

Deno.test("b2a — the polarity inversion is dead: answering the carve-out can never CREATE the trigger", () => {
  // Under the old generic any-positive-passes rule, a record with
  // q15_sensitive_pi negative but a non-empty carve-out field would have
  // PASSED the gate — the exact inverted-polarity defect. Assert it's gone
  // for every carve-out option.
  for (const opt of [
    CARVEOUT_YES,
    "No — processed for other purposes as well",
    "Not applicable — no employee or contractor sensitive PI",
  ]) {
    const g = spiOutcome({ q15_sensitive_pi: "No", q15d_hr_carveout: opt });
    assertEquals(g.outcome, "block", `carve-out option "${opt}" must not create the trigger`);
  }
});

Deno.test("b2a — the exempt template exists, keys the same slots as its siblings, and states the exemption", () => {
  const t = PASS2_TEMPLATES["T.risk.applicability.exempt_b2a"];
  assert(t, "T.risk.applicability.exempt_b2a missing from PASS2_TEMPLATES");
  assertEquals([...t.citation_slots], ["PINPOINT"]);
  assertEquals([...t.plan_slots], ["prong_subject"]);
  assert(t.text.startsWith("Not engaged — "), "must join the engine's Not-engaged narrative family");
  assert(t.text.includes("7150(b)(2)(A)"), "must cite the carve-out subsection");
  assert(t.text.includes("solely and specifically"), "must carry the regulation's own exclusivity standard");
  assert(t.text.length <= t.max_chars, "template text exceeds its own max_chars");
});
