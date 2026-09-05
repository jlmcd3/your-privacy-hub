// Batch b83ea3c4 (2026-09-05) — the RoPA harness arm's row builders, pure so
// they can be tested (run-stress-job/index.ts calls Deno.serve at module
// scope).
//
// Two harness defects on the first batch after doc 168:
//   1. The per-activity answer map stopped at the ten pre-doc-168 keys. The
//      generator already produced activity_owner, collection_sources,
//      processing_operations, access_controls, notices_displayed,
//      incident_log and related_assessments — and the register read every one
//      of them as "not recorded" ("owned by an owner it has not named",
//      "collected from sources it has not recorded") on all four companies.
//   2. The client profile upsert never wrote `rights_handling_process`, so a
//      value left on the shared stress client by an earlier sample fixture
//      ("privacy@northpolemanualmining.example …") rendered as every
//      company's rights-handling sentence. The upsert now writes every
//      profile column it owns, null when the persona is silent.
//
// Keys mirror generate-ropa-document/register/assemble-input.ts
// (buildRopaAssembleInput) — the reader, not this file, is the source of
// truth; a key added there must be added here.

export const ROPA_ACTIVITY_ANSWER_KEYS = [
  "purpose",
  "lawful_basis",
  "special_category_basis",
  "data_subjects",
  "data_categories",
  "recipients",
  "transfer_destination",
  "transfer_mechanism",
  "retention_period",
  "security_measures",
  // DOC 168 structured Art. 30 elements.
  "activity_owner",
  "collection_sources",
  "processing_operations",
  "access_controls",
  "notices_displayed",
  "incident_log",
  "related_assessments",
] as const;

/** Shaped as a plain record so it feeds `insertAnswerRows(db, table, rows)`. */
export type RopaAnswerRow = Record<string, unknown> & {
  activity_id: string;
  session_id: string;
  question_key: string;
  answer_value: unknown;
};

/**
 * One row per (activity, answered key). Unanswered questions (undefined/null)
 * are simply not rows — PostgREST refuses a bulk insert whose rows do not
 * share one key set, and `answer_value` is NOT NULL (batch 4ed05f22).
 */
export function ropaAnswerRows(
  activities: ReadonlyArray<Record<string, unknown>>,
  activityRows: ReadonlyArray<{ id: string; display_order: number }>,
  sessionId: string,
): RopaAnswerRow[] {
  const out: RopaAnswerRow[] = [];
  for (const a of activityRows) {
    const src = activities[a.display_order];
    if (!src) continue;
    for (const k of ROPA_ACTIVITY_ANSWER_KEYS) {
      const v = src[k];
      if (v === undefined || v === null) continue;
      out.push({ activity_id: a.id, session_id: sessionId, question_key: k, answer_value: v });
    }
  }
  return out;
}

const str = (v: unknown): string | null => (typeof v === "string" && v.trim() ? v.trim() : null);

/** The full `ropa_client_profiles` row for a persona — every owned column set. */
export function ropaProfileRow(persona: Record<string, unknown>, clientId: string): Record<string, unknown> {
  return {
    client_id: clientId,
    legal_entity_type: str(persona.legal_entity_type),
    employee_band: str(persona.employee_band),
    is_controller: true,
    is_processor: false,
    dpo_name: str(persona.dpo_name),
    dpo_email: str(persona.dpo_email),
    dpo_phone: str(persona.dpo_phone),
    eu_rep_name: str(persona.eu_rep_name),
    eu_rep_email: str(persona.eu_rep_email),
    uk_rep_name: str(persona.uk_rep_name),
    uk_rep_email: str(persona.uk_rep_email),
    registered_address: str(persona.registered_address),
    registration_number: str(persona.registration_number),
    incorporation_jurisdiction: str(persona.incorporation_jurisdiction),
    rights_handling_process: str(persona.rights_handling_process),
    home_base: str(persona.home_base),
  };
}
