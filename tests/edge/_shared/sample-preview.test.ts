// DOC 183 (2026-09-04) — the truncated sample preview, aligned with the
// fleet's report changes: Syllabus & Record page one is the contents page
// (no second TOC, one page of sections after it); numbered ALL-CAPS headings
// (the doc-182 DPA, the doc-180/181 Notices) split as headings; the DPA's
// public preview is the first pages of its formal-instrument PDF with the
// contract's outline as its table of contents; captured HTML outlines feed
// the Notices' TOC.

import { assert, assertEquals, assertStringIncludes } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  buildPreview,
  cutProse,
  cutSkeleton,
  documentOutline,
  extractHtmlOutline,
  hasSyllabus,
  keepCount,
  outlineTitle,
  PREVIEW_MAX_SECTIONS,
  PREVIEW_MAX_SECTIONS_AFTER_SYLLABUS,
  splitProseSections,
  SYLLABUS_TYPED,
} from "../../../supabase/functions/_shared/sample-preview.ts";
import { PDF_FIRST_TOOLS, previewPlan } from "../../../supabase/functions/_shared/sample-preview-build.ts";
import { assembleDpaDocument, type DpaAssembleInput } from "../../../supabase/functions/generate-dpa/_local/clause-library/dpa-assemble.ts";

const para = (n: number) => ({ kind: "body", text: "x".repeat(n) });
const section = (i: number, n: number) => ({ id: `s${i}`, title: `${i}. Section ${i}`, paragraphs: [para(n)] });

const SYLLABUS = {
  _typed: SYLLABUS_TYPED,
  instrument_line: "DPIA · GDPR Article 35",
  prepared_for: "Misfit Toys Logistics Ltd",
  activity: "Warehouse telematics",
  subtitle: "Data protection impact assessment",
  disposition_label: "ASSESSMENT DISPOSITION",
  disposition: "Proceed with Conditions",
  disposition_tone: "hold",
  paragraph: "One justified paragraph.",
  rows: [["Necessity", "Necessary to the stated purpose"]],
  conditions_heading: "CONDITIONS TO PROCEED",
  conditions: [{ name: "Retention", text: "Cap at 24 months." }],
  key_dates: [["Review", "2027-03-01"]],
  record_map: [["A", "Table of Authorities", "Every authority cited."]],
  running_head: "DPIA · MISFIT TOYS LOGISTICS LTD",
};

const SR_DOC = {
  title: "Data Protection Impact Assessment",
  syllabus: SYLLABUS,
  sections: [section(1, 1500), section(2, 1500), section(3, 1500), section(4, 900), { id: "appA", title: "Appendix A — Table of Authorities", paragraphs: [para(400)] }],
};

// Titles add 12 chars each: three 1200-char sections (3636) fit the 4500 budget; a fourth does not.
const LEGACY_DOC = { title: "Legacy report", sections: [section(1, 1200), section(2, 1200), section(3, 1200), section(4, 900)] };

Deno.test("doc183 — a Syllabus & Record document keeps page one and one page of sections, and adds no second table of contents", () => {
  assert(hasSyllabus(SR_DOC));
  const { doc, toc, withheld, pageOneHasContents } = cutSkeleton(SR_DOC);
  assertEquals(doc.syllabus, SYLLABUS, "the syllabus page one survives the cut");
  assertEquals(doc.title, SR_DOC.title);
  assert(doc.sections!.length <= PREVIEW_MAX_SECTIONS_AFTER_SYLLABUS, `kept ${doc.sections!.length}`);
  assertEquals(doc.sections!.length, 1, "1500 + 1500 exceeds the one-page budget, so page two carries the first section only");
  assertEquals(toc, [], "page one already lists the record");
  assertEquals(withheld, 4);
  assertEquals(pageOneHasContents, true);
  const preview = buildPreview({ report_data: { skeleton_document: SR_DOC, _meta: { leak: true } } });
  assertEquals(Object.keys(preview.preview_report_data ?? {}), ["skeleton_document"]);
  assertEquals(preview.preview_toc, []);
  assertEquals(preview.withheld_section_count, 4);
  assertEquals(preview.page_one_has_contents, true);
  // Two short sections fit the page; a third never joins them.
  const short = cutSkeleton({ ...SR_DOC, sections: [section(1, 900), section(2, 900), section(3, 300), section(4, 300)] });
  assertEquals(short.doc.sections!.length, PREVIEW_MAX_SECTIONS_AFTER_SYLLABUS);
  assertEquals(short.toc, []);
  assertEquals(short.withheld, 2);
});

