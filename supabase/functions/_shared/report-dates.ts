// A-TEAM S3 RULING I.23 (doc 115, 2026-08-31) — one customer-facing date
// format. Cover banners already print the long form ("August 31, 2026");
// profile/record table rows printed raw ISO ("2026-08-31") beside them.
// This formatter converts an ISO date (or anything Date can parse) to the
// long form for CUSTOMER-FACING display rows only; machine-readable
// metadata keeps ISO. Unparseable input passes through unchanged — a date
// field must never be blanked by its own formatting.

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
] as const;

export function formatReportDateLong(value: unknown): string {
  const raw = String(value ?? "").trim();
  if (!raw) return raw;
  // Fast path: plain ISO date — format WITHOUT a Date object so the result
  // can never shift a day under the runtime's timezone.
  const iso = /^(\d{4})-(\d{2})-(\d{2})/.exec(raw);
  if (iso) {
    const m = Number(iso[2]);
    const d = Number(iso[3]);
    if (m >= 1 && m <= 12 && d >= 1 && d <= 31) {
      return `${MONTHS[m - 1]} ${d}, ${iso[1]}`;
    }
  }
  const t = Date.parse(raw);
  if (!Number.isNaN(t)) {
    const dt = new Date(t);
    return `${MONTHS[dt.getUTCMonth()]} ${dt.getUTCDate()}, ${dt.getUTCFullYear()}`;
  }
  return raw;
}
