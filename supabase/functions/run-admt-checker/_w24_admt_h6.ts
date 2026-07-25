// ─────────────────────────────────────────────────────────────────────────
// WAVE24 ADMT H6 — GOVERNING-ANCHOR AUDIT.
// Dispatch W24-ADMT-H6-GOVERNING-ANCHOR-2026-07-25 (controller tick 18:53Z,
// five-lens TEAM-REVIEWED). Deploy turn on run-admt-checker ONLY.
//
// FINDING (h6_admt_governing_anchor, deterministic HIGH, recurring):
//   Definitional provisions of 11 CCR § 7001 (observed subdivisions:
//   § 7001(e), § 7001(e)(1), § 7001(ddd)) are cited as the SOLE governing
//   anchor on action/duty items. A definition may SUPPORT a duty but cannot
//   GOVERN it — the governing anchor must be a duty-imposing ADMT-subchapter
//   provision (Article 10/11 duty sections such as §§ 7150-7157, 7200-7222).
//
// SCOPE (this turn only):
//   • Deterministic post-pass over customer-visible duty/action entries in
//     the buckets: top_3_actions, priority_actions, deadline_table,
//     opt_out_gaps, notice_gaps, access_gaps, documentation_to_maintain.
//   • For each entry, collect every citation-bearing anchor
//     (`citation`, `regulatory_citation`, `subsection`,
//     `_va_stamp.subsection`, and any string entries under `citations`).
//     Detect the sole-§7001-anchor condition: at least one anchor present,
//     AND every anchor's resolved citation is "11 CCR § 7001" (regardless
//     of subdivision depth).
//   • Registry-first promotion: look up the entry's `proposition_key` in
//     the ADMT verified-authority registry. If the registry row's
//     `citation` is NOT § 7001 (i.e., a duty-imposing subchapter section),
//     install the row's byte-exact `citation`, `subsection`, and
//     `verbatim_quote` as the governing anchor. Retain § 7001 mentions in
//     narrative prose (they remain definitional support), but do NOT
//     re-emit them as the governing citation.
//   • If the entry has no proposition_key, or the registry row is missing,
//     or the registry row itself points at § 7001 → NEVER fabricate:
//     clear the citation-bearing anchor fields and route via the neutral
//     info-needed customer message from _shared/customer-messages.ts.
//     The prose surface is left alone; only the anchor fields are cleared.
//
// HARD CONSTRAINTS honored:
//   • Instrument s4 gc-2026-07-25-s4-eu-uk-ca-au-sg FROZEN — no edits to
//     prompts/rubrics/graders/goldens/contracts/fixtures/samples/registries/
//     corpus. Registry is READ-ONLY input here.
//   • Fail-open at every helper and the orchestrator (try/catch +
//     console.warn) — availability never blocked.
//   • Anchor-key immutability for prose walkers: this module's
//     registry-install path is the SOLE sanctioned writer of the
//     citation-bearing anchor fields, and only on a confirmed sole-§7001
//     hit. Every other key is untouched.
//   • Idempotent: entries tagged `_w24_h6_ran = true` after first pass;
//     second call is a no-op beyond stamp echo.
//   • Telemetry ONLY under `_meta.internal.admt_h6` (stamp-echo). The
//     whitelist serializer preserves `_meta.internal` verbatim; no schema
//     edit required (item-32 gate satisfied).
// ─────────────────────────────────────────────────────────────────────────

import {
  ADMT_VERIFIED_AUTHORITIES,
} from "../_shared/registry/admt-verified-authorities.ts";
import {
  resolveByPropositionKey,
} from "../_shared/verified-authority-resolver.ts";
import { renderMessage } from "../_shared/customer-messages.ts";

export const W24_ADMT_H6_STAMP = "w24-admt-h6@2026-07-25T18:59:16Z";

// Buckets that carry duty/action items on the customer surface.
const DUTY_BUCKETS = [
  "top_3_actions",
  "priority_actions",
  "deadline_table",
  "opt_out_gaps",
  "notice_gaps",
  "access_gaps",
  "documentation_to_maintain",
];

// Fields that carry citation-bearing anchors on a duty entry.
const CITATION_FIELDS = [
  "citation",
  "regulatory_citation",
  "subsection",
] as const;

