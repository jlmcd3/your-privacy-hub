// DOC 232 — buildDpiaRuleStates (rule-states.ts). Tests the TypedStateBag
// projection: intake closed-list atoms, the `reasons_to_conduct` slug
// booleans, the engagement-map `state:engagement_map.*` projection, and the
// obligation/adequacy verdict proxy — including the load-bearing
// "passes"/"uncertain"/"fails" vocabulary this file's own doc comment
// explains (isPassingVerdict, hook-types.ts, is hardcoded to those two exact
// passing strings).

import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { isPassingVerdict } from "../../../supabase/functions/_shared/corpus/hook-types.ts";
import { buildDpiaRuleStates } from "../../../supabase/functions/run-dpia-framework/_local/ltp/dpia-deliverables/rule-states.ts";
import type { EngagementMap } from "../../../supabase/functions/_shared/engagement-map.ts";

function emptyMap(): EngagementMap {
  return { version: "v1", tool: "dpia_framework", generated_at: new Date().toISOString(), entries: [] };
}

Deno.test("doc232 — verdicts.obligation/adequacy use isPassingVerdict's own passing vocabulary", () => {
  const intake = {
    reasons_to_conduct: ["Systematic monitoring (of employees, a defined population, or a non-public space)"],
    necessity_proportionality: "A necessity and proportionality analysis substantive enough to pass the usability threshold.",
    alternatives_considered: [{ rejection_reason: "manual review was costed and rejected as unworkable at this volume" }],
  };
  const states = buildDpiaRuleStates({}, intake, emptyMap());
  assertEquals(isPassingVerdict(states.verdicts.adequacy), true);
});

Deno.test("doc232 — an Art. 35(3) reasons_to_conduct selection yields verdicts.obligation = 'passes'", () => {
  const intake = { reasons_to_conduct: ["Large-scale systematic monitoring of a public area (Art. 35(3)(c))"] };
  const states = buildDpiaRuleStates({}, intake, emptyMap());
  assertEquals(states.verdicts.obligation, "passes");
  assertEquals(isPassingVerdict(states.verdicts.obligation), true);
});

Deno.test("doc232 — a WP248-only reason (no Art. 35(3) option) yields verdicts.obligation = 'uncertain'", () => {
  const intake = { reasons_to_conduct: ["Innovative use of new technology"] };
  const states = buildDpiaRuleStates({}, intake, emptyMap());
  assertEquals(states.verdicts.obligation, "uncertain");
});

Deno.test("doc232 — no reasons recorded yields verdicts.obligation = 'fails' (discretionary)", () => {
  const states = buildDpiaRuleStates({}, {}, emptyMap());
  assertEquals(states.verdicts.obligation, "fails");
  assertEquals(isPassingVerdict(states.verdicts.obligation), false);
});

Deno.test("doc232 — engagement map R_ART_35_3_A engaged also yields verdicts.obligation = 'passes'", () => {
  const map: EngagementMap = {
    version: "v1",
    tool: "dpia_framework",
    generated_at: new Date().toISOString(),
    entries: [
      { rule_id: "R_ART_35_3_A_AUTOMATED_DECISIONS", name: "x", status: "engaged", rationale: "r", intake_signals: [] },
    ],
  };
  const states = buildDpiaRuleStates({}, {}, map);
  assertEquals(states.verdicts.obligation, "passes");
});

Deno.test("doc232 — every engagement-map entry is projected as a state:engagement_map.<rule_id> atom", () => {
  const map: EngagementMap = {
    version: "v1",
    tool: "dpia_framework",
    generated_at: new Date().toISOString(),
    entries: [
      { rule_id: "R_WP248_CHILDREN", name: "x", status: "engaged", rationale: "r", intake_signals: [] },
      { rule_id: "R_WP248_INNOVATIVE_TECH", name: "y", status: "not_engaged", rationale: "r", intake_signals: [] },
    ],
  };
  const states = buildDpiaRuleStates({}, {}, map);
  assertEquals(states.states["engagement_map.R_WP248_CHILDREN"], "engaged");
  assertEquals(states.states["engagement_map.R_WP248_INNOVATIVE_TECH"], "not_engaged");
});

Deno.test("doc232 — reasons_to_conduct booleans: every closed option becomes a true/false state, never a third value", () => {
  const intake = { reasons_to_conduct: ["Data processed on a large scale"] };
  const states = buildDpiaRuleStates({}, intake, emptyMap());
  assertEquals(states.states["intake.reasons_to_conduct.large_scale"], true);
  assertEquals(states.states["intake.reasons_to_conduct.innovative_technology"], false);
  assertEquals(states.states["intake.reasons_to_conduct.recorded"], true);
});

Deno.test("doc232 — data_categories closed-list values pass through unmodified for the data_category: atom family", () => {
  const intake = { data_categories: ["Biometric data", "Employee records"] };
  const states = buildDpiaRuleStates({}, intake, emptyMap());
  assertEquals(states.data_categories, ["Biometric data", "Employee records"]);
  assertEquals(states.flags.includes("biometric"), true);
});

Deno.test("doc232 — instrument defaults to EU GDPR unless the record is UK-only", () => {
  const uk = buildDpiaRuleStates({}, { jurisdictions: ["United Kingdom (UK GDPR)"] }, emptyMap());
  assertEquals(uk.instrument, "UK GDPR");
  const eu = buildDpiaRuleStates({}, { jurisdictions: ["EU (GDPR)"] }, emptyMap());
  assertEquals(eu.instrument, "EU GDPR");
  const none = buildDpiaRuleStates({}, {}, emptyMap());
  assertEquals(none.instrument, "EU GDPR");
});

Deno.test("doc232 — buildDpiaRuleStates never throws on an empty intake/report/no engagement map", () => {
  const states = buildDpiaRuleStates({}, {}, undefined);
  assertEquals(typeof states.instrument, "string");
  assertEquals(Array.isArray(states.flags), true);
  assertEquals(Array.isArray(states.data_categories), true);
});
