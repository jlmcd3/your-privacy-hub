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

import type { GoldenCase } from "./types.ts";

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
