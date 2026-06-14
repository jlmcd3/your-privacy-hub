// Sprint 1 #7 — NIST CSF / ISO 27001 / SOC 2 → CPPA Cybersecurity control mapping.
// Source: 11 CCR § 7123(c)(1)–(17) enumerated cybersecurity programme components
// (OAL approved September 22, 2025; effective January 1, 2026), cross-walked
// to the most directly equivalent control identifier in each framework.
// Note: "Zero-trust architecture" appeared in earlier drafts but was deleted from
// the final regulations by CalPrivacy before OAL approval. The 17 remaining
// components retain their final § 7123(c) numbered positions.
// `cppa_specific_evidence` captures what an existing-framework auditor must add to
// satisfy the CPPA audit beyond their normal control evidence — the FSOR makes clear
// that holding NIST/ISO/SOC 2 certifications does NOT, on its own, satisfy the CPPA
// regulations.

export type FrameworkMappingRow = {
  index: number; // 1–17 matching § 7123(c)(N) of the final regulations
  cppa_component: string;
  nist_csf: string;
  iso_27001: string;
  soc2: string;
  cppa_specific_evidence: string;
};

export const CPPA_CYBER_FRAMEWORK_MAPPING: FrameworkMappingRow[] = [
  {
    index: 1,
    cppa_component: "Authentication (incl. MFA for privileged/remote access)",
    nist_csf: "PR.AA-01, PR.AA-03",
    iso_27001: "A.5.15, A.5.17, A.8.5",
    soc2: "CC6.1, CC6.6",
    cppa_specific_evidence: "Evidence MFA is enforced specifically for accounts that can access California consumer PI and for remote administrative access; CPPA expects component-level attestation, not org-wide.",
  },
  {
    index: 2,
    cppa_component: "Encryption of personal information (at rest and in transit)",
    nist_csf: "PR.DS-01, PR.DS-02",
    iso_27001: "A.8.24",
    soc2: "CC6.7",
    cppa_specific_evidence: "Encryption scope must be tied to the PI inventory used for CCPA disclosures; key management evidence must cover California consumer datasets, not just production-tier classification.",
  },
  {
    index: 3,
    cppa_component: "Inventory of personal information and information systems",
    nist_csf: "ID.AM-01, ID.AM-02, ID.AM-05",
    iso_27001: "A.5.9, A.5.12",
    soc2: "CC3.2",
    cppa_specific_evidence: "Inventory must align with the categories disclosed under § 1798.130 and identify systems storing sensitive PI; generic asset registers are insufficient.",
  },
  {
    index: 4,
    cppa_component: "Secure configuration of hardware and software",
    nist_csf: "PR.PS-01, PR.IR-01",
    iso_27001: "A.8.9, A.8.27",
    soc2: "CC7.1",
    cppa_specific_evidence: "Baselines must be evidenced for systems processing PI specifically; CIS/STIG benchmarks accepted as starting point, deviations require risk-based justification.",
  },
  {
    index: 5,
    cppa_component: "Internal and external vulnerability scans, penetration testing",
    nist_csf: "ID.RA-01, ID.IM-02",
    iso_27001: "A.8.8, A.8.29",
    soc2: "CC4.1, CC7.1",
    cppa_specific_evidence: "Cadence and scope must cover all PI-processing systems; remediation SLAs must be documented and met. Annual pen test alone is insufficient if attack surface changes mid-year.",
  },
  {
    index: 6,
    cppa_component: "Audit-log management",
    nist_csf: "DE.AE-03, PR.PS-04",
    iso_27001: "A.8.15, A.8.16",
    soc2: "CC7.2, CC7.3",
    cppa_specific_evidence: "Logs must capture access to PI specifically and be retained long enough to support breach investigation; FSOR expects log review on a defined cadence, not solely incident-driven.",
  },
  {
    index: 7,
    cppa_component: "Network monitoring and defenses",
    nist_csf: "DE.CM-01, PR.IR-01",
    iso_27001: "A.8.16, A.8.20, A.8.21",
    soc2: "CC6.6, CC7.2",
    cppa_specific_evidence: "Detection coverage must extend to data-exfiltration paths from PI stores; segmentation evidence must show PI environments are isolated from general corporate networks where practical.",
  },
  {
    index: 8,
    cppa_component: "Anti-malware and endpoint protection",
    nist_csf: "PR.PS-05, DE.CM-09",
    iso_27001: "A.8.7",
    soc2: "CC6.8",
    cppa_specific_evidence: "Coverage must include all endpoints that can access PI, including BYOD if permitted; exception register required for systems where EDR is not technically feasible.",
  },
  {
    index: 9,
    cppa_component: "Secure software development (SSDLC)",
    nist_csf: "PR.PS-06, ID.RA-06",
    iso_27001: "A.8.25, A.8.28, A.8.29",
    soc2: "CC8.1",
    cppa_specific_evidence: "Threat modelling and privacy-by-design artefacts required for features touching PI; secure code review evidence should reference data-handling functions specifically.",
  },
  {
    index: 10,
    cppa_component: "Patch management",
    nist_csf: "ID.RA-01, ID.IM-02",
    iso_27001: "A.8.8",
    soc2: "CC7.1",
    cppa_specific_evidence: "Critical-patch SLAs for PI-processing systems should be defined and tracked separately from general IT; exception process required for unpatched legacy systems still holding PI.",
  },
  {
    index: 11,
    cppa_component: "Backup and recovery; resilience",
    nist_csf: "PR.DS-11, RC.RP-01",
    iso_27001: "A.8.13, A.8.14",
    soc2: "A1.2, A1.3",
    cppa_specific_evidence: "Restore tests must include PI datasets; immutable / offline backup evidence required to support ransomware-driven CCPA breach notification scenarios.",
  },
  {
    index: 12,
    cppa_component: "Personnel security and training",
    nist_csf: "PR.AT-01, PR.AT-02",
    iso_27001: "A.6.3, A.6.6, A.6.8",
    soc2: "CC1.4, CC2.2",
    cppa_specific_evidence: "Training must include CCPA-specific obligations (consumer requests, sensitive PI handling, opt-outs); generic security awareness alone is insufficient under § 7122.",
  },
  {
    index: 13,
    cppa_component: "Vendor and third-party security management",
    nist_csf: "GV.SC-01, GV.SC-05, ID.SC-04",
    iso_27001: "A.5.19, A.5.20, A.5.21, A.5.22",
    soc2: "CC9.2",
    cppa_specific_evidence: "Contractual evidence must include CCPA service-provider / contractor clauses (§ 1798.140) and § 7053 onward-transfer terms — not just generic DPAs.",
  },
  {
    index: 14,
    cppa_component: "Incident response and reporting (incl. breach notification)",
    nist_csf: "RS.MA-01, RS.AN-06, RC.CO-03",
    iso_27001: "A.5.24, A.5.25, A.5.26, A.5.27",
    soc2: "CC7.3, CC7.4, CC7.5",
    cppa_specific_evidence: "Playbook must encode California breach-notification triggers and timelines (Cal. Civ. Code § 1798.82) and CPPA notification pathways; tabletop evidence required.",
  },
  {
    index: 15,
    cppa_component: "Business continuity and disaster recovery",
    nist_csf: "GV.RM-04, RC.RP-01",
    iso_27001: "A.5.29, A.5.30",
    soc2: "A1.2",
    cppa_specific_evidence: "RTO/RPO must be defined for systems processing California consumer rights requests so DSAR / opt-out timelines remain achievable during a DR event.",
  },
  {
    index: 16,
    cppa_component: "Physical security of PI and processing facilities",
    nist_csf: "PR.AA-06",
    iso_27001: "A.7.1, A.7.2, A.7.4, A.7.5",
    soc2: "CC6.4, CC6.5",
    cppa_specific_evidence: "Coverage must include any office or facility where physical PI is held (paper, screens visible to non-authorised staff); secure disposal records required for printed PI.",
  },
  {
    index: 17,
    cppa_component: "Cybersecurity governance, oversight, and program management",
    nist_csf: "GV.OC-01, GV.RM-01, GV.OV-01",
    iso_27001: "A.5.1, A.5.2, A.5.4, A.5.31",
    soc2: "CC1.1, CC1.2, CC1.3",
    cppa_specific_evidence: "Board / executive oversight of the cybersecurity program must be documented and include explicit review of CPPA audit findings; written program required regardless of existing ISMS.",
  },
];
