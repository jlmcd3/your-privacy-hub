// DOC 275 §15 item 11 (CEO-approved 2026-09-19) — 11 CCR § 7152(a)(3)(C)-(D)
// require the assessment to state the scale of the processing. The
// consumer-scale block in risk-factor-engine.ts (II.C — "consumer_context")
// stated the general population band but never surfaced the intake's
// § 1798.140(d)(1)(B) operand, bought_sold_shared_count (the approximate
// number of California consumers or households whose personal information
// is sold or shared) — it was previously used only in the note-label map
// (grounded-note.ts:96). This test renders CPPA_RISK_PERFECT / a panel
// fixture through the SAME offline, deterministic call chain as
// tests/edge/ptest/determinism.test.ts (generateCppaRiskReport, pass-1
// deterministic, no network/database) and asserts the new sentence appears
// when the field is answered and the record's sell/share answer
// (q5_sell_share) engages it, and is absent when the key is removed.
//
// NOT RUN by this agent (hard rule: no `deno test`). Run with:
//   deno test -A tests/edge/run-cppa-risk-assessment/doc275-sold-shared-count.test.ts

import { assert, assertStringIncludes } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { reviewTextOf } from "../../../supabase/functions/ptest-run-driver/_local/review/determinism.ts";
import { generateCppaRiskReport } from "../../../supabase/functions/run-cppa-risk-assessment-v2/_local/ltp/generate-cppa-risk.ts";
import { PANEL_CPPA_RISK } from "../../../src/lib/ptestPanels/cppa-risk.ts";

type Bag = Record<string, unknown>;

const REPORT_DATE = "2031-03-05"; // injected, matches the determinism-test convention (not "today")

async function genRisk(intake: Bag, reportDate: string): Promise<Bag> {
  const gen = await generateCppaRiskReport(intake, {
    buildStamp: "doc275-sold-shared-count-test",
    runId: "doc275-sold-shared-count-test",
    mode: "enforce",
    pass1: "deterministic",
    pass2rEnabled: false,
    refinementEnabled: false,
    euCorpus: [],
    reportDate,
  });
  return gen.report as Bag;
}

// p01 — "Wrenfield Mercantile Co.": q5_sell_share "Yes — share for
// advertising only" (engages the trigger) and bought_sold_shared_count
// "250,000 to under 1,000,000" (answered). A positive, engaged case.
const P01 = PANEL_CPPA_RISK.find((f) => f.id === "cppa-risk-p01-retail-loyalty-share");
assert(P01, "expected panel fixture cppa-risk-p01-retail-loyalty-share to exist");
const P01_INTAKE = P01!.intake as Bag;
assert(
  P01_INTAKE.bought_sold_shared_count === "250,000 to under 1,000,000",
  "fixture assumption drifted: p01 bought_sold_shared_count band changed",
);
assert(
  P01_INTAKE.q5_sell_share === "Yes — share for advertising only",
  "fixture assumption drifted: p01 q5_sell_share answer changed",
);

const EXPECTED_SENTENCE =
  "The Company reports that it sells or shares the personal information of 250,000 to under 1,000,000 California consumers.";

Deno.test("doc275 item 11 — the sold/shared-count sentence renders with the fixture's band when the field is answered and sell/share engages it", async () => {
  const report = await genRisk(P01_INTAKE, REPORT_DATE);
  const { text } = reviewTextOf(report);
  assertStringIncludes(text, EXPECTED_SENTENCE);
  assert(!text.includes("undefined"), "reviewer text must not contain the literal token 'undefined'");
  assert(!text.includes("{"), "reviewer text must not contain a stray '{' from an unsubstituted template slot");
});

Deno.test("doc275 item 11 — the sentence is absent when bought_sold_shared_count is not on the record", async () => {
  const { bought_sold_shared_count: _omit, ...withoutCount } = P01_INTAKE;
  const report = await genRisk(withoutCount, REPORT_DATE);
  const { text } = reviewTextOf(report);
  assert(
    !text.includes("sells or shares the personal information of"),
    "the sentence must not render once bought_sold_shared_count is removed from the record",
  );
  assert(!text.includes("undefined"), "reviewer text must not contain the literal token 'undefined'");
  assert(!text.includes("{"), "reviewer text must not contain a stray '{' from an unsubstituted template slot");
});

Deno.test("doc275 item 11 — the sentence is absent when the field is answered but sell/share is 'No' (unengaged)", async () => {
  const unengaged: Bag = { ...P01_INTAKE, q5_sell_share: "No", q5c_share_revenue_50pct: undefined };
  const report = await genRisk(unengaged, REPORT_DATE);
  const { text } = reviewTextOf(report);
  assert(
    !text.includes("sells or shares the personal information of"),
    "the sentence must not render when q5_sell_share does not affirm selling or sharing",
  );
});
