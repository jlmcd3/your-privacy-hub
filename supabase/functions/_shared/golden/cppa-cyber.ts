// QB-P20 — cppa-cyber golden set. 3 fixtures.
// QB-P23 item 4 — TUNING FIXTURE ENRICHMENT (test data only; the two
// tuning fixtures previously carried a single template note across all
// 18 controls, which produced 16/18 near-identical template findings in
// run d444a96a. Rewritten with distinct named tools, cadences, coverage
// figures, and posture variation (strong / partial-with-named-gap /
// genuinely thin). Adversarial fixture untouched — the sibling-notes
// drift is the whole point of that case.
import type { GoldenCase } from "./types.ts";

const SLUGS = [
  "c1_auth","c2_encryption","c3_account_access","c4_inventory","c5_secure_config",
  "c6_vuln_mgmt","c7_audit_logs","c8_network_mon","c9_anti_malware","c10_segmentation",
  "c11_port_protocol","c12_awareness","c13_training","c14_secure_dev","c15_third_party",
  "c16_retention","c17_incident","c18_continuity",
];
const LABEL: Record<string, string> = {
  c1_auth:"Authentication", c2_encryption:"Encryption", c3_account_access:"Account access",
  c4_inventory:"Asset inventory", c5_secure_config:"Secure configuration", c6_vuln_mgmt:"Vulnerability management",
  c7_audit_logs:"Audit logs", c8_network_mon:"Network monitoring", c9_anti_malware:"Anti-malware",
  c10_segmentation:"Segmentation", c11_port_protocol:"Ports & protocols", c12_awareness:"Awareness",
  c13_training:"Training", c14_secure_dev:"Secure development", c15_third_party:"Third-party",
  c16_retention:"Retention", c17_incident:"Incident response", c18_continuity:"Continuity",
};
type CtrlSpec = { notes: string; maturity?: string; evidence?: string[] };
const build = (spec: Record<string, CtrlSpec>, defaultMaturity: string) =>
  SLUGS.map(k => ({
    key: k,
    label: LABEL[k],
    maturity: spec[k]?.maturity ?? defaultMaturity,
    notes: spec[k]?.notes ?? "Documented; reviewed quarterly.",
    // TURN 3 — evidence-availability checklist (dummy defaults).
    evidence: spec[k]?.evidence ?? ["Policy / procedure document", "Runbook / SOP"],
  }));

// TURN 3 — dummy scope-framing profile additions used across all fixtures.
const DEFAULT_SCOPE = {
  in_scope_frameworks: ["SOC 2"] as string[],
  audit_scope_rationale:
    "Audit covers the production processing estate; supplements the primary framework where § 7123(c) components are not fully addressed.",
};

// ─── Fixture 1: Meridian SaaS Inc. — mid-maturity NIST CSF, mixed posture ───
const meridian: Record<string, CtrlSpec> = {
  c1_auth: { notes: "Okta SSO with FIDO2 hardware keys for engineering (168 users) and Duo push for staff (412 users); admin console access requires WebAuthn." },
  c2_encryption: { notes: "AES-256-GCM at rest via AWS KMS (customer-managed keys, annual rotation); TLS 1.3 in transit; field-level encryption on PII columns using AWS Nitro Enclaves." },
  c3_account_access: { notes: "Access via SailPoint IdentityIQ; joiner/mover/leaver SLA 4h; quarterly recertification with 96% completion in 2026-Q2; 3 orphaned accounts identified and remediated." },
  c4_inventory: { notes: "AWS Config aggregator + JupiterOne; 2,340 assets tracked; 4.1% (96 assets) lack an owner tag — remediation ticket JIRA SEC-8821 open." },
  c5_secure_config: { notes: "CIS AWS Foundations Benchmark v3.0 via Prowler weekly; 87% pass rate; 12 medium findings pending in Terraform module refactor." },
  c6_vuln_mgmt: { notes: "Snyk (SCA/container) daily + Nessus authenticated scans monthly; critical CVE MTTR 6.4d in Q2 (target 7d); one 12d exception on legacy Windows print server pending decommission 2026-08-15.", maturity: "Implemented with continuous monitoring" },
  c7_audit_logs: { notes: "CloudTrail + Datadog SIEM, 90-day hot / 400-day cold retention; 100% Tier-1 system coverage; Tier-3 dev accounts not yet forwarded." },
  c8_network_mon: { notes: "AWS GuardDuty + Vectra AI on VPC flow logs; 24×7 SOC (contracted MDR provider); MTTD 12 minutes on Q2 red-team exercise." },
  c9_anti_malware: { notes: "CrowdStrike Falcon EDR on 100% of endpoints and Linux servers; two macOS build agents excluded pending image rebuild (target 2026-08)." },
  c10_segmentation: { notes: "Production, staging, and corporate VPCs isolated by TGW route policy; PCI-scope subnet further segmented behind Palo Alto VM-Series; no east-west controls in staging (accepted risk, documented in SEC-7710)." },
  c11_port_protocol: { notes: "Default-deny SG posture; egress restricted to allow-listed FQDNs via Squid proxy; 8 legacy exceptions for on-prem SFTP peers under quarterly review." },
  c12_awareness: { notes: "Monthly KnowBe4 phishing simulations; 3.2% average click rate Q2 (down from 4.7% Q1); repeat-clicker enrolment in mandatory workshop." },
  c13_training: { notes: "Annual security & privacy training via LearnUpon (95% completion within 30 days of hire); role-based secure-coding module for engineers (78% completion — gap in EMEA cohort tracked as TRN-441).", maturity: "Documented, partially implemented" },
  c14_secure_dev: { notes: "SAST (Semgrep) and SCA (Snyk) enforced in CI with break-build on critical; threat modelling on major features using STRIDE; secrets scanning (GitGuardian) since 2026-04; no formal DAST program yet.", maturity: "Documented, partially implemented" },
  c15_third_party: { notes: "OneTrust vendor questionnaires for 62 processors; annual SOC 2 review for Tier-1; two Tier-2 vendors overdue for review (VendorOps ticket VDR-118)." },
  c16_retention: { notes: "Retention policy v2.3 enforced by S3 Object Lifecycle + Snowflake DAG task; customer PII purged 30d after account deletion; backup tapes 90d rolling." },
  c17_incident: { notes: "IR runbook v4.1; PagerDuty on-call rotation; tabletop 2026-03-14 (ransomware scenario) — MTTR 4h simulated; retained Mandiant on IR retainer.", maturity: "Implemented with continuous monitoring" },
  c18_continuity: { notes: "Multi-region active-passive on AWS us-east-1 / us-west-2; RTO 4h / RPO 15m; last DR failover exercise 2026-05-20 successful; runbook update pending for RDS Blue/Green migration." },
};

