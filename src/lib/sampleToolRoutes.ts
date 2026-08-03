// Shared map from sample tool slug → live tool route.
// Consolidated from SampleReport.tsx / SampleReportView.tsx so the two cannot drift.
// P0 corrections (see EUP_Public_Page_Recommendations_v2): li_assessment, us_notice,
// eu_notice, and ropa now point at real routes registered in App.tsx.
export const TOOL_ROUTE: Record<string, string> = {
  li_assessment: "/li-assessment",
  dpia: "/dpia-framework",
  dpa: "/dpa-generator",
  governance: "/governance-assessment",
  ir_playbook: "/ir-playbook",
  biometric: "/biometric-checker",
  cppa_risk: "/cppa-risk-assessment",
  cppa_cyber: "/cppa-cybersecurity",
  ropa: "/ropa-builder",
  us_notice: "/us-notice-builder",
  eu_notice: "/eu-global-notice-builder",
  registration: "/registration-manager/start",
};
