// ─────────────────────────────────────────────────────────────────────────
// H7B-ADMT-CITATION-ANCHOR-RELABEL (2026-07-26) — deploy turn on
// run-admt-checker. Discharges the H7b queued fix from ledger item 95
// (wave-27 residual): H7 (`_h7_admt_blanket_range`) only touches prose
// strings and skips ANCHOR_KEYS by design, so the blanket range
// "11 CCR §§ 7200–7222" survives in the `citation` anchor field of
// notice_gaps and opt_out_gaps entries (verbatim fixtures pinned in
// _h7b_citation_relabel.test.ts from wave-27 docs 233b0a2f and 523107f3).
//
// SCOPE (BINDING — narrower than H7):
//   • Only the top-level `citation` field on each entry in TWO subtrees:
//       report.notice_gaps[].citation  →  "11 CCR § 7220"
//       report.opt_out_gaps[].citation →  "11 CCR § 7221"
//   • Nothing else. Not other buckets. Not other anchor keys. Not prose.
//     Prose remains H7's domain; H7 runs first and is untouched.
//
// CORPUS PIN-TEST (controller-verified 2026-07-26T01:17Z, BINDING):
//   • cppa_authorities row "11 CCR § 7220" (Pre-use Notice Requirements)
//     — id=45ff3c31-2534-42eb-86db-b383103debf0, status=current.
//   • cppa_authorities row "11 CCR § 7221" (Requests to Opt-Out of ADMT)
//     — id=4db8ee47-658c-471f-b730-f3f87a861138, status=current.
//   • Subdivision-level texts remain UNAPPROVED corpus; this module
//     NEVER emits subdivision pinpoints like § 7220(a) or § 7221(c).
//     If a citation already carries a subdivision (e.g. "11 CCR §
//     7220(c)(1)"), it is LEFT UNCHANGED — it is not a blanket range.
//
// DISCIPLINE:
//   • Deterministic; deploy-guarded seam identical to H7.
//   • Fail-open at every helper and the orchestrator.
//   • Idempotent — entries tagged `_h7b_citation_relabel_ran = true`.
//   • Telemetry ONLY under `_meta.internal.admt_h7b`.
//   • No underscore-prefixed keys on customer surfaces (LEAK-PREV
//     strip preserved downstream).
// ─────────────────────────────────────────────────────────────────────────

import { BLANKET_RANGE_RE } from "./_h7_admt_blanket_range.ts";

export const H7B_ADMT_CITATION_RELABEL_VERSION =
  "h7b-admt-citation-relabel-2026-07-26";
export const H7B_ADMT_CITATION_RELABEL_STAMP =
  "h7b-admt-citation-relabel@2026-07-26T01:20:00Z";

const SECTION_NOTICE = "11 CCR § 7220";
const SECTION_OPTOUT = "11 CCR § 7221";

// A citation is "blanket-only" when, after trimming, it matches the
// blanket range and contains no subdivision letter/number after 7222.
// We reuse H7's regex for the range detection and then require that
// the trimmed string does NOT include a subdivision pinpoint suffix.
export function isBlanketOnlyCitation(value: unknown): boolean {
  if (typeof value !== "string") return false;
  const s = value.trim();
  if (s.length === 0) return false;
  // Fresh lastIndex each call — BLANKET_RANGE_RE is /g.
  BLANKET_RANGE_RE.lastIndex = 0;
  if (!BLANKET_RANGE_RE.test(s)) return false;
  // Reject anything that pins a subdivision after 7222 (e.g. "7222(a)"
  // is impossible in the blanket form, but safeguard anyway).
  if (/7222\s*\(/.test(s)) return false;
  return true;
}

export interface H7bDiag {
  version: string;
  stamp: string;
  build_stamp: string;
  citation_relabeled_notice: number;
  citation_relabeled_optout: number;
  entries_scanned_notice: number;
  entries_scanned_optout: number;
  errors: number;
}

function emptyDiag(buildStamp: string): H7bDiag {
  return {
    version: H7B_ADMT_CITATION_RELABEL_VERSION,
    stamp: H7B_ADMT_CITATION_RELABEL_STAMP,
    build_stamp: buildStamp,
    citation_relabeled_notice: 0,
    citation_relabeled_optout: 0,
    entries_scanned_notice: 0,
    entries_scanned_optout: 0,
    errors: 0,
  };
}

function bucketRows(raw: unknown): any[] {
  if (Array.isArray(raw)) return raw;
  if (raw && typeof raw === "object" && Array.isArray((raw as any).rows)) {
    return (raw as any).rows;
  }
  return [];
}

function relabelBucket(
  rows: any[],
  section: string,
  diag: H7bDiag,
  which: "notice" | "optout",
): void {
  for (const entry of rows) {
    if (!entry || typeof entry !== "object") continue;
    try {
      if (which === "notice") diag.entries_scanned_notice++;
      else diag.entries_scanned_optout++;
      if (entry._h7b_citation_relabel_ran === true) continue;
      const cur = (entry as any).citation;
      if (isBlanketOnlyCitation(cur)) {
        (entry as any).citation = section;
        if (which === "notice") diag.citation_relabeled_notice++;
        else diag.citation_relabeled_optout++;
      }
      entry._h7b_citation_relabel_ran = true;
    } catch (e) {
      diag.errors++;
      console.warn(
        `[h7b-admt-citation-relabel] entry failed (non-fatal, ${which}):`,
        (e as Error)?.message,
      );
    }
  }
}

export function applyH7bAdmtCitationRelabel(
  report: any,
  buildStamp = "unknown",
): H7bDiag {
  const diag = emptyDiag(buildStamp);
  if (!report || typeof report !== "object") return diag;

  try {
    relabelBucket(bucketRows((report as any).notice_gaps), SECTION_NOTICE, diag, "notice");
  } catch (e) {
    diag.errors++;
    console.warn(
      "[h7b-admt-citation-relabel] notice_gaps bucket failed (non-fatal):",
      (e as Error)?.message,
    );
  }
  try {
    relabelBucket(bucketRows((report as any).opt_out_gaps), SECTION_OPTOUT, diag, "optout");
  } catch (e) {
    diag.errors++;
    console.warn(
      "[h7b-admt-citation-relabel] opt_out_gaps bucket failed (non-fatal):",
      (e as Error)?.message,
    );
  }

  try {
    const r = report as any;
    r._meta = (r._meta && typeof r._meta === "object") ? r._meta : {};
    r._meta.internal = (r._meta.internal && typeof r._meta.internal === "object")
      ? r._meta.internal : {};
    r._meta.internal.admt_h7b = diag;
  } catch {
    diag.errors++;
  }

  return diag;
}

export const _internals = {
  SECTION_NOTICE,
  SECTION_OPTOUT,
};
