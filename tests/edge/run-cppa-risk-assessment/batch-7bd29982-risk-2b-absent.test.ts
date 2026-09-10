// BATCH 7bd29982 (2026-09-10) — Velostream Technologies Risk (1b431d09):
// § 2.B "How the Processing Operates" rendered its heading and the
// § 7152(a)(3)(A) governing requirement and then nothing — the record carried
// none of processing_entry_point / processing_methods / processing_result, and
// the engine's only branch was the populated one. The absent branch now states
// the limitation (Section 1's own promise) in the partial branch's shape.
// Same defect class the generator fix closes from the other side: the fixture
// skeleton never named those three keys, so every Claude fixture hit it.

import { assert, assertStringIncludes } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { runRiskFactorEngine } from "../../../supabase/functions/run-cppa-risk-assessment-v2/_local/ltp/risk-factor-engine.ts";
import { RISK52_FIXED } from "../../../supabase/functions/run-cppa-risk-assessment-v2/_local/prose/plans/cppa-risk.spine.ts";

type Bag = Record<string, unknown>;

const BASE: Bag = {
  processing_status: "Ongoing",
  benefit_consumer_identified: "Yes",
  a4_benefit_consumer: "Users receive relevant recommendations",
  a4_benefit_consumer_fact: "61% of users rated the experience as improving productivity",
  a5_harm_pathways: [{ harm: "(H) Psychological harms", likelihood: "Unlikely", severity: "Minimal", data_involved: "Contact identifiers", actor: "Internal analytics team", cause: "Over-notification" }],
};

const ABSENT =
  "The information provided does not describe how the processing operates: it does not identify how information enters the process, the processing stages, or what the processing produces; the limitation is carried into § 2.H.";

function run(intake: Bag) {
  return runRiskFactorEngine(intake as never, { scope_and_triggers: { narrative: [] } } as never, "2026-09-10");
}

Deno.test("7bd29982 — § 2.B states the limitation when none of the three processing facts is recorded", () => {
  const r = run(BASE);
  const seq = r.factors["operational_sequence"] ?? "";
  assertStringIncludes(seq, ABSENT);
  assert(!seq.includes(RISK52_FIXED.operates_lead), "the populated lead must not render on an empty record");
});

Deno.test("7bd29982 — the populated branch is unchanged when any of the three facts is recorded", () => {
  const r = run({ ...BASE, processing_entry_point: "Information enters when a consumer creates an account." });
  const seq = r.factors["operational_sequence"] ?? "";
  assertStringIncludes(seq, RISK52_FIXED.operates_lead);
  assertStringIncludes(seq, "Entry. “Information enters when a consumer creates an account”.");
  assertStringIncludes(seq, "The description does not identify the processing stages and what the processing produces; the limitation is carried into § 2.H.");
  assert(!seq.includes(ABSENT), seq);
});
