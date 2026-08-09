// ITEM 315 — § 7123(c) COMPONENT REGISTRY (re-derived from corpus, 2026-07-31).
//
// PROVENANCE: every `verbatim` string below was extracted mechanically from the
// `cppa-7123` row in `provision_texts` (status=approved, 15,371 chars) and
// whitespace-normalized only — no transcription, no paraphrase, no editing.
// A pin test asserts each string is a substring of the normalized corpus row.
//
// WHY THIS FILE EXISTS: before this item the product scored "18 components"
// that had NO corpus backing — § 7123 had never been ingested, yet output
// cited § 7123(c) as if verified. That was the fleet's highest-risk
// verify-first violation. The list is now re-derived FROM the enumeration:
// one row per enumerated component, never lumped into a blob.
//
// RE-DERIVATION RESULT (before/after detail in the Item 315 courier):
//   - § 7123(c) enumerates EXACTLY 18 components, (1)-(18).
//   - All 18 prior controls map 1:1 onto an enumerated component. NONE is
//     retired as non-corpus-grounded; the prior slugs c1..c18 are preserved
//     so no intake key changes.
//   - SIX prior labels understated or renamed their component's statutory
//     scope and are RE-KEYED to the statute's own words (`disposition:
//     "retained_rekeyed"`, `prior_label` records what it was).
//   - § 7123(c) names NO component the prior list lacked.
//   - § 7123(b)(1) and (b)(3) are assessment obligations the prior model
//     never carried at all — they are NOT components and live in
//     CYBER_PROGRAM_OBLIGATIONS below rather than being smuggled into the list.

export interface Cyber7123Component {
  /** Enumeration number in § 7123(c). */
  number: number;
  /** Intake slug — unchanged from the prior model. */
  slug: string;
  /** Label re-derived from the statute's own words. */
  label: string;
  citation: string;
  verbatim: string;
  /** The label this component shipped under before Item 315. */
  prior_label: string;
  disposition: "retained_verbatim" | "retained_rekeyed" | "retired_ungrounded";
}

