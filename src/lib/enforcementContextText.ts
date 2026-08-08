// ITEM 404 CY-7 — TOLERANT READER FOR `enforcement_context`.
//
// ADMT and governance carry an OBJECT; CPPA cyber historically carried a
// STRING. Readers accept BOTH shapes so a document persisted before the
// normalisation renders byte-identically to one written after it. Never
// render the raw value: an object would stringify to "[object Object]".
export function enforcementContextText(value: unknown): string {
  if (typeof value === "string") return value;
  if (value && typeof value === "object") {
    const o = value as Record<string, unknown>;
    for (const k of ["narrative", "summary", "text", "aggregate_exposure_note"]) {
      const v = o[k];
      if (typeof v === "string" && v.trim()) return v;
    }
  }
  return "";
}
