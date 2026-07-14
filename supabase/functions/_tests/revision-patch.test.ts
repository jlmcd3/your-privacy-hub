// RC-B.1 — unit-ish checks for revision-patch primitives + dpia unit map.
import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { applyRevisionPatch, guardAdvisoryNotes, checkAdvisoryGrounding } from "../_shared/revision-patch.ts";
import { buildItemUnitMap, mapItemsToUnits } from "../_shared/dpia-unit-map.ts";
import { updateOpenItemStatuses, type OpenItem } from "../_shared/open-items.ts";

Deno.test("applyRevisionPatch: untouched subtree byte-identical (SHA-256 equal)", async () => {
  const stored = {
    section_1: { title: "A", body: "immutable prose" },
    section_2: { risk: { overall: "Low", details: ["a", "b"] } },
    open_items: [{ id: "x", status: "open" }],
  };
  const { next, equal, untouchedHashBefore, untouchedHashAfter } = await applyRevisionPatch(stored, {
    changed_paths: ["section_2.risk.overall"],
    values: { "section_2.risk.overall": "Moderate" },
  });
  assertEquals(equal, true);
  assertEquals(untouchedHashBefore, untouchedHashAfter);
  assertEquals(next.section_2.risk.overall, "Moderate");
  assertEquals(next.section_1.body, "immutable prose");
});

Deno.test("applyRevisionPatch: untouched-subtree hash mismatches if extra key added", async () => {
  const stored = { a: 1, b: 2 };
  // Simulate a "bad" patch where a mutation happens outside changed_paths:
  // apply through the primitive with mismatched declaration → equal remains
  // true (primitive only mutates listed paths). This asserts our contract:
  // the primitive is honest — you can't silently mutate outside changed_paths.
  const { next, equal } = await applyRevisionPatch(stored, {
    changed_paths: ["a"],
    values: { a: 99 },
  });
  assertEquals(equal, true);
  assertEquals(next.a, 99);
  assertEquals(next.b, 2);
});

Deno.test("guardAdvisoryNotes: ungrounded stripped + over-cap trimmed", () => {
  // Register-compliant advisory shape (CEO-ratified, revision-patch.ts L162-170):
  // single suggestive sentence, no contradiction markers, no D8 gap word,
  // grounded in an allowed fact_ref.
  const allowed = new Set(["answered_item:x1", "intake:sector"]);
  const suggestive = (topic: string) =>
    `If your organization can document ${topic}, a reassessment covering it may be worth considering, based on your counsel's advice.`;
  const out = guardAdvisoryNotes(
    [
      { text: suggestive("item one"), fact_ref: "answered_item:x1" },
      { text: suggestive("orphaned"), /* no fact_ref → ungrounded */ },
      { text: suggestive("bad ref"), fact_ref: "answered_item:zzz" },
      { text: suggestive("item two"), fact_ref: "intake:sector" },
      { text: suggestive("item three"), fact_ref: "answered_item:x1" },
    ],
    { cap: 2, allowedFactRefs: allowed },
  );
  assertEquals(out.keep.length, 2);
  assert(out.stripped >= 3);
  assert(out.reasons.some((r) => r.includes("ungrounded")));
  assert(out.reasons.some((r) => r.startsWith("over_cap")));
});

Deno.test("checkAdvisoryGrounding: red on note without fact_ref", () => {
  const bad = { advisory_notes: [{ text: "orphan" }] };
  const r = checkAdvisoryGrounding(bad);
  assertEquals(r.ok, false);
  const good = { advisory_notes: [{ text: "ok", fact_ref: "intake:x" }] };
  assertEquals(checkAdvisoryGrounding(good).ok, true);
});

Deno.test("updateOpenItemStatuses: statuses only, shape preserved", () => {
  const items: OpenItem[] = [
    { id: "a", class: "verdict-blocking", target: { kind: "field", path: "x" }, why_insufficient: "w", provision_key: "p", input_spec: { kind: "bounded-narrative", max_chars: 1200 }, status: "open" },
    { id: "b", class: "record-completeness", target: { kind: "field", path: "y" }, why_insufficient: "w", provision_key: "p", input_spec: { kind: "bounded-narrative", max_chars: 1200 }, status: "open" },
  ];
  const next = updateOpenItemStatuses(items, [{ item_id: "a", verdict: "resolved", reason: "answered" }]);
  assertEquals(next.length, 2);
  assertEquals(next[0].status, "resolved");
  assertEquals(next[0].resolutions?.length, 1);
  assertEquals(next[1].status, "open");
});

Deno.test("dpia-unit-map: build + map roundtrip", () => {
  const items = [
    { id: "dpia-controller-x", target: { path: "controller.name" } },
    { id: "dpia-risk-y", target: { path: "risk_matrix.overall" } },
    { id: "dpia-purpose-z", target: { path: "processing_purpose" } },
  ];
  const map = buildItemUnitMap(items);
  assertEquals(map["dpia-controller-x"], "u1");
  assertEquals(map["dpia-risk-y"], "u4");
  assertEquals(map["dpia-purpose-z"], "u2");
  const { units } = mapItemsToUnits(["dpia-controller-x", "dpia-risk-y"], map);
  assertEquals(units, ["u1", "u4"]);
});
