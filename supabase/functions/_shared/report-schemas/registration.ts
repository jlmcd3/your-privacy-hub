// LEAK-PREV-P2 — Registration Assessment customer-report schema.
// Version: rs-registration-w2-2026-08-04
//
// DERIVATION (read, not guessed): the persisted `result_summary` object in
// supabase/functions/run-registration-assessment/index.ts is built at L218
// (base literal) and then extended in place at:
//   L480  oss_group                       (OSS mechanism block)
//   L515  eu_ai_act_basis                 (single shared AI-Act basis)
//   L543  eu_representative_group
//   L560  dpo_precision
//   L573  _meta                           (retired-alias channel)
//   L592  registration_deliverables       (ITEM 316)
//   L593  narrative
//   L594  deliverables_version
//   L634  _meta                           (contradiction bookkeeping)
//   L648  registration_deliverables_error (build-defect record)
// It is persisted at L654-666 as `persistPayload.result_summary`.
//
// MISSING A KEY IS THE FAILURE MODE — a key absent from `topLevel` is silently
// stripped from the customer report. The colocated coverage test
// (tests/edge/run-registration-assessment/registration.schema-coverage.test.ts)
// re-states the emitted-key set and asserts lockstep in BOTH directions.
//
// No `entries`/`objects` allow-lists are declared: this product's nested
// structures (jurisdictions[], registration_deliverables) are wholly
// customer-facing reasoned output, and pruning them would remove content.

import type { ReportSchema } from "../report-serialize.ts";

export const REGISTRATION_REPORT_SCHEMA: ReportSchema = {
  version: "rs-registration-w2-2026-08-04",
  // matches tool_type in _shared/intake-contracts/registration-assessment.ts L116
  tool: "registration_assessment",
  topLevel: [
    // base literal — index.ts L218-224
    "generated_at",
    "confidence",
    "confidence_reasons",
    "rules_fired",
    "warnings",
    "obligations_summary",
    "jurisdictions",
    // additive shared blocks
    "oss_group",
    "eu_ai_act_basis",
    "eu_representative_group",
    "dpo_precision",
    // ITEM 316 reasoned deliverables
    "registration_deliverables",
    "narrative",
    "deliverables_version",
    "registration_deliverables_error",
    // hardening 2026-08-04 — shared table of authorities (attestation rides
    // inside the deliverables object, which is already allow-listed)
    "authority_exhibit",
    // internal channel — preserved verbatim by the caller's finalization step
    "_meta",
  ],
};

/** Emitted top-level keys, restated for the coverage test. */
export const REGISTRATION_EMITTED_TOP_LEVEL: readonly string[] = [
  "generated_at",
  "confidence",
  "confidence_reasons",
  "rules_fired",
  "warnings",
  "obligations_summary",
  "jurisdictions",
  "oss_group",
  "eu_ai_act_basis",
  "eu_representative_group",
  "dpo_precision",
  "registration_deliverables",
  "narrative",
  "deliverables_version",
  "registration_deliverables_error",
  "authority_exhibit",
  "_meta",
];
