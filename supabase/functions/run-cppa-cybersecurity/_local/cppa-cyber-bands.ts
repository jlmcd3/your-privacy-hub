// QB-P24 Item 3 — canonical CPPA cybersecurity score-band / status module.
//
// This is the SINGLE source of truth for control status enums and score
// bands used by BOTH:
//   1. the generator prompt in run-cppa-cybersecurity/index.ts (rubric text)
//   2. the customer-facing renderer in src/components/cppa/CybersecurityReportBody.tsx
//      (legend + Pre-Audit Gap Log filter)
//
// The frontend has a byte-identical mirror at src/lib/cppaCyberBands.ts
// because Vite cannot import from supabase/functions. Any change to the
// bands, statuses, or gap-status set MUST be applied to BOTH files in the
// same commit — CI note in that mirror file re-states this.
//
// Verified 2026-07-23 against the generator rubric (was 0-20 / 21-59 /
// 60-89 / 90-100) and the customer legend (was mis-aligned as 0-24 / 25-49
// / 50-74 / 75-100). This module realigns the legend to the rubric.

export type CyberStatus =
  | "Critical Gap"
  | "Gap"
  | "Partial"
  | "Implemented"
  | "Mature"
  | "Insufficient information";

export interface CyberBand {
  status: Exclude<CyberStatus, "Insufficient information">[] | Exclude<CyberStatus, "Insufficient information">;
  min: number;
  max: number;
  label: string;      // legend label
  bandText: string;   // "0–20" style range for the legend and rubric
}

// Ordered lowest-to-highest.
export const CYBER_BANDS: CyberBand[] = [
  { status: "Critical Gap", min: 0,  max: 20,  label: "Critical Gap",             bandText: "0–20" },
  { status: ["Gap", "Partial"], min: 21, max: 59, label: "Gap / Partial",         bandText: "21–59" },
  { status: "Implemented",  min: 60, max: 89,  label: "Implemented",              bandText: "60–89" },
  { status: "Mature",       min: 90, max: 100, label: "Mature",                   bandText: "90–100" },
];

// Statuses that MUST be treated as gaps in the Pre-Audit Gap Log filter.
// Lower-cased for case-insensitive comparison.
export const CYBER_GAP_STATUSES_LC: string[] = ["critical gap", "gap", "partial"];

export function isCyberGapStatus(s?: string): boolean {
  return CYBER_GAP_STATUSES_LC.includes((s || "").toLowerCase());
}

// Generator rubric text — pulled into the prompt so the model sees the same
// bands the renderer displays. Insufficient-information handling is kept
// as a separate sentence because it is not a band on the numeric axis.
export function generatorScoringRulesText(): string {
  const lines = CYBER_BANDS.map((b) => {
    const statuses = Array.isArray(b.status)
      ? b.status.map((s) => `"${s}"`).join(" or ")
      : `"${b.status}"`;
    const clarifier = Array.isArray(b.status) && b.status.includes("Gap") && b.status.includes("Partial")
      ? ` (use "Gap" when the control is completely absent; "Partial" when it partially exists)`
      : "";
    return `- Score ${b.bandText} → status must be ${statuses}${clarifier}`;
  });
  return lines.join("\n");
}
