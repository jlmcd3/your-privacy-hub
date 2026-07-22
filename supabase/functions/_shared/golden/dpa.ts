// QB-P20 — DPA golden set. 3 fixtures.
// Adversarial: biometric data category selected without a
// uniquely-identifying purpose in `services` — tests whether the DPA
// generator refrains from over-triggering Art 9 language.
import type { GoldenCase } from "./types.ts";

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
