// ─────────────────────────────────────────────────────────────────────────
// H6-ADMT-GOVERNING-ANCHOR (2026-07-26) — deploy-guarded fix on
// run-admt-checker ONLY. Discharges the long-queued
// `h6_admt_governing_anchor` class (ledger items 80 / 91 / 95 queue).
//
// DEFECT CLASSES (s4 wave findings):
//   (a) Definitional anchors — 11 CCR § 7001 subdivisions (observed:
//       § 7001(e)(1), § 7001(ddd)) — cited as the SOLE governing anchor
//       on ADMT action/duty entries (regression shape:
//       doc 731689ba-786b-4ab8-b1cc-f070eabb7ffb).
//   (b) 11 CCR § 7150(b)(3) — the ADMT-trigger verification anchor — cited
//       as the governing anchor for a sell/share documentation duty
//       (regression shape: doc 3746fd24-ef35-43c2-b831-c8eb74da9560).
//
// REMEDY DOCTRINE (mirrors _w25_admt_sanitizer_fix; ledger items 84c/88):
//   Deterministic post-emitter sanitizer. The model NEVER writes or edits
//   customer prose. Registry-first relabel against the tool's native corpus
//   (ADMT verified-authority registry; row.citation must NOT be
//   definitional and, for class (b), must NOT be § 7150(b)(3)). If no
//   duty-imposing anchor is resolvable → WHOLE-ENTRY EXCISION (structural
//   analog of item-84c whole-sentence excision — omission over invention).
//   Fail-open at every helper. Idempotent (`_h6v2_ran` guard).
//
// EXPLICITLY OUT OF SCOPE (per dispatch): doc-d98f46e3 "45-day timeline
// written around" finding (generative, not sanitizable); any rubric /
// grader / golden / contract / instrument / sample / registry / corpus
// EDIT (instrument gc-2026-07-25-s4-eu-uk-ca-au-sg FROZEN — registry is a
// READ-ONLY input); all other edge functions; T7 admt opening wiring.
//
// TELEMETRY: sequestered under `_meta.internal.admt_h6b` (own slot —
// distinct from existing `admt_h6` written by _w24_admt_h6). The
// whitelist serializer preserves `_meta.internal` verbatim.
// ─────────────────────────────────────────────────────────────────────────

import { ADMT_VERIFIED_AUTHORITIES } from "../_shared/registry/admt-verified-authorities.ts";
import { resolveByPropositionKey } from "../_shared/verified-authority-resolver.ts";

export const H6_ADMT_ANCHOR_STAMP = "h6-admt-governing-anchor@2026-07-26T01:30:00Z";
export const H6_ADMT_ANCHOR_VERSION = "1.0.0";

// Buckets that carry duty/action entries on the customer surface. Mirrors
// _w24_admt_h6 DUTY_BUCKETS exactly; this pass runs AFTER _w24_admt_h6 and
// treats any surviving definitional/misapplied anchor as terminal.
const DUTY_BUCKETS = [
  "top_3_actions",
  "priority_actions",
  "deadline_table",
  "opt_out_gaps",
  "notice_gaps",
  "access_gaps",
  "documentation_to_maintain",
] as const;

const CITATION_FIELDS = [
  "citation",
  "regulatory_citation",
  "subsection",
] as const;

