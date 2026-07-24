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

// QB-P25 CYBER — schema-shape assertions applied to every fixture. The three
// new customer-facing fields (evidence, differentiator, rank) are DESIGNED
// OUTPUT, so their presence is a hard contract rather than a rubric hint;
// they must appear on every control in the persisted report body.
const CYBER_SCHEMA_GUARDS = [
  { kind: "must_include" as const, pattern: "\"evidence\"", label: "control.evidence present" },
  { kind: "must_include" as const, pattern: "\"differentiator\"", label: "control.differentiator present" },
  { kind: "must_include" as const, pattern: "\"rank\"", label: "control.rank present" },
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
      profile: { entity_name: "Helios Fintech", industry: "Financial services", incidents_12mo: "None", framework: "ISO 27001", last_audit: "Within 12 months" },
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
      profile: { entity_name: "Cascade Health", industry: "Healthcare", incidents_12mo: "2–5", framework: "HITRUST", last_audit: "12–24 months ago" },
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
];
