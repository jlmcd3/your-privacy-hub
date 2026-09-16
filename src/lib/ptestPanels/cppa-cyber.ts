// /all-ptest fixture panel — cppa-cyber. Fifteen complete, internally consistent
// intakes authored 2026-09-14 (see ./types.ts and scripts/ptest/PANEL-BRIEF.md).
// Validated by tests/edge/ptest/panels.test.ts.
//
// The contract (supabase/functions/_shared/intake-contracts/cppa-cybersecurity.ts)
// and the live form ask for profile.entity_name only; fixture.company equals it.

import type { PanelFixture } from "./types.ts";

type ControlSpec = { maturity: string; notes: string; evidence: string[]; na_reason?: string };

const CYBER_SLUGS = [
  "c1_auth", "c2_encryption", "c3_account_access", "c4_inventory", "c5_secure_config",
  "c6_vuln_mgmt", "c7_audit_logs", "c8_network_mon", "c9_anti_malware", "c10_segmentation",
  "c11_port_protocol", "c12_awareness", "c13_training", "c14_secure_dev", "c15_third_party",
  "c16_retention", "c17_incident", "c18_continuity",
] as const;

const CYBER_LABELS: Record<string, string> = {
  c1_auth: "Authentication",
  c2_encryption: "Encryption of personal information",
  c3_account_access: "Account management and access controls",
  c4_inventory: "Inventory and management of personal information and systems",
  c5_secure_config: "Secure configuration of hardware and software",
  c6_vuln_mgmt: "Vulnerability scanning and penetration testing",
  c7_audit_logs: "Audit-log management",
  c8_network_mon: "Network monitoring and defenses",
  c9_anti_malware: "Antivirus and anti-malware protections",
  c10_segmentation: "Segmentation of an information system",
  c11_port_protocol: "Port and protocol management and protection",
  c12_awareness: "Cybersecurity awareness",
  c13_training: "Cybersecurity education and training",
  c14_secure_dev: "Secure development and coding practices",
  c15_third_party: "Oversight of service providers, contractors, and third parties",
  c16_retention: "Retention schedules and proper disposal of personal information",
  c17_incident: "Security-incident response management",
  c18_continuity: "Business-continuity and disaster-recovery planning",
};

function buildControls(bySlug: Record<typeof CYBER_SLUGS[number], ControlSpec>) {
  return CYBER_SLUGS.map((k) => ({
    key: k,
    label: CYBER_LABELS[k],
    maturity: bySlug[k].maturity,
    notes: bySlug[k].notes,
    evidence: bySlug[k].evidence,
    ...(bySlug[k].na_reason ? { na_reason: bySlug[k].na_reason } : {}),
  }));
}

