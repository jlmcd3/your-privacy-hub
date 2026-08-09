/**
 * ITEM 422-C DEFECT 3 — OUT-OF-RANGE CITATION SWEEP.
 *
 * The a2c66373 pilot shipped `deadline_table` carrying 11 CCR § 7021(b) for
 * the 45-day access-response timeline. § 7021 is real corpus (Article 3,
 * consumer-request handling) but it lies OUTSIDE the verified ADMT range this
 * product may pinpoint: § 7001, §§ 7150–7157, §§ 7200–7222. The items-392–396
 * invented-section law applies: where the substantive duty is real but its
 * section is outside the verified range, the duty is STATED and the pinpoint
 * is WITHHELD — never an unverified-for-this-product section number, never a
 * corpus edit.
 *
 * The class escaped because the W9 G4 detector is a PROSE walker that skips
 * every structured citation key (`citation`, `subsection`, `verbatim_quote`,
 * `proposition_key` are all in its RESERVED_KEYS set) — so a §-token living in
 * a structured field was never swept anywhere. This module closes both halves:
 * it sweeps structured citation fields AND prose, across the enumerated list
 * of every citation-bearing surface in the ADMT report schema.
 *
 * SWEPT SURFACES — see `ADMT_SWEPT_CITATION_SURFACES` below; the linkage test
 * (tests/edge/item422c/sweep-coverage.test.ts) re-derives the citation-bearing
 * surfaces from ADMT_REPORT_SCHEMA and asserts every one of them is listed.
 *
 * Deterministic. No I/O, no clock, no model. Idempotent. Fail-open.
 */

export const ADMT_RANGE_SWEEP_VERSION = "admt-citation-range-sweep@item422c-2026-08-09";

/** The registry's honest downgrade phrase (same string the W-battery uses). */
export const ADMT_SUBCHAPTER_FALLBACK = "the applicable ADMT-subchapter provision";

/** Provenance recorded on any entry whose pinpoint was withheld. */
export const OUT_OF_RANGE_REASON = "out_of_verified_admt_range";

/** Verified ADMT pinpoint range: § 7001, §§ 7150–7157, §§ 7200–7222. */
export function isInVerifiedAdmtRange(section: number): boolean {
  if (!Number.isFinite(section)) return false;
  if (section === 7001) return true;
  if (section >= 7150 && section <= 7157) return true;
  if (section >= 7200 && section <= 7222) return true;
  return false;
}

/** Any "11 CCR § 7xxx(...)" pinpoint token. Civ. Code cites are not swept. */
const CCR_TOKEN_RE = /(?:11\s*CCR\s*)?§+\s*(7\d{3})((?:\s*\([a-z0-9]+\))*)/gi;

/** Does this string carry a CCR §-7xxx pinpoint outside the verified range? */
export function hasOutOfRangeCitation(text: unknown): boolean {
  if (typeof text !== "string" || !text) return false;
  CCR_TOKEN_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = CCR_TOKEN_RE.exec(text)) !== null) {
    if (!isInVerifiedAdmtRange(Number(m[1]))) return true;
  }
  return false;
}

/** Replace out-of-range pinpoints in PROSE with the neutral anchor phrase. */
export function neutralizeProse(text: string): string {
  return text.replace(CCR_TOKEN_RE, (full, sec) =>
    isInVerifiedAdmtRange(Number(sec)) ? full : ADMT_SUBCHAPTER_FALLBACK,
  );
}

/**
 * THE SWEPT SURFACES. Every citation-bearing surface in the ADMT report
 * schema. Entry-list surfaces and structured objects alike.
 */
export const ADMT_SWEPT_CITATION_SURFACES: readonly string[] = [
  // finding / action buckets (FINDING_ENTRY_KEYS)
  "notice_gaps",
  "opt_out_gaps",
  "access_gaps",
  "documentation_to_maintain",
  "priority_actions",
  "top_3_actions",
  "information_needed",
  "annotations",
  "citation_ledger",
  "enforcement_precedents",
  // analytic deliverables
  "notice_element_findings",
  "exception_qualification",
  "access_readiness_findings",
  "authority_exhibit",
  // deterministic slots — the surface this item's CRITICAL defect shipped on
  "deadline_table",
  "applicability_verdict",
  "adequacy_finding",
  // structured objects
  "scope_analysis",
  "consolidated_notice_analysis",
  "aggregate_access_response",
  "risk_assessment_obligation",
  "enforcement_context",
  "determination",
  "exception_identification",
];