// ─── Fixture 2: Helios Fintech — strong ISO 27001 posture, few gaps ───
const helios: Record<string, CtrlSpec> = {
  c1_auth: { notes: "Ping Identity + YubiKey 5 for all 1,240 staff; passwordless via WebAuthn on internal apps; break-glass procedure documented in ISMS-A.9.4." },
  c2_encryption: { notes: "HSM-backed keys (Thales Luna) for all customer-fund data; TLS 1.3 mutual auth on all internal service mesh (Istio); FIPS 140-2 Level 3." },
  c3_account_access: { notes: "SailPoint + PAM (CyberArk) for privileged tiers; SoD matrix enforced; quarterly recert 99.4% Q2; zero orphaned accounts on ISO surveillance audit." },
  c4_inventory: { notes: "ServiceNow CMDB with automated discovery; 4,890 assets, 99.8% ownership coverage; monthly reconciliation to cloud APIs." },
  c5_secure_config: { notes: "CIS Level 2 baselines enforced via Ansible + Chef; Wiz CSPM continuous; 99% conformance across production." },
  c6_vuln_mgmt: { notes: "Qualys VMDR + Snyk + monthly external pentest (Bishop Fox); critical MTTR 3.1d, high MTTR 8.7d Q2; zero open criticals." },
  c7_audit_logs: { notes: "Splunk Enterprise Security, 400-day retention; UEBA on privileged sessions; log integrity via WORM S3 + tamper-evident chain." },
  c8_network_mon: { notes: "24×7 in-house SOC (18 analysts) + Corelight NDR; MTTD 6 minutes on 2026-Q1 purple-team exercise; hourly threat-intel ingest from FS-ISAC." },
  c9_anti_malware: { notes: "SentinelOne XDR on 100% of endpoints, servers, and CI runners; rollback tested quarterly." },
  c10_segmentation: { notes: "Zero-trust microsegmentation via Illumio; PCI CDE fully isolated with jump-host + session recording; annual segmentation test by external QSA." },
  c11_port_protocol: { notes: "Default-deny egress via Zscaler ZIA; explicit-allow FQDN list reviewed monthly; no legacy exceptions." },
  c12_awareness: { notes: "Weekly micro-training (Hoxhunt); 1.4% Q2 click rate; annual social-engineering assessment by third party." },
  c13_training: { notes: "ISO 27001 Annex A.7.2.2 training via Immersive Labs; role-based cyber ranges for SOC and DevSecOps; 100% completion at year-end audit." },
  c14_secure_dev: { notes: "OWASP SAMM Level 3; SAST/DAST/SCA in CI; threat modelling required for design review; annual secure-code training for all engineers." },
  c15_third_party: { notes: "OneTrust TPRM with 240 vendors risk-tiered; annual on-site or SOC 2 for Tier-1; contractual right-to-audit exercised twice in 2026." },
  c16_retention: { notes: "Records schedule aligned to FINRA 4511/17a-4 (WORM); 7-year immutable storage; annual disposition attestation." },
  c17_incident: { notes: "24×7 IR team; two functional exercises per year; last live incident (2026-02, credential-stuffing) contained in 22 minutes; retro published to ISMS." },
  c18_continuity: { notes: "Three-region active-active (Frankfurt, Dublin, Zurich); RTO 30m / RPO 5m; full DR test 2026-04 with successful customer-facing failover." },
};

