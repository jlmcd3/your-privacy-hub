// RC-REM-P1-C — DPA Generator intake contract.
//
// Intake shape verified against src/pages/DPAGenerator.tsx form state
// (~L61). Post-ruling: no dataSubjectCount. `documentType` is derived
// server-side (detectDocumentType) — marked structured/optional and noted
// as server-derived.
//
// Jurisdiction option lists are literal copies of @/lib/dpaDocumentType.

import type { IntakeContract } from "./types.ts";

const JURS_EU = [
  "Germany", "France", "Ireland", "Spain", "Italy", "Netherlands",
  "United Kingdom", "Belgium", "Sweden", "Denmark", "Poland", "Norway",
  "Portugal", "Austria", "Finland", "Luxembourg", "Greece", "Switzerland",
] as const;

const JURS_US = [
  "California", "Texas", "New York", "Connecticut", "Colorado", "Virginia",
  "Florida", "Washington", "Illinois", "Massachusetts", "Oregon", "Indiana",
  "Montana", "Iowa", "Tennessee", "Minnesota", "Utah", "Delaware",
  "United States (federal)",
] as const;

const JURS_CANADA = [
  "Canada (federal / PIPEDA)", "Quebec (Law 25)", "Ontario (PHIPA)",
  "British Columbia (PIPA)", "Alberta (PIPA)",
] as const;

const JURS_OTHER = ["Australia", "Singapore", "Japan", "Brazil", "Other"] as const;

const DATA_CATS = [
  "General personal data", "Financial / payment data", "Location data",
  "Health / medical data", "Employee / HR data", "Children's data (under 18)",
  "Biometric data", "Genetic data", "Criminal records",
] as const;

const LEGAL_FRAMEWORK = ["GDPR"] as const; // single option in form select
const AUDIT_RIGHTS = ["Standard"] as const;
const TRANSFER_MECHANISM = ["SCCs"] as const;

const JURISDICTIONS = [
  ...JURS_EU, ...JURS_US, ...JURS_CANADA, ...JURS_OTHER,
] as const;

export {
  DATA_CATS as DPA_DATA_CATS,
  JURISDICTIONS as DPA_JURISDICTIONS,
  LEGAL_FRAMEWORK as DPA_LEGAL_FRAMEWORK,
  AUDIT_RIGHTS as DPA_AUDIT_RIGHTS,
  TRANSFER_MECHANISM as DPA_TRANSFER_MECHANISM,
};

export const dpaGeneratorContract: IntakeContract = {
  tool_type: "dpa_generator",
  table: "dpa_generators",
  fields: [
    { key: "entityName", kind: "text", required: "always" },
    { key: "controllerName", kind: "text", required: "always" },
    { key: "controllerJurisdiction", kind: "enum", required: "always", options: JURISDICTIONS },
    { key: "processorName", kind: "text", required: "always" },
    { key: "processorJurisdiction", kind: "enum", required: "always", options: JURISDICTIONS },
    { key: "services", kind: "narrative", required: "always" },
    { key: "dataCategories", kind: "multi-enum", required: "always", options: DATA_CATS },
    { key: "retention", kind: "text", required: "optional" },
    { key: "hasSubProcessors", kind: "boolean", required: "optional" },
    { key: "subProcessorList", kind: "text", required: "optional" },
    { key: "legalFramework", kind: "enum", required: "optional", options: LEGAL_FRAMEWORK },
    { key: "auditRights", kind: "enum", required: "optional", options: AUDIT_RIGHTS },
    { key: "includeTransferClause", kind: "boolean", required: "optional" },
    { key: "transferMechanism", kind: "enum", required: "optional", options: TRANSFER_MECHANISM },
    // documentType — server-derived via detectDocumentType(controllerJurisdiction,
    // processorJurisdiction) at invoke time. Not part of the client form
    // state; carried as structured/optional for downstream visibility.
    { key: "documentType", kind: "structured", required: "optional" },
  ],
};
