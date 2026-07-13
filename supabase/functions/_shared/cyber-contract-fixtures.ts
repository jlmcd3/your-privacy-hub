// RC-C3 C3.2 — CPPA Cybersecurity revision-contract fixtures.
//
// Anchored to run-quality-batch's cppa-cyber intake schema (18-control slug
// set c1_auth…c18_continuity). Two controls left at "Insufficient information"
// with empty notes to force per-control asks; identity fields fully populated.

export interface CyberContractFixture {
  fixture_id: string;
  contract_scenario: "yield_k1_plus";
  intake: Record<string, unknown>;
  answer_targets: string[];
}

const IMPLEMENTED = (slug: string, note: string) => [slug, { status: "Implemented", notes: note }] as const;

export const FIXTURE_CYBER_YIELD_K1: CyberContractFixture = {
  fixture_id: "cyber-rcC3-yield-k1-plus",
  contract_scenario: "yield_k1_plus",
  intake: {
    entity_name: "Halcyon Health Systems, Inc.",
    industry: "Healthcare SaaS",
    sector: "Healthcare",
    profile: {
      incidents_12mo: "1",
      framework: "SOC 2",
      last_audit: "2025-09-15",
    },
    controls: Object.fromEntries([
      IMPLEMENTED("c1_auth",         "SSO with MFA required for all workforce accounts; hardware keys for admins."),
      IMPLEMENTED("c2_encryption",   "AES-256 at rest (RDS, S3); TLS 1.2+ in transit; KMS-managed keys."),
      IMPLEMENTED("c3_account_access","Just-in-time access via IAM; quarterly access reviews documented."),
      IMPLEMENTED("c4_inventory",    "Asset inventory in ServiceNow refreshed nightly from AWS Config."),
      IMPLEMENTED("c5_secure_config","CIS Benchmarks enforced via Config Rules; drift alerted."),
      IMPLEMENTED("c6_vuln_mgmt",    "Weekly Tenable scans; SLA 30d critical / 90d high; tracked in Jira."),
      IMPLEMENTED("c7_audit_logs",   "CloudTrail + CloudWatch + application logs shipped to Splunk 400-day retention."),
      IMPLEMENTED("c8_network_mon",  "GuardDuty + VPC flow logs; alerts to on-call."),
      IMPLEMENTED("c9_anti_malware", "CrowdStrike Falcon on all endpoints and hosts."),
      IMPLEMENTED("c10_segmentation","Prod/stage/dev VPC isolation; private subnets for data tier."),
      IMPLEMENTED("c11_port_protocol","Security-group deny-by-default; approved ports registered in CMDB."),
      IMPLEMENTED("c12_awareness",   "Annual mandatory training; monthly phishing simulations."),
      // gaps that will drive the freeze asks:
      ["c13_training",   { status: "Insufficient information", notes: "" }],
      ["c14_secure_dev", { status: "Insufficient information", notes: "" }],
      IMPLEMENTED("c15_third_party", "Vendor security reviews prior to onboarding; annual reassessment."),
      IMPLEMENTED("c16_retention",   "Data-retention schedule enforced by Lifecycle Policies; PII purge 30d post-deletion."),
      IMPLEMENTED("c17_incident",    "Documented IR plan; tabletop exercised 2025-Q3; playbooks in Confluence."),
      IMPLEMENTED("c18_continuity",  "DR runbook; monthly restore drills; RTO 4h / RPO 15m."),
    ]),
  },
  answer_targets: ["c13_training", "c14_secure_dev"],
};

export const CYBER_CONTRACT_FIXTURES: CyberContractFixture[] = [
  FIXTURE_CYBER_YIELD_K1,
];