export const CYBER_7123_COMPONENTS: readonly Cyber7123Component[] = [
  {
    number: 1,
    slug: "c1_auth",
    label: "Authentication",
    citation: "11 CCR § 7123(c)(1)",
    /** Verbatim § 7123(c)(1) — whitespace-normalized from the corpus row only. */
    verbatim: "Authentication, including: (A) Multi-factor authentication (including multi-factor authentication that is resistant to phishing attacks for employees, independent contractors, and any other personnel, service providers, and contractors); and (B) If the business uses passwords or passphrases, strong unique passwords or passphrases (e.g., passwords that are at least eight characters in length, not on the business’s disallowed list of commonly used passwords, and not reused).",
    prior_label: "Authentication",
    disposition: "retained_verbatim",
  },
  {
    number: 2,
    slug: "c2_encryption",
    label: "Encryption of personal information, at rest and in transit",
    citation: "11 CCR § 7123(c)(2)",
    /** Verbatim § 7123(c)(2) — whitespace-normalized from the corpus row only. */
    verbatim: "Encryption of personal information, at rest and in transit.",
    prior_label: "Encryption of personal information",
    disposition: "retained_rekeyed",
  },
  {
    number: 3,
    slug: "c3_account_access",
    label: "Account management and access controls",
    citation: "11 CCR § 7123(c)(3)",
    /** Verbatim § 7123(c)(3) — whitespace-normalized from the corpus row only. */
    verbatim: "Account management and access controls, including: (A) Restricting each person’s, account’s, or application’s privileges and access to personal information to what is necessary for that person, account, or application to perform their duties. For example: (i) If the person is an employee, independent contractor, or any other personnel, restricting their privileges and access to personal information to what is necessary to perform the respective job functions of each individual, and revoking their privileges and access when their job functions no longer require them, including when their employment or contract is terminated; (ii) If the person is a service provider or contractor, restricting their privileges and access to personal information to what is necessary for the specific business purpose(s) set forth in, and in compliance with, the written contract between the business and the service provider or contractor required by the CCPA and section 7051; and (iii) Restricting the privileges and access of third parties to whom the business sells or shares personal information to the personal information that is necessary for the limited and specified purpose(s) set forth within the contract between the business and the third party required by the CCPA and section 7053. (B) Restricting the number of privileged accounts, restricting those privileged accounts’ access functions to only those necessary to perform the account-holder’s job, restricting the use of privileged accounts to when they are necessary to perform functions, and using a privileged-access management solution (e.g., to ensure just-in-time temporary assignment of privileged access). (C) Restricting and monitoring the creation of new accounts for employees, independent contractors, or other personnel; service providers or contractors; and privileged accounts, and ensuring that the accounts’ access and privileges are limited as set forth in subsections (c)(3)(A) and (B). (D) Restricting and monitoring physical access to personal information (e.g., through the use of badges, secure physical file locations, and enforcement of clean-desk policies).",
    prior_label: "Account management and access controls",
    disposition: "retained_verbatim",
  },
  {
    number: 4,
    slug: "c4_inventory",
    label: "Inventory and management of personal information and the business's information system",
    citation: "11 CCR § 7123(c)(4)",
    /** Verbatim § 7123(c)(4) — whitespace-normalized from the corpus row only. */
    verbatim: "Inventory and management of personal information and the business’s information system, including: (A) Personal information inventories (e.g., maps and flows identifying where personal information is stored, and how it can be accessed) and the classification and tagging of personal information (e.g., how personal information is tagged and how those tags are used to control the use and disclosure of personal information); (B) Hardware and software inventories, and the use of allowlisting (i.e., discrete lists of authorized hardware and software to control what is permitted to connect to and execute on the business’s information system); and (C) Hardware and software approval processes, and preventing the connection of unauthorized hardware and devices to the business’s information system.",
    prior_label: "Inventory and management of personal information and systems",
    disposition: "retained_rekeyed",
  },
  {
    number: 5,
    slug: "c5_secure_config",
    label: "Secure configuration of hardware and software",
    citation: "11 CCR § 7123(c)(5)",
    /** Verbatim § 7123(c)(5) — whitespace-normalized from the corpus row only. */
    verbatim: "Secure configuration of hardware and software, including: (A) Software updates and upgrades; (B) Securing on-premises and cloud-based environments; (C) Masking (i.e., systematically removing or replacing with symbols such as asterisks or bullets) the sensitive personal information set forth in Civil Code section 1798.145, subdivisions (ae)(1)(A) and (B) and other personal information as appropriate by default in applications; (D) Security patch management (e.g., receiving systematic notifications of security-related software updates and upgrades; and identifying, deploying, and verifying their implementation); and (E) Change management (i.e., processes and procedures to ensure that changes to information system(s) do not undermine existing safeguards).",
    prior_label: "Secure configuration of hardware and software",
    disposition: "retained_verbatim",
  },
  {
    number: 6,
    slug: "c6_vuln_mgmt",
    label: "Internal and external vulnerability scans, penetration testing, and vulnerability disclosure and reporting",
    citation: "11 CCR § 7123(c)(6)",
    /** Verbatim § 7123(c)(6) — whitespace-normalized from the corpus row only. */
    verbatim: "Internal and external vulnerability scans, penetration testing, and vulnerability disclosure and reporting (e.g., bug bounty and ethical hacking programs).",
    prior_label: "Vulnerability scanning and penetration testing",
    disposition: "retained_rekeyed",
  },
  {
    number: 7,
    slug: "c7_audit_logs",
    label: "Audit-log management",
    citation: "11 CCR § 7123(c)(7)",
    /** Verbatim § 7123(c)(7) — whitespace-normalized from the corpus row only. */
    verbatim: "Audit-log management, including the centralized storage, retention, and monitoring of logs.",
    prior_label: "Audit-log management",
    disposition: "retained_verbatim",
  },
  {
    number: 8,
    slug: "c8_network_mon",
    label: "Network monitoring and defenses",
    citation: "11 CCR § 7123(c)(8)",
    /** Verbatim § 7123(c)(8) — whitespace-normalized from the corpus row only. */
    verbatim: "Network monitoring and defenses, including the deployment of: (A) Technologies, such as bot-detection, intrusion-detection, and intrusion-prevention, which a business may use to detect unsuccessful login attempts, monitor the activity of authorized users, and detect and prevent unauthorized access, destruction, use, modification, or disclosure of personal information; or unauthorized activity resulting in the loss of availability of personal information; and (B) Data-loss-prevention systems (e.g., software to detect and prevent unauthorized access, use, or disclosure of personal information).",
    prior_label: "Network monitoring and defenses",
    disposition: "retained_verbatim",
  },
  {
    number: 9,
    slug: "c9_anti_malware",
    label: "Antivirus and antimalware protections",
    citation: "11 CCR § 7123(c)(9)",
    /** Verbatim § 7123(c)(9) — whitespace-normalized from the corpus row only. */
    verbatim: "Antivirus and antimalware protections.",
    prior_label: "Antivirus and anti-malware protections",
    disposition: "retained_rekeyed",
  },
  {
    number: 10,
    slug: "c10_segmentation",
    label: "Segmentation of an information system",
    citation: "11 CCR § 7123(c)(10)",
    /** Verbatim § 7123(c)(10) — whitespace-normalized from the corpus row only. */
    verbatim: "Segmentation of an information system (e.g., via properly configured firewalls, routers, switches).",
    prior_label: "Segmentation of an information system",
    disposition: "retained_verbatim",
  },
  {
    number: 11,
    slug: "c11_port_protocol",
    label: "Limitation and control of ports, services, and protocols",
    citation: "11 CCR § 7123(c)(11)",
    /** Verbatim § 7123(c)(11) — whitespace-normalized from the corpus row only. */
    verbatim: "Limitation and control of ports, services, and protocols.",
    prior_label: "Port and protocol management and protection",
    disposition: "retained_rekeyed",
  },
  {
    number: 12,
    slug: "c12_awareness",
    label: "Cybersecurity awareness",
    citation: "11 CCR § 7123(c)(12)",
    /** Verbatim § 7123(c)(12) — whitespace-normalized from the corpus row only. */
    verbatim: "Cybersecurity awareness, including how the business maintains current knowledge of changing cybersecurity threats and countermeasures.",
    prior_label: "Cybersecurity awareness",
    disposition: "retained_verbatim",
  },
  {
    number: 13,
    slug: "c13_training",
    label: "Cybersecurity education and training",
    citation: "11 CCR § 7123(c)(13)",
    /** Verbatim § 7123(c)(13) — whitespace-normalized from the corpus row only. */
    verbatim: "Cybersecurity education and training, including training for each employee, independent contractor, and any other personnel to whom the business provides access to its information system (e.g., when their employment or contract begins, annually thereafter, and after a personal information security breach, as described in Civil Code section 1798.150).",
    prior_label: "Cybersecurity education and training",
    disposition: "retained_verbatim",
  },
  {
    number: 14,
    slug: "c14_secure_dev",
    label: "Secure development and coding best practices",
    citation: "11 CCR § 7123(c)(14)",
    /** Verbatim § 7123(c)(14) — whitespace-normalized from the corpus row only. */
    verbatim: "Secure development and coding best practices, including code-reviews and testing.",
    prior_label: "Secure development and coding practices",
    disposition: "retained_rekeyed",
  },
  {
    number: 15,
    slug: "c15_third_party",
    label: "Oversight of service providers, contractors, and third parties",
    citation: "11 CCR § 7123(c)(15)",
    /** Verbatim § 7123(c)(15) — whitespace-normalized from the corpus row only. */
    verbatim: "Oversight of service providers, contractors, and third parties to ensure compliance with sections 7051 and 7053.",
    prior_label: "Oversight of service providers, contractors, and third parties",
    disposition: "retained_verbatim",
  },
  {
    number: 16,
    slug: "c16_retention",
    label: "Retention schedules and proper disposal of personal information",
    citation: "11 CCR § 7123(c)(16)",
    /** Verbatim § 7123(c)(16) — whitespace-normalized from the corpus row only. */
    verbatim: "Retention schedules and proper disposal of personal information no longer required to be retained, by (A) shredding, (B) erasing, or (C) otherwise modifying the personal information in those records to make it unreadable or undecipherable through any means.",
    prior_label: "Retention schedules and proper disposal of personal information",
    disposition: "retained_verbatim",
  },
  {
    number: 17,
    slug: "c17_incident",
    label: "Security-incident response management",
    citation: "11 CCR § 7123(c)(17)",
    /** Verbatim § 7123(c)(17) — whitespace-normalized from the corpus row only. */
    verbatim: "How the business manages its responses to security incidents (i.e., its incident response management). (A) For the purposes of subsection (17), “security incident” means an occurrence that actually or imminently jeopardizes the confidentiality, integrity, or availability of the business’s information system or the personal information the system processes, stores, or transmits, or that constitutes a violation or imminent threat of violation of the business’s cybersecurity program; unauthorized access, destruction, use, modification, or disclosure of personal information; or unauthorized activity resulting in the loss of availability of personal information is a security incident. (B) The business’s incident response management includes: (i) The business’s documentation of predetermined instructions or procedures to detect, respond to, limit the consequences of, and recover from malicious attacks against its information system (i.e., the business’s incident response plan); and (ii) How the business tests its incident-response capabilities; and",
    prior_label: "Security-incident response management",
    disposition: "retained_verbatim",
  },
  {
    number: 18,
    slug: "c18_continuity",
    label: "Business-continuity and disaster-recovery plans",
    citation: "11 CCR § 7123(c)(18)",
    /** Verbatim § 7123(c)(18) — whitespace-normalized from the corpus row only. */
    verbatim: "Business-continuity and disaster-recovery plans, including data-recovery capabilities and backups.",
    prior_label: "Business-continuity and disaster-recovery planning",
    disposition: "retained_rekeyed",
  },
] as const;

