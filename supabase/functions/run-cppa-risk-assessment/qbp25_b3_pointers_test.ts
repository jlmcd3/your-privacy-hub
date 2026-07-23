// QB-P25 B3 — unit tests for _qbp25_b3_pointers.
import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  coerceLikelihood,
  coerceSeverity,
  normalizeRiskV2,
  resolveStrengthenPointers,
  scrubStrengthenItemIds,
  validStrengthenItemIds,
} from "./_qbp25_b3_pointers.ts";

Deno.test("coerceLikelihood: enum passthrough + case/synonym normalisation", () => {
  assertEquals(coerceLikelihood("Unlikely"), "Unlikely");
  assertEquals(coerceLikelihood("possible"), "Possible");
  assertEquals(coerceLikelihood("HIGH"), "Likely");
  assertEquals(coerceLikelihood("very likely"), "Highly likely");
  assertEquals(coerceLikelihood("Almost Certain"), "Highly likely");
  assertEquals(coerceLikelihood("garbage"), undefined);
  assertEquals(coerceLikelihood(42 as unknown as string), undefined);
});

Deno.test("coerceSeverity: enum passthrough + case/synonym normalisation", () => {
  assertEquals(coerceSeverity("Severe"), "Severe");
  assertEquals(coerceSeverity("moderate"), "Moderate");
  assertEquals(coerceSeverity("catastrophic"), "Severe");
  assertEquals(coerceSeverity("minor"), "Minimal");
  assertEquals(coerceSeverity(""), undefined);
});

Deno.test("validStrengthenItemIds + scrubStrengthenItemIds strip unknown/dupe values", () => {
  const report = { strengthen_items: [{ item_id: "S-1" }, { item_id: "S-2" }] };
  const valid = validStrengthenItemIds(report);
  assertEquals(valid.has("S-1"), true);
  assertEquals(valid.has("S-3"), false);
  assertEquals(scrubStrengthenItemIds(["S-1", "S-3", "S-1", ""], valid), ["S-1"]);
  assertEquals(scrubStrengthenItemIds(null, valid), []);
});

Deno.test("normalizeRiskV2: strips invalid exception pointers and deletes empty key", () => {
  const report: any = {
    strengthen_items: [{ item_id: "S-1" }],
    exception_analysis: [
      { exception_name: "A", strengthen_item_ids: ["S-1", "S-99"] },
      { exception_name: "B", strengthen_item_ids: ["S-99"] },
      { exception_name: "C" },
    ],
  };
  const s = normalizeRiskV2(report);
  assertEquals(report.exception_analysis[0].strengthen_item_ids, ["S-1"]);
  assertEquals("strengthen_item_ids" in report.exception_analysis[1], false);
  assertEquals("strengthen_item_ids" in report.exception_analysis[2], false);
  assertEquals(s.strippedIds, 2);
});

Deno.test("normalizeRiskV2: record_sufficiency pointer scrub", () => {
  const report: any = {
    strengthen_items: [{ item_id: "S-1" }, { item_id: "S-2" }],
    record_sufficiency: { complete: false, statement: "", strengthen_item_ids: ["S-2", "S-9"] },
  };
  normalizeRiskV2(report);
  assertEquals(report.record_sufficiency.strengthen_item_ids, ["S-2"]);
});

Deno.test("normalizeRiskV2: adverse_effects enum fallback + count", () => {
  const report: any = {
    risk_assessment_by_activity: [
      { adverse_effects: [
        { harm_type: "X", likelihood: "medium", severity: "critical", description: "" },
        { harm_type: "Y", likelihood: "sometimes", severity: "n/a", description: "" },
      ] },
    ],
  };
  const s = normalizeRiskV2(report);
  const ae = report.risk_assessment_by_activity[0].adverse_effects;
  assertEquals(ae[0].likelihood, "Possible");
  assertEquals(ae[0].severity, "Severe");
  assertEquals(ae[1].likelihood, "Possible");   // fallback
  assertEquals(ae[1].severity, "Moderate");     // fallback
  assertEquals(s.droppedLikelihood, 1);
  assertEquals(s.droppedSeverity, 1);
});

Deno.test("normalizeRiskV2: priority_actions renumbers 1..N and preserves rank order when unique", () => {
  const report: any = {
    priority_actions: [
      { action: "b", rank: 5 },
      { action: "a", rank: 2 },
      { action: "c", rank: 9 },
    ],
  };
  const s = normalizeRiskV2(report);
  assertEquals(report.priority_actions.map((a: any) => a.action), ["a", "b", "c"]);
  assertEquals(report.priority_actions.map((a: any) => a.rank), [1, 2, 3]);
  assertEquals(s.ranksRenumbered, 3); // a:2→1, b:5→2, c:9→3 — all change.
});

Deno.test("normalizeRiskV2: priority_actions with collisions keeps input order and assigns 1..N", () => {
  const report: any = {
    priority_actions: [
      { action: "a", rank: 1 },
      { action: "b", rank: 1 }, // collision
      { action: "c" },          // missing
    ],
  };
  normalizeRiskV2(report);
  assertEquals(report.priority_actions.map((a: any) => a.rank), [1, 2, 3]);
  assertEquals(report.priority_actions.map((a: any) => a.action), ["a", "b", "c"]);
});

Deno.test("resolveStrengthenPointers builds id lookup", () => {
  const report = { strengthen_items: [
    { item_id: "S-1", citation: "11 CCR 7152(a)", recorded_basis: "believed x" },
    { item_id: "S-2", citation: "11 CCR 7152(a)", recorded_basis: "believed y" },
  ] };
  const map = resolveStrengthenPointers(report);
  assertEquals(map["S-1"].recorded_basis, "believed x");
  assertEquals(map["S-2"].recorded_basis, "believed y");
  assertEquals(map["S-9"], undefined);
});
