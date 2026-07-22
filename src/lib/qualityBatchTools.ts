// QB-P3 (cleanup): single source of truth for the quality-batch and
// quality-batch2 admin surfaces. Historically the slug→tool_type map lived
// inline in QualityBatch.tsx; QualityBatch2 needs the same mapping plus tool
// metadata for its per-tool sections.
//
// The slug values here MUST stay identical to RUN_QUALITY_BATCH_SLUGS in the
// orchestrator and to the generate-report-pdf tableMap (verified against
// supabase/functions/generate-report-pdf/index.ts L1853–1868).

export const SLUG_TO_TOOL_TYPE: Record<string, string> = {
  "cppa-admt": "cppa_admt",
  "cppa-risk": "cppa_risk",
  "cppa-cyber": "cppa_cybersecurity",
  "governance": "governance_assessment",
  "dpia": "dpia_framework",
  "lia": "li_assessment",
  "dpa-generator": "dpa_generator",
  "ir-playbook": "ir_playbook",
  "biometric-checker": "biometric_checker",
};

export const TOOL_TYPE_TO_SLUG: Record<string, string> = Object.fromEntries(
  Object.entries(SLUG_TO_TOOL_TYPE).map(([slug, type]) => [type, slug]),
);

// QB2 tool metadata (per-tool key + label + whether the admin seeder has a
// fixture for it). Kept alongside the slug map so both admin pages share one
// definition of the "quality batch tool universe".
export interface QualityBatch2Tool {
  key: string;
  label: string;
  seedable: boolean;
}

export const QUALITY_BATCH2_TOOLS: QualityBatch2Tool[] = [
  { key: "cppa_risk_assessment", label: "CPPA Risk Assessment", seedable: true },
  { key: "cppa_admt", label: "CPPA ADMT", seedable: true },
  { key: "cppa_cybersecurity", label: "CPPA Cybersecurity", seedable: true },
  { key: "governance_assessment", label: "Governance", seedable: true },
  { key: "dpia_framework", label: "DPIA Framework", seedable: false },
  { key: "li_assessment", label: "LIA (Legitimate Interests)", seedable: false },
];
