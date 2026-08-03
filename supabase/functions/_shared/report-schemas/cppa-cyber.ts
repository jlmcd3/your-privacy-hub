// LEAK-PREV-P2 — CPPA Cybersecurity customer-report schema.
// Version: rs-w1-2026-07-25
//
// Derived from src/pages/CPPACybersecurityResult.tsx +
// src/components/cppa/CybersecurityReportBody.tsx +
// src/pages/CPPACybersecurityDrift.tsx (frontend audit),
// reconciled against run-cppa-cybersecurity report-assembly code.

import type { ReportSchema } from "../report-serialize.ts";

const CYBER_ENTRY_KEYS = [
  "id",
  "key",
  "control_id",
  "component",
  "component_id",
  "name",
  "title",
  "status",
  "readiness",
  "level",
  "score",
  "citation",
  "citations",
  "statutory_basis",
  "provision",
  "authority",
  "finding",
  "remediation",
  "action",
  "priority",
  "severity",
  "deadline",
  "deadline_basis",
  "description",
  "text",
  "note",
  "notes",
  "rationale",
  "topic",
  "source_fields",
  "insufficient_basis",
  "information_needed",
  "risk_type",
  "impact",
  "likelihood",
] as const;

export const CPPA_CYBER_REPORT_SCHEMA: ReportSchema = {
  // ITEM 371 W2 — wires the parked readiness/independence determinations and
  // the shared authority exhibit onto the customer surface.
  version: "rs-cppa-cyber-w2-2026-08-03",

  tool: "cppa_cybersecurity",
  topLevel: [
    // core presentation
    "readiness_level",
    "overall_score",
    "executive_summary",
    "controls",
    "top_risks",
    "next_steps",
    "citation_ledger",
    "readiness_determination",
    "independence_determination",
    "authority_exhibit",
    "annotations",
    "enforcement_context",
    "enforcement_precedents",
    "enforcement_meta",
    "framework_disclaimer",
    "disclaimer",
    "information_needed",
    "schema_version",
    "_meta",
  ],
  entries: {
    controls: CYBER_ENTRY_KEYS,
    top_risks: CYBER_ENTRY_KEYS,
    next_steps: CYBER_ENTRY_KEYS,
    citation_ledger: CYBER_ENTRY_KEYS,
    annotations: CYBER_ENTRY_KEYS,
    information_needed: CYBER_ENTRY_KEYS,
    enforcement_precedents: CYBER_ENTRY_KEYS,
  },
};

export const CPPA_CYBER_FRONTEND_READ_PATHS: readonly string[] = [
  "readiness_level",
  "overall_score",
  "executive_summary",
  "controls",
  "top_risks",
  "next_steps",
  "citation_ledger",
  "readiness_determination",
  "independence_determination",
  "authority_exhibit",
  "annotations",
  "enforcement_context",
  "enforcement_precedents",
  "enforcement_meta",
  "framework_disclaimer",
  "disclaimer",
  "information_needed",
];
