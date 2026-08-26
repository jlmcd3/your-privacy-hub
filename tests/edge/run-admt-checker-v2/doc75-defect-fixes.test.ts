// Doc 75 defect fixes (CEO-directed 2026-08-26 — "implement your
// recommendations for the redline ledger, so long as they improve the
// products for the end user"). Pins DEF-1 (plural-verb agreement, live in
// production), DEF-2 (unsure human review must not yield an affirmative
// scope determination — including the startsWith("No") prefix collision
// found on implementation), and DEF-4 (double period after free-text
// vendor answers).

import { assert, assertEquals, assertStringIncludes } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { computeScope } from "../../../supabase/functions/run-admt-checker-v2/_local/ltp/admt-v2-deterministic.ts";

type Bag = Record<string, unknown>;

const DOMAIN = "Hiring or admission decisions";

function scopeFor(humanReview: string, extra: Bag = {}) {
  return computeScope({
    organization_name: "Test Co",
    system_name: "Sys",
    decision_domains: [DOMAIN],
    human_review: humanReview,
    ...extra,
  } as never);
}

// ── DEF-2 ───────────────────────────────────────────────────────────────────

Deno.test('DEF-2 — "Not applicable / unsure" yields UNABLE_TO_ASSESS, never IN_SCOPE', () => {
  const s = scopeFor("Not applicable / unsure");
  assertEquals(s.scopeState, "UNABLE_TO_ASSESS");
});

Deno.test('DEF-2 — the prefix collision is dead: unsure is NOT reported as "No human review reported"', () => {
  const s = scopeFor("Not applicable / unsure");
  assertEquals(s.humanInvolvementLabel, "Human review not resolved");
  assertEquals(s.humanInvolvementEffect, "NEUTRAL");
});

Deno.test("DEF-2 — unsure raises the same INSUFFICIENT_RECORD ask as a blank answer, quoting the answer", () => {
  const s = scopeFor("Not applicable / unsure");
  const f = s.findings.find((x: Bag) => x.criterion === "Human involvement");
  assert(f, "expected the human-involvement ask");
  assertEquals((f as Bag).substantive_state, "INSUFFICIENT_RECORD");
  assertStringIncludes(String((f as Bag).factual_basis), '"Not applicable / unsure"');
});

Deno.test("DEF-2 — unsure degrades the record grade (the scope-determining fact is unresolved)", () => {
  const s = scopeFor("Not applicable / unsure");
  assert(s.recordGrade !== "COMPLETE", `record grade must not be COMPLETE; got ${s.recordGrade}`);
});

Deno.test('DEF-2 — a real "No — fully automated" answer still supports scope (unchanged)', () => {
  const s = scopeFor("No — fully automated, no human review");
  assertEquals(s.scopeState, "IN_SCOPE");
  assertEquals(s.humanInvolvementLabel, "No human review reported");
  assertEquals(s.humanInvolvementEffect, "SUPPORTS");
});

Deno.test("DEF-2 — qualifying review still resolves OUT_OF_SCOPE; blank still UNABLE_TO_ASSESS (unchanged)", () => {
  assertEquals(
    scopeFor("Yes — reviewer knows how to interpret output, reviews it plus other info, and has authority to change the decision").scopeState,
    "OUT_OF_SCOPE",
  );
  assertEquals(scopeFor("").scopeState, "UNABLE_TO_ASSESS");
});

// ── DEF-1 / DEF-4 — source-shape pins (the phrase sites are module-local,
// so these pin the SOURCE the way the fleet's other literal sweeps do) ──────

const ASSEMBLE_PATH =
  "supabase/functions/run-admt-checker-v2/_local/ltp/admt-v2-assemble.ts";
const DETERMINISTIC_PATH =
  "supabase/functions/run-admt-checker-v2/_local/ltp/admt-v2-deterministic.ts";

Deno.test("DEF-1 — the plural contexts declare plural, and the verb agrees", async () => {
  const src = await Deno.readTextFile(ASSEMBLE_PATH);
  assertStringIncludes(src, '"the Pre-use Notice requirements", true');
  assertStringIncludes(src, '"the access and explanation requirements", true');
  assertStringIncludes(src, '${plural ? "are" : "is"} not currently supported');
});

Deno.test("DEF-4 — both vendor free-text splices strip the terminal stop at the seam", async () => {
  const asm = await Deno.readTextFile(ASSEMBLE_PATH);
  const det = await Deno.readTextFile(DETERMINISTIC_PATH);
  assertStringIncludes(asm, 'third_party_admt).replace(/\\.\\s*$/, "")');
  assertStringIncludes(det, 'thirdParty.replace(/\\.\\s*$/, "")');
});
