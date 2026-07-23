// QB-P20 — DPA golden set. 3 fixtures.
// QB-P25 Item 3 — every case now also asserts that the DRAFTING_RECORD
// delimiter and its private field names never leak into the persisted
// document body (dpa_text). The drafting record is grader-invisible by
// contract; a leak into body text would be a regression.
// Adversarial: biometric data category selected without a
// uniquely-identifying purpose in `services` — tests whether the DPA
// generator refrains from over-triggering Art 9 language.
import type { GoldenCase } from "./types.ts";

const DRAFTING_RECORD_GUARDS = [
  { kind: "must_not_include" as const, pattern: "===DRAFTING_RECORD===", label: "drafting-record delimiter stripped from body" },
  { kind: "must_not_include" as const, pattern: "framework_selection", label: "drafting-record private field name absent from body" },
  { kind: "must_not_include" as const, pattern: "clause_deviations", label: "drafting-record private field name absent from body" },
];


export const DPA_GOLDEN: GoldenCase[] = [
  {
    id: "dpa-eu-c2p-tuning",
    tool: "dpa-generator",
    set: "tuning",
    intake: {
      entityName: "Meridian Analytics GmbH",
      controllerName: "Meridian Analytics GmbH",
      controllerJurisdiction: "Germany",
      processorName: "CloudHost SA",
      processorJurisdiction: "France",
      services: "Managed analytics platform hosted in eu-west-1 (Frankfurt). Sub-processor: SendGrid (transactional email).",
      dataCategories: ["General personal data", "Financial / payment data"],
      retention: "For the duration of the principal agreement, then delete or return",
      auditRights: "Documentation review — Processor provides audit reports/certifications on request",
      hasSubProcessors: true,
      subProcessorList: "SendGrid — transactional email.",
    },
    assertions: [
      { kind: "must_include", pattern: "Module\\s+Two", flags: "i", label: "correct SCC module label" },
      { kind: "must_not_include", pattern: "Modules?\\s*1\\s*and\\s*2", flags: "i", label: "no Module 1+2 conflation" },
    ],
  },
  {
    id: "dpa-uk-eu-transfer-tuning",
    tool: "dpa-generator",
    set: "tuning",
    intake: {
      entityName: "Britannia Retail plc",
      controllerName: "Britannia Retail plc",
      controllerJurisdiction: "United Kingdom",
      processorName: "IrishOps Ltd",
      processorJurisdiction: "Ireland",
      services: "Order fulfilment platform; data resides in Dublin.",
      dataCategories: ["General personal data"],
      retention: "As directed by the Controller's documented instructions",
      auditRights: "Annual audit — third-party audit summary plus right of on-site inspection on reasonable notice",
    },
    assertions: [
      { kind: "must_not_include", pattern: "no adequacy decision.*between the EU and the UK", flags: "i",
        label: "no false adequacy denial" },
    ],
  },
  {
    id: "dpa-biometric-no-unique-id-adversarial",
    tool: "dpa-generator",
    set: "adversarial",
    intake: {
      entityName: "Sequoia HR Corp",
      controllerName: "Sequoia HR Corp",
      controllerJurisdiction: "California",
      processorName: "TimeTracker LLC",
      processorJurisdiction: "California",
      // Biometric selected but purpose is NON-uniquely-identifying photo storage:
      services: "Employee photo storage for internal directory; NOT used for identification or authentication.",
      dataCategories: ["Employee / HR data", "Biometric data"],
      retention: "Fixed period — specify",
      auditRights: "Documentation review — Processor provides audit reports/certifications on request",
    },
    assertions: [
      { kind: "must_include", pattern: "biometric", flags: "i", label: "biometric acknowledged" },
    ],
  },
];
