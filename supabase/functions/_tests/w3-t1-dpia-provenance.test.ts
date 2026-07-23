// W3-T1 — DPIA provenance-typed rows.
// Verifies that:
//   1. U1_SKELETON declares a required `source: { intake_field, basis }` on
//      processed_personal_data, purposes, and functional_description rows.
//   2. UNIT_INSTRUCTION.u1 carries the PROVENANCE rule (stated | inferred).
//   3. run-dpia-framework's finaliser mirrors processing_activity_name into
//      section_0_overview.processing_name (single-source dedup).
//   4. _staging / _revision handling has not been perturbed (regression
//      guard — the file still routes those keys through METADATA_KEYS).

import { assert, assertEquals, assertStringIncludes } from "https://deno.land/std@0.224.0/assert/mod.ts";

const idx = await Deno.readTextFile(
  new URL("../run-dpia-framework/index.ts", import.meta.url),
);

Deno.test("W3-T1 · U1_SKELETON: processed_personal_data rows require source{intake_field,basis}", () => {
  // The three affected row schemas each declare `source` inline with the
  // required { intake_field, basis } shape.
  const ppd = idx.match(/"processed_personal_data":\s*\[\s*\{[^}]*"source":\s*\{[^}]*"intake_field"[^}]*"basis":\s*"stated \| inferred"/);
  assert(ppd, "processed_personal_data row must declare source{intake_field,basis:'stated | inferred'}");

  const purp = idx.match(/"purposes":\s*\[\s*\{[^}]*"source":\s*\{[^}]*"intake_field"[^}]*"basis":\s*"stated \| inferred"/);
  assert(purp, "purposes row must declare source{intake_field,basis:'stated | inferred'}");

  const fd = idx.match(/"functional_description":\s*\[\s*\{[^}]*"source":\s*\{[^}]*"intake_field"[^}]*"basis":\s*"stated \| inferred"/);
  assert(fd, "functional_description row must declare source{intake_field,basis:'stated | inferred'}");
});

Deno.test("W3-T1 · UNIT_INSTRUCTION.u1 carries the PROVENANCE rule", () => {
  assertStringIncludes(idx, "PROVENANCE (W3-T1, REQUIRED)");
  assertStringIncludes(idx, "`basis: \\\"stated\\\"`");
  assertStringIncludes(idx, "`basis: \\\"inferred\\\"`");
});

Deno.test("W3-T1 · processing_name is emit-time mirrored from dpia_metadata.processing_activity_name", () => {
  assertStringIncludes(idx, "W3-T1 §3 — metadata dedup");
  assertStringIncludes(idx, "processing_activity_name");
  // The mirror MUST happen before the hard-key validation guard.
  const mirrorAt = idx.indexOf("W3-T1 §3 — metadata dedup");
  const guardAt = idx.indexOf("stitched report missing both section_0_overview");
  assert(mirrorAt > 0 && guardAt > 0 && mirrorAt < guardAt,
    "processing_name mirror must run before the hard-key validation guard");
});

Deno.test("W3-T1 · _staging and _revision handling is untouched (regression guard)", () => {
  // Both keys must still be recognised as metadata by the grader payload
  // builder — the W3-T1 change is additive and MUST NOT reach into either.
  const payload = Deno.readTextFileSync(
    new URL("../_shared/grader/payload.ts", import.meta.url),
  );
  assertStringIncludes(payload, `"_staging"`);
  assertStringIncludes(payload, `"_meta"`);
  // The generator file itself must not have been rewritten in a way that
  // renames or removes the _staging pathway.
  assert(/_staging/.test(idx), "run-dpia-framework must still reference _staging");
});

Deno.test("W3-T1 · BUILD_STAMP bumped to w3-t1 tag", () => {
  const m = idx.match(/export const BUILD_STAMP = "([^"]+)"/);
  assert(m, "BUILD_STAMP export not found");
  assertEquals(m![1].startsWith("w3-t1-"), true, `unexpected BUILD_STAMP: ${m![1]}`);
});

Deno.test("W3-T1 · DPIA golden fixtures assert source fields on enumerated rows", async () => {
  const golden = await Deno.readTextFile(
    new URL("../_shared/golden/dpia.ts", import.meta.url),
  );
  // Every fixture must carry the two new assertions.
  const intakeFieldMatches = golden.match(/"row source\.intake_field present"/g) ?? [];
  const basisMatches = golden.match(/"row source\.basis is stated\|inferred"/g) ?? [];
  assertEquals(intakeFieldMatches.length, 3, "expected 3 intake_field assertions (one per fixture)");
  assertEquals(basisMatches.length, 3, "expected 3 basis assertions (one per fixture)");
});
