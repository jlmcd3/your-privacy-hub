// The citation-form law (doc 62 §11.5, CEO-ratified 2026-08-23). One
// ratified format per source class, fleet-wide. Every field is drawn from
// a CamCitationSource populated from pinned DB columns at curation — never
// composed freely at generation. No URLs (doc 62 §11.5's no-URL ruling):
// these formatters never take or emit a URL field.

import type { CamCitationSource } from "./cam-types.ts";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

/** "6 November 2025" from an ISO "2025-11-06" date. Throws on a malformed
 * date rather than silently rendering a wrong one — a citation date is
 * never worth guessing. */
export function formatFullDate(isoDate: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate);
  if (!m) throw new Error(`formatFullDate: not an ISO date: "${isoDate}"`);
  const [, y, mo, d] = m;
  const monthIdx = Number(mo) - 1;
  if (monthIdx < 0 || monthIdx > 11) throw new Error(`formatFullDate: bad month in "${isoDate}"`);
  return `${Number(d)} ${MONTHS[monthIdx]} ${y}`;
}

/** Docket-shaped rule (doc 63 §1): a case_reference renders only when it is
 * an actual regulator docket/case identifier — alphanumeric with at least
 * one digit and no whitespace (e.g. "SAN-2024-013", "EXP202304532"). A
 * free-text value (e.g. "LinkedIn inquiry") is treated as ABSENT: omitted,
 * never invented, never paraphrased into a docket-looking string. */
export function isDocketShaped(ref: string | undefined | null): ref is string {
  if (!ref) return false;
  const s = ref.trim();
  if (!s || /\s/.test(s)) return false;
  return /[0-9]/.test(s) && /^[A-Za-z0-9-]+$/.test(s);
}

export interface EnforcementCitationOptions {
  /** Render the standing GDPR≠CCPA analogy clause. Omit for EU/UK-regime
   * documents citing a same-regime decision (jurisdiction-fit law). */
  readonly crossRegime?: boolean;
}

/** CF-ENF: `{Regulator} ({Jurisdiction}), {Subject}, decision of {D Month
 * YYYY}[, ref. {case_reference}] — persuasive authority only[; decided
 * under the GDPR, not the CCPA]`. */
export function formatEnforcementCitation(
  cs: CamCitationSource,
  opts: EnforcementCitationOptions = {},
): string {
  const date = formatFullDate(cs.decision_date);
  const ref = isDocketShaped(cs.case_reference) ? `, ref. ${cs.case_reference}` : "";
  const tail = opts.crossRegime
    ? "persuasive only; decided under the GDPR, not the CCPA"
    : "persuasive authority";
  return `${cs.regulator} (${cs.jurisdiction}), ${cs.subject}, decision of ${date}${ref} — ${tail}`;
}

/** CF-FSOR: `CPPA, Final Statement of Reasons ({page_ref}) — interpretive`. */
export function formatFsorCitation(pageRef: string): string {
  return `CPPA, Final Statement of Reasons (${pageRef}) — interpretive`;
}

/** CF-EDPB: `EDPB, Guidelines {N/YYYY} {short title} — interpretive`. */
export function formatEdpbCitation(guidelineRef: string, shortTitle: string): string {
  return `EDPB, Guidelines ${guidelineRef} ${shortTitle} — interpretive`;
}

/** WP248's own ratified form (pre-EDPB, Article 29 WP-endorsed). */
export const WP248_CITATION =
  "Article 29 Working Party, Guidelines on Data Protection Impact Assessment (WP248 rev.01, endorsed by the EDPB) — interpretive";