// ITEM 315 — per-component descriptions for the "Perfect Data" fixture. One
// distinct, operationally specific description per component (no template
// reuse — sibling-note drift is what the adversarial fixture is for).
const NORTHWIND_NOTES: Record<string, string> = {
  c1_auth: "Entra ID with FIDO2 security keys for all 3,100 staff and phishing-resistant MFA on every admin path; no password fallback since 2026-01.",
  c2_encryption: "AES-256 at rest on all stores via customer-managed HSM keys with 12-month rotation; TLS 1.3 enforced in transit with HSTS preload.",
  c3_account_access: "Least-privilege RBAC in Okta; joiner/mover/leaver automated within 1h; quarterly recertification completed at 100% in 2026-Q2 with zero orphaned accounts.",
  c4_inventory: "ServiceNow CMDB reconciled nightly against cloud APIs; 6,420 assets and 41 personal-information stores, each with a named owner and data-category tag.",
  c5_secure_config: "CIS Level 1 baselines enforced by Ansible with drift auto-remediation; Wiz CSPM reports 100% conformance across production for eight consecutive weeks.",
  c6_vuln_mgmt: "Authenticated Qualys scans weekly, external quarterly penetration test by NCC Group, and a published vulnerability-disclosure policy; zero open criticals, high MTTR 5.2 days.",
  c7_audit_logs: "Centralised Splunk collection across 100% of in-scope systems, 400-day retention, WORM-backed integrity, and daily monitoring by the SOC.",
  c8_network_mon: "Corelight NDR plus Defender for Cloud on all VPCs, 24x7 SOC coverage, MTTD 9 minutes measured on the 2026-05 purple-team exercise.",
  c9_anti_malware: "SentinelOne on 100% of endpoints, servers, and build agents, with quarterly rollback tests and no excluded hosts.",
  c10_segmentation: "Production, corporate, and warehouse OT networks separated by enforced firewall policy with default-deny east-west rules; segmentation tested by an external assessor in 2026-04.",
  c11_port_protocol: "Default-deny ingress and egress with an explicit allow-list reviewed monthly; no legacy exceptions outstanding as of 2026-07.",
  c12_awareness: "Monthly threat briefings drawn from CISA and MS-ISAC advisories, with a documented process for updating controls when a new technique is reported.",
  c13_training: "Annual role-based training for every employee, contractor, and third party with system access; 100% completion within 30 days of grant, tracked in the LMS.",
  c14_secure_dev: "Mandatory peer code review, SAST and SCA gating in CI, and pre-release security testing on every change to customer-facing services.",
  c15_third_party: "244 service providers and contractors risk-tiered in OneTrust; Tier-1 vendors provide annual SOC 2 Type II and are contractually bound to equivalent controls.",
  c16_retention: "Published retention schedule per data category with automated deletion jobs and certificates of destruction for physical media; annual disposition attestation signed 2026-06.",
  c17_incident: "IR plan v6 with defined roles and escalation, two functional exercises per year, and post-incident retrospectives published to the security committee.",
  c18_continuity: "Multi-region active-active with RTO 1h and RPO 5m; full failover exercise executed 2026-05-20 with restoration from immutable backup verified.",
};


// ─── ITEM 315 — "Perfect Data" fixture: Northwind Logistics Co. ───
// Fixture-unblock case for the Item 315 rebuild. Supplies EVERY field the
// contract carries — including the two Item 315 additions
// (auditor_engagement_status, prior_audit_scope) — with every § 7123(c)
// component implemented and evidenced by at least one TESTABLE artefact,
// so `readiness_determination` can reach "ready" cleanly rather than being
// hedged. Any hedge on this record is a defect, not a posture.
const TESTABLE = ["Policy / procedure document", "Sample log / report", "Screenshot / config export"];
const northwind: Record<string, CtrlSpec> = Object.fromEntries(
  SLUGS.map((k) => [k, {
    maturity: "Implemented with continuous monitoring",
    evidence: TESTABLE,
    notes: NORTHWIND_NOTES[k],
  } as CtrlSpec]),
);

// QB-P25 CYBER — schema-shape assertions applied to every fixture. The three
// new customer-facing fields (evidence, differentiator, rank) are DESIGNED
// OUTPUT, so their presence is a hard contract rather than a rubric hint;
// they must appear on every control in the persisted report body.
const CYBER_SCHEMA_GUARDS = [
  { kind: "must_include" as const, pattern: "\"evidence\"", label: "control.evidence present" },
  { kind: "must_include" as const, pattern: "\"differentiator\"", label: "control.differentiator present" },
  { kind: "must_include" as const, pattern: "\"rank\"", label: "control.rank present" },
  // ITEM 371 — the two concluding determinations wired in Items 1-3, plus the
  // "Appendix - Authorities Cited" exhibit, must survive serialization.
  { kind: "must_include" as const, pattern: "\"readiness_determination\"", label: "readiness determination present" },
  { kind: "must_include" as const, pattern: "\"independence_determination\"", label: "independence determination present" },
  { kind: "must_include" as const, pattern: "\"authority_exhibit\"", label: "authority exhibit present" },
];

