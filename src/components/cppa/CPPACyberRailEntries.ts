// COACHING CONTENT RULE — coaching describes the SHAPE of a complete answer
// (dimensions, specificity, separateness). It NEVER describes the CONTENT of a
// compliant answer (what facts satisfy the law, what answer "passes").
// goodAnswer examples are clearly fictional and illustrate FORM, never a template.
// Voice: imperative, active, plain subject-verb-object, one idea per sentence,
// specific over vague, no ornamental legalese. Layered: coachLead = one line an
// expert acts on instantly; goodAnswer/commonMistake = the expansion for newer users.
// ENUMERATED-FIELD ADDENDUM — for selects, radios, and pills, coaching explains
// WHAT FACTS DETERMINE the accurate choice and WHAT EVIDENCE to check. It never
// recommends an option, never suggests claiming an exemption, and never implies
// which selection is favourable. goodAnswer shows a FICTIONAL determination —
// facts mapped to a selection — illustrating method, not a preferred outcome.

// src/components/cppa/CPPACyberRailEntries.ts
// StatuteRail entries for the CPPA Cybersecurity Audit Readiness tool (Module 2).
// Citations from the final 11 CCR § 7123(c)(1)–(18) cybersecurity program components.

import type { RailEntry } from "@/components/intake/StatuteRail";

const CPPA_URL = "https://cppa.ca.gov/regulations/pdf/ccpa_updates_cyber_risk_admt_appr_text.pdf";

