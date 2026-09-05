/**
 * `<input type="datetime-local">` values are LOCAL wall-clock strings with no
 * zone ("2026-09-05T08:26"). `new Date().toISOString().slice(0, 16)` produces
 * the UTC wall clock instead, so for any user west of UTC the default (and the
 * `max` bound) sits in their future — QA batch 2026-09-05 (IR 01) saw the
 * untouched default rejected as "cannot be in the future".
 */
export function toDatetimeLocalValue(d: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

/** Now, as a datetime-local value in the viewer's zone. */
export function nowDatetimeLocalValue(): string {
  return toDatetimeLocalValue(new Date());
}
