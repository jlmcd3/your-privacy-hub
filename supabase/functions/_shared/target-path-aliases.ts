// RC-D.11 — CPPA-PATH-1 fix. Explicit, enumerated per-tool map from an
// open_item's frozen `target.path` (ask-vocabulary; intake field name) to the
// canonical location(s) the revision generator actually writes in
// report_data (write-vocabulary). Consumed by qc_rc_2_verdict_consistency
// to translate targets BEFORE the changed_paths coverage check. Wildcards
// and generic substring matching are forbidden — every alias is explicit.
//
// A revision that resolves item X is considered to "touch" X if a changed_path
// equals or descends from ANY of the candidate paths for X (the original
// frozen path OR any of its enumerated aliases). This closes the hollow-
// resolution loophole while accommodating tools whose ask-vocabulary and
// write-vocabulary legitimately differ (cppa_risk_assessment: intake keys
// → normalised_intake.content_detail.*, triggers.*, impact.*, org_context.*).
//
// The map is ADDITIVE — tools with bare-path parity (dpia, lia, governance,
// cyber, admt at time of writing) need no entries; the raw target.path is
// always included in the candidate set.
export const TARGET_PATH_ALIASES: Record<string, Record<string, string[]>> = {
  cppa_risk_assessment: {
    // Top-level intake fields that flow into normalised_intake.
    q1_revenue: [
      "normalised_intake.content_detail.revenue_band",
      "normalised_intake.content_detail.revenue_band_key",
      "normalised_intake.triggers.q1_revenue",
    ],
    q2_consumers: [
      "normalised_intake.annual_consumer_volume",
      "normalised_intake.triggers.q2_consumers",
    ],
    i3_ca_consumer_band: ["normalised_intake.annual_consumer_volume"],
    annual_consumer_volume: ["normalised_intake.annual_consumer_volume"],
    q3_sector: ["normalised_intake.org_context.sector"],
    entity_name: ["normalised_intake.org_context.company_name"],
    q5_sell_share: ["normalised_intake.triggers.q5_sell_share"],
    q5c_share_revenue_50pct: ["normalised_intake.content_detail.q5c_share_revenue_50pct"],
    q15_sensitive_pi: ["normalised_intake.triggers.q15_sensitive_pi"],
    q15c_spi_volume: ["normalised_intake.content_detail.q15c_spi_volume"],
    q18_admt_use: ["normalised_intake.triggers.q18_admt_use"],
    q20_admt_opt_out: ["normalised_intake.content_detail.admt_opt_out"],
    // RC-D.11.1 — buildOpenItems can emit these live-frozen intake targets;
    // write locations verified against shimLegacyIntake in
    // _shared/cppa-risk-normalise.ts (legacy intake_intake → impact.*,
    // i1_processing_purpose / q4_pi_categories → activity_details[0].*,
    // q19_admt_description → content_detail.admt_description).
    impact_intake: [
      "normalised_intake.impact",
      "normalised_intake.content_detail.business_benefits",
      "normalised_intake.content_detail.consumer_benefits",
      "normalised_intake.content_detail.stakeholder_public_benefits",
      "normalised_intake.content_detail.planned_safeguards",
      "normalised_intake.content_detail.harm_sources_and_causes",
    ],
    i1_processing_purpose: [
      "normalised_intake.activity_details",
    ],
    q4_pi_categories: [
      "normalised_intake.activity_details",
    ],
    q19_admt_description: [
      "normalised_intake.content_detail.admt_description",
    ],
    impact: ["normalised_intake.impact"],
    // Nested triggers.* targets — write path mirrors under normalised_intake.
    "triggers.q1_revenue": ["normalised_intake.triggers.q1_revenue"],
    "triggers.q2_consumers": ["normalised_intake.triggers.q2_consumers"],
    "triggers.q5_sell_share": ["normalised_intake.triggers.q5_sell_share"],
    "triggers.q15_sensitive_pi": ["normalised_intake.triggers.q15_sensitive_pi"],
    "triggers.q18_admt_use": ["normalised_intake.triggers.q18_admt_use"],
    triggers: ["normalised_intake.triggers"],
    // impact.*
    "impact.likelihood_of_harm": ["normalised_intake.impact.likelihood_of_harm"],
    "impact.severity_of_harm": ["normalised_intake.impact.severity_of_harm"],
    "impact.benefits_outweigh_risks": ["normalised_intake.impact.benefits_outweigh_risks"],
    "impact.cybersecurity_gaps_identified": [
      "normalised_intake.impact.cybersecurity_gaps_identified",
    ],
    // N-class aggregates — targets that name the aggregate itself.
    content_detail: ["normalised_intake.content_detail"],
    org_context: ["normalised_intake.org_context"],
    activity_details: ["normalised_intake.activity_details"],
    exceptions: ["normalised_intake.exceptions"],
    cybersecurity_audit_rationale: [
      "cross_tool_recommendations.cybersecurity_audit_rationale",
      "normalised_intake.content_detail.cybersecurity_audit_rationale",
    ],
  },
  // Tools whose ask == write vocabulary. Left as explicit empty maps so a
  // future contributor sees the sweep was done and doesn't assume "missing".
  dpia_framework: {},
  li_assessment: {},
  governance_assessment: {},
  // RC-C3.CYB-2 — cyber ask vocabulary is dotted `controls.<slug>`; write
  // vocabulary is `controls[N].status` (index = slug order in ALL_COMPONENTS /
  // CONTROL_KEYS, N = position−1). RULING 1 (TIGHT): each ask maps to the
  // control's `.status` leaf specifically — an honest resolution of an
  // insufficient-information control MUST re-determine its status. Mapping to
  // the aggregate `controls[N]` would let a remediation-only edit count as
  // resolution, which legal ruled non-evidentiary. Ordering is asserted in
  // _tests/cppa-cyber.test.ts (alias table ↔ CONTROL_KEYS ↔ ALL_COMPONENTS).
  cppa_cybersecurity: {
    "controls.c1_auth":          ["controls[0].status"],
    "controls.c2_encryption":    ["controls[1].status"],
    "controls.c3_account_access":["controls[2].status"],
    "controls.c4_inventory":     ["controls[3].status"],
    "controls.c5_secure_config": ["controls[4].status"],
    "controls.c6_vuln_mgmt":     ["controls[5].status"],
    "controls.c7_audit_logs":    ["controls[6].status"],
    "controls.c8_network_mon":   ["controls[7].status"],
    "controls.c9_anti_malware":  ["controls[8].status"],
    "controls.c10_segmentation": ["controls[9].status"],
    "controls.c11_port_protocol":["controls[10].status"],
    "controls.c12_awareness":    ["controls[11].status"],
    "controls.c13_training":     ["controls[12].status"],
    "controls.c14_secure_dev":   ["controls[13].status"],
    "controls.c15_third_party":  ["controls[14].status"],
    "controls.c16_retention":    ["controls[15].status"],
    "controls.c17_incident":     ["controls[16].status"],
    "controls.c18_continuity":   ["controls[17].status"],
  },
  cppa_admt: {},
};

// Returns the frozen target path plus any explicit aliases. Never generates
// aliases via substring/suffix inference.
export function candidateTargetPaths(toolType: string, targetPath: string): string[] {
  const map = TARGET_PATH_ALIASES[toolType] ?? {};
  const aliases = map[targetPath];
  if (!aliases || aliases.length === 0) return [targetPath];
  // De-dupe while preserving order (target first, aliases after).
  const seen = new Set<string>();
  const out: string[] = [];
  for (const p of [targetPath, ...aliases]) {
    if (!seen.has(p)) { seen.add(p); out.push(p); }
  }
  return out;
}