// § 7001 (definitional) — matches any subdivision depth.
const SECTION_7001_RE = /(?:^|[^0-9])7001(?:\b|\()/;

// § 7150(b)(3) — ADMT-trigger verification anchor (specific pinpoint).
const SECTION_7150_B3_RE = /(?:^|[^0-9])7150\s*\(\s*b\s*\)\s*\(\s*3\s*\)/;

// Sell/share prose signal — used to detect class (b) misapplication of
// § 7150(b)(3) as the governing anchor for a sell/share documentation duty.
const SELL_SHARE_PROSE_RE =
  /\b(?:sell(?:ing|s)?|sold|shar(?:e|es|ing|ed))\b(?:[^.!?]{0,200}?)\b(?:personal\s+information|data|consumer(?:s|['\u2019]s)?)/i;

// Prose fields inspected for the sell/share signal (class (b)).
const PROSE_FIELDS = [
  "action",
  "obligation",
  "element",
  "finding",
  "requirement",
  "description",
  "text",
];

export function isDefinitional7001(cite: unknown): boolean {
  if (typeof cite !== "string") return false;
  const s = cite.trim();
  return s.length > 0 && SECTION_7001_RE.test(s);
}

export function is7150B3(cite: unknown): boolean {
  if (typeof cite !== "string") return false;
  const s = cite.trim();
  return s.length > 0 && SECTION_7150_B3_RE.test(s);
}

/** Collect citation strings from an entry's anchor-key fields. Empty
 *  strings dropped. */
export function collectEntryCitations(entry: any): string[] {
  const out: string[] = [];
  try {
    for (const f of CITATION_FIELDS) {
      const v = entry?.[f];
      if (typeof v === "string" && v.trim()) out.push(v.trim());
    }
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

function hasSellSharePriorityProse(entry: any): boolean {
  try {
    for (const f of PROSE_FIELDS) {
      const v = entry?.[f];
      if (typeof v === "string" && SELL_SHARE_PROSE_RE.test(v)) return true;
    }
  } catch { /* fail-open */ }
  return false;
}

/** Registry-first duty-anchor resolution: returns a non-definitional,
 *  non-§7150(b)(3) row, or null. */
export function resolveGoverningDutyAnchor(
  propositionKey: unknown,
): { citation: string; subsection: string; verbatim_quote: string } | null {
  if (typeof propositionKey !== "string" || !propositionKey.trim()) return null;
  try {
    const row = resolveByPropositionKey(
      ADMT_VERIFIED_AUTHORITIES,
      propositionKey,
    );
    if (!row) return null;
    if (isDefinitional7001(row.citation)) return null;
    if (isDefinitional7001(row.subsection)) return null;
    if (is7150B3(row.subsection)) return null;
    return {
      citation: row.citation,
      subsection: row.subsection,
      verbatim_quote: row.verbatim_quote,
    };
  } catch (e) {
    console.warn(
      "[h6-admt-anchor] resolveGoverningDutyAnchor failed (non-fatal):",
      (e as Error)?.message,
    );
    return null;
  }
}

function installAnchor(
  entry: any,
  row: { citation: string; subsection: string; verbatim_quote: string },
  originalAnchors: string[],
): void {
  entry.citation = row.subsection;
  if (typeof entry.regulatory_citation === "string") {
    entry.regulatory_citation = row.subsection;
  }
  entry.subsection = row.subsection;
  entry.verbatim_quote = row.verbatim_quote;
  entry._h6b_stamp = {
    action: "relabeled",
    from: originalAnchors,
    to: row.subsection,
    source: "h6_admt_anchor",
  };
}

// ── Diag + orchestrator ─────────────────────────────────────────────

export interface H6AdmtAnchorDiag {
  version: string;
  stamp: string;
  entries_scanned: number;
  class_a_hits: number;
  class_b_hits: number;
  registry_relabels: number;
  entries_excised: number;
  errors: number;
  stamp_echo_registered: boolean;
  details: Array<{
    bucket: string;
    entry_id: string;
    klass: "a_definitional" | "b_7150b3_misapplied";
    action: "relabeled" | "excised";
    from: string[];
    to?: string;
    proposition_key?: string;
  }>;
}

function emptyDiag(): H6AdmtAnchorDiag {
  return {
    version: H6_ADMT_ANCHOR_VERSION,
    stamp: H6_ADMT_ANCHOR_STAMP,
    entries_scanned: 0,
    class_a_hits: 0,
    class_b_hits: 0,
    registry_relabels: 0,
    entries_excised: 0,
    errors: 0,
    stamp_echo_registered: false,
    details: [],
  };
}

function bucketRows(raw: unknown): any[] | null {
  if (Array.isArray(raw)) return raw;
  return null;
}

export function applyH6AdmtAnchor(report: unknown): H6AdmtAnchorDiag {
  const diag = emptyDiag();
  if (!report || typeof report !== "object") return diag;
  const r = report as Record<string, any>;

  for (const bucket of DUTY_BUCKETS) {
    try {
      const rows = bucketRows(r[bucket]);
      if (!rows) continue;

      const kept: any[] = [];
      for (const entry of rows) {
        if (!entry || typeof entry !== "object") {
          kept.push(entry);
          continue;
        }
        if (entry._h6v2_ran === true) {
          kept.push(entry);
          continue;
        }
        diag.entries_scanned++;

        try {
          const citations = collectEntryCitations(entry);
          const entryId = String(
            entry.id ?? entry.element_id ?? entry.requirement_id ??
              entry.field ?? entry.obligation ?? "",
          );
          const pk = typeof entry.proposition_key === "string"
            ? entry.proposition_key
            : "";

          // CLASS (a): every citation on the entry is a § 7001 definitional
          // anchor. Requires at least one citation present.
          const classA = citations.length > 0 &&
            citations.every(isDefinitional7001);

          // CLASS (b): any citation is § 7150(b)(3) AND the entry's action
          // prose is a sell/share-documentation duty (misapplication —
          // (b)(3) verifies the ADMT trigger; sell/share is a different
          // proposition). Class (a) takes precedence when both fire.
          const classB = !classA &&
            citations.some(is7150B3) &&
            hasSellSharePriorityProse(entry);

          if (!classA && !classB) {
            entry._h6v2_ran = true;
            kept.push(entry);
            continue;
          }

          if (classA) diag.class_a_hits++;
          if (classB) diag.class_b_hits++;
          const klass: "a_definitional" | "b_7150b3_misapplied" = classA
            ? "a_definitional"
            : "b_7150b3_misapplied";

          const promoted = resolveGoverningDutyAnchor(pk);
          if (promoted) {
            installAnchor(entry, promoted, citations);
            diag.registry_relabels++;
            diag.details.push({
              bucket,
              entry_id: entryId,
              klass,
              action: "relabeled",
              from: citations,
              to: promoted.subsection,
              proposition_key: pk,
            });
            entry._h6v2_ran = true;
            kept.push(entry);
          } else {
            diag.entries_excised++;
            diag.details.push({
              bucket,
              entry_id: entryId,
              klass,
              action: "excised",
              from: citations,
              proposition_key: pk,
            });
            // whole-entry excision — do NOT push into kept.
          }
        } catch (e) {
          diag.errors++;
          console.warn(
            "[h6-admt-anchor] entry failed (non-fatal):",
            (e as Error)?.message,
          );
          // fail-open: keep the entry as-is on unexpected error.
          try { entry._h6v2_ran = true; } catch { /* noop */ }
          kept.push(entry);
        }
      }

      if (kept.length !== rows.length) {
        r[bucket] = kept;
      }
    } catch (e) {
      diag.errors++;
      console.warn(
        `[h6-admt-anchor] bucket ${bucket} failed (non-fatal):`,
        (e as Error)?.message,
      );
    }
  }

  // Stamp-echo under _meta.internal.admt_h6b (own slot).
  try {
    r._meta = (r._meta && typeof r._meta === "object") ? r._meta : {};
    r._meta.internal = (r._meta.internal && typeof r._meta.internal === "object")
      ? r._meta.internal
      : {};
    r._meta.internal.admt_h6b = diag;
    diag.stamp_echo_registered = true;
  } catch { /* noop */ }

  return diag;
}

export const _internals = {
  DUTY_BUCKETS,
  CITATION_FIELDS,
  SECTION_7001_RE,
  SECTION_7150_B3_RE,
  SELL_SHARE_PROSE_RE,
  PROSE_FIELDS,
  isDefinitional7001,
  is7150B3,
  collectEntryCitations,
  hasSellSharePriorityProse,
  resolveGoverningDutyAnchor,
};
