/**
 * ITEM 422-B DEFECT 1 — REGISTRY-RESOLVED CITATIONS ON THE TYPED PRIORITY
 * ACTIONS.
 *
 * The item422 pilot proved the typed emission works and, by typing the field,
 * made a long-standing defect visible: `priority_actions[].citation` was
 * MODEL-AUTHORED (rank 1 null; § 7222(b)(3) asserted three times, twice for a
 * duty that lives at § 7222(b)(4)). The fix is structural, not editorial:
 * a priority action's pinpoint is RESOLVED FROM THE VERIFIED-AUTHORITY
 * REGISTRY exactly as `top_3_actions` already resolves it — never trusted
 * from the model.
 *
 * RESOLUTION ORDER (byte-identical semantics to the W9-ADMT-WIRE stamp pass):
 *   1. `proposition_key` present and in the registry  → citation := row.subsection.
 *   2. KEYLESS FILL — no/unknown key but the entry carries a citation string
 *      that reverse-resolves to exactly one registry row → citation :=
 *      row.subsection AND `proposition_key` is back-filled from that row.
 *   3. ANCHOR DOWNGRADE — anything else: the model-authored pinpoint is NOT
 *      shipped. The entry takes the registry's honest downgrade (the neutral
 *      ADMT-subchapter fallback), and `proposition_key` is set to "" so no
 *      reader believes a proposition resolved.
 *
 * A null/undefined citation is impossible on output: every record carries a
 * string (registry pinpoint or the honest fallback).
 *
 * `top_3_actions` is NOT read and NOT written here.
 * Deterministic. No I/O, no clock, no model. Fail-open.
 */

import {
  resolveByCitationString,
  resolveByPropositionKey,
  type VerifiedAuthorityRegistry,
} from "../../../_shared/verified-authority-resolver.ts";

export const ADMT_ACTION_CITATION_VERSION = "admt-action-citations@item422b-2026-08-09";

/** The registry's honest downgrade — the same phrase the W-battery uses. */
export const ADMT_SUBCHAPTER_FALLBACK = "the applicable ADMT-subchapter provision";

export interface AdmtActionCitationDiag {
  version: string;
  /** entries whose citation came from `proposition_key`. */
  resolved_by_key: number;
  /** entries whose citation reverse-resolved and back-filled the key. */
  keyless_filled: number;
  /** entries whose model-authored pinpoint was replaced by the fallback. */
  anchor_downgraded: number;
  /** entries that already carried the fallback / no pinpoint at all. */
  untouched: number;
  total: number;
  crashed: boolean;
}

function str(v: unknown): string {
  return typeof v === "string" ? v.replace(/\s+/g, " ").trim() : "";
}

/**
 * Resolve ONE typed action record in place. Returns the outcome class.
 */
export function resolveActionCitation(
  entry: Record<string, unknown>,
  reg: VerifiedAuthorityRegistry,
): "resolved_by_key" | "keyless_filled" | "anchor_downgraded" | "untouched" {
  const pk = str(entry.proposition_key);
  if (pk) {
    const row = resolveByPropositionKey(reg, pk);
    if (row) {
      entry.citation = row.subsection;
      entry.proposition_key = row.proposition_key;
      entry._citation_source = "registry_key";
      return "resolved_by_key";
    }
  }

  const cit = str(entry.citation);
  if (cit && cit !== ADMT_SUBCHAPTER_FALLBACK) {
    let rev: ReturnType<typeof resolveByCitationString> = null;
    try { rev = resolveByCitationString(reg, cit); } catch { rev = null; }
    if (rev) {
      entry.citation = rev.subsection;
      entry.proposition_key = rev.proposition_key;
      entry._citation_source = "registry_reverse";
      return "keyless_filled";
    }
    // Unverifiable model-authored pinpoint — downgrade, never ship a guess.
    entry.citation = ADMT_SUBCHAPTER_FALLBACK;
    entry.proposition_key = "";
    entry._citation_source = "registry_downgrade";
    return "anchor_downgraded";
  }

  // No pinpoint asserted (null, "", or already the fallback): the honest
  // downgrade stands. `citation` becomes a string so it is never null.
  entry.citation = cit || ADMT_SUBCHAPTER_FALLBACK;
  if (!str(entry.proposition_key)) entry.proposition_key = "";
  entry._citation_source = entry._citation_source ?? "no_proposition";
  return "untouched";
}

/**
 * THE SINGLE RESOLUTION SITE for `priority_actions` citations. Runs directly
 * after the item422 typed-record normaliser, on records only.
 */
export function resolveAdmtActionCitations(
  report: unknown,
  reg: VerifiedAuthorityRegistry,
): AdmtActionCitationDiag {
  const diag: AdmtActionCitationDiag = {
    version: ADMT_ACTION_CITATION_VERSION,
    resolved_by_key: 0,
    keyless_filled: 0,
    anchor_downgraded: 0,
    untouched: 0,
    total: 0,
    crashed: false,
  };
  try {
    const r = report as Record<string, unknown> | null;
    if (!r || typeof r !== "object") return diag;
    const raw = r.priority_actions;
    if (!Array.isArray(raw) || raw.length === 0) return diag;
    for (const entry of raw) {
      if (!entry || typeof entry !== "object" || Array.isArray(entry)) continue;
      const cls = resolveActionCitation(entry as Record<string, unknown>, reg);
      diag[cls]++;
      diag.total++;
    }
  } catch (e) {
    diag.crashed = true;
    console.warn("[admt-action-citations] failed (non-fatal):", (e as Error)?.message);
  }
  return diag;
}