export const CYBER_COMPONENT_BY_SLUG: Readonly<Record<string, Cyber7123Component>> =
  Object.freeze(Object.fromEntries(CYBER_7123_COMPONENTS.map((c) => [c.slug, c])));

/**
 * § 7123(b)(1) and (b)(3) — assessment obligations that are NOT components.
 * The prior model had no representation of either.
 */
export interface CyberProgramObligation {
  key: string;
  label: string;
  citation: string;
  verbatim: string;
}

export const CYBER_PROGRAM_OBLIGATIONS: readonly CyberProgramObligation[] = [
  {
    key: "program_establishment",
    label: "Establishment, implementation, and maintenance of the cybersecurity program",
    citation: "11 CCR § 7123(b)(1)",
    verbatim:
      "The business\u2019s establishment, implementation, and maintenance of its cybersecurity program, including the related written documentation thereof (e.g., policies and procedures), that is appropriate to the business\u2019s size and complexity and the nature and scope of its processing activities, taking into account the state of the art and cost of implementing the components of a cybersecurity program",
  },
  {
    key: "program_enforcement",
    label: "Implementation and enforcement of compliance with the program",
    citation: "11 CCR § 7123(b)(3)",
    verbatim:
      "How the business implements and enforces compliance with its cybersecurity program as described in subsection (b)(1), the applicable components in subsection (c), and any additional components as set forth in subsection (d).",
  },
] as const;

