// US enforcement helpers: FTC + HHS OCR URL gates and deterministic subject
// extraction. Kept co-located and dependency-free so unit tests can import
// without pulling the full edge-function runtime.
//
// Design: the enforcement-vs-junk decision uses the source URL, not the title.
// FTC and HHS both publish their case docs at stable path patterns; nav,
// blog, workshop, keynote, statute-section, and news-release pages sit
// outside those patterns and are gate-blocked. Titles are then used only for
// deterministic subject extraction on the retained rows.

// ─────────────────────────────────────────────────────────────────────────────
// FTC URL gate — real case pages only.
//   /enforcement/cases-proceedings/{docket}-{slug}
//   /legal-library/browse/cases-proceedings/{docket-slug}
// Reject hub/landing pages under /cases-proceedings/ (closing-letters,
// commissioner-statements, adjudicative-proceedings, staff-letters, etc.).
const FTC_CASE_URL = /^https:\/\/www\.ftc\.gov\/(enforcement|legal-library\/browse)\/cases-proceedings\/[a-z0-9][^/?#]*\/?$/i;
const FTC_HUB_URL = /\/cases-proceedings\/(closing-letters|commissioner-statements|adjudicative-proceedings|commission-letters|staff-letters|banned-debt-collectors|policy-statements)\/?$/i;

export function isFtcEnforcementUrl(u: string): boolean {
  if (!u) return false;
  return FTC_CASE_URL.test(u) && !FTC_HUB_URL.test(u);
}

// ─────────────────────────────────────────────────────────────────────────────
// FTC subject extractor. Titles on the FTC case listings take a small set of
// forms. Pattern order matters (most specific first).
//   "{X}, FTC v."                   → X
//   "FTC v. {X}"                    → X
//   "{X}, In the Matter of"         → X
//   "In the Matter of {X}"          → X
//   "{X}, U.S. v." / ", United States v." → X
//   "U.S. v. {X}" / "United States v. {X}" → X
//   "United States and State of {S} v. {X}" → X
// Trailing ", et al." and dockets are trimmed.
const FTC_SUBJECT_PATTERNS: RegExp[] = [
  /^(?:FTC|U\.S\.|United States)(?:\s+and\s+State\s+of\s+[A-Za-z ]+)?\s+v\.?\s+([^,]+?)(?:\s*,\s*et\s+al\.?)?\s*$/i,
  /^In\s+the\s+Matter\s+of\s+([^,]+?)(?:\s*,\s*et\s+al\.?)?\s*$/i,
  /^([^,]+?)(?:\s*,\s*et\s+al\.?)?\s*,\s*(?:FTC|U\.S\.|United\s+States)(?:\s+and\s+State\s+of\s+[A-Za-z ]+)?\s+v\.?\s*$/i,
  /^([^,]+?)(?:\s*,\s*et\s+al\.?)?\s*,\s*In\s+the\s+Matter\s+of\s*$/i,
];

export function extractFtcSubject(title: string): string | null {
  if (!title) return null;
  const t = title.trim();
  for (const re of FTC_SUBJECT_PATTERNS) {
    const m = t.match(re);
    if (m && m[1]) {
      const s = m[1].trim().replace(/\s+/g, " ").replace(/[.,;:]+$/, "");
      if (s.length >= 2) return s;
    }
  }
  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// HHS OCR URL gate — resolution agreements, civil-money-penalty pages, and
// the enforcement-example/highlight indexes on the HIPAA compliance section.
//   /hipaa/for-professionals/compliance-enforcement/agreements/{slug}
//   /hipaa/for-professionals/compliance-enforcement/examples/{slug}
//   /hipaa/for-professionals/compliance-enforcement/enforcement-highlights/{slug}
//   /hipaa/for-professionals/compliance-enforcement/enforcement-by-state/{slug}
// Reject index.html-only landing pages and everything outside /hipaa/.
const HHS_ENFORCEMENT_URL = /^https:\/\/www\.hhs\.gov\/hipaa\/for-professionals\/compliance-enforcement\/(agreements|examples|enforcement-highlights|enforcement-by-state)\/[a-z0-9][^/?#]*\/(index\.html)?$/i;

export function isHhsOcrEnforcementUrl(u: string): boolean {
  if (!u) return false;
  return HHS_ENFORCEMENT_URL.test(u);
}

// ─────────────────────────────────────────────────────────────────────────────
// HHS OCR subject extractor. Real resolution-agreement titles take shapes
// like: "Anthem pays OCR $16 Million ...", "HHS Office for Civil Rights
// Settles HIPAA {Something} with {X} ...", "{X} Settles Potential Violations
// ... for $N", "HHS OCR Imposes a $N Civil Monetary Penalty Against {X}".
const HHS_SUBJECT_PATTERNS: RegExp[] = [
  // "HHS OCR Imposes ... (Penalty|CMP) Against {X}" / "... Penalty on {X}"
  /\b(?:Imposes?|Issues?)\b[^.]*?(?:Penalty|Civil\s+Monetary\s+Penalty|CMP)\b[^.]*?\b(?:Against|on|to)\s+([A-Z][^,.]*?)(?:\s+(?:for|following|over|after)\b|[,.]|$)/i,
  // "HHS OCR Settles ... with {X}" / "OCR Reaches Agreement with {X}"
  /\b(?:Settles?|Reaches?\s+Agreement|Resolves?|Enters?\s+Resolution\s+Agreement)\s+(?:HIPAA\s+)?(?:[A-Za-z-]+\s+){0,6}?\bwith\s+([A-Z][^,.]*?)(?:\s+(?:for|following|over|after|regarding)\b|[,.]|$)/i,
  // "{X} Pays $N to Settle ..." / "{X} pays OCR $N ..."
  /^([A-Z][^,.]*?)\s+(?:pays|paid)\s+(?:OCR\s+)?\$/,
  // "{X} Settles ... for $N" / "{X} Settles HIPAA ..."
  /^([A-Z][^,.]*?)\s+Settles?\s+(?:Potential\s+Violations?\s+of\s+)?HIPAA/i,
  // "requiring {X} to pay"
  /\brequiring\s+([A-Z][^,.]*?)\s+to\s+pay\b/i,
];

const HHS_SUBJECT_BLOCKLIST = /^(HHS|OCR|HIPAA|Office|The)\b/i;

export function extractHhsSubject(title: string): string | null {
  if (!title) return null;
  const t = title.trim();
  for (const re of HHS_SUBJECT_PATTERNS) {
    const m = t.match(re);
    if (m && m[1]) {
      const s = m[1].trim().replace(/\s+/g, " ").replace(/[.,;:]+$/, "");
      if (s.length < 3) continue;
      if (HHS_SUBJECT_BLOCKLIST.test(s)) continue;
      return s;
    }
  }
  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Regulator-label normalization. The pipeline should always write canonical
// short labels; historical rows with parenthesized long forms are collapsed.
export function normalizeRegulatorLabel(raw: string | null | undefined): string | null {
  if (!raw) return raw ?? null;
  const t = raw.trim();
  if (/^Federal\s+Trade\s+Commission\s*\(FTC\)$/i.test(t)) return "FTC";
  if (/^Department\s+of\s+Health\s+and\s+Human\s+Services\s+Office\s+for\s+Civil\s+Rights$/i.test(t)) return "HHS OCR";
  return t;
}
