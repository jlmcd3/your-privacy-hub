// Ad-region check. Client-local only — deliberately no geo-IP service and
// no additional data collection. See AD-3 in EUP_Public_Page_Recommendations.
//
// Deliberately over-inclusive: any Europe/* timezone is treated as
// excluded, along with Atlantic zones that fall inside EEA/associated
// territories. Revenue is forfeited in edge cases rather than risk
// serving into consent-required regions without a certified CMP.

const EXCLUDED_ATLANTIC = new Set<string>([
  "Atlantic/Canary",
  "Atlantic/Madeira",
  "Atlantic/Azores",
  "Atlantic/Reykjavik",
]);

export type AdRegion = "allowed" | "excluded" | "unknown";

export function getAdRegion(): AdRegion {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (!tz || typeof tz !== "string") return "unknown";
    if (tz.startsWith("Europe/")) return "excluded";
    if (EXCLUDED_ATLANTIC.has(tz)) return "excluded";
    return "allowed";
  } catch {
    return "unknown";
  }
}
