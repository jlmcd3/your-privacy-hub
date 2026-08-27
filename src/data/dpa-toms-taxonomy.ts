// S-D2 (doc 80, 2026-08-27) — the DPA TOMs taxonomy, UI copy.
// LOCKSTEP RULE: ids and labels mirror
// supabase/functions/generate-dpa/_local/registry/dpa-toms-taxonomy.ts
// byte-for-byte; edit both together (the edge module is the source of
// truth the generated Annex II resolves against — an id absent there is
// silently dropped, never invented).

export const DPA_TOMS_TAXONOMY = [
  { id: "encryption_at_rest", label: "Encryption of personal data at rest" },
  { id: "encryption_in_transit", label: "Encryption of personal data in transit" },
  { id: "access_control", label: "Role-based access control with least-privilege provisioning" },
  { id: "mfa", label: "Multi-factor authentication for administrative and remote access" },
  { id: "logging_monitoring", label: "Security event logging and monitoring" },
  { id: "backup_resilience", label: "Backup and restoration procedures with defined recovery objectives" },
  { id: "vulnerability_mgmt", label: "Vulnerability management and patching cadence" },
  { id: "security_testing", label: "Periodic security testing (penetration tests or equivalent)" },
  { id: "personnel_confidentiality", label: "Personnel confidentiality undertakings and security training" },
  { id: "incident_response", label: "A documented security-incident response procedure" },
  { id: "data_segregation", label: "Logical segregation of the Controller's personal data" },
  { id: "secure_deletion", label: "Secure deletion and media-sanitisation procedures" },
  { id: "physical_security", label: "Physical access controls at processing locations" },
  { id: "pseudonymisation", label: "Pseudonymisation where compatible with the Services" },
] as const;
