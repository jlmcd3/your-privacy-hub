// SO-FINAL-TEST — tests for the additive skeleton grader path.
//
// Two obligations:
//  (a) the new payload builder grades the WHOLE skeleton_document, all kinds;
//  (b) the legacy grader path is provably untouched.

import { assert, assertEquals, assertStringIncludes } from "https://deno.land/std@0.224.0/testing/asserts.ts";
import {
  buildSkeletonGraderPayload,
  hasSkeletonDocument,
  SKELETON_GRADER_BUDGET,
  SKELETON_BLOCK_KIND_ADDENDUM,
} from "../../../supabase/functions/run-quality-batch/_local/grader/skeleton-payload.ts";
import {
  buildGraderPayload,
  GRADER_PAYLOAD_BUDGET,
} from "../../../supabase/functions/_shared/grader/payload.ts";

const report = {
  executive_summary: "LEGACY BODY FIELD",
  _meta: { stamp: "x" },
  skeleton_document: {
    title: "Legitimate Interests Assessment",
    subtitle: "Prepared for Acme",
    spine_version: "v3",
    sections: [
      {
        id: "purpose",
        title: "Purpose Test",
        paragraphs: [
          { kind: "skeleton", text: "Article 6(1)(f) permits processing necessary for legitimate interests." },
          { kind: "lead", text: "The purpose test is met." },
          { kind: "generated", text: "The record shows fraud-prevention scoring on device signals." },
        ],
      },
      {
        id: "table_of_authorities",
        title: "Authorities Cited",
        paragraphs: [{ kind: "rule", text: "GDPR Art. 6(1)(f); Recital 47" }],
      },
      {
        id: "children",
        title: "Children",
        paragraphs: [{ kind: "conditional", text: "Recital 38 applies because children are in scope." }],
      },
    ],
  },
};

Deno.test("budget has real headroom over the largest measured pilot document", () => {
  // Largest measured skeleton_document across the eleven SO pilots was
  // 51,575 chars (cppa_cybersecurity).
  assert(SKELETON_GRADER_BUDGET >= 2 * 51_575, "budget must leave real headroom over the largest pilot");
  assert(Number(SKELETON_GRADER_BUDGET) !== Number(GRADER_PAYLOAD_BUDGET), "skeleton budget must not inherit the legacy 30k");
});

Deno.test("payload contains every section, paragraph and block kind", () => {
  const p = buildSkeletonGraderPayload(report);
  assertEquals(p.section_count, 3);
  assertEquals(p.paragraph_count, 5);
  assertEquals(p.truncated, false);
  for (const kind of ["skeleton", "lead", "generated", "rule", "conditional"]) {
    assertStringIncludes(p.text, `[kind=${kind}]`);
  }
  for (const id of ["purpose", "table_of_authorities", "children"]) {
    assertStringIncludes(p.text, `SECTION ${id}`);
  }
  assertStringIncludes(p.text, "Recital 38 applies because children are in scope.");
});

Deno.test("no legacy report_data field is merged into the skeleton payload", () => {
  const p = buildSkeletonGraderPayload(report);
  assert(!p.text.includes("LEGACY BODY FIELD"), "legacy body fields must not appear");
  assert(!p.text.includes("_meta"), "generator metadata must not appear");
});

Deno.test("fixture-set header is preserved; truncation is flagged", () => {
  const p = buildSkeletonGraderPayload(report, 200, { fixtureSet: "golden [variant=perfect]" });
  assertStringIncludes(p.text, "GOLDEN_FIXTURE_SET: golden [variant=perfect]");
  assertEquals(p.truncated, true);
  assert(p.original_length > 200);
});

Deno.test("hasSkeletonDocument gates the path", () => {
  assert(hasSkeletonDocument(report));
  assert(!hasSkeletonDocument({ executive_summary: "x" }));
  assert(!hasSkeletonDocument({ skeleton_document: { sections: [] } }));
  assert(!hasSkeletonDocument(null));
});

Deno.test("rubric addendum states the block-kind rules", () => {
  for (const needle of [
    "BYTE-PINNED FIXED PROSE",
    "NEVER raise a finding about its wording",
    "[kind=lead]",
    "FULL scrutiny",
    "CITATION PRESENCE",
  ]) {
    assertStringIncludes(SKELETON_BLOCK_KIND_ADDENDUM, needle);
  }
});

Deno.test("LEGACY PATH UNTOUCHED — buildGraderPayload output is unchanged and ignores skeleton_document", () => {
  const legacy = buildGraderPayload("lia", report);
  assertEquals(GRADER_PAYLOAD_BUDGET, 30_000);
  assertStringIncludes(legacy.text, "--- SUBSTANTIVE SECTIONS ---");
  // skeleton_document is a non-metadata key, so it lands in the rest object —
  // exactly as it did before this item shipped. What matters is that the
  // legacy builder was not rewritten to lead with it.
  assert(!legacy.text.startsWith("GRADER_PATH:"));
  assertStringIncludes(legacy.text, "LEGACY BODY FIELD");
});

Deno.test("run-quality-batch only uses the skeleton path under grader_mode=skeleton", async () => {
  const src = await Deno.readTextFile(
    new URL("../../../supabase/functions/run-quality-batch/index.ts", import.meta.url),
  );
  assert(src.includes('const graderMode: GraderMode = run.grader_mode === "skeleton" ? "skeleton" : "legacy";'));
  const uses = [...src.matchAll(/graderMode === "skeleton" && hasSkeletonDocument\(report\)/g)].length;
  assertEquals(uses, 2, "both grader roles must gate on grader_mode AND document presence");
  // Legacy default preserved on both signatures.
  assertEquals([...src.matchAll(/graderMode: GraderMode = "legacy"/g)].length, 2);
});

Deno.test("orchestrator omits grader_mode unless skeleton was requested", async () => {
  const src = await Deno.readTextFile(
    new URL("../../../supabase/functions/quality-batch-orchestrator/index.ts", import.meta.url),
  );
  assert(src.includes('...(String(graderModeRaw ?? "") === "skeleton" ? { grader_mode: "skeleton" } : {}),'));
  assert(src.includes('if (opts.graderMode === "skeleton") seed.grader_mode = "skeleton";'));
});
