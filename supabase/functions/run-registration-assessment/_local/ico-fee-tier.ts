// QB-P22 item 5a — ICO Data-Protection Fee tier resolver.
// ICO tiers (published fee-tier criteria):
//   Tier 1 (£52): micro — turnover ≤ £632k OR ≤ 10 staff.
//   Tier 2 (£78): small/medium — not Tier 1, AND (turnover ≤ £36m OR ≤ 250 staff).
//   Tier 3 (£3,763): large — turnover > £36m AND > 250 staff.
// Boundary flag fires when the intake sits within one band of a threshold and
// we can't distinguish the neighbouring tier from the record alone.
//
// DOC 139 (2026-09-02) — extracted out of index.ts (unchanged) so this pure
// function can be unit-tested directly with `deno test`, matching the
// pattern used by registration-engine.ts. index.ts cannot itself be
// imported by tests (it calls createClient() at module load against live
// env vars) — see tests/edge/item413/_assemble.ts and
// tests/edge/_shared/ltp/doc130-part-iv-fixes.test.ts, which previously had
// to assert against index.ts's raw source text for lack of a testable seam.
//
// DOC 139 investigated an external review's P0 claim that this resolver
// outputs a falsely-precise fee/tier whenever turnover is FX-estimated
// rather than directly stated, and that fee-obligation and fee-tier should
// be split into two independent normalized states. Traced against the
// review's own cited fixture (320 staff, ~$78M USD revenue): at 0.80
// GBP/USD that's a ~£62.4M turnover estimate; the DOC 130 REG-1
// plausible-rate band (0.72-0.88) puts the full FX-uncertainty range at
// ~£56.16M-£68.64M, which stays entirely above the £36m Tier-2/Tier-3
// threshold — so unlike the review assumed, the Tier 3 (£3,763.00)
// determination for that specific fixture is NOT fragile to FX
// uncertainty; the existing `boundary` check correctly does not fire for
// it. The review's general architectural point (FX estimation is the ONLY
// path to a GBP turnover figure — the intake contract has no
// annual_revenue_gbp field) is accurate, but the DOC 130 boundary-flag
// mechanism already gives this design a way to say "tier uncertain": it is
// not a two-state architecture, but it is not a bare "always certain"
// output either. No re-architecture is warranted. The 0.72-0.88 sensitivity
// band itself was independently re-checked against real GBP/USD (cable)
// history: the band's edges correspond to cable rates of ~1.14-1.39
// USD/GBP, which covers normal-to-moderate multi-year FX movement; only
// crisis-level outliers (e.g., the Sept 2022 gilt-crisis low near 1.03)
// fall outside it, and treating a one-off crisis trough as the default
// "plausible" planning assumption would itself be a fabrication in the
// other direction. The band is left unchanged — DOC 130 CEO-ratified it in
// this exact form one day earlier — but the boundary===false narrative gets
// one added sentence (below) making the range-robustness legible to a
// reader who cannot otherwise tell "no caveat fired" from "no caveat was
// checked".
export type IcoTierResolution = {
  tier: 1 | 2 | 3 | null;
  fee_cents: number | null;
  narrative: string;
  boundary: boolean;
};

