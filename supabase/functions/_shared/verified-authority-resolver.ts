// CPPA-PRODUCT-1 / L1 — Shared Verified-Authority Resolver.
//
// Purpose: single source of truth for the row shape used by every product-
// specific verified-authority registry (starting with cppa-admt in S-A).
// The generator never authors a citation; it emits a proposition_key and
// the resolver stamps citation/subsection/verbatim_quote deterministically.
//
// Row shape (per A1, CPPA-PRODUCT-1 ruling):
//   proposition_key, citation, subsection, verbatim_quote,
//   depth_class, governing_anchor, verified_on, primary_source_url
//
// This module owns the type + validators + generic lookup helpers.
// Per-tool registry content lives in _shared/registry/<tool>-verified-authorities.ts.
//
// S-A scope: authoring only. No callers wire this into any generator yet.
//           The admt wiring turn (registry injection + S5 slot + RESUMABLE
//           admt + W6 restamp) is deferred to a single follow-up dispatch.

/** Depth of the citation pinpoint. Enum keeps grader/rubric checks precise. */
export type DepthClass =
  | "section"          // e.g. "11 CCR § 7220"
  | "subsection"       // e.g. "11 CCR § 7220(c)"
  | "sub_subsection"   // e.g. "11 CCR § 7220(c)(2)"
  | "clause";          // e.g. "11 CCR § 7220(c)(2)(A)"

/**
 * A single verified authority row. Every field is REQUIRED — a row with any
 * empty/missing field is a shape violation and MUST fail the contract test.
 *
 * - `proposition_key` — stable machine key the generator emits (never mutates).
 * - `citation`        — canonical top-level citation (section-level).
 * - `subsection`      — the pinpoint sub-part being asserted (may equal the
 *                       section for depth_class="section"; never empty).
 * - `verbatim_quote`  — literal statutory/regulatory text supporting the
 *                       proposition. MUST appear verbatim in the primary
 *                       source. Kept short (≤ ~280 chars) but complete.
 * - `depth_class`     — how deep the pinpoint reaches (see DepthClass).
 * - `governing_anchor`— top-level statute/reg the row is scoped to
 *                       (e.g. "11 CCR Art. 11" or "Cal. Civ. Code § 1798.185").
 *                       Used to enforce H6 (governing-anchor) at emit time.
 * - `verified_on`     — ISO 8601 date the row was human-verified against the
 *                       primary source. Grader treats older-than-N-days rows
 *                       as INCOMPARABLE (never fabricated freshness).
 * - `primary_source_url` — HTTPS URL of the official published text.
 */
export interface VerifiedAuthorityRow {
  proposition_key: string;
  citation: string;
  subsection: string;
  verbatim_quote: string;
  depth_class: DepthClass;
  governing_anchor: string;
  verified_on: string;           // "YYYY-MM-DD"
  primary_source_url: string;    // https://...
}

/** Registry = keyed by proposition_key. Duplicates are a contract error. */
export type VerifiedAuthorityRegistry = Record<string, VerifiedAuthorityRow>;

// ---------------------------------------------------------------------------
// Shape validators
// ---------------------------------------------------------------------------

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const HTTPS_RE = /^https:\/\/[^\s]+$/;
const DEPTHS: ReadonlySet<DepthClass> = new Set(
  ["section", "subsection", "sub_subsection", "clause"] as DepthClass[],
);

/** Shape violations produced by validateRow / validateRegistry. */
export interface ShapeViolation {
  proposition_key: string;
  field: keyof VerifiedAuthorityRow | "duplicate" | "key_mismatch";
  reason: string;
}

/** Validate a single row's shape. Returns [] when valid. */
export function validateRow(row: VerifiedAuthorityRow): ShapeViolation[] {
  const errs: ShapeViolation[] = [];
  const req: (keyof VerifiedAuthorityRow)[] = [
    "proposition_key", "citation", "subsection", "verbatim_quote",
    "depth_class", "governing_anchor", "verified_on", "primary_source_url",
  ];
  for (const f of req) {
    const v = row[f];
    if (typeof v !== "string" || v.trim() === "") {
      errs.push({ proposition_key: row.proposition_key ?? "", field: f, reason: "empty or non-string" });
    }
  }
  if (!DEPTHS.has(row.depth_class)) {
    errs.push({ proposition_key: row.proposition_key, field: "depth_class", reason: `not in enum: ${row.depth_class}` });
  }
  if (!ISO_DATE_RE.test(row.verified_on)) {
    errs.push({ proposition_key: row.proposition_key, field: "verified_on", reason: "not ISO 8601 YYYY-MM-DD" });
  }
  if (!HTTPS_RE.test(row.primary_source_url)) {
    errs.push({ proposition_key: row.proposition_key, field: "primary_source_url", reason: "not an https:// URL" });
  }
  // Subsection depth coherence:
  //  - depth_class="section"     ⇒ subsection === citation
  //  - deeper depths             ⇒ subsection MUST start with citation and be longer
  if (row.depth_class === "section") {
    if (row.subsection !== row.citation) {
      errs.push({ proposition_key: row.proposition_key, field: "subsection",
        reason: "depth_class=section requires subsection === citation" });
    }
  } else {
    if (!row.subsection.startsWith(row.citation) || row.subsection.length <= row.citation.length) {
      errs.push({ proposition_key: row.proposition_key, field: "subsection",
        reason: `deeper depth requires subsection to extend citation (got "${row.subsection}")` });
    }
  }
  return errs;
}

/** Validate the full registry: per-row shape + key/proposition_key match + uniqueness. */
export function validateRegistry(reg: VerifiedAuthorityRegistry): ShapeViolation[] {
  const errs: ShapeViolation[] = [];
  const seenKeys = new Set<string>();
  for (const [key, row] of Object.entries(reg)) {
    if (seenKeys.has(key)) {
      errs.push({ proposition_key: key, field: "duplicate", reason: "duplicate proposition_key" });
    }
    seenKeys.add(key);
    if (row.proposition_key !== key) {
      errs.push({ proposition_key: key, field: "key_mismatch",
        reason: `row.proposition_key="${row.proposition_key}" ≠ registry key="${key}"` });
    }
    errs.push(...validateRow(row));
  }
  return errs;
}

// ---------------------------------------------------------------------------
// Lookup helpers
// ---------------------------------------------------------------------------

/** Resolve by proposition_key. Returns null when unknown (never throws). */
export function resolveByPropositionKey(
  reg: VerifiedAuthorityRegistry,
  key: string,
): VerifiedAuthorityRow | null {
  return reg[key] ?? null;
}

/**
 * Assertive resolver used by generators at emit time. Throws when the key is
 * not in the registry — a missing verified authority is a HARD failure, not
 * a soft fallback (the whole point of L1 is to make invented citations
 * structurally impossible).
 */
export function requireVerified(
  reg: VerifiedAuthorityRegistry,
  key: string,
): VerifiedAuthorityRow {
  const row = reg[key];
  if (!row) {
    throw new Error(`[verified-authority] no row for proposition_key="${key}"`);
  }
  return row;
}

/**
 * Return every row whose citation matches the given section-level citation
 * (any depth). Useful for governing-anchor scans and rubric audits.
 */
export function rowsForCitation(
  reg: VerifiedAuthorityRegistry,
  citation: string,
): VerifiedAuthorityRow[] {
  return Object.values(reg).filter((r) => r.citation === citation);
}

/** Number of rows, for lightweight metrics/reporting. */
export function registrySize(reg: VerifiedAuthorityRegistry): number {
  return Object.keys(reg).length;
}
