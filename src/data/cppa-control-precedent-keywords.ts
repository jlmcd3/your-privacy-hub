// Sprint 3 — Breach Precedent Map (dynamic)
// Maps each of the 18 § 7122(a) cyber controls to deterministic keyword patterns
// used to search the existing `enforcement_actions` table. No new ingestion,
// no AI: pure keyword matching against `key_compliance_failure` and `violation`,
// scoped to actions with CCPA/CPPA relevance.

export type ControlPrecedentKeywords = {
  control_key: string; // matches CONTROLS[].key in CPPACybersecurity.tsx
  control_label: string;
  // Each pattern is a single substring (case-insensitive). A row matches if ANY
  // pattern is found in `key_compliance_failure` OR `violation`.
  patterns: string[];
};

export const CPPA_CONTROL_PRECEDENT_KEYWORDS: ControlPrecedentKeywords[] = [
  { control_key: "c1_auth", control_label: "Authentication and access controls",
    patterns: ["mfa", "multi-factor", "multifactor", "password", "credential stuffing", "weak authentication", "no authentication"] },
  { control_key: "c2_encryption", control_label: "Encryption of personal information",
    patterns: ["encryption", "unencrypted", "plaintext", "cleartext", "in transit", "at rest"] },
  { control_key: "c3_zero_trust", control_label: "Zero-trust architecture",
    patterns: ["zero trust", "least privilege", "lateral movement", "implicit trust"] },
  { control_key: "c4_account_mgmt", control_label: "Account management and access control",
    patterns: ["account management", "deprovision", "stale account", "orphaned account", "privileged access", "access review"] },
  { control_key: "c5_inventory", control_label: "Inventory of personal information and systems",
    patterns: ["data inventory", "data mapping", "asset inventory", "unknown system", "shadow it"] },
  { control_key: "c6_secure_config", control_label: "Secure configuration of hardware and software",
    patterns: ["misconfiguration", "misconfigured", "default credential", "default password", "hardening", "exposed s3", "open bucket"] },
  { control_key: "c7_vuln_mgmt", control_label: "Vulnerability management and patching",
    patterns: ["unpatched", "patch", "vulnerability management", "cve", "known vulnerability", "out of date"] },
  { control_key: "c8_audit_logs", control_label: "Audit-log management",
    patterns: ["audit log", "logging", "log retention", "no logs", "insufficient logging"] },
  { control_key: "c9_network_mon", control_label: "Network monitoring and defence",
    patterns: ["network monitoring", "intrusion detection", "siem", "no monitoring", "undetected"] },
  { control_key: "c10_anti_malware", control_label: "Anti-malware protections",
    patterns: ["malware", "ransomware", "endpoint protection", "antivirus", "edr"] },
  { control_key: "c11_segmentation", control_label: "Network segmentation",
    patterns: ["segmentation", "flat network", "vlan", "network segregation"] },
  { control_key: "c12_physical", control_label: "Limitation of physical access",
    patterns: ["physical access", "physical security", "stolen device", "lost laptop", "stolen laptop"] },
  { control_key: "c13_secure_dev", control_label: "Secure development of software",
    patterns: ["sql injection", "insecure code", "secure development", "code review", "input validation", "xss"] },
  { control_key: "c14_third_party", control_label: "Oversight of service providers and third parties",
    patterns: ["service provider", "third party", "vendor", "subprocessor", "contractor", "supply chain"] },
  { control_key: "c15_retention", control_label: "Retention schedules and secure disposal",
    patterns: ["retention", "data minimization", "data minimisation", "disposal", "deletion", "retained beyond"] },
  { control_key: "c16_training", control_label: "Cybersecurity awareness, education and training",
    patterns: ["training", "awareness", "phishing", "social engineering"] },
  { control_key: "c17_incident", control_label: "Incident response and post-incident analysis",
    patterns: ["incident response", "breach notification", "delayed notification", "failed to notify", "incident plan"] },
  { control_key: "c18_continuity", control_label: "Business continuity and disaster recovery",
    patterns: ["backup", "disaster recovery", "business continuity", "no backup", "ransomware recovery"] },
];

export function getPrecedentKeywordsFor(controlKey: string): string[] {
  return CPPA_CONTROL_PRECEDENT_KEYWORDS.find((c) => c.control_key === controlKey)?.patterns ?? [];
}
