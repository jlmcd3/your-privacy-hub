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

// ── GROUP 2 — § 7152(a)(3)(C)/(D) interaction + scale ────────────────────────

Deno.test("RK3-A1 g2 — contract carries interaction method/purpose + approximate count, optional at the data layer", async () => {
  const { CONSUMER_INTERACTION_METHOD_OPTS: contractOpts } = await import(
    "../../../supabase/functions/_shared/intake-contracts/cppa-risk-assessment.ts"
  );
  const pageEnums = await import("../../../src/pages/CPPARiskAssessment.enums.ts");
  for (const key of ["consumer_interaction_method", "consumer_interaction_purpose", "approximate_ca_consumers"]) {
    const f = field(key);
    assert(f, `${key} missing from cppaRiskContract`);
    assertEquals(f!.required, "optional", `${key} must be optional at the data layer`);
  }
  assertEquals(field("consumer_interaction_method")!.kind, "enum");
  // PARITY — contract copy === page enums copy, verbatim.
  assertEquals([...contractOpts], [...pageEnums.CONSUMER_INTERACTION_METHOD_OPTS]);
});

Deno.test("RK3-A1 g2 — form emits the three keys and stepValid requires them", async () => {
  const src = await Deno.readTextFile(PAGE_PATH);
  assert(src.includes("consumer_interaction_method: consumerInteractionMethod"), "intake memo must emit consumer_interaction_method");
  assert(src.includes("consumer_interaction_purpose: consumerInteractionPurpose.trim()"), "intake memo must emit consumer_interaction_purpose");
  assert(src.includes("approximate_ca_consumers: approximateCaConsumers.trim()"), "intake memo must emit approximate_ca_consumers");
  assert(src.includes("Select how your business interacts with the consumers"), "stepValid must require the interaction method");
  assert(src.includes("Say why the consumer interacts with your business"), "stepValid must require the interaction purpose");
  assert(src.includes("Give the approximate number of California consumers"), "stepValid must require the approximate count");
});

// ── GROUP 3 — § 7152(a)(3)(B) per-category retention record ─────────────────

Deno.test("RK3-A1 g3 — contract carries retention_by_pi_category with the period-or-criteria row rule", () => {
  const f = field("retention_by_pi_category");
  assert(f, "retention_by_pi_category missing from cppaRiskContract");
  assertEquals(f!.required, "optional", "data-layer optional (legacy rows keep validating)");
  assertEquals(f!.kind, "structured");
  assert(field("retention_by_pi_category[].pi_category"), "pi_category child missing");
  assert(field("retention_by_pi_category[].retention_period"), "retention_period child missing");
  assert(field("retention_by_pi_category[].retention_criteria"), "retention_criteria child missing");
});

Deno.test("RK3-A1 g3 — form emits the matrix and stepValid enforces period-or-criteria", async () => {
  const src = await Deno.readTextFile(PAGE_PATH);
  assert(src.includes("retention_by_pi_category: retentionByPiCategory.filter((r) => r.pi_category)"), "intake memo must emit retention_by_pi_category, dropping category-less rows");
  assert(src.includes("Add at least one per-category retention row"), "stepValid must require at least one row");
  assert(src.includes("Every retention row needs a period"), "stepValid must enforce period-or-criteria per row");
  assert(src.includes("Array.isArray(d.retentionByPiCategory)"), "applyRestore must restore the matrix with shape guards");
});

Deno.test("RK3-A1 g3 — statute rail carries the § 7152(a)(3)(B) verbatim", async () => {
  const src = await Deno.readTextFile(RAIL_PATH);
  assert(src.includes("retention_by_category: {"), "rail must define retention_by_category");
  assert(
    src.includes("How long the business plans to retain each category of personal information, or if unknown, the criteria the business plans to use to determine that retention period."),
    "rail entry must carry the ra_content_op_retention verbatim quote",
  );
});

Deno.test("RK3-A1 g2 — statute rail carries the consumer_interaction entry; no unverified (C)/(D) verbatim", async () => {
  const src = await Deno.readTextFile(RAIL_PATH);
  assert(src.includes("consumer_interaction: {"), "rail must define consumer_interaction");
  assert(src.includes('citation: "11 CCR § 7152(a)(3)(C)–(D)"'), "rail entry must cite (C)-(D)");
  // Corpus law: only the verified § 7152(a)(3) chapeau is quoted; the entry
  // must not carry a fabricated (C) or (D) quote block.
  const entry = src.slice(src.indexOf("consumer_interaction: {"), src.indexOf("comparable_set: {"));
  assert(entry.includes("Identify and document in a risk assessment report"), "chapeau verbatim expected");
  assert(!entry.includes("§ 7152(a)(3)(C) — “"), "no unverified (C) verbatim quote");
  assert(!entry.includes("§ 7152(a)(3)(D) — “"), "no unverified (D) verbatim quote");
});
