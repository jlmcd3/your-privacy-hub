// BAND-REALIGNMENT-2026-07-26 — FRONTEND MIRROR of
// supabase/functions/_shared/bands/revenue-consumer.ts.
//
// DORMANT SCAFFOLD (T1). Not wired to any form or contract this turn;
// T2 rewires enum modules to re-export from here. See the Deno-side
// module for full edge-provenance commentary.

export const REVENUE_BANDS_V2 = [
  "Under $25M",
  "$25M to under $50M",
  "$50M to $100M",
  "Over $100M",
] as const;
export type RevenueBandV2 = typeof REVENUE_BANDS_V2[number];

export const CONSUMER_BANDS_V2 = [
  "Under 100,000",
  "100,000 to under 250,000",
  "250,000 to under 1,000,000",
  "1,000,000 or more",
] as const;
export type ConsumerBandV2 = typeof CONSUMER_BANDS_V2[number];

export const REVENUE_BAND_APPLICABILITY_A: Record<RevenueBandV2, boolean> = {
  "Under $25M":         false,
  "$25M to under $50M": true,
  "$50M to $100M":      true,
  "Over $100M":         true,
};

export const REVENUE_BAND_AUDIT_COHORT: Record<RevenueBandV2, string | null> = {
  "Under $25M":         null,
  "$25M to under $50M": "2030-04-01",
  "$50M to $100M":      "2029-04-01",
  "Over $100M":         "2028-04-01",
};

export const CONSUMER_BAND_APPLICABILITY: Record<
  ConsumerBandV2,
  { over_100k: boolean; over_250k: boolean }
> = {
  "Under 100,000":                { over_100k: false, over_250k: false },
  "100,000 to under 250,000":     { over_100k: true,  over_250k: false },
  "250,000 to under 1,000,000":   { over_100k: true,  over_250k: true  },
  "1,000,000 or more":            { over_100k: true,  over_250k: true  },
};

export const REVENUE_LEGACY_MAP: Record<string, RevenueBandV2 | null> = {
  "Under $25M":    "Under $25M",
  "$25M–$50M":     null,
  "$50M–$100M":    "$50M to $100M",
  "$100M–$500M":   "Over $100M",
  "Over $500M":    "Over $100M",
  "$25M–$100M":    null,
  "$20M–$100M":    null,
};

export const CONSUMER_LEGACY_MAP: Record<string, ConsumerBandV2 | null> = {
  "Fewer than 100,000":  "Under 100,000",
  "100,000–249,999":     "100,000 to under 250,000",
  "250,000–1 million":   "250,000 to under 1,000,000",
  "1–10 million":        "1,000,000 or more",
  "Over 10 million":     "1,000,000 or more",
  "Unsure":              null,
  "100,000–1 million":   null,
};

export function resolveRevenueBand(raw: unknown): RevenueBandV2 | null {
  if (typeof raw !== "string") return null;
  const v = raw.trim();
  if ((REVENUE_BANDS_V2 as readonly string[]).includes(v)) return v as RevenueBandV2;
  if (Object.prototype.hasOwnProperty.call(REVENUE_LEGACY_MAP, v)) return REVENUE_LEGACY_MAP[v];
  return null;
}

export function resolveConsumerBand(raw: unknown): ConsumerBandV2 | null {
  if (typeof raw !== "string") return null;
  const v = raw.trim();
  if ((CONSUMER_BANDS_V2 as readonly string[]).includes(v)) return v as ConsumerBandV2;
  if (Object.prototype.hasOwnProperty.call(CONSUMER_LEGACY_MAP, v)) return CONSUMER_LEGACY_MAP[v];
  return null;
}

export function isBandLegacyAmbiguous(raw: unknown): boolean {
  if (typeof raw !== "string") return false;
  const v = raw.trim();
  if (Object.prototype.hasOwnProperty.call(REVENUE_LEGACY_MAP, v)) return REVENUE_LEGACY_MAP[v] === null;
  if (Object.prototype.hasOwnProperty.call(CONSUMER_LEGACY_MAP, v)) return CONSUMER_LEGACY_MAP[v] === null;
  return false;
}

export const INSTRUMENT_VERSION_V2 = "gc-2026-07-26-s5-eu-uk-ca-au-sg";
export const INSTRUMENT_PRIOR       = "gc-2026-07-25-s4-eu-uk-ca-au-sg";
export const QC_R1_4_EXPECTED_COHORT: Record<RevenueBandV2, string | null> =
  REVENUE_BAND_AUDIT_COHORT;