export const CPPA_CYBER_GOLDEN: GoldenCase[] = [
  {
    id: "cyber-nist-mid-tuning",
    tool: "cppa-cyber",
    set: "tuning",
    intake: {
      profile: { entity_name: "Meridian SaaS Inc.", industry: "SaaS", incidents_12mo: "1", framework: "NIST CSF", last_audit: "Within 12 months", ...DEFAULT_SCOPE, in_scope_frameworks: ["NIST CSF", "SOC 2"] },
      controls: build(meridian, "Implemented across organization"),
    },
    assertions: [
      { kind: "must_include", pattern: "NIST CSF", flags: "i", label: "framework named" },
      ...CYBER_SCHEMA_GUARDS,
    ],
  },
  {
    id: "cyber-iso-strong-tuning",
    tool: "cppa-cyber",
    set: "tuning",
    intake: {
      profile: { entity_name: "Helios Fintech", industry: "Financial services", incidents_12mo: "None", framework: "ISO 27001", last_audit: "Within 12 months", ...DEFAULT_SCOPE, in_scope_frameworks: ["ISO 27001"] },
      controls: build(helios, "Implemented with continuous monitoring"),
    },
    assertions: [
      { kind: "must_include", pattern: "ISO\\s*27001", flags: "i", label: "framework named" },
      ...CYBER_SCHEMA_GUARDS,
    ],
  },
  {
    id: "cyber-sibling-notes-adversarial",
    tool: "cppa-cyber",
    set: "adversarial",
    intake: {
      profile: { entity_name: "Cascade Health", industry: "Healthcare", incidents_12mo: "2–5", framework: "HITRUST", last_audit: "12–24 months ago", ...DEFAULT_SCOPE, in_scope_frameworks: ["HITRUST"] },
      controls: build({
        c1_auth: { notes: "MFA via Okta. Encryption: AES-256 at rest with KMS-managed keys; TLS 1.3 in transit." },
        c2_encryption: { notes: "See auth notes." },
      }, "Implemented across organization"),
    },
    assertions: [
      { kind: "must_include", pattern: "encryption|AES", flags: "i",
        label: "encryption evidence surfaces even though written under c1_auth" },
      ...CYBER_SCHEMA_GUARDS,
    ],
  },
  {
    id: "cyber-perfect-record",
    tool: "cppa-cyber",
    set: "tuning",
    intake: {
      profile: {
        entity_name: "Northwind Logistics Co.",
        industry: "Logistics and freight",
        incidents_12mo: "None",
        framework: "ISO 27001",
        last_audit: "Within 12 months",
        in_scope_frameworks: ["ISO 27001", "SOC 2"],
        audit_scope_rationale:
          "Audit covers the entire production processing estate and all systems that process California personal information; the ISO 27001 ISMS is supplemented with direct testing for each § 7123(c) component.",
        // ITEM 315 additions.
        auditor_engagement_status: "External auditor engaged, independence confirmed in writing",
        prior_audit_scope:
          "FY2025 cybersecurity audit covering the same production estate; report, sampling worksheets, interview notes, and management letter retained in the GRC system under a five-year hold.",
      },
      controls: build(northwind, "Implemented with continuous monitoring"),
    },
    assertions: [
      { kind: "must_include", pattern: "ISO\\s*27001", flags: "i", label: "framework named" },
      ...CYBER_SCHEMA_GUARDS,
    ],
  },
];


