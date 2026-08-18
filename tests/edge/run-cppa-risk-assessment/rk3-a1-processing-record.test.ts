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

// ── GROUP 4 — § 7152(a)(3)(E) activity-disclosure record ─────────────────────

Deno.test("RK3-A1 g4 — contract carries activity_disclosures with content/method/status children", () => {
  const f = field("activity_disclosures");
  assert(f, "activity_disclosures missing from cppaRiskContract");
  assertEquals(f!.required, "optional", "data-layer optional (legacy rows keep validating)");
  assertEquals(f!.kind, "structured");
  assert(field("activity_disclosures[].disclosure_content"), "disclosure_content child missing");
  assert(field("activity_disclosures[].disclosure_method"), "disclosure_method child missing");
  const status = field("activity_disclosures[].status");
  assert(status, "status child missing");
  assertEquals([...(status!.options ?? [])], ["Made", "Planned"]);
  assert(field("activity_disclosures[].timing_or_location"), "timing_or_location child missing");
});

Deno.test("RK3-A1 g4 — form emits the record and stepValid enforces content/method/status", async () => {
  const src = await Deno.readTextFile(PAGE_PATH);
  assert(src.includes("activity_disclosures: activityDisclosures.filter((r) => r.disclosure_content.trim())"), "intake memo must emit activity_disclosures, dropping content-less rows");
  assert(src.includes("Record at least one disclosure"), "stepValid must require at least one row");
  assert(src.includes("Every disclosure row needs the content"), "stepValid must require content");
  assert(src.includes("Every disclosure row needs a method"), "stepValid must require method");
  assert(src.includes("Mark each disclosure as Made or Planned."), "stepValid must require status");
  assert(src.includes("Array.isArray(d.activityDisclosures)"), "applyRestore must restore the record with shape guards");
});

Deno.test("RK3-A1 g4 — statute rail carries the § 7152(a)(3)(E) verbatim", async () => {
  const src = await Deno.readTextFile(RAIL_PATH);
  assert(src.includes("activity_disclosures: {"), "rail must define activity_disclosures");
  assert(
    src.includes("What disclosures the business has made or plans to make to the consumer about the processing of their personal information and how these disclosures were or will be made"),
    "rail entry must carry the ra_content_op_disclosures verbatim quote",
  );
});

// ── GROUP 5 — § 7152(a)(3)(F) recipient record ───────────────────────────────

Deno.test("RK3-A1 g5 — contract carries recipients with emptyIsAnswer and the four children", () => {
  const f = field("recipients");
  assert(f, "recipients missing from cppaRiskContract");
  assertEquals(f!.required, "optional", "data-layer optional");
  assertEquals(f!.kind, "structured");
  assertEquals((f as { emptyIsAnswer?: boolean }).emptyIsAnswer, true, "explicit-None must use the emptyIsAnswer pattern");
  assert(field("recipients[].recipient_name_or_category"), "recipient_name_or_category child missing");
  const rtype = field("recipients[].recipient_type");
  assert(rtype, "recipient_type child missing");
  assertEquals([...(rtype!.options ?? [])], ["Service provider", "Contractor", "Third party"]);
  assert(field("recipients[].pi_categories_made_available"), "pi_categories_made_available child missing");
  assert(field("recipients[].disclosure_purpose"), "disclosure_purpose child missing");
});

Deno.test("RK3-A1 g5 — form emits recipients + declared-None flag; stepValid enforces the row rule", async () => {
  const src = await Deno.readTextFile(PAGE_PATH);
  assert(src.includes("recipients: recipientsNoneDeclared ? [] : recipientRows.filter((r) => r.recipient_name_or_category.trim())"), "intake memo must emit recipients with declared-None emitting []");
  assert(src.includes("recipients_none_declared: recipientsNoneDeclared"), "intake memo must emit the declared flag");
  assert(src.includes("Add at least one recipient — or check the box"), "stepValid must require rows or the declaration");
  assert(src.includes("Classify each recipient: service provider, contractor, or third party."), "stepValid must require the type");
  assert(src.includes("Select the personal-information categories made available"), "stepValid must require per-recipient categories");
  assert(src.includes("State the purpose of the disclosure"), "stepValid must require the purpose");
  assert(src.includes("Array.isArray(d.recipientRows)"), "applyRestore must restore recipient rows with shape guards");
});

Deno.test("RK3-A1 g5 — statute rail carries the § 7152(a)(3)(F) verbatim", async () => {
  const src = await Deno.readTextFile(RAIL_PATH);
  assert(src.includes("recipients_record: {"), "rail must define recipients_record");
  assert(
    src.includes("The names or categories of the service providers, contractors, or third parties to whom the business discloses or makes available the consumers' personal information for the processing"),
    "rail entry must carry the ra_content_op_recipients verbatim quote",
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
