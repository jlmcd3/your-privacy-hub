// BATCH 7bd29982 (2026-09-10) — Velorix Digital Services Ltd DPIA (1294595f),
// the batch's lowest score (82/87). Six rendered defects, each pinned here
// against the surface that produced it, plus the CEO's two same-day edits
// (cover subtitle; section numbering 1–7).
//
//   1. Section 4 quoted the engine's own absence value as the company's
//      words: 'The impact … is stated by the company separately from the
//      benefit: "not stated on the record".'
//   2. The gap table carried the Art. 6(1)(f) compound ask twice, word for
//      word (one row per decomposed part).
//   3. "two elements are not yet supported — <activity>; <activity>" named
//      the same operation twice without saying which test each was.
//   4. The decision table's "Matters holding sign-off open" cell ran four
//      blockers together (a "\n" seam collapses inside a table cell).
//   5. The gap table's second column printed "Dp by design measures".
//   6. Appendix A said the DP-by-design information was provided, "covering
//      the 1 measure recorded", beside a body row reading ADDITIONAL
//      INFORMATION REQUIRED.

import { assert, assertEquals, assertStringIncludes } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  composeNecessityBody,
  composeNecessityDetermination,
  DPIA_S3_STEP4_IMPACT_LEAD,
} from "../../../../supabase/functions/_shared/ltp/dpia-skeleton-assemble.ts";
import { buildDpiaTablesBySurface } from "../../../../supabase/functions/_shared/ltp/dpia-skeleton-tables.ts";
import { DPIA_SKELETON_SECTIONS } from "../../../../supabase/functions/_shared/prose/plans/dpia.spine.ts";

type Bag = Record<string, unknown>;
const OP = "AI-Driven User Content Recommendation Engine";

Deno.test("7bd29982 DPIA-1 — the builder's absence value is never quoted as the company's impact statement", () => {
  const report: Bag = {
    necessity_findings: [{
      operation_id: "op_primary",
      operation_label: OP,
      purpose_text: "To increase user engagement and time-on-platform by delivering personally relevant content.",
      verdict: "undetermined_on_the_record",
      why: "The record states the purpose; what the record does not carry is the itemised form this test runs on.",
      alternatives_considered: [],
    }],
    proportionality: [{
      operation_id: "op_primary",
      operation_label: OP,
      impact_argument: "not stated on the record",
      benefit_argument: "not stated on the record",
      verdict: "disproportionate_on_the_record",
      why: "The record argues only the benefit side of the balance. Proportionality is a two-sided test and cannot be concluded from a statement of benefit alone.",
    }],
  };
  const body = composeNecessityBody(report, { necessity_proportionality: "Only behavioural metadata is used." });
  assert(!body.includes('"not stated on the record"'), body);
  assert(!body.includes(DPIA_S3_STEP4_IMPACT_LEAD), "the impact lead must not render on an absent impact");
  // The two-sided-test sentence still renders as the branch.
  assertStringIncludes(body, "argues only the benefit side of the balance");
});

Deno.test("7bd29982 DPIA-3 — the partial determination names the TEST for each unmet element, never the same operation twice", () => {
  const text = composeNecessityDetermination({
    necessity_findings: [{ operation_label: OP, verdict: "undetermined_on_the_record" }],
    proportionality: [{ operation_label: OP, verdict: "disproportionate_on_the_record" }],
  });
  assertStringIncludes(text, `two elements are not yet supported — necessity for "${OP}"; proportionality for "${OP}" —`);
  assert(!text.includes(`${OP}; ${OP}`), text);
});