export const CPPA_CYBER_RAIL: Record<string, RailEntry> = {
  profile_industry: {
    fieldLabel: "Industry sector",
    citation: "11 CCR § 7122",
    citationUrl: CPPA_URL,
    plainSummary: "The cybersecurity audit must assess controls in the context of the business's specific processing activities and risk environment. Industry sector shapes the threat landscape and which components are most material.",
    regulationText: "The audit must evaluate the cybersecurity program in light of the business's size, complexity, and the nature and scope of its processing activities.",
    coachLead: "Select the sector whose systems this audit covers.",
    coachBody: "Sector shapes the threats and expectations the gap analysis weighs. In a multi-line business, pick the line whose systems are in scope.",
    goodAnswer: "A healthcare-services subsidiary under audit selects healthcare — even though the parent is a private-equity firm.",
    commonMistake: "Selecting the parent's sector. That pulls the wrong enforcement context into all eighteen control findings.",
  },
  profile_audit: {
    fieldLabel: "Last independent security audit",
    citation: "11 CCR § 7124",
    citationUrl: CPPA_URL,
    plainSummary: "Covered businesses must certify completion of a cybersecurity audit to the CPPA by April 1 following each year an audit is required (first deadlines April 1, 2028 / 2029 / 2030 by 2026 revenue tier). The audit must be performed by a qualified, objective, independent professional.",
    regulationText: "Each year a business is required to complete a cybersecurity audit, a member of its executive management must submit a written certification of completion to the Agency.",
    enforcementNote: "The certification is signed under penalty of perjury by an executive with direct responsibility for cybersecurity audit compliance. A prior audit aligned to a recognized framework (e.g., NIST CSF 2.0) may be leveraged toward the requirement under § 7123(f) if all Article 9 elements are met, alone or with supplementation.",
    coachLead: "Count independent audits only — internal reviews don't qualify.",
    coachBody: "§ 7124 means audits by qualified, independent professionals. Select the most recent one that meets that bar. A self-assessment counts as none.",
    goodAnswer: "A company runs annual internal reviews, but its last external audit was 2023. It selects 2023 — the internal reviews don't count.",
    commonMistake: "Counting a SOC 2 readiness self-assessment as an audit. Independence is what qualifies it.",
  },
  c1_auth: {
    fieldLabel: "C1: Authentication",
    citation: "11 CCR § 7123(c)(1)",
    citationUrl: CPPA_URL,
    plainSummary: "Authentication of users seeking access to personal information, including multi-factor authentication, phishing-resistant MFA for employees and contractors, and strong password practices. The password element applies only if the business actually uses passwords.",
    regulationText: "The audit must assess the business's authentication and password practices for persons who access personal information, to the extent applicable to the business's information systems.",
    enforcementNote: "Authentication failures — weak or missing MFA, shared credentials, excessive access — appear in the majority of breach enforcement actions in the corpus.",
    coachLead: "Name the tool, the scope it covers, and the exceptions.",
    coachBody:
      "For this control: the specific product or process in place, what it covers (systems, population, environments), and any gaps or exclusions — stated separately and concretely. \u201CIn place\u201D with a vague note produces a weaker gap analysis than a precise description of partial coverage.",
    goodAnswer:
      "\u201CCrowdStrike Falcon on all corporate endpoints; not yet deployed to the 14 warehouse kiosks; contractors' devices out of scope.\u201D — the tool, the covered estate, the exceptions, each named.",
    commonMistake:
      "Marking a control \u2018in place\u2019 because a policy exists. The audit regulation asks what is implemented and where — a policy without deployment scope is an aspiration, not a control.",
  },
  c2_encryption: {
    fieldLabel: "C2: Encryption of personal information",
    citation: "11 CCR § 7123(c)(2)",
    citationUrl: CPPA_URL,
    plainSummary: "Encryption of personal information both at rest and in transit. The Agency declined to mandate a specific encryption standard, preserving flexibility across business types and scenarios.",
    regulationText: "The audit must assess the business's use of encryption to protect personal information at rest and in transit, to the extent applicable.",
    coachLead: "Name the tool, the scope it covers, and the exceptions.",
    coachBody:
      "For this control: the specific product or process in place, what it covers (systems, population, environments), and any gaps or exclusions — stated separately and concretely. \u201CIn place\u201D with a vague note produces a weaker gap analysis than a precise description of partial coverage.",
    goodAnswer:
      "\u201CCrowdStrike Falcon on all corporate endpoints; not yet deployed to the 14 warehouse kiosks; contractors' devices out of scope.\u201D — the tool, the covered estate, the exceptions, each named.",
    commonMistake:
      "Marking a control \u2018in place\u2019 because a policy exists. The audit regulation asks what is implemented and where — a policy without deployment scope is an aspiration, not a control.",
  },
  c3_account_access: {
    fieldLabel: "C3: Account management and access controls",
    citation: "11 CCR § 7123(c)(3)",
    citationUrl: CPPA_URL,
    plainSummary: "Least-privilege access, limiting and monitoring privileged accounts, restricting access to personal information to those who need it, and restricting physical access to personal information. The final regulations expanded scope to account- and application-level configuration.",
    regulationText: "The audit must assess the business's account management and access controls, including privileged-account limits and restrictions on physical access to personal information, to the extent applicable.",
    coachLead: "Name the tool, the scope it covers, and the exceptions.",
    coachBody:
      "For this control: the specific product or process in place, what it covers (systems, population, environments), and any gaps or exclusions — stated separately and concretely. \u201CIn place\u201D with a vague note produces a weaker gap analysis than a precise description of partial coverage.",
    goodAnswer:
      "\u201CCrowdStrike Falcon on all corporate endpoints; not yet deployed to the 14 warehouse kiosks; contractors' devices out of scope.\u201D — the tool, the covered estate, the exceptions, each named.",
    commonMistake:
      "Marking a control \u2018in place\u2019 because a policy exists. The audit regulation asks what is implemented and where — a policy without deployment scope is an aspiration, not a control.",
  },
  c4_inventory: {
    fieldLabel: "C4: Inventory and management of personal information and systems",
    citation: "11 CCR § 7123(c)(4)",
    citationUrl: CPPA_URL,
    plainSummary: "A current inventory of personal information, data flows, hardware, and software. Scope extends to every system through which personal information is processed or accessible, including cloud and third-party systems the business does not own or operate.",
    regulationText: "The audit must assess the business's inventory and management of personal information and of the systems that process or can access it, to the extent applicable.",
    coachLead: "Name the tool, the scope it covers, and the exceptions.",
    coachBody:
      "For this control: the specific product or process in place, what it covers (systems, population, environments), and any gaps or exclusions — stated separately and concretely. \u201CIn place\u201D with a vague note produces a weaker gap analysis than a precise description of partial coverage.",
    goodAnswer:
      "\u201CCrowdStrike Falcon on all corporate endpoints; not yet deployed to the 14 warehouse kiosks; contractors' devices out of scope.\u201D — the tool, the covered estate, the exceptions, each named.",
    commonMistake:
      "Marking a control \u2018in place\u2019 because a policy exists. The audit regulation asks what is implemented and where — a policy without deployment scope is an aspiration, not a control.",
  },
  c5_secure_config: {
    fieldLabel: "C5: Secure configuration of hardware and software",
    citation: "11 CCR § 7123(c)(5)",
    citationUrl: CPPA_URL,
    plainSummary: "Hardening of systems, patch management, change management, and masking of sensitive personal information where appropriate, for both on-premises and cloud environments.",
    regulationText: "The audit must assess the business's secure configuration of hardware and software, including patch and change management, to the extent applicable.",
    coachLead: "Name the tool, the scope it covers, and the exceptions.",
    coachBody:
      "For this control: the specific product or process in place, what it covers (systems, population, environments), and any gaps or exclusions — stated separately and concretely. \u201CIn place\u201D with a vague note produces a weaker gap analysis than a precise description of partial coverage.",
    goodAnswer:
      "\u201CCrowdStrike Falcon on all corporate endpoints; not yet deployed to the 14 warehouse kiosks; contractors' devices out of scope.\u201D — the tool, the covered estate, the exceptions, each named.",
    commonMistake:
      "Marking a control \u2018in place\u2019 because a policy exists. The audit regulation asks what is implemented and where — a policy without deployment scope is an aspiration, not a control.",
  },
  c6_vuln_mgmt: {
    fieldLabel: "C6: Vulnerability scanning and penetration testing",
    citation: "11 CCR § 7123(c)(6)",
    citationUrl: CPPA_URL,
    plainSummary: "Internal and external vulnerability scans, penetration testing, and processes for vulnerability disclosure and reporting — such as bug-bounty and ethical-hacking programs.",
    regulationText: "The audit must assess the business's vulnerability scanning, penetration testing, and vulnerability disclosure and reporting processes, to the extent applicable.",
    enforcementNote: "Unpatched known vulnerabilities are cited in a significant share of breach enforcement actions, including major fines for failure to remediate known CVEs within reasonable timeframes.",
    coachLead: "Name the tool, the scope it covers, and the exceptions.",
    coachBody:
      "For this control: the specific product or process in place, what it covers (systems, population, environments), and any gaps or exclusions — stated separately and concretely. \u201CIn place\u201D with a vague note produces a weaker gap analysis than a precise description of partial coverage.",
    goodAnswer:
      "\u201CCrowdStrike Falcon on all corporate endpoints; not yet deployed to the 14 warehouse kiosks; contractors' devices out of scope.\u201D — the tool, the covered estate, the exceptions, each named.",
    commonMistake:
      "Marking a control \u2018in place\u2019 because a policy exists. The audit regulation asks what is implemented and where — a policy without deployment scope is an aspiration, not a control.",
  },
  c7_audit_logs: {
    fieldLabel: "C7: Audit-log management",
    citation: "11 CCR § 7123(c)(7)",
    citationUrl: CPPA_URL,
    plainSummary: "Centralized storage, retention, and monitoring of audit logs to support detection of unauthorized activity and post-incident analysis.",
    regulationText: "The audit must assess the business's collection, retention, protection, and review of audit logs, to the extent applicable.",
    coachLead: "Name the tool, the scope it covers, and the exceptions.",
    coachBody:
      "For this control: the specific product or process in place, what it covers (systems, population, environments), and any gaps or exclusions — stated separately and concretely. \u201CIn place\u201D with a vague note produces a weaker gap analysis than a precise description of partial coverage.",
    goodAnswer:
      "\u201CCrowdStrike Falcon on all corporate endpoints; not yet deployed to the 14 warehouse kiosks; contractors' devices out of scope.\u201D — the tool, the covered estate, the exceptions, each named.",
    commonMistake:
      "Marking a control \u2018in place\u2019 because a policy exists. The audit regulation asks what is implemented and where — a policy without deployment scope is an aspiration, not a control.",
  },
  c8_network_mon: {
    fieldLabel: "C8: Network monitoring and defenses",
    citation: "11 CCR § 7123(c)(8)",
    citationUrl: CPPA_URL,
    plainSummary: "Defenses to detect unauthorized access, use, modification, destruction, or disclosure of personal information. Bot-, intrusion-detection and intrusion-prevention tools are examples, not mandates — the component evaluates whether detection and defense are present and effective.",
    regulationText: "The audit must assess the business's monitoring of networks and systems to detect threats and anomalous activity, to the extent applicable.",
    coachLead: "Name the tool, the scope it covers, and the exceptions.",
    coachBody:
      "For this control: the specific product or process in place, what it covers (systems, population, environments), and any gaps or exclusions — stated separately and concretely. \u201CIn place\u201D with a vague note produces a weaker gap analysis than a precise description of partial coverage.",
    goodAnswer:
      "\u201CCrowdStrike Falcon on all corporate endpoints; not yet deployed to the 14 warehouse kiosks; contractors' devices out of scope.\u201D — the tool, the covered estate, the exceptions, each named.",
    commonMistake:
      "Marking a control \u2018in place\u2019 because a policy exists. The audit regulation asks what is implemented and where — a policy without deployment scope is an aspiration, not a control.",
  },
  c9_anti_malware: {
    fieldLabel: "C9: Antivirus and anti-malware protections",
    citation: "11 CCR § 7123(c)(9)",
    citationUrl: CPPA_URL,
    plainSummary: "Deployment and maintenance of antivirus and anti-malware solutions across endpoints and servers that process personal information.",
    regulationText: "The audit must assess the business's deployment and maintenance of antivirus and anti-malware protections, to the extent applicable.",
    coachLead: "Name the tool, the scope it covers, and the exceptions.",
    coachBody:
      "For this control: the specific product or process in place, what it covers (systems, population, environments), and any gaps or exclusions — stated separately and concretely. \u201CIn place\u201D with a vague note produces a weaker gap analysis than a precise description of partial coverage.",
    goodAnswer:
      "\u201CCrowdStrike Falcon on all corporate endpoints; not yet deployed to the 14 warehouse kiosks; contractors' devices out of scope.\u201D — the tool, the covered estate, the exceptions, each named.",
    commonMistake:
      "Marking a control \u2018in place\u2019 because a policy exists. The audit regulation asks what is implemented and where — a policy without deployment scope is an aspiration, not a control.",
  },
  c10_segmentation: {
    fieldLabel: "C10: Segmentation of an information system",
    citation: "11 CCR § 7123(c)(10)",
    citationUrl: CPPA_URL,
    plainSummary: "Segmentation of information systems — for example via properly configured firewalls, routers, and switches — to isolate systems processing personal information and limit the blast radius of a compromise.",
    regulationText: "The audit must assess segmentation of the business's information systems, to the extent applicable.",
    coachLead: "Name the tool, the scope it covers, and the exceptions.",
    coachBody:
      "For this control: the specific product or process in place, what it covers (systems, population, environments), and any gaps or exclusions — stated separately and concretely. \u201CIn place\u201D with a vague note produces a weaker gap analysis than a precise description of partial coverage.",
    goodAnswer:
      "\u201CCrowdStrike Falcon on all corporate endpoints; not yet deployed to the 14 warehouse kiosks; contractors' devices out of scope.\u201D — the tool, the covered estate, the exceptions, each named.",
    commonMistake:
      "Marking a control \u2018in place\u2019 because a policy exists. The audit regulation asks what is implemented and where — a policy without deployment scope is an aspiration, not a control.",
  },
  c11_port_protocol: {
    fieldLabel: "C11: Port and protocol management and protection",
    citation: "11 CCR § 7123(c)(11)",
    citationUrl: CPPA_URL,
    plainSummary: "Limitation and control of ports, services, and protocols to reduce attack surface. Added as a distinct component in the final regulations.",
    regulationText: "The audit must assess the business's management and protection of ports, services, and protocols, to the extent applicable.",
    coachLead: "Name the tool, the scope it covers, and the exceptions.",
    coachBody:
      "For this control: the specific product or process in place, what it covers (systems, population, environments), and any gaps or exclusions — stated separately and concretely. \u201CIn place\u201D with a vague note produces a weaker gap analysis than a precise description of partial coverage.",
    goodAnswer:
      "\u201CCrowdStrike Falcon on all corporate endpoints; not yet deployed to the 14 warehouse kiosks; contractors' devices out of scope.\u201D — the tool, the covered estate, the exceptions, each named.",
    commonMistake:
      "Marking a control \u2018in place\u2019 because a policy exists. The audit regulation asks what is implemented and where — a policy without deployment scope is an aspiration, not a control.",
  },
  c12_awareness: {
    fieldLabel: "C12: Cybersecurity awareness",
    citation: "11 CCR § 7123(c)(12)",
    citationUrl: CPPA_URL,
    plainSummary: "How the business maintains current knowledge of evolving cybersecurity threats and appropriate countermeasures. The final regulations split awareness from training — a robust training program may not satisfy this component on its own.",
    regulationText: "The audit must assess how the business maintains awareness of evolving cybersecurity threats and countermeasures, to the extent applicable.",
    coachLead: "Name the tool, the scope it covers, and the exceptions.",
    coachBody:
      "For this control: the specific product or process in place, what it covers (systems, population, environments), and any gaps or exclusions — stated separately and concretely. \u201CIn place\u201D with a vague note produces a weaker gap analysis than a precise description of partial coverage.",
    goodAnswer:
      "\u201CCrowdStrike Falcon on all corporate endpoints; not yet deployed to the 14 warehouse kiosks; contractors' devices out of scope.\u201D — the tool, the covered estate, the exceptions, each named.",
    commonMistake:
      "Marking a control \u2018in place\u2019 because a policy exists. The audit regulation asks what is implemented and where — a policy without deployment scope is an aspiration, not a control.",
  },
  c13_training: {
    fieldLabel: "C13: Cybersecurity education and training",
    citation: "11 CCR § 7123(c)(13)",
    citationUrl: CPPA_URL,
    plainSummary: "Training for employees, independent contractors, and anyone granted access to the business's information systems — at onboarding, annually, and/or following a personal-information security breach.",
    regulationText: "The audit must assess the business's cybersecurity education and training for personnel with access to personal information or systems, to the extent applicable.",
    coachLead: "Name the tool, the scope it covers, and the exceptions.",
    coachBody:
      "For this control: the specific product or process in place, what it covers (systems, population, environments), and any gaps or exclusions — stated separately and concretely. \u201CIn place\u201D with a vague note produces a weaker gap analysis than a precise description of partial coverage.",
    goodAnswer:
      "\u201CCrowdStrike Falcon on all corporate endpoints; not yet deployed to the 14 warehouse kiosks; contractors' devices out of scope.\u201D — the tool, the covered estate, the exceptions, each named.",
    commonMistake:
      "Marking a control \u2018in place\u2019 because a policy exists. The audit regulation asks what is implemented and where — a policy without deployment scope is an aspiration, not a control.",
  },
  c14_secure_dev: {
    fieldLabel: "C14: Secure development and coding practices",
    citation: "11 CCR § 7123(c)(14)",
    citationUrl: CPPA_URL,
    plainSummary: "Secure coding standards, code reviews, and security testing as part of the software development lifecycle.",
    regulationText: "The audit must assess the business's secure development and coding practices across the software development lifecycle, to the extent applicable.",
    coachLead: "Name the tool, the scope it covers, and the exceptions.",
    coachBody:
      "For this control: the specific product or process in place, what it covers (systems, population, environments), and any gaps or exclusions — stated separately and concretely. \u201CIn place\u201D with a vague note produces a weaker gap analysis than a precise description of partial coverage.",
    goodAnswer:
      "\u201CCrowdStrike Falcon on all corporate endpoints; not yet deployed to the 14 warehouse kiosks; contractors' devices out of scope.\u201D — the tool, the covered estate, the exceptions, each named.",
    commonMistake:
      "Marking a control \u2018in place\u2019 because a policy exists. The audit regulation asks what is implemented and where — a policy without deployment scope is an aspiration, not a control.",
  },
  c15_third_party: {
    fieldLabel: "C15: Oversight of service providers, contractors, and third parties",
    citation: "11 CCR § 7123(c)(15)",
    citationUrl: CPPA_URL,
    plainSummary: "Oversight of vendors and contractors to ensure they meet the business's cybersecurity program obligations. Because scope expressly reaches third-party environments, this intersects with nearly every technical component.",
    regulationText: "The audit must assess the business's oversight of service providers, contractors, and third parties that access or process personal information, to the extent applicable.",
    enforcementNote: "Third-party vendor breaches are a leading source of PI exposure; regulators have held businesses liable for incidents caused by inadequately vetted service providers.",
    coachLead: "Name the tool, the scope it covers, and the exceptions.",
    coachBody:
      "For this control: the specific product or process in place, what it covers (systems, population, environments), and any gaps or exclusions — stated separately and concretely. \u201CIn place\u201D with a vague note produces a weaker gap analysis than a precise description of partial coverage.",
    goodAnswer:
      "\u201CCrowdStrike Falcon on all corporate endpoints; not yet deployed to the 14 warehouse kiosks; contractors' devices out of scope.\u201D — the tool, the covered estate, the exceptions, each named.",
    commonMistake:
      "Marking a control \u2018in place\u2019 because a policy exists. The audit regulation asks what is implemented and where — a policy without deployment scope is an aspiration, not a control.",
  },
  c16_retention: {
    fieldLabel: "C16: Retention schedules and proper disposal of personal information",
    citation: "11 CCR § 7123(c)(16)",
    citationUrl: CPPA_URL,
    plainSummary: "Retention schedules and secure disposal of personal information no longer needed — by shredding, erasing, or otherwise rendering it unreadable. Schedules should be scoped to California personal information and sensitive personal information, not just general records.",
    regulationText: "The audit must assess the business's retention schedules and secure disposal of personal information when it is no longer needed, to the extent applicable.",
    coachLead: "Name the tool, the scope it covers, and the exceptions.",
    coachBody:
      "For this control: the specific product or process in place, what it covers (systems, population, environments), and any gaps or exclusions — stated separately and concretely. \u201CIn place\u201D with a vague note produces a weaker gap analysis than a precise description of partial coverage.",
    goodAnswer:
      "\u201CCrowdStrike Falcon on all corporate endpoints; not yet deployed to the 14 warehouse kiosks; contractors' devices out of scope.\u201D — the tool, the covered estate, the exceptions, each named.",
    commonMistake:
      "Marking a control \u2018in place\u2019 because a policy exists. The audit regulation asks what is implemented and where — a policy without deployment scope is an aspiration, not a control.",
  },
  c17_incident: {
    fieldLabel: "C17: Security-incident response management",
    citation: "11 CCR § 7123(c)(17)",
    citationUrl: CPPA_URL,
    plainSummary: "The incident response program — documented procedures, response capabilities, and testing — plus a review of actual security incidents during the audit period, including breach notifications sent to California consumers or agencies.",
    regulationText: "The audit must assess the business's security-incident response management, including documented procedures, testing, and review of incidents during the period, to the extent applicable.",
    enforcementNote: "Absence of an incident response plan, or failure to follow one, is cited as an aggravating factor in enforcement across multiple jurisdictions.",
    coachLead: "Name the tool, the scope it covers, and the exceptions.",
    coachBody:
      "For this control: the specific product or process in place, what it covers (systems, population, environments), and any gaps or exclusions — stated separately and concretely. \u201CIn place\u201D with a vague note produces a weaker gap analysis than a precise description of partial coverage.",
    goodAnswer:
      "\u201CCrowdStrike Falcon on all corporate endpoints; not yet deployed to the 14 warehouse kiosks; contractors' devices out of scope.\u201D — the tool, the covered estate, the exceptions, each named.",
    commonMistake:
      "Marking a control \u2018in place\u2019 because a policy exists. The audit regulation asks what is implemented and where — a policy without deployment scope is an aspiration, not a control.",
  },
  c18_continuity: {
    fieldLabel: "C18: Business-continuity and disaster-recovery planning",
    citation: "11 CCR § 7123(c)(18)",
    citationUrl: CPPA_URL,
    plainSummary: "Business-continuity and disaster-recovery plans, data-recovery capabilities, and backups, plus testing of those capabilities to ensure availability of personal information during disruptions.",
    regulationText: "The audit must assess the business's business-continuity and disaster-recovery planning, including backups and testing, to the extent applicable.",
    coachLead: "Name the tool, the scope it covers, and the exceptions.",
    coachBody:
      "For this control: the specific product or process in place, what it covers (systems, population, environments), and any gaps or exclusions — stated separately and concretely. \u201CIn place\u201D with a vague note produces a weaker gap analysis than a precise description of partial coverage.",
    goodAnswer:
      "\u201CCrowdStrike Falcon on all corporate endpoints; not yet deployed to the 14 warehouse kiosks; contractors' devices out of scope.\u201D — the tool, the covered estate, the exceptions, each named.",
    commonMistake:
      "Marking a control \u2018in place\u2019 because a policy exists. The audit regulation asks what is implemented and where — a policy without deployment scope is an aspiration, not a control.",
  },

  // TURN 3 RETROFIT — intake-rail parity for three new scope + evidence fields.
  // Corpus consulted:
  //   • cppa_authorities row id=1e296c7f-e5d0-443c-b139-e2439d3c1890 (citation
  //     "11 CCR § 7122") — subsection (a) auditor qualifications; (g) five-year
  //     document retention. Anchors evidence-availability and audit-scope.
  //   • cppa_authorities row id=1aee5b20-705a-4c50-8795-ed37d89f81ea (citation
  //     "11 CCR § 7123") — subsection (b) audit scope discipline; (f) leveraging
  //     prior audits with supplementation. Anchors in_scope_frameworks and
  //     audit_scope_rationale.

  in_scope_frameworks: {
    fieldLabel: "Frameworks in scope for this audit",
    citation: "11 CCR § 7123(f)",
    citationUrl: CPPA_URL,
    plainSummary:
      "A business may use a cybersecurity audit, assessment, or evaluation it prepared for another purpose (for example, a NIST CSF 2.0 audit) toward the § 7123 requirement — provided the prior work meets every Article 9 element, alone or with supplementation. The frameworks you record here name what the assessment considers 'in scope' for that leverage.",
    regulationText:
      "A business may utilize a cybersecurity audit, assessment, or evaluation that it has prepared for another purpose, provided that it meets all of the requirements of this Article, either on its own or through supplementation. For example, a business may have engaged in an audit that uses the National Institute of Standards and Technology Cybersecurity Framework 2.0 and meets all of the requirements of this Article.",
    coachLead: "Select every framework whose evidence the auditor will actually rely on.",
    coachBody:
      "Pick only frameworks whose work-product you can produce (report, letter, workpapers). If a framework will not contribute evidence, leave it out — over-selecting suggests coverage the § 7123(f) supplementation test cannot support.",
    goodAnswer:
      "A payments processor selects SOC 2 (annual report on file) and PCI DSS (attestation of compliance) because both produce workpapers the auditor can leverage; it does not select NIST CSF because it has no assessed evidence against that framework.",
    commonMistake:
      "Selecting every framework the team has ever mentioned. § 7123(f) permits leverage only where the prior work meets the Article's elements — unbacked selections weaken the scope justification.",
  },

  audit_scope_rationale: {
    fieldLabel: "Audit scope rationale",
    citation: "11 CCR § 7123(b)",
    citationUrl: CPPA_URL,
    plainSummary:
      "The audit must assess the cybersecurity program in light of the business's size, complexity, and the nature and scope of its processing activities. The rationale you record here is what the audit's scope memo carries forward — what is covered, what is deliberately excluded, and how any prior framework is supplemented under § 7123(f).",
    regulationText:
      "The cybersecurity audit must assess: (1) The business's establishment, implementation, and maintenance of its cybersecurity program, including the related written documentation thereof (e.g., policies and procedures), that is appropriate to the business's size and complexity and the nature and scope of its processing activities, taking into account the state of the art and cost of implementing the components of a cybersecurity program; and (2) Each of the components of a cybersecurity program listed in subsection (c) that the auditor deems applicable to the business's information system.",
    coachLead: "State what is in, what is out, and (if leveraging a prior audit) how you supplement.",
    coachBody:
      "Name the systems and processing activities in scope, the ones intentionally excluded (with reason), and — where a prior framework audit is being leveraged under § 7123(f) — the components the supplementation covers. Vague coverage claims leave the scope memo unreviewable.",
    goodAnswer:
      "A healthcare SaaS writes: 'In scope: multi-tenant production estate and the customer-facing web app. Out of scope: internal HR systems (no PI processing). Leverages 2026 SOC 2 Type II; supplements for retention (§ 7123(c)(16)) and segmentation (§ 7123(c)(10)) which SOC 2 does not test directly.'",
    commonMistake:
      "Leaving the rationale as 'company-wide.' Company-wide is a boundary claim, not a scope memo — the auditor still has to name systems, exclusions, and supplementation.",
  },

  evidence_availability: {
    fieldLabel: "Evidence available (per component)",
    citation: "11 CCR § 7122(g)",
    citationUrl: CPPA_URL,
    plainSummary:
      "The business and its auditor must retain all documents relevant to each cybersecurity audit for at least five years after completion. The evidence types you check here name what the auditor can test today — a maturity claim without evidence forces an insufficient-basis finding.",
    regulationText:
      "The business and the auditor must retain all documents relevant to each cybersecurity audit for a minimum of five (5) years after completion of the cybersecurity audit.",
    enforcementNote:
      "ISO 19011 evidence typing (documentary, testimonial, observation, analytical) is the profession-standard method the § 7122(a) auditor is expected to apply. Selecting 'None on file' converts a self-rated maturity into an insufficient-basis finding — accurate, not adverse.",
    coachLead: "Tick only the artefacts the auditor can hand a reviewer today.",
    coachBody:
      "Select every evidence type the business already has on file for this component. If nothing exists yet, select 'None on file' — the assessment prefers an honest insufficient-basis finding to a maturity claim the auditor cannot test.",
    goodAnswer:
      "For its authentication component, a SaaS ticks Policy / procedure document, Runbook / SOP, and Sample log / report — each corresponds to a file it can hand the auditor. It leaves Screenshot / config export unticked because the export capability has not yet been built.",
    commonMistake:
      "Ticking every evidence type to signal preparedness. If the auditor asks for the file and it does not exist, the maturity claim collapses; accuracy protects the readiness score.",
  },
};