// ─── ITEM 405 LEG B — perfect fixture (co-located: the platform bundler did
// not resolve a newly-added sibling module for run-quality-batch,
// quality-batch-orchestrator and grade-single-assessment, so the fixture
// lives in the tool's existing golden module rather than a new file) ───
// ITEM 405 LEG B — CPPA CYBERSECURITY PERFECT FIXTURE (×1).
//
// One truly-complete cybersecurity record under the live item380r5
// `emptyAskedKeys` semantics against `cppaCybersecurityContract`
// (`_shared/intake-contracts/cppa-cybersecurity.ts`): every ASKED field is
// non-empty — the five always-required profile fields, the four optional but
// form-presented profile fields (in_scope_frameworks, audit_scope_rationale,
// auditor_engagement_status, prior_audit_scope), and, on ALL EIGHTEEN
// canonical control slugs, key + label + maturity + notes + evidence. Every
// answer is SUFFICIENT rather than merely present: each control note names the
// implementing technology, the accountable owner, the cadence, and the
// evidence artefact a § 7122 auditor would be handed.
//
// AUDIT-SCHEDULE TRUTH (verified premise). The contract asks NO revenue
// question, and per the ITEM-204 CEO ruling encoded in
// `_shared/ltp/cyber-audit-schedule.ts` the § 7121(a) surface STATES the full
// three-tier phase-in schedule and never computes the customer's tier ("No
// revenue ask is emitted"). No revenue field is added here and no cohort is
// made to resolve; the fixture's obligation is only that the corpus-pinned
// schedule sentences render byte-identically, which the item-405 battery
// asserts against `renderCyberAuditSchedule()`.
//
// DEGRADED PILOT SOURCES (named, not extended, not modified):
//   * GOLDEN_BY_TOOL["cppa-cyber"] — `_shared/golden/cppa-cyber.ts`:
//     `cyber-nist-mid-tuning`, `cyber-iso-strong-tuning`,
//     `cyber-sibling-notes-adversarial`, `cyber-perfect-record`. The last is
//     "perfect" only in its own historical sense — it predates the TURN-3
//     evidence/scope fields and the ITEM-315 auditor-engagement field, so it
//     leaves ASKED keys empty and is a degraded pilot for this purpose.
//   * MESSY_BY_TOOL["cppa-cyber"] — `cyber-messy-controls-without-evidence`
//     in `_shared/golden/messy-registry.ts`, a deliberate thinning of
//     `cyber-perfect-record`.
//   * `_shared/cyber-contract-fixtures.ts` FIXTURE_CYBER_YIELD_K1 — a
//     deliberate three-control partial submission.
// Nothing degraded is authored here.
//
// FACT-EXEMPT REFERENCE RENDER (item 404 hard rule). This scenario is entirely
// new: no token from `REFERENCE_RENDER_TOKENS` in the item-404 cyber spine
// appears anywhere below, which the item-405 battery asserts mechanically.


