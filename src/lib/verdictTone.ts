/**
 * D1 (CEO ruling) — VERDICT TONES IN CUSTOMER DOCUMENTS.
 *
 * Option-A restraint rendered in the BRAND palette. There are no
 * traffic-light semantics anywhere: tone communicates how firmly the record
 * establishes a conclusion, never "good/bad".
 *
 *   established — strongest brand tone (teal family): the record decides it.
 *   partial     — mid brand tone (ocean family): mixed / in-progress.
 *   withheld    — muted brand tone (steel/mist): undetermined, not established.
 *
 * PDF twin: the CSS variables in supabase/functions/generate-report-pdf.
 * HARD EXCLUSIONS (never styled from here): the state-(i) DRAFT banner, the
 * state-(ii) action-plan banner, legal disclaimer blocks, and anything in
 * emit-gate/customer-messages.
 */

export type VerdictTone = "established" | "partial" | "withheld";

/** Pill / badge classes (background + text + border). */
export const VERDICT_TONE_CLASS: Record<VerdictTone, string> = {
  established: "bg-brand-teal/10 text-brand-teal-text border border-brand-teal/30",
  partial: "bg-brand-ocean/10 text-brand-ocean border border-brand-ocean/30",
  withheld: "bg-brand-mist/50 text-brand-steel border border-brand-mist",
};

/** Text-only classes for inline labels. */
export const VERDICT_TEXT_CLASS: Record<VerdictTone, string> = {
  established: "text-brand-teal-text dark:text-brand-teal",
  partial: "text-brand-ocean dark:text-brand-light-teal",
  withheld: "text-brand-steel dark:text-brand-mist",
};

/** Panel / callout classes (left rule + surface). */
export const VERDICT_PANEL_CLASS: Record<VerdictTone, string> = {
  established: "border-l-4 border-brand-teal bg-brand-teal/5",
  partial: "border-l-4 border-brand-ocean bg-brand-ocean/5",
  withheld: "border-l-4 border-brand-steel bg-brand-mist/30",
};

const ESTABLISHED =
  /^(pass|passed|compliant|implemented|complete|completed|met|meets|ready|qualifies|strong|sufficient|established|low|yes|accepted|adequate|mature|optimi[sz]ed)$/;
const PARTIAL =
  /^(partial|partially[_\s-]?ready|in[_\s-]?progress|planned|developing|defined|medium|moderate|colorable|mixed|warn|warning|some|conditional)$/;

/** Classify an arbitrary verdict/status string into a brand tone. */
export function verdictTone(value: unknown): VerdictTone {
  const x = String(value ?? "").trim().toLowerCase().replace(/\s+/g, "_");
  if (!x) return "withheld";
  if (ESTABLISHED.test(x)) return "established";
  if (PARTIAL.test(x)) return "partial";
  // Determined-adverse conclusions (gap, fail, high, critical, inadequate,
  // absent, not_ready, does_not_qualify, …) are firmly established findings:
  // they read in the strongest brand tone, not in a warning colour.
  if (/(gap|fail|critical|high|inadequate|absent|not[_\s-]|does[_\s-]not|non[_\s-]?compliant|immediate)/.test(x)) {
    return "established";
  }
  return "withheld";
}

export const verdictToneClass = (v: unknown) => VERDICT_TONE_CLASS[verdictTone(v)];
export const verdictTextClass = (v: unknown) => VERDICT_TEXT_CLASS[verdictTone(v)];
export const verdictPanelClass = (v: unknown) => VERDICT_PANEL_CLASS[verdictTone(v)];
