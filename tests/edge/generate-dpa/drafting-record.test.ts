// QB-P25 Item 3 — DPA drafting-record contract test.
//
// Verifies the two safety contracts for the private `_drafting_record` block:
//   (a) buildGraderPayload STRIPS `_drafting_record` from grader input
//       (METADATA_KEYS enumerated list in _shared/grader/payload.ts).
//   (b) extractProseFromReport SKIPS `_drafting_record` walk
//       (_RESERVED_KEYS enumerated set in _shared/advisory-voice.ts).
//
// Also exercises a delimiter-split parser mirroring parseDpa() to confirm
// the three-section wire contract: body / ANNOTATIONS / DRAFTING_RECORD.

import { assert, assertEquals, assertStringIncludes } from "https://deno.land/std@0.208.0/assert/mod.ts";
import { buildGraderPayload } from "../_shared/grader/payload.ts";
import { extractProseFromReport } from "../_shared/advisory-voice.ts";

Deno.test("QB-P25 A1 — buildGraderPayload strips _drafting_record", () => {
  const report = {
    document_text: "1. Definitions. This DPA governs processing…",
    annotations: [{ regulator: "CNIL" }],
    _drafting_record: {
      framework_selection: "GDPR selected because both parties are EU-established.",
      module_selection: "SCC Module Two.",
      clause_deviations: [{ clause: "6.2", choice: "annual audit", reason: "controller preference" }],
    },
  };
  const built = buildGraderPayload("dpa", report);
  assertStringIncludes(built.text, "1. Definitions");
  assert(!built.text.includes("framework_selection"),
    "grader payload leaked _drafting_record.framework_selection");
  assert(!built.text.includes("clause_deviations"),
    "grader payload leaked _drafting_record.clause_deviations");
  assert(!built.text.includes("_drafting_record"),
    "grader payload leaked _drafting_record key name");
});

Deno.test("QB-P25 A1 — extractProseFromReport skips _drafting_record", () => {
  const report = {
    body: "Operative body prose.",
    _drafting_record: {
      framework_selection: "PRIVATE_MARKER_FRAMEWORK",
      enforcement_influence: "PRIVATE_MARKER_ENFORCEMENT",
    },
  };
  const prose = extractProseFromReport(report);
  assertStringIncludes(prose, "Operative body prose.");
  assert(!prose.includes("PRIVATE_MARKER_FRAMEWORK"),
    "prose extractor walked into _drafting_record");
  assert(!prose.includes("PRIVATE_MARKER_ENFORCEMENT"),
    "prose extractor walked into _drafting_record");
});

// Mirrored parseDpa split — same delimiter logic as generate-dpa/index.ts.
function parseDpaMirror(fullText: string) {
  const annIdx = fullText.indexOf("===ANNOTATIONS===");
  const drIdx = fullText.indexOf("===DRAFTING_RECORD===");
  const bodyEnd = annIdx !== -1 ? annIdx : (drIdx !== -1 ? drIdx : fullText.length);
  const body = fullText.slice(0, bodyEnd).trim();
  let annotations: unknown[] = [];
  let drafting_record: Record<string, unknown> | null = null;
  if (annIdx !== -1) {
    const annEnd = drIdx !== -1 && drIdx > annIdx ? drIdx : fullText.length;
    const raw = fullText.slice(annIdx + "===ANNOTATIONS===".length, annEnd).trim();
    const start = raw.indexOf("["); const end = raw.lastIndexOf("]");
    if (start !== -1 && end !== -1) annotations = JSON.parse(raw.slice(start, end + 1));
  }
  if (drIdx !== -1) {
    const raw = fullText.slice(drIdx + "===DRAFTING_RECORD===".length).trim();
    const start = raw.indexOf("{"); const end = raw.lastIndexOf("}");
    if (start !== -1 && end !== -1) drafting_record = JSON.parse(raw.slice(start, end + 1));
  }
  return { body, annotations, drafting_record };
}

Deno.test("QB-P25 A1 — three-block split isolates DRAFTING_RECORD from body", () => {
  const sample = [
    "1. Definitions.",
    "2. Scope of Processing.",
    "===ANNOTATIONS===",
    JSON.stringify([{ enforcement_action_id: "E1", regulator: "CNIL", jurisdiction: "France", decision_date: null, summary: "sum", outcome: "penalised", relevance: "informed audit clause" }]),
    "===DRAFTING_RECORD===",
    JSON.stringify({ framework_selection: "GDPR", module_selection: "Module Two", clause_deviations: [], open_placeholders: [], enforcement_influence: "informed audit clause frequency" }),
  ].join("\n");
  const parsed = parseDpaMirror(sample);
  assertStringIncludes(parsed.body, "1. Definitions.");
  assert(!parsed.body.includes("===DRAFTING_RECORD==="),
    "body must not contain drafting-record delimiter");
  assert(!parsed.body.includes("framework_selection"),
    "body must not contain drafting-record private field");
  assertEquals((parsed.annotations as any[]).length, 1);
  assertEquals((parsed.drafting_record as any)?.module_selection, "Module Two");
});