const SECTION_7001_RE = /(?:^|[^0-9])7001(?:\b|\()/;

/** True if a citation string points at any subdivision of § 7001. */
export function isSection7001(cite: unknown): boolean {
  if (typeof cite !== "string") return false;
  const s = cite.trim();
  if (!s) return false;
  return SECTION_7001_RE.test(s);
}

/** Collect all citation strings the entry currently emits. Empty strings
 *  are dropped. Order: scalar fields, then stamp, then citations[]. */
export function collectAnchors(entry: any): string[] {
  const out: string[] = [];
  try {
    for (const f of CITATION_FIELDS) {
      const v = entry?.[f];
      if (typeof v === "string" && v.trim()) out.push(v.trim());
    }
    const stampSub = entry?._va_stamp?.subsection;
    if (typeof stampSub === "string" && stampSub.trim()) out.push(stampSub.trim());
    const cites = entry?.citations;
    if (Array.isArray(cites)) {
      for (const c of cites) {
        if (typeof c === "string" && c.trim()) out.push(c.trim());
        else if (c && typeof c === "object") {
          const cc = (c as any).citation ?? (c as any).subsection;
          if (typeof cc === "string" && cc.trim()) out.push(cc.trim());
        }
      }
    }
  } catch { /* fail-open */ }
  return out;
}

/** Sole-§7001-anchor test: at least one anchor present, and every anchor
 *  resolves to § 7001. */
export function hasSole7001Anchor(entry: any): boolean {
  const anchors = collectAnchors(entry);
  if (anchors.length === 0) return false;
  return anchors.every(isSection7001);
}

/** Registry-first resolution to a duty-imposing subchapter row (i.e., a
 *  row whose top-level `citation` is NOT § 7001). Returns null when no
 *  duty-imposing row is available. */
export function resolveDutyAnchor(propositionKey: unknown):
  | { citation: string; subsection: string; verbatim_quote: string }
  | null {
  if (typeof propositionKey !== "string" || !propositionKey.trim()) return null;
  try {
    const row = resolveByPropositionKey(ADMT_VERIFIED_AUTHORITIES, propositionKey);
    if (!row) return null;
    if (isSection7001(row.citation)) return null; // registry itself is definitional; do NOT promote
    return {
      citation: row.citation,
      subsection: row.subsection,
      verbatim_quote: row.verbatim_quote,
    };
  } catch (e) {
    console.warn("[w24-admt-h6] resolveDutyAnchor failed (non-fatal):", (e as Error)?.message);
    return null;
  }
}

/** Clear the citation-bearing anchor fields on an entry and stamp an
 *  unresolved marker. Prose fields are left alone. */
function clearAnchors(entry: any): void {
  for (const f of CITATION_FIELDS) {
    if (typeof entry[f] === "string") entry[f] = "";
  }
  if (entry._va_stamp && typeof entry._va_stamp === "object") {
    delete entry._va_stamp;
  }
  if (Array.isArray(entry.citations)) entry.citations = [];
  entry._va_stamp_unresolved = {
    proposition_key:
      typeof entry.proposition_key === "string" ? entry.proposition_key : "",
    reason: "h6_sole_7001_governing_anchor_unresolvable",
    message: renderMessage("unresolved.authority"),
  };
}

/** Install a promoted duty anchor onto the entry. Byte-exact registry
 *  quote + pinpoint. Marks the entry with an `_va_stamp` container so
 *  downstream telemetry (whitelist-serializer-preserved under
 *  _meta.internal) can attribute the promotion. */
function promoteAnchor(
  entry: any,
  row: { citation: string; subsection: string; verbatim_quote: string },
  originalAnchors: string[],
): void {
  entry.citation = row.subsection; // pinpoint form
  if (typeof entry.regulatory_citation === "string") {
    entry.regulatory_citation = row.subsection;
  }
  entry.subsection = row.subsection;
  entry.verbatim_quote = row.verbatim_quote;
  entry._va_stamp = {
    proposition_key:
      typeof entry.proposition_key === "string" ? entry.proposition_key : "",
    citation: row.citation,
    subsection: row.subsection,
    verbatim_quote: row.verbatim_quote,
    promoted_from: originalAnchors,
    source: "w24_admt_h6",
  };
}

// ── Diag + orchestrator ─────────────────────────────────────────────

export interface W24AdmtH6Diag {
  version: string;
  stamp: string;
  entries_scanned: number;
  sole_7001_anchor_hits: number;
  registry_promotions: number;
  info_needed_routes: number;
  stamp_echo_registered: boolean;
  details: Array<{
    bucket: string;
    entry_id: string;
    action: "promoted" | "info_needed";
    from: string[];
    to?: string;
    proposition_key?: string;
  }>;
}

function emptyDiag(): W24AdmtH6Diag {
  return {
    version: W24_ADMT_H6_STAMP,
    stamp: W24_ADMT_H6_STAMP,
    entries_scanned: 0,
    sole_7001_anchor_hits: 0,
    registry_promotions: 0,
    info_needed_routes: 0,
    stamp_echo_registered: false,
    details: [],
  };
}

function bucketRows(raw: unknown): any[] {
  if (Array.isArray(raw)) return raw;
  if (raw && typeof raw === "object" && Array.isArray((raw as any).rows)) {
    return (raw as any).rows;
  }
  return [];
}

export function applyW24AdmtH6(
  report: any,
  _intake: Record<string, unknown> | null | undefined,
): W24AdmtH6Diag {
  const diag = emptyDiag();
  if (!report || typeof report !== "object") {
    // still register the stamp echo on non-null, best-effort
    try {
      if (report && typeof report === "object") {
        const r = report as any;
        r._meta = (r._meta && typeof r._meta === "object") ? r._meta : {};
        r._meta.internal = (r._meta.internal && typeof r._meta.internal === "object")
          ? r._meta.internal : {};
        r._meta.internal.admt_h6 = diag;
        diag.stamp_echo_registered = true;
      }
    } catch { /* noop */ }
    return diag;
  }

  for (const bucket of DUTY_BUCKETS) {
    try {
      const rows = bucketRows((report as any)[bucket]);
      for (const entry of rows) {
        if (!entry || typeof entry !== "object") continue;
        if (entry._w24_h6_ran === true) continue;
        diag.entries_scanned++;
        try {
          if (!hasSole7001Anchor(entry)) {
            entry._w24_h6_ran = true;
            continue;
          }
          diag.sole_7001_anchor_hits++;
          const originalAnchors = collectAnchors(entry);
          const promoted = resolveDutyAnchor(entry.proposition_key);
          const entryId = String(entry.id ?? entry.element_id ?? entry.field ?? "");
          if (promoted) {
            promoteAnchor(entry, promoted, originalAnchors);
            diag.registry_promotions++;
            diag.details.push({
              bucket,
              entry_id: entryId,
              action: "promoted",
              from: originalAnchors,
              to: promoted.subsection,
              proposition_key: typeof entry.proposition_key === "string" ? entry.proposition_key : "",
            });
          } else {
            clearAnchors(entry);
            diag.info_needed_routes++;
            diag.details.push({
              bucket,
              entry_id: entryId,
              action: "info_needed",
              from: originalAnchors,
              proposition_key: typeof entry.proposition_key === "string" ? entry.proposition_key : "",
            });
          }
        } catch (e) {
          console.warn("[w24-admt-h6] entry failed (non-fatal):", (e as Error)?.message);
        }
        entry._w24_h6_ran = true;
      }
    } catch (e) {
      console.warn(`[w24-admt-h6] bucket ${bucket} failed (non-fatal):`, (e as Error)?.message);
    }
  }

  // Stamp-echo under _meta.internal (whitelist-preserved).
  try {
    const r = report as any;
    r._meta = (r._meta && typeof r._meta === "object") ? r._meta : {};
    r._meta.internal = (r._meta.internal && typeof r._meta.internal === "object")
      ? r._meta.internal : {};
    r._meta.internal.admt_h6 = diag;
    diag.stamp_echo_registered = true;
  } catch { /* noop */ }

  return diag;
}

export const _internals = {
  DUTY_BUCKETS,
  CITATION_FIELDS,
  isSection7001,
  collectAnchors,
  hasSole7001Anchor,
  resolveDutyAnchor,
};
