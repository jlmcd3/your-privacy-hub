// PROMPT 2A — Shared verbatim-splice normalizer.
//
// Deterministic prose mechanics for splicing customer narrative into fixed
// spine prose. No model calls, no product-specific imports: CPPA-risk
// (Phase R3a) adopts this module unchanged.
//
// Call sites are responsible for introducing the fragment with a colon, so an
// initial capital in the customer's own words is always grammatical. This
// module therefore performs NO case surgery.

const OPEN_Q = "\u201C";
const CLOSE_Q = "\u201D";

/**
 * Trim a customer fragment, strip ONE trailing terminal mark (. ; ,), wrap the
 * result in typographic double quotes and collapse doubled punctuation at the
 * seam. Returns "" for empty input.
 */
export function spliceVerbatim(fragment: string): string {
  let t = String(fragment ?? "").trim();
  if (!t) return "";
  // Strip exactly one trailing terminal punctuation mark.
  t = t.replace(/[.;,]$/, "").trimEnd();
  if (!t) return "";
  // Already-quoted input: unwrap so we do not double-wrap.
  if (
    (t.startsWith(OPEN_Q) && t.endsWith(CLOSE_Q)) ||
    (t.startsWith('"') && t.endsWith('"'))
  ) {
    t = t.slice(1, -1).trim();
    t = t.replace(/[.;,]$/, "").trimEnd();
  }
  return `${OPEN_Q}${t}${CLOSE_Q}`;
}

/** Collapse punctuation doubled at a splice seam ( ".." , ".," , " ." , " ,"). */
export function collapseSeam(text: string): string {
  return String(text ?? "")
    .replace(/\s+([.,;:])/g, "$1")
    .replace(/([.,;])\1+/g, "$1")
    .replace(/\.,/g, ",")
    .replace(/,\./g, ".")
    .replace(/([.;,])\s*([.;,])/g, "$1")
    .replace(/\s{2,}/g, " ");
}

const MONTHS_EN_GB = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

/**
 * "2026-05-01" → "1 May 2026". Input that does not parse as an ISO calendar
 * date is returned unchanged.
 */
export function humanizeDateISO(iso: string): string {
  const t = String(iso ?? "").trim();
  const m = /^(\d{4})-(\d{2})-(\d{2})(?:[T\s].*)?$/.exec(t);
  if (!m) return t;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  if (!y || mo < 1 || mo > 12 || d < 1 || d > 31) return t;
  return `${d} ${MONTHS_EN_GB[mo - 1]} ${y}`;
}
