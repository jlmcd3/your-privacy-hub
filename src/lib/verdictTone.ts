/**
 * D1 (CEO ruling) — VERDICT COLOURS IN CUSTOMER DOCUMENTS.
 *
 * Option-A restraint rendered in the BRAND palette. One scheme across every
 * product; no red/green traffic-light semantics anywhere. Verdict, status and
 * conclusion-label surfaces map onto four brand tones by prominence only:
 *
 *   navy       — strongest emphasis (was red)
 *   ocean      — high emphasis      (was orange)
 *   slate-teal — mid emphasis       (was amber / yellow)
 *   teal       — settled / affirmative (was green / emerald)
 *
 * PDF twin: the CSS custom properties in supabase/functions/generate-report-pdf
 * and generate-cppa-suite-pdf.
 *
 * HARD EXCLUSIONS (never styled from here, byte-identical by ruling): the
 * item380 state-(i) DRAFT banner, the state-(ii) action-plan banner, the legal
 * disclaimer blocks, and anything in emit-gate/customer-messages.
 */

export type VerdictTone = "navy" | "ocean" | "slate-teal" | "teal";

/** Pill / badge classes. */
export const VERDICT_TONE_CLASS: Record<VerdictTone, string> = {
  navy: "bg-brand-navy/10 text-brand-navy dark:bg-brand-navy/40 dark:text-brand-mist",
  ocean: "bg-brand-ocean/10 text-brand-ocean dark:bg-brand-ocean/40 dark:text-brand-light-teal",
  "slate-teal": "bg-brand-slate-teal/10 text-brand-slate-teal dark:bg-brand-slate-teal/40 dark:text-brand-light-teal",
  teal: "bg-brand-teal/10 text-brand-teal-text dark:bg-brand-teal/30 dark:text-brand-teal",
};

/** Panel / callout classes (left rule + surface). */
export const VERDICT_PANEL_CLASS: Record<VerdictTone, string> = {
  navy: "border-l-4 border-brand-navy bg-brand-navy/5",
  ocean: "border-l-4 border-brand-ocean bg-brand-ocean/5",
  "slate-teal": "border-l-4 border-brand-slate-teal bg-brand-slate-teal/5",
  teal: "border-l-4 border-brand-teal bg-brand-teal/5",
};
