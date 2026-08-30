// PANEL FIX BATCH 7 (2026-08-30) — DPA defects from the expert-panel review
// (doc 108 / panel-C memo 2), verified against the published golden sample:
//   DPA-P1 (D4)  clause 8.1 asserted "no transfer of Personal Data" on a
//                UK-controller / German-processor instrument — legally
//                wrong on the face of the parties block (UK↔EEA moves are
//                restricted transfers, lawful under the mutual adequacy
//                decisions) — while Annex A used SCC exporter/importer
//                vocabulary against the no-transfer stance;
//          (D5)  every framework reference was EU-GDPR-only under English
//                governing law with UK-based data subjects — the UK GDPR
//                was never named.
//   DPA-P2 (D6, the 4.6/10.2 pair): resolved by A-Team Session 1 RULING 2
//   (doc 111, 2026-08-30, under the CEO's delegated authority) — doc-81
//   D-5 modified: 4.6 is the single operative duty, 10.2 a cross-reference.
// All non-UK/EEA pairs keep the ratified clause bytes unchanged (asserted
// below).

import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { assembleDpaDocument, type DpaAssembleInput } from "../../../supabase/functions/generate-dpa/_local/clause-library/dpa-assemble.ts";
import { ukEeaAdequacySplit } from "../../../supabase/functions/generate-dpa/_local/clause-library/dpa-clause-library.ts";

const BASE: DpaAssembleInput = {
  documentType: "gdpr",
  controllerName: "Frostbyte Payroll Ltd",
  controllerJurisdiction: "United Kingdom",
  processorName: "Zugspitze HR Systems GmbH",
  processorJurisdiction: "Germany",
  services: "payroll processing and HR records hosting",
  dataCategories: ["Employee / HR data"],
  retention: "Active employment plus 6 years post-termination",
  hasSubProcessors: false,
  subProcessorList: "",
  subprocessorAuthorizationModel: "general",
  subprocessorNoticeDays: 30,
  auditRights: "Annual third-party audit summary plus on-site inspection on reasonable notice",
  includeTransferClause: false,
  transferMechanism: "",
  securityMeasuresSelected: ["encryption_at_rest"],
  securityMeasuresDetails: "",
  californiaEngaged: false,
};

Deno.test("DPA-P1/D4: a UK↔EEA pair never asserts 'no transfer' — clause 8.1 states the adequacy basis", () => {
  const t = assembleDpaDocument(BASE).document_text;
  assert(!t.includes("involves no transfer of Personal Data"), "'no transfer' asserted against the parties' own geography");
  assert(t.includes("under the applicable adequacy decisions"), "adequacy basis absent");
  assert(t.includes("UK International Data Transfer Agreement or Addendum"), "fallback mechanism absent");
  assert(
    t.includes("Transfers: between the United Kingdom and the EEA under the applicable adequacy decisions"),
    "Annex B contradicts clause 8.1",
  );
});

Deno.test("DPA-P1/D5: a gdpr-mode instrument with a UK party carries the dual-regime citation", () => {
  const t = assembleDpaDocument(BASE).document_text;
  assert(
    t.includes("the UK GDPR as defined in section 3(10) of the Data Protection Act 2018"),
    "UK GDPR never named on a UK-party instrument",
  );
});

Deno.test("DPA-P1: a pure-EEA pair keeps the ratified no-transfer clause byte-unchanged, with plain party labels", () => {
  const t = assembleDpaDocument({
    ...BASE,
    controllerName: "Acme GmbH",
    controllerJurisdiction: "Germany",
  }).document_text;
  assert(
    t.includes(
      "8.1 The Parties have recorded that the processing involves no transfer of Personal Data across the recorded jurisdictions or onward to a third country.",
    ),
    "ratified no-transfer sentence changed for a non-UK/EEA pair",
  );
  assert(!t.includes("the UK GDPR as defined in section 3(10)"), "dual-regime citation leaked to a non-UK pair");
  assert(t.includes("\nController: Acme GmbH"), "plain Controller label absent on a no-transfer instrument");
  assert(!t.includes("Data exporter / Controller"), "SCC exporter label against a no-transfer stance");
});

Deno.test("DPA-P1: a recorded transfer keeps the exporter/importer labels", () => {
  const t = assembleDpaDocument({
    ...BASE,
    controllerJurisdiction: "Germany",
    includeTransferClause: true,
    transferMechanism: "EU standard contractual clauses (2021/914), Module 2",
  }).document_text;
  assert(t.includes("Data exporter / Controller"), "exporter label missing where a transfer is framed");
});

// RE-PIN A-TEAM SESSION 1, RULING 2 (2026-08-30, doc 111): doc-81 D-5 is
// MODIFIED under the CEO's delegated authority — 4.6 stays the single
// operative duty (Commission SCC placement); 10.2 becomes a cross-reference
// retaining its D-5 opening phrase; the duty sentence appears exactly once.
Deno.test("RULING 2: clause 4.6 carries the duty once; 10.2 cross-references it with the D-5 opening intact", () => {
  const t = assembleDpaDocument(BASE).document_text;
  assert(t.includes("4.6 (Instruction infringement notice.)"), "clause 4.6 removed — contradicts RULING 2");
  assert(t.includes("10.2 With regard to the information and audit rights in this Section 10"), "10.2's D-5 opening phrase lost");
  assert(t.includes("is governed by clause 4.6 (Instruction infringement notice)"), "10.2 cross-reference absent");
  const dutyCount = t.split("shall immediately inform the Controller if, in its opinion, an instruction infringes").length - 1;
  assert(dutyCount === 1, `the Art. 28(3) second-subparagraph duty must appear exactly once, saw ${dutyCount}`);
});

Deno.test("ukEeaAdequacySplit: word-boundary and Northern Ireland guards", () => {
  assertEquals(ukEeaAdequacySplit("United Kingdom", "Germany"), true);
  assertEquals(ukEeaAdequacySplit("Germany", "United Kingdom"), true);
  assertEquals(ukEeaAdequacySplit("Germany", "Germany"), false);
  assertEquals(ukEeaAdequacySplit("United Kingdom", "United States"), false);
  // "Northern Ireland" contains "ireland" — it must stay a UK party, so a
  // Northern Ireland / Ireland pair IS a UK↔EEA split…
  assertEquals(ukEeaAdequacySplit("Northern Ireland", "Ireland"), true);
  // …and a Northern Ireland / United Kingdom pair is not a split at all.
  assertEquals(ukEeaAdequacySplit("Northern Ireland", "United Kingdom"), false);
  // Ukraine must not match the word-bounded UK test (doc-81 D-8).
  assertEquals(ukEeaAdequacySplit("Ukraine", "Germany"), false);
});
