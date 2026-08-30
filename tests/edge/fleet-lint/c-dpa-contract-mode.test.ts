// doc 113 Part I (DPA contract mode, doc 109 §1.7 item 9 / §2.8-1,3,4,5).
//
// `generate-report-pdf/index.ts` cannot be imported directly (it calls
// Deno.serve() at module scope, per the established pattern in
// fleet-lint/c3-verdict-scoreboards.test.ts) — its checks below read the
// source as text, the same convention that file uses. `dpa-assemble.ts`
// has no side effects and is imported and executed for real.

import { assert, assertEquals, assertExists, assertStringIncludes } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  assembleDpaDocument,
  type DpaAssembleInput,
} from "../../../supabase/functions/generate-dpa/_local/clause-library/dpa-assemble.ts";
import { DPA_REPORT_SCHEMA } from "../../../supabase/functions/generate-dpa/_local/report-schemas/dpa.ts";

const BASE_INPUT: DpaAssembleInput = {
  documentType: "gdpr",
  controllerName: "Busted Sled Solutions, Inc.",
  controllerJurisdiction: "Germany",
  processorName: "North Pole Manual Mining Ltd",
  processorJurisdiction: "Ireland",
  services: "Time & attendance workforce management",
  dataCategories: ["Name", "Employee ID", "Timestamp"],
  retention: "Fixed period: 3 years",
  hasSubProcessors: true,
  subProcessorList: "AWS (Cloud hosting, Ireland); Twilio — SMS delivery — United States",
  subprocessorAuthorizationModel: "general",
  subprocessorNoticeDays: 30,
  auditRights: "Annual audit on 30 days' notice",
  includeTransferClause: true,
  transferMechanism: "Standard Contractual Clauses",
  securityMeasuresSelected: ["encryption_at_rest", "access_controls"],
  securityMeasuresDetails: "",
  californiaEngaged: false,
};

Deno.test("RULING 9.2: contract.sections mirrors sections exactly — clauses.join('\\n') === body, same headings, same order", () => {
  for (const documentType of ["gdpr", "uk", "canada"] as const) {
    const assembled = assembleDpaDocument({ ...BASE_INPUT, documentType });
    assertEquals(assembled.contract.sections.length, assembled.sections.length, `[${documentType}] section count`);
    assembled.sections.forEach((flat, i) => {
      const c = assembled.contract.sections[i];
      assertEquals(c.heading, flat.heading, `[${documentType}] heading[${i}]`);
      assertEquals(c.clauses.join("\n"), flat.body, `[${documentType}] body[${i}] ("${flat.heading}")`);
    });
  }
});

Deno.test("RULING 9.2: US-required-terms section (California-engaged) also mirrors into contract.sections", () => {
  const assembled = assembleDpaDocument({ ...BASE_INPUT, documentType: "dual-eu-us", californiaEngaged: true });
  const flatUS = assembled.sections.find((s) => s.heading.includes("CCPA REQUIRED TERMS"));
  const contractUS = assembled.contract.sections.find((s) => s.heading.includes("CCPA REQUIRED TERMS"));
  assertExists(flatUS, "flat US-terms section missing");
  assertExists(contractUS, "contract US-terms section missing");
  assertEquals(contractUS!.clauses.join("\n"), flatUS!.body);
});

Deno.test("RULING 9.2: no unfilled {slot} tokens in the contract structure, any mode", () => {
  for (const documentType of ["gdpr", "uk", "dual-eu-us", "canada"] as const) {
    const assembled = assembleDpaDocument({ ...BASE_INPUT, documentType, californiaEngaged: documentType === "dual-eu-us" });
    const serialized = JSON.stringify(assembled.contract);
    const leftover = serialized.match(/\{[a-zA-Z]+\}/g);
    assertEquals(leftover, null, `[${documentType}] unfilled slots: ${leftover?.join(", ")}`);
  }
});

Deno.test("RULING 9.2: execution parties and all four annexes are never empty for a fully-specified record", () => {
  const assembled = assembleDpaDocument(BASE_INPUT);
  assertEquals(assembled.contract.execution.parties.length, 2);
  assert(assembled.contract.annexA.rows.length > 0, "annexA empty");
  assert(assembled.contract.annexB.rows.length > 0, "annexB empty");
  assert(assembled.contract.annexC.rows.length > 0, "annexC empty");
  assert(assembled.contract.annexD.rows.length > 0, "annexD empty");
});