/**
 * § 7122 — auditor qualification and independence CONDITIONS, one row per
 * condition (the § 15(a)-(e) / § 7220(c) pinning convention), never lumped.
 * `applies_when` narrows a condition to internal-auditor engagements.
 */
export interface CyberIndependenceCondition {
  key: string;
  label: string;
  citation: string;
  verbatim: string;
  applies_when: "always" | "internal_auditor_only";
}

export const CYBER_7122_CONDITIONS: readonly CyberIndependenceCondition[] = [
  {
    key: "qualified_objective_independent",
    label: "Qualified, objective, independent professional using accepted procedures and standards",
    citation: "11 CCR § 7122(a)",
    verbatim:
      "Every business required to complete a cybersecurity audit pursuant to this Article must do so using a qualified, objective, independent professional (\u201cauditor\u201d) using procedures and standards accepted in the profession of auditing, such as procedures and standards provided or adopted by the American Institute of Certified Public Accountants, the Public Company Accountability Oversight Board, the Information Systems Audit and Control Association, or the International Organization for Standardization.",
    applies_when: "always",
  },
  {
    key: "auditor_qualification",
    label: "Auditor qualification",
    citation: "11 CCR § 7122(a)(1)",
    verbatim:
      "To be qualified, an auditor must have knowledge of cybersecurity and how to audit a business\u2019s cybersecurity program.",
    applies_when: "always",
  },
  {
    key: "impartiality_and_non_participation",
    label: "Objective and impartial judgment; non-participation in assessed activities",
    citation: "11 CCR § 7122(a)(2)",
    verbatim:
      "The auditor may be internal or external to the business but must exercise objective and impartial judgment on all issues within the scope of the cybersecurity audit, must be free to make decisions and assessments without influence by the business being audited, including the business\u2019s owners, managers, or employees; and must not participate in activities that may compromise the auditor\u2019s independence.",
    applies_when: "always",
  },
  {
    key: "internal_auditor_reporting_line",
    label: "Internal-auditor reporting line, performance evaluation, and compensation",
    citation: "11 CCR § 7122(a)(3)",
    verbatim:
      "If a business uses an internal auditor, to maintain the auditor\u2019s independence, the highest-ranking auditor must report directly to a member of the business\u2019s executive management team who does not have direct responsibility for the business\u2019s cybersecurity program.",
    applies_when: "internal_auditor_only",
  },
  {
    key: "no_primary_reliance_on_management",
    label: "No finding may rely primarily on management assertions",
    citation: "11 CCR § 7122(d)",
    verbatim:
      "No finding of any cybersecurity audit may rely primarily on assertions or attestations by the business\u2019s management. Cybersecurity audit findings must rely primarily upon the specific evidence (including documents reviewed, sampling and testing performed, and interviews conducted) that the auditor deems appropriate.",
    applies_when: "always",
  },
  {
    key: "five_year_retention",
    label: "Five-year retention of audit documents",
    citation: "11 CCR § 7122(g)",
    verbatim:
      "The business and the auditor must retain all documents relevant to each cybersecurity audit for a minimum of five (5) years after completion of the cybersecurity audit.",
    applies_when: "always",
  },
] as const;

/** § 7124 — certification of completion, cited by the readiness determination. */
export const CYBER_7124_CITATION = "11 CCR § 7124";