/** Live control labels, position-for-position with the intake form. */
const CONTROL_ROWS: ReadonlyArray<{
  key: string;
  label: string;
  maturity: string;
  notes: string;
  evidence: string[];
}> = [
  {
    key: "c1_auth",
    label: "Authentication",
    maturity: "Implemented with continuous monitoring",
    notes:
      "Okta is the sole identity provider for all 1,180 workforce accounts and all four production consoles; phishing-resistant FIDO2 keys are mandatory for the 41 administrative roles and TOTP for everyone else, with password authentication disabled at the directory. The IAM lead (Director of Identity Engineering) owns the policy, reviews the authenticator inventory monthly, and Okta ThreatInsight alerts route to the 24x7 on-call queue. Evidence: the signed authentication standard (v6, 2026-05-18), an Okta policy export dated 2026-07-02, and the July 2026 authenticator-coverage report showing 100% enrolment.",
    evidence: [
      "Policy / procedure document",
      "Screenshot / config export",
      "Sample log / report",
      "SOC 2 or auditor letter",
    ],
  },
  {
    key: "c2_encryption",
    label: "Encryption of personal information",
    maturity: "Implemented with continuous monitoring",
    notes:
      "All personal information is encrypted at rest with AES-256 under customer-scoped AWS KMS keys (RDS, Aurora, S3, EBS snapshots) and in transit with TLS 1.3, minimum TLS 1.2 for two legacy partner endpoints documented in the exception register. The Principal Platform Security Engineer owns key rotation on a 365-day schedule, and AWS Config rule 'encrypted-volumes' plus a nightly S3 bucket sweep alert on any unencrypted object within 15 minutes. Evidence: the encryption standard (v4, 2026-03-09), KMS key-policy exports of 2026-06-30, and the Config compliance report for July 2026.",
    evidence: [
      "Policy / procedure document",
      "Screenshot / config export",
      "Sample log / report",
    ],
  },
  {
    key: "c3_account_access",
    label: "Account management and access controls",
    maturity: "Implemented with continuous monitoring",
    notes:
      "Access is role-based across 34 defined roles provisioned by SCIM from Workday, with just-in-time elevation for production through Teleport capped at four hours and dual approval. Joiner-mover-leaver runs automatically on the Workday event with a 30-minute deprovisioning SLA measured monthly (June 2026 median: 6 minutes); the IT Operations Manager owns the process and the Security Governance Manager runs the quarterly certification of every privileged role. Evidence: the access-control procedure (v5, 2026-04-21), the Q2 2026 access-certification pack signed 2026-07-08, and Teleport session logs.",
    evidence: [
      "Policy / procedure document",
      "Runbook / SOP",
      "Sample log / report",
      "SOC 2 or auditor letter",
    ],
  },
  {
    key: "c4_inventory",
    label: "Inventory and management of personal information and systems",
    maturity: "Implemented with continuous monitoring",
    notes:
      "A single asset and data inventory lives in ServiceNow CMDB, reconciled nightly against AWS Config, Azure Resource Graph and Jamf so that unmanaged assets surface within 24 hours; 612 systems and 41 data stores are recorded, each with an owner, a data-category tag and a retention class. BigID scans the data stores weekly for personal information and writes classifications back to the CMDB record. The Data Governance Manager owns the inventory and attests to its completeness quarterly. Evidence: the inventory procedure (v3, 2026-02-16), the 2026-07-01 CMDB export, and the Q2 attestation.",
    evidence: [
      "Policy / procedure document",
      "Screenshot / config export",
      "Sample log / report",
    ],
  },
  {
    key: "c5_secure_config",
    label: "Secure configuration of hardware and software",
    maturity: "Implemented with continuous monitoring",
    notes:
      "CIS Benchmark Level 1 baselines are enforced for Ubuntu 22.04 hosts, EKS nodes and macOS endpoints through Ansible and Jamf, with drift detection by AWS Config and Wiz posture rules alerting to the platform channel within one hour. Deviations require a recorded exception approved by the Head of Platform Engineering with a 90-day expiry; eleven exceptions are open and all carry expiry dates. The Head of Platform Engineering owns the baselines and re-baselines every six months. Evidence: the hardening standard (v7, 2026-06-02), Ansible role definitions, and the July 2026 drift report.",
    evidence: [
      "Policy / procedure document",
      "Runbook / SOP",
      "Screenshot / config export",
    ],
  },
  {
    key: "c6_vuln_mgmt",
    label: "Vulnerability scanning and penetration testing",
    maturity: "Implemented with continuous monitoring",
    notes:
      "Wiz performs continuous cloud and container scanning and Tenable performs authenticated weekly scans of all endpoints and hosts; remediation SLAs are 7 days critical, 30 days high, 90 days medium, tracked as Jira tickets with automatic escalation to the Head of Security at 80% of SLA. An independent penetration test of the production platform and mobile clients was completed by an external firm on 2026-05-22 with two medium findings, both remediated and retested on 2026-06-19. The Vulnerability Management Lead owns the programme. Evidence: the 2026-05-22 test report and retest letter, and the July 2026 SLA-attainment report (97.4%).",
    evidence: [
      "Policy / procedure document",
      "Third-party pen test / scan report",
      "Sample log / report",
    ],
  },
  {
    key: "c7_audit_logs",
    label: "Audit-log management",
    maturity: "Implemented with continuous monitoring",
    notes:
      "CloudTrail (all regions, organisation trail), VPC flow logs, EKS audit logs, database audit logs and application access logs ship to Splunk Cloud with 400-day hot retention and 7-year archive in S3 Object Lock; logs are write-once and the security team holds no delete rights. Log-source health is monitored by a Splunk saved search that pages on-call if any source stops for more than 30 minutes. The Detection Engineering Lead owns coverage and reviews the source roster monthly. Evidence: the logging standard (v4, 2026-01-27), the Splunk index-retention configuration export, and the July 2026 source-health report.",
    evidence: [
      "Policy / procedure document",
      "Screenshot / config export",
      "Sample log / report",
      "SOC 2 or auditor letter",
    ],
  },
  {
    key: "c8_network_mon",
    label: "Network monitoring and defenses",
    maturity: "Implemented with continuous monitoring",
    notes:
      "AWS GuardDuty, VPC flow-log analytics and Cloudflare WAF/DDoS protection front every internet-facing service, with detections normalised into Splunk Enterprise Security where 63 correlation rules run continuously; the 24x7 managed detection provider triages and escalates to internal on-call under a 15-minute critical acknowledgement SLA. The Detection Engineering Lead tunes rules fortnightly and reports mean-time-to-acknowledge monthly (June 2026: 4 minutes). Evidence: the monitoring runbook (v6, 2026-05-05), the MDR service report for June 2026, and GuardDuty configuration exports.",
    evidence: [
      "Runbook / SOP",
      "Screenshot / config export",
      "Sample log / report",
    ],
  },
  {
    key: "c9_anti_malware",
    label: "Antivirus and anti-malware protections",
    maturity: "Implemented with continuous monitoring",
    notes:
      "CrowdStrike Falcon is deployed on 100% of the 1,240 managed endpoints and all 612 server workloads, enforced at enrolment by Jamf and by an EKS admission controller that blocks unprotected nodes; prevention policies are set to aggressive with automatic quarantine and host isolation. Coverage is reconciled daily against the CMDB and any gap over 24 hours pages the IT Operations Manager, who owns the control. Evidence: the endpoint-protection standard (v3, 2026-04-02), the 2026-07-01 Falcon coverage export showing 100%, and the June 2026 detection summary.",
    evidence: [
      "Policy / procedure document",
      "Screenshot / config export",
      "Sample log / report",
    ],
  },
  {
    key: "c10_segmentation",
    label: "Segmentation of an information system",
    maturity: "Implemented across organization",
    notes:
      "Production, staging and corporate environments sit in separate AWS accounts under distinct organisational units with no peering; the data tier runs in private subnets reachable only from application security groups, and east-west traffic inside EKS is constrained by Cilium network policies in default-deny. Corporate access to production is only via the Teleport bastion. The Head of Platform Engineering owns the topology and reviews segmentation boundaries semi-annually; the last review was 2026-04-30 and produced two accepted findings now closed. Evidence: the network-architecture document (v5, 2026-04-30), Terraform account structure, and Cilium policy exports.",
    evidence: [
      "Policy / procedure document",
      "Screenshot / config export",
      "Third-party pen test / scan report",
    ],
  },
  {
    key: "c11_port_protocol",
    label: "Port and protocol management and protection",
    maturity: "Implemented across organization",
    notes:
      "Security groups and network ACLs are deny-by-default and defined exclusively in Terraform; every permitted port and protocol is registered in the CMDB with a business justification and a named owner, and any pull request opening a port to 0.0.0.0/0 is blocked by a Checkov policy gate requiring Head of Security approval. Wiz flags exposed ports continuously and the platform team clears findings within seven days. The Head of Platform Engineering owns the register and reviews it quarterly; the last review was 2026-06-12. Evidence: the port register export of 2026-06-12, Terraform modules, and the Checkov policy configuration.",
    evidence: [
      "Policy / procedure document",
      "Screenshot / config export",
      "Sample log / report",
    ],
  },
  {
    key: "c12_awareness",
    label: "Cybersecurity awareness",
    maturity: "Implemented with continuous monitoring",
    notes:
      "Monthly phishing simulations run through KnowBe4 across the whole workforce (June 2026 click rate 1.9%, report rate 62%), with immediate micro-training for anyone who clicks and manager escalation on a third failure in twelve months. Quarterly threat-landscape briefings are delivered by the Head of Security to all staff and separately to the executive team, and a security-champions network of 22 engineers meets monthly. The People Operations Director co-owns completion tracking with the Head of Security. Evidence: KnowBe4 campaign reports for 2026, the briefing deck of 2026-06-24, and completion records.",
    evidence: [
      "Policy / procedure document",
      "Training completion record",
      "Sample log / report",
    ],
  },
  {
    key: "c13_training",
    label: "Cybersecurity education and training",
    maturity: "Implemented with continuous monitoring",
    notes:
      "Role-based training is mandatory: general security and privacy training within 14 days of hire and annually thereafter (2026 completion 100% of 1,180 staff as of 2026-06-30), secure-coding training annually for the 214 engineers, and incident-handling training for the 31 responders. Completion is enforced by Workday learning assignments with manager escalation at 21 days overdue and access review at 45 days. The People Operations Director owns delivery and the Head of Security owns curriculum, refreshed each January. Evidence: the training standard (v4, 2026-01-15), the 2026-06-30 completion report, and course records.",
    evidence: [
      "Policy / procedure document",
      "Training completion record",
      "Sample log / report",
    ],
  },
  {
    key: "c14_secure_dev",
    label: "Secure development and coding practices",
    maturity: "Implemented with continuous monitoring",
    notes:
      "The SDLC requires threat modelling for every new service and every change to an authentication or data-export path, peer review by a second engineer, and a CI gate running Semgrep SAST, Snyk SCA and Trivy image scanning that fails the build on any high or critical finding; secrets scanning by Gitleaks runs pre-commit and in CI. Production deploys are automated, signed and traceable to a reviewed commit. The Director of Engineering owns the SDLC standard with the Head of Security as approver; it was last revised 2026-03-30. Evidence: the SDLC standard (v8), CI pipeline definitions, and the June 2026 gate-failure report.",
    evidence: [
      "Policy / procedure document",
      "Runbook / SOP",
      "Screenshot / config export",
      "Sample log / report",
    ],
  },
  {
    key: "c15_third_party",
    label: "Oversight of service providers, contractors, and third parties",
    maturity: "Implemented across organization",
    notes:
      "All 68 vendors are recorded in the OneTrust third-party register with a tier, a business owner and a data-flow description; the 19 vendors that process personal information are tier-1 and require a signed data-processing agreement with CCPA service-provider terms, an annual SOC 2 Type II or ISO 27001 certificate review, and evidence of subcontractor controls. Onboarding is gated by the Vendor Risk Manager and no production data may be shared before approval; offboarding includes documented deletion certification. Reviews are annual, and all 19 tier-1 reviews for 2026 closed by 2026-06-30. Evidence: the register export, executed agreements, and 2026 certificate reviews.",
    evidence: [
      "Policy / procedure document",
      "SOC 2 or auditor letter",
      "Sample log / report",
    ],
  },
  {
    key: "c16_retention",
    label: "Retention schedules and proper disposal of personal information",
    maturity: "Implemented across organization",
    notes:
      "The retention schedule assigns every one of the 41 data stores a retention class tied to the purpose that sets it — operational service records 24 months after account closure, billing records seven years under tax obligations, support transcripts 18 months — and deletion is executed automatically by S3 lifecycle rules and a nightly database purge job, with deletion receipts written to an audit table. Media disposal uses certified destruction with certificates retained. The Data Governance Manager owns the schedule, last approved 2026-02-16, and samples deletion evidence quarterly. Evidence: the schedule, purge-job logs, and destruction certificates.",
    evidence: [
      "Policy / procedure document",
      "Runbook / SOP",
      "Sample log / report",
    ],
  },
  {
    key: "c17_incident",
    label: "Security-incident response management",
    maturity: "Implemented with continuous monitoring",
    notes:
      "The incident-response plan defines four severity levels, a named incident commander rota of six, and notification decision points with counsel for CCPA and state breach obligations; PagerDuty carries a 15-minute acknowledgement SLA for Sev-1 and Sev-2. Playbooks cover ransomware, credential compromise, vendor breach and data exfiltration. One Sev-3 incident occurred in the last twelve months (a vendor-side exposure with no personal information involved), closed on 2026-02-11 with three corrective actions all completed. A tabletop exercise ran 2026-05-14. The Head of Security owns the plan (v9, 2026-05-20). Evidence: the plan, the incident record, and the tabletop after-action report.",
    evidence: [
      "Policy / procedure document",
      "Runbook / SOP",
      "Sample log / report",
      "Third-party pen test / scan report",
    ],
  },
  {
    key: "c18_continuity",
    label: "Business-continuity and disaster-recovery planning",
    maturity: "Implemented across organization",
    notes:
      "The business-continuity and disaster-recovery plan sets an RTO of four hours and an RPO of fifteen minutes for the production platform, supported by multi-AZ Aurora with cross-region replicas to us-west-2 and immutable backups in S3 Object Lock; restoration is exercised monthly against a scratch account and a full cross-region failover was exercised on 2026-04-18, meeting RTO in 2 hours 41 minutes. Backup integrity is verified automatically after every snapshot. The VP of Infrastructure owns the plan (v6, 2026-04-25) and reviews it annually with the executive team. Evidence: the plan, the 2026-04-18 failover report, and monthly restore-test logs.",
    evidence: [
      "Policy / procedure document",
      "Runbook / SOP",
      "Sample log / report",
    ],
  },
];

