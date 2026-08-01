// ITEM 337 — PROSE PROGRAM 1, Part B/C/E tests.
// Recorded cppa-risk processing_narrative defects used verbatim.
import { assertEquals, assert } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { renderSlotValue, joinNaturalList, collapseRenderArtifacts, adapterFor } from "./slots.ts";
import { applyMethodologyNote, stripMethodologySentences, METHODOLOGY_NOTE } from "./methodology.ts";
import { lintNarrativeCitations, extractCitations } from "./citation-lint.ts";

const RISK = adapterFor("cppa-risk");

Deno.test("B1 — array values never serialise as raw JSON", () => {
  const v = ["Email address", "Telemetry", "Purchase history"];
  assertEquals(renderSlotValue(v, { stem: "categories include " }), "Email address, Telemetry, and Purchase history");
  // JSON-encoded string form (the recorded defect shape)
  assertEquals(
    renderSlotValue('["Email address","Telemetry"]', { stem: "categories include " }),
    "Email address and Telemetry",
  );
  assertEquals(joinNaturalList(["A"]), "A");
});

Deno.test("B2 — 'from Directly from account signup' seam de-duplication", () => {
  const out = renderSlotValue("Directly from account signup", { stem: "The business collects personal information from ", next: "." });
  assertEquals(out, "account signup");
  assertEquals(`The business collects personal information from ${out}.`,
    "The business collects personal information from account signup.");
});

Deno.test("B3 — 'is used Deliver' folds and adapts", () => {
  const out = renderSlotValue("Deliver", { stem: "The information is used to ", next: ".", adapter: RISK });
  assert(!/^Deliver/.test(out), out);
  const generic = renderSlotValue("Deliver the service", { stem: "The information is used to ", next: "." });
  assertEquals(generic, "deliver the service");
});

Deno.test("B4 — 'criterion that Fixed period' renders through the adapter", () => {
  const out = renderSlotValue("Fixed period", { stem: "a retention criterion that applies ", next: ".", adapter: RISK });
  assertEquals(out, "a fixed retention period");
});

Deno.test("B5 — 'telemetry..' doubled punctuation collapses", () => {
  const v = renderSlotValue("telemetry.", { stem: "including ", next: "." });
  assertEquals(v, "telemetry");
  assertEquals(collapseRenderArtifacts("including telemetry.."), "including telemetry.");
  assertEquals(collapseRenderArtifacts("the record ,  and the note ."), "the record, and the note.");
});

Deno.test("B6 — proper nouns and acronyms are not case-folded", () => {
  assertEquals(renderSlotValue("Meridian Health Systems", { stem: "processed by " }), "Meridian Health Systems");
  assertEquals(renderSlotValue("GDPR", { stem: "assessed under " }), "GDPR");
});

Deno.test("B7 — sentence slots keep terminal punctuation at end of template", () => {
  const out = renderSlotValue("The balance favours the business.", { stem: "", next: "", isSentence: true });
  assertEquals(out, "The balance favours the business.");
});

Deno.test("C1 — methodology narration leaves body text and lands once", () => {
  const body =
    "The business processes account telemetry for fraud detection. " +
    "Each element above is drawn from the assessment record. " +
    "Where the record is silent, the report says so.";
  const r = stripMethodologySentences(body);
  assertEquals(r.removed, 2);
  assertEquals(r.text, "The business processes account telemetry for fraud detection.");

  const report: Record<string, unknown> = { processing_narrative: body, sections: [{ text: body }] };
  const res = applyMethodologyNote(report);
  assertEquals(res.removed, 4);
  assertEquals(report.methodology_note, METHODOLOGY_NOTE);
  assert(!String(report.processing_narrative).includes("drawn from the assessment record"));
});

Deno.test("E1 — unsupplied and repealed cites degrade; supplied cites survive", () => {
  const fields = {
    narrative:
      "The controller must respect Art. 20(1)(c) portability. " +
      "Transfers are governed by UK GDPR Art. 44. " +
      "The risk assessment duty arises under § 7152(a)(5).",
  };
  const res = lintNarrativeCitations(fields, {
    tool: "dpia",
    runId: "run-1",
    supplied: ["§ 7152(a)", "UK GDPR Art. 46"],
  });
  assert(!res.fields.narrative.includes("Art. 20(1)(c)"));
  assert(!res.fields.narrative.includes("UK GDPR Art. 44"));
  assert(res.fields.narrative.includes("§ 7152(a)(5)"));
  assertEquals(res.information_needed.length >= 2, true);
  assert(res.events.some((e) => e.action === "degraded_to_information_needed"));
});

Deno.test("E2 — registry equivalent replaces the sentence when supplied", () => {
  const res = lintNarrativeCitations(
    { narrative: "Transfers are governed by UK GDPR Art. 44." },
    {
      tool: "governance",
      supplied: ["UK GDPR Art. 45"],
      registryEquivalents: {
        "uk gdpr art. 44": "Transfers are assessed under the UK Chapter V regime as retained and amended.",
      },
    },
  );
  assertEquals(res.fields.narrative, "Transfers are assessed under the UK Chapter V regime as retained and amended.");
  assert(res.events.some((e) => e.action === "degraded_to_registry"));
});

Deno.test("E3 — citation extraction covers the linted shapes", () => {
  const c = extractCitations("See GDPR Art. 35(11), § 7152(a)(5), and 45 CFR § 164.312.");
  assert(c.length >= 3, JSON.stringify(c));
});
