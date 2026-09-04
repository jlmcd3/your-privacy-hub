// RC-REM-P1-C — DPA Generator intake contract.
// CEO ruling 2026-07-14: retention / auditRights / transfer question are ASKED
// with fold-in "Other: …" / "Fixed period: …" conventions; legalFramework and
// includeTransferClause are DERIVED server-side (frameworkFor(documentType);
// transfersInvolved === "Yes").
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

// Post-ruling enums with the exact option strings from src/pages/DPAGenerator.tsx.
// The three fold-in fields ("Fixed period — specify" and "Custom — describe")
// are enum members; the free-text tail is wired at the page layer as
// "Fixed period: <text>" / "Other: <text>" and remains verbatim on the wire.
const RETENTION_OPTIONS = [
  "As directed by the Controller's documented instructions",
  "For the duration of the principal agreement, then delete or return",
  "Fixed period — specify",
] as const;

const AUDIT_RIGHTS_OPTIONS = [
  "Documentation review — Processor provides audit reports/certifications on request",
  "Annual audit — third-party audit summary plus right of on-site inspection on reasonable notice",
  "Enhanced — on-site inspection on 30 days' notice plus continuous evidence access",
  "Custom — describe",
] as const;

const TRANSFER_MECHANISM_OPTIONS = [
  "EU Standard Contractual Clauses (SCCs)",
  "UK IDTA / UK Addendum to EU SCCs",
  "Binding Corporate Rules",
  "Adequacy decision or regulations",
  "None in place yet",
] as const;

const JURISDICTIONS = [
  ...JURS_EU, ...JURS_US, ...JURS_CANADA, ...JURS_OTHER,
] as const;

export {
  DATA_CATS as DPA_DATA_CATS,
  JURISDICTIONS as DPA_JURISDICTIONS,
  RETENTION_OPTIONS as DPA_RETENTION_OPTIONS,
  AUDIT_RIGHTS_OPTIONS as DPA_AUDIT_RIGHTS_OPTIONS,
  TRANSFER_MECHANISM_OPTIONS as DPA_TRANSFER_MECHANISM_OPTIONS,
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
    // Fold-in fields — the enum carries the "Fixed period — specify" /
    // "Custom — describe" member; downstream wire values may be
    // "Fixed period: <text>" or "Other: <text>", which validators recognise
    // as fold-in extensions of the enum member.
    { key: "retention", kind: "text", required: "always" },
    { key: "hasSubProcessors", kind: "boolean", required: "optional" },
    { key: "subProcessorList", kind: "text", required: "optional" },
    { key: "auditRights", kind: "text", required: "always" },
    // includeTransferClause + legalFramework are SERVER-DERIVED — carried as
    // structured/optional for downstream visibility. legalFramework is
    // derived from documentType via frameworkFor(); includeTransferClause is
    // derived from the "transfers involved?" answer on the form.
    { key: "includeTransferClause", kind: "structured", required: "optional" },
    { key: "legalFramework", kind: "structured", required: "optional" },
    { key: "transferMechanism", kind: "text", required: "optional" },
    // documentType — server-derived via detectDocumentType(controllerJurisdiction,
    // processorJurisdiction) at invoke time.
    { key: "documentType", kind: "structured", required: "optional" },

    // S-D7 (doc 80, 2026-08-27) — the Art. 28(2) authorisation-model axis.
    // Absent -> "general" (the pre-S-D7 behavior exactly).
    { key: "subprocessorAuthorizationModel", kind: "enum", required: "optional", options: ["general", "specific"] },
    // INTAKE-2 — the advance-notice window (days) before a Sub-processor
    // change under the general authorisation; the page sends it as digits
    // and the handler parses it (absent/unparseable -> the 30-day default).
    // DOC 183 (2026-09-04): listed here so the sample-fixture contract check
    // recognises the key the page has been sending.
    { key: "subprocessorChangeNoticePeriod", kind: "text", required: "optional" },
    // S-D2 (doc 80, 2026-08-27) — the structured TOMs intake (PN-D6): ids
    // from the DPA_TOMS_TAXONOMY registry (unknown ids are dropped by the
    // resolver, never invented) plus optional free-text specifics.
    { key: "securityMeasuresSelected", kind: "structured", required: "optional" },
    { key: "securityMeasuresDetails", kind: "narrative", required: "optional" },
  ],
};
