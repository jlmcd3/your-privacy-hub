// DOC-81 (2026-08-27) — the ratification-ledger review. Pins the fixes
// implemented from 81-RATIFICATION-LEDGER-REVIEW-DPA-GOVERNANCE.docx: the
// mode gate (D-1), UK domestic-law variant (D-2), the drafting-note deletion
// (D-3), the placeholder-neutral governing-law clause (D-4), the flow-down
// clause rewrite (D-5), the DPA definition (D-6), the CCPA role mapping
// (D-7), the Ukraine regex fix (D-8), the grammar fix (D-9), the floored
// 15-day objection window (D-10), the recital reword (D-11), the Quebec
// citation (D-12), the bracketed-number strictness items (D-13), the
// SIGNATURE-EXECUTION token removal (A-1), the model-retry gate (A-2), and
// the completeness-check needle widening (A-3).

import { assert, assertEquals, assertStringIncludes } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  assembleDpaDocument,
  checkDpaCompleteness,
  type DpaAssembleInput,
} from "../../../supabase/functions/generate-dpa/_local/clause-library/dpa-assemble.ts";
import {
  DPA_DETERMINISTIC_MODES,
  governingLawClause,
  subprocessorAuthorisationClause,
  ukDomesticLawVariant,
} from "../../../supabase/functions/generate-dpa/_local/clause-library/dpa-clause-library.ts";

const BASE: DpaAssembleInput = {
  documentType: "gdpr",
  controllerName: "Acme GmbH",
  controllerJurisdiction: "Germany",
  processorName: "CloudOps GmbH",
  processorJurisdiction: "Germany",
  services: "cloud hosting and managed backups for the Controller's ERP system",
  dataCategories: ["General personal data"],
  retention: "For the duration of the principal agreement, then delete or return",
  hasSubProcessors: true,
  subProcessorList: "Hetzner Online GmbH",
  subprocessorAuthorizationModel: "general",
  subprocessorNoticeDays: 30,
  auditRights: "Annual audit",
  includeTransferClause: false,
  transferMechanism: "",
  securityMeasuresSelected: [],
  securityMeasuresDetails: "",
  californiaEngaged: false,
};

Deno.test("D-1 — the deterministic-mode set is the GDPR family plus us-state", () => {
  assertEquals([...DPA_DETERMINISTIC_MODES].sort(), ["dual-eu-ca", "dual-eu-us", "gdpr", "uk", "us-state"]);
  assert(!(DPA_DETERMINISTIC_MODES as readonly string[]).includes("canada"));
});

Deno.test("D-2 — ukDomesticLawVariant substitutes both the short and long forms", () => {
  const t = "unless required to do so by Union or Member State law, or other Union or Member State data protection provisions.";
  const out = ukDomesticLawVariant(t);
  assertStringIncludes(out, "unless required to do so by domestic law");
  assertStringIncludes(out, "other domestic data protection provisions");
  assert(!out.includes("Union or Member State"));
});

Deno.test("D-3 — no drafting-note sentence in the mechanism-outstanding transfer clause", () => {
  const t = assembleDpaDocument({ ...BASE, includeTransferClause: true, transferMechanism: "None in place yet" }).document_text;
  assertStringIncludes(t, "shall not commence until an appropriate safeguard is executed");
  assert(!t.includes("carries the mechanism as outstanding"));
});

Deno.test("D-4 — US governing law is a placeholder, not a suggested state; the regex is anchored", () => {
  assertStringIncludes(governingLawClause("United States"), "[TO BE COMPLETED: the U.S. state whose law will govern]");
  assert(!governingLawClause("United States").includes("Delaware"));
  // Anchored: a jurisdiction merely containing "federal" must not match.
  assert(!governingLawClause("Federated States of Micronesia").includes("[TO BE COMPLETED: the U.S. state"));
});