Deno.test("7bd29982 DPIA-2/4/5 — one gap-table row per distinct ask; blockers joined with semicolons; dp_by_design_measures carries an authored label", () => {
  const ask = `For "${OP}", the record does not support the necessity test or the balancing test.`;
  const report: Bag = {
    gap_ledger: [
      { field: "necessity_proportionality", dimensions: ask, provision: "GDPR Art. 6(1)(f)", enables: `the lawful-basis finding for "${OP}"`, ask_class: "ask_li_necessity" },
      { field: "necessity_proportionality", dimensions: ask, provision: "GDPR Art. 6(1)(f)", enables: `the lawful-basis finding for "${OP}"`, ask_class: "ask_li_balancing" },
      { field: "dp_by_design_measures", dimensions: "the technical and organisational measures built into the design of this processing, and when each was implemented", provision: "GDPR Art. 25(1)", enables: "the data-protection-by-design coverage row" },
    ],
    decision: {
      determination: "signoff_not_available",
      conditions: [],
      blockers: ["the alternatives considered", "the impact of the processing on the data subjects", "each less intrusive means considered", "the effect of the processing on the data subjects"],
      why: "4 points the determination turns on are unresolved.",
      citation: "GDPR Art. 35(1)",
    },
  };
  const tables = buildDpiaTablesBySurface(report, {});
  const gap = tables["gap_ledger"]!;
  assertEquals(gap.rows.filter((r) => r[0] === ask).length, 1, "the compound ask renders once");
  assertEquals(gap.rows.find((r) => r[1].startsWith("Data-protection-by-design"))?.[1], "Data-protection-by-design measures record (Art. 25)");
  assert(!gap.rows.some((r) => r[1] === "Dp by design measures"), "the humanizer fallback must not fire");
  const decision = tables["decision"]!;
  const blockers = decision.rows.find((r) => r[0] === "Matters holding sign-off open")![1];
  assertStringIncludes(blockers, "the alternatives considered; the impact of the processing on the data subjects; each less intrusive means considered; the effect of the processing on the data subjects");
  assert(!blockers.includes("\n"), "no newline seam inside the cell");
});

// ── CEO edits, 2026-09-10 ────────────────────────────────────────────────────

Deno.test("CEO 2026-09-10 — DPIA sections are numbered 1–7 (the overview is Section 1, the conclusion Section 7)", () => {
  const titles = DPIA_SKELETON_SECTIONS.map((s) => s.title);
  assertEquals(titles.filter((t) => /^Section \d/.test(t)), [
    "Section 1 — Overview of the Processing",
    "Section 2 — Systematic Description of the Processing",
    "Section 3 — Analysis of the Processing",
    "Section 4 — Considerations on Necessity and Proportionality",
    "Section 5 — Risk Assessment and Management",
    "Section 6 — Involvement of Interested Parties",
    "Section 7 — Conclusion and Decision",
  ]);
  // Section ids are data keys and do not move.
  assertEquals(DPIA_SKELETON_SECTIONS[1].id, "section_0_overview");
});

Deno.test("CEO 2026-09-10 — every customer-facing cross-reference moved with the renumbering; the cover subtitle takes the Risk cover's form", async () => {
  const read = (rel: string) => Deno.readTextFile(new URL(`../../../../supabase/functions/${rel}`, import.meta.url));
  const assemble = await read("_shared/ltp/dpia-skeleton-assemble.ts");
  assertStringIncludes(assemble, "The “Processing,” assessed under ${regime === \"UK\" ? \"UK GDPR\" : \"GDPR\"} Art. 35");
  assert(!assemble.includes("Art. 35 · the “Processing”"), "the old subtitle form is gone");
  for (const moved of ["(Section 5)`", "(Section 7)`", "(Section 7)\"", "are stated in Section 7.", "set out in Section 5${"]) {
    assertStringIncludes(assemble, moved);
  }
  for (const stale of ["(Section 4)", "(Section 6)", "stated in Section 6.", "set out in Section 4${"]) {
    assert(!assemble.includes(stale), `stale cross-reference survived: ${stale}`);
  }
  const tables = await read("_shared/ltp/dpia-skeleton-tables.ts");
  assertStringIncludes(tables, "the decision on the processing itself is stated in Section 7.");
  assert(!tables.includes("stated in Section 6."), "Section 0's approval note must point at Section 7");
  const csc = await read("_shared/ltp/dpia-csc.ts");
  assertStringIncludes(csc, "recorded with the decision in Section 7.");
  const build = await read("_shared/ltp/dpia-deliverables/build.ts");
  assertStringIncludes(build, "are recorded in the Section 2 inventory.");
  assertStringIncludes(build, "supporting factual record are set out in Section 5.");
  assert(!build.includes("set out in Section 4."), "the Art. 36 closer must point at Section 5");
});
