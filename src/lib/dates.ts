// Shared date formatter — keeps card and detail-page dates consistent.
// Format: "Jan 5, 2026" (short month, numeric day, numeric year, en-US).
export const fmtDate = (d?: string | null): string | null =>
  d
    ? new Date(d).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : null;