Deno.test("D-5 — clause 10.2 scopes to the audit-and-information rights, not a nonexistent clause 10.1 instruction", () => {
  const t = assembleDpaDocument(BASE).document_text;
  assertStringIncludes(t, "With regard to the information and audit rights in this Section 10");
  assert(!t.includes("an instruction given under clause 10.1"));
});

Deno.test("D-6 — the DPA definition disambiguates against a data protection authority", () => {
  const t = assembleDpaDocument(BASE).document_text;
  assertStringIncludes(t, "not used to refer to any data protection authority");
});

Deno.test("D-7 — Section 12 defines the CCPA role mapping and citations before using them", () => {
  const t = assembleDpaDocument({ ...BASE, documentType: "us-state", controllerJurisdiction: "California", californiaEngaged: true }).document_text;
  assertStringIncludes(t, 'the Controller is a "Business" and the Processor is a "Service Provider"');
  assertStringIncludes(t, "Cal. Civ. Code § 1798.140");
  assertStringIncludes(t, "same level of privacy protection as the CCPA requires");
  assert(!t.includes("as the title requires"));
  assert(!t.includes("except as permitted by the regulations"));
  assert(!t.includes("CCPA/CPRA"));
});

Deno.test("D-8 — Ukraine is not matched as the UK; the baseline clause still renders for it", () => {
  const t = assembleDpaDocument({ ...BASE, controllerJurisdiction: "Ukraine", processorJurisdiction: "Ukraine" }).document_text;
  assertStringIncludes(t, "this DPA adopts the GDPR Article 28(3) framework as its contractual baseline standard");
});

Deno.test("D-9 — clause 6.2 reads \"within ... of receiving\", matching 12.7's grammar", () => {
  const t = assembleDpaDocument(BASE).document_text;
  assertStringIncludes(t, "within five (5) business days of receiving any data subject request directly");
  assert(!t.includes("within five (5) business days upon receiving"));
});

Deno.test("D-10 — the objection window is floored at 15 and renders bracketed", () => {
  const short = subprocessorAuthorisationClause("general", 5, true);
  assertStringIncludes(short, "at least 15 days before");
  assertStringIncludes(short, "object within [15] days");
  const long = subprocessorAuthorisationClause("general", 45, true);
  assertStringIncludes(long, "at least 45 days before");
  assertStringIncludes(long, "object within [15] days");
});

Deno.test("D-11 — the role recital ends in party voice, no advisory language", () => {
  const t = assembleDpaDocument({ ...BASE, services: "adtech optimisation services" }).document_text;
  assertStringIncludes(t, "the Parties will review this characterisation if the Services change");
  assert(!t.includes("further clarification is advisable"));
});

Deno.test("D-13 — bracketed-number strictness items render as [N], not spelled-out numerals", () => {
  const t = assembleDpaDocument(BASE).document_text;
  assertStringIncludes(t, "for a period of at least [3] years thereafter");
  assertStringIncludes(t, "within [48] hours");
  const ca = assembleDpaDocument({ ...BASE, documentType: "us-state", controllerJurisdiction: "California", californiaEngaged: true }).document_text;
  assertStringIncludes(ca, "at least once every [12] months");
});

Deno.test("A-1 — no bracketed internal token before the execution block", () => {
  const t = assembleDpaDocument(BASE).document_text;
  assert(!t.includes("[SIGNATURE-EXECUTION]"));
  assertStringIncludes(t, "EXECUTION\nIN WITNESS WHEREOF");
});

Deno.test("A-3 — checkDpaCompleteness matches full section phrases, not colliding first words", () => {
  const doc = assembleDpaDocument(BASE);
  // Every real required section is present.
  assertEquals(checkDpaCompleteness(doc), []);
  // A document missing "Data Processing" but carrying "Data Transfers"
  // must be caught, not falsely passed by a "data" substring match.
  const missing = {
    ...doc,
    sections: doc.sections.filter((s) => !s.heading.startsWith("4.")),
  };
  const problems = checkDpaCompleteness(missing);
  assert(problems.some((p) => p.includes("Data Processing")), problems.join("; "));
});