Deno.test("RULING 9.2: no-subprocessor / empty-TOMS / no-transfer edge cases degrade honestly, not blank", () => {
  const edge = assembleDpaDocument({
    ...BASE_INPUT,
    hasSubProcessors: false,
    subProcessorList: "",
    includeTransferClause: false,
    securityMeasuresSelected: [],
    securityMeasuresDetails: "",
  });
  assertEquals(edge.contract.annexD.rows.length, 1);
  assertStringIncludes(edge.contract.annexD.rows[0][0], "None engaged");
  // The empty-TOMS fill-in checklist carries the full ratified taxonomy, not
  // a single placeholder row (doc 113 Part F / RULING D-1/D3).
  assert(edge.contract.annexC.rows.length >= 5, `annexC checklist too short: ${edge.contract.annexC.rows.length}`);
  for (const [label, status] of edge.contract.annexC.rows) {
    assertStringIncludes(status, "[TO BE COMPLETED:");
    assert(label.length > 0);
  }
});

Deno.test("RULING 9.2: Annex D places service/location correctly for both separator shapes (Batch 20b regression)", () => {
  const assembled = assembleDpaDocument({
    ...BASE_INPUT,
    subProcessorList: "AWS (Cloud hosting, Ireland); Twilio — SMS delivery — United States",
  });
  const [aws, twilio] = assembled.contract.annexD.rows;
  assertEquals(aws, ["AWS", "Cloud hosting", "Ireland", "[TO BE COMPLETED: date authorised]"]);
  assertEquals(twilio, ["Twilio", "SMS delivery", "United States", "[TO BE COMPLETED: date authorised]"]);
});

Deno.test("RULING 9.3: DPA_REPORT_SCHEMA allowlists dpa_contract (else the P2 serializer silently strips it)", () => {
  assert(DPA_REPORT_SCHEMA.topLevel.includes("dpa_contract"), "dpa_contract missing from DPA_REPORT_SCHEMA.topLevel");
  assert(DPA_REPORT_SCHEMA.topLevel.includes("clause_coverage"), "clause_coverage missing (needed for the Schedule table)");
});

// ── generate-report-pdf/index.ts: source-text checks (cannot be imported —
// it calls Deno.serve() at module scope; see c3-verdict-scoreboards.test.ts
// for the established convention this test follows). ──
const RENDERER_PATH = new URL("../../../supabase/functions/generate-report-pdf/index.ts", import.meta.url);

Deno.test("RULING 9.4: the dpa_generator branch gates contract mode on report_data.dpa_contract, with the legacy path preserved as the else branch", async () => {
  const src = await Deno.readTextFile(RENDERER_PATH);
  const dpaBranchStart = src.indexOf('tool_type === "dpa_generator"');
  assert(dpaBranchStart !== -1, "dpa_generator branch not found");
  const dpaBranch = src.slice(dpaBranchStart, dpaBranchStart + 2000);
  assertStringIncludes(dpaBranch, "dpaContractData");
  assertStringIncludes(dpaBranch, "buildDpaContractHTML(");
  assertStringIncludes(dpaBranch, "buildTextReportHTML({");
  assertStringIncludes(dpaBranch, "record.document_text || \"\"");
});

Deno.test("RULING 9.5: buildDpaContractHTML never calls the report-prose heuristics (no underlining/lead-phrase styling in contract mode)", async () => {
  const src = await Deno.readTextFile(RENDERER_PATH);
  const fnStart = src.indexOf("function buildDpaContractHTML(");
  assert(fnStart !== -1, "buildDpaContractHTML not found");
  // Slice to the next top-level function declaration (or EOF) as the body bound.
  const nextFn = src.indexOf("\nfunction ", fnStart + 10);
  const body = src.slice(fnStart, nextFn === -1 ? src.length : nextFn);
  assert(!body.includes("segmentDashText("), "contract mode must not invoke segmentDashText");
  assert(!body.includes("styleLeadPhrases("), "contract mode must not invoke styleLeadPhrases");
  assert(!body.includes("underlineAppendixRefs("), "contract mode must not invoke underlineAppendixRefs — no underlining anywhere in contract mode (doc 109 §1.7 item 9)");
  assertStringIncludes(body, "skeletonTableHtml(");
});

Deno.test("RULING 9.5: the Schedule table is sourced from clause_coverage, not re-parsed from the flat annex text", async () => {
  const src = await Deno.readTextFile(RENDERER_PATH);
  const fnStart = src.indexOf("function buildDpaContractHTML(");
  const nextFn = src.indexOf("\nfunction ", fnStart + 10);
  const body = src.slice(fnStart, nextFn === -1 ? src.length : nextFn);
  assertStringIncludes(body, "Schedule — Article 28(3) Clause-Coverage (Informational)");
  assertStringIncludes(body, "coverage?.clauses");
});