export function resolveIcoFeeTier(intake: any): IcoTierResolution {
  const staff = Number(intake?.employee_count);
  const revenueUsd = Number(intake?.annual_revenue_usd);
  const orgSize = String(intake?.organization_size ?? "").toLowerCase();
  // GBP conversion is deliberately conservative — the ICO thresholds are in GBP;
  // we use 0.80 GBP/USD as a stable planning proxy. Boundary flag surfaces the caveat.
  const revenueGbp = Number.isFinite(revenueUsd) ? revenueUsd * 0.80 : NaN;
  const T1_TURNOVER_GBP = 632_000;
  const T2_TURNOVER_GBP = 36_000_000;
  const T1_STAFF = 10;
  const T2_STAFF = 250;
  const FEE_T1 = 5200;      // £52.00
  const FEE_T2 = 7800;      // £78.00
  const FEE_T3 = 376_300;   // £3,763.00
  const hasStaff = Number.isFinite(staff) && staff > 0;
  const hasRevenue = Number.isFinite(revenueGbp);
  // Fallback via organization_size when explicit fields are absent.
  const sizeTier: 1 | 2 | 3 | null = orgSize.includes("micro") ? 1
    : (orgSize.includes("small") || orgSize.includes("medium") || orgSize === "sme") ? 2
    : (orgSize.includes("large") || orgSize.includes("enterprise")) ? 3
    : null;
  let tier: 1 | 2 | 3 | null = null;
  let boundary = false;
  if (hasStaff || hasRevenue) {
    const staffOverT2 = hasStaff && staff > T2_STAFF;
    const revOverT2 = hasRevenue && revenueGbp > T2_TURNOVER_GBP;
    const staffLeT1 = hasStaff && staff <= T1_STAFF;
    const revLeT1 = hasRevenue && revenueGbp <= T1_TURNOVER_GBP;
    if (staffOverT2 && revOverT2) {
      tier = 3;
    } else if (staffLeT1 || revLeT1) {
      tier = 1;
      // Boundary if the other axis, when present, pushes above Tier 1.
      if ((hasStaff && staff > T1_STAFF) || (hasRevenue && revenueGbp > T1_TURNOVER_GBP)) boundary = true;
    } else {
      tier = 2;
      // Boundary if either axis sits within 10% of the T2/T3 threshold.
      if (hasStaff && staff > T2_STAFF * 0.9 && staff <= T2_STAFF) boundary = true;
      if (hasRevenue && revenueGbp > T2_TURNOVER_GBP * 0.9 && revenueGbp <= T2_TURNOVER_GBP) boundary = true;
    }
  } else if (sizeTier) {
    tier = sizeTier;
    boundary = true; // organization_size alone can't confirm the axis-based tier.
  }
  // DOC 130 REG-1 (Batch 3 follow-up, 2026-09-01) — the 0.80 GBP/USD
  // planning-rate conversion is an assumption, and where a plausible-rate
  // range (0.72-0.88) would straddle a tier threshold, the conversion is
  // load-bearing and the boundary confirm-note must fire.
  //
  // DOC 139 (2026-09-02) re-verified this band against real GBP/USD (cable)
  // history rather than just re-asserting it: 0.72-0.88 GBP/USD corresponds
  // to cable rates of ~1.14-1.39 USD/GBP, which covers normal-to-moderate
  // multi-year FX movement. Left unchanged (CEO-ratified DOC 130, one day
  // prior) — see the module header for the full band re-check.
  let fxStraddle = false;
  if (hasRevenue) {
    const lo = revenueUsd * 0.72;
    const hi = revenueUsd * 0.88;
    if ((lo <= T2_TURNOVER_GBP && hi > T2_TURNOVER_GBP) || (lo <= T1_TURNOVER_GBP && hi > T1_TURNOVER_GBP)) {
      fxStraddle = true;
      boundary = true;
    }
  }
  const feeMap: Record<1 | 2 | 3, number> = { 1: FEE_T1, 2: FEE_T2, 3: FEE_T3 };
  const fee_cents = tier ? feeMap[tier] : null;
  const basisBits: string[] = [];
  if (hasStaff) basisBits.push(`staff count ${staff}`);
  if (hasRevenue) basisBits.push(`turnover ≈ £${Math.round(revenueGbp).toLocaleString("en-GB")} (from annual_revenue_usd)`);
  if (!basisBits.length && sizeTier) basisBits.push(`organization_size "${orgSize}"`);
  const basis = basisBits.length ? basisBits.join(" and ") : "no distinguishing intake fields";
  // DOC 130 REG-1 — the conversion assumption is always disclosed where it
  // was used, never implied to be a recorded GBP figure.
  //
  // DOC 139 — when the FX-straddle check did NOT fire (i.e., the tier is
  // stable across the full 0.72-0.88 plausible-rate range), say so
  // explicitly. Without this sentence a reader cannot tell "the range was
  // checked and the tier is robust to it" apart from "the range was never
  // checked at all" — both render as the same bare conversion-disclosure
  // sentence. This does NOT change the determination; it only makes an
  // already-correct determination's robustness legible.
  const rangeStableNote = (hasRevenue && !fxStraddle)
    ? " This tier is stable across the full 0.72-0.88 GBP/USD plausible-rate range, so the determination does not turn on precisely which rate applies."
    : "";
  const conversionNote = hasRevenue
    ? ` The turnover figure is converted from the recorded USD revenue at a 0.80 GBP/USD planning rate.${rangeStableNote} Confirm the organisation's GBP turnover against the ICO thresholds before filing.`
    : "";
  const narrative = tier
    ? `ICO Data-Protection Fee resolved to Tier ${tier} (£${(feeMap[tier] / 100).toFixed(2)}) from ${basis}.${conversionNote}`
    : `ICO Data-Protection Fee tier could not be resolved from the record (${basis}); confirm the tier via the ICO fee self-assessment.`;
  return { tier, fee_cents, narrative, boundary };
}