/** Structured pinpoint keys. A withheld pinpoint clears its sibling quote. */
const PINPOINT_KEYS = new Set([
  "citation", "citations", "regulatory_citation", "subsection",
  "provision", "statutory_basis", "authority", "deadline_basis",
]);

/** Determination machinery — never rewritten by this sweep. */
const MACHINERY_KEYS = new Set([
  "decision", "rule_ids", "status", "verdict", "conclusion", "label",
  "passed", "severity", "id", "element_id", "requirement_id", "check_id",
]);

export interface AdmtRangeSweepDiag {
  version: string;
  surfaces_swept: number;
  pinpoints_withheld: number;
  quotes_withheld: number;
  prose_neutralized: number;
  entries_marked: number;
  crashed: boolean;
  /** surface → count of withheld pinpoints, for the acceptance report. */
  by_surface: Record<string, number>;
}

function sweepNode(
  node: unknown,
  diag: AdmtRangeSweepDiag,
  surface: string,
  parent?: Record<string, unknown>,
  key?: string,
): unknown {
  if (node == null) return node;

  if (typeof node === "string") {
    if (!hasOutOfRangeCitation(node)) return node;
    if (key && MACHINERY_KEYS.has(key)) return node;

    if (key && PINPOINT_KEYS.has(key)) {
      // A STRUCTURED PINPOINT. Withhold it — never rewrite to a guess.
      diag.pinpoints_withheld++;
      diag.by_surface[surface] = (diag.by_surface[surface] ?? 0) + 1;
      if (parent) {
        if (typeof parent.verbatim_quote === "string" && parent.verbatim_quote) {
          parent.verbatim_quote = "";
          diag.quotes_withheld++;
        }
        parent.information_needed = true;
        parent.proposition_key = "";
        parent.citation_withheld_reason = OUT_OF_RANGE_REASON;
        diag.entries_marked++;
      }
      // `subsection` is withheld outright; a prose-shaped `citation` takes
      // the honest neutral anchor so the sentence still reads.
      return key === "subsection" ? "" : ADMT_SUBCHAPTER_FALLBACK;
    }

    diag.prose_neutralized++;
    return neutralizeProse(node);
  }

  if (Array.isArray(node)) {
    for (let i = 0; i < node.length; i++) {
      node[i] = sweepNode(node[i], diag, surface, parent, key);
    }
    return node;
  }

  if (typeof node === "object") {
    const obj = node as Record<string, unknown>;
    for (const k of Object.keys(obj)) {
      if (k.startsWith("_")) continue; // reserved/internal subtrees
      // read fresh: an earlier pinpoint withholding may have cleared a sibling
      obj[k] = sweepNode(obj[k], diag, surface, obj, k);
    }
    return obj;
  }
  return node;
}

/**
 * Sweep every citation-bearing surface of the assembled ADMT report.
 * Runs LAST, after every W/H anchor pass and the item422-C action seal.
 */
export function sweepAdmtOutOfRangeCitations(report: unknown): AdmtRangeSweepDiag {
  const diag: AdmtRangeSweepDiag = {
    version: ADMT_RANGE_SWEEP_VERSION,
    surfaces_swept: 0,
    pinpoints_withheld: 0,
    quotes_withheld: 0,
    prose_neutralized: 0,
    entries_marked: 0,
    crashed: false,
    by_surface: {},
  };
  try {
    const r = report as Record<string, unknown> | null;
    if (!r || typeof r !== "object") return diag;
    for (const surface of ADMT_SWEPT_CITATION_SURFACES) {
      if (!(surface in r) || r[surface] == null) continue;
      diag.surfaces_swept++;
      r[surface] = sweepNode(r[surface], diag, surface);
    }
  } catch (e) {
    diag.crashed = true;
    console.warn("[admt-range-sweep] failed (non-fatal):", (e as Error)?.message);
  }
  return diag;
}
