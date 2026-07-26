// ─────────────────────────────────────────────────────────────────────────
// BAND-REALIGNMENT-2026-07-26 — canonical revenue / consumer band module
// (DORMANT SCAFFOLD; NOT WIRED). CEO-ordered 2026-07-26 ~02:40Z.
//
// This module is the SINGLE source of truth for statutorily-aligned
// revenue / consumer band enums for every CPPA / CCPA tool. It is
// authored T1 (docs + design) and wired T2 (deploy-guarded turn) per the
// DEPLOY-HELD split recorded in pipeline-state item 113 and the courier
// docs/courier/BAND-REALIGNMENT-2026-07-26.md.
//
// EDGE PROVENANCE — every edge quoted verbatim from corpus this turn:
//   • provision_texts.cppa-7121, § 7121(a)(1): "more than one hundred
//     million dollars ($100,000,000)" → 2028 cohort
//   • provision_texts.cppa-7121, § 7121(a)(2): "between fifty million
//     dollars ($50,000,000) and one hundred million dollars
//     ($100,000,000)" → 2029 cohort
//   • provision_texts.cppa-7121, § 7121(a)(3): "less than fifty million
//     dollars ($50,000,000)" → 2030 cohort
//   • provision_texts.ccpa-1798-140, § 1798.140(d)(1)(A): "in excess of
//     twenty-five million dollars ($25,000,000)" (covered-business gate)
//   • provision_texts.ccpa-1798-140, § 1798.140(d)(1)(B): "100,000 or
//     more consumers or households"
//
// EVERY band edge sits on a statutory line so every new-band answer maps
// to exactly ONE cohort and ONE applicability answer.
// ─────────────────────────────────────────────────────────────────────────

// ── Revenue bands ───────────────────────────────────────────────────────
export const REVENUE_BANDS_V2 = [
  "Under $25M",
  "$25M to under $50M",
  "$50M to $100M",
  "Over $100M",
] as const;
export type RevenueBandV2 = typeof REVENUE_BANDS_V2[number];

// § 1798.140(d)(1)(A) $25M covered-business trigger. Business self-
// selects into "$25M to under $50M" because their gross revenue exceeds
// $25M (labels are user-facing bands, not point values).
export const REVENUE_BAND_APPLICABILITY_A: Record<RevenueBandV2, boolean> = {
  "Under $25M":         false,
  "$25M to under $50M": true,
  "$50M to $100M":      true,
  "Over $100M":         true,
};

// § 7121(a) audit-cohort dates. Values are ISO date-only; humanised via
// the mapping table in the courier.
export const REVENUE_BAND_AUDIT_COHORT: Record<RevenueBandV2, string | null> = {
  "Under $25M":         null,         // (A) not met → no cohort
  "$25M to under $50M": "2030-04-01", // (a)(3): < $50M
  "$50M to $100M":      "2029-04-01", // (a)(2): $50M–$100M
  "Over $100M":         "2028-04-01", // (a)(1): > $100M
};

// BAND-REALIGNMENT-T2C (2026-07-26): canonical map consumed conceptually by
// run-quality-batch QC-R1-4 (cohort determinism). The check itself resolves
// via `classifyRevenueBand` in `_shared/cppa-test-states.ts` which already
// carries V2 labels (T2A), so this export is the SINGLE DOCUMENTED SOURCE
// OF TRUTH for the V2 → § 7121(a) cohort key expected by QC-R1-4.
//
// Ambiguous-legacy bands ($25M–$100M, $20M–$100M, "Unsure" and the like)
// are EXEMPT from this map — QC-R1-4 requires them to render BOTH 2029 and
// 2030 cohort dates with conditional framing (see index.ts L627-637).
export const QC_R1_4_EXPECTED_COHORT: Record<RevenueBandV2, "2028-04-01" | "2029-04-01" | "2030-04-01" | null> = {
  "Under $25M":         "2030-04-01", // § 7121(a)(3): < $50M cohort; audit obligation itself may be N/A when (d)(1)(A) not met
  "$25M to under $50M": "2030-04-01", // § 7121(a)(3): < $50M
  "$50M to $100M":      "2029-04-01", // § 7121(a)(2): $50M–$100M
  "Over $100M":         "2028-04-01", // § 7121(a)(1): > $100M
};

// ── Consumer bands ──────────────────────────────────────────────────────
export const CONSUMER_BANDS_V2 = [
  "Under 100,000",
  "100,000 to under 250,000",
  "250,000 to under 1,000,000",
  "1,000,000 or more",
] as const;
export type ConsumerBandV2 = typeof CONSUMER_BANDS_V2[number];