export const CYBER_PERFECT: GoldenCase[] = [
  {
    id: "cyber-clinical-diagnostics-platform-perfect",
    tool: "cppa-cyber",
    set: "tuning",
    intake: {
      profile: {
        // Named legal entity — the assessment's subject anchor.
        entity_name: "Northwind Clinical Diagnostics Corporation",
        // The sector whose personal information the programme protects.
        industry: "Clinical diagnostics laboratory network and patient results portal",
        // Verbatim INCIDENTS_12MO_OPTIONS value; matches the c17 record (one Sev-3).
        incidents_12mo: "1",
        // Verbatim FRAMEWORK_OPTIONS value; the primary framework the programme is built on.
        framework: "NIST CSF",
        // Verbatim LAST_AUDIT_OPTIONS value; consistent with the 2026 SOC 2 and pen test.
        last_audit: "Within 12 months",
        // Verbatim CYBER_IN_SCOPE_FRAMEWORKS values; the frameworks in scope for the audit.
        in_scope_frameworks: ["NIST CSF", "SOC 2", "ISO 27001"],
        // Names what the audit covers, what it leverages, and what it must test directly.
        audit_scope_rationale:
          "The audit covers the multi-tenant results platform, the laboratory information system interfaces, the patient portal and the corporate identity estate — every system recorded in the CMDB as holding patient personal information. The 2026 SOC 2 Type II report (period 2025-07-01 to 2026-06-30, issued 2026-07-24) and the ISO 27001 certificate (issued 2025-11-03) are leveraged as permitted, and the components those engagements do not directly test — segmentation boundaries, retention and disposal, and third-party oversight — are tested independently by the auditor against the § 7123(c) component list.",
        // Verbatim CYBER_AUDITOR_ENGAGEMENT_OPTIONS value; the § 7122 independence input.
        auditor_engagement_status: "External auditor engaged, independence confirmed in writing",
        // What the prior engagement covered, so the auditor can scope by difference.
        prior_audit_scope:
          "The prior engagement was the SOC 2 Type II examination of the results platform and supporting infrastructure covering security, availability and confidentiality for the period 2025-07-01 to 2026-06-30. It did not cover the laboratory information system interfaces, the retention and disposal controls, or the third-party oversight programme, and it expressed no opinion on compliance with 11 CCR §§ 7121-7124.",
      },
      controls: CONTROL_ROWS.map((c) => ({
        key: c.key,
        label: c.label,
        maturity: c.maturity,
        notes: c.notes,
        evidence: [...c.evidence],
      })),
    },
    assertions: [
      {
        kind: "must_not_include",
        pattern: "Insufficient information",
        flags: "i",
        label: "no insufficient-information status on a complete record",
      },
    ],
  },
];
