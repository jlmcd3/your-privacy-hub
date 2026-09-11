// BATCH 916c33a8 (2026-09-10, DOC 252) — grader amendments. Two citation
// findings re-lettered Cal. Civ. Code § 1798.140 against the primary source
// ((aa) pseudonymize → "(ab)"; (v)(3) personal-information carve-out →
// "(x)(3)"); three prose classes were flagged as boilerplate or
// actionability on fixed frames whose operands the record set.

import { assert, assertStringIncludes } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { GRADER_CONTEXT_VERSION, SHARED_GRADER_CONTEXT } from "../../../../supabase/functions/_shared/grader/context.ts";

Deno.test("916c33a8 GR-1 — the § 1798.140 definition lettering is in the VERIFIED-ANCHOR MAP", () => {
  const map = SHARED_GRADER_CONTEXT.slice(
    SHARED_GRADER_CONTEXT.indexOf("VERIFIED-ANCHOR MAP (X10a"),
    SHARED_GRADER_CONTEXT.indexOf("CONTRACT-PROVISION MAP"),
  );
  assertStringIncludes(map, "(v) personal information, with (v)(3)");
  assertStringIncludes(map, "(aa) pseudonymize / pseudonymization");
  assertStringIncludes(map, "(ae) sensitive personal information");
  assertStringIncludes(map, "(x) probabilistic identifier");
  assertStringIncludes(map, "never re-letter these to (ab) or (x)");
});

Deno.test("916c33a8 GR-2 — the DOC 252 block carries its three classes and the true-positive shapes", () => {
  const at = SHARED_GRADER_CONTEXT.indexOf("DOC 252 (batch-916c33a8 triage, 2026-09-10)");
  assert(at > SHARED_GRADER_CONTEXT.indexOf("DOC 251 (batch-7bd29982 triage"), "DOC 252 appends after DOC 251");
  const block = SHARED_GRADER_CONTEXT.slice(at);
  assertStringIncludes(block, "(1) A LEAD-IN FRAME THAT INTRODUCES A TAILORED ANALYSIS IS JUDGED ON THE ANALYSIS");
  assertStringIncludes(block, "A processing activity is only as defensible as its least necessary data element");
  assertStringIncludes(block, "On the information provided, the Activity engages the following trigger or triggers:");
  assertStringIncludes(block, "Cross-cutting program remediation: none identified on the information provided.");
  assertStringIncludes(block, "(2) DEFINITION LETTERING IN Cal. Civ. Code § 1798.140 IS VERIFIED IN THE ANCHOR MAP ABOVE");
  assertStringIncludes(block, "(3) A DEADLINE FOLLOW-UP THAT ASKS FOR THE START DATE IS COMPLETE");
  // True positives keep their shape.
  assertStringIncludes(block, "lists the same missing fact twice under two labels");
  assertStringIncludes(block, "no paragraph pinpoint");
  assertStringIncludes(block, "no single system or facility recurs");
});

Deno.test("916c33a8 GR-3 — the instrument version appends the batch tag last", () => {
  // RE-PIN 2026-09-11 (DOC 252 §10 rulings): the rulings tag follows the batch tag.
  // RE-PIN 2026-09-11 (DOC 253, batch bcf0a706): the batch tag follows the rulings tag.
  // RE-PIN 2026-09-11 (DOC 254, ChatGPT prose review): the review tag follows the batch tag.
  assert(GRADER_CONTEXT_VERSION.endsWith("+batch-916c33a8-cal-2026-09-10+doc252-rulings-2026-09-11+batch-bcf0a706-cal-2026-09-11+doc254-chatgpt-review-2026-09-11+batch-e2e1185b-cal-2026-09-11+doc258-q9-homepage-2026-09-11"), GRADER_CONTEXT_VERSION);
});
