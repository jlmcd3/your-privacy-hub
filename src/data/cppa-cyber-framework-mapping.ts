// Sprint 1 #7 — NIST CSF 2.0 / ISO 27001:2022 / SOC 2 → CPPA Cybersecurity control mapping.
// Source: 11 CCR § 7123(c)(1)–(18) enumerated cybersecurity program components
// (OAL approved September 22, 2025; effective January 1, 2026), cross-walked to the
// most directly equivalent control identifier in each framework.
// Note: "Zero-trust architecture" appeared in earlier drafts but was deleted from the
// final regulations. "Port and protocol management and protection" was added at (c)(11);
// awareness (c)(12) and education/training (c)(13) are distinct components; physical access
// is folded into "Account management and access controls" (c)(3). The 18 components retain
// their final § 7123(c) numbered positions. Framework control IDs are best-effort equivalences
// for guidance only — holding a NIST/ISO/SOC 2 certification does NOT, on its own, satisfy the
// CPPA audit (the FSOR is explicit on this), which is what `cppa_specific_evidence` captures.

export type FrameworkMappingRow = {
  index: number; // 1–18 matching § 7123(c)(N) of the final regulations
  cppa_component: string;
  nist_csf: string;
  iso_27001: string;
  soc2: string;
  cppa_specific_evidence: string;
};

