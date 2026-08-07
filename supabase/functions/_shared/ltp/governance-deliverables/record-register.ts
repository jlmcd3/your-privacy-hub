// ITEM 402 LEG C — GOVERNANCE RECORD REGISTER (single writers).
//
// RECORD-STATES-ONLY IDIOM (the admt-deliverables/record-register.ts precedent).
// Every builder below writes ONE sentence class: what the persisted record
// states about the surface, in the drafting voice, with no evaluation, no
// determination, no recommendation and no invented fact. A builder returns the
// empty string when the record does not supply its backing facts — the caller
// then leaves the surface's honest absence exactly as written.
//
// These are the ONLY writers the governance CSC pass may use to repair a
// surface. The pass itself never authors prose.

function s(v: unknown): string {
  if (v === null || v === undefined) return "";
  if (Array.isArray(v)) return v.map(s).filter(Boolean).join(", ");
  return String(v).trim();
}

function read(intake: unknown, key: string): string {
  if (!intake || typeof intake !== "object") return "";
  return s((intake as Record<string, unknown>)[key]);
}

/** DPO / accountability surface — `dpo_status`, the named owner, the context. */
export function buildDpoRecordStatement(intake: unknown): string {
  const status = read(intake, "dpo_status");
  const owner = read(intake, "remediation_default_owner");
  const context = read(intake, "additional_context");
  if (!status && !owner) return "";
  const parts: string[] = [];
  if (status) parts.push(`The record states the designation position as "${status}".`);
  if (owner) parts.push(`It names ${owner} as the accountable owner.`);
  if (context) {
    parts.push(
      `The record's own account of the arrangement is carried forward: ${context.slice(0, 600)}`,
    );
  }
  return parts.join(" ");
}

/** Vendor / Article 28 surface — `dpa_status`, `dpa_art28_verified`, nature. */
export function buildVendorArt28Statement(intake: unknown): string {
  const dpa = read(intake, "dpa_status");
  const verified = read(intake, "dpa_art28_verified");
  const nature = read(intake, "processing_nature");
  if (!dpa && !verified) return "";
  const parts: string[] = [];
  if (dpa) parts.push(`The record states processor-contract coverage as "${dpa}".`);
  if (verified) parts.push(`Article 28 clause verification is recorded as "${verified}".`);
  if (nature) parts.push(`The processors and their contractual basis are described in the record: ${nature.slice(0, 800)}`);
  return parts.join(" ");
}

/** Transfer surface — `transfer_status` and `transfer_mechanism`. */
export function buildTransferStatement(intake: unknown): string {
  const status = read(intake, "transfer_status");
  const mechanism = read(intake, "transfer_mechanism");
  if (!status) return "";
  const parts = [`The record states the transfer position as "${status}".`];
  if (mechanism) parts.push(`The mechanism the record names is "${mechanism}".`);
  return parts.join(" ");
}

/** Retention surface — the scope narrative carries the retention periods. */
export function buildRetentionStatement(intake: unknown): string {
  const scope = read(intake, "processing_scope");
  if (!scope) return "";
  return `The record states the scope and retention position: ${scope.slice(0, 900)}`;
}

/** Training surface — `training_status` and `training_ai_coverage`. */
export function buildTrainingStatement(intake: unknown): string {
  const status = read(intake, "training_status");
  const ai = read(intake, "training_ai_coverage");
  if (!status) return "";
  const parts = [`The record states the training position as "${status}".`];
  if (ai) parts.push(`Coverage of AI tools is recorded as "${ai}".`);
  return parts.join(" ");
}
