// ITEM 413 §5 — ONE SEAM, ONE SHAPE.
//
// THE 412-B/D LESSON. Before wiring, the persist paths were enumerated: this
// function has exactly ONE. These tests hold that fact in place — if a second
// persist or a second serialize call appears, they fail and the battery must be
// moved to the shared seam before the new path ships.

import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { REGISTRATION_PIPELINE_STAMP } from "../../../supabase/functions/_shared/ltp/registration-finalize.ts";
import { REGISTRATION_REPORT_SCHEMA } from "../../../supabase/functions/_shared/report-schemas/registration.ts";
import { assembleRegistrationReport, PERFECT_INTAKE } from "./_assemble.ts";

const INDEX = await Deno.readTextFile(
  new URL(
    "../../../supabase/functions/run-registration-assessment/index.ts",
    import.meta.url,
  ),
);

const code = INDEX.split("\n").filter((l) => !l.trim().startsWith("//")).join("\n");

Deno.test("there is exactly one serialize-and-persist seam", () => {
  // The local wrapper's own declaration is not a call site.
  const serializes = (code.match(/serializeCustomer\s*\(/g) ?? []).length -
    (code.match(/function serializeCustomer\s*\(/g) ?? []).length;
  assertEquals(serializes, 1, `expected 1 serializeCustomer call, found ${serializes}`);
  const inserts = code.match(/from\(["']registration_assessments["']\)\s*\n?\s*\.(insert|upsert)/g) ?? [];
  assert(inserts.length <= 1, `expected at most 1 write path, found ${inserts.length}`);
});

Deno.test("the battery runs BEFORE serialization, at that one seam", () => {
  const battery = code.indexOf("runRegistrationFinalizeBattery(");
  const serialize = code.indexOf("= serializeCustomer(");
  assert(battery > 0, "battery is not wired into index.ts");
  assert(battery < serialize, "battery runs after serialization — repairs would be discarded");
});

Deno.test("the serialized report is what is persisted on every write", () => {
  const persists = code.match(/result_summary:\s*customer_result_summary/g) ?? [];
  assert(persists.length >= 1, "no persist reads the serialized summary");
  assert(
    !/result_summary:\s*result_summary\b/.test(code),
    "a write path persists the UNSERIALIZED summary — it would bypass the battery",
  );
});

Deno.test("the boot line names the pipeline stamp", () => {
  assert(
    code.includes("registration_pipeline_stamp=${REGISTRATION_PIPELINE_STAMP}"),
    "no boot line for the registration pipeline stamp",
  );
});

Deno.test("the stamp survives the customer serializer", () => {
  // `_meta` is allow-listed at top level and preserved verbatim, so the stamp
  // written into `_meta.internal` reaches the persisted document.
  assert(REGISTRATION_REPORT_SCHEMA.topLevel.includes("_meta"), "_meta is not allow-listed");
  const { report } = assembleRegistrationReport(PERFECT_INTAKE);
  const internal = (report._meta as Record<string, unknown>).internal as Record<string, unknown>;
  assertEquals(internal.registration_pipeline_stamp, REGISTRATION_PIPELINE_STAMP);
});

Deno.test("battery telemetry rides in _meta.internal, not on a customer surface", () => {
  const { report } = assembleRegistrationReport(PERFECT_INTAKE);
  for (const k of ["registration_coverage", "prose_lint"]) {
    assert(
      !Object.prototype.hasOwnProperty.call(report, k),
      `${k} leaked to the top level, where the schema would strip it silently`,
    );
  }
  const internal = (report._meta as Record<string, unknown>).internal as Record<string, unknown>;
  assert(internal.registration_coverage, "coverage telemetry missing from _meta.internal");
});
