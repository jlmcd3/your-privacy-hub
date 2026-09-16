/**
 * ADMT master review (2026-09-15, F02) — the affected-population band
 * suggestion, done honestly.
 *
 * The old helper stripped every non-digit before parsing, so the permitted
 * range "1,000–2,000" became 10002000 and selected "Over 1,000,000", "-5"
 * became 5, "1.5" became 15, and "20k" became 20. The suggestion was then
 * written into the band field once and never revised, and travelled to the
 * report as the customer's own assertion.
 *
 * This parser keeps the original estimate untouched, reads a whole number or
 * a range (with thousands separators and k / m / thousand / million units),
 * refuses negatives and decimals, and suggests a band only when the whole
 * range sits inside one band. A cross-band range asks for confirmation. The
 * page shows the result as provisional; nothing is stored until confirmed.
 */

export const ADMT_POPULATION_BANDS = [
  "Under 1,000",
  "1,000 – 10,000",
  "10,001 – 100,000",
  "100,001 – 1,000,000",
  "Over 1,000,000",
] as const;
export type AdmtPopulationBand = typeof ADMT_POPULATION_BANDS[number];

export type ParsedPopulation =
  | { kind: "empty" }
  | { kind: "invalid"; reason: "negative" | "decimal" | "unparseable" | "zero" }
  | { kind: "number"; value: number }
  | { kind: "range"; low: number; high: number };

const UNIT: Record<string, number> = {
  k: 1_000, thousand: 1_000, thousands: 1_000,
  m: 1_000_000, mm: 1_000_000, million: 1_000_000, millions: 1_000_000,
};

/** One term: "45,000", "20k", "1.5 million" (decimal only with a unit), "-5" (rejected). */
function parseTerm(raw: string): ParsedPopulation {
  const t = raw.trim().toLowerCase().replace(/^(about|approx\.?|approximately|around|circa|c\.|~)\s*/, "");
  if (!t) return { kind: "empty" };
  const m = /^(-)?\$?(\d{1,3}(?:,\d{3})+|\d+)(?:\.(\d+))?\s*(k|m|mm|thousand|thousands|million|millions)?\s*(?:people|consumers|californians|residents|individuals|decisions)?$/i.exec(t);
  if (!m) return { kind: "invalid", reason: "unparseable" };
  if (m[1]) return { kind: "invalid", reason: "negative" };
  const unit = m[4] ? UNIT[m[4]] : 1;
  const whole = Number(m[2].replace(/,/g, ""));
  let value = whole * unit;
  if (m[3]) {
    // A decimal is meaningful only with a unit ("1.5 million"); "1.5" alone is not a count.
    if (!m[4]) return { kind: "invalid", reason: "decimal" };
    value += Number(`0.${m[3]}`) * unit;
  }
  if (!Number.isFinite(value)) return { kind: "invalid", reason: "unparseable" };
  if (!Number.isInteger(value)) return { kind: "invalid", reason: "decimal" };
  if (value === 0) return { kind: "invalid", reason: "zero" };
  return { kind: "number", value };
}

/** Parse a count or a range; the original text is never altered. */
export function parsePopulationEstimate(raw: string): ParsedPopulation {
  const text = (raw ?? "").trim();
  if (!text) return { kind: "empty" };
  // A range: "1,000–2,000", "1,000 - 2,000", "1k to 2k", "between 1,000 and 2,000".
  const range = /^(?:between\s+)?(.+?)\s*(?:–|—|-|to|and)\s*(.+)$/i.exec(text);
  if (range && !/^-/.test(text)) {
    const lo = parseTerm(range[1]);
    const hi = parseTerm(range[2]);
    if (lo.kind === "number" && hi.kind === "number") {
      const low = Math.min(lo.value, hi.value);
      const high = Math.max(lo.value, hi.value);
      return low === high ? { kind: "number", value: low } : { kind: "range", low, high };
    }
    if (lo.kind === "invalid") return lo;
    if (hi.kind === "invalid") return hi;
  }
  return parseTerm(text);
}

export function bandFor(n: number): AdmtPopulationBand {
  if (n < 1_000) return "Under 1,000";
  if (n <= 10_000) return "1,000 – 10,000";
  if (n <= 100_000) return "10,001 – 100,000";
  if (n <= 1_000_000) return "100,001 – 1,000,000";
  return "Over 1,000,000";
}

export type BandSuggestion =
  | { kind: "none" }
  | { kind: "invalid"; reason: "negative" | "decimal" | "unparseable" | "zero" }
  | { kind: "band"; band: AdmtPopulationBand }
  | { kind: "cross-band"; low: AdmtPopulationBand; high: AdmtPopulationBand };

/** Suggest a band only when the estimate belongs to exactly one band. */
export function suggestPopulationBand(raw: string): BandSuggestion {
  const p = parsePopulationEstimate(raw);
  if (p.kind === "empty") return { kind: "none" };
  if (p.kind === "invalid") return { kind: "invalid", reason: p.reason };
  if (p.kind === "number") return { kind: "band", band: bandFor(p.value) };
  const low = bandFor(p.low);
  const high = bandFor(p.high);
  return low === high ? { kind: "band", band: low } : { kind: "cross-band", low, high };
}

/** Plain-language note for the page. */
export function describeBandSuggestion(sug: BandSuggestion): string {
  switch (sug.kind) {
    case "none": return "";
    case "band": return `Suggested from your estimate: ${sug.band}. Confirm it, or pick another band.`;
    case "cross-band": return `Your estimate spans two bands (${sug.low} and ${sug.high}). Pick the band the report should use; nothing is chosen for you.`;
    case "invalid":
      return sug.reason === "negative"
        ? "A count cannot be negative; no band is suggested."
        : sug.reason === "decimal"
        ? "A count is a whole number of people (a decimal is read only with a unit such as “1.5 million”); no band is suggested."
        : sug.reason === "zero"
        ? "A count of zero suggests no band; if this system reaches no one, say so in the description."
        : "The estimate could not be read as a number or a range; pick the band yourself.";
  }
}