export const CPPA_CYBER_FRAMEWORK_MAPPING: FrameworkMappingRow[] = [
  {
    index: 1,
    cppa_component: "Authentication",
    nist_csf: "PR.AA-01, PR.AA-03",
    iso_27001: "A.5.15, A.5.17, A.8.5",
    soc2: "CC6.1, CC6.6",
    cppa_specific_evidence: "Evidence that MFA (phishing-resistant where used) and password standards are enforced specifically for accounts that can access California consumer PI and for remote/privileged access; CPPA expects component-level attestation, not an org-wide statement.",
  },
  {
    index: 2,
    cppa_component: "Encryption of personal information",
    nist_csf: "PR.DS-01, PR.DS-02",
    iso_27001: "A.8.24",
    soc2: "CC6.7",
    cppa_specific_evidence: "Encryption scope must be tied to the PI inventory used for CCPA disclosures; key-management evidence must cover California consumer datasets at rest and in transit, not just a production-tier classification.",
  },
  {
    index: 3,
    cppa_component: "Account management and access controls",
    nist_csf: "PR.AA-01, PR.AA-05",
    iso_27001: "A.5.15, A.5.16, A.5.18, A.8.2, A.8.3",
    soc2: "CC6.1, CC6.2, CC6.3",
    cppa_specific_evidence: "Least-privilege, privileged-account limits, account lifecycle (provisioning/deprovisioning), periodic access reviews, AND physical-access restrictions to systems holding PI — the final rule folds physical access into this component, so evidence must cover it.",
  },
  {
    index: 4,
    cppa_component: "Inventory and management of personal information and systems",
    nist_csf: "ID.AM-01, ID.AM-02, ID.AM-08",
    iso_27001: "A.5.9, A.8.1",
    soc2: "CC3.2, CC6.1",
    cppa_specific_evidence: "Inventory must map PI, data flows, hardware and software — explicitly including cloud and third-party systems the business does not own or operate. This is broader than a typical asset register; evidence must show the maintenance cadence.",
  },
  {
    index: 5,
    cppa_component: "Secure configuration of hardware and software",
    nist_csf: "PR.PS-01",
    iso_27001: "A.8.9",
    soc2: "CC6.6, CC6.8, CC7.1",
    cppa_specific_evidence: "Hardening baselines, patch and change management, and masking — on-prem and cloud. Evidence must show drift detection/remediation for systems that process California consumer PI.",
  },
  {
    index: 6,
    cppa_component: "Vulnerability scanning and penetration testing",
    nist_csf: "ID.RA-01, DE.CM-08",
    iso_27001: "A.8.8",
    soc2: "CC7.1",
    cppa_specific_evidence: "Internal/external scans, penetration testing, AND a vulnerability disclosure/reporting process (e.g. bug bounty / ethical hacking) — the disclosure element is explicit in (c)(6). Evidence must show scope, frequency, and remediation-to-closure.",
  },
  {
    index: 7,
    cppa_component: "Audit-log management",
    nist_csf: "PR.PS-04, DE.CM-01, DE.CM-03",
    iso_27001: "A.8.15, A.8.16",
    soc2: "CC7.2",
    cppa_specific_evidence: "Centralized storage, retention, tamper-protection, and review of logs for systems that access or process PI. Evidence must show logs cannot be altered by standard accounts and are reviewed on a defined cadence.",
  },
  {
    index: 8,
    cppa_component: "Network monitoring and defenses",
    nist_csf: "DE.CM-01, PR.IR-01",
    iso_27001: "A.8.16, A.8.20, A.8.21",
    soc2: "CC7.2, CC7.3",
    cppa_specific_evidence: "Detection and defense against unauthorized access (IDS/IPS are examples, not mandates). Evidence must show monitoring coverage of all segments through which California consumer PI traverses.",
  },
  {
    index: 9,
    cppa_component: "Antivirus and anti-malware protections",
    nist_csf: "PR.PS-05, DE.CM-09",
    iso_27001: "A.8.7",
    soc2: "CC6.8",
    cppa_specific_evidence: "Deployment coverage, definition/update frequency, and exception handling across endpoints and servers that access or process PI. Evidence must show coverage reporting and gap remediation.",
  },
  {
    index: 10,
    cppa_component: "Segmentation of an information system",
    nist_csf: "PR.IR-01",
    iso_27001: "A.8.22",
    soc2: "CC6.6",
    cppa_specific_evidence: "Isolation of systems containing PI from other segments to limit blast radius. Evidence must include current segmentation diagrams scoped to PI data flows and validation testing of segment boundaries.",
  },
  {
    index: 11,
    cppa_component: "Port and protocol management and protection",
    nist_csf: "PR.IR-01, PR.PS-01",
    iso_27001: "A.8.20, A.8.21",
    soc2: "CC6.6",
    cppa_specific_evidence: "Identify, restrict, and monitor network ports and protocols to reduce attack surface. Evidence must include an authorized-ports-and-protocols register and a change gate before new ports reach production.",
  },
  {
    index: 12,
    cppa_component: "Cybersecurity awareness",
    nist_csf: "PR.AT-01",
    iso_27001: "A.6.3",
    soc2: "CC1.4, CC2.2",
    cppa_specific_evidence: "Ongoing activity to keep all personnel current on evolving threats and safe behaviors — distinct from role-based training (c)(13). Evidence must show cadence, topic coverage, and completion metrics.",
  },
  {
    index: 13,
    cppa_component: "Cybersecurity education and training",
    nist_csf: "PR.AT-01, PR.AT-02",
    iso_27001: "A.6.3",
    soc2: "CC1.4",
    cppa_specific_evidence: "Role-based training for employees, contractors, and anyone with system access (onboarding, annual, post-breach). Evidence must differentiate by role and retain completion records, including CCPA-specific handling obligations.",
  },
  {
    index: 14,
    cppa_component: "Secure development and coding practices",
    nist_csf: "PR.PS-06",
    iso_27001: "A.8.25, A.8.26, A.8.27, A.8.28",
    soc2: "CC8.1",
    cppa_specific_evidence: "Secure coding standards, code review, and security testing (SAST/DAST) across the SDLC. Evidence must show security gates at design/review/pre-release and retained scan/remediation records.",
  },
  {
    index: 15,
    cppa_component: "Oversight of service providers, contractors, and third parties",
    nist_csf: "GV.SC-01, GV.SC-04, ID.RA-10",
    iso_27001: "A.5.19, A.5.20, A.5.21, A.5.22",
    soc2: "CC9.2",
    cppa_specific_evidence: "Assess, contractually obligate, and continuously monitor vendors that access/store/process PI on the business's behalf. Evidence must include a current third-party inventory and contract clauses (security standards, breach notice, right-to-audit, disposal).",
  },
  {
    index: 16,
    cppa_component: "Retention schedules and proper disposal of personal information",
    nist_csf: "PR.DS-03, ID.AM-08",
    iso_27001: "A.5.34, A.8.10",
    soc2: "CC6.5, C1.2",
    cppa_specific_evidence: "Documented retention schedules and verified secure disposal of PI no longer needed. Evidence must be scoped to California PI/sensitive PI and include disposal verification (certificates of destruction / deletion logs).",
  },
  {
    index: 17,
    cppa_component: "Security-incident response management",
    nist_csf: "RS.MA-01, RS.AN-01, RC.RP-01",
    iso_27001: "A.5.24, A.5.25, A.5.26, A.5.27",
    soc2: "CC7.3, CC7.4, CC7.5",
    cppa_specific_evidence: "Documented plan, assigned roles, and tested procedures to detect/contain/eradicate/recover, including timely notification of affected individuals and regulators. Evidence must include tabletop history and review of incidents in the audit period.",
  },
  {
    index: 18,
    cppa_component: "Business-continuity and disaster-recovery planning",
    nist_csf: "RC.RP-01, PR.IR-04",
    iso_27001: "A.5.29, A.5.30, A.8.13, A.8.14",
    soc2: "A1.1, A1.2, A1.3",
    cppa_specific_evidence: "BC/DR plans, data-recovery capabilities, backups, and testing to ensure availability of PI. Evidence must include defined RTO/RPO for PI-processing systems and at least one documented test with results.",
  },
];
