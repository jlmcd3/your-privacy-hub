// supabase/functions/generate-dpa/_local/registry/dpa-toms-taxonomy.ts
//
// S-D2 (doc 80, 2026-08-27) — the curated technical-and-organisational-
// measures taxonomy behind the new structured TOMs intake. EDPB Guidelines
// 07/2020 (126 excerpt rows ingested in the corpus) treats a contract that
// merely restates Art. 28(3)(c)'s "appropriate technical and organisational
// measures" as failing the provision: the contract must state the concrete
// measures. This taxonomy is what the customer selects from; the generated
// Annex II carries the SELECTED items (plus the customer's own details)
// verbatim — never a model-invented measures list, never the bare
// statutory phrase alone.
//
// Single source of truth: the (interim) prompt path and the S-D1 clause
// library both consume this module.

export interface TomsItem {
  readonly id: string;
  readonly label: string;
}

export const DPA_TOMS_TAXONOMY: readonly TomsItem[] = [
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

const BY_ID = new Map(DPA_TOMS_TAXONOMY.map((t) => [t.id, t] as const));

/** Resolve selected ids (unknown ids are dropped, never invented). */
export function resolveTomsSelection(ids: readonly string[] | undefined | null): TomsItem[] {
  if (!Array.isArray(ids)) return [];
  return ids.map((id) => BY_ID.get(String(id))).filter((t): t is TomsItem => Boolean(t));
}

/**
 * The intake-supplied TOMs rendered as the prompt/annex source block.
 * Empty selection + empty details → "" (the caller keeps its existing
 * professional-defaults regime and placeholder discipline).
 */
export function renderTomsBlock(
  selectedIds: readonly string[] | undefined | null,
  details: string | undefined | null,
): string {
  const items = resolveTomsSelection(selectedIds);
  const extra = String(details ?? "").trim();
  if (items.length === 0 && !extra) return "";
  const lines = items.map((t) => `- ${t.label}`);
  if (extra) lines.push(`- Customer-described specifics: ${extra}`);
  return `CUSTOMER-SUPPLIED TECHNICAL AND ORGANISATIONAL MEASURES (Annex II source — use these verbatim as the operative security baseline):\n${lines.join("\n")}`;
}
