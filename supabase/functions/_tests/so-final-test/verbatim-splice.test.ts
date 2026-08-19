// PROMPT 2A — shared verbatim-splice normalizer + DPIA slot-filler repairs.
import { assertEquals, assert } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { spliceVerbatim, collapseSeam, humanizeDateISO } from "../../_shared/ltp/verbatim-splice.ts";
import { buildDpiaSlotValues, descriptionSlots } from "../../_shared/ltp/dpia-skeleton-assemble.ts";

Deno.test("splice — fragment ending in period before ', supported by'", () => {
  const v = spliceVerbatim("Only the diagnosis category, certified dates and the fact of incapacity are recorded.");
  assertEquals(v, "\u201COnly the diagnosis category, certified dates and the fact of incapacity are recorded\u201D");
  const seam = collapseSeam(`the company states: ${v}, supported by the record.`);
  assert(seam.includes("recorded\u201D, supported by"), seam);
});

Deno.test("splice — fragment ending in semicolon; no double wrap", () => {
  assertEquals(spliceVerbatim("no personal data leaves Germany;"), "\u201Cno personal data leaves Germany\u201D");
  assertEquals(spliceVerbatim("\u201Calready quoted.\u201D"), "\u201Calready quoted\u201D");
  assertEquals(spliceVerbatim("   "), "");
});

Deno.test("humanizeDateISO — 2026-05-01 → 1 May 2026", () => {
  assertEquals(humanizeDateISO("2026-05-01"), "1 May 2026");
  assertEquals(humanizeDateISO("2026-12-31T00:00:00Z"), "31 December 2026");
  assertEquals(humanizeDateISO("next spring"), "next spring");
  assertEquals(humanizeDateISO(""), "");
});

Deno.test("description — multi-sentence emits a separate version sentence", () => {
  const r = descriptionSlots(
    "Triage of employee sickness-absence certificates. All systems are hosted in the controller's Munich data centre; no personal data leaves Germany.",
    "2.1",
    humanizeDateISO("2026-05-01"),
  );
  assertEquals(r.VERSION_CLAUSE, "");
  assertEquals(r.LAUNCH_CLAUSE, ". This assessment covers version 2.1 of the processing, planned to commence 1 May 2026");
  const rendered = `The processing under assessment is ${r.description}${r.VERSION_CLAUSE}${r.LAUNCH_CLAUSE}.`;
  assert(rendered.endsWith("planned to commence 1 May 2026."), rendered);
  assert(!rendered.includes("2026-05-01"));
});

Deno.test("description — single sentence keeps the inline clause, date humanized", () => {
  const r = descriptionSlots("Triage of employee sickness-absence certificates.", "2.1", humanizeDateISO("2026-05-01"));
  assertEquals(r.VERSION_CLAUSE, ", version 2.1");
  assertEquals(r.LAUNCH_CLAUSE, ", planned to commence 1 May 2026");
});

Deno.test("reasons read grammatically after 'because'", () => {
  const v = buildDpiaSlotValues({
    reasons_to_conduct: [
      "Large-scale special-category or criminal-offence data (Art. 35(3)(b))",
      "Sensitive or highly personal data",
    ],
    data_minimisation_justification: "Only the diagnosis category, certified dates and the fact of incapacity are recorded.",
    necessity_proportionality: "No less intrusive means exists. Managers see only the outcome.",
    functional_description: "Certificates are uploaded to the HR portal.",
    estimated_end_date: "2027-01-15",
  });
  const sentence = `Acme has indicated that this assessment is required because ${v.reasonsToConduct}.`;
  assertEquals(
    sentence,
    "Acme has indicated that this assessment is required because the processing involves large-scale special-category or criminal-offence data (Art. 35(3)(b)) and sensitive or highly personal data.",
  );
  assertEquals(v.dataMinimisationJustification, ": \u201COnly the diagnosis category, certified dates and the fact of incapacity are recorded\u201D");
  assert(String(v.necessityProportionality).startsWith("\u201C"));
  assert(String(v.dataFlow).startsWith("\u201C"));
  assertEquals(v.endDate, "15 January 2027");
});
