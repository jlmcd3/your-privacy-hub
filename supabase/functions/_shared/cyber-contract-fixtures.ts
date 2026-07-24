// RC-C3.CYB-2 — CPPA Cybersecurity revision-contract fixtures.
//
// LIVE INTAKE SHAPE (src/pages/CPPACybersecurity.tsx):
//   { profile: { entity_name, industry, incidents_12mo, framework, last_audit },
//     controls: [{ key, label, maturity, notes }, ×18] }
//
// Three controls (c13_training, c14_secure_dev, c15_third_party) are left
// with maturity "" (empty string — NOT the literal "Insufficient
// information", which is not a valid CYBER_MATURITY_OPTIONS value) and
// empty notes so the forced-ask pass mints per-control asks; the other 15
// are populated at "Implemented across organization" with citation-worthy
// notes. `answer_targets` are the DOTTED ASK-vocabulary paths (per
// RC-C3.CYB-2 alias map), NOT the report-shape indexed paths.

export interface CyberContractFixture {
  fixture_id: string;
  contract_scenario: "yield_k1_plus";
  intake: Record<string, unknown>;
  answer_targets: string[];
}

// Slug + label pairs mirror the live CONTROLS array position-for-position.
// Alias-table + fixture + ALL_COMPONENTS ordering is pinned in
// supabase/functions/_tests/cppa-cyber.test.ts (RULING 2).
const LIVE_CONTROLS: Array<{ key: string; label: string }> = [
  { key: "c1_auth",           label: "Authentication" },
  { key: "c2_encryption",     label: "Encryption of personal information" },
  { key: "c3_account_access", label: "Account management and access controls" },
  { key: "c4_inventory",      label: "Inventory and management of personal information and systems" },
  { key: "c5_secure_config",  label: "Secure configuration of hardware and software" },
  { key: "c6_vuln_mgmt",      label: "Vulnerability scanning and penetration testing" },
  { key: "c7_audit_logs",     label: "Audit-log management" },
  { key: "c8_network_mon",    label: "Network monitoring and defenses" },
  { key: "c9_anti_malware",   label: "Antivirus and anti-malware protections" },
  { key: "c10_segmentation",  label: "Segmentation of an information system" },
  { key: "c11_port_protocol", label: "Port and protocol management and protection" },
  { key: "c12_awareness",     label: "Cybersecurity awareness" },
  { key: "c13_training",      label: "Cybersecurity education and training" },
  { key: "c14_secure_dev",    label: "Secure development and coding practices" },
  { key: "c15_third_party",   label: "Oversight of service providers, contractors, and third parties" },
  { key: "c16_retention",     label: "Retention schedules and proper disposal of personal information" },
  { key: "c17_incident",      label: "Security-incident response management" },
  { key: "c18_continuity",    label: "Business-continuity and disaster-recovery planning" },
];

const NOTES: Record<string, string> = {
  c1_auth:           "SSO with MFA required for all workforce accounts; hardware keys for admins.",
  c2_encryption:     "AES-256 at rest (RDS, S3); TLS 1.2+ in transit; KMS-managed keys.",
  c3_account_access: "Just-in-time access via IAM; quarterly access reviews documented.",
  c4_inventory:      "Asset inventory in ServiceNow refreshed nightly from AWS Config.",
  c5_secure_config:  "CIS Benchmarks enforced via Config Rules; drift alerted.",
  c6_vuln_mgmt:      "Weekly Tenable scans; SLA 30d critical / 90d high; tracked in Jira.",
  c7_audit_logs:     "CloudTrail + CloudWatch + application logs shipped to Splunk 400-day retention.",
  c8_network_mon:    "GuardDuty + VPC flow logs; alerts to on-call.",
  c9_anti_malware:   "CrowdStrike Falcon on all endpoints and hosts.",
  c10_segmentation:  "Prod/stage/dev VPC isolation; private subnets for data tier.",
  c11_port_protocol: "Security-group deny-by-default; approved ports registered in CMDB.",
  c12_awareness:     "Monthly phishing simulations and quarterly threat-landscape briefings.",
  // c13_training, c14_secure_dev, c15_third_party deliberately empty (RC-P5:
  // partial-submission — 15 of 18 controls populated, 3 empty, matching the
  // 3-cap in synthesiseCyberAsksFromControls).
  c16_retention:     "Data-retention schedule enforced by Lifecycle Policies; PII purge 30d post-deletion.",
  c17_incident:      "Documented IR plan; tabletop exercised 2025-Q3; playbooks in Confluence.",
  c18_continuity:    "DR runbook; monthly restore drills; RTO 4h / RPO 15m.",
};

// RC-P5: three empty controls yield the 3-cap of per-control asks. This is a
// FORM-REACHABLE partial submission — the maturity <select> allows an unset
// value and the form gates submission on `allComplete` for `profile.*` only,
// not per-control. "Insufficient information" is NEVER a maturity VALUE (not
// in CYBER_MATURITY_OPTIONS); it is the report-side STATUS the generator
// derives from an empty maturity.
const INSUFFICIENT_SLUGS = new Set(["c13_training", "c14_secure_dev", "c15_third_party"]);

export const FIXTURE_CYBER_YIELD_K1: CyberContractFixture = {
  fixture_id: "cyber-rcC3-yield-k1-plus",
  contract_scenario: "yield_k1_plus",
  intake: {
    profile: {
      entity_name: "Halcyon Health Systems, Inc.",
      industry: "Healthcare SaaS",
      incidents_12mo: "1",
      framework: "SOC 2",
      last_audit: "Within 12 months",
      // TURN 3 — scope framing (dummy data).
      in_scope_frameworks: ["SOC 2", "HITRUST"],
      audit_scope_rationale:
        "Audit covers the multi-tenant SaaS production estate. Leverages the 2026 SOC 2 Type II under § 7123(f); supplemented for the segmentation, retention, and third-party components that SOC 2 does not directly test.",
    },
    controls: LIVE_CONTROLS.map(({ key, label }) => ({
      key,
      label,
      maturity: INSUFFICIENT_SLUGS.has(key) ? "" : "Implemented across organization",
      notes: NOTES[key] ?? "",
      // TURN 3 — evidence types (dummy data). Empty for the insufficient trio.
      evidence: INSUFFICIENT_SLUGS.has(key)
        ? []
        : ["Policy / procedure document", "SOC 2 or auditor letter"],
    })),
  },
  // Dotted ASK-vocabulary paths (revision prompt emits report-shape indexed
  // vocabulary controls[12/13/14].status via the alias map).
  answer_targets: [
    "controls.c13_training",
    "controls.c14_secure_dev",
    "controls.c15_third_party",
  ],
};

export const CYBER_CONTRACT_FIXTURES: CyberContractFixture[] = [
  FIXTURE_CYBER_YIELD_K1,
];
