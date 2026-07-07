// Doc P Step 2 -- static evidence-location mapping.
//
// Versioned, ASCII-only map from the 19 P4-designated CPPA Risk intake field
// ids to { where_it_lives, sufficient_form }. Strings are taken VERBATIM from
// the P4 designation record (John, 2026-07-06). Any field id not present in
// the map falls back to a generic team-records line rather than failing
// (Doc F posture); the fallback path emits a console.warn naming the
// unmapped field id so upstream defects (an id outside the Doc O closed
// vocabulary reaching the Kit) are observable.
//
// Set-equality with IMPROVEMENT_KIT_DESIGNATED_FIELDS is asserted in
// src/test/improvementKit.smoke.test.tsx ("EVIDENCE_MAP key set equality").

export const EVIDENCE_MAP_VERSION = "p4-2026-07-06";

export interface EvidenceLocation {
  where_it_lives: string;
  sufficient_form: string;
}

export const EVIDENCE_MAP: Record<string, EvidenceLocation> = {
  i2_retention_period: {
    where_it_lives: "data retention schedule or records policy",
    sufficient_form: "a stated period (e.g. months) per data category",
  },
  i2_retention_detail: {
    where_it_lives: "data retention schedule or records policy",
    sufficient_form: "the schedule section covering the categories at issue",
  },
  i2_retention_criteria: {
    where_it_lives: "records policy or retention standard",
    sufficient_form: "the stated criteria used to set periods",
  },
  i6_vendors: {
    where_it_lives: "vendor management system or procurement records",
    sufficient_form: "a named list of processors or service providers",
  },
  i4_disclosure_mechanisms: {
    where_it_lives: "privacy notice and consumer-request procedures",
    sufficient_form: "the notice section or procedure name",
  },
  i4b_sources: {
    where_it_lives: "data inventory or record of processing",
    sufficient_form: "the source systems named per data category",
  },
  i5_admt_logic: {
    where_it_lives: "system or model documentation",
    sufficient_form: "a description of the decision logic and inputs",
  },
  i5_admt_human_review: {
    where_it_lives: "standard operating procedure for review",
    sufficient_form: "the procedure name and review step",
  },
  i5_admt_training_source: {
    where_it_lives: "model documentation or data-science records",
    sufficient_form: "the named training-data sources",
  },
  i5_admt_fairness_testing: {
    where_it_lives: "testing or validation reports",
    sufficient_form: "the report name and cadence",
  },
  q19_admt_description: {
    where_it_lives: "system documentation",
    sufficient_form: "a description of what the system does and to whom",
  },
  q20_admt_opt_out: {
    where_it_lives: "consumer notice or product settings documentation",
    sufficient_form: "the opt-out mechanism named",
  },
  i7_external_consultees: {
    where_it_lives: "engagement records or counsel correspondence",
    sufficient_form: "the named external parties consulted",
  },
  i7_internal_contributors: {
    where_it_lives: "project or governance records",
    sufficient_form: "the named teams or roles that contributed",
  },
  i9_existing_dpia_summary: {
    where_it_lives: "the existing DPIA document",
    sufficient_form: "the DPIA title, date, and covered scope",
  },
  i1b_min_pi: {
    where_it_lives: "data inventory or minimization analysis",
    sufficient_form: "the statement of categories limited to the purpose",
  },
  q4_pi_categories: {
    where_it_lives: "data inventory or record of processing",
    sufficient_form: "the categories enumerated",
  },
  q11_policy_review: {
    where_it_lives: "policy review log or governance calendar",
    sufficient_form: "the last review date and owner",
  },
  exceptions_intake: {
    where_it_lives: "legal analysis memo or counsel advice record",
    sufficient_form: "the claimed exception and its documented scope",
  },
};

/**
 * Fallback for unknown field ids. Never throws -- Doc P Step 2 requires that
 * unmapped ids render a generic team-records line rather than failing.
 */
export const GENERIC_FALLBACK: EvidenceLocation = {
  where_it_lives: "records system of the responsible team",
  sufficient_form: "a stated fact of the form the item names",
};

export function lookupEvidence(fieldId: string): EvidenceLocation {
  const hit = EVIDENCE_MAP[fieldId];
  if (hit) return hit;
  // Non-fatal (Doc F) but observable: an id outside the Doc O closed
  // vocabulary reached the Kit -- upstream defect worth surfacing.
  console.warn(
    `[improvement-kit] evidence-map fallback fired for unmapped field id: "${fieldId}" (version ${EVIDENCE_MAP_VERSION})`,
  );
  return GENERIC_FALLBACK;
}
