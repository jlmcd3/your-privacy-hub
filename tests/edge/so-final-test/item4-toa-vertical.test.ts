// ITEM 4 — FIRST ToA FIX (CEO-directed, 2026-08-15; presentation only).
// Sentinel: a document with three authorities renders three separate lines/rows;
// no ToA line carries two citations.

import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { toaLines, repairLinePreserving } from "../../../supabase/functions/_shared/prose/skeleton-render.ts";

const THREE = [
  "Regulations",
  "    GDPR Art. 5(1)(e)",
  "    GDPR Art. 6(1)(f)",
  "    GDPR Art. 35(7)(b)",
].join("\n");

const CITATION_RE = /(?:UK )?GDPR Art\./g;

Deno.test("item 4 — three authorities render as three separate lines", () => {
  const lines = toaLines(THREE);
  assertEquals(lines.length, 4); // one heading + three authorities
  assertEquals(lines.filter((l) => !l.is_heading).length, 3);
  for (const l of lines) {
    assertEquals((l.text.match(CITATION_RE) ?? []).length <= 1, true, l.text);
  }
});

Deno.test("item 4 — legacy flattened ToA is re-split vertically", () => {
  const flat = "Regulations GDPR Art. 5(1)(e) GDPR Art. 6(1)(f) GDPR Art. 35(7)(b)";
  const lines = toaLines(flat);
  assertEquals(lines.filter((l) => !l.is_heading).map((l) => l.text), [
    "GDPR Art. 5(1)(e)",
    "GDPR Art. 6(1)(f)",
    "GDPR Art. 35(7)(b)",
  ]);
  assert(lines[0].is_heading);
});

Deno.test("item 4 — register repair no longer flattens ToA line structure", () => {
  const out = repairLinePreserving(THREE);
  assertEquals(out.split("\n").length, 4);
  assert(out.includes("\n    GDPR Art. 6(1)(f)"));
});

Deno.test("item 4 — entry bytes, order and count are unchanged", () => {
  const before = THREE.split("\n").slice(1).map((l) => l.trim());
  const after = toaLines(THREE).filter((l) => !l.is_heading).map((l) => l.text);
  assertEquals(after, before);
});