export const PANEL_CPPA_CYBER: PanelFixture[] = [
  // ── p01 — Sequoia Cloud Systems, Inc.: near-perfect posture, external
  // auditor with independence confirmed, § 7120 met via A2 consumer volume. ──
  {
    id: "cppa-cyber-p01-cloud-saas-near-perfect",
    tool: "cppa-cyber",
    label: "Cloud SaaS platform — near-complete continuous-monitoring posture, independence-confirmed external auditor",
    company: "Sequoia Cloud Systems, Inc.",
    sector: "Cloud infrastructure and SaaS hosting",
    geo: "us",
    summary:
      "Sequoia runs a mature, continuously-monitored control program across all eighteen § 7123(c) components with testable evidence on file, engages an external auditor whose independence is confirmed in writing, and meets the § 7120(b)(2) audit-applicability threshold through its consumer-processing volume (over 1,000,000 consumers) rather than a sale-of-data revenue share. No incidents were reported in the trailing twelve months.",
    intake: {
      profile: {
        entity_name: "Sequoia Cloud Systems, Inc.",
        industry: "Cloud infrastructure and SaaS hosting",
        incidents_12mo: "None",
        framework: "NIST CSF",
        last_audit: "Within 12 months",
        in_scope_frameworks: ["NIST CSF", "SOC 2"],
        audit_scope_rationale:
          "The audit covers every production system and data store that processes California personal information across Sequoia's multi-tenant hosting platform; the 2026 SOC 2 Type II report is leveraged where its testing overlaps, and each § 7123(c) component is independently tested where it does not.",
        auditor_engagement_status: "External auditor engaged, independence confirmed in writing",
        prior_audit_scope:
          "The prior engagement was a 2025 SOC 2 Type II examination of the hosting platform's security and availability trust criteria; it did not independently test retention/disposal or third-party oversight, which this audit covers directly.",
        remediation_owner: "VP of Security Engineering, accountable to the Audit Committee for closing every tracked finding.",
        q1_revenue: "Over $100M",
        q2_consumers: "1,000,000 or more",
        q5_sell_share: "No",
        q15_sensitive_pi: "No",
        password_auth_used: "No",
      },
      controls: buildControls({
        c1_auth: {
          maturity: "Implemented with continuous monitoring",
          notes: "Okta is the sole identity provider for all 2,240 workforce accounts; phishing-resistant FIDO2 keys are mandatory for the 58 administrative roles and TOTP for all other staff, with password authentication disabled at the directory since 2026-01. The Director of Identity Engineering owns the policy and reviews the authenticator inventory monthly.",
          evidence: ["Policy / procedure document", "Screenshot / config export", "Sample log / report"],
        },
        c2_encryption: {
          maturity: "Implemented with continuous monitoring",
          notes: "All customer data is encrypted at rest with AES-256 under per-tenant AWS KMS keys and in transit with TLS 1.3 enforced at the load balancer; the Principal Security Engineer owns key rotation on a 365-day schedule, verified by a nightly AWS Config compliance sweep.",
          evidence: ["Policy / procedure document", "Screenshot / config export", "Sample log / report"],
        },
        c3_account_access: {
          maturity: "Implemented with continuous monitoring",
          notes: "Role-based access across 41 defined roles is provisioned by SCIM from Workday; joiner-mover-leaver runs automatically with a 30-minute deprovisioning SLA, and the Security Governance Manager runs a quarterly certification of every privileged role (2026-Q2: 100% complete, zero orphaned accounts).",
          evidence: ["Policy / procedure document", "Sample log / report", "SOC 2 or auditor letter"],
        },
        c4_inventory: {
          maturity: "Implemented with continuous monitoring",
          notes: "A single asset and data inventory in ServiceNow CMDB reconciles nightly against AWS Config and Azure Resource Graph; 4,120 systems and 63 data stores are recorded, each with a named owner and data-category tag, attested quarterly by the Data Governance Manager.",
          evidence: ["Policy / procedure document", "Screenshot / config export", "Sample log / report"],
        },
        c5_secure_config: {
          maturity: "Implemented with continuous monitoring",
          notes: "CIS Benchmark Level 1 baselines are enforced through Ansible with drift auto-remediation; Wiz CSPM reports 99.6% conformance across production for the trailing eight weeks, and the Head of Platform Engineering re-baselines every six months.",
          evidence: ["Policy / procedure document", "Screenshot / config export"],
        },
        c6_vuln_mgmt: {
          maturity: "Implemented with continuous monitoring",
          notes: "Wiz performs continuous cloud and container scanning and an independent firm performs an annual penetration test; the most recent test (2026-05-12) found two medium findings, both remediated and retested by 2026-06-10. Remediation SLAs are 7 days critical / 30 days high, tracked at 98.1% attainment.",
          evidence: ["Policy / procedure document", "Third-party pen test / scan report", "Sample log / report"],
        },
        c7_audit_logs: {
          maturity: "Implemented with continuous monitoring",
          notes: "CloudTrail (organization trail, all regions), VPC flow logs, and application access logs ship to Splunk Cloud with 400-day hot retention and 7-year archive in S3 Object Lock; the Detection Engineering Lead reviews log-source health monthly.",
          evidence: ["Policy / procedure document", "Screenshot / config export", "Sample log / report"],
        },
        c8_network_mon: {
          maturity: "Implemented with continuous monitoring",
          notes: "AWS GuardDuty and Cloudflare WAF front every internet-facing service with detections normalized into Splunk Enterprise Security; a 24x7 managed detection provider triages under a 15-minute critical-acknowledgement SLA (June 2026 mean time to acknowledge: 5 minutes).",
          evidence: ["Runbook / SOP", "Screenshot / config export", "Sample log / report"],
        },
        c9_anti_malware: {
          maturity: "Implemented with continuous monitoring",
          notes: "CrowdStrike Falcon is deployed on 100% of managed endpoints and server workloads, enforced at enrollment by an EKS admission controller that blocks unprotected nodes; coverage is reconciled daily against the CMDB.",
          evidence: ["Policy / procedure document", "Screenshot / config export", "Sample log / report"],
        },
        c10_segmentation: {
          maturity: "Implemented across organization",
          notes: "Production, staging, and corporate environments sit in separate AWS accounts with no peering; east-west traffic inside the production cluster is constrained by default-deny network policies, reviewed semi-annually by the Head of Platform Engineering (last review 2026-04-28).",
          evidence: ["Policy / procedure document", "Screenshot / config export"],
        },
        c11_port_protocol: {
          maturity: "Implemented across organization",
          notes: "Security groups and network ACLs are deny-by-default and defined exclusively in Terraform; every open port carries a business justification in the CMDB, and a Checkov policy gate blocks any pull request that would expose a port to 0.0.0.0/0 without Head of Security approval.",
          evidence: ["Policy / procedure document", "Screenshot / config export", "Sample log / report"],
        },
        c12_awareness: {
          maturity: "Implemented with continuous monitoring",
          notes: "Monthly phishing simulations run through KnowBe4 across the whole workforce (June 2026 click rate 1.7%), with immediate micro-training for anyone who clicks; quarterly threat briefings are delivered to all staff by the Head of Security.",
          evidence: ["Policy / procedure document", "Training completion record", "Sample log / report"],
        },
        c13_training: {
          maturity: "Implemented with continuous monitoring",
          notes: "General security and privacy training is mandatory within 14 days of hire and annually thereafter (2026 completion 100% of 2,240 staff as of 2026-06-30); secure-coding training is mandatory annually for the 380 engineers, tracked in the Workday learning system.",
          evidence: ["Policy / procedure document", "Training completion record", "Sample log / report"],
        },
        c14_secure_dev: {
          maturity: "Implemented with continuous monitoring",
          notes: "The SDLC requires threat modeling for every new service, peer review by a second engineer, and a CI gate running Semgrep SAST, Snyk SCA, and Trivy image scanning that fails the build on any high or critical finding; the Director of Engineering owns the standard, last revised 2026-03-15.",
          evidence: ["Policy / procedure document", "Runbook / SOP", "Screenshot / config export", "Sample log / report"],
        },
        c15_third_party: {
          maturity: "Implemented across organization",
          notes: "All 74 vendors are recorded in the OneTrust third-party register with a tier and business owner; the 21 vendors that process customer data are tier-1 and require an annual SOC 2 Type II or ISO 27001 certificate review, all closed for 2026 by 2026-06-15.",
          evidence: ["Policy / procedure document", "SOC 2 or auditor letter", "Sample log / report"],
        },
        c16_retention: {
          maturity: "Implemented across organization",
          notes: "The retention schedule assigns every data store a retention class tied to the purpose that sets it, with automated deletion executed by lifecycle rules and deletion receipts written to an audit table; the Data Governance Manager samples deletion evidence quarterly.",
          evidence: ["Policy / procedure document", "Runbook / SOP", "Sample log / report"],
        },
        c17_incident: {
          maturity: "Implemented with continuous monitoring",
          notes: "The incident-response plan defines four severity levels and a named incident-commander rotation; PagerDuty carries a 15-minute acknowledgement SLA for Sev-1/Sev-2. No incidents occurred in the trailing twelve months; the most recent tabletop exercise ran 2026-05-08 (ransomware scenario).",
          evidence: ["Policy / procedure document", "Runbook / SOP", "Sample log / report"],
        },
        c18_continuity: {
          maturity: "Implemented across organization",
          notes: "The business-continuity plan sets an RTO of two hours and RPO of ten minutes for the production platform, supported by multi-region active-active infrastructure; the most recent full failover exercise (2026-04-22) met RTO in one hour fifty minutes.",
          evidence: ["Policy / procedure document", "Runbook / SOP", "Sample log / report"],
        },
      }),
    },
  },

  // ── p02 — Anchor Point Insights Group, Inc.: consumer-data broker,
  // § 7120 met via A1 (50%+ revenue from data sales), 2 partial controls. ──
  {
    id: "cppa-cyber-p02-data-broker-a1-revenue-share",
    tool: "cppa-cyber",
    label: "Consumer-data broker — § 7120 threshold met by revenue share from data sales, two partially-implemented controls",
    company: "Anchor Point Insights Group, Inc.",
    sector: "Consumer marketing-data brokerage",
    geo: "us",
    summary:
      "Anchor Point derives most of its revenue from selling consumer marketing data, which independently satisfies the § 7120(b)(1) revenue-share trigger regardless of its consumer-volume figures; sixteen of its eighteen components are fully implemented with testable evidence, while secure development and third-party oversight are documented but only partially rolled out. Engages an external auditor with independence confirmed in writing.",
    intake: {
      profile: {
        entity_name: "Anchor Point Insights Group, Inc.",
        industry: "Consumer marketing-data brokerage",
        incidents_12mo: "None",
        framework: "ISO 27001",
        last_audit: "Within 12 months",
        in_scope_frameworks: ["ISO 27001"],
        audit_scope_rationale:
          "The audit covers the data-licensing platform and every internal system that stores or processes consumer records prior to sale; the ISO 27001 ISMS is supplemented with direct testing for components the certification audit does not independently examine.",
        auditor_engagement_status: "External auditor engaged, independence confirmed in writing",
        prior_audit_scope:
          "The prior engagement was the 2025 ISO 27001 surveillance audit of the data-licensing platform; it did not test retention/disposal practices specific to licensed consumer records, which this audit covers directly.",
        remediation_owner: "Chief Information Security Officer, reporting directly to the CEO.",
        q1_revenue: "$50M to $100M",
        q2_consumers: "250,000 to under 1,000,000",
        q5_sell_share: "Yes — sell only",
        q5c_share_revenue_50pct: "Yes",
        q15_sensitive_pi: "No",
        password_auth_used: "Yes",
      },
      controls: buildControls({
        c1_auth: {
          maturity: "Implemented with continuous monitoring",
          notes: "Azure AD with Duo MFA (push plus password) is required for all 310 staff; administrative consoles additionally require a hardware security key. The IT Security Manager reviews the authenticator inventory monthly.",
          evidence: ["Policy / procedure document", "Screenshot / config export"],
        },
        c2_encryption: {
          maturity: "Implemented with continuous monitoring",
          notes: "Licensed consumer records are encrypted at rest with AES-256 under Azure Key Vault–managed keys and in transit with TLS 1.2 or higher on every delivery channel; keys rotate every 180 days.",
          evidence: ["Policy / procedure document", "Screenshot / config export"],
        },
        c3_account_access: {
          maturity: "Implemented across organization",
          notes: "Role-based access is reviewed quarterly by the IT Security Manager; the 2026-Q2 recertification closed with 100% completion and zero orphaned accounts across the 310-person workforce.",
          evidence: ["Policy / procedure document", "Sample log / report"],
        },
        c4_inventory: {
          maturity: "Implemented across organization",
          notes: "A data inventory tracks every consumer-record data store and its licensing destination in a dedicated governance database, reconciled monthly against the licensing platform's own schema registry.",
          evidence: ["Policy / procedure document", "Screenshot / config export"],
        },
        c5_secure_config: {
          maturity: "Implemented across organization",
          notes: "CIS baselines are enforced on all Azure VMs and containers through Azure Policy; the monthly compliance scan reported 97% conformance for June 2026, with the remaining findings tracked to closure by the Platform team.",
          evidence: ["Policy / procedure document", "Screenshot / config export"],
        },
        c6_vuln_mgmt: {
          maturity: "Implemented across organization",
          notes: "Qualys performs authenticated monthly scans and an external firm performs an annual penetration test of the licensing platform; the 2026-04-30 test found one medium finding, remediated 2026-05-20.",
          evidence: ["Policy / procedure document", "Third-party pen test / scan report"],
        },
        c7_audit_logs: {
          maturity: "Implemented across organization",
          notes: "Azure Monitor and platform application logs are centralized in a Log Analytics workspace with 365-day retention; the Security Manager reviews log-source coverage monthly.",
          evidence: ["Policy / procedure document", "Sample log / report"],
        },
        c8_network_mon: {
          maturity: "Implemented across organization",
          notes: "Azure Firewall and Microsoft Defender for Cloud monitor all licensing-platform subnets, with alerts routed to the on-call security engineer under a 30-minute acknowledgement target.",
          evidence: ["Runbook / SOP", "Screenshot / config export"],
        },
        c9_anti_malware: {
          maturity: "Implemented across organization",
          notes: "Microsoft Defender for Endpoint is deployed on 100% of managed workstations and servers, with weekly coverage reconciliation against the asset inventory.",
          evidence: ["Policy / procedure document", "Screenshot / config export"],
        },
        c10_segmentation: {
          maturity: "Implemented across organization",
          notes: "The licensing platform, corporate systems, and analytics environment run in separate Azure subscriptions with no direct peering; network security groups enforce default-deny between them.",
          evidence: ["Policy / procedure document", "Screenshot / config export"],
        },
        c11_port_protocol: {
          maturity: "Implemented across organization",
          notes: "Network security groups are default-deny with every open port justified and logged in the governance database; the Platform Lead reviews the port register quarterly.",
          evidence: ["Policy / procedure document", "Screenshot / config export"],
        },
        c12_awareness: {
          maturity: "Implemented across organization",
          notes: "Quarterly phishing simulations run through KnowBe4 (2026-Q2 click rate 2.4%); the Head of Security delivers an annual threat-landscape briefing to the full staff.",
          evidence: ["Training completion record", "Sample log / report"],
        },
        c13_training: {
          maturity: "Implemented across organization",
          notes: "Annual security and data-handling training is mandatory for all staff who touch licensed consumer records, tracked in the HR learning system with 100% completion for 2026 as of 2026-05-30.",
          evidence: ["Policy / procedure document", "Training completion record"],
        },
        c14_secure_dev: {
          maturity: "Documented, partially implemented",
          notes: "A secure-SDLC policy requires peer code review and dependency scanning, and both are enforced on the core licensing-platform repositories; two newer internal analytics tools onboarded in 2026 have not yet been brought under the same CI gate. Target: bring both tools under the SAST/SCA gate by 2026-11-30, owned by the Director of Engineering.",
          evidence: ["Policy / procedure document", "Screenshot / config export"],
        },
        c15_third_party: {
          maturity: "Documented, partially implemented",
          notes: "The vendor-risk policy requires an annual SOC 2 or equivalent review for any processor handling licensed consumer records; 34 of 40 in-scope vendors have a current review on file, and the remaining 6 are scheduled for review completion by 2026-12-15, owned by the Vendor Risk Manager.",
          evidence: ["Policy / procedure document", "Sample log / report"],
        },
        c16_retention: {
          maturity: "Implemented across organization",
          notes: "Licensed consumer records are purged from the delivery staging environment 30 days after license fulfillment under an automated job, with deletion logs retained for two years.",
          evidence: ["Policy / procedure document", "Sample log / report"],
        },
        c17_incident: {
          maturity: "Implemented across organization",
          notes: "The incident-response plan names an incident commander rotation of four and a 24-hour acknowledgement SLA; no incidents occurred in the trailing twelve months. The most recent tabletop exercise ran 2026-02-19.",
          evidence: ["Policy / procedure document", "Runbook / SOP", "Sample log / report"],
        },
        c18_continuity: {
          maturity: "Implemented across organization",
          notes: "The continuity plan sets a 4-hour RTO for the licensing platform, supported by geo-redundant Azure storage and a warm-standby region; the most recent failover exercise (2026-03-11) met RTO in 3 hours 20 minutes.",
          evidence: ["Policy / procedure document", "Runbook / SOP", "Sample log / report"],
        },
      }),
    },
  },

  // ── p03 — Cascade Outdoor Retail Co.: small e-commerce retailer, § 7120
  // not met, informal framework, weak auditor independence, one incident. ──
  {
    id: "cppa-cyber-p03-small-retailer-not-applicable",
    tool: "cppa-cyber",
    label: "Small outdoor-gear e-commerce retailer — § 7120 threshold not met, informal framework, weak auditor independence",
    company: "Cascade Outdoor Retail Co.",
    sector: "Outdoor apparel and gear e-commerce",
    geo: "us",
    summary:
      "Cascade is a small e-commerce retailer whose reported revenue and consumer-processing volume fall under both § 7120(b) triggers, so the audit-applicability table resolves to 'not required on current facts' even though the company still self-assesses; its program otherwise relies on adequately-implemented vendor-managed defaults across the board, but it has never run a vulnerability scan or penetration test, and its identified internal auditor has a reporting line that is not yet settled, weakening independence. One low-severity incident occurred in the trailing twelve months, requiring no notification.",
    intake: {
      profile: {
        entity_name: "Cascade Outdoor Retail Co.",
        industry: "Outdoor apparel and gear e-commerce",
        incidents_12mo: "1",
        incident_notifications: "No notification was required",
        framework: "None / informal",
        last_audit: "Never",
        in_scope_frameworks: ["None / informal"],
        audit_scope_rationale:
          "Cascade has not adopted a formal framework; this self-assessment covers the e-commerce storefront, the order-management system, and the customer-service ticketing tool, the only systems that hold customer personal information.",
        auditor_engagement_status: "Internal auditor identified, reporting line not yet settled",
        prior_audit_scope: "No prior cybersecurity audit or assessment has been conducted; this self-assessment is Cascade's first review of its information security program.",
        remediation_owner: "IT Manager (dual-hatted with day-to-day systems administration).",
        q1_revenue: "Under $25M",
        q2_consumers: "Under 100,000",
        q5_sell_share: "No",
        q15_sensitive_pi: "No",
        password_auth_used: "Yes",
        consumer_notice_status: "No notice was required",
        agency_notice_status: "No notice was required",
      },
      controls: buildControls({
        c1_auth: {
          maturity: "Implemented across organization",
          notes: "A written password policy requires 12-character minimum passwords, and MFA via Google Workspace is enforced for 100% of staff, including the order-management and support-ticketing logins since 2026-04. The IT Manager reviews the authenticator roster quarterly.",
          evidence: ["Policy / procedure document", "Screenshot / config export"],
        },
        c2_encryption: {
          maturity: "Implemented across organization",
          notes: "The e-commerce platform (Shopify Plus) encrypts customer data at rest and in transit as part of its managed hosting; payment data never touches Cascade's own systems under the platform's tokenized-payment design.",
          evidence: ["SOC 2 or auditor letter"],
        },
        c3_account_access: {
          maturity: "Implemented across organization",
          notes: "Admin accounts across all three systems are removed by the IT Manager within one business day of a staff departure, per a written checklist adopted in 2026-02; a current-user export from each platform's admin console is reviewed against the active-staff roster quarterly.",
          evidence: ["Policy / procedure document", "Screenshot / config export"],
        },
        c4_inventory: {
          maturity: "Implemented across organization",
          notes: "A spreadsheet inventory lists the three systems that hold customer data (storefront, order management, support ticketing) and their approximate record counts, reconciled quarterly against each platform's own record export; the most recent reconciliation is dated 2026-07-01.",
          evidence: ["Policy / procedure document", "Screenshot / config export"],
        },
        c5_secure_config: {
          maturity: "Implemented across organization",
          notes: "The order-management system and support-ticketing tool are configured to each vendor's recommended security baseline, confirmed against the vendor's published hardening guide during onboarding and re-checked at each vendor's annual contract renewal; the IT Manager keeps a dated screenshot of each platform's current security-settings panel on file.",
          evidence: ["Screenshot / config export"],
        },
        c6_vuln_mgmt: {
          maturity: "Not implemented",
          notes: "No vulnerability scanning or penetration testing program exists; Cascade relies on its e-commerce platform vendor's own security program for the storefront but has never independently tested the order-management or support systems. Target: commission a first external scan of the order-management and support systems by 2027-02-28, owned by the IT Manager.",
          evidence: ["None on file"],
        },
        c7_audit_logs: {
          maturity: "Implemented across organization",
          notes: "The e-commerce platform retains its own access and admin-action logs for 90 days under its standard plan; the order-management and support systems' native activity logs are exported monthly by the IT Manager to a dedicated cloud-storage folder with a two-year retention.",
          evidence: ["Policy / procedure document", "Sample log / report"],
        },
        c8_network_mon: {
          maturity: "Implemented across organization",
          notes: "The e-commerce platform vendor monitors its own hosting environment under its standard plan, and the small corporate office network's router runs the manufacturer's intrusion-detection feature, reviewed by the IT Manager each month against the vendor's alert dashboard.",
          evidence: ["Screenshot / config export"],
        },
        c9_anti_malware: {
          maturity: "Implemented across organization",
          notes: "All 9 company laptops run Microsoft Defender with cloud-delivered protection enabled by default IT policy, verified during the annual laptop refresh.",
          evidence: ["Screenshot / config export"],
        },
        c10_segmentation: {
          maturity: "Implemented across organization",
          notes: "Cascade's own network footprint is a single small-office LAN; the office router's guest-network feature keeps visitor Wi-Fi fully isolated from the two workstations that access customer data, and no other device is permitted on the internal network by written policy.",
          evidence: ["Policy / procedure document", "Screenshot / config export"],
        },
        c11_port_protocol: {
          maturity: "Implemented across organization",
          notes: "The small-office router is configured deny-by-default with only the two ports required for office Wi-Fi and guest network open, per the manufacturer's setup guide followed at installation; the IT Manager reviews the router's port configuration at each annual ISP contract renewal.",
          evidence: ["Screenshot / config export"],
        },
        c12_awareness: {
          maturity: "Implemented across organization",
          notes: "The IT Manager sends a phishing-awareness email to all staff each quarter using a fixed internal calendar reminder, with the sent emails retained in the company mailbox as the record.",
          evidence: ["Sample log / report"],
        },
        c13_training: {
          maturity: "Implemented across organization",
          notes: "Every new hire receives a security orientation from the IT Manager during onboarding, acknowledged with a signed form kept in the personnel file; 100% of the current 14-person staff has a signed form on file as of 2026-07-01.",
          evidence: ["Training completion record"],
        },
        c14_secure_dev: {
          maturity: "Not applicable to our information system",
          notes: "Cascade licenses its e-commerce, order-management, and support systems entirely from third-party SaaS vendors and performs no in-house software development.",
          evidence: ["None on file"],
          na_reason: "Cascade has no in-house software development function; every system it uses is licensed, unmodified, third-party SaaS.",
        },
        c15_third_party: {
          maturity: "Implemented across organization",
          notes: "Cascade reviewed its e-commerce and order-management vendors' published security and SOC 2 summary pages before signing and re-reviews each at its annual contract renewal; the saved copies of each vendor's current summary page are kept in the vendor file.",
          evidence: ["Screenshot / config export"],
        },
        c16_retention: {
          maturity: "Implemented across organization",
          notes: "A written policy states customer order records are kept for 3 years for tax purposes; the IT Manager runs a manual deletion pass each January against the prior policy, with the most recent pass (2026-01-15) recorded in a spreadsheet of records purged.",
          evidence: ["Policy / procedure document", "Sample log / report"],
        },
        c17_incident: {
          maturity: "Implemented across organization",
          notes: "A one-page incident checklist names the IT Manager as the point of contact and sets a same-day containment target. One incident occurred in 2026-03 — a support-ticketing account was compromised via a reused password and used to view roughly 40 customer order records; no payment or sensitive data was exposed, the account was disabled within four hours of detection, and outside counsel confirmed no notification obligation applied given the data involved.",
          evidence: ["Policy / procedure document", "Sample log / report"],
        },
        c18_continuity: {
          maturity: "Implemented across organization",
          notes: "Cascade relies on its SaaS vendors' own uptime and backup commitments, tracked against each vendor's published status-page URL bookmarked in a shared document; the IT Manager checks the storefront platform's own quarterly uptime report as the continuity record.",
          evidence: ["Screenshot / config export"],
        },
      }),
    },
  },

  // ── p04 — Ridgeline BioPharma Labs: biotech R&D, near-perfect posture,
  // § 7120 met via A2 sensitive-PI volume, weak-independence internal auditor. ──
  {
    id: "cppa-cyber-p04-biopharma-spi-volume",
    tool: "cppa-cyber",
    label: "Clinical biopharma R&D — near-complete posture, § 7120 met via sensitive-PI volume, internal auditor without independent reporting line",
    company: "Ridgeline BioPharma Labs, Inc.",
    sector: "Clinical-stage biopharmaceutical research",
    geo: "us",
    summary:
      "Ridgeline runs a mature control program across all eighteen § 7123(c) components with testable evidence throughout, and meets the § 7120(b)(2) audit-applicability threshold through the sensitive-personal-information volume prong (its clinical-trial data covers 50,000 or more consumers) rather than the general 250,000-consumer prong. Its internal auditor reports to an executive with no cybersecurity-program responsibility, which the record notes as a genuine independence gap rather than confirmed independence.",
    intake: {
      profile: {
        entity_name: "Ridgeline BioPharma Labs, Inc.",
        industry: "Clinical-stage biopharmaceutical research",
        incidents_12mo: "None",
        framework: "SOC 2",
        last_audit: "Within 12 months",
        in_scope_frameworks: ["SOC 2"],
        audit_scope_rationale:
          "The audit covers the clinical-trial data platform, the participant recruitment portal, and the laboratory information management system, the three systems that process trial-participant personal information.",
        auditor_engagement_status: "Internal auditor engaged, reports to an executive without cybersecurity-program responsibility",
        prior_audit_scope:
          "The prior engagement was the 2025 SOC 2 Type II examination of the clinical-trial data platform's security trust criteria; it did not test the laboratory information management system, which this audit covers directly.",
        remediation_owner: "Director of Research Information Security, reporting to the General Counsel.",
        q1_revenue: "$25M to under $50M",
        q2_consumers: "Under 100,000",
        q5_sell_share: "No",
        q15_sensitive_pi: "Yes",
        q15c_spi_volume: "50,000 or more",
        password_auth_used: "No",
        q1_revenue_threshold_check: "Yes — above the threshold",
        q1_revenue_reference_year: "2025",
      },
      controls: buildControls({
        c1_auth: {
          maturity: "Implemented with continuous monitoring",
          notes: "Okta with FIDO2 hardware keys is required for all 480 research and clinical staff accessing the trial-data platform; password authentication is disabled at the directory. The IT Security Lead reviews the authenticator roster monthly.",
          evidence: ["Policy / procedure document", "Screenshot / config export"],
        },
        c2_encryption: {
          maturity: "Implemented with continuous monitoring",
          notes: "Trial-participant data is encrypted at rest with AES-256 under a dedicated HSM-backed key and in transit with TLS 1.3 on every platform endpoint; keys rotate every 180 days.",
          evidence: ["Policy / procedure document", "Screenshot / config export"],
        },
        c3_account_access: {
          maturity: "Implemented across organization",
          notes: "Access to trial data is role-based and reviewed quarterly by the IT Security Lead; the 2026-Q2 recertification closed with 100% completion and zero orphaned accounts.",
          evidence: ["Policy / procedure document", "Sample log / report"],
        },
        c4_inventory: {
          maturity: "Implemented across organization",
          notes: "A data inventory tracks every trial-data store by study protocol number and retention obligation, reconciled quarterly against the clinical-trial management system's own study registry.",
          evidence: ["Policy / procedure document", "Screenshot / config export"],
        },
        c5_secure_config: {
          maturity: "Implemented across organization",
          notes: "CIS baselines are enforced on the trial-data platform's cloud infrastructure through Terraform-managed policy; the June 2026 compliance scan reported 98% conformance.",
          evidence: ["Policy / procedure document", "Screenshot / config export"],
        },
        c6_vuln_mgmt: {
          maturity: "Implemented across organization",
          notes: "An external firm performs an annual penetration test of the trial-data platform and recruitment portal; the 2026-04-10 test found one medium finding, remediated 2026-05-01. Monthly authenticated scans run against all in-scope systems.",
          evidence: ["Policy / procedure document", "Third-party pen test / scan report"],
        },
        c7_audit_logs: {
          maturity: "Implemented across organization",
          notes: "Platform access and export logs are centralized with 365-day retention, reviewed monthly by the IT Security Lead for anomalous bulk exports of trial data.",
          evidence: ["Policy / procedure document", "Sample log / report"],
        },
        c8_network_mon: {
          maturity: "Implemented across organization",
          notes: "Cloud-native intrusion detection monitors the trial-data platform's VPC continuously, with alerts routed to the on-call security engineer under a 30-minute acknowledgement target.",
          evidence: ["Runbook / SOP", "Screenshot / config export"],
        },
        c9_anti_malware: {
          maturity: "Implemented across organization",
          notes: "Endpoint protection is deployed on 100% of managed laptops used by research and clinical staff, reconciled weekly against the device inventory.",
          evidence: ["Policy / procedure document", "Screenshot / config export"],
        },
        c10_segmentation: {
          maturity: "Implemented across organization",
          notes: "The trial-data platform, laboratory information management system, and corporate systems run in separate cloud accounts with no direct peering; the Head of IT reviews the account boundaries semi-annually.",
          evidence: ["Policy / procedure document", "Screenshot / config export"],
        },
        c11_port_protocol: {
          maturity: "Implemented across organization",
          notes: "Security groups are default-deny and defined in Terraform; every open port is logged with a business justification and reviewed quarterly by the Head of IT.",
          evidence: ["Policy / procedure document", "Screenshot / config export"],
        },
        c12_awareness: {
          maturity: "Implemented across organization",
          notes: "Quarterly phishing simulations run across all staff (2026-Q2 click rate 2.1%), with a mandatory briefing on clinical-data-handling risks delivered annually by the IT Security Lead.",
          evidence: ["Training completion record", "Sample log / report"],
        },
        c13_training: {
          maturity: "Implemented across organization",
          notes: "Annual data-handling and security training is mandatory for all staff with trial-data access, tracked in the HR learning system with 100% completion for 2026 as of 2026-06-01.",
          evidence: ["Policy / procedure document", "Training completion record"],
        },
        c14_secure_dev: {
          maturity: "Implemented across organization",
          notes: "The recruitment portal's development team follows a secure-SDLC policy requiring peer review and dependency scanning in CI, enforced on every merge to the production branch.",
          evidence: ["Policy / procedure document", "Screenshot / config export"],
        },
        c15_third_party: {
          maturity: "Implemented across organization",
          notes: "The clinical-trial management system vendor and the laboratory information management system vendor are both tier-1 in the vendor register, each providing an annual SOC 2 Type II reviewed by the IT Security Lead; both current for 2026.",
          evidence: ["Policy / procedure document", "SOC 2 or auditor letter"],
        },
        c16_retention: {
          maturity: "Implemented across organization",
          notes: "Trial-participant data retention follows each study's protocol-specified schedule and applicable FDA record-retention rules, with disposition tracked per protocol in the trial-data platform.",
          evidence: ["Policy / procedure document", "Sample log / report"],
        },
        c17_incident: {
          maturity: "Implemented across organization",
          notes: "The incident-response plan names the IT Security Lead as incident commander with a 24-hour acknowledgement target; no incidents occurred in the trailing twelve months. The most recent tabletop exercise ran 2026-04-15.",
          evidence: ["Policy / procedure document", "Runbook / SOP", "Sample log / report"],
        },
        c18_continuity: {
          maturity: "Implemented across organization",
          notes: "The continuity plan sets a 24-hour RTO for the trial-data platform, supported by daily automated backups to a geographically separate region; the most recent restore test (2026-05-30) succeeded within RTO.",
          evidence: ["Policy / procedure document", "Runbook / SOP", "Sample log / report"],
        },
      }),
    },
  },

  // ── p05 — Union Gate Logistics Corp: stale/overdue remediation commitment. ──
  {
    id: "cppa-cyber-p05-logistics-overdue-commitment",
    tool: "cppa-cyber",
    label: "Trucking and freight logistics — otherwise near-complete, one remediation commitment now overdue",
    company: "Union Gate Logistics Corp.",
    sector: "Trucking and freight logistics",
    geo: "us",
    summary:
      "Union Gate's control program is otherwise fully implemented across all eighteen § 7123(c) components, but its vulnerability-management record still carries a remediation commitment that was due 2026-06-30 and remains open on this record dated 2026-09-14 — an OVERDUE stale commitment, not a live plan. No auditor has yet been engaged. § 7120 applicability is met through consumer-processing volume rather than a data-sale revenue share.",
    intake: {
      profile: {
        entity_name: "Union Gate Logistics Corp.",
        industry: "Trucking and freight logistics",
        incidents_12mo: "2–5",
        incident_notifications: "Affected consumers were notified (Civ. Code § 1798.82(a))",
        framework: "ISO 27001",
        last_audit: "12–24 months ago",
        in_scope_frameworks: ["ISO 27001"],
        audit_scope_rationale:
          "The audit covers the driver-tracking platform, the customer shipment-portal, and the corporate identity estate, the three systems that process California personal information.",
        auditor_engagement_status: "No auditor engaged yet",
        prior_audit_scope: "The ISO 27001 certification audit completed 2025-08 covered the driver-tracking platform's information security management system generally; it was not a § 7123(c) cybersecurity audit and did not test the customer shipment-portal.",
        remediation_owner: "Director of IT Operations, reporting to the COO.",
        q1_revenue: "$50M to $100M",
        q2_consumers: "250,000 to under 1,000,000",
        q5_sell_share: "No",
        q15_sensitive_pi: "No",
        password_auth_used: "Yes",
        consumer_notice_status: "Notice provided to affected consumers",
        agency_notice_status: "No notice was required",
      },
      controls: buildControls({
        c1_auth: {
          maturity: "Implemented across organization",
          notes: "Azure AD with Duo MFA (push plus password) is required for all 620 dispatch, warehouse, and corporate staff; the IT Operations team reviews the authenticator roster monthly.",
          evidence: ["Policy / procedure document", "Screenshot / config export"],
        },
        c2_encryption: {
          maturity: "Implemented across organization",
          notes: "Shipment and driver-location data is encrypted at rest with AES-256 under Azure Key Vault-managed keys and in transit with TLS 1.2 or higher across the driver-tracking platform and customer portal.",
          evidence: ["Policy / procedure document", "Screenshot / config export"],
        },
        c3_account_access: {
          maturity: "Implemented across organization",
          notes: "Role-based access is reviewed quarterly; the 2026-Q2 recertification closed with 100% completion across the 620-person workforce and zero orphaned accounts.",
          evidence: ["Policy / procedure document", "Sample log / report"],
        },
        c4_inventory: {
          maturity: "Implemented across organization",
          notes: "A data inventory tracks the three systems holding customer and driver personal information, reconciled quarterly against each platform's own schema export.",
          evidence: ["Policy / procedure document", "Screenshot / config export"],
        },
        c5_secure_config: {
          maturity: "Implemented across organization",
          notes: "CIS baselines are enforced on all cloud infrastructure through Azure Policy; the June 2026 compliance scan reported 96% conformance across production.",
          evidence: ["Policy / procedure document", "Screenshot / config export"],
        },
        c6_vuln_mgmt: {
          maturity: "Implemented across organization",
          notes: "Qualys performs authenticated monthly scans of the driver-tracking platform and customer portal, and an external firm performs an annual penetration test. One critical finding from the 2026-04-18 external test was scheduled for remediation by 2026-06-30 and remains open on this record; the Director of IT Operations has since assigned it to the platform team with no new completion date set.",
          evidence: ["Policy / procedure document", "Third-party pen test / scan report"],
        },
        c7_audit_logs: {
          maturity: "Implemented across organization",
          notes: "Platform access and admin-action logs are centralized in Azure Monitor with 365-day retention; the IT Operations team reviews log-source coverage monthly.",
          evidence: ["Policy / procedure document", "Sample log / report"],
        },
        c8_network_mon: {
          maturity: "Implemented across organization",
          notes: "Microsoft Defender for Cloud monitors all production subnets continuously, with alerts routed to the on-call engineer under a 30-minute acknowledgement target.",
          evidence: ["Runbook / SOP", "Screenshot / config export"],
        },
        c9_anti_malware: {
          maturity: "Implemented across organization",
          notes: "Microsoft Defender for Endpoint is deployed on 100% of managed devices, including warehouse handheld scanners, reconciled monthly against the device inventory.",
          evidence: ["Policy / procedure document", "Screenshot / config export"],
        },
        c10_segmentation: {
          maturity: "Implemented across organization",
          notes: "The driver-tracking platform, customer portal, and corporate systems run in separate Azure subscriptions with default-deny network security groups between them.",
          evidence: ["Policy / procedure document", "Screenshot / config export"],
        },
        c11_port_protocol: {
          maturity: "Implemented across organization",
          notes: "Network security groups are default-deny with every open port logged and justified; the IT Operations team reviews the port register quarterly.",
          evidence: ["Policy / procedure document", "Screenshot / config export"],
        },
        c12_awareness: {
          maturity: "Implemented across organization",
          notes: "Quarterly phishing simulations run across corporate and dispatch staff (2026-Q2 click rate 3.0%); the two incidents below both began with a phishing email, prompting an added mandatory refresher for dispatch staff in 2026-07.",
          evidence: ["Training completion record", "Sample log / report"],
        },
        c13_training: {
          maturity: "Implemented across organization",
          notes: "Annual security training is mandatory for all staff, tracked in the HR learning system with 100% completion for 2026 as of 2026-05-15.",
          evidence: ["Policy / procedure document", "Training completion record"],
        },
        c14_secure_dev: {
          maturity: "Implemented across organization",
          notes: "The customer-portal development team follows a secure-SDLC policy requiring peer review and dependency scanning in CI, enforced on every merge.",
          evidence: ["Policy / procedure document", "Screenshot / config export"],
        },
        c15_third_party: {
          maturity: "Implemented across organization",
          notes: "The driver-tracking platform vendor and fuel-card data vendor are both tier-1 in the vendor register with annual SOC 2 reviews on file, both current for 2026.",
          evidence: ["Policy / procedure document", "SOC 2 or auditor letter"],
        },
        c16_retention: {
          maturity: "Implemented across organization",
          notes: "Driver-location data is purged 90 days after the associated delivery closes under an automated job; customer shipment records follow a 4-year retention tied to commercial-carrier recordkeeping obligations.",
          evidence: ["Policy / procedure document", "Sample log / report"],
        },
        c17_incident: {
          maturity: "Implemented across organization",
          notes: "Two phishing-driven account-compromise incidents occurred in 2026 (2026-02 and 2026-05), both affecting fewer than 200 customer shipment records each; affected customers were notified within 30 days of confirmation in both cases, consistent with Civ. Code § 1798.82(a). The incident-response plan names the Director of IT Operations as incident commander.",
          evidence: ["Policy / procedure document", "Sample log / report"],
        },
        c18_continuity: {
          maturity: "Implemented across organization",
          notes: "The continuity plan sets a 4-hour RTO for the driver-tracking platform, supported by geo-redundant Azure storage; the most recent failover exercise (2026-04-05) met RTO in 3 hours 10 minutes.",
          evidence: ["Policy / procedure document", "Runbook / SOP", "Sample log / report"],
        },
      }),
    },
  },

  // ── p06 — Bellwether Insurance Mutual: near-perfect posture, external
  // auditor without independence-confirmed language, § 7120 via A2 consumer volume. ──
  {
    id: "cppa-cyber-p06-insurance-external-auditor",
    tool: "cppa-cyber",
    label: "Regional property & casualty mutual insurer — near-complete posture, external auditor engaged (independence not yet separately confirmed)",
    company: "Bellwether Insurance Mutual",
    sector: "Property and casualty insurance",
    geo: "us",
    summary:
      "Bellwether runs a mature, HITRUST-aligned control program across all eighteen § 7123(c) components with testable evidence throughout, and engages an external auditor without the record separately confirming independence in writing — a distinct engagement posture from a confirmed-independent external audit. It meets the § 7120(b)(2) threshold through policyholder-processing volume.",
    intake: {
      profile: {
        entity_name: "Bellwether Insurance Mutual",
        industry: "Property and casualty insurance",
        incidents_12mo: "None",
        framework: "HITRUST",
        last_audit: "Within 12 months",
        in_scope_frameworks: ["HITRUST"],
        audit_scope_rationale:
          "The audit covers the policy-administration system, the claims platform, and the policyholder portal, the three systems that process California policyholder personal information.",
        auditor_engagement_status: "External auditor engaged",
        prior_audit_scope:
          "The prior engagement was the 2025 HITRUST CSF validated assessment of the claims platform; it did not test the policyholder portal, which this audit covers directly.",
        remediation_owner: "VP of Information Security, reporting to the Chief Risk Officer.",
        q1_revenue: "$50M to $100M",
        q2_consumers: "250,000 to under 1,000,000",
        q5_sell_share: "No",
        q15_sensitive_pi: "No",
        password_auth_used: "No",
      },
      controls: buildControls({
        c1_auth: {
          maturity: "Implemented with continuous monitoring",
          notes: "Ping Identity with WebAuthn passwordless authentication is required for all 890 staff; password authentication is disabled at the directory. The Security Operations Manager reviews the authenticator roster monthly.",
          evidence: ["Policy / procedure document", "Screenshot / config export"],
        },
        c2_encryption: {
          maturity: "Implemented with continuous monitoring",
          notes: "Policyholder and claims data is encrypted at rest with AES-256 under HSM-backed keys and in transit with TLS 1.3 across all three in-scope systems; keys rotate every 365 days.",
          evidence: ["Policy / procedure document", "Screenshot / config export"],
        },
        c3_account_access: {
          maturity: "Implemented across organization",
          notes: "Role-based access with privileged-access management for claims adjusters is reviewed quarterly; the 2026-Q2 recertification closed with 100% completion and zero orphaned accounts.",
          evidence: ["Policy / procedure document", "SOC 2 or auditor letter"],
        },
        c4_inventory: {
          maturity: "Implemented across organization",
          notes: "A data inventory tracks every policyholder and claims data store with an owner and retention class, reconciled quarterly against each system's own schema registry.",
          evidence: ["Policy / procedure document", "Screenshot / config export"],
        },
        c5_secure_config: {
          maturity: "Implemented across organization",
          notes: "CIS baselines are enforced across the policy-administration and claims infrastructure; the June 2026 compliance scan reported 98% conformance.",
          evidence: ["Policy / procedure document", "Screenshot / config export"],
        },
        c6_vuln_mgmt: {
          maturity: "Implemented with continuous monitoring",
          notes: "Continuous cloud scanning runs alongside monthly authenticated scans and an annual third-party penetration test; the 2026-05-01 test found zero critical or high findings.",
          evidence: ["Policy / procedure document", "Third-party pen test / scan report"],
        },
        c7_audit_logs: {
          maturity: "Implemented with continuous monitoring",
          notes: "Centralized logging with 400-day retention covers all three in-scope systems; the Detection Engineering team monitors log-source health continuously.",
          evidence: ["Policy / procedure document", "Sample log / report"],
        },
        c8_network_mon: {
          maturity: "Implemented with continuous monitoring",
          notes: "A 24x7 managed detection provider monitors the policy-administration and claims network continuously under a 15-minute critical-acknowledgement SLA.",
          evidence: ["Runbook / SOP", "Screenshot / config export"],
        },
        c9_anti_malware: {
          maturity: "Implemented across organization",
          notes: "Endpoint protection is deployed on 100% of managed devices, reconciled weekly against the asset inventory.",
          evidence: ["Policy / procedure document", "Screenshot / config export"],
        },
        c10_segmentation: {
          maturity: "Implemented across organization",
          notes: "The claims platform, policy-administration system, and corporate network are segmented by firewall policy with default-deny east-west rules, reviewed semi-annually.",
          evidence: ["Policy / procedure document", "Screenshot / config export"],
        },
        c11_port_protocol: {
          maturity: "Implemented across organization",
          notes: "Firewall rules are default-deny with every open port logged and justified; the Security Operations Manager reviews the port register quarterly.",
          evidence: ["Policy / procedure document", "Screenshot / config export"],
        },
        c12_awareness: {
          maturity: "Implemented across organization",
          notes: "Monthly phishing simulations run across all staff (2026-Q2 click rate 2.0%), with immediate micro-training for anyone who clicks.",
          evidence: ["Training completion record", "Sample log / report"],
        },
        c13_training: {
          maturity: "Implemented across organization",
          notes: "Annual security and data-handling training is mandatory for all staff, tracked with 100% completion for 2026 as of 2026-06-01.",
          evidence: ["Policy / procedure document", "Training completion record"],
        },
        c14_secure_dev: {
          maturity: "Implemented across organization",
          notes: "The policyholder-portal development team follows a secure-SDLC policy requiring peer review and dependency scanning in CI, enforced on every merge.",
          evidence: ["Policy / procedure document", "Screenshot / config export"],
        },
        c15_third_party: {
          maturity: "Implemented across organization",
          notes: "All claims-processing and policy-administration vendors are tier-1 in the vendor register with an annual HITRUST or SOC 2 review on file, all current for 2026.",
          evidence: ["Policy / procedure document", "SOC 2 or auditor letter"],
        },
        c16_retention: {
          maturity: "Implemented across organization",
          notes: "Policy and claims records follow the state-mandated retention schedule for insurance recordkeeping, with automated archival and disposition tracked in the policy-administration system.",
          evidence: ["Policy / procedure document", "Sample log / report"],
        },
        c17_incident: {
          maturity: "Implemented with continuous monitoring",
          notes: "The incident-response plan names a 24x7 on-call rotation with a 15-minute acknowledgement SLA; no incidents occurred in the trailing twelve months. The most recent tabletop exercise ran 2026-05-20.",
          evidence: ["Policy / procedure document", "Runbook / SOP", "Sample log / report"],
        },
        c18_continuity: {
          maturity: "Implemented across organization",
          notes: "The continuity plan sets a 4-hour RTO for the claims platform, supported by multi-region active-passive infrastructure; the most recent failover exercise (2026-04-12) met RTO in 3 hours 15 minutes.",
          evidence: ["Policy / procedure document", "Runbook / SOP", "Sample log / report"],
        },
      }),
    },
  },

  // ── p07 — Crestline Apparel Brands LLC: apparel e-commerce, one gap
  // (training), conflicted-reporting-line internal auditor, § 7120 not met. ──
  {
    id: "cppa-cyber-p07-apparel-conflicted-reporting-line",
    tool: "cppa-cyber",
    label: "Apparel e-commerce brand — one training-program gap, internal auditor reporting to the executive owning cybersecurity",
    company: "Crestline Apparel Brands LLC",
    sector: "Apparel and footwear e-commerce",
    geo: "us",
    summary:
      "Crestline shares limited browsing data with an advertising partner but derives well under half its revenue from that arrangement and falls under both § 7120(b) volume thresholds, so the audit-applicability table resolves to 'not required on current facts'. Seventeen of eighteen components are fully implemented; only cybersecurity training remains ad hoc. Its internal auditor reports to the same executive who owns the cybersecurity program, a reporting line the record notes as a genuine independence conflict.",
    intake: {
      profile: {
        entity_name: "Crestline Apparel Brands LLC",
        industry: "Apparel and footwear e-commerce",
        incidents_12mo: "None",
        framework: "PCI DSS",
        last_audit: "Within 12 months",
        in_scope_frameworks: ["PCI DSS"],
        audit_scope_rationale:
          "The audit covers the e-commerce storefront, the customer-service platform, and the marketing-analytics pipeline that shares browsing data with an advertising partner.",
        auditor_engagement_status: "Internal auditor engaged, reports to the executive responsible for the cybersecurity program",
        prior_audit_scope:
          "The prior engagement was the 2025 PCI DSS assessment of the payment-card environment; it did not test the marketing-analytics pipeline, which this audit covers directly.",
        remediation_owner: "Head of IT, who also owns the cybersecurity program budget.",
        q1_revenue: "Under $25M",
        q2_consumers: "Under 100,000",
        q5_sell_share: "Yes — share for advertising only",
        q5c_share_revenue_50pct: "No",
        q15_sensitive_pi: "No",
        password_auth_used: "Yes",
      },
      controls: buildControls({
        c1_auth: {
          maturity: "Implemented across organization",
          notes: "Google Workspace SSO with mandatory MFA covers all 62 staff and the e-commerce admin console; the Head of IT reviews the authenticator roster quarterly.",
          evidence: ["Policy / procedure document", "Screenshot / config export"],
        },
        c2_encryption: {
          maturity: "Implemented across organization",
          notes: "Customer and payment data is encrypted at rest and in transit under the e-commerce platform's PCI DSS-validated managed hosting; the annual PCI attestation of compliance is on file.",
          evidence: ["SOC 2 or auditor letter"],
        },
        c3_account_access: {
          maturity: "Implemented across organization",
          notes: "Admin accounts are provisioned and removed through a documented joiner-mover-leaver checklist, reviewed quarterly with 100% completion for 2026-Q2 and zero orphaned accounts.",
          evidence: ["Policy / procedure document", "Screenshot / config export"],
        },
        c4_inventory: {
          maturity: "Implemented across organization",
          notes: "A data inventory lists the storefront, customer-service platform, and marketing-analytics pipeline, reconciled quarterly against each platform's own record export.",
          evidence: ["Policy / procedure document", "Screenshot / config export"],
        },
        c5_secure_config: {
          maturity: "Implemented across organization",
          notes: "Each platform is configured to its vendor's published PCI-aligned hardening baseline, confirmed at each annual PCI assessment and re-checked at contract renewal.",
          evidence: ["Policy / procedure document", "Screenshot / config export"],
        },
        c6_vuln_mgmt: {
          maturity: "Implemented across organization",
          notes: "An approved scanning vendor runs quarterly external PCI scans and an annual segmentation penetration test; the 2026-06-01 scan found zero criticals.",
          evidence: ["Policy / procedure document", "Third-party pen test / scan report"],
        },
        c7_audit_logs: {
          maturity: "Implemented across organization",
          notes: "The e-commerce and customer-service platforms retain admin-action logs for 12 months under their PCI-compliant managed hosting, exported quarterly to cold storage by the Head of IT.",
          evidence: ["Policy / procedure document", "Sample log / report"],
        },
        c8_network_mon: {
          maturity: "Implemented across organization",
          notes: "The e-commerce platform's PCI-validated hosting includes managed network intrusion detection, with monthly alert-summary reviews by the Head of IT.",
          evidence: ["Screenshot / config export", "Sample log / report"],
        },
        c9_anti_malware: {
          maturity: "Implemented across organization",
          notes: "All 62 company laptops run managed endpoint protection with centralized reporting, reconciled monthly against the device inventory.",
          evidence: ["Policy / procedure document", "Screenshot / config export"],
        },
        c10_segmentation: {
          maturity: "Implemented across organization",
          notes: "The payment-card environment is segmented from the corporate network per PCI DSS requirements, confirmed by the annual segmentation penetration test.",
          evidence: ["Policy / procedure document", "Third-party pen test / scan report"],
        },
        c11_port_protocol: {
          maturity: "Implemented across organization",
          notes: "Firewall rules restrict the payment-card environment to only the ports the PCI assessment requires, reviewed at each quarterly scan.",
          evidence: ["Policy / procedure document", "Screenshot / config export"],
        },
        c12_awareness: {
          maturity: "Implemented across organization",
          notes: "Quarterly phishing-awareness emails go to all staff (2026-Q2 click rate 3.1%), tracked by the Head of IT.",
          evidence: ["Sample log / report"],
        },
        c13_training: {
          maturity: "Ad hoc / informal",
          notes: "New hires receive a brief verbal security overview during onboarding; there is no annual refresher, no PCI-specific role-based training for staff handling payment data, and no completion tracking. Target: adopt documented annual PCI-aware security training by 2027-01-31, owned by the Head of IT.",
          evidence: ["None on file"],
        },
        c14_secure_dev: {
          maturity: "Implemented across organization",
          notes: "The marketing-analytics pipeline's small internal codebase requires peer review before merge, and the e-commerce storefront itself is unmodified vendor SaaS with no in-house code.",
          evidence: ["Policy / procedure document", "Screenshot / config export"],
        },
        c15_third_party: {
          maturity: "Implemented across organization",
          notes: "The e-commerce platform, customer-service platform, and advertising partner are all recorded in the vendor register with a signed data-sharing or processing agreement and an annual security-summary review, all current for 2026.",
          evidence: ["Policy / procedure document", "Screenshot / config export"],
        },
        c16_retention: {
          maturity: "Implemented across organization",
          notes: "Customer order records are retained 4 years for tax and warranty purposes under an automated purge job; payment card data is never stored outside the PCI-validated hosting.",
          evidence: ["Policy / procedure document", "Sample log / report"],
        },
        c17_incident: {
          maturity: "Implemented across organization",
          notes: "The incident-response plan names the Head of IT as the point of contact with a same-day containment target; no incidents occurred in the trailing twelve months.",
          evidence: ["Policy / procedure document", "Runbook / SOP", "Sample log / report"],
        },
        c18_continuity: {
          maturity: "Implemented across organization",
          notes: "The e-commerce and customer-service platforms carry vendor-managed high-availability commitments; the Head of IT reviews each vendor's quarterly uptime report as the continuity record.",
          evidence: ["Screenshot / config export", "Sample log / report"],
        },
      }),
    },
  },

  // ── p08 — Fernwood Utilities Cooperative: utility, near-perfect, external
  // auditor (no independence-confirmed language), § 7120 via A1 ad-sharing. ──
  {
    id: "cppa-cyber-p08-utility-a1-advertising-share",
    tool: "cppa-cyber",
    label: "Regional electric cooperative — near-complete posture, § 7120 met via 50%+ revenue from advertising data-sharing",
    company: "Fernwood Utilities Cooperative",
    sector: "Electric utility services",
    geo: "us",
    summary:
      "Fernwood shares member energy-usage data with an advertising partner for a program that generates more than half its non-rate revenue, which independently satisfies § 7120(b)(1) regardless of member count. Seventeen of eighteen components are fully implemented with testable evidence; cybersecurity-awareness simulations have not yet reached the field-crew workforce. Fernwood engages an external auditor without the record separately confirming independence in writing, and one incident required agency notification.",
    intake: {
      profile: {
        entity_name: "Fernwood Utilities Cooperative",
        industry: "Electric utility services",
        incidents_12mo: "1",
        incident_notifications: "An agency with jurisdiction over privacy laws in California was notified",
        framework: "SOC 2",
        last_audit: "Within 12 months",
        in_scope_frameworks: ["SOC 2"],
        audit_scope_rationale:
          "The audit covers the member billing system, the energy-usage analytics platform, and the member portal, the three systems that process member personal information.",
        auditor_engagement_status: "External auditor engaged",
        prior_audit_scope:
          "The prior engagement was the 2025 SOC 2 Type I examination of the member billing system; it did not test the energy-usage analytics platform, which this audit covers directly.",
        remediation_owner: "IT Security Manager, reporting to the General Manager.",
        q1_revenue: "$25M to under $50M",
        q2_consumers: "Under 100,000",
        q5_sell_share: "Yes — share for advertising only",
        q5c_share_revenue_50pct: "Yes",
        q15_sensitive_pi: "No",
        password_auth_used: "No",
        q1_revenue_threshold_check: "No — at or below the threshold",
        q1_revenue_reference_year: "2025",
        consumer_notice_status: "No notice was required",
        agency_notice_status: "Notice provided to an agency",
      },
      controls: buildControls({
        c1_auth: {
          maturity: "Implemented across organization",
          notes: "Azure AD with mandatory MFA via authenticator app covers all 140 staff; password authentication is disabled for administrative accounts. The IT Security Manager reviews the roster quarterly.",
          evidence: ["Policy / procedure document", "Screenshot / config export"],
        },
        c2_encryption: {
          maturity: "Implemented across organization",
          notes: "Member usage and billing data is encrypted at rest with AES-256 and in transit with TLS 1.2 or higher across the billing system, analytics platform, and member portal.",
          evidence: ["Policy / procedure document", "Screenshot / config export"],
        },
        c3_account_access: {
          maturity: "Implemented across organization",
          notes: "Role-based access is reviewed semi-annually; the most recent review (2026-06) closed with 100% completion and zero orphaned accounts.",
          evidence: ["Policy / procedure document", "Sample log / report"],
        },
        c4_inventory: {
          maturity: "Implemented across organization",
          notes: "A data inventory tracks the three in-scope systems and their data categories, reconciled semi-annually against each system's own schema.",
          evidence: ["Policy / procedure document", "Screenshot / config export"],
        },
        c5_secure_config: {
          maturity: "Implemented across organization",
          notes: "CIS baselines are enforced on the billing and analytics infrastructure; the June 2026 compliance scan reported 96% conformance.",
          evidence: ["Policy / procedure document", "Screenshot / config export"],
        },
        c6_vuln_mgmt: {
          maturity: "Implemented across organization",
          notes: "Monthly authenticated vulnerability scans and an annual third-party penetration test cover all three in-scope systems; the 2026-04-20 test found zero critical findings.",
          evidence: ["Policy / procedure document", "Third-party pen test / scan report"],
        },
        c7_audit_logs: {
          maturity: "Implemented across organization",
          notes: "Access and export logs from the billing and analytics platforms are centralized with 365-day retention, reviewed monthly by the IT Security Manager.",
          evidence: ["Policy / procedure document", "Sample log / report"],
        },
        c8_network_mon: {
          maturity: "Implemented across organization",
          notes: "Microsoft Defender for Cloud monitors the production network continuously, with alerts routed to the on-call engineer under a 30-minute acknowledgement target.",
          evidence: ["Runbook / SOP", "Screenshot / config export"],
        },
        c9_anti_malware: {
          maturity: "Implemented across organization",
          notes: "Endpoint protection is deployed on 100% of managed devices, reconciled monthly against the asset inventory.",
          evidence: ["Policy / procedure document", "Screenshot / config export"],
        },
        c10_segmentation: {
          maturity: "Implemented across organization",
          notes: "The billing system, analytics platform, and corporate network run in separate network zones with default-deny firewall rules between them.",
          evidence: ["Policy / procedure document", "Screenshot / config export"],
        },
        c11_port_protocol: {
          maturity: "Implemented across organization",
          notes: "Firewall rules are default-deny with every open port logged and justified, reviewed quarterly by the IT Security Manager.",
          evidence: ["Policy / procedure document", "Screenshot / config export"],
        },
        c12_awareness: {
          maturity: "Documented, partially implemented",
          notes: "A written phishing-awareness policy requires quarterly simulations; simulations run for the 95 office and member-services staff, but the 45-person field-crew workforce, who use shared kiosk terminals rather than individual accounts, has not yet been enrolled. Target: bring field-crew staff into the simulation program by 2026-12-01, owned by the IT Security Manager.",
          evidence: ["Policy / procedure document", "Sample log / report"],
        },
        c13_training: {
          maturity: "Implemented across organization",
          notes: "Annual security training is mandatory for all staff, tracked with 100% completion for 2026 as of 2026-05-30.",
          evidence: ["Policy / procedure document", "Training completion record"],
        },
        c14_secure_dev: {
          maturity: "Implemented across organization",
          notes: "The member-portal development team follows a secure-SDLC policy requiring peer review and dependency scanning in CI, enforced on every merge.",
          evidence: ["Policy / procedure document", "Screenshot / config export"],
        },
        c15_third_party: {
          maturity: "Implemented across organization",
          notes: "The billing-system vendor and the advertising data-sharing partner are both recorded in the vendor register with a signed agreement and an annual security review, both current for 2026.",
          evidence: ["Policy / procedure document", "Screenshot / config export"],
        },
        c16_retention: {
          maturity: "Implemented across organization",
          notes: "Member usage data shared with the advertising partner is aggregated and de-identified before transmission; billing records follow the state-mandated 7-year utility recordkeeping schedule.",
          evidence: ["Policy / procedure document", "Sample log / report"],
        },
        c17_incident: {
          maturity: "Implemented across organization",
          notes: "One incident occurred in 2026-04 — a misconfigured analytics export briefly exposed usage data for roughly 300 members to an unauthorized internal folder; the issue was corrected within six hours and a state agency with jurisdiction over privacy laws was notified within the required window. The incident-response plan names the IT Security Manager as incident commander.",
          evidence: ["Policy / procedure document", "Sample log / report"],
        },
        c18_continuity: {
          maturity: "Implemented across organization",
          notes: "The continuity plan sets a 4-hour RTO for the billing system, supported by daily backups to a geographically separate facility; the most recent restore test (2026-05-10) succeeded within RTO.",
          evidence: ["Policy / procedure document", "Runbook / SOP", "Sample log / report"],
        },
      }),
    },
  },

  // ── p09 — Harborcrest Media Network: ad-supported publisher, one gap
  // (awareness), no auditor engaged, § 7120 A1 indeterminate (revenue-share unsure). ──
  {
    id: "cppa-cyber-p09-media-a1-unsure",
    tool: "cppa-cyber",
    label: "Ad-supported digital media publisher — one awareness-program gap, no auditor yet engaged, § 7120 revenue-share unresolved",
    company: "Harborcrest Media Network, Inc.",
    sector: "Digital media publishing and advertising",
    geo: "us",
    summary:
      "Harborcrest sells reader data to advertising partners but has not determined what share of its revenue that generates, leaving the § 7120(b)(1) revenue-share prong indeterminate on this record even though a sale is confirmed; no auditor has yet been engaged. Seventeen of eighteen components are fully implemented; only cybersecurity awareness training remains partially rolled out. Five incidents in the trailing year required both consumer and agency notification.",
    intake: {
      profile: {
        entity_name: "Harborcrest Media Network, Inc.",
        industry: "Digital media publishing and advertising",
        incidents_12mo: "More than 5",
        incident_notifications: "Both affected consumers and an agency were notified",
        framework: "Other",
        last_audit: "Over 24 months ago",
        in_scope_frameworks: ["Other"],
        audit_scope_rationale:
          "Harborcrest follows an internally-developed baseline drawn from several published frameworks rather than adopting one certification; the audit covers the publishing CMS, the reader-data platform, and the ad-exchange integration.",
        auditor_engagement_status: "No auditor engaged yet",
        prior_audit_scope: "No prior cybersecurity audit has been conducted; the 2024 review referenced in the framework baseline was an internal self-assessment, not an independent audit.",
        remediation_owner: "Director of Engineering, reporting to the CTO.",
        q1_revenue: "$25M to under $50M",
        q2_consumers: "100,000 to under 250,000",
        q5_sell_share: "Yes — sell only",
        q5c_share_revenue_50pct: "Unsure",
        q15_sensitive_pi: "No",
        password_auth_used: "Yes",
        q1_revenue_threshold_check: "Yes — above the threshold",
        q1_revenue_reference_year: "2025",
        consumer_notice_status: "Notice provided to affected consumers",
        agency_notice_status: "Notice provided to an agency",
      },
      controls: buildControls({
        c1_auth: {
          maturity: "Implemented across organization",
          notes: "Okta with mandatory MFA covers all 210 staff and the publishing CMS admin console; the Director of Engineering reviews the authenticator roster monthly.",
          evidence: ["Policy / procedure document", "Screenshot / config export"],
        },
        c2_encryption: {
          maturity: "Implemented across organization",
          notes: "Reader data is encrypted at rest with AES-256 under a managed KMS key and in transit with TLS 1.2 or higher across the CMS, reader-data platform, and ad-exchange integration.",
          evidence: ["Policy / procedure document", "Screenshot / config export"],
        },
        c3_account_access: {
          maturity: "Implemented across organization",
          notes: "Role-based access is reviewed quarterly; the 2026-Q2 recertification closed with 100% completion and zero orphaned accounts across the 210-person workforce.",
          evidence: ["Policy / procedure document", "Sample log / report"],
        },
        c4_inventory: {
          maturity: "Implemented across organization",
          notes: "A data inventory tracks the reader-data platform and every downstream ad-exchange destination, reconciled quarterly against the platform's own export log.",
          evidence: ["Policy / procedure document", "Screenshot / config export"],
        },
        c5_secure_config: {
          maturity: "Implemented across organization",
          notes: "CIS baselines are enforced on the reader-data platform's cloud infrastructure through automated policy; the June 2026 compliance scan reported 95% conformance.",
          evidence: ["Policy / procedure document", "Screenshot / config export"],
        },
        c6_vuln_mgmt: {
          maturity: "Implemented across organization",
          notes: "Monthly authenticated scans and an annual third-party penetration test cover the CMS and reader-data platform; the 2026-05-15 test found one medium finding, remediated 2026-06-05.",
          evidence: ["Policy / procedure document", "Third-party pen test / scan report"],
        },
        c7_audit_logs: {
          maturity: "Implemented across organization",
          notes: "Access and data-export logs from the reader-data platform are centralized with 365-day retention, reviewed monthly by the security team.",
          evidence: ["Policy / procedure document", "Sample log / report"],
        },
        c8_network_mon: {
          maturity: "Implemented across organization",
          notes: "Cloud-native intrusion detection monitors the production network continuously, with alerts routed to the on-call engineer under a 30-minute acknowledgement target.",
          evidence: ["Runbook / SOP", "Screenshot / config export"],
        },
        c9_anti_malware: {
          maturity: "Implemented across organization",
          notes: "Endpoint protection is deployed on 100% of managed devices, reconciled monthly against the device inventory.",
          evidence: ["Policy / procedure document", "Screenshot / config export"],
        },
        c10_segmentation: {
          maturity: "Implemented across organization",
          notes: "The reader-data platform, CMS, and corporate network run in separate cloud accounts with default-deny network policies between them.",
          evidence: ["Policy / procedure document", "Screenshot / config export"],
        },
        c11_port_protocol: {
          maturity: "Implemented across organization",
          notes: "Security groups are default-deny with every open port logged and justified, reviewed quarterly by the Director of Engineering.",
          evidence: ["Policy / procedure document", "Screenshot / config export"],
        },
        c12_awareness: {
          maturity: "Documented, partially implemented",
          notes: "A written phishing-awareness policy requires quarterly simulations, and simulations run for the 140 editorial and engineering staff; the 70-person sales and ad-operations team has not yet been enrolled. Target: extend simulations to the sales and ad-operations team by 2026-12-31, owned by the Director of Engineering.",
          evidence: ["Policy / procedure document", "Sample log / report"],
        },
        c13_training: {
          maturity: "Implemented across organization",
          notes: "Annual security and data-handling training is mandatory for all staff, tracked with 100% completion for 2026 as of 2026-06-15.",
          evidence: ["Policy / procedure document", "Training completion record"],
        },
        c14_secure_dev: {
          maturity: "Implemented across organization",
          notes: "The reader-data platform's development team follows a secure-SDLC policy requiring peer review and dependency scanning in CI, enforced on every merge.",
          evidence: ["Policy / procedure document", "Screenshot / config export"],
        },
        c15_third_party: {
          maturity: "Implemented across organization",
          notes: "All 18 ad-exchange partners and data vendors are recorded in the vendor register with a signed data agreement and an annual security review, all current for 2026.",
          evidence: ["Policy / procedure document", "Screenshot / config export"],
        },
        c16_retention: {
          maturity: "Implemented across organization",
          notes: "Reader profile data is purged 24 months after last activity under an automated job; ad-exchange transaction logs follow a 13-month retention aligned to industry ad-measurement standards.",
          evidence: ["Policy / procedure document", "Sample log / report"],
        },
        c17_incident: {
          maturity: "Implemented across organization",
          notes: "Six incidents occurred in 2026, each a compromised ad-operations account used to redirect a small volume of ad-exchange traffic; all were contained within 48 hours, affected consumers were notified where reader data was implicated, and a state agency with jurisdiction over privacy laws was notified for the two largest incidents. The incident-response plan names the Director of Engineering as incident commander.",
          evidence: ["Policy / procedure document", "Sample log / report"],
        },
        c18_continuity: {
          maturity: "Implemented across organization",
          notes: "The continuity plan sets a 4-hour RTO for the publishing CMS, supported by multi-region hosting; the most recent failover exercise (2026-03-22) met RTO in 3 hours 40 minutes.",
          evidence: ["Policy / procedure document", "Runbook / SOP", "Sample log / report"],
        },
      }),
    },
  },

  // ── p10 — Sterling Wealth Advisors LLC: wealth management, near-perfect,
  // independence-confirmed external auditor, § 7120 via A2 SPI volume. ──────
  {
    id: "cppa-cyber-p10-wealth-advisory-spi-volume",
    tool: "cppa-cyber",
    label: "Registered investment advisor — near-complete posture, independence-confirmed external auditor, § 7120 via sensitive-PI volume",
    company: "Sterling Wealth Advisors LLC",
    sector: "Registered investment advisory services",
    geo: "us",
    summary:
      "Sterling runs a fully-implemented control program across all eighteen § 7123(c) components with testable evidence throughout, engages an external auditor whose independence is confirmed in writing, and meets the § 7120(b)(2) threshold through the sensitive-personal-information volume prong (financial account data for 50,000 or more clients) rather than the general consumer-count prong.",
    intake: {
      profile: {
        entity_name: "Sterling Wealth Advisors LLC",
        industry: "Registered investment advisory services",
        incidents_12mo: "None",
        framework: "NIST CSF",
        last_audit: "Within 12 months",
        in_scope_frameworks: ["NIST CSF"],
        audit_scope_rationale:
          "The audit covers the portfolio-management system, the client portal, and the CRM, the three systems that process client financial and personal information.",
        auditor_engagement_status: "External auditor engaged, independence confirmed in writing",
        prior_audit_scope:
          "The prior engagement was the 2025 NIST CSF-aligned assessment of the portfolio-management system; it did not test the CRM, which this audit covers directly.",
        remediation_owner: "Chief Compliance Officer, accountable to the Managing Partners for closing every tracked finding.",
        q1_revenue: "$25M to under $50M",
        q2_consumers: "Under 100,000",
        q5_sell_share: "No",
        q15_sensitive_pi: "Yes",
        q15c_spi_volume: "50,000 or more",
        password_auth_used: "Yes",
        q1_revenue_threshold_check: "No — at or below the threshold",
        q1_revenue_reference_year: "2025",
      },
      controls: buildControls({
        c1_auth: {
          maturity: "Implemented with continuous monitoring",
          notes: "Okta with mandatory hardware-key MFA covers all 95 advisory and operations staff, and the client portal enforces MFA for every client login; the IT Manager reviews the authenticator roster monthly.",
          evidence: ["Policy / procedure document", "Screenshot / config export"],
        },
        c2_encryption: {
          maturity: "Implemented with continuous monitoring",
          notes: "Client financial data is encrypted at rest with AES-256 under a dedicated KMS key and in transit with TLS 1.3 across the portfolio-management system, portal, and CRM.",
          evidence: ["Policy / procedure document", "Screenshot / config export"],
        },
        c3_account_access: {
          maturity: "Implemented across organization",
          notes: "Role-based access is reviewed quarterly; the 2026-Q2 recertification closed with 100% completion and zero orphaned accounts across the 95-person workforce.",
          evidence: ["Policy / procedure document", "Sample log / report"],
        },
        c4_inventory: {
          maturity: "Implemented across organization",
          notes: "A data inventory tracks the three in-scope systems and their client-data categories, reconciled quarterly against each system's own record export.",
          evidence: ["Policy / procedure document", "Screenshot / config export"],
        },
        c5_secure_config: {
          maturity: "Implemented across organization",
          notes: "CIS baselines are enforced across the portfolio-management infrastructure; the June 2026 compliance scan reported 97% conformance.",
          evidence: ["Policy / procedure document", "Screenshot / config export"],
        },
        c6_vuln_mgmt: {
          maturity: "Implemented across organization",
          notes: "Monthly authenticated scans and an annual third-party penetration test cover all three in-scope systems; the 2026-05-01 test found zero critical or high findings.",
          evidence: ["Policy / procedure document", "Third-party pen test / scan report"],
        },
        c7_audit_logs: {
          maturity: "Implemented across organization",
          notes: "Access and trade-instruction logs are centralized with 400-day retention, reviewed monthly by the Chief Compliance Officer for anomalous activity.",
          evidence: ["Policy / procedure document", "Sample log / report"],
        },
        c8_network_mon: {
          maturity: "Implemented across organization",
          notes: "A managed detection provider monitors the production network continuously under a 30-minute acknowledgement target.",
          evidence: ["Runbook / SOP", "Screenshot / config export"],
        },
        c9_anti_malware: {
          maturity: "Implemented across organization",
          notes: "Endpoint protection is deployed on 100% of managed devices, reconciled monthly against the asset inventory.",
          evidence: ["Policy / procedure document", "Screenshot / config export"],
        },
        c10_segmentation: {
          maturity: "Implemented across organization",
          notes: "The portfolio-management system, client portal, and corporate network run in separate network zones with default-deny rules between them.",
          evidence: ["Policy / procedure document", "Screenshot / config export"],
        },
        c11_port_protocol: {
          maturity: "Implemented across organization",
          notes: "Firewall rules are default-deny with every open port logged and justified, reviewed quarterly by the IT Manager.",
          evidence: ["Policy / procedure document", "Screenshot / config export"],
        },
        c12_awareness: {
          maturity: "Implemented across organization",
          notes: "Quarterly phishing simulations run across all staff (2026-Q2 click rate 1.9%), with immediate micro-training for anyone who clicks.",
          evidence: ["Training completion record", "Sample log / report"],
        },
        c13_training: {
          maturity: "Implemented across organization",
          notes: "Annual security and privacy training is mandatory for all staff, tracked with 100% completion for 2026 as of 2026-05-15.",
          evidence: ["Policy / procedure document", "Training completion record"],
        },
        c14_secure_dev: {
          maturity: "Implemented across organization",
          notes: "The client-portal development team follows a secure-SDLC policy requiring peer review and dependency scanning in CI, enforced on every merge.",
          evidence: ["Policy / procedure document", "Screenshot / config export"],
        },
        c15_third_party: {
          maturity: "Implemented across organization",
          notes: "The portfolio-management and CRM vendors are both tier-1 in the vendor register with an annual SOC 2 review on file, both current for 2026.",
          evidence: ["Policy / procedure document", "SOC 2 or auditor letter"],
        },
        c16_retention: {
          maturity: "Implemented across organization",
          notes: "Client records follow the SEC/FINRA 6-year retention schedule for investment-adviser recordkeeping, with disposition tracked in the CRM.",
          evidence: ["Policy / procedure document", "Sample log / report"],
        },
        c17_incident: {
          maturity: "Implemented across organization",
          notes: "The incident-response plan names the Chief Compliance Officer as incident commander with a 24-hour acknowledgement target; no incidents occurred in the trailing twelve months.",
          evidence: ["Policy / procedure document", "Runbook / SOP", "Sample log / report"],
        },
        c18_continuity: {
          maturity: "Implemented across organization",
          notes: "The continuity plan sets a 4-hour RTO for the portfolio-management system, supported by daily backups to a geographically separate facility; the most recent restore test (2026-05-25) succeeded within RTO.",
          evidence: ["Policy / procedure document", "Runbook / SOP", "Sample log / report"],
        },
      }),
    },
  },

  // ── p11 — Northfield EdTech Systems, Inc.: small ed-tech vendor, one gap
  // (anti-malware), independence-weak internal auditor, § 7120 not met. ─────
  {
    id: "cppa-cyber-p11-edtech-not-met",
    tool: "cppa-cyber",
    label: "Small classroom ed-tech vendor — one anti-malware coverage gap, § 7120 threshold not met",
    company: "Northfield EdTech Systems, Inc.",
    sector: "K-12 classroom software",
    geo: "us",
    summary:
      "Northfield's reported revenue and consumer-processing volume fall under both § 7120(b) triggers, so the audit-applicability table resolves to 'not required on current facts'. Seventeen of eighteen components are fully implemented; only endpoint anti-malware coverage remains informal on a small set of contractor-owned devices. Its internal auditor reports to an executive with no cybersecurity-program responsibility. One incident required no notification.",
    intake: {
      profile: {
        entity_name: "Northfield EdTech Systems, Inc.",
        industry: "K-12 classroom software",
        incidents_12mo: "1",
        incident_notifications: "No notification was required",
        framework: "ISO 27001",
        last_audit: "Within 12 months",
        in_scope_frameworks: ["ISO 27001"],
        audit_scope_rationale:
          "The audit covers the classroom application, the teacher-administration portal, and the student-roster sync service, the three systems that process student and teacher personal information.",
        auditor_engagement_status: "Internal auditor engaged, reports to an executive without cybersecurity-program responsibility",
        prior_audit_scope:
          "The prior engagement was the 2025 ISO 27001 certification audit of the classroom application; it did not test the student-roster sync service, which this audit covers directly.",
        remediation_owner: "Founder and Head of Engineering.",
        q1_revenue: "Under $25M",
        q2_consumers: "Under 100,000",
        q5_sell_share: "No",
        q15_sensitive_pi: "No",
        password_auth_used: "No",
        consumer_notice_status: "No notice was required",
        agency_notice_status: "No notice was required",
      },
      controls: buildControls({
        c1_auth: {
          maturity: "Implemented across organization",
          notes: "Google Workspace SSO with mandatory MFA covers all 22 staff; password authentication is disabled for administrative accounts. The Head of Engineering reviews the roster quarterly.",
          evidence: ["Policy / procedure document", "Screenshot / config export"],
        },
        c2_encryption: {
          maturity: "Implemented across organization",
          notes: "Student and teacher data is encrypted at rest with AES-256 under a managed cloud KMS key and in transit with TLS 1.2 or higher across all three systems.",
          evidence: ["Policy / procedure document", "Screenshot / config export"],
        },
        c3_account_access: {
          maturity: "Implemented across organization",
          notes: "Admin accounts are provisioned and removed through a documented checklist, reviewed quarterly with 100% completion for 2026-Q2 and zero orphaned accounts.",
          evidence: ["Policy / procedure document", "Screenshot / config export"],
        },
        c4_inventory: {
          maturity: "Implemented across organization",
          notes: "A data inventory lists the three systems and the student/teacher data categories each holds, reconciled quarterly against each platform's own schema.",
          evidence: ["Policy / procedure document", "Screenshot / config export"],
        },
        c5_secure_config: {
          maturity: "Implemented across organization",
          notes: "CIS baselines are enforced on the cloud infrastructure through managed policy; the June 2026 compliance scan reported 96% conformance.",
          evidence: ["Policy / procedure document", "Screenshot / config export"],
        },
        c6_vuln_mgmt: {
          maturity: "Implemented across organization",
          notes: "Monthly authenticated scans and an annual third-party penetration test cover all three systems; the 2026-05-10 test found one low-severity finding, remediated 2026-05-24.",
          evidence: ["Policy / procedure document", "Third-party pen test / scan report"],
        },
        c7_audit_logs: {
          maturity: "Implemented across organization",
          notes: "Access and admin-action logs are centralized with 365-day retention, reviewed monthly by the Head of Engineering.",
          evidence: ["Policy / procedure document", "Sample log / report"],
        },
        c8_network_mon: {
          maturity: "Implemented across organization",
          notes: "Cloud-native intrusion detection monitors the production environment continuously, with alerts routed to the Head of Engineering.",
          evidence: ["Runbook / SOP", "Screenshot / config export"],
        },
        c9_anti_malware: {
          maturity: "Ad hoc / informal",
          notes: "Company-issued laptops (14 of 22) run managed endpoint protection with centralized reporting; the remaining 8 staff use contractor-owned devices with no centrally verified anti-malware coverage. Target: require managed endpoint protection on all contractor devices accessing company systems by 2026-12-01, owned by the Head of Engineering.",
          evidence: ["Screenshot / config export"],
        },
        c10_segmentation: {
          maturity: "Implemented across organization",
          notes: "The classroom application, teacher portal, and roster-sync service run in separate cloud projects with default-deny network policies between them.",
          evidence: ["Policy / procedure document", "Screenshot / config export"],
        },
        c11_port_protocol: {
          maturity: "Implemented across organization",
          notes: "Security groups are default-deny with every open port logged and justified, reviewed quarterly by the Head of Engineering.",
          evidence: ["Policy / procedure document", "Screenshot / config export"],
        },
        c12_awareness: {
          maturity: "Implemented across organization",
          notes: "Quarterly phishing-awareness emails go to all staff (2026-Q2 click rate 2.3%), tracked by the Head of Engineering.",
          evidence: ["Sample log / report"],
        },
        c13_training: {
          maturity: "Implemented across organization",
          notes: "Annual data-privacy and security training is mandatory for all staff, tracked with 100% completion for 2026 as of 2026-05-01.",
          evidence: ["Policy / procedure document", "Training completion record"],
        },
        c14_secure_dev: {
          maturity: "Implemented across organization",
          notes: "The engineering team follows a secure-SDLC policy requiring peer review and dependency scanning in CI, enforced on every merge to the production branch.",
          evidence: ["Policy / procedure document", "Screenshot / config export"],
        },
        c15_third_party: {
          maturity: "Implemented across organization",
          notes: "The cloud-hosting vendor and the roster-sync integration partner are both recorded in the vendor register with a signed data-processing agreement and an annual security review, both current for 2026.",
          evidence: ["Policy / procedure document", "Screenshot / config export"],
        },
        c16_retention: {
          maturity: "Implemented across organization",
          notes: "Student data is purged within 90 days of a school district's contract termination under a documented offboarding process; active-contract data follows the district's own retention terms.",
          evidence: ["Policy / procedure document", "Sample log / report"],
        },
        c17_incident: {
          maturity: "Implemented across organization",
          notes: "One incident occurred in 2026-03 — a contractor's unmanaged laptop was infected with adware that attempted to access the teacher portal; access was blocked automatically and no student or teacher data was exposed, so no notification was required. The incident-response plan names the Head of Engineering as incident commander.",
          evidence: ["Policy / procedure document", "Sample log / report"],
        },
        c18_continuity: {
          maturity: "Implemented across organization",
          notes: "The continuity plan sets a 4-hour RTO for the classroom application, supported by automated daily backups to a separate cloud region; the most recent restore test (2026-05-18) succeeded within RTO.",
          evidence: ["Policy / procedure document", "Runbook / SOP", "Sample log / report"],
        },
      }),
    },
  },

  // ── p12 — Vantage Aerospace Components Corp: manufacturing, near-perfect,
  // independence-confirmed external auditor, § 7120 via A2 consumer volume. ──
  {
    id: "cppa-cyber-p12-aerospace-consumer-volume",
    tool: "cppa-cyber",
    label: "Aerospace components manufacturer — near-complete posture, independence-confirmed external auditor, § 7120 via consumer volume",
    company: "Vantage Aerospace Components Corp.",
    sector: "Aerospace components manufacturing",
    geo: "us",
    summary:
      "Vantage runs a fully-implemented control program across all eighteen § 7123(c) components with testable evidence throughout, engages an external auditor whose independence is confirmed in writing, and meets the § 7120(b)(2) threshold through its consumer-support-contact processing volume rather than a data-sale revenue share.",
    intake: {
      profile: {
        entity_name: "Vantage Aerospace Components Corp.",
        industry: "Aerospace components manufacturing",
        incidents_12mo: "None",
        framework: "HITRUST",
        last_audit: "Within 12 months",
        in_scope_frameworks: ["HITRUST"],
        audit_scope_rationale:
          "The audit covers the customer-support portal, the warranty-registration system, and the corporate identity estate, the three systems that process California consumer personal information.",
        auditor_engagement_status: "External auditor engaged, independence confirmed in writing",
        prior_audit_scope:
          "The prior engagement was the 2025 HITRUST CSF validated assessment of the customer-support portal; it did not test the warranty-registration system, which this audit covers directly.",
        remediation_owner: "Director of Information Security, reporting to the CIO.",
        q1_revenue: "Over $100M",
        q2_consumers: "250,000 to under 1,000,000",
        q5_sell_share: "No",
        q15_sensitive_pi: "No",
        password_auth_used: "No",
      },
      controls: buildControls({
        c1_auth: {
          maturity: "Implemented with continuous monitoring",
          notes: "Azure AD with FIDO2 hardware-key MFA covers all 1,050 staff with system access; password authentication is disabled at the directory. The Director of Information Security reviews the roster monthly.",
          evidence: ["Policy / procedure document", "Screenshot / config export"],
        },
        c2_encryption: {
          maturity: "Implemented with continuous monitoring",
          notes: "Customer and warranty data is encrypted at rest with AES-256 under Azure Key Vault-managed keys and in transit with TLS 1.3 across all three in-scope systems.",
          evidence: ["Policy / procedure document", "Screenshot / config export"],
        },
        c3_account_access: {
          maturity: "Implemented across organization",
          notes: "Role-based access is reviewed quarterly; the 2026-Q2 recertification closed with 100% completion and zero orphaned accounts.",
          evidence: ["Policy / procedure document", "Sample log / report"],
        },
        c4_inventory: {
          maturity: "Implemented across organization",
          notes: "A data inventory tracks the three in-scope systems and their consumer-data categories, reconciled quarterly against each system's own schema registry.",
          evidence: ["Policy / procedure document", "Screenshot / config export"],
        },
        c5_secure_config: {
          maturity: "Implemented across organization",
          notes: "CIS baselines are enforced across the support-portal and warranty-system infrastructure through Azure Policy; the June 2026 compliance scan reported 97% conformance.",
          evidence: ["Policy / procedure document", "Screenshot / config export"],
        },
        c6_vuln_mgmt: {
          maturity: "Implemented across organization",
          notes: "Monthly authenticated scans and an annual third-party penetration test cover all three in-scope systems; the 2026-04-25 test found zero critical or high findings.",
          evidence: ["Policy / procedure document", "Third-party pen test / scan report"],
        },
        c7_audit_logs: {
          maturity: "Implemented across organization",
          notes: "Access and admin-action logs are centralized in Azure Monitor with 400-day retention, reviewed monthly by the security team.",
          evidence: ["Policy / procedure document", "Sample log / report"],
        },
        c8_network_mon: {
          maturity: "Implemented across organization",
          notes: "Microsoft Defender for Cloud monitors all in-scope subnets continuously, with alerts routed to the on-call engineer under a 30-minute acknowledgement target.",
          evidence: ["Runbook / SOP", "Screenshot / config export"],
        },
        c9_anti_malware: {
          maturity: "Implemented across organization",
          notes: "Endpoint protection is deployed on 100% of managed devices, reconciled monthly against the asset inventory.",
          evidence: ["Policy / procedure document", "Screenshot / config export"],
        },
        c10_segmentation: {
          maturity: "Implemented across organization",
          notes: "The customer-support portal, warranty-registration system, and manufacturing-operations network run in separate network zones with default-deny rules between them.",
          evidence: ["Policy / procedure document", "Screenshot / config export"],
        },
        c11_port_protocol: {
          maturity: "Implemented across organization",
          notes: "Firewall rules are default-deny with every open port logged and justified, reviewed quarterly by the Director of Information Security.",
          evidence: ["Policy / procedure document", "Screenshot / config export"],
        },
        c12_awareness: {
          maturity: "Implemented across organization",
          notes: "Quarterly phishing simulations run across all staff (2026-Q2 click rate 2.2%), with immediate micro-training for anyone who clicks.",
          evidence: ["Training completion record", "Sample log / report"],
        },
        c13_training: {
          maturity: "Implemented across organization",
          notes: "Annual security training is mandatory for all staff, tracked with 100% completion for 2026 as of 2026-05-20.",
          evidence: ["Policy / procedure document", "Training completion record"],
        },
        c14_secure_dev: {
          maturity: "Implemented across organization",
          notes: "The customer-support portal's development team follows a secure-SDLC policy requiring peer review and dependency scanning in CI, enforced on every merge.",
          evidence: ["Policy / procedure document", "Screenshot / config export"],
        },
        c15_third_party: {
          maturity: "Implemented across organization",
          notes: "The support-portal and warranty-system vendors are both tier-1 in the vendor register with an annual SOC 2 review on file, both current for 2026.",
          evidence: ["Policy / procedure document", "SOC 2 or auditor letter"],
        },
        c16_retention: {
          maturity: "Implemented across organization",
          notes: "Customer support and warranty records follow a 7-year retention tied to product-liability recordkeeping obligations, with automated archival tracked in the warranty-registration system.",
          evidence: ["Policy / procedure document", "Sample log / report"],
        },
        c17_incident: {
          maturity: "Implemented across organization",
          notes: "The incident-response plan names the Director of Information Security as incident commander with a 24-hour acknowledgement target; no incidents occurred in the trailing twelve months.",
          evidence: ["Policy / procedure document", "Runbook / SOP", "Sample log / report"],
        },
        c18_continuity: {
          maturity: "Implemented across organization",
          notes: "The continuity plan sets a 4-hour RTO for the customer-support portal, supported by multi-region active-passive infrastructure; the most recent failover exercise (2026-04-30) met RTO in 3 hours 25 minutes.",
          evidence: ["Policy / procedure document", "Runbook / SOP", "Sample log / report"],
        },
      }),
    },
  },

  // ── p13 — Driftwood Coastal Realty Group: real estate brokerage, one NA
  // (no in-house dev), § 7120 not met, weak-independence internal auditor. ──
  {
    id: "cppa-cyber-p13-realty-not-applicable",
    tool: "cppa-cyber",
    label: "Coastal real estate brokerage — no in-house development (component not applicable), § 7120 threshold not met",
    company: "Driftwood Coastal Realty Group",
    sector: "Residential real estate brokerage",
    geo: "us",
    summary:
      "Driftwood's reported revenue and consumer-processing volume fall under both § 7120(b) triggers, so the audit-applicability table resolves to 'not required on current facts'. Every system it uses is licensed, unmodified SaaS, so secure development and coding practices are reported not applicable with a stated basis; the other seventeen components are fully implemented. Its internal auditor has a reporting line not yet settled.",
    intake: {
      profile: {
        entity_name: "Driftwood Coastal Realty Group",
        industry: "Residential real estate brokerage",
        incidents_12mo: "None",
        framework: "None / informal",
        last_audit: "Never",
        in_scope_frameworks: ["None / informal"],
        audit_scope_rationale:
          "Driftwood has not adopted a formal framework; this self-assessment covers the listing-management platform, the client CRM, and the e-signature/document-management system, the three systems that hold client personal information.",
        auditor_engagement_status: "Internal auditor identified, reporting line not yet settled",
        prior_audit_scope: "No prior cybersecurity audit or assessment has been conducted; this self-assessment is Driftwood's first review of its information security practices.",
        remediation_owner: "Office Manager (dual-hatted with brokerage compliance duties).",
        q1_revenue: "Under $25M",
        q2_consumers: "Under 100,000",
        q5_sell_share: "No",
        q15_sensitive_pi: "No",
        password_auth_used: "Yes",
      },
      controls: buildControls({
        c1_auth: {
          maturity: "Implemented across organization",
          notes: "Google Workspace SSO with mandatory MFA covers all 31 agents and staff; the Office Manager reviews the roster quarterly.",
          evidence: ["Policy / procedure document", "Screenshot / config export"],
        },
        c2_encryption: {
          maturity: "Implemented across organization",
          notes: "The listing-management platform, CRM, and e-signature system each encrypt client data at rest and in transit as part of their managed hosting; each vendor's encryption commitment is confirmed in its published security summary.",
          evidence: ["Screenshot / config export"],
        },
        c3_account_access: {
          maturity: "Implemented across organization",
          notes: "Agent accounts are provisioned and removed by the Office Manager within one business day of onboarding or departure, per a written checklist adopted in 2026-01; a quarterly roster review confirms no lingering access for departed agents.",
          evidence: ["Policy / procedure document", "Screenshot / config export"],
        },
        c4_inventory: {
          maturity: "Implemented across organization",
          notes: "A data inventory lists the three systems that hold client personal information and their approximate record counts, reconciled quarterly against each platform's own export.",
          evidence: ["Policy / procedure document", "Screenshot / config export"],
        },
        c5_secure_config: {
          maturity: "Implemented across organization",
          notes: "Each of the three SaaS platforms is configured to its vendor's published security-hardening recommendations, confirmed at onboarding and re-checked at each annual contract renewal.",
          evidence: ["Screenshot / config export"],
        },
        c6_vuln_mgmt: {
          maturity: "Implemented across organization",
          notes: "Driftwood relies on each SaaS vendor's own vulnerability-management program, confirmed through the vendor's annual SOC 2 report; all three vendors' 2026 reports are on file with no material findings affecting Driftwood's environment.",
          evidence: ["SOC 2 or auditor letter"],
        },
        c7_audit_logs: {
          maturity: "Implemented across organization",
          notes: "Each SaaS platform's native access and admin-action logs are retained under its standard plan for at least 12 months; the Office Manager exports a quarterly summary for the compliance file.",
          evidence: ["Policy / procedure document", "Sample log / report"],
        },
        c8_network_mon: {
          maturity: "Implemented across organization",
          notes: "Each SaaS vendor monitors its own hosting environment under its standard plan; the small office network's router runs the manufacturer's intrusion-detection feature, reviewed by the Office Manager monthly.",
          evidence: ["Screenshot / config export"],
        },
        c9_anti_malware: {
          maturity: "Implemented across organization",
          notes: "All 12 company-issued laptops run Microsoft Defender with cloud-delivered protection enabled by default policy, verified at each annual laptop refresh.",
          evidence: ["Screenshot / config export"],
        },
        c10_segmentation: {
          maturity: "Implemented across organization",
          notes: "Driftwood's own network footprint is a single small-office LAN; the router's guest-network feature keeps visitor Wi-Fi isolated from the office workstations that access client data.",
          evidence: ["Policy / procedure document", "Screenshot / config export"],
        },
        c11_port_protocol: {
          maturity: "Implemented across organization",
          notes: "The office router is configured deny-by-default with only the ports required for office and guest Wi-Fi open, confirmed at installation and reviewed at each annual ISP renewal.",
          evidence: ["Screenshot / config export"],
        },
        c12_awareness: {
          maturity: "Implemented across organization",
          notes: "The Office Manager sends a phishing-awareness email to all agents and staff each quarter using a fixed calendar reminder, with sent emails retained as the record.",
          evidence: ["Sample log / report"],
        },
        c13_training: {
          maturity: "Implemented across organization",
          notes: "Every new agent receives a security and client-data-handling orientation during onboarding, acknowledged with a signed form kept in the personnel file; 100% of the current 31-person roster has a signed form on file as of 2026-06-01.",
          evidence: ["Training completion record"],
        },
        c14_secure_dev: {
          maturity: "Not applicable to our information system",
          notes: "Driftwood licenses its listing-management platform, CRM, and e-signature system entirely from third-party SaaS vendors and performs no in-house software development.",
          evidence: ["None on file"],
          na_reason: "Driftwood has no in-house software development function; every system it uses is licensed, unmodified, third-party SaaS.",
        },
        c15_third_party: {
          maturity: "Implemented across organization",
          notes: "All three SaaS vendors are recorded in the vendor file with their signed data-processing terms and current SOC 2 or equivalent security summary, reviewed at each annual contract renewal.",
          evidence: ["Policy / procedure document", "SOC 2 or auditor letter"],
        },
        c16_retention: {
          maturity: "Implemented across organization",
          notes: "Transaction files are retained 5 years per state real-estate-license recordkeeping requirements; the Office Manager runs an annual deletion pass against expired records, logged in a spreadsheet.",
          evidence: ["Policy / procedure document", "Sample log / report"],
        },
        c17_incident: {
          maturity: "Implemented across organization",
          notes: "A one-page incident checklist names the Office Manager as the point of contact with a same-day containment target; no incidents occurred in the trailing twelve months.",
          evidence: ["Policy / procedure document", "Sample log / report"],
        },
        c18_continuity: {
          maturity: "Implemented across organization",
          notes: "Driftwood relies on its SaaS vendors' published uptime commitments, tracked against each vendor's status page; the Office Manager checks each vendor's quarterly uptime report as the continuity record.",
          evidence: ["Screenshot / config export"],
        },
      }),
    },
  },

  // ── p14 — Palisade Streaming Media, Inc.: video streaming, two same-tier
  // partial components, § 7120 via A1 50%+ revenue from viewing-data sales. ──
  {
    id: "cppa-cyber-p14-streaming-a1-revenue-share",
    tool: "cppa-cyber",
    label: "Ad-supported video streaming platform — two partially-implemented components, § 7120 met by revenue share from viewing-data sales",
    company: "Palisade Streaming Media, Inc.",
    sector: "Ad-supported video streaming",
    geo: "us",
    summary:
      "Palisade sells viewer engagement data to advertising data partners, and that activity generates more than half its annual revenue, independently satisfying § 7120(b)(1) regardless of subscriber count. Sixteen of eighteen components are fully implemented with testable evidence; network monitoring and retention/disposal are both documented in policy but only partially rolled out across the platform. Palisade engages an external auditor without the record separately confirming independence.",
    intake: {
      profile: {
        entity_name: "Palisade Streaming Media, Inc.",
        industry: "Ad-supported video streaming",
        incidents_12mo: "1",
        incident_notifications: "No notification was required",
        framework: "SOC 2",
        last_audit: "Within 12 months",
        in_scope_frameworks: ["SOC 2"],
        audit_scope_rationale:
          "The audit covers the streaming platform, the viewer-data analytics pipeline, and the ad-partner data-sharing integration, the three systems that process California viewer personal information.",
        auditor_engagement_status: "External auditor engaged",
        prior_audit_scope:
          "The prior engagement was the 2025 SOC 2 Type II examination of the streaming platform's security trust criteria; it did not test the viewer-data analytics pipeline, which this audit covers directly.",
        remediation_owner: "VP of Platform Engineering, reporting to the CTO.",
        q1_revenue: "$50M to $100M",
        q2_consumers: "250,000 to under 1,000,000",
        q5_sell_share: "Yes — sell only",
        q5c_share_revenue_50pct: "Yes",
        q15_sensitive_pi: "No",
        password_auth_used: "No",
        consumer_notice_status: "No notice was required",
        agency_notice_status: "No notice was required",
      },
      controls: buildControls({
        c1_auth: {
          maturity: "Implemented across organization",
          notes: "Okta with mandatory hardware-key MFA covers all 340 staff; password authentication is disabled for administrative accounts. The Security Manager reviews the roster monthly.",
          evidence: ["Policy / procedure document", "Screenshot / config export"],
        },
        c2_encryption: {
          maturity: "Implemented across organization",
          notes: "Viewer data is encrypted at rest with AES-256 under a managed KMS key and in transit with TLS 1.3 across the streaming platform, analytics pipeline, and ad-partner integration.",
          evidence: ["Policy / procedure document", "Screenshot / config export"],
        },
        c3_account_access: {
          maturity: "Implemented across organization",
          notes: "Role-based access is reviewed quarterly; the 2026-Q2 recertification closed with 100% completion and zero orphaned accounts across the 340-person workforce.",
          evidence: ["Policy / procedure document", "Sample log / report"],
        },
        c4_inventory: {
          maturity: "Implemented across organization",
          notes: "A data inventory tracks the three in-scope systems and every downstream ad-partner destination, reconciled quarterly against the analytics pipeline's own export log.",
          evidence: ["Policy / procedure document", "Screenshot / config export"],
        },
        c5_secure_config: {
          maturity: "Implemented across organization",
          notes: "CIS baselines are enforced on the streaming platform's cloud infrastructure through automated policy; the June 2026 compliance scan reported 96% conformance.",
          evidence: ["Policy / procedure document", "Screenshot / config export"],
        },
        c6_vuln_mgmt: {
          maturity: "Implemented across organization",
          notes: "Monthly authenticated scans and an annual third-party penetration test cover the streaming platform and analytics pipeline; the 2026-05-05 test found one medium finding, remediated 2026-05-28.",
          evidence: ["Policy / procedure document", "Third-party pen test / scan report"],
        },
        c7_audit_logs: {
          maturity: "Implemented across organization",
          notes: "Access and data-export logs from the analytics pipeline are centralized with 365-day retention, reviewed monthly by the security team.",
          evidence: ["Policy / procedure document", "Sample log / report"],
        },
        c8_network_mon: {
          maturity: "Documented, partially implemented",
          notes: "A network-monitoring policy requires continuous intrusion detection across all production environments; the streaming platform's primary cloud region is covered, but the ad-partner data-sharing integration, hosted in a separate cloud project, was onboarded in 2026-05 and has not yet been brought under the same monitoring coverage. Target: extend monitoring to the ad-partner integration project by 2026-11-15, owned by the VP of Platform Engineering.",
          evidence: ["Policy / procedure document", "Screenshot / config export"],
        },
        c9_anti_malware: {
          maturity: "Implemented across organization",
          notes: "Endpoint protection is deployed on 100% of managed devices, reconciled monthly against the asset inventory.",
          evidence: ["Policy / procedure document", "Screenshot / config export"],
        },
        c10_segmentation: {
          maturity: "Implemented across organization",
          notes: "The streaming platform, analytics pipeline, and corporate network run in separate cloud accounts with default-deny network policies between them.",
          evidence: ["Policy / procedure document", "Screenshot / config export"],
        },
        c11_port_protocol: {
          maturity: "Implemented across organization",
          notes: "Security groups are default-deny with every open port logged and justified, reviewed quarterly by the VP of Platform Engineering.",
          evidence: ["Policy / procedure document", "Screenshot / config export"],
        },
        c12_awareness: {
          maturity: "Implemented across organization",
          notes: "Quarterly phishing simulations run across all staff (2026-Q2 click rate 2.5%), with immediate micro-training for anyone who clicks.",
          evidence: ["Training completion record", "Sample log / report"],
        },
        c13_training: {
          maturity: "Implemented across organization",
          notes: "Annual security and data-handling training is mandatory for all staff, tracked with 100% completion for 2026 as of 2026-06-10.",
          evidence: ["Policy / procedure document", "Training completion record"],
        },
        c14_secure_dev: {
          maturity: "Implemented across organization",
          notes: "The platform-engineering team follows a secure-SDLC policy requiring peer review and dependency scanning in CI, enforced on every merge.",
          evidence: ["Policy / procedure document", "Screenshot / config export"],
        },
        c15_third_party: {
          maturity: "Implemented across organization",
          notes: "All 11 ad-data partners are recorded in the vendor register with a signed data-sale agreement and an annual security review, all current for 2026.",
          evidence: ["Policy / procedure document", "Screenshot / config export"],
        },
        c16_retention: {
          maturity: "Documented, partially implemented",
          notes: "A written retention policy sets viewer engagement data to purge 18 months after collection; the automated purge job covers the primary analytics database but has not yet been extended to a 2026-03 archival data-lake copy, which still holds records older than the policy allows. Target: extend the purge job to the archival data lake by 2026-12-15, owned by the VP of Platform Engineering.",
          evidence: ["Policy / procedure document", "Sample log / report"],
        },
        c17_incident: {
          maturity: "Implemented across organization",
          notes: "One incident occurred in 2026-04 — a misconfigured access-control rule briefly allowed an internal analytics team broader access to viewer records than authorized; no external exposure occurred and the misconfiguration was corrected within two hours, so no notification was required. The incident-response plan names the VP of Platform Engineering as incident commander.",
          evidence: ["Policy / procedure document", "Sample log / report"],
        },
        c18_continuity: {
          maturity: "Implemented across organization",
          notes: "The continuity plan sets a 2-hour RTO for the streaming platform, supported by multi-region active-active infrastructure; the most recent failover exercise (2026-04-14) met RTO in 1 hour 45 minutes.",
          evidence: ["Policy / procedure document", "Runbook / SOP", "Sample log / report"],
        },
      }),
    },
  },

  // ── p15 — Meridian Behavioral Wellness Group: outpatient mental health,
  // one gap (vuln mgmt), conflicted-reporting-line internal auditor. ────────
  {
    id: "cppa-cyber-p15-behavioral-health-conflicted-auditor",
    tool: "cppa-cyber",
    label: "Outpatient behavioral health group — no vulnerability-scanning program, internal auditor reporting to the executive owning cybersecurity",
    company: "Meridian Behavioral Wellness Group",
    sector: "Outpatient behavioral health services",
    geo: "us",
    summary:
      "Meridian's control program is fully implemented across seventeen of eighteen § 7123(c) components, but it has never run a vulnerability scan or penetration test of its patient-portal or scheduling systems. Its internal auditor reports to the same executive who owns the cybersecurity program, a genuine independence conflict the record states plainly. § 7120 applicability is met through the sensitive-personal-information volume prong given the clinical nature of the records processed; two of five incidents required consumer notification.",
    intake: {
      profile: {
        entity_name: "Meridian Behavioral Wellness Group",
        industry: "Outpatient behavioral health services",
        incidents_12mo: "2–5",
        incident_notifications: "Affected consumers were notified (Civ. Code § 1798.82(a))",
        framework: "HITRUST",
        last_audit: "12–24 months ago",
        in_scope_frameworks: ["HITRUST"],
        audit_scope_rationale:
          "The audit covers the patient portal, the scheduling and billing system, and the clinician charting platform, the three systems that process patient personal and clinical information.",
        auditor_engagement_status: "Internal auditor engaged, reports to the executive responsible for the cybersecurity program",
        prior_audit_scope:
          "The prior engagement was the 2024 HITRUST CSF readiness assessment of the clinician charting platform; it did not test the patient portal or scheduling system, which this audit covers directly.",
        remediation_owner: "Practice Operations Director, who also owns the cybersecurity program budget.",
        q1_revenue: "$25M to under $50M",
        q2_consumers: "Under 100,000",
        q5_sell_share: "No",
        q15_sensitive_pi: "Yes",
        q15c_spi_volume: "50,000 or more",
        password_auth_used: "Yes",
        q1_revenue_threshold_check: "Yes — above the threshold",
        q1_revenue_reference_year: "2025",
        consumer_notice_status: "Notice provided to affected consumers",
        agency_notice_status: "No notice was required",
      },
      controls: buildControls({
        c1_auth: {
          maturity: "Implemented across organization",
          notes: "Microsoft Entra ID with mandatory MFA covers all 210 clinical and administrative staff; the Practice Operations Director reviews the roster quarterly.",
          evidence: ["Policy / procedure document", "Screenshot / config export"],
        },
        c2_encryption: {
          maturity: "Implemented across organization",
          notes: "Patient and clinical data is encrypted at rest with AES-256 and in transit with TLS 1.2 or higher across the patient portal, scheduling system, and charting platform.",
          evidence: ["Policy / procedure document", "Screenshot / config export"],
        },
        c3_account_access: {
          maturity: "Implemented across organization",
          notes: "Role-based access with clinician-specific record scoping is reviewed quarterly; the 2026-Q2 recertification closed with 100% completion and zero orphaned accounts.",
          evidence: ["Policy / procedure document", "Sample log / report"],
        },
        c4_inventory: {
          maturity: "Implemented across organization",
          notes: "A data inventory tracks the three in-scope systems and their patient-data categories, reconciled quarterly against each system's own schema registry.",
          evidence: ["Policy / procedure document", "Screenshot / config export"],
        },
        c5_secure_config: {
          maturity: "Implemented across organization",
          notes: "CIS baselines are enforced on the patient-portal and scheduling infrastructure; the June 2026 compliance scan reported 95% conformance.",
          evidence: ["Policy / procedure document", "Screenshot / config export"],
        },
        c6_vuln_mgmt: {
          maturity: "Not implemented",
          notes: "No vulnerability scanning or penetration testing program has ever been run against the patient portal, scheduling system, or charting platform. Target: commission a first external scan and penetration test of all three systems by 2026-12-31, owned by the Practice Operations Director.",
          evidence: ["None on file"],
        },
        c7_audit_logs: {
          maturity: "Implemented across organization",
          notes: "Access and chart-view logs are centralized with 400-day retention, reviewed monthly for anomalous bulk chart access by the Practice Operations Director.",
          evidence: ["Policy / procedure document", "Sample log / report"],
        },
        c8_network_mon: {
          maturity: "Implemented across organization",
          notes: "A managed detection provider monitors the production network continuously under a 30-minute acknowledgement target.",
          evidence: ["Runbook / SOP", "Screenshot / config export"],
        },
        c9_anti_malware: {
          maturity: "Implemented across organization",
          notes: "Endpoint protection is deployed on 100% of managed devices, reconciled monthly against the asset inventory.",
          evidence: ["Policy / procedure document", "Screenshot / config export"],
        },
        c10_segmentation: {
          maturity: "Implemented across organization",
          notes: "The patient portal, scheduling system, and corporate network run in separate network zones with default-deny rules between them.",
          evidence: ["Policy / procedure document", "Screenshot / config export"],
        },
        c11_port_protocol: {
          maturity: "Implemented across organization",
          notes: "Firewall rules are default-deny with every open port logged and justified, reviewed quarterly by the Practice Operations Director.",
          evidence: ["Policy / procedure document", "Screenshot / config export"],
        },
        c12_awareness: {
          maturity: "Implemented across organization",
          notes: "Quarterly phishing simulations run across all staff (2026-Q2 click rate 2.8%), with immediate micro-training for anyone who clicks.",
          evidence: ["Training completion record", "Sample log / report"],
        },
        c13_training: {
          maturity: "Implemented across organization",
          notes: "Annual HIPAA-aligned privacy and security training is mandatory for all staff, tracked with 100% completion for 2026 as of 2026-06-01.",
          evidence: ["Policy / procedure document", "Training completion record"],
        },
        c14_secure_dev: {
          maturity: "Implemented across organization",
          notes: "The patient-portal development team follows a secure-SDLC policy requiring peer review and dependency scanning in CI, enforced on every merge.",
          evidence: ["Policy / procedure document", "Screenshot / config export"],
        },
        c15_third_party: {
          maturity: "Implemented across organization",
          notes: "The scheduling-system and charting-platform vendors are both tier-1 in the vendor register with an annual HITRUST or SOC 2 review on file, both current for 2026.",
          evidence: ["Policy / procedure document", "SOC 2 or auditor letter"],
        },
        c16_retention: {
          maturity: "Implemented across organization",
          notes: "Patient records follow the state-mandated 7-year clinical recordkeeping schedule, with disposition tracked in the charting platform.",
          evidence: ["Policy / procedure document", "Sample log / report"],
        },
        c17_incident: {
          maturity: "Implemented across organization",
          notes: "Three of five 2026 incidents involved staff misdirecting a scheduling confirmation to the wrong patient email; two exposed appointment-type information that Civ. Code § 1798.82(a) treats as requiring notification, and affected patients were notified within the required window. The incident-response plan names the Practice Operations Director as incident commander.",
          evidence: ["Policy / procedure document", "Sample log / report"],
        },
        c18_continuity: {
          maturity: "Implemented across organization",
          notes: "The continuity plan sets a 4-hour RTO for the patient portal and scheduling system, supported by daily backups to a geographically separate facility; the most recent restore test (2026-05-12) succeeded within RTO.",
          evidence: ["Policy / procedure document", "Runbook / SOP", "Sample log / report"],
        },
      }),
    },
  },
];
