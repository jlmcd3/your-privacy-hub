// QB-P24 Item 3 — FRONTEND MIRROR of supabase/functions/_shared/cppa-cyber-bands.ts.
//
// Vite cannot import from supabase/functions, so this file is a byte-identical
// mirror of the Deno-side canonical module. Any change to the bands, statuses,
// or gap-status set MUST be applied to BOTH files in the same commit.
//
// Consumed by src/components/cppa/CybersecurityReportBody.tsx (legend +
// Pre-Audit Gap Log filter).

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
  label: string;
  bandText: string;
}

export const CYBER_BANDS: CyberBand[] = [
  { status: "Critical Gap", min: 0,  max: 20,  label: "Critical Gap",     bandText: "0–20" },
  { status: ["Gap", "Partial"], min: 21, max: 59, label: "Gap / Partial", bandText: "21–59" },
  { status: "Implemented",  min: 60, max: 89,  label: "Implemented",      bandText: "60–89" },
  { status: "Mature",       min: 90, max: 100, label: "Mature",           bandText: "90–100" },
];

export const CYBER_GAP_STATUSES_LC: string[] = ["critical gap", "gap", "partial"];

export function isCyberGapStatus(s?: string): boolean {
  return CYBER_GAP_STATUSES_LC.includes((s || "").toLowerCase());
}
