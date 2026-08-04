// LEAK-PREV-P2 — IR Playbook (generate-ir-playbook) customer-report schema.
// Version: rs-ir-w2-2026-08-04 (IN-LINEAGE bump from rs-ir-w1-2026-07-25)
//
// Top-level allow-list derived from generate-ir-playbook/index.ts
// `report_data` construction. `_meta.internal` is preserved verbatim by the
// serializer so stamp-echo keys (`_meta.internal.ir_w1`,
// `_meta.internal.emit_gate`, `_meta.internal.serializer`) survive P2
// whitelist serialization — the wave-21 telemetry-gap doctrine
// (items 47/49/62/65) applied at IR wiring time. `build_stamp` is
// additionally declared top-level so digests can confirm build-of-record
// without depending on `_meta`.
//
// ITEM 369-IR (Master Spec §4.2) — TWO-ARTIFACT MODEL. One generation run
// emits two rendered artifacts:
//   * `standing_playbook`   — the pre-incident reference (NIST/CISA arc);
//   * `incident_worksheet`  — the blank structured forms.
// Both are declared here with NESTED allow-lists so an unreviewed key inside
// either artifact cannot ship. The authority exhibit belongs to the standing
// playbook and is declared alongside it.
//
// Fail-open serializer behaviour is unchanged.

import type { ReportSchema } from "../report-serialize.ts";

export const IR_STANDING_SECTION_KEYS: readonly string[] = [
  "kind",
  "id",
  "heading",
  "status",
  "information_needed",
  // table sections
  "columns",
  "rows",
  "note",
  // note sections
  "scope_note",
  "body",
  // finding sections (SHAPE LAW)
  "standard",
  "standard_citation",
  "record_fact",
  "application",
  "verdict",
  // pointer sections
  "report_keys",
];

export const IR_WORKSHEET_FORM_KEYS: readonly string[] = [
  "id",
  "heading",
  "instruction",
  "columns",
  "blank_rows",
  "prompts",
];

export const IR_PLAYBOOK_REPORT_SCHEMA: ReportSchema = {
  version: "rs-ir-w2-2026-08-04",
  tool: "ir_playbook",
  topLevel: [
    // Core IR payload
    "portals",
    "enforcement_precedents",
    "enforcement_meta",
    "annotations",
    "lint_warnings",
    "information_needed",
    "deterministic_checks",
    "generated_at",
    // ITEM 312 — Chapter 8 analytic deliverables (single-writer keys).
    "sa_notification_determination",
    "data_subject_communication_determination",
    "art34_exemption_analysis",
    "content_owner_mapping",
    // ITEM 328 — per-regime duty sets.
    "notification_duties",
    // ITEM 369-IR — the two rendered artifacts + the standing playbook's exhibit.
    "standing_playbook",
    "incident_worksheet",
    "authority_exhibit",
    "ir_corpus_meta",

    // Ids & timestamps
    "build_stamp",
    // Meta bucket (serializer reduces to `_meta.internal` only)
    "_meta",
    // Revision-mode bookkeeping (data-only, non-prose)
    "_revision",
  ],
  objects: {
    standing_playbook: [
      "version",
      "artifact",
      "title",
      "template_note",
      "section_order",
      "sections",
      "information_needed",
      "status",
    ],
    incident_worksheet: ["version", "artifact", "title", "blank_by_design", "forms"],
    authority_exhibit: ["version", "heading", "entries"],
  },
  entries: {
    sections: IR_STANDING_SECTION_KEYS,
    forms: IR_WORKSHEET_FORM_KEYS,
    entries: [
      "citation",
      "as_cited",
      "authority_class",
      "corpus_key",
      "excerpt",
      "pin_verified",
      "note",
    ],
  },
};