Deno.test("doc183 — a document without a syllabus keeps the pre-existing cut (up to three sections, titled TOC of the rest)", () => {
  assert(!hasSyllabus(LEGACY_DOC));
  const { doc, toc, withheld, pageOneHasContents } = cutSkeleton(LEGACY_DOC);
  assertEquals(doc.sections!.length, PREVIEW_MAX_SECTIONS);
  assertEquals(toc, [{ title: "4. Section 4", index: 4 }]);
  assertEquals(withheld, 1);
  assertEquals(pageOneHasContents, false);
  assertEquals(keepCount([100, 100, 100, 100]), 3);
  assertEquals(keepCount([100, 100, 100, 100], { max: 2, budget: 150 }), 1, "the second section would exceed the budget");
  assertEquals(keepCount([100, 40, 100, 100], { max: 2, budget: 150 }), 2, "two fit; the max stops a third");
  assertEquals(keepCount([5000, 100]), 1, "the first section is always kept");
});

Deno.test("doc183 — the prose splitter recognises numbered ALL-CAPS headings, annexes and addendum titles", () => {
  const text = [
    "1. PARTIES AND RECITALS",
    "1.1 This Data Processing Agreement (\"DPA\") is entered into between Acme GmbH and CloudOps GmbH.",
    "1.2 The Controller wishes to engage the Processor.",
    "",
    "2. DEFINITIONS",
    "2.1 \"Personal Data\" has the meaning given in the GDPR.",
    "",
    "4. DATA PROCESSING — OBLIGATIONS OF THE PROCESSOR",
    "4.1 (Documented instructions — Art. 28(3)(a).) The Processor shall process only on instructions.",
    "",
    "EXECUTION",
    "IN WITNESS WHEREOF, the Parties have executed this DPA.",
    "",
    "ANNEX A — PARTIES",
    "Controller: Acme GmbH",
    "",
    "CCPA SERVICE PROVIDER ADDENDUM",
    "California Consumer Privacy Act, as amended",
  ].join("\n");
  const sections = splitProseSections(text);
  assertEquals(sections.map((s) => s.heading), [
    "1. PARTIES AND RECITALS",
    "2. DEFINITIONS",
    "4. DATA PROCESSING — OBLIGATIONS OF THE PROCESSOR",
    "EXECUTION",
    "ANNEX A — PARTIES",
    "CCPA SERVICE PROVIDER ADDENDUM",
  ]);
  // Clause lines are never headings.
  assert(sections[0].body.includes("1.1 This Data Processing Agreement"));
  assert(sections[2].body.includes("4.1 (Documented instructions"));
});

Deno.test("doc183 — a real assembled DPA no longer leaks its whole core: the prose cut keeps the opening numbered sections", () => {
  const input: DpaAssembleInput = {
    documentType: "gdpr",
    controllerName: "Acme GmbH",
    controllerJurisdiction: "Germany",
    processorName: "CloudOps GmbH",
    processorJurisdiction: "Germany",
    services: "cloud hosting",
    dataCategories: ["General personal data"],
    retention: "For the duration of the principal agreement, then delete or return",
    hasSubProcessors: false,
    subProcessorList: "",
    subprocessorAuthorizationModel: "general",
    subprocessorNoticeDays: 30,
    auditRights: "Annual audit",
    includeTransferClause: false,
    transferMechanism: "",
    securityMeasuresSelected: [],
    securityMeasuresDetails: "",
    californiaEngaged: false,
  };
  const doc = assembleDpaDocument(input);
  const { text, toc } = cutProse(doc.document_text);
  assert(text.length < doc.document_text.length / 3, `kept ${text.length} of ${doc.document_text.length} chars`);
  assertStringIncludes(text, "1. PARTIES AND RECITALS");
  assert(!text.includes("9. RETURN OR DELETION"), "the cut stops long before the core ends");
  assert(toc.some((e) => e.title === "9. RETURN OR DELETION"));
  assert(toc.some((e) => e.title.startsWith("ANNEX A")));
  assert(toc.some((e) => e.title === "EXECUTION"));
});

