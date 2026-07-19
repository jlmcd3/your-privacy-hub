// STATES-1b — Timezone-safe date-only rendering.
//
// The public U.S. state comparison page stores calendar-only dates
// (effective, lastReviewed, nextReviewDue) as bare "YYYY-MM-DD" strings.
// `new Date("2026-06-09")` parses those as UTC midnight, so any US timezone
// (all negative offsets) renders the *previous* day. We render calendar
// dates by parsing the y/m/d fields directly, never through the Date
// constructor.

const MONTHS_LONG = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const MONTHS_SHORT = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

const YMD_RE = /^(\d{4})-(\d{2})-(\d{2})/;

function parts(iso: string | null | undefined): { y: number; m: number; d: number } | null {
  if (!iso) return null;
  const m = YMD_RE.exec(iso);
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  if (!y || mo < 1 || mo > 12 || d < 1 || d > 31) return null;
  return { y, m: mo, d };
}

/** "June 9, 2026" — never shifts across timezones. */
export function formatDateOnlyLong(iso: string | null | undefined): string {
  const p = parts(iso);
  if (!p) return "—";
  return `${MONTHS_LONG[p.m - 1]} ${p.d}, ${p.y}`;
}

/** "Jun 9, 2026" — short-month variant. */
export function formatDateOnlyShort(iso: string | null | undefined): string {
  const p = parts(iso);
  if (!p) return "—";
  return `${MONTHS_SHORT[p.m - 1]} ${p.d}, ${p.y}`;
}

/** For log rows: reviewed_at is a full ISO timestamp — render its calendar date only, in UTC. */
export function formatTimestampDateOnly(iso: string | null | undefined): string {
  if (!iso) return "—";
  // Take only the date component regardless of the caller's timezone.
  const isoDate = iso.length >= 10 ? iso.slice(0, 10) : iso;
  return formatDateOnlyShort(isoDate);
}

/** Days between two YYYY-MM-DD (or ISO-timestamp) values, computed via UTC epoch of date-only. */
export function daysBetween(a: string, b: string): number {
  const pa = parts(a);
  const pb = parts(b);
  if (!pa || !pb) return NaN;
  const ta = Date.UTC(pa.y, pa.m - 1, pa.d);
  const tb = Date.UTC(pb.y, pb.m - 1, pb.d);
  return Math.round((tb - ta) / 86400000);
}