// § 1798.140(d)(1)(B) 100,000 trigger and § 7120(b)(2)(A) 250,000 prong.
export const CONSUMER_BAND_APPLICABILITY: Record<
  ConsumerBandV2,
  { over_100k: boolean; over_250k: boolean }
> = {
  "Under 100,000":                { over_100k: false, over_250k: false },
  "100,000 to under 250,000":     { over_100k: true,  over_250k: false },
  "250,000 to under 1,000,000":   { over_100k: true,  over_250k: true  },
  "1,000,000 or more":            { over_100k: true,  over_250k: true  },
};

// ── Legacy → V2 mapping ─────────────────────────────────────────────────
// Explicit map. Unambiguous legacy labels resolve to a V2 band; ambiguous
// labels (straddle a statutory line) resolve to `null` and the caller
// stamps `_meta.internal.band_legacy_ambiguous = true` and PRESERVES the
// emitter's conservative no-assert behavior. NO stored-data rewrites.
export const REVENUE_LEGACY_MAP: Record<string, RevenueBandV2 | null> = {
  // Current-generation labels
  "Under $25M":    "Under $25M",
  "$25M–$50M":     null,             // AMBIGUOUS — straddles $50M line (edge is inclusive)
  "$50M–$100M":    "$50M to $100M",  // unambiguous
  "$100M–$500M":   "Over $100M",     // unambiguous
  "Over $500M":    "Over $100M",     // unambiguous
  // Older / QL2-era labels
  "$25M–$100M":    null,             // AMBIGUOUS — straddles $50M line
  "$20M–$100M":    null,             // AMBIGUOUS — straddles $25M AND $50M lines
};

export const CONSUMER_LEGACY_MAP: Record<string, ConsumerBandV2 | null> = {
  "Fewer than 100,000":  "Under 100,000",
  "100,000–249,999":     "100,000 to under 250,000",
  "250,000–1 million":   "250,000 to under 1,000,000",
  "1–10 million":        "1,000,000 or more",
  "Over 10 million":     "1,000,000 or more",
  "Unsure":              null,       // AMBIGUOUS — user did not select
  // Older labels
  "100,000–1 million":   null,       // AMBIGUOUS — straddles 250k line
};

/**
 * Resolve a raw intake string (either a V2 label or a known legacy label)
 * to a V2 band. Returns `null` when the input is unknown OR marked
 * ambiguous — the caller sets `band_legacy_ambiguous` and preserves
 * conservative no-assert behavior.
 */
export function resolveRevenueBand(raw: unknown): RevenueBandV2 | null {
  if (typeof raw !== "string") return null;
  const v = raw.trim();
  if ((REVENUE_BANDS_V2 as readonly string[]).includes(v)) return v as RevenueBandV2;
  if (Object.prototype.hasOwnProperty.call(REVENUE_LEGACY_MAP, v)) {
    return REVENUE_LEGACY_MAP[v];
  }
  return null;
}

export function resolveConsumerBand(raw: unknown): ConsumerBandV2 | null {
  if (typeof raw !== "string") return null;
  const v = raw.trim();
  if ((CONSUMER_BANDS_V2 as readonly string[]).includes(v)) return v as ConsumerBandV2;
  if (Object.prototype.hasOwnProperty.call(CONSUMER_LEGACY_MAP, v)) {
    return CONSUMER_LEGACY_MAP[v];
  }
  return null;
}

/**
 * True when the raw string is a KNOWN legacy label that maps to `null`
 * (i.e. straddles a statutory line). Callers use this to distinguish
 * "unknown value" (typo / stale test) from "known-ambiguous legacy value".
 */
export function isBandLegacyAmbiguous(raw: unknown): boolean {
  if (typeof raw !== "string") return false;
  const v = raw.trim();
  if (Object.prototype.hasOwnProperty.call(REVENUE_LEGACY_MAP, v)) {
    return REVENUE_LEGACY_MAP[v] === null;
  }
  if (Object.prototype.hasOwnProperty.call(CONSUMER_LEGACY_MAP, v)) {
    return CONSUMER_LEGACY_MAP[v] === null;
  }
  return false;
}

// ── Instrument re-key (documented, applied in T2) ───────────────────────
// New instrument version stamped when this module is wired:
export const INSTRUMENT_VERSION_V2 = "gc-2026-07-26-s5-eu-uk-ca-au-sg";
export const INSTRUMENT_PRIOR       = "gc-2026-07-25-s4-eu-uk-ca-au-sg";
// qc_r1_4_cohort_determinism EXPECTED-COHORT map keyed on V2 bands.
// Ambiguous-legacy bands (resolveRevenueBand → null) are EXEMPT from the
// check per courier §5.
export const QC_R1_4_EXPECTED_COHORT: Record<RevenueBandV2, string | null> =
  REVENUE_BAND_AUDIT_COHORT;
