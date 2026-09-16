// DPIA transfer rows — ONE reader for every producer (DPIA Intake Master
// Review 2026-09-15, F05 / F11).
//
// The contract's snake_case row (recipient / destination_country /
// origin_regime / transfer_mechanism / dpf_certified / uk_extension_certified /
// notes) is canonical and is what src/pages/DPIAFramework.tsx emits. Older
// drafts carry the page's former camelCase row (importer / destination /
// originRegime / dpfCertified / ukExtensionCertified); the resolver's own
// TransferFlow shape (importerEntity / destinationCountry / importerDpfCertified)
// also appears in fixtures. Nothing is dropped: every row is read, and a row
// the resolver cannot place is reported as incomplete rather than filtered
// away silently.
//
// Pure, deterministic, no I/O. Deno-side; the browser mirror is
// src/lib/dpiaIntake.ts (normaliseTransferRow).

import { canonicalCountryCode } from "./dpia-jurisdiction-registry.ts";

export type OriginRegime = "EU" | "UK";

export interface CanonicalTransferRow {
  recipient: string;
  /** Canonical registry code ("UK" for GB/GBR/UK), or "" when absent or a picker sentinel (OTHER / UNKNOWN). */
  destination_country: string;
  /** The destination exactly as stored (kept for the record). */
  destination_raw: string;
  origin_regime: OriginRegime;
  /** True when the row itself named the origin; false when it fell back to the record's regime. */
  origin_stated: boolean;
  transfer_mechanism: string;
  notes: string;
  dpf_certified: boolean;
  uk_extension_certified: boolean;
  /** The resolver can name a mechanism: a destination is identified. */
  complete: boolean;
  /** What the row still lacks for a complete record (destination, recipient, origin). */
  missing: string[];
}

export const TRANSFER_PRESENCE_YES = "Yes — data leaves the EEA or the UK";
export const TRANSFER_PRESENCE_NO = "No — all processing stays within the EEA and the UK";
export const TRANSFER_PRESENCE_UNASSESSED = "Not yet assessed";

function s(v: unknown): string {
  return typeof v === "string" ? v : v == null ? "" : String(v);
}
function flag(v: unknown): boolean | undefined {
  if (typeof v === "boolean") return v;
  if (v === "true") return true;
  if (v === "false") return false;
  return undefined;
}

const DPF_TEXT = /\b(eu[-\s]?u\.?s\.?\s+data\s+privacy\s+framework|data\s+privacy\s+framework|\bdpf\b)\b/i;
const UK_EXT_TEXT = /\b(uk\s+extension|uk[-\s]?u\.?s\.?\s+data\s+bridge|data\s+bridge)\b/i;

/**
 * Reads one row in any of the three shapes. `recordRegime` supplies the
 * origin only where the row does not state it (the PROMPT 9E rule).
 */
export function readTransferRow(raw: unknown, recordRegime: OriginRegime = "EU"): CanonicalTransferRow {
  const f = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const destRaw = s(f.destination_country ?? f.destination ?? f.destinationCountry).trim();
  const destination = canonicalCountryCode(destRaw);
  const originRaw = s(f.origin_regime ?? f.originRegime).toUpperCase().trim();
  const originStated = originRaw === "EU" || originRaw === "UK";
  const origin: OriginRegime = originStated ? (originRaw as OriginRegime) : recordRegime;
  const recipient = s(f.recipient ?? f.importer ?? f.importerEntity ?? f.importer_entity).trim();
  const mechanism = [f.transfer_mechanism, f.mechanism, f.transferMechanism, f.safeguard].map(s).join(" ").trim();
  const notes = s(f.notes ?? f.note).trim();
  const dpfFlag = flag(f.dpf_certified ?? f.dpfCertified ?? f.importerDpfCertified);
  const ukFlag = flag(f.uk_extension_certified ?? f.ukExtensionCertified ?? f.importerUkExtensionCertified);
  // Mechanism text corroborates certification ONLY where the booleans are absent.
  const dpf = dpfFlag == null ? DPF_TEXT.test(mechanism) : dpfFlag;
  const ukExt = ukFlag == null ? UK_EXT_TEXT.test(mechanism) : ukFlag;
  const missing: string[] = [];
  if (!destination) missing.push("destination_country");
  if (!recipient) missing.push("recipient");
  if (!originStated) missing.push("origin_regime");
  return {
    recipient,
    destination_country: destination,
    destination_raw: destRaw,
    origin_regime: origin,
    origin_stated: originStated,
    transfer_mechanism: mechanism,
    notes,
    dpf_certified: dpf,
    uk_extension_certified: ukExt,
    complete: !!destination,
    missing,
  };
}

export function readTransferRows(raw: unknown, recordRegime: OriginRegime = "EU"): CanonicalTransferRow[] {
  return Array.isArray(raw) ? raw.map((r) => readTransferRow(r, recordRegime)) : [];
}

/**
 * What the record says about transfer presence, read together with the rows:
 *   "yes"        — presence Yes, or rows present with no presence answer (legacy record)
 *   "no"         — presence No with no rows, or (legacy) no presence answer and no rows
 *   "unassessed" — presence Not yet assessed
 *   "conflict"   — presence No / unassessed but rows are listed
 */
export function transferPresenceState(
  presence: unknown,
  rows: readonly CanonicalTransferRow[],
): "yes" | "no" | "unassessed" | "conflict" {
  const p = s(presence).trim();
  if (p === TRANSFER_PRESENCE_YES) return "yes";
  if (p === TRANSFER_PRESENCE_NO) return rows.length ? "conflict" : "no";
  if (p === TRANSFER_PRESENCE_UNASSESSED) return rows.length ? "conflict" : "unassessed";
  return rows.length ? "yes" : "no";
}
