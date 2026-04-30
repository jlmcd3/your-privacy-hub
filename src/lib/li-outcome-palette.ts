/**
 * Shared outcome palette for Legitimate Interest surfaces.
 * Used by /li-tracker and /li-assessment so colors stay in sync.
 *
 * Outcome keys: "accepted" | "conditional" | "rejected" | "contested"
 * (anything else falls back to "contested")
 */

export type LIOutcome = "accepted" | "conditional" | "rejected" | "contested";

export const LI_OUTCOME_ORDER: LIOutcome[] = [
  "accepted",
  "conditional",
  "rejected",
  "contested",
];

/** Left vertical accent stripe inside cards */
export const liOutcomeStripe: Record<LIOutcome, string> = {
  accepted: "bg-green-600",
  conditional: "bg-amber-500",
  rejected: "bg-red-600",
  contested: "bg-slate-400",
};

/** Footer text accent ("ACCEPTED", "REJECTED", etc.) */
export const liOutcomeAccent: Record<LIOutcome, string> = {
  accepted: "text-green-700",
  conditional: "text-amber-700",
  rejected: "text-red-700",
  contested: "text-slate-600",
};

/** Pill badge style (bg + text) — used for filter chips and inline badges */
export const liOutcomeBadge: Record<LIOutcome, string> = {
  accepted: "bg-green-100 text-green-800",
  conditional: "bg-amber-100 text-amber-800",
  rejected: "bg-red-100 text-red-800",
  contested: "bg-muted text-muted-foreground",
};

/** Normalize any string to a known outcome key, defaulting to "contested" */
export const normalizeOutcome = (raw: string | null | undefined): LIOutcome => {
  const k = (raw ?? "").toLowerCase() as LIOutcome;
  return (["accepted", "conditional", "rejected", "contested"] as LIOutcome[]).includes(k)
    ? k
    : "contested";
};

/** Convenience accessors that always return a valid class string */
export const stripeFor = (raw: string | null | undefined) => liOutcomeStripe[normalizeOutcome(raw)];
export const accentFor = (raw: string | null | undefined) => liOutcomeAccent[normalizeOutcome(raw)];
export const badgeFor = (raw: string | null | undefined) => liOutcomeBadge[normalizeOutcome(raw)];
