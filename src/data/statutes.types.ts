export interface StatuteEntry {
  /** Short citation shown in tooltip, e.g. "Va. Code § 59.1-573(A)(1)" */
  cite: string;
  /** URL to the official (or reliable) statutory source */
  url: string;
}

/**
 * A provision cell in the U.S. state comparison matrix.
 *
 * Legacy: `boolean` was used for yes/no. `string` was used for the free-form
 * enforcement-authority column (e.g. "AG", "CPPA & AG").
 *
 * STATES-1a extends the vocabulary so the tooltip/cite machinery can attach
 * to any state of the world short of a clean "no":
 *
 *   true         → provision fully granted (renders ✓, cite tooltip if present)
 *   false        → provision absent (renders — )
 *   "yes"        → equivalent to true (for JSON authoring readability)
 *   "no"         → equivalent to false
 *   "limited"    → provision exists but is narrower than the ✓ states; renders
 *                  as pill "Limited" with cite tooltip when a STATUTES entry exists
 *   "conditional"→ provision exists only when a threshold is met (e.g. DE DPIA
 *                  gated by consumer counts); renders as pill "Conditional"
 *                  with cite tooltip when a STATUTES entry exists
 *   string       → free-form label (only used for the enforcement-authority column)
 */
export type ProvisionValue =
  | boolean
  | "yes"
  | "no"
  | "limited"
  | "conditional"
  | string;

/**
 * Optional qualifier note for a single cell, keyed "STATE:PROVISION_INDEX".
 * Rendered in the tooltip beneath the statutory cite. Keep <120 chars.
 */
export type QualifierNotes = Record<string, string>;