Deno.test("doc183 — the DPA's public preview is its PDF with the structured contract as the table of contents", () => {
  assert(PDF_FIRST_TOOLS.has("dpa"));
  const input: DpaAssembleInput = {
    documentType: "dual-eu-us",
    controllerName: "Acme GmbH",
    controllerJurisdiction: "Germany",
    processorName: "Golden State Cloud, Inc.",
    processorJurisdiction: "California",
    services: "cloud hosting",
    dataCategories: ["General personal data"],
    retention: "24 months",
    hasSubProcessors: false,
    subProcessorList: "",
    subprocessorAuthorizationModel: "general",
    subprocessorNoticeDays: 30,
    auditRights: "Annual audit",
    includeTransferClause: true,
    transferMechanism: "EU Standard Contractual Clauses (SCCs)",
    securityMeasuresSelected: [],
    securityMeasuresDetails: "",
    californiaEngaged: true,
  };
  const doc = assembleDpaDocument(input);
  const row = { tool_slug: "dpa", document_text: doc.document_text, report_data: { dpa_contract: doc.contract, clause_coverage: null }, pdf_path: "dpa/eu--payroll.pdf" };
  const plan = previewPlan(row);
  assertEquals(plan.mode, "pdf");
  assertEquals(plan.preview_document_text, null);
  assertEquals(plan.preview_report_data, null);
  const titles = plan.preview_toc.map((e) => e.title);
  assertEquals(titles[0], "1. Parties and Recitals");
  assert(titles.includes("12. Prohibited Processing and CCPA Required Terms"));
  assert(titles.includes("Execution"));
  assert(titles.includes("Annex D — Sub-processors"));
  assert(titles.includes("CCPA Service Provider Addendum"));
  assert(titles.includes("EU Standard Contractual Clauses — Module Two Implementation Exhibit"));
  // Without a stored PDF the DPA falls back to the prose cut.
  const fallback = previewPlan({ ...row, pdf_path: null });
  assertEquals(fallback.mode, "content");
  assertStringIncludes(fallback.preview_document_text ?? "", "1. PARTIES AND RECITALS");
});

Deno.test("doc183 — a file-driven notice sample takes its table of contents from the outline captured at generation", () => {
  const html = `<h1>Acme — U.S. Privacy Notice</h1><h2 id="sec-collect">2. Categories of Personal Information We Collect</h2><p>x</p><h2>3. Sources &amp; Origins</h2><h2>Appendix A — California Notice at Collection</h2>`;
  const outline = extractHtmlOutline(html);
  assertEquals(outline, ["2. Categories of Personal Information We Collect", "3. Sources & Origins", "Appendix A — California Notice at Collection"]);
  const plan = previewPlan({ tool_slug: "us_notice", document_text: null, report_data: { document_outline: outline }, pdf_path: "us_notice/us--app.pdf" });
  assertEquals(plan.mode, "pdf");
  assertEquals(plan.preview_toc.map((e) => e.title), outline);
  // RoPA (no outline captured) still previews as a PDF with an empty TOC.
  const ropa = previewPlan({ tool_slug: "ropa", document_text: null, report_data: null, pdf_path: "ropa/eu.pdf" });
  assertEquals(ropa.mode, "pdf");
  assertEquals(ropa.preview_toc, []);
  // Nothing at all → none.
  assertEquals(previewPlan({ tool_slug: "ropa", document_text: null, report_data: null, pdf_path: null }).mode, "none");
});

Deno.test("doc183 — outline titles read as headings, acronyms intact", () => {
  assertEquals(outlineTitle("4. DATA PROCESSING — OBLIGATIONS OF THE PROCESSOR"), "4. Data Processing — Obligations of the Processor");
  assertEquals(outlineTitle("12. PROHIBITED PROCESSING AND CCPA REQUIRED TERMS"), "12. Prohibited Processing and CCPA Required Terms");
  assertEquals(outlineTitle("Already Cased"), "Already Cased");
  assertEquals(documentOutline(null), []);
});
