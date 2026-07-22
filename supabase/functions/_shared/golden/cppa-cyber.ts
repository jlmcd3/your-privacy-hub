// QB-P20 — cppa-cyber golden set. 3 fixtures.
// Adversarial: key evidence recorded under a SIBLING control's notes
// (encryption evidence written into c1_auth notes instead of c2_encryption).
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
const controls = (notesByKey: Record<string,string>, maturity = "Implemented across organization") =>
  SLUGS.map(k => ({ key: k, label: LABEL[k], maturity, notes: notesByKey[k] ?? "Documented; reviewed quarterly." }));

export const CPPA_CYBER_GOLDEN: GoldenCase[] = [
  {
    id: "cyber-nist-mid-tuning",
    tool: "cppa-cyber",
    set: "tuning",
    intake: {
      profile: { entity_name: "Meridian SaaS Inc.", industry: "SaaS", incidents_12mo: "1", framework: "NIST CSF", last_audit: "Within 12 months" },
      controls: controls({
        c2_encryption: "AES-256 at rest (RDS/S3); TLS 1.3 in transit; KMS-managed keys rotated annually.",
        c17_incident: "Playbook tested in tabletop 2026-03; MTTR 4h.",
      }),
    },
    assertions: [
      { kind: "must_include", pattern: "NIST CSF", flags: "i", label: "framework named" },
    ],
  },
  {
    id: "cyber-iso-strong-tuning",
    tool: "cppa-cyber",
    set: "tuning",
    intake: {
      profile: { entity_name: "Helios Fintech", industry: "Financial services", incidents_12mo: "None", framework: "ISO 27001", last_audit: "Within 12 months" },
      controls: controls({}, "Implemented with continuous monitoring"),
    },
    assertions: [
      { kind: "must_include", pattern: "ISO\\s*27001", flags: "i", label: "framework named" },
    ],
  },
  {
    id: "cyber-sibling-notes-adversarial",
    tool: "cppa-cyber",
    set: "adversarial",
    intake: {
      profile: { entity_name: "Cascade Health", industry: "Healthcare", incidents_12mo: "2–5", framework: "HITRUST", last_audit: "12–24 months ago" },
      // Encryption evidence written into c1_auth notes (sibling drift):
      controls: controls({
        c1_auth: "MFA via Okta. Encryption: AES-256 at rest with KMS-managed keys; TLS 1.3 in transit.",
        c2_encryption: "See auth notes.",
      }),
    },
    assertions: [
      { kind: "must_include", pattern: "encryption|AES", flags: "i",
        label: "encryption evidence surfaces even though written under c1_auth" },
    ],
  },
];
