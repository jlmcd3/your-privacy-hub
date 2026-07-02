// Identity + subject fields frozen after run 1, per tool. Keys are the
// intake_data JSON keys each generator already reads. Changing any of these
// on a later run is rejected by regenerate-assessment (409 locked_field_changed).
export const LOCKED_FIELDS_MAP: Record<string, string[]> = {
  li_assessment:         ["organization_name", "subject_anchor", "relationship_type", "jurisdictions", "data_categories"],
  governance_assessment: ["organization_name", "jurisdiction"],
  dpia_framework:        ["organization_name", "name", "jurisdictions"],
  dpa_generator:         ["controllerName", "controllerJurisdiction", "processorName", "processorJurisdiction"],
  ir_playbook:           ["organizationName", "organisationType", "jurisdictions"],
  biometric_checker:     ["orgName", "biometricTypes", "jurisdictions", "purpose"],
  cppa_admt:             ["organization_name", "system_name", "system_type", "significant_decision_domain"],
  cppa_risk_assessment:  ["entity_name", "subject_anchor", "q1_revenue", "q2_consumers", "q3_sector"],
  cppa_cybersecurity:    ["entity_name"],
};

export function lockedSnapshot(toolType: string, intake: Record<string, unknown>) {
  const keys = LOCKED_FIELDS_MAP[toolType] ?? [];
  const snap: Record<string, unknown> = {};
  for (const k of keys) if (k in intake) snap[k] = intake[k];
  return snap;
}
