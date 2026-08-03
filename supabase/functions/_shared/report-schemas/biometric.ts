// LEAK-PREV-P2 — Biometric Compliance customer-report schema.
// Version: rs-biometric-w1-2026-08-03
//
// DERIVATION (read, not guessed): the persisted `report_data` object in
// supabase/functions/check-biometric-compliance/index.ts is built at L2008
// (terminal assembly on the live path) and then extended in place by:
//   L2038  attachDeterministicChecks → writes ONLY `_meta.internal`
//          (_shared/advisory-voice.ts L164-179) — no new top-level key
//   L2043  guardInformationNeeded → `information_needed` and `lint_warnings`
//          (_shared/insufficient-info-guard.ts L208/254/297/353)
// It is persisted at L2075 / L2115 as `report_data`.
//
// The stress-harness branch at L1313 assembles a strict SUBSET of these keys
// (no registry_applied / deliverables slots); it is covered by this same
// allow-list and is not separately serialized.
//
// MISSING A KEY IS THE FAILURE MODE — a key absent from `topLevel` is silently
// stripped from the customer report. The colocated coverage test
// (tests/edge/check-biometric-compliance/biometric.schema-coverage.test.ts)
// re-states the emitted-key set and asserts lockstep in BOTH directions.
//
// No `entries`/`objects` allow-lists are declared: the deliverables blocks are
// wholly customer-facing reasoned output and pruning them would remove content.

import type { ReportSchema } from "../report-serialize.ts";

export const BIOMETRIC_REPORT_SCHEMA: ReportSchema = {
  version: "rs-biometric-w1-2026-08-03",
  // matches the toolType used for metering/guards in check-biometric-compliance
  tool: "biometric_checker",
  topLevel: [
    // terminal assembly — index.ts L2008-2036
    "jurisdictions_analysed",
    "enforcement_precedents",
    "enforcement_meta",
    "annotations",
    "lint_warnings",
    "generated_at",
    "registry_version",
    "envelope",
    "registry_applied",
    "identifier_characterizations",
    "entity_characterization",
    "duty_findings",
    "divergence_analysis",
    "consequence_determination",
    "biometric_deliverables",
    // added by guardInformationNeeded (index.ts L2043)
    "information_needed",
    // internal channel — preserved verbatim by the caller's finalization step
    "_meta",
  ],
};

/** Emitted top-level keys, restated for the coverage test. */
export const BIOMETRIC_EMITTED_TOP_LEVEL: readonly string[] = [
  "jurisdictions_analysed",
  "enforcement_precedents",
  "enforcement_meta",
  "annotations",
  "lint_warnings",
  "generated_at",
  "registry_version",
  "envelope",
  "registry_applied",
  "identifier_characterizations",
  "entity_characterization",
  "duty_findings",
  "divergence_analysis",
  "consequence_determination",
  "biometric_deliverables",
  "information_needed",
  "_meta",
];
