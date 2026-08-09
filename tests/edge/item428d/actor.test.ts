// ITEM 428-D — the one residual graded finding from pilot 2be26383 (run #208):
// `rubric_actionability` (intelligence/medium) on rank 1 of priority_actions,
// evidence: "The authorised decisionmaker must record a reasoned initiation
// decision …" on a row whose reserved_to is "Chief Compliance Officer".
//
// The row already carries the named holder, so the fix is deterministic:
// restore the named holder as the SUBJECT of the reserved action's prose.
// Both directions are asserted — the object-role noun ("naming the
// decisionmaker and the date of decision") must survive untouched.

import { assert, assertEquals, assertStringIncludes } from "https://deno.land/std@0.208.0/assert/mod.ts";
import {
  applyRiskProseGold,
  nameReservedActor,
  nameReservedActors,
} from "../../../supabase/functions/_shared/ltp/risk-prose-gold.ts";
import { RISK_PIPELINE_STAMP } from "../../../supabase/functions/_shared/ltp/risk-stamp.ts";

const PILOT_ACTION =
  "The determination reserved to Chief Compliance Officer: decision whether to initiate the processing. "
  + "On Sierra Outfitters, Inc.'s record, the initiation decision under 11 CCR § 7152(a)(7) has not yet been recorded. "
  + "Before the assessment closes, the authorised decisionmaker must record a reasoned initiation decision — proceed, "
  + "proceed with modifications, or do not initiate — attaching the decision to the specific balancing outcome, naming "
  + "the decisionmaker and the date of decision, and, when proceeding with modifications, listing each modification and "
  + "the risk it addresses.";

Deno.test("428-D stamp", () => {
  assertEquals(RISK_PIPELINE_STAMP, "risk-pipeline@item428d-2026-08-09");
});

Deno.test("D1: the unnamed modal subject is replaced by the named holder", () => {
  const out = nameReservedActor(PILOT_ACTION, "Chief Compliance Officer");
  assertStringIncludes(out, "Chief Compliance Officer must record a reasoned initiation decision");
  assertEquals(/\bauthoris(?:ed|zed)\s+decisionmaker\b/i.test(out), false);
});

Deno.test("D1: the OBJECT-role noun survives byte-identically", () => {
  const out = nameReservedActor(PILOT_ACTION, "Chief Compliance Officer");
  assertStringIncludes(out, "naming the decisionmaker and the date of decision");
});

Deno.test("D1: 'The business must' at sentence start keeps its capital", () => {
  const out = nameReservedActor(
    "The business must record a reasoned initiation decision.",
    "chief compliance officer",
  );
  assertEquals(out, "Chief compliance officer must record a reasoned initiation decision.");
});

Deno.test("D1: rows without a holder, and already-named rows, are untouched", () => {
  const noHolder = nameReservedActor(PILOT_ACTION, "");
  assertEquals(noHolder, PILOT_ACTION);
  const named = "Chief Compliance Officer must record a reasoned initiation decision.";
  assertEquals(nameReservedActor(named, "Chief Compliance Officer"), named);
});

Deno.test("D1: non-modal uses of 'the business' are never rewritten", () => {
  const s = "The business and its counsel share the record; the business is the controller.";
  assertEquals(nameReservedActor(s, "Chief Compliance Officer"), s);
});

Deno.test("D1: the walker only touches reserved rows", () => {
  const report: Record<string, unknown> = {
    priority_actions: [
      { rank: 1, action: PILOT_ACTION, reserved_to: "Chief Compliance Officer" },
      { rank: 2, action: "The business must document the categories.", owner_role: "CISO" },
    ],
  };
  assertEquals(nameReservedActors(report), 1);
  const rows = report.priority_actions as Record<string, unknown>[];
  assertStringIncludes(String(rows[0].action), "Chief Compliance Officer must record");
  assertEquals(rows[1].action, "The business must document the categories.", "owner rows are not reserved rows");
});

Deno.test("D1: the pass runs on gate-FALSE documents too (register repair)", () => {
  const report: Record<string, unknown> = {
    priority_actions: [{ rank: 1, action: PILOT_ACTION, reserved_to: "qualified legal counsel" }],
  };
  const t = applyRiskProseGold(report, { recordComplete: false, affirmative: "", reservedCount: 1 });
  assertEquals(t.reserved_actors_named, 1);
  assert(String((report.priority_actions as Record<string, unknown>[])[0].action)
    .includes("qualified legal counsel must record a reasoned initiation decision"));
});
