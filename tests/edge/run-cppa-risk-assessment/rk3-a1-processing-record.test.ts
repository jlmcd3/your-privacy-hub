// RK3-A1 GROUP 1 — § 7152(a)(3)(A) processing record (Intake Contract v2.0 §1,
// doc 31 §2c). Pins the three-field landing end to end:
//   contract  — processing_entry_point / processing_methods (+5 children) /
//               processing_result, OPTIONAL at the data layer (ITEM 380
//               INTAKE-4a pattern: legacy rows keep validating).
//   form      — the intake memo emits all three keys; stepValid requires them
//               for new submissions (step 1).
//   rail      — processing_record entry citing 11 CCR § 7152(a)(3)(A) with
//               the ra_content_op_method verbatim quote.

import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { cppaRiskContract } from "../../../supabase/functions/_shared/intake-contracts/cppa-risk-assessment.ts";

const PAGE_PATH = new URL(
  "../../../src/pages/CPPARiskAssessment.tsx",
  import.meta.url,
);
const RAIL_PATH = new URL(
  "../../../src/components/cppa/CPPARiskRailEntries.ts",
  import.meta.url,
);

const field = (key: string) => cppaRiskContract.fields.find((f) => f.key === key);

Deno.test("RK3-A1 — contract carries the § 7152(a)(3)(A) processing-record fields, optional at the data layer", () => {
  for (const key of ["processing_entry_point", "processing_methods", "processing_result"]) {
    const f = field(key);
    assert(f, `${key} missing from cppaRiskContract`);
    assertEquals(f!.required, "optional", `${key} must be optional at the data layer (legacy rows keep validating)`);
  }
  for (const child of ["collection_method", "use_method", "disclosure_method", "retention_method", "other_processing_method"]) {
    assert(field(`processing_methods.${child}`), `processing_methods.${child} missing from contract`);
  }
  assertEquals(field("processing_methods")!.kind, "structured");
});

Deno.test("RK3-A1 — form emits the three keys and stepValid requires them", async () => {
  const src = await Deno.readTextFile(PAGE_PATH);
  assert(src.includes("processing_entry_point: processingEntryPoint.trim()"), "intake memo must emit processing_entry_point");
  assert(src.includes("processing_methods: processingMethods"), "intake memo must emit processing_methods");
  assert(src.includes("processing_result: processingResult.trim()"), "intake memo must emit processing_result");
  assert(src.includes("Say where personal information first enters this activity."), "stepValid must require the entry point");
  assert(src.includes("Complete all five processing-method entries"), "stepValid must require all five method entries");
  assert(src.includes("Say what this activity produces or supports"), "stepValid must require the result");
});

Deno.test("RK3-A1 — draft round-trip covers the new fields", async () => {
  const src = await Deno.readTextFile(PAGE_PATH);
  assert(src.includes('if (typeof d.processingEntryPoint === "string") setProcessingEntryPoint(d.processingEntryPoint)'), "applyRestore must restore processingEntryPoint");
  assert(src.includes("d.processingMethods && typeof d.processingMethods === \"object\""), "applyRestore must restore processingMethods with shape guard");
  assert(src.includes('if (typeof d.processingResult === "string") setProcessingResult(d.processingResult)'), "applyRestore must restore processingResult");
});

Deno.test("RK3-A1 — statute rail carries the § 7152(a)(3)(A) processing-record entry", async () => {
  const src = await Deno.readTextFile(RAIL_PATH);
  assert(src.includes("processing_record: {"), "rail must define processing_record");
  assert(src.includes('citation: "11 CCR § 7152(a)(3)(A)"'), "rail entry must cite § 7152(a)(3)(A)");
  assert(
    src.includes("planned method for collecting, using, disclosing, retaining, or otherwise processing personal information"),
    "rail entry must carry the ra_content_op_method verbatim quote",
  );
});
