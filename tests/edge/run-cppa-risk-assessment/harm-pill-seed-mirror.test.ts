// Doc 261-review (2026-09-15, CL-T03; CEO decision doc 262 §9.5 item 2) —
// MIRROR PARITY for the legacy harm-pill → category-code map.
//
// The page seeds a structured § 7152(a)(5) row from a legacy pill through
// src/lib/harmPillSeed.ts. Its map must agree with the engine's
// HARM_TYPE_TEXT_TO_CODE in factor-presence.ts for every pill the engine
// maps, including "Loss of availability" → (A) (doc 262 §9.8 item 1: the
// engine adopted the page's reading), so neither side can drift silently.

import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { HARM_PILL_TO_CODE, harmCategoryForPill, seedHarmRowsFromPills, blankHarmRow, ALL_PILLS_MAPPED } from "../../../src/lib/harmPillSeed.ts";
import { HARM_PATHWAY_OPTS, HARM_TYPES } from "../../../src/pages/CPPARiskAssessment.enums.ts";

const ENGINE_SRC = await Deno.readTextFile(
  new URL("../../../supabase/functions/run-cppa-risk-assessment-v2/_local/ltp/factor-presence.ts", import.meta.url),
);

function engineMap(): Record<string, string> {
  const start = ENGINE_SRC.indexOf("const HARM_TYPE_TEXT_TO_CODE");
  const end = ENGINE_SRC.indexOf("};", start);
  const out: Record<string, string> = {};
  for (const m of ENGINE_SRC.slice(start, end).matchAll(/"([^"]+)":\s*"([A-H])"/g)) out[m[1]] = m[2];
  return out;
}

Deno.test("harm pill mirror — agrees with the engine for every pill the engine maps", () => {
  const engine = engineMap();
  assert(Object.keys(engine).length >= 8, "engine map not found");
  for (const [pill, code] of Object.entries(engine)) {
    assertEquals(HARM_PILL_TO_CODE[pill], code, pill);
  }
});

// DOC 262 §9.8 item 1 (CEO, 2026-09-15) — the engine now maps "Loss of
// availability" to (A) as the page does; the dictionaries agree in full.
Deno.test("harm pill mirror — the page and the engine map the same pills, including Loss of availability → (A)", () => {
  const engine = engineMap();
  const extra = Object.keys(HARM_PILL_TO_CODE).filter((k) => !(k in engine));
  assertEquals(extra, [], "every page pill must exist in the engine map");
  assertEquals(engine["Loss of availability of personal information"], "A");
  assertEquals(HARM_PILL_TO_CODE["Loss of availability of personal information"], "A");
  assert(HARM_PATHWAY_OPTS[0].toLowerCase().includes("loss of availability"), "(A) label must carry loss of availability");
});

Deno.test("harm pill mirror — every legacy pill resolves to a canonical category", () => {
  assert(ALL_PILLS_MAPPED);
  for (const p of HARM_TYPES) assert(HARM_PATHWAY_OPTS.includes(harmCategoryForPill(p)!), p);
});

Deno.test("harm pill seeding — adds one row per new category, never duplicates or deletes", () => {
  const rows0 = [blankHarmRow()];
  const rows1 = seedHarmRowsFromPills(["Economic harm"], rows0, blankHarmRow);
  assertEquals(rows1.map((r) => r.harm), [HARM_PATHWAY_OPTS[4]]);
  const rows2 = seedHarmRowsFromPills(["Economic harm", "Unauthorised access, destruction, use, modification, or disclosure", "Loss of availability of personal information"], rows1, blankHarmRow);
  assertEquals(rows2.map((r) => r.harm), [HARM_PATHWAY_OPTS[4], HARM_PATHWAY_OPTS[0]]);
  const rows3 = seedHarmRowsFromPills(["Economic harm"], rows2, blankHarmRow);
  assert(rows3 === rows2, "no change ⇒ same array");
  const edited = [{ ...rows2[0], cause: "typed" }, rows2[1]];
  const rows4 = seedHarmRowsFromPills(["Physical harm"], edited, blankHarmRow);
  assertEquals(rows4[0].cause, "typed");
  assertEquals(rows4.length, 3);
});
